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
 * Lo que dura (Manolo, 15 oct 2026): sale el VIERNES a la medianoche, viaja de
 * noche, y son tres días allá —sábado, domingo y lunes— con dos noches de hotel.
 * La fecha de salida de cada salida es ese viernes; el regreso, el lunes.
 */
export const DIAS = 3;
export const NOCHES = 2;
/** Del viernes de salida al lunes de regreso. Para proponer el regreso al crear una fecha. */
export const REGRESO_DIAS_DESPUES = 3;

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
/** ⚠️ Días antes de la salida en que vence el saldo. Valor inicial por salida. */
export const SALDO_DIAS_ANTES = 14;
/** Días antes de la salida en que se deja de vender (fecha de corte). */
export const CORTE_DIAS_ANTES = 21;
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
/** ⚠️ Salida de regreso el lunes, después del desayuno. */
export const HORA_SALIDA_REGRESO = "10:00 am";
/** ⚠️ Llegada aproximada a CDMX el lunes (unas 7 h de camino, `tiemposDeViaje.ts`). */
export const HORA_REGRESO = "5:00 pm";

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
    titulo: "Expedición Tamul",
    momentos: [
      { hora: "8:00 am", texto: "Desayuno en El Papán Huasteco.", incluido: true },
      { hora: "9:00 am", texto: "Salimos rumbo al río Tampaón.", incluido: true },
      { texto: "Remamos en canoa por el Cañón del Tampaón hasta la cascada de Tamul, la más alta de San Luis Potosí (105 m).", incluido: true },
      { texto: "Nado y clavados en la Cueva del Agua, un cenote turquesa.", incluido: true },
      { texto: "Comida en el camino (no incluida: eliges dónde y cuánto gastar)." },
      { hora: "Atardecer", texto: "Sótano de las Huahuas: miles de aves vuelven en espiral a un abismo de 478 m.", incluido: true },
      { hora: "9:00 pm", texto: "Regreso al hotel." },
    ],
    foto: "/imagenes/tours/tamul/hero.jpg",
    alt: "Dos viajeros frente a la cascada de Tamul",
    fotos: [
      { src: "/imagenes/tours/tamul/cascada-de-tamul-desde-el-rio.jpg", alt: "La cascada de Tamul vista desde el río" },
      { src: "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg", alt: "Clavados en la Cueva del Agua" },
      { src: "/imagenes/tours/tamul/aves-volviendo-al-sotano.jpg", alt: "Las aves vuelven al Sótano de las Huahuas al atardecer" },
    ],
  },
  {
    dia: 3,
    diaSemana: "Lunes",
    titulo: "Desayuno en El Papán y regreso",
    momentos: [
      { hora: "8:00 am", texto: "Desayuno en El Papán Huasteco.", incluido: true },
      { hora: HORA_SALIDA_REGRESO, texto: "Check-out y regreso a CDMX.", incluido: true },
      { hora: HORA_REGRESO, texto: "Llegada aproximada al Ángel de la Independencia." },
    ],
    foto: "/imagenes/hotel-paraiso-encantado/gallery-2.jpg",
    alt: "Terraza del Hotel Paraíso Encantado con la sierra de Xilitla al fondo",
    fotos: [
      { src: "/imagenes/papan-huasteco/chilaquiles-con-arrachera.jpg", alt: "Chilaquiles con arrachera en El Papán Huasteco" },
      { src: "/imagenes/papan-huasteco/fogon-de-lena.jpg", alt: "El fogón de leña de El Papán Huasteco" },
      { src: "/imagenes/hotel-paraiso-encantado/habitaciones/lindavista.jpg", alt: "Una habitación del Hotel Paraíso Encantado" },
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
    icono: "cama", titulo: `${NOCHES} noches en el Hotel Paraíso Encantado`,
    detalle: "Sábado y domingo, en Xilitla, a 5 minutos caminando de Las Pozas.",
    foto: "/imagenes/hotel-paraiso-encantado/hero.jpg", alt: "El Hotel Paraíso Encantado, con su alberca entre la selva",
  },
  {
    icono: "desayuno", titulo: "3 desayunos en El Papán Huasteco",
    detalle: "Sábado, domingo y lunes, en el restaurante del hotel, con cocina de fogón.",
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
  `${NOCHES} noches en el Hotel Paraíso Encantado (sábado y domingo)`,
  "3 desayunos en El Papán Huasteco (sábado, domingo y lunes)",
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

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

/**
 * ⚠️ Preguntas frecuentes. Los números NO van escritos aquí: los pone la
 * página desde las constantes de arriba (anticipo, corte, líder) para que el
 * texto no se quede viejo si cambian.
 */
export function preguntasFrecuentes(): PreguntaFrecuente[] {
  return [
    {
      pregunta: "¿Qué está incluido?",
      respuesta: `Todo lo que necesitas para el viaje: transporte redondo desde el Ángel de la Independencia, ${NOCHES} noches en el Hotel Paraíso Encantado, 3 desayunos en El Papán Huasteco, la Ruta Surrealista y la Expedición Tamul con guías certificados, entradas, equipo de seguridad y seguro de viaje. Solo pagas aparte tus comidas, cenas y gastos personales.`,
    },
    {
      pregunta: "¿Dónde dormimos el viernes?",
      respuesta: `En el camino. Salimos ${SALIDA_TEXTO} y llegamos a Xilitla a las ${HORA_LLEGADA} del sábado, justo para desayunar. Trae una almohada de viaje.`,
    },
    {
      pregunta: "¿A qué hora regresamos?",
      respuesta: `El lunes, después del desayuno: salimos de Xilitla a las ${HORA_SALIDA_REGRESO} y llegamos al Ángel de la Independencia alrededor de las ${HORA_REGRESO}.`,
    },
    {
      pregunta: "¿Cómo funciona el anticipo?",
      respuesta: `Apartas tu lugar con el ${ANTICIPO_PCT} % del total. El anticipo no es reembolsable, pero sí transferible: si no puedes ir, lo pasamos a otra fecha del viaje. El resto se liquida antes de la salida; te mandamos la liga de pago por correo.`,
    },
    {
      pregunta: "¿Y si no se junta el grupo?",
      respuesta: `Cada salida necesita un mínimo de viajeros. Si a ${CORTE_DIAS_ANTES} días de la salida no se llega, te ofrecemos cambiarte a otra fecha o te devolvemos el 100 % de lo que pagaste. Tú eliges.`,
    },
    {
      pregunta: "¿Puedo cambiar de fecha?",
      respuesta: "Sí, mientras haya lugar en la nueva fecha. Escríbenos por WhatsApp y lo movemos.",
    },
    {
      pregunta: "¿Qué tan pesado es?",
      respuesta: "Nivel moderado. En Tamul se rema en canoa en equipo (no hace falta experiencia) y se nada con chaleco. Las Pozas y las cuevas tienen escaleras y caminos de piedra. Si tienes una condición de salud, avísanos antes de apartar.",
    },
    {
      pregunta: "¿Puedo ir solo?",
      respuesta: "Sí. Mucha gente viaja sola en salidas grupales. Escríbenos por WhatsApp antes de apartar y te decimos cómo se acomodan los cuartos.",
    },
    {
      pregunta: "¿Es seguro?",
      respuesta: "Viajas con conductor profesional, los recorridos van con guías certificados NOM-09 y seguro de viaje incluido, y el hotel es nuestro. Te acompañamos todo el viaje.",
    },
    {
      pregunta: "¿Cómo pago?",
      respuesta: "Con tarjeta de crédito o débito, Apple Pay o Google Pay. También en efectivo en OXXO (la ficha vence al día siguiente y tu lugar queda apartado mientras tanto). Si prefieres transferencia, escríbenos por WhatsApp.",
    },
  ];
}

/** Lo que se le manda al WhatsApp, ya con la fecha si la eligió. */
export function mensajeWhatsApp(fechaTexto?: string): string {
  return fechaTexto
    ? `Hola, me interesa el ${VIAJE_NOMBRE} del ${fechaTexto}.`
    : `Hola, me interesa el ${VIAJE_NOMBRE}.`;
}
