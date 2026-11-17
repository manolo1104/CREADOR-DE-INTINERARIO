// ════════════════════════════════════════════════════════════════════
// SIMULADOR — probar el bot como si fuera WhatsApp, desde el navegador.
//
//   npm run chat                     → simulacro: NO escribe nada en el panel real
//   npm run chat -- --real           → habla con el sitio de verdad (crea folios reales)
//   npm run chat -- --modelo sonnet  → otro modelo SIN tocar el .env:
//                                      haiku55 | haiku | sonnet | opus | fable
//
// Usa el MISMO código que corre en producción: buffer.js para la espera de
// 15 s, agent.js para la conversación, medios.js para los comprobantes (y su
// orden: el acuse primero, la nota en su lugar y el filtro de la respuesta) y
// los textos de index.js para el aviso al dueño y la confirmación del pago. Lo
// único que cambia en modo simulacro es que el sitio está fingido
// (sitio-simulado.js, el mismo de test-chat.js) y que lo que le llegaría al
// WhatsApp del dueño se pinta como una burbuja «🔔 Aviso que le llegaría a
// Manolo».
//
// Cada respuesta dice cuánto costó y con qué modelo («costó $0.0031 ·
// Haiku»), y el panel lleva la cuenta de la plática: para comparar modelos
// con números y no a ojo.
//
// /confirma: en simulacro, contra el sitio fingido. En --real registra un
// cobro de verdad, así que SOLO corre si el sitio es local (SITE_API_URL en
// localhost, 127.0.0.1 o [::1]) Y está SIMULADOR_CONFIRMA=1: sirve para
// probar el correo de confirmación contra la base de prueba.
//
// La memoria del bot vive solo aquí, en memoria: el simulador nunca toca el
// archivo de producción (.wwebjs_auth/estado-bot.json). Las fotos de prueba
// van a una carpeta temporal del sistema.
// ════════════════════════════════════════════════════════════════════

require("dotenv").config();

// ── El modelo (--modelo): ANTES de requerir agent.js ──────────
// agent.js lee BOT_MODEL al cargarse (y index.js lo carga también): ponerlo
// después ya no cambiaría nada.
const MODELOS = {
  haiku55: "claude-haiku-5-5",
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
  fable: "claude-fable-5-1",
};
const MODELO_POR_OMISION = MODELOS.haiku55; // el de agent.js sin BOT_MODEL

/** `--modelo sonnet` o `--modelo=sonnet` → { id } · sin la opción → { id: null } · mal escrito → { error }. */
function leerModelo(args = []) {
  let dado = false;
  let valor = "";
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i]);
    if (a === "--modelo") {
      dado = true;
      valor = args[i + 1] && !String(args[i + 1]).startsWith("--") ? String(args[i + 1]) : "";
      break;
    }
    if (a.startsWith("--modelo=")) {
      dado = true;
      valor = a.slice("--modelo=".length);
      break;
    }
  }
  if (!dado) return { id: null };
  const v = valor.trim().toLowerCase();
  if (MODELOS[v]) return { id: MODELOS[v] };
  if (Object.values(MODELOS).includes(v)) return { id: v };
  return {
    error: `❌ --modelo ${valor || "(sin nombre)"}: no lo conozco.\n   Usa uno de estos: ${Object.entries(MODELOS).map(([k, id]) => `${k} (${id})`).join(" · ")}\n   Ej.: npm run chat -- --modelo sonnet`,
  };
}

const eleccion = leerModelo(process.argv.slice(2));
if (eleccion.error) {
  console.error(eleccion.error);
  process.exit(1);
}
if (eleccion.id) process.env.BOT_MODEL = eleccion.id;
const MODELO = process.env.BOT_MODEL || MODELO_POR_OMISION;

/** "claude-sonnet-5-5" → "Sonnet 5.5" · cualquier Haiku → "Haiku". */
function etiquetaModelo(id) {
  const t = String(id || "").toLowerCase();
  if (t.includes("haiku")) return "Haiku";
  const m = /claude-(sonnet|opus|fable)-(\d+)(?:-(\d{1,2})(?!\d))?/.exec(t);
  if (m) return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
  return String(id || "?");
}

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const agente = require("./agent");
const { processMessage, needsHuman, setApiClient, setToolObserver } = agente;
const { crearGestorDeRafagas } = require("./buffer");
const sessions = require("./sessions");
const { clearSession, getSession, pushHistory } = sessions;
const estado = require("./estado"); // sin iniciar(): solo en memoria
const medios = require("./medios");
const adjuntos = require("./adjuntos");
const horario = require("./horario");
const { crearSitioSimulado } = require("./sitio-simulado");
// Los textos de producción (aviso al dueño, confirmación al cliente, cómo se
// lee /confirma). Requerir index.js NO arranca WhatsApp: solo `node index.js`.
const textos = require("./index");

const PUERTO = Number(process.env.SIMULADOR_PORT || 3210);
const REAL = process.argv.includes("--real");
const CHAT = "simulador@c.us";
const NOMBRE_CLIENTE = "Cliente de prueba";
const PAUSA_ESCALACION_MS = Number(process.env.PAUSA_ESCALACION_MS) > 0 ? Number(process.env.PAUSA_ESCALACION_MS) : 12 * 60 * 60 * 1000;
const DIR_COMPROBANTES = path.join(os.tmpdir(), "bot-simulador-comprobantes");
const MAX_BYTES_COMPROBANTE = 5 * 1024 * 1024;
// Como index.js: una ráfaga de solo comprobantes sale a los 3 s, no a los 15.
const ESPERA_COMPROBANTE_MS = 3000;

// ── El sitio: fingido (simulacro) o el de verdad (--real) ─────
const sitio = REAL ? null : crearSitioSimulado();
const api = REAL ? require("./api-client") : sitio.api;
setApiClient(api);

// El MISMO sitio que usa api-client.js (lo lee al cargarse).
const SITIO_URL = process.env.SITE_API_URL || "http://localhost:3000";
/** ¿El sitio es esta compu? Por el NOMBRE del servidor (new URL), no por un texto: «https://localhost.mi-dominio.com» no lo es. */
function esSitioLocal(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}
function hostDe(url) {
  try { return new URL(url).host; } catch { return String(url || "(sin SITE_API_URL)"); }
}
// /confirma en --real registra un cobro de verdad: solo contra un sitio local
// Y con permiso explícito.
const CONFIRMA_REAL = REAL && esSitioLocal(SITIO_URL) && process.env.SIMULADOR_CONFIRMA === "1";

// Una foto de 1×1 que hace de «comprobante de prueba».
const FOTO_PRUEBA = {
  mimetype: "image/png",
  data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  filename: "comprobante-de-prueba.png",
};

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

// ── Cuánto cuesta cada respuesta (agent.js avisa en CADA llamada) ──
/** $0.0031 · $0.042 · $1.25 */
function usd(n) {
  const x = Number(n) || 0;
  if (x === 0) return "$0";
  if (x < 0.01) return `$${x.toFixed(4)}`;
  if (x < 1) return `$${x.toFixed(3)}`;
  return `$${x.toFixed(2)}`;
}
const costo = { turno: 0, llamadasTurno: 0, platica: 0, llamadas: 0, modelo: MODELO };
const textoPlatica = () => `Plática: ${usd(costo.platica)}${costo.llamadas ? ` (${costo.llamadas} llamada${costo.llamadas === 1 ? "" : "s"})` : ""}`;
const textoCostoTurno = () => `costó ${usd(costo.turno)} · ${etiquetaModelo(costo.modelo)}`;

if (typeof agente.setUsageObserver === "function") {
  agente.setUsageObserver(({ modelo, usage, costoUSD } = {}) => {
    let c = Number(costoUSD);
    if (!Number.isFinite(c)) {
      try { c = Number(agente.costoDeUso(modelo, usage)); } catch { c = 0; }
    }
    if (!Number.isFinite(c)) c = 0;
    costo.turno += c;
    costo.llamadasTurno++;
    costo.platica += c;
    costo.llamadas++;
    if (modelo) costo.modelo = modelo;
    const u = usage || {};
    console.log(`   💲 ${etiquetaModelo(modelo || MODELO)}: ${usd(c)} · entrada ${u.input_tokens || 0} · caché leída ${u.cache_read_input_tokens || 0} · caché escrita ${u.cache_creation_input_tokens || 0} · salida ${u.output_tokens || 0}`);
  });
} else {
  console.warn("⚠️  agent.js aún no trae setUsageObserver: el simulador no puede mostrar el costo.");
}

/** Lo que le llegaría al WhatsApp del dueño (texto o archivo con pie). */
async function alDueno(contenido, opciones) {
  const texto = typeof contenido === "string"
    ? contenido
    : `📎 ${(contenido && contenido.filename) || "archivo"}${opciones && opciones.caption ? `\n${opciones.caption}` : ""}`;
  emitir({ tipo: "dueno", texto });
  return true;
}

// Comprobantes: EL MISMO procesador de producción (medios.js).
const comprobantes = medios.createProofProcessor({
  api,
  almacen: estado,
  dir: DIR_COMPROBANTES,
  enviarAlDueno: alDueno,
  log: console,
});

/** Como en index.js: la ficha del viaje se entera del comprobante y del pago. Nunca rompe el flujo. */
function anotarEnFicha(funcion, ...args) {
  const fn = sessions[funcion];
  if (typeof fn !== "function") return;
  try { fn(...args); } catch (e) { console.warn(`⚠️ Ficha del viaje (${funcion}):`, e && e.message); }
}

// Comprobantes que llegaron y aún no entran a la ráfaga (se busca su
// cotización). Igual que index.js: si el modelo está contestando, su
// respuesta no sale pidiéndolo.
let comprobantesEnCamino = 0;
function comprobanteSinContestar(chatId) {
  if (comprobantesEnCamino > 0) return true;
  return Boolean(rafagas) && rafagas.elementosEnEspera(chatId).some((e) => e && e.tipo === "comprobante");
}
let ultimoAcuse = null; // { at, texto } · ver medios.esCharlaTrasAcuse

// ── Pausa (el chat lo atiende una persona) ────────────────────
function describirPausa(p) {
  if (!p) return "▶️ *Estado:* el bot sigue atendiendo este chat.";
  if (p.hasta === null) return "⏸️ *Estado:* bot en pausa en este chat hasta que escribas /reanuda";
  return `⏸️ *Estado:* bot en pausa ${textos.duracionTexto(Number(p.hasta) - Date.now())} · para que vuelva antes: /reanuda`;
}

function avisarPausa() {
  const p = estado.pausaVigente(CHAT);
  emitir({
    tipo: "pausa",
    activa: Boolean(p),
    texto: p
      ? `⏸️ Chat pasado a una persona (${textos.etiquetaMotivo(p.motivo || p.modo)}) · ${p.hasta === null ? "hasta /reanuda" : `${textos.duracionTexto(Number(p.hasta) - Date.now())}`}`
      : "",
  });
}

/** Como `pausar` de index.js: nunca acorta una pausa más larga que ya había. */
function pausar(chatId, { ms, indefinida = false, motivo, modo, acusarComprobantes = false }) {
  const previa = estado.pausaVigente(chatId);
  const hasta = indefinida ? null : Date.now() + ms;
  descartarRafaga(chatId, { acusar: acusarComprobantes });
  if (previa && (previa.hasta === null || (hasta !== null && Number(previa.hasta) >= hasta))) return previa;
  const p = estado.pausar(chatId, { hasta, motivo, modo, desde: previa ? previa.desde : Date.now() });
  avisarPausa();
  return p;
}

/** La pausa vigente, o null. Si ya venció, el bot retoma con la nota de siempre. */
function pausaActiva(chatId) {
  const p = estado.pausa(chatId);
  if (!p) return null;
  if (p.hasta !== null && p.hasta !== undefined && Number(p.hasta) <= Date.now()) {
    reanudar(chatId);
    return null;
  }
  return p;
}

function reanudar(chatId) {
  const habia = estado.quitarPausa(chatId);
  if (habia && getSession(chatId).history.length) {
    pushHistory(chatId, "user", "[sistema] El equipo atendió este chat en persona. El bot retoma aquí: sigue con naturalidad, sin mencionar esta nota.");
  }
  avisarPausa();
  return habia;
}

/**
 * Tira la ráfaga que esperaba, pero guarda en el historial lo que dijo el
 * cliente. Con `acusar` (la pausa la puso el bot), el comprobante que
 * esperaba recibe su acuse igual, uno por folio (como index.js).
 */
function descartarRafaga(chatId, { acusar = false } = {}) {
  const acusados = new Set();
  for (const el of (rafagas && rafagas.descartar(chatId)) || []) {
    if (el && el.tipo === "comprobante") {
      const clave = String(el.folio || "");
      if (acusar && el.ackText && !acusados.has(clave)) {
        acusados.add(clave);
        pushHistory(chatId, "user", medios.notaHistorialComprobante(el.folio));
        pushHistory(chatId, "assistant", el.ackText);
        emitir({ tipo: "bot", texto: el.ackText, pie: "acuse del comprobante (el chat pasó al equipo): sin modelo" });
      } else {
        pushHistory(chatId, "user", acusar
          ? medios.notaHistorialComprobante(el.folio, { acusado: acusados.has(clave) })
          : medios.notaHistorialComprobante(el.folio, { enPausa: true }));
      }
    } else if (el && el.tipo === "texto" && String(el.texto || "").trim()) {
      pushHistory(chatId, "user", String(el.texto).trim());
    }
  }
}

// ── Escalación (como aplicarEscalacion de index.js) ───────────
async function aplicarEscalacion(chatId, { textoCliente = "", respuestaBot = "" } = {}) {
  const s = getSession(chatId);
  if (!s.escalacion) return;
  const esc = { ...s.escalacion };
  s.escalacion = null;
  const modo = esc.modo === "pasar" ? "pasar" : "avisar";
  const urgencia = ["urgente", "hoy", "normal"].includes(esc.urgencia) ? esc.urgencia : "normal";
  const motivo = String(esc.motivo || "otro");
  const folio = esc.folio || s.lastFolio || null;

  let pausa = estado.pausaVigente(chatId);
  if (modo === "pasar") {
    pausa = textos.MOTIVOS_HASTA_REANUDA.has(motivo)
      ? pausar(chatId, { indefinida: true, motivo, modo: "escalacion", acusarComprobantes: true })
      : pausar(chatId, { ms: PAUSA_ESCALACION_MS, motivo, modo: "escalacion", acusarComprobantes: true });
  }

  let cotizacion = null;
  if (folio) {
    const r = await api.consultarReserva(folio);
    if (r && r.ok && r.data) {
      cotizacion = medios.normalizarCotizacion(r.data, folio);
      if (cotizacion) Object.assign(cotizacion, { adults: r.data.adults, children: r.data.children });
    }
  }
  await alDueno(textos.textoAvisoEscalacion({
    motivo, urgencia, resumen: esc.resumen, nombre: s.nombre || NOMBRE_CLIENTE, telefono: s.telefono,
    cotizacion, folio, textoCliente, respuestaBot, estadoTxt: describirPausa(pausa),
  }));
  const r = await api.escalacion({
    waChatId: chatId, telefono: s.telefono || undefined, nombre: s.nombre || undefined,
    motivo, modo, urgencia, resumen: esc.resumen || medios.recortar(textoCliente, 300), folio: folio || undefined,
  });
  if (!r.ok) emitir({ tipo: "aviso", texto: `La bitácora del panel no aceptó la escalación: ${(r.data && r.data.error) || r.status}` });
}

/** La regla rápida (needsHuman): como pasarPorRegla de index.js, sin gastar el modelo. */
async function pasarPorRegla(chatId, texto, textoHistorial = texto) {
  const s = getSession(chatId);
  const locale = s.locale || medios.idiomaProbable(texto) || medios.idiomaDeSesion(s);
  const espera = horario.mensajeEspera({ urgencia: "hoy", locale });
  const respuesta = locale === "en"
    ? `Of course! 🙌 I've passed your message on. ${espera} If you'd prefer a call, just tell me what time works for you. 🌿`
    : `¡Claro! 🙌 Ya pasé tu mensaje. ${espera} Si prefieres que te llamemos, dime a qué hora te queda bien. 🌿`;
  pushHistory(chatId, "user", textoHistorial);
  pushHistory(chatId, "assistant", respuesta);
  emitir({ tipo: "bot", texto: respuesta, pie: "regla rápida: sin modelo" });
  s.escalacion = {
    motivo: "pide_humano", modo: "pasar", urgencia: "hoy",
    resumen: "El cliente pidió hablar con una persona (o que le llamen).",
    folio: s.lastFolio || null, at: Date.now(),
  };
  await aplicarEscalacion(chatId, { textoCliente: texto, respuestaBot: respuesta });
}

// ── La espera, con el MISMO buffer.js de producción ───────────
let config = {
  esperaMs: Number(process.env.MESSAGE_DEBOUNCE_MS || 15000),
  topeMs: Number(process.env.MESSAGE_DEBOUNCE_MAX_MS || 90000),
};
let rafagas = null;

/** Lo que hace index.js con una ráfaga completa (atenderRafaga). */
async function atenderRafaga(chatId, texto, info = {}) {
  try {
    await atenderRafagaSinEstado(chatId, texto, info);
  } finally {
    emitir({ tipo: "estado", ...estadoSimulador() });
  }
}

async function atenderRafagaSinEstado(chatId, texto, info = {}) {
  const elementos = Array.isArray(info.elementos) ? info.elementos : (texto ? [{ tipo: "texto", texto }] : []);
  if (pausaActiva(chatId)) {
    for (const el of elementos) {
      if (el && el.tipo === "comprobante") pushHistory(chatId, "user", medios.notaHistorialComprobante(el.folio, { enPausa: true }));
      else if (el && el.tipo === "texto" && String(el.texto || "").trim()) pushHistory(chatId, "user", String(el.texto).trim());
    }
    return;
  }
  const s = getSession(chatId);
  if (!s.nombre) s.nombre = NOMBRE_CLIENTE;
  const plan = medios.prepararRafaga(elementos);

  // Como index.js: un comprobante que no cerró la ficha al llegar, la cierra
  // si en la misma ráfaga el cliente habló del pago («listo, ya pagué»).
  if (plan.huboComprobante && medios.hablaDePago(plan.textos)) {
    for (const el of elementos) {
      if (!el || el.tipo !== "comprobante" || !el.folio || el.marcado) continue;
      anotarEnFicha("marcarComprobanteEnFicha", chatId, el.folio);
      el.marcado = true;
    }
  }

  // 1) Acuses de los comprobantes: plantilla, sin modelo, antes que nada. Como
  // en index.js, NO entran al historial antes de lo que escribió el cliente:
  // su turno es `textoParaModelo`, con la nota del comprobante en su lugar.
  for (const acuse of plan.acuses) emitir({ tipo: "bot", texto: acuse, pie: "acuse del comprobante: sin modelo" });
  const textoAcuses = plan.acuses.join("\n\n");
  if (textoAcuses) ultimoAcuse = { at: Date.now(), texto: textoAcuses };

  // 2) Solo el comprobante, o el comprobante + «ya pagué / ahorita hago el
  // pago / gracias»: con el acuse basta.
  if (plan.huboComprobante && !plan.llamarModelo) {
    pushHistory(chatId, "user", plan.textoParaModelo);
    if (textoAcuses) pushHistory(chatId, "assistant", textoAcuses);
    if (plan.soloCharla && plan.textoUnido) {
      emitir({ tipo: "aviso", texto: "Solo habló del pago: con el acuse basta, no se llama al modelo (igual que en producción)." });
    }
    return;
  }
  if (!plan.textoUnido) return;

  // 3) «listo / gracias» justo tras el acuse, en su propia ráfaga.
  if (medios.esCharlaTrasAcuse(plan, ultimoAcuse, s.history)) {
    pushHistory(chatId, "user", plan.textoParaModelo);
    emitir({ tipo: "aviso", texto: "Acaba de recibir el acuse y solo dijo «listo / gracias»: no se llama al modelo (igual que en producción)." });
    return;
  }

  // 4) Pide a una persona o una llamada (regla rápida).
  if (needsHuman(plan.textoUnido)) {
    await pasarPorRegla(chatId, plan.textoUnido, plan.textoParaModelo);
    return;
  }

  // 5) El modelo.
  emitir({ tipo: "escribiendo", mensajes: info.mensajes, esperaMs: info.esperaMs });
  const t0 = Date.now();
  costo.turno = 0;
  costo.llamadasTurno = 0;
  let enviado = null;
  try {
    const respuesta = await processMessage(chatId, plan.textoParaModelo);
    enviado = respuesta;
    // El comprobante ya llegó (en esta ráfaga o MIENTRAS el modelo pensaba):
    // el MISMO filtro de index.js.
    const durante = comprobanteSinContestar(chatId);
    if (plan.huboComprobante || durante) {
      enviado = medios.filtrarRespuestaTrasComprobante(respuesta);
      if (enviado !== respuesta) {
        const corregido = medios.corregirRespuestaEnHistorial(getSession(chatId).history, respuesta, enviado || (plan.huboComprobante ? textoAcuses : ""));
        emitir({
          tipo: "aviso",
          texto: `🧾 ${durante ? "Llegó un comprobante mientras el bot contestaba" : "La ráfaga traía el comprobante"}: se quitó de la respuesta lo que pedía el pago o el comprobante${enviado ? "" : " (no quedó nada que mandar)"}${corregido ? "" : " · ⚠️ el historial no se pudo corregir"}.`,
        });
        console.log(`🧾 Respuesta filtrada (${durante ? "comprobante durante la respuesta" : "comprobante en la ráfaga"}):\n   antes: ${medios.recortar(respuesta, 300)}\n   sale:  ${medios.recortar(enviado, 300) || "(nada)"}`);
      }
    }
    const pieCosto = costo.llamadasTurno ? textoCostoTurno() : "";
    // Las fotos y el PDF que en WhatsApp salen antes del texto (adjuntos.js).
    for (const a of adjuntos.tomar(chatId)) {
      emitir({ tipo: "aviso", texto: a.tipo === "pdf" ? `📎 PDF: ${a.nombre || a.folio}` : `🖼️ Foto: ${a.caption || ""} · ${a.url}` });
    }
    if (enviado) {
      emitir({
        tipo: "bot", texto: enviado, mensajes: info.mensajes, esperaMs: info.esperaMs, pensoMs: Date.now() - t0,
        turnos: getSession(chatId).history.length, costo: pieCosto, platica: textoPlatica(),
      });
    } else {
      emitir({ tipo: "aviso", texto: `No salió respuesta del modelo: el acuse ya decía todo.${pieCosto ? ` (${pieCosto})` : ""}` });
    }
    if (pieCosto) console.log(`💲 Respuesta: ${pieCosto} · ${textoPlatica()}`);
  } catch (e) {
    // Lo mismo que fallaAlResponder: disculpa corta, pausa y aviso al dueño.
    const disculpa = medios.idiomaDeSesion(s) === "en"
      ? "Give me a moment, someone from our team will message you 🙏"
      : "Dame un momento, te escribe alguien del equipo 🙏";
    emitir({ tipo: "bot", texto: disculpa, pie: `el modelo falló${costo.llamadasTurno ? ` · ${textoCostoTurno()}` : ""}`, platica: textoPlatica() });
    emitir({ tipo: "error", texto: e.message });
    pausar(chatId, { ms: Number(process.env.HUMAN_TAKEOVER_MS) > 0 ? Number(process.env.HUMAN_TAKEOVER_MS) : 2 * 60 * 60 * 1000, motivo: "falla_bot", modo: "falla", acusarComprobantes: true });
    await alDueno(`⚠️ *El bot no pudo responder*\n🔎 Motivo: ${textos.resumirError(e)}\n👤 ${NOMBRE_CLIENTE}`);
  }
  // 6) Si el modelo pasó el chat al equipo (escalar_a_humano), se aplica DESPUÉS de contestar.
  await aplicarEscalacion(chatId, { textoCliente: plan.textoUnido, respuestaBot: enviado || null });
}

function montarGestor() {
  rafagas = crearGestorDeRafagas({
    debounceMs: config.esperaMs,
    maxMs: config.topeMs,
    esperaComprobantesMs: Math.min(ESPERA_COMPROBANTE_MS, config.esperaMs),
    onError: (e) => emitir({ tipo: "error", texto: e.message }),
    onAgendar: (_id, esperaMs, mensajes) => emitir({ tipo: "esperando", esperaMs, mensajes }),
    responder: atenderRafaga,
  });
}
montarGestor();

// ── Comprobante de prueba: el MISMO camino que una foto en WhatsApp ──
async function mandarComprobante(caption = "") {
  // Cuándo llegó: entra a la ráfaga hasta que se buscó su cotización, y con
  // esto queda en SU lugar (como index.js).
  const llegoAt = Date.now();
  comprobantesEnCamino++;
  try {
    const pie = medios.limpiarPie(caption);
    const s = getSession(CHAT);
    const pausa = pausaActiva(CHAT);
    const locale = s.locale || medios.idiomaProbable(pie) || medios.idiomaDeSesion(s);
    // La MISMA regla de index.js: cierra la ficha a cambios solo con señales de pago.
    const conSenalesDePago = medios.pareceComprobanteDePago({
      mimetype: FOTO_PRUEBA.mimetype,
      caption,
      history: s.history,
      textos: rafagas.elementosEnEspera(CHAT).filter((e) => e && e.tipo === "texto").map((e) => e.texto),
    });
    const r = await comprobantes.process({
      chatId: CHAT,
      nombre: s.nombre || NOMBRE_CLIENTE,
      telefono: s.telefono,
      // Sin «/noespago»: el simulador no tiene ese comando (en producción sí sale).
      numero: null,
      sessionFolio: s.lastFolio,
      media: { ...FOTO_PRUEBA },
      mimetype: FOTO_PRUEBA.mimetype,
      caption: pie,
      paused: Boolean(pausa),
      locale,
    });
    console.log(`🧾 Comprobante de prueba${r.folio ? ` · folio ${r.folio}` : " · sin cotización"}${r.folio && !conSenalesDePago ? " · sin señales de pago: la ficha sigue abierta" : ""}`);
    const marcado = Boolean(r.folio && conSenalesDePago);
    if (marcado) anotarEnFicha("marcarComprobanteEnFicha", CHAT, r.folio);
    if (pausa) {
      pushHistory(CHAT, "user", medios.notaHistorialComprobante(r.folio, { enPausa: true }));
      if (pie) pushHistory(CHAT, "user", pie);
      emitir({ tipo: "aviso", texto: "El chat está con una persona: no hay acuse al cliente, pero el aviso sí le llega al dueño." });
      return r;
    }
    rafagas.recibirElemento(CHAT, { tipo: "comprobante", folio: r.folio, ackText: r.ackText, duplicado: Boolean(r.duplicate), marcado, llegoAt });
    if (pie) rafagas.recibirElemento(CHAT, { tipo: "texto", texto: pie, llegoAt });
    return r;
  } finally {
    comprobantesEnCamino--;
  }
}

// ── /confirma, como lo escribiría el dueño ────────────────────
async function confirmar(textoComando) {
  const arg = String(textoComando || "").trim().replace(/^\/confirma\b/i, "").trim();
  const p = textos.parsearConfirma(arg);
  if (p.error) return alDueno(p.error);
  if (REAL && !CONFIRMA_REAL) {
    // En modo real registraría un cobro de verdad en Finanzas.
    const local = esSitioLocal(SITIO_URL);
    return alDueno([
      "⚠️ En modo --real, /confirma registra un cobro de verdad: solo corre contra un sitio LOCAL y con SIMULADOR_CONFIRMA=1.",
      `Ahora: sitio ${hostDe(SITIO_URL)} ${local ? "(local ✓)" : "(NO es local ✗)"} · SIMULADOR_CONFIRMA=${process.env.SIMULADOR_CONFIRMA === undefined ? "sin poner ✗" : `${process.env.SIMULADOR_CONFIRMA}${process.env.SIMULADOR_CONFIRMA === "1" ? " ✓" : " ✗"}`}`,
      "Para probarlo contra tu sitio de prueba: SITE_API_URL=http://localhost:<puerto> SIMULADOR_CONFIRMA=1 npm run chat -- --real",
      "Si no, confírmalo desde el WhatsApp del bot o el panel.",
    ].join("\n"));
  }

  let comprobante;
  let nota = `ℹ️ No tengo comprobante guardado de ${p.folio}.`;
  const comp = estado.ultimoComprobante(p.folio);
  if (comp) {
    try {
      const buf = fs.readFileSync(comp.path);
      if (buf.length <= MAX_BYTES_COMPROBANTE) {
        comprobante = { base64: buf.toString("base64"), mimetype: comp.mimetype || "application/octet-stream", filename: comp.filename || path.basename(comp.path) };
        nota = `📎 Comprobante adjunto: ${comprobante.filename}`;
      }
    } catch { nota = "⚠️ No encontré el archivo del comprobante."; }
  }

  await alDueno(`⏳ Confirmando ${p.folio} por ${medios.mx(p.monto)} (${p.metodo})${REAL ? ` en ${hostDe(SITIO_URL)} (sitio local)` : ""}…`);
  const res = await api.confirmarReserva(p.folio, p.monto, { metodo: p.metodo, comprobante, confirmadoPor: "manolo", forzar: p.forzar });
  if (!res.ok) return alDueno(`❌ ${p.folio}: ${(res.data && res.data.error) || `el sitio respondió ${res.status}`}`);
  const b = res.data || {};
  // El pago ya es un hecho: la ficha lo sabe (como index.js).
  anotarEnFicha("marcarPagoEnFicha", CHAT, p.folio, b.reservaFolio || null);
  // Lo que dijo el sitio del archivo (igual que index.js): «adjunto» no es «guardado».
  if (comprobante && b.comprobanteGuardado === true) nota = `📎 Comprobante guardado en el panel: ${comprobante.filename}`;
  else if (comprobante && b.comprobanteGuardado === false) nota = `⚠️ El comprobante NO quedó en el panel (${comprobante.filename}): súbelo a mano.`;
  const s = getSession(CHAT);
  const locale = b.locale === "en" || b.locale === "es" ? b.locale : medios.idiomaDeSesion(s);
  const mensaje = b.yaConfirmada ? textos.textoPagoRegistrado(b, locale) : textos.textoConfirmacionCliente(b, locale);

  // Lo que recibe el cliente, y lo que queda en su historial (igual que index.js).
  emitir({ tipo: "bot", texto: mensaje, pie: "confirmación de /confirma" });
  if (b.reservaFolio) s.lastFolio = b.reservaFolio;
  if (Number.isFinite(Number(b.saldo))) s.saldoPendiente = Math.max(0, Math.round(Number(b.saldo)));
  pushHistory(CHAT, "user",
    `[sistema] El equipo validó el pago de ${p.folio}${b.reservaFolio && b.reservaFolio !== p.folio ? ` (reserva ${b.reservaFolio})` : ""}: pagado ${medios.mx(b.pagado)}, saldo ${medios.mx(b.saldo)}. Ya se le mandó la confirmación.` +
    (b.pideHospedaje ? ` Se le preguntó en qué hotel se hospeda: cuando lo diga, llama escalar_a_humano (recogida, avisar, normal) con el hotel y el folio ${b.reservaFolio || p.folio}.` : ""));
  pushHistory(CHAT, "assistant", mensaje);

  return alDueno([
    b.yaConfirmada
      ? `✅ ${b.reservaFolio || p.folio}: pago registrado.`
      : `✅ ${p.folio}${b.reservaFolio && b.reservaFolio !== p.folio ? ` → reserva ${b.reservaFolio}` : ""} confirmada.`,
    `💵 Registrado ${medios.mx(p.monto)} (${p.metodo}) · pagado ${medios.mx(b.pagado)} de ${medios.mx(b.totalAmount)}${Number(b.saldo) > 0 ? ` · falta ${medios.mx(b.saldo)}` : " · liquidado"}`,
    nota,
    ...(b.emailEnviado === true ? ["📧 Correo de confirmación enviado."] : []),
    ...(Array.isArray(b.avisos) ? b.avisos.filter(Boolean).map((a) => `⚠️ ${a}`) : []),
    `📨 Mensaje enviado a ${b.customerName || NOMBRE_CLIENTE}.`,
  ].join("\n"));
}

// ── Servidor ──────────────────────────────────────────────────
function leerCuerpo(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => { d += c; });
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
  });
}

function json(res, datos) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(datos));
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  try {
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
      res.write(`data: ${JSON.stringify({ tipo: "listo", ...estadoSimulador() })}\n\n`);
      navegadores.add(res);
      const latido = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* */ } }, 20000);
      req.on("close", () => { clearInterval(latido); navegadores.delete(res); });
      return;
    }

    if (url.pathname === "/mensaje" && req.method === "POST") {
      const { texto } = await leerCuerpo(req);
      if (texto && texto.trim()) {
        console.log(`👤 ${texto}`);
        if (pausaActiva(CHAT)) {
          // Como en producción: no contesta, pero guarda lo que dijo.
          pushHistory(CHAT, "user", texto.trim());
          emitir({ tipo: "aviso", texto: "⏸️ El chat está con una persona: el bot no contesta, pero lo guarda en el historial. Usa «Reanudar» para que vuelva." });
        } else {
          rafagas.recibir(CHAT, texto.trim());
        }
      }
      res.writeHead(204); return res.end();
    }

    if (url.pathname === "/comprobante" && req.method === "POST") {
      const { caption } = await leerCuerpo(req);
      const r = await mandarComprobante(caption || "");
      return json(res, { folio: r.folio || null });
    }

    if (url.pathname === "/confirma" && req.method === "POST") {
      const { texto } = await leerCuerpo(req);
      await confirmar(texto);
      return json(res, estadoSimulador());
    }

    if (url.pathname === "/reanudar" && req.method === "POST") {
      const habia = reanudar(CHAT);
      emitir({ tipo: "aviso", texto: habia ? "▶️ Bot reactivado (recuerda la conversación)." : "El chat no estaba en pausa." });
      return json(res, estadoSimulador());
    }

    if (url.pathname === "/config" && req.method === "POST") {
      const { esperaMs, topeMs } = await leerCuerpo(req);
      if (esperaMs) config.esperaMs = Number(esperaMs);
      if (topeMs) config.topeMs = Number(topeMs);
      rafagas.descartar(CHAT);
      montarGestor();
      return json(res, estadoSimulador());
    }

    if (url.pathname === "/reiniciar" && req.method === "POST") {
      rafagas.descartar(CHAT);
      clearSession(CHAT);
      estado.quitarPausa(CHAT);
      avisarPausa();
      Object.assign(costo, { turno: 0, llamadasTurno: 0, platica: 0, llamadas: 0, modelo: MODELO });
      ultimoAcuse = null;
      console.log("♻️  conversación reiniciada");
      return json(res, estadoSimulador());
    }

    res.writeHead(404); res.end("no está");
  } catch (e) {
    console.error("❌ simulador:", e && e.message);
    emitir({ tipo: "error", texto: e.message });
    if (!res.headersSent) { res.writeHead(500); res.end(); }
  }
});

/** La ficha del viaje como la ve el modelo (sessions.js), o "" si aún no hay. */
function fichaDe(s) {
  if (typeof sessions.fichaComoTexto !== "function" || !s) return "";
  try { return String(sessions.fichaComoTexto(s.ficha, s.locale) || ""); } catch { return ""; }
}

function estadoSimulador() {
  const s = getSession(CHAT);
  const p = estado.pausaVigente(CHAT);
  return {
    modo: REAL ? "real" : "simulacro",
    modelo: MODELO,
    modeloEtiqueta: etiquetaModelo(MODELO),
    esperaMs: config.esperaMs,
    topeMs: config.topeMs,
    turnos: s.history.length,
    folio: (s.ficha && s.ficha.folioVigente) || s.lastFolio || null,
    pausa: p ? { motivo: textos.etiquetaMotivo(p.motivo || p.modo), hasta: p.hasta } : null,
    sitio: REAL ? SITIO_URL : null,
    confirmaReal: CONFIRMA_REAL,
    platica: textoPlatica(),
    ficha: fichaDe(s),
  };
}

// Solo esta compu, salvo que se pida otra cosa con SIMULADOR_HOST (p. ej.
// 0.0.0.0 para abrirlo desde el teléfono en la misma red). 🔴 Escuchaba en
// todas las interfaces: en una red compartida cualquiera podía mandar
// /mensaje en bucle (gasta API, con --modelo fable a $10/$50 por MTok) o
// /confirma en --real (registra cobros en el sitio de prueba).
const HOST = String(process.env.SIMULADOR_HOST || "127.0.0.1").trim() || "127.0.0.1";

servidor.listen(PUERTO, HOST, () => {
  console.log("\n════════════════════════════════════════════");
  console.log("  SIMULADOR DEL BOT — Tours Huasteca");
  console.log("════════════════════════════════════════════");
  console.log(`  Abre:    http://localhost:${PUERTO}${HOST === "127.0.0.1" || HOST === "localhost" ? "" : `  (escucha en ${HOST}: abierto a la red)`}`);
  console.log(`  Modo:    ${REAL ? `🔴 REAL — crea folios de verdad en ${hostDe(SITIO_URL)}` : "🟢 SIMULACRO — no toca el panel"}`);
  console.log(`  Modelo:  ${MODELO} (${etiquetaModelo(MODELO)})${eleccion.id ? " — elegido con --modelo" : process.env.BOT_MODEL ? " — del .env" : " — el de siempre"}`);
  if (typeof agente.configModelo === "function") {
    try {
      const c = agente.configModelo(MODELO) || {};
      const razona = c.thinking ? JSON.stringify(c.thinking) : "sin campo";
      const esfuerzo = (c.output_config && c.output_config.effort) || "—";
      console.log(`           razonamiento: ${razona} · esfuerzo: ${esfuerzo} · max_tokens: ${c.max_tokens ?? "?"}`);
    } catch { /* solo informativo */ }
  }
  console.log(`  Espera:  ${config.esperaMs / 1000}s (tope ${config.topeMs / 1000}s; solo comprobante: ${Math.min(ESPERA_COMPROBANTE_MS, config.esperaMs) / 1000}s)`);
  if (REAL) {
    console.log(`  /confirma: ${CONFIRMA_REAL ? "✅ activo contra el sitio LOCAL (registra cobros y manda el correo de prueba)" : "⛔ apagado (solo con SITE_API_URL local y SIMULADOR_CONFIRMA=1)"}`);
  }
  console.log("\n  Ctrl+C para salir.\n");
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️  Falta ANTHROPIC_API_KEY en .env — el bot no va a poder contestar.\n");
});
