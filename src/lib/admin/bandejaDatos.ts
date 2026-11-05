// Solo servidor: lo que guarda y lee la Bandeja de WhatsApp (Fase 2.3, 4 nov
// 2026). El puente (`whatsapp-bandeja/`) manda cada mensaje aquí; lo que se
// contesta desde el panel queda en cola y el puente lo envía.
import { refDelTexto } from "@/lib/refWhatsapp";
import { origenWebDeClic } from "./origenWeb";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { registrarEnBitacora } from "./bitacora";
import { contactoPara, registrarEtapa } from "./crmDatos";
import { RESPONSABLE_OPERACION } from "./automatizaciones";
import {
  esChatIndividual, origenDelPrimerMensaje, telefonoDeChat, textoVisible, tipoDeMensaje,
  type EventoAck, type EventoConexion, type EventoMensaje, type EventoPuente,
} from "./bandeja";

const ABIERTAS = ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"];
const CLAVE_CONEXION = "whatsapp:conexion";
/** Un envío que el puente tomó y no confirmó en este tiempo se da por fallido (sin reintentar solo: podría duplicarse). */
const SIN_CONFIRMAR_MS = 3 * 60_000;
const ORDEN_ACK: Record<string, number> = { pendiente: 0, enviando: 1, enviado: 2, entregado: 3, leido: 4 };

export async function registrarEventos(eventos: EventoPuente[]): Promise<{ guardados: number; repetidos: number; leads: number }> {
  let guardados = 0, repetidos = 0, leads = 0;
  for (const ev of eventos) {
    if (ev?.tipo === "mensaje") {
      const r = await registrarMensaje(ev);
      if (r === "repetido") repetidos++; else if (r) { guardados++; if (r === "lead") leads++; }
    } else if (ev?.tipo === "ack") await registrarAck(ev);
    else if (ev?.tipo === "conexion") await registrarConexion(ev);
  }
  return { guardados, repetidos, leads };
}

/** Guarda un mensaje (idempotente por su id de WhatsApp). Devuelve "lead" si creó uno. */
async function registrarMensaje(ev: EventoMensaje): Promise<"ok" | "lead" | "repetido" | null> {
  if (!esChatIndividual(ev.chatId) || !ev.waId || typeof ev.waId !== "string") return null;
  if (await prisma.mensaje.findUnique({ where: { waId: ev.waId }, select: { id: true } })) return "repetido";
  const fecha = Number.isFinite(Number(ev.fecha)) && Number(ev.fecha) > 0 ? new Date(Number(ev.fecha)) : new Date();
  const tipo = tipoDeMensaje(ev.tipoMensaje);
  const texto = String(ev.texto ?? "").slice(0, 4000) || null;
  const telefono = telefonoDeChat(ev.chatId, ev.telefono ?? null);
  const nombre = String(ev.nombre ?? "").trim().slice(0, 120) || null;
  const entra = !ev.deNosotros;
  const importado = ev.importado === true;

  let conv = await prisma.conversacion.upsert({
    where: { chatId: ev.chatId },
    create: { chatId: ev.chatId, telefono, nombre: entra ? nombre : null },
    update: {},
  });
  // Lo que faltaba se completa (el teléfono de un «@lid» puede llegar después).
  const falta: Record<string, unknown> = {};
  if (!conv.telefono && telefono) falta.telefono = telefono;
  if (!conv.nombre && entra && nombre) falta.nombre = nombre;

  try {
    await prisma.mensaje.create({
      data: {
        conversacionId: conv.id, waId: ev.waId, direccion: entra ? "entra" : "sale", tipo, texto,
        enviadoDesde: entra ? "cliente" : "app", estado: entra ? "recibido" : "enviado", importado, fecha,
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return "repetido"; // llegó dos veces al mismo tiempo
    throw e;
  }
  // El resumen del chat solo avanza con lo más nuevo (la importación llega desordenada).
  const masNuevo = !conv.ultimoMensajeEn || fecha >= conv.ultimoMensajeEn;
  const data: Record<string, unknown> = { ...falta };
  if (masNuevo) Object.assign(data, { ultimoMensajeEn: fecha, ultimoTexto: textoVisible(tipo, texto).slice(0, 200), ultimoDe: entra ? "cliente" : "equipo" });
  if (entra && (!conv.ultimoEntranteEn || fecha > conv.ultimoEntranteEn)) data.ultimoEntranteEn = fecha;
  if (!importado) {
    if (entra) { data.noLeidos = { increment: 1 }; data.archivada = false; }
    else data.noLeidos = 0; // contestaron desde el celular: ya se leyó
  }
  if (Object.keys(data).length) conv = await prisma.conversacion.update({ where: { id: conv.id }, data });
  if (!conv.contactoId && conv.telefono) await enlazarContacto(conv.id);

  if (entra && !importado && !conv.noEsCliente) return (await asegurarLead(conv.id, texto)) ? "lead" : "ok";
  return "ok";
}

/** El contacto del CRM de un chat: por teléfono (único) o, si no se sabe, uno nuevo con su nombre. */
async function enlazarContacto(conversacionId: string): Promise<string | null> {
  const conv = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!conv) return null;
  if (conv.contactoId) return conv.contactoId;
  const contacto = conv.telefono
    ? await contactoPara({ nombre: conv.nombre || conv.telefono, telefono: conv.telefono, correo: null })
    : await prisma.contacto.create({ data: { nombre: conv.nombre || "Sin nombre (WhatsApp)" } });
  await prisma.conversacion.update({ where: { id: conv.id }, data: { contactoId: contacto.id } });
  return contacto.id;
}

/**
 * Regla del prompt: «primer mensaje de un número sin lead abierto → Nuevo».
 * El canal y el tour salen del texto si vino de un botón del sitio. Devuelve
 * true si creó el lead.
 */
async function asegurarLead(conversacionId: string, texto: string | null): Promise<boolean> {
  const contactoId = await enlazarContacto(conversacionId);
  if (!contactoId) return false;
  const abierta = await prisma.oportunidad.findFirst({ where: { contactoId, etapa: { in: ABIERTAS } }, select: { id: true } });
  if (abierta) return false;
  const origen = origenDelPrimerMensaje(texto, TOURS_LISTA.map(t => ({ slug: t.slug, nombre: t.nombre })));
  // El código de referencia del botón del sitio (4 nov 2026): une este lead con
  // el clic — la página donde tocó WhatsApp y de dónde llegó la visita.
  const ref = refDelTexto(texto);
  const clic = ref ? await prisma.trackEvent.findFirst({
    where: { event: "WHATSAPP_CLICK", createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) }, data: { path: ["ref"], equals: ref } },
    orderBy: { createdAt: "desc" }, select: { path: true, tourSlug: true, createdAt: true, data: true },
  }).catch(() => null) : null;
  const origenWeb = ref ? origenWebDeClic(ref, clic) : null;
  const toursDelClic = origenWeb?.tour && TOURS_LISTA.some(t => t.slug === origenWeb.tour) ? [origenWeb.tour] : [];
  const op = await prisma.oportunidad.create({
    data: {
      contactoId, etapa: "nuevo", canal: ref ? "whatsapp_sitio" : origen.canal, tours: origen.tours.length ? origen.tours : toursDelClic,
      responsable: RESPONSABLE_OPERACION, creadoPor: "WhatsApp", ...(origenWeb ? { origenWeb: origenWeb as object } : {}),
    },
    include: { contacto: { select: { nombre: true } } },
  });
  await registrarEtapa(op.id, null, "nuevo", "Regla: primer mensaje de WhatsApp", "regla");
  await registrarEnBitacora({ accion: "creó", entidad: "lead", referencia: op.contacto.nombre, resumen: `Lead nuevo por WhatsApp: ${op.contacto.nombre}${origen.canal === "whatsapp_sitio" ? " (desde el sitio)" : ""}` });
  return true;
}

async function registrarAck(ev: EventoAck) {
  if (!ev.waId || !(ev.estado in ORDEN_ACK || ev.estado === "fallo")) return;
  const m = await prisma.mensaje.findUnique({ where: { waId: ev.waId }, select: { id: true, estado: true } });
  if (!m) return;
  // Solo avanza (un «entregado» que llega tarde no regresa un «leído»).
  if (ev.estado !== "fallo" && (ORDEN_ACK[ev.estado] ?? 0) <= (ORDEN_ACK[m.estado] ?? 0)) return;
  await prisma.mensaje.update({ where: { id: m.id }, data: { estado: ev.estado } });
}

export interface EstadoConexion { estado: string; qr: string | null; numero: string | null; detalle: string | null; en: string }

async function registrarConexion(ev: EventoConexion) {
  const valor: EstadoConexion = {
    estado: ["qr", "conectado", "desconectado", "iniciando"].includes(ev.estado) ? ev.estado : "desconectado",
    // El QR solo mientras se está vinculando; conectado ya no sirve y no se guarda.
    qr: ev.estado === "qr" && typeof ev.qr === "string" && ev.qr.startsWith("data:image/png;base64,") ? ev.qr.slice(0, 20_000) : null,
    numero: ev.numero ? String(ev.numero).slice(0, 20) : null,
    detalle: ev.detalle ? String(ev.detalle).slice(0, 200) : null,
    en: new Date().toISOString(),
  };
  await prisma.config.upsert({ where: { key: CLAVE_CONEXION }, update: { value: JSON.stringify(valor) }, create: { key: CLAVE_CONEXION, value: JSON.stringify(valor) } });
}

export async function estadoConexion(): Promise<EstadoConexion | null> {
  const fila = await prisma.config.findUnique({ where: { key: CLAVE_CONEXION } }).catch(() => null);
  if (!fila) return null;
  try { return JSON.parse(fila.value) as EstadoConexion; } catch { return null; }
}

// ── La cola de envío ────────────────────────────────────────────────────────

/** Contestar desde el panel: queda «pendiente» hasta que el puente lo envía. */
export async function encolarRespuesta(conversacionId: string, textoCrudo: unknown, quien: string, desde: "panel" | "agente" = "panel") {
  const texto = String(textoCrudo ?? "").trim().slice(0, 4000);
  if (!texto) throw new Error("Escribe el mensaje.");
  const conv = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!conv) throw new Error("Esa conversación no existe.");
  const ahora = new Date();
  const m = await prisma.mensaje.create({
    data: { conversacionId, direccion: "sale", tipo: "texto", texto, enviadoDesde: desde, enviadoPor: quien, estado: "pendiente", fecha: ahora },
  });
  await prisma.conversacion.update({ where: { id: conversacionId }, data: { ultimoMensajeEn: ahora, ultimoTexto: texto.slice(0, 200), ultimoDe: "equipo", noLeidos: 0, archivada: false } });
  return m;
}

/** Lo que el puente debe mandar: se RECLAMA (pendiente → enviando) para que dos puentes no lo manden dos veces. */
export async function tomarPendientes(): Promise<{ id: string; chatId: string; texto: string }[]> {
  // Lo que se quedó «enviando» sin confirmación se da por fallido: mejor que lo reintente una persona a que el cliente lo reciba dos veces.
  await prisma.mensaje.updateMany({ where: { estado: "enviando", tomadoEn: { lt: new Date(Date.now() - SIN_CONFIRMAR_MS) } }, data: { estado: "fallo", error: "El puente no confirmó el envío. Revisa en el celular si salió antes de reintentar." } });
  const pendientes = await prisma.mensaje.findMany({ where: { estado: "pendiente", direccion: "sale" }, include: { conversacion: { select: { chatId: true } } }, orderBy: { createdAt: "asc" }, take: 20 });
  const tomados: { id: string; chatId: string; texto: string }[] = [];
  for (const p of pendientes) {
    const r = await prisma.mensaje.updateMany({ where: { id: p.id, estado: "pendiente" }, data: { estado: "enviando", tomadoEn: new Date() } });
    if (r.count === 1) tomados.push({ id: p.id, chatId: p.conversacion.chatId, texto: p.texto ?? "" });
  }
  return tomados;
}

/** El puente confirma un envío (con su id de WhatsApp) o dice por qué falló. */
export async function confirmarEnvio(id: string, ok: boolean, waId: string | null, error: string | null) {
  const m = await prisma.mensaje.findUnique({ where: { id } });
  if (!m || m.direccion !== "sale") return;
  await prisma.mensaje.update({
    where: { id },
    data: ok ? { estado: "enviado", waId: waId || null, error: null } : { estado: "fallo", error: (error || "No se pudo enviar").slice(0, 300) },
  }).catch(async e => {
    // El id ya lo guardó el eco del propio mensaje: se quita el eco y se queda este.
    if ((e as { code?: string })?.code === "P2002" && waId) {
      await prisma.mensaje.deleteMany({ where: { waId, enviadoDesde: "app", id: { not: id } } });
      await prisma.mensaje.update({ where: { id }, data: { estado: "enviado", waId, error: null } });
    } else throw e;
  });
}

/** Reintentar un envío fallido (lo decide una persona). */
export async function reintentar(mensajeId: string) {
  const r = await prisma.mensaje.updateMany({ where: { id: mensajeId, estado: "fallo", direccion: "sale" }, data: { estado: "pendiente", error: null } });
  if (!r.count) throw new Error("Ese mensaje no se puede reintentar.");
}

// ── Lecturas del panel ──────────────────────────────────────────────────────

export async function listarConversaciones(opciones: { archivadas?: boolean } = {}) {
  const convs = await prisma.conversacion.findMany({
    where: { archivada: opciones.archivadas ? true : false },
    orderBy: [{ ultimoMensajeEn: { sort: "desc", nulls: "last" } }], take: 300,
  });
  const ids = convs.map(c => c.contactoId).filter((x): x is string => !!x);
  const ops = ids.length ? await prisma.oportunidad.findMany({ where: { contactoId: { in: ids } }, orderBy: { createdAt: "desc" }, select: { id: true, contactoId: true, etapa: true } }) : [];
  // El lead abierto del contacto; si no hay, el último.
  const leadDe = (contactoId: string | null) => {
    if (!contactoId) return null;
    const suyos = ops.filter(o => o.contactoId === contactoId);
    return suyos.find(o => ABIERTAS.includes(o.etapa)) ?? suyos[0] ?? null;
  };
  return convs.map(c => ({
    id: c.id, nombre: c.nombre, telefono: c.telefono, chatId: c.chatId, noLeidos: c.noLeidos, ultimoTexto: c.ultimoTexto, ultimoDe: c.ultimoDe,
    ultimoMensajeEn: c.ultimoMensajeEn?.toISOString() ?? null, ultimoEntranteEn: c.ultimoEntranteEn?.toISOString() ?? null,
    noEsCliente: c.noEsCliente, archivada: c.archivada, lead: leadDe(c.contactoId),
  }));
}
export type ConversacionFila = Awaited<ReturnType<typeof listarConversaciones>>[number];

export async function detalleConversacion(id: string) {
  const c = await prisma.conversacion.findUnique({ where: { id } });
  if (!c) return null;
  const [mensajes, propuesta] = await Promise.all([
    prisma.mensaje.findMany({ where: { conversacionId: id }, orderBy: { fecha: "desc" }, take: 300 }),
    prisma.propuestaAgente.findFirst({ where: { conversacionId: id, estado: "pendiente" }, orderBy: { createdAt: "desc" } }),
  ]);
  const lead = c.contactoId ? await prisma.oportunidad.findFirst({
    where: { contactoId: c.contactoId }, orderBy: [{ createdAt: "desc" }],
    include: { contacto: true, tareas: { where: { estado: "pendiente" }, orderBy: [{ vence: "asc" }], take: 3 } },
  }) : null;
  return {
    id: c.id, nombre: c.nombre, telefono: c.telefono, chatId: c.chatId, noEsCliente: c.noEsCliente, archivada: c.archivada,
    ultimoEntranteEn: c.ultimoEntranteEn?.toISOString() ?? null,
    propuesta: propuesta ? { id: propuesta.id, tipo: propuesta.tipo, borrador: propuesta.borrador, razon: propuesta.razon, faltaDato: propuesta.faltaDato, en: propuesta.createdAt.toISOString() } : null,
    mensajes: mensajes.reverse().map(m => ({
      id: m.id, direccion: m.direccion, tipo: m.tipo, texto: m.texto, enviadoDesde: m.enviadoDesde, enviadoPor: m.enviadoPor,
      estado: m.estado, error: m.error, fecha: m.fecha.toISOString(), importado: m.importado,
    })),
    lead: lead ? {
      id: lead.id, etapa: lead.etapa, canal: lead.canal, tours: lead.tours, fechaViaje: lead.fechaViaje, pax: lead.pax, monto: lead.monto,
      responsable: lead.responsable, proximoPaso: lead.proximoPaso, proximoPasoEn: lead.proximoPasoEn, nombre: lead.contacto.nombre,
      tareas: lead.tareas.map(t => ({ id: t.id, titulo: t.titulo, vence: t.vence, hora: t.hora, responsable: t.responsable })),
    } : null,
  };
}
export type DetalleConversacion = NonNullable<Awaited<ReturnType<typeof detalleConversacion>>>;

/** Acciones sobre el chat: leído, archivar, «no es cliente» (y su lead Nuevo sin nada se quita). */
export async function cambiarConversacion(id: string, accion: string, quien: string) {
  const c = await prisma.conversacion.findUnique({ where: { id } });
  if (!c) throw new Error("Esa conversación no existe.");
  if (accion === "leida") return prisma.conversacion.update({ where: { id }, data: { noLeidos: 0 } });
  if (accion === "archivar" || accion === "desarchivar") return prisma.conversacion.update({ where: { id }, data: { archivada: accion === "archivar", noLeidos: 0 } });
  if (accion === "no-es-cliente" || accion === "es-cliente") {
    const no = accion === "no-es-cliente";
    await prisma.conversacion.update({ where: { id }, data: { noEsCliente: no } });
    if (no && c.contactoId) {
      // El lead que nació solo por este chat (Nuevo, sin cotizaciones, reservas, notas ni tareas) se quita.
      const ops = await prisma.oportunidad.findMany({ where: { contactoId: c.contactoId, etapa: "nuevo", creadoPor: "WhatsApp" }, include: { _count: { select: { notasLista: true, tareas: true } } } });
      for (const o of ops) {
        const [q, b] = await Promise.all([prisma.tourQuote.count({ where: { oportunidadId: o.id } }), prisma.tourBooking.count({ where: { oportunidadId: o.id } })]);
        if (!q && !b && !o._count.notasLista && !o._count.tareas) await prisma.oportunidad.delete({ where: { id: o.id } });
      }
      await registrarEnBitacora({ accion: "modificó", entidad: "lead", referencia: c.nombre ?? c.telefono ?? c.chatId, resumen: `${quien} marcó el chat de ${c.nombre ?? c.telefono ?? "un contacto"} como «no es cliente»` });
    }
    if (!no) await asegurarLead(id, null);
    return;
  }
  throw new Error("Acción no válida.");
}

/** Para el menú: chats con mensajes sin leer de clientes. */
export async function noLeidosBandeja(): Promise<number> {
  return prisma.conversacion.count({ where: { noLeidos: { gt: 0 }, archivada: false, noEsCliente: false } }).catch(() => 0);
}

/** KPI de la semana desde la Bandeja: los chats con mensajes en el rango (para «primer mensaje en 5 min»). */
export async function mensajesParaKpi(desde: Date, hasta: Date) {
  const convs = await prisma.conversacion.findMany({
    where: { noEsCliente: false, mensajes: { some: { fecha: { gte: desde, lte: hasta }, direccion: "entra" } } },
    select: { mensajes: { select: { direccion: true, fecha: true, importado: true }, orderBy: { fecha: "asc" }, take: 400 } },
  });
  return convs.map(c => c.mensajes);
}
