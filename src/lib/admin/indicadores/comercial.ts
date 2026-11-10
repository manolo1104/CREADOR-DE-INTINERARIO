// Comercial (pestaña «Embudo comercial», 4 nov 2026).
//
// Lead → reserva y leads cotizados se miden por COHORTE: los leads que
// entraron en el periodo y lo que pasó con ellos después (así se midió la base
// del documento: «23 de 76»). Una cohorte se da por cerrada 14 días después de
// que termina el periodo; antes se marca «preliminar».
//
// El scorecard de Inicio usa ESTAS mismas funciones (una sola fórmula por KPI).
//
// Lote 9 (10 nov 2026, plan aprobado por Manolo):
//  · «Reservó» = una reserva VIVA (sin canceladas ni borradores) con dinero
//    cobrado. Antes bastaba la etapa del lead o una reserva sin un peso.
//  · La cohorte se CIERRA 14 días después del periodo: lo que pasa después ya
//    no cuenta, así un periodo maduro ya no sube (antes seguía subiendo).
//  · Fuera de la cohorte: los leads que nacieron de una reserva (no hubo lead
//    antes de la compra) y los de la importación inicial.
//  · «Cotización → reserva» cuenta desde que la cotización SALIÓ al cliente.

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { ESTADOS_NO_SALIO, primerMensajeEn5, type MensajeLigero } from "@/lib/admin/bandeja";
import { mensajesParaKpi } from "@/lib/admin/bandejaDatos";
import { saldoPendiente } from "@/lib/admin/dinero";
import { diasDeTourDe } from "@/lib/admin/salidas";
import { CREADO_POR_IMPORTACION, contarMotivos } from "@/lib/admin/crm";
import { montoCobrado } from "@/lib/admin/dinero";
import { leerOrigenWeb } from "@/lib/admin/origenWeb";
import { HECHA_POR_REGLA } from "@/lib/admin/automatizaciones";
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
/** Días que se espera a una cohorte después de que termina su periodo. */
export const DIAS_COHORTE = 14;

export interface LeadCohorte {
  id: string; ymd: string; canal: string; responsable: string | null; etapa: string;
  /** Cambios de etapa: a qué etapa y cuándo (ms). */
  historial: { nueva: string; en: number }[];
  /** Cuándo entró el primer dinero a una reserva VIVA del lead (ms); null = ninguna reserva viva con dinero (lote 9). */
  pagoEn: number | null;
  /** Cuándo salió al cliente su primera cotización (ms); null = ninguna salió. */
  cotizacionEn: number | null;
  /**
   * No entra a la cohorte (lote 9): «comprado» = nació de una reserva (no hubo
   * lead antes de la compra); «importado» = lo sembró la importación inicial.
   */
  fuera?: "comprado" | "importado" | null;
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
/** Una cotización que salió al cliente: `ymd` y `enviada` son de su ENVÍO (lote 9), no de cuando se creó el borrador. */
export interface CotizacionK {
  ymd: string; enviada: number; total: number; status: string; aceptadaEn: number | null;
  /** La fecha en que se aceptó se estimó (las de antes del 4 nov). */
  aproximada: boolean;
  /** La fecha de envío se estimó (las de antes del 10 nov sin rastro en la Bitácora). */
  envioAproximado?: boolean;
}

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

/** Hasta cuándo (ms) cuenta lo que hicieron los leads de un periodo: 14 días después de que termina (lote 9). */
export const cierreCohorte = (p: Pick<Periodo, "hasta">) => finMX(addDaysYMD(p.hasta, DIAS_COHORTE)).getTime();

/** ¿Llegó a alguna de esas etapas a más tardar en `corte`? Sin historial, se cree a la etapa de hoy. */
const llego = (l: LeadCohorte, etapas: string[], corte: number) =>
  l.historial.length ? l.historial.some(h => etapas.includes(h.nueva) && h.en <= corte) : etapas.includes(l.etapa);
/** Reservó = una reserva viva con dinero cobrado, a más tardar en `corte` (lote 9: ya no basta la etapa). */
export const reservo = (l: LeadCohorte, corte = Infinity) => l.pagoEn !== null && l.pagoEn <= corte;
export const cotizo = (l: LeadCohorte, corte = Infinity) =>
  llego(l, ETAPAS_COTIZADO, corte) || (l.cotizacionEn !== null && l.cotizacionEn <= corte) || reservo(l, corte);
/** Los leads de la cohorte de un periodo: entraron en él y no nacieron comprados ni importados (lote 9). */
export const cohorteDe = (leads: LeadCohorte[], p: Pick<Periodo, "desde" | "hasta">) => leads.filter(l => enPeriodo(l.ymd, p) && !l.fuera);

/**
 * ¿El lead nació de una reserva? (lote 9) Su primera reserva se capturó antes
 * que el lead: es la regla «reserva sin lead → nace el lead» del CRM, no un
 * contacto que se convirtió. Puro, para probarlo.
 */
export const nacioComprado = (leadCreado: number, reservasCreadas: number[]) => reservasCreadas.some(r => r <= leadCreado);

/**
 * Cuándo salió al cliente una cotización (lote 9). `enviadaEn` desde el 10 nov;
 * las de antes, con lo mejor que haya: la primera «envió» de la Bitácora
 * (correo, WhatsApp o PDF), el arranque de su seguimiento por correo, o —sin
 * nada— cuando se creó (aproximado).
 */
export function fechaDeEnvio(q: { enviadaEn?: Date | null; createdAt: Date; lineItems?: unknown }, primeraBitacora?: Date | null): { en: Date; aproximada: boolean } {
  if (q.enviadaEn) return { en: q.enviadaEn, aproximada: false };
  if (primeraBitacora) return { en: primeraBitacora, aproximada: false };
  const meta = Array.isArray(q.lineItems) ? (q.lineItems as Record<string, unknown>[]).find(x => x && x._meta === true) : null;
  const seq = typeof meta?.seqDesde === "string" ? new Date(meta.seqDesde) : null;
  if (seq && !Number.isNaN(seq.getTime()) && seq >= q.createdAt) return { en: seq, aproximada: true };
  return { en: q.createdAt, aproximada: true };
}

/** Leads de la revisión del jueves que caen en el periodo (por el lunes de su semana). */
function leadsRevision(d: DatosComercial, p: Periodo): number | null {
  const rs = d.revisiones.filter(r => enPeriodo(r.semana, p) && r.leadsNuevos !== null);
  return rs.length ? rs.reduce((t, r) => t + (r.leadsNuevos ?? 0), 0) : null;
}

export function leadReserva(d: DatosComercial, p: Periodo): ValorKpi {
  const ls = cohorteDe(d.leads, p);
  const rev = leadsRevision(d, p);
  const faltan = rev !== null && rev > ls.length;
  const corte = cierreCohorte(p);
  return tasa("lead-reserva", ls.filter(l => reservo(l, corte)).length, ls.length, {
    unidadDetalle: "leads", preliminar: !cohorteMadura(p, d.hoy),
    calidad: faltan ? "aproximado" : "exacto",
    nota: faltan ? `El CRM tiene ${ls.length} leads y la revisión del jueves ${rev}: faltan leads en el CRM y la tasa puede salir inflada.` : undefined,
    sinDatoNota: "No entraron leads al CRM en el periodo.",
  });
}

export function leadsCotizados(d: DatosComercial, p: Periodo): ValorKpi {
  const ls = cohorteDe(d.leads, p);
  const rev = leadsRevision(d, p);
  const faltan = rev !== null && rev > ls.length;
  const corte = cierreCohorte(p);
  // Se cierra a los 14 días, como Lead → reserva (lote 9): antes se daba por
  // final a los 3 días y seguía subiendo hasta los 14.
  return tasa("leads-cotizados", ls.filter(l => cotizo(l, corte)).length, ls.length, {
    unidadDetalle: "leads", preliminar: !cohorteMadura(p, d.hoy),
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
  // 14 días desde que SALIÓ al cliente (lote 9), no desde el borrador.
  const aceptada14 = (q: CotizacionK) => q.status === "aceptada" && q.aceptadaEn !== null && q.aceptadaEn - q.enviada <= 14 * DIA;
  const ok = qs.filter(aceptada14);
  const aprox = ok.some(q => q.aproximada);
  const envioAprox = qs.filter(q => q.envioAproximado).length;
  const notas = [
    aprox ? "Algunas se aceptaron antes de que el panel guardara la fecha: se estima con su reserva." : "",
    envioAprox ? `${envioAprox} sin fecha de envío guardada: se estima con su seguimiento o con cuando se creó.` : "",
  ].filter(Boolean);
  const o = { preliminar: !cohorteMadura(p, d.hoy), calidad: aprox || envioAprox ? ("aproximado" as const) : ("exacto" as const),
    nota: notas.length ? notas.join(" ") : undefined,
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

  const ls = cohorteDe(d.leads, p);
  const corte = cierreCohorte(p);
  const cotizoL = (l: LeadCohorte) => cotizo(l, corte), reservoL = (l: LeadCohorte) => reservo(l, corte);
  const cot = ls.filter(cotizoL).length, res = ls.filter(reservoL).length;
  const resp = new Map<string, { leads: number; cotizados: number; reservaron: number }>();
  for (const l of ls) {
    const k = l.responsable?.trim() || "Sin responsable";
    const f = resp.get(k) ?? { leads: 0, cotizados: 0, reservaron: 0 };
    f.leads++; if (cotizoL(l)) f.cotizados++; if (reservoL(l)) f.reservaron++;
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
      f.leads++; if (cotizoL(l)) f.cotizados++; if (reservoL(l)) f.reservaron++;
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

  const [ops, cotTrans, quotesLeidas, revisiones, chats, reservas, vivas, perdidos] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { createdAt: rango },
      select: { id: true, createdAt: true, canal: true, responsable: true, etapa: true, origenWeb: true, creadoPor: true, historial: { select: { nueva: true, createdAt: true } } },
    }).catch(() => []),
    // Las veces que un lead pasó a «cotizado» en la serie (para el seguimiento).
    prisma.etapaOportunidad.findMany({ where: { nueva: "cotizado", createdAt: rango }, select: { oportunidadId: true } }).catch(() => []),
    // Las que SALIERON en la serie (lote 9): por su envío, no por el borrador.
    // Las de antes sin fecha de envío se buscan desde 60 días antes y abajo se
    // les estima la fecha.
    prisma.tourQuote.findMany({
      where: { status: { in: ESTADOS_ENVIADA }, OR: [{ enviadaEn: rango }, { enviadaEn: null, createdAt: { gte: inicioMX(addDaysYMD(desde, -60)), lte: rango.lte } }] },
      select: { id: true, quoteNumber: true, createdAt: true, enviadaEn: true, lineItems: true, totalAmount: true, status: true, aceptadaEn: true, oportunidadId: true, updatedAt: true },
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
    idsLeads.length ? prisma.tourBooking.findMany({
      where: { oportunidadId: { in: idsLeads } },
      select: { id: true, oportunidadId: true, status: true, createdAt: true, depositoPagado: true, stripePaymentIntentId: true, totalAmount: true },
    }) : Promise.resolve([]),
    idsLeads.length ? prisma.tourQuote.findMany({
      where: { oportunidadId: { in: idsLeads }, status: { in: ESTADOS_ENVIADA } },
      select: { oportunidadId: true, quoteNumber: true, createdAt: true, enviadaEn: true, lineItems: true },
    }) : Promise.resolve([]),
  ]);
  // Cuándo salió cada cotización sin `enviadaEn` (las de antes del lote 9): la
  // primera «envió» de la Bitácora (correo, WhatsApp o PDF).
  const sinFecha = Array.from(new Set([...quotesLeidas, ...cotLead].filter(q => !q.enviadaEn).map(q => q.quoteNumber)));
  const [bitacoraEnvios, cobros] = await Promise.all([
    sinFecha.length ? prisma.bitacora.findMany({ where: { entidad: "cotización", accion: "envió", referencia: { in: sinFecha } }, select: { referencia: true, createdAt: true }, orderBy: { createdAt: "asc" } }).catch(() => []) : Promise.resolve([]),
    // Cuándo entró el dinero de cada reserva: su primer cobro registrado.
    resLead.length ? prisma.movimiento.findMany({ where: { tipo: "cobro", anulado: false, reservaId: { in: resLead.map(b => b.id) } }, select: { reservaId: true, createdAt: true } }).catch(() => []) : Promise.resolve([]),
  ]);
  const primeraEnvio = new Map<string, Date>();
  for (const b of bitacoraEnvios) if (b.referencia && !primeraEnvio.has(b.referencia)) primeraEnvio.set(b.referencia, b.createdAt);
  const envioDe = (q: { quoteNumber: string; enviadaEn: Date | null; createdAt: Date; lineItems: unknown }) => fechaDeEnvio(q, primeraEnvio.get(q.quoteNumber));

  const primerCobro = new Map<string, number>();
  for (const c of cobros) if (c.reservaId) primerCobro.set(c.reservaId, Math.min(primerCobro.get(c.reservaId) ?? Infinity, c.createdAt.getTime()));
  const minPor = new Map<string, number>(), cotEnPor = new Map<string, number>(), creadasPor = new Map<string, number[]>();
  const menor = (m: Map<string, number>, k: string, v: number) => m.set(k, Math.min(m.get(k) ?? Infinity, v));
  for (const b of resLead) {
    if (!b.oportunidadId || b.status === "borrador") continue;
    creadasPor.set(b.oportunidadId, [...(creadasPor.get(b.oportunidadId) ?? []), b.createdAt.getTime()]);
    // Reservó = reserva VIVA con dinero cobrado; cuenta desde que entró el dinero (lote 9).
    if (!cuenta(b.status) || montoCobrado(b) <= 0) continue;
    menor(minPor, b.oportunidadId, primerCobro.get(b.id) ?? b.createdAt.getTime());
  }
  for (const q of cotLead) if (q.oportunidadId) menor(cotEnPor, q.oportunidadId, envioDe(q).en.getTime());
  const quotes = quotesLeidas.map(q => ({ ...q, envio: envioDe(q) })).filter(q => q.envio.en >= rango.gte && q.envio.en <= rango.lte);

  // Seguimiento: los leads que pasaron a cotizado en la serie, con su historia completa.
  const idsSeg = Array.from(new Set(cotTrans.map(t => t.oportunidadId)));
  const seg = idsSeg.length ? await prisma.oportunidad.findMany({
    where: { id: { in: idsSeg } },
    // Un seguimiento que se cerró solo porque ya no aplicaba (5 nov 2026) no es
    // un seguimiento que alguien hizo: no cuenta como «a tiempo».
    select: { id: true, contactoId: true, historial: { select: { nueva: true, createdAt: true } }, tareas: { where: { hechaEn: { not: null }, OR: [{ hechaPor: null }, { hechaPor: { not: HECHA_POR_REGLA } }] }, select: { hechaEn: true } } },
  }).catch(() => []) : [];
  const contactos = Array.from(new Set(seg.map(o => o.contactoId)));
  const convs = contactos.length ? await prisma.conversacion.findMany({
    where: { contactoId: { in: contactos } },
    // Solo lo que de verdad salió al cliente (lote 9): un mensaje fallido no es seguimiento.
    select: { contactoId: true, mensajes: { where: { direccion: "sale", estado: { notIn: [...ESTADOS_NO_SALIO] }, fecha: { gte: inicioMX(desde), lte: finMX(addDaysYMD(hasta, 4)) } }, select: { fecha: true } } },
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
    const base = { ymd: ymdMX(q.envio.en), enviada: q.envio.en.getTime(), total: q.totalAmount, status: q.status, envioAproximado: q.envio.aproximada };
    if (q.aceptadaEn) return { ...base, aceptadaEn: q.aceptadaEn.getTime(), aproximada: false };
    if (q.status !== "aceptada") return { ...base, aceptadaEn: null, aproximada: false };
    const propia = resPorCot.find(b => b.cotizacionId === q.id)?.createdAt;
    const delLead = resPorOpQ.filter(b => b.oportunidadId && b.oportunidadId === q.oportunidadId && b.createdAt >= q.createdAt).map(b => b.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];
    const en = propia ?? delLead ?? q.updatedAt;
    return { ...base, aceptadaEn: en.getTime(), aproximada: true };
  });

  const ultimoDia = (b: Parameters<typeof diasDeTourDe>[0]) => diasDeTourDe(b).map(x => x.fecha).sort().at(-1) ?? b.tourDate;
  return {
    leads: ops.map(o => ({
      id: o.id, ymd: ymdMX(o.createdAt), canal: o.canal, responsable: o.responsable, etapa: o.etapa,
      historial: o.historial.map(h => ({ nueva: h.nueva, en: h.createdAt.getTime() })),
      pagoEn: minPor.get(o.id) ?? null, cotizacionEn: cotEnPor.get(o.id) ?? null,
      fuera: o.creadoPor === CREADO_POR_IMPORTACION ? "importado" as const
        : nacioComprado(o.createdAt.getTime(), creadasPor.get(o.id) ?? []) ? "comprado" as const : null,
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
