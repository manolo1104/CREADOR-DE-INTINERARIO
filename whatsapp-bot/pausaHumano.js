// ════════════════════════════════════════════════════════════════════
// PAUSA POR HUMANO (Manolo, 18 nov 2026)
//
// «Que el bot deje de responder 5 minutos si hay intervención humana, que de
// todos modos siga leyendo la conversación de los mensajes en los que no
// participa y que después de los 5 minutos regrese a contestar con el
// contexto de los mensajes que no contestó.»
//
//   · Alguien del equipo escribe a mano → el bot se calla PAUSA_HUMANO_MS
//     contados desde ESE mensaje (cada mensaje del equipo la vuelve a empezar).
//   · Mientras tanto todo entra al historial: lo del cliente como «user», lo
//     del equipo como «assistant». El bot no pierde el hilo.
//   · Al vencer, si lo último del chat es del cliente (nadie le contestó), el
//     bot le contesta solo, con toda la plática a la vista. Si lo último fue
//     del equipo, no dice nada: espera al siguiente mensaje del cliente.
//
// Puro (sin WhatsApp): lo usan index.js, simulador.js y test-pausa-humano.js.
// ════════════════════════════════════════════════════════════════════

const CINCO_MINUTOS = 5 * 60 * 1000;

/** Cuánto se calla el bot tras un mensaje del equipo. HUMAN_TAKEOVER_MS lo cambia (en ms). */
function msPausaHumano(env = process.env) {
  const n = Number(env.HUMAN_TAKEOVER_MS);
  return Number.isFinite(n) && n > 0 ? n : CINCO_MINUTOS;
}

/** Cada cuánto se revisa si una pausa ya venció (para contestar a tiempo, no hasta el siguiente mensaje). */
const REVISAR_PAUSAS_CADA_MS = 15 * 1000;

const esNotaDeSistema = (linea) => /^\s*\[sistema\]/i.test(linea);

/**
 * Lo que el cliente escribió y nadie le contestó: el ÚLTIMO turno del
 * historial, si es del cliente. Las notas «[sistema] …» no cuentan como algo
 * que contestar. null = no hay nada pendiente (lo último fue del bot o del
 * equipo, o solo hay notas).
 */
function pendienteDelCliente(history) {
  if (!Array.isArray(history) || !history.length) return null;
  const ultimo = history[history.length - 1];
  if (!ultimo || ultimo.role !== "user" || typeof ultimo.content !== "string") return null;
  const lineas = ultimo.content.split("\n").filter(l => l.trim() && !esNotaDeSistema(l));
  return lineas.length ? lineas.join("\n") : null;
}

/** ¿Esta pausa la puso una persona del equipo y ya venció? (las de escalación o falla no se retoman solas aquí). */
function pausaHumanaVencida(p, ahora = Date.now()) {
  if (!p || p.hasta === null || p.hasta === undefined) return false;
  if (!(p.modo === "humano" || Number(p.humanoAt) > 0)) return false;
  return Number(p.hasta) <= ahora;
}

/**
 * El turno con el que el bot retoma: una nota para el modelo + lo que el
 * cliente dejó sin contestar. Va como el mensaje del cliente de ese turno, así
 * el modelo contesta eso y no otra cosa.
 */
function textoParaRetomar(pendiente, { desdeHora = "", minutos = 5 } = {}) {
  const desde = desdeHora ? ` desde las ${desdeHora}` : "";
  return [
    `[sistema] Alguien del equipo contestó este chat a mano${desde} y lleva ${minutos} minutos sin escribir. Arriba está todo lo que hablaron. El cliente escribió lo de abajo y nadie le contestó: contéstale tú ahora, siguiendo lo que ya le dijo el equipo, sin repetirlo y sin mencionar esta nota.`,
    pendiente,
  ].join("\n");
}

module.exports = { CINCO_MINUTOS, REVISAR_PAUSAS_CADA_MS, msPausaHumano, pendienteDelCliente, pausaHumanaVencida, textoParaRetomar };
