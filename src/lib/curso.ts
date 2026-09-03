/**
 * Curso "Turismo con IA" — LA fuente única de verdad del funnel /curso.
 *
 * Ninguna cifra, fecha o texto comercial del curso se escribe a mano en
 * páginas, correos o APIs: todo sale de aquí (misma regla que lib/oferta.ts
 * en Kora). Si Manolo cambia el precio o una fecha, se cambia UNA vez.
 *
 * Zona horaria: CDMX es UTC-6 todo el año (México abolió el horario de
 * verano en 2022), así que las fechas fijas llevan el offset -06:00 explícito
 * y NUNCA se calcula "hoy" con la hora del servidor a pelo (Railway corre en
 * UTC: de 18:00 a medianoche "su mañana" no es la nuestra).
 */

// ── Cifras de prueba (confirmadas por Manolo el 1 sep 2026: son reales y las
//    respalda en vivo en el curso) ──────────────────────────────────────────
export const CIFRAS = {
  // Leídos del panel /admin/ingresos el 2 de septiembre de 2026. Son el
  // acumulado de TODA la operación (may–sep 2026, 47 reservas), no de los
  // primeros 4 meses: por eso viven aparte y no se mezclan con la cifra de
  // abajo. "Vendido" es el valor total de las reservas, cobrado o no;
  // "cobrado" es el dinero que ya entró.
  vendidoTotal: 527_900,
  cobradoTotal: 439_800,
  reservasTotal: 47,
  medidoEn: "septiembre de 2026",

  toursVentas4m: 500_000, // MXN, ventas de Huasteca Potosina Tours, primeros 4 meses
  hotelReservas4m: 300_000, // MXN, reservas del hotel, primeros 4 meses
  publicidadPagada: 0,
  total4m: 800_000, // suma de ambos
  /** Texto del único gasto fijo. El brief lo deja en "unos cientos de pesos". */
  gastoIa: "unos cientos de pesos al mes",
  /** Lo que reemplaza el sistema, al año (página + asistente + CRM). */
  reemplazaAnualMxn: 80_000,
} as const;

// ── Precios y cupo ──────────────────────────────────────────────────────────
export const PRECIOS = {
  regular: 12_900,
  fundador: 9_900,
  msi: 3, // meses sin intereses vía Stripe
  cupoTotal: 25,
  cupoFundador: 15, // primeros 15 pagados O hasta FECHAS.finFundador, lo que ocurra primero
} as const;

// ── Fechas (todas con -06:00 explícito) ────────────────────────────────────
//
// OJO con el orden, que es la trampa que tenía este archivo: la oferta del
// curso se presenta EN VIVO al final de la noche 3 del taller (10 sep). Si el
// precio de fundador venciera antes de esa noche, nadie alcanzaría a
// comprarlo. Por eso finFundador va DESPUÉS del taller, no antes.
export const FECHAS = {
  aperturaOferta: new Date("2026-09-10T20:00:00-06:00"), // durante la noche 3
  finFundador: new Date("2026-09-12T23:59:59-06:00"),
  cierreInscripciones: new Date("2026-09-13T23:59:59-06:00"),
  inicioCohorte: new Date("2026-09-15T19:00:00-06:00"),
  /** La noche 1 del taller. Se conserva el nombre por compatibilidad. */
  webinar: new Date("2026-09-08T19:00:00-06:00"),
  finCohorte: new Date("2026-10-09T23:59:59-06:00"),
  proximaCohorte: "enero de 2027",
} as const;

/**
 * El taller gratuito: TRES noches seguidas, no una.
 * Tres horas de verme construir cambian por completo con qué convicción se
 * compra el día 3. La sala es LA MISMA las tres noches, a propósito: una sola
 * liga que recordar, para ellos y para Manolo.
 */
export const TALLER_NOCHES = [
  {
    n: 1,
    fecha: new Date("2026-09-08T19:00:00-06:00"),
    titulo: "La decisión que define todo",
    puntos: [
      "Por qué tu negocio necesita un sistema y no cinco herramientas sueltas.",
      "Abro mi panel real de Huasteca Potosina Tours y te enseño los números en pantalla.",
      "Construyo una página de tours desde cero, en 20 minutos, mientras miras.",
    ],
    workbook: "El mapa de tu sistema",
  },
  {
    n: 2,
    fecha: new Date("2026-09-09T19:00:00-06:00"),
    titulo: "Tu mejor vendedor no duerme",
    puntos: [
      "Construyo un agente de WhatsApp para una agencia, en vivo, de principio a fin.",
      "Cómo cotiza, cómo agenda y en qué momento exacto te pasa la conversación a ti.",
      "El error que hace que un agente suene a robot, y cómo se quita en dos líneas.",
    ],
    workbook: "El guion de tu agente",
  },
  {
    n: 3,
    fecha: new Date("2026-09-10T19:00:00-06:00"),
    titulo: "Piloto automático",
    puntos: [
      "Confirmación, cobro y recordatorio, funcionando solos.",
      "El panel donde ves reservas, ingresos, ocupación y comisiones en una sola pantalla.",
      "Y al final: cómo hacemos esto mismo, con tu negocio, durante 4 semanas.",
    ],
    workbook: "Tus 3 automatizaciones",
  },
] as const;

/** Las 8 sesiones en vivo (mar y jue, 19:00–20:30 CDMX). */
export const SESIONES = [
  { n: 1, fecha: new Date("2026-09-15T19:00:00-06:00"), tema: "Tu negocio como sistema + setup de herramientas" },
  { n: 2, fecha: new Date("2026-09-17T19:00:00-06:00"), tema: "Construye y publica tu página con catálogo y reservas" },
  { n: 3, fecha: new Date("2026-09-22T19:00:00-06:00"), tema: "Diseño de tu agente de IA: qué responde y con qué tono" },
  { n: 4, fecha: new Date("2026-09-24T19:00:00-06:00"), tema: "Tu agente en WhatsApp: cotizaciones automáticas" },
  { n: 5, fecha: new Date("2026-09-29T19:00:00-06:00"), tema: "Flujo de reserva completo: confirmación, cobro, recordatorios" },
  { n: 6, fecha: new Date("2026-10-01T19:00:00-06:00"), tema: "Post-venta: encuestas, reseñas en Google, correo automático" },
  { n: 7, fecha: new Date("2026-10-06T19:00:00-06:00"), tema: "Tu panel de control: reservas, clientes, ingresos, ocupación" },
  { n: 8, fecha: new Date("2026-10-08T19:00:00-06:00"), tema: "Demo final de cada alumno + tu plan de 90 días" },
] as const;

/** Los 4 talleres abiertos de revisión del CURSO (sábados 10:00–11:30 CDMX).
 *  No confundir con TALLER_NOCHES, que es el taller gratuito de 3 noches. */
export const TALLERES = [
  { n: 1, fecha: new Date("2026-09-19T10:00:00-06:00") },
  { n: 2, fecha: new Date("2026-09-26T10:00:00-06:00") },
  { n: 3, fecha: new Date("2026-10-03T10:00:00-06:00") },
  { n: 4, fecha: new Date("2026-10-10T10:00:00-06:00") },
] as const;

// ── Ligas que Manolo aún tiene que crear (el sitio y los correos degradan
//    con gracia mientras sean null: "te mando la liga un día antes") ────────
export const LINKS = {
  /** Sala de las 8 sesiones del curso. Falta crearla. */
  salaSesiones: null as string | null,
  /** Sala del taller gratuito. LA MISMA las tres noches. */
  salaTaller: "https://meet.google.com/vpi-ejed-nkv" as string | null,
  /** Grupo de WhatsApp del TALLER: ahí van las ligas y los workbooks. */
  grupoTaller: "https://chat.whatsapp.com/KLq7pyfjarHG3CgwivrkxL?mode=gi_t" as string | null,
  /** Grupo de los que YA pagaron. Es OTRO, distinto al del taller. */
  comunidadWhatsApp: "https://chat.whatsapp.com/Hu4kiqal2bOBlD0pWogQRQ?mode=gi_t" as string | null,
  /** Grabación del taller, para quien no pudo entrar (B3 y D4). */
  grabacionWebinar: null as string | null,
} as const;

// ── WhatsApp de Manolo (el mismo del sitio de Tours) ───────────────────────
export const WHATSAPP_CURSO =
  "https://wa.me/524891251458?text=" +
  encodeURIComponent("Hola Manolo, tengo una duda sobre el curso Turismo con IA");

// ── El programa (4 semanas → 4 entregables publicados) ─────────────────────
export const PROGRAMA = [
  {
    semana: 1,
    titulo: "Tu página web, publicada",
    sesiones: [
      "Cómo pensar tu negocio como sistema. Instalamos las herramientas juntos.",
      "Construyes y publicas tu página con tu catálogo de tours o habitaciones y formulario de reserva.",
    ],
    entregable: "Tu página publicada en tu propio dominio",
  },
  {
    semana: 2,
    titulo: "Tu agente de IA en WhatsApp",
    sesiones: [
      "Diseñas tu agente: qué responde, qué te pasa a ti, el tono de tu marca.",
      "Lo conectas a tu WhatsApp y a tu catálogo; cotiza solo.",
    ],
    entregable: "Tu agente respondiendo en tu WhatsApp Business",
  },
  {
    semana: 3,
    titulo: "Las tareas repetitivas, en automático",
    sesiones: [
      "Flujo de reserva completo: confirmación, cobro con tarjeta, recordatorios.",
      "Post-venta: encuesta, reseñas en Google y seguimiento por correo a quien no pagó.",
    ],
    entregable: "3 automatizaciones activas trabajando por ti",
  },
  {
    semana: 4,
    titulo: "Tu panel de control",
    sesiones: [
      "Tu panel: reservas, clientes, ingresos y ocupación en tiempo real.",
      "Demo final de tu sistema + tu plan de 90 días para mantenerlo y crecerlo.",
    ],
    entregable: "Tu panel funcionando con tus datos reales",
  },
] as const;

// ── Qué incluye ────────────────────────────────────────────────────────────
export const INCLUYE = [
  "8 sesiones en vivo por Google Meet (12 horas) con grabaciones de por vida",
  "4 talleres abiertos los sábados para revisar TU proyecto en vivo",
  "Plantillas listas: página web, prompts del agente, flujos, panel base",
  "Comunidad de alumnos en WhatsApp, durante y después del curso",
  "Certificado de finalización",
] as const;

// ── Bonos de fundador (expiran con el precio de fundador) ──────────────────
export const BONOS = [
  {
    nombre: "Auditoría 1 a 1 de tu negocio",
    detalle: "30 minutos conmigo, a solas, para trazar el plan de TU agencia u hotel antes de arrancar.",
    valor: 2_500,
  },
  {
    nombre: "Kit Huasteca: mis prompts y flujos reales",
    detalle: "Los prompts y automatizaciones exactos que uso todos los días en Huasteca Potosina Tours.",
    valor: 1_500,
  },
  {
    nombre: "Sesión extra: IA para fotos, reels y redes",
    detalle: "Cómo producir el contenido de tu marca (fotos, reels, descripciones) con IA.",
    valor: 1_200,
  },
] as const;

export const VALOR_BONOS = BONOS.reduce((s, b) => s + b.valor, 0); // $5,200

/**
 * Los dos casos, en formato cifra · Antes · Cómo.
 *
 * Todavía no hay alumnos de la cohorte 1, así que los casos son los MÍOS. No es
 * un parche: son de la industria del lector y en su moneda, que es más de lo
 * que puede decir un testimonio de "vendía uñas" en dólares. Al cerrar la
 * cohorte 1 se agregan 2 o 3 alumnos con esta misma forma.
 */
export const CASOS = [
  {
    cifra: CIFRAS.toursVentas4m,
    plazo: "4 meses",
    quien: "Huasteca Potosina Tours",
    antes: "Cotizaba a mano por WhatsApp, las reservas vivían en un Excel y no había un peso para publicidad.",
    como: "Página con catálogo y reservas, un agente que cotiza solo, y las automatizaciones de cobro y seguimiento. Todo con IA.",
  },
  {
    cifra: CIFRAS.hotelReservas4m,
    plazo: "4 meses",
    quien: "El hotel, en la Huasteca",
    antes: "Dependía de las OTAs y de sus comisiones para llenarse.",
    como: "Repetí el mismo sistema y le puse Kora de panel. Las reservas directas dejaron de pasar por comisión.",
  },
] as const;

// ── Garantía (con nombre propio) ───────────────────────────────────────────
export const GARANTIA = {
  nombre: "Garantía de las 2 Primeras Sesiones",
  texto:
    "Toma las primeras 2 sesiones completas. Si al día 7 sientes que no es para ti, escríbeme y te devuelvo el 100%. Sin preguntas, sin trámites.",
} as const;

// ── Dolores (en palabras del cliente, sección "Esto te suena") ─────────────
export const DOLORES = [
  "Pago entre $3,000 y $8,000 al mes entre el de la página, el CRM que no uso y el de las redes.",
  "Contesto WhatsApps a las 11 de la noche porque si no, se va la venta.",
  "Mis reservas están en un Excel, en el celular y en la cabeza de mi socia.",
  "Ya tomé cursos de IA y sigo sin saber qué hacer el lunes.",
] as const;

// ── Antes / Después ────────────────────────────────────────────────────────
export const ANTES_DESPUES = [
  ["Le pagas a alguien por tu página (o no tienes)", "Tu página publicada, hecha por ti, con reservas y pagos"],
  ["Tú contestas todo por WhatsApp, a toda hora", "Un agente que cotiza y agenda 24/7, y te avisa cuando hay venta"],
  ["Confirmaciones, recordatorios y cobros a mano", "Automatizaciones que trabajan solas, todos los días"],
  ["Datos regados en Excel, celular y memoria", "Un panel con reservas, ingresos y ocupación en tiempo real"],
  ["Dependes de proveedores para cada cambio", "Control total: tú entiendes y modificas tu sistema"],
] as const;

// ── Para quién es / no es ──────────────────────────────────────────────────
export const PARA_QUIEN = [
  "Dueños o encargados de agencias de viajes",
  "Guías y operadores turísticos independientes",
  "Hoteles pequeños y boutique",
  "Quien quiere control de su negocio y menos dependencia de terceros",
] as const;

export const NO_ES_PARA = [
  "Quien busca que alguien lo haga por él sin sentarse 5 horas a la semana",
  "Quien todavía no tiene un negocio operando",
] as const;

// ── Preguntas frecuentes ───────────────────────────────────────────────────
export const FAQS = [
  {
    p: "“Yo no sé nada de programación.”",
    r: "Tampoco necesitas. Usas la IA para que construya; tú diriges. Si sabes usar WhatsApp y Excel, puedes con esto. Yo estudié negocios, no ingeniería.",
  },
  {
    p: "“No tengo tiempo para un curso más.”",
    r: "Son 3 horas a la semana en vivo más unas 2 de práctica. Todas las sesiones quedan grabadas de por vida: si te pierdes una, la ves cuando puedas.",
  },
  {
    p: "“¿Y si me atoro y me quedo atrás?”",
    r: "Para eso están los 4 talleres de los sábados: traes tu proyecto y lo destrabamos juntos en vivo. Además tienes la comunidad y mi garantía de las 2 primeras sesiones.",
  },
  {
    p: "“¿Cuánto más voy a tener que pagar aparte del curso?”",
    r: "Tu dominio (unos $300 al año), hosting gratuito o de ~$100 al mes, y la suscripción de IA (~$200 a $500 al mes según el uso). Todo se detalla en la sesión 1.",
  },
  {
    p: "“Ya lo intenté antes y no me funcionó.”",
    r: "Casi siempre pasa lo mismo: te enseñaron herramientas sueltas y te tocó a ti pegarlas. Aquí el orden es al revés: primero el sistema completo, y cada semana construyes UNA pieza que se conecta con la anterior. Al final de la semana 1 tu página está publicada; si no, los sábados la destrabamos en vivo.",
  },
  {
    p: "“Ya tomé el curso de SECTUR.”",
    r: "Perfecto: entonces ya tienes el mapa. Aquí construyes la carretera. Aquel fue una introducción —qué es la IA y qué se puede hacer—; de este sales con tu página, tu agente y tu panel publicados y funcionando.",
  },
  {
    p: "“No puedo soltar todo el dinero de una vez.”",
    r: `Sí: 3 meses sin intereses con tarjeta, directo en el pago seguro de Stripe (${PRECIOS.msi} pagos de $${Math.round(PRECIOS.fundador / PRECIOS.msi).toLocaleString("es-MX")} con el precio de fundador).`,
  },
] as const;

// ── Lógica de precio vigente ───────────────────────────────────────────────
export type PrecioVigente = {
  precio: number;
  esFundador: boolean;
  /** Fecha límite que aplica a este precio (para cuenta regresiva). */
  limite: Date;
};

/**
 * El precio de fundador aplica si AÚN no pasa el 12 sep 23:59 CDMX y hay menos
 * de 15 pagados. Después (o lleno el cupo fundador): precio regular hasta el
 * cierre de inscripciones del 13.
 */
export function precioVigente(ahora: Date, pagados: number): PrecioVigente {
  const esFundador =
    ahora.getTime() <= FECHAS.finFundador.getTime() && pagados < PRECIOS.cupoFundador;
  return esFundador
    ? { precio: PRECIOS.fundador, esFundador: true, limite: FECHAS.finFundador }
    : { precio: PRECIOS.regular, esFundador: false, limite: FECHAS.cierreInscripciones };
}

export function inscripcionesAbiertas(ahora: Date, pagados: number): boolean {
  return (
    ofertaAbierta(ahora) &&
    ahora.getTime() <= FECHAS.cierreInscripciones.getTime() &&
    pagados < PRECIOS.cupoTotal
  );
}

/**
 * La oferta del curso se presenta en vivo al final de la noche 3. Antes de ese
 * momento la página no puede pedir dinero: no hay nada que comprar todavía, y
 * el camino correcto es el taller gratuito.
 */
export function ofertaAbierta(ahora: Date): boolean {
  return ahora.getTime() >= FECHAS.aperturaOferta.getTime();
}

// ── Formato de fechas en español, SIEMPRE en CDMX ──────────────────────────
const TZ = "America/Mexico_City";

/**
 * "jueves 10 de septiembre".
 *
 * Intl devuelve "jueves, 10 de septiembre" CON coma, y en este proyecto la
 * fecha siempre va metida dentro de una frase ("cierran el ___ a las 11:59"),
 * donde esa coma parte la oración en dos. Se quita aquí una vez, no en cada
 * sitio que la usa.
 */
export function fechaLarga(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: TZ,
  }).format(d).replace(", ", " ");
}

/**
 * "9 de septiembre", SIN el día de la semana.
 *
 * Existe porque quitarle el día a `fechaLarga` con una expresión regular es
 * una trampa: `\w` de JavaScript NO cubre los acentos, así que `/^\w+, /`
 * limpia "lunes, 8" pero NO "miércoles, 9" (se detiene en la "é"). Ese fallo
 * salió en producción en el correo W1 —"8 de septiembre, miércoles, 9 de
 * septiembre, 10 de septiembre"—, que es el que recibe TODO el que se
 * registra al taller. Se formatea sin el día desde el principio, no se
 * recorta después.
 */
export function fechaSinDia(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "long", timeZone: TZ,
  }).format(d);
}

/** Sólo el número del día ("9"), para enumerar fechas del mismo mes. */
export function diaDelMes(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", timeZone: TZ }).format(d);
}

/** Sólo el mes en minúscula ("septiembre"). */
export function mesLargo(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: TZ }).format(d);
}

/**
 * "8, 9 y 10 de septiembre" — las tres noches del taller en una sola frase.
 *
 * Estaba escrito a mano en 6 sitios (dos páginas y cuatro correos). Si Manolo
 * mueve una noche, mover la constante ya no basta: hay que cazar el texto.
 * Aquí se arma desde TALLER_NOCHES y se comparte, como manda la regla de este
 * archivo. Sirve para cualquier mes y para noches que crucen de mes.
 */
export const nochesTexto = (): string => {
  const dias = TALLER_NOCHES.map((n) => diaDelMes(n.fecha));
  const meses = new Set(TALLER_NOCHES.map((n) => mesLargo(n.fecha)));
  // Si las tres noches caen en el mismo mes, el mes se dice una sola vez.
  if (meses.size === 1) {
    return `${dias.slice(0, -1).join(", ")} y ${dias.at(-1)} de ${mesLargo(TALLER_NOCHES[0].fecha)}`;
  }
  const completas = TALLER_NOCHES.map((n) => fechaSinDia(n.fecha));
  return `${completas.slice(0, -1).join(", ")} y ${completas.at(-1)}`;
};

/** El mismo dato, ya listo para pegarse en un texto: "8, 9 y 10 de septiembre". */
export const NOCHES_TEXTO = nochesTexto();

export function horaCorta(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ,
  }).format(d);
}

export const mxnCurso = (n: number) => `$${n.toLocaleString("es-MX")}`;

// ── Calendario .ics (sesiones + talleres), compartido por la ruta
//    /curso/calendario.ics y el adjunto del correo de bienvenida ────────────
function icsFecha(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendarioIcs(): string {
  const eventos: string[] = [];
  const dur90 = 90 * 60 * 1000;

  for (const s of SESIONES) {
    eventos.push([
      "BEGIN:VEVENT",
      `UID:curso-ia-sesion-${s.n}@huasteca-potosina.com`,
      `DTSTART:${icsFecha(s.fecha)}`,
      `DTEND:${icsFecha(new Date(s.fecha.getTime() + dur90))}`,
      `SUMMARY:Turismo con IA · Sesión ${s.n}: ${s.tema}`,
      `DESCRIPTION:Sesión en vivo por Google Meet.${LINKS.salaSesiones ? ` Liga: ${LINKS.salaSesiones}` : " La liga llega por correo."}`,
      "END:VEVENT",
    ].join("\r\n"));
  }
  for (const t of TALLERES) {
    eventos.push([
      "BEGIN:VEVENT",
      `UID:curso-ia-taller-${t.n}@huasteca-potosina.com`,
      `DTSTART:${icsFecha(t.fecha)}`,
      `DTEND:${icsFecha(new Date(t.fecha.getTime() + dur90))}`,
      `SUMMARY:Turismo con IA · Taller abierto ${t.n} (revisión de proyectos)`,
      `DESCRIPTION:Taller abierto por Google Meet: trae tu proyecto y lo revisamos en vivo.`,
      "END:VEVENT",
    ].join("\r\n"));
  }

  return envolverIcs(eventos);
}

function envolverIcs(eventos: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Huasteca Potosina Tours//Curso Turismo con IA//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventos,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * El calendario de las TRES noches del taller gratuito.
 *
 * Antes, el botón "Guardar la liga" de /curso/gracias abría la sala de Meet:
 * un cuarto vacío seis días antes del taller. "Apartar las noches" tiene que
 * poner algo en el calendario del teléfono — con la liga dentro, para que el
 * día 8 a las 7 pm el recordatorio traiga el botón de entrar.
 *
 * Cada noche dura 90 minutos y lleva una alarma 30 minutos antes: es el
 * recordatorio que no depende de que abran el correo.
 */
export function buildTallerIcs(): string {
  const dur90 = 90 * 60 * 1000;
  const liga = LINKS.salaTaller;

  const eventos = TALLER_NOCHES.map((n) =>
    [
      "BEGIN:VEVENT",
      `UID:curso-ia-taller-noche-${n.n}@huasteca-potosina.com`,
      `DTSTART:${icsFecha(n.fecha)}`,
      `DTEND:${icsFecha(new Date(n.fecha.getTime() + dur90))}`,
      `SUMMARY:Turismo con IA · Noche ${n.n}: ${n.titulo}`,
      ...(liga ? [`LOCATION:${liga}`, `URL:${liga}`] : []),
      `DESCRIPTION:${[
        `Noche ${n.n} de 3 del taller gratuito.`,
        ...n.puntos,
        `Workbook: ${n.workbook} (la contraseña se dice en vivo).`,
        liga ? `Entrar: ${liga}` : "La liga llega por correo y por el grupo de WhatsApp.",
      ].join("\\n")}`,
      // Aviso 30 min antes, dentro del propio evento.
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:En 30 minutos empieza la noche ${n.n} del taller`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n")
  );

  return envolverIcs(eventos);
}
