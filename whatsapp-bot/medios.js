// ════════════════════════════════════════════════════════════════════
// Fotos, PDF, audios y ubicaciones que manda el cliente; comprobantes de pago.
//
// Antes index.js tiraba todo mensaje sin texto: el comprobante del pago (13 de
// 26 chats reales pagaron por transferencia con captura) se quedaba sin
// respuesta y el equipo no se enteraba. Justo al pagar, silencio.
//
// Flujo de un comprobante:
//   llega la foto o el PDF → se busca su cotización (folio de la sesión y, si
//   no, /api/bot/cotizacion-activa) → se guarda el archivo en el volumen
//   (COMPROBANTES_DIR/<folio>-<n>.<ext>) para que /confirma lo suba al panel →
//   aviso al dueño con el archivo y el comando listo → acuse al cliente con
//   total, anticipo y saldo: «lo validamos y te mando tu confirmación».
//   🔴 NUNCA dice «confirmada»: un comprobante editado sería un lugar regalado.
//   El pago lo valida Manolo en su banco y lo confirma con /confirma.
//
// Es el proof-handler.js del bot del hotel (Camila, en producción desde el
// 12 sep) pasado a CommonJS y a los folios de Tours. Sin WhatsApp ni red: los
// envíos, el sitio y el almacén se inyectan, y los textos son funciones puras
// exportadas para probarlos con test-medios.js.
// ════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const { fechaMexico, sumarDias } = require("./horario");

// ── Clasificación del archivo que llega ─────────────────────

const FISCAL_RE = /constancia|situaci[oó]n fiscal|\brfc\b|factura|cfdi/i;
// "pag" suelto atrapaba «página» y «pagar»: solo formas de YA haber pagado, con
// límites Unicode (\b de JS no sirve después de «é», así que «ya pagué» no
// entraría con \b). Más las palabras del pago en inglés.
const PAYMENT_RE = /(?<![\p{L}])pag(?:o|os|u[eé]|ad[oa]s?|amos|aron|aste)(?![\p{L}])|comprobante|transfer|dep[oó]sit|spei|oxxo|ticket|recibo|voucher|receipt|(?<![\p{L}])paid(?![\p{L}])|payment/iu;
// Preguntas que SÍ son del pago aunque no digan «pagué»: «¿ya les llegó?»,
// «¿así está bien?», «¿me confirman?». Una foto con otra pregunta («¿es aquí
// el punto de encuentro?») se contesta como texto aunque haya una cotización
// pendiente: antes recibía «Recibimos tu comprobante» y el dueño un aviso de pago.
const PREGUNTA_PAGO_RE = /lleg[oóa]|recib|est[aá] bien|qued[oó]|list[oa]|confirm|reflej|correct|deposit|transfer|abon|cuenta|clabe|monto|cantidad/i;
// Un documento sin texto suele traer como «pie» solo su nombre ("IMG_2034.jpg"):
// eso no lo escribió el cliente.
const BARE_FILENAME_RE = /^[^\s/\\]+\.(jpe?g|png|webp|gif|heic|heif|pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|mp4|mov|3gp|opus|ogg|mp3|m4a|aac|wav)$/i;

/** 'image/jpeg' → 'image', 'application/pdf' → 'pdf', lo demás → null */
function mediaKind(mimetype) {
  const m = String(mimetype || "").toLowerCase().trim();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || m.startsWith("application/pdf;")) return "pdf";
  return null;
}

/** Texto real que acompaña a un archivo ('' si solo es el nombre del archivo). */
function limpiarPie(caption) {
  const t = String(caption ?? "").trim();
  return BARE_FILENAME_RE.test(t) ? "" : t;
}

/**
 * ¿Qué hacer con un archivo entrante?
 *   'proof'       → comprobante: se procesa con createProofProcessor
 *   'text'        → se contesta como texto usando el pie de foto
 *   'unsupported' → «solo puedo leer texto, fotos o PDF»
 * messageType (msg.type de whatsapp-web.js): un 'sticker' llega como
 * image/webp y no es un comprobante.
 */
function classifyIncomingMedia({ mimetype, caption, hasPendingQuote = false, messageType } = {}) {
  const rawCap = String(caption || "").trim();
  const cap = BARE_FILENAME_RE.test(rawCap) && !PAYMENT_RE.test(rawCap) && !FISCAL_RE.test(rawCap) ? "" : rawCap;
  const kind = String(messageType || "").toLowerCase() === "sticker" ? null : mediaKind(mimetype);
  if (!kind) return cap ? "text" : "unsupported";
  // Constancia fiscal / factura: es un trámite, no un pago. Pero si el texto
  // también habla del pago («te mando el comprobante, ¿me facturan?») sí lo es.
  if (cap && FISCAL_RE.test(cap) && !PAYMENT_RE.test(cap)) return "text";
  if (!cap || PAYMENT_RE.test(cap)) return "proof";
  // Una pregunta que no es del pago se contesta como texto, haya o no cotización.
  if (/[?¿]/.test(cap) && !PREGUNTA_PAGO_RE.test(cap)) return "text";
  if (hasPendingQuote) return "proof";
  return "text";
}

// ── ¿El archivo SÍ es un pago? ──────────────────────────────
// Todo archivo sin pie con una cotización abierta se trata como comprobante
// (acuse al cliente y aviso al dueño): es el caso más común y no se pierde
// ninguno. Pero para CERRAR la ficha a cambios (ya no recotiza ni da datos de
// pago) hacen falta señales de pago. 🔴 Una foto de la cascada o la captura
// de un tour dejaba el chat sin cotizaciones hasta que alguien hiciera /olvida.

// Habla de pagar, en presente, pasado o futuro («ahorita hago el pago», «voy a
// transferir», «ya deposité»). Sin «pago» de «tu pago»: los resúmenes del bot
// dicen «Concepto de tu pago» y no cuentan (solo se revisa lo del cliente).
const HABLA_DE_PAGO_RE = /(?<![\p{L}])(?:pag(?:ar|o|os|u[eé]|ad[oa]s?|amos|aron|aste|ando|ar[eé]|aremos)|transfer\p{L}*|deposit\p{L}*|dep[oó]sito|spei|oxxo|anticipo|comprobante|voucher|paid|pay|paying|payment|receipt)(?![\p{L}])/iu;

/** ¿Alguno de estos textos del cliente habla del pago? Sin las notas «[sistema] …» ni lo que va entre corchetes. */
function hablaDePago(textos = []) {
  return (Array.isArray(textos) ? textos : [textos]).some((t) => {
    const limpio = String(t ?? "")
      .split("\n")
      .filter((l) => !/^\s*\[sistema\]/i.test(l))
      .join("\n")
      .replace(/\[[^\]]*\]/g, " ");
    return HABLA_DE_PAGO_RE.test(limpio);
  });
}

/**
 * ¿Hay señales de que el archivo SÍ es un pago? Decide si el comprobante
 * cierra la ficha del viaje a cambios (index.js, simulador.js). Sí con:
 *  · un PDF (las fotos del paseo no llegan en PDF);
 *  · un pie que habla del pago («ya pagué», «comprobante», «transferencia»);
 *  · el pago en lo último de la plática: lo que el cliente escribió en la
 *    ráfaga que espera (`textos`) o en sus últimos mensajes, o los datos
 *    bancarios (la CLABE) que el bot ya le mandó.
 * Una foto suelta sin nada de eso es «posible comprobante»: el acuse y el
 * aviso salen igual, pero el bot sigue cotizando.
 */
function pareceComprobanteDePago({ mimetype, caption, history, textos = [] } = {}) {
  if (mediaKind(mimetype) === "pdf") return true;
  if (PAYMENT_RE.test(String(caption || ""))) return true;
  if (hablaDePago(textos)) return true;
  const recientes = (Array.isArray(history) ? history : []).slice(-6);
  const { clabe } = firmasDatosPago();
  return recientes.some((m) => {
    if (!m) return false;
    const t = textoDeTurno(m);
    if (!t) return false;
    if (m.role === "assistant") return clabe.length >= 10 && digitsOnly(t).includes(clabe);
    return m.role === "user" && hablaDePago([t]);
  });
}

// ── ¿El cliente solo habló del pago? ────────────────────────
// Si en la ráfaga del comprobante solo dijo «ya pagué / ahí va / gracias»,
// basta con el acuse y no se gasta una llamada al modelo. Si preguntó o habló
// de otra cosa, el bot también le contesta.
// También lo que se dice ANTES de pagar («ahorita hago el pago», «voy a
// transferir»): junto con la foto del comprobante ya no pide nada. Con
// «ahorita hago el pago» + la foto, el modelo contestó «cuando hagas la
// transferencia mándanos el comprobante» (prueba de Manolo, 6 oct).

const CHATTER_WORDS = new Set(`
  ya le te les se lo la el los las de del mi su tu un una y e con por para al a en que
  aqui ahi alli alla va van esta estan queda quedo quedamos listo lista listos listas
  ok okay oki okey vale sale perfecto perfecta excelente super genial claro si
  gracias muchas mil muy amable amables saludos hola buen buena buenas buenos dia dias tardes noches
  pague pagado pagada pago pagos deposite deposito depositado transferi transferencia transferido
  hice hecho hecha realice realizado realizada envie enviado enviada enviados mande mandado mando envio
  comparto compartido paso adjunto adjunta adjuntos comprobante comprobantes captura capturas foto fotos
  pdf archivo ficha voucher recibo ticket spei oxxo anticipo reserva reservacion folio cotizacion
  liga link tarjeta atento atenta atentos pendiente pendientes espero confirmacion favor porfa porfavor
  bendiciones igualmente ahorita momento seria todo eso
  hago hacemos hare haremos hacer voy vamos pagar pagamos pagando realizo realizamos
  mandamos enviamos transfiero transferimos depositamos orita enseguida rato momentito
  hi hello hey good morning afternoon evening thanks thank you i ive i've have has just already
  here is it this the my our your of for and a an to sent paid done payment receipt proof
  transfer transferred deposit deposited attached please great perfect all set
  i'll will now paying making send sending
`.trim().split(/\s+/));

function normalizarCharla(linea) {
  return String(linea).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isPaymentChatterOnly(texts = []) {
  const lines = (Array.isArray(texts) ? texts : [texts])
    .flatMap((t) => String(t ?? "").split(/\n+/))
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (/[?¿]/.test(line)) return false; // cualquier pregunta se contesta
    const words = normalizarCharla(line)
      .replace(/[^a-z0-9ñ'\s]/g, " ") // emojis y signos fuera
      .split(/\s+/)
      .filter(Boolean);
    if (words.some((w) => !CHATTER_WORDS.has(w))) return false;
  }
  return true;
}

// ── Idioma para las plantillas ──────────────────────────────
// agent.js deja `session.locale` cuando lo nota. Para las plantillas que salen
// sin modelo (acuse, audio, error) y antes de que lo note, una cuenta simple.

const PALABRAS_EN = new Set("hi hello hey the and is are i i'm im we you your would like how much please thanks thank what when where can could do does book booking price available availability people tomorrow today we're i'd want".split(" "));
const PALABRAS_ES = new Set("hola el la los las que para por cuanto cuánto personas gracias buenas buenos dias días mañana manana reservar quiero somos tienen hay precio como cómo donde dónde cuando cuándo pague pagué".split(" "));

/** "en" / "es" según las palabras del texto; null si no se nota. */
function idiomaProbable(texto) {
  const limpio = String(texto || "").toLowerCase().replace(/\[[^\]]*\]/g, " ");
  let en = 0, es = 0;
  for (const w of limpio.split(/[^a-záéíóúüñ']+/)) {
    if (!w) continue;
    if (PALABRAS_EN.has(w)) en++;
    if (PALABRAS_ES.has(w)) es++;
  }
  if (/[¿¡ñ]/.test(limpio)) es++;
  if (en >= 2 && en > es) return "en";
  if (es >= 1 && es >= en) return "es";
  return null;
}

/** El idioma del chat: el que guardó agent.js o, si no, el de lo último que escribió el cliente. */
function idiomaDeSesion(sesion) {
  if (sesion && (sesion.locale === "en" || sesion.locale === "es")) return sesion.locale;
  const recientes = ((sesion && sesion.history) || [])
    .filter((m) => m && m.role === "user" && typeof m.content === "string")
    .slice(-4)
    .map((m) => m.content)
    .join("\n");
  return idiomaProbable(recientes) || "es";
}

function esIngles(locale) {
  return String(locale || "").toLowerCase().startsWith("en");
}

// ── Formatos ────────────────────────────────────────────────

function digitsOnly(s = "") {
  return String(s || "").replace(/\D/g, "");
}

function mx(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString("es-MX")} MXN`;
}

function mxCorto(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
}

function fechaUTC(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
}

/** "2026-10-10" → "Sábado, 10 de octubre" / "Saturday, October 10". */
function fechaLarga(ymd, locale = "es") {
  const d = fechaUTC(ymd);
  if (!d) return String(ymd || "");
  const txt = d.toLocaleDateString(esIngles(locale) ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** "2026-10-10" → "sáb 10 de oct" (para los avisos al dueño). */
function fechaCorta(ymd) {
  const d = fechaUTC(ymd);
  if (!d) return String(ymd || "");
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function primerNombre(...nombres) {
  for (const raw of nombres) {
    const palabra = String(raw || "").trim().split(/\s+/)[0] || "";
    const limpia = palabra.replace(/[^\p{L}'-]/gu, "");
    if (limpia.length >= 2) return limpia.charAt(0).toUpperCase() + limpia.slice(1);
  }
  return "";
}

function recortar(t, n) {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function etiquetaArchivo(kind) {
  if (kind === "pdf") return "📄 PDF";
  if (kind === "image") return "🖼️ imagen";
  return "📎 archivo";
}

/** Línea del teléfono para el dueño. Un @lid NO es un teléfono: si no se resolvió, se dice. */
function lineaTelefono(telefono) {
  const d = digitsOnly(telefono);
  return d ? `📱 wa.me/${d}` : "📱 número no visible: contéstale desde el chat";
}

/** Quién es, para el dueño: el nombre de la cotización y, si es otro, el de WhatsApp. */
function lineaCliente(nombreCotizacion, nombreWhatsapp) {
  const a = String(nombreCotizacion || "").trim();
  const b = String(nombreWhatsapp || "").trim();
  if (a && b && a.toLowerCase() !== b.toLowerCase()) return `👤 ${a} (WhatsApp: ${b})`;
  return `👤 ${a || b || "Sin nombre"}`;
}

/**
 * "URGENTE" si el tour es mañana o antes (el dueño tiene que validar YA para
 * que haya salida), "HOY" si no.
 */
function urgenciaDeFecha(tourDate, ahora = Date.now()) {
  const ymd = String(tourDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "HOY";
  const manana = sumarDias(fechaMexico(new Date(Number(ahora))), 1);
  return ymd <= manana ? "URGENTE" : "HOY";
}

// ── La cotización (o reserva) a la que pertenece el pago ────

const ESTADOS_VIVOS = new Set(["enviada", "borrador"]);

/**
 * Junta en una sola forma lo que devuelve el sitio:
 *   · /api/bot/booking/[folio] de una cotización {tipo:"cotizacion", total, anticipo, saldo, …}
 *   · /api/bot/cotizacion-activa {folio, status, total, anticipo, saldo, …}
 *   · /api/bot/booking/[folio] de una reserva {totalAmount, pagado, saldo, …} (el saldo)
 * @returns {null | {tipo:"cotizacion"|"reserva", folio, status, tourName, tourDate,
 *   total, anticipo?, pagado?, saldo, esperado, customerName, venceEl, esPaquete, vigente, vencida}}
 */
function normalizarCotizacion(d, folioPedido) {
  if (!d || typeof d !== "object") return null;
  const folio = String(d.folio || folioPedido || "").trim().toUpperCase();
  if (!folio) return null;
  const num = (x) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? null : Math.round(Number(x)));
  const tourName = d.tourName ? String(d.tourName) : "";
  const tourDate = d.tourDate ? String(d.tourDate).slice(0, 10) : "";
  const status = d.status ? String(d.status) : null;
  const esPaquete = d.esPaquete === true || /^HP-P-/.test(folio) || /paquete|hospedaje|hotel/i.test(tourName);
  const base = { folio, status, tourName, tourDate, customerName: d.customerName || null, venceEl: d.venceEl || null, esPaquete };
  // Una liga por persona: lo que falta de las partes es lo que se espera del
  // siguiente comprobante (17 nov: Laura pagó su mitad con liga y Jorge mandó
  // la transferencia de la otra; se esperaba todo el saldo y «no cuadraba»).
  const partes = Array.isArray(d.partes) ? d.partes.filter((x) => x && typeof x === "object") : [];
  const faltaDePartes = partes.filter((x) => !x.pagada).reduce((a, x) => a + (Number(x.monto) || 0), 0);

  // Una reserva trae `totalAmount` (la cotización, `total` y tipo "cotizacion").
  const esReserva = d.tipo === "reserva" || (d.tipo !== "cotizacion" && d.totalAmount !== undefined);
  if (esReserva) {
    const total = num(d.totalAmount) ?? num(d.total) ?? 0;
    const pagado = num(d.pagado);
    const saldo = num(d.saldo) ?? (pagado !== null ? Math.max(0, total - pagado) : null);
    return {
      ...base, tipo: "reserva", total, pagado, saldo,
      esperado: faltaDePartes > 0 && (saldo === null || faltaDePartes <= saldo)
        ? Math.round(faltaDePartes)
        : saldo !== null && saldo > 0 ? saldo : null,
      // Liquidada no espera ningún pago: las fotos del paseo que manda después
      // del tour no son «comprobante del saldo $0».
      vigente: status !== "cancelled" && saldo !== 0, vencida: false,
    };
  }
  const total = num(d.total) ?? 0;
  // El sitio manda el anticipo; si no viniera, la regla es 30 % (decisión del 6 oct).
  const anticipo = num(d.anticipo) ?? Math.round(total * 0.3);
  const saldo = num(d.saldo) ?? Math.max(0, total - anticipo);
  // Reemplazada por otra (el cliente cambió algo): el sitio la da SIN montos.
  const reemplazadaPor = typeof d.reemplazadaPor === "string" && d.reemplazadaPor.trim() ? d.reemplazadaPor.trim().toUpperCase() : null;
  const reservaFolio = typeof d.reservaFolio === "string" && d.reservaFolio.trim() ? d.reservaFolio.trim().toUpperCase() : null;
  return {
    ...base, tipo: "cotizacion", total, anticipo, saldo,
    esperado: faltaDePartes > 0 ? Math.round(faltaDePartes) : anticipo,
    vigente: !reemplazadaPor && !reservaFolio && (!status || ESTADOS_VIVOS.has(status)),
    vencida: status === "expirada",
    reemplazadaPor,
    reservaFolio,
    faltaDePartes: faltaDePartes > 0 ? Math.round(faltaDePartes) : 0,
  };
}

/**
 * La cotización de este chat: 1) el folio de la sesión, 2) la cotización viva
 * del chat o del teléfono en el sitio. Una cotización vencida del folio de la
 * sesión solo se usa si no hay otra (el aviso al dueño lo marca).
 * Nunca lanza: si el sitio no responde, null (y el archivo igual le llega al dueño).
 */
async function buscarCotizacion({ api, chatId, telefono, sessionFolio, log = console } = {}) {
  const warn = (...a) => { try { (log.warn || log.log).call(log, ...a); } catch { /* sin log */ } };
  let respaldo = null;
  if (sessionFolio && api && typeof api.consultarReserva === "function") {
    try {
      const r = await api.consultarReserva(sessionFolio);
      if (r && r.ok) {
        const c = normalizarCotizacion(r.data, sessionFolio);
        if (c && c.vigente) return c;
        // La cotización ya es reserva (pagó una parte con la liga, o el equipo
        // la convirtió): el comprobante es de esa reserva. 🔴 Antes se quedaba
        // sin folio y el bot le pedía el folio al cliente.
        if (c && c.tipo === "cotizacion" && c.reservaFolio) {
          const rr = await api.consultarReserva(c.reservaFolio);
          const res = rr && rr.ok ? normalizarCotizacion(rr.data, c.reservaFolio) : null;
          if (res && res.vigente) {
            if (c.faltaDePartes > 0 && (res.saldo === null || c.faltaDePartes <= res.saldo)) res.esperado = c.faltaDePartes;
            return res;
          }
        }
        if (c && c.vencida) respaldo = c;
      }
    } catch (e) {
      warn(`⚠️ Comprobante: no pude consultar ${sessionFolio}:`, String((e && e.message) || e).split("\n")[0]);
    }
  }
  if (api && typeof api.cotizacionActiva === "function" && (chatId || telefono)) {
    try {
      const r = await api.cotizacionActiva({ chatId, telefono });
      if (r && r.ok && r.data && r.data.folio) {
        const c = normalizarCotizacion({ tipo: "cotizacion", ...r.data });
        if (c) return c;
      }
    } catch (e) {
      warn("⚠️ Comprobante: no pude buscar la cotización activa:", String((e && e.message) || e).split("\n")[0]);
    }
  }
  return respaldo;
}

// ── Guardar el archivo en el volumen ────────────────────────

const EXTENSIONES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

function extensionDe(mimetype, filename) {
  const m = String(mimetype || "").toLowerCase().split(";")[0].trim();
  if (EXTENSIONES[m]) return EXTENSIONES[m];
  const ext = String(filename || "").toLowerCase().split(".").pop();
  return /^[a-z0-9]{2,5}$/.test(ext) && ext !== String(filename || "").toLowerCase() ? ext : "bin";
}

/**
 * Escribe el archivo como <dir>/<FOLIO>-<n>.<ext> y lo anota en el almacén
 * (estado.js) para que /confirma lo encuentre. Devuelve el registro o null.
 * Nunca lanza.
 */
function guardarComprobante({ dir, folio, media, mimetype, chatId, almacen, ahora = Date.now(), log = console } = {}) {
  if (!dir || !folio || !media || !media.data) return null;
  try {
    const limpio = String(folio).toUpperCase().replace(/[^A-Z0-9-]/g, "") || "SIN-FOLIO";
    const previos = almacen && typeof almacen.comprobantesDe === "function" ? almacen.comprobantesDe(folio).length : 0;
    const n = previos + 1;
    const tipo = media.mimetype || mimetype || "";
    const ruta = path.join(dir, `${limpio}-${n}.${extensionDe(tipo, media.filename)}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ruta, Buffer.from(String(media.data), "base64"));
    const registro = { path: ruta, mimetype: tipo, filename: media.filename || path.basename(ruta), at: Number(ahora), chatId: chatId || null };
    if (almacen && typeof almacen.agregarComprobante === "function") almacen.agregarComprobante(folio, registro);
    return { ...registro, n };
  } catch (e) {
    try { (log.warn || log.log).call(log, `⚠️ Comprobante: no pude guardar el archivo de ${folio}:`, String((e && e.message) || e).split("\n")[0]); } catch { /* sin log */ }
    return null;
  }
}

// ── Textos al cliente ───────────────────────────────────────

function cuandoSaldo(cot, en) {
  if (cot && cot.esPaquete) return en ? "paid at hotel check-in" : "se paga al hacer check-in";
  return en
    ? "paid on the day of the tour, in cash or by bank transfer"
    : "se paga el día del tour, en efectivo o transferencia";
}

/** Acuse con el contexto de su cotización. Sin upsell y SIN decir «confirmada». */
function textoAcuseComprobante(cot = {}, { nombre, locale = "es" } = {}) {
  const en = esIngles(locale);
  const quien = primerNombre(cot.customerName, nombre);
  const L = [
    en
      ? (quien ? `✅ *Thank you, ${quien}! We received your payment receipt.*` : "✅ *Thank you! We received your payment receipt.*")
      : (quien ? `✅ *¡Gracias, ${quien}! Recibimos tu comprobante.*` : "✅ *¡Gracias! Recibimos tu comprobante.*"),
    "",
    `🧾 *${en ? "Reference" : "Folio"}:* ${cot.folio}`,
  ];
  const que = [cot.tourName, cot.tourDate ? fechaLarga(cot.tourDate, locale) : ""].filter(Boolean).join(" · ");
  if (que) L.push(`🗺️ ${que}`);
  const total = Number(cot.total) || 0;
  if (total > 0) {
    L.push("", `💰 *Total:* ${mx(total)}`);
    if (cot.tipo === "reserva") {
      if (cot.pagado !== null && cot.pagado !== undefined) L.push(`✅ *${en ? "Paid so far" : "Pagado hasta hoy"}:* ${mx(cot.pagado)}`);
      if (Number(cot.saldo) > 0) L.push(`🕒 *${en ? "Balance" : "Saldo"}:* ${mx(cot.saldo)}`);
    } else {
      const pct = Math.round((Number(cot.anticipo) / total) * 100);
      const etiqueta = en ? "Deposit to book" : "Anticipo para apartar";
      L.push(`💳 *${etiqueta}${pct > 0 && pct < 100 ? ` (${pct} %)` : ""}:* ${mx(cot.anticipo)}`);
      if (Number(cot.saldo) > 0) L.push(`🕒 *${en ? "Balance" : "Saldo"}:* ${mx(cot.saldo)} — ${cuandoSaldo(cot, en)}`);
    }
  }
  L.push("", cot.tipo === "reserva"
    ? (en ? "🔎 We'll verify it and let you know right here once it's registered. 🌿" : "🔎 Lo validamos y te aviso por aquí en cuanto quede registrado. 🌿")
    : (en ? "🔎 We'll verify it and send you your confirmation right here. 🌿" : "🔎 Lo validamos y te mando tu confirmación por aquí. 🌿"));
  return L.join("\n");
}

/** Otro archivo del mismo folio en menos de 10 min (p. ej. el anticipo en 2 transferencias). */
function textoAcuseRepetido(folio, locale = "es") {
  return esIngles(locale)
    ? `📎 I also got this file for your reference *${folio}*. We'll check it together with the previous one. 🌿`
    : `📎 Recibí también este archivo para tu folio *${folio}*. Lo revisamos junto con el anterior. 🌿`;
}

/** Acuse cuando no hay cotización ligada a este chat. */
function textoAcuseSinCotizacion(locale = "es") {
  return esIngles(locale)
    ? [
        "✅ *Thank you! I received your file.*",
        "",
        "If it's the receipt for a booking, our team will check it and message you right here. 🌿",
        "To find it faster, please send me your quote number (COT-…) or the name on the booking.",
      ].join("\n")
    : [
        "✅ *¡Gracias! Recibí tu archivo.*",
        "",
        "Si es el comprobante de una reserva, el equipo lo revisa y te escribe por aquí. 🌿",
        "Para ubicarla más rápido, compárteme tu folio (COT-…) o el nombre de la reservación.",
      ].join("\n");
}

function textoAcuseSinCotizacionRepetido(locale = "es") {
  return esIngles(locale)
    ? "📎 I also got this file; our team will check it together with the previous one. 🌿"
    : "📎 Recibí también este archivo; el equipo lo revisa junto con el anterior. 🌿";
}

function textoAudio(locale = "es") {
  return esIngles(locale)
    ? "I can't listen to voice messages 🙏 Could you type it for me?"
    : "No puedo escuchar audios 🙏 ¿Me lo escribes?";
}

function textoArchivoNoSoportado(locale = "es") {
  return esIngles(locale)
    ? "For now I can only read text, photos or PDFs 🙏 Could you type it for me?"
    : "Por ahora solo puedo leer texto, fotos o PDF 🙏 ¿Me lo escribes?";
}

/**
 * Una ubicación compartida, como texto para el modelo (sirve para la recogida):
 * «[ubicación compartida: nombre/dirección · https://maps.google.com/?q=lat,lng]».
 * El body de un mensaje de ubicación es una miniatura en base64, no texto:
 * por eso se arma desde msg.location.
 */
function textoUbicacion(loc = {}) {
  const lat = Number(loc && loc.latitude);
  const lng = Number(loc && loc.longitude);
  const lugar = [loc && loc.name, loc && loc.address].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
  const link = Number.isFinite(lat) && Number.isFinite(lng) ? `https://maps.google.com/?q=${lat},${lng}` : "";
  return `[ubicación compartida: ${[lugar, link].filter(Boolean).join(" · ") || "sin datos"}]`;
}

// ── Textos al dueño ─────────────────────────────────────────

/**
 * Aviso con todo lo necesario para validar el pago en el banco y confirmarlo
 * con un solo comando que se puede copiar.
 */
function textoAvisoComprobante(cot = {}, { nombre, telefono, kind, n, ahora = Date.now(), descargado = true } = {}) {
  const urg = urgenciaDeFecha(cot.tourDate, ahora);
  const L = [`🧾 *[${urg}] Comprobante de pago* · ${etiquetaArchivo(kind)}${Number(n) > 1 ? ` · archivo #${Number(n)}` : ""}`];
  L.push(lineaCliente(cot.customerName, nombre));
  L.push(lineaTelefono(telefono));
  const que = [cot.folio, cot.tourName, cot.tourDate ? fechaCorta(cot.tourDate) : ""].filter(Boolean).join(" · ");
  L.push(`📋 ${que}`);
  if (cot.tipo === "reserva") {
    const pagado = cot.pagado !== null && cot.pagado !== undefined ? mxCorto(cot.pagado) : "¿?";
    const saldo = cot.saldo !== null && cot.saldo !== undefined ? mxCorto(cot.saldo) : "¿?";
    // Con una liga por persona a medias, lo esperado es la parte que falta, no todo el saldo.
    const porPartes = Number.isFinite(Number(cot.esperado)) && Number(cot.esperado) > 0 && cot.saldo !== null && Number(cot.esperado) < Number(cot.saldo);
    L.push(porPartes
      ? `💰 Reserva ya confirmada · total ${mxCorto(cot.total)} · pagado ${pagado} · esperado ${mxCorto(cot.esperado)} (la parte que falta del anticipo) · saldo ${saldo}`
      : `💰 Reserva ya confirmada · total ${mxCorto(cot.total)} · pagado ${pagado} · esperado (saldo) ${saldo}`);
  } else {
    L.push(`💰 Total ${mxCorto(cot.total)} · esperado ${mxCorto(cot.anticipo)} (anticipo) · saldo ${mxCorto(cot.saldo)}`);
  }
  // 🔴 Una reemplazada decía solo «VENCIDA»: el dueño la confirmaba y nacía la
  // reserva con el viaje VIEJO. Ahora el /confirma de ésa se frena (el sitio
  // pide «forzar»); aquí se dice cuál es la buena.
  if (cot.reemplazadaPor) L.push(`⚠️ Esta cotización fue REEMPLAZADA por la ${cot.reemplazadaPor} (el cliente cambió algo): lo normal es confirmar la ${cot.reemplazadaPor}.`);
  else if (cot.vencida) L.push("⚠️ La cotización está VENCIDA: revisa cupo y precio antes de confirmar.");
  if (!descargado) L.push("⚠️ No pude descargar el archivo: revísalo en el chat.");
  L.push("", "Revisa tu banco y, si ya entró:");
  L.push(`👉 /confirma ${cot.folio} ${cot.esperado ? Math.round(cot.esperado) : "<monto>"}`);
  L.push("_(cambia el monto si llegó otro; método por omisión: transferencia)_");
  return L.join("\n");
}

/**
 * Lo que la IA leyó del comprobante (16 nov 2026), en un mensaje aparte para
 * el dueño: le ahorra abrir la foto. NO valida nada: el pago lo confirma él en
 * su banco con /confirma. Marca si el monto o el concepto no cuadran.
 */
function textoLecturaComprobante(l, cot = {}) {
  if (!l || typeof l !== "object") return null;
  if (l.esComprobante === false) return `🔎 ${cot.folio || "Comprobante"}: la IA dice que eso NO parece un comprobante de pago. Revísalo en el chat.`;
  const L = [`🔎 *Lo que dice el comprobante${cot.folio ? ` de ${cot.folio}` : ""}:*`];
  const monto = Number(l.monto);
  const esperado = Number(cot.esperado);
  if (Number.isFinite(monto) && monto > 0) {
    const cuadra = Number.isFinite(esperado) && esperado > 0 ? (Math.round(monto) === Math.round(esperado) ? " ✓ cuadra con lo esperado" : ` ⚠️ se esperaba ${mxCorto(esperado)}`) : "";
    L.push(`💵 ${mxCorto(monto)}${cuadra}`);
  } else {
    L.push("💵 No se lee el monto.");
  }
  if (l.fecha) L.push(`📅 ${String(l.fecha).slice(0, 60)}`);
  if (l.banco) L.push(`🏦 ${String(l.banco).slice(0, 60)}`);
  if (l.titularDestino) L.push(`👤 A nombre de: ${String(l.titularDestino).slice(0, 80)}`);
  if (l.concepto) {
    const traeFolio = cot.folio && String(l.concepto).toUpperCase().replace(/\s+/g, "").includes(String(cot.folio).toUpperCase().replace(/\s+/g, ""));
    L.push(`📝 Concepto: ${String(l.concepto).slice(0, 80)}${cot.folio && !traeFolio ? " ⚠️ no trae el folio" : ""}`);
  }
  L.push("_(lo leyó la IA: confírmalo en tu banco antes del /confirma)_");
  return L.join("\n");
}

/**
 * Un mensaje APARTE para el dueño, para cuando el archivo no era un pago. Va
 * solo a propósito: WhatsApp copia el mensaje entero, y pegado junto al aviso
 * se ejecutaría el primer comando que trae, que es el /confirma.
 */
function textoNoEsPago(numero) {
  return `Si eso NO era un pago (una foto cualquiera), mándame esto y el bot le vuelve a cotizar: /noespago ${numero}`;
}

/** Pie del archivo que se le reenvía al dueño. */
function captionComprobante(cot = {}, n) {
  const num = Number(n) > 1 ? ` (#${Number(n)})` : "";
  return `Comprobante ${cot.folio}${num} · /confirma ${cot.folio} ${cot.esperado ? Math.round(cot.esperado) : "<monto>"}`;
}

/** Aviso cuando llega un archivo y no hay cotización viva para ese chat. */
function textoAvisoSinCotizacion({ nombre, telefono, kind, caption } = {}) {
  const L = [
    `📎 *[HOY] Archivo sin cotización ligada* · ${etiquetaArchivo(kind)}`,
    lineaCliente("", nombre),
    lineaTelefono(telefono),
  ];
  const cap = String(caption || "").trim();
  if (cap) L.push(`💬 Texto: «${recortar(cap, 200)}»`);
  L.push("", "No encontré una cotización viva de este chat. Si es un pago, ubica el folio y confirma con /confirma <FOLIO> <MONTO> (sube el comprobante en el panel: no quedó ligado a ningún folio).");
  return L.join("\n");
}

function captionSinCotizacion(telefono) {
  const d = digitsOnly(telefono);
  return `Archivo sin cotización · ${d ? `wa.me/${d}` : "número no visible"}`;
}

// ── Historial ───────────────────────────────────────────────

/**
 * Lo que queda en el historial cuando llega un comprobante (el modelo no ve
 * el archivo): así no le vuelve a pedir el pago ni repite el acuse.
 */
function notaHistorialComprobante(folio, { enPausa = false, acusado = true } = {}) {
  const folios = (Array.isArray(folio) ? folio : [folio]).filter(Boolean);
  const cual = folios.length ? `un comprobante para ${folios.join(" y ")}` : "un archivo (posible comprobante) sin cotización ligada";
  if (enPausa) return `[sistema] El cliente envió ${cual} mientras el equipo atendía el chat; ya se le avisó al equipo.`;
  if (!acusado) return `[sistema] El cliente envió ${cual}; el equipo ya tiene el aviso.`;
  return folios.length
    ? `[sistema] El cliente envió ${cual}; ya se le acusó recibo y el equipo lo está validando. No le pidas pagar de nuevo ni le digas que ya está confirmada.`
    : `[sistema] El cliente envió ${cual}; ya se le acusó recibo y se le pidió su folio.`;
}

/**
 * La nota que el modelo lee EN EL LUGAR donde llegó el comprobante, dentro del
 * texto del cliente: «ahorita hago el pago» + [nota] + «¿a qué hora pasan?».
 *
 * 🔴 Antes el acuse y su nota entraban al historial ANTES de lo que escribió
 * el cliente, y processMessage recibía solo sus textos: el modelo leía
 * «ahorita hago el pago» como lo ÚLTIMO, después del acuse, y contestaba
 * «cuando hagas la transferencia, mándanos el comprobante» (prueba de Manolo).
 *
 * Va TODA entre corchetes: agent.js cuenta las palabras del mensaje para
 * decidir el idioma de la cotización y del correo, y quita lo que está entre
 * corchetes. Sin ellos, las 30 palabras en español de la nota volteaban a
 * «es» el chat de un cliente que escribe en inglés.
 *
 * @param {object[]} comps  los comprobantes de esta tanda (llegaron seguidos)
 * @param {{primera?:boolean, hayAntes?:boolean}} opciones
 *   primera  = es la primera tanda de la ráfaga (la que lleva la regla completa)
 *   hayAntes = el cliente escribió algo ANTES de esta tanda
 */
function notaComprobanteEnRafaga(comps = [], { primera = true, hayAntes = true } = {}) {
  const folios = [...new Set(comps.map((c) => c && c.folio).filter(Boolean))];
  const acusado = comps.some((c) => c && c.ackText);
  const cual = folios.length ? `el comprobante de ${folios.join(" y ")}` : null;
  if (!primera) {
    return `[sistema] [Luego mandó otro archivo${folios.length ? ` para ${folios.join(" y ")}` : ""}; el equipo también lo tiene.]`;
  }
  const quien = hayAntes ? "DESPUÉS de esos mensajes el cliente mandó" : "El cliente mandó";
  if (!cual) {
    return acusado
      ? `[sistema] [${quien} un archivo (posible comprobante) que no se pudo ligar a ninguna cotización y ya recibió su acuse, que le pide su folio o el nombre de la reservación; no le pidas comprobante ni pago.]`
      : `[sistema] [${quien} un archivo (posible comprobante) sin cotización ligada; el equipo ya tiene el aviso. Dile que lo recibimos y pídele su folio (COT-…) o el nombre de la reservación; no le pidas comprobante ni pago.]`;
  }
  return acusado
    ? `[sistema] [${quien} ${cual} y ya recibió su acuse; no le pidas comprobante ni pago. Tampoco le digas que ya quedó confirmada: el equipo lo está validando.]`
    : `[sistema] [${quien} ${cual}; el equipo ya tiene el aviso para validarlo. Dile que lo recibimos y que lo validamos; no le pidas comprobante ni pago, ni le digas que ya quedó confirmada.]`;
}

/**
 * Qué hacer con una ráfaga ya juntada por buffer.js (lógica pura; index.js y
 * el simulador la usan igual). CONSERVA el orden de los elementos.
 *   · `acuses`: los acuses que salen ANTES que nada, uno por folio (con varios
 *     archivos del mismo folio, el completo: el corto de un archivo repetido
 *     puede entrar antes). Si hay folio, el «no encontré tu cotización» sobra.
 *   · `textoParaModelo`: lo que escribió, EN ORDEN, con la nota del
 *     comprobante en el lugar donde llegó (ver notaComprobanteEnRafaga). Sin
 *     comprobante, solo sus textos. Es también lo que queda en el historial
 *     como su turno: el acuse NO se guarda antes de lo que él escribió.
 *   · `soloComprobantes`: solo llegaron archivos, ni un texto.
 *   · `huboComprobante`: llegó al menos un comprobante → la respuesta del
 *     modelo pasa por filtrarRespuestaTrasComprobante.
 *   · `soloCharla`: llegó un comprobante y el resto fue «ya pagué / gracias /
 *     ahorita hago el pago» → no se llama al modelo.
 *   · `textoUnido`: solo lo que escribió (para la regla rápida y los avisos).
 *   · `acuse` y `notas`: los de antes (el primer acuse y la nota suelta), por
 *     compatibilidad.
 */
function prepararRafaga(elementos = []) {
  const lista = (Array.isArray(elementos) ? elementos : []).filter(Boolean);
  const textos = [];
  const comprobantes = [];
  // Textos y tandas de comprobantes seguidos, en el orden en que llegaron.
  const segmentos = [];
  for (const e of lista) {
    if (e.tipo === "texto") {
      const t = String(e.texto ?? "").trim();
      if (!t) continue;
      textos.push(t);
      segmentos.push({ tipo: "texto", texto: t });
    } else if (e.tipo === "comprobante") {
      comprobantes.push(e);
      const ultimo = segmentos[segmentos.length - 1];
      if (ultimo && ultimo.tipo === "comprobantes") ultimo.lista.push(e);
      else segmentos.push({ tipo: "comprobantes", lista: [e] });
    }
  }

  // Un acuse por folio, en el orden en que llegaron.
  const porFolio = new Map(); // folio ("" = sin cotización) -> comprobante elegido
  for (const c of comprobantes) {
    if (!c.ackText) continue;
    const k = c.folio ? String(c.folio) : "";
    const previo = porFolio.get(k);
    if (!previo || (previo.duplicado && !c.duplicado)) porFolio.set(k, c);
  }
  let elegidos = [...porFolio.entries()];
  if (elegidos.some(([k]) => k)) elegidos = elegidos.filter(([k]) => k);
  const acuses = elegidos.map(([, c]) => c.ackText);
  const acuse = acuses[0] || null;

  const folios = [...new Set(comprobantes.map((c) => c.folio).filter(Boolean))];
  const notas = comprobantes.length ? [notaHistorialComprobante(folios, { acusado: Boolean(acuse) })] : [];

  const partes = [];
  let tandas = 0;
  segmentos.forEach((s, i) => {
    if (s.tipo === "texto") { partes.push(s.texto); return; }
    partes.push(notaComprobanteEnRafaga(s.lista, { primera: tandas === 0, hayAntes: i > 0 }));
    tandas++;
  });

  const textoUnido = textos.join("\n");
  const soloCharla = comprobantes.length > 0 && isPaymentChatterOnly(textos);
  return {
    acuses,
    textoParaModelo: partes.join("\n"),
    soloComprobantes: comprobantes.length > 0 && textos.length === 0,
    huboComprobante: comprobantes.length > 0,
    acuse,
    notas,
    folios,
    textos,
    textoUnido,
    soloCharla,
    llamarModelo: Boolean(textoUnido) && !soloCharla,
  };
}

/**
 * ¿Es un «listo / gracias / ahí está» que llega justo DESPUÉS de un acuse?
 * Una ráfaga de solo comprobantes ya no espera 15 s (buffer.js), así que el
 * «listo» que el cliente teclea tras la foto llega en su propia ráfaga: con
 * el acuse basta, no se gasta una llamada al modelo (y no sale un segundo
 * «¡gracias, lo validamos!»). Una pregunta o algo más sí va al modelo.
 * Solo si lo ÚLTIMO que dijo el bot fue ESE acuse: si después contestó el
 * modelo («¿te mando la ubicación?»), un «sí porfa» es una respuesta.
 *
 * @param {object} plan          lo que devolvió prepararRafaga
 * @param {{at:number, texto:string}|null} ultimoAcuse  el último acuse que salió a ese chat
 * @param {object[]} history     session.history
 */
const CHARLA_TRAS_ACUSE_MS = 2 * 60 * 1000;
function esCharlaTrasAcuse(plan, ultimoAcuse, history = [], ahora = Date.now()) {
  if (!plan || plan.huboComprobante || !Array.isArray(plan.textos) || !plan.textos.length) return false;
  const t = Number(ultimoAcuse && ultimoAcuse.at);
  if (!(t > 0) || Number(ahora) - t >= CHARLA_TRAS_ACUSE_MS) return false;
  const acuse = String((ultimoAcuse && ultimoAcuse.texto) || "").trim();
  const delBot = (Array.isArray(history) ? history : []).filter((m) => m && m.role === "assistant").pop();
  if (!acuse || !delBot || textoDeTurno(delBot).trim() !== acuse) return false;
  return isPaymentChatterOnly(plan.textos);
}

/** El texto de un turno del historial (string o bloques de texto). */
function textoDeTurno(m) {
  if (!m) return "";
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) return m.content.filter((b) => b && b.type === "text").map((b) => b.text || "").join("\n");
  return "";
}

// ── La respuesta del modelo cuando el comprobante YA llegó ──
// Si el comprobante venía en la ráfaga, o llegó MIENTRAS el modelo
// contestaba, la respuesta no puede pedir el comprobante, la transferencia ni
// traer los datos de pago: el cliente ya pagó y acaba de recibir (o va a
// recibir) su acuse. Filtro fijo, no depende de que el modelo obedezca.
// Se quita FRASE por frase (no el mensaje entero): «¡Gracias, Ana! Cuando
// hagas la transferencia, mándanos el comprobante» deja «¡Gracias, Ana!».
// Lo que habla del SALDO se respeta: tras el anticipo, «el resto se paga el
// día del tour» sigue siendo cierto.

const LETRA = String.raw`[\p{L}\d]`;
const I = `(?<!${LETRA})`; // inicio de palabra (el \b de JS no entiende acentos)
const F = `(?!${LETRA})`;  // fin de palabra
const NO_CORTA = String.raw`[^.!?\n]`; // dentro de la misma frase

const PIDE_PAGO = [
  // «mándanos el comprobante», «envíame la captura», «compártenos tu voucher»
  String.raw`${I}(?:m[aá]nd(?:a|e|en|ame|anos|alo|anoslo|amelo)|env[ií](?:a|e|en|ame|anos|alo|anoslo|amelo)|comp[aá]rt(?:e|a|an|eme|enos|elo)|p[aá]s(?:ame|anos|amelo|anoslo))${F}${NO_CORTA}{0,50}${I}(?:comprobante|captura|voucher|ticket|recibo)`,
  // «¿nos puedes mandar el comprobante?», «recuerda enviarnos tu captura»
  String.raw`${I}(?:puedes|pueden|podr[ií]as|podr[ií]an|favor de|recuerda|recuerden|no olvides|no olviden|te pido|les pido|necesito|necesitamos)${F}${NO_CORTA}{0,30}${I}(?:mandar|enviar|compartir|pasar|subir)(?:me|nos|lo|la|melo|noslo)?${F}${NO_CORTA}{0,40}${I}(?:comprobante|captura|voucher|ticket|recibo)`,
  // «cuando pagues», «en cuanto transfieras», «una vez que deposites»
  String.raw`${I}(?:cuando|en cuanto|una vez que|una vez|despu[eé]s de que|apenas|al momento de|luego de que)${F}${NO_CORTA}{0,20}${I}(?:pagues|paguen|transfieras|transfieran|deposites|depositen|liquides|liquiden|pagar|transferir|depositar)${F}`,
  // «cuando hagas la transferencia», «una vez realizado el pago», «cuando tengas el comprobante»
  String.raw`${I}(?:cuando|en cuanto|una vez que|una vez|despu[eé]s de que|apenas|al momento de|luego de que)${F}${NO_CORTA}{0,20}${I}(?:hagas|hagan|realices|realicen|tengas|tengan|termines|terminen|completes|completen|hacer|realizar|tener|realizado|realizada|hecho|hecha)${F}${NO_CORTA}{0,25}${I}(?:pago|transferencia|dep[oó]sito|anticipo|comprobante)${F}`,
  // «quedo atento a tu comprobante», «esperamos tu pago»
  String.raw`${I}(?:quedo|quedamos|estoy|estamos|sigo|seguimos)${F}${NO_CORTA}{0,12}${I}(?:atent[oa]s?|pendientes?|en espera)${F}${NO_CORTA}{0,25}${I}(?:comprobante|pago|transferencia|dep[oó]sito|anticipo)${F}`,
  String.raw`${I}(?:espero|esperamos|esperando|aguardo|aguardamos)${F}${NO_CORTA}{0,20}${I}(?:comprobante|pago|transferencia|dep[oó]sito|anticipo)${F}`,
  // «te dejo los datos para tu pago», «les comparto los datos de la cuenta»
  // (los datos de PAGO: «¿les mando los datos del hotel?» se queda)
  String.raw`${I}(?:te|les|le)\s+(?:paso|mando|env[ií]o|comparto|dejo|doy|anoto)${F}${NO_CORTA}{0,25}${I}datos\s+(?:bancarios|de\s+(?:pago|la\s+cuenta|transferencia|dep[oó]sito)|para\s+(?:(?:el|tu|su|la)\s+)?(?:pago|transferencia|dep[oó]sito|depositar|transferir|pagar|apartar))${F}`,
  String.raw`${I}datos\s+(?:para|de)\s+(?:(?:tu|su|el|la)\s+)?(?:pago|transferencia|dep[oó]sito|anticipo)${F}`,
  // «¿cómo prefieres pagar?»
  String.raw`${I}c[oó]mo\s+(?:prefieres|prefieren|quieres|quieren|te gustar[ií]a|les gustar[ií]a|vas a|van a|deseas|desean|piensas|piensan)\s+(?:pagar|hacer\s+(?:el|tu|su)\s+pago|apartar)${F}`,
  // «solo falta el anticipo» (y no «no falta ningún pago»)
  String.raw`(?<!${I}no\s+(?:(?:te|les|nos|le)\s+)?)${I}falta${F}${NO_CORTA}{0,15}${I}(?:anticipo|pago|transferencia|dep[oó]sito|comprobante)${F}`,
  // «haz tu pago», «deposita $930»
  String.raw`${I}(?:realiza|realicen|haz|hagan|efect[uú]a|efect[uú]en|deposita|depositen|transfiere|transfieran|paga|paguen|liquida|liquiden)${F}${NO_CORTA}{0,25}(?:${I}(?:pago|transferencia|dep[oó]sito|anticipo|monto|cantidad)${F}|\$\s?\d)`,
  // «puedes pagar con…», «solo tienes que transferir»
  String.raw`${I}(?:puedes|pueden|podr[ií]as|podr[ií]an|favor de|recuerda|recuerden|no olvides|no olviden|tienes que|tienen que|debes|deben|necesitas|necesitan|basta con)${F}${NO_CORTA}{0,20}${I}(?:pagar|transferir|depositar|liquidar|(?:realizar|hacer)\s+(?:el|tu|su|la)\s+(?:pago|transferencia|dep[oó]sito))${F}`,
  // «pon el folio como concepto»
  String.raw`${I}como\s+concepto${F}`,
  String.raw`${I}concepto\s+de\s+(?:tu|su|la)\s+(?:pago|transferencia)${F}`,
  // English
  String.raw`${I}(?:please\s+)?send\s+(?:us|me)${F}${NO_CORTA}{0,20}${I}(?:receipt|proof|screenshot|voucher)${F}`,
  String.raw`${I}(?:can|could|would)\s+you\s+(?:please\s+)?send${F}${NO_CORTA}{0,25}${I}(?:receipt|proof|screenshot|voucher)${F}`,
  String.raw`${I}(?:once|when|after|as soon as)\s+you(?:'ve|\s+have)?\s+(?:pay|paid|transfer|transferred|deposit|deposited)${F}`,
  String.raw`${I}(?:once|when|after|as soon as)\s+you(?:'ve|\s+have)?\s+(?:make|made|complete|completed|send|sent|do|done)${F}${NO_CORTA}{0,20}${I}(?:payment|transfer|deposit|receipt)${F}`,
  String.raw`${I}how\s+(?:would|do)\s+you\s+(?:like|want|prefer)\s+to\s+pay${F}`,
  String.raw`${I}(?:here\s+are|here's|i'll\s+send\s+you|let\s+me\s+send\s+you|i\s+can\s+send\s+you|sending\s+you)${F}${NO_CORTA}{0,20}${I}(?:payment|bank|transfer)\s+(?:details|info|information)${F}`,
  String.raw`${I}(?:please\s+)?(?:make|complete)\s+(?:the|your)\s+(?:payment|transfer|deposit)${F}`,
  String.raw`${I}(?:waiting\s+for|look(?:ing)?\s+forward\s+to|await(?:ing)?)\s+(?:your|the)\s+(?:receipt|payment|transfer|deposit)${F}`,
  String.raw`${I}(?:use|put|include|add|write)${F}${NO_CORTA}{0,30}${I}as\s+(?:the\s+)?(?:payment\s+)?(?:reference|concept)${F}`,
].map((s) => new RegExp(s, "iu"));

// Solo cuando es PREGUNTA: «¿ya hiciste la transferencia?», «did you pay?».
// Como afirmación («veo que ya hiciste el pago») es un acuse y se queda.
const PREGUNTA_SI_PAGO = [
  String.raw`${I}ya${F}${NO_CORTA}{0,15}${I}(?:pagaste|pagaron|depositaste|depositaron|transferiste|transfirieron)${F}`,
  String.raw`${I}ya${F}${NO_CORTA}{0,15}${I}(?:hiciste|hicieron|realizaste|realizaron|pudiste|pudieron|mandaste|mandaron|enviaste|enviaron|tienes|tienen|lograste)${F}${NO_CORTA}{0,25}${I}(?:pago|transferencia|dep[oó]sito|anticipo|comprobante)${F}`,
  String.raw`${I}(?:did|have)\s+you\s+(?:already\s+)?(?:pay|paid|transfer|transferred|deposit|deposited)${F}`,
  String.raw`${I}(?:did|have)\s+you\s+(?:already\s+)?(?:make|made|send|sent|complete|completed)${F}${NO_CORTA}{0,20}${I}(?:payment|transfer|deposit|receipt)${F}`,
].map((s) => new RegExp(s, "iu"));

// Lo que habla del saldo NO se quita (ver arriba).
const DEL_SALDO = new RegExp(`${I}(?:saldo|resto|restante|balance|remaining|the\\s+rest)${F}`, "iu");
// Tampoco lo que TRANQUILIZA: «no tienes que volver a pagar», «no need to
// send it again». («No olvides mandarnos el comprobante» sí es pedirlo.)
const TRANQUILIZA = new RegExp([
  String.raw`${I}no\s+(?:es\s+necesario|hace\s+falta|necesitas|necesitan|tienes\s+que|tienen\s+que|debes|deben|hay\s+que)${F}`,
  String.raw`${I}(?:no\s+need|(?:you|we)\s+(?:don't|do\s+not)\s+need|don't\s+(?:need|have)\s+to|do\s+not\s+need)${F}`,
].join("|"), "iu");

/** ¿Esta frase le pide al cliente el comprobante, la transferencia o el pago? */
function pideComprobanteOPago(frase) {
  const f = String(frase || "");
  if (!f.trim() || DEL_SALDO.test(f) || TRANQUILIZA.test(f)) return false;
  if (PIDE_PAGO.some((r) => r.test(f))) return true;
  return /\?/.test(f) && PREGUNTA_SI_PAGO.some((r) => r.test(f));
}

/** Una línea sin acentos, folios, cifras ni signos: «🏦 Banco: Inbursa» → "bancoinbursa". */
function firmaLinea(linea) {
  return String(linea || "")
    .replace(/(?:COT|HP)-[A-Z0-9-]+/gi, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

// Las líneas de payment.mensajeDatosPago (es/en, con y sin monto y folio),
// como firmas: así se reconocen aunque cambien el monto, el folio o el banco.
let firmasPago = null;
function firmasDatosPago() {
  if (firmasPago) return firmasPago;
  const encabezados = new Set();
  const lineas = new Set();
  let clabe = "";
  let oxxo = "";
  try {
    const pago = require("./payment");
    clabe = digitsOnly(pago.PAGO && pago.PAGO.clabe);
    oxxo = digitsOnly(pago.PAGO && pago.PAGO.oxxo);
    if (typeof pago.mensajeDatosPago === "function") {
      for (const locale of ["es", "en"]) {
        for (const datos of [{ folio: "COT-X", monto: 1 }, {}]) {
          const ls = String(pago.mensajeDatosPago({ ...datos, locale })).split("\n");
          const cabeza = firmaLinea(ls[0]);
          if (cabeza) encabezados.add(cabeza);
          for (const l of ls.slice(1)) {
            const f = firmaLinea(l);
            if (f) lineas.add(f);
          }
        }
      }
    }
  } catch { /* sin payment.js: quedan las reglas generales */ }
  firmasPago = { encabezados, lineas, clabe, oxxo };
  return firmasPago;
}

/** ¿Es una línea de datos bancarios (CLABE, tarjeta de OXXO, banco, titular, monto, concepto)? */
function esLineaDePago(linea, firmas = firmasDatosPago()) {
  const d = digitsOnly(linea);
  if (firmas.clabe.length >= 10 && d.includes(firmas.clabe)) return true;
  if (firmas.oxxo.length >= 10 && d.includes(firmas.oxxo)) return true;
  if (new RegExp(`${I}clabe${F}`, "iu").test(linea)) return true;
  const f = firmaLinea(linea);
  return Boolean(f) && firmas.lineas.has(f);
}

/** Parte una línea en frases sin separar el emoji del final de su frase. */
function partirFrases(linea) {
  return String(linea).split(/(?<=[.!?…])\s+(?=[¿¡"«(*_]*[\p{L}\d])/u);
}

/**
 * La respuesta del modelo SIN lo que pide el comprobante o el pago, y sin el
 * bloque de datos de pago (desde su encabezado, «💳 *Datos para tu pago*»).
 * Si no había nada que quitar, devuelve el texto TAL CUAL. Si no queda nada,
 * devuelve "" (y no se manda nada: el acuse ya dijo lo necesario).
 */
function filtrarRespuestaTrasComprobante(texto) {
  const original = String(texto ?? "");
  if (!original.trim()) return "";
  const firmas = firmasDatosPago();
  const lineas = original.replace(/\r\n?/g, "\n").split("\n");
  const salida = [];
  let cambio = false;
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea.trim()) { salida.push(""); continue; }
    // El bloque de payment.mensajeDatosPago: el encabezado y todo lo suyo.
    if (firmas.encabezados.has(firmaLinea(linea))) {
      cambio = true;
      while (i + 1 < lineas.length) {
        const sig = lineas[i + 1];
        if (sig.trim() && !esLineaDePago(sig, firmas) && !pideComprobanteOPago(sig)) break;
        i++;
      }
      continue;
    }
    if (esLineaDePago(linea, firmas)) { cambio = true; continue; }
    const frases = partirFrases(linea);
    const quedan = frases.filter((f) => !pideComprobanteOPago(f));
    if (quedan.length !== frases.length) {
      cambio = true;
      const resto = quedan.join(" ").trim();
      // Si solo quedó un emoji o un signo suelto, fuera también.
      if (resto && /[\p{L}\d]/u.test(resto)) salida.push(resto);
      continue;
    }
    salida.push(linea);
  }
  if (!cambio) return original;
  const quedan = salida.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim().split("\n");
  // Una presentación que se quedó colgando al final («¡Perfecto! Te comparto
  // esto:» → «¡Perfecto!»): fuera la frase que termina en «:», no la línea.
  while (quedan.length) {
    const ultima = quedan[quedan.length - 1];
    if (!ultima.trim()) { quedan.pop(); continue; }
    if (!/:\s*$/.test(ultima)) break;
    const frases = partirFrases(ultima);
    frases.pop();
    const resto = frases.join(" ").trim();
    if (resto && /[\p{L}\d]/u.test(resto)) quedan[quedan.length - 1] = resto;
    else quedan.pop();
  }
  const limpio = quedan.join("\n").trim();
  return /[\p{L}\d]/u.test(limpio) ? limpio : "";
}

/**
 * Lo que de verdad salió también queda en el historial. agent.js guarda como
 * turno del bot el texto que devolvió processMessage; si aquí se filtró, el
 * modelo «recordaría» haber pedido un comprobante que el cliente nunca leyó.
 * Corrige el ÚLTIMO turno (solo si es del bot y es esa respuesta); con
 * `enviado` vacío lo quita. Lo que quien llama quiere que quede en su lugar
 * (p. ej. el acuse, si eso fue lo único que recibió) va en `enviado`.
 * @returns {boolean} si lo encontró y lo corrigió
 */
function corregirRespuestaEnHistorial(history, original, enviado) {
  if (!Array.isArray(history) || !history.length) return false;
  const i = history.length - 1;
  const m = history[i];
  if (!m || m.role !== "assistant") return false;
  if (Array.isArray(m.content) && m.content.some((b) => b && b.type === "tool_use")) return false;
  const textoGuardado = textoDeTurno(m);
  // Sin formato ni signos: el modelo guarda **negritas** y aquí salen *negritas*.
  const plano = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const guardado = plano(textoGuardado);
  const dicho = plano(original);
  if (!guardado || !dicho) return false;
  const [corto, largo] = guardado.length <= dicho.length ? [guardado, dicho] : [dicho, guardado];
  if (corto.length < Math.min(20, largo.length) || !largo.includes(corto)) return false;
  const nuevo = String(enviado ?? "").trim();
  if (!nuevo) {
    history.splice(i, 1);
    return true;
  }
  if (typeof m.content === "string") m.content = nuevo;
  else m.content = [...m.content.filter((b) => b && b.type !== "text"), { type: "text", text: nuevo }];
  return true;
}

// ── Procesador ──────────────────────────────────────────────

/**
 * createProofProcessor({ api, almacen, enviarAlDueno, dir, log, now, dedupeWindowMs, noQuoteRateLimitMs })
 *   api           = { consultarReserva(folio), cotizacionActiva({chatId, telefono}) } (api-client.js)
 *   almacen       = estado.js (comprobantesDe / agregarComprobante); opcional
 *   enviarAlDueno = async (contenido, opciones?) → true/false; contenido es texto o el
 *                   MessageMedia que bajó whatsapp-web.js (con { caption } de 2º argumento)
 *   dir           = carpeta de los archivos (COMPROBANTES_DIR). Sin dir no se guarda nada.
 *
 * process({ chatId, nombre, telefono, numero?, sessionFolio, media, mimetype, caption, paused, locale })
 *   numero = el número para «/noespago» (solo si el archivo cierra la ficha a cambios)
 *   → { ackText: string|null, folio: string|null, cotizacion: object|null, duplicate: boolean, archivo: object|null }
 *   Al dueño: un aviso por folio cada 10 min (los archivos sí llegan todos);
 *   sin cotización, 1 aviso cada 30 min por chat. En pausa no hay acuse.
 */
function createProofProcessor({
  api,
  almacen = null,
  enviarAlDueno,
  dir = null,
  log = console,
  now = () => Date.now(),
  dedupeWindowMs = 10 * 60 * 1000,
  noQuoteRateLimitMs = 30 * 60 * 1000,
  // (media) => Promise<{monto, fecha, banco, concepto…} | null>: la lectura con IA (agent.leerComprobante).
  leerComprobante = null,
} = {}) {
  const ultimoAvisoPorFolio = new Map(); // folio -> ms del último aviso completo
  const ultimoSinCotizacion = new Map(); // chat -> ms del último aviso «sin cotización»

  const warn = (...a) => { try { (log.warn || log.log).call(log, ...a); } catch { /* sin log */ } };

  // Un envío que falla se registra y no frena lo demás (ni el acuse al cliente).
  async function enviar(etiqueta, contenido, opciones) {
    if (typeof enviarAlDueno !== "function") return false;
    try {
      const ok = await (opciones ? enviarAlDueno(contenido, opciones) : enviarAlDueno(contenido));
      if (ok === false) warn(`⚠️ Comprobante: el envío «${etiqueta}» no llegó al dueño`);
      return ok !== false;
    } catch (e) {
      warn(`⚠️ Comprobante: falló el envío «${etiqueta}»:`, String((e && e.message) || e).split("\n")[0]);
      return false;
    }
  }

  function podar(mapa, ventanaMs, t) {
    for (const [k, at] of mapa) if (t - at >= ventanaMs) mapa.delete(k);
  }

  async function procesar({ chatId, nombre, telefono, numero, sessionFolio, media, mimetype, caption, paused = false, locale = "es" } = {}) {
    const kind = mediaKind(mimetype) || mediaKind(media && media.mimetype);
    const descargado = Boolean(media && media.data);
    const cot = await buscarCotizacion({ api, chatId, telefono, sessionFolio, log });
    const t = Number(now()); // después de la búsqueda: lo de abajo ya no espera nada

    // ── Con cotización (o reserva con saldo) ──
    if (cot) {
      const folio = cot.folio;
      const archivo = guardarComprobante({ dir, folio, media, mimetype, chatId, almacen, ahora: t, log });
      const n = archivo ? archivo.n : 0;
      // Varios archivos seguidos del mismo folio = UN aviso completo. Se decide
      // sin esperas de por medio para que dos archivos simultáneos no avisen dos veces.
      podar(ultimoAvisoPorFolio, dedupeWindowMs, t);
      const duplicate = ultimoAvisoPorFolio.has(folio);
      if (!duplicate) ultimoAvisoPorFolio.set(folio, t);

      if (!duplicate) {
        await enviar("aviso", textoAvisoComprobante(cot, { nombre, telefono, kind, n, ahora: t, descargado }));
      }
      if (descargado) {
        await enviar("archivo", media, { caption: captionComprobante(cot, n) });
      } else if (duplicate) {
        await enviar("aviso repetido", `📎 ${folio}: llegó otro archivo, pero no lo pude descargar; revísalo en el chat.`);
      }
      // Con `numero` (index.js lo pasa cuando el archivo SÍ cierra la ficha a
      // cambios): cómo deshacerlo si no era un pago, en su propio mensaje.
      if (!duplicate && numero) await enviar("no es pago", textoNoEsPago(numero));
      // Lo que dice el comprobante, leído con IA, en un mensaje aparte. Sin
      // esperar: el acuse al cliente sale ya y la lectura llega segundos después.
      if (!duplicate && descargado && typeof leerComprobante === "function") {
        Promise.resolve()
          .then(() => leerComprobante(media))
          .then((l) => { const t = textoLecturaComprobante(l, cot); return t ? enviar("lectura", t) : null; })
          .catch(() => {});
      }

      // Al cliente SIEMPRE se le contesta (salvo en pausa): el freno es solo del aviso al dueño.
      const ackText = paused
        ? null
        : duplicate
          ? textoAcuseRepetido(folio, locale)
          : textoAcuseComprobante(cot, { nombre, locale });
      return { ackText, folio, cotizacion: cot, duplicate, archivo };
    }

    // ── Sin cotización ──
    const clave = String(chatId || digitsOnly(telefono) || "desconocido");
    podar(ultimoSinCotizacion, noQuoteRateLimitMs, t);
    const limitado = ultimoSinCotizacion.has(clave);
    if (!limitado) {
      ultimoSinCotizacion.set(clave, t);
      await enviar("aviso sin cotización", textoAvisoSinCotizacion({ nombre, telefono, kind, caption }));
    }
    if (descargado) await enviar("archivo sin cotización", media, { caption: captionSinCotizacion(telefono) });

    const ackText = paused
      ? null
      : limitado
        ? textoAcuseSinCotizacionRepetido(locale)
        : textoAcuseSinCotizacion(locale);
    return { ackText, folio: null, cotizacion: null, duplicate: limitado, archivo: null };
  }

  return { process: procesar, procesar };
}

module.exports = {
  textoLecturaComprobante,
  FISCAL_RE,
  PAYMENT_RE,
  BARE_FILENAME_RE,
  mediaKind,
  limpiarPie,
  classifyIncomingMedia,
  hablaDePago,
  pareceComprobanteDePago,
  isPaymentChatterOnly,
  idiomaProbable,
  idiomaDeSesion,
  normalizarCotizacion,
  buscarCotizacion,
  extensionDe,
  guardarComprobante,
  urgenciaDeFecha,
  textoAcuseComprobante,
  textoAcuseRepetido,
  textoAcuseSinCotizacion,
  textoAcuseSinCotizacionRepetido,
  textoAudio,
  textoArchivoNoSoportado,
  textoUbicacion,
  textoAvisoComprobante,
  textoNoEsPago,
  captionComprobante,
  textoAvisoSinCotizacion,
  captionSinCotizacion,
  notaHistorialComprobante,
  notaComprobanteEnRafaga,
  prepararRafaga,
  esCharlaTrasAcuse,
  CHARLA_TRAS_ACUSE_MS,
  filtrarRespuestaTrasComprobante,
  corregirRespuestaEnHistorial,
  createProofProcessor,
  // Formatos compartidos con index.js
  mx,
  mxCorto,
  fechaLarga,
  fechaCorta,
  primerNombre,
  recortar,
  lineaTelefono,
  digitsOnly,
};
