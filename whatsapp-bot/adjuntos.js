// ════════════════════════════════════════════════════════════════════
// ADJUNTOS — lo que el bot manda además del texto (16 nov 2026, «Tének»).
//
// Las herramientas del modelo (agent.js) no tocan WhatsApp: cuando una
// cotización nace, o el modelo propone tours con foto, dejan aquí lo que hay
// que mandar. index.js lo toma al terminar el turno y lo manda ANTES del
// texto, para que la pregunta de cierre sea lo último que lee el cliente.
//
//   { tipo: "pdf",  folio: "COT-1234", nombre: "Cotización COT-1234.pdf", caption? }
//   { tipo: "foto", url: "https://…/hero.jpg", caption? }
//   { tipo: "datosPago" }   la imagen «Aparta tu lugar con tu anticipo» (18 nov
//                           2026); vive en la base del sitio, no en el repo
//
// Vive en memoria: si el bot se reinicia a media respuesta se pierde, y está
// bien (el texto del turno tampoco salió).
// ════════════════════════════════════════════════════════════════════

const colas = new Map();
const MAX_POR_TURNO = 6;

/** Agrega un adjunto al turno de ese chat. Sin repetir el mismo PDF o la misma foto. */
function encolar(chatId, adjunto) {
  if (!chatId || !adjunto || !adjunto.tipo) return false;
  const lista = colas.get(chatId) || [];
  const claveDe = (a) => (a.tipo === "pdf" ? `pdf:${a.folio}` : a.tipo === "foto" ? `foto:${a.url}` : a.tipo);
  const clave = claveDe(adjunto);
  if (lista.some((a) => claveDe(a) === clave)) return false;
  if (lista.length >= MAX_POR_TURNO) return false;
  lista.push(adjunto);
  colas.set(chatId, lista);
  return true;
}

/** Los adjuntos del turno, en orden (fotos primero, luego PDF), y vacía la cola. */
function tomar(chatId) {
  const lista = colas.get(chatId) || [];
  colas.delete(chatId);
  return [...lista.filter((a) => a.tipo === "foto"), ...lista.filter((a) => a.tipo !== "foto")];
}

/** Los que hay sin sacarlos (pruebas y simulador). */
function ver(chatId) {
  return [...(colas.get(chatId) || [])];
}

/** El nombre del archivo que ve el cliente. */
function nombrePdf(folio, locale = "es") {
  const f = String(folio || "").toUpperCase();
  if (/^COT-/.test(f)) return locale === "en" ? `Quote ${f}.pdf` : `Cotización ${f}.pdf`;
  return locale === "en" ? `Booking confirmation ${f}.pdf` : `Confirmación ${f}.pdf`;
}

module.exports = { encolar, tomar, ver, nombrePdf, MAX_POR_TURNO };
