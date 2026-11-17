// ════════════════════════════════════════════════════════════════════
// ETAPAS — en qué punto de la venta va cada chat (16 nov 2026, «Estructura
// de oro»). La calcula el CÓDIGO con lo que ya dijo la ficha del viaje, nunca
// el modelo: así no se equivoca de etapa por una frase ambigua.
//
//   nuevo → calificado → propuesta → cotizado → pago_pendiente →
//   comprobante → confirmado → post_viaje
//
// La usan el seguimiento (a quién se le escribe y cuándo), las etiquetas de
// WhatsApp Business y la ficha que lee el modelo.
// ════════════════════════════════════════════════════════════════════

const ETAPAS = ["nuevo", "calificado", "propuesta", "cotizado", "pago_pendiente", "comprobante", "confirmado", "post_viaje"];

/** El nombre de la etiqueta de WhatsApp Business de cada etapa (las crea Manolo en el teléfono). */
const ETIQUETA_DE_ETAPA = {
  nuevo: "Nuevo",
  calificado: "Calificado",
  propuesta: "Calificado",
  cotizado: "Cotizado",
  pago_pendiente: "Pago pendiente",
  comprobante: "Pago pendiente",
  confirmado: "Confirmado",
  post_viaje: "Post-viaje",
};

const esYMD = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Hoy en México (YYYY-MM-DD). */
function hoyMX(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** La última fecha de recorrido de la ficha (YYYY-MM-DD) o null. */
function ultimaFechaDelViaje(ficha) {
  const fechas = (ficha && Array.isArray(ficha.recorridos) ? ficha.recorridos : [])
    .map((r) => r && (r.fecha || r.tourDate))
    .filter(esYMD)
    .sort();
  return fechas.length ? fechas[fechas.length - 1] : null;
}

/**
 * La etapa de una sesión. Pura: solo lee la sesión.
 * @param {object} s  la sesión (sessions.js)
 * @param {Date} [ahora]
 */
function etapaDe(s, ahora = new Date()) {
  const f = (s && s.ficha) || {};
  if (f.pagoValidado || f.reservaFolio) {
    const ultima = ultimaFechaDelViaje(f);
    return ultima && ultima < hoyMX(ahora) ? "post_viaje" : "confirmado";
  }
  if (f.comprobanteRecibido) return "comprobante";
  if (f.folioVigente) return s.pagoMandadoAt ? "pago_pendiente" : "cotizado";
  const propuso = (Array.isArray(f.consultados) && f.consultados.length > 0)
    || (Array.isArray(s.fotosEnviadas) && s.fotosEnviadas.length > 0)
    || (Array.isArray(f.opciones) && f.opciones.length > 0);
  if (propuso) return "propuesta";
  const califico = (Array.isArray(f.fechasDichas) && f.fechasDichas.length > 0) || Boolean(f.zonaHospedaje);
  return califico ? "calificado" : "nuevo";
}

module.exports = { ETAPAS, ETIQUETA_DE_ETAPA, etapaDe, hoyMX, ultimaFechaDelViaje };
