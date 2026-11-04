// Datos confiables (objetivo 7 del documento) y el estado de cada fuente
// (4 nov 2026). Regla del documento: «los datos siguen sucios → marcar como
// aproximado lo que no cuadre». Aquí se ve qué fuente está viva y qué hacer si no.

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { tipoFolio } from "@/lib/admin/folio";
import { diasDeTourDe } from "@/lib/admin/salidas";
import { estadoConexion } from "@/lib/admin/bandejaDatos";
import { haceCuanto } from "@/lib/admin/bandeja";
import { historialGoogle } from "@/lib/admin/satisfaccion";
import { PRIMERA_SEMANA_CORTE } from "@/lib/admin/corteSemanal";
import { detalleGA4 } from "./ga4";
import { busquedaGoogle } from "./searchConsole";
import { finMX, inicioMX, lunesDeFecha } from "./periodo";
import { NO_CUENTAN, enPeriodo, serie, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface ReservaDato { ymd: string; conCanal: boolean; antesDelTour: boolean }

export function datosConfiables(rs: ReservaDato[], p: Periodo): ValorKpi {
  const del = rs.filter(r => enPeriodo(r.ymd, p));
  const sinCanal = del.filter(r => !r.conCanal).length, tarde = del.filter(r => !r.antesDelTour).length;
  return tasa("datos-confiables", del.filter(r => r.conCanal && r.antesDelTour).length, del.length, {
    unidadDetalle: "reservas",
    nota: sinCanal || tarde ? [sinCanal ? `${sinCanal} sin canal` : "", tarde ? `${tarde} capturada${tarde === 1 ? "" : "s"} después del tour` : ""].filter(Boolean).join(" · ") : undefined,
  });
}

export async function medirDatos(p: Periodo, periodos: Periodo[]): Promise<{ valores: ValorKpi[]; series: Record<string, PuntoSerie[]> }> {
  const desde = periodos[0].desde;
  const reservas = await prisma.tourBooking.findMany({
    where: { createdAt: { gte: inicioMX(desde), lte: finMX(p.hasta) }, status: { notIn: NO_CUENTAN } },
    select: { createdAt: true, origen: true, tourDate: true, tourSlug: true, tourName: true, adults: true, children: true, totalAmount: true, lineItems: true, confirmationNumber: true },
  });
  const rs: ReservaDato[] = reservas.map(b => {
    const ymd = ymdMX(b.createdAt);
    const primero = diasDeTourDe(b).map(x => x.fecha).sort()[0] ?? b.tourDate;
    return { ymd, conCanal: b.origen !== "por_confirmar" && !!b.origen, antesDelTour: !primero || ymd <= primero };
  });
  return { valores: [datosConfiables(rs, p)], series: { "datos-confiables": serie(periodos, x => datosConfiables(rs, x).valor) } };
}

export interface EstadoFuente {
  nombre: string;
  /** Qué KPIs alimenta. */
  alimenta: string;
  estado: "ok" | "atencion" | "falla";
  detalle: string;
  /** Qué hacer si no está bien. */
  arreglo?: string;
}

/** El estado de cada fuente de datos del panel, con cómo arreglarla. */
export async function estadoFuentes(hoy: string): Promise<EstadoFuente[]> {
  const ayer = addDaysYMD(hoy, -1);
  const lunesPasado = addDaysYMD(lunesDeFecha(hoy), -7);
  const [ga4, gsc, conexion, ultimoChat, reservasWeb, cortes, google, encuesta, leadsSemana, revision] = await Promise.all([
    detalleGA4(addDaysYMD(hoy, -7), ayer),
    busquedaGoogle(addDaysYMD(hoy, -10), addDaysYMD(hoy, -4)),
    estadoConexion().catch(() => null),
    prisma.conversacion.findFirst({ where: { ultimoEntranteEn: { not: null } }, orderBy: { ultimoEntranteEn: "desc" }, select: { ultimoEntranteEn: true } }).catch(() => null),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN } }, orderBy: { createdAt: "desc" }, take: 60, select: { confirmationNumber: true, createdAt: true } }),
    prisma.corteSemanal.findMany({ where: { estado: "cerrado" }, orderBy: { semana: "desc" }, take: 1, select: { semana: true } }).catch(() => []),
    historialGoogle().catch(() => []),
    prisma.encuestaReserva.findFirst({ where: { satisfaccionEn: { not: null } }, orderBy: { satisfaccionEn: "desc" }, select: { satisfaccionEn: true } }).catch(() => null),
    prisma.oportunidad.count({ where: { createdAt: { gte: inicioMX(lunesPasado), lte: finMX(addDaysYMD(lunesPasado, 6)) } } }).catch(() => 0),
    prisma.revisionSemanal.findUnique({ where: { semana: lunesPasado } }).catch(() => null),
  ]);
  const out: EstadoFuente[] = [];

  out.push(ga4.ok
    ? { nombre: "GA4 (la web)", alimenta: "Web y canales", estado: "ok", detalle: `Conectado · ${ga4.datos.sesiones.toLocaleString("es-MX")} sesiones en 7 días · leído ${haceCuanto(ga4.datos.leidoEn)}` }
    : { nombre: "GA4 (la web)", alimenta: "Web y canales", estado: "falla", detalle: ga4.motivo, arreglo: "En Railway: GA4_PROPERTY_ID=545095004 y las llaves del robot. En GA4: el robot como Lector." });

  out.push(gsc.ok
    ? { nombre: "Search Console (búsquedas en Google)", alimenta: "Web y canales: demanda del mercado", estado: "ok", detalle: `Conectado · ${gsc.datos.impresiones.toLocaleString("es-MX")} impresiones en 7 días` }
    : { nombre: "Search Console (búsquedas en Google)", alimenta: "Web y canales: demanda del mercado", estado: "atencion", detalle: gsc.motivo, arreglo: "El robot como usuario «Restringido» en Search Console y la API encendida en Google Cloud." });

  const conectado = conexion?.estado === "conectado";
  const horasChat = ultimoChat?.ultimoEntranteEn ? (Date.now() - ultimoChat.ultimoEntranteEn.getTime()) / 3_600_000 : null;
  out.push({
    nombre: "Bandeja de WhatsApp", alimenta: "Leads, primer mensaje en 5 min, seguimiento",
    estado: !conexion ? "falla" : !conectado ? "falla" : horasChat !== null && horasChat > 24 ? "atencion" : "ok",
    detalle: !conexion ? "El puente nunca se ha conectado." : `${conectado ? "Conectada" : `Estado: ${conexion.estado}`}${ultimoChat?.ultimoEntranteEn ? ` · último mensaje de un cliente ${haceCuanto(ultimoChat.ultimoEntranteEn)}` : " · sin mensajes"}`,
    arreglo: conectado ? undefined : "Abre Bandeja y escanea el QR con el teléfono del negocio.",
  });

  const web = reservasWeb.find(b => tipoFolio(b.confirmationNumber) === "web");
  out.push({ nombre: "Pago en línea (Stripe)", alimenta: "Reservas pagadas en la web", estado: "ok", detalle: web ? `Última reserva web ${haceCuanto(web.createdAt)}` : "Aún no hay reservas web" });

  const ultimaSemana = lunesPasado >= PRIMERA_SEMANA_CORTE ? lunesPasado : null;
  const ultimoCorte = cortes[0]?.semana ?? null;
  out.push({
    nombre: "Corte semanal", alimenta: "Margen de contribución, cortes a tiempo",
    estado: !ultimaSemana || (ultimoCorte && ultimoCorte >= ultimaSemana) ? "ok" : "atencion",
    detalle: ultimoCorte ? `Último corte cerrado: semana del ${ultimoCorte}` : "Ningún corte cerrado",
    arreglo: ultimaSemana && (!ultimoCorte || ultimoCorte < ultimaSemana) ? "Cerrar el corte de la semana pasada (Corte semanal → Hacer corte)." : undefined,
  });

  const lectura = google.at(-1);
  const diasLectura = lectura ? Math.round((Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${lectura.fecha}T12:00:00Z`)) / 86_400_000) : null;
  out.push({
    nombre: "Google (reseñas, a mano)", alimenta: "Reseñas",
    estado: diasLectura === null ? "falla" : diasLectura > 7 ? "atencion" : "ok",
    detalle: lectura ? `Última lectura: ${lectura.fecha} · ${lectura.rating} con ${lectura.total} reseñas` : "Nunca se ha anotado",
    arreglo: diasLectura === null || diasLectura > 7 ? "Reseñas → anotar la calificación y el número de reseñas de hoy." : undefined,
  });

  out.push({ nombre: "Encuesta y check-in", alimenta: "NPS, encuestas contestadas, check-in", estado: "ok", detalle: encuesta?.satisfaccionEn ? `Última respuesta ${haceCuanto(encuesta.satisfaccionEn)}` : "Nadie ha contestado aún" });

  const faltanLeads = !!revision?.leadsNuevos && revision.leadsNuevos > leadsSemana * 1.2;
  out.push({
    nombre: "CRM contra la revisión del jueves", alimenta: "Lead → reserva, leads cotizados",
    estado: faltanLeads ? "atencion" : "ok",
    detalle: `Semana pasada: ${leadsSemana} leads en el CRM${revision?.leadsNuevos ? ` · ${revision.leadsNuevos} en la revisión del jueves` : " · sin revisión guardada"}`,
    arreglo: faltanLeads ? "La revisión cuenta más leads que el CRM: faltan chats en la Bandeja o leads capturados a mano." : undefined,
  });
  return out;
}
