// Solo servidor: el copiloto de la Bandeja (Fase 4, 4 nov 2026).
//  · extraerDeChat: con el modelo económico lee el chat y llena SOLO los datos
//    vacíos del lead (lo interno lo hace solo). Si hay queja, accidente,
//    emergencia o salud, deja un seguimiento urgente a Manolo.
//  · proponerRespuesta: con el modelo más capaz redacta la respuesta; queda
//    como PROPUESTA que una persona usa, edita o rechaza (con motivo).
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { hoyMX } from "@/lib/dates";
import { registrarEnBitacora, type Actor } from "../bitacora";
import { etapaPorReglas, type Etapa } from "../crm";
import { registrarEtapa, sincronizarProximoPaso } from "../crmDatos";
import { fechaLimite } from "../../vencimientoCotizacion";
import { usuariosAdmin } from "../usuarios";
import { RESPONSABLE_COBROS } from "../automatizaciones";
import { ErrorAgente, pedirJson } from "./claude";
import { MODELO_EXTRAER, MODELO_RESPONDER } from "./costos";
import {
  aplicarExtraccion, mensajeResponder, mismoTexto, schemaExtraer, SCHEMA_RESPUESTA, systemExtraer, systemResponder, transcripcion,
  type Extraccion,
} from "./copilotoReglas";

const AGENTE: Actor = { usuario: "agente", nombre: "Agente", rol: "sistema" };
const ABIERTAS = ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"];
const slugs = () => TOURS_LISTA.map(t => t.slug);

async function mensajesDe(conversacionId: string) {
  const ms = await prisma.mensaje.findMany({ where: { conversacionId }, orderBy: { fecha: "desc" }, take: 40 });
  return ms.reverse().map(m => ({ direccion: m.direccion, texto: m.texto, tipo: m.tipo, fecha: m.fecha.toISOString(), enviadoDesde: m.enviadoDesde }));
}

/** Urgencias → una persona de inmediato (una tarea por chat y día, sin repetir). */
async function avisarUrgencia(conversacionId: string, nombre: string, motivo: string | null, oportunidadId: string | null) {
  const hoy = hoyMX();
  await prisma.tarea.create({
    data: {
      titulo: `Revisar YA el chat de ${nombre}: ${motivo || "posible queja o emergencia"}`.slice(0, 200),
      responsable: RESPONSABLE_COBROS, vence: hoy, oportunidadId, origen: "agente", regla: "agente-urgente",
      claveRegla: `agente-urgente:${conversacionId}:${hoy}`, creadaPor: "Agente",
    },
  }).catch(e => { if ((e as { code?: string })?.code !== "P2002") throw e; });
  if (oportunidadId) await sincronizarProximoPaso(oportunidadId).catch(() => {});
}

/** Lee el chat y llena lo vacío del lead. Devuelve lo que llenó (o null si no había lead que llenar). */
export async function extraerDeChat(conversacionId: string): Promise<{ cambios: string[]; urgente: boolean } | null> {
  const conv = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!conv) return null;
  const marcar = () => prisma.conversacion.update({ where: { id: conv.id }, data: { agenteLeyoHasta: conv.ultimoEntranteEn ?? new Date() } });
  const lead = conv.contactoId && !conv.noEsCliente
    ? await prisma.oportunidad.findFirst({ where: { contactoId: conv.contactoId, etapa: { in: ABIERTAS } }, orderBy: { createdAt: "desc" }, include: { contacto: true } })
    : null;
  if (!lead) { await marcar(); return null; }

  const hoy = hoyMX();
  const tours = TOURS_LISTA.map(t => `${t.slug}: ${t.nombre}`).join("\n");
  const e = await pedirJson<Extraccion>({
    tarea: "extraer", modelo: MODELO_EXTRAER, effort: "low", maxTokens: 3000,
    system: systemExtraer(hoy), schema: schemaExtraer(slugs()),
    mensaje: `<tours>\n${tours}\n</tours>\n\n<chat>\n${transcripcion(await mensajesDe(conv.id))}\n</chat>`,
  });

  const { data, cambios } = aplicarExtraccion(lead, e, hoy, slugs());
  if (cambios.length) {
    const despues = { tours: data.tours ?? lead.tours, fechaViaje: data.fechaViaje ?? lead.fechaViaje, pax: data.pax ?? lead.pax };
    const etapa = etapaPorReglas(lead.etapa as Etapa, despues);
    await prisma.oportunidad.update({ where: { id: lead.id }, data: { ...data, ...(etapa !== lead.etapa ? { etapa } : {}) } });
    if (etapa !== lead.etapa) await registrarEtapa(lead.id, lead.etapa, etapa, "Agente: tour, fecha y personas del chat", "agente");
    await prisma.notaOportunidad.create({ data: { oportunidadId: lead.id, autor: "Agente", texto: `Del chat de WhatsApp llené: ${cambios.join(", ")}.${e.resumen ? ` ${e.resumen}` : ""}`.slice(0, 2000) } });
    await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: lead.contacto.nombre, resumen: `El agente llenó del chat: ${cambios.join(", ")}`, actor: AGENTE });
  }
  if (e.idioma === "en" && lead.contacto.idioma !== "en") await prisma.contacto.update({ where: { id: lead.contactoId }, data: { idioma: "en" } });
  if (e.urgente) await avisarUrgencia(conv.id, lead.contacto.nombre, e.motivoUrgente, lead.id);
  await marcar();
  return { cambios, urgente: e.urgente };
}

/**
 * Una vuelta del agente (cada minuto, en el reloj del servidor): los chats con
 * mensajes nuevos del cliente de hace más de 45 s (para leer la ráfaga entera)
 * y de los últimos 3 días. Si se llega al tope o está apagado, se detiene.
 */
export async function vueltaAgente(): Promise<{ leidos: number; llenados: number; detenido?: string }> {
  const ahora = Date.now();
  const convs = await prisma.conversacion.findMany({
    where: {
      noEsCliente: false, contactoId: { not: null },
      ultimoEntranteEn: { lt: new Date(ahora - 45_000), gt: new Date(ahora - 3 * 86400_000) },
    },
    orderBy: { ultimoEntranteEn: "asc" }, take: 50,
  });
  const pendientes = convs.filter(c => !c.agenteLeyoHasta || (c.ultimoEntranteEn && c.agenteLeyoHasta < c.ultimoEntranteEn)).slice(0, 5);
  let leidos = 0, llenados = 0;
  for (const c of pendientes) {
    try {
      const r = await extraerDeChat(c.id);
      leidos++; if (r?.cambios.length) llenados++;
    } catch (e) {
      // Tope o apagado: no se marca leído, se retoma cuando haya presupuesto.
      if (e instanceof ErrorAgente && /tope|apagado|llave/.test(e.message)) return { leidos, llenados, detenido: e.message };
      console.error("agente (extraer):", (e as Error)?.message);
      await prisma.conversacion.update({ where: { id: c.id }, data: { agenteLeyoHasta: c.ultimoEntranteEn } }).catch(() => {});
    }
  }
  return { leidos, llenados };
}

/** Redacta la respuesta al último mensaje del cliente como propuesta. */
export async function proponerRespuesta(conversacionId: string, quien: string) {
  const conv = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!conv) throw new ErrorAgente("Esa conversación no existe.");
  if (conv.noEsCliente) throw new ErrorAgente("Este chat está marcado como «no es cliente».");
  const mensajes = await mensajesDe(conv.id);
  if (!mensajes.some(m => m.direccion === "entra")) throw new ErrorAgente("El cliente todavía no ha escrito nada que contestar.");
  const lead = conv.contactoId ? await prisma.oportunidad.findFirst({ where: { contactoId: conv.contactoId }, orderBy: { createdAt: "desc" }, include: { contacto: true } }) : null;
  const cots = lead ? await prisma.tourQuote.findMany({ where: { oportunidadId: lead.id, status: { in: ["borrador", "enviada"] } }, orderBy: { createdAt: "desc" }, take: 3 }) : [];
  const equipo = usuariosAdmin().filter(u => u.rol !== "guia").map(u => u.nombre);
  const operador = lead?.responsable && equipo.includes(lead.responsable) ? lead.responsable : quien;
  const hoy = hoyMX();
  const contexto = {
    operador,
    primerMensajeDelEquipo: !mensajes.some(m => m.direccion === "sale"),
    lead: lead ? { etapa: lead.etapa, tours: lead.tours, fechaViaje: lead.fechaViaje, pax: lead.pax } : null,
    cotizaciones: cots.map(q => ({ folio: q.quoteNumber, total: q.totalAmount, fecha: q.tourDate, vence: fechaLimite(q), status: q.status })),
    catalogo: TOURS_LISTA.map(t => ({ slug: t.slug, nombre: t.nombre, precio: t.precio, incluye: t.incluye ?? [] })),
  };
  const r = await pedirJson<{ respuesta: string; razon: string; faltaDato: string | null; urgente: boolean }>({
    tarea: "responder", modelo: MODELO_RESPONDER, effort: "low", maxTokens: 6000, conRespaldo: true,
    system: systemResponder(operador), schema: SCHEMA_RESPUESTA,
    mensaje: mensajeResponder(transcripcion(mensajes), contexto, hoy),
  });
  const borrador = String(r.respuesta ?? "").trim().slice(0, 4000);
  if (!borrador) throw new ErrorAgente("El agente no propuso nada; inténtalo otra vez.");
  // Una propuesta viva por chat: la anterior sin decidir caduca.
  await prisma.propuestaAgente.updateMany({ where: { conversacionId: conv.id, estado: "pendiente" }, data: { estado: "caducada", decididoEn: new Date() } });
  const p = await prisma.propuestaAgente.create({
    data: { tipo: "respuesta", conversacionId: conv.id, oportunidadId: lead?.id ?? null, borrador, razon: r.razon?.slice(0, 300) || null, faltaDato: r.faltaDato?.slice(0, 300) || null },
  });
  if (r.urgente) await avisarUrgencia(conv.id, lead?.contacto.nombre ?? conv.nombre ?? "un cliente", r.razon, lead?.id ?? null);
  return { id: p.id, borrador: p.borrador, razon: p.razon, faltaDato: p.faltaDato, urgente: r.urgente };
}

/** Se mandó un mensaje partiendo de la propuesta: aprobada si salió igual, editada si se cambió. */
export async function propuestaUsada(propuestaId: string, textoEnviado: string, quien: string) {
  const p = await prisma.propuestaAgente.findUnique({ where: { id: propuestaId } });
  if (!p || p.estado !== "pendiente") return;
  await prisma.propuestaAgente.update({
    where: { id: p.id },
    data: { estado: mismoTexto(p.borrador, textoEnviado) ? "aprobada" : "editada", textoFinal: textoEnviado.slice(0, 4000), decididoPor: quien, decididoEn: new Date() },
  });
}

/** Rechazar con su motivo (para que las siguientes salgan mejor). */
export async function rechazarPropuesta(propuestaId: string, motivo: unknown, quien: string) {
  const m = String(motivo ?? "").trim().slice(0, 300);
  if (!m) throw new ErrorAgente("Di por qué no sirve: así las siguientes salen mejor.");
  const r = await prisma.propuestaAgente.updateMany({ where: { id: propuestaId, estado: "pendiente" }, data: { estado: "rechazada", motivo: m, decididoPor: quien, decididoEn: new Date() } });
  if (!r.count) throw new ErrorAgente("Esa propuesta ya no está pendiente.");
}
