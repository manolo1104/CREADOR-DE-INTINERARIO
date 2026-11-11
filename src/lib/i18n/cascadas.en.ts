import type { Locale } from "./config";

/**
 * Textos de /cascadas-de-la-huasteca-potosina y de su gemela
 * /en/huasteca-potosina-waterfalls (10 nov 2026).
 *
 * Por qué existe: «cascadas huasteca potosina / mejores cascadas de la huasteca
 * potosina» suma ~1,038 impresiones en el puesto 6.8 sin una página de listado,
 * y en inglés las búsquedas de «waterfalls» caían en la portada /en. La página
 * apunta a la intención PLURAL (el listado); cada cascada sigue teniendo su
 * ficha en /destinos, que es la dueña de su nombre: aquí solo se resume y se
 * enlaza, para no pelearle la búsqueda.
 *
 * 🔴 Ninguna cifra escrita a mano. La lista sale de `DESTINOS_DB` (las fichas
 * cuyo slug es de cascada), las entradas, temporadas y cómo llegar de cada
 * ficha, los minutos de `tiemposADestinos.ts`, los recorridos de `tourMapping.ts`
 * y `TOURS_DB`, y la regla del año de `temporada.ts`. Los textos de aquí son
 * funciones que reciben esos datos ya calculados.
 *
 * ⚠️ En inglés todo importe lleva «MXN» (las entradas ya lo traen de la ficha;
 * los recorridos, de `fmtMoney`).
 */

export const RUTA_CASCADAS_ES = "/cascadas-de-la-huasteca-potosina";
/** Sin el prefijo /en: así la usan `buildBreadcrumbNode` y `localeUrl`. */
export const RUTA_CASCADAS_EN_SIN_PREFIJO = "/huasteca-potosina-waterfalls";
export const RUTA_CASCADAS_EN = `/en${RUTA_CASCADAS_EN_SIN_PREFIJO}`;

/** Lo que la FAQ necesita, ya calculado por la página. */
export interface DatosFaqCascadas {
  /** La respuesta de la ficha de Tamul a «¿qué tan alta es?» (ya en minúscula inicial), o null si ya no está. */
  masAlta: { nombre: string; respuesta: string } | null;
  /** «Expedición Tamul: Cascada de Tamul; Cascadas del Meco: Cascada El Meco y Cascada El Salto; …» */
  conTour: string;
  entradaMin: string | null;
  entradaMax: string | null;
  /** «$220 MXN + $300 MXN panga p/p»: la de Tamul, que se paga aparte de la panga. */
  entradaTamul: string | null;
  libres: string;
  /** «Expedición Tamul, Cascadas del Meco y …»: los que traen «Entradas a todas las atracciones». */
  toursConEntradas: string;
  temporada: string;
  cercana: { nombre: string; tiempo: string } | null;
  lejana: { nombre: string; tiempo: string } | null;
  vallesXilitla: string;
  /** Las que tienen tiempo desde Xilitla en la tabla de /xilitla-o-ciudad-valles. */
  desdeXilitla: string;
}

export interface CascadasContent {
  metaTitle: string;
  metaDescription: (n: number) => string;
  ogTitle: string;
  breadcrumb: string;
  eyebrow: string;
  h1: string;
  respuestaEtiqueta: string;
  respuesta: (d: { n: number; conTour: number; tours: string; recogenEnLasDos: boolean }) => string;

  temporadaTitulo: string;
  temporada: (inicio: string) => string;

  tablaTitulo: string;
  tablaCabeceras: [string, string, string, string, string, string];
  tablaNota: (toursConEntradas: string) => string;
  seCombinaCon: string;
  porTuCuenta: string;

  conTourTitulo: string;
  conTourIntro: string;
  entrada: string;
  mejorEpoca: string;
  mejorHora: string;
  comoLlegar: string;
  desdeXilitla: string;
  fichaDe: (nombre: string) => string;
  tourCta: (tour: string, precio: string) => string;
  desde: (monto: string, unidad: string) => string;

  otrasTitulo: string;
  otrasIntro: string;

  faqTitulo: string;
  faq: (d: DatosFaqCascadas) => { q: string; a: string }[];

  ctaTitulo: string;
  ctaTexto: string;
  ctaTours: string;
  ctaWhatsApp: string;
  waMensaje: string;
  sigueLeyendo: string;
  enlaceHospedaje: string;
  /** /que-hacer-en-la-huasteca-potosina, que existe en los dos idiomas con el mismo slug. */
  enlaceQueHacer: string;
  enlaceInfo: string;
}

const ES: CascadasContent = {
  // 56 caracteres.
  metaTitle: "Cascadas de la Huasteca Potosina: precios, época y tours",
  metaDescription: (n) =>
    `Las ${n} cascadas de la Huasteca Potosina comparadas: Tamul, Micos, Minas Viejas, El Meco, Tamasopo y más, con su entrada, mejor época y cómo llegar.`,
  ogTitle: "Cascadas de la Huasteca Potosina, comparadas",
  breadcrumb: "Cascadas",
  eyebrow: "Guía de cascadas · entrada, temporada y cómo llegar",
  h1: "Cascadas de la Huasteca Potosina",
  respuestaEtiqueta: "En corto",
  respuesta: ({ n, conTour, tours, recogenEnLasDos }) =>
    `Aquí están las ${n} cascadas de nuestra guía, con lo que cuesta entrar, su mejor época y cuánto se hace desde Ciudad Valles. ` +
    `${conTour} de ellas están dentro de nuestros recorridos de un día (${tours})` +
    (recogenEnLasDos ? ", que pasan por ti a tu hospedaje en Xilitla o Ciudad Valles" : "") +
    "; las demás se visitan por tu cuenta o combinándolas con un recorrido cercano.",

  temporadaTitulo: "¿Cuándo ver las cascadas?",
  temporada: (inicio) =>
    `Se puede venir todo el año. Del ${inicio} a mayo el agua baja clara; el turquesa más intenso es de marzo a mayo, que es también cuando más gente hay. ` +
    "De julio a octubre las cascadas van a todo caudal y el agua puede bajar con sedimento en vez de turquesa; junio es de transición. " +
    "Cada cascada tiene además su propia mejor época: está en la tabla.",

  tablaTitulo: "Las cascadas, comparadas",
  tablaCabeceras: ["Cascada", "Municipio", "Entrada", "Mejor época", "Desde Ciudad Valles", "Recorrido"],
  tablaNota: (tours) =>
    `La entrada es lo que cuesta si vas por tu cuenta${tours ? `; en ${tours} ya va incluida` : ""}. Tiempos aproximados en auto.`,
  seCombinaCon: "Se combina con",
  porTuCuenta: "Por tu cuenta",

  conTourTitulo: "Las cascadas que visitan nuestros recorridos",
  conTourIntro: "Con guía, transporte desde tu hospedaje y la entrada resuelta. Cada una tiene su ficha completa con horario, precio y qué llevar.",
  entrada: "Entrada",
  mejorEpoca: "Mejor época",
  mejorHora: "Mejor hora",
  comoLlegar: "Cómo llegar",
  desdeXilitla: "Desde Xilitla",
  fichaDe: (n) => `Ficha completa: ${n}`,
  tourCta: (tour, precio) => `${tour} · ${precio}`,
  desde: (monto, unidad) => `desde ${monto} ${unidad}`,

  otrasTitulo: "Más cascadas para ir por tu cuenta",
  otrasIntro: "No están dentro de un recorrido nuestro; varias quedan cerca de alguno y se pueden combinar.",

  faqTitulo: "Preguntas frecuentes sobre las cascadas",
  faq: (d) => [
    ...(d.masAlta
      ? [{ q: "¿Cuál es la cascada más alta de la Huasteca Potosina?", a: `${d.masAlta.nombre}: ${d.masAlta.respuesta}` }]
      : []),
    {
      q: "¿Qué cascadas de la Huasteca Potosina se pueden ver en un tour?",
      a: `En nuestros recorridos de un día: ${d.conTour}. Revisa en la ficha de cada recorrido qué incluye exactamente.`,
    },
    ...(d.entradaMin && d.entradaMax
      ? [{
          q: "¿Cuánto cuesta entrar a las cascadas?",
          a:
            `Si vas por tu cuenta, entre ${d.entradaMin} y ${d.entradaMax} por persona en las que tienen tarifa publicada` +
            (d.entradaTamul ? ` (en Tamul: ${d.entradaTamul})` : "") +
            "." +
            (d.libres ? ` ${d.libres}.` : "") +
            (d.toursConEntradas ? ` En ${d.toursConEntradas} la entrada ya va incluida.` : ""),
        }]
      : []),
    { q: "¿Cuál es la mejor época para ver las cascadas?", a: d.temporada },
    ...(d.cercana && d.lejana
      ? [{
          q: "¿Qué tan lejos están las cascadas de Ciudad Valles y de Xilitla?",
          a:
            `Ciudad Valles es la base más cercana: de ${d.cercana.nombre} (${d.cercana.tiempo}) a ${d.lejana.nombre} (${d.lejana.tiempo}). ` +
            `Xilitla queda a ${d.vallesXilitla} de Ciudad Valles` +
            (d.desdeXilitla ? `; desde ahí, ${d.desdeXilitla}.` : "."),
        }]
      : []),
  ],

  ctaTitulo: "¿Armamos tu ruta de cascadas?",
  ctaTexto: "Dinos tus fechas y dónde te hospedas, y te decimos qué recorrido te lleva a las cascadas que quieres ver.",
  ctaTours: "Ver tours y fechas",
  ctaWhatsApp: "Escríbenos por WhatsApp",
  waMensaje: "Hola, quiero conocer las cascadas de la Huasteca Potosina.\nFechas: \nPersonas: \nMe hospedo en: \n¿Qué recorrido me recomiendan?",
  sigueLeyendo: "Sigue leyendo",
  enlaceHospedaje: "Dónde hospedarse en la Huasteca Potosina, zona por zona",
  enlaceQueHacer: "Qué hacer en la Huasteca Potosina",
  enlaceInfo: "Guía práctica: cómo llegar, clima y presupuesto",
};

const EN: CascadasContent = {
  // 53 characters.
  metaTitle: "Huasteca Potosina Waterfalls: Prices, Seasons & Tours",
  metaDescription: (n) =>
    `Compare ${n} Huasteca Potosina waterfalls — Tamul, Micos, Minas Viejas, El Meco, Tamasopo and more — with entrance fees in MXN, best season and how to get there.`,
  ogTitle: "Huasteca Potosina waterfalls, compared",
  breadcrumb: "Waterfalls",
  eyebrow: "Waterfall guide · fees, seasons and getting there",
  h1: "Huasteca Potosina waterfalls",
  respuestaEtiqueta: "In short",
  respuesta: ({ n, conTour, tours, recogenEnLasDos }) =>
    `Here are the ${n} waterfalls in our guide, with what it costs to get in, the best season and the drive from Ciudad Valles. ` +
    `${conTour} of them are on our day tours (${tours})` +
    (recogenEnLasDos ? ", which pick you up at your lodging in Xilitla or Ciudad Valles" : "") +
    "; the rest you can visit on your own or pair with a nearby tour.",

  temporadaTitulo: "When to see the waterfalls",
  temporada: (inicio) =>
    `You can come any time of year. From ${inicio} through May the water runs clear; the most intense turquoise is from March to May, which is also when it's busiest. ` +
    "From July to October the waterfalls are at full flow and the water can carry sediment instead of turquoise; June is a transition month. " +
    "Each waterfall also has its own best season — it's in the table.",

  tablaTitulo: "The waterfalls, compared",
  tablaCabeceras: ["Waterfall", "Municipality", "Entrance", "Best season", "From Ciudad Valles", "Tour"],
  tablaNota: (tours) =>
    `The entrance fee is what you pay on your own${tours ? `; on the ${tours} it's already included` : ""}. Approximate driving times.`,
  seCombinaCon: "Pairs well with",
  porTuCuenta: "On your own",

  conTourTitulo: "The waterfalls on our tours",
  conTourIntro: "With a guide, transport from your lodging and admission taken care of. Each one has its full page with hours, prices and what to bring.",
  entrada: "Entrance",
  mejorEpoca: "Best season",
  mejorHora: "Best time of day",
  comoLlegar: "Getting there",
  desdeXilitla: "From Xilitla",
  fichaDe: (n) => `Full guide: ${n}`,
  tourCta: (tour, precio) => `${tour} · ${precio}`,
  desde: (monto, unidad) => `from ${monto} ${unidad}`,

  otrasTitulo: "More waterfalls to visit on your own",
  otrasIntro: "They're not on one of our tours; several are close to one and easy to combine.",

  faqTitulo: "Waterfalls: frequently asked questions",
  faq: (d) => [
    ...(d.masAlta
      ? [{ q: "What is the tallest waterfall in Huasteca Potosina?", a: `${d.masAlta.nombre}: ${d.masAlta.respuesta}` }]
      : []),
    {
      q: "Which Huasteca Potosina waterfalls can I see on a tour?",
      a: `On our day tours: ${d.conTour}. Check each tour's page for exactly what's included.`,
    },
    ...(d.entradaMin && d.entradaMax
      ? [{
          q: "How much does it cost to visit the waterfalls?",
          a:
            `On your own, between ${d.entradaMin} and ${d.entradaMax} per person at the ones with a published fee` +
            (d.entradaTamul ? ` (at Tamul: ${d.entradaTamul})` : "") +
            "." +
            (d.libres ? ` ${d.libres}.` : "") +
            (d.toursConEntradas ? ` On the ${d.toursConEntradas} admission is already included.` : ""),
        }]
      : []),
    { q: "When is the best time to see the waterfalls?", a: d.temporada },
    ...(d.cercana && d.lejana
      ? [{
          q: "How far are the waterfalls from Ciudad Valles and Xilitla?",
          a:
            `Ciudad Valles is the closest base: from ${d.cercana.nombre} (${d.cercana.tiempo}) to ${d.lejana.nombre} (${d.lejana.tiempo}). ` +
            `Xilitla is ${d.vallesXilitla} from Ciudad Valles` +
            (d.desdeXilitla ? `; from there, ${d.desdeXilitla}.` : "."),
        }]
      : []),
  ],

  ctaTitulo: "Want us to plan your waterfall route?",
  ctaTexto: "Tell us your dates and where you're staying, and we'll tell you which tour takes you to the waterfalls you want to see.",
  ctaTours: "See tours and dates",
  ctaWhatsApp: "Message us on WhatsApp",
  waMensaje: "Hi! I'd like to see the Huasteca Potosina waterfalls.\nDates: \nGuests: \nStaying in: \nWhich tour would you recommend?",
  sigueLeyendo: "Keep reading",
  enlaceHospedaje: "Where to stay in Huasteca Potosina, area by area",
  enlaceQueHacer: "Things to do in Huasteca Potosina",
  enlaceInfo: "Practical guide: getting here, weather and budget",
};

export function getCascadas(locale: Locale): CascadasContent {
  return locale === "en" ? EN : ES;
}
