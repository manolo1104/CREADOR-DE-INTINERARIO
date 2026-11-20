// Solo servidor: junta los conteos de una semana (lunes a domingo, hora de
// México) y los pasa por `calcularScorecard`. Ventas por fecha de captura;
// operación por fecha de tour (regla del prompt, 3 nov 2026).
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { domingoDe, etiquetaSemana } from "./corteSemanal";
import { montoCobrado, saldoPendiente } from "./dinero";
import { mensajesParaKpi } from "./bandejaDatos";
import { primerMensajeEn5 } from "./bandeja";
import { bajoMinimoRentable, diasDeTourDe } from "./salidas";
import { SIN_IMPORTADOS } from "./crm";
import { NO_CUENTAN } from "@/lib/cupoTour";
import { salidasEntre, type SalidaOperativa } from "./salidasDia";
import { avanceChecklist } from "./checklistSalida";
import { historialGoogle } from "./satisfaccion";
import { etapaDe } from "@/lib/vencimientoCotizacion";
import { ETAPA_PERDIDO, esCotizacionPerdida, leadsDeCotizaciones } from "@/lib/cotizaciones/marcaPerdido";
import { calcularScorecard, numeroSemana, type Scorecard } from "./scorecard";
import { calcularComercial, cargarComercial } from "./indicadores/comercial";
import { periodoDe } from "./indicadores/periodo";
import { nuevasResenas, resenasDe } from "./indicadores/servicio";
import type { ValorKpi } from "./indicadores/tipos";

export interface RevisionSemanalDatos {
  semana: string;
  leadsNuevos: number | null;
  respuestas5min: number | null;
  leadsCotizados: number | null;
  score: number | null;
  resenasNuevas: number | null;
  notas: string;
  guardadoPor: string;
}

export interface SalidaResumen {
  clave: string; fecha: string; codigo: string; tourNombre: string; clientes: string[]; personas: number; cupo: number | null;
  estadoPax: SalidaOperativa["estadoPax"]; margen: number | null; checklist: { hechos: number; total: number }; guia: string;
}

export interface Pendiente { tipo: "saldos" | "cotizaciones" | "salida" | "bajo-minimo" | "chats"; titulo: string; detalle: string; href: string; tono: "problema" | "atencion" | "neutro" }

export interface DatosScorecard {
  semana: { lunes: string; domingo: string; etiqueta: string; numero: number; esActual: boolean };
  scorecard: Scorecard;
  revision: RevisionSemanalDatos;
  /** Las reseñas de Google que salen de la lectura semanal (para proponerlas en la revisión). */
  resenasGoogleSemana: number | null;
  /** Leads capturados en el CRM esa semana (Fase 2): se usan si la revisión no trae el número. */
  leadsCrm: number;
  cotizadosDelPanel: number;
  pendientes: Pendiente[];
  salidasSemana: SalidaResumen[];
}

const inicioMX = (ymd: string) => new Date(`${ymd}T00:00:00-06:00`);
const finMX = (ymd: string) => new Date(`${ymd}T23:59:59.999-06:00`);
const ultimoDia = (b: Parameters<typeof diasDeTourDe>[0]) => diasDeTourDe(b).map(d => d.fecha).sort().at(-1) ?? "";

export async function datosScorecard(lunes: string): Promise<DatosScorecard> {
  const domingo = domingoDe(lunes);
  const hoy = hoyMX();
  const mesIni = `${lunes.slice(0, 7)}-01`;
  const mesFin = ymdMX(new Date(Date.UTC(Number(lunes.slice(0, 4)), Number(lunes.slice(5, 7)), 0, 12)));

  // Lo comercial de la semana con las MISMAS funciones que «Embudo comercial»
  // (lote 9, 10 nov 2026): cohorte sin leads importados ni nacidos de una
  // reserva, cerrada a 14 días, y «reservó» = reserva viva con dinero.
  const pSemana = periodoDe("semana", lunes, hoy);
  const comercial = await cargarComercial([pSemana], hoy).then(d => calcularComercial(d, pSemana, [pSemana])).catch(e => { console.error("scorecard (comercial):", (e as Error)?.message); return null; });
  const valorDe = (k: string): ValorKpi => comercial?.valores.find(v => v.clave === k) ?? { clave: k, valor: null, calidad: "sin-dato" };
  const leadsCrm = comercial ? comercial.detalle.leadsCrm
    : await prisma.oportunidad.count({ where: { createdAt: { gte: inicioMX(lunes), lte: finMX(domingo) }, ...SIN_IMPORTADOS } }).catch(() => 0);
  const manana = addDaysYMD(hoy, 1);
  const [sinResponder, salidasManana] = await Promise.all([
    // Chats cuyo último mensaje es del cliente y lleva más de 10 min sin respuesta (plan: «alerta a los 10 min»).
    prisma.conversacion.count({ where: { noEsCliente: false, archivada: false, ultimoDe: "cliente", ultimoEntranteEn: { lt: new Date(Date.now() - 10 * 60_000), gte: new Date(Date.now() - 48 * 3_600_000) } } }).catch(() => 0),
    salidasEntre(manana, manana).catch(() => []),
  ]);
  const [creadas, delMes, cotizaciones, enTour, revisionRaw, google, salidasTodas, salidasHoy, enviadas, vivas, corte] = await Promise.all([
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN }, createdAt: { gte: inicioMX(lunes), lte: finMX(domingo) } } }),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN }, createdAt: { gte: inicioMX(mesIni), lte: finMX(mesFin) } }, select: { totalAmount: true } }),
    prisma.tourQuote.findMany({ where: { createdAt: { gte: inicioMX(lunes), lte: finMX(domingo) }, status: { not: "archivada" } }, select: { customerEmail: true, customerPhone: true, status: true } }),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN }, tourDate: { gte: addDaysYMD(lunes, -21), lte: addDaysYMD(domingo, 21) } } }),
    prisma.revisionSemanal.findUnique({ where: { semana: lunes } }).catch(() => null),
    historialGoogle().catch(() => []),
    salidasEntre(lunes, domingo),
    salidasEntre(hoy, hoy),
    prisma.tourQuote.findMany({ where: { status: "enviada" } }),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN } }, select: { totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true, tourDate: true, tourSlug: true, tourName: true, adults: true, children: true, lineItems: true, confirmationNumber: true } }),
    // «Margen del corte» (lote 9): el KPI oficial sale del corte de la semana.
    prisma.corteSemanal.findUnique({ where: { semana: lunes }, select: { ventas: true, utilidad: true, estado: true } }).catch(() => null),
  ]);
  // Personas por salida y el margen estimado: solo las salidas regulares, sin
  // viaje CDMX, RZR, buceo, a medida ni renglones de concepto (lote 9, como Ocupación).
  const salidas = salidasTodas.filter(s => !s.aMedida);

  // Los cotizados de la cohorte, como en Embudo (lote 9); antes contaba
  // también borradores que nunca salieron.
  const cotizados = comercial ? (comercial.detalle.embudo[1]?.n ?? 0)
    : new Set(cotizaciones.filter(q => q.status !== "borrador").map(q => (q.customerPhone || q.customerEmail || "").trim().toLowerCase()).filter(Boolean)).size;
  const operadas = enTour.filter(b => { const u = ultimoDia(b); return u >= lunes && u <= domingo; }).length;
  const conCostos = salidas.filter(s => s.numeros.conCostos);
  // Reseñas de Google en la semana: de la lectura del lunes a la del lunes siguiente (lote 9).
  const resenasGoogleSemana = nuevasResenas(google, pSemana)?.nuevas ?? null;

  const revision: RevisionSemanalDatos = {
    semana: lunes,
    leadsNuevos: revisionRaw?.leadsNuevos ?? null,
    respuestas5min: revisionRaw?.respuestas5min ?? null,
    leadsCotizados: revisionRaw?.leadsCotizados ?? null,
    score: revisionRaw?.score ?? null,
    resenasNuevas: revisionRaw?.resenasNuevas ?? null,
    notas: revisionRaw?.notas ?? "",
    guardadoPor: revisionRaw?.guardadoPor ?? "",
  };

  const scorecard = calcularScorecard({
    leadsNuevos: revision.leadsNuevos ?? (leadsCrm > 0 ? leadsCrm : null),
    respuestas5min: revision.respuestas5min,
    respuestaBandeja: await mensajesParaKpi(inicioMX(lunes), finMX(domingo)).then(cs => primerMensajeEn5(cs, inicioMX(lunes), finMX(domingo))).catch(() => null),
    leadsCotizados: revision.leadsCotizados,
    cotizadosDelPanel: cotizados,
    score: revision.score,
    resenasNuevas: revision.resenasNuevas ?? resenasGoogleSemana,
    reservasCreadas: creadas.length,
    conAnticipo: creadas.filter(b => montoCobrado(b) > 0).length,
    vendidoSemana: creadas.reduce((t, b) => t + b.totalAmount, 0),
    vendidoMes: delMes.reduce((t, b) => t + b.totalAmount, 0),
    salidas: salidas.length,
    personas: salidas.reduce((t, s) => t + s.personas, 0),
    ingresoConCostos: conCostos.reduce((t, s) => t + s.numeros.ingreso, 0),
    margenConCostos: conCostos.reduce((t, s) => t + s.numeros.margen, 0),
    salidasConCostos: conCostos.length,
    reservasOperadas: operadas,
    comercial: comercial ? {
      leads: comercial.detalle.leadsCrm, leadReserva: valorDe("lead-reserva"), leadsCotizados: valorDe("leads-cotizados"),
      respuesta5: valorDe("respuesta-5min"), embudo: comercial.detalle.embudo,
    } : null,
    corte: corte ? { ventas: corte.ventas, utilidad: corte.utilidad, cerrado: corte.estado === "cerrado" } : null,
    // La de «Experiencia»: lecturas de Google de lunes a lunes (lote 9).
    resenas: resenasDe({ google, operadas: enTour.map(b => ({ ultimoDia: ultimoDia(b) || b.tourDate, conCheckin: false })), hoy }, pSemana),
  });

  // Pendientes de hoy.
  const pendientes: Pendiente[] = [];
  if (sinResponder) pendientes.push({ tipo: "chats", tono: "problema", href: "/admin/bandeja", titulo: `${sinResponder} chat${sinResponder === 1 ? "" : "s"} sin responder hace más de 10 min`, detalle: "La meta es contestar el 90 % en 5 minutos" });
  const vencidas = vivas.filter(b => saldoPendiente(b) > 0 && ultimoDia(b) < hoy);
  if (vencidas.length) pendientes.push({ tipo: "saldos", tono: "problema", href: "/admin/cobros", titulo: `${vencidas.length} saldo${vencidas.length === 1 ? "" : "s"} vencido${vencidas.length === 1 ? "" : "s"}`, detalle: `$${vencidas.reduce((t, b) => t + saldoPendiente(b), 0).toLocaleString("es-MX")} de tours que ya pasaron: cobrar o registrar el cobro` });
  // Sin las de un lead Perdido (revisión del 20 nov 2026): como la franja «Por
  // vencer» de Cotizaciones, que ya no las enseña. Antes Inicio pedía recordarle
  // por WhatsApp a quien ya dijo que no, y la lista decía 0.
  const idsEnviadas = leadsDeCotizaciones(enviadas);
  const perdidos = new Set(idsEnviadas.length
    ? (await prisma.oportunidad.findMany({ where: { id: { in: idsEnviadas }, etapa: ETAPA_PERDIDO }, select: { id: true } }).catch(() => [])).map(o => o.id)
    : []);
  const porVencer = enviadas.filter(q => etapaDe(q, hoy) === "por-vencer" && !esCotizacionPerdida(q, perdidos)).length;
  if (porVencer) pendientes.push({ tipo: "cotizaciones", tono: "atencion", href: "/admin/cotizaciones", titulo: `${porVencer} cotización${porVencer === 1 ? "" : "es"} por vencer`, detalle: "Recordar por WhatsApp antes de que venzan" });
  for (const s of salidasHoy) {
    const av = avanceChecklist(s.checklist);
    pendientes.push({ tipo: "salida", tono: av.hechos < av.total ? "atencion" : "neutro", href: `/admin/salidas-dia/${encodeURIComponent(s.clave)}`, titulo: `Hoy · ${s.tourNombre} · ${s.personas} pax`, detalle: `Checklist ${av.hechos} de ${av.total}${s.registro.guia ? ` · guía ${s.registro.guia}` : " · sin guía asignado"}` });
  }
  for (const s of salidasManana) {
    const av = avanceChecklist(s.checklist);
    pendientes.push({ tipo: "salida", tono: s.registro.guia ? "neutro" : "atencion", href: `/admin/salidas-dia/${encodeURIComponent(s.clave)}`, titulo: `Mañana · ${s.tourNombre} · ${s.personas} pax`, detalle: `Checklist ${av.hechos} de ${av.total}${s.registro.guia ? ` · guía ${s.registro.guia}` : " · sin guía asignado"}` });
  }
  // Lote 6 (10 nov 2026): primero las que no llegan al mínimo del TOUR (así no
  // corren); aparte, las de 2 o menos (solo rentabilidad). Las operadas ya pasaron.
  const noLlegan = salidas.filter(s => s.estadoPax === "no-llega" && s.fecha >= hoy && s.registro.estado !== "operada");
  if (noLlegan.length) pendientes.push({ tipo: "bajo-minimo", tono: "problema", href: "/admin/seguimientos", titulo: `${noLlegan.length} salida${noLlegan.length === 1 ? " no llega" : "s no llegan"} al mínimo del tour esta semana`, detalle: noLlegan.map(s => `${s.codigo} ${s.fecha.slice(8)}/${s.fecha.slice(5, 7)}: ${s.personas} de ${s.minimo}`).join(" · ") + " — confirmar que corre, juntar o reembolsar" });
  const bajo = salidas.filter(s => bajoMinimoRentable(s) && s.estadoPax !== "no-llega" && s.fecha >= hoy && s.registro.estado !== "operada");
  if (bajo.length) pendientes.push({ tipo: "bajo-minimo", tono: "atencion", href: "/admin/calendario", titulo: `${bajo.length} salida${bajo.length === 1 ? "" : "s"} con 2 personas o menos esta semana`, detalle: "Conviene llenarlas o juntarlas: con 2 el margen cae" });

  return {
    semana: { lunes, domingo, etiqueta: etiquetaSemana(lunes), numero: numeroSemana(lunes), esActual: hoy >= lunes && hoy <= domingo },
    scorecard, revision, resenasGoogleSemana, leadsCrm, cotizadosDelPanel: cotizados, pendientes,
    salidasSemana: salidas.map(s => ({
      clave: s.clave, fecha: s.fecha, codigo: s.codigo, tourNombre: s.tourNombre, clientes: s.clientes, personas: s.personas, cupo: s.cupo,
      estadoPax: s.estadoPax, margen: s.numeros.conCostos ? s.numeros.margen : null, checklist: avanceChecklist(s.checklist), guia: s.registro.guia,
    })),
  };
}
