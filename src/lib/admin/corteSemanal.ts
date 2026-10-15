// El corte semanal con el socio: qué salidas hubo de lunes a domingo, qué costó
// cada una y cuánto le toca a cada quien.
//
// Lo que se captura es poco a propósito: si una salida entra o no, y sus
// costos. Las ventas NO se capturan: son lo cobrado en el panel (`montoCobrado`),
// así que un pago que no se registró no aparece — y eso es una señal, no un
// error del corte.
//
// Una reserva con varios tours reparte lo cobrado entre ellos según lo que vale
// cada uno, al peso (la suma siempre da lo cobrado). Si trae hotel, esa parte
// va dentro de lo cobrado pero NO es utilidad: la recibe Manolo y él le paga al
// hotel, así que se descuenta antes del 50/50 y se le anota a él.
//
// Este archivo es puro (sin Prisma): lo usan la página para recalcular en vivo
// y la API para recalcular al guardar, y así nunca discrepan.

import { addDaysYMD, weekdayYMD } from "@/lib/dates";

/** El reparto de la utilidad. El peso impar del redondeo va al primero. */
export const SOCIOS_CORTE = [
  { nombre: "Manolo", pct: 50 },
  { nombre: "Martín", pct: 50 },
] as const;

/** Quién recibe el dinero del hospedaje y se lo paga al hotel. */
export const SOCIO_HOTEL = "Manolo";

/** Lo que Stripe se queda de cada cobro con tarjeta: 3.6 % + IVA. */
export const COMISION_STRIPE = 0.036 * 1.16;

export interface ReservaCorte {
  id: string;
  folio: string;
  cliente: string;
  personas: number;
  /** Lo cobrado de esta reserva que le toca a esta salida (incluye su parte de hotel). */
  cobrado: number;
  /** De `cobrado`, lo que es del hotel (pasa a Manolo). */
  hospedaje: number;
  /** Todo lo cobrado de la reserva, para ver de dónde sale la parte. */
  cobradoReserva: number;
  /** Cuántos tours trae la reserva (entre cuántos se reparte). */
  tours: number;
  /** Lo que falta por cobrar de la reserva completa. */
  pendiente: number;
  /** Lo que necesita la ventana de cobro (`CobroModal`). */
  cobrable: {
    totalAmount: number;
    depositoPagado: number;
    stripePaymentIntentId: string | null;
    lineItems: unknown;
  };
}

export interface CostoCorte { concepto: string; monto: number }

/** Un tour en un día: todas las reservas de ese recorrido esa fecha. */
export interface SalidaCorte {
  clave: string;            // "YYYY-MM-DD|slug"
  fecha: string;
  tour: string;
  personas: number;
  reservas: ReservaCorte[];
  ventas: number;
  /** De `ventas`, lo que es del hotel. */
  hospedaje: number;
  /** Lo que propone el Cotizador (+ comisión Stripe y extras) si no se ha capturado. */
  costosSugeridos: CostoCorte[];
}

export interface CapturaSalida { incluida: boolean; costos: CostoCorte[] }
export type Captura = Record<string, CapturaSalida>;

export interface ResultadoSalida {
  clave: string;
  fecha: string;
  tour: string;
  personas: number;
  reservas: number;
  ventas: number;
  hospedaje: number;
  costos: number;
  utilidad: number;
  detalleCostos: CostoCorte[];
}

export interface ResumenCorte {
  /** Solo las salidas que entran al corte. */
  salidas: ResultadoSalida[];
  ventas: number;
  /** Lo cobrado de hotel: no es utilidad, lo recibe `SOCIO_HOTEL` para pagarlo. */
  hospedaje: number;
  costos: number;
  /** ventas − hospedaje − costos */
  utilidad: number;
  /** % de utilidad sobre ventas (0 si no hubo ventas). */
  margen: number;
  /** `hotel`: lo que además recibe ese socio para pagar el hospedaje. */
  socios: { nombre: string; pct: number; monto: number; hotel: number }[];
}

// ── Semanas ─────────────────────────────────────────────────────────────────

/** El lunes de la semana de un YYYY-MM-DD. */
export function lunesDe(ymd: string): string {
  return addDaysYMD(ymd, -((weekdayYMD(ymd) + 6) % 7));
}

export function domingoDe(lunes: string): string {
  return addDaysYMD(lunes, 6);
}

function fechaUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "12 – 18 oct 2026" · "29 sep – 5 oct 2026" */
export function etiquetaSemana(lunes: string): string {
  const domingo = domingoDe(lunes);
  const f = (ymd: string, conMes: boolean) =>
    fechaUTC(ymd).toLocaleDateString("es-MX", {
      day: "numeric", ...(conMes ? { month: "short" } : {}), timeZone: "UTC",
    }).replace(".", "");
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  return `${f(lunes, !mismoMes)} – ${f(domingo, true)} ${domingo.slice(0, 4)}`;
}

/** "lun 13 oct" */
export function diaCorto(ymd: string): string {
  return fechaUTC(ymd)
    .toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "").replace(",", "");
}

/** "$12,400" · "−$350" */
export function fmx(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("es-MX")}`;
}

// ── Captura ─────────────────────────────────────────────────────────────────

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/** Única puerta de entrada al JSON que llega del navegador o de la base. */
export function limpiarCaptura(raw: unknown): Captura {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Captura = {};
  for (const [clave, v] of Object.entries(raw as Record<string, any>)) {
    if (!v || typeof v !== "object") continue;
    const costos = Array.isArray(v.costos)
      ? v.costos
          .filter((c: any) => c && typeof c === "object")
          .map((c: any) => ({ concepto: String(c.concepto ?? "").trim().slice(0, 120), monto: entero(c.monto) }))
          .filter((c: CostoCorte) => c.concepto !== "" || c.monto > 0)
      : [];
    out[clave] = { incluida: v.incluida !== false, costos };
  }
  return out;
}

/** Lo capturado de una salida o, si nunca se tocó, lo que propone el Cotizador. */
export function capturaDe(s: SalidaCorte, captura: Captura): CapturaSalida {
  return captura[s.clave] ?? { incluida: true, costos: s.costosSugeridos };
}

// ── El estado de resultados ─────────────────────────────────────────────────

export function repartir(utilidad: number, hospedaje = 0): ResumenCorte["socios"] {
  const segundo = Math.floor(utilidad / 2);
  return SOCIOS_CORTE.map((s, i) => ({
    nombre: s.nombre, pct: s.pct,
    monto: i === 0 ? utilidad - segundo : segundo,
    hotel: s.nombre === SOCIO_HOTEL ? hospedaje : 0,
  }));
}

/**
 * Reparte un entero en partes proporcionales a `pesos` sin perder ni ganar un
 * peso: las partes son enteras y suman exactamente `total`. Si todos los pesos
 * son 0, se reparte en partes iguales.
 */
export function repartirExacto(total: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  const suma = pesos.reduce((a, b) => a + b, 0);
  const base = suma > 0 ? pesos : pesos.map(() => 1);
  const div  = suma > 0 ? suma : pesos.length;
  const crudos  = base.map(p => (total * p) / div);
  const partes  = crudos.map(Math.floor);
  const sobra   = total - partes.reduce((a, b) => a + b, 0);
  const orden   = crudos.map((c, i) => ({ i, r: c - Math.floor(c) })).sort((a, b) => b.r - a.r);
  for (let k = 0; k < sobra; k++) partes[orden[k % orden.length].i]++;
  return partes;
}

export function calcularCorte(salidas: SalidaCorte[], captura: Captura): ResumenCorte {
  const resultado: ResultadoSalida[] = [];
  for (const s of salidas) {
    const c = capturaDe(s, captura);
    if (!c.incluida) continue;
    const costos = c.costos.reduce((t, x) => t + entero(x.monto), 0);
    resultado.push({
      clave: s.clave, fecha: s.fecha, tour: s.tour, personas: s.personas,
      reservas: s.reservas.length, ventas: s.ventas, hospedaje: s.hospedaje, costos,
      utilidad: s.ventas - s.hospedaje - costos,
      detalleCostos: c.costos.filter(x => x.concepto !== "" || x.monto > 0),
    });
  }
  const ventas    = resultado.reduce((t, s) => t + s.ventas, 0);
  const hospedaje = resultado.reduce((t, s) => t + s.hospedaje, 0);
  const costos    = resultado.reduce((t, s) => t + s.costos, 0);
  const utilidad  = ventas - hospedaje - costos;
  return {
    salidas: resultado, ventas, hospedaje, costos, utilidad,
    margen: ventas > 0 ? Math.round((utilidad / ventas) * 100) : 0,
    socios: repartir(utilidad, hospedaje),
  };
}
