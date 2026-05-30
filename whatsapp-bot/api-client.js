// Cliente HTTP hacia los endpoints /api/bot/* del sitio (Next.js).
// Usa el token compartido AGENT_API_TOKEN. Node 18+ trae fetch global.

const SITE_API_URL = (process.env.SITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN || "";

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

async function confirmarReserva(folio) {
  return post("/api/bot/confirm", { folio });
}

async function consultarReserva(folio) {
  return get(`/api/bot/booking/${encodeURIComponent(folio)}`);
}

module.exports = { crearCotizacion, confirmarReserva, consultarReserva, SITE_API_URL };
