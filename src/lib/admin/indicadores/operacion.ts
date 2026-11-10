// Operación (pestaña «Ocupación», 4 nov 2026).
//
// Salidas = tour + día (las mismas del Calendario y de «Salidas del día»).
// El margen sale de los CORTES CERRADOS (fórmula del documento: «utilidad del
// corte ÷ ventas del corte»), y «a tiempo» se lee de la Bitácora: el corte no
// guarda cuándo se cerró, pero la Bitácora anota «Corte semanal …» al hacerlo.

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { avanceChecklist } from "@/lib/admin/checklistSalida";
import { grupoDe } from "@/lib/admin/reserva";
import { bajoMinimoRentable, diasDeTourDe, salidaYaOperada } from "@/lib/admin/salidas";
import { salidasEntre } from "@/lib/admin/salidasDia";
import { PRIMERA_SEMANA_CORTE } from "@/lib/admin/corteSemanal";
import { limpiarIncidencias, type Incidencia } from "@/lib/admin/incidencias";
import { finMX, inicioMX, lunesDeFecha } from "./periodo";
import { NO_CUENTAN, enPeriodo, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface SalidaK {
  clave: string; fecha: string; codigo: string; tourNombre: string; personas: number; aMedida: boolean;
  bajoMinimo: boolean; checklist: { hechos: number; total: number }; incidencias: Incidencia[];
  /** Lote 6 (10 nov 2026): por debajo del mínimo del TOUR (no corre así), su mínimo y el estado del registro. */
  noLlega?: boolean; minimo?: number | null; estado?: string;
}
export interface CorteK { semana: string; ventas: number; utilidad: number; estado: string }
export interface DatosOperacion {
  salidas: SalidaK[];
  cortes: CorteK[];
  /** Lunes de la semana → cuándo se hizo su corte por primera vez (ms), según la Bitácora. */
  primerCierre: Record<string, number>;
  reservas: { ymd: string; personas: number; primerDia: string }[];
  hoy: string;
}

export interface DetalleOperacion {
  semanas: { corta: string; salidas: number; paxPorSalida: number | null; bajoMinimo: number }[];
  proximasBajoMinimo: SalidaK[];
  cortes: { semana: string; estado: "a-tiempo" | "tarde" | "falta" | "borrador"; utilidad: number | null; ventas: number | null }[];
  incidencias: (Incidencia & { fecha: string; clave: string; codigo: string; tourNombre: string })[];
  pctUnoODos: number | null;
}

export interface MedicionOperacion { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: DetalleOperacion }

// Pasada = la fecha ya pasó o Operación la marcó «Operada» (lote 6, 10 nov 2026).
const pasadas = (d: DatosOperacion, p: Periodo) => d.salidas.filter(s => enPeriodo(s.fecha, p) && salidaYaOperada(s, d.hoy));

function paxSalida(d: DatosOperacion, p: Periodo): ValorKpi {
  const ss = d.salidas.filter(s => enPeriodo(s.fecha, p));
  if (!ss.length) return sinDato("pax-salida", "Sin salidas en el periodo.");
  const pax = ss.reduce((t, s) => t + s.personas, 0);
  return { clave: "pax-salida", valor: r1(pax / ss.length), detalle: `${pax} personas en ${ss.length} salidas`, calidad: "exacto" };
}

const bajoMinimo = (d: DatosOperacion, p: Periodo): ValorKpi => {
  const ss = d.salidas.filter(s => enPeriodo(s.fecha, p) && !s.aMedida);
  const n = ss.filter(s => s.bajoMinimo).length;
  return { clave: "bajo-minimo", valor: n, detalle: `de ${ss.length} salidas regulares`, calidad: "exacto" };
};

function margen(d: DatosOperacion, p: Periodo): ValorKpi {
  const cs = d.cortes.filter(c => c.estado === "cerrado" && enPeriodo(c.semana, p));
  const ventas = cs.reduce((t, c) => t + c.ventas, 0);
  if (!cs.length || ventas <= 0) return sinDato("margen", "Ningún corte cerrado de las semanas del periodo.");
  const util = cs.reduce((t, c) => t + c.utilidad, 0);
  return { clave: "margen", valor: r1((util / ventas) * 100), detalle: `$${util.toLocaleString("es-MX")} de $${ventas.toLocaleString("es-MX")} en ${cs.length} corte${cs.length === 1 ? "" : "s"}`, calidad: "exacto" };
}

/** Semanas terminadas del periodo, desde que existe el corte semanal. */
function semanasTerminadas(d: DatosOperacion, p: Periodo): string[] {
  const out: string[] = [];
  for (let l = lunesDeFecha(p.desde); l <= p.hasta; l = addDaysYMD(l, 7)) {
    if (l < p.desde && p.tipo !== "semana") continue;
    if (l >= PRIMERA_SEMANA_CORTE && addDaysYMD(l, 6) < d.hoy) out.push(l);
  }
  return out;
}

/** El corte de la semana se hizo a más tardar el lunes siguiente a las 23:59 (hora de México). */
export const aTiempo = (lunes: string, primerCierreMs: number | undefined) =>
  primerCierreMs !== undefined && primerCierreMs <= finMX(addDaysYMD(lunes, 7)).getTime();

function cortesATiempo(d: DatosOperacion, p: Periodo): ValorKpi {
  const ss = semanasTerminadas(d, p);
  return tasa("cortes-tiempo", ss.filter(l => aTiempo(l, d.primerCierre[l])).length, ss.length,
    { unidadDetalle: "semanas", sinDatoNota: "Ninguna semana terminada en el periodo (el corte existe desde el 19 oct)." });
}

function checklist(d: DatosOperacion, p: Periodo): ValorKpi {
  const ss = pasadas(d, p);
  return tasa("checklist", ss.filter(s => s.checklist.total > 0 && s.checklist.hechos === s.checklist.total).length, ss.length,
    { unidadDetalle: "salidas", sinDatoNota: "Sin salidas pasadas en el periodo." });
}

function incidencias(d: DatosOperacion, p: Periodo): ValorKpi {
  const ss = pasadas(d, p);
  return tasa("incidencias", ss.filter(s => s.incidencias.length > 0).length, ss.length,
    { unidadDetalle: "salidas", sinDatoNota: "Sin salidas pasadas en el periodo." });
}

function porReserva(d: DatosOperacion, p: Periodo): { pax: ValorKpi; mismoDia: ValorKpi; pctUnoODos: number | null } {
  const rs = d.reservas.filter(r => enPeriodo(r.ymd, p));
  if (!rs.length) return { pax: sinDato("pax-reserva", "Sin reservas capturadas en el periodo."), mismoDia: sinDato("mismo-dia", "Sin reservas capturadas en el periodo."), pctUnoODos: null };
  const pax = rs.reduce((t, r) => t + r.personas, 0);
  const unoODos = rs.filter(r => r.personas <= 2).length;
  return {
    pax: { clave: "pax-reserva", valor: r1(pax / rs.length), detalle: `${Math.round((unoODos / rs.length) * 100)} % con 1 o 2 personas`, calidad: "exacto" },
    mismoDia: tasa("mismo-dia", rs.filter(r => r.primerDia <= addDaysYMD(r.ymd, 1)).length, rs.length, { unidadDetalle: "reservas" }),
    pctUnoODos: Math.round((unoODos / rs.length) * 100),
  };
}

export function calcularOperacion(d: DatosOperacion, p: Periodo, periodos: Periodo[]): MedicionOperacion {
  const pr = porReserva(d, p);
  const valores = [paxSalida(d, p), bajoMinimo(d, p), margen(d, p), cortesATiempo(d, p), checklist(d, p), incidencias(d, p), pr.pax, pr.mismoDia];
  const v = (f: (x: Periodo) => ValorKpi) => serie(periodos, x => f(x).valor);
  const series: Record<string, PuntoSerie[]> = {
    "pax-salida": v(x => paxSalida(d, x)), "bajo-minimo": v(x => bajoMinimo(d, x)), "margen": v(x => margen(d, x)),
    "cortes-tiempo": v(x => cortesATiempo(d, x)), "checklist": v(x => checklist(d, x)), "incidencias": v(x => incidencias(d, x)),
    "pax-reserva": v(x => porReserva(d, x).pax), "mismo-dia": v(x => porReserva(d, x).mismoDia),
  };
  const cortes = Array.from(new Set(periodos.flatMap(x => semanasTerminadas(d, x)))).sort().reverse().map(l => {
    const c = d.cortes.find(x => x.semana === l);
    const estado = !c ? "falta" : c.estado !== "cerrado" ? "borrador" : aTiempo(l, d.primerCierre[l]) ? "a-tiempo" : "tarde";
    return { semana: l, estado: estado as DetalleOperacion["cortes"][number]["estado"], utilidad: c?.estado === "cerrado" ? c.utilidad : null, ventas: c?.estado === "cerrado" ? c.ventas : null };
  });
  return {
    valores, series,
    detalle: {
      semanas: periodos.map(x => {
        const ss = d.salidas.filter(s => enPeriodo(s.fecha, x));
        const pax = ss.reduce((t, s) => t + s.personas, 0);
        return { corta: x.corta, salidas: ss.length, paxPorSalida: ss.length ? r1(pax / ss.length) : null, bajoMinimo: ss.filter(s => !s.aMedida && s.bajoMinimo).length };
      }),
      proximasBajoMinimo: d.salidas.filter(s => s.fecha >= d.hoy && s.fecha <= addDaysYMD(d.hoy, 14) && (s.bajoMinimo || s.noLlega) && !s.aMedida && s.estado !== "operada").sort((a, b) => a.fecha.localeCompare(b.fecha)),
      cortes,
      incidencias: d.salidas.filter(s => enPeriodo(s.fecha, p)).flatMap(s => s.incidencias.map(i => ({ ...i, fecha: s.fecha, clave: s.clave, codigo: s.codigo, tourNombre: s.tourNombre })))
        .sort((a, b) => b.en.localeCompare(a.en)),
      pctUnoODos: pr.pctUnoODos,
    },
  };
}

export async function cargarOperacion(periodos: Periodo[], hoy: string): Promise<DatosOperacion> {
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const hastaSalidas = hasta > addDaysYMD(hoy, 14) ? hasta : addDaysYMD(hoy, 14);
  const [salidas, registros, cortes, bitacora, reservas] = await Promise.all([
    salidasEntre(desde, hastaSalidas),
    prisma.salida.findMany({ where: { fecha: { gte: desde, lte: hastaSalidas } }, select: { clave: true, incidencias: true } }).catch(() => []),
    prisma.corteSemanal.findMany({ where: { semana: { gte: addDaysYMD(desde, -6), lte: hasta } }, select: { semana: true, ventas: true, utilidad: true, estado: true } }).catch(() => []),
    prisma.bitacora.findMany({ where: { entidad: "corte", createdAt: { gte: inicioMX(addDaysYMD(desde, -7)) } }, select: { createdAt: true, referencia: true, resumen: true }, orderBy: { createdAt: "asc" } }).catch(() => []),
    prisma.tourBooking.findMany({
      where: { createdAt: { gte: inicioMX(desde), lte: finMX(hasta) }, status: { notIn: NO_CUENTAN } },
      select: { createdAt: true, adults: true, children: true, tourSlug: true, tourName: true, tourDate: true, totalAmount: true, lineItems: true, confirmationNumber: true },
    }),
  ]);
  const incPor = new Map(registros.map(r => [r.clave, limpiarIncidencias(r.incidencias)]));
  const primerCierre: Record<string, number> = {};
  for (const b of bitacora) {
    // «Corte semanal …» = se hizo el corte; «Costos del corte … (borrador)» no cuenta.
    if (!b.referencia || !/^Corte semanal/.test(b.resumen)) continue;
    primerCierre[b.referencia] ??= b.createdAt.getTime();
  }
  return {
    salidas: salidas.map(s => ({
      clave: s.clave, fecha: s.fecha, codigo: s.codigo, tourNombre: s.aMedida ? s.nombre || s.tourNombre : s.tourNombre, personas: s.personas, aMedida: s.aMedida,
      // Las canceladas ya no llegan aquí (`salidasEntre`); bajo mínimo = 2 o menos aunque tampoco llegue al del tour.
      bajoMinimo: bajoMinimoRentable(s), noLlega: s.estadoPax === "no-llega", minimo: s.minimo, estado: s.registro.estado,
      checklist: avanceChecklist(s.checklist), incidencias: incPor.get(s.clave) ?? [],
    })),
    cortes, primerCierre,
    reservas: reservas.map(b => ({
      ymd: ymdMX(b.createdAt), personas: grupoDe(b).total,
      primerDia: diasDeTourDe(b).map(x => x.fecha).sort()[0] ?? b.tourDate,
    })),
    hoy,
  };
}

export async function medirOperacion(p: Periodo, periodos: Periodo[], hoy: string): Promise<MedicionOperacion> {
  return calcularOperacion(await cargarOperacion(periodos, hoy), p, periodos);
}
