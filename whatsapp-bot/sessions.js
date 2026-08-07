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
  const last = s.history[s.history.length - 1];
  // Fusiona mensajes de texto consecutivos del mismo rol para mantener la
  // alternancia que exige la API (útil cuando el bot "lee" durante una pausa:
  // varios mensajes del cliente o del dueño seguidos se juntan en un turno).
  if (last && last.role === role && typeof last.content === "string" && typeof content === "string") {
    last.content += "\n" + content;
  } else {
    s.history.push({ role, content });
  }
  // Mantener manejable (últimos 40 turnos)
  if (s.history.length > 40) s.history = s.history.slice(-40);
}

function clearSession(phone) {
  sessions.delete(phone);
}

module.exports = { getSession, pushHistory, clearSession };
