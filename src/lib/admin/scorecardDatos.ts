// Solo servidor: junta los conteos de una semana (lunes a domingo, hora de
// México) y los pasa por `calcularScorecard`. Ventas por fecha de captura;
// operación por fecha de tour (regla del prompt, 3 nov 2026).
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { domingoDe, etiquetaSemana } from "./corteSemanal";
import { montoCobrado, saldoPendiente } from "./dinero";
import { diasDeTourDe } from "./salidas";
import { salidasEntre, type SalidaOperativa } from "./salidasDia";
import { avanceChecklist } from "./checklistSalida";
import { historialGoogle } from "./satisfaccion";
import { etapaDe } from "@/lib/vencimientoCotizacion";
import { calcularScorecard, numeroSemana, type Scorecard } from "./scorecard";

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

export interface Pendiente { tipo: "saldos" | "cotizaciones" | "salida" | "bajo-minimo"; titulo: string; detalle: string; href: string; tono: "problema" | "atencion" | "neutro" }

export interface DatosScorecard {
  semana: { lunes: string; domingo: string; etiqueta: string; numero: number; esActual: boolean };
  scorecard: Scorecard;
  revision: RevisionSemanalDatos;
  /** Las reseñas de Google que salen de la lectura semanal (para proponerlas en la revisión). */
  resenasGoogleSemana: number | null;
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

  const [creadas, delMes, cotizaciones, enTour, revisionRaw, google, salidas, salidasHoy, enviadas, vivas] = await Promise.all([
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" }, createdAt: { gte: inicioMX(lunes), lte: finMX(domingo) } } }),
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" }, createdAt: { gte: inicioMX(mesIni), lte: finMX(mesFin) } }, select: { totalAmount: true } }),
    prisma.tourQuote.findMany({ where: { createdAt: { gte: inicioMX(lunes), lte: finMX(domingo) }, status: { not: "archivada" } }, select: { customerEmail: true, customerPhone: true } }),
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" }, tourDate: { gte: addDaysYMD(lunes, -21), lte: addDaysYMD(domingo, 21) } } }),
    prisma.revisionSemanal.findUnique({ where: { semana: lunes } }).catch(() => null),
    historialGoogle().catch(() => []),
    salidasEntre(lunes, domingo),
    salidasEntre(hoy, hoy),
    prisma.tourQuote.findMany({ where: { status: "enviada" } }),
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" } }, select: { totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true, tourDate: true, tourSlug: true, tourName: true, adults: true, children: true, lineItems: true, confirmationNumber: true } }),
  ]);

  const cotizados = new Set(cotizaciones.map(q => (q.customerPhone || q.customerEmail || "").trim().toLowerCase()).filter(Boolean)).size;
  const operadas = enTour.filter(b => { const u = ultimoDia(b); return u >= lunes && u <= domingo; }).length;
  const conCostos = salidas.filter(s => s.numeros.conCostos);
  // Reseñas de Google en la semana: la última lectura de la semana menos la última de antes.
  const antes = google.filter(p => p.fecha < lunes).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  const enSemana = google.filter(p => p.fecha >= lunes && p.fecha <= domingo).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  const resenasGoogleSemana = antes && enSemana ? Math.max(0, enSemana.total - antes.total) : null;

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
    leadsNuevos: revision.leadsNuevos,
    respuestas5min: revision.respuestas5min,
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
  });

  // Pendientes de hoy.
  const pendientes: Pendiente[] = [];
  const vencidas = vivas.filter(b => saldoPendiente(b) > 0 && ultimoDia(b) < hoy);
  if (vencidas.length) pendientes.push({ tipo: "saldos", tono: "problema", href: "/admin/cobros", titulo: `${vencidas.length} saldo${vencidas.length === 1 ? "" : "s"} vencido${vencidas.length === 1 ? "" : "s"}`, detalle: `$${vencidas.reduce((t, b) => t + saldoPendiente(b), 0).toLocaleString("es-MX")} de tours que ya pasaron: cobrar o registrar el cobro` });
  const porVencer = enviadas.filter(q => etapaDe(q, hoy) === "por-vencer").length;
  if (porVencer) pendientes.push({ tipo: "cotizaciones", tono: "atencion", href: "/admin/cotizaciones", titulo: `${porVencer} cotización${porVencer === 1 ? "" : "es"} por vencer`, detalle: "Recordar por WhatsApp antes de que venzan" });
  for (const s of salidasHoy) {
    const av = avanceChecklist(s.checklist);
    pendientes.push({ tipo: "salida", tono: av.hechos < av.total ? "atencion" : "neutro", href: `/admin/salidas-dia/${encodeURIComponent(s.clave)}`, titulo: `Hoy · ${s.tourNombre} · ${s.personas} pax`, detalle: `Checklist ${av.hechos} de ${av.total}${s.registro.guia ? ` · guía ${s.registro.guia}` : " · sin guía asignado"}` });
  }
  const bajo = salidas.filter(s => s.estadoPax === "bajo-minimo" && s.fecha >= hoy);
  if (bajo.length) pendientes.push({ tipo: "bajo-minimo", tono: "atencion", href: "/admin/calendario", titulo: `${bajo.length} salida${bajo.length === 1 ? "" : "s"} con 2 personas o menos esta semana`, detalle: "Conviene llenarlas o juntarlas: con 2 el margen cae" });

  return {
    semana: { lunes, domingo, etiqueta: etiquetaSemana(lunes), numero: numeroSemana(lunes), esActual: hoy >= lunes && hoy <= domingo },
    scorecard, revision, resenasGoogleSemana, cotizadosDelPanel: cotizados, pendientes,
    salidasSemana: salidas.map(s => ({
      clave: s.clave, fecha: s.fecha, codigo: s.codigo, tourNombre: s.tourNombre, clientes: s.clientes, personas: s.personas, cupo: s.cupo,
      estadoPax: s.estadoPax, margen: s.numeros.conCostos ? s.numeros.margen : null, checklist: avanceChecklist(s.checklist), guia: s.registro.guia,
    })),
  };
}
