// ════════════════════════════════════════════════════════════════════
// ETIQUETAS de WhatsApp Business por etapa (16 nov 2026, «Estructura de
// oro»: hoy solo 18 de 279 chats tenían etiqueta).
//
// whatsapp-web.js NO crea etiquetas: Manolo las crea en el teléfono con estos
// nombres exactos: Nuevo, Calificado, Cotizado, Pago pendiente, Confirmado,
// Post-viaje. Si falta una, o la cuenta no es Business, se salta sin error.
//
// Solo se mueven NUESTRAS etiquetas de etapa: las que Erick ponga a mano
// (VIP, Grupo, lo que sea) se quedan como están.
// ════════════════════════════════════════════════════════════════════

const { ETIQUETA_DE_ETAPA } = require("./etapas");

const NOMBRES_DE_ETAPA = new Set(Object.values(ETIQUETA_DE_ETAPA).map((n) => n.toLowerCase()));
const CACHE_MS = 10 * 60 * 1000;

function crearEtiquetas({ client }) {
  let cache = { at: 0, etiquetas: [] };
  let apagadas = process.env.ETIQUETAS === "0";
  const ultimaPuesta = new Map(); // chatId -> nombre (para no repetir la llamada)

  async function etiquetas() {
    if (Date.now() - cache.at < CACHE_MS) return cache.etiquetas;
    const lista = await client.getLabels();
    cache = { at: Date.now(), etiquetas: Array.isArray(lista) ? lista : [] };
    return cache.etiquetas;
  }

  /** Deja en el chat la etiqueta de su etapa. Nunca lanza. */
  async function ponerEtapa(chatId, etapa) {
    if (apagadas || !chatId || !etapa) return;
    const nombre = ETIQUETA_DE_ETAPA[etapa];
    if (!nombre || ultimaPuesta.get(chatId) === nombre) return;
    try {
      const todas = await etiquetas();
      const destino = todas.find((l) => String(l.name || "").trim().toLowerCase() === nombre.toLowerCase());
      if (!destino) return; // Manolo todavía no la crea
      const actuales = await client.getChatLabels(chatId).catch(() => []);
      const conservar = (actuales || [])
        .filter((l) => !NOMBRES_DE_ETAPA.has(String(l.name || "").trim().toLowerCase()))
        .map((l) => l.id);
      await client.addOrRemoveLabels([...conservar, destino.id], [chatId]);
      ultimaPuesta.set(chatId, nombre);
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/LT01|Only Whatsapp business/i.test(msg)) {
        apagadas = true;
        console.warn("🏷️  La cuenta no es WhatsApp Business: no se ponen etiquetas.");
      } else {
        console.error(`🏷️  etiqueta de ${chatId}:`, msg);
      }
    }
  }

  return { ponerEtapa };
}

module.exports = { crearEtiquetas };
