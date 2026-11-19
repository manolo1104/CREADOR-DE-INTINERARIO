// ════════════════════════════════════════════════════════════════════
// A quién le habla el bot (18 nov 2026, Manolo: «asegúrate de que el bot solo
// responda mensajes de chats no registrados»).
//
// El bot SOLO habla con números que NO están guardados en los contactos del
// teléfono del negocio. Un contacto guardado lo atiende el equipo:
//  · no se le contesta, aunque el bot ya estuviera platicando con él (antes
//    sí: el equipo guardaba al cliente a media venta y el bot seguía). Si el
//    bot estaba a media plática, al dueño le llega UN aviso para que lo siga;
//  · el bot no le escribe por su cuenta: recordatorios 3/24/72 h, «vence
//    mañana», aviso de pago con liga, «¿cómo les fue?», retomar tras la pausa
//    del equipo.
//
// Se quedan igual: los comandos del dueño, ALWAYS_RESPOND_NUMBERS (números de
// prueba) y NEVER_RESPOND_NUMBERS (index.js los revisa antes). RESPOND_MODE=all
// apaga esta regla: solo para pruebas.
//
// Aquí solo van las reglas puras (sin WhatsApp) para poder probarlas:
// test-guardados.js. La lectura de los contactos vive en index.js.
// ════════════════════════════════════════════════════════════════════

/** RESPOND_MODE: "strangers" (por omisión) | "all". Cualquier otra cosa = "strangers". */
function modoRespuesta(valor) {
  return String(valor || "").trim().toLowerCase() === "all" ? "all" : "strangers";
}

/**
 * ¿El chat es de un contacto guardado? Junta lo que dijo WhatsApp.
 * Cada lectura: true (guardado) · false (no guardado) · null (no se pudo leer).
 *
 * Bajo @lid el contacto del chat puede decir «no guardado» aunque el número sí
 * esté en la agenda (la agenda va por teléfono), así que en esos chats manda
 * el contacto de su TELÉFONO real; el del chat solo cuenta si dice «guardado».
 *
 * @param {{ esLid?: boolean, delChat?: boolean|null, delTelefono?: boolean|null }} lecturas
 * @returns {true|false|null} null = no se pudo saber
 */
function decidirGuardado({ esLid = false, delChat = null, delTelefono = null } = {}) {
  if (delChat === true || delTelefono === true) return true;
  if (esLid) return delTelefono === false ? false : null;
  if (delChat === false || delTelefono === false) return false;
  return null;
}

/**
 * Un mensaje que LLEGA de un cliente (después de los comandos del dueño y de
 * la lista de «nunca»).
 * «No se pudo saber» se atiende como cliente nuevo: casi siempre es un
 * prospecto que escribe desde un número oculto (@lid); un contacto guardado sí
 * trae su teléfono.
 *
 * @param {{ modo: string, guardado: boolean|null, siempre?: boolean, platicabaConElBot?: boolean, yaAvisado?: boolean }} p
 * @returns {"contestar"|"ignorar"|"ignorar_y_avisar"}
 */
function decidirEntrante({ modo, guardado, siempre = false, platicabaConElBot = false, yaAvisado = false }) {
  if (modoRespuesta(modo) === "all" || siempre) return "contestar";
  if (guardado === true) return platicabaConElBot && !yaAvisado ? "ignorar_y_avisar" : "ignorar";
  return "contestar";
}

/**
 * Lo que el bot manda POR SU CUENTA (recordatorios, «vence mañana», pago con
 * liga, «¿cómo les fue?», retomar tras la pausa del equipo). Aquí «no se pudo
 * saber» NO se arriesga: espera a la siguiente vuelta.
 *
 * @param {{ modo: string, guardado: boolean|null, siempre?: boolean }} p
 * @returns {"mandar"|"no_mandar"|"esperar"}
 */
function decidirPropio({ modo, guardado, siempre = false }) {
  if (modoRespuesta(modo) === "all" || siempre) return "mandar";
  if (guardado === true) return "no_mandar";
  if (guardado === false) return "mandar";
  return "esperar";
}

/**
 * Modo «solo conectar» (BOT_SOLO_CONECTAR=1): el bot se vincula y se queda
 * conectado sin contestar ni mandar nada. Sirve para escanear el QR antes de
 * subir el sitio. Solo atiende /status y /help (o /ayuda) del dueño o del
 * teléfono del negocio, para comprobar que está vivo.
 */
function soloConectar(valor) {
  return String(valor || "").trim() === "1";
}

const COMANDOS_SOLO_CONECTAR = /^\/(status|help|ayuda)\b/i;

/** En «solo conectar», ¿este comando sí se atiende? */
function comandoPermitidoSoloConectar(comando) {
  return COMANDOS_SOLO_CONECTAR.test(String(comando || "").trim());
}

module.exports = {
  modoRespuesta,
  decidirGuardado,
  decidirEntrante,
  decidirPropio,
  soloConectar,
  comandoPermitidoSoloConectar,
};
