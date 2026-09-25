// El dinero que ENTRA, renglón por renglón.
//
// Hasta hoy un cobro era un solo número acumulado (`TourBooking.depositoPagado`)
// y el método de pago vivía como texto libre dentro del `_meta` de `lineItems`,
// donde Finanzas nunca lo leía. Así no se podía saber cuánto entró en efectivo,
// no había dónde guardar la captura de una transferencia, y sobre todo no había
// forma de saber quién trae el efectivo encima.
//
// Un cobro es un `Movimiento` con `tipo: "cobro"` — el mismo libro donde ya
// viven costos y gastos. No se creó tabla nueva a propósito: el tipo ya estaba
// declarado en el esquema y la columna `metodoPago` ya existía; sólo faltaba
// cablearlo.
//
// 🔴 LA REGLA QUE EVITA CONTAR EL DINERO DOS VECES
// `depositoPagado` sigue siendo la ÚNICA fuente de los totales: `montoCobrado()`,
// `saldoPendiente()`, el flujo de efectivo, las cuentas por cobrar y el correo
// lo leen y no se tocan. Lo que hacemos es convertirlo en un ESPEJO calculado:
// después de cada alta o anulación vale exactamente la suma de los cobros vivos
// de esa reserva. Los movimientos de cobro sólo aportan el DESGLOSE (por método,
// por persona). Si algún día Finanzas sumara las dos cosas, todos los números
// del corte se duplicarían.

import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { metaDe, conMeta } from "@/lib/admin/reserva";
import { registrarEnBitacora, pesos, SISTEMA, type Actor } from "@/lib/admin/bitacora";
import { METODOS_COBRO, etiquetaMetodo, metodoValido, type MetodoCobro } from "@/lib/admin/metodosCobro";

// Re-exportadas para que el resto del panel siga importando desde aquí.
export { METODOS_COBRO, etiquetaMetodo, metodoValido, requiereComprobante } from "@/lib/admin/metodosCobro";
export type { MetodoCobro } from "@/lib/admin/metodosCobro";

/** La categoría con la que se guarda un cobro: no es un costo ni un gasto. */
const CATEGORIA_COBRO = "cobro";

export interface DatosCobro {
  reservaId: string;
  monto: number;
  metodo: MetodoCobro;
  /** YYYY-MM-DD. Cuándo entró el dinero, no cuándo se capturó. */
  fecha?: string;
  /** En manos de quién quedó. Por omisión, quien lo captura. */
  recibidoPor?: string | null;
  /** Referencia bancaria, últimos 4 dígitos, folio del depósito. */
  folio?: string | null;
  nota?: string | null;
  /** Quién lo captura en el panel. */
  creadoPor?: string | null;
  /** Para los caminos automáticos: la bitácora no tiene sesión que leer. */
  actor?: Actor;
  /**
   * La reserva ACABA de nacer con su `depositoPagado` ya puesto (checkout de
   * Stripe). Sin esto, el rescate de reservas viejas vería dinero sin renglones
   * y crearía un "cobro anterior al desglose" que DUPLICARÍA el importe.
   */
  reservaRecienCreada?: boolean;
}

/**
 * Lo cobrado según los renglones vivos de una reserva.
 * Es la definición de `depositoPagado` a partir de ahora.
 */
export async function sumaDeCobros(reservaId: string): Promise<number> {
  const r = await prisma.movimiento.aggregate({
    _sum:  { monto: true },
    where: { reservaId, tipo: "cobro", anulado: false },
  });
  return r._sum.monto ?? 0;
}

/**
 * Deja `depositoPagado` igual a la suma de los cobros vivos y devuelve el nuevo
 * valor. También marca la reserva como pagada cuando ya no debe nada: sin esto
 * habría que acordarse de cambiar el estado a mano después de cada cobro.
 */
export async function sincronizarDeposito(reservaId: string): Promise<number> {
  const reserva = await prisma.tourBooking.findUnique({
    where:  { id: reservaId },
    select: { id: true, totalAmount: true, status: true },
  });
  if (!reserva) return 0;

  const cobrado = await sumaDeCobros(reservaId);
  const saldado = cobrado >= reserva.totalAmount && reserva.totalAmount > 0;

  await prisma.tourBooking.update({
    where: { id: reservaId },
    data: {
      depositoPagado: cobrado,
      // Sólo se sube de pendiente a pagada. Una reserva cancelada no revive
      // porque le entre un cobro, y una pagada no se degrada sola.
      ...(saldado && reserva.status === "pending" ? { status: "paid" } : {}),
    },
  });
  return cobrado;
}

/**
 * 🔴 El rescate de las reservas viejas.
 *
 * Una reserva anterior a este módulo tiene `depositoPagado` pero ningún renglón
 * de cobro. Si el primer cobro que se le registra fuera de $2,000, el espejo
 * dejaría `depositoPagado` en $2,000 y los $5,000 que ya estaban pagados
 * DESAPARECERÍAN. Antes de tocar nada se crea un renglón por lo que ya había.
 *
 * Con esto el módulo se cura solo reserva por reserva, aunque nadie corra el
 * script de normalización.
 */
async function asegurarHistorico(reservaId: string): Promise<void> {
  const [reserva, cuantos] = await Promise.all([
    prisma.tourBooking.findUnique({
      where:  { id: reservaId },
      select: { depositoPagado: true, totalAmount: true, stripePaymentIntentId: true, lineItems: true, createdAt: true, tourDate: true },
    }),
    prisma.movimiento.count({ where: { reservaId, tipo: "cobro" } }),
  ]);
  if (!reserva || cuantos > 0) return;

  // Mismo criterio que `montoCobrado()` en kpis.ts: una reserva pagada por
  // Stripe puede tener el depósito en cero y estar cobrada al 100%.
  const yaCobrado = reserva.depositoPagado > 0
    ? reserva.depositoPagado
    : (reserva.stripePaymentIntentId ? reserva.totalAmount : 0);
  if (yaCobrado <= 0) return;

  await prisma.movimiento.create({
    data: {
      fecha:      reserva.tourDate || reserva.createdAt.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }),
      tipo:       "cobro",
      categoria:  CATEGORIA_COBRO,
      concepto:   "Cobro anterior al desglose",
      monto:      yaCobrado,
      reservaId,
      metodoPago: metodoHistorico(reserva.stripePaymentIntentId, reserva.lineItems),
      nota:       "Renglón creado solo para no perder lo que ya estaba cobrado. Sin comprobante.",
      pagado:     true,
      creadoPor:  "Sistema",
    },
  });
}

/** Con qué método se marca un cobro heredado, con lo poco que se sabe de él. */
export function metodoHistorico(stripeId: string | null, lineItems: unknown): MetodoCobro {
  if (stripeId) return "stripe";
  const viejo = String(metaDe({ lineItems } as any).metodoPago ?? "").toLowerCase();
  if (viejo.includes("efectivo"))      return "efectivo";
  if (viejo.includes("transfer"))      return "transferencia";
  if (viejo.includes("dep"))           return "deposito";
  if (viejo.includes("stripe") || viejo.includes("tarjeta") || viejo.includes("liga")) return "stripe";
  return "otro";
}

export interface ResultadoCobro {
  cobro: { id: string; monto: number; metodoPago: string | null; fecha: string };
  /** `depositoPagado` ya actualizado. */
  cobrado: number;
  saldo: number;
}

/**
 * Registra un cobro y deja la reserva cuadrada.
 *
 * No valida permisos ni comprobantes: de eso se encarga la ruta, porque los
 * caminos automáticos (webhook de Stripe) entran por aquí sin pasar por el
 * panel. Sí valida lo que rompería los números.
 */
export async function registrarCobro(d: DatosCobro): Promise<ResultadoCobro> {
  const monto = Math.round(Number(d.monto) || 0);
  if (monto <= 0) throw new Error("El monto tiene que ser mayor a cero");
  if (!metodoValido(d.metodo)) throw new Error("Método de pago desconocido");

  const reserva = await prisma.tourBooking.findUnique({
    where:  { id: d.reservaId },
    select: { id: true, confirmationNumber: true, customerName: true, totalAmount: true, lineItems: true },
  });
  if (!reserva) throw new Error("Esa reserva no existe");

  if (!d.reservaRecienCreada) await asegurarHistorico(d.reservaId);

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha ?? "")) ? String(d.fecha) : hoyMX();
  const folio = d.folio ? String(d.folio).trim().slice(0, 60) : null;

  const cobro = await prisma.movimiento.create({
    data: {
      fecha,
      tipo:        "cobro",
      categoria:   CATEGORIA_COBRO,
      concepto:    `Cobro ${etiquetaMetodo(d.metodo).toLowerCase()}${folio ? ` · ${folio}` : ""}`,
      monto,
      reservaId:   d.reservaId,
      metodoPago:  d.metodo,
      proveedor:   reserva.customerName,
      recibidoPor: (d.recibidoPor ?? d.creadoPor ?? null)?.slice(0, 80) ?? null,
      nota:        d.nota ? String(d.nota).slice(0, 300) : null,
      // Un cobro nunca es una deuda de la empresa: `pagado` en true lo mantiene
      // fuera de las cuentas por pagar.
      pagado:      true,
      fechaPago:   fecha,
      creadoPor:   d.creadoPor ?? null,
    },
  });

  const cobrado = await sincronizarDeposito(d.reservaId);

  // El correo al cliente imprime el método desde el `_meta`: se le deja el del
  // último cobro para que siga diciendo algo cierto.
  await prisma.tourBooking.update({
    where: { id: d.reservaId },
    data:  { lineItems: conMeta(reserva.lineItems, { metodoPago: etiquetaMetodo(d.metodo), folioPago: folio ?? "" }) as any },
  });

  await registrarEnBitacora({
    accion:     "creó",
    entidad:    "cobro",
    referencia: reserva.confirmationNumber,
    resumen:    `Cobro de ${pesos(monto)} en ${etiquetaMetodo(d.metodo).toLowerCase()} — reserva ${reserva.confirmationNumber} (${reserva.customerName})` +
                (d.recibidoPor ? `, lo recibió ${d.recibidoPor}` : ""),
    actor:      d.actor,
  });

  return {
    cobro:   { id: cobro.id, monto, metodoPago: d.metodo, fecha },
    cobrado,
    saldo:   Math.max(0, reserva.totalAmount - cobrado),
  };
}

/**
 * La versión para los caminos automáticos (webhook de Stripe, ligas de pago).
 * NUNCA lanza: que el desglose falle no puede tumbar la confirmación de una
 * venta que el cliente ya pagó. Mismo criterio que `registrarEnBitacora`.
 */
export async function registrarCobroSilencioso(d: DatosCobro): Promise<void> {
  try {
    await registrarCobro({ actor: SISTEMA, creadoPor: SISTEMA.nombre, ...d });
  } catch (e: any) {
    console.error("registrarCobro (automático):", e?.message);
  }
}

/** Anular un cobro: no se borra, queda tachado con su motivo. */
export async function anularCobro(id: string, motivo: string, quien: string): Promise<number> {
  const antes = await prisma.movimiento.findUnique({ where: { id } });
  if (!antes || antes.tipo !== "cobro") throw new Error("Ese cobro no existe");
  if (antes.anulado) throw new Error("Ese cobro ya estaba anulado");

  await prisma.movimiento.update({
    where: { id },
    data:  { anulado: true, anuladoPor: quien, anuladoAt: new Date(), motivoAnulacion: motivo.slice(0, 200) },
  });

  const cobrado = antes.reservaId ? await sincronizarDeposito(antes.reservaId) : 0;

  await registrarEnBitacora({
    accion:  "eliminó",
    entidad: "cobro",
    resumen: `Anulado un cobro de ${pesos(antes.monto)} (${antes.fecha}). Motivo: ${motivo}`,
    detalle: [{ campo: "anulado", antes: false, despues: true }],
  });
  return cobrado;
}

/**
 * Marcar que el efectivo ya se entregó. Mientras `entregadoAt` esté vacío, ese
 * dinero sigue contando como "en la bolsa de" quien lo cobró.
 */
export async function marcarEntregado(ids: string[], entregadoA: string, quien: string): Promise<number> {
  const movs = await prisma.movimiento.findMany({
    where:  { id: { in: ids }, tipo: "cobro", anulado: false, entregadoAt: null },
    select: { id: true, monto: true, recibidoPor: true },
  });
  if (movs.length === 0) return 0;

  await prisma.movimiento.updateMany({
    where: { id: { in: movs.map(m => m.id) } },
    data:  { entregadoA: entregadoA.slice(0, 80), entregadoAt: new Date() },
  });

  const total = movs.reduce((s, m) => s + m.monto, 0);
  await registrarEnBitacora({
    accion:  "modificó",
    entidad: "cobro",
    resumen: `${quien} recibió ${pesos(total)} en efectivo de ${movs[0]?.recibidoPor || "alguien"} (${movs.length} cobro${movs.length === 1 ? "" : "s"})`,
  });
  return total;
}

// ── Lo que ve el panel ──────────────────────────────────────────────────────

export interface CobroVisible {
  id: string;
  fecha: string;
  monto: number;
  metodo: string;
  metodoLabel: string;
  recibidoPor: string | null;
  entregadoA: string | null;
  entregadoAt: string | null;
  nota: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  creadoPor: string | null;
  comprobantes: { id: string; nombreArchivo: string; tipoMime: string }[];
}

/** Los cobros de una reserva, con sus comprobantes. */
export async function cobrosDeReserva(reservaId: string): Promise<CobroVisible[]> {
  const movs = await prisma.movimiento.findMany({
    where:   { reservaId, tipo: "cobro" },
    orderBy: { fecha: "asc" },
  });
  const archivos = await prisma.evidencia.findMany({
    where:  { movimientoId: { in: movs.map(m => m.id) } },
    select: { id: true, movimientoId: true, nombreArchivo: true, tipoMime: true },
  });
  return movs.map(m => ({
    id: m.id,
    fecha: m.fecha,
    monto: m.monto,
    metodo: m.metodoPago ?? "otro",
    metodoLabel: etiquetaMetodo(m.metodoPago),
    recibidoPor: m.recibidoPor,
    entregadoA: m.entregadoA,
    entregadoAt: m.entregadoAt ? m.entregadoAt.toISOString() : null,
    nota: m.nota,
    anulado: m.anulado,
    motivoAnulacion: m.motivoAnulacion,
    creadoPor: m.creadoPor,
    comprobantes: archivos
      .filter(a => a.movimientoId === m.id)
      .map(a => ({ id: a.id, nombreArchivo: a.nombreArchivo, tipoMime: a.tipoMime })),
  }));
}

// ── Efectivo sin entregar ───────────────────────────────────────────────────

export interface BolsaDeEfectivo {
  persona: string;
  monto: number;
  cobros: number;
  /** El cobro más viejo sin entregar: si lleva días, es una señal. */
  desde: string;
}

/**
 * Cuánto efectivo cobrado sigue en la bolsa de cada quien.
 *
 * No se filtra por periodo a propósito: el efectivo que alguien trae desde hace
 * dos semanas sigue siendo efectivo que trae, igual que una deuda vieja sigue
 * siendo deuda. Sólo cuenta el efectivo — una transferencia ya está en el banco.
 *
 * 🔴 Y sólo lo que tiene un responsable. Los renglones rescatados de reservas
 * viejas (`asegurarHistorico`, `backfill-cobros`) nacen sin `recibidoPor`
 * porque nadie sabe quién cobró aquello: contarlos haría que el corte
 * reclamara a "Sin asignar" dinero de hace meses que ya está en el banco.
 */
export async function efectivoEnManos(): Promise<BolsaDeEfectivo[]> {
  const movs = await prisma.movimiento.findMany({
    where: {
      tipo: "cobro", metodoPago: "efectivo", anulado: false, entregadoAt: null,
      recibidoPor: { not: null },
    },
    select: { monto: true, recibidoPor: true, fecha: true },
    orderBy: { fecha: "asc" },
  });

  const bolsas: Record<string, BolsaDeEfectivo> = {};
  for (const m of movs) {
    const persona = m.recibidoPor!;
    const b = (bolsas[persona] ??= { persona, monto: 0, cobros: 0, desde: m.fecha });
    b.monto += m.monto;
    b.cobros += 1;
    if (m.fecha < b.desde) b.desde = m.fecha;
  }
  return Object.values(bolsas).sort((a, b) => b.monto - a.monto);
}

/** Dar por recibido TODO el efectivo que trae una persona. */
export async function entregarTodoDe(persona: string, quien: string): Promise<number> {
  const movs = await prisma.movimiento.findMany({
    where: {
      tipo: "cobro", metodoPago: "efectivo", anulado: false, entregadoAt: null,
      recibidoPor: persona,
    },
    select: { id: true },
  });
  return marcarEntregado(movs.map(m => m.id), quien, quien);
}
