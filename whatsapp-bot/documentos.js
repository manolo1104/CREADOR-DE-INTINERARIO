// ════════════════════════════════════════════════════════════════════
// DOCUMENTOS — el PDF de la cotización o de la confirmación y las fotos de
// los tours, mandados por WhatsApp (16 nov 2026, «Estructura de oro»: la
// cotización en PDF es el punto de quiebre; 48 % reserva con ella, 5 % sin).
//
// El PDF es el MISMO que descarga el panel: el sitio da el HTML
// (/api/bot/documento/:folio) y aquí se imprime con el Chromium que ya trae
// whatsapp-web.js (`client.pupBrowser`), en una pestaña aparte.
//
// Nada de aquí lanza: si un adjunto falla, se anota y el texto sale igual
// (el cliente ya tiene el resumen de su cotización en el chat y en su correo).
// ════════════════════════════════════════════════════════════════════

const { MessageMedia } = require("whatsapp-web.js");

/**
 * @param {{ client: any, api: any, enviar: (chatId: string, contenido: any, opciones?: any) => Promise<any> }} deps
 */
function crearDocumentos({ client, api, enviar }) {
  /** El PDF de un folio como Buffer, o null. */
  async function pdfDeFolio(folio) {
    const r = await api.documento(folio);
    if (!r.ok || !r.html) {
      console.error(`📄 sin HTML de ${folio}: ${(r.data && r.data.error) || r.status}`);
      return null;
    }
    const browser = client && client.pupBrowser;
    if (!browser) {
      console.error("📄 no hay navegador de whatsapp-web.js para imprimir el PDF");
      return null;
    }
    const page = await browser.newPage();
    try {
      await page.setContent(r.html, { waitUntil: "networkidle0", timeout: 30000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async function enviarPdf(chatId, a) {
    const buf = await pdfDeFolio(a.folio);
    if (!buf) return false;
    const media = new MessageMedia("application/pdf", buf.toString("base64"), a.nombre || `${a.folio}.pdf`);
    await enviar(chatId, media, { sendMediaAsDocument: true, ...(a.caption ? { caption: a.caption } : {}) });
    return true;
  }

  async function enviarFoto(chatId, a) {
    const media = await MessageMedia.fromUrl(a.url, { unsafeMime: true });
    if (!media || !/^image\//.test(media.mimetype || "")) return false;
    await enviar(chatId, media, a.caption ? { caption: a.caption } : undefined);
    return true;
  }

  /** Manda los adjuntos del turno en orden. Devuelve cuántos salieron. */
  async function enviarAdjuntos(chatId, adjuntos) {
    let salieron = 0;
    for (const a of adjuntos || []) {
      try {
        const ok = a.tipo === "pdf" ? await enviarPdf(chatId, a) : a.tipo === "foto" ? await enviarFoto(chatId, a) : false;
        if (ok) salieron++;
        else console.error(`📎 no salió el adjunto ${a.tipo} ${a.folio || a.url}`);
      } catch (e) {
        console.error(`📎 adjunto ${a.tipo} ${a.folio || a.url}:`, (e && e.message) || e);
      }
    }
    return salieron;
  }

  return { pdfDeFolio, enviarAdjuntos };
}

module.exports = { crearDocumentos };
