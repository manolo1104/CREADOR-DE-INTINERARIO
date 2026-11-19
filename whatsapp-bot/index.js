// ════════════════════════════════════════════════════════════════════
// Tours Huasteca Potosina — Bot de WhatsApp (proceso principal)
// whatsapp-web.js + agente Claude. Comportamientos: espera por ráfaga de
// mensajes, comprobantes de pago, pausa cuando el equipo escribe a mano,
// escalación con aviso al dueño y comandos (/confirma, /pausa, /reanuda…).
//
// Lo que el bot NUNCA hace solo: confirmar un pago. Acusa el comprobante, se
// lo manda al dueño con el comando listo y espera su /confirma.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { processMessage, needsHuman, leerComprobante } = require("./agent");
const api = require("./api-client");
const sessions = require("./sessions");
const { getSession, pushHistory, clearSession, sesionExistente } = sessions;
const { crearGestorDeRafagas } = require("./buffer");
const estado = require("./estado");
const medios = require("./medios");
const adjuntos = require("./adjuntos");
const { crearDocumentos } = require("./documentos");
const seguimiento = require("./seguimiento");
const { etapaDe } = require("./etapas");
const { crearEtiquetas } = require("./etiquetas");
const horario = require("./horario");
const pausaHumano = require("./pausaHumano");
const guardados = require("./guardados");

// ── Configuración ─────────────────────────────────────────────
function msDeEntorno(nombre, porOmision) {
  const n = Number(process.env[nombre]);
  return Number.isFinite(n) && n > 0 ? n : porOmision;
}
function digitsOnly(s = "") { return String(s || "").replace(/\D/g, ""); }
function listaDeNumeros(txt) {
  return String(txt || "").split(",").map(digitsOnly).filter(Boolean);
}

// El cliente manda RÁFAGAS: "hola", "somos 4", "para el sábado". El bot espera
// a que deje de escribir y contesta UNA vez a todo junto.
// · DEBOUNCE_MS: cada mensaje nuevo reinicia este reloj (ventana deslizante).
// · DEBOUNCE_MAX_MS: tope duro desde el PRIMER mensaje de la ráfaga. Sin él,
//   quien escribe cada 14 s no recibiría respuesta nunca.
const DEBOUNCE_MS = Number(process.env.MESSAGE_DEBOUNCE_MS || 15000);
const DEBOUNCE_MAX_MS = Number(process.env.MESSAGE_DEBOUNCE_MAX_MS || 90000);
// · Una ráfaga de SOLO comprobantes (la foto, sin texto) sale a los 3 s, no a
//   los 15: el acuse no tiene que esperar a que el cliente escriba, y menos si
//   la foto llegó mientras el modelo contestaba (ya esperó todo ese rato). Los
//   3 s juntan las 2 fotos que se mandan de un jalón en UN acuse.
const ESPERA_COMPROBANTE_MS = (() => {
  const n = Number(process.env.MESSAGE_DEBOUNCE_COMPROBANTE_MS);
  return process.env.MESSAGE_DEBOUNCE_COMPROBANTE_MS !== undefined && Number.isFinite(n) && n >= 0 ? n : 3000;
})();
// Cuando alguien del equipo escribe a mano en un chat, el bot se calla este
// rato, y cada mensaje suyo lo vuelve a empezar. 18 nov 2026, Manolo: 5 min
// (antes 2 h). Al vencer, si el cliente quedó sin respuesta el bot le contesta
// solo con todo el contexto (pausaHumano.js, `retomarPausasVencidas`).
const HUMAN_TAKEOVER_MS = pausaHumano.msPausaHumano();
// Una FALLA del bot (el modelo no contestó) sigue en 2 h: ahí el cliente ya
// recibió «alguien del equipo te escribe» y el equipo necesita tiempo.
const PAUSA_FALLA_MS = msDeEntorno("PAUSA_FALLA_MS", 2 * 60 * 60 * 1000);
// Cuando el bot PASA un chat al equipo (pide llamada, para hoy…) y nadie
// escribe, retoma a las 12 h. Queja, cancelación, cliente molesto y cambios
// después de pagar NO se retoman solos: esperan /reanuda.
const PAUSA_ESCALACION_MS = msDeEntorno("PAUSA_ESCALACION_MS", 12 * 60 * 60 * 1000);
const MOTIVOS_HASTA_REANUDA = new Set(["queja_incidente", "cancelacion", "cliente_molesto", "cambio_post_pago"]);

// El número del dueño: ÚNICO destino de los avisos y quien puede mandar
// comandos por mensaje directo. 10 dígitos de México → 52 + número.
const OWNER = numeroEscrito(process.env.OWNER_WHATSAPP_NUMBER);
const OWNER_JID = OWNER ? `${OWNER}@c.us` : "";

// A quién responde el bot. RESPOND_MODE: "strangers" (default) | "all" (pruebas).
// En "strangers" el bot SOLO habla con números NO guardados en los contactos
// del teléfono del negocio (18 nov 2026, Manolo: «que el bot solo responda
// mensajes de chats no registrados»). Un contacto guardado lo atiende el
// equipo, aunque el bot ya estuviera platicando con él (antes seguía: el
// equipo guarda los contactos a media venta, «Ana 2pax Tamul 8sep»); en ese
// caso al dueño le llega UN aviso para que lo siga. Reglas en guardados.js.
const RESPOND_MODE = guardados.modoRespuesta(process.env.RESPOND_MODE);
// BOT_SOLO_CONECTAR=1: se vincula a WhatsApp (QR) y se queda conectado SIN
// contestar ni mandar nada; solo /status y /help del dueño o del teléfono del
// negocio. Para escanear el QR antes de que el sitio tenga lo que usa el bot.
const SOLO_CONECTAR = guardados.soloConectar(process.env.BOT_SOLO_CONECTAR);
// Números que SIEMPRE reciben respuesta aunque estén guardados (pruebas).
const ALWAYS_RESPOND = listaDeNumeros(process.env.ALWAYS_RESPOND_NUMBERS);
// Números que el bot NUNCA contesta, ni texto ni archivos: equipo, guías,
// proveedores, el hotel.
const NEVER_RESPOND = listaDeNumeros(process.env.NEVER_RESPOND_NUMBERS);

// El panel acepta comprobantes de hasta 5 MB (src/lib/admin/evidencia.ts).
const MAX_BYTES_COMPROBANTE = 5 * 1024 * 1024;
const LIMITE_AVISO_MEDIO_MS = 10 * 60 * 1000;   // «no puedo escuchar audios»: 1 cada 10 min por chat
const AVISO_REPETIDO_MS = 60 * 60 * 1000;       // mismo motivo «avisar» en el mismo chat: 1 por hora
const FALLA_COOLDOWN_MS = 10 * 60 * 1000;       // «el bot no pudo responder»: 1 cada 10 min
const CONFIRMA_REPETIDA_MS = 10 * 60 * 1000;    // mismo /confirma (folio + monto) dos veces

// Los comandos del bot (solo los ejecuta el dueño o el teléfono del negocio).
const COMANDO_RE = /^\/(confirma|noespago|pausa|reanuda|olvida|status|help|ayuda)\b/i;

// Mensajes con archivo que nunca son un comprobante (no cuentan como «en camino»).
const TIPOS_SIN_COMPROBANTE = new Set(["ptt", "audio", "sticker", "vcard", "multi_vcard", "location"]);

// Mensajes de WhatsApp que no son de nadie: avisos internos, mensajes
// borrados, cifrado pendiente, llamadas.
const TIPOS_IGNORADOS = new Set([
  "revoked", "e2e_notification", "notification_template", "notification", "gp2", "protocol",
  "call_log", "ciphertext", "broadcast_notification", "debug", "reaction",
]);

/**
 * Versión FIJADA de WhatsApp Web.
 *
 * Sin fijarla, la librería usa la que WhatsApp sirva ese día. Cuando publican
 * una nueva, el arranque entra en un ciclo de recargas y `Client.inject` truena
 * con "Execution context was destroyed" ANTES de poder pintar el QR: el bot
 * queda muerto sin decir por qué, y no hay forma de reconectarlo. Pasó dos
 * veces el 11 de agosto de 2026.
 *
 * `2.3000.1044917563-alpha` está comprobada con whatsapp-web.js 1.34.7: llega
 * al QR limpiamente. Si algún día WhatsApp rompe la compatibilidad, hay que
 * subir a otra de
 * https://github.com/wppconnect-team/wa-version/tree/main/html
 * y PROBARLA antes de dejarla puesta.
 */
const WA_WEB_VERSION = process.env.WA_WEB_VERSION || "2.3000.1044917563-alpha";

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "huasteca-tours" }),
  webVersionCache: {
    type: "remote",
    remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${WA_WEB_VERSION}.html`,
  },
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
  },
});

// ── Números ───────────────────────────────────────────────────
/**
 * Un teléfono que viene de WhatsApp (ya trae lada de país) como lo pide el
 * sitio: los celulares de México sin el 1 viejo (521… → 52…). Lo demás, tal
 * cual: un número de EE. UU. no se toca.
 */
function normalizarTelefono(d = "") {
  d = digitsOnly(d);
  if (d.length === 13 && d.startsWith("521")) return `52${d.slice(3)}`;
  return d;
}
/** Un número que escribió una persona (variables, comandos): 10 dígitos = México. */
function numeroEscrito(txt = "") {
  const d = digitsOnly(txt);
  return d.length === 10 ? `52${d}` : normalizarTelefono(d);
}
// Variantes de número MX (52 / 521 / 10 dígitos) para comparar sin fallar por formato.
function mxVariants(n = "") {
  n = digitsOnly(n);
  const s = new Set([n]);
  if (n.length === 10) { s.add(`52${n}`); s.add(`521${n}`); }
  if (n.length === 12 && n.startsWith("52")) { s.add(`521${n.slice(2)}`); s.add(n.slice(2)); }
  if (n.length === 13 && n.startsWith("521")) { s.add(`52${n.slice(3)}`); s.add(n.slice(3)); }
  return [...s].filter(Boolean);
}
function mismoNumero(a, b) {
  if (!digitsOnly(a) || !digitsOnly(b)) return false;
  const vb = new Set(mxVariants(b));
  return mxVariants(a).some((x) => vb.has(x));
}
function enLista(lista, chatId, telefono) {
  if (!lista.length) return false;
  const [usuario, dominio] = String(chatId || "").split("@");
  const candidatos = [telefono, dominio === "c.us" ? usuario : ""].filter(Boolean);
  return candidatos.some((c) => lista.some((n) => mismoNumero(c, n)));
}
const esSiempreResponder = (chatId, tel) => enLista(ALWAYS_RESPOND, chatId, tel);
const esNuncaResponder = (chatId, tel) => enLista(NEVER_RESPOND, chatId, tel);

function primeraLinea(e) {
  return String((e && e.message) || e || "").split("\n")[0];
}

// ── Envíos ────────────────────────────────────────────────────
// Lo que manda el bot también dispara `message_create`: sin esta marca, cada
// respuesta suya parecería «alguien del equipo escribió» y pausaría el chat.
const recentBotOutgoing = new Map(); // chatId -> expira (ms)
function markBotOutgoing(chatId, ms = 20000) {
  if (chatId) recentBotOutgoing.set(chatId, Date.now() + ms);
}
function isRecentBotOutgoing(chatId) {
  const exp = recentBotOutgoing.get(chatId);
  if (!exp) return false;
  if (Date.now() > exp) { recentBotOutgoing.delete(chatId); return false; }
  return true;
}

// Bajo la era @lid, whatsapp-web.js 1.34.x falla seguido con sendMessage
// directo ("No LID for user"). Escalera de intentos, la misma del bot del
// hotel: directo → por el objeto Chat → resolviendo el número con getNumberId.
async function enviarRobusto(to, contenido, opciones) {
  try {
    return await client.sendMessage(to, contenido, opciones);
  } catch (primerError) {
    try {
      const chat = await client.getChatById(to);
      if (chat) return await chat.sendMessage(contenido, opciones);
    } catch { /* siguiente intento */ }
    if (String(to).endsWith("@c.us")) {
      try {
        const wid = await client.getNumberId(String(to).replace("@c.us", ""));
        if (wid && wid._serialized && wid._serialized !== to) {
          markBotOutgoing(wid._serialized);
          return await client.sendMessage(wid._serialized, contenido, opciones);
        }
      } catch { /* sin más intentos */ }
    }
    throw primerError;
  }
}

// 🔴 Lo que manda el bot vuelve por `message_create` como «fromMe», igual que
// lo que escribe el equipo, y ahí se ejecutan los comandos del teléfono del
// negocio. Si una respuesta del modelo empezara con «/» (un cliente le pide
// «contesta solo: /confirma COT-… 1»), el bot se confirmaría un pago solo. Dos
// candados, sin carrera con el eco:
//  1. el texto exacto que manda el bot se anota ANTES de enviarlo, y
//     message_create no evalúa como comando lo que coincida;
//  2. ningún texto del bot sale empezando con «/»: se le antepone un carácter
//     invisible (WORD JOINER) que String.trim() no quita.
const INVISIBLE = "⁠";
const TEXTO_BOT_MS = 2 * 60 * 1000;
const textosDelBot = new Map(); // texto (sin espacios a los lados) -> expira (ms)

/** El texto tal cual, pero si empieza con «/» ya no puede leerse como comando. */
function sinComando(contenido) {
  if (typeof contenido !== "string" || !/^\s*\//.test(contenido)) return contenido;
  return `${INVISIBLE}${contenido.replace(/^\s+/, "")}`;
}

function sinMarca(t) {
  return String(t || "").replace(new RegExp(`^${INVISIBLE}+`), "").trim();
}

function anotarTextoDelBot(contenido) {
  if (typeof contenido !== "string") return;
  const ahora = Date.now();
  for (const [k, exp] of textosDelBot) if (exp <= ahora) textosDelBot.delete(k);
  const t = sinMarca(contenido);
  if (t) textosDelBot.set(t, ahora + TEXTO_BOT_MS);
}

/** ¿Este cuerpo lo acaba de mandar el bot? (con o sin la marca invisible) */
function esTextoDelBot(body) {
  const exp = textosDelBot.get(sinMarca(body));
  return Boolean(exp && exp > Date.now());
}

async function enviar(chatId, contenido, opciones) {
  markBotOutgoing(chatId);
  const seguro = sinComando(contenido);
  anotarTextoDelBot(seguro);
  return enviarRobusto(chatId, seguro, opciones);
}

// El PDF de la cotización o de la confirmación y las fotos de los tours
// (16 nov 2026, «Tének»): salen ANTES del texto del turno.
const documentos = crearDocumentos({ client, api, enviar });
const etiquetas = crearEtiquetas({ client });

/** Aviso (texto o archivo) al WhatsApp del dueño. Devuelve si llegó; nunca lanza. */
async function avisarAlDueno(contenido, opciones) {
  if (!OWNER_JID) {
    console.warn("⚠️ Sin OWNER_WHATSAPP_NUMBER: este aviso no le llega a nadie.");
    return false;
  }
  try {
    await enviar(OWNER_JID, contenido, opciones);
    return true;
  } catch (e) {
    console.warn("⚠️ No pude avisar al dueño:", primeraLinea(e));
    return false;
  }
}

function marcarLeido(msg) {
  // El bot tarda 15 s o más en contestar; sin las palomitas azules el cliente
  // siente que nadie lo vio.
  msg.getChat().then((c) => c.sendSeen()).catch(() => {});
}

// ── Quién escribe ─────────────────────────────────────────────
// Un chat "…@lid" NO trae el teléfono en su id: hay que pedírselo a WhatsApp
// (getContactLidAndPhone). Se pregunta UNA vez por chat; lo que no se pudo se
// reintenta a la hora.
const cacheLid = new Map(); // chatId -> { lid, pn, at }

/** La promesa, o `porOmision` si tarda más de `ms` (WhatsApp Web a veces no contesta nunca). */
function conLimite(promesa, ms, porOmision) {
  let timer = null;
  const limite = new Promise((resolve) => { timer = setTimeout(() => resolve(porOmision), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

async function lidYTelefono(chatId) {
  const previo = cacheLid.get(chatId);
  if (previo && (previo.pn || Date.now() - previo.at < 60 * 60 * 1000)) return previo;
  let r = { lid: null, pn: null, at: Date.now() };
  if (/@(c\.us|lid)$/.test(String(chatId))) {
    try {
      // Puede preguntarle a los servidores de WhatsApp: con tope, para que un
      // chat no se quede esperando para siempre.
      const lista = await conLimite(client.getContactLidAndPhone([chatId]), 8000, null);
      const x = Array.isArray(lista) ? lista[0] : null;
      if (x) r = { lid: x.lid || null, pn: x.pn || null, at: Date.now() };
      else if (lista === null) console.warn(`⚠️ getContactLidAndPhone(${chatId}) no contestó en 8 s.`);
    } catch (e) {
      console.warn(`⚠️ getContactLidAndPhone(${chatId}) falló:`, primeraLinea(e));
    }
  }
  cacheLid.set(chatId, r);
  return r;
}

/** Los ids con que WhatsApp puede nombrar al MISMO chat (el @c.us y el @lid). */
async function idsEquivalentes(chatId) {
  const ids = new Set([chatId]);
  const { lid, pn } = await lidYTelefono(chatId);
  if (lid) ids.add(lid);
  if (pn) ids.add(pn);
  return [...ids];
}

// ── ¿Contacto guardado en el teléfono del negocio? ────────────
// El bot solo les habla a los NO guardados (guardados.js). Lo leído vale 2 min;
// «no se pudo saber» se vuelve a preguntar a los 30 s.
const cacheGuardado = new Map(); // chatId -> { valor: true|false|null, at }
const GUARDADO_VALE_MS = 2 * 60 * 1000;
const GUARDADO_NULO_MS = 30 * 1000;

/** isMyContact de un id (true/false) o null si WhatsApp no contestó. Nunca lanza. */
async function leerIsMyContact(id) {
  try {
    const c = await conLimite(client.getContactById(id), 8000, null);
    return c ? Boolean(c.isMyContact) : null;
  } catch (e) {
    console.warn(`⚠️ getContactById(${id}) falló: ${primeraLinea(e)}`);
    return null;
  }
}

/**
 * ¿El chat es de un contacto GUARDADO? true / false / null (no se pudo saber).
 * En chats @lid se revisa también el contacto de su teléfono real: bajo @lid
 * el contacto del chat a veces dice «no guardado» aunque el número esté en la
 * agenda. `contacto` = el que ya trajo msg.getContact() (si no, se pide);
 * `fresco` = no usar lo leído antes (un mensaje que acaba de llegar).
 */
async function contactoGuardado(chatId, { contacto = null, fresco = false } = {}) {
  const previo = cacheGuardado.get(chatId);
  if (!fresco && previo && Date.now() - previo.at < (previo.valor === null ? GUARDADO_NULO_MS : GUARDADO_VALE_MS)) {
    return previo.valor;
  }
  const esLid = String(chatId || "").endsWith("@lid");
  const delChat = contacto ? Boolean(contacto.isMyContact) : await leerIsMyContact(chatId);
  let delTelefono = null;
  if (esLid && delChat !== true) {
    const { pn } = await lidYTelefono(chatId);
    if (pn) delTelefono = await leerIsMyContact(pn);
  }
  const valor = guardados.decidirGuardado({ esLid, delChat, delTelefono });
  cacheGuardado.set(chatId, { valor, at: Date.now() });
  return valor;
}

/**
 * ¿El bot puede escribirle POR SU CUENTA a este chat (recordatorio, «vence
 * mañana», pago con liga, «¿cómo les fue?», retomar tras la pausa)?
 * "mandar" | "no_mandar" (contacto guardado) | "esperar" (no se pudo saber).
 */
async function permisoParaEscribir(chatId, telefono) {
  return guardados.decidirPropio({
    modo: RESPOND_MODE,
    guardado: await contactoGuardado(chatId),
    siempre: esSiempreResponder(chatId, telefono),
  });
}

// Lo que el bot dejó de mandar a un contacto guardado se anota UNA vez por
// chat y por motivo (la revisión corre cada pocos minutos).
const silenciosAnotados = new Set();
function anotarSilencio(chatId, que) {
  const clave = `${chatId}|${que}`;
  if (silenciosAnotados.has(clave)) return;
  if (silenciosAnotados.size > 2000) silenciosAnotados.clear();
  silenciosAnotados.add(clave);
  console.log(`🔕 [${etiquetaChat(chatId)}] contacto guardado: el bot no le manda ${que} (lo atiende el equipo).`);
}

/**
 * El bot platicaba con este chat y lo acaban de guardar: desde ahora es del
 * equipo. Se le avisa UNA vez al dueño para que nadie se quede sin respuesta.
 */
async function avisarGuardadoAMediaPlatica(chatId) {
  const s = sesionExistente(chatId);
  if (!s || s.avisoGuardadoAt) return;
  s.avisoGuardadoAt = Date.now();
  await avisarAlDueno(`📇 ${etiquetaChat(chatId)} ya está guardado en los contactos del teléfono del negocio y venía platicando con el bot. Desde ahora el bot ya no le contesta ni le escribe: síguelo tú.`);
}

/** El teléfono REAL del chat (dígitos) o null. Nunca los dígitos de un @lid. */
async function telefonoDeChat(chatId, contact) {
  const ses = sesionExistente(chatId);
  if (ses && ses.telefono) return ses.telefono;
  const [usuario, dominio] = String(chatId || "").split("@");
  if (dominio === "c.us") return normalizarTelefono(usuario) || null;
  if (dominio !== "lid") return null;
  const { pn } = await lidYTelefono(chatId);
  const tel = pn ? digitsOnly(String(pn).split("@")[0]) : "";
  if (tel) return normalizarTelefono(tel);
  // Bajo @lid, contact.number a veces trae los MISMOS dígitos del lid (visto en
  // el bot del hotel): eso daría un wa.me falso, así que se descarta.
  const n = digitsOnly(contact && contact.number);
  return n && n !== digitsOnly(usuario) ? normalizarTelefono(n) : null;
}

// Lo último que se supo de cada chat; atenderRafaga lo pasa a la sesión.
const contactos = new Map(); // chatId -> { telefono, nombre, guardado }

async function datosDelContacto(msg) {
  const chatId = msg.from;
  let contact = null;
  try {
    contact = await msg.getContact();
  } catch (e) {
    // Bajo @lid getContact a veces revienta: se sigue como desconocido para
    // no perder al prospecto.
    console.warn(`⚠️ getContact falló (${primeraLinea(e)}) — lo trato como desconocido: ${chatId}`);
  }
  const datos = {
    telefono: await telefonoDeChat(chatId, contact),
    nombre: String((contact && (contact.pushname || contact.verifiedName)) || "").trim() || null,
    // true / false / null (no se pudo saber). En @lid revisa también su teléfono real.
    guardado: await contactoGuardado(chatId, { contacto: contact, fresco: true }),
  };
  contactos.set(chatId, datos);
  return datos;
}

function telefonoConocido(chatId) {
  const s = sesionExistente(chatId);
  if (s && s.telefono) return s.telefono;
  const c = contactos.get(chatId);
  if (c && c.telefono) return c.telefono;
  const [usuario, dominio] = String(chatId || "").split("@");
  return dominio === "c.us" ? normalizarTelefono(usuario) : null;
}

/** Pasa a la sesión el teléfono real y el nombre de WhatsApp (sin pisar lo que ya dio el cliente). */
function completarContacto(chatId, s) {
  const c = contactos.get(chatId) || {};
  const tel = c.telefono || telefonoConocido(chatId);
  if (!s.telefono && tel) s.telefono = tel;
  if (!s.nombre && c.nombre) s.nombre = c.nombre;
}

function marcarAtendido(chatId) {
  const s = getSession(chatId);
  s.botAt = Date.now();
}

/** "Ana · 52XXXXXXXXXX" (o los dígitos del chat si no hay teléfono). */
function etiquetaChat(chatId) {
  const s = sesionExistente(chatId);
  const c = contactos.get(chatId) || {};
  const nombre = (s && s.nombre) || c.nombre || "";
  const num = telefonoConocido(chatId) || String(chatId || "").split("@")[0];
  return nombre ? `${nombre} · ${num}` : num;
}

/** El número que se escribe en /reanuda (el teléfono real si se conoce). */
function numeroParaComando(chatId) {
  return telefonoConocido(chatId) || String(chatId || "").split("@")[0];
}

// ── El dueño ──────────────────────────────────────────────────
let ownerLid = null; // se aprende cuando el dueño escribe desde un chat @lid

function esNumeroDelDueno(chatId, telefono) {
  if (!OWNER) return false;
  const [usuario, dominio] = String(chatId || "").split("@");
  if (dominio === "c.us" && mismoNumero(usuario, OWNER)) return true;
  if (ownerLid && chatId === ownerLid) return true;
  return Boolean(telefono) && mismoNumero(telefono, OWNER);
}

/** ¿Es el chat de avisos con el dueño? (sin ir a WhatsApp: se usa en cada mensaje propio) */
function esChatDelDueno(chatId) {
  if (!OWNER || !chatId) return false;
  const [usuario, dominio] = String(chatId).split("@");
  return (dominio === "c.us" && mismoNumero(usuario, OWNER)) || chatId === ownerLid;
}

/** El chat «Tú» de la cuenta conectada (el número del negocio), o null antes de conectar. */
function chatPropio() {
  const wid = client.info && client.info.wid;
  return (wid && wid._serialized) || null;
}

function esChatPropio(chatId) {
  const propio = chatPropio();
  if (!propio || !chatId) return false;
  if (chatId === propio) return true;
  const [usuario, dominio] = String(chatId).split("@");
  return dominio === "c.us" && mismoNumero(usuario, String(propio).split("@")[0]);
}

/**
 * El comando dentro de lo que mandó el dueño. Lo normal es «/confirma …» solo,
 * pero el aviso del comprobante trae el comando a media línea («👉 /confirma
 * COT-X 930», o el pie de la foto «Comprobante COT-X · /confirma COT-X 930») y
 * WhatsApp copia el mensaje entero: eso se ignoraba en silencio y el dueño
 * creía que había confirmado. Se toma la primera línea que trae un comando,
 * desde la «/». null si no hay ninguno.
 */
function extraerComando(texto) {
  const t = String(texto || "").trim();
  if (!t) return null;
  if (t.startsWith("/")) return t;
  for (const linea of t.split(/\n+/)) {
    const m = /(?:^|[\s·:>«"'(*_])(\/(?:confirma|noespago|pausa|reanuda|olvida|status|help|ayuda)\b.*)$/i.exec(linea);
    if (m) return m[1].replace(/[»"')\]*_]+\s*$/, "").trim();
  }
  return null;
}

// ── Hora de México para los avisos ────────────────────────────
function horaMx(ms) {
  return new Date(ms).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: horario.ZONA_MX,
  });
}
/** "las 22:15" · "mañana a las 06:15" · "el 2026-10-12 a las 09:00". */
function cuandoMx(ms) {
  const dia = horario.fechaMexico(new Date(ms));
  const hoy = horario.fechaMexico();
  if (dia === hoy) return `las ${horaMx(ms)}`;
  if (dia === horario.sumarDias(hoy, 1)) return `mañana a las ${horaMx(ms)}`;
  return `el ${dia} a las ${horaMx(ms)}`;
}
/** 7200000 → "2 h" · 5400000 → "1 h 30 min" · 600000 → "10 min". */
function duracionTexto(ms) {
  const min = Math.max(1, Math.round(Number(ms) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h} h ${resto} min` : `${h} h`;
}

// ── Historial sin pisar al modelo ─────────────────────────────
// Mientras el modelo responde, agent.js va metiendo al historial sus
// herramientas (tool_use → tool_result). Un texto colado en medio rompe la
// pareja y la API rechaza el chat completo. Lo que llegue en ese rato (lo que
// escribe el equipo a mano, un audio, la nota de «el equipo atendió») espera
// aquí y entra cuando el modelo termina.
const pendientes = new Map(); // chatId -> [[role, content], …]
function anotarHistorial(chatId, role, content) {
  if (!content) return;
  if (rafagas.ocupado(chatId)) {
    const lista = pendientes.get(chatId) || [];
    lista.push([role, content]);
    pendientes.set(chatId, lista);
    return;
  }
  pushHistory(chatId, role, content);
}
function volcarPendientes(chatId) {
  const lista = pendientes.get(chatId);
  if (!lista) return;
  pendientes.delete(chatId);
  for (const [role, content] of lista) pushHistory(chatId, role, content);
}

/**
 * Tira la ráfaga que esperaba (el chat pasó a una persona) pero guarda en el
 * historial lo que dijo el cliente: antes se perdía y el bot, al retomar, no
 * sabía qué había preguntado.
 * Con `acusar` (la pausa la puso el propio bot: una escalación o una falla),
 * el comprobante que esperaba su acuse lo recibe igual, uno por folio. 🔴 Si
 * el turno en curso pasaba el chat al equipo, el acuse ya escrito se tiraba:
 * el cliente se quedaba sin «Recibimos tu comprobante» y el historial decía
 * que lo mandó «mientras el equipo atendía el chat», que no era cierto.
 */
function descartarRafaga(chatId, { acusar = false } = {}) {
  const acusados = new Set();
  for (const el of rafagas.descartar(chatId) || []) {
    if (el && el.tipo === "comprobante") {
      const clave = String(el.folio || "");
      if (acusar && el.ackText && !acusados.has(clave)) {
        acusados.add(clave);
        anotarHistorial(chatId, "user", medios.notaHistorialComprobante(el.folio));
        anotarHistorial(chatId, "assistant", el.ackText);
        enviar(chatId, el.ackText)
          .then(() => marcarAtendido(chatId))
          .catch((e) => console.error(`❌ acuse de comprobante a ${chatId}:`, primeraLinea(e)));
      } else {
        anotarHistorial(chatId, "user", acusar
          ? medios.notaHistorialComprobante(el.folio, { acusado: acusados.has(clave) })
          : medios.notaHistorialComprobante(el.folio, { enPausa: true }));
      }
    } else if (el && el.tipo === "texto" && String(el.texto || "").trim()) {
      anotarHistorial(chatId, "user", String(el.texto).trim());
    }
  }
}

// ── Pausas (guardadas en estado.js: sobreviven a un reinicio) ─
/** La pausa vigente del chat o null. Si acaba de vencer, el modelo se entera de que atendió el equipo. */
function pausaActiva(chatId) {
  const p = estado.pausa(chatId);
  if (!p) return null;
  if (p.hasta !== null && p.hasta !== undefined && Number(p.hasta) <= Date.now()) {
    estado.quitarPausa(chatId);
    notaDeRetomar(chatId, p);
    return null;
  }
  return p;
}

// ── Retomar solo al vencer la pausa del equipo (18 nov 2026) ──
let relojPausas = null;
/**
 * Cada 15 s: las pausas que puso una PERSONA del equipo y ya vencieron se
 * quitan. Si lo último del chat es del cliente (nadie le contestó), el bot le
 * contesta ya, con la plática completa; si no, solo deja la nota de siempre y
 * espera al siguiente mensaje. Escalaciones, fallas y /pausa no entran aquí.
 */
async function retomarPausasVencidas(ahora = Date.now()) {
  for (const [chatId, p] of Object.entries(estado.pausas())) {
    if (!pausaHumano.pausaHumanaVencida(p, ahora)) continue;
    const s = sesionExistente(chatId);
    const pendiente = s ? pausaHumano.pendienteDelCliente(s.history) : null;
    if (!pendiente) {
      estado.quitarPausa(chatId);
      notaDeRetomar(chatId, p);
      continue;
    }
    // Lo guardaron en los contactos durante la pausa: ya es del equipo, el bot
    // no retoma. Si no se pudo saber, se reintenta en la siguiente vuelta.
    const permiso = await permisoParaEscribir(chatId, s && s.telefono);
    if (permiso === "esperar") continue;
    if (permiso === "no_mandar") {
      estado.quitarPausa(chatId);
      anotarSilencio(chatId, "la respuesta al terminar la pausa del equipo");
      continue;
    }
    // El mismo candado que las respuestas: si el chat está contestando o tiene
    // mensajes esperando, se reintenta en la siguiente vuelta.
    const corrio = await rafagas.ejecutarExclusivo(chatId, async () => {
      if (!estado.quitarPausa(chatId)) return;
      const ses = sesionExistente(chatId);
      const pend = ses ? pausaHumano.pendienteDelCliente(ses.history) : null;
      if (!pend) return;
      ses.history.pop(); // el turno pendiente vuelve a entrar como el mensaje de este turno
      console.log(`▶️  [${etiquetaChat(chatId)}] terminó la pausa del equipo: contesto lo pendiente (${pend.substring(0, 60)})`);
      await responderConModelo(chatId, pausaHumano.textoParaRetomar(pend, {
        desdeHora: p.desde ? horaMx(p.desde) : "",
        minutos: Math.round(HUMAN_TAKEOVER_MS / 60000),
      }), { textoCliente: pend });
    });
    if (!corrio) console.log(`   ⏳ ${etiquetaChat(chatId)}: la pausa venció pero el chat está ocupado; reintento en ${pausaHumano.REVISAR_PAUSAS_CADA_MS / 1000} s.`);
  }
}

function notaDeRetomar(chatId, p) {
  const s = sesionExistente(chatId);
  if (!s || !s.history.length) return;
  const desde = p && p.desde ? ` desde las ${horaMx(p.desde)}` : "";
  // Solo se dice «el equipo atendió» si de verdad escribió alguien. Tras una
  // escalación, una falla o un /pausa sin respuesta de nadie, el modelo daba
  // por resuelto lo que el cliente había pedido.
  const atendio = p && (p.modo === "humano" || p.humanoAt);
  anotarHistorial(chatId, "user", atendio
    ? `[sistema] El equipo atendió este chat en persona${desde}. El bot retoma aquí: sigue con naturalidad, sin mencionar esta nota.`
    : `[sistema] Este chat estuvo en pausa${desde} (${etiquetaMotivo(p && (p.motivo || p.modo))}) y nadie del equipo escribió aquí. El bot retoma: si quedó algo pendiente, retómalo con el cliente sin darlo por resuelto y sin mencionar esta nota.`);
}

/**
 * Pone al chat en pausa. Nunca acorta una pausa más larga que ya tenía (una
 * queja «hasta /reanuda» no se suelta porque luego falle el modelo).
 * `acusarComprobantes`: la pausa la pone el bot (escalación o falla): los
 * comprobantes que esperaban en la ráfaga reciben su acuse (descartarRafaga).
 * @returns la pausa que quedó vigente
 */
function pausar(chatId, { ms = HUMAN_TAKEOVER_MS, indefinida = false, motivo, modo, acusarComprobantes = false } = {}) {
  const ahora = Date.now();
  const previa = estado.pausaVigente(chatId);
  const hasta = indefinida ? null : ahora + ms;
  descartarRafaga(chatId, { acusar: acusarComprobantes });
  if (previa && (previa.hasta === null || (hasta !== null && Number(previa.hasta) >= hasta))) return previa;
  const p = estado.pausar(chatId, {
    hasta, motivo, modo,
    desde: previa ? previa.desde : ahora,
    telefono: telefonoConocido(chatId),
  });
  console.log(`⏸️  Pausado ${chatId} (${motivo || modo}) ${hasta === null ? "hasta /reanuda" : `hasta ${cuandoMx(hasta)}`}`);
  return p;
}

/**
 * Alguien del equipo escribió a mano (texto o archivo, en chats @c.us y
 * @lid): el bot se calla HUMAN_TAKEOVER_MS desde ESE mensaje. Cada mensaje
 * suyo lo vuelve a empezar. Una pausa «hasta /reanuda» se respeta.
 */
function pausaPorHumano(ids) {
  const ahora = Date.now();
  const telefono = ids.map(telefonoConocido).find(Boolean) || null;
  for (const id of ids) {
    const previa = estado.pausaVigente(id);
    if (previa && previa.hasta === null) {
      // «Hasta /reanuda» se respeta, pero queda dicho que ya escribió alguien:
      // así el seguimiento al dueño se detiene y la nota al retomar no miente.
      estado.pausar(id, { ...previa, humanoAt: ahora, telefono: previa.telefono || telefono });
      const ses = sesionExistente(id);
      if (ses) ses.humanoAt = ahora;
      descartarRafaga(id);
      continue;
    }
    // El seguimiento (seguimiento.js) no le escribe encima a una persona.
    const ses = sesionExistente(id);
    if (ses) ses.humanoAt = ahora;
    estado.pausar(id, {
      hasta: ahora + HUMAN_TAKEOVER_MS,
      motivo: previa ? previa.motivo : "humano",
      modo: "humano",
      desde: previa ? previa.desde : ahora,
      humanoAt: ahora,
      telefono,
    });
    descartarRafaga(id);
  }
  console.log(`⏸️  Pausado ${ids[0]} (alguien del equipo escribió) hasta ${cuandoMx(ahora + HUMAN_TAKEOVER_MS)}`);
}

// ── Respuestas automáticas de WhatsApp Business ───────────────
// La bienvenida y el mensaje de ausencia salen desde el MISMO número un par
// de segundos después del mensaje del cliente. message_create los veía como
// «alguien del equipo escribió» y callaba al bot 2 h, justo de noche, cuando
// no hay nadie. Un mensaje propio que el bot no mandó y que sale a menos de
// AUTORESPUESTA_MS del último mensaje del cliente es automático: no pausa.
// (Igual conviene apagarlos en WhatsApp Business: ver el README.)
const AUTORESPUESTA_MS = 4000;
const ultimoEntrante = new Map(); // chatId -> ms del último mensaje del cliente

function anotarEntrante(chatId) {
  const ahora = Date.now();
  if (ultimoEntrante.size > 2000) {
    for (const [k, t] of ultimoEntrante) if (ahora - t > 60 * 1000) ultimoEntrante.delete(k);
  }
  ultimoEntrante.set(chatId, ahora);
}

function esAutorespuesta(ids) {
  const ahora = Date.now();
  return ids.some((id) => ahora - (ultimoEntrante.get(id) || 0) < AUTORESPUESTA_MS);
}

// ── Seguimiento de un chat que el bot pasó al equipo ──────────
// Al pasar un chat por llamada, «quiero una persona» o «para hoy», el bot le
// pregunta a qué hora le marcan (o le ofrece mañana) y se calla en el mismo
// turno. Su respuesta («a las 5 pm, a este número») ya solo quedaba en el
// teléfono del negocio. Mientras nadie del equipo escriba, lo que conteste en
// la primera hora le llega también al dueño, como seguimiento del aviso.
const MOTIVOS_SEGUIMIENTO = new Set(["pide_humano", "llamada", "para_hoy"]);
const SEGUIMIENTO_MS = 60 * 60 * 1000;
const SEGUIMIENTO_MAX = 6;
const seguimientosEnviados = new Map(); // `${chatId}|${desde}` -> cuántos van

async function seguimientoAlDueno(chatId, texto, p) {
  if (!p || p.modo !== "escalacion" || p.humanoAt || !MOTIVOS_SEGUIMIENTO.has(p.motivo)) return;
  const ahora = Date.now();
  if (ahora - Number(p.desde || 0) > SEGUIMIENTO_MS) return;
  if (seguimientosEnviados.size > 500) {
    for (const k of seguimientosEnviados.keys()) {
      if (ahora - Number(k.split("|").pop()) > SEGUIMIENTO_MS) seguimientosEnviados.delete(k);
    }
  }
  const clave = `${chatId}|${p.desde}`;
  const n = seguimientosEnviados.get(clave) || 0;
  if (n >= SEGUIMIENTO_MAX) return;
  seguimientosEnviados.set(clave, n + 1);
  const s = sesionExistente(chatId);
  const aviso = [
    `🗣️ *Seguimiento* · ${etiquetaMotivo(p.motivo)}`,
    `👤 ${(s && s.nombre) || "Sin nombre"}`,
    medios.lineaTelefono((s && s.telefono) || telefonoConocido(chatId)),
    `💬 *Contestó:* «${medios.recortar(texto, 300)}»`,
    "",
    describirPausa(p, numeroParaComando(chatId)),
  ].join("\n");
  const ok = await avisarAlDueno(aviso);
  console.log(`🗣️ Seguimiento (${p.motivo}) de ${etiquetaChat(chatId)} → dueño: ${ok ? "avisado" : "NO llegó"}`);
}

function reanudar(chatId) {
  const p = estado.pausa(chatId);
  const habia = estado.quitarPausa(chatId);
  if (habia) notaDeRetomar(chatId, p);
  return habia;
}

function describirPausa(p, numero) {
  if (!p) return "▶️ *Estado:* el bot sigue atendiendo este chat.";
  if (p.hasta === null) return `⏸️ *Estado:* bot en pausa en este chat hasta que escribas /reanuda ${numero}`;
  return `⏸️ *Estado:* bot en pausa ${duracionTexto(Number(p.hasta) - Date.now())} (hasta ${cuandoMx(p.hasta)}) · para que vuelva antes: /reanuda ${numero}`;
}

// ── Comprobantes ──────────────────────────────────────────────
// Lo que la IA ya leyó de una foto antes del acuse (18 nov 2026): el aviso
// al dueño lo reusa y no se lee dos veces.
const lecturasPrevias = new WeakMap();
const comprobantes = medios.createProofProcessor({
  api,
  almacen: estado,
  dir: estado.COMPROBANTES_DIR,
  enviarAlDueno: (contenido, opciones) => avisarAlDueno(contenido, opciones),
  // Monto, banco y concepto leídos con IA para el aviso (no valida nada).
  leerComprobante: (media) => (lecturasPrevias.has(media) ? Promise.resolve(lecturasPrevias.get(media)) : leerComprobante(media)),
  log: console,
});

// ── Fotos y PDF que el modelo SÍ ve (16 nov 2026) ─────────────
// Una foto o un PDF con texto que no es pago (una captura de un tour, una
// pregunta sobre una imagen, una constancia) llega al modelo como imagen en
// el turno que la trae. Aquí esperan a que la ráfaga se conteste.
const visualesPendientes = new Map(); // chatId -> [{mimetype, data, at}]
function guardarVisual(chatId, media) {
  if (!media || !media.data || !media.mimetype) return false;
  const ahora = Date.now();
  const lista = (visualesPendientes.get(chatId) || []).filter((v) => ahora - v.at < 10 * 60 * 1000).slice(-2);
  lista.push({ mimetype: media.mimetype, data: media.data, at: ahora });
  visualesPendientes.set(chatId, lista);
  return true;
}
function tomarVisuales(chatId) {
  const ahora = Date.now();
  // Solo las de los últimos 10 min: una foto que llegó en pausa o en una
  // ráfaga descartada no se cuela a un turno de días después.
  const lista = (visualesPendientes.get(chatId) || []).filter((v) => ahora - v.at < 10 * 60 * 1000);
  visualesPendientes.delete(chatId);
  return lista;
}

/**
 * La ficha del viaje (sessions.js) se entera del comprobante o del pago
 * validado: con eso el bot ya no recotiza un viaje pagado (lo pasa al equipo
 * como «cambio después de pagar»). Nunca frena el pago: si falla, solo se anota.
 */
function anotarEnFicha(funcion, ...args) {
  const fn = sessions[funcion];
  if (typeof fn !== "function") return;
  try {
    fn(...args);
  } catch (e) {
    console.warn(`⚠️ Ficha del viaje (${funcion}):`, primeraLinea(e));
  }
}

// Comprobantes que ya llegaron pero aún no entran a una ráfaga: se están
// descargando, buscando su cotización y avisando al dueño (unos segundos).
const comprobantesEnCamino = new Map(); // chatId -> cuántos
function comprobanteEnCamino(chatId, delta) {
  const n = (comprobantesEnCamino.get(chatId) || 0) + delta;
  if (n > 0) comprobantesEnCamino.set(chatId, n);
  else comprobantesEnCamino.delete(chatId);
}

/**
 * ¿Mandó un comprobante que la respuesta en curso NO conoce? (en camino, o
 * esperando en la siguiente ráfaga). La respuesta del modelo se escribió sin
 * saberlo: no puede salir pidiendo el comprobante o la transferencia.
 */
function comprobanteSinContestar(chatId) {
  if ((comprobantesEnCamino.get(chatId) || 0) > 0) return true;
  return rafagas.elementosEnEspera(chatId).some((e) => e && e.tipo === "comprobante");
}

// El último acuse que salió a cada chat (ver medios.esCharlaTrasAcuse).
const ultimoAcuse = new Map(); // chatId -> { at, texto }

// Avisos al cliente que no pasan por el modelo: 1 cada 10 min por chat.
const ultimoAvisoMedio = new Map();
function avisoLimitado(clave) {
  const t = Date.now();
  const previo = ultimoAvisoMedio.get(clave);
  if (previo && t - previo < LIMITE_AVISO_MEDIO_MS) return true;
  ultimoAvisoMedio.set(clave, t);
  return false;
}

async function atenderAudio(chatId, pausa) {
  if (pausa) {
    anotarHistorial(chatId, "user", "[El cliente mandó una nota de voz; el equipo la escucha en el teléfono]");
    return;
  }
  // Al equipo, una vez cada 10 min por chat (documento: las notas de voz las
  // atiende una persona). 🔴 Antes no se enteraba nadie.
  if (!avisoLimitado(`${chatId}|audio-dueno`)) {
    avisarAlDueno(`🎤 *Nota de voz* · ${etiquetaChat(chatId)}\nEscúchala en el teléfono del negocio; el bot le pidió que la escriba.`).catch(() => {});
  }
  if (avisoLimitado(`${chatId}|audio`)) {
    // 🔴 La segunda nota en 10 min se perdía entera: ahora queda en el historial.
    anotarHistorial(chatId, "user", "[nota de voz]");
    return;
  }
  const aviso = medios.textoAudio(medios.idiomaDeSesion(sesionExistente(chatId)));
  try {
    await enviar(chatId, aviso);
    anotarHistorial(chatId, "user", "[nota de voz]");
    anotarHistorial(chatId, "assistant", aviso);
    marcarAtendido(chatId);
  } catch (e) {
    console.error(`❌ aviso de audio a ${chatId}:`, primeraLinea(e));
  }
}

async function atenderNoSoportado(chatId, pausa) {
  if (pausa) {
    anotarHistorial(chatId, "user", "[El cliente mandó un archivo que el bot no puede leer]");
    return;
  }
  if (avisoLimitado(`${chatId}|archivo`)) return;
  const aviso = medios.textoArchivoNoSoportado(medios.idiomaDeSesion(sesionExistente(chatId)));
  try {
    await enviar(chatId, aviso);
    anotarHistorial(chatId, "user", "[archivo que el bot no puede leer]");
    anotarHistorial(chatId, "assistant", aviso);
    marcarAtendido(chatId);
  } catch (e) {
    console.error(`❌ aviso de archivo a ${chatId}:`, primeraLinea(e));
  }
}

/** El archivo del mensaje (MessageMedia) o null si WhatsApp ya no lo tiene. Nunca lanza. */
async function bajarArchivo(msg, chatId) {
  try {
    return (await msg.downloadMedia()) || null;
  } catch (e) {
    console.warn(`⚠️ No pude descargar el archivo de ${chatId}:`, primeraLinea(e));
    return null;
  }
}

/**
 * Foto, PDF u otro archivo. El comprobante avisa al dueño YA (sin esperar la
 * ráfaga) aunque el chat esté en pausa; el acuse al cliente sí va en la ráfaga.
 * `llegoAt` = cuándo llegó el mensaje: el comprobante entra a la ráfaga hasta
 * que se buscó su cotización, y con esto queda en SU lugar (buffer.js).
 * @returns {{listo:true} | {listo:false, texto:string}} texto = pie de foto que se contesta como mensaje
 */
async function atenderArchivo(msg, chatId, contacto, pausa, llegoAt = Date.now()) {
  const rawCaption = String(msg.body || "").trim();
  const caption = medios.limpiarPie(rawCaption);
  const ses = sesionExistente(chatId);
  // Se clasifica con el tipo que declara WhatsApp y solo se baja lo que sí es
  // comprobante: bajar un video de 15 MB para contestar «solo leo texto,
  // fotos o PDF» era memoria tirada.
  let media = null;
  let mimetype = String((msg._data && msg._data.mimetype) || "");
  if (!mimetype) {
    media = await bajarArchivo(msg, chatId);
    mimetype = (media && media.mimetype) || (msg.type === "image" ? "image/jpeg" : "");
  }
  // «Debe algo» solo si hay folio y no se sabe que ya lo liquidó: el folio se
  // queda en la sesión después del tour, y las fotos del paseo se tomaban
  // por comprobantes («Recibimos tu comprobante… esperado $0»).
  const debeAlgo = Boolean(ses && ses.lastFolio) && !(ses && ses.saldoPendiente === 0);
  const kind = medios.classifyIncomingMedia({
    mimetype, caption: rawCaption, hasPendingQuote: debeAlgo, messageType: msg.type,
  });

  if (kind === "proof") {
    // Ya cuenta como «comprobante sin contestar» desde que llegó el mensaje
    // (el handler sube el contador antes de cualquier espera).
    if (!media) media = await bajarArchivo(msg, chatId);
    if (media && media.mimetype) mimetype = media.mimetype;
    const locale = (ses && ses.locale) || medios.idiomaProbable(caption) || medios.idiomaDeSesion(ses);
    // ¿Cierra la ficha a cambios (ya no recotiza ni da datos de pago)? Solo
    // con señales de PAGO: un PDF, un pie que habla del pago, el pago en lo
    // que escribió (también lo que espera en la ráfaga: «ahorita hago el
    // pago») o los datos bancarios que el bot ya le mandó. 🔴 Cualquier foto
    // sin texto con una cotización abierta (la cascada, la captura de un tour)
    // cerraba el chat. El acuse y el aviso al dueño salen igual, y si de todos
    // modos no era un pago, el dueño lo deshace con /noespago.
    const conSenalesDePago = medios.pareceComprobanteDePago({
      mimetype,
      caption: rawCaption,
      history: ses && ses.history,
      textos: rafagas.elementosEnEspera(chatId).filter((e) => e && e.tipo === "texto").map((e) => e.texto),
    });
    // 18 nov 2026 (Manolo: «¿el bot es capaz de leer imágenes?»): una FOTO
    // sin señales de pago se lee ANTES del acuse. Si la IA dice que no es un
    // comprobante (la cascada, la captura de un tour, un lugar), no sale
    // «recibimos tu comprobante» ni el aviso al dueño: el modelo la ve y
    // contesta con ese contexto. Si no se pudo leer, sigue como comprobante.
    if (!conSenalesDePago && media && media.data && /^image\//.test(mimetype)) {
      const lectura = await medios.conTope(leerComprobante(media), 15000);
      if (lectura) lecturasPrevias.set(media, lectura);
      if (lectura && lectura.esComprobante === false && guardarVisual(chatId, media)) {
        console.log(`🖼️ Foto de ${etiquetaChat(chatId)}: no es un comprobante → la ve el modelo`);
        return { listo: false, texto: [caption, medios.notaVisual("foto", medios.idiomaDeSesion(ses))].filter(Boolean).join("\n") };
      }
    }
    let r = { ackText: null, folio: null, duplicate: false };
    try {
      r = await comprobantes.process({
        chatId,
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        // Solo si cierra la ficha: al dueño le llega cómo deshacerlo.
        numero: conSenalesDePago ? numeroParaComando(chatId) : null,
        sessionFolio: ses && ses.lastFolio,
        media,
        mimetype,
        caption,
        paused: Boolean(pausa),
        locale,
      });
    } catch (e) {
      console.error("❌ Error procesando comprobante:", primeraLinea(e));
      r = { ackText: pausa ? null : medios.textoAcuseSinCotizacion(locale), folio: null, duplicate: false };
    }
    console.log(`🧾 Comprobante (${medios.mediaKind(mimetype) || "archivo"}) de ${etiquetaChat(chatId)}${r.folio ? ` · folio ${r.folio}` : " · sin cotización"}${media ? "" : " · ⚠️ sin descargar"}${r.folio && !conSenalesDePago ? " · sin señales de pago: la ficha sigue abierta" : ""}`);
    // La ficha lo sabe aunque el chat esté en pausa: un cambio pedido después
    // ya no se recotiza, se pasa al equipo.
    const marcado = Boolean(r.folio && conSenalesDePago);
    if (marcado) anotarEnFicha("marcarComprobanteEnFicha", chatId, r.folio);

    if (pausa) {
      // Un humano tiene el chat: el dueño ya tiene el aviso; aquí solo se anota.
      anotarHistorial(chatId, "user", medios.notaHistorialComprobante(r.folio, { enPausa: true }));
      if (caption) anotarHistorial(chatId, "user", caption);
      return { listo: true };
    }
    marcarLeido(msg);
    // `marcado`: si no cerró la ficha, la ráfaga lo vuelve a ver con TODO lo
    // que escribió («… ya pagué» puede llegar después de la foto).
    rafagas.recibirElemento(chatId, { tipo: "comprobante", folio: r.folio, ackText: r.ackText, duplicado: Boolean(r.duplicate), marcado, llegoAt });
    if (caption) rafagas.recibirElemento(chatId, { tipo: "texto", texto: caption, llegoAt });
    return { listo: true };
  }

  if (kind === "unsupported") {
    // Video sin texto, documento de Word, etc.
    await atenderNoSoportado(chatId, pausa);
    return { listo: true };
  }

  // 'text': el pie de foto se contesta como un mensaje normal (una foto con
  // una pregunta, una constancia fiscal…), y ahora el modelo VE la foto o el
  // PDF (agent.bloqueVisual decide si el formato se puede).
  let nota = "";
  if (/^image\//.test(mimetype) || /pdf/.test(mimetype)) {
    if (!media) media = await bajarArchivo(msg, chatId);
    if (media && guardarVisual(chatId, media)) {
      nota = medios.notaVisual(/pdf/.test(mimetype) ? "pdf" : "foto", medios.idiomaDeSesion(ses));
    }
  }
  return { listo: false, texto: [caption || rawCaption, nota].filter(Boolean).join("\n") };
}

// ── Mensajes ENTRANTES (clientes y el dueño) ──────────────────
client.on("message", async (msg) => {
  // Cuándo llegó, ANTES de cualquier espera (el contacto, la descarga): con
  // esto la ráfaga queda en el orden en que el cliente mandó las cosas.
  const llegoAt = Date.now();
  let chatId = "";
  let posibleComprobante = false;
  try {
    if (msg.fromMe || msg.isStatus) return;
    chatId = msg.from || "";
    // Grupos, difusiones y canales: no. (msg.author solo viene en grupos.)
    if (!chatId || chatId === "status@broadcast" || /@(g\.us|broadcast|newsletter)$/.test(chatId) || msg.author) return;
    if (TIPOS_IGNORADOS.has(msg.type)) return;
    // «Solo conectar»: conectado a WhatsApp pero sin contestar ni guardar nada.
    // Solo el dueño puede preguntar /status (o /help) para ver que está vivo.
    if (SOLO_CONECTAR) {
      const dueno = await datosDelContacto(msg);
      const comando = esNumeroDelDueno(chatId, dueno.telefono) && msg.type === "chat"
        ? extraerComando(String(msg.body || "").trim())
        : null;
      if (comando && guardados.comandoPermitidoSoloConectar(comando)) {
        if (chatId.endsWith("@lid")) ownerLid = chatId;
        await handleOwnerCommand({ canal: "dueno", chatActual: null, confirmadoPor: "manolo", responder: (t) => enviar(chatId, t) }, comando);
      } else {
        console.log(`   💤 modo «solo conectar»: llegó un mensaje de ${etiquetaChat(chatId)} y no lo contesto.`);
      }
      return;
    }
    // Antes de cualquier espera: así una respuesta automática de WhatsApp
    // Business a ESTE mensaje se reconoce en message_create.
    anotarEntrante(chatId);
    // Cuanto antes: un recordatorio que se revise mientras se busca el
    // contacto (hasta 8 s en @lid) ya ve que el cliente escribió.
    const sesPrevia = sesionExistente(chatId);
    if (sesPrevia) sesPrevia.clienteAt = Date.now();
    // Un archivo puede ser el comprobante: cuenta como «en camino» DESDE YA,
    // antes de cualquier espera. 🔴 Subía hasta atenderArchivo, después de
    // pedir el contacto (en un chat @lid, hasta 8 s) y a veces de bajar el
    // archivo: una respuesta del modelo que terminaba en ese hueco salía sin
    // filtrar («cuando hagas la transferencia, mándanos el comprobante») y el
    // acuse llegaba después. Se baja en el `finally`; para entonces el
    // comprobante ya espera en la ráfaga, que también cuenta.
    posibleComprobante = Boolean(msg.hasMedia) && !TIPOS_SIN_COMPROBANTE.has(msg.type);
    if (posibleComprobante) comprobanteEnCamino(chatId, +1);
    const body = String(msg.body || "").trim();
    const contacto = await datosDelContacto(msg);

    // 1) El dueño: sus comandos van ANTES de cualquier filtro. También a media
    // línea o en el pie de una foto: copia el aviso entero y lo pega.
    if (esNumeroDelDueno(chatId, contacto.telefono)) {
      if (chatId.endsWith("@lid")) ownerLid = chatId;
      const comando = msg.type === "location" ? null : extraerComando(body);
      if (comando) {
        await handleOwnerCommand({
          canal: "dueno",
          chatActual: null,
          confirmadoPor: "manolo",
          responder: (t) => enviar(chatId, t),
        }, comando);
        return;
      }
      // …y lo demás que manda (un «ok» a un aviso) no lo contesta el bot,
      // salvo que su número esté en ALWAYS_RESPOND_NUMBERS para probar.
      if (!esSiempreResponder(chatId, contacto.telefono)) {
        console.log("   💬 mensaje del dueño sin comando: no lo atiende el bot (para probar como cliente, agrega tu número a ALWAYS_RESPOND_NUMBERS).");
        return;
      }
    }

    // Un comando que NO viene del dueño no se ejecuta ni llega al modelo: un
    // cliente que escribe «/confirma COT-… 930» no debe sacarle al bot un
    // «listo, confirmada».
    if (msg.type === "chat" && COMANDO_RE.test(body)) {
      console.log(`   🚫 ${chatId} mandó un comando y no es el dueño${chatId.endsWith("@lid") && !contacto.telefono ? " (chat @lid sin teléfono resuelto)" : ""}: lo ignoro.`);
      return;
    }

    // 2) Equipo, guías, proveedores, hotel: nunca.
    if (esNuncaResponder(chatId, contacto.telefono)) {
      console.log(`   🔕 ${chatId} está en NEVER_RESPOND_NUMBERS: no lo atiendo.`);
      return;
    }

    // 3) Solo chats NO guardados (guardados.js). Un contacto guardado lo
    // atiende el equipo, aunque el bot ya estuviera platicando con él: en ese
    // caso al dueño le llega UN aviso para que lo siga.
    const sesBot = sesionExistente(chatId);
    const decision = guardados.decidirEntrante({
      modo: RESPOND_MODE,
      guardado: contacto.guardado,
      siempre: esSiempreResponder(chatId, contacto.telefono),
      platicabaConElBot: Boolean(sesBot && sesBot.botAt),
      yaAvisado: Boolean(sesBot && sesBot.avisoGuardadoAt),
    });
    if (decision !== "contestar") {
      console.log(`   ⏭️  ${chatId} es contacto guardado → lo atiende el equipo (el bot no contesta).`);
      if (decision === "ignorar_y_avisar") await avisarGuardadoAMediaPlatica(chatId);
      return;
    }
    if (contacto.guardado === null && RESPOND_MODE === "strangers") {
      console.log(`   ❔ ${chatId}: no pude saber si está guardado → lo atiendo como cliente nuevo.`);
    }

    // El cliente escribió: el seguimiento (seguimiento.js) se reinicia.
    marcarCliente(chatId);

    // 4) Archivos, audios y ubicaciones: ANTES del corte por texto vacío.
    const pausa = pausaActiva(chatId);
    let texto = body;
    switch (msg.type) {
      case "location":
        // El body de una ubicación es una miniatura en base64, no texto.
        texto = medios.textoUbicacion(msg.location || {});
        break;
      case "sticker":
        return;
      case "ptt":
      case "audio":
        await atenderAudio(chatId, pausa);
        return;
      case "vcard":
      case "multi_vcard":
        await atenderNoSoportado(chatId, pausa);
        return;
      default:
        if (msg.hasMedia) {
          const r = await atenderArchivo(msg, chatId, contacto, pausa, llegoAt);
          if (r.listo) return;
          texto = r.texto;
        }
    }
    if (!texto) return;

    console.log(`📩 Entrante de ${chatId}: ${texto.substring(0, 60)}`);

    // Si un humano tomó el chat: NO respondo, pero SÍ registro lo que dice el
    // cliente para no perder el hilo al reanudar.
    if (pausa) {
      anotarHistorial(chatId, "user", texto);
      console.log("   ⏸️  chat en pausa — lo guardo en el historial, sin responder.");
      await seguimientoAlDueno(chatId, texto, pausa);
      return;
    }

    marcarLeido(msg);
    rafagas.recibirElemento(chatId, { tipo: "texto", texto, llegoAt });
  } catch (e) {
    console.error("❌ message handler:", primeraLinea(e));
  } finally {
    if (posibleComprobante) comprobanteEnCamino(chatId, -1);
  }
});

// ── Espera antes de responder ─────────────────────────────────
// La mecánica (ventana deslizante, tope y candado) vive en buffer.js.
// Aquí solo va QUÉ hacer cuando la ráfaga ya está completa.
const rafagas = crearGestorDeRafagas({
  debounceMs: DEBOUNCE_MS,
  maxMs: DEBOUNCE_MAX_MS,
  esperaComprobantesMs: ESPERA_COMPROBANTE_MS,
  responder: atenderRafaga,
  onError: (e) => console.error("❌ ráfaga:", e && e.message),
});

async function atenderRafaga(chatId, texto, info = {}) {
  const elementos = Array.isArray(info.elementos) ? info.elementos : (texto ? [{ tipo: "texto", texto }] : []);
  try {
    const pausa = pausaActiva(chatId);
    volcarPendientes(chatId);
    if (pausa) {
      // Un humano tomó el chat mientras se esperaba: no se contesta, pero se
      // guarda lo que llegó.
      for (const el of elementos) {
        if (el && el.tipo === "comprobante") pushHistory(chatId, "user", medios.notaHistorialComprobante(el.folio, { enPausa: true }));
        else if (el && el.tipo === "texto" && String(el.texto || "").trim()) pushHistory(chatId, "user", String(el.texto).trim());
      }
      return;
    }

    // Lo guardaron en los contactos mientras se juntaba la ráfaga (hasta 90 s):
    // ya es del equipo. Se pregunta otra vez en el momento.
    const guardadoAhora = await contactoGuardado(chatId, { fresco: true });
    const decisionRafaga = guardados.decidirEntrante({
      modo: RESPOND_MODE,
      guardado: guardadoAhora,
      siempre: esSiempreResponder(chatId, telefonoConocido(chatId)),
      platicabaConElBot: Boolean(sesionExistente(chatId) && sesionExistente(chatId).botAt),
      yaAvisado: Boolean(sesionExistente(chatId) && sesionExistente(chatId).avisoGuardadoAt),
    });
    if (decisionRafaga !== "contestar") {
      console.log(`   ⏭️  [${etiquetaChat(chatId)}] lo guardaron en los contactos mientras escribía: lo atiende el equipo (no contesto la ráfaga).`);
      if (decisionRafaga === "ignorar_y_avisar") await avisarGuardadoAMediaPlatica(chatId);
      return;
    }

    const s = getSession(chatId);
    completarContacto(chatId, s);
    let plan = medios.prepararRafaga(elementos);
    console.log(`📨 [${etiquetaChat(chatId)}] ${info.mensajes || elementos.length} mensaje(s) juntos tras ${Math.round((info.esperaMs || 0) / 1000)}s: ${plan.textoUnido.substring(0, 80)}${plan.huboComprobante ? ` · comprobante ${plan.folios.join(", ") || "sin cotización"}` : ""}`);

    // Un comprobante que no cerró la ficha al llegar (foto sin pie, sin pago
    // en la plática): si en la MISMA ráfaga el cliente sí habló del pago
    // («listo, ya pagué» después de la foto), ahora sí la cierra.
    if (plan.huboComprobante && medios.hablaDePago(plan.textos)) {
      const avisados = new Set();
      for (const el of elementos) {
        if (!el || el.tipo !== "comprobante" || !el.folio || el.marcado) continue;
        anotarEnFicha("marcarComprobanteEnFicha", chatId, el.folio);
        el.marcado = true;
        if (!avisados.has(el.folio)) {
          avisados.add(el.folio);
          avisarAlDueno(medios.textoNoEsPago(numeroParaComando(chatId)));
        }
      }
    }

    // 1) Acuses de los comprobantes: plantilla, sin modelo, antes que nada.
    // 🔴 NO entran al historial antes de lo que escribió el cliente: su turno
    // es `textoParaModelo`, con la nota del comprobante EN SU LUGAR. Antes el
    // modelo leía «ahorita hago el pago» después del acuse y contestaba
    // «cuando hagas la transferencia, mándanos el comprobante».
    const acusesEnviados = [];
    for (const acuse of plan.acuses) {
      try {
        await enviar(chatId, acuse);
        acusesEnviados.push(acuse);
      } catch (e) {
        console.error(`❌ acuse de comprobante a ${chatId}:`, primeraLinea(e));
      }
    }
    const textoAcuses = acusesEnviados.join("\n\n");
    if (acusesEnviados.length) {
      marcarAtendido(chatId);
      if (ultimoAcuse.size > 1000) {
        for (const [k, v] of ultimoAcuse) if (Date.now() - v.at > medios.CHARLA_TRAS_ACUSE_MS) ultimoAcuse.delete(k);
      }
      ultimoAcuse.set(chatId, { at: Date.now(), texto: textoAcuses });
    } else if (plan.acuses.length) {
      // No salió ningún acuse: la nota no puede decirle al modelo que ya lo recibió.
      plan = medios.prepararRafaga(elementos.map((e) => (e && e.tipo === "comprobante" ? { ...e, ackText: null } : e)));
    }

    // 2) Solo el comprobante, o el comprobante + «ya pagué / ahorita hago el
    // pago / gracias»: con el acuse basta. Al historial: lo suyo (en orden) y
    // luego el acuse, que fue lo que recibió.
    if (plan.huboComprobante && !plan.llamarModelo) {
      pushHistory(chatId, "user", plan.textoParaModelo);
      if (textoAcuses) pushHistory(chatId, "assistant", textoAcuses);
      return;
    }

    if (!plan.textoUnido) return;

    // 3) «listo / gracias» que llega en su propia ráfaga justo tras el acuse
    // (la de solo comprobantes ya no espera 15 s): con el acuse basta.
    if (medios.esCharlaTrasAcuse(plan, ultimoAcuse.get(chatId), s.history)) {
      pushHistory(chatId, "user", plan.textoParaModelo);
      console.log(`   🧾 [${etiquetaChat(chatId)}] solo «${medios.recortar(plan.textoUnido, 40)}» tras el acuse: no se llama al modelo.`);
      return;
    }

    // 4) Pide a una persona o una llamada (regla rápida, sin modelo).
    if (typeof needsHuman === "function" && needsHuman(plan.textoUnido)) {
      await pasarPorRegla(chatId, plan.textoUnido, plan.textoParaModelo);
      return;
    }

    // 5) El modelo.
    await responderConModelo(chatId, plan.textoParaModelo, {
      textoCliente: plan.textoUnido,
      huboComprobante: plan.huboComprobante,
      textoAcuses,
    });
  } finally {
    volcarPendientes(chatId);
  }
}

/**
 * @param {string} textoModelo  lo que lee el modelo (con la nota del comprobante en su lugar)
 * @param {{textoCliente?:string, huboComprobante?:boolean, textoAcuses?:string}} opciones
 *   textoCliente    = solo lo que escribió (para los avisos al dueño)
 *   huboComprobante = la ráfaga traía comprobante (su acuse ya salió)
 *   textoAcuses     = los acuses que ya recibió en esta ráfaga
 */
async function responderConModelo(chatId, textoModelo, { textoCliente = textoModelo, huboComprobante = false, textoAcuses = "" } = {}) {
  let escribiendo = null;
  let enviado = null;
  try {
    const chat = await client.getChatById(chatId).catch(() => null);
    if (chat) {
      // El "escribiendo…" de WhatsApp se apaga solo a los ~25 s. Lo refresco
      // mientras el modelo piensa para que el cliente no vea el chat mudo.
      chat.sendStateTyping().catch(() => {});
      escribiendo = setInterval(() => chat.sendStateTyping().catch(() => {}), 10000);
    }
    const respuesta = await processMessage(chatId, textoModelo, { visuales: tomarVisuales(chatId) });
    enviado = respuesta;
    // 🔴 El comprobante ya llegó (en esta ráfaga, o MIENTRAS el modelo
    // pensaba): la respuesta no sale pidiendo el comprobante, la
    // transferencia ni con los datos de pago. Filtro fijo (medios.js).
    const durante = comprobanteSinContestar(chatId);
    if (huboComprobante || durante) {
      enviado = medios.filtrarRespuestaTrasComprobante(respuesta);
      if (enviado !== respuesta) {
        // Lo que quedó en el historial = lo que salió. Si no sale nada y en
        // esta ráfaga ya salió el acuse, eso fue su respuesta.
        const corregido = medios.corregirRespuestaEnHistorial(getSession(chatId).history, respuesta, enviado || (huboComprobante ? textoAcuses : ""));
        console.log(`   🧾 [${etiquetaChat(chatId)}] ${durante ? "llegó un comprobante mientras el modelo contestaba" : "la ráfaga traía el comprobante"}: quité de la respuesta lo que pedía el pago${enviado ? "" : " (no quedó nada que mandar)"}${corregido ? "" : " · ⚠️ no encontré esa respuesta en el historial para corregirla"}.`);
      }
    }
    // Fotos de los tours propuestos y el PDF de la cotización: antes del
    // texto, para que la pregunta de cierre sea lo último que lee.
    const extras = adjuntos.tomar(chatId);
    if (extras.length) await documentos.enviarAdjuntos(chatId, extras);
    if (enviado) {
      await enviar(chatId, enviado);
      marcarAtendido(chatId);
    }
    etiquetas.ponerEtapa(chatId, etapaDe(getSession(chatId))).catch(() => {});
  } catch (e) {
    console.error(`❌ procesando ${chatId}:`, primeraLinea(e));
    await fallaAlResponder(chatId, e, textoCliente);
  } finally {
    if (escribiendo) clearInterval(escribiendo);
    adjuntos.tomar(chatId); // lo que quedó de un turno que falló no se manda después
  }
  // 6) Si el modelo decidió pasar el chat al equipo (escalar_a_humano), se
  // aplica DESPUÉS de contestar. También si la respuesta falló: el aviso al
  // equipo vale igual.
  try {
    await aplicarEscalacion(chatId, { textoCliente, respuestaBot: enviado || null });
  } catch (e) {
    console.error(`❌ escalación de ${chatId}:`, primeraLinea(e));
  }
}

/**
 * La regla rápida de agent.js (needsHuman): pasa el chat sin gastar una llamada al modelo.
 * `textoHistorial` = su turno tal como queda guardado (con la nota del
 * comprobante en su lugar, si lo mandó en la misma ráfaga).
 */
async function pasarPorRegla(chatId, texto, textoHistorial = texto) {
  const s = getSession(chatId);
  const locale = s.locale || medios.idiomaProbable(texto) || medios.idiomaDeSesion(s);
  const espera = horario.mensajeEspera({ urgencia: "hoy", locale });
  const respuesta = locale === "en"
    ? `Of course! 🙌 I've passed your message on. ${espera} If you'd prefer a call, just tell me what time works for you. 🌿`
    : `¡Claro! 🙌 Ya pasé tu mensaje. ${espera} Si prefieres que te llamemos, dime a qué hora te queda bien. 🌿`;
  pushHistory(chatId, "user", textoHistorial);
  try {
    await enviar(chatId, respuesta);
    pushHistory(chatId, "assistant", respuesta);
    marcarAtendido(chatId);
  } catch (e) {
    console.error(`❌ respuesta de «pide humano» a ${chatId}:`, primeraLinea(e));
  }
  s.escalacion = {
    motivo: "pide_humano",
    modo: "pasar",
    urgencia: "hoy",
    resumen: "El cliente pidió hablar con una persona (o que le llamen).",
    folio: s.lastFolio || null,
    at: Date.now(),
  };
  await aplicarEscalacion(chatId, { textoCliente: texto, respuestaBot: respuesta });
}

// ── Escalación: avisar al dueño y, si toca, pausar ────────────
const ETIQUETAS_MOTIVO = {
  pide_humano: "Pide hablar con una persona",
  llamada: "Pide que le llamen",
  cambio_post_pago: "Cambio después de pagar",
  cancelacion: "Cancelación o reembolso",
  queja_incidente: "Queja o incidente",
  cliente_molesto: "Cliente molesto",
  grupo: "Grupo grande o precio de grupo",
  descuento: "Pide descuento",
  fuera_catalogo: "Pide algo fuera del catálogo",
  traslado_sin_tarifa: "Recogida o traslado sin tarifa",
  para_hoy: "Quiere el tour para HOY",
  para_manana: "Tour para MAÑANA: confirma que hay salida",
  hotel: "Hotel: disponibilidad o petición especial",
  pregunta_sin_respuesta: "Pregunta que el bot no sabe",
  salud: "Salud, edad o condición física",
  factura: "Pide factura",
  pago_fallido: "El pago con tarjeta falló",
  falla_bot: "El bot no pudo responder",
  recogida: "Hotel para la recogida",
  clima: "Clima o paraje cerrado",
  nota_de_voz: "Mandó una nota de voz",
  humano: "Alguien del equipo escribió en el chat",
  comando: "Pausado con /pausa",
  otro: "Otro",
};
function etiquetaMotivo(motivo) {
  return ETIQUETAS_MOTIVO[motivo] || String(motivo || "otro").replace(/_/g, " ");
}

/**
 * El aviso al dueño, con el formato del plan:
 * [URGENTE|HOY|NORMAL] motivo · nombre · wa.me/tel · folio, tour, fecha,
 * personas · qué pidió · qué le dijo el bot · estado (/reanuda …).
 */
function textoAvisoEscalacion({ motivo, urgencia, resumen, nombre, telefono, cotizacion, folio, textoCliente, respuestaBot, estadoTxt } = {}) {
  const etiqueta = urgencia === "urgente" ? "🚨 *[URGENTE]*" : urgencia === "hoy" ? "🔔 *[HOY]*" : "📝 *[NORMAL]*";
  const L = [`${etiqueta} ${etiquetaMotivo(motivo)}`];
  L.push(`👤 ${nombre || (cotizacion && cotizacion.customerName) || "Sin nombre"}`);
  L.push(medios.lineaTelefono(telefono));
  const c = cotizacion || {};
  const personas = c.adults ? `${c.adults} adulto${c.adults === 1 ? "" : "s"}${c.children ? ` + ${c.children} niño${c.children === 1 ? "" : "s"}` : ""}` : "";
  const datos = cotizacion
    ? [c.folio, c.tourName, c.tourDate ? medios.fechaCorta(c.tourDate) : "", personas].filter(Boolean)
    : (folio ? [folio] : []);
  if (datos.length) L.push(`📋 ${datos.join(" · ")}`);
  if (resumen) L.push(`💬 *Qué pidió:* ${medios.recortar(resumen, 300)}`);
  if (textoCliente) L.push(`🗣️ *Su último mensaje:* «${medios.recortar(textoCliente, 200)}»`);
  if (respuestaBot) L.push(`🤖 *Qué le dijo el bot:* «${medios.recortar(respuestaBot, 200)}»`);
  if (estadoTxt) L.push("", estadoTxt);
  return L.join("\n");
}

const ultimoAvisoEscalacion = new Map(); // `${chatId}|${motivo}` -> ms

/**
 * Aplica `session.escalacion` (la deja escalar_a_humano o la regla rápida):
 *   · modo "pasar" → pausa PAUSA_ESCALACION_MS (o hasta /reanuda en queja,
 *     cancelación, cliente molesto y cambio después de pagar);
 *   · aviso al WhatsApp del dueño («pregunta que no sabe», máx. 1 por hora
 *     por chat; los demás «avisar», solo se frena el mismo pedido repetido);
 *   · bitácora del panel (/api/bot/escalacion).
 * Luego la limpia. Nunca lanza hacia la ráfaga: los errores se registran.
 */
async function aplicarEscalacion(chatId, { textoCliente = "", respuestaBot = "" } = {}) {
  const s = sesionExistente(chatId);
  if (!s || !s.escalacion) return;
  const esc = { ...s.escalacion };
  s.escalacion = null; // primero se limpia: si algo de abajo falla, no se repite en cada mensaje
  estado.marcarCambio();

  const modo = esc.modo === "pasar" ? "pasar" : "avisar";
  const urgencia = ["urgente", "hoy", "normal"].includes(esc.urgencia) ? esc.urgencia : "normal";
  const motivo = String(esc.motivo || "otro");
  const folio = esc.folio || s.lastFolio || null;
  const numero = numeroParaComando(chatId);

  // En «avisar» no se pausa, pero el estado dice la verdad si el chat ya
  // estaba en pausa por otra cosa.
  let pausa = estado.pausaVigente(chatId);
  if (modo === "pasar") {
    // El seguimiento no le escribe por su cuenta a un chat que se pasó al equipo.
    s.escaladoAt = Date.now();
    // La pausa la pone el bot: un comprobante que esperaba en la ráfaga recibe su acuse igual.
    if (MOTIVOS_HASTA_REANUDA.has(motivo)) {
      pausa = pausar(chatId, { indefinida: true, motivo, modo: "escalacion", acusarComprobantes: true });
    } else if (motivo === "falla_bot") {
      // El modelo no contestó ni con dos empujones (agent.js): es una falla,
      // no un chat que se pasa. 2 h como cualquier falla, no las 12 h.
      pausa = pausar(chatId, { ms: PAUSA_FALLA_MS, motivo, modo: "falla", acusarComprobantes: true });
    } else {
      pausa = pausar(chatId, { ms: PAUSA_ESCALACION_MS, motivo, modo: "escalacion", acusarComprobantes: true });
    }
  }

  // Tour, fecha y personas del folio (si el sitio contesta; si no, solo el folio).
  let cotizacion = null;
  if (folio) {
    const r = await api.consultarReserva(folio);
    if (r && r.ok && r.data) {
      cotizacion = medios.normalizarCotizacion(r.data, folio);
      if (cotizacion) Object.assign(cotizacion, { adults: r.data.adults, children: r.data.children });
    }
  }

  // El freno de 1 aviso por hora es el de «pregunta que no sabe» (así lo pide
  // la matriz). Los demás motivos se reusan para pedidos distintos («otro»:
  // falló la cotización, quiere la liga de tarjeta…): de esos solo se frena el
  // MISMO pedido repetido (mismo motivo y mismo resumen). Antes el segundo
  // pedido no le llegaba al dueño aunque el bot ya le había prometido algo al cliente.
  const clave = motivo === "pregunta_sin_respuesta"
    ? `${chatId}|${motivo}`
    : `${chatId}|${motivo}|${String(esc.resumen || "").toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, " ").trim().slice(0, 160)}`;
  if (ultimoAvisoEscalacion.size > 1000) {
    for (const [k, t] of ultimoAvisoEscalacion) if (Date.now() - t > AVISO_REPETIDO_MS) ultimoAvisoEscalacion.delete(k);
  }
  const repetido = modo === "avisar" && Date.now() - (ultimoAvisoEscalacion.get(clave) || 0) < AVISO_REPETIDO_MS;
  if (!repetido) {
    ultimoAvisoEscalacion.set(clave, Date.now());
    const aviso = textoAvisoEscalacion({
      motivo, urgencia, resumen: esc.resumen,
      nombre: s.nombre, telefono: s.telefono || telefonoConocido(chatId),
      cotizacion, folio, textoCliente, respuestaBot,
      estadoTxt: describirPausa(pausa, numero),
    });
    const ok = await avisarAlDueno(aviso);
    console.log(`🙋 Escalación (${motivo}, ${modo}, ${urgencia}) de ${etiquetaChat(chatId)} → dueño: ${ok ? "avisado" : "NO llegó"}`);
  } else {
    console.log(`🙋 Escalación repetida (${motivo}) de ${etiquetaChat(chatId)}: sin aviso nuevo al dueño (1 por hora).`);
  }

  // Bitácora del panel: todas, también las repetidas (así se juntan las
  // preguntas que el bot no supo para alimentarlo). api-client nunca lanza.
  api.escalacion({
    waChatId: chatId,
    telefono: s.telefono || telefonoConocido(chatId) || undefined,
    nombre: s.nombre || undefined,
    motivo, modo, urgencia,
    resumen: esc.resumen || medios.recortar(textoCliente, 300),
    folio: folio || undefined,
  }).then((r) => {
    if (!r.ok) console.warn(`⚠️ /api/bot/escalacion (${motivo}):`, (r.data && r.data.error) || r.status);
  });
}

// ── Cuando el bot no puede responder ─────────────────────────
// Traduce el error crudo a algo que el dueño entienda (del bot del hotel).
function resumirError(err) {
  const raw = primeraLinea(err);
  if (/organization has been disabled|account.*disabled/i.test(raw)) return "La cuenta de Anthropic (el cerebro del bot) está DESHABILITADA: revisar billing o la API key.";
  if (/credit balance is too low|insufficient|quota|billing/i.test(raw)) return "Falta saldo en la cuenta de Anthropic: revisar billing.";
  if (/api.?key.*invalid|invalid.*api.?key|invalid x-api-key|authentication|unauthorized|401/i.test(raw)) return "La API key de Anthropic es inválida o fue revocada: revisar ANTHROPIC_API_KEY.";
  if (/rate.?limit|429/i.test(raw)) return "Límite de velocidad de la API (429): suele ser temporal.";
  if (/overloaded|529|5\d\d/i.test(raw)) return "La API de Anthropic tuvo un error temporal del servidor.";
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed|network|ENOTFOUND/i.test(raw)) return "Problema de red: suele ser temporal.";
  return raw.slice(0, 160) || "Error desconocido.";
}

// En una caída entran muchos mensajes: el dueño recibe UN aviso cada 10 min,
// pero ningún chat se pierde — los que fallan en ese rato van en el siguiente.
let ultimaFallaAt = 0;
let timerFallas = null;
const fallasSinAvisar = new Map(); // chatId -> { etiqueta, motivo }

async function enviarAvisoDeFallas() {
  if (timerFallas) { clearTimeout(timerFallas); timerFallas = null; }
  if (!fallasSinAvisar.size) return;
  ultimaFallaAt = Date.now();
  const lista = [...fallasSinAvisar.values()];
  fallasSinAvisar.clear();
  const L = [
    "⚠️ *El bot no pudo responder*",
    `🔎 Motivo: ${lista[lista.length - 1].motivo}`,
    "",
    lista.length === 1 ? `👤 ${lista[0].etiqueta}` : `Chats sin respuesta:\n${lista.map((x) => `• ${x.etiqueta}`).join("\n")}`,
    "",
    `👉 Contéstales tú, por favor. Al cliente le dije que alguien del equipo le escribe, y el bot quedó en pausa ${duracionTexto(PAUSA_FALLA_MS)} en ese chat.`,
    "_(Este aviso sale máx. 1 vez cada 10 min; los chats que fallen mientras tanto van en el siguiente.)_",
  ];
  await avisarAlDueno(L.join("\n"));
}

async function avisarFalla(chatId, err) {
  fallasSinAvisar.set(chatId, { etiqueta: etiquetaChat(chatId), motivo: resumirError(err) });
  const espera = ultimaFallaAt + FALLA_COOLDOWN_MS - Date.now();
  if (espera <= 0) return enviarAvisoDeFallas();
  if (!timerFallas) {
    timerFallas = setTimeout(() => { enviarAvisoDeFallas().catch(() => {}); }, espera);
    if (timerFallas.unref) timerFallas.unref();
  }
}

/**
 * En vez de «tuve un problema técnico» (que espanta y no resuelve): «dame un
 * momento, te escribe alguien del equipo», pausa de 2 h y aviso al dueño.
 */
async function fallaAlResponder(chatId, err, textoCliente) {
  const s = sesionExistente(chatId);
  const en = medios.idiomaDeSesion(s) === "en";
  // El tiempo que se promete sale del horario del equipo, no fijo: a las 2 am
  // «te escribe alguien» dejaba al cliente esperando hasta las 8.
  const espera = horario.mensajeEspera({ urgencia: "urgente", locale: en ? "en" : "es" });
  const disculpa = en ? `Give me a moment 🙏 ${espera}` : `Dame un momento 🙏 ${espera}`;
  try {
    await enviar(chatId, disculpa);
    // Solo detrás de un turno del cliente: si el modelo tronó a media
    // herramienta, el último turno es un tool_use suelto (sanearHistorial lo
    // quita en la siguiente vuelta) y una disculpa pegada ahí estorbaría.
    const h = getSession(chatId).history;
    const ultimo = h[h.length - 1];
    if (!ultimo || ultimo.role === "user") pushHistory(chatId, "assistant", disculpa);
  } catch (e) {
    console.error(`❌ tampoco pude mandar la disculpa a ${chatId}:`, primeraLinea(e));
  }
  pausar(chatId, { ms: PAUSA_FALLA_MS, motivo: "falla_bot", modo: "falla", acusarComprobantes: true });
  await avisarFalla(chatId, err).catch((e) => console.error("❌ aviso de falla:", primeraLinea(e)));
  api.escalacion({
    waChatId: chatId,
    telefono: telefonoConocido(chatId) || undefined,
    nombre: (s && s.nombre) || undefined,
    motivo: "falla_bot",
    modo: "pasar",
    urgencia: "urgente",
    resumen: `El bot no pudo responder (${resumirError(err)}). Último mensaje: ${medios.recortar(textoCliente, 200)}`,
    folio: (s && s.lastFolio) || undefined,
  }).then((r) => {
    if (!r.ok) console.warn("⚠️ /api/bot/escalacion (falla_bot):", (r.data && r.data.error) || r.status);
  });
}

// ── Mensajes SALIENTES (teléfono del negocio / la cuenta conectada) ──
client.on("message_create", async (msg) => {
  try {
    if (!msg.fromMe) return;
    if (TIPOS_IGNORADOS.has(msg.type)) return;
    const body = String(msg.body || "").trim();
    const remoto = msg.id && msg.id.remote;
    const target = msg.to || (typeof remoto === "string" ? remoto : (remoto && remoto._serialized)) || "";
    const sinChat = !target || target === "status@broadcast" || /@(g\.us|broadcast|newsletter)$/.test(target);

    // Comandos escritos desde el teléfono del negocio. 🔴 Nunca lo que mandó el
    // propio bot (ver `esTextoDelBot`): una respuesta del modelo que empezara
    // con «/confirma …» confirmaría un pago sin que nadie viera el dinero.
    if (msg.type === "chat" && body.startsWith("/") && !esTextoDelBot(body)) {
      // En un grupo la respuesta la leería todo el grupo (el de guías, por
      // ejemplo): ahí no se ejecuta nada.
      if (sinChat) {
        console.log(`   🚫 comando escrito en ${target || "un chat sin id"}: en grupos no se ejecuta.`);
        return;
      }
      // «Solo conectar»: de los comandos, solo /status y /help.
      if (SOLO_CONECTAR && !guardados.comandoPermitidoSoloConectar(body)) {
        console.log(`   💤 modo «solo conectar»: ${body.split(/\s+/)[0]} no se ejecuta.`);
        return;
      }
      const esChatDeCliente = !esChatDelDueno(target) && !esChatPropio(target);
      await handleOwnerCommand({
        canal: "negocio",
        chatActual: esChatDeCliente ? target : null,
        confirmadoPor: "equipo",
        responder: responderAlNegocio(target, esChatDeCliente),
      }, body);
      return;
    }

    if (sinChat) return;
    // «Solo conectar»: el bot no atiende a nadie, así que no hay nada que pausar.
    if (SOLO_CONECTAR) return;
    // Eventos internos sin contenido (abrir un chat, notificaciones…).
    if (!body && !msg.hasMedia) return;
    // El chat con el dueño es de avisos y comandos, y «Tú» es donde el bot
    // contesta los comandos del teléfono del negocio: ninguno se pausa.
    if (esChatDelDueno(target) || esChatPropio(target)) return;
    // ¿Lo mandó el bot? Se revisan también los otros ids del mismo chat
    // (@c.us / @lid): WhatsApp puede nombrar el chat distinto al enviar.
    const ids = await idsEquivalentes(target);
    if (ids.some(isRecentBotOutgoing)) return;
    // Bienvenida o ausencia de WhatsApp Business: no es una persona.
    if (esAutorespuesta(ids)) {
      console.log(`   🤖 ${target}: mensaje automático de WhatsApp Business (salió a segundos del cliente): no pauso al bot.`);
      return;
    }

    // Alguien del equipo escribió a mano (texto, archivo o audio): el bot se calla.
    pausaPorHumano(ids);
    // Lo que escribió va al historial (como lado del negocio) para que el bot
    // no pierda el hilo al retomar, solo si ya platicaba con ese chat.
    // 18 nov 2026: siempre, aunque el bot no hubiera platicado aún con ese
    // chat; así, si el cliente sigue escribiendo, al retomar tiene todo.
    anotarHistorial(target, "assistant", lineaDelEquipo(msg, body));
  } catch (e) {
    console.error("❌ message_create:", primeraLinea(e));
  }
});

/**
 * A dónde contesta un comando escrito en el teléfono del negocio. 🔴 Nunca al
 * chat de un cliente: `/status` lista nombre y teléfono de OTROS clientes,
 * `/reanuda` nombra al chat afectado y `/confirma` puede pegar la
 * confirmación de otro folio. Va al chat «Tú» de la cuenta (lo ve quien tiene
 * el teléfono del negocio) o, si no se puede, al dueño. Escrito en «Tú» o en
 * el chat del dueño, ahí mismo.
 */
function responderAlNegocio(target, esChatDeCliente) {
  return async (t) => {
    if (!esChatDeCliente) return enviar(target, t);
    const propio = chatPropio();
    if (propio) {
      try {
        return await enviar(propio, t);
      } catch (e) {
        console.warn("⚠️ No pude contestar el comando en «Tú»:", primeraLinea(e));
      }
    }
    return avisarAlDueno(t);
  };
}

function lineaDelEquipo(msg, body) {
  if (msg.type === "chat") return body;
  if (msg.type === "location") return "[el equipo mandó una ubicación]";
  if (msg.type === "ptt" || msg.type === "audio") return "[el equipo mandó una nota de voz]";
  const que = msg.type === "image" ? "una foto" : msg.type === "video" ? "un video" : msg.type === "document" ? "un documento" : "un archivo";
  return `[el equipo mandó ${que}${body ? `: ${body}` : ""}]`;
}

// ── Comandos (teléfono del negocio o mensaje directo del dueño) ──
const TEXTO_AYUDA = [
  "*Comandos del bot*",
  "*/confirma <folio> <monto> [método]* — valida un pago: convierte la cotización en reserva, registra el cobro con el comprobante guardado y le escribe al cliente. Ej.: /confirma COT-ABC123 930",
  "   Métodos: transferencia (por omisión), deposito (OXXO), stripe (liga), efectivo, otro.",
  "   Si el sitio lo frena (otro pago igual hace minutos, otra reserva del mismo cliente, cotización vencida, reemplazada o sin lugar) y de verdad va, repite con «forzar» al final.",
  "*/noespago <número>* — el archivo que mandó NO era un comprobante: el bot vuelve a cotizarle y a darle los datos de pago",
  "*/pausa <número>* — calla al bot en ese chat hasta /reanuda",
  "*/reanuda <número>* — el bot vuelve a contestar (recuerda la conversación)",
  "*/olvida <número>* — borra lo que el bot recuerda de ese chat",
  "*/status* — estado del bot",
  "",
  "Funcionan mandándoselos al bot desde tu WhatsApp o desde el teléfono del negocio. Escritos en el chat de un cliente, la respuesta llega al chat «Tú» del negocio (nunca al cliente). En grupos no funcionan.",
].join("\n");

/**
 * @param {{canal:"dueno"|"negocio", chatActual:string|null, confirmadoPor:string, responder:(t:string)=>Promise<any>}} ctx
 */
async function handleOwnerCommand(ctx, body) {
  const [crudo, ...resto] = String(body || "").trim().split(/\s+/);
  const cmd = crudo.toLowerCase();
  const arg = resto.join(" ").trim();
  const responder = (t) => Promise.resolve(ctx.responder(t)).catch((e) => console.error("❌ respuesta a comando:", primeraLinea(e)));

  switch (cmd) {
    case "/status":
      return responder(textoStatus());
    case "/help":
    case "/ayuda":
      return responder(TEXTO_AYUDA);
    case "/confirma":
      return confirmarPago(ctx, arg, responder);
    case "/noespago":
      return quitarComprobante(ctx, arg, responder);
    case "/pausa": {
      const ids = resolverChats(arg, ctx.chatActual);
      if (!ids.length) return responder("Uso: /pausa <número>\nEj.: /pausa 52XXXXXXXXXX");
      for (const id of ids) pausar(id, { indefinida: true, motivo: "comando", modo: "dueno" });
      return responder(`⏸️ Bot en pausa en ${ids.map(etiquetaChat).join(", ")} hasta que escribas /reanuda ${numeroParaComando(ids[0])}.`);
    }
    case "/reanuda": {
      const ids = resolverChats(arg, ctx.chatActual, { soloConocidos: true });
      if (!ids.length) return responder(arg ? `No encontré un chat con ${arg}.` : "Uso: /reanuda <número>");
      const reanudados = ids.filter(reanudar);
      if (!reanudados.length) return responder(`ℹ️ ${ids.map(etiquetaChat).join(", ")} no estaba en pausa.`);
      return responder(`▶️ Bot reactivado en ${reanudados.map(etiquetaChat).join(", ")}. Recuerda la conversación; para que empiece de cero: /olvida ${numeroParaComando(reanudados[0])}`);
    }
    case "/olvida": {
      const ids = resolverChats(arg, ctx.chatActual, { soloConocidos: true });
      if (!ids.length) return responder(arg ? `No encontré un chat con ${arg}.` : "Uso: /olvida <número>");
      const etiquetas = ids.map(etiquetaChat);
      for (const id of ids) {
        rafagas.descartar(id);
        clearSession(id);
        pendientes.delete(id);
      }
      const enPausa = ids.filter((id) => estado.pausaVigente(id));
      return responder(`🧹 Memoria borrada en ${etiquetas.join(", ")}.${enPausa.length ? ` Sigue en pausa: /reanuda ${numeroParaComando(enPausa[0])}` : ""}`);
    }
    default:
      // En el teléfono del negocio un «/» suelto puede ser cualquier cosa;
      // al dueño, que le escribe al bot, sí se le contesta.
      if (ctx.canal === "dueno") return responder(`No conozco ${crudo}.\n\n${TEXTO_AYUDA}`);
      return undefined;
  }
}

/**
 * <número> → los chats que coinciden (por dígitos del chat o por el teléfono
 * real guardado en la sesión o la pausa: así un chat @lid se encuentra con el
 * número que ve el dueño). Sin número, el chat donde se escribió el comando.
 */
function resolverChats(arg, chatActual, { soloConocidos = false } = {}) {
  const txt = String(arg || "").trim();
  if (!txt) return chatActual ? [chatActual] : [];
  if (txt.includes("@")) return [txt];
  const d = digitsOnly(txt);
  if (!d) return [];
  const coincide = (chatId, tel) => mismoNumero(String(chatId).split("@")[0], d) || (tel && mismoNumero(tel, d));
  const encontrados = new Set();
  for (const [id, p] of Object.entries(estado.pausas())) if (coincide(id, p && p.telefono)) encontrados.add(id);
  for (const [id, s] of Object.entries(estado.sesiones())) if (coincide(id, s && s.telefono)) encontrados.add(id);
  if (!encontrados.size && !soloConocidos) encontrados.add(`${numeroEscrito(d)}@c.us`);
  return [...encontrados];
}

function textoStatus() {
  const vigentes = Object.keys(estado.pausas())
    .map((id) => [id, estado.pausaVigente(id)])
    .filter(([, p]) => p);
  const r = estado.resumen();
  const L = [
    SOLO_CONECTAR ? "💤 *Bot conectado en modo «solo conectar»*: no contesta ni manda nada" : "✅ *Bot activo*",
    RESPOND_MODE === "all"
      ? "⚠️ Contesta a TODOS, también a contactos guardados (RESPOND_MODE=all, solo para pruebas)"
      : "👥 Contesta solo a números NO guardados en el teléfono del negocio",
    `🕗 Equipo: ${horario.horarioTexto("es")} (hora de México) · ahorita ${horario.enHorarioHumano() ? "en horario" : "fuera de horario"}`,
    `⏸️ Chats en pausa: ${vigentes.length}`,
    ...vigentes.slice(0, 10).map(([id, p]) => `   • ${etiquetaChat(id)} — ${etiquetaMotivo(p.motivo || p.modo)} · ${p.hasta === null ? "hasta /reanuda" : `hasta ${cuandoMx(p.hasta)}`}`),
    ...(vigentes.length > 10 ? [`   • …y ${vigentes.length - 10} más`] : []),
    `⏳ Ráfagas esperando: ${rafagas.enEspera()}`,
    `💬 Conversaciones guardadas: ${r.sesiones} · 🧾 comprobantes guardados: ${r.comprobantes}`,
    `🧠 Modelo: ${process.env.BOT_MODEL || "claude-haiku-4-5-20251001"} · ⌛ espera ${DEBOUNCE_MS / 1000} s (tope ${DEBOUNCE_MAX_MS / 1000} s; solo comprobante: ${ESPERA_COMPROBANTE_MS / 1000} s)`,
    `🙋 Si alguien escribe a mano: pausa de ${duracionTexto(HUMAN_TAKEOVER_MS)} · al pasar un chat: ${duracionTexto(PAUSA_ESCALACION_MS)}`,
  ];
  if (!OWNER) L.push("⚠️ Falta OWNER_WHATSAPP_NUMBER: comprobantes y escalaciones no le llegan a nadie.");
  return L.join("\n");
}

// ── /noespago ─────────────────────────────────────────────────
/**
 * «/noespago <número>»: lo que mandó el cliente NO era un comprobante. Quita
 * la marca de la ficha (si el pago no está validado) para que el bot vuelva a
 * cotizarle y a darle los datos de pago, y se lo dice al modelo con una nota.
 * 🔴 Sin esto, una foto que el bot tomó por comprobante dejaba el chat sin
 * cotizaciones ni datos de pago hasta que pasara el viaje o alguien hiciera
 * /olvida (que borra toda la plática).
 */
function quitarComprobante(ctx, arg, responder) {
  const ids = resolverChats(arg, ctx.chatActual, { soloConocidos: true });
  if (!ids.length) return responder(arg ? `No encontré un chat con ${arg}.` : "Uso: /noespago <número>\nEj.: /noespago 52XXXXXXXXXX");
  const L = [];
  for (const id of ids) {
    const s = sesionExistente(id);
    const f = s && s.ficha;
    if (!s) {
      L.push(`ℹ️ ${etiquetaChat(id)}: el bot no ha platicado con ese chat.`);
      continue;
    }
    if (f && f.pagoValidado) {
      L.push(`⚠️ ${etiquetaChat(id)}: ese pago ya está VALIDADO (${f.reservaFolio || f.folioVigente || "con reserva"}): no lo quito. Si hay que corregirlo, en el panel.`);
      continue;
    }
    // La marca de la ficha (si la había) y, siempre, la nota para el modelo:
    // la del acuse le dijo que llegó un comprobante.
    if (f && f.comprobanteRecibido) anotarEnFicha("actualizarFicha", id, { comprobanteRecibido: false });
    anotarHistorial(id, "user", "[sistema] El equipo revisó el archivo que mandó el cliente: NO era un comprobante de pago. Sigue SIN pagar; si quiere apartar, dale los datos de pago (datos_pago). No menciones esta nota.");
    const pausa = estado.pausaVigente(id);
    L.push(`🧾 ${etiquetaChat(id)}: listo, el bot ya no da por recibido un comprobante; vuelve a cotizarle y a darle los datos de pago.${pausa ? ` Sigue en pausa: /reanuda ${numeroParaComando(id)}` : ""}`);
  }
  return responder(L.join("\n"));
}

// ── /confirma ─────────────────────────────────────────────────
const METODOS = {
  transferencia: "transferencia", transf: "transferencia", spei: "transferencia",
  deposito: "deposito", oxxo: "deposito",
  stripe: "stripe", liga: "stripe", link: "stripe", tarjeta: "stripe",
  efectivo: "efectivo", cash: "efectivo",
  otro: "otro",
};
const USO_CONFIRMA = "Uso: /confirma <folio> <monto> [método]\nEj.: /confirma COT-ABC123 930\nMétodos: transferencia (por omisión), deposito (OXXO), stripe (liga), efectivo, otro.";

/** "$1,550" → 1550 · "930.50" → 931 · "1.550" → 1550 (montos MXN enteros). */
function parsearMonto(txt) {
  let t = String(txt || "").replace(/[$\s]/g, "");
  if (!/^[\d.,]+$/.test(t)) return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/,/g, "");
  else if (t.includes(",")) t = /,\d{3}$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * "/confirma COT-ABC123 930 deposito" → { folio, monto, metodo, forzar }
 * (en cualquier orden). Con error → { error } listo para contestar.
 */
function parsearConfirma(args) {
  const tokens = String(args || "").trim().split(/\s+/).filter(Boolean);
  let folio = null, monto = null, metodo = null, forzar = false;
  const raros = [];
  for (const tk of tokens) {
    const bajo = tk.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!folio && /^(COT-|HP)[A-Z0-9-]{3,}$/i.test(tk)) { folio = tk.toUpperCase().replace(/[^A-Z0-9-]/g, ""); continue; }
    if (monto === null && /^\$?[\d.,]+$/.test(tk)) { monto = parsearMonto(tk); continue; }
    if (METODOS[bajo]) { metodo = METODOS[bajo]; continue; }
    if (bajo === "forzar") { forzar = true; continue; }
    raros.push(tk);
  }
  if (!folio) return { error: USO_CONFIRMA };
  if (!(monto > 0)) return { error: `Falta el monto que entró (lo que viste en tu banco).\n${USO_CONFIRMA}` };
  if (raros.length) return { error: `No entendí «${raros.join(" ")}».\n${USO_CONFIRMA}` };
  return { folio, monto, metodo: metodo || "transferencia", forzar };
}

function cuandoSeLiquida(b, en) {
  if (b && b.esPaquete) return en ? "paid at hotel check-in" : "se paga al hacer check-in";
  return en
    ? "paid on the day of the tour, in cash or by bank transfer"
    : "se paga el día del tour en efectivo o transferencia";
}

function lineasDinero(b, en) {
  const L = [`💰 *Total:* ${medios.mx(b.totalAmount)}`];
  if (b.liquidado || !(Number(b.saldo) > 0)) {
    L.push(`✅ *${en ? "Paid" : "Pagado"}:* ${medios.mx(b.pagado)} — ${en ? "nothing left to pay" : "no queda nada pendiente"}`);
  } else {
    L.push(`✅ *${en ? "Paid" : "Pagado"}:* ${medios.mx(b.pagado)}`);
    L.push(`🕒 *${en ? "Balance" : "Saldo"}:* ${medios.mx(b.saldo)} — ${cuandoSeLiquida(b, en)}`);
  }
  return L;
}

/**
 * La confirmación al cliente, con lo que devolvió /api/bot/confirm: folio
 * HP-M-, cada recorrido con fecha, salida y recogida, qué llevar, pagado y
 * saldo (y cómo se paga), «un día antes tu guía te contacta», y la pregunta
 * del hotel si falta para pasar por ellos.
 * Antes decía «calzado cerrado» para todos (mal para tours de agua) y «saldo
 * con tarjeta» (el guía no cobra con tarjeta).
 */
function textoConfirmacionCliente(b = {}, locale = "es") {
  const en = String(locale || "").toLowerCase().startsWith("en");
  const nombre = medios.primerNombre(b.customerName);
  const folio = b.reservaFolio || b.folio;
  const L = [
    en ? `🎉 *All set${nombre ? `, ${nombre}` : ""}! Your booking is confirmed.*` : `🎉 *¡Listo${nombre ? `, ${nombre}` : ""}! Tu reserva quedó confirmada.*`,
    "",
    `📋 *${en ? "Booking" : "Folio"}:* ${folio}`,
  ];
  const recorridos = Array.isArray(b.recorridos) && b.recorridos.length
    ? b.recorridos
    : [{ nombre: b.tourName, fecha: b.tourDate, salida: b.salida, recogida: b.recogida, queLlevar: [] }];
  // Si todos los recorridos piden lo mismo, la lista va una sola vez al final.
  const listas = recorridos.map((r) => (Array.isArray(r.queLlevar) ? r.queLlevar.filter(Boolean) : []));
  const misma = listas.length > 1 && listas[0].length && listas.every((l) => l.join("|") === listas[0].join("|"));
  recorridos.forEach((r, i) => {
    L.push("", `🗺️ *${r.nombre || (en ? "Tour" : "Recorrido")}*${r.fecha ? ` · ${medios.fechaLarga(r.fecha, locale)}` : ""}`);
    if (r.salida) L.push(`⏰ ${en ? "Departure" : "Salida"}: ${r.salida}`);
    if (r.recogida) L.push(`📍 ${r.recogida}`);
    if (!misma && listas[i].length) L.push(`🎒 ${en ? "What to bring" : "Qué llevar"}: ${listas[i].join(", ")}`);
  });
  if (misma) L.push("", `🎒 *${en ? "What to bring" : "Qué llevar"}:* ${listas[0].join(", ")}`);
  if (Number(b.adults) > 0) {
    const ninos = Number(b.children) > 0 ? ` + ${b.children} ${en ? (b.children === 1 ? "child" : "children") : (b.children === 1 ? "niño" : "niños")}` : "";
    L.push("", `👥 ${b.adults} ${en ? (b.adults === 1 ? "adult" : "adults") : (b.adults === 1 ? "adulto" : "adultos")}${ninos}`);
  }
  L.push("", ...lineasDinero(b, en));
  L.push("", en
    ? "One day before, your guide will contact you with the exact pick-up time and place."
    : "Un día antes tu guía te contacta para darte la hora y el punto exacto de recogida.");
  if (b.pideHospedaje) {
    L.push("", en ? "Which hotel are you staying at? It's so we can pick you up. 🏨" : "¿En qué hotel se hospedan? Es para pasar por ustedes. 🏨");
  }
  L.push("", en ? "See you soon! 🌿" : "¡Nos vemos pronto! 🌿");
  return L.join("\n");
}

/**
 * Qué llevar para los tours del viaje (de data.json), sin repetir. Va en la
 * confirmación que sale al pagar con la liga (pruebas de Manolo, 17 nov: la
 * lista solo salía si el cliente la pedía).
 */
function queLlevarDeSesion(s) {
  const { findTour } = require("./catalog");
  const slugs = [...new Set(((s && s.ficha && Array.isArray(s.ficha.recorridos)) ? s.ficha.recorridos : []).map((r) => r && r.slug).filter(Boolean))];
  return [...new Set(slugs.flatMap((sl) => { const t = findTour(sl); return t && Array.isArray(t.queLlevar) ? t.queLlevar : []; }))];
}

/** Un pago más sobre una reserva que YA estaba confirmada (el saldo, un abono). */
function textoPagoRegistrado(b = {}, locale = "es") {
  const en = String(locale || "").toLowerCase().startsWith("en");
  const nombre = medios.primerNombre(b.customerName);
  const L = [
    en ? `✅ *Thank you${nombre ? `, ${nombre}` : ""}! We registered your payment.*` : `✅ *¡Gracias${nombre ? `, ${nombre}` : ""}! Registramos tu pago.*`,
    "",
    `📋 *${en ? "Booking" : "Folio"}:* ${b.reservaFolio || b.folio}`,
    ...lineasDinero(b, en),
    "",
    en ? "See you soon! 🌿" : "¡Nos vemos pronto! 🌿",
  ];
  return L.join("\n");
}

/** El chat del cliente por su folio (la sesión que lo cotizó), el más reciente. */
function chatPorFolio(...folios) {
  const buscados = new Set(folios.filter(Boolean).map((f) => String(f).toUpperCase()));
  let mejor = null;
  for (const [id, s] of Object.entries(estado.sesiones())) {
    if (s && s.lastFolio && buscados.has(String(s.lastFolio).toUpperCase())) {
      if (!mejor || (s.updatedAt || 0) > (mejor.s.updatedAt || 0)) mejor = { id, s };
    }
  }
  return mejor ? mejor.id : null;
}

const confirmacionesRecientes = new Map(); // `${folio}|${monto}` -> ms

async function confirmarPago(ctx, arg, responder) {
  const p = parsearConfirma(arg);
  if (p.error) return responder(p.error);

  // El mismo /confirma dos veces (doble toque, mensaje repetido) registraría
  // el cobro dos veces.
  const clave = `${p.folio}|${p.monto}`;
  const previa = confirmacionesRecientes.get(clave);
  if (previa && Date.now() - previa < CONFIRMA_REPETIDA_MS && !p.forzar) {
    return responder(`⚠️ Ya confirmaste ${p.folio} por ${medios.mx(p.monto)} hace ${duracionTexto(Date.now() - previa)}. Si de verdad entró OTRO pago igual, repite con:\n/confirma ${p.folio} ${p.monto} ${p.metodo} forzar`);
  }

  // 🔴 Se anota ANTES de llamar al sitio: el segundo de dos /confirma casi
  // juntos (Erick desde el teléfono del negocio y Manolo por mensaje directo)
  // ya lo encuentra aquí. Si el sitio no registra nada, se borra.
  confirmacionesRecientes.set(clave, Date.now());

  // El último comprobante guardado de ese folio viaja al panel con el cobro.
  const comp = estado.ultimoComprobante(p.folio);
  let comprobante;
  let notaComprobante = "";
  if (comp) {
    try {
      const buf = fs.readFileSync(comp.path);
      if (buf.length <= MAX_BYTES_COMPROBANTE) {
        comprobante = { base64: buf.toString("base64"), mimetype: comp.mimetype || "application/octet-stream", filename: comp.filename || path.basename(comp.path) };
      } else {
        notaComprobante = "⚠️ El comprobante pesa más de 5 MB: súbelo a mano en el panel.";
      }
    } catch (e) {
      notaComprobante = "⚠️ No encontré el archivo del comprobante en el disco: súbelo en el panel si hace falta.";
    }
  } else {
    notaComprobante = `ℹ️ No tengo comprobante guardado de ${p.folio}: súbelo en el panel si hace falta.`;
  }

  await responder(`⏳ Confirmando ${p.folio} por ${medios.mx(p.monto)} (${p.metodo})…`);
  const res = await api.confirmarReserva(p.folio, p.monto, {
    metodo: p.metodo, comprobante, confirmadoPor: ctx.confirmadoPor, forzar: p.forzar,
  });
  if (!res.ok) {
    confirmacionesRecientes.delete(clave);
    // El error tal cual: 404 no existe, 409 vencida / ya registrado / otra
    // reserva del mismo cliente, 400 pedido inválido.
    const error = (res.data && res.data.error) || (res.status ? `el sitio respondió ${res.status}` : "sin conexión con el sitio");
    return responder(`❌ ${p.folio}: ${error}`);
  }
  const b = res.data || {};
  // Lo que dijo el sitio del archivo, no lo que hay en el disco: «adjunto» no
  // es «guardado» (un sitio anterior no manda `comprobanteGuardado`).
  if (comprobante) {
    const total = estado.comprobantesDe(p.folio).length;
    const cual = `${comprobante.filename}${total > 1 ? ` (el último de ${total} archivos)` : ""}`;
    notaComprobante = b.comprobanteGuardado === true
      ? `📎 Comprobante guardado en el panel: ${cual}`
      : b.comprobanteGuardado === false
        ? `⚠️ El comprobante NO quedó en el panel (${cual}): súbelo a mano.`
        : `📎 Comprobante enviado: ${cual}`;
  }

  // A quién: el chat que guardó el sitio, el del comprobante o el que cotizó
  // ese folio. 🔴 NUNCA a "dígitos@c.us" armado del teléfono: en un chat @lid
  // ese número es falso y la confirmación no le llega a nadie.
  const destino = b.waChatId || (comp && comp.chatId) || chatPorFolio(p.folio, b.reservaFolio) || null;
  // El pago ya es un hecho aunque el mensaje no llegue: la ficha lo sabe desde
  // aquí y el bot ya no recotiza ese viaje (cambio después de pagar → equipo).
  if (destino) anotarEnFicha("marcarPagoEnFicha", destino, p.folio, b.reservaFolio || null);
  const ses = destino ? sesionExistente(destino) : null;
  const locale = b.locale === "en" || b.locale === "es" ? b.locale : medios.idiomaDeSesion(ses);
  // Una liga por persona a medias: con la liga solo se le dijo «recibimos 1 de
  // 2». El pago que completa (la transferencia de la otra persona) lleva la
  // confirmación completa con su PDF, aunque la reserva ya existiera.
  const lp = ses && ses.seguimiento && ses.seguimiento.ligaPartes;
  const completaPartes = Boolean(lp && lp.reserva === (b.reservaFolio || p.folio) && Number(b.cobroRegistrado) > 0);
  const confirmacionCompleta = !b.yaConfirmada || completaPartes;
  const mensaje = confirmacionCompleta ? textoConfirmacionCliente(b, locale) : textoPagoRegistrado(b, locale);

  let enviado = false;
  if (destino) {
    try {
      await enviar(destino, mensaje);
      enviado = true;
    } catch (e) {
      console.error(`❌ confirmación a ${destino}:`, primeraLinea(e));
    }
    // El PDF de confirmación (HP-M-…), el mismo del panel («Estructura de
    // oro», etapa 8). Solo en la primera confirmación, no en cada abono.
    if (enviado && confirmacionCompleta && b.reservaFolio) {
      await documentos.enviarAdjuntos(destino, [{ tipo: "pdf", folio: b.reservaFolio, nombre: adjuntos.nombrePdf(b.reservaFolio, locale) }]);
    }
  }
  if (enviado) {
    // Los comprobantes que lleguen después (el saldo) se ligan a la reserva, y
    // con el saldo en la sesión una foto de después del tour ya no es «pago».
    const s = getSession(destino);
    if (b.reservaFolio) s.lastFolio = b.reservaFolio;
    if (Number.isFinite(Number(b.saldo))) s.saldoPendiente = Math.max(0, Math.round(Number(b.saldo)));
    s.botAt = Date.now();
    const folioReserva = b.reservaFolio || p.folio;
    anotarHistorial(destino, "user",
      `[sistema] El equipo validó el pago de ${p.folio}${b.reservaFolio && b.reservaFolio !== p.folio ? ` (reserva ${b.reservaFolio})` : ""}: pagado ${medios.mx(b.pagado)}, saldo ${medios.mx(b.saldo)}. Ya se le mandó la confirmación.` +
      (b.pideHospedaje ? ` Se le preguntó en qué hotel se hospeda: cuando lo diga, llama escalar_a_humano (recogida, avisar, normal) con el hotel y el folio ${folioReserva}.` : ""));
    anotarHistorial(destino, "assistant", mensaje);
  }

  // Una liga por persona que nadie pagó (esa persona pagó por transferencia):
  // sigue viva y se podría pagar dos veces. El bot no la apaga; se avisa.
  let ligasVivas = "";
  if (completaPartes) {
    const rc = await api.consultarReserva(lp.cot).catch(() => null);
    const vivas = rc && rc.ok && rc.data && Array.isArray(rc.data.partes) ? rc.data.partes.filter((x) => x && !x.pagada) : [];
    if (vivas.length) ligasVivas = `⚠️ Sigue${vivas.length === 1 ? "" : "n"} viva${vivas.length === 1 ? "" : "s"} ${vivas.length === 1 ? "la liga" : `${vivas.length} ligas`} por persona de ${lp.cot} (${vivas.map((x) => medios.mx(x.monto)).join(", ")}): desactíva${vivas.length === 1 ? "la" : "las"} en el panel para que nadie pague dos veces.`;
    if (ses.seguimiento) ses.seguimiento.ligaPartes = null;
  }

  const L = [
    b.yaConfirmada
      ? `✅ ${b.reservaFolio || p.folio}: pago registrado.`
      : `✅ ${p.folio}${b.reservaFolio && b.reservaFolio !== p.folio ? ` → reserva ${b.reservaFolio}` : ""} confirmada.`,
    `💵 Registrado ${medios.mx(p.monto)} (${p.metodo}) · pagado ${medios.mx(b.pagado)} de ${medios.mx(b.totalAmount)}${Number(b.saldo) > 0 ? ` · falta ${medios.mx(b.saldo)}` : " · liquidado"}`,
    notaComprobante,
    ...(b.emailEnviado === true ? ["📧 Correo de confirmación enviado."] : []),
    // Lo que el sitio quiere que el dueño revise: otra reserva del mismo
    // cliente, el correo que no salió, el comprobante que no se guardó…
    ...(Array.isArray(b.avisos) ? b.avisos.filter(Boolean).map((a) => `⚠️ ${a}`) : []),
    ligasVivas,
  ];
  if (enviado) L.push(`📨 Mensaje enviado a ${b.customerName || etiquetaChat(destino)}.`);
  else L.push("", `⚠️ ${destino ? "No pude mandarle el mensaje al cliente" : "No tengo el chat del cliente"}: copia y mándale esto:`, "", mensaje);
  return responder(L.filter(Boolean).join("\n"));
}

// ── Seguimiento: Tének vuelve a escribir (seguimiento.js) ─────
// Revisa cada 5 min. Los recordatorios los redacta el modelo con una nota de
// sistema; el pago con liga y el «¿cómo les fue?» son mensajes fijos.
// SEGUIMIENTO=0 lo apaga sin tocar el código.
const SEGUIMIENTO_CADA_MS = Number(process.env.SEGUIMIENTO_CADA_MS || 5 * 60 * 1000);
const SEGUIMIENTO_APAGADO = process.env.SEGUIMIENTO === "0";
let whatsappListo = false;
let revisandoSeguimiento = false;
let relojSeguimiento = null;
// Para la bitácora: qué dejó de mandarle el bot a un contacto guardado.
const NOMBRE_ACCION_SEGUIMIENTO = {
  recordar: "el recordatorio (3/24/72 h)",
  agendado: "el seguimiento a la hora acordada",
  vence_manana: "el «vence mañana»",
  revisar_pago: "el aviso del pago con liga",
  post_viaje: "el «¿cómo les fue?»",
};

/** El cliente escribió: se reinicia su seguimiento (lo recién acordado se respeta). */
function marcarCliente(chatId) {
  const s = getSession(chatId);
  const ahora = Date.now();
  s.clienteAt = ahora;
  if (s.seguimiento) {
    const ag = s.seguimiento.agendado;
    // El «sí, va» que lo agendó llega justo antes: lo acordado hace menos de
    // 10 min sigue en pie; uno viejo se cae porque la plática ya siguió.
    const sigue = ag && ag.at > ahora && ahora - (ag.creado || 0) < 10 * 60 * 1000;
    s.seguimiento = { ...s.seguimiento, enviados: [], base: null, agendado: sigue ? ag : null };
  }
}

async function revisarSeguimientos() {
  if (SEGUIMIENTO_APAGADO || revisandoSeguimiento || !whatsappListo) return;
  revisandoSeguimiento = true;
  try {
    const todas = estado.sesiones() || {};
    for (const chatId of Object.keys(todas)) {
      const s = todas[chatId];
      if (!s || !s.botAt) continue;
      if (esNuncaResponder(chatId, s.telefono)) continue;
      const d = seguimiento.decidirSeguimiento(s, { ahora: Date.now(), pausa: Boolean(pausaActiva(chatId)) });
      if (d.accion === "nada") continue;
      // Contacto guardado: lo atiende el equipo, el bot no le escribe por su
      // cuenta. Si no se pudo saber, se reintenta en la siguiente vuelta.
      const permiso = await permisoParaEscribir(chatId, s.telefono);
      if (permiso !== "mandar") {
        if (permiso === "no_mandar") anotarSilencio(chatId, NOMBRE_ACCION_SEGUIMIENTO[d.accion] || d.accion);
        continue;
      }
      await rafagas.ejecutarExclusivo(chatId, () => ejecutarSeguimiento(chatId, d));
    }
  } catch (e) {
    console.error("❌ seguimiento:", primeraLinea(e));
  } finally {
    revisandoSeguimiento = false;
  }
}

async function ejecutarSeguimiento(chatId, d) {
  const s = getSession(chatId);
  const seg = s.seguimiento || (s.seguimiento = {});

  if (d.accion === "revisar_pago") {
    seg.revisadoPagoAt = Date.now();
    const r = await api.consultarReserva(d.folio);
    if (r.ok && r.data) await avisarPagoConLiga(chatId, s, r.data);
    return;
  }

  if (d.accion === "post_viaje") {
    // Solo si la reserva se concretó con un pago registrado (17 nov 2026).
    const v = await seguimiento.viajeConPago(api, d.folio);
    if (!v) return; // el sitio no contestó: se reintenta en la siguiente vuelta
    seg.postViajeAt = Date.now();
    if (!v.ok) {
      seg.postViajeOmitido = v.motivo;
      console.log(`🔕 [${etiquetaChat(chatId)}] sin «¿cómo les fue?»: ${v.motivo}`);
      return;
    }
    const texto = seguimiento.textoPostViaje(s);
    await enviar(chatId, texto);
    // Sin esta nota el modelo seguía con lo pendiente de antes del viaje
    // («¿en qué hotel se hospedan?») en vez de pedir la reseña.
    pushHistory(chatId, "user", seguimiento.NOTA_POST_VIAJE);
    pushHistory(chatId, "assistant", texto);
    marcarAtendido(chatId);
    etiquetas.ponerEtapa(chatId, "post_viaje").catch(() => {});
    console.log(`🔔 [${etiquetaChat(chatId)}] post-viaje: ¿cómo les fue?`);
    return;
  }

  // Recordatorio (3 h, 24 h, 72 h), la hora acordada o «vence mañana»: lo redacta el modelo.
  if (d.accion === "recordar" && !seg.base) seg.base = s.botAt;
  if (d.accion === "vence_manana") seg.venceAvisado = d.folio;
  const nota = d.accion === "vence_manana"
    ? seguimiento.notaVenceManana(s, d)
    : seguimiento.notaParaElModelo(d.accion === "agendado" ? 1 : d.paso, s, { agendado: d.accion === "agendado" });
  let respuesta = null;
  try {
    respuesta = await processMessage(chatId, nota);
    const extras = adjuntos.tomar(chatId);
    if (extras.length) await documentos.enviarAdjuntos(chatId, extras);
    if (respuesta) {
      await enviar(chatId, respuesta);
      marcarAtendido(chatId);
    }
  } finally {
    adjuntos.tomar(chatId);
    if (d.accion === "agendado") seg.agendado = null;
    // Los pasos que se brincaron (bot apagado) cuentan como hechos.
    else if (d.accion === "recordar") seg.enviados = [...(seg.enviados || []), ...Array(1 + (d.saltados || 0)).fill(Date.now())];
  }
  console.log(`🔔 [${etiquetaChat(chatId)}] seguimiento ${d.accion === "agendado" ? "acordado" : d.accion === "vence_manana" ? "«vence mañana»" : `#${d.paso}`}${d.saltados ? ` (${d.saltados} se brincaron)` : ""}`);
  await aplicarEscalacion(chatId, { textoCliente: "", respuestaBot: respuesta }).catch(() => {});
}

/**
 * La cotización ya es reserva: pagó con la liga de tarjeta (Stripe la
 * convirtió sola). Le llega su confirmación con el PDF, como con /confirma.
 * Con una liga por persona, mientras falten partes se le dice cuántas van.
 */
async function avisarPagoConLiga(chatId, s, d) {
  const reserva = d.reservaFolio;
  if (!reserva) return;
  // La convirtió el equipo (transferencia vista en el banco, panel): no es un
  // pago con tarjeta. La ficha se entera, sin mensaje (el equipo ya le confirma).
  if (!d.pagadaConLiga) {
    anotarEnFicha("marcarPagoEnFicha", chatId, d.folio, reserva);
    s.lastFolio = reserva;
    return;
  }
  const seg = s.seguimiento || (s.seguimiento = {});
  const en = medios.idiomaDeSesion(s) === "en";
  const partes = Array.isArray(d.partes) ? d.partes : [];
  const pagadas = partes.filter((p) => p && p.pagada).length;
  if (partes.length && pagadas < (partes[0].de || partes.length)) {
    if (pagadas <= (seg.partesAvisadas || 0)) return;
    seg.partesAvisadas = pagadas;
    // La cotización ya es la reserva: el comprobante de quien pague su parte
    // por transferencia se liga a ella (🔴 antes el bot le pedía el folio), y
    // /confirma avisa si queda viva la liga de esa parte.
    seg.ligaPartes = { cot: d.folio, reserva };
    s.lastFolio = reserva;
    const de = partes[0].de || partes.length;
    // Con los nombres de las ligas (enviar_link_pago con `nombres`): quién ya pagó y quién falta.
    const nl = s.nombresLigas && s.nombresLigas.folio === d.folio && Array.isArray(s.nombresLigas.nombres) ? s.nombresLigas.nombres : [];
    const quien = (p) => nl[(Number(p.parte) || 0) - 1] || null;
    const ya = partes.filter((p) => p && p.pagada).map(quien).filter(Boolean);
    const faltan = partes.filter((p) => p && !p.pagada).map(quien).filter(Boolean);
    const texto = en
      ? `✅ We received ${ya.length ? `${ya.join(" and ")}'s payment (${pagadas} of ${de})` : `${pagadas} of ${de} payments`} for ${reserva}. ${faltan.length ? `${faltan.join(" and ")} still ${faltan.length === 1 ? "has" : "have"} to pay` : de - pagadas === 1 ? "One more to go" : `${de - pagadas} more to go`} — once it's in, I'll send your confirmation. 🌿`
      : `✅ Recibimos ${ya.length ? `el pago de ${ya.join(" y ")} (${pagadas} de ${de})` : `${pagadas} de ${de} pagos`} de ${reserva}. ${faltan.length ? `Falta el de ${faltan.join(" y ")}` : de - pagadas === 1 ? "Falta uno" : `Faltan ${de - pagadas}`}: con liga o con transferencia (mándame el comprobante); en cuanto entre te mando tu confirmación. 🌿`;
    await enviar(chatId, texto);
    pushHistory(chatId, "assistant", texto);
    marcarAtendido(chatId);
    return;
  }

  anotarEnFicha("marcarPagoEnFicha", chatId, d.folio, reserva);
  s.lastFolio = reserva;
  const r = await api.consultarReserva(reserva);
  const b = (r.ok && r.data) || {};
  if (Number.isFinite(Number(b.saldo))) s.saldoPendiente = Math.max(0, Math.round(Number(b.saldo)));
  const pagado = Number(b.pagado) > 0 ? medios.mx(b.pagado) : null;
  const saldo = Number(b.saldo) > 0 ? medios.mx(b.saldo) : null;
  const llevar = queLlevarDeSesion(s);
  const texto = en
    ? [
        `✅ *We received your card payment!* Your booking *${reserva}* is confirmed.`,
        pagado ? `💰 Paid: ${pagado}${saldo ? ` · Balance: ${saldo}, paid before the tour starts` : " · Fully paid"}` : null,
        llevar.length ? `🎒 *What to bring:* ${llevar.join(", ")}` : null,
        "Here's your confirmation in PDF. Where are you staying? That way your guide can pick you up. 🌿",
      ]
    : [
        `✅ *¡Recibimos tu pago con tarjeta!* Tu reserva *${reserva}* está confirmada.`,
        pagado ? `💰 Pagado: ${pagado}${saldo ? ` · Saldo: ${saldo}, se paga antes de iniciar el tour` : " · Liquidado"}` : null,
        llevar.length ? `🎒 *Qué llevar:* ${llevar.join(", ")}` : null,
        "Te mando tu confirmación en PDF. ¿En qué hotel o lugar se hospedan? Así el guía pasa por ustedes. 🌿",
      ];
  await documentos.enviarAdjuntos(chatId, [{ tipo: "pdf", folio: reserva, nombre: adjuntos.nombrePdf(reserva, en ? "en" : "es") }]);
  const mensaje = texto.filter(Boolean).join("\n");
  await enviar(chatId, mensaje);
  pushHistory(chatId, "user", `[sistema] Pagó con la liga de tarjeta: ${d.folio} ya es la reserva ${reserva}. Ya se le mandó la confirmación con el PDF y se le preguntó dónde se hospeda: cuando lo diga, llama escalar_a_humano (recogida, avisar, normal) con el hotel y el folio ${reserva}.`);
  pushHistory(chatId, "assistant", mensaje);
  marcarAtendido(chatId);
  etiquetas.ponerEtapa(chatId, "confirmado").catch(() => {});
  await avisarAlDueno(`💳 Pagó con la liga: ${etiquetaChat(chatId)} · ${d.folio} → ${reserva}${pagado ? ` · ${pagado}` : ""}. Ya le llegó su confirmación con el PDF.`);
  console.log(`💳 [${etiquetaChat(chatId)}] pagó con liga: ${d.folio} → ${reserva}`);
}

// ── Eventos de conexión ───────────────────────────────────────
client.on("qr", (qr) => {
  console.log("\n📱 Escanea este QR con el WhatsApp del negocio (Dispositivos vinculados):\n");
  qrcode.generate(qr, { small: true });
  // El QR caduca en ~60 s y WhatsApp manda uno nuevo. Si se pide por `QR_OUT_FILE`,
  // se guarda tambien el texto crudo para poder pintarlo fuera de la terminal
  // (imagen, panel web, etc.) sin tener que leer el dibujo ASCII.
  escribirEstadoQr(qr);
});

/**
 * Con `QR_OUT_FILE`, el archivo dice en qué va la conexión para la página que
 * pinta el QR: el texto del QR, o AUTENTICANDO / CONECTADO / FALLO /
 * DESCONECTADO. Nunca lanza.
 */
function escribirEstadoQr(contenido) {
  if (!process.env.QR_OUT_FILE) return;
  try {
    fs.writeFileSync(process.env.QR_OUT_FILE, contenido);
  } catch (e) {
    console.error("   no pude escribir QR_OUT_FILE:", e.message);
  }
}

client.on("authenticated", () => {
  console.log("🔐 Autenticado.");
  escribirEstadoQr("AUTENTICANDO");
});
client.on("ready", () => {
  whatsappListo = true;
  escribirEstadoQr("CONECTADO");
  if (SOLO_CONECTAR) {
    console.log("\n✅ Bot de Tours Huasteca Potosina CONECTADO en modo «solo conectar»: no contesta ni manda nada.");
    console.log("   Para comprobar que está vivo: manda /status desde tu WhatsApp al número del negocio.");
    console.log("   Para que atienda clientes, reinícialo sin BOT_SOLO_CONECTAR (la sesión se queda: no pide QR otra vez).\n");
    return;
  }
  if (!relojPausas) {
    relojPausas = setInterval(() => { retomarPausasVencidas().catch((e) => console.error("❌ retomar pausas:", primeraLinea(e))); }, pausaHumano.REVISAR_PAUSAS_CADA_MS);
    console.log(`🙋 Pausa por mensaje del equipo: ${duracionTexto(HUMAN_TAKEOVER_MS)}; al vencer, el bot contesta lo que quedó pendiente.`);
  }
  if (!relojSeguimiento && !SEGUIMIENTO_APAGADO) {
    relojSeguimiento = setInterval(() => { revisarSeguimientos().catch(() => {}); }, SEGUIMIENTO_CADA_MS);
    console.log(`🔔 Seguimiento activo: revisa cada ${Math.round(SEGUIMIENTO_CADA_MS / 60000)} min (3 h, 24 h y 72 h; de 9 am a 8 pm).`);
  }
  console.log("\n✅ Bot de Tours Huasteca Potosina conectado y listo.");
  console.log("Comandos: /confirma <folio> <monto> · /noespago · /pausa · /reanuda · /olvida · /status · /help\n");
});
client.on("auth_failure", (m) => {
  console.error("❌ Auth falló:", m, "\n   Borra .wwebjs_auth/ y reintenta.");
  escribirEstadoQr("FALLO");
});
client.on("disconnected", (r) => {
  whatsappListo = false;
  console.log("⚠️ Desconectado:", r);
  escribirEstadoQr("DESCONECTADO");
});

// ── Arranque ──────────────────────────────────────────────────
function arrancar() {
  // La memoria (conversaciones, pausas y comprobantes) se carga ANTES de
  // conectar: el primer mensaje ya encuentra lo hablado antes del despliegue.
  const r = estado.iniciar();
  console.log(`💾 Memoria: ${r.sesiones} conversación(es), ${r.pausas} pausa(s) y ${r.comprobantes} comprobante(s) — ${r.ruta}`);
  console.log("🚀 Iniciando bot de Tours Huasteca Potosina…");
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️ Falta ANTHROPIC_API_KEY");
  if (!process.env.AGENT_API_TOKEN) console.warn("⚠️ Falta AGENT_API_TOKEN (reservas no funcionarán)");
  if (!OWNER) console.warn("⚠️ Falta OWNER_WHATSAPP_NUMBER: comprobantes y escalaciones no le llegarán a nadie.");
  if (RESPOND_MODE === "all") {
    console.warn("\n⚠️⚠️ RESPOND_MODE=all: el bot contesta a TODOS, también a contactos guardados. Solo para pruebas.\n");
  } else {
    console.log("👥 Contesta solo a números NO guardados en los contactos del teléfono del negocio.");
  }
  if (SOLO_CONECTAR) console.log("💤 BOT_SOLO_CONECTAR=1: se conecta a WhatsApp pero no contesta ni manda nada.");
  client.initialize();
}

// `node index.js` arranca el bot. Requerirlo desde una prueba solo da las
// funciones puras de abajo: no conecta WhatsApp ni toca la memoria guardada.
if (require.main === module) arrancar();

module.exports = {
  textoAvisoEscalacion,
  textoConfirmacionCliente,
  textoPagoRegistrado,
  queLlevarDeSesion,
  parsearConfirma,
  parsearMonto,
  duracionTexto,
  etiquetaMotivo,
  resumirError,
  normalizarTelefono,
  mxVariants,
  mismoNumero,
  MOTIVOS_HASTA_REANUDA,
  // Los candados de los comandos (test-escalacion.js).
  sinComando,
  extraerComando,
  anotarTextoDelBot,
  esTextoDelBot,
};
