// Historial de conversación + borrador por teléfono (en memoria).

const sessions = new Map();

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { history: [], draft: {}, lastFolio: null, createdAt: Date.now() });
  }
  return sessions.get(phone);
}

function pushHistory(phone, role, content) {
  const s = getSession(phone);
  s.history.push({ role, content });
  // Mantener manejable (últimos 40 turnos)
  if (s.history.length > 40) s.history = s.history.slice(-40);
}

function clearSession(phone) {
  sessions.delete(phone);
}

module.exports = { getSession, pushHistory, clearSession };
