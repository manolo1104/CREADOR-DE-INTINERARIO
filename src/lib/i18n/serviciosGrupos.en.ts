import type { Locale } from "./config";

/**
 * Textos de /transporte-y-alimentos-para-grupos y de su gemela
 * /en/group-transport-and-meals (12 nov 2026).
 *
 * Por qué existe: Manolo pidió «una página específica donde se dé a conocer
 * que ofrecemos servicios de transporte privado, desayunos, comidas y cenas
 * para grupos». /grupos vende el VIAJE COMPLETO armado a la medida; esta vende
 * las piezas sueltas (la camioneta, el guía, la comida) a quien ya tiene su
 * plan o su hotel.
 *
 * 🔴 Lo que confirmó Manolo el 12 nov 2026 (y nada más):
 *  · Transporte: los traslados de `traslados.ts` (SLP, Tampico, CDMX; por
 *    vehículo, ida y vuelta, hasta 12). La recogida en el AEROPUERTO de esas
 *    ciudades cuesta lo mismo que el traslado desde la ciudad. Camioneta con
 *    chofer por día y grupos de más de 12: por cotización.
 *  · Guías privados: sin precio.
 *  · Comidas EN EL PAPÁN, dentro del hotel. Bandeja Huasteca $250: enchiladas
 *    de tres variedades (rojas, verdes y ajonjolinadas), bocoles, cecina,
 *    frijoles y café o agua con refill; «se ponen dependiendo de las personas»
 *    → se anuncia POR PERSONA (pendiente de su confirmación explícita). Comidas
 *    y cenas: por cotización.
 *  · ⚠️ El desayuno INCLUIDO en los tours es en El Taco Loco, camino al
 *    recorrido (`hotelPropio.ts`): esta página no habla de ese desayuno.
 *
 * Ningún importe escrito a mano salvo la bandeja: los traslados salen de
 * `traslados.ts` y llegan aquí ya formateados.
 */

export const RUTA_SERVICIOS_ES = "/transporte-y-alimentos-para-grupos";
/** Sin el prefijo /en: así la usan `buildBreadcrumbNode` y `localeUrl`. */
export const RUTA_SERVICIOS_EN_SIN_PREFIJO = "/group-transport-and-meals";
export const RUTA_SERVICIOS_EN = `/en${RUTA_SERVICIOS_EN_SIN_PREFIJO}`;

/** El precio de la Bandeja Huasteca, por persona (Manolo, 12 nov 2026). */
export const PRECIO_BANDEJA_HUASTECA = 250;

/** Lo que el texto necesita, ya calculado por la página. */
export interface DatosServicios {
  /** «$5,000 MXN»: el traslado más barato que existe (`TRASLADO_MIN`). */
  trasladoMin: string;
  /** «San Luis Potosí, Tampico y la Ciudad de México». */
  ciudades: string;
  /** Cupo de la camioneta más grande (el último tramo de las tarifas). */
  cupoMax: number;
  /** «$250 MXN». */
  bandeja: string;
  restaurante: string;
  hotel: string;
  metros: number;
  /** «de 8:00 AM a 8:00 PM». */
  horario: string;
  /** «Alex, Ángel y Erick». */
  guias: string;
  deXilitla: boolean;
  nom09: boolean;
  /** «desde Tampico, de 1 a 4 personas: $5,000 MXN». */
  ejemploTraslado: string;
}

export interface ServiciosTextos {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  breadcrumb: string;
  eyebrow: string;
  h1: string;
  respuestaEtiqueta: string;
  respuesta: (d: DatosServicios) => string;
  indice: { href: string; label: string }[];

  transporteH2: string;
  transporteIntro: string;
  aeropuertoTitulo: string;
  aeropuertoTexto: (d: DatosServicios) => string;
  porDiaTitulo: string;
  porDiaTexto: string;
  masDeDoceTitulo: string;
  masDeDoceTexto: (d: DatosServicios) => string;

  guiasH2: string;
  guiasTexto: (d: DatosServicios) => string;
  guiasEnlace: string;

  comidaH2: string;
  comidaIntro: (d: DatosServicios) => string;
  bandejaTitulo: string;
  bandejaUnidad: string;
  bandejaIncluye: string[];
  bandejaNota: string;
  comidasCenasTitulo: string;
  comidasCenasTexto: string;
  fotosAlt: { fogon: string; chilaquiles: string; platillos: string };

  cotizarH2: string;
  pasos: { t: string; d: string }[];
  ctaWhatsapp: string;
  mensajeWhatsapp: string;
  gruposTexto: string;
  gruposEnlace: string;

  faqH2: string;
  faq: (d: DatosServicios) => { q: string; a: string }[];
  porCotizacion: string;
}

const ES: ServiciosTextos = {
  metaTitle: "Transporte privado y comida para grupos en la Huasteca Potosina",
  metaDescription:
    "Traslados privados desde SLP, Tampico y CDMX (también del aeropuerto), camioneta con chofer, guías privados y desayunos, comidas y cenas en El Papán Huasteco. Cotiza por WhatsApp.",
  ogTitle: "Transporte privado, guías y comida para tu grupo en la Huasteca",
  breadcrumb: "Transporte y comida para grupos",
  eyebrow: "Servicios para grupos",
  h1: "Transporte privado, guías y comida para tu grupo",
  respuestaEtiqueta: "En corto",
  respuesta: (d) =>
    `Te llevamos y te traemos desde ${d.ciudades}, también desde el aeropuerto, con precio por camioneta desde ${d.trasladoMin} ida y vuelta. Ponemos un guía de la casa solo para tu grupo, y le damos de desayunar, comer y cenar en ${d.restaurante}, nuestro restaurante dentro del ${d.hotel}.`,
  indice: [
    { href: "#transporte", label: "Transporte privado" },
    { href: "#guias", label: "Guías privados" },
    { href: "#comida", label: "Desayunos, comidas y cenas" },
    { href: "#cotizar", label: "Cómo cotizar" },
  ],

  transporteH2: "Transporte privado",
  transporteIntro:
    "Una camioneta con chofer solo para tu grupo, de tu ciudad a Xilitla y de regreso. Estas son las tarifas:",
  aeropuertoTitulo: "Recogida en el aeropuerto",
  aeropuertoTexto: (d) =>
    `Si llegan en avión a ${d.ciudades}, los recogemos en el aeropuerto y los llevamos al hotel con la misma tarifa del traslado desde esa ciudad.`,
  porDiaTitulo: "Camioneta con chofer por día",
  porDiaTexto:
    "Para moverse entre cascadas, pueblos y el hotel durante todo el viaje, a su ritmo y sin depender de horarios. Se cotiza según los días y la ruta.",
  masDeDoceTitulo: "Grupos de más de 12",
  masDeDoceTexto: (d) =>
    `Las tarifas de arriba llegan hasta ${d.cupoMax} pasajeros, el cupo de nuestra camioneta más grande. Para grupos más grandes mandamos varias camionetas o un autobús, y se cotiza.`,

  guiasH2: "Guías privados",
  guiasTexto: (d) =>
    `Un guía de la casa solo para tu grupo, que va con ustedes todo el día. Son ${d.guias}${d.deXilitla ? ", de Xilitla" : ""}${d.nom09 ? ", certificados NOM-09 por SECTUR" : ""}. Se cotiza según los días y los lugares que quieran visitar.`,
  guiasEnlace: "Conoce a los guías",

  comidaH2: "Desayunos, comidas y cenas en El Papán Huasteco",
  comidaIntro: (d) =>
    `${d.restaurante} es nuestro restaurante, dentro del ${d.hotel}, a ${d.metros} m de Las Pozas. Cocina huasteca con tortillas hechas a mano en comal de barro. Abre ${d.horario}.`,
  bandejaTitulo: "Bandeja Huasteca para el desayuno",
  bandejaUnidad: "por persona",
  bandejaIncluye: [
    "Enchiladas de tres variedades: rojas, verdes y ajonjolinadas",
    "Bocoles",
    "Cecina",
    "Frijoles",
    "Café o agua, con refill",
  ],
  bandejaNota: "Se sirve al centro de la mesa, según el número de personas.",
  comidasCenasTitulo: "Comidas y cenas",
  comidasCenasTexto:
    "Menús de cocina huasteca para tu grupo, a la hora que les acomode dentro del horario del restaurante. Se cotizan según el número de personas y el menú.",
  fotosAlt: {
    fogon: "El fogón de leña encendido en El Papán Huasteco",
    chilaquiles: "Chilaquiles con arrachera, frijoles y aguacate en El Papán Huasteco",
    platillos: "Platillos servidos en El Papán Huasteco: arrachera con enchiladas, arroz, ensalada y milanesa",
  },

  cotizarH2: "Cómo cotizar",
  pasos: [
    { t: "Nos escribes", d: "Por WhatsApp, con fechas, número de personas, ciudad de salida y qué servicios quieren." },
    { t: "Te mandamos la propuesta", d: "Con el precio de cada servicio, para que veas qué entra y qué no." },
    { t: "Confirmas", d: "Te decimos el anticipo y las formas de pago, y se aparta." },
  ],
  ctaWhatsapp: "Cotizar por WhatsApp",
  mensajeWhatsapp:
    "Hola, quiero cotizar servicios para un grupo en la Huasteca Potosina.\n\n" +
    "· Fechas:\n" +
    "· Número de personas:\n" +
    "· Ciudad de salida (o aeropuerto):\n" +
    "· Qué necesitamos (transporte, guía, desayunos, comidas, cenas):",
  gruposTexto: "¿Quieren el viaje completo, con recorridos y hospedaje?",
  gruposEnlace: "Mira los viajes de grupo",

  faqH2: "Preguntas frecuentes",
  faq: (d) => [
    {
      q: "¿El precio del traslado es por persona?",
      a: `No: es por camioneta y de ida y vuelta. Por ejemplo, ${d.ejemploTraslado}. La tarifa cambia con el tamaño de la camioneta, hasta ${d.cupoMax} pasajeros.`,
    },
    {
      q: "¿Nos pueden recoger en el aeropuerto?",
      a: `Sí. En los aeropuertos de ${d.ciudades} los recogemos y los llevamos al hotel con la misma tarifa del traslado desde esa ciudad.`,
    },
    {
      q: "¿Dónde se sirven los desayunos, comidas y cenas?",
      a: `En ${d.restaurante}, nuestro restaurante dentro del ${d.hotel}, en Xilitla. Abre ${d.horario}.`,
    },
    {
      q: "¿Cuánto cuesta el desayuno para grupos?",
      a: `La Bandeja Huasteca cuesta ${d.bandeja} por persona: enchiladas rojas, verdes y ajonjolinadas, bocoles, cecina, frijoles y café o agua con refill. Las comidas y cenas se cotizan según el menú.`,
    },
    {
      q: `Somos más de ${d.cupoMax}, ¿nos pueden llevar?`,
      a: "Sí: mandamos varias camionetas o un autobús, y se cotiza aparte.",
    },
  ],
  porCotizacion: "Por cotización",
};

const EN: ServiciosTextos = {
  metaTitle: "Private Transport & Group Meals in Huasteca Potosina",
  metaDescription:
    "Private transfers from San Luis Potosí, Tampico and Mexico City (airport pickup too), a van with driver, private guides, and breakfast, lunch and dinner at El Papán Huasteco. Quotes on WhatsApp.",
  ogTitle: "Private transport, guides and meals for your group in the Huasteca",
  breadcrumb: "Group transport and meals",
  eyebrow: "Services for groups",
  h1: "Private transport, guides and meals for your group",
  respuestaEtiqueta: "In short",
  respuesta: (d) =>
    `We drive you in and back from ${d.ciudades}, airport included, priced per van from ${d.trasladoMin} round trip. We assign one of our own guides just to your group, and we serve breakfast, lunch and dinner at ${d.restaurante}, our restaurant inside ${d.hotel}.`,
  indice: [
    { href: "#transporte", label: "Private transport" },
    { href: "#guias", label: "Private guides" },
    { href: "#comida", label: "Breakfast, lunch and dinner" },
    { href: "#cotizar", label: "How to get a quote" },
  ],

  transporteH2: "Private transport",
  transporteIntro:
    "A van with a driver just for your group, from your city to Xilitla and back. These are the rates:",
  aeropuertoTitulo: "Airport pickup",
  aeropuertoTexto: (d) =>
    `If you fly into ${d.ciudades}, we pick you up at the airport and drive you to the hotel for the same rate as the transfer from that city.`,
  porDiaTitulo: "Van with driver by the day",
  porDiaTexto:
    "To get around waterfalls, villages and the hotel for your whole trip, at your own pace and without timetables. Quoted by days and route.",
  masDeDoceTitulo: "Groups of more than 12",
  masDeDoceTexto: (d) =>
    `The rates above go up to ${d.cupoMax} passengers, the capacity of our largest van. For bigger groups we send several vans or a bus, quoted separately.`,

  guiasH2: "Private guides",
  guiasTexto: (d) =>
    `One of our own guides just for your group, with you all day. Our guides are ${d.guias}${d.deXilitla ? ", from Xilitla" : ""}${d.nom09 ? ", NOM-09 certified by Mexico's Ministry of Tourism (SECTUR)" : ""}. Quoted by days and the places you want to visit.`,
  guiasEnlace: "Meet the guides",

  comidaH2: "Breakfast, lunch and dinner at El Papán Huasteco",
  comidaIntro: (d) =>
    `${d.restaurante} is our restaurant, inside ${d.hotel}, ${d.metros} m from Las Pozas. Huasteca cooking with tortillas pressed by hand on a clay comal. Open ${d.horario}.`,
  bandejaTitulo: "Huasteca Platter for breakfast",
  bandejaUnidad: "per person",
  bandejaIncluye: [
    "Enchiladas in three styles: red, green and sesame (ajonjolinadas)",
    "Bocoles (thick corn cakes)",
    "Cecina (thin dried beef)",
    "Beans",
    "Coffee or water, with refills",
  ],
  bandejaNota: "Served family-style in the middle of the table, scaled to your group.",
  comidasCenasTitulo: "Lunch and dinner",
  comidasCenasTexto:
    "Huasteca menus for your group, at the time that suits you within the restaurant's hours. Quoted by group size and menu.",
  fotosAlt: {
    fogon: "The wood fire burning in the hearth at El Papán Huasteco",
    chilaquiles: "Chilaquiles with arrachera, beans and avocado at El Papán Huasteco",
    platillos: "Dishes served at El Papán Huasteco: arrachera with enchiladas, rice, salad and breaded cutlet",
  },

  cotizarH2: "How to get a quote",
  pasos: [
    { t: "Message us", d: "On WhatsApp, with your dates, group size, departure city and the services you need." },
    { t: "We send you a proposal", d: "With the price of each service, so you can see what's included and what isn't." },
    { t: "You confirm", d: "We tell you the deposit and payment options, and your dates are held." },
  ],
  ctaWhatsapp: "Get a quote on WhatsApp",
  mensajeWhatsapp:
    "Hi! I'd like a quote for group services in Huasteca Potosina.\n\n" +
    "· Dates:\n" +
    "· Group size:\n" +
    "· Departure city (or airport):\n" +
    "· What we need (transport, guide, breakfast, lunch, dinner):",
  gruposTexto: "Want the whole trip, with tours and accommodation?",
  gruposEnlace: "See group trips",

  faqH2: "Frequently asked questions",
  faq: (d) => [
    {
      q: "Is the transfer price per person?",
      a: `No: it's per van and round trip. For example, ${d.ejemploTraslado}. The rate depends on the size of the van, up to ${d.cupoMax} passengers.`,
    },
    {
      q: "Can you pick us up at the airport?",
      a: `Yes. At the airports of ${d.ciudades} we pick you up and drive you to the hotel for the same rate as the transfer from that city.`,
    },
    {
      q: "Where are breakfast, lunch and dinner served?",
      a: `At ${d.restaurante}, our restaurant inside ${d.hotel}, in Xilitla. Open ${d.horario}.`,
    },
    {
      q: "How much is breakfast for groups?",
      a: `The Huasteca Platter is ${d.bandeja} per person: red, green and sesame enchiladas, bocoles, cecina, beans, and coffee or water with refills. Lunch and dinner are quoted by menu.`,
    },
    {
      q: `We're more than ${d.cupoMax} people. Can you take us?`,
      a: "Yes: we send several vans or a bus, quoted separately.",
    },
  ],
  porCotizacion: "Quoted on request",
};

export function getServiciosGrupos(locale: Locale): ServiciosTextos {
  return locale === "en" ? EN : ES;
}
