// Cliente HTTP hacia los endpoints /api/bot/* del sitio (Next.js).
// Usa el token compartido AGENT_API_TOKEN. Node 18+ trae fetch global.
//
// ⚠️ NINGUNA función de aquí lanza: todas devuelven { ok, status, data }. Si
// el sitio está caído, tarda de más o contesta algo que no es JSON, sale
// { ok:false, status:0, data:{error} }. Antes un error de red subía hasta
// processMessage y el cliente recibía "tuve un problema técnico" justo al
// pedir su cotización; el bot tiene que poder decir «te lo confirmo» y seguir.

const SITE_API_URL = (process.env.SITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN || "";
// Sitio del hotel Paraíso Encantado (para consultar disponibilidad de habitaciones, solo lectura).
const HOTEL_API_URL = (process.env.HOTEL_API_URL || "https://www.paraisoencantado.com").replace(/\/$/, "");

// Cuánto se le espera al sitio. Sin tope, un sitio colgado dejaba el chat
// trabado: el candado de la ráfaga no se suelta hasta que la llamada termina.
// Cotizar manda correo (Brevo) y confirmar convierte, registra el cobro y
// sube el comprobante: esas llevan más margen que una consulta.
const TIMEOUT_MS = Number(process.env.SITE_API_TIMEOUT_MS || 45000);
const TIMEOUT_CONSULTA_MS = 15000;
const TIMEOUT_CONFIRMAR_MS = 90000;

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_API_TOKEN}`,
  };
}

function senalDeTiempo(ms) {
  // AbortSignal.timeout existe desde Node 17.3; sin él se pide sin tope.
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

async function pedir(url, { method = "GET", body, headers: h = headers(), timeoutMs = TIMEOUT_MS } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: h,
      ...(body !== undefined ? { body: JSON.stringify(body || {}) } : {}),
      signal: senalDeTiempo(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    const porTiempo = e && (e.name === "TimeoutError" || e.name === "AbortError");
    const error = porTiempo
      ? `El sitio no respondió en ${Math.round(timeoutMs / 1000)} s.`
      : `No pude hablar con el sitio: ${(e && e.message) || e}`;
    return { ok: false, status: 0, data: { error } };
  }
}

function post(path, body, opts = {}) {
  return pedir(`${SITE_API_URL}${path}`, { method: "POST", body: body || {}, ...opts });
}

function get(path, opts = {}) {
  return pedir(`${SITE_API_URL}${path}`, { timeoutMs: TIMEOUT_CONSULTA_MS, ...opts });
}

// ── Operaciones ──────────────────────────────────────────────
// Cotización de UN tour → TourQuote COT- (la ve el equipo en Cotizaciones).
async function crearCotizacion(payload) {
  return post("/api/bot/quote", payload);
}

// RZR o paquete del catálogo → TourQuote COT-.
async function registrarLead(payload) {
  return post("/api/bot/lead", payload);
}

// Paquete a medida: varios tours con sus fechas en UN folio y UN correo.
// Antes había que llamar a crearCotizacion una vez por tour, lo que generaba
// folios y correos sueltos para un mismo viaje.
async function cotizarPaquetePersonalizado(payload) {
  return post("/api/bot/paquete", payload);
}

// La MISMA cuenta que cobra la web (promo según la fecha del tour, viajero
// solo, niños, RZR por unidades), sin guardar nada. Lo que no se puede (cupo,
// edad, fecha) llega en `errores` con el motivo.
async function precio(payload) {
  return post("/api/bot/precio", payload);
}

/**
 * Valida un pago (lo dispara /confirma del dueño; el bot NUNCA lo llama solo).
 * COT-/HP-P- → convierte la cotización en reserva HP-M- y registra el cobro;
 * HP-M-/HP → registra el cobro (p. ej. el saldo).
 * @param {string} folio
 * @param {number} montoPagado  Lo que DE VERDAD entró.
 * @param {{metodo?:string, comprobante?:{base64:string, mimetype:string, filename?:string}, confirmadoPor?:string, forzar?:boolean}} [extra]
 *   `forzar`: el dueño ya revisó lo que el sitio frenó (otro pago igual hace
 *   minutos, otra reserva del mismo cliente, cotización recién vencida o sin
 *   lugar en un evento) y confirma de todos modos.
 */
async function confirmarReserva(folio, montoPagado, extra = {}) {
  const { metodo, comprobante, confirmadoPor, forzar } = extra || {};
  return post("/api/bot/confirm", {
    folio,
    montoPagado,
    ...(metodo ? { metodo } : {}),
    ...(comprobante ? { comprobante } : {}),
    ...(confirmadoPor ? { confirmadoPor } : {}),
    ...(forzar === true ? { forzar: true } : {}),
  }, { timeoutMs: TIMEOUT_CONFIRMAR_MS });
}

// Reserva (HP-M-/HP) o cotización (COT-/HP-P-) por folio.
async function consultarReserva(folio) {
  return get(`/api/bot/booking/${encodeURIComponent(String(folio || ""))}`);
}

// Deja en la bitácora del panel que el chat pasó al equipo (y una nota interna
// en la cotización si hay folio). El aviso al dueño lo manda index.js.
async function escalacion(payload) {
  return post("/api/bot/escalacion", payload, { timeoutMs: TIMEOUT_CONSULTA_MS });
}

// La cotización viva ("enviada" o "borrador", 30 días) más reciente de este
// chat o teléfono. 404 si no hay. Con ella se liga un comprobante a su folio.
async function cotizacionActiva({ chatId, telefono } = {}) {
  const qs = new URLSearchParams();
  if (chatId) qs.set("chatId", String(chatId));
  if (telefono) qs.set("telefono", String(telefono));
  if (![...qs.keys()].length) {
    return { ok: false, status: 400, data: { error: "Falta chatId o teléfono." } };
  }
  return get(`/api/bot/cotizacion-activa?${qs.toString()}`);
}

/**
 * El HTML del PDF de un folio (COT- = cotización, HP-M- = confirmación), el
 * mismo que descarga el panel. documentos.js lo pasa a PDF con Chromium.
 * Devuelve { ok, status, html } o { ok:false, status, data:{error} }. No lanza.
 */
async function documento(folio) {
  const url = `${SITE_API_URL}/api/bot/documento/${encodeURIComponent(String(folio || ""))}`;
  try {
    const res = await fetch(url, { headers: headers(), signal: senalDeTiempo(TIMEOUT_CONSULTA_MS) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, data };
    }
    return { ok: true, status: res.status, html: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, data: { error: `No pude traer el documento: ${(e && e.message) || e}` } };
  }
}

/**
 * Una liga de Stripe por persona (el anticipo repartido en `partes`, o el
 * total con base "total"). 200 { folio, ligas:[{parte, de, url, monto, pagada}] }.
 */
async function ligasPorPersona(folio, partes, base = "anticipo") {
  return post(`/api/bot/cotizaciones/${encodeURIComponent(String(folio || ""))}/ligas`, { partes, base }, { timeoutMs: TIMEOUT_MS });
}

// Disponibilidad de habitaciones en el hotel (solo lectura, endpoint público del hotel).
async function checkHotelAvailability(checkin, checkout, rooms) {
  return pedir(`${HOTEL_API_URL}/api/check-availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { checkin, checkout, rooms },
    timeoutMs: TIMEOUT_CONSULTA_MS,
  });
}

module.exports = {
  crearCotizacion,
  registrarLead,
  cotizarPaquetePersonalizado,
  precio,
  confirmarReserva,
  consultarReserva,
  escalacion,
  cotizacionActiva,
  documento,
  ligasPorPersona,
  checkHotelAvailability,
  SITE_API_URL,
  HOTEL_API_URL,
};
