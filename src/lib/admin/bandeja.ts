// Las reglas de la Bandeja de WhatsApp (Fase 2.3, 4 nov 2026). Puro: lo usan
// el panel, la ruta del puente, el scorecard y las pruebas.
import { normalizarTelefono } from "./crm";

/** Lo que el puente le manda al panel por cada mensaje. */
export interface EventoMensaje {
  tipo: "mensaje";
  /** Id del mensaje en WhatsApp (único). */
  waId: string;
  /** Id del chat: «52…@c.us» o «…@lid». */
  chatId: string;
  /** Dígitos del teléfono si el puente lo pudo resolver. */
  telefono?: string | null;
  nombre?: string | null;
  /** true = lo mandó el negocio (desde el celular o el panel). */
  deNosotros: boolean;
  tipoMensaje?: string;
  texto?: string | null;
  /** Milisegundos (Unix). */
  fecha: number;
  /** Viene de la importación del historial. */
  importado?: boolean;
}
export interface EventoAck { tipo: "ack"; waId: string; estado: "enviado" | "entregado" | "leido" | "fallo" }
export interface EventoConexion { tipo: "conexion"; estado: "qr" | "conectado" | "desconectado" | "iniciando"; qr?: string | null; numero?: string | null; detalle?: string | null }
export type EventoPuente = EventoMensaje | EventoAck | EventoConexion;

/** Solo chats individuales: nada de grupos, estados ni canales. */
export const esChatIndividual = (chatId: unknown) => typeof chatId === "string" && /^[\w.-]+@(c\.us|lid)$/.test(chatId);

/** El teléfono E.164 de un chat «@c.us» (los «@lid» no lo traen en el id). */
export function telefonoDeChat(chatId: string, resuelto?: string | null): string | null {
  if (resuelto) return normalizarTelefono(`+${String(resuelto).replace(/\D/g, "")}`);
  const [usuario, dominio] = chatId.split("@");
  return dominio === "c.us" ? normalizarTelefono(`+${usuario}`) : null;
}

const TIPOS = ["texto", "imagen", "audio", "video", "documento", "ubicacion", "sticker", "otro"] as const;
/** El tipo de whatsapp-web.js (chat, image, ptt…) al nuestro. */
export function tipoDeMensaje(t: unknown): (typeof TIPOS)[number] {
  const m: Record<string, (typeof TIPOS)[number]> = {
    chat: "texto", texto: "texto", image: "imagen", imagen: "imagen", ptt: "audio", audio: "audio", video: "video",
    document: "documento", documento: "documento", location: "ubicacion", ubicacion: "ubicacion", sticker: "sticker",
  };
  return m[String(t ?? "chat")] ?? "otro";
}

/** Lo que se enseña de un mensaje sin texto (una foto, un audio…). */
export function textoVisible(tipo: string, texto: string | null | undefined): string {
  const t = String(texto ?? "").trim();
  if (t) return t;
  return ({ imagen: "📷 Foto", audio: "🎤 Audio", video: "🎬 Video", documento: "📄 Documento", ubicacion: "📍 Ubicación", sticker: "Sticker" } as Record<string, string>)[tipo] ?? "Mensaje";
}

const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * ¿El primer mensaje viene de un botón del sitio? Los botones mandan texto
 * prellenado («me interesa el tour "Expedición Tamul"…», `lib/whatsapp.ts`).
 * Si lo detecta, el canal es «WhatsApp del sitio» y, si nombra un tour, ese tour.
 */
export function origenDelPrimerMensaje(texto: string | null | undefined, tours: { slug: string; nombre: string }[]): { canal: "whatsapp" | "whatsapp_sitio"; tours: string[] } {
  const t = quitarAcentos(String(texto ?? ""));
  const delSitio = /me interesa (el tour|el paquete|la noche)|quiero informacion sobre los tours|vengo desde|vengo de la (web|pagina)|quiero(ria)? reservar|i'?m interested in/.test(t);
  const nombrados = tours.filter(x => x.nombre && t.includes(quitarAcentos(x.nombre))).map(x => x.slug);
  return { canal: delSitio ? "whatsapp_sitio" : "whatsapp", tours: Array.from(new Set(nombrados)).slice(0, 3) };
}

/** Horario en que cuenta el «primer mensaje en 5 min» (regla del prompt: 8:00–20:00). */
export const HORARIO_RESPUESTA = { desde: "08:00", hasta: "20:00" } as const;

const hhmmMX = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(/^24/, "00");

export interface MensajeLigero { direccion: string; fecha: Date; importado?: boolean }

/**
 * De las conversaciones NUEVAS de la semana (su primer mensaje del cliente cae
 * en el rango), cuántas recibieron la primera respuesta en 5 min o menos. Solo
 * cuentan las que escribieron en horario (8:00–20:00): fuera de él no se
 * espera respuesta inmediata. Es el KPI «Primer mensaje en 5 min».
 */
export function primerMensajeEn5(conversaciones: MensajeLigero[][], desde: Date, hasta: Date): { nuevas: number; enHorario: number; en5: number } {
  let nuevas = 0, enHorario = 0, en5 = 0;
  for (const ms of conversaciones) {
    const orden = ms.filter(m => !m.importado).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    const primero = orden.find(m => m.direccion === "entra");
    if (!primero || primero.fecha < desde || primero.fecha > hasta) continue;
    // Si el negocio ya le había escrito antes (no es un cliente nuevo), no cuenta.
    if (orden.some(m => m.direccion === "sale" && m.fecha < primero.fecha) || ms.some(m => m.importado)) continue;
    nuevas++;
    const h = hhmmMX(primero.fecha);
    if (h < HORARIO_RESPUESTA.desde || h >= HORARIO_RESPUESTA.hasta) continue;
    enHorario++;
    const resp = orden.find(m => m.direccion === "sale" && m.fecha >= primero.fecha);
    if (resp && resp.fecha.getTime() - primero.fecha.getTime() <= 5 * 60_000) en5++;
  }
  return { nuevas, enHorario, en5 };
}

/** «Hace 12 min», «hace 3 h», «hace 2 d». */
export function haceCuanto(desde: Date | string | null | undefined, ahora: Date = new Date()): string {
  if (!desde) return "";
  const min = Math.max(0, Math.round((ahora.getTime() - new Date(desde).getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}
