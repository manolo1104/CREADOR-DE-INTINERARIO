import type { Locale } from "./config";

import { GRUPO_MAX } from "@/lib/tours";
/**
 * Traducción de /experiencias (la página y su grid con filtros).
 *
 * ⚠️ Dos cifras se CORRIGIERON en los dos idiomas al traducir (14 ago 2026),
 * porque contradecían a la fuente del propio sitio:
 *
 *   · El Sótano de las Golondrinas decía "333 m de profundidad". `destinos.ts`
 *     — que es el catálogo, y lo que se publica en la ficha del destino y en su
 *     JSON-LD — dice 376 m de caída libre y hasta 512 m de profundidad total.
 *     Un lector que abría la ficha desde esta misma página veía las dos.
 *   · "Desde CDMX son 6 horas por la 85D" y el autobús "8 h (~$600)". El
 *     trayecto son 430 km por la Mex-85 / MEX-70 y **6.5 a 7 horas** (dato de
 *     Manolo, puesto en todas las páginas a la vez), y el ADO son ~8 h por
 *     $600–900. Ver la nota larga en `faq.en.ts`.
 *
 * ⚠️ El grid es un componente CLIENTE. Los nombres y descripciones de los
 * destinos NO se traducen aquí: salen de `localizeDestino`, que ya tiene los 41
 * traducidos. Aquí solo está el cascarón (filtros, etiquetas, el CTA).
 */

export interface FiltroContent {
  label: string;
  value: string;
}

export interface ExperienciasFaq {
  q: string;
  a: string;
}

export interface ExperienciasContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;

  inLanguage: string;
  schemaListName: string;
  schemaListDescription: string;
  breadcrumbHome: string;
  breadcrumbActual: string;

  heroEyebrow: string;
  heroH1a: string;
  heroH1Enfasis: string;
  heroIntro: string;

  bannerEyebrow: string;
  bannerTexto: string;
  bannerCta: string;
  /** El planificador IA solo existe en español: en inglés el banner no se pinta. */
  bannerVisible: boolean;

  toursEyebrow: string;
  toursTitulo: string;
  toursVerTodos: string;

  ctaBadge: string;
  ctaH2a: string;
  ctaH2Enfasis: string;
  ctaTexto: string;
  ctaBoton: string;

  faqTituloA: string;
  faqTituloEnfasis: string;
  faqs: ExperienciasFaq[];

  guiaBadge: string;
  guiaH2a: string;
  guiaH2Enfasis: string;
  guiaTexto: string;
  guiaBoton: string;
  guiaGarantia: string;
  /** La guía PDF se vende y se entrega en español: no se ofrece en inglés. */
  guiaVisible: boolean;

  // ── Grid con filtros (componente cliente) ──
  filtros: FiltroContent[];
  dificultad: Record<string, string>;
  contadorSingular: string;
  contadorPlural: string;
  reservarBadge: string;
  reservarAria: (nombre: string) => string;
  verAria: (nombre: string) => string;
  precioNota: string;
  verMas: string;
  vacioTexto: string;
  vacioBoton: string;
  waMensaje: (nombre: string) => string;
}

const ES: ExperienciasContent = {
  metaTitle: "Experiencias en la Huasteca Potosina — {N} Destinos por Tipo de Aventura",
  metaDescription:
    "Explora las {N} experiencias de la Huasteca Potosina agrupadas por tipo: cascadas turquesas, aventura extrema, cultura huasteca y naturaleza. Tours guiados con transporte incluido.",
  ogTitle: "Experiencias en la Huasteca Potosina — Cascadas, Aventura y Cultura",
  ogDescription:
    "{N} experiencias únicas en la Huasteca Potosina. Cascadas turquesas, sótanos kársticos, jardines surrealistas y aguas termales en San Luis Potosí.",
  twitterTitle: "Experiencias Huasteca Potosina — Cascadas, Aventura y Cultura 2026",
  twitterDescription:
    "{N} experiencias únicas en la Huasteca Potosina. Cascadas, aventura y cultura.",

  inLanguage: "es-MX",
  schemaListName: "Experiencias en la Huasteca Potosina",
  schemaListDescription: "Tours y actividades en la Huasteca Potosina, San Luis Potosí, México",
  breadcrumbHome: "Inicio",
  breadcrumbActual: "Experiencias",

  heroEyebrow: "✦ Huasteca Potosina · San Luis Potosí ✦",
  heroH1a: "Experiencias en la",
  heroH1Enfasis: "Huasteca Potosina",
  heroIntro:
    "{N} destinos únicos — cascadas turquesas, aventura extrema, arte surrealista y aguas termales. Una experiencia para cada tipo de viajero.",

  bannerEyebrow: "✦ 4.9★ · 492 reseñas de Google",
  bannerTexto: "Diez recorridos con todo incluido. Apartas con el 30 % y cancelas gratis hasta 48 h antes.",
  bannerCta: "Ver recorridos y reservar →",
  bannerVisible: true,

  toursEyebrow: "Con guía certificado",
  toursTitulo: "Tours que puedes reservar hoy",
  toursVerTodos: "Ver los {N} tours →",

  ctaBadge: "✦ Tours con todo incluido",
  ctaH2a: "¿Listo para",
  ctaH2Enfasis: "reservar?",
  ctaTexto:
    `Transporte, desayuno, entradas y guía NOM-09 incluidos. Grupos máx. ${GRUPO_MAX} personas — si son más, habla con el equipo. Cancelación gratis con 48h de antelación.`,
  ctaBoton: "Ver todos los tours →",

  faqTituloA: "Preguntas",
  faqTituloEnfasis: "frecuentes",
  faqs: [
    {
      q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
      a: "De noviembre a marzo es la temporada ideal: clima fresco (18–26°C), cascadas con nivel óptimo y el color turquesa más intenso. Semana Santa y julio–agosto son temporada alta con más afluencia y calor.",
    },
    {
      q: "¿Qué incluye el precio de cada experiencia?",
      a: "El precio indicado es el acceso o entrada por persona al destino natural. Los tours guiados con traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, desayuno típico, entradas y guía certificado NOM-09 tienen un costo adicional disponible en la sección de Tours.",
    },
    {
      q: "¿Se puede visitar la Huasteca Potosina con niños?",
      a: "Sí. Las Cascadas de Tamasopo, Puente de Dios y Las Pozas de Xilitla son perfectas para familias con niños desde los 5 años. El Sótano de las Golondrinas (376 m de caída libre) y el río Tampaón requieren mayor edad y condición física.",
    },
    {
      q: "¿Cómo llegar a la Huasteca Potosina desde Ciudad de México?",
      a: "Desde CDMX son 430 km por la autopista Mex-85 / MEX-70: unas 6.5 a 7 horas en coche. En autobús ADO desde la Terminal Norte hasta Ciudad Valles son unas 8 horas ($600–900 MXN en clase ejecutiva). Ciudad Valles es la base de operaciones de la región.",
    },
  ],

  guiaBadge: "✦ Guía PDF Gratuita",
  guiaH2a: "Los 5 mejores días para visitar",
  guiaH2Enfasis: "la Huasteca en 2026",
  guiaTexto:
    "Itinerarios reales, precios actualizados y consejos de guías locales — todo en un PDF descargable.",
  guiaBoton: "Descargar la guía → $49",
  guiaGarantia: "Pago seguro · Descarga inmediata · 🛡️ Garantía 7 días",
  guiaVisible: true,

  filtros: [
    { label: "Todos", value: "todos" },
    { label: "Cascadas", value: "cascadas" },
    { label: "Aventura", value: "aventura" },
    { label: "Cultura", value: "cultura" },
    { label: "Bienestar", value: "bienestar" },
    { label: "Fotografía", value: "fotografia" },
  ],
  dificultad: { baja: "Fácil", media: "Media", alta: "Difícil", extrema: "Extrema" },
  contadorSingular: "destino",
  contadorPlural: "destinos",
  reservarBadge: "Reservar",
  reservarAria: (nombre) => `Reservar ${nombre} por WhatsApp`,
  verAria: (nombre) => `Ver ${nombre}`,
  precioNota: "/ persona · entrada",
  verMas: "Ver más →",
  vacioTexto: "No hay destinos en esta categoría.",
  vacioBoton: "Ver todos →",
  waMensaje: (nombre) =>
    `Hola, me interesa visitar ${nombre}. ¿Pueden orientarme sobre tours disponibles?`,
};

const EN: ExperienciasContent = {
  metaTitle: "Things to Do in the Huasteca Potosina — {N} Places, Sorted by Adventure",
  metaDescription:
    "All {N} places worth your time in Mexico's waterfall country, sorted by what you're after: turquoise waterfalls, extreme adventure, Huastec culture and hot springs. Guided tours with transportation included.",
  ogTitle: "Things to Do in the Huasteca Potosina — Waterfalls, Adventure, Culture",
  ogDescription:
    "{N} places in the Huasteca Potosina: turquoise waterfalls, karst sinkholes, a surrealist jungle garden and hot springs in San Luis Potosí, Mexico.",
  twitterTitle: "Things to Do in the Huasteca Potosina — Waterfalls, Adventure, Culture",
  twitterDescription:
    "{N} places in Mexico's waterfall country: waterfalls, sinkholes, surrealist art and hot springs.",

  inLanguage: "en-US",
  schemaListName: "Things to do in the Huasteca Potosina",
  schemaListDescription: "Tours and attractions in the Huasteca Potosina, San Luis Potosí, Mexico",
  breadcrumbHome: "Home",
  breadcrumbActual: "Things to do",

  heroEyebrow: "✦ Huasteca Potosina · San Luis Potosí ✦",
  heroH1a: "Things to do in the",
  heroH1Enfasis: "Huasteca Potosina",
  heroIntro:
    "{N} places worth the drive — turquoise waterfalls, extreme adventure, surrealist art and hot springs. One for every kind of traveler.",

  // El banner anunciaba el planificador (`/recomendar`, solo-ES) y por eso
  // estaba apagado en inglés. Ahora lleva al motor, que sí está traducido.
  bannerEyebrow: "✦ 4.9★ · 492 Google reviews",
  bannerTexto: "Ten all-inclusive tours. Book with a 30 % deposit, cancel free up to 48 h before.",
  bannerCta: "See tours and book →",
  bannerVisible: true,

  toursEyebrow: "With a certified guide",
  toursTitulo: "Tours you can book today",
  toursVerTodos: "See all {N} tours →",

  ctaBadge: "✦ All-inclusive tours",
  ctaH2a: "Ready to",
  ctaH2Enfasis: "book?",
  ctaTexto:
    "Transportation, breakfast, every entrance fee and a NOM-09 certified guide included. Groups of 12 maximum. Free cancellation up to 48 hours before.",
  ctaBoton: "See all tours →",

  faqTituloA: "Frequently asked",
  faqTituloEnfasis: "questions",
  faqs: [
    {
      q: "When is the best time to visit the Huasteca Potosina?",
      a: "November through March is the sweet spot: cool weather (64–79°F / 18–26°C), waterfalls at their best level and the most intense turquoise. Easter week and July–August are high season — more crowds and more heat.",
    },
    {
      q: "What does the price on each place include?",
      a: "The price shown is the entrance fee per person to that natural site. Guided tours — with round-trip transportation from your lodging in Xilitla or Ciudad Valles, regional breakfast, all entrance fees and a NOM-09 certified guide — are priced separately and listed under Tours.",
    },
    {
      q: "Can I visit the Huasteca Potosina with kids?",
      a: "Yes. Cascadas de Tamasopo, Puente de Dios and Las Pozas in Xilitla work beautifully for families with kids from about age 5. The Sótano de las Golondrinas (1,234 ft / 376 m of free fall) and the Tampaón river need more age and fitness.",
    },
    {
      q: "How do I get to the Huasteca Potosina from Mexico City?",
      a: "It's 267 miles (430 km) from Mexico City on the Mex-85 / MEX-70 toll highway — about 6.5 to 7 hours by car. By bus, ADO runs from Terminal Norte to Ciudad Valles in about 8 hours ($600–900 MXN in executive class). Ciudad Valles is the region's base.",
    },
  ],

  // La guía PDF se vende y se entrega en español: ofrecerla en inglés sería
  // cobrar $49 por un documento que el comprador no puede leer.
  guiaBadge: "",
  guiaH2a: "",
  guiaH2Enfasis: "",
  guiaTexto: "",
  guiaBoton: "",
  guiaGarantia: "",
  guiaVisible: false,

  filtros: [
    { label: "All", value: "todos" },
    { label: "Waterfalls", value: "cascadas" },
    { label: "Adventure", value: "aventura" },
    { label: "Culture", value: "cultura" },
    { label: "Wellness", value: "bienestar" },
    { label: "Photography", value: "fotografia" },
  ],
  dificultad: { baja: "Easy", media: "Moderate", alta: "Hard", extrema: "Extreme" },
  contadorSingular: "place",
  contadorPlural: "places",
  reservarBadge: "Book",
  reservarAria: (nombre) => `Book ${nombre} on WhatsApp`,
  verAria: (nombre) => `See ${nombre}`,
  precioNota: "/ person · entrance",
  verMas: "See more →",
  vacioTexto: "No places in this category.",
  vacioBoton: "See all →",
  waMensaje: (nombre) =>
    `Hi! I'd like to visit ${nombre}. Which tour includes it and what does it cost?`,
};

export function getExperiencias(locale: Locale): ExperienciasContent {
  return locale === "en" ? EN : ES;
}

/** Sustituye el marcador {N} por el número real (destinos o tours). */
export function conNumero(texto: string, n: number, locale: Locale): string {
  return texto.replace(/\{N\}/g, n.toLocaleString(locale === "en" ? "en-US" : "es-MX"));
}
