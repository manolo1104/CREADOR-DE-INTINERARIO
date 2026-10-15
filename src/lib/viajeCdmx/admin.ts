/**
 * Lo que necesita la sección Salidas del panel: leer todo de una vez, y crear
 * y editar salidas con sus reglas.
 *
 * Las fechas del formulario son DÍAS (AAAA-MM-DD) en hora de México:
 *  - «abre el»          → a las 00:00 de ese día
 *  - «fin de preventa»  → a las 23:59 de ese día
 *  - «corte»            → a las 23:59 de ese día
 * Así Manolo piensa en días, que es como habla del viaje, y no en horas.
 */
import type { SalidaGrupal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { metaDe } from "@/lib/admin/reserva";
import { conSalidaBloqueada, ErrorViaje, libres, ocupacion, ocupacionDeVarias } from "./cupo";
import { estadoSalida, precioVigente, saldoVence } from "./precio";
import {
  CAPACIDAD_INICIAL, CORTE_DIAS_ANTES, LIDER_PERSONAS, MINIMO_INICIAL, PREVENTA_DIAS, REGRESO_DIAS_DESPUES, SALDO_DIAS_ANTES,
} from "./config";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const inicioDiaMX = (ymd: string) => new Date(`${ymd}T00:00:00-06:00`);
export const finDiaMX = (ymd: string) => new Date(`${ymd}T23:59:59-06:00`);

/** Lo que el formulario propone para una fecha nueva. */
export function plazosPorOmision(fechaSalida: string, hoy: string = hoyMX()) {
  const corte = addDaysYMD(fechaSalida, -CORTE_DIAS_ANTES);
  const finPreventa = addDaysYMD(hoy, PREVENTA_DIAS - 1);
  return {
    fechaRegreso: addDaysYMD(fechaSalida, REGRESO_DIAS_DESPUES),
    abreEl: hoy,
    finPreventa: finPreventa < corte ? finPreventa : corte,
    fechaCorte: corte,
    saldoDiasAntes: SALDO_DIAS_ANTES,
    capacidad: CAPACIDAD_INICIAL,
    minimo: MINIMO_INICIAL,
  };
}

export interface FormSalida {
  fechaSalida?: string;
  fechaRegreso?: string;
  capacidad?: number;
  minimo?: number;
  precio?: number;
  precioPreventa?: number | null;
  abreEl?: string;
  finPreventa?: string | null;
  fechaCorte?: string;
  saldoDiasAntes?: number;
  estado?: string;
  hotelBloqueado?: boolean;
  notas?: string | null;
  /** Bajar el cupo por debajo de lo vendido pide confirmarlo. */
  forzar?: boolean;
}

const ESTADOS = new Set(["borrador", "publicada", "cancelada"]);

/** Valida y convierte lo que manda el formulario. `previa` = edición. */
function leer(b: FormSalida, previa?: SalidaGrupal) {
  const fechaSalida = String(b.fechaSalida ?? previa?.fechaSalida ?? "");
  if (!YMD.test(fechaSalida)) throw new ErrorViaje(400, "fecha", "Falta la fecha de salida.");
  const omision = plazosPorOmision(fechaSalida);
  const fechaRegreso = String(b.fechaRegreso ?? previa?.fechaRegreso ?? omision.fechaRegreso);
  if (!YMD.test(fechaRegreso) || fechaRegreso < fechaSalida) throw new ErrorViaje(400, "regreso", "El regreso tiene que ser el mismo día o después de la salida.");

  const capacidad = Math.floor(Number(b.capacidad ?? previa?.capacidad ?? omision.capacidad));
  if (!(capacidad >= 1 && capacidad <= 60)) throw new ErrorViaje(400, "capacidad", "El cupo va de 1 a 60.");
  const minimo = Math.floor(Number(b.minimo ?? previa?.minimo ?? omision.minimo));
  if (!(minimo >= 1 && minimo <= capacidad)) throw new ErrorViaje(400, "minimo", "El mínimo va de 1 al cupo.");

  const precio = Math.round(Number(b.precio ?? previa?.precio));
  if (!(precio >= 100)) throw new ErrorViaje(400, "precio", "Escribe el precio por persona.");
  const preRaw = b.precioPreventa === undefined ? previa?.precioPreventa ?? null : b.precioPreventa;
  const precioPreventa = preRaw === null || preRaw === undefined || String(preRaw) === "" ? null : Math.round(Number(preRaw));
  if (precioPreventa !== null && !(precioPreventa >= 100 && precioPreventa < precio)) {
    throw new ErrorViaje(400, "preventa", "El precio de preventa tiene que ser menor que el normal.");
  }

  const abre = String(b.abreEl ?? (previa ? ymdMX(previa.abreEl) : omision.abreEl));
  const corte = String(b.fechaCorte ?? (previa ? ymdMX(previa.fechaCorte) : omision.fechaCorte));
  const finPreRaw = b.finPreventa === undefined ? (previa?.finPreventa ? ymdMX(previa.finPreventa) : omision.finPreventa) : b.finPreventa;
  if (!YMD.test(abre) || !YMD.test(corte)) throw new ErrorViaje(400, "plazos", "Revisa las fechas de apertura y de corte.");
  if (corte >= fechaSalida) throw new ErrorViaje(400, "corte", "El corte tiene que ser antes de la salida.");
  if (abre > corte) throw new ErrorViaje(400, "abre", "La fecha tiene que abrir antes del corte.");
  let finPreventa: Date | null = null;
  if (precioPreventa !== null) {
    const f = String(finPreRaw ?? "");
    if (!YMD.test(f)) throw new ErrorViaje(400, "fin-preventa", "Con precio de preventa, di hasta cuándo dura.");
    if (f < abre || f > corte) throw new ErrorViaje(400, "fin-preventa", "La preventa tiene que terminar entre la apertura y el corte.");
    finPreventa = finDiaMX(f);
  }

  const saldoDiasAntes = Math.floor(Number(b.saldoDiasAntes ?? previa?.saldoDiasAntes ?? omision.saldoDiasAntes));
  if (!(saldoDiasAntes >= 0 && saldoDiasAntes <= 60)) throw new ErrorViaje(400, "saldo", "Los días para liquidar van de 0 a 60.");

  const estado = String(b.estado ?? previa?.estado ?? "borrador");
  if (!ESTADOS.has(estado)) throw new ErrorViaje(400, "estado", "Estado inválido.");

  return {
    fechaSalida, fechaRegreso, capacidad, minimo, precio, precioPreventa,
    abreEl: inicioDiaMX(abre), finPreventa, fechaCorte: finDiaMX(corte), saldoDiasAntes, estado,
    hotelBloqueado: b.hotelBloqueado ?? previa?.hotelBloqueado ?? false,
    notas: b.notas === undefined ? previa?.notas ?? null : (String(b.notas ?? "").trim().slice(0, 1000) || null),
  };
}

export async function crearSalida(b: FormSalida): Promise<SalidaGrupal> {
  const data = leer(b);
  try {
    return await prisma.salidaGrupal.create({ data });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") throw new ErrorViaje(409, "duplicada", "Ya hay una salida ese día.");
    throw e;
  }
}

/** Editar bajo el candado: bajar el cupo no puede cruzarse con alguien apartando. */
export async function editarSalida(id: string, b: FormSalida): Promise<{ antes: SalidaGrupal; despues: SalidaGrupal }> {
  return conSalidaBloqueada(id, async (tx, previa) => {
    const data = leer(b, previa);
    if (data.fechaSalida !== previa.fechaSalida) {
      const conGente = await tx.tourBooking.count({ where: { salidaId: id, status: { notIn: ["cancelled", "borrador"] } } });
      if (conGente) throw new ErrorViaje(409, "con-pasajeros", "Esta salida ya tiene pasajeros: no se le cambia el día. Crea otra fecha y muévelos.");
    }
    const o = await ocupacion(tx, id);
    if (data.capacidad < o.ocupados && !b.forzar) {
      throw new ErrorViaje(409, "cupo-bajo", `Ya hay ${o.ocupados} lugares ocupados (${o.enPago} pagando ahora). Para bajar el cupo a ${data.capacidad}, confírmalo.`, { ocupados: o.ocupados });
    }
    try {
      const despues = await tx.salidaGrupal.update({ where: { id }, data });
      return { antes: previa, despues };
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") throw new ErrorViaje(409, "duplicada", "Ya hay una salida ese día.");
      throw e;
    }
  });
}

// ── Lo que pinta el panel ──────────────────────────────────────────────────

export interface PasajeroPanel {
  id: string; folio: string; nombre: string; email: string; telefono: string | null;
  personas: number; total: number; pagado: number; saldo: number; status: string;
  origen: string; liderCodigo: string | null; metodo: string | null; sobrecupo: boolean; creada: string;
  notasInternas: string | null; ligaSaldo: string | null; stripePaymentIntentId: string | null;
}

export interface SalidaPanel {
  id: string; fechaSalida: string; fechaRegreso: string; capacidad: number; minimo: number;
  precio: number; precioPreventa: number | null; precioVigente: number;
  abreEl: string; finPreventa: string | null; fechaCorte: string; saldoDiasAntes: number; saldoVence: string;
  estado: string; estadoPublico: string; hotelBloqueado: boolean; notas: string | null;
  confirmados: number; enPago: number; libres: number;
  vendido: number; cobrado: number; porCobrar: number;
  pasajeros: PasajeroPanel[];
  apartados: { id: string; nombre: string; personas: number; metodo: string | null; expiraEl: string }[];
  espera: { id: string; nombre: string; email: string; whatsapp: string | null; personas: number; estado: string; avisadoEl: string | null }[];
}

export interface LiderPanel {
  id: string; codigo: string; nombre: string; email: string; whatsapp: string; personasEstimadas: number;
  estado: string; notas: string | null; creado: string; pagados: number; apartados: number; meta: number;
}

export async function datosDelPanel(ahora: Date = new Date()) {
  const desde = addDaysYMD(hoyMX(), -45);
  const salidas = await prisma.salidaGrupal.findMany({ where: { fechaRegreso: { gte: desde } }, orderBy: { fechaSalida: "asc" } });
  const ids = salidas.map((s) => s.id);
  const [occ, reservas, apartados, espera, lideres] = await Promise.all([
    ocupacionDeVarias(ids, ahora),
    prisma.tourBooking.findMany({ where: { salidaId: { in: ids } }, orderBy: { createdAt: "asc" } }),
    prisma.apartadoSalida.findMany({ where: { salidaId: { in: ids }, estado: "activo", expiraEl: { gt: ahora } }, orderBy: { createdAt: "asc" } }),
    prisma.listaEspera.findMany({ where: { estado: { in: ["esperando", "avisado"] } }, orderBy: { createdAt: "asc" } }),
    prisma.liderGrupo.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  const pasajero = (r: (typeof reservas)[number]): PasajeroPanel => {
    const meta = metaDe(r);
    return {
      id: r.id, folio: r.confirmationNumber, nombre: r.customerName, email: r.customerEmail, telefono: r.customerPhone,
      personas: r.adults + r.children, total: r.totalAmount, pagado: r.depositoPagado,
      saldo: Math.max(0, r.totalAmount - r.depositoPagado), status: r.status, origen: r.origen,
      liderCodigo: (meta.liderCodigo as string) || null, metodo: (meta.metodoPago as string) || null,
      sobrecupo: /SOBRECUPO/.test(String(meta.notasInternas ?? "")), creada: r.createdAt.toISOString(),
      notasInternas: (meta.notasInternas as string) || null,
      ligaSaldo: (meta.ligaSaldo as { url?: string } | undefined)?.url ?? null,
      stripePaymentIntentId: r.stripePaymentIntentId,
    };
  };

  const filas: SalidaPanel[] = salidas.map((s) => {
    const o = occ.get(s.id)!;
    const suyas = reservas.filter((r) => r.salidaId === s.id).map(pasajero);
    const vivas = suyas.filter((p) => p.status !== "cancelled");
    return {
      id: s.id, fechaSalida: s.fechaSalida, fechaRegreso: s.fechaRegreso, capacidad: s.capacidad, minimo: s.minimo,
      precio: s.precio, precioPreventa: s.precioPreventa, precioVigente: precioVigente(s, ahora),
      abreEl: ymdMX(s.abreEl), finPreventa: s.finPreventa ? ymdMX(s.finPreventa) : null, fechaCorte: ymdMX(s.fechaCorte),
      saldoDiasAntes: s.saldoDiasAntes, saldoVence: saldoVence(s),
      estado: s.estado, estadoPublico: estadoSalida(s, libres(s.capacidad, o), ahora),
      hotelBloqueado: s.hotelBloqueado, notas: s.notas,
      confirmados: o.confirmados, enPago: o.enPago, libres: libres(s.capacidad, o),
      vendido: vivas.reduce((a, p) => a + p.total, 0),
      cobrado: vivas.reduce((a, p) => a + p.pagado, 0),
      porCobrar: vivas.reduce((a, p) => a + p.saldo, 0),
      pasajeros: suyas,
      apartados: apartados.filter((a) => a.salidaId === s.id).map((a) => ({ id: a.id, nombre: a.nombre, personas: a.personas, metodo: a.metodo, expiraEl: a.expiraEl.toISOString() })),
      espera: espera.filter((e) => e.salidaId === s.id).map((e) => ({ id: e.id, nombre: e.nombre, email: e.email, whatsapp: e.whatsapp, personas: e.personas, estado: e.estado, avisadoEl: e.avisadoEl?.toISOString() ?? null })),
    };
  });

  // Cuántos lugares trae cada líder: reservas vivas con su código (pagadas = con anticipo).
  const porLider = new Map<string, { pagados: number; apartados: number }>();
  for (const r of reservas) {
    if (r.status === "cancelled") continue;
    const c = String(metaDe(r).liderCodigo ?? "");
    if (!c) continue;
    const cuenta = porLider.get(c) ?? { pagados: 0, apartados: 0 };
    const p = r.adults + r.children;
    if (r.totalAmount > 0 && r.depositoPagado > 0) cuenta.pagados += p;
    else if (r.totalAmount > 0) cuenta.apartados += p;
    porLider.set(c, cuenta);
  }

  return {
    salidas: filas,
    siguiente: espera.filter((e) => e.salidaId === "").map((e) => ({ id: e.id, nombre: e.nombre, email: e.email, whatsapp: e.whatsapp, personas: e.personas, estado: e.estado, avisadoEl: e.avisadoEl?.toISOString() ?? null })),
    lideres: lideres.map((l): LiderPanel => ({
      id: l.id, codigo: l.codigo, nombre: l.nombre, email: l.email, whatsapp: l.whatsapp, personasEstimadas: l.personasEstimadas,
      estado: l.estado, notas: l.notas, creado: l.createdAt.toISOString(),
      pagados: porLider.get(l.codigo)?.pagados ?? 0, apartados: porLider.get(l.codigo)?.apartados ?? 0, meta: LIDER_PERSONAS,
    })),
    omision: plazosPorOmision(addDaysYMD(hoyMX(), 60)),
  };
}

export type DatosPanel = Awaited<ReturnType<typeof datosDelPanel>>;
