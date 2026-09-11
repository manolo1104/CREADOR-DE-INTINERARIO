// ════════════════════════════════════════════════════════════════════
// Espera por ráfaga de mensajes.
//
// El cliente casi nunca escribe una sola vez: manda "hola", luego "somos 4",
// luego "para el sábado". Si el bot contesta al primero, termina contestando
// tres veces cosas a medias. Aquí se espera a que DEJE de escribir y se
// contesta UNA vez, a todo junto.
//
// Vive en su propio archivo (y no dentro de index.js) para poder probarlo con
// `npm run test-espera` sin levantar WhatsApp.
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} opts
 * @param {number} opts.debounceMs  Cada mensaje nuevo reinicia este reloj.
 * @param {number} opts.maxMs       Tope duro contado desde el PRIMER mensaje.
 * @param {(chatId:string, texto:string, info:{mensajes:number, esperaMs:number}) => Promise<void>} opts.responder
 * @param {(chatId:string, esperaMs:number, mensajes:number) => void} [opts.onAgendar]
 *        Avisa cuándo va a contestar. Solo para mostrarlo (logs, simulador).
 */
function crearGestorDeRafagas({ debounceMs, maxMs, responder, onError = () => {}, onAgendar = () => {} }) {
  const buffers = new Map();      // chatId -> { textos, timer, primeroAt }
  const respondiendo = new Set(); // chatId con una respuesta EN CURSO

  function recibir(chatId, texto) {
    let buf = buffers.get(chatId);
    if (!buf) { buf = { textos: [], timer: null, primeroAt: Date.now() }; buffers.set(chatId, buf); }
    buf.textos.push(texto);
    agendar(chatId);
  }

  // La ventana es DESLIZANTE (cada mensaje nuevo vuelve a empezar la espera),
  // pero nunca se pasa del tope contado desde el primer mensaje de la ráfaga:
  // sin ese tope, quien escribe cada 14 s no recibiría respuesta jamás.
  function agendar(chatId) {
    const buf = buffers.get(chatId);
    if (!buf) return;
    if (buf.timer) clearTimeout(buf.timer);
    const restanteDelTope = Math.max(0, maxMs - (Date.now() - buf.primeroAt));
    const espera = Math.min(debounceMs, restanteDelTope);
    buf.timer = setTimeout(() => { disparar(chatId).catch(onError); }, espera);
    if (buf.timer.unref) buf.timer.unref();
    try { onAgendar(chatId, espera, buf.textos.length); } catch { /* no romper por un log */ }
  }

  async function disparar(chatId) {
    const buf = buffers.get(chatId);
    if (!buf) return;
    if (buf.timer) { clearTimeout(buf.timer); buf.timer = null; }

    // ⚠️ CANDADO. Si ya hay una respuesta en curso para este chat, NO arranco
    // otra: dejo el buffer intacto y me salgo. La que está corriendo lo vuelve
    // a agendar al terminar (ver el `finally`).
    //
    // Sin esto, un mensaje que llegaba mientras el modelo pensaba (y piensa
    // entre 5 y 20 segundos, más si usa herramientas) disparaba una SEGUNDA
    // llamada en paralelo sobre el MISMO historial: el bot contestaba dos
    // veces y el historial quedaba con un tool_use sin su tool_result — de ahí
    // en adelante ese chat solo devolvía "tuve un problema técnico".
    if (respondiendo.has(chatId)) return;

    buffers.delete(chatId);
    const texto = buf.textos.join("\n").trim();
    if (!texto) return;

    respondiendo.add(chatId);
    try {
      await responder(chatId, texto, {
        mensajes: buf.textos.length,
        esperaMs: Date.now() - buf.primeroAt,
      });
    } catch (e) {
      onError(e);
    } finally {
      respondiendo.delete(chatId);
      // ¿Escribió más mientras yo respondía? Vuelvo a arrancar el reloj con eso.
      if (buffers.has(chatId)) agendar(chatId);
    }
  }

  /** Tira lo que esté esperando en ese chat (p. ej. cuando un humano lo toma). */
  function descartar(chatId) {
    const buf = buffers.get(chatId);
    if (buf && buf.timer) clearTimeout(buf.timer);
    buffers.delete(chatId);
  }

  return {
    recibir,
    descartar,
    ocupado: (chatId) => respondiendo.has(chatId),
    enEspera: () => buffers.size,
  };
}

module.exports = { crearGestorDeRafagas };
