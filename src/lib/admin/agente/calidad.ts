// Solo servidor: el score automático de la semana y el reporte de
// oportunidades de los jueves (Fase 4, 4 nov 2026). Todo pasa por el tope.
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { domingoDe, lunesDe } from "../corteSemanal";
import { saldoPendiente, montoCobrado } from "../dinero";
import { diasDeTourDe } from "../salidas";
import { avanceChecklist, checklistDe } from "../checklistSalida";
import { contarMotivos } from "../crm";
import { usuariosAdmin } from "../usuarios";
import { registrarEnBitacora, type Actor } from "../bitacora";
import { ahoraMX } from "../crm";
import { ErrorAgente, pedirJson } from "./claude";
import { MODELO_EXTRAER, MODELO_RESPONDER } from "./costos";
import { transcripcion } from "./copilotoReglas";
import {
  primerMensajeDelChat, schemaReporte, schemaRevisionChat, sumarRevisiones, systemReporte, systemRevisionChat,
  type Hallazgo, type ReglasChat,
} from "./calidadReglas";

const AGENTE: Actor = { usuario: "agente", nombre: "Agente", rol: "sistema" };
const inicio = (ymd: string) => new Date(`${ymd}T00:00:00-06:00`);
const fin = (ymd: string) => new Date(`${ymd}T23:59:59.999-06:00`);

/**
 * Revisa con la rúbrica cada chat de la semana que aún no se revisó y devuelve
 * la suma como propuesta para el Score WhatsApp (NO la guarda en el score: eso
 * lo decide la persona). Los chats que atendió solo Manolo no cuentan.
 */
export async function puntuarSemana(semanaPedida: string) {
  const lunes = lunesDe(semanaPedida);
  const domingo = domingoDe(lunes);
  const desde = inicio(lunes), hasta = fin(domingo);
  const convs = await prisma.conversacion.findMany({
    where: { noEsCliente: false, mensajes: { some: { fecha: { gte: desde, lte: hasta }, importado: false } } },
    include: { mensajes: { orderBy: { fecha: "asc" }, take: 400 } }, take: 80,
  });
  const delOperador = convs.filter(c => {
    const salen = c.mensajes.filter(m => m.direccion === "sale" && m.fecha >= desde && m.fecha <= hasta);
    return !(salen.length && salen.every(m => m.enviadoDesde === "panel" && m.enviadoPor === "Manolo"));
  });
  const hechas = new Set((await prisma.revisionChat.findMany({ where: { semana: lunes }, select: { conversacionId: true } })).map(r => r.conversacionId));
  let revisados = 0, detenido: string | null = null;
  for (const c of delOperador.filter(x => !hechas.has(x.id))) {
    const lead = c.contactoId ? await prisma.oportunidad.findFirst({ where: { contactoId: c.contactoId }, orderBy: { createdAt: "desc" } }) : null;
    const [cots, ress] = lead ? await Promise.all([
      prisma.tourQuote.findMany({ where: { oportunidadId: lead.id }, select: { quoteNumber: true, status: true, createdAt: true, customerEmail: true } }),
      prisma.tourBooking.findMany({ where: { oportunidadId: lead.id }, select: { confirmationNumber: true, status: true, createdAt: true } }),
    ]) : [[], []];
    const hechos = [
      cots.length ? `Cotizaciones: ${cots.map(q => `${q.quoteNumber} (${q.status}, creada ${q.createdAt.toISOString().slice(0, 16)}${q.customerEmail ? ", con correo" : ""})`).join("; ")}` : "Sin cotizaciones en el panel.",
      ress.length ? `Reservas: ${ress.map(r => `${r.confirmationNumber} (${r.status})`).join("; ")}` : "Sin reservas.",
    ].join("\n");
    const ventana = c.mensajes.filter(m => m.fecha >= inicio(addDaysYMD(lunes, -3)) && m.fecha <= hasta)
      .map(m => ({ direccion: m.direccion, texto: m.texto, tipo: m.tipo, fecha: m.fecha.toISOString() }));
    try {
      const r = await pedirJson<{ reglas: ReglasChat; nota: string }>({
        tarea: "calidad", modelo: MODELO_EXTRAER, effort: "medium", maxTokens: 4000,
        system: systemRevisionChat(), schema: schemaRevisionChat(),
        mensaje: `<hechos_del_panel>\n${hechos}\n</hechos_del_panel>\n\n<chat semana="${lunes} a ${domingo}">\n${transcripcion(ventana, 10_000)}\n</chat>`,
      });
      // El tiempo del primer mensaje se mide, no se adivina.
      r.reglas["primer-5min"] = primerMensajeDelChat(c.mensajes, desde, hasta);
      await prisma.revisionChat.upsert({
        where: { semana_conversacionId: { semana: lunes, conversacionId: c.id } },
        create: { semana: lunes, conversacionId: c.id, reglas: r.reglas, nota: `${c.nombre ?? c.telefono ?? "Chat"}: ${r.nota}`.slice(0, 400), revisor: "agente" },
        update: { reglas: r.reglas, nota: `${c.nombre ?? c.telefono ?? "Chat"}: ${r.nota}`.slice(0, 400), revisor: "agente" },
      });
      revisados++;
    } catch (e) {
      if (e instanceof ErrorAgente) { detenido = e.message; if (/tope|apagado|llave/.test(e.message)) break; continue; }
      throw e;
    }
  }
  const todas = await prisma.revisionChat.findMany({ where: { semana: lunes } });
  return {
    semana: lunes, chats: delOperador.length, revisados, yaEstaban: hechas.size, detenido,
    captura: sumarRevisiones(todas.map(t => t.reglas as unknown as ReglasChat)),
    notas: todas.map(t => t.nota).filter((x): x is string => !!x),
  };
}

/** Los datos de la semana para el reporte: compactos y sin datos de pago de los clientes. */
async function datosDeLaSemana(lunes: string) {
  const domingo = domingoDe(lunes);
  const desde = inicio(lunes), hasta = fin(domingo);
  const hoy = hoyMX();
  const [preguntas, bitacora, reservas, cotizadosSinSeg, salidas, perdidos, rechazadas, creadas] = await Promise.all([
    prisma.mensaje.findMany({ where: { direccion: "entra", importado: false, fecha: { gte: desde, lte: hasta }, texto: { not: null }, conversacion: { noEsCliente: false } }, select: { texto: true }, take: 150, orderBy: { fecha: "desc" } }),
    prisma.bitacora.findMany({ where: { createdAt: { gte: desde, lte: hasta } }, select: { accion: true, entidad: true, nombre: true, resumen: true }, orderBy: { createdAt: "desc" }, take: 400 }),
    prisma.tourBooking.findMany({ where: { status: { notIn: ["cancelled", "borrador"] }, tourDate: { lt: hoy } }, select: { confirmationNumber: true, tourDate: true, tourSlug: true, lineItems: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true } }),
    prisma.oportunidad.findMany({ where: { etapa: "cotizado", updatedAt: { lt: new Date(Date.now() - 3 * 86400_000) }, tareas: { none: { estado: "pendiente" } } }, select: { id: true } }),
    prisma.salida.findMany({ where: { fecha: { gte: lunes, lte: domingo } } }),
    prisma.oportunidad.findMany({ where: { etapa: "perdido", updatedAt: { gte: desde, lte: hasta } }, select: { motivoPerdida: true } }),
    prisma.propuestaAgente.findMany({ where: { estado: "rechazada", decididoEn: { gte: desde, lte: hasta } }, select: { motivo: true } }),
    prisma.tourBooking.findMany({ where: { createdAt: { gte: desde, lte: hasta }, status: { notIn: ["cancelled", "borrador"] } }, select: { confirmationNumber: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true } }),
  ]);
  const conteo = new Map<string, number>();
  for (const b of bitacora) conteo.set(`${b.nombre} ${b.accion} ${b.entidad}`, (conteo.get(`${b.nombre} ${b.accion} ${b.entidad}`) ?? 0) + 1);
  const saldos = reservas.filter(r => saldoPendiente(r) > 0 && (diasDeTourDe(r as never).map(d => d.fecha).sort().at(-1) ?? r.tourDate) < hoy);
  return {
    hoy: `${hoy} (hora de México): lo anterior a hoy ya pasó, lo posterior todavía no`,
    semana: `${lunes} a ${domingo}`,
    preguntasDeClientes: preguntas.map(p => (p.texto ?? "").replace(/\s+/g, " ").slice(0, 160)),
    accionesDelEquipo: Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k}: ${n}`),
    ejemplosBitacora: bitacora.slice(0, 40).map(b => b.resumen.slice(0, 140)),
    saldosVencidos: saldos.map(r => `${r.confirmationNumber} (${r.tourDate}): $${saldoPendiente(r)}`),
    cotizadosSinSeguimientoMasDe3Dias: cotizadosSinSeg.length,
    salidasConChecklistIncompleto: salidas.filter(s => { const a = avanceChecklist(checklistDe(s.tourSlug, s.checklist)); return a.hechos < a.total; }).map(s => `${s.clave} (${avanceChecklist(checklistDe(s.tourSlug, s.checklist)).hechos}/${avanceChecklist(checklistDe(s.tourSlug, s.checklist)).total})`),
    motivosDePerdida: contarMotivos(perdidos.map(p => p.motivoPerdida)).map(m => `${m.etiqueta}: ${m.n}`),
    propuestasDelAgenteRechazadas: rechazadas.map(r => r.motivo).filter(Boolean),
    reservasNuevasSinAnticipo: creadas.filter(r => montoCobrado(r) === 0).map(r => `${r.confirmationNumber} ($${r.totalAmount})`),
  };
}

/** El reporte de oportunidades de la semana. Reemplaza los hallazgos aún sin decidir de esa semana. */
export async function reporteOportunidades(semanaPedida: string, quien: string) {
  const lunes = lunesDe(semanaPedida);
  const datos = await datosDeLaSemana(lunes);
  const responsables = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  const r = await pedirJson<{ hallazgos: Hallazgo[] }>({
    tarea: "reporte", modelo: MODELO_RESPONDER, effort: "medium", maxTokens: 12000, conRespaldo: true,
    system: systemReporte(), schema: schemaReporte(responsables),
    mensaje: `<datos_de_la_semana>\n${JSON.stringify(datos, null, 1)}\n</datos_de_la_semana>\n\nEntrega los hallazgos.`,
  });
  const hallazgos = (r.hallazgos ?? []).slice(0, 8);
  await prisma.hallazgoAgente.deleteMany({ where: { semana: lunes, estado: "nuevo" } });
  for (const h of hallazgos) {
    await prisma.hallazgoAgente.create({
      data: {
        semana: lunes, tipo: ["repetitiva", "error", "incidencia"].includes(h.tipo) ? h.tipo : "error",
        titulo: String(h.titulo).slice(0, 200), evidencia: String(h.evidencia).slice(0, 2000), frecuencia: h.frecuencia?.slice(0, 200) || null,
        impacto: h.impacto?.slice(0, 300) || null, solucion: String(h.solucion).slice(0, 1000), responsable: responsables.includes(h.responsable) ? h.responsable : null,
      },
    });
  }
  await registrarEnBitacora({ accion: "creó", entidad: "panel", referencia: `Reporte ${lunes}`, resumen: `Reporte de oportunidades de la semana del ${lunes}: ${hallazgos.length} hallazgos (pedido por ${quien})`, actor: AGENTE });
  return { semana: lunes, hallazgos: hallazgos.length };
}

/** Convertir un hallazgo en tarea (o descartarlo). */
export async function decidirHallazgo(id: string, accion: unknown, quien: string) {
  const h = await prisma.hallazgoAgente.findUnique({ where: { id } });
  if (!h || h.estado !== "nuevo") throw new ErrorAgente("Ese hallazgo ya se decidió.");
  if (accion === "descartar") { await prisma.hallazgoAgente.update({ where: { id }, data: { estado: "descartado", decididoPor: quien } }); return; }
  if (accion !== "aceptar") throw new ErrorAgente("Acción no válida.");
  const t = await prisma.tarea.create({
    data: { titulo: `${h.titulo}: ${h.solucion}`.slice(0, 200), responsable: h.responsable || quien, vence: addDaysYMD(hoyMX(), 2), origen: "agente", regla: "reporte-jueves", creadaPor: quien },
  });
  await prisma.hallazgoAgente.update({ where: { id }, data: { estado: "aceptado", tareaId: t.id, decididoPor: quien } });
}

/** Los jueves desde las 7:00 (hora de México) sale solo el reporte de la semana; una vez por semana. */
export async function reporteDelJueves(ahora: Date = new Date()) {
  const { hoy, hhmm } = ahoraMX(ahora);
  if (new Date(`${hoy}T12:00:00Z`).getUTCDay() !== 4 || hhmm < "07:00") return null;
  const lunes = lunesDe(hoy);
  try { await prisma.config.create({ data: { key: `reporte-jueves:${lunes}`, value: new Date().toISOString() } }); }
  catch { return null; } // ya salió esta semana
  try { return await reporteOportunidades(lunes, "Agente (jueves)"); }
  catch (e) { await prisma.config.delete({ where: { key: `reporte-jueves:${lunes}` } }).catch(() => {}); throw e; }
}
