// ════════════════════════════════════════════════════════════════════
// SIMULADOR — probar el bot como si fuera WhatsApp, desde el navegador.
//
//   npm run chat            → simulacro: NO escribe nada en el panel real
//   npm run chat -- --real  → habla con el sitio de verdad (crea folios reales)
//
// Usa el MISMO código que corre en producción: buffer.js para la espera de
// 30 s y agent.js para la conversación. Lo único que cambia en modo simulacro
// es que las llamadas al sitio están fingidas.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

const { processMessage, needsHuman, setApiClient, setToolObserver } = require("./agent");
const { crearGestorDeRafagas } = require("./buffer");
const { clearSession, getSession } = require("./sessions");
const { findTour, calcPrecio } = require("./catalog");

const PUERTO = Number(process.env.SIMULADOR_PORT || 3210);
const REAL = process.argv.includes("--real");
const CHAT = "simulador@c.us";

// ── Modo simulacro: el sitio está fingido ─────────────────────
// Devuelve lo mismo que devolvería el sitio, con un folio de mentiras, para
// que el embudo llegue hasta el final sin ensuciar el panel.
if (!REAL) {
  let n = 0;
  const folio = () => `HPSIM${String(++n).padStart(3, "0")}`;
  const banco = {
    banco: process.env.BANK_NAME || "Inbursa",
    titular: process.env.BANK_TITULAR || "Manuel Arturo Covarrubias Martinez",
    clabe: process.env.BANK_CLABE || "036180500744560342",
  };
  const fmx = (n) => `$${Number(n).toLocaleString("es-MX")}`;
  const fechaLarga = (d) => {
    if (!d) return "";
    const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  /** Misma forma que el resumen que arma el sitio en /api/bot/quote y /api/bot/paquete. */
  const resumen = ({ folio, items, total, anticipo, hosp }) => [
    `📋 *Tu cotización* — folio ${folio}`,
    "",
    ...items.map((i, n) => `*${items.length > 1 ? `Día ${n + 1} · ` : ""}${fechaLarga(i.fecha)}*\n${i.nombre}\n${i.personas} persona${i.personas !== 1 ? "s" : ""} · ${fmx(i.subtotal)}`),
    ...(hosp ? ["", `*Hospedaje:* ${hosp.habitacion} · ${hosp.noches} noche${hosp.noches !== 1 ? "s" : ""} (la tarifa la confirma el equipo hoy mismo)`] : []),
    "",
    `*Total${hosp ? " de los tours" : ""}: ${fmx(total)} MXN*`,
    `*Apartas hoy con ${fmx(anticipo)}* (30 %) y el resto (${fmx(total - anticipo)}) lo liquidas el día del recorrido.`,
    "",
    "Pasamos por ustedes a su hospedaje, en Xilitla o en Ciudad Valles.",
    "Cancelas gratis hasta 48 h antes, con reembolso completo.",
    "",
    `⏳ Esta cotización tiene vigencia de *48 horas*.`,
    "",
    `⚠️ Al hacer la transferencia, pon *${folio}* como concepto.`,
  ].join("\n");

  setApiClient({
    crearCotizacion: async (p) => {
      const t = findTour(p.tourSlug);
      const { total } = calcPrecio(t.precio, p.adults || 1, p.childrenMid || 0, p.childrenSmall || 0);
      const f = folio();
      const anticipo = Math.round(total * 0.3);
      return { ok: true, status: 200, data: {
        folio: f, total, moneda: "MXN", tourName: t.nombre, tourDate: p.tourDate,
        anticipo, saldo: total - anticipo, emailEnviado: Boolean(p.email),
        datosBanco: banco, linkPago: `https://www.huasteca-potosina.com/reservar-tour/${t.slug}`,
        // La cotización de un tour suelto también se manda por WhatsApp.
        resumenWhatsApp: resumen({
          folio: f, total, anticipo, hosp: null,
          items: [{ nombre: t.nombre, fecha: p.tourDate, personas: p.adults || 1, subtotal: total }],
        }),
      } };
    },
    registrarLead: async () => ({ ok: true, status: 200, data: { folio: folio(), emailEnviado: true } }),
    cotizarPaquetePersonalizado: async (p) => {
      const f = folio();
      // Antes devolvía total 0 y el texto "(simulacro: el resumen real lo arma
      // el sitio)". El bot LEÍA eso y se lo soltaba al cliente —"el sistema me
      // devolvió que es un simulacro"— además de inventarse los totales. Aquí
      // se arma un resumen de la misma forma que el sitio, con los precios del
      // catálogo, para poder probar de verdad la cotización por WhatsApp.
      const items = (p.items || []).map((it) => {
        const t = findTour(it.slug);
        const { total } = calcPrecio(t.precio, it.adultos || 1, it.ninosMid || 0, it.ninosSmall || 0);
        return { nombre: t.nombre, fecha: it.tourDate, personas: (it.adultos || 1) + (it.ninosMid || 0) + (it.ninosSmall || 0), subtotal: total };
      });
      const total = items.reduce((a, i) => a + i.subtotal, 0);
      const anticipo = Math.round(total * 0.3);
      const hosp = p.hospedaje && p.hospedaje.interesado ? p.hospedaje : null;
      return { ok: true, status: 200, data: {
        folio: f, total, anticipo, saldo: total - anticipo, moneda: "MXN",
        emailEnviado: Boolean(p.customerEmail),
        resumenWhatsApp: resumen({ folio: f, items, total, anticipo, hosp }),
      } };
    },
    confirmarReserva: async (f) => ({ ok: true, status: 200, data: { folio: f } }),
    consultarReserva: async (f) => ({ ok: true, status: 200, data: {
      folio: f, status: "pending", tourName: "Expedición Tamul", tourDate: "2026-09-20",
      adults: 2, children: 0, totalAmount: 3100,
      resumenPago: "Pagado: $930 MXN · Falta: $2,170 MXN el día del recorrido",
    } }),
    checkHotelAvailability: async () => ({ ok: true, status: 200, data: { available: true, rooms: [] } }),
  });
}

// ── Canal hacia el navegador (SSE) ────────────────────────────
const navegadores = new Set();
function emitir(evento) {
  const linea = `data: ${JSON.stringify(evento)}\n\n`;
  for (const res of navegadores) { try { res.write(linea); } catch { /* se fue */ } }
}

setToolObserver((nombre, entrada, salida) => {
  const resumen = salida && salida.error
    ? `⛔ ${salida.error}`
    : JSON.stringify(salida).replace(/\s+/g, " ").slice(0, 180);
  emitir({ tipo: "herramienta", nombre, entrada: JSON.stringify(entrada), salida: resumen });
});

// ── La espera, con el MISMO buffer.js de producción ───────────
let config = {
  esperaMs: Number(process.env.MESSAGE_DEBOUNCE_MS || 15000),
  topeMs: Number(process.env.MESSAGE_DEBOUNCE_MAX_MS || 90000),
};
let rafagas;

function montarGestor() {
  rafagas = crearGestorDeRafagas({
    debounceMs: config.esperaMs,
    maxMs: config.topeMs,
    onError: (e) => emitir({ tipo: "error", texto: e.message }),
    onAgendar: (_id, esperaMs, mensajes) => emitir({ tipo: "esperando", esperaMs, mensajes }),
    responder: async (chatId, texto, info) => {
      if (needsHuman(texto)) {
        emitir({ tipo: "bot", texto: "¡Claro! 🙌 En un momento te atiende una persona de nuestro equipo. Déjame tus dudas por aquí y te contactamos lo antes posible. 🌿" });
        emitir({ tipo: "aviso", texto: "El cliente pidió un humano: en producción el bot se pausa 5 min en ese chat y te llega un aviso a tu WhatsApp." });
        return;
      }
      emitir({ tipo: "escribiendo", mensajes: info.mensajes, esperaMs: info.esperaMs });
      const t0 = Date.now();
      const respuesta = await processMessage(chatId, texto);
      emitir({ tipo: "bot", texto: respuesta, mensajes: info.mensajes, esperaMs: info.esperaMs, pensoMs: Date.now() - t0, turnos: getSession(chatId).history.length });
    },
  });
}
montarGestor();

// ── Servidor ──────────────────────────────────────────────────
function leerCuerpo(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; });
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);

  if (url.pathname === "/") {
    const html = fs.readFileSync(path.join(__dirname, "simulador.html"), "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  if (url.pathname === "/eventos") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ tipo: "listo", ...estado() })}\n\n`);
    navegadores.add(res);
    const latido = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* */ } }, 20000);
    req.on("close", () => { clearInterval(latido); navegadores.delete(res); });
    return;
  }

  if (url.pathname === "/mensaje" && req.method === "POST") {
    const { texto } = await leerCuerpo(req);
    if (texto && texto.trim()) {
      console.log(`👤 ${texto}`);
      rafagas.recibir(CHAT, texto.trim());
    }
    res.writeHead(204); return res.end();
  }

  if (url.pathname === "/config" && req.method === "POST") {
    const { esperaMs, topeMs } = await leerCuerpo(req);
    if (esperaMs) config.esperaMs = Number(esperaMs);
    if (topeMs) config.topeMs = Number(topeMs);
    rafagas.descartar(CHAT);
    montarGestor();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(estado()));
  }

  if (url.pathname === "/reiniciar" && req.method === "POST") {
    rafagas.descartar(CHAT);
    clearSession(CHAT);
    console.log("♻️  conversación reiniciada");
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(estado()));
  }

  res.writeHead(404); res.end("no está");
});

function estado() {
  const s = getSession(CHAT);
  return {
    modo: REAL ? "real" : "simulacro",
    modelo: process.env.BOT_MODEL || "claude-haiku-4-5",
    esperaMs: config.esperaMs,
    topeMs: config.topeMs,
    turnos: s.history.length,
    sitio: REAL ? (process.env.SITE_API_URL || "http://localhost:3000") : null,
  };
}

servidor.listen(PUERTO, () => {
  console.log("\n════════════════════════════════════════════");
  console.log("  SIMULADOR DEL BOT — Tours Huasteca");
  console.log("════════════════════════════════════════════");
  console.log(`  Abre:    http://localhost:${PUERTO}`);
  console.log(`  Modo:    ${REAL ? "🔴 REAL — crea folios de verdad en el panel" : "🟢 SIMULACRO — no toca el panel"}`);
  console.log(`  Modelo:  ${process.env.BOT_MODEL || "claude-haiku-4-5"}`);
  console.log(`  Espera:  ${config.esperaMs / 1000}s (tope ${config.topeMs / 1000}s)`);
  console.log("\n  Ctrl+C para salir.\n");
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️  Falta ANTHROPIC_API_KEY en .env — el bot no va a poder contestar.\n");
});
