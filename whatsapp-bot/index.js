// ════════════════════════════════════════════════════════════════════
// Tours Huasteca Potosina — Bot de WhatsApp (proceso principal)
// whatsapp-web.js + agente Claude. Comportamientos: espera por ráfaga de
// mensajes, pausa por humano, escalación, comandos del dueño.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { processMessage, needsHuman } = require("./agent");
const { confirmarReserva } = require("./api-client");
const { clearSession, getSession, pushHistory } = require("./sessions");
const { crearGestorDeRafagas } = require("./buffer");

const OWNER = (process.env.OWNER_WHATSAPP_NUMBER || "").replace(/\D/g, "");
// El cliente manda RÁFAGAS: "hola", "somos 4", "para el sábado". El bot espera
// a que deje de escribir y contesta UNA vez a todo junto.
// · DEBOUNCE_MS: cada mensaje nuevo reinicia este reloj (ventana deslizante).
// · DEBOUNCE_MAX_MS: tope duro desde el PRIMER mensaje de la ráfaga. Sin él,
//   quien escribe cada 14 s no recibiría respuesta nunca.
const DEBOUNCE_MS = Number(process.env.MESSAGE_DEBOUNCE_MS || 15000);
const DEBOUNCE_MAX_MS = Number(process.env.MESSAGE_DEBOUNCE_MAX_MS || 90000);
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
  // Si había una ráfaga esperando, se descarta: la conversación la toma un
  // humano y sería absurdo que el bot contestara 30 s después por encima.
  rafagas.descartar(k);
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
  // El QR caduca en ~60 s y WhatsApp manda uno nuevo. Si se pide por `QR_OUT_FILE`,
  // se guarda tambien el texto crudo para poder pintarlo fuera de la terminal
  // (imagen, panel web, etc.) sin tener que leer el dibujo ASCII.
  if (process.env.QR_OUT_FILE) {
    try {
      require("fs").writeFileSync(process.env.QR_OUT_FILE, qr);
    } catch (e) {
      console.error("   no pude guardar el QR en QR_OUT_FILE:", e.message);
    }
  }
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

    // Marco el mensaje como LEÍDO de inmediato. El bot va a tardar 30 s o más
    // en contestar; sin las palomitas azules el cliente siente que nadie lo vio.
    msg.getChat().then((c) => c.sendSeen()).catch(() => {});

    bufferMessage(msg.from, body);
  } catch (e) {
    console.error("❌ message handler:", e.message);
  }
});

// ── Espera antes de responder ─────────────────────────────────
// La mecánica (ventana deslizante, tope y candado) vive en buffer.js.
// Aquí solo va QUÉ hacer cuando la ráfaga ya está completa.
const rafagas = crearGestorDeRafagas({
  debounceMs: DEBOUNCE_MS,
  maxMs: DEBOUNCE_MAX_MS,
  responder: atenderRafaga,
  onError: (e) => console.error("❌ ráfaga:", e && e.message),
});

function bufferMessage(chatId, text) {
  rafagas.recibir(chatId, text);
}

async function atenderRafaga(chatId, text, info) {
  if (isPaused(chatId)) return;

  console.log(`📨 [${chatId.split("@")[0]}] ${info.mensajes} mensaje(s) juntos tras ${Math.round(info.esperaMs / 1000)}s: ${text.substring(0, 80)}`);

  // Escalación a humano
  if (needsHuman(text)) {
    await escalateToHuman(chatId, text);
    return;
  }

  let escribiendo = null;
  try {
    const chat = await client.getChatById(chatId).catch(() => null);
    if (chat) {
      // El "escribiendo…" de WhatsApp se apaga solo a los ~25 s. Lo refresco
      // mientras el modelo piensa para que el cliente no vea el chat mudo.
      chat.sendStateTyping().catch(() => {});
      escribiendo = setInterval(() => chat.sendStateTyping().catch(() => {}), 10000);
    }
    const reply = await processMessage(chatId, text);
    await sendReply(chatId, reply);
  } catch (e) {
    console.error(`❌ procesando ${chatId}:`, e.message);
    await sendReply(chatId, "Disculpa, tuve un problema técnico momentáneo. ¿Me escribes de nuevo en un momento? 🙏").catch(() => {});
  } finally {
    if (escribiendo) clearInterval(escribiendo);
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
      return reply(`✅ Bot activo.\n⏸️ Chats en pausa: ${pausedChats.size}\n⏳ Ráfagas esperando: ${rafagas.enEspera()}\n🧠 Modelo: ${process.env.BOT_MODEL || "claude-haiku-4-5"}\n⌛ Espera: ${DEBOUNCE_MS / 1000}s (tope ${DEBOUNCE_MAX_MS / 1000}s)`);
    case "/help":
      return reply("*Comandos:*\n*/confirma <folio> [monto]* — confirma reserva y avisa al cliente (el monto es lo que entró; sin él se asume el anticipo del 30 %)\n*/pausa <numero>* — pausa el bot en ese chat\n*/reanuda <numero>* — reactiva el bot\n*/status* — estado del bot");
    case "/confirma": {
      if (!arg) return reply("Uso: /confirma HPXXXX [monto]\nEj: /confirma HPABC123 3750  (lo que entró)\nSin monto se asume el anticipo del 30 %.");
      {
        const [folioArg, montoArg] = arg.trim().split(/\s+/);
        const monto = montoArg ? Number(String(montoArg).replace(/[^\d.]/g, "")) : undefined;
        return handleConfirma(reply, folioArg.toUpperCase(), monto);
      }
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

async function handleConfirma(reply, folio, montoPagado) {
  const res = await confirmarReserva(folio, montoPagado);
  if (!res.ok) return reply(`❌ ${res.data?.error || "No se pudo confirmar."}`);
  const b = res.data;
  const mx = (n) => `$${Number(n).toLocaleString("es-MX")} MXN`;

  // ⚠️ El desglose de lo pagado y lo pendiente va SIEMPRE. Antes el mensaje
  // solo enseñaba el total y quien había dado el 30 % entendía que ya no debía
  // nada — se enteraba el día del tour, delante del guía.
  const dinero = b.liquidado
    ? `💰 *Total:* ${mx(b.totalAmount)}\n` +
      `✅ *Pagado:* ${mx(b.pagado)} — no queda nada pendiente\n\n`
    : `💰 *Total del viaje:* ${mx(b.totalAmount)}\n` +
      `✅ *Anticipo recibido:* ${mx(b.pagado)} (${b.pctPagado} %)\n` +
      `🕒 *Saldo pendiente:* ${mx(b.saldo)} — se liquida el día del tour, en efectivo o con tarjeta\n\n`;

  const msgCliente =
    `🎉 *¡Tu reserva está CONFIRMADA!*\n\n` +
    `📋 *Folio:* ${b.folio}\n` +
    `🗺️ *Tour:* ${b.tourName}\n` +
    `📅 *Fecha:* ${b.tourDate}\n` +
    `⏰ *Salida:* 8:30–9:00 AM\n` +
    `👥 *Personas:* ${b.adults} adulto(s)${b.children ? ` + ${b.children} niño(s)` : ""}\n` +
    dinero +
    `Te enviaremos el punto de encuentro exacto un día antes. Lleva ropa cómoda, calzado cerrado y protector solar. ¡Nos vemos pronto! 🌿`;

  if (b.customerPhone) {
    await client.sendMessage(`${digitsOnly(b.customerPhone)}@c.us`, msgCliente).catch(() => {});
    return reply(`✅ ${folio} confirmada${b.yaConfirmada ? " (ya lo estaba)" : ""}. Registrado: ${mx(b.pagado)} de ${mx(b.totalAmount)}${b.saldo > 0 ? ` · falta ${mx(b.saldo)}` : " · liquidado"}. Mensaje enviado a ${b.customerName}.`);
  }
  return reply(`✅ ${folio} confirmada. ⚠️ Sin teléfono guardado — copia y envía manualmente:\n\n${msgCliente}`);
}

// ── Arranque ──────────────────────────────────────────────────
console.log("🚀 Iniciando bot de Tours Huasteca Potosina…");
if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️ Falta ANTHROPIC_API_KEY");
if (!process.env.AGENT_API_TOKEN) console.warn("⚠️ Falta AGENT_API_TOKEN (reservas no funcionarán)");
client.initialize();
