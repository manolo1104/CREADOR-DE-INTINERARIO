// El corte semanal con el socio: qué salidas hubo de lunes a domingo, qué costó
// cada una y cuánto le toca a cada quien.
//
// Cada tarjeta es UNA reserva en UN tour y día (20 oct 2026, Manolo): antes se
// juntaban todas las reservas del mismo tour y día en una «salida», y una de
// Ciudad Valles quedaba revuelta con una de Xilitla aunque su traslado cuesta
// distinto. En las tarjetas solo se capturan COSTOS: si entra o no, y cuánto costó.
//
// Lo cobrado NO sale del panel: se escribe a mano en «La semana», cobro por
// cobro, con quién lo recibió y de qué reserva (Manolo, 20 oct 2026). De eso sale
// lo que Manolo le debe a Martín, que paga los costos de operación. El hotel NO
// es utilidad: lo recibe Manolo y él le paga al hotel, así que se descuenta antes
// del 50/50 (sale de las reservas del panel, no de lo escrito).
//
// Este archivo es puro (sin Prisma): lo usan la página para recalcular en vivo
// y la API para recalcular al guardar, y así nunca discrepan.

import { addDaysYMD, weekdayYMD } from "@/lib/dates";
import type { ConceptoCosto } from "./costos";

/**
 * El reparto (Manolo, 20 oct 2026: «ESTO ES IMPORTANTE»):
 *  - Todos los tours MENOS el RZR: la ganancia (lo cobrado − hotel − Stripe −
 *    Railway − costos) va 50/50 entre Manolo y Martín, y a Martín se le
 *    reponen los costos que pagó. El peso impar del redondeo va al primero.
 *  - El RZR, cualquier ruta (`REPARTO_RZR`): de lo cobrado, el 10 % es de
 *    Erick, el vendedor; de lo que queda (ya sin su Stripe ni su Railway), el
 *    20 % de Manolo y el 80 % de Martín, que de ahí paga los costos del RZR y
 *    le paga a Erick.
 * Qué dinero es de RZR lo dice la casilla «Es de RZR» de cada cobro.
 */
export const SOCIOS_CORTE = [
  { nombre: "Manolo", pct: 50 },
  { nombre: "Martín", pct: 50 },
] as const;

export const REPARTO_RZR = { vendedor: "Erick", pctVendedor: 10, pctManolo: 20 } as const;

/**
 * La primera semana del corte (Manolo, 20 oct 2026). Las de antes NO se
 * enseñan: a petición suya, la API contesta con `ERROR_SEMANA_ANTERIOR` como
 * si fallara, en lugar de mostrarlas con el reparto nuevo. Es a propósito: no
 * es un error de verdad. Fija, no «la semana actual»: si no, cada lunes la
 * semana que se acaba de cerrar dejaría de poder cortarse.
 */
export const PRIMERA_SEMANA_CORTE = "2026-10-19";
export const ERROR_SEMANA_ANTERIOR = "Error al cargar. Intenta más tarde.";

/** Quién recibe el dinero del hospedaje y se lo paga al hotel. */
export const SOCIO_HOTEL = "Manolo";

/**
 * El hosting de Railway: 2 % fijo de todo lo cobrado (Manolo, 20 oct 2026;
 * empezó en 1.8 %), que NO se edita. Sale de los ingresos generales antes de
 * la ganancia y lo recibe Manolo, que es quien le paga a Railway.
 */
export const HOSTING_PCT = 0.02;
export const CONCEPTO_HOSTING = "Hosting Railway";
export const SOCIO_HOSTING = "Manolo";

/** Quién puede tener en sus manos lo cobrado: Manolo y Martín (Erick vende, no cobra). */
export type Receptor = "Manolo" | "Martín";
export const RECEPTORES: Receptor[] = ["Manolo", "Martín"];
/** Quien vende el RZR (Erick): no cobra; su parte se la paga Martín (Manolo, 20 oct 2026). */
export const VENDEDOR = REPARTO_RZR.vendedor;

/**
 * Quién paga los costos de operación (guía, gasolina, entradas, comida): Martín
 * (Manolo, 20 oct 2026). Los de los tours se le reponen; los del RZR salen de
 * su 80 %. Lo que él cobra en efectivo se descuenta de lo que hay que pasarle.
 */
export const SOCIO_COSTOS: Receptor = "Martín";

/**
 * Un cobro de la semana, escrito a mano en «La semana»: cuánto, quién lo
 * recibió y de qué (texto libre: «anticipo de Erika», «saldo Tamul»…).
 * `stripe`: entró por Stripe y Stripe se quedó su comisión (Manolo, 20 oct 2026).
 * `rzr`: es dinero de un RZR, que se reparte aparte (`REPARTO_RZR`).
 */
export interface CobroSemana { monto: number; recibio: Receptor; concepto: string; stripe: boolean; rzr: boolean }

/**
 * La comisión de Stripe no la paga Martín: Stripe la descuenta del dinero que
 * le llega a Manolo. Cuenta en la utilidad, pero no se le repone a nadie.
 */
export const esComisionStripe = (concepto: string) => /comisi[oó]n\s+(de\s+)?stripe/i.test(concepto);

/** Lo que Stripe se queda de cada cobro con tarjeta: 3.6 % + IVA. */
export const COMISION_STRIPE = 0.036 * 1.16;

/** La comisión que se quedó Stripe de un cobro marcado «vino de Stripe». */
export function comisionDeCobro(c: Pick<CobroSemana, "monto" | "stripe">): number {
  return c.stripe ? Math.round((Number(c.monto) || 0) * COMISION_STRIPE) : 0;
}

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
  /** Lo que se registró de ESTE tour en la reserva (su renglón; sin extras ni hotel). */
  precioTour: number;
  /** El total de la reserva, para cuando no es solo este tour. */
  totalReserva: number;
  /** Lo que falta cobrar de la reserva entera (0: pagada). */
  saldo: number;
}

export interface CostoCorte { concepto: string; monto: number }

/**
 * Una reserva en un tour y un día. Se llama «salida» por historia: es una sola
 * reserva a propósito, para que nadie vuelva a juntar clientes en una tarjeta.
 */
export interface SalidaCorte {
  clave: string;            // "YYYY-MM-DD|<id de la reserva>|<slug>" (ver `cortes/route.ts`)
  fecha: string;
  tour: string;
  personas: number;
  reserva: ReservaCorte;
  /** "valles": el cliente sale de Ciudad Valles y sus costos se revisan a mano. */
  zona: "valles" | null;
  /** Recorrido en RZR (cualquier ruta): de lo cobrado por él sale el 10 % de Erick. */
  rzr?: boolean;
  /**
   * Solo en los tours que cobran el traslado desde Valles (la Ruta Surrealista):
   * de dónde salió, lo que se le cobró por ese traslado y, si no se sabe, su
   * hospedaje anotado para decidirlo a ojo.
   */
  cargoValles?: { salida: "valles" | "xilitla" | null; cargo: number; cobrado: number; hospedaje: string | null };
  /** Para volver a proponer costos al juntar tarjetas en una cuenta (`sugerirCostos`). */
  slug: string;
  /** Lo que cuestan los extras de la reserva (solo en su primer tour). */
  extras: number;
  ventas: number;
  /** De `ventas`, lo que es del hotel. */
  hospedaje: number;
  /** Lo que propone el Cotizador (+ extras) si no se ha capturado. La comisión de Stripe ya no va aquí: sale de los cobros marcados en «La semana». */
  costosSugeridos: CostoCorte[];
}

export interface CapturaSalida {
  incluida: boolean;
  costos: CostoCorte[];
  /**
   * La clave de la tarjeta principal de su cuenta junta (la principal se apunta
   * a sí misma). Los costos de la cuenta viven en la principal; las demás solo
   * apuntan a ella. Vacío: la tarjeta lleva su propia cuenta.
   */
  cuenta?: string;
}
export type Captura = Record<string, CapturaSalida>;

/** Los costos del Cotizador por tour (`TourCosto`), para proponer los de una cuenta. */
export type CatalogoCostos = Record<string, ConceptoCosto[]>;

/**
 * "borrador": solo se guardaron los costos («Guardar costos»), el corte sigue
 * pendiente. "cerrado": se hizo el corte. Un cerrado no vuelve a borrador.
 */
export type EstadoCorte = "borrador" | "cerrado";

/** Una cuenta de costos: una tarjeta sola o varias juntas (`cuentasDe`). */
export interface ResultadoSalida {
  clave: string;
  fecha: string;
  /** Los días de sus tarjetas, sin repetir. */
  dias: string[];
  tour: string;
  /** Los tours de la cuenta, sin repetir: su código y color en la hoja impresa. */
  slugs: string[];
  personas: number;
  folio: string;
  cliente: string;
  zona: "valles" | null;
  /** Cuántas tarjetas lleva (1 = no está junta con nada). */
  tarjetas: number;
  /** De `costos`, la comisión de Stripe (no la paga `SOCIO_COSTOS`). */
  costosStripe: number;
  hospedaje: number;
  costos: number;
  detalleCostos: CostoCorte[];
}

export interface ResumenCorte {
  /** Solo las cuentas que entran al corte: una por tarjeta, salvo las juntas. */
  salidas: ResultadoSalida[];
  /** Cuántas tarjetas (reserva en un tour y día) entran al corte. */
  tarjetas: number;
  /** Lo cobrado: la suma de los cobros escritos en «La semana». */
  ventas: number;
  /** Lo que se quedó Stripe de los cobros marcados «vino de Stripe». */
  comisionStripe: number;
  /** El `HOSTING_PCT` de lo cobrado para el hosting de Railway (no se edita). */
  hosting: number;
  /** Lo cobrado de hotel: no es utilidad, lo recibe `SOCIO_HOTEL` para pagarlo. */
  hospedaje: number;
  /** Todos los costos de la semana (tours + RZR). */
  costos: number;
  /**
   * Lo que queda de verdad de lo cobrado: ventas − Stripe − Railway − lo de
   * Erick − hotel. Menos `costos` da `utilidad` (el orden en que lo lee Manolo).
   */
  quedaReal: number;
  /** Los tours que no son RZR: su ganancia va 50/50. */
  tours: { ventas: number; comisionStripe: number; hosting: number; costos: number; ganancia: number };
  /**
   * El RZR: `cobrado` (los cobros marcados «Es de RZR»), `vendedor` (el 10 % de
   * Erick), `queda` (sin Erick, Stripe ni Railway), `manolo` 20 % y `martin` 80 %
   * de `queda`; `costos`, los de sus tarjetas, que paga Martín de su 80 %.
   * `registrado`: lo que dicen las tarjetas de RZR que se ha cobrado, para
   * avisar si no cuadra con lo marcado.
   */
  rzr: { cobrado: number; comisionStripe: number; hosting: number; vendedor: number; queda: number; manolo: number; martin: number; costos: number; registrado: number };
  /** Lo que les queda a Manolo y Martín después de todo: ganancia de tours + lo que queda del RZR − sus costos. */
  utilidad: number;
  /** % de utilidad sobre ventas (0 si no hubo ventas). */
  margen: number;
  /** Lo de cada socio sumando tours y RZR; `hotel` / `hosting`: lo que además recibe para pagar el hotel o Railway. */
  socios: { nombre: string; pct: number; monto: number; hotel: number; hosting: number }[];
  /** Lo cobrado de la semana, por quién lo tiene. */
  recibido: Record<string, number>;
  /** Cada cobro de la semana con su «de qué» ya en palabras (para la hoja impresa). */
  cobrosDetalle: { recibio: Receptor; monto: number; deQue: string; comision: number; rzr: boolean }[];
  /**
   * Las cuentas con Martín (`SOCIO_COSTOS`): los costos de tours que pagó, su
   * 50 % de la ganancia de tours, su 80 % del RZR y lo de Erick (él se lo paga),
   * menos lo que ya tiene en la mano (sin lo que se quedó Stripe). `pasa` > 0:
   * se le pasa esa cantidad; < 0: él la regresa.
   */
  liquidacion: { costosPagados: number; ganancia: number; rzr: number; vendedor: number; cobro: number; pasa: number };
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
    if (typeof v.cuenta === "string" && v.cuenta) out[clave].cuenta = v.cuenta.slice(0, 300);
  }
  return out;
}

/** Única puerta de entrada a los cobros de la semana (del navegador o de la base). */
export function limpiarCobros(raw: unknown): CobroSemana[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c: any) => c && typeof c === "object")
    .map((c: any) => ({
      monto:    entero(c.monto),
      recibio:  (RECEPTORES as string[]).includes(c.recibio) ? (c.recibio as Receptor) : RECEPTORES[0],
      // `nota` era el «otro…» de cuando había una lista de reservas (mismo día).
      concepto: String(c.concepto ?? c.nota ?? "").trim().slice(0, 120),
      stripe:   c.stripe === true,
      rzr:      c.rzr === true,
    }))
    .filter(c => c.monto > 0)
    .slice(0, 200);
}

/** «De qué» es un cobro, en palabras: lo que se escribió. */
export function deQueCobro(c: Pick<CobroSemana, "concepto">): string {
  return c.concepto.trim() || "Sin decir de qué";
}

/**
 * Lo que propone el Cotizador para unas tarjetas que salen juntas. Mismo tour
 * y mismo día es una salida: los costos fijos (guía, gasolina, camioneta) van
 * una vez y los de por persona, por todos. Tours distintos llevan cada uno los
 * suyos. Con una sola tarjeta da lo mismo que proponía siempre.
 */
export function sugerirCostos(
  tarjetas: Pick<SalidaCorte, "slug" | "fecha" | "personas" | "extras">[],
  catalogo: CatalogoCostos,
): CostoCorte[] {
  const salidas = new Map<string, { slug: string; personas: number }>();
  for (const t of tarjetas) {
    const k = `${t.fecha}|${t.slug}`;
    const s = salidas.get(k);
    if (s) s.personas += t.personas;
    else salidas.set(k, { slug: t.slug, personas: t.personas });
  }
  const out: CostoCorte[] = [];
  for (const { slug, personas } of Array.from(salidas.values())) {
    for (const c of catalogo[slug] ?? []) {
      out.push(c.tipo === "persona"
        ? { concepto: `${c.concepto} ($${c.monto.toLocaleString("es-MX")} × ${personas})`, monto: c.monto * personas }
        : { concepto: c.concepto, monto: c.monto });
    }
  }
  const extras = tarjetas.reduce((t, x) => t + x.extras, 0);
  // El hotel NO va aquí: no es un costo de la salida, es dinero que pasa por
  // Manolo y se descuenta aparte (ver `hospedaje`). La comisión de Stripe
  // tampoco: sale de los cobros marcados «vino de Stripe» en «La semana».
  if (extras > 0) out.push({ concepto: "Extras de las reservas", monto: extras });
  return out;
}

export interface CuentaCorte {
  /** La clave de la tarjeta principal, donde viven los costos. */
  clave: string;
  principal: SalidaCorte;
  tarjetas: SalidaCorte[];
}

/**
 * Las cuentas de costos de la semana (20 oct 2026, Manolo: «juntar tours en una
 * sola cuenta de costos»): cada tarjeta sola, salvo las que se juntaron porque
 * fueron en la misma camioneta o comparten un traslado. Una cuenta solo vale si
 * su principal sigue viva y se apunta a sí misma: si se canceló, cada tarjeta
 * vuelve a llevar la suya.
 */
export function cuentasDe(salidas: SalidaCorte[], captura: Captura): CuentaCorte[] {
  const porClave = new Map(salidas.map(s => [s.clave, s]));
  const cuentas = new Map<string, CuentaCorte>();
  const orden: CuentaCorte[] = [];
  for (const s of salidas) {
    let k = captura[s.clave]?.cuenta;
    if (!k || !porClave.has(k) || captura[k]?.cuenta !== k) k = s.clave;
    let c = cuentas.get(k);
    if (!c) {
      c = { clave: k, principal: porClave.get(k) as SalidaCorte, tarjetas: [] };
      cuentas.set(k, c);
      orden.push(c);
    }
    c.tarjetas.push(s);
  }
  return orden;
}

/**
 * Lo que le toca a cada tarjeta de los costos de su cuenta, en proporción a lo
 * que vale en su reserva (al peso, sin perder ni ganar uno). Sirve para los
 * costos por día: una cuenta junta de dos días se reparte entre los dos.
 */
export function costosPorTarjeta(salidas: SalidaCorte[], captura: Captura): Record<string, { incluida: boolean; costos: number }> {
  const out: Record<string, { incluida: boolean; costos: number }> = {};
  for (const cu of cuentasDe(salidas, captura)) {
    const c = capturaDe(cu.principal, captura);
    const partes = repartirExacto(c.costos.reduce((t, x) => t + entero(x.monto), 0), cu.tarjetas.map(t => Math.max(0, t.ventas)));
    cu.tarjetas.forEach((t, i) => { out[t.clave] = { incluida: c.incluida, costos: partes[i] }; });
  }
  return out;
}

/** Lo capturado de una salida o, si nunca se tocó, lo que propone el Cotizador. */
export function capturaDe(s: SalidaCorte, captura: Captura): CapturaSalida {
  return captura[s.clave] ?? { incluida: true, costos: s.costosSugeridos };
}

// ── El estado de resultados ─────────────────────────────────────────────────

/** La ganancia de los tours, mitad y mitad (`SOCIOS_CORTE`): el peso impar va al primero. */
export function repartir(ganancia: number): number[] {
  const segundo = Math.floor(ganancia / 2);
  return [ganancia - segundo, segundo];
}

/**
 * El dinero del RZR (`REPARTO_RZR`): Erick el 10 % de lo cobrado; de lo que
 * queda, ya sin Stripe ni Railway, Manolo el 20 % y Martín el resto.
 */
export function repartirRzr(cobrado: number, comisionStripe: number, hosting: number) {
  const vendedor = Math.round((cobrado * REPARTO_RZR.pctVendedor) / 100);
  const queda    = cobrado - comisionStripe - hosting - vendedor;
  const manolo   = Math.round((queda * REPARTO_RZR.pctManolo) / 100);
  return { vendedor, queda, manolo, martin: queda - manolo };
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

export function calcularCorte(salidas: SalidaCorte[], captura: Captura, cobros: CobroSemana[] = []): ResumenCorte {
  const resultado: ResultadoSalida[] = [];
  const unicos = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) === i);
  // Lo de las tarjetas de RZR: sus costos (los paga Martín de su 80 %) y lo que
  // registran cobrado (para avisar si no cuadra con los cobros marcados).
  let costosRzr = 0, costosStripeRzr = 0, registradoRzr = 0;
  for (const cu of cuentasDe(salidas, captura)) {
    // La cuenta entra o no entera: manda la casilla de su principal.
    const c = capturaDe(cu.principal, captura);
    if (!c.incluida) continue;
    const ts        = cu.tarjetas;
    const costos    = c.costos.reduce((t, x) => t + entero(x.monto), 0);
    const costosStripe = c.costos.filter(x => esComisionStripe(x.concepto)).reduce((t, x) => t + entero(x.monto), 0);
    // Una cuenta junta puede mezclar un RZR con otro tour: sus costos se parten
    // por lo que vale cada tarjeta, como en `costosPorTarjeta`.
    const pesos     = ts.map(t => Math.max(0, t.ventas));
    const partes    = repartirExacto(costos, pesos);
    const partesStripe = repartirExacto(costosStripe, pesos);
    ts.forEach((t, i) => {
      if (!t.rzr) return;
      costosRzr       += partes[i];
      costosStripeRzr += partesStripe[i];
      registradoRzr   += Math.max(0, t.ventas - t.hospedaje);
    });
    const hospedaje = ts.reduce((t, x) => t + x.hospedaje, 0);
    // El grupo de cada reserva cuenta una vez aunque haga varios tours.
    const grupoPorReserva: Record<string, number> = {};
    for (const t of ts) grupoPorReserva[t.reserva.id] = Math.max(grupoPorReserva[t.reserva.id] ?? 0, t.personas);
    const dias = unicos(ts.map(t => t.fecha).sort());
    resultado.push({
      clave: cu.clave, fecha: dias[0], dias,
      tour: unicos(ts.map(t => t.tour)).join(" + "),
      slugs: unicos(ts.map(t => t.slug)),
      personas: Object.values(grupoPorReserva).reduce((a, b) => a + b, 0),
      folio: unicos(ts.map(t => t.reserva.folio)).join(" + "),
      cliente: unicos(ts.map(t => t.reserva.cliente)).join(" + "),
      zona: ts.some(t => t.zona === "valles") ? "valles" : null,
      tarjetas: ts.length,
      costosStripe,
      hospedaje, costos,
      detalleCostos: c.costos.filter(x => x.concepto !== "" || x.monto > 0),
    });
  }
  // Lo cobrado es lo escrito a mano en «La semana», no lo de cada tarjeta.
  const ventas         = cobros.reduce((t, x) => t + entero(x.monto), 0);
  const comisionStripe = cobros.reduce((t, x) => t + comisionDeCobro(x), 0);
  const hospedaje      = resultado.reduce((t, s) => t + s.hospedaje, 0);
  const costos         = resultado.reduce((t, s) => t + s.costos, 0);
  const hosting        = Math.round(ventas * HOSTING_PCT);

  // El RZR: lo marcado «Es de RZR», con su Stripe y su Railway.
  const rzrCobros   = cobros.filter(x => x.rzr);
  const rzrCobrado  = rzrCobros.reduce((t, x) => t + entero(x.monto), 0);
  const rzrStripe   = rzrCobros.reduce((t, x) => t + comisionDeCobro(x), 0);
  const rzrHosting  = Math.min(hosting, Math.round(rzrCobrado * HOSTING_PCT));
  const rzrReparto  = repartirRzr(rzrCobrado, rzrStripe, rzrHosting);

  // Los demás tours: lo que no es RZR, menos hotel, Stripe, Railway y costos → 50/50.
  const tours = {
    ventas: ventas - rzrCobrado,
    comisionStripe: comisionStripe - rzrStripe,
    hosting: hosting - rzrHosting,
    costos: costos - costosRzr,
    ganancia: 0,
  };
  tours.ganancia = tours.ventas - tours.comisionStripe - tours.hosting - hospedaje - tours.costos;
  const [gManolo, gMartin] = repartir(tours.ganancia);

  const socios: ResumenCorte["socios"] = [
    { nombre: "Manolo", pct: 50, monto: gManolo + rzrReparto.manolo, hotel: SOCIO_HOTEL === "Manolo" ? hospedaje : 0, hosting: SOCIO_HOSTING === "Manolo" ? hosting : 0 },
    { nombre: "Martín", pct: 50, monto: gMartin + rzrReparto.martin, hotel: 0, hosting: 0 },
  ];
  const utilidad = tours.ganancia + rzrReparto.queda - costosRzr;

  const recibido: Record<string, number> = Object.fromEntries(RECEPTORES.map(q => [q, 0]));
  for (const x of cobros) recibido[x.recibio] = (recibido[x.recibio] ?? 0) + entero(x.monto);
  const cobrosDetalle = cobros
    .filter(x => entero(x.monto) > 0)
    .map(x => ({ recibio: x.recibio, monto: entero(x.monto), deQue: deQueCobro(x), comision: comisionDeCobro(x), rzr: x.rzr === true }));
  // Las cuentas con Martín: se le reponen los costos de tours que pagó (los del
  // RZR salen de su 80 %), más su 50 % de tours, su 80 % del RZR y lo de Erick
  // (él se lo paga), menos lo que ya tiene en la mano porque lo cobró él.
  const costosPagados = tours.costos - (resultado.reduce((t, s) => t + s.costosStripe, 0) - costosStripeRzr);
  const cobro         = (recibido[SOCIO_COSTOS] ?? 0)
    - cobros.filter(x => x.recibio === SOCIO_COSTOS).reduce((t, x) => t + comisionDeCobro(x), 0);
  return {
    salidas: resultado, tarjetas: resultado.reduce((t, s) => t + s.tarjetas, 0),
    ventas, comisionStripe, hosting, hospedaje, costos,
    quedaReal: ventas - comisionStripe - hosting - rzrReparto.vendedor - hospedaje,
    tours,
    rzr: {
      cobrado: rzrCobrado, comisionStripe: rzrStripe, hosting: rzrHosting, ...rzrReparto,
      costos: costosRzr, registrado: registradoRzr,
    },
    utilidad,
    margen: ventas > 0 ? Math.round((utilidad / ventas) * 100) : 0,
    socios, recibido, cobrosDetalle,
    liquidacion: {
      costosPagados, ganancia: gMartin, rzr: rzrReparto.martin, vendedor: rzrReparto.vendedor, cobro,
      pasa: costosPagados + gMartin + rzrReparto.martin + rzrReparto.vendedor - cobro,
    },
  };
}
