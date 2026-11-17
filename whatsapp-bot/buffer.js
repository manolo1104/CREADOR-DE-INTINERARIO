// ════════════════════════════════════════════════════════════════════
// Espera por ráfaga de mensajes.
//
// El cliente casi nunca escribe una sola vez: manda "hola", luego "somos 4",
// luego "para el sábado". Si el bot contesta al primero, termina contestando
// tres veces cosas a medias. Aquí se espera a que DEJE de escribir y se
// contesta UNA vez, a todo junto.
//
// La ráfaga lleva ELEMENTOS con tipo, no solo texto:
//   { tipo: "texto", texto, llegoAt? }
//   { tipo: "comprobante", folio, ackText, duplicado, llegoAt? }
// Una foto del comprobante llega junto con "ya pagué" y "¿me confirmas?": el
// acuse sale primero (plantilla) y el texto se contesta después, en la misma
// vuelta. Antes solo viajaba texto y la foto no tenía dónde ir.
//
// `llegoAt` = cuándo llegó el mensaje (ms). El comprobante entra a la ráfaga
// hasta que se descarga y se busca su cotización (varios segundos), así que
// un «listo» escrito DESPUÉS de la foto podía quedar ANTES que ella. Al
// despachar, los elementos se ordenan por `llegoAt`: el modelo lee las cosas
// en el orden en que el cliente las mandó. Si no viene, se pone al recibirlo.
//
// Vive en su propio archivo (y no dentro de index.js) para poder probarlo con
// `npm run test-espera` sin levantar WhatsApp.
// ════════════════════════════════════════════════════════════════════

/** Los elementos en el orden en que LLEGARON (los empates conservan el orden de entrada). */
function ordenarPorLlegada(elementos = []) {
  return elementos
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (Number(a.e.llegoAt) - Number(b.e.llegoAt)) || (a.i - b.i))
    .map((x) => x.e);
}

/** ¿Todo lo que hay es comprobante? (sin un solo texto del cliente) */
function soloComprobantes(elementos = []) {
  return elementos.length > 0 && elementos.every((e) => e && e.tipo === "comprobante");
}

/**
 * @param {object} opts
 * @param {number} opts.debounceMs  Cada mensaje nuevo reinicia este reloj.
 * @param {number} opts.maxMs       Tope duro contado desde el PRIMER mensaje.
 * @param {(chatId:string, texto:string, info:{mensajes:number, esperaMs:number, elementos:object[]}) => Promise<void>} opts.responder
 *        `texto` = los textos de la ráfaga unidos con "\n" (como siempre);
 *        `info.elementos` = todo lo que llegó, EN EL ORDEN EN QUE LLEGÓ, con su tipo.
 * @param {(chatId:string, esperaMs:number, mensajes:number) => void} [opts.onAgendar]
 *        Avisa cuándo va a contestar. Solo para mostrarlo (logs, simulador).
 * @param {number|null} [opts.esperaComprobantesMs]
 *        «Despachar ya»: si TODO lo que espera son comprobantes, la espera es
 *        esta (p. ej. 3 s) en vez de `debounceMs`. Un comprobante que llegó
 *        MIENTRAS el modelo contestaba ya esperó todo ese rato: su acuse no
 *        tiene por qué esperar otros 15 s. Un poco de margen (y no 0) junta
 *        las 2 fotos que el cliente manda de un jalón en UN acuse. En cuanto
 *        entra un texto, vuelve la espera normal. null (por omisión) = la
 *        espera normal para todo, como antes.
 */
function crearGestorDeRafagas({ debounceMs, maxMs, responder, onError = () => {}, onAgendar = () => {}, esperaComprobantesMs = null }) {
  const buffers = new Map();      // chatId -> { elementos, timer, primeroAt }
  const respondiendo = new Set(); // chatId con una respuesta EN CURSO
  const esperaCorta = Number.isFinite(Number(esperaComprobantesMs)) && esperaComprobantesMs !== null && Number(esperaComprobantesMs) >= 0
    ? Number(esperaComprobantesMs)
    : null;

  /** Un elemento con tipo. Un texto suelto se acepta como { tipo: "texto" }. */
  function recibirElemento(chatId, elemento) {
    if (elemento === null || elemento === undefined) return;
    const base = typeof elemento === "string" ? { tipo: "texto", texto: elemento } : elemento;
    const el = typeof base.llegoAt === "number" && Number.isFinite(base.llegoAt) ? base : { ...base, llegoAt: Date.now() };
    let buf = buffers.get(chatId);
    if (!buf) { buf = { elementos: [], timer: null, primeroAt: Date.now() }; buffers.set(chatId, buf); }
    buf.elementos.push(el);
    agendar(chatId);
  }

  /** Un mensaje de texto (lo de siempre). */
  function recibir(chatId, texto) {
    recibirElemento(chatId, { tipo: "texto", texto });
  }

  // La ventana es DESLIZANTE (cada mensaje nuevo vuelve a empezar la espera),
  // pero nunca se pasa del tope contado desde el primer mensaje de la ráfaga:
  // sin ese tope, quien escribe cada 14 s no recibiría respuesta jamás.
  function agendar(chatId) {
    const buf = buffers.get(chatId);
    if (!buf) return;
    if (buf.timer) clearTimeout(buf.timer);
    const restanteDelTope = Math.max(0, maxMs - (Date.now() - buf.primeroAt));
    const base = esperaCorta !== null && soloComprobantes(buf.elementos) ? Math.min(esperaCorta, debounceMs) : debounceMs;
    const espera = Math.min(base, restanteDelTope);
    buf.timer = setTimeout(() => { disparar(chatId).catch(onError); }, espera);
    if (buf.timer.unref) buf.timer.unref();
    try { onAgendar(chatId, espera, buf.elementos.length); } catch { /* no romper por un log */ }
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
    const elementos = ordenarPorLlegada(buf.elementos);
    const texto = elementos
      .filter((e) => e && e.tipo === "texto")
      .map((e) => String(e.texto ?? ""))
      .join("\n")
      .trim();
    // Sin texto solo se contesta si llegó algo más (p. ej. un comprobante).
    const hayOtros = elementos.some((e) => e && e.tipo !== "texto");
    if (!texto && !hayOtros) return;

    respondiendo.add(chatId);
    try {
      await responder(chatId, texto, {
        mensajes: elementos.length,
        esperaMs: Date.now() - buf.primeroAt,
        elementos,
      });
    } catch (e) {
      onError(e);
    } finally {
      respondiendo.delete(chatId);
      // ¿Escribió más mientras yo respondía? Vuelvo a arrancar el reloj con eso
      // (corto si solo son comprobantes: ver `esperaComprobantesMs`).
      if (buffers.has(chatId)) agendar(chatId);
    }
  }

  /**
   * Tira lo que esté esperando en ese chat (p. ej. cuando un humano lo toma).
   * Devuelve los elementos tirados, en el orden en que llegaron: quien llama
   * decide si los guarda en el historial para no perder lo que dijo el cliente.
   */
  function descartar(chatId) {
    const buf = buffers.get(chatId);
    if (buf && buf.timer) clearTimeout(buf.timer);
    buffers.delete(chatId);
    return buf ? ordenarPorLlegada(buf.elementos) : [];
  }

  /**
   * Lo que espera en ese chat SIN tocarlo (copia, en orden de llegada). Sirve
   * para saber si llegó un comprobante mientras el modelo contestaba: esa
   * respuesta no lo sabe y no debe salir pidiéndolo.
   */
  function elementosEnEspera(chatId) {
    const buf = buffers.get(chatId);
    return buf ? ordenarPorLlegada(buf.elementos) : [];
  }

  /**
   * Corre `fn` con el MISMO candado de las respuestas: si el chat está
   * contestando o tiene mensajes esperando, no corre y devuelve false. Lo usa
   * el seguimiento (seguimiento.js): un recordatorio nunca se cruza con la
   * respuesta a lo que el cliente acaba de escribir.
   */
  async function ejecutarExclusivo(chatId, fn) {
    if (respondiendo.has(chatId) || buffers.has(chatId)) return false;
    respondiendo.add(chatId);
    try {
      await fn();
      return true;
    } catch (e) {
      onError(e);
      return false;
    } finally {
      respondiendo.delete(chatId);
      if (buffers.has(chatId)) agendar(chatId);
    }
  }

  return {
    recibir,
    recibirElemento,
    descartar,
    elementosEnEspera,
    ejecutarExclusivo,
    ocupado: (chatId) => respondiendo.has(chatId),
    enEspera: () => buffers.size,
  };
}

module.exports = { crearGestorDeRafagas, ordenarPorLlegada };
