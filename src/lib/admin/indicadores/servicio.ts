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
import { normalizarTelefono } from "@/lib/admin/crm";
import { NO_CUENTAN, enPeriodo, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface DatosServicio {
  google: PuntoGoogle[];
  /**
   * Reservas que ya se operaron: su último día de tour, si contestaron el
   * check-in y si se les pidió la reseña por WhatsApp (null = su chat no está
   * en la Bandeja y no se puede saber).
   */
  operadas: { ultimoDia: string; conCheckin: boolean; resenaPedida?: boolean | null }[];
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

/**
 * Las reseñas nuevas de un periodo, alineadas a la lectura del LUNES (lote 9,
 * 10 nov 2026): de la lectura del día en que empieza (el lunes) a la del día
 * siguiente a que termina (el lunes que sigue). 🔴 Antes se tomaba la lectura
 * del domingo anterior y la del último domingo: con lecturas en lunes, la
 * semana se medía con las reseñas de la semana ANTERIOR. Null si falta la
 * lectura de cierre (la semana en curso, o el lunes sin anotar).
 */
export function nuevasResenas(google: PuntoGoogle[], p: Pick<Periodo, "desde" | "hasta">): { nuevas: number; antes: PuntoGoogle; despues: PuntoGoogle } | null {
  const antes = lecturaAl(google, p.desde);
  const despues = lecturaAl(google, addDaysYMD(p.hasta, 1));
  if (!antes || !despues || despues.fecha <= antes.fecha || despues.fecha < p.desde) return null;
  return { nuevas: Math.max(0, despues.total - antes.total), antes, despues };
}

/** «Reseñas» (la usan Experiencia y el scorecard de Inicio). */
export function resenasDe(d: Pick<DatosServicio, "google" | "operadas" | "hoy">, p: Periodo): ValorKpi {
  const operadas = d.operadas.filter(o => enPeriodo(o.ultimoDia, p) && o.ultimoDia < d.hoy).length;
  const r = nuevasResenas(d.google, p);
  if (!r) return sinDato("resenas", `Falta la lectura de Google del lunes ${addDaysYMD(p.hasta, 1)} (o la del ${p.desde}): anota la calificación y el número de reseñas en Reseñas cada lunes.`);
  if (operadas === 0) return sinDato("resenas", `${r.nuevas} reseñas nuevas, pero ninguna reserva operada en el periodo.`);
  // Una lectura tomada unos días tarde se acepta, avisando: la de inicio hasta
  // 3 días antes; la de cierre, desde el último día del periodo.
  const desfasada = r.antes.fecha < addDaysYMD(p.desde, -3) || r.despues.fecha < p.hasta;
  return tasa("resenas", r.nuevas, operadas, {
    unidadDetalle: "reservas operadas",
    calidad: desfasada ? "aproximado" : "exacto",
    nota: desfasada ? `Lecturas del ${r.antes.fecha} y del ${r.despues.fecha}: no coinciden con los lunes del periodo.` : undefined,
  });
}
const resenas = resenasDe;

/** Días después del viaje en que todavía cuenta haber pedido la reseña. */
export const DIAS_PEDIR_RESENA = 14;
const RE_RESENA = /g\.page|rese[ñn]a|review|opini[oó]n en google|calif[ií]canos/i;

/** ¿Se le pidió la reseña? Un mensaje nuestro con la liga o la palabra, desde el último día del tour hasta 14 días después. */
export function pidioResena(salientes: { ymd: string; texto: string }[], ultimoDia: string): boolean {
  const hasta = addDaysYMD(ultimoDia, DIAS_PEDIR_RESENA);
  return salientes.some(m => m.ymd >= ultimoDia && m.ymd <= hasta && RE_RESENA.test(m.texto));
}

/** «Reseña pedida» (Estructura de oro: se hizo en el 39 % de las reservas; debe ser en todas). */
export function resenaPedida(d: Pick<DatosServicio, "operadas" | "hoy">, p: Periodo): ValorKpi {
  const os = d.operadas.filter(o => enPeriodo(o.ultimoDia, p) && o.ultimoDia < d.hoy);
  const conChat = os.filter(o => o.resenaPedida !== null && o.resenaPedida !== undefined);
  const sinChat = os.length - conChat.length;
  return tasa("resena-pedida", conChat.filter(o => o.resenaPedida).length, conChat.length, {
    unidadDetalle: "reservas operadas con chat",
    preliminar: os.some(o => addDaysYMD(o.ultimoDia, DIAS_PEDIR_RESENA) > d.hoy),
    calidad: sinChat > 0 ? "aproximado" : "exacto",
    nota: sinChat > 0 ? `${sinChat} reserva${sinChat === 1 ? "" : "s"} sin chat en la Bandeja: no se puede ver si se pidió.` : undefined,
    sinDatoNota: "Sin reservas operadas con chat en la Bandeja en el periodo.",
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
  const valores = [resenas(d, p), resenaPedida(d, p), nps(d, p), respuesta(d, p), vuelven(d, iP >= 0 ? iP : d.vuelven.length - 1), checkin(d, p)];
  const v = (f: (x: Periodo, i: number) => ValorKpi) => serie(periodos, (x, i) => f(x, i).valor);
  const series: Record<string, PuntoSerie[]> = {
    resenas: v(x => resenas(d, x)), "resena-pedida": v(x => resenaPedida(d, x)), nps: v(x => nps(d, x)), "respuesta-encuesta": v(x => respuesta(d, x)),
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

const inicioDe = (ymd: string) => new Date(`${addDaysYMD(ymd, -1)}T00:00:00-06:00`);

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
  const enSerie = reservas.filter(b => { const u = ultimoDia(b); return u >= addDaysYMD(desde, -1) && u <= hasta; });
  // La reseña pedida por WhatsApp: el chat de la Bandeja con el mismo teléfono que la reserva.
  const tel = new Map(enSerie.map(b => [b.id, normalizarTelefono(b.customerPhone)]));
  const tels = Array.from(new Set(Array.from(tel.values()).filter((t): t is string => !!t)));
  const chats = tels.length ? await prisma.conversacion.findMany({
    where: { telefono: { in: tels }, noEsCliente: false },
    select: { telefono: true, mensajes: { where: { direccion: "sale", fecha: { gte: inicioDe(desde) } }, select: { fecha: true, texto: true, estado: true } } },
  }).catch(() => []) : [];
  const salientesDe = new Map<string, { ymd: string; texto: string }[]>();
  for (const c of chats) {
    const xs = salientesDe.get(c.telefono!) ?? [];
    for (const m of c.mensajes) if (m.texto && m.estado !== "fallo") xs.push({ ymd: ymdMX(m.fecha), texto: m.texto });
    salientesDe.set(c.telefono!, xs);
  }
  return {
    google,
    operadas: enSerie.map(b => {
      const t = tel.get(b.id);
      const sal = t ? salientesDe.get(t) : undefined;
      return { ultimoDia: ultimoDia(b), conCheckin: !!b.encuesta?.checkinEn, resenaPedida: sal ? pidioResena(sal, ultimoDia(b)) : null };
    }),
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
