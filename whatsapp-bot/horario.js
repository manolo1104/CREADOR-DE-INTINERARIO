// ════════════════════════════════════════════════════════════════════
// Horario del equipo humano (hora de México).
//
// Cuando el bot pasa un chat al equipo, el cliente pregunta «¿y cuándo me
// contestan?». Esa promesa NO la puede inventar el modelo: si a las 11 de la
// noche dice «en unos minutos», el cliente se queda esperando despierto y
// nadie llega. Aquí vive la única cuenta, a partir de HORARIO_HUMANO
// (por omisión "08:00-21:00").
//
// La hora sale de Intl con la zona de México y NUNCA de la del servidor: el
// contenedor de Railway corre en UTC, y con su reloj el bot creía que a las
// 6 de la tarde ya era medianoche.
//
// Sin WhatsApp ni red: lo usan agent.js (herramienta escalar_a_humano),
// index.js y medios.js, y se prueba solo.
// ════════════════════════════════════════════════════════════════════

const ZONA_MX = "America/Mexico_City";
const HORARIO_POR_OMISION = "08:00-21:00";
const DIA_MIN = 24 * 60;

const FMT_HORA = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_MX, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const FMT_FECHA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_MX, year: "numeric", month: "2-digit", day: "2-digit",
});

/** "8", "08:00", "21:30" → minutos desde la medianoche (null si no se entiende). */
function aMinutos(txt) {
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(String(txt || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

// Se avisa UNA vez por valor raro: un HORARIO_HUMANO mal escrito no debe
// llenar el log en cada mensaje, pero tampoco pasar en silencio.
let horarioAvisado = null;

/**
 * Lee HORARIO_HUMANO ("08:00-21:00", "8-21", "08:00 – 21:00").
 * Si está mal escrito usa el de por omisión y lo dice en el log.
 * @returns {{abre:number, cierra:number, texto:string}} minutos desde medianoche
 */
function leerHorario(texto = process.env.HORARIO_HUMANO) {
  const crudo = String(texto || "").trim() || HORARIO_POR_OMISION;
  const m = /^(\d{1,2}(?::\d{2})?)\s*[-–]\s*(\d{1,2}(?::\d{2})?)$/.exec(crudo);
  const abre = m ? aMinutos(m[1]) : null;
  const cierra = m ? aMinutos(m[2]) : null;
  if (abre == null || cierra == null || abre === cierra) {
    if (horarioAvisado !== crudo) {
      horarioAvisado = crudo;
      console.warn(`⚠️ HORARIO_HUMANO="${crudo}" no se entiende (formato 08:00-21:00); uso ${HORARIO_POR_OMISION}.`);
    }
    return { abre: 8 * 60, cierra: 21 * 60, texto: HORARIO_POR_OMISION };
  }
  return { abre, cierra: cierra % DIA_MIN, texto: crudo };
}

/** Minutos transcurridos del día EN MÉXICO (0–1439). */
function minutosEnMexico(date = new Date()) {
  const partes = FMT_HORA.formatToParts(date);
  const h = Number((partes.find((p) => p.type === "hour") || {}).value) % 24;
  const min = Number((partes.find((p) => p.type === "minute") || {}).value);
  return h * 60 + min;
}

/** Fecha de México "AAAA-MM-DD" (la del calendario del cliente, no la del servidor). */
function fechaMexico(date = new Date()) {
  const partes = FMT_FECHA.formatToParts(date);
  const v = (t) => (partes.find((p) => p.type === t) || {}).value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}

/** Suma días a "AAAA-MM-DD" (en UTC a mediodía: sin líos de zona horaria). */
function sumarDias(ymd, n) {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** ¿Hay alguien del equipo ahorita? Acepta horarios que cruzan la medianoche ("20:00-02:00"). */
function enHorarioHumano(date = new Date()) {
  const { abre, cierra } = leerHorario();
  const m = minutosEnMexico(date);
  return abre < cierra ? m >= abre && m < cierra : m >= abre || m < cierra;
}

/**
 * Próximo momento en que ABRE el horario del equipo. Si ahorita está abierto,
 * es la apertura siguiente (la de mañana).
 * México no tiene horario de verano desde 2022: sumar minutos es exacto.
 */
function proximaApertura(date = new Date()) {
  const { abre } = leerHorario();
  const m = minutosEnMexico(date);
  let faltan = abre - m;
  if (faltan <= 0) faltan += DIA_MIN;
  // Al minuto exacto: sin los segundos que llevaba el reloj.
  return new Date(date.getTime() + faltan * 60000 - (date.getTime() % 60000));
}

function esIngles(locale) {
  return String(locale || "").toLowerCase().startsWith("en");
}

/** 480 → "8 am" · 1290 → "9:30 pm" (así se escribe en los chats de México). */
function horaCorta(minutos) {
  const total = ((Number(minutos) % DIA_MIN) + DIA_MIN) % DIA_MIN;
  const h = Math.floor(total / 60);
  const min = total % 60;
  const sufijo = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${sufijo}` : `${h12} ${sufijo}`;
}

/** "de 8 am a 9 pm" / "from 8 am to 9 pm". */
function horarioTexto(locale = "es") {
  const { abre, cierra } = leerHorario();
  return esIngles(locale)
    ? `from ${horaCorta(abre)} to ${horaCorta(cierra)}`
    : `de ${horaCorta(abre)} a ${horaCorta(cierra)}`;
}

/**
 * Qué se le promete al cliente cuando el chat pasa al equipo. Una oración,
 * lista para ir dentro de la respuesta del bot.
 *   · en horario: «en unos minutos»;
 *   · fuera de horario: «mañana desde las 8 am» (u «hoy», si aún no abre);
 *   · urgente fuera de horario: «lo antes posible» (el dueño recibe el aviso
 *     a cualquier hora, pero no se le promete una hora a nadie).
 */
function mensajeEspera({ urgencia = "normal", locale = "es", date = new Date() } = {}) {
  const en = esIngles(locale);
  if (enHorarioHumano(date)) {
    return en
      ? "Someone from our team will message you in a few minutes."
      : "Te escribe alguien del equipo en unos minutos.";
  }
  if (urgencia === "urgente") {
    return en
      ? "I've already alerted our team; someone will message you as soon as possible."
      : "Ya le avisé al equipo; te escribe alguien lo antes posible.";
  }
  const apertura = proximaApertura(date);
  const hoy = fechaMexico(apertura) === fechaMexico(date);
  const hora = horaCorta(minutosEnMexico(apertura));
  if (en) return `Someone from our team will message you ${hoy ? "today" : "tomorrow"} from ${hora}.`;
  // «desde la 1 pm» pero «desde las 8 am».
  const articulo = /^1(:|\s)/.test(hora) ? "la" : "las";
  return `Te escribe alguien del equipo ${hoy ? "hoy" : "mañana"} desde ${articulo} ${hora}.`;
}

module.exports = {
  ZONA_MX,
  HORARIO_POR_OMISION,
  leerHorario,
  minutosEnMexico,
  fechaMexico,
  sumarDias,
  enHorarioHumano,
  proximaApertura,
  horaCorta,
  horarioTexto,
  mensajeEspera,
};
