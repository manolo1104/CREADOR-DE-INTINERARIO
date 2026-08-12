// ════════════════════════════════════════════════════════════════════
// Tours Huasteca Potosina — Bot de WhatsApp (proceso principal)
// whatsapp-web.js + agente Claude. Comportamientos: debounce, pausa por
// humano, escalación, comandos del dueño.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { processMessage, needsHuman } = require("./agent");
const { confirmarReserva } = require("./api-client");
const { clearSession, getSession, pushHistory } = require("./sessions");

const OWNER = (process.env.OWNER_WHATSAPP_NUMBER || "").replace(/\D/g, "");
const DEBOUNCE_MS = Number(process.env.MESSAGE_DEBOUNCE_MS || 2500);
// Cuando el dueño escribe manualmente en un chat, el bot se pausa este tiempo (default 5 min).
const HUMAN_TAKEOVER_MS = Number(process.env.HUMAN_TAKEOVER_MS || 5 * 60 * 1000); // 5 min

// El bot corre en un número personal: por defecto SOLO responde a desconocidos
// (números NO guardados en los contactos). RESPOND_MODE: "strangers" (default) | "all".
const RESPOND_MODE = (process.env.RESPOND_MODE || "strangers").toLowerCase();
// Números que SIEMPRE reciben respuesta aunque estén guardados (pruebas). Coma-separados.
const ALWAYS_RESPOND = (process.env.ALWAYS_RESPOND_NUMBERS || "")
  .split(",").map((s) => s.replace(/\D/g, "")).filter(Boolean);

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

// ── Estado en memoria ─────────────────────────────────────────
const pausedChats = new Map();         // chatId -> expiresAt
const buffers = new Map();             // chatId -> { texts:[], timer }
const recentBotOutgoing = new Map();   // chatId -> expiresAt (para no auto-pausar)

function digitsOnly(s = "") { return String(s).replace(/\D/g, ""); }
function normalizeChatId(id = "") {
  const d = digitsOnly(String(id).split("@")[0]);
  return d ? `${d}@c.us` : id;
}
// Variantes de número MX (52 / 521 / 10 dígitos) para comparar sin fallar por formato.
function mxVariants(n = "") {
  n = digitsOnly(n);
  const s = new Set([n]);
  if (n.length === 10) { s.add(`52${n}`); s.add(`521${n}`); }
  if (n.length === 12 && n.startsWith("52")) s.add(`521${n.slice(2)}`);
  if (n.length === 13 && n.startsWith("521")) s.add(`52${n.slice(3)}`);
  return [...s];
}
function isAlwaysRespond(jid = "") {
  const v = mxVariants(digitsOnly(String(jid).split("@")[0]));
  return v.some((x) => ALWAYS_RESPOND.includes(x));
}
function markBotOutgoing(chatId, ms = 20000) {
  recentBotOutgoing.set(normalizeChatId(chatId), Date.now() + ms);
}
function isRecentBotOutgoing(chatId) {
  const k = normalizeChatId(chatId);
  const exp = recentBotOutgoing.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { recentBotOutgoing.delete(k); return false; }
  return true;
}
function pauseChat(chatId, ms = HUMAN_TAKEOVER_MS) {
  const k = normalizeChatId(chatId);
  pausedChats.set(k, Date.now() + ms);
  const until = new Date(Date.now() + ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
  console.log(`⏸️  Pausado ${k} (humano) hasta ${until}`);
}
function resumeChat(chatId) { pausedChats.delete(normalizeChatId(chatId)); }
function isPaused(chatId) {
  const k = normalizeChatId(chatId);
  const exp = pausedChats.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { pausedChats.delete(k); return false; }
  return true;
}

async function sendReply(chatId, text) {
  markBotOutgoing(chatId);
  await client.sendMessage(chatId, text);
}

// ── Eventos de conexión ───────────────────────────────────────
client.on("qr", (qr) => {
  console.log("\n📱 Escanea este QR con el WhatsApp del negocio (Dispositivos vinculados):\n");
  qrcode.generate(qr, { small: true });
});
client.on("authenticated", () => console.log("🔐 Autenticado."));
client.on("ready", () => {
  console.log("\n✅ Bot de Tours Huasteca Potosina conectado y listo.");
  console.log("Comandos del dueño: /confirma <folio> · /pausa · /reanuda · /status · /help\n");
});
client.on("auth_failure", (m) => console.error("❌ Auth falló:", m, "\n   Borra .wwebjs_auth/ y reintenta."));
client.on("disconnected", (r) => console.log("⚠️ Desconectado:", r));

// ── Mensajes ENTRANTES (clientes) ─────────────────────────────
client.on("message", async (msg) => {
  try {
    if (msg.fromMe || msg.isStatus || msg.from === "status@broadcast") return;
    if (msg.from.endsWith("@g.us")) return; // grupos
    const body = (msg.body || "").trim();
    if (!body) return;

    console.log(`📩 Entrante de ${msg.from}: ${body.substring(0, 60)}`);

    // Corre en número personal: por defecto solo responde a DESCONOCIDOS.
    // (Los contactos GUARDADOS no se responden nunca — los atiende el dueño.)
    if (RESPOND_MODE === "strangers") {
      let contact = null;
      try { contact = await msg.getContact(); } catch {}
      const contactNumber = String((contact && (contact.number || (contact.id && contact.id.user))) || "");
      const always = isAlwaysRespond(msg.from) || isAlwaysRespond(contactNumber);
      const saved = !!(contact && contact.isMyContact);
      console.log(`   número=${contactNumber || "?"} · guardado=${saved} · always=${always}`);
      if (saved && !always) {
        console.log("   ⏭️  es contacto guardado → no respondo (lo atiendes tú). Para probar, agrega su número a ALWAYS_RESPOND_NUMBERS o usa RESPOND_MODE=all.");
        return;
      }
    }

    // Si el chat está en pausa (un humano lo tomó): NO respondo, pero SÍ registro
    // el mensaje del cliente en el historial para no perder el hilo al reanudar.
    if (isPaused(msg.from)) {
      pushHistory(msg.from, "user", body);
      console.log("   ⏸️  chat en pausa (humano) — registro el mensaje del cliente para no perder el hilo, sin responder.");
      return;
    }

    bufferMessage(msg.from, body);
  } catch (e) {
    console.error("❌ message handler:", e.message);
  }
});

// Debounce: junta mensajes seguidos y responde una vez
function bufferMessage(chatId, text) {
  let buf = buffers.get(chatId);
  if (!buf) { buf = { texts: [], timer: null }; buffers.set(chatId, buf); }
  buf.texts.push(text);
  if (buf.timer) clearTimeout(buf.timer);
  buf.timer = setTimeout(() => flushBuffer(chatId), DEBOUNCE_MS);
}

async function flushBuffer(chatId) {
  const buf = buffers.get(chatId);
  if (!buf) return;
  buffers.delete(chatId);
  const text = buf.texts.join("\n").trim();
  if (!text) return;
  if (isPaused(chatId)) return;

  console.log(`📨 [${chatId.split("@")[0]}] ${text.substring(0, 80)}`);

  // Escalación a humano
  if (needsHuman(text)) {
    await escalateToHuman(chatId, text);
    return;
  }

  try {
    const chat = await client.getChatById(chatId).catch(() => null);
    if (chat) chat.sendStateTyping().catch(() => {});
    const reply = await processMessage(chatId, text);
    await sendReply(chatId, reply);
  } catch (e) {
    console.error(`❌ procesando ${chatId}:`, e.message);
    await sendReply(chatId, "Disculpa, tuve un problema técnico momentáneo. ¿Me escribes de nuevo en un momento? 🙏").catch(() => {});
  }
}

async function escalateToHuman(chatId, text) {
  pauseChat(chatId);
  await sendReply(chatId, "¡Claro! 🙌 En un momento te atiende una persona de nuestro equipo. Déjame tus dudas por aquí y te contactamos lo antes posible. 🌿").catch(() => {});
  if (OWNER) {
    const aviso = `🔔 *Cliente pide atención humana*\n📱 ${chatId.split("@")[0]}\n💬 "${text.substring(0, 200)}"\n\n_El bot se pausó 1 h en ese chat._`;
    client.sendMessage(`${OWNER}@c.us`, aviso).catch(() => {});
  }
  console.log(`🙋 Escalado a humano: ${chatId.split("@")[0]}`);
}

// ── Mensajes SALIENTES (dueño / cuenta conectada) ─────────────
client.on("message_create", async (msg) => {
  try {
    if (!msg.fromMe) return;
    const body = (msg.body || "").trim();
    if (!body) return;

    // Comandos del dueño
    if (body.startsWith("/")) {
      await handleOwnerCommand(msg, body);
      return;
    }

    // Si el dueño escribió manualmente en un chat de cliente (no fue el bot),
    // pausar ese chat 5 min: un humano tomó la conversación. Cada mensaje del
    // dueño reinicia esos 5 min. Además registro su mensaje en el historial
    // (como lado del negocio) para que el bot no pierda el hilo al reanudar.
    const target = msg.to || msg.from;
    if (target && target.endsWith("@c.us") && !isRecentBotOutgoing(target)) {
      pauseChat(target);
      const s = getSession(target);
      if (s.history.length > 0) pushHistory(target, "assistant", body);
    }
  } catch (e) {
    console.error("❌ message_create:", e.message);
  }
});

async function handleOwnerCommand(msg, body) {
  const reply = (t) => msg.reply(t).catch(() => client.sendMessage(msg.from, t));
  const [cmd, ...rest] = body.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (cmd.toLowerCase()) {
    case "/status":
      return reply(`✅ Bot activo. Chats en pausa: ${pausedChats.size}.`);
    case "/help":
      return reply("*Comandos:*\n*/confirma <folio>* — confirma reserva y avisa al cliente\n*/pausa <numero>* — pausa el bot en ese chat\n*/reanuda <numero>* — reactiva el bot\n*/status* — estado del bot");
    case "/confirma": {
      if (!arg) return reply("Uso: /confirma HPXXXX");
      return handleConfirma(reply, arg.toUpperCase());
    }
    case "/pausa": {
      const num = digitsOnly(arg) || digitsOnly(msg.to || "");
      if (!num) return reply("Uso: /pausa <numero>");
      pauseChat(`${num}@c.us`);
      return reply(`⏸️ Bot pausado para ${num}.`);
    }
    case "/reanuda": {
      const num = digitsOnly(arg) || digitsOnly(msg.to || "");
      if (!num) return reply("Uso: /reanuda <numero>");
      resumeChat(`${num}@c.us`);
      clearSession(`${num}@c.us`);
      return reply(`▶️ Bot reactivado para ${num}.`);
    }
    default:
      return; // comando desconocido: ignorar silenciosamente
  }
}

async function handleConfirma(reply, folio) {
  const res = await confirmarReserva(folio);
  if (!res.ok) return reply(`❌ ${res.data?.error || "No se pudo confirmar."}`);
  const b = res.data;
  const msgCliente =
    `🎉 *¡Tu reserva está CONFIRMADA!*\n\n` +
    `📋 *Folio:* ${b.folio}\n` +
    `🗺️ *Tour:* ${b.tourName}\n` +
    `📅 *Fecha:* ${b.tourDate}\n` +
    `⏰ *Salida:* 8:30–9:00 AM\n` +
    `👥 *Personas:* ${b.adults} adulto(s)${b.children ? ` + ${b.children} niño(s)` : ""}\n` +
    `💰 *Total:* $${Number(b.totalAmount).toLocaleString("es-MX")} MXN\n\n` +
    `Te enviaremos el punto de encuentro exacto un día antes. Lleva ropa cómoda, calzado cerrado y protector solar. ¡Nos vemos pronto! 🌿`;

  if (b.customerPhone) {
    await client.sendMessage(`${digitsOnly(b.customerPhone)}@c.us`, msgCliente).catch(() => {});
    return reply(`✅ ${folio} confirmada${b.yaConfirmada ? " (ya lo estaba)" : ""}. Mensaje enviado a ${b.customerName}.`);
  }
  return reply(`✅ ${folio} confirmada. ⚠️ Sin teléfono guardado — copia y envía manualmente:\n\n${msgCliente}`);
}

// ── Arranque ──────────────────────────────────────────────────
console.log("🚀 Iniciando bot de Tours Huasteca Potosina…");
if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️ Falta ANTHROPIC_API_KEY");
if (!process.env.AGENT_API_TOKEN) console.warn("⚠️ Falta AGENT_API_TOKEN (reservas no funcionarán)");
client.initialize();
