// Servicio (pestaña «Experiencia», 4 nov 2026).
//
// Las reseñas de Google se anotan A MANO en Reseñas (decisión de Manolo del
// 21 oct: sin llave de Google Cloud); el KPI sale de la diferencia entre dos
// lecturas. Por eso el lunes se crea solo un recordatorio si la última lectura
// tiene más de 6 días (`automatizaciones.ts`, regla «lectura-google»).

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { diasDeTourDe } from "@/lib/admin/salidas";
import { agruparClientes } from "@/lib/admin/clientes";
import { historialGoogle, type PuntoGoogle } from "@/lib/admin/satisfaccion";
import { NO_CUENTAN, enPeriodo, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface DatosServicio {
  google: PuntoGoogle[];
  /** Reservas que ya se operaron: su último día de tour y si contestaron el check-in. */
  operadas: { ultimoDia: string; conCheckin: boolean }[];
  encuestas: { enviada: string | null; contestada: string | null; recomendaria: number | null; calificacion: number | null }[];
  /** Clientes y cuántos repiten, con TODAS las reservas capturadas hasta el fin de cada periodo de la serie. */
  vuelven: { hasta: string; clientes: number; repiten: number }[];
  /** Check-ins del periodo con «¿cómo nos conociste?». */
  checkins: { ymd: string; como: string | null }[];
  hoy: string;
}

export interface DetalleServicio {
  google: { actual: PuntoGoogle | null; historial: PuntoGoogle[]; diasDesdeLectura: number | null };
  nps: { promotores: number; pasivos: number; detractores: number; contestadas: number; promedioEstrellas: number | null };
  recomendacion: { checkins: number; porRecomendacion: number };
}
export interface MedicionServicio { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: DetalleServicio }

/** La lectura de Google más reciente en o antes de `fecha`. */
const lecturaAl = (h: PuntoGoogle[], fecha: string) => h.filter(p => p.fecha <= fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1) ?? null;

function resenas(d: DatosServicio, p: Periodo): ValorKpi {
  const operadas = d.operadas.filter(o => enPeriodo(o.ultimoDia, p) && o.ultimoDia < d.hoy).length;
  const antes = lecturaAl(d.google, addDaysYMD(p.desde, -1));
  const despues = lecturaAl(d.google, p.hasta);
  if (!antes || !despues || despues.fecha < p.desde) return sinDato("resenas", "Faltan lecturas de Google: anota la calificación y el número de reseñas en Reseñas cada lunes.");
  const nuevas = Math.max(0, despues.total - antes.total);
  if (operadas === 0) return sinDato("resenas", `${nuevas} reseñas nuevas, pero ninguna reserva operada en el periodo.`);
  const desfasada = antes.fecha < addDaysYMD(p.desde, -4) || despues.fecha < addDaysYMD(p.hasta, -3);
  return tasa("resenas", nuevas, operadas, {
    unidadDetalle: "reservas operadas",
    calidad: desfasada ? "aproximado" : "exacto",
    nota: desfasada ? `Lecturas del ${antes.fecha} y del ${despues.fecha}: no coinciden con el periodo.` : undefined,
  });
}

function encuestasDe(d: DatosServicio, p: Periodo) {
  // Una encuesta «le llegó» si se mandó en el periodo, o si se contestó en él sin marca de envío.
  const env = d.encuestas.filter(e => enPeriodo(e.enviada, p) || (!e.enviada && enPeriodo(e.contestada, p)));
  const cont = d.encuestas.filter(e => enPeriodo(e.contestada, p));
  return { env, cont };
}

function nps(d: DatosServicio, p: Periodo): ValorKpi {
  const { cont } = encuestasDe(d, p);
  const con = cont.filter(e => e.recomendaria !== null);
  if (!con.length) return sinDato("nps", "Nadie contestó «¿nos recomendarías?» en el periodo.");
  const prom = con.filter(e => (e.recomendaria ?? 0) >= 9).length, det = con.filter(e => (e.recomendaria ?? 0) <= 6).length;
  return { clave: "nps", valor: Math.round(((prom - det) / con.length) * 100), detalle: `${con.length} respuesta${con.length === 1 ? "" : "s"}`, calidad: con.length < 10 ? "aproximado" : "exacto", nota: con.length < 10 ? "Con menos de 10 respuestas el NPS se mueve mucho." : undefined };
}

function respuesta(d: DatosServicio, p: Periodo): ValorKpi {
  const { env } = encuestasDe(d, p);
  return tasa("respuesta-encuesta", env.filter(e => e.contestada).length, env.length, { unidadDetalle: "encuestas", sinDatoNota: "No se mandaron encuestas en el periodo." });
}

function vuelven(d: DatosServicio, i: number): ValorKpi {
  const v = d.vuelven[i];
  return v ? tasa("vuelven", v.repiten, v.clientes, { unidadDetalle: "clientes" }) : sinDato("vuelven", "Sin reservas.");
}

function checkin(d: DatosServicio, p: Periodo): ValorKpi {
  const os = d.operadas.filter(o => enPeriodo(o.ultimoDia, p) && o.ultimoDia < d.hoy);
  return tasa("checkin", os.filter(o => o.conCheckin).length, os.length, { unidadDetalle: "reservas operadas", sinDatoNota: "Sin reservas operadas en el periodo." });
}

export function calcularServicio(d: DatosServicio, p: Periodo, periodos: Periodo[]): MedicionServicio {
  const iP = periodos.findIndex(x => x.desde === p.desde && x.hasta === p.hasta);
  const valores = [resenas(d, p), nps(d, p), respuesta(d, p), vuelven(d, iP >= 0 ? iP : d.vuelven.length - 1), checkin(d, p)];
  const v = (f: (x: Periodo, i: number) => ValorKpi) => serie(periodos, (x, i) => f(x, i).valor);
  const series: Record<string, PuntoSerie[]> = {
    resenas: v(x => resenas(d, x)), nps: v(x => nps(d, x)), "respuesta-encuesta": v(x => respuesta(d, x)),
    vuelven: v((_, i) => vuelven(d, i)), checkin: v(x => checkin(d, x)),
  };
  const { cont } = encuestasDe(d, p);
  const con = cont.filter(e => e.recomendaria !== null);
  const estrellas = cont.filter(e => e.calificacion);
  const actual = d.google.at(-1) ?? null;
  const ch = d.checkins.filter(c => enPeriodo(c.ymd, p));
  return {
    valores, series,
    detalle: {
      google: {
        actual, historial: d.google.slice(-12).reverse(),
        diasDesdeLectura: actual ? Math.round((Date.parse(`${d.hoy}T12:00:00Z`) - Date.parse(`${actual.fecha}T12:00:00Z`)) / 86_400_000) : null,
      },
      nps: {
        promotores: con.filter(e => (e.recomendaria ?? 0) >= 9).length,
        pasivos: con.filter(e => (e.recomendaria ?? 0) >= 7 && (e.recomendaria ?? 0) <= 8).length,
        detractores: con.filter(e => (e.recomendaria ?? 0) <= 6).length,
        contestadas: cont.length,
        promedioEstrellas: estrellas.length ? r1(estrellas.reduce((t, e) => t + (e.calificacion ?? 0), 0) / estrellas.length) : null,
      },
      recomendacion: { checkins: ch.length, porRecomendacion: ch.filter(c => c.como === "recomendacion").length },
    },
  };
}

export async function cargarServicio(periodos: Periodo[], hoy: string): Promise<DatosServicio> {
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const [google, reservas, encuestas] = await Promise.all([
    historialGoogle().catch(() => []),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN } }, include: { encuesta: { select: { checkinEn: true } } } }),
    prisma.encuestaReserva.findMany({
      where: { OR: [{ satisfaccionEnviadaEn: { not: null } }, { satisfaccionEn: { not: null } }, { checkinEn: { not: null } }] },
      select: { satisfaccionEnviadaEn: true, satisfaccionEn: true, recomendaria: true, calificacion: true, checkinEn: true, comoNosConocio: true },
    }),
  ]);
  const ultimoDia = (b: (typeof reservas)[number]) => diasDeTourDe(b).map(x => x.fecha).sort().at(-1) ?? b.tourDate;
  return {
    google,
    operadas: reservas.map(b => ({ ultimoDia: ultimoDia(b), conCheckin: !!b.encuesta?.checkinEn })).filter(o => o.ultimoDia >= addDaysYMD(desde, -1) && o.ultimoDia <= hasta),
    encuestas: encuestas.map(e => ({
      enviada: e.satisfaccionEnviadaEn ? ymdMX(e.satisfaccionEnviadaEn) : null,
      contestada: e.satisfaccionEn && e.calificacion ? ymdMX(e.satisfaccionEn) : null,
      recomendaria: e.recomendaria, calificacion: e.calificacion,
    })),
    vuelven: periodos.map(x => {
      const cl = agruparClientes(reservas.filter(b => ymdMX(b.createdAt) <= x.hasta));
      return { hasta: x.hasta, clientes: cl.length, repiten: cl.filter(c => c.totalReservas > 1).length };
    }),
    checkins: encuestas.filter(e => e.checkinEn).map(e => ({ ymd: ymdMX(e.checkinEn!), como: e.comoNosConocio })),
    hoy,
  };
}

export async function medirServicio(p: Periodo, periodos: Periodo[], hoy: string): Promise<MedicionServicio> {
  return calcularServicio(await cargarServicio(periodos, hoy), p, periodos);
}
