// ════════════════════════════════════════════════════════════════════
// SEGUIMIENTO — Tének vuelve a escribir cuando el cliente se queda callado
// (16 nov 2026, «Estructura de oro» + decisión de Manolo).
//
// Por qué: 85 chats no cerrados terminaron con un mensaje nuestro y nadie
// volvió a escribir; en las reservas, 25 de 27 seguimientos tras 12 h de
// silencio reactivaron la plática. Y el «¿qué te pareció la propuesta?»
// genérico (18 veces) cerró una sola: cada seguimiento menciona SU fecha, SU
// tour o un dato concreto.
//
// Reglas (decidirSeguimiento, pura, probada en test-seguimiento.js):
//   · Solo en propuesta, cotizado o pago_pendiente, si el último mensaje fue
//     nuestro y el cliente no ha contestado: a las 3 h, 24 h y 72 h (Manolo).
//   · La hora que el cliente aceptó («te escribo mañana a las 6») manda.
//   · Solo de 9 am a 8 pm de México. Si el bot estuvo apagado y se juntaron
//     varios, sale UNO (el más reciente) y los anteriores se dan por pasados.
//   · Nunca en un chat en pausa (lo atiende una persona), escalado para que lo
//     tome el equipo, confirmado, o donde el cliente dijo que no.
//   · Pago con liga: si la cotización ya es reserva (pagó con tarjeta), le
//     llega su confirmación con el PDF.
//   · Post-viaje: el día siguiente al último tour, «¿Cómo les fue?».
// ════════════════════════════════════════════════════════════════════

const { etapaDe, hoyMX, ultimaFechaDelViaje } = require("./etapas");

const HORA = 3600 * 1000;
const PASOS_MS = [3 * HORA, 24 * HORA, 72 * HORA];
const ETAPAS_CON_SEGUIMIENTO = new Set(["propuesta", "cotizado", "pago_pendiente"]);
const HORA_INICIO = 9;   // 9:00 am México
const HORA_FIN = 20;     // hasta 8:00 pm
const NO_QUIERE_RE = /\b(no,? gracias|ya no (me interesa|quiero|vamos)|no me interesa|ya (reserv|contrat)\w* con otr|mejor no|lo dejamos|no vamos a ir|cancel(o|amos|a) el viaje|no thanks|not interested)\b/i;

/** La hora de México (0–23) de un instante. */
function horaMX(ms) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hourCycle: "h23" }).format(new Date(ms)));
}

const enHorario = (ms) => {
  const h = horaMX(ms);
  return h >= HORA_INICIO && h < HORA_FIN;
};

/** El último mensaje que escribió el CLIENTE (texto), o "". */
function ultimoTextoDelCliente(s) {
  const h = Array.isArray(s && s.history) ? s.history : [];
  for (let i = h.length - 1; i >= 0; i--) {
    const m = h[i];
    if (!m || m.role !== "user") continue;
    const t = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.filter((b) => b && b.type === "text").map((b) => b.text).join(" ") : "";
    if (t && !/^\s*\[sistema\]/i.test(t)) return t;
  }
  return "";
}

/**
 * Qué toca hacer con un chat ahora. Pura.
 * @param {object} s  la sesión
 * @param {{ahora:number, pausa?:boolean}} o
 * @returns {{accion:"nada", motivo:string} | {accion:"recordar", paso:number, saltados:number}
 *   | {accion:"agendado"} | {accion:"post_viaje"} | {accion:"revisar_pago", folio:string}}
 */
function decidirSeguimiento(s, { ahora, pausa = false } = {}) {
  if (!s || !s.botAt) return { accion: "nada", motivo: "el bot no ha hablado" };
  if (pausa) return { accion: "nada", motivo: "en pausa" };
  if (s.escalacion && s.escalacion.modo === "pasar") return { accion: "nada", motivo: "lo tomó el equipo" };
  const seg = s.seguimiento || {};
  const etapa = etapaDe(s, new Date(ahora));

  // Post-viaje: una vez, del día siguiente al último tour hasta 3 días después.
  if (etapa === "post_viaje") {
    if (seg.postViajeAt) return { accion: "nada", motivo: "ya se preguntó cómo les fue" };
    const ultima = ultimaFechaDelViaje(s.ficha);
    const hoy = hoyMX(new Date(ahora));
    const dias = ultima ? Math.round((Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${ultima}T12:00:00Z`)) / 86400000) : 99;
    if (dias < 1 || dias > 3) return { accion: "nada", motivo: "fuera de la ventana de post-viaje" };
    if (horaMX(ahora) < 10 || !enHorario(ahora)) return { accion: "nada", motivo: "fuera de horario" };
    return { accion: "post_viaje" };
  }
  if (etapa === "confirmado" || etapa === "comprobante") return { accion: "nada", motivo: etapa };

  // ¿Ya pagó con la liga? Se revisa cada 15 min mientras haya cotización viva.
  const folio = s.ficha && s.ficha.folioVigente;
  const reciente = ahora - s.botAt < 8 * 24 * HORA; // la cotización vale 7 días
  if (folio && reciente && (etapa === "cotizado" || etapa === "pago_pendiente") && (!seg.revisadoPagoAt || ahora - seg.revisadoPagoAt >= 15 * 60 * 1000)) {
    return { accion: "revisar_pago", folio };
  }

  const clienteAt = s.clienteAt || 0;
  if (clienteAt >= s.botAt) return { accion: "nada", motivo: "el último mensaje es del cliente" };
  // Si alguien del equipo escribió a mano o el chat se le pasó al equipo, el
  // bot no le escribe por su cuenta hasta que el cliente vuelva a escribir.
  const intervino = Math.max(s.humanoAt || 0, s.escaladoAt || 0);
  if (intervino && intervino >= clienteAt) return { accion: "nada", motivo: "lo atiende el equipo" };
  if (NO_QUIERE_RE.test(ultimoTextoDelCliente(s))) return { accion: "nada", motivo: "dijo que no" };
  if (!enHorario(ahora)) return { accion: "nada", motivo: "fuera de horario" };

  // Lo que acordaron manda sobre el calendario (en cualquier etapa de venta).
  if (seg.agendado && seg.agendado.at) {
    if (ahora >= seg.agendado.at) return { accion: "agendado" };
    return { accion: "nada", motivo: "hay uno agendado" };
  }

  if (!ETAPAS_CON_SEGUIMIENTO.has(etapa)) return { accion: "nada", motivo: `etapa ${etapa}` };
  // Una plática de antes de Tének (sin `clienteAt`) no recibe recordatorios:
  // al desplegar, todos los chats viejos recibirían el «último recordatorio».
  if (!s.clienteAt) return { accion: "nada", motivo: "plática anterior al seguimiento" };
  // El viaje ya pasó: no se le recuerda una cotización de algo que no fue.
  const fechas = [
    ...((s.ficha && Array.isArray(s.ficha.recorridos) ? s.ficha.recorridos : []).map((r) => r && r.fecha)),
    ...((s.ficha && Array.isArray(s.ficha.fechasDichas)) ? s.ficha.fechasDichas : []),
  ].filter((f) => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  if (fechas.length && fechas[fechas.length - 1] < hoyMX(new Date(ahora))) return { accion: "nada", motivo: "el viaje ya pasó" };

  const base = seg.base && seg.base >= clienteAt ? seg.base : s.botAt;
  // Más de 4 días desde nuestro último mensaje: ya no es seguimiento, es spam.
  if (ahora - base > 4 * 24 * HORA) return { accion: "nada", motivo: "plática vieja" };
  const enviados = Array.isArray(seg.enviados) ? seg.enviados.filter((t) => t >= base) : [];
  const n = enviados.length;
  if (n >= PASOS_MS.length) return { accion: "nada", motivo: "ya van los 3" };
  // El paso más avanzado que ya venció (si el bot estuvo apagado, solo uno).
  let paso = -1;
  for (let i = n; i < PASOS_MS.length; i++) if (ahora - base >= PASOS_MS[i]) paso = i;
  if (paso < 0) return { accion: "nada", motivo: "todavía no" };
  return { accion: "recordar", paso: paso + 1, saltados: paso - n };
}

/** La nota que lee el modelo para escribir el recordatorio (nunca la ve el cliente). */
function notaParaElModelo(paso, s, { agendado = false } = {}) {
  const motivo = s.seguimiento && s.seguimiento.agendado && s.seguimiento.agendado.motivo;
  const cuando = agendado
    ? `Es la hora que acordaron para escribirle${motivo ? ` (${motivo})` : ""}.`
    : `Lleva ${paso === 1 ? "3 horas" : paso === 2 ? "un día" : "tres días"} sin contestar.`;
  return `[sistema] SEGUIMIENTO: el cliente NO escribió nada; este mensaje lo inicias tú. ${cuando} `
    + "Escríbele UN mensaje corto (2 o 3 líneas) que mencione algo concreto de SU viaje —su fecha, su tour o un lugar— "
    + "y termine con una pregunta fácil de contestar que avance a la siguiente etapa. "
    + "Nunca «¿qué te pareció la propuesta?», nunca presiones ni inventes escasez, y no repitas la cotización ni los datos de pago completos. "
    + (paso === 3 ? "Es el último recordatorio: déjale la puerta abierta con calidez." : "");
}

/** El mensaje de post-viaje (fijo: no necesita modelo). */
function textoPostViaje(s) {
  const en = s && s.locale === "en";
  const nombre = String((s && (s.nombre || (s.ficha && s.ficha.nombre))) || "").trim().split(/\s+/)[0];
  const tour = s && s.ficha && Array.isArray(s.ficha.recorridos) && s.ficha.recorridos[0] && s.ficha.recorridos[0].nombre;
  const corto = String(tour || "").split("—")[0].trim();
  return en
    ? `Hi${nombre ? ` ${nombre}` : ""}! 🌿 How was ${corto || "your trip to the Huasteca"}? We'd love to hear how it went.`
    : `¡Hola${nombre ? ` ${nombre}` : ""}! 🌿 ¿Cómo les fue en ${corto || "su viaje por la Huasteca"}? Nos encantaría saber cómo la pasaron.`;
}

module.exports = {
  decidirSeguimiento,
  notaParaElModelo,
  textoPostViaje,
  ultimoTextoDelCliente,
  horaMX,
  PASOS_MS,
  NO_QUIERE_RE,
};
