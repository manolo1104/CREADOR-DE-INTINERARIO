// ════════════════════════════════════════════════════════════════════
// PRUEBAS DE LA «ESTRUCTURA DE ORO» CON EL MODELO DE VERDAD (16 nov 2026)
//
// 🔴 CUESTA DINERO (poco con Haiku 5.5: centavos de dólar por corrida). Pide
// permiso a Manolo antes de correrla. Usa el SITIO SIMULADO: no crea folios
// reales, no manda correos ni toca Stripe.
//
//   BOT_ENV_FILE=/ruta/al/.env node test-estructura-oro.js [filtro]
//
// Cada escenario es una plática de WhatsApp sacada del documento «Estructura
// de oro de reservas por WhatsApp» (232 chats reales): los 6 tipos de primer
// mensaje, las 9 etapas, las dudas del Q&A, las objeciones, el pago y los
// casos que pasan al equipo. Revisa con reglas (regex y herramientas usadas)
// y deja la plática completa en un .md para leerla.
// ════════════════════════════════════════════════════════════════════

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: process.env.BOT_ENV_FILE || path.join(__dirname, ".env") });
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Falta ANTHROPIC_API_KEY (BOT_ENV_FILE=…).");
  process.exit(1);
}

const agente = require("./agent");
const { processMessage, setApiClient, setToolObserver, setUsageObserver, MODEL } = agente;
const { getSession, clearSession } = require("./sessions");
const adjuntos = require("./adjuntos");
const seguimiento = require("./seguimiento");
const { crearSitioSimulado } = require("./sitio-simulado");

const sitio = crearSitioSimulado();
setApiClient(sitio.api);

let herramientas = [];
setToolObserver((nombre, entrada, salida) => herramientas.push({ nombre, entrada, salida }));
let costoTotal = 0;
setUsageObserver(({ costoUSD }) => { costoTotal += Number(costoUSD) || 0; });

const FILTRO = process.argv[2] || "";
const SALIDA = process.env.ORO_SALIDA || path.join(__dirname, "..", "estructura-oro-resultados.md");

// ── Utilidades ───────────────────────────────────────────────────────
const usó = (t, nombre) => t.herramientas.some((h) => h.nombre === nombre);
const entradaDe = (t, nombre) => (t.herramientas.find((h) => h.nombre === nombre) || {}).entrada || {};
const escalo = (t, motivo, modo) => {
  const e = t.escalacion;
  return Boolean(e) && (!motivo || [].concat(motivo).includes(e.motivo)) && (!modo || e.modo === modo);
};

async function platica(id, mensajes, { antes } = {}) {
  const chatId = `oro-${id}@c.us`;
  clearSession(chatId);
  if (antes) await antes(chatId);
  const turnos = [];
  for (const m of mensajes) {
    herramientas = [];
    const s = getSession(chatId);
    s.escalacion = null;
    const texto = typeof m === "function" ? m(chatId) : m;
    let bot = "";
    try {
      bot = (await processMessage(chatId, texto)) || "";
    } catch (e) {
      bot = `💥 ERROR: ${e.message}`;
    }
    turnos.push({ cliente: texto, bot, herramientas, adjuntos: adjuntos.tomar(chatId), escalacion: getSession(chatId).escalacion });
    // El cliente contesta; en WhatsApp index.js lo marca al llegar.
    getSession(chatId).clienteAt = Date.now();
  }
  return turnos;
}

// Fechas reales a partir de hoy: el sábado de dentro de dos semanas.
function proximoSabado(semanas = 2) {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7) + 7 * (semanas - 1));
  return d;
}
const SABADO = proximoSabado(2);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SABADO_TXT = `sábado ${SABADO.getDate()} de ${MESES[SABADO.getMonth()]}`;
const DOMINGO = new Date(SABADO.getTime() + 86400000);
const FIN_TXT = `${SABADO.getDate()} y ${DOMINGO.getDate()} de ${MESES[DOMINGO.getMonth()]}`;

// ── Escenarios (del documento) ───────────────────────────────────────
const ESCENARIOS = [
  {
    id: "01-saludo-corto",
    doc: "Primer mensaje: saludo corto (29 % convierte) → saludo personal y una pregunta abierta: ¿qué fechas y cuántos son?",
    mensajes: ["Hola, buenas noches"],
    reglas: [
      ["se presenta como Tének", (t) => /T[ée]nek/i.test(t[0].bot)],
      ["dice que es asistente virtual y ayuda con toda la reserva", (t) => /asistente virtual/i.test(t[0].bot) && /reserva/i.test(t[0].bot)],
      ["pide fechas", (t) => /fecha|cu[aá]ndo|d[ií]as/i.test(t[0].bot)],
      ["pide cuántos son", (t) => /cu[aá]nt[oa]s|personas|son\b/i.test(t[0].bot)],
      ["no suelta el catálogo", (t) => !/Expedici[oó]n Tamul[\s\S]*Ruta Surrealista[\s\S]*Rafting/i.test(t[0].bot)],
    ],
  },
  {
    id: "02-web-tour-especifico",
    doc: "Primer mensaje: web con tour específico (28 %) → confirmar disponibilidad, pedir fecha y personas y mandar ese producto.",
    mensajes: ['Hola, me interesa el tour "Expedición Tamul — Tamul, Cueva del Agua y Sótano" para 2 adultos. ¿Tienen disponibilidad?'],
    reglas: [
      ["se presenta como Tének", (t) => /T[ée]nek/i.test(t[0].bot)],
      ["pide la fecha", (t) => /fecha|cu[aá]ndo|qu[eé] d[ií]a/i.test(t[0].bot)],
      ["no vuelve a preguntar cuántos son", (t) => !/cu[aá]nt[oa]s (personas|son|van)/i.test(t[0].bot)],
    ],
  },
  {
    id: "03-trae-fecha-y-personas-flujo-completo",
    doc: "Ya trae fecha y personas (23 %) → propuesta y nombre/correo en el mismo intercambio → cotización PDF + «¿Deseas que te envíe los pasos para reservar?» → pago en un solo mensaje → «Quedo en espera del comprobante».",
    mensajes: [
      `Somos dos personas adultas, queremos ir a Tamul el ${SABADO_TXT}. Nos quedamos en Xilitla.`,
      "Va, me llamo Ana Prueba Martínez y mi correo es ana@test.invalid",
      "Sí, por favor",
    ],
    reglas: [
      ["propone con lugares y precio", (t) => /Tamul/i.test(t[0].bot) && /\$\s?\d/.test(t[0].bot)],
      ["pide nombre y correo en el primer intercambio", (t) => /nombre/i.test(t[0].bot) && /correo|email|mail/i.test(t[0].bot)],
      ["crea la cotización", (t) => usó(t[1], "crear_cotizacion") || usó(t[1], "cotizar_paquete_personalizado")],
      ["deja el PDF en la cola", (t) => t[1].adjuntos.some((a) => a.tipo === "pdf")],
      ["pregunta «pasos para reservar»", (t) => /pasos para reservar|steps to book/i.test(t[1].bot)],
      ["pide datos de pago con su sí", (t) => usó(t[2], "datos_pago")],
      ["pago en un mensaje: CLABE + OXXO + liga exacta", (t) => /CLABE/.test(t[2].bot) && /OXXO/.test(t[2].bot) && /buy\.stripe\.com\/test_COT-/.test(t[2].bot)],
      ["cierra esperando el comprobante", (t) => /espera de tu comprobante|waiting for your receipt/i.test(t[2].bot)],
      ["vigencia 7 días", (t) => /7 d[ií]as|v[ií]spera/i.test(t[1].bot)],
    ],
  },
  {
    id: "04-pregunta-libre",
    doc: "Pregunta libre (22 %) → contestar la pregunta en la primera línea; después calificar.",
    mensajes: ["¿En qué tour puedo incluir La Trinidad?"],
    reglas: [
      ["contesta qué tour visita La Trinidad", (t) => /Olla de la Luz|Amanecer de Nubes|RZR|Trinidad/i.test(t[0].bot.split("\n").slice(0, 4).join(" "))],
      ["termina con una pregunta", (t) => /\?\s*(\S{0,3})?\s*$/.test(t[0].bot.trim())],
    ],
  },
  {
    id: "05-ingles",
    doc: "Inglés (15 %) → todo en inglés, incluida la cotización.",
    mensajes: [`Hi! Could you arrange a trip for 2 people on ${SABADO.toISOString().slice(0, 10)}? We love waterfalls.`],
    reglas: [
      ["contesta en inglés", (t) => /\b(the|you|we|your|waterfall)\b/i.test(t[0].bot) && !/\b(hola|personas|te mando|cotizaci[oó]n)\b/i.test(t[0].bot)],
      ["se presenta como Tének", (t) => /T[ée]nek/i.test(t[0].bot)],
    ],
  },
  {
    id: "06-informacion-general",
    doc: "Web «información general» (8 %, el más frío) → 3 opciones concretas por tipo de viajero y preguntar cuál les late.",
    mensajes: ["Hola, quiero información sobre los tours de la Huasteca Potosina."],
    reglas: [
      ["da opciones concretas con precio", (t) => (t[0].bot.match(/\$\s?\d/g) || []).length >= 2],
      ["no más de 3 opciones", (t) => (t[0].bot.match(/^\s*(•|-|\d\.)/gm) || []).length <= 4],
      ["pregunta cuál les late", (t) => /\?/.test(t[0].bot)],
    ],
  },
  {
    id: "07-qa-horario",
    doc: "Duda: horario y duración (69 % de las reservas) → datos exactos; la hora exacta la confirma el guía la noche anterior.",
    mensajes: [`Hola, somos 2 para la Expedición Tamul el ${SABADO_TXT}, nos quedamos en Ciudad Valles. ¿A qué hora salimos y a qué hora regresamos?`],
    reglas: [
      ["da la hora de salida", (t) => /8(:00)?\s*(y|a|–|-)\s*9|8:00|8 a 9/i.test(t[0].bot)],
      ["da duración o regreso (de la ficha)", (t) => /12|13|8:00\s*(–|-|a)\s*9:00 PM|regres/i.test(t[0].bot)],
      ["no inventa «medio día»", (t) => !/medio d[ií]a|unas horitas/i.test(t[0].bot)],
    ],
  },
  {
    id: "08-qa-pago-tarjeta",
    doc: "Duda: pago, anticipo, tarjeta (65 %) → 30 % para reservar, transferencia, OXXO o liga con tarjeta; no se lleva terminal.",
    mensajes: ["¿Cómo se paga? ¿Puedo pagar con tarjeta?"],
    reglas: [
      ["anticipo del 30 %", (t) => /30\s?%/.test(t[0].bot)],
      ["tarjeta por liga", (t) => /liga|link|enlace/i.test(t[0].bot)],
      ["no promete terminal del guía", (t) => !/terminal (del|con el) gu[ií]a|el gu[ií]a cobra con tarjeta/i.test(t[0].bot)],
    ],
  },
  {
    id: "09-qa-recogida-como-llegar",
    doc: "Duda: recogida y cómo llegar (55 %) → pasamos por ustedes a Xilitla o Ciudad Valles; autobús CDMX–Xilitla.",
    mensajes: ["Venimos de CDMX en autobús, ¿ustedes pasan por nosotros?"],
    reglas: [
      ["habla de recoger en el hospedaje", (t) => /hospedaje|hotel|pasamos por/i.test(t[0].bot)],
      ["menciona Xilitla o Ciudad Valles", (t) => /Xilitla|Valles/i.test(t[0].bot)],
    ],
  },
  {
    id: "10-qa-hospedaje",
    doc: "Duda: hospedaje (49 %) → recomendar zona según sus tours; ofrecer con y sin hotel.",
    mensajes: ["Vamos a ir a Tamul y a Las Pozas, ¿dónde nos conviene quedarnos?"],
    reglas: [
      ["consulta la política de hospedaje o recomienda zona", (t) => usó(t[0], "consultar_politica") || /Xilitla/i.test(t[0].bot)],
      ["no cotiza en ese mensaje (R1)", (t) => !usó(t[0], "crear_cotizacion") && !usó(t[0], "cotizar_paquete_personalizado")],
      ["hotel como opción, no requisito", (t) => !/tienen que hospedarse con nosotros|es obligatorio/i.test(t[0].bot)],
    ],
  },
  {
    id: "11-qa-clima-cierre",
    doc: "Duda/freno: clima y parajes cerrados → decirlo con honestidad, 2 o 3 alternativas y reembolso del 100 % si el paraje cierra.",
    mensajes: [`Queremos ir a Tamul el ${SABADO_TXT}, ¿y si llueve? Leí que a veces cierran la cascada.`],
    reglas: [
      ["habla de reembolso o reagendar", (t) => /reembols|reagend|100\s?%/i.test(t[0].bot)],
      ["no dice que la lluvia no afecta", (t) => !/la lluvia no afecta/i.test(t[0].bot)],
    ],
  },
  {
    id: "12-qa-incluye-comida",
    doc: "Duda: qué incluye y comida → desayuno buffet en los tours que lo incluyen; la comida no está incluida salvo que se diga.",
    mensajes: ["¿Qué incluye la Expedición Tamul? ¿Va incluida la comida?"],
    reglas: [
      ["dice desayuno", (t) => /desayuno/i.test(t[0].bot)],
      ["la comida NO va incluida", (t) => /comida[^.]{0,40}no|no[^.]{0,40}comida/i.test(t[0].bot)],
      ["nunca «todo incluido»", (t) => !/todo incluido/i.test(t[0].bot) || /no es todo incluido|ning[uú]n tour es .?todo incluido/i.test(t[0].bot)],
    ],
  },
  {
    id: "13-qa-ninos-edad",
    doc: "Duda: niños, edad, seguridad → pedir edades; respetar edad mínima.",
    mensajes: [`Queremos hacer rafting el ${SABADO_TXT}, vamos 2 adultos y mi hijo de 7 años.`],
    reglas: [
      ["dice que el rafting es desde 8 años", (t) => /8 a[nñ]os|ocho a[nñ]os|edad m[ií]nima/i.test(t[0].bot)],
      ["no cotiza el rafting con el niño", (t) => !usó(t[0], "crear_cotizacion")],
    ],
  },
  {
    id: "14-objecion-pareja",
    doc: "Freno: «lo platico con mi pareja» (el más común) → PDF para compartir y acordar hora: «¿Te escribo mañana a las 6?».",
    mensajes: [
      `Somos 2 adultos para la Ruta Surrealista el ${SABADO_TXT}, nos quedamos en Xilitla. Me llamo Luis Prueba, luis@test.invalid`,
      "Déjame lo platico con mi esposa y te digo",
      "Sí, mañana a las 6 está bien",
    ],
    reglas: [
      ["cotiza con nombre y correo", (t) => usó(t[0], "crear_cotizacion") || usó(t[0], "cotizar_paquete_personalizado")],
      ["propone compartir y acordar hora", (t) => /compart|reenv/i.test(t[1].bot) && /mañana|hora|te escribo/i.test(t[1].bot)],
      ["agenda el seguimiento", (t) => usó(t[2], "agendar_seguimiento")],
    ],
  },
  {
    id: "15-confianza",
    doc: "Freno: confianza; datos bancarios a nombre de una persona → mensaje fijo de confianza con web, Google y redes.",
    mensajes: ["¿Tienen redes o reseñas? Me da desconfianza depositarle a una persona."],
    reglas: [
      ["manda reseñas de Google", (t) => /maps\.app\.goo\.gl|google/i.test(t[0].bot)],
      ["manda la página o Facebook", (t) => /huasteca-potosina\.com|facebook/i.test(t[0].bot)],
      ["explica el titular o la liga segura", (t) => /fundador|Manolo|liga|tarjeta|Stripe/i.test(t[0].bot)],
      ["no menciona otras marcas", (t) => !/Sorprendente|4x4/i.test(t[0].bot)],
    ],
  },
  {
    id: "15b-otra-marca",
    doc: "Solo existe Huasteca Potosina Tours: no explica otros nombres (Manolo, 17 nov).",
    mensajes: ["¿Ustedes son los mismos de Sorprendente Tour o de Xilitla 4x4?"],
    reglas: [
      ["dice que son Huasteca Potosina Tours", (t) => /Huasteca Potosina Tours/i.test(t[0].bot)],
      ["no explica ni compara la otra marca", (t) => !/(Sorprendente|4x4)[^.]{0,80}(es|son|somos|marca|empresa|hermana|también)/i.test(t[0].bot)],
    ],
  },
  {
    id: "16-grupo-escuela",
    doc: "Pasar a humano: grupo de más de 10 personas.",
    mensajes: ["Hola, somos un grupo de 25 alumnos de una escuela de la CDMX, queremos ir en marzo."],
    reglas: [
      ["pasa el chat al equipo (grupo)", (t) => escalo(t[0], "grupo", "pasar")],
      ["no contesta solo «te escribe alguien»: saluda y pide lo que falta", (t) => t[0].bot.split("\n").filter(Boolean).length >= 2 && /\?/.test(t[0].bot)],
      ["no inventa descuento", (t) => !/\d+\s?%\s*de descuento|descuento de \$/i.test(t[0].bot)],
      ["pregunta si necesitan factura", (t) => /factura/i.test(t[0].bot)],
    ],
  },
  {
    id: "17-factura",
    doc: "Pasar a humano: factura.",
    mensajes: ["¿Me pueden dar factura? Es para la empresa."],
    reglas: [["avisa al equipo (factura)", (t) => escalo(t[0], "factura")]],
  },
  {
    id: "18-descuento",
    doc: "Freno: precio o descuento (Manolo: por ahora sin descuento de cierre) → no inventarlo; avisar al equipo.",
    mensajes: [`Somos 2 para la Expedición Tamul el ${SABADO_TXT}. ¿Me haces un descuento?`],
    reglas: [
      ["no ofrece descuento", (t) => !/te (hago|doy|dejo)[^.]{0,30}(descuento|\$\d+ menos)|\$100 (menos|de descuento)/i.test(t[0].bot)],
      ["avisa al equipo o defiende el valor", (t) => escalo(t[0], ["descuento", "grupo"]) || /incluye|30\s?%/i.test(t[0].bot)],
    ],
  },
  {
    id: "19-pago-dividido",
    doc: "Freno: pago con tarjeta o dividido → link de pago, uno por persona si lo piden.",
    mensajes: [
      `Somos 3 adultos para la Expedición Tamul el ${SABADO_TXT}, nos quedamos en Ciudad Valles. Soy Carla Prueba, carla@test.invalid`,
      "Cada quien quiere pagar su parte con tarjeta: Carla, Luis y Ana. ¿Se puede?",
    ],
    reglas: [
      ["cotiza", (t) => usó(t[0], "crear_cotizacion")],
      ["manda una liga por persona", (t) => usó(t[1], "enviar_link_pago") && Number(entradaDe(t[1], "enviar_link_pago").partes) === 3],
      ["las ligas llegan al chat, exactas", (t) => (t[1].bot.match(/buy\.stripe\.com\/test_COT-SIM\d+_\d/g) || []).length >= 3],
      ["cada liga lleva el nombre de quien paga", (t) => /Luis[^\n]*\n\s*https:\/\/buy\.stripe/i.test(t[1].bot) && /Ana[^\n]*\n\s*https:\/\/buy\.stripe/i.test(t[1].bot)],
    ],
  },
  {
    id: "20-eres-bot",
    doc: "Honestidad: si preguntan en serio si es un bot, decirlo con naturalidad.",
    mensajes: ["Hola, ¿eres un bot o una persona?"],
    reglas: [["dice que es el asistente virtual", (t) => /asistente virtual|virtual/i.test(t[0].bot) && !/soy una persona|no soy un bot/i.test(t[0].bot)]],
  },
  {
    id: "21-precio-con-incluye",
    doc: "Duda: precio → precio por persona y qué incluye en el mismo mensaje, nunca el precio solo.",
    mensajes: ["¿Cuánto cuesta la Expedición Tamul?"],
    reglas: [
      ["el precio sale primero", (t) => /\$\s?1[,.]?\d{3}/.test(t[0].bot.split("\n").slice(0, 3).join(" "))],
      ["dice qué incluye", (t) => /incluye|desayuno|traslado|gu[ií]a/i.test(t[0].bot)],
    ],
  },
  {
    id: "22-propuesta-dia-por-dia",
    doc: "Etapa 3: propuesta día por día con 1 a 3 productos y foto.",
    mensajes: [`Somos 2, vamos el ${FIN_TXT}, nos quedamos en Xilitla y nos encantan las cascadas y el jardín surrealista. ¿Qué nos recomiendas?`],
    reglas: [
      ["horario de cada tour, sin «mismo horario»", (t) => !/mismo horario/i.test(t[0].bot) && !/Surrealista[^•]{0,240}8:00 PM/i.test(t[0].bot)],
      ["itinerario por día", (t) => new RegExp(`(${SABADO.getDate()}|s[aá]bado)[\\s\\S]*(${DOMINGO.getDate()}|domingo)`, "i").test(t[0].bot)],
      ["máximo 3 tours", (t) => !usó(t[0], "enviar_fotos") || (entradaDe(t[0], "enviar_fotos").slugs || []).length <= 3],
      ["manda fotos de lo que propone", (t) => t[0].adjuntos.some((a) => a.tipo === "foto")],
      ["cierra con «¿Te armo la cotización?»", (t) => /te armo la cotizaci[oó]n|armo tu cotizaci[oó]n|mando la cotizaci[oó]n|nombre/i.test(t[0].bot)],
    ],
  },
  {
    id: "23-seguimiento-3h",
    doc: "Seguimiento: a las 3 h sin respuesta, un mensaje concreto (su fecha, su tour), nunca «¿qué te pareció la propuesta?».",
    mensajes: [
      `Somos 4 para la Expedición Tamul el ${SABADO_TXT}, nos quedamos en Xilitla.`,
      (chatId) => seguimiento.notaParaElModelo(1, getSession(chatId)),
    ],
    reglas: [
      ["menciona su tour o su fecha", (t) => /Tamul|s[aá]bado|\b\d{1,2}\b/i.test(t[1].bot)],
      ["no dice «¿qué te pareció?»", (t) => !/qu[eé] te pareci[oó]/i.test(t[1].bot)],
      ["es corto (≤ 5 líneas)", (t) => t[1].bot.trim().split("\n").filter(Boolean).length <= 5],
      ["pide el nombre de quien reserva, no de cada uno", (t) => !/cada (quien|uno|persona)/i.test(t[0].bot)],
    ],
  },
  {
    id: "24-llamada",
    doc: "Pasar a humano: cuando pide llamada.",
    mensajes: ["¿Me pueden llamar mejor? Es más fácil por teléfono."],
    reglas: [["pasa el chat (llamada)", (t) => escalo(t[0], ["llamada", "pide_humano"], "pasar")]],
  },
  {
    id: "25-paquete-catalogo",
    doc: "Web: paquete específico → confirmar y pedir lo que falte; precio por pareja tal cual.",
    mensajes: ["Hola, me interesa el paquete Inmersión Huasteca, ¿qué incluye y cuánto cuesta?"],
    reglas: [
      ["usa el paquete", (t) => usó(t[0], "obtener_paquete") || usó(t[0], "listar_paquetes")],
      ["precio por pareja", (t) => /pareja|para 2|dos personas/i.test(t[0].bot)],
      ["pide fecha de llegada o personas", (t) => /fecha|llegada|cu[aá]nd|cu[aá]nt/i.test(t[0].bot)],
    ],
  },
  {
    id: "26-rzr",
    doc: "RZR: por vehículo; pedir ruta, personas y hora de inicio (9 am a 5 pm); da precios antes de elegir unidad.",
    mensajes: [`Queremos rentar RZR para 4 personas el ${SABADO_TXT}, la ruta de los miradores.`],
    reglas: [
      ["cotiza por vehículo", (t) => usó(t[0], "cotizar_rzr") || /veh[ií]culo|unidad|Defender|Maverick|Polaris/i.test(t[0].bot)],
      ["pregunta la hora de inicio o da opciones", (t) => /hora|9|5 ?pm|unidad|cu[aá]l/i.test(t[0].bot)],
      ["no dice que incluye traslado", (t) => !/traslado (redondo )?incluido|pasamos por (ti|ustedes)/i.test(t[0].bot)],
    ],
  },
  {
    id: "27-para-manana",
    doc: "Para mañana: se cotiza; el anticipo antes de las 10 pm; avisa al equipo.",
    mensajes: [(() => { const m = new Date(Date.now() + 86400000); return `¿Tienen lugar para mañana ${m.getDate()} de ${MESES[m.getMonth()]} en Tamul? Somos 2 y estamos en Ciudad Valles.`; })()],
    reglas: [
      ["avisa al equipo (para mañana)", (t) => escalo(t[0], "para_manana")],
      ["menciona el plazo de las 10 pm o que el equipo confirma", (t) => /10 ?pm|22:00|primera hora|confirm/i.test(t[0].bot)],
    ],
  },
  {
    id: "28-para-hoy",
    doc: "Para hoy (Manolo, 17 nov): solo RZR, Travesía del Café y Gruta de Xilo; los demás, desde mañana.",
    mensajes: ["¿Hay algún tour para hoy? Somos 2 y estamos en Xilitla."],
    reglas: [
      ["ofrece los del mismo día o mañana", (t) => /RZR|Caf[eé]|Xilo|mañana/i.test(t[0].bot)],
      ["no ofrece Tamul ni otro tour para hoy", (t) => !/(Tamul|Surrealista|Meco|Rafting|Puente de Dios)[^.\n]{0,40}\bhoy\b/i.test(t[0].bot)],
      ["no confirma que sí hay lugar hoy", (t) => !/s[ií] hay lugar (para )?hoy|queda confirmado/i.test(t[0].bot)],
    ],
  },
  {
    id: "28b-tamul-hoy",
    doc: "Tour que no va el mismo día: lo dice claro, ofrece mañana; no cotiza para hoy y no escala.",
    mensajes: ["Queremos ir hoy a la Expedición Tamul, somos 2 adultos en Ciudad Valles."],
    reglas: [
      ["dice que hoy no se puede", (t) => /no (se )?(puede|alcanza|agenda|es posible)|ya no|desde mañana|anticipaci[oó]n/i.test(t[0].bot)],
      ["ofrece mañana u otra fecha", (t) => /mañana|otra fecha|otro d[ií]a/i.test(t[0].bot)],
      ["no cotiza Tamul para hoy", (t) => !usó(t[0], "crear_cotizacion")],
      ["no pasa el chat al equipo", (t) => !escalo(t[0], "para_hoy", "pasar")],
    ],
  },
  {
    id: "28c-gruta-hoy",
    doc: "Gruta de Xilo sí va el mismo día: se cotiza y el equipo confirma lugar y hora.",
    mensajes: [
      "¿Podemos hacer la Gruta de Xilo hoy en la noche? Somos 2 adultos y nos quedamos en Xilitla.",
      "Va, soy Eva Prueba, eva@test.invalid",
    ],
    reglas: [
      ["no dice que hoy no se puede", (t) => !/no (se )?(puede|agenda) (para )?hoy|desde mañana/i.test(t[0].bot)],
      ["cotiza para hoy", (t) => usó(t[1], "crear_cotizacion")],
      ["avisa al equipo (para hoy)", (t) => escalo(t[0], "para_hoy") || escalo(t[1], "para_hoy")],
      ["no dice que ya quedó", (t) => !/queda confirmad|ya qued[oó]/i.test(t[0].bot + t[1].bot)],
    ],
  },
  {
    id: "29-golondrinas",
    doc: "Fuera de catálogo: Golondrinas no se opera; ofrecer lo que sí hay (Huahuas).",
    mensajes: ["¿Llevan al Sótano de las Golondrinas?"],
    reglas: [
      ["dice que no lo operamos", (t) => /no (lo )?(operamos|llevamos|incluimos|va)|no est[aá]/i.test(t[0].bot)],
      ["ofrece las Huahuas o la Expedición Tamul", (t) => /Huahuas|Expedici[oó]n Tamul/i.test(t[0].bot)],
    ],
  },
  {
    id: "30-cambio-de-fecha",
    doc: "Cambio antes de pagar: recotiza el viaje completo; la nueva reemplaza a la anterior.",
    mensajes: [
      `Somos 2 adultos para la Expedición Tamul el ${SABADO_TXT}, en Xilitla. Soy Eva Prueba, eva@test.invalid`,
      "Oye, ¿lo podemos cambiar al domingo? Mejor el domingo",
    ],
    reglas: [
      ["primera cotización", (t) => usó(t[0], "crear_cotizacion")],
      ["recotiza el cambio", (t) => usó(t[1], "crear_cotizacion") || usó(t[1], "cotizar_paquete_personalizado")],
      ["la nueva reemplaza a la anterior", (t) => /reemplaza|ya no (es )?v[aá]lid/i.test(t[1].bot)],
      ["manda el PDF nuevo", (t) => t[1].adjuntos.some((a) => a.tipo === "pdf")],
    ],
  },
  {
    id: "31-lo-voy-a-pensar",
    doc: "Objeción «lo voy a pensar»: sin presión, vigencia real y acordar seguimiento.",
    mensajes: [
      `Somos 2 para la Ruta Acuática el ${SABADO_TXT}, en Ciudad Valles. Me llamo Raúl Prueba, raul@test.invalid`,
      "Lo voy a pensar",
    ],
    reglas: [
      ["no presiona ni inventa escasez", (t) => !/quedan (solo )?\d+ lugares|[uú]ltimos lugares/i.test(t[1].bot)],
      ["ofrece escribirle o deja la puerta con fecha", (t) => /te escribo|mañana|cu[aá]ndo|7 d[ií]as/i.test(t[1].bot)],
    ],
  },
  {
    id: "32-esta-caro",
    doc: "Objeción «está caro»: desglosa lo incluido, recuerda el 30 % y ofrece algo más económico; sin descuento.",
    mensajes: ["Está muy caro el rafting, lo vi más barato en otro lado"],
    reglas: [
      ["desglosa lo incluido", (t) => /incluye|gu[ií]a|seguro|comida|equipo/i.test(t[0].bot)],
      ["no inventa descuento", (t) => !/te (hago|doy|dejo)[^.]{0,30}descuento/i.test(t[0].bot)],
    ],
  },
  {
    id: "33-viajero-solo",
    doc: "Bajo el mínimo (Manolo, 17 nov): el mínimo es mínimo; no se cotiza y se ofrece alternativa.",
    mensajes: [`Voy yo solo, quiero hacer la Expedición Tamul el ${SABADO_TXT}, me quedo en Xilitla.`],
    reglas: [
      ["dice el mínimo de 2", (t) => /m[ií]nimo|desde 2|2 personas|dos personas/i.test(t[0].bot)],
      ["no cotiza", (t) => !usó(t[0], "crear_cotizacion")],
      ["no ofrece sumarlo a otro grupo", (t) => !/(te|lo|los) sumamos|sumarte a|unirte a (una|otra) salida|con otros viajeros/i.test(t[0].bot)],
    ],
  },
  {
    id: "33b-rafting-3",
    doc: "Rafting pide 5: con 3 no se cotiza (lo que falló en las pruebas de Manolo).",
    mensajes: [`Somos 3 adultos y queremos hacer el rafting el ${SABADO_TXT}, nos quedamos en Ciudad Valles.`],
    reglas: [
      ["dice el mínimo de 5", (t) => /5 personas|cinco|m[ií]nimo de 5|desde 5/i.test(t[0].bot)],
      ["no cotiza el rafting", (t) => !usó(t[0], "crear_cotizacion")],
      ["no ofrece salida compartida ni reembolso", (t) => !/salida compartida|te sumamos|lo sumamos|se (les )?devuelve el 100/i.test(t[0].bot)],
      ["ofrece una alternativa", (t) => /Tamul|Meco|Puente de Dios|Micos|RZR|otra opci[oó]n|alternativa|completar/i.test(t[0].bot)],
    ],
  },
  {
    id: "33c-pagar-todo-el-dia",
    doc: "«¿Podemos pagar todo el día del tour?» → claro: hoy se aparta con el 30 %, el resto ese día antes de empezar.",
    mensajes: [`Somos 2 para la Expedición Tamul el ${SABADO_TXT}. ¿Podemos pagar todo el día del tour?`],
    reglas: [
      ["dice que se aparta con el 30 %", (t) => /30\s?%|anticipo/i.test(t[0].bot) && /apart/i.test(t[0].bot)],
      ["no se contradice («no el día del tour» y luego «el resto ese día»)", (t) => !/no (es |se paga )?el d[ií]a del tour/i.test(t[0].bot)],
    ],
  },
  {
    id: "33d-empresa",
    doc: "Grupo de empresa: además de pasarlo, pregunta si necesitan factura.",
    mensajes: ["Hola, somos 15 personas de una empresa y queremos ir en enero a Xilitla."],
    reglas: [
      ["pasa el chat (grupo)", (t) => escalo(t[0], "grupo")],
      ["pregunta si necesitan factura", (t) => /factura/i.test(t[0].bot)],
    ],
  },
  {
    id: "34-ingles-flujo",
    doc: "Inglés: cotización y cierre en inglés.",
    mensajes: [
      `Hi, we are 2 adults and want to do the Tamul Expedition on ${SABADO.toISOString().slice(0, 10)}. We're staying in Xilitla.`,
      "Great! My name is John Test and my email is john@test.invalid",
    ],
    reglas: [
      ["cotiza", (t) => usó(t[1], "crear_cotizacion")],
      ["cotización en inglés", (t) => /quote|total|deposit|valid/i.test(t[1].bot) && !/Tu cotizaci[oó]n|Apartas con/i.test(t[1].bot)],
      ["pregunta los pasos para reservar en inglés", (t) => /steps to book|send you the steps|how to book/i.test(t[1].bot)],
    ],
  },
  {
    id: "35-seguimiento-72h",
    doc: "Último seguimiento (72 h): cálido, deja la puerta abierta, sin presión.",
    mensajes: [
      `Somos 2 para Cascadas del Meco el ${SABADO_TXT}, en Xilitla.`,
      (chatId) => seguimiento.notaParaElModelo(3, getSession(chatId)),
    ],
    reglas: [
      ["menciona su tour o fecha", (t) => /Meco|s[aá]bado|\b\d{1,2}\b/i.test(t[1].bot)],
      ["sin presión", (t) => !/[uú]ltima oportunidad|se te va|quedan pocos/i.test(t[1].bot)],
      ["no dice «¿qué te pareció?»", (t) => !/qu[eé] te pareci[oó]/i.test(t[1].bot)],
    ],
  },
  {
    id: "36-post-viaje-bien",
    doc: "Después del viaje: «¿Cómo les fue?» → si bien, pedir reseña en Google (39 % hoy, meta 100 %).",
    antes: (chatId) => {
      const s = getSession(chatId);
      s.ficha.recorridos = [{ slug: "expedicion-tamul", nombre: "Expedición Tamul", fecha: "2026-11-14" }];
      s.ficha.pagoValidado = true;
      s.ficha.reservaFolio = "HP-M-0999";
      // Quedó pendiente la pregunta del hotel de la confirmación: tras el viaje ya no aplica.
      s.history.push({ role: "user", content: "[sistema] Pagó con la liga de tarjeta: COT-0999 ya es la reserva HP-M-0999. Ya se le mandó la confirmación con el PDF y se le preguntó dónde se hospeda: cuando lo diga, llama escalar_a_humano (recogida, avisar, normal) con el hotel y el folio HP-M-0999." });
      s.history.push({ role: "assistant", content: "✅ ¡Recibimos tu pago con tarjeta! Tu reserva HP-M-0999 está confirmada.\nTe mando tu confirmación en PDF. ¿En qué hotel o lugar se hospedan? Así el guía pasa por ustedes. 🌿" });
      s.history.push({ role: "user", content: seguimiento.NOTA_POST_VIAJE });
      s.history.push({ role: "assistant", content: seguimiento.textoPostViaje({ locale: "es", nombre: "Ana", ficha: s.ficha }) });
      s.botAt = Date.now();
    },
    mensajes: ["¡Increíble! Nos encantó, el guía súper buena onda 😍"],
    reglas: [
      ["pide la reseña con el enlace EXACTO de Google", (t) => t[0].bot.includes("https://g.page/r/CZg8hdQa_GI9EBM/review")],
      ["agradece", (t) => /gracias|qu[eé] gusto|nos alegra/i.test(t[0].bot)],
      ["ya no pregunta por el hotel ni la recogida", (t) => !/hotel|hosped|recog|pase por/i.test(t[0].bot)],
    ],
  },
  {
    id: "37-post-viaje-mal",
    doc: "Después del viaje con queja → disculpa breve y pasar al equipo (queja).",
    antes: (chatId) => {
      const s = getSession(chatId);
      s.ficha.recorridos = [{ slug: "expedicion-tamul", nombre: "Expedición Tamul", fecha: "2026-11-14" }];
      s.ficha.pagoValidado = true;
      s.history.push({ role: "user", content: seguimiento.NOTA_POST_VIAJE });
      s.history.push({ role: "assistant", content: seguimiento.textoPostViaje({ locale: "es", nombre: "Ana", ficha: s.ficha }) });
      s.botAt = Date.now();
    },
    mensajes: ["La verdad no nos gustó, el guía llegó una hora tarde y no hubo canoa."],
    reglas: [
      ["pasa al equipo (queja)", (t) => escalo(t[0], ["queja_incidente", "cliente_molesto"], "pasar")],
      ["no pide reseña", (t) => !/g\.page|d[eé]janos (tu|una) rese[nñ]a/i.test(t[0].bot)],
      ["no ofrece compensación", (t) => !/reembolso|descuento|cortes[ií]a/i.test(t[0].bot) || /el equipo/i.test(t[0].bot)],
    ],
  },
  {
    id: "38-mascotas",
    doc: "Mascotas: el hotel no admite; en tours lo confirma el equipo.",
    mensajes: ["¿Puedo llevar a mi perrito al tour y al hotel?"],
    reglas: [
      ["el hotel no admite mascotas", (t) => /no (se )?admit|no aceptamos|no se permiten|no (podemos|puede[ns]?) recibir/i.test(t[0].bot)],
      ["no promete los tours", (t) => !/s[ií] puede(s)? (ir|llevar)[^.]{0,30}tour/i.test(t[0].bot)],
    ],
  },
  {
    id: "39-seguridad-no-nado",
    doc: "Objeción «¿es seguro?» / no sé nadar → guías certificados, chalecos, grupos pequeños; preguntar qué le preocupa.",
    mensajes: ["¿Es seguro la Expedición Tamul? Yo no sé nadar."],
    reglas: [
      ["habla de chaleco o guía certificado", (t) => /chaleco|certificad|NOM-09|rescate/i.test(t[0].bot)],
      ["no diagnostica ni promete de más", (t) => !/no pasa nada|100\s?% seguro/i.test(t[0].bot)],
    ],
  },
];

// ── Correr ───────────────────────────────────────────────────────────
(async () => {
  const elegidos = ESCENARIOS.filter((e) => !FILTRO || e.id.includes(FILTRO));
  console.log(`\n🏆 Estructura de oro con ${MODEL} · ${elegidos.length} pláticas · sitio SIMULADO\n`);
  const md = [`# Pruebas de la Estructura de oro — ${new Date().toISOString().slice(0, 16)} · ${MODEL}\n`];
  let ok = 0;
  let total = 0;
  for (const e of elegidos) {
    const t0 = Date.now();
    const turnos = await platica(e.id, e.mensajes, { antes: e.antes });
    const resultados = e.reglas.map(([nombre, fn]) => {
      let paso = false;
      try { paso = Boolean(fn(turnos)); } catch { paso = false; }
      return { nombre, paso };
    });
    const bien = resultados.filter((r) => r.paso).length;
    ok += bien;
    total += resultados.length;
    console.log(`${bien === resultados.length ? "✅" : "⚠️ "} ${e.id} — ${bien}/${resultados.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
    for (const r of resultados) if (!r.paso) console.log(`     ✗ ${r.nombre}`);
    md.push(`## ${bien === resultados.length ? "✅" : "⚠️"} ${e.id} — ${bien}/${resultados.length}`, `_${e.doc}_`, "");
    for (const tu of turnos) {
      md.push(`**Cliente:** ${tu.cliente.replace(/\n/g, " ")}`, "");
      if (tu.adjuntos.length) md.push(`📎 ${tu.adjuntos.map((a) => (a.tipo === "pdf" ? `PDF ${a.nombre}` : `foto ${a.caption || ""}`)).join(" · ")}`, "");
      md.push(`**Tének:**\n\n${tu.bot.split("\n").map((l) => `> ${l}`).join("\n")}`, "");
      if (tu.herramientas.length) md.push(`🔧 ${tu.herramientas.map((h) => h.nombre).join(", ")}${tu.escalacion ? ` · 🆘 ${tu.escalacion.motivo}/${tu.escalacion.modo}: ${String(tu.escalacion.resumen || "").replace(/\n/g, " ")}` : ""}`, "");
    }
    md.push(...resultados.map((r) => `- ${r.paso ? "✅" : "❌"} ${r.nombre}`), "", "---", "");
  }
  md.splice(1, 0, `**Reglas cumplidas: ${ok}/${total}** · costo ≈ $${costoTotal.toFixed(3)} USD\n`);
  fs.writeFileSync(SALIDA, md.join("\n"));
  console.log(`\nReglas: ${ok}/${total} · costo ≈ $${costoTotal.toFixed(3)} USD · pláticas en ${SALIDA}\n`);
  process.exit(0);
})().catch((e) => { console.error("💥", e); process.exit(1); });
