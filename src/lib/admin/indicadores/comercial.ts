// Comercial (pestaña «Embudo comercial», 4 nov 2026).
//
// Lead → reserva y leads cotizados se miden por COHORTE: los leads que
// entraron en el periodo y lo que pasó con ellos después (así se midió la base
// del documento: «23 de 76»). Una cohorte se da por cerrada 14 días después de
// que termina el periodo; antes se marca «preliminar».
//
// El scorecard de Inicio usa ESTAS mismas funciones (una sola fórmula por KPI).

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { primerMensajeEn5, type MensajeLigero } from "@/lib/admin/bandeja";
import { mensajesParaKpi } from "@/lib/admin/bandejaDatos";
import { saldoPendiente } from "@/lib/admin/dinero";
import { diasDeTourDe } from "@/lib/admin/salidas";
import { contarMotivos } from "@/lib/admin/crm";
import { leerOrigenWeb } from "@/lib/admin/origenWeb";
import { ETIQUETA_CANAL } from "@/lib/admin/analisisComun";
import { SECCIONES, seccionDePagina } from "./secciones";
import { cohorteMadura, finMX, inicioMX } from "./periodo";
import { NO_CUENTAN, cuenta, enPeriodo, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

/** Cotización que sí salió al cliente (las de «borrador» nunca se mandaron). */
export const ESTADOS_ENVIADA = ["enviada", "aceptada", "expirada"];
const ETAPAS_RESERVA = ["anticipo", "confirmado", "operado"];
const ETAPAS_COTIZADO = ["cotizado", "seguimiento", ...ETAPAS_RESERVA];
const H = 3_600_000;
const DIA = 24 * H;

export interface LeadCohorte {
  id: string; ymd: string; canal: string; responsable: string | null; etapa: string;
  /** Cambios de etapa: a qué etapa y cuándo (ms). */
  historial: { nueva: string; en: number }[];
  /** Reservas ligadas al lead que cuentan (sin canceladas ni borradores). */
  reservas: number;
  cotizacionesEnviadas: number;
  /** Si llegó por un botón del sitio con código de referencia: el canal de su visita y la página del clic. */
  origen?: { canal: string; pagina: string | null } | null;
}
export interface CasoSeguimiento {
  leadId: string;
  /** La primera vez que pasó a «cotizado» (ms). */
  cotizadoEn: number;
  /** La primera vez que llegó a anticipo o más (ms), si llegó. */
  pagoEn: number | null;
  /** ¿Su contacto tiene chat en la Bandeja? Sin chat solo se ven las tareas. */
  conChat: boolean;
  salientes: number[];
  tareasHechas: number[];
}
export interface CotizacionK { ymd: string; creada: number; total: number; status: string; aceptadaEn: number | null; aproximada: boolean }

export interface DatosComercial {
  leads: LeadCohorte[];
  seguimiento: CasoSeguimiento[];
  cotizaciones: CotizacionK[];
  revisiones: { semana: string; leadsNuevos: number | null; respuestas5min: number | null; score: number | null }[];
  chats: MensajeLigero[][];
  reservas: { ymd: string; total: number }[];
  saldos: { folio: string; cliente: string; saldo: number; ultimoDia: string }[];
  perdidos: { ymd: string; motivo: string | null }[];
  ahora: number;
  hoy: string;
}

export interface DetalleComercial {
  embudo: { etiqueta: string; n: number; conversion: number | null }[];
  motivos: { clave: string; etiqueta: string; n: number }[];
  perdidos: number;
  porResponsable: { responsable: string; leads: number; cotizados: number; reservaron: number; tasa: number | null }[];
  saldos: DatosComercial["saldos"];
  leadsCrm: number;
  leadsRevision: number | null;
  preliminar: boolean;
  /** De la web a la reserva (código de referencia, 4 nov 2026): leads del periodo con origen web, por canal y por sección. */
  web: {
    conOrigen: number;
    porCanal: { clave: string; etiqueta: string; leads: number; cotizados: number; reservaron: number }[];
    porSeccion: { clave: string; etiqueta: string; leads: number; cotizados: number; reservaron: number }[];
  };
}

export interface MedicionComercial { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: DetalleComercial }

const llego = (l: LeadCohorte, etapas: string[]) => etapas.includes(l.etapa) || l.historial.some(h => etapas.includes(h.nueva));
export const reservo = (l: LeadCohorte) => llego(l, ETAPAS_RESERVA) || l.reservas > 0;
export const cotizo = (l: LeadCohorte) => llego(l, ETAPAS_COTIZADO) || l.cotizacionesEnviadas > 0 || reservo(l);

/** Leads de la revisión del jueves que caen en el periodo (por el lunes de su semana). */
function leadsRevision(d: DatosComercial, p: Periodo): number | null {
  const rs = d.revisiones.filter(r => enPeriodo(r.semana, p) && r.leadsNuevos !== null);
  return rs.length ? rs.reduce((t, r) => t + (r.leadsNuevos ?? 0), 0) : null;
}

export function leadReserva(d: DatosComercial, p: Periodo): ValorKpi {
  const ls = d.leads.filter(l => enPeriodo(l.ymd, p));
  const rev = leadsRevision(d, p);
  const faltan = rev !== null && rev > ls.length;
  return tasa("lead-reserva", ls.filter(reservo).length, ls.length, {
    unidadDetalle: "leads", preliminar: !cohorteMadura(p, d.hoy),
    calidad: faltan ? "aproximado" : "exacto",
    nota: faltan ? `El CRM tiene ${ls.length} leads y la revisión del jueves ${rev}: faltan leads en el CRM y la tasa puede salir inflada.` : undefined,
    sinDatoNota: "No entraron leads al CRM en el periodo.",
  });
}

export function leadsCotizados(d: DatosComercial, p: Periodo): ValorKpi {
  const ls = d.leads.filter(l => enPeriodo(l.ymd, p));
  const rev = leadsRevision(d, p);
  const faltan = rev !== null && rev > ls.length;
  return tasa("leads-cotizados", ls.filter(cotizo).length, ls.length, {
    unidadDetalle: "leads", preliminar: !cohorteMadura(p, d.hoy, 3),
    calidad: faltan ? "aproximado" : "exacto",
    nota: faltan ? `El CRM tiene ${ls.length} leads y la revisión del jueves ${rev}.` : undefined,
    sinDatoNota: "No entraron leads al CRM en el periodo.",
  });
}

export function respuesta5(d: DatosComercial, p: Periodo): ValorKpi {
  const r = primerMensajeEn5(d.chats, inicioMX(p.desde), finMX(p.hasta));
  if (r.enHorario > 0) return tasa("respuesta-5min", r.en5, r.enHorario, { unidadDetalle: "chats nuevos en horario" });
  const rs = d.revisiones.filter(x => enPeriodo(x.semana, p) && x.respuestas5min !== null && (x.leadsNuevos ?? 0) > 0);
  if (rs.length) {
    return tasa("respuesta-5min", rs.reduce((t, x) => t + (x.respuestas5min ?? 0), 0), rs.reduce((t, x) => t + (x.leadsNuevos ?? 0), 0),
      { unidadDetalle: "leads", calidad: "aproximado", nota: "Contado a mano en la revisión del jueves (la Bandeja no tuvo chats nuevos en horario)." });
  }
  return sinDato("respuesta-5min", "Sin chats nuevos en horario en la Bandeja ni revisión del jueves.");
}

function cotizacionReserva(d: DatosComercial, p: Periodo): { numero: ValorKpi; monto: ValorKpi } {
  const qs = d.cotizaciones.filter(q => enPeriodo(q.ymd, p));
  const aceptada14 = (q: CotizacionK) => q.status === "aceptada" && q.aceptadaEn !== null && q.aceptadaEn - q.creada <= 14 * DIA;
  const ok = qs.filter(aceptada14);
  const aprox = ok.some(q => q.aproximada);
  const o = { preliminar: !cohorteMadura(p, d.hoy), calidad: aprox ? ("aproximado" as const) : ("exacto" as const),
    nota: aprox ? "Algunas se aceptaron antes de que el panel guardara la fecha: se estima con su reserva." : undefined,
    sinDatoNota: "No se enviaron cotizaciones en el periodo." };
  const montoTot = qs.reduce((t, q) => t + q.total, 0);
  const montoOk = ok.reduce((t, q) => t + q.total, 0);
  const monto = montoTot > 0
    ? { clave: "cotizacion-reserva-monto", valor: r1((montoOk / montoTot) * 100), detalle: `$${montoOk.toLocaleString("es-MX")} de $${montoTot.toLocaleString("es-MX")}`, calidad: o.calidad, nota: o.nota, preliminar: o.preliminar }
    : sinDato("cotizacion-reserva-monto", o.sinDatoNota);
  return { numero: tasa("cotizacion-reserva", ok.length, qs.length, { ...o, unidadDetalle: "cotizaciones" }), monto };
}

export function seguimientoATiempo(d: DatosComercial, p: Periodo): ValorKpi {
  const casos = d.seguimiento.filter(c => enPeriodo(ymdMX(c.cotizadoEn), p) && c.cotizadoEn + 72 * H <= d.ahora);
  const necesitaban = casos.filter(c => !(c.pagoEn !== null && c.pagoEn <= c.cotizadoEn + 72 * H));
  const dentro = (t: number, c: CasoSeguimiento) => t > c.cotizadoEn + H && t <= c.cotizadoEn + 72 * H;
  const aTiempo = necesitaban.filter(c => c.salientes.some(t => dentro(t, c)) || c.tareasHechas.some(t => dentro(t, c)));
  const sinChat = necesitaban.filter(c => !c.conChat).length;
  return tasa("seguimiento", aTiempo.length, necesitaban.length, {
    unidadDetalle: "que lo necesitaban",
    calidad: sinChat > 0 ? "aproximado" : "exacto",
    nota: sinChat > 0 ? `${sinChat} sin chat en la Bandeja: en esos solo se ven las tareas hechas.` : undefined,
    sinDatoNota: "Ningún lead cotizado necesitó seguimiento (o aún no pasan 72 h).",
  });
}

function score(d: DatosComercial, p: Periodo): ValorKpi {
  const rs = d.revisiones.filter(r => enPeriodo(r.semana, p) && r.score !== null);
  if (!rs.length) return sinDato("score", "No se guardó la revisión del jueves en el periodo.");
  const v = Math.round(rs.reduce((t, r) => t + (r.score ?? 0), 0) / rs.length);
  return { clave: "score", valor: v, detalle: rs.length > 1 ? `promedio de ${rs.length} semanas` : "revisión del jueves", calidad: "exacto" };
}

function ventas(d: DatosComercial, p: Periodo): ValorKpi[] {
  const rs = d.reservas.filter(r => enPeriodo(r.ymd, p));
  const vendido = rs.reduce((t, r) => t + r.total, 0);
  return [
    { clave: "reservas-mes", valor: rs.length, calidad: "exacto", detalle: "por fecha de captura" },
    { clave: "vendido-mes", valor: vendido, calidad: "exacto", detalle: `${rs.length} reservas` },
    rs.length ? { clave: "ticket", valor: Math.round(vendido / rs.length), calidad: "exacto", detalle: `$${vendido.toLocaleString("es-MX")} ÷ ${rs.length}` } : sinDato("ticket", "Sin reservas en el periodo."),
  ];
}

/** Puro: todos los KPIs comerciales de un periodo, con su tendencia y el detalle. */
export function calcularComercial(d: DatosComercial, p: Periodo, periodos: Periodo[]): MedicionComercial {
  const cr = cotizacionReserva(d, p);
  const saldo = d.saldos.reduce((t, s) => t + s.saldo, 0);
  const valores: ValorKpi[] = [
    leadReserva(d, p), respuesta5(d, p), leadsCotizados(d, p), cr.numero, cr.monto, seguimientoATiempo(d, p), score(d, p),
    ...ventas(d, p),
    { clave: "saldos-vencidos", valor: saldo, calidad: "exacto", detalle: `${d.saldos.length} reserva${d.saldos.length === 1 ? "" : "s"} · al día de hoy` },
  ];
  const v = (f: (x: Periodo) => ValorKpi) => serie(periodos, x => f(x).valor);
  const series: Record<string, PuntoSerie[]> = {
    "lead-reserva": v(x => leadReserva(d, x)),
    "leads-cotizados": v(x => leadsCotizados(d, x)),
    "respuesta-5min": v(x => respuesta5(d, x)),
    "cotizacion-reserva": v(x => cotizacionReserva(d, x).numero),
    "cotizacion-reserva-monto": v(x => cotizacionReserva(d, x).monto),
    "seguimiento": v(x => seguimientoATiempo(d, x)),
    "score": v(x => score(d, x)),
    "reservas-mes": v(x => ventas(d, x)[0]),
    "vendido-mes": v(x => ventas(d, x)[1]),
    "ticket": v(x => ventas(d, x)[2]),
  };

  const ls = d.leads.filter(l => enPeriodo(l.ymd, p));
  const cot = ls.filter(cotizo).length, res = ls.filter(reservo).length;
  const resp = new Map<string, { leads: number; cotizados: number; reservaron: number }>();
  for (const l of ls) {
    const k = l.responsable?.trim() || "Sin responsable";
    const f = resp.get(k) ?? { leads: 0, cotizados: 0, reservaron: 0 };
    f.leads++; if (cotizo(l)) f.cotizados++; if (reservo(l)) f.reservaron++;
    resp.set(k, f);
  }
  const perdidos = d.perdidos.filter(x => enPeriodo(x.ymd, p));
  // De la web a la reserva: solo los leads con código de referencia (el clic se encontró).
  const conWeb = ls.filter(l => l.origen);
  const agrupar = (clave: (l: LeadCohorte) => string, etiqueta: (k: string) => string) => {
    const m = new Map<string, { clave: string; etiqueta: string; leads: number; cotizados: number; reservaron: number }>();
    for (const l of conWeb) {
      const k = clave(l);
      const f = m.get(k) ?? { clave: k, etiqueta: etiqueta(k), leads: 0, cotizados: 0, reservaron: 0 };
      f.leads++; if (cotizo(l)) f.cotizados++; if (reservo(l)) f.reservaron++;
      m.set(k, f);
    }
    return Array.from(m.values()).sort((a, b) => b.leads - a.leads);
  };
  return {
    valores, series,
    detalle: {
      embudo: [
        { etiqueta: "Leads nuevos", n: ls.length, conversion: null },
        { etiqueta: "Cotizados", n: cot, conversion: ls.length ? Math.round((cot / ls.length) * 100) : null },
        { etiqueta: "Reservaron", n: res, conversion: cot ? Math.round((res / cot) * 100) : null },
      ],
      motivos: contarMotivos(perdidos.map(x => x.motivo)),
      perdidos: perdidos.length,
      porResponsable: Array.from(resp.entries()).map(([responsable, f]) => ({ responsable, ...f, tasa: f.leads ? Math.round((f.reservaron / f.leads) * 100) : null }))
        .sort((a, b) => b.leads - a.leads),
      saldos: [...d.saldos].sort((a, b) => b.saldo - a.saldo),
      leadsCrm: ls.length,
      leadsRevision: leadsRevision(d, p),
      preliminar: !cohorteMadura(p, d.hoy),
      web: {
        conOrigen: conWeb.length,
        porCanal: agrupar(l => l.origen!.canal, k => ETIQUETA_CANAL[k as keyof typeof ETIQUETA_CANAL] ?? k),
        porSeccion: agrupar(l => (l.origen!.pagina ? seccionDePagina(l.origen!.pagina) : "otras"), k => SECCIONES.find(s => s.clave === k)?.etiqueta ?? k),
      },
    },
  };
}

/** Lee la base (CRM, Bandeja, cotizaciones, reservas y revisiones) para todos los periodos de la serie. */
export async function cargarComercial(periodos: Periodo[], hoy: string): Promise<DatosComercial> {
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const rango = { gte: inicioMX(desde), lte: finMX(hasta) };

  const [ops, cotTrans, quotes, revisiones, chats, reservas, vivas, perdidos] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { createdAt: rango },
      select: { id: true, createdAt: true, canal: true, responsable: true, etapa: true, origenWeb: true, historial: { select: { nueva: true, createdAt: true } } },
    }).catch(() => []),
    // Las veces que un lead pasó a «cotizado» en la serie (para el seguimiento).
    prisma.etapaOportunidad.findMany({ where: { nueva: "cotizado", createdAt: rango }, select: { oportunidadId: true } }).catch(() => []),
    prisma.tourQuote.findMany({
      where: { createdAt: rango, status: { in: ESTADOS_ENVIADA } },
      select: { id: true, createdAt: true, totalAmount: true, status: true, aceptadaEn: true, oportunidadId: true, updatedAt: true },
    }),
    prisma.revisionSemanal.findMany({ where: { semana: { gte: addDaysYMD(desde, -6), lte: hasta } }, select: { semana: true, leadsNuevos: true, respuestas5min: true, score: true } }).catch(() => []),
    mensajesParaKpi(inicioMX(desde), finMX(hasta)).catch(() => [] as MensajeLigero[][]),
    prisma.tourBooking.findMany({ where: { createdAt: rango, status: { notIn: NO_CUENTAN } }, select: { createdAt: true, totalAmount: true } }),
    prisma.tourBooking.findMany({
      where: { status: { notIn: NO_CUENTAN } },
      select: { confirmationNumber: true, customerName: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true, tourDate: true, tourSlug: true, tourName: true, adults: true, children: true, lineItems: true },
    }),
    prisma.etapaOportunidad.findMany({ where: { nueva: "perdido", createdAt: rango }, select: { createdAt: true, oportunidad: { select: { motivoPerdida: true } } } }).catch(() => []),
  ]);

  // Reservas y cotizaciones ligadas a los leads de la serie.
  const idsLeads = ops.map(o => o.id);
  const [resLead, cotLead] = await Promise.all([
    idsLeads.length ? prisma.tourBooking.findMany({ where: { oportunidadId: { in: idsLeads } }, select: { oportunidadId: true, status: true, createdAt: true, cotizacionId: true } }) : Promise.resolve([]),
    idsLeads.length ? prisma.tourQuote.findMany({ where: { oportunidadId: { in: idsLeads }, status: { in: ESTADOS_ENVIADA } }, select: { oportunidadId: true } }) : Promise.resolve([]),
  ]);
  const cuentaPor = <T extends { oportunidadId: string | null }>(xs: T[], ok: (x: T) => boolean = () => true) => {
    const m = new Map<string, number>();
    for (const x of xs) if (x.oportunidadId && ok(x)) m.set(x.oportunidadId, (m.get(x.oportunidadId) ?? 0) + 1);
    return m;
  };
  const resPor = cuentaPor(resLead, x => cuenta(x.status));
  const cotPor = cuentaPor(cotLead);

  // Seguimiento: los leads que pasaron a cotizado en la serie, con su historia completa.
  const idsSeg = Array.from(new Set(cotTrans.map(t => t.oportunidadId)));
  const seg = idsSeg.length ? await prisma.oportunidad.findMany({
    where: { id: { in: idsSeg } },
    select: { id: true, contactoId: true, historial: { select: { nueva: true, createdAt: true } }, tareas: { where: { hechaEn: { not: null } }, select: { hechaEn: true } } },
  }).catch(() => []) : [];
  const contactos = Array.from(new Set(seg.map(o => o.contactoId)));
  const convs = contactos.length ? await prisma.conversacion.findMany({
    where: { contactoId: { in: contactos } },
    select: { contactoId: true, mensajes: { where: { direccion: "sale", fecha: { gte: inicioMX(desde), lte: finMX(addDaysYMD(hasta, 4)) } }, select: { fecha: true } } },
  }).catch(() => []) : [];
  const salientesDe = new Map<string, number[]>();
  const conChat = new Set<string>();
  for (const c of convs) {
    if (!c.contactoId) continue;
    conChat.add(c.contactoId);
    salientesDe.set(c.contactoId, [...(salientesDe.get(c.contactoId) ?? []), ...c.mensajes.map(m => m.fecha.getTime())]);
  }
  const seguimiento: CasoSeguimiento[] = [];
  for (const o of seg) {
    const cot = o.historial.filter(h => h.nueva === "cotizado").map(h => h.createdAt.getTime()).sort((a, b) => a - b)[0];
    if (cot === undefined) continue;
    const pago = o.historial.filter(h => ETAPAS_RESERVA.includes(h.nueva)).map(h => h.createdAt.getTime()).sort((a, b) => a - b)[0] ?? null;
    seguimiento.push({
      leadId: o.id, cotizadoEn: cot, pagoEn: pago, conChat: conChat.has(o.contactoId),
      salientes: salientesDe.get(o.contactoId) ?? [], tareasHechas: o.tareas.map(t => t.hechaEn!.getTime()),
    });
  }

  // Cuándo se aceptó cada cotización. Desde el 4 nov se guarda (`aceptadaEn`);
  // para las de antes se estima con la reserva que salió de ella o de su lead.
  const idsQ = quotes.map(q => q.id);
  const opsQ = Array.from(new Set(quotes.map(q => q.oportunidadId).filter((x): x is string => !!x)));
  const [resPorCot, resPorOpQ] = await Promise.all([
    idsQ.length ? prisma.tourBooking.findMany({ where: { cotizacionId: { in: idsQ } }, select: { cotizacionId: true, createdAt: true } }) : Promise.resolve([]),
    opsQ.length ? prisma.tourBooking.findMany({ where: { oportunidadId: { in: opsQ } }, select: { oportunidadId: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  const cotizaciones: CotizacionK[] = quotes.map(q => {
    if (q.aceptadaEn) return { ymd: ymdMX(q.createdAt), creada: q.createdAt.getTime(), total: q.totalAmount, status: q.status, aceptadaEn: q.aceptadaEn.getTime(), aproximada: false };
    if (q.status !== "aceptada") return { ymd: ymdMX(q.createdAt), creada: q.createdAt.getTime(), total: q.totalAmount, status: q.status, aceptadaEn: null, aproximada: false };
    const propia = resPorCot.find(b => b.cotizacionId === q.id)?.createdAt;
    const delLead = resPorOpQ.filter(b => b.oportunidadId && b.oportunidadId === q.oportunidadId && b.createdAt >= q.createdAt).map(b => b.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];
    const en = propia ?? delLead ?? q.updatedAt;
    return { ymd: ymdMX(q.createdAt), creada: q.createdAt.getTime(), total: q.totalAmount, status: q.status, aceptadaEn: en.getTime(), aproximada: true };
  });

  const ultimoDia = (b: Parameters<typeof diasDeTourDe>[0]) => diasDeTourDe(b).map(x => x.fecha).sort().at(-1) ?? b.tourDate;
  return {
    leads: ops.map(o => ({
      id: o.id, ymd: ymdMX(o.createdAt), canal: o.canal, responsable: o.responsable, etapa: o.etapa,
      historial: o.historial.map(h => ({ nueva: h.nueva, en: h.createdAt.getTime() })),
      reservas: resPor.get(o.id) ?? 0, cotizacionesEnviadas: cotPor.get(o.id) ?? 0,
      origen: (() => { const w = leerOrigenWeb(o.origenWeb); return w?.conClic ? { canal: w.canal, pagina: w.pagina } : null; })(),
    })),
    seguimiento, cotizaciones, revisiones, chats,
    reservas: reservas.map(b => ({ ymd: ymdMX(b.createdAt), total: b.totalAmount })),
    saldos: vivas.map(b => ({ b, saldo: saldoPendiente(b), ultimo: ultimoDia(b) }))
      .filter(x => x.saldo > 0 && x.ultimo < hoy)
      .map(x => ({ folio: x.b.confirmationNumber, cliente: x.b.customerName, saldo: x.saldo, ultimoDia: x.ultimo })),
    perdidos: perdidos.map(x => ({ ymd: ymdMX(x.createdAt), motivo: x.oportunidad?.motivoPerdida ?? null })),
    ahora: Date.now(), hoy,
  };
}

export async function medirComercial(p: Periodo, periodos: Periodo[], hoy: string): Promise<MedicionComercial> {
  return calcularComercial(await cargarComercial(periodos, hoy), p, periodos);
}
