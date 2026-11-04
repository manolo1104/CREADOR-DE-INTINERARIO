// Puente entre el WhatsApp del negocio y la Bandeja del panel (Fase 2.3 del
// rediseño, 4 nov 2026). SIN Meta: se vincula al número como «dispositivo
// vinculado» (igual que WhatsApp Web), así el celular de Erick sigue igual y
// todo lo que entra o sale —desde el celular o desde el panel— llega al panel.
//
// Qué hace:
//  · cada mensaje de un chat individual → POST /api/whatsapp/puente (eventos)
//  · lo que se contesta desde el panel → GET cada 3 s, lo manda y lo confirma
//  · palomitas (enviado, entregado, leído) → eventos «ack»
//  · el QR para vincular → al panel (lo ven Manolo y Martín en la Bandeja)
//  · al vincular por primera vez importa los chats de los últimos 60 días
//    (sin crear leads: solo la conversación, para tener el contexto)
//
// NO contesta solo: no es el bot. Es un servicio APARTE del bot de Tours, con
// su propia sesión (clientId «huasteca-bandeja») y su propio volumen.
//
// Variables: PANEL_URL, WHATSAPP_PUENTE_TOKEN (la misma del panel, ≥ 24
// caracteres), opcionales SESION_DIR, IMPORTAR_DIAS, IMPORTAR_POR_CHAT,
// WA_WEB_VERSION, PUPPETEER_EXECUTABLE_PATH.
//
// 🔴 Riesgo conocido: es una conexión NO oficial. WhatsApp puede bloquear un
// número que manda mensajes automáticos en masa. Este puente solo manda lo que
// una persona escribió en la Bandeja, uno por uno.

const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QR = require("qrcode");

const PANEL = (process.env.PANEL_URL || "http://localhost:3399").replace(/\/$/, "");
const TOKEN = process.env.WHATSAPP_PUENTE_TOKEN || "";
const SESION_DIR = process.env.SESION_DIR || path.join(__dirname, ".wwebjs_auth");
const IMPORTAR_DIAS = Number(process.env.IMPORTAR_DIAS || 60);
const IMPORTAR_POR_CHAT = Number(process.env.IMPORTAR_POR_CHAT || 40);
// La misma versión de WhatsApp Web que el bot (comprobada con whatsapp-web.js 1.34.7; ver whatsapp-bot/index.js).
const WA_WEB_VERSION = process.env.WA_WEB_VERSION || "2.3000.1044917563-alpha";

if (TOKEN.length < 24) {
  console.error("❌ Falta WHATSAPP_PUENTE_TOKEN (la misma del panel, de 24 caracteres o más).");
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "huasteca-bandeja", dataPath: SESION_DIR }),
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

let listo = false;
const primeraLinea = (e) => String((e && e.message) || e).split("\n")[0].slice(0, 200);

// ── Hablar con el panel (nunca lanza) ────────────────────────────────────────
async function panel(method, body) {
  try {
    const r = await fetch(`${PANEL}/api/whatsapp/puente`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) console.warn(`⚠️ Panel ${method} ${r.status}: ${j && j.error}`);
    return r.ok ? j : null;
  } catch (e) {
    console.warn(`⚠️ Panel ${method} sin respuesta: ${primeraLinea(e)}`);
    return null;
  }
}

// Los eventos van en lotes; si el panel no contesta se quedan y se reintentan.
const cola = [];
let vaciando = false;
function encolar(ev) {
  cola.push(ev);
  if (cola.length > 5000) cola.splice(0, cola.length - 5000);
}
async function vaciar() {
  if (vaciando || !cola.length) return;
  vaciando = true;
  const lote = cola.splice(0, 50);
  const r = await panel("POST", { eventos: lote });
  if (!r) cola.unshift(...lote);
  vaciando = false;
}
setInterval(vaciar, 1000);

function conexion(estado, extra = {}) {
  encolar({ tipo: "conexion", estado, ...extra });
  void vaciar();
}

// ── Mensajes ─────────────────────────────────────────────────────────────────
const individual = (id) => /@(c\.us|lid)$/.test(String(id || ""));
const propios = new Set(); // ids que mandó el puente: su eco no es «desde el celular»
const cacheTel = new Map();

/** Dígitos del teléfono del chat. Un «@lid» no lo trae: se le pregunta a WhatsApp una vez (con tope de 8 s). */
async function telefonoDe(chatId) {
  if (chatId.endsWith("@c.us")) return chatId.split("@")[0];
  if (cacheTel.has(chatId)) return cacheTel.get(chatId);
  let pn = null;
  try {
    const lista = await Promise.race([client.getContactLidAndPhone([chatId]), new Promise((r) => setTimeout(() => r(null), 8000))]);
    const x = Array.isArray(lista) ? lista[0] : null;
    pn = x && x.pn ? String(x.pn).split("@")[0].replace(/\D/g, "") || null : null;
  } catch (e) {
    console.warn(`⚠️ No supe el teléfono de ${chatId}: ${primeraLinea(e)}`);
  }
  cacheTel.set(chatId, pn);
  return pn;
}

async function aEvento(msg, { importado = false, nombre = null } = {}) {
  const deNosotros = Boolean(msg.fromMe);
  const chatId = deNosotros ? msg.to : msg.from;
  if (!individual(chatId) || msg.isStatus || !msg.id || !msg.id._serialized) return null;
  let quien = nombre;
  if (!deNosotros && !quien && !importado) {
    try { const c = await msg.getContact(); quien = (c && (c.pushname || c.verifiedName || c.name)) || null; } catch { /* sin nombre */ }
  }
  return {
    tipo: "mensaje",
    waId: msg.id._serialized,
    chatId,
    telefono: await telefonoDe(chatId),
    nombre: quien,
    deNosotros,
    tipoMensaje: msg.type,
    texto: typeof msg.body === "string" && msg.type !== "sticker" ? msg.body.slice(0, 4000) : null,
    fecha: (Number(msg.timestamp) || Date.now() / 1000) * 1000,
    importado,
  };
}

client.on("message", async (msg) => {
  try {
    if (msg.fromMe) return;
    const ev = await aEvento(msg);
    if (ev) encolar(ev);
  } catch (e) { console.error("❌ message:", primeraLinea(e)); }
});

// Lo que sale: desde el celular (se reporta) o desde el panel (su eco se salta).
client.on("message_create", async (msg) => {
  try {
    if (!msg.fromMe) return;
    // Un respiro: el envío del panel termina un instante DESPUÉS de este evento.
    await new Promise((r) => setTimeout(r, 1500));
    if (propios.has(msg.id && msg.id._serialized)) return;
    const ev = await aEvento(msg);
    if (ev) encolar(ev);
  } catch (e) { console.error("❌ message_create:", primeraLinea(e)); }
});

const ACK = { "-1": "fallo", 1: "enviado", 2: "entregado", 3: "leido", 4: "leido" };
client.on("message_ack", (msg, ack) => {
  const estado = ACK[String(ack)];
  if (msg && msg.fromMe && estado && msg.id) encolar({ tipo: "ack", waId: msg.id._serialized, estado });
});

// ── Enviar lo que se contestó en el panel ────────────────────────────────────
// La misma escalera que el bot (la era «@lid» hace fallar el envío directo):
// directo → por el objeto Chat → resolviendo el número con getNumberId.
async function enviarRobusto(to, texto) {
  try {
    return await client.sendMessage(to, texto);
  } catch (primero) {
    try {
      const chat = await client.getChatById(to);
      if (chat) return await chat.sendMessage(texto);
    } catch { /* siguiente */ }
    if (String(to).endsWith("@c.us")) {
      const wid = await client.getNumberId(String(to).replace("@c.us", ""));
      if (wid && wid._serialized) return await client.sendMessage(wid._serialized, texto);
    }
    throw primero;
  }
}

let enviando = false;
async function mandarPendientes() {
  if (!listo || enviando) return;
  enviando = true;
  try {
    const r = await panel("GET");
    for (const p of (r && r.pendientes) || []) {
      try {
        const m = await enviarRobusto(p.chatId, p.texto);
        const waId = m && m.id && m.id._serialized;
        if (waId) propios.add(waId);
        await panel("POST", { confirmar: [{ id: p.id, ok: true, waId: waId || null }] });
      } catch (e) {
        console.error(`❌ No se pudo mandar a ${p.chatId}: ${primeraLinea(e)}`);
        await panel("POST", { confirmar: [{ id: p.id, ok: false, error: primeraLinea(e) }] });
      }
      // Uno por uno, con pausa: así lo haría una persona.
      await new Promise((res) => setTimeout(res, 1200));
    }
  } finally {
    enviando = false;
  }
}
setInterval(mandarPendientes, 3000);

// ── Historial (una sola vez, al vincular) ────────────────────────────────────
const MARCA_IMPORTADO = path.join(SESION_DIR, "historial-importado.json");
async function importarHistorial() {
  if (fs.existsSync(MARCA_IMPORTADO)) return;
  const desde = Date.now() / 1000 - IMPORTAR_DIAS * 86400;
  const chats = (await client.getChats()).filter((c) => !c.isGroup && individual(c.id && c.id._serialized) && (c.timestamp || 0) >= desde);
  console.log(`📥 Importando ${chats.length} chats de los últimos ${IMPORTAR_DIAS} días…`);
  let n = 0;
  for (const chat of chats) {
    try {
      const msgs = await chat.fetchMessages({ limit: IMPORTAR_POR_CHAT });
      for (const m of msgs) {
        const ev = await aEvento(m, { importado: true, nombre: m.fromMe ? null : chat.name || null });
        if (ev) { encolar(ev); n++; }
      }
      while (cola.length > 200) await new Promise((r) => setTimeout(r, 500)); // que el panel respire
    } catch (e) {
      console.warn(`⚠️ No pude leer el historial de ${chat.name || chat.id._serialized}: ${primeraLinea(e)}`);
    }
  }
  fs.mkdirSync(SESION_DIR, { recursive: true });
  fs.writeFileSync(MARCA_IMPORTADO, JSON.stringify({ en: new Date().toISOString(), chats: chats.length, mensajes: n }));
  console.log(`✅ Historial importado: ${n} mensajes de ${chats.length} chats.`);
}

// ── Conexión ─────────────────────────────────────────────────────────────────
client.on("qr", async (qr) => {
  console.log("📱 Hay un código QR para vincular: se ve en el panel, en Bandeja.");
  try { conexion("qr", { qr: await QR.toDataURL(qr, { margin: 1, width: 320 }) }); }
  catch (e) { console.error("❌ No pude armar la imagen del QR:", primeraLinea(e)); }
});
client.on("authenticated", () => console.log("🔐 Autenticado."));
client.on("ready", async () => {
  listo = true;
  const numero = client.info && client.info.wid ? client.info.wid.user : null;
  console.log(`✅ Puente de la Bandeja conectado${numero ? ` (${numero})` : ""}.`);
  conexion("conectado", { numero });
  try { await importarHistorial(); } catch (e) { console.error("❌ Historial:", primeraLinea(e)); }
});
client.on("auth_failure", (m) => { console.error("❌ Falló la autenticación:", m); conexion("desconectado", { detalle: "falló la autenticación" }); });
client.on("disconnected", (r) => {
  listo = false;
  console.warn("⚠️ Desconectado:", r);
  conexion("desconectado", { detalle: String(r || "") });
  // Railway lo vuelve a levantar: si la sesión murió, pedirá un QR nuevo.
  setTimeout(() => process.exit(1), 3000);
});

// Latido: el panel avisa si el puente deja de dar señales.
setInterval(() => { if (listo) conexion("conectado", { numero: client.info && client.info.wid ? client.info.wid.user : null }); }, 5 * 60_000);

console.log(`🚀 Puente de la Bandeja → ${PANEL}`);
conexion("iniciando");
client.initialize();

process.on("SIGTERM", async () => {
  await vaciar();
  try { await client.destroy(); } catch { /* ya estaba cerrado */ }
  process.exit(0);
});
