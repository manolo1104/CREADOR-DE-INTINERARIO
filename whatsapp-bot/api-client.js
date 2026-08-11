// Cliente HTTP hacia los endpoints /api/bot/* del sitio (Next.js).
// Usa el token compartido AGENT_API_TOKEN. Node 18+ trae fetch global.

const SITE_API_URL = (process.env.SITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN || "";
// Sitio del hotel Paraíso Encantado (para consultar disponibilidad de habitaciones, solo lectura).
const HOTEL_API_URL = (process.env.HOTEL_API_URL || "https://www.paraisoencantado.com").replace(/\/$/, "");

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AGENT_API_TOKEN}`,
  };
}

async function post(path, body) {
  const res = await fetch(`${SITE_API_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function get(path) {
  const res = await fetch(`${SITE_API_URL}${path}`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Operaciones ──────────────────────────────────────────────
async function crearCotizacion(payload) {
  return post("/api/bot/quote", payload);
}

// Registra en el panel las cotizaciones sin pago en línea (RZR y paquetes).
async function registrarLead(payload) {
  return post("/api/bot/lead", payload);
}

// Paquete a medida: varios tours con sus fechas en UN folio y UN correo.
// Antes había que llamar a crearCotizacion una vez por tour, lo que generaba
// folios y correos sueltos para un mismo viaje.
async function cotizarPaquetePersonalizado(payload) {
  return post("/api/bot/paquete", payload);
}

async function confirmarReserva(folio) {
  return post("/api/bot/confirm", { folio });
}

async function consultarReserva(folio) {
  return get(`/api/bot/booking/${encodeURIComponent(folio)}`);
}

// Disponibilidad de habitaciones en el hotel (solo lectura, endpoint público del hotel).
async function checkHotelAvailability(checkin, checkout, rooms) {
  try {
    const res = await fetch(`${HOTEL_API_URL}/api/check-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin, checkout, rooms }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.message } };
  }
}

module.exports = { crearCotizacion, registrarLead, cotizarPaquetePersonalizado, confirmarReserva, consultarReserva, checkHotelAvailability, SITE_API_URL, HOTEL_API_URL };
