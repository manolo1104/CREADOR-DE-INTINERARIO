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
import { montoCobrado } from "./dinero";
import { hoyMX } from "@/lib/dates";
import { metaDe, conMeta } from "@/lib/admin/reserva";
import { registrarEnBitacora, pesos, SISTEMA, type Actor } from "@/lib/admin/bitacora";
import { METODOS_COBRO, etiquetaMetodo, metodoValido, type MetodoCobro } from "@/lib/admin/metodosCobro";
import { VENTANA_COBRO_REPETIDO_MIN, cobroIgualReciente } from "@/lib/admin/cobroRepetido";

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
   * No crear el renglón de rescate. Dos casos, el mismo motivo: el dinero que
   * ya figura en `depositoPagado` es EXACTAMENTE el que se está registrando, y
   * rescatarlo además lo duplicaría.
   *   · la reserva acaba de nacer con su depósito puesto (checkout de Stripe)
   *   · se está DESGLOSANDO dinero viejo: decir cómo entró algo que ya estaba
   *     contado, no añadir dinero nuevo.
   */
  sinRescate?: boolean;
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
  // Revisión del 4 nov 2026: si se anula un cobro o sube el total, la reserva
  // vuelve a «pendiente» (antes se quedaba «pagada» con saldo). Solo cuando su
  // dinero ya vive en los cobros: una histórica pagada por Stripe sin renglones
  // no se toca (su cobro se «rescata» al registrar el primero).
  const conCobros = !saldado && reserva.status === "paid"
    ? (await prisma.movimiento.count({ where: { reservaId, tipo: "cobro" } })) > 0
    : false;

  await prisma.tourBooking.update({
    where: { id: reservaId },
    data: {
      depositoPagado: cobrado,
      // Sólo se sube de pendiente a pagada. Una reserva cancelada no revive
      // porque le entre un cobro, y una pagada no se degrada sola.
      ...(saldado && reserva.status === "pending" ? { status: "paid" } : conCobros ? { status: "pending" } : {}),
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

  // El MISMO criterio que el resto del panel (revisión del 4 nov 2026): antes
  // aquí se daba por pagada al 100 % toda reserva de Stripe con depósito en
  // cero, aunque desde el 29 sep el depósito es siempre lo cobrado de verdad
  // (un anticipo del viaje CDMX se «rescataba» como pago total).
  const yaCobrado = montoCobrado(reserva);
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

  if (!d.sinRescate) await asegurarHistorico(d.reservaId);

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

  // Su lead (CRM) avanza según lo cobrado: Anticipo pagado o Confirmado. Aquí
  // y no en cada ruta: por este punto pasan el panel, las ligas de pago, el
  // webhook de Stripe y el /confirma (revisión del 4 nov 2026). No lanza.
  await import("./crmDatos").then(m => m.leadDesdeReserva(d.reservaId, `se registró un cobro de ${pesos(monto)}`, { revivir: true })).catch(() => {});

  return {
    cobro:   { id: cobro.id, monto, metodoPago: d.metodo, fecha },
    cobrado,
    saldo:   Math.max(0, reserva.totalAmount - cobrado),
  };
}

/**
 * ¿Ya se registró este mismo pago hace poco en esta reserva? (revisión del
 * lote 1, 5 nov 2026). El cobro vivo del mismo monto de la última hora, o
 * null. Lo usa «Registrar cobro» para preguntar antes de contar dos veces el
 * mismo dinero (la regla y el porqué, en `cobroRepetido.ts`).
 */
export async function cobroRepetidoReciente(reservaId: string, monto: number, ahora: Date = new Date()) {
  const n = Math.round(Number(monto) || 0);
  if (n <= 0) return null;
  const recientes = await prisma.movimiento.findMany({
    where:   {
      reservaId, tipo: "cobro", anulado: false, monto: n,
      createdAt: { gte: new Date(ahora.getTime() - VENTANA_COBRO_REPETIDO_MIN * 60_000) },
    },
    select:  { monto: true, createdAt: true, creadoPor: true, metodoPago: true, anulado: true },
    orderBy: { createdAt: "desc" },
    take:    5,
  });
  return cobroIgualReciente(recientes, n, ahora);
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

/**
 * Corregir un cobro ya registrado: con qué método entró, cuándo, su referencia
 * y quién lo recibió.
 *
 * 🔴 El importe NO se toca aquí. Cambiar cuánto entró es otra cosa —se anula y
 * se vuelve a registrar, y queda el rastro—; esto es sólo decir bien de dónde
 * salió un dinero que ya está contado. Sin esto, un cobro que nació como
 * "efectivo" (o como el renglón de rescate de una reserva vieja) se quedaba así
 * para siempre y el desglose del corte mentía.
 */
export async function editarCobro(
  id: string,
  cambios: { metodo?: string; fecha?: string; folio?: string | null; recibidoPor?: string | null },
  quien: string,
): Promise<void> {
  const antes = await prisma.movimiento.findUnique({ where: { id } });
  if (!antes || antes.tipo !== "cobro") throw new Error("Ese cobro no existe");
  if (antes.anulado) throw new Error("Un cobro anulado ya no se corrige");

  const metodo = cambios.metodo && metodoValido(cambios.metodo) ? cambios.metodo : (antes.metodoPago ?? "otro");
  const fecha  = /^\d{4}-\d{2}-\d{2}$/.test(String(cambios.fecha ?? "")) ? String(cambios.fecha) : antes.fecha;
  const folio  = cambios.folio === undefined ? null : (cambios.folio ? String(cambios.folio).trim().slice(0, 60) : null);
  const recibidoPor = cambios.recibidoPor !== undefined
    ? (cambios.recibidoPor ? String(cambios.recibidoPor).slice(0, 80) : null)
    : antes.recibidoPor;

  // 🔴 Un efectivo sin «quién lo recibió» desaparece de «efectivo sin entregar»
  // en el corte (esa cuenta solo mira los que tienen nombre). Vaciarlo era una
  // forma de hacer invisible dinero en mano, y la bitácora ni lo anotaba.
  if (metodo === "efectivo" && !recibidoPor) {
    throw new Error("Un cobro en efectivo tiene que decir quién lo recibió");
  }

  await prisma.movimiento.update({
    where: { id },
    data: {
      metodoPago:  metodo,
      fecha,
      fechaPago:   fecha,
      // El concepto se rehace para que la bitácora y los listados digan la
      // verdad: si no, seguiría leyéndose "Cobro efectivo" en un SPEI.
      concepto:    `Cobro ${etiquetaMetodo(metodo).toLowerCase()}${folio ? ` · ${folio}` : ""}`,
      recibidoPor,
      // Corregir el método de un efectivo que ya se entregó no lo "des-entrega",
      // pero si deja de ser efectivo, la entrega pierde sentido.
      ...(metodo !== "efectivo" ? { entregadoA: null, entregadoAt: null } : {}),
    },
  });

  const cambiosLegibles = [
    antes.metodoPago !== metodo
      ? { campo: "método", antes: etiquetaMetodo(antes.metodoPago), despues: etiquetaMetodo(metodo) }
      : null,
    antes.fecha !== fecha ? { campo: "fecha", antes: antes.fecha, despues: fecha } : null,
    // Quién tiene el efectivo es justo lo que el corte cuadra: el cambio se anota.
    (antes.recibidoPor ?? null) !== (recibidoPor ?? null)
      ? { campo: "lo recibió", antes: antes.recibidoPor ?? "—", despues: recibidoPor ?? "—" }
      : null,
  ].filter(Boolean) as { campo: string; antes: unknown; despues: unknown }[];

  await registrarEnBitacora({
    accion:  "modificó",
    entidad: "cobro",
    resumen: `Corregido un cobro de ${pesos(antes.monto)}: ahora dice ${etiquetaMetodo(metodo).toLowerCase()}`,
    detalle: cambiosLegibles,
  });
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
  // Su lead regresa a la etapa que dice el dinero (p. ej. Confirmado → Anticipo pagado),
  // también si la reserva ya estaba cancelada: cuenta lo que sigue vivo (5 nov 2026). No lanza.
  if (antes.reservaId) await import("./crmDatos").then(m => m.leadDesdeReserva(antes.reservaId!, `se anuló un cobro de ${pesos(antes.monto)}`)).catch(() => {});

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
