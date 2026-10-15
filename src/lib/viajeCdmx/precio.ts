/**
 * 🔴 LA ÚNICA FUENTE del precio del viaje CDMX–Xilitla.
 *
 * La página, el calendario, el checkout, el cobro en el servidor, los correos y
 * los datos estructurados preguntan aquí. Nadie más multiplica un precio: el
 * sitio ya tuvo tarjetas que decían una cosa y un carrito que cobraba otra.
 *
 * Funciones puras y sin base de datos: corren igual en el servidor que en el
 * navegador, así que la cuenta que ve el cliente es la misma que cobra Stripe.
 * La palabra final la tiene el servidor (`apartar`), que recalcula y rechaza
 * con «el precio cambió» si lo que vio el cliente ya no vale.
 */
import { addDaysYMD, weekdayYMD } from "@/lib/dates";
import { ANTICIPO_PCT, ULTIMOS_LUGARES } from "./config";

/** Lo que el precio necesita saber de una salida. Fechas como Date o ISO. */
export interface SalidaPrecio {
  fechaSalida: string;
  fechaRegreso: string;
  capacidad: number;
  precio: number;
  precioPreventa: number | null;
  abreEl: Date | string;
  finPreventa: Date | string | null;
  fechaCorte: Date | string;
  saldoDiasAntes: number;
  estado: string;
}

const t = (d: Date | string | null | undefined): number => (d ? new Date(d).getTime() : NaN);

/** ¿Corre la preventa en este instante? */
export function enPreventa(s: SalidaPrecio, ahora: Date = new Date()): boolean {
  if (s.precioPreventa == null || s.precioPreventa <= 0 || s.precioPreventa >= s.precio) return false;
  const fin = t(s.finPreventa);
  if (!Number.isFinite(fin)) return false;
  const now = ahora.getTime();
  return now >= t(s.abreEl) && now < fin;
}

/** El precio por persona que vale AHORA. */
export function precioVigente(s: SalidaPrecio, ahora: Date = new Date()): number {
  return enPreventa(s, ahora) ? (s.precioPreventa as number) : s.precio;
}

/** YYYY-MM-DD en que vence el saldo. */
export function saldoVence(s: Pick<SalidaPrecio, "fechaSalida" | "saldoDiasAntes">): string {
  return addDaysYMD(s.fechaSalida, -Math.max(0, s.saldoDiasAntes));
}

export interface Montos {
  unitario: number;
  personas: number;
  total: number;
  /** Lo que se cobra hoy. */
  anticipo: number;
  saldo: number;
  /** YYYY-MM-DD. */
  saldoVence: string;
}

/**
 * Las cuentas de un apartado. Con `unitario` se usa un precio ya congelado
 * (el de un apartado hecho en preventa); sin él, el vigente.
 */
export function montos(
  s: SalidaPrecio,
  personas: number,
  ahora: Date = new Date(),
  unitario: number = precioVigente(s, ahora),
): Montos {
  const total = unitario * personas;
  const anticipo = Math.round((total * ANTICIPO_PCT) / 100);
  return { unitario, personas, total, anticipo, saldo: total - anticipo, saldoVence: saldoVence(s) };
}

/**
 * El estado que enseña el calendario. Cada uno sale de un dato real:
 *  - proxima:    todavía no abre (abreEl en el futuro)
 *  - preventa:   abierta y con precio de preventa vigente
 *  - disponible: abierta, precio normal
 *  - ultimos:    ≤ ULTIMOS_LUGARES libres
 *  - agotado:    0 libres
 *  - cerrada:    pasó la fecha de corte, o la salida se canceló
 */
export type EstadoSalida = "proxima" | "preventa" | "disponible" | "ultimos" | "agotado" | "cerrada";

export function estadoSalida(s: SalidaPrecio, disponibles: number, ahora: Date = new Date()): EstadoSalida {
  const now = ahora.getTime();
  if (s.estado !== "publicada" || now >= t(s.fechaCorte)) return "cerrada";
  if (now < t(s.abreEl)) return "proxima";
  if (disponibles <= 0) return "agotado";
  if (disponibles <= ULTIMOS_LUGARES) return "ultimos";
  return enPreventa(s, ahora) ? "preventa" : "disponible";
}

/** ¿Se puede apartar? Lo mismo que el servidor revisa bajo el candado. */
export function seVende(s: SalidaPrecio, ahora: Date = new Date()): boolean {
  const now = ahora.getTime();
  return s.estado === "publicada" && now >= t(s.abreEl) && now < t(s.fechaCorte);
}

// ── Textos de fecha (México) ────────────────────────────────────────────────

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const partes = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m: m - 1, d };
};

/** «11–13 dic» · «29 ene–1 feb» */
export function rangoCorto(desde: string, hasta: string): string {
  const a = partes(desde), b = partes(hasta);
  return a.m === b.m
    ? `${a.d}–${b.d} ${MESES_CORTOS[a.m]}`
    : `${a.d} ${MESES_CORTOS[a.m]}–${b.d} ${MESES_CORTOS[b.m]}`;
}

/** «11 al 13 de diciembre» · «29 de enero al 1 de febrero» */
export function rangoLargo(desde: string, hasta: string): string {
  const a = partes(desde), b = partes(hasta);
  return a.m === b.m
    ? `${a.d} al ${b.d} de ${MESES[a.m]}`
    : `${a.d} de ${MESES[a.m]} al ${b.d} de ${MESES[b.m]}`;
}

/** «viernes 11 de diciembre» */
export function fechaLarga(ymd: string): string {
  const p = partes(ymd);
  return `${DIAS_SEMANA[weekdayYMD(ymd)]} ${p.d} de ${MESES[p.m]}`;
}

/** «11 de diciembre» de un YYYY-MM-DD. */
export function diaYMD(ymd: string): string {
  const p = partes(ymd);
  return `${p.d} de ${MESES[p.m]}`;
}

/** «11 de diciembre» de un instante, en hora de México. */
export function diaMX(d: Date | string): string {
  const ymd = new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const p = partes(ymd);
  return `${p.d} de ${MESES[p.m]}`;
}

/** «$6,490» */
export function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}
