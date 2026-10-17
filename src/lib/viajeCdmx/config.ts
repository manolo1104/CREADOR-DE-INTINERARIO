/**
 * El viaje mensual CDMX–Xilitla: TODO lo que el producto dice de sí mismo y no
 * cambia de una salida a otra. Lo que sí cambia por salida (fecha, precio,
 * preventa, plazos, cupo) vive en la base (`SalidaGrupal`) y se edita en el
 * panel, en /admin/salidas.
 *
 * Plan aprobado por Manolo el 15 oct 2026. Las líneas con ⚠️ son valores que
 * puse yo mientras él los confirma: están aquí y en ningún otro lado, así que
 * corregirlas es cambiar UNA línea.
 *
 * Archivo sin dependencias de servidor: lo importan la página, el checkout (en
 * el navegador) y los correos.
 */

export const VIAJE_SLUG = "viaje-cdmx-xilitla";
export const VIAJE_NOMBRE = "Viaje CDMX–Xilitla";
export const VIAJE_RUTA = `/${VIAJE_SLUG}`;
/**
 * Alto de la franja del viaje bajo la del río (17 oct 2026). Aquí y no en el
 * componente: ese archivo es de cliente y una página de servidor que importa
 * una constante de un archivo «use client» recibe un objeto, no el número.
 */
export const ALTO_BANDA_VIAJE = 30;

/**
 * Lo que dura (Manolo, 16 oct 2026; antes eran 3 días y 2 noches con regreso el
 * lunes a las 5 pm, y eso costaba un día de trabajo): sale el VIERNES a la
 * medianoche, viaja de noche, son dos días allá —sábado y domingo— con UNA
 * noche de hotel, y el domingo en la noche se regresa para llegar a la CDMX el
 * lunes a las 6:00 am. La fecha de salida es ese viernes; la de regreso, el
 * domingo (el día en que sale la camioneta de vuelta).
 *
 * 🔴 Todo texto que hable de la duración sale de aquí (`NOCHES_TEXTO`,
 * `DESAYUNOS`, `DURACION_TEXTO`…): el 16 oct había «3 días», «2 noches» y
 * «3 desayunos» escritos a mano en once archivos.
 */
export const DIAS = 2;
export const NOCHES = 1;
/** Un desayuno por cada mañana allá: sábado y domingo. */
export const DESAYUNOS = 2;
/** Del viernes de salida al domingo de regreso. Para proponer el regreso al crear una fecha. */
export const REGRESO_DIAS_DESPUES = 2;
/** «1 noche» · «2 noches» */
export const NOCHES_TEXTO = `${NOCHES} noche${NOCHES === 1 ? "" : "s"}`;
/** «2 días y 1 noche» */
export const DURACION_TEXTO = `${DIAS} días y ${NOCHES_TEXTO}`;
/** Qué noche(s) se duerme en el hotel. */
export const NOCHES_CUALES = "la del sábado";
/** Qué mañanas se desayuna. */
export const DESAYUNOS_CUALES = "sábado y domingo";

// ── Cupo y reglas de venta ──────────────────────────────────────────────────

/** Asientos de la Urvan. Valor inicial de cada salida; el panel lo cambia. */
export const CAPACIDAD_INICIAL = 14;
/** ⚠️ Mínimo para que la salida corra. Valor inicial; se edita por salida. */
export const MINIMO_INICIAL = 8;
/** «Últimos lugares» solo con esto o menos libres DE VERDAD. */
export const ULTIMOS_LUGARES = 4;
/** Cuántas personas caben en un solo apartado; más que eso es un grupo y va por el líder o por WhatsApp. */
export const MAX_POR_APARTADO = 8;

/** % del total que se paga al apartar: 10 % (Manolo, 15 oct 2026; el resto del sitio usa 30 %). */
export const ANTICIPO_PCT = 10;
/** Días antes de la salida en que vence el saldo: el mismo día del corte (Manolo, 16 oct 2026). Valor inicial por salida. */
export const SALDO_DIAS_ANTES = 14;
/** Días antes de la salida en que se deja de vender (fecha de corte). Manolo, 16 oct 2026: 14 (antes 21). */
export const CORTE_DIAS_ANTES = 14;
/** La preventa dura esto desde que abre la fecha. */
export const PREVENTA_DIAS = 21;
/** ⚠️ Quien junta y PAGA este número de lugares, viaja gratis. */
export const LIDER_PERSONAS = 7;

// ── Apartado mientras se paga ───────────────────────────────────────────────

/** Minutos que se retiene el lugar mientras alguien llena la tarjeta. */
export const APARTADO_MIN = 20;
/** Minutos que se alarga justo antes de confirmar el pago. */
export const RENOVAR_MIN = 10;

/**
 * OXXO por Stripe SOLO en este viaje (decisión de Manolo, 15 oct 2026).
 * La ficha vence a las 23:59 del día siguiente; Stripe confirma el pago hasta
 * un día hábil después, así que el lugar se queda apartado hasta entonces.
 */
export const OXXO_DIAS_FICHA = 1;
/** Stripe no acepta fichas OXXO de más de $10,000 MXN. */
export const OXXO_MAXIMO = 10_000;
/** Pegado al corte ya no hay tiempo de esperar una ficha: solo tarjeta. */
export const OXXO_HASTA_DIAS_ANTES_DEL_CORTE = 3;

// ── El viaje ────────────────────────────────────────────────────────────────

/**
 * El punto de salida: el Ángel de la Independencia (Manolo, 15 oct 2026).
 * ⚠️ El lado exacto de la glorieta donde se para la camioneta lo confirma Manolo.
 */
export const PUNTO_SALIDA = {
  nombre: "Ángel de la Independencia",
  direccion: "Glorieta del Ángel, Paseo de la Reforma, col. Juárez, CDMX",
  metro: "Insurgentes o Sevilla (Línea 1), a unos 10 minutos caminando",
  mapa: "https://www.google.com/maps/search/?api=1&query=19.42702,-99.16771",
  lat: 19.42702 as number | null,
  lng: -99.16771 as number | null,
};

/** La salida: el viernes a la medianoche. */
export const HORA_SALIDA = "12:00 am";
export const SALIDA_TEXTO = "el viernes a la medianoche";
/** A qué hora se pide llegar al punto de salida. */
export const HORA_CITA = "11:30 pm";
/** Llegada a Xilitla el sábado. */
export const HORA_LLEGADA = "8:00 am";
/** ⚠️ Salida de regreso el DOMINGO en la noche, después del Sótano de las Huahuas. */
export const HORA_SALIDA_REGRESO = "10:00 pm";
/** Llegada al Ángel el LUNES (Manolo, 16 oct 2026: «para llegar a las 6 am»). */
export const HORA_REGRESO = "6:00 am";
/** El regreso en una frase: «el domingo en la noche y llegas a la CDMX el lunes a las 6:00 am». */
export const REGRESO_TEXTO = `el domingo en la noche y llegas a la CDMX el lunes a las ${HORA_REGRESO}`;

export interface Foto {
  src: string;
  alt: string;
}

export interface MomentoItinerario {
  hora?: string;
  texto: string;
  /** Va incluido en el precio: la página lo marca. */
  incluido?: boolean;
}

export interface DiaItinerario {
  dia: number;
  /** «Sábado» */
  diaSemana: string;
  titulo: string;
  momentos: MomentoItinerario[];
  foto: string;
  alt: string;
  /** Las fotos chicas debajo del día: lo que se ve ese día. */
  fotos: Foto[];
}

/**
 * El itinerario, día por día (Manolo, 15 oct 2026). Lo de los recorridos sale
 * de sus fichas en `tours.ts`: la Ruta Surrealista (Las Pozas, Huichihuayán,
 * Quilas y el Castillo de la Salud) y la Expedición Tamul (canoa a Tamul,
 * Cueva del Agua y el Sótano de las Huahuas al atardecer). Todos los desayunos
 * son en El Papán Huasteco, el restaurante del hotel (abre a las 8:00).
 *
 * Fotos: solo reales, de las que ya usan las fichas. Las `gallery-*` de Tamul
 * no entran: dos traen la ✦ de las imágenes generadas.
 */
export const ITINERARIO: DiaItinerario[] = [
  {
    dia: 1,
    diaSemana: "Sábado",
    titulo: "Llegada a Xilitla y Ruta Surrealista",
    momentos: [
      { hora: `Vie ${HORA_CITA}`, texto: "Nos vemos en el Ángel de la Independencia." },
      { hora: HORA_SALIDA, texto: "Salimos en Urvan con conductor. Viajas de noche: duermes en el camino.", incluido: true },
      { hora: HORA_LLEGADA, texto: "Llegamos a Xilitla, al Hotel Paraíso Encantado. Dejas tu maleta.", incluido: true },
      { hora: "8:15 am", texto: "Desayuno en El Papán Huasteco, el restaurante del hotel.", incluido: true },
      { hora: "9:30 am", texto: "Ruta Surrealista con guía: Las Pozas de Edward James, el Nacimiento de Huichihuayán (aquí te metes al agua), la Cueva de las Quilas y el Castillo de la Salud. Entradas incluidas.", incluido: true },
      { hora: "Tarde", texto: "Regreso al hotel, check-in y noche libre en el Pueblo Mágico." },
    ],
    foto: "/imagenes/tours/edward-james/las-pozas-escalera-al-cielo.jpg",
    alt: "La escalera al cielo de Las Pozas de Edward James, con la sierra de Xilitla al fondo",
    fotos: [
      { src: "/imagenes/tours/edward-james/nacimiento-huichihuayan-entre-arboles.jpg", alt: "Nacimiento de Huichihuayán: la poza turquesa entre los árboles" },
      { src: "/imagenes/tours/edward-james/cueva-quilas-luz-entre-rocas.jpg", alt: "Cueva de las Quilas: el sol entra entre las paredes de roca" },
      { src: "/imagenes/tours/edward-james/castillo-de-la-salud-torres.jpg", alt: "Castillo de la Salud: las torres de colores" },
    ],
  },
  {
    dia: 2,
    diaSemana: "Domingo",
    titulo: "Expedición Tamul y regreso",
    momentos: [
      { hora: "8:00 am", texto: "Desayuno en El Papán Huasteco y check-out: tu maleta se va en la camioneta.", incluido: true },
      { hora: "9:00 am", texto: "Salimos rumbo al río Tampaón.", incluido: true },
      { texto: "Remamos en canoa por el Cañón del Tampaón hasta la cascada de Tamul, la más alta de San Luis Potosí (105 m).", incluido: true },
      { texto: "Nado y clavados en la Cueva del Agua, un cenote turquesa.", incluido: true },
      { texto: "Comida en el camino (no incluida: eliges dónde y cuánto gastar)." },
      { hora: "Atardecer", texto: "Sótano de las Huahuas: miles de aves vuelven en espiral a un abismo de 478 m.", incluido: true },
      { hora: "Noche", texto: "Volvemos a Xilitla. Cena libre en el pueblo." },
      { hora: HORA_SALIDA_REGRESO, texto: "Salimos de regreso a la CDMX. Duermes en el camino.", incluido: true },
      { hora: `Lun ${HORA_REGRESO}`, texto: "Llegada al Ángel de la Independencia, a tiempo para el lunes." },
    ],
    foto: "/imagenes/tours/tamul/hero.jpg",
    alt: "Dos viajeros frente a la cascada de Tamul",
    fotos: [
      { src: "/imagenes/tours/tamul/cascada-de-tamul-desde-el-rio.jpg", alt: "La cascada de Tamul vista desde el río" },
      { src: "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg", alt: "Clavados en la Cueva del Agua" },
      { src: "/imagenes/tours/tamul/aves-volviendo-al-sotano.jpg", alt: "Las aves vuelven al Sótano de las Huahuas al atardecer" },
    ],
  },
];

export interface Incluido {
  icono: "bus" | "cama" | "desayuno" | "pozas" | "tamul" | "escudo";
  titulo: string;
  detalle: string;
  foto: string;
  alt: string;
}

/** Lo incluido, en tarjetas con foto: lo primero que se ve después del hero. */
export const INCLUIDO: Incluido[] = [
  {
    icono: "bus", titulo: "Transporte redondo",
    detalle: "Urvan con conductor, del Ángel de la Independencia a Xilitla y de regreso. Y todos los traslados a los recorridos.",
    foto: "/imagenes/tours/tamul/recogida-hotel.jpg", alt: "La camioneta del tour frente al hotel en Xilitla",
  },
  {
    icono: "cama", titulo: `${NOCHES_TEXTO} en el Hotel Paraíso Encantado`,
    detalle: `${NOCHES === 1 ? "La" : "Las"} del sábado, en Xilitla, a 5 minutos caminando de Las Pozas.`,
    foto: "/imagenes/hotel-paraiso-encantado/hero.jpg", alt: "El Hotel Paraíso Encantado, con su alberca entre la selva",
  },
  {
    icono: "desayuno", titulo: `${DESAYUNOS} desayunos en El Papán Huasteco`,
    detalle: `${DESAYUNOS_CUALES[0].toUpperCase()}${DESAYUNOS_CUALES.slice(1)}, en el restaurante del hotel, con cocina de fogón.`,
    foto: "/imagenes/papan-huasteco/chilaquiles-con-arrachera.jpg", alt: "Chilaquiles con arrachera de El Papán Huasteco",
  },
  {
    icono: "pozas", titulo: "Ruta Surrealista",
    detalle: "Las Pozas de Edward James, el Nacimiento de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud, con guía.",
    foto: "/imagenes/tours/edward-james/hero.jpg", alt: "Viajera sentada entre las construcciones de Las Pozas",
  },
  {
    icono: "tamul", titulo: "Expedición Tamul",
    detalle: "Canoa por el Cañón del Tampaón hasta la cascada de Tamul, Cueva del Agua y el Sótano de las Huahuas al atardecer.",
    foto: "/imagenes/tours/tamul/canoa-entre-cascadas.jpg", alt: "Grupo en canoa por el río Tampaón, entre cascadas",
  },
  {
    icono: "escudo", titulo: "Guías, entradas y seguro",
    detalle: "Guías certificados NOM-09, todas las entradas, chalecos y cascos, botiquín y seguro de viaje.",
    foto: "/imagenes/tours/tamul/grupo-con-guia-en-el-rio.jpg", alt: "Grupo con su guía a la orilla del río",
  },
];

/** Qué incluye, renglón por renglón (lista completa, correos y FAQ). */
export const INCLUYE: string[] = [
  "Transporte redondo CDMX–Xilitla en Urvan con conductor, desde el Ángel de la Independencia",
  "Todos los traslados a los recorridos",
  `${NOCHES_TEXTO} en el Hotel Paraíso Encantado (${NOCHES_CUALES})`,
  `${DESAYUNOS} desayunos en El Papán Huasteco (${DESAYUNOS_CUALES})`,
  "Ruta Surrealista con guía: Las Pozas de Edward James, Nacimiento de Huichihuayán, Cueva de las Quilas y Castillo de la Salud",
  "Expedición Tamul: canoa por el Cañón del Tampaón, cascada de Tamul, Cueva del Agua y Sótano de las Huahuas",
  "Entradas a todas las atracciones de los dos recorridos",
  "Guías certificados NOM-09 SECTUR",
  "Equipo de seguridad (chalecos y cascos) y botiquín",
  "Seguro de viaje para todos los viajeros",
];

/** Qué NO incluye. */
export const NO_INCLUYE: string[] = [
  "Comidas y cenas: en los recorridos paramos donde se come bien y cada quien elige",
  "Snacks y bebidas en los paradores",
  "Propinas y gastos personales",
];

/** Qué llevar. */
export const QUE_LLEVAR: string[] = [
  "Almohada de viaje para la noche del viernes",
  "Traje de baño, toalla y una muda seca",
  "Zapatos que se puedan mojar",
  "Bloqueador biodegradable y repelente",
  "Chamarra ligera (Xilitla refresca de noche)",
  "INE o identificación",
  "Efectivo para comidas y snacks",
];

// ── Cuartos (Manolo, 16 oct 2026) ───────────────────────────────────────────

/**
 * El precio de cada salida (`SalidaGrupal.precio`) es el del CUARTO COMPARTIDO
 * ($4,990 por persona). El cuarto privado con cama king cuesta esto más, por
 * persona ($5,490). Una sola cifra: la página, el cobro y los correos la leen.
 */
export const SUPLEMENTO_PRIVADO = 500;
export type Cuarto = "compartido" | "privado";
export type CompartirCon = "mujeres" | "hombres";
export const CUARTO_VALIDO = (c: unknown): c is Cuarto => c === "compartido" || c === "privado";
export const COMPARTIR_VALIDO = (c: unknown): c is CompartirCon => c === "mujeres" || c === "hombres";

/** Lo que paga cada persona según el cuarto. */
export function precioCuarto(base: number, cuarto: Cuarto): number {
  return base + (cuarto === "privado" ? SUPLEMENTO_PRIVADO : 0);
}

export const CUARTOS: Record<Cuarto, Record<Locale, { titulo: string; detalle: string }>> = {
  compartido: {
    es: {
      titulo: "Cuarto compartido",
      detalle: "Cuarto de dos camas que compartes con otros viajeros. Si vienen juntos, los acomodamos juntos. Si viajas solo, compartes con alguien de tu mismo género, cada quien en su cama, sin costo extra.",
    },
    en: {
      titulo: "Shared room",
      detalle: "A room with two beds shared with other travelers. If you come together, we keep you together. Traveling solo? You share with someone of your same gender, each in your own bed, at no extra cost.",
    },
  },
  privado: {
    es: { titulo: "Cuarto privado con cama king", detalle: "Un cuarto solo para ti, o para ti y tu pareja, con cama king." },
    en: { titulo: "Private room, king bed", detalle: "A room just for you, or for you and your partner, with a king bed." },
  },
};

// ── Políticas (Manolo, 16 oct 2026) ─────────────────────────────────────────

/** A partir de estos días antes de la salida ya no hay reembolso: solo cambio de fecha. */
export const CAMBIO_SOLO_DIAS_ANTES = 10;
/** ⚠️ (mío, 16 oct; que Manolo lo confirme) Hasta cuántas horas antes se puede ceder el lugar a otra persona. */
export const CEDER_HORAS_ANTES = 48;

export type Locale = "es" | "en";

/** Las reglas del viaje, a la vista y en el mismo orden en que pasan. */
export function politicas(locale: Locale = "es"): { titulo: string; texto: string }[] {
  if (locale === "en") {
    return [
      { titulo: `Book with ${ANTICIPO_PCT}%`, texto: `The deposit is non-refundable but transferable: if you can't make it, we move it to another date of the trip.` },
      { titulo: `Pay the rest ${SALDO_DIAS_ANTES} days before`, texto: `The balance is due ${SALDO_DIAS_ANTES} days before departure; we email you the payment link. That same day we confirm the departure goes ahead.` },
      { titulo: "If the group doesn't fill", texto: `If there aren't ${MINIMO_INICIAL} travelers ${CORTE_DIAS_ANTES} days before departure, you pick another date or get a 100% refund.` },
      { titulo: "If you cancel", texto: `More than ${CAMBIO_SOLO_DIAS_ANTES} days before departure, we refund what you paid minus the deposit. From ${CAMBIO_SOLO_DIAS_ANTES} days before, there's no refund: only a change of date, if there's space.` },
      { titulo: "Give your spot to someone else", texto: `Free of charge: send us their name on WhatsApp up to ${CEDER_HORAS_ANTES} hours before departure.` },
    ];
  }
  return [
    { titulo: `Apartas con el ${ANTICIPO_PCT} %`, texto: "El anticipo no es reembolsable, pero sí transferible: si no puedes ir, lo pasamos a otra fecha del viaje." },
    { titulo: `Liquidas ${SALDO_DIAS_ANTES} días antes`, texto: `El resto se paga a más tardar ${SALDO_DIAS_ANTES} días antes de la salida; te mandamos la liga de pago por correo. Ese mismo día confirmamos que la salida corre.` },
    { titulo: "Si no se junta el grupo", texto: `Si a ${CORTE_DIAS_ANTES} días de la salida no hay ${MINIMO_INICIAL} viajeros, eliges otra fecha o te devolvemos el 100 % de lo que pagaste.` },
    { titulo: "Si cancelas", texto: `Más de ${CAMBIO_SOLO_DIAS_ANTES} días antes de la salida, te devolvemos lo que pagaste menos el anticipo. A partir de ${CAMBIO_SOLO_DIAS_ANTES} días antes ya no hay devolución: solo cambio de fecha, si hay lugar.` },
    { titulo: "Ceder tu lugar", texto: `Sin costo: mándanos por WhatsApp el nombre de quien va en tu lugar hasta ${CEDER_HORAS_ANTES} horas antes de salir.` },
  ];
}

// ── El viaje de noche (Manolo, 16 oct 2026) ─────────────────────────────────

/**
 * Lo que Manolo confirmó: autopista de cuota hasta Querétaro y luego la Sierra
 * Gorda por Jalpan; la camioneta tiene permiso de turismo y seguro de
 * pasajeros. NO confirmó dos conductores ni pausas fijas: no se prometen.
 * 🔴 Falta una foto REAL de la camioneta: `tours/tamul/recogida-hotel.jpg`
 * parece generada con IA y no se usa aquí como «la camioneta».
 */
export function seguridad(locale: Locale = "es"): { icono: "ruta" | "camioneta" | "conductor" | "seguro" | "horario" | "contacto"; titulo: string; texto: string }[] {
  if (locale === "en") {
    return [
      { icono: "ruta", titulo: "Toll highway to Querétaro", texto: "From Mexico City to Querétaro we take the toll highway. From there, the Sierra Gorda road through Jalpan to Xilitla: the last stretch is a mountain road with curves." },
      { icono: "camioneta", titulo: `A ${CAPACIDAD_INICIAL}-seat Nissan Urvan`, texto: "Everyone gets their own seat. We never carry more people than seats: each departure's cap is the van's." },
      { icono: "conductor", titulo: "A professional driver", texto: "A professional driver takes you there and back. You don't drive the mountain road at night." },
      { icono: "seguro", titulo: "Passenger insurance", texto: "The van has a tourism permit and insurance covering every passenger. The tours also include travel insurance." },
      { icono: "horario", titulo: "The timing", texto: `We leave at ${HORA_SALIDA} and reach Xilitla at ${HORA_LLEGADA}. On the way back we leave at ${HORA_SALIDA_REGRESO} and arrive at the Angel at ${HORA_REGRESO}.` },
      { icono: "contacto", titulo: "Always in touch", texto: "You have our WhatsApp for the whole trip." },
    ];
  }
  return [
    { icono: "ruta", titulo: "Autopista hasta Querétaro", texto: "De la CDMX a Querétaro vamos por autopista de cuota. De ahí, la carretera de la Sierra Gorda por Jalpan hasta Xilitla: el último tramo es carretera de sierra, con curvas." },
    { icono: "camioneta", titulo: `Urvan de ${CAPACIDAD_INICIAL} lugares`, texto: "Cada quien en su asiento. Nunca subimos más gente que asientos: el cupo de cada salida es el de la camioneta." },
    { icono: "conductor", titulo: "Conductor profesional", texto: "Un conductor profesional maneja de ida y de vuelta. Tú no manejas la sierra de noche." },
    { icono: "seguro", titulo: "Seguro de pasajeros", texto: "La camioneta tiene permiso de turismo y seguro que cubre a cada pasajero. Además, los recorridos incluyen seguro de viaje." },
    { icono: "horario", titulo: "Los horarios", texto: `Salimos a las ${HORA_SALIDA} y llegamos a Xilitla a las ${HORA_LLEGADA}. De regreso salimos a las ${HORA_SALIDA_REGRESO} y llegamos al Ángel a las ${HORA_REGRESO}.` },
    { icono: "contacto", titulo: "Siempre en contacto", texto: "Tienes nuestro WhatsApp durante todo el viaje." },
  ];
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

/**
 * ⚠️ Preguntas frecuentes. Los números NO van escritos aquí: los pone la
 * página desde las constantes de arriba (anticipo, corte, líder) para que el
 * texto no se quede viejo si cambian.
 */
export function preguntasFrecuentes(locale: Locale = "es"): PreguntaFrecuente[] {
  if (locale === "en") return preguntasFrecuentesEn();
  return [
    {
      pregunta: "¿Qué está incluido?",
      respuesta: `Todo lo que necesitas para el viaje: transporte redondo desde el Ángel de la Independencia, ${NOCHES_TEXTO} en el Hotel Paraíso Encantado, ${DESAYUNOS} desayunos en El Papán Huasteco, la Ruta Surrealista y la Expedición Tamul con guías certificados, entradas, equipo de seguridad y seguro de viaje. Solo pagas aparte tus comidas, cenas y gastos personales.`,
    },
    {
      pregunta: "¿Dónde dormimos el viernes?",
      respuesta: `En el camino. Salimos ${SALIDA_TEXTO} y llegamos a Xilitla a las ${HORA_LLEGADA} del sábado, justo para desayunar. Trae una almohada de viaje.`,
    },
    {
      pregunta: "¿A qué hora regresamos?",
      respuesta: `El domingo en la noche: salimos de Xilitla a las ${HORA_SALIDA_REGRESO}, duermes en el camino y llegamos al Ángel de la Independencia el lunes alrededor de las ${HORA_REGRESO}, a tiempo para el lunes.`,
    },
    {
      pregunta: "¿Cómo funciona el anticipo?",
      respuesta: `Apartas tu lugar con el ${ANTICIPO_PCT} % del total. El anticipo no es reembolsable, pero sí transferible: si no puedes ir, lo pasamos a otra fecha del viaje. El resto se liquida a más tardar ${SALDO_DIAS_ANTES} días antes de la salida; te mandamos la liga de pago por correo.`,
    },
    {
      pregunta: "¿Y si no se junta el grupo?",
      respuesta: `Cada salida necesita un mínimo de viajeros. Si a ${CORTE_DIAS_ANTES} días de la salida no se llega, te ofrecemos cambiarte a otra fecha o te devolvemos el 100 % de lo que pagaste. Tú eliges.`,
    },
    {
      pregunta: "¿Puedo cambiar de fecha?",
      respuesta: `Sí, mientras haya lugar en la nueva fecha, aun a ${CAMBIO_SOLO_DIAS_ANTES} días o menos de salir. Escríbenos por WhatsApp y lo movemos.`,
    },
    {
      pregunta: "¿Qué pasa si cancelo?",
      respuesta: `Más de ${CAMBIO_SOLO_DIAS_ANTES} días antes de la salida, te devolvemos lo que pagaste menos el anticipo. A partir de ${CAMBIO_SOLO_DIAS_ANTES} días antes ya no hay devolución, pero puedes cambiar de fecha o ceder tu lugar a otra persona sin costo.`,
    },
    {
      pregunta: "¿Cómo son los cuartos?",
      respuesta: `Eliges al apartar. Cuarto compartido: de dos camas, con tu gente o, si viajas solo, con alguien de tu mismo género, cada quien en su cama. Cuarto privado con cama king: para ti o para ti y tu pareja, por $${SUPLEMENTO_PRIVADO} más por persona.`,
    },
    {
      pregunta: "¿Qué tan pesado es?",
      respuesta: "Nivel moderado. En Tamul se rema en canoa en equipo (no hace falta experiencia) y se nada con chaleco. Las Pozas y las cuevas tienen escaleras y caminos de piedra. Si tienes una condición de salud, avísanos antes de apartar.",
    },
    {
      pregunta: "¿Puedo ir solo?",
      respuesta: `Sí. Mucha gente viaja sola en salidas grupales. Al apartar eliges: cuarto compartido con alguien de tu mismo género, cada quien en su cama y sin costo extra, o cuarto privado con cama king por $${SUPLEMENTO_PRIVADO} más.`,
    },
    {
      pregunta: "¿Es seguro?",
      respuesta: `Viajas en Urvan de ${CAPACIDAD_INICIAL} lugares con conductor profesional, por autopista de cuota hasta Querétaro y luego la carretera de la Sierra Gorda. La camioneta tiene permiso de turismo y seguro de pasajeros; los recorridos van con guías certificados NOM-09 y seguro de viaje, y el hotel es nuestro. Tienes nuestro WhatsApp todo el viaje.`,
    },
    {
      pregunta: "¿Cómo pago?",
      respuesta: "Con tarjeta de crédito o débito, Apple Pay o Google Pay. También en efectivo en OXXO (la ficha vence al día siguiente y tu lugar queda apartado mientras tanto). Si prefieres transferencia, escríbenos por WhatsApp.",
    },
  ];
}

/** Las mismas preguntas, para la página en inglés (extranjeros que viven o viajan en la CDMX). */
function preguntasFrecuentesEn(): PreguntaFrecuente[] {
  return [
    {
      pregunta: "What's included?",
      respuesta: `Everything you need: round-trip transport from the Angel of Independence, ${NOCHES === 1 ? "1 night" : `${NOCHES} nights`} at Hotel Paraíso Encantado, ${DESAYUNOS} breakfasts at El Papán Huasteco, the Surrealist Route and the Tamul Expedition with certified guides, entry fees, safety gear and travel insurance. You only pay for your lunches, dinners and personal expenses.`,
    },
    {
      pregunta: "Is it guided in English?",
      respuesta: "The tours are guided in Spanish, and our guides help in English with the basics: directions, safety and what you're looking at. If you don't speak Spanish, tell us when you book.",
    },
    {
      pregunta: "Where do we sleep on Friday night?",
      respuesta: `On the road. We leave Friday at midnight and reach Xilitla at ${HORA_LLEGADA} on Saturday, right in time for breakfast. Bring a travel pillow.`,
    },
    {
      pregunta: "When do we get back?",
      respuesta: `Sunday night: we leave Xilitla at ${HORA_SALIDA_REGRESO}, you sleep on the way and we arrive at the Angel of Independence on Monday around ${HORA_REGRESO}, in time for work.`,
    },
    {
      pregunta: "How does the deposit work?",
      respuesta: `You book with ${ANTICIPO_PCT}% of the total. The deposit is non-refundable but transferable to another date of the trip. The balance is due ${SALDO_DIAS_ANTES} days before departure; we email you the payment link.`,
    },
    {
      pregunta: "What if I cancel?",
      respuesta: `More than ${CAMBIO_SOLO_DIAS_ANTES} days before departure, we refund what you paid minus the deposit. From ${CAMBIO_SOLO_DIAS_ANTES} days before, there's no refund, but you can change dates or give your spot to someone else for free.`,
    },
    {
      pregunta: "What are the rooms like?",
      respuesta: `You choose when you book. Shared room: two beds, with your own group or, if you travel solo, with someone of your same gender, each in your own bed. Private room with a king bed: for you or you and your partner, MX$${SUPLEMENTO_PRIVADO} more per person.`,
    },
    {
      pregunta: "Is it safe?",
      respuesta: `You ride in a ${CAPACIDAD_INICIAL}-seat Nissan Urvan with a professional driver, on the toll highway to Querétaro and then the Sierra Gorda road. The van has a tourism permit and passenger insurance; the tours have certified NOM-09 guides and travel insurance, and the hotel is ours. You have our WhatsApp the whole trip.`,
    },
    {
      pregunta: "How do I pay? Is it in dollars?",
      respuesta: "You pay in Mexican pesos with any credit or debit card, including foreign cards, Apple Pay or Google Pay. Your bank converts to your currency; the dollar figures on this page are approximate.",
    },
    {
      pregunta: "How hard is it?",
      respuesta: "Moderate. At Tamul you paddle a canoe as a team (no experience needed) and swim with a life jacket. Las Pozas and the caves have stairs and stone paths. If you have a health condition, tell us before booking.",
    },
  ];
}

/** Lo que se le manda al WhatsApp, ya con la fecha si la eligió. */
export function mensajeWhatsApp(fechaTexto?: string): string {
  return fechaTexto
    ? `Hola, me interesa el ${VIAJE_NOMBRE} del ${fechaTexto}.`
    : `Hola, me interesa el ${VIAJE_NOMBRE}.`;
}
