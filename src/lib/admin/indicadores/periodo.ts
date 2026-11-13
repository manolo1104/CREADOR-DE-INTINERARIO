// Los periodos de medición (4 nov 2026). Puro: sin base ni fechas del sistema;
// `hoy` llega de fuera para poder probarlo.
//
// Regla del documento: «la semana va de lunes a domingo, en hora de México».
// Los de 28 y 90 días terminan AYER por omisión, como los informes de GA4: el
// día de hoy está a medias y bajaría cualquier tasa.

import { addDaysYMD, weekdayYMD } from "@/lib/dates";
import { numeroSemana } from "@/lib/admin/scorecard";
import type { Periodo, TipoPeriodo } from "./tipos";

export const TIPOS_PERIODO: { tipo: TipoPeriodo; etiqueta: string }[] = [
  { tipo: "semana", etiqueta: "Semana" },
  { tipo: "mes", etiqueta: "Mes" },
  { tipo: "28d", etiqueta: "28 días" },
  { tipo: "90d", etiqueta: "90 días" },
];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const esFecha = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && addDaysYMD(v, 0) === v;
const esTipo = (v: unknown): v is TipoPeriodo => TIPOS_PERIODO.some(t => t.tipo === v);

/** El lunes de la semana de una fecha. */
export const lunesDeFecha = (ymd: string) => addDaysYMD(ymd, -((weekdayYMD(ymd) + 6) % 7));

/** «3 nov». */
export const diaMes = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MES_CORTO[Number(ymd.slice(5, 7)) - 1]}`;

function ultimoDiaDelMes(y: number, m: number): string {
  // m: 1–12. El día 0 del mes siguiente es el último de este.
  return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
}

const diasDe = (t: TipoPeriodo) => (t === "28d" ? 28 : 90);

/** El periodo de un tipo que contiene (semana, mes) o termina en (28d, 90d) la fecha `ancla`. */
export function periodoDe(tipo: TipoPeriodo, ancla: string, hoy: string): Periodo {
  if (tipo === "semana") {
    const lunes = lunesDeFecha(ancla);
    const domingo = addDaysYMD(lunes, 6);
    const mismoMes = lunes.slice(5, 7) === domingo.slice(5, 7);
    const rango = mismoMes ? `${Number(lunes.slice(8, 10))}–${diaMes(domingo)}` : `${diaMes(lunes)} – ${diaMes(domingo)}`;
    const sig = addDaysYMD(lunes, 7);
    return {
      tipo, desde: lunes, hasta: domingo, ancla: lunes,
      etiqueta: `Semana ${numeroSemana(lunes)} · ${rango}`, corta: diaMes(lunes),
      anterior: addDaysYMD(lunes, -7), siguiente: sig <= hoy ? sig : null, enCurso: domingo >= hoy,
    };
  }
  if (tipo === "mes") {
    const y = Number(ancla.slice(0, 4)), m = Number(ancla.slice(5, 7));
    const desde = `${ancla.slice(0, 7)}-01`;
    const hasta = ultimoDiaDelMes(y, m);
    const ant = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
    const sig = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return {
      tipo, desde, hasta, ancla: desde,
      etiqueta: `${MESES[m - 1]} de ${y}`, corta: MES_CORTO[m - 1],
      anterior: ant, siguiente: sig <= hoy ? sig : null, enCurso: hasta >= hoy,
    };
  }
  const n = diasDe(tipo);
  const desde = addDaysYMD(ancla, -(n - 1));
  const sig = addDaysYMD(ancla, n);
  return {
    tipo, desde, hasta: ancla, ancla,
    etiqueta: `${n} días · ${diaMes(desde)} – ${diaMes(ancla)}`, corta: `al ${diaMes(ancla)}`,
    anterior: addDaysYMD(ancla, -n), siguiente: sig <= hoy ? sig : null, enCurso: ancla >= hoy,
  };
}

/** Lee `?p=` (tipo) y `?f=` (fecha) de la URL; lo que no sea válido cae al de omisión. */
export function leerPeriodo(sp: { p?: string | string[]; f?: string | string[] }, porDefecto: TipoPeriodo, hoy: string): Periodo {
  const p = Array.isArray(sp.p) ? sp.p[0] : sp.p;
  const f = Array.isArray(sp.f) ? sp.f[0] : sp.f;
  const tipo = esTipo(p) ? p : porDefecto;
  const ayer = addDaysYMD(hoy, -1);
  const omision = tipo === "28d" || tipo === "90d" ? ayer : hoy;
  // Nada en el futuro: un periodo que empieza mañana no tiene datos.
  const ancla = esFecha(f) && f <= hoy ? f : omision;
  return periodoDe(tipo, ancla, hoy);
}

/** Los `n` periodos que terminan en `p` (incluido), del más viejo al más nuevo. */
export function serieDe(p: Periodo, hoy: string, n = 8): Periodo[] {
  const out: Periodo[] = [p];
  while (out.length < n) {
    const previo = out[0];
    if (!previo.anterior) break;
    out.unshift(periodoDe(p.tipo, previo.anterior, hoy));
  }
  return out;
}

/** La liga a una pestaña con un periodo. */
export const hrefPeriodo = (pagina: string, tipo: TipoPeriodo, ancla: string) => `${pagina}?p=${tipo}&f=${ancla}`;

/** Instantes de inicio y fin de un rango de fechas civiles de México (UTC−6 fijo). */
export const inicioMX = (ymd: string) => new Date(`${ymd}T00:00:00-06:00`);
export const finMX = (ymd: string) => new Date(`${ymd}T23:59:59.999-06:00`);

/** ¿Ya pasaron 14 días desde que terminó el periodo? (las cohortes maduran en 14 días). */
export const cohorteMadura = (p: Pick<Periodo, "hasta">, hoy: string, dias = 14) => addDaysYMD(p.hasta, dias) <= hoy;
