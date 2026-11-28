import type { Locale } from "./config";
import { TOURS_DB, cargoVallesDe, etiquetaUnidad, fraseRecogida, partesRecogida, salidaCorta, type Tour } from "@/lib/tours";
import { enAuto, enAutobus } from "@/lib/tiemposDeViaje";
import { incluyeDesayuno, rangoPorPersona, recogenEnValles } from "@/lib/catalogoResumen";
import { localizeTour } from "./localize";
import { fmtMoney } from "./format";

/**
 * Textos de /tours-en-ciudad-valles y /en/tours-en-ciudad-valles (10 nov 2026).
 *
 * El español es, letra por letra, el que ya publicaba la página (rankea en el
 * puesto ~9 con 2.25 % de CTR): solo se mudó aquí para que el inglés no sea
 * una copia que se desparejó. Todas las cifras y listas salen del catálogo,
 * igual que antes.
 *
 * ⚠️ En inglés TODO precio lleva «MXN»: un lector de EE. UU. lee «$1,400»
 * como dólares. Por eso las frases inglesas usan `fmtMoney`.
 */

/**
 * Los recorridos que de verdad pasan por ti en Ciudad Valles.
 *
 * 🔴 Filtraba con `esPorPersona` y así entraban la Gruta de Xilo, el Amanecer
 * de Nubes, la Olla de la Luz, la Travesía del Café —los cuatro recogen SOLO
 * en Xilitla— y el buceo, que es en la laguna de Rioverde. Una página que
 * promete "pasamos por ti a tu hotel de Ciudad Valles" listaba cinco que no lo
 * hacen. Todo lo de abajo —precios, hora, desayuno— sale de esta lista.
 */
export const TOURS_CV = recogenEnValles(TOURS_DB);
/** Recogen en Valles, pero con el traslado cobrado aparte (la Ruta Surrealista, +$400 por reserva). */
const CON_CARGO = TOURS_CV.filter((t) => cargoVallesDe(t) > 0);
/** Los que no recogen en Valles, para decir qué pasa con ellos en vez de callarlos. */
export const OTROS_CV = TOURS_DB.filter((t) => !TOURS_CV.includes(t));
const SOLO_XILITLA = OTROS_CV.filter((t) => partesRecogida(t, false).valles);
const CV_DESAYUNO = TOURS_CV.filter(incluyeDesayuno);
/** ¿Todos los de la lista salen a la misma hora? Entonces se dice una sola. */
const MISMA_HORA = new Set(TOURS_CV.map((t) => salidaCorta(t))).size === 1 && !!TOURS_CV[0];

const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
const listaEs = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const listaEn = (xs: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(xs);
const nombreEn = (t: Tour) => localizeTour(t, "en").nombreCorto;

export interface ToursVallesContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  breadcrumb: string;
  schemaListName: string;

  heroEyebrow: string;
  heroH1a: string;
  heroH1em: string;
  heroH1b: string;
  heroIntro: string;
  ctaDisponibilidad: string;
  waDisponibilidad: string;

  toursTitulo: string;
  /** "· traslado incluido" / "· transfer included" detrás del precio de cada tarjeta. */
  sufijoPrecio: (t: Tour) => string;
  otrosTitulo: string;
  /** Cómo se llega a un recorrido que no recoge en Valles (frase del catálogo). */
  otroFrase: (t: Tour) => string;

  llegar: { titulo: string; texto: string }[];
  llegarGuia: string;

  tarjetaTitulo: string;

  faqTitulo: string;
  faqs: { q: string; a: string }[];

  ctaTitulo: string;
  ctaTexto: string;
  ctaWhatsapp: string;
  waReservar: string;
  ctaPrecios: string;
}

/**
 * Función y no constante: `t.precio` vale la promo mientras esté viva y el de
 * lista después; una constante de módulo se congelaba al arrancar el servidor
 * y seguía anunciando la promo.
 */
export function getToursValles(locale: Locale): ToursVallesContent {
  const rango = rangoPorPersona(TOURS_CV);
  const n = TOURS_CV.length;
  const todosDesayuno = CV_DESAYUNO.length === n;

  if (locale === "en") {
    const hora = MISMA_HORA ? partesRecogida(TOURS_CV[0], true).hora : null;
    const cargoEn = (t: Tour) => fmtMoney(cargoVallesDe(t), "en");
    return {
      metaTitle: "Tours in Ciudad Valles, Mexico — Daily Departures 2026",
      metaDescription: `Guided tours from Ciudad Valles to Tamul Waterfall, rafting, Micos and Xilitla. We pick you up at your hotel, from ${fmtMoney(rango.min, "en")} per person.`,
      keywords: [
        "ciudad valles tours",
        "tours in ciudad valles",
        "huasteca potosina tours from ciudad valles",
        "tamul waterfall tour ciudad valles",
        "things to do in ciudad valles",
      ],
      ogTitle: "Tours in Ciudad Valles — Daily Departures",
      ogDescription: "The gateway to the Huasteca Potosina: guided tours with pickup at your hotel in Ciudad Valles.",
      ogImageAlt: "Micos Waterfalls, Ciudad Valles — Huasteca Potosina",
      twitterTitle: "Tours in Ciudad Valles — Daily Departures",
      twitterDescription: "Guided tours with pickup at your hotel in Ciudad Valles.",

      breadcrumb: "Tours in Ciudad Valles",
      schemaListName: "Tours departing from Ciudad Valles",

      heroEyebrow: "✦ Daily departures · Hotel pickup · Certified guide",
      heroH1a: "Tours in ",
      heroH1em: "Ciudad Valles",
      heroH1b: ", San Luis Potosí",
      heroIntro: `Ciudad Valles is the gateway to the Huasteca Potosina: every major destination is less than 2 hours from here. The ${n} tours on this page pick you up at your hotel every day${hora ? ` ${hora}` : ""} — all you have to do is be ready${CV_DESAYUNO.length ? ` (${todosDesayuno ? "all of them" : `${CV_DESAYUNO.length} of them`} even include breakfast)` : ""}.`,
      ctaDisponibilidad: "Check availability",
      waDisponibilidad: "Hi! I'm in Ciudad Valles and I'd like information about your tours. What do you have available?",

      toursTitulo: "Tours departing from Ciudad Valles",
      sufijoPrecio: (t) =>
        ` MXN ${etiquetaUnidad(t, true)}${cargoVallesDe(t) > 0 ? ` · transfer from Valles +${cargoEn(t)} per booking` : partesRecogida(t, true).incluyeTraslado ? " · transfer included" : ""}`,
      otrosTitulo: "Other tours, leaving from Xilitla or meeting on site",
      otroFrase: (t) => fraseRecogida(t, true),

      llegar: [
        {
          titulo: "By bus",
          texto: `Direct overnight buses from Mexico City's Terminal del Norte (${enAutobus("cdmx", "valles", true)}). You arrive in Ciudad Valles early and can join a tour that same day.`,
        },
        {
          titulo: "By car",
          texto: `${enAuto("cdmx", "valles", true)} from Mexico City and ${enAuto("monterrey", "valles", true)} from Monterrey. We recommend driving the mountain roads in daylight and using Ciudad Valles as your base.`,
        },
        {
          titulo: "By air",
          texto: `The most convenient airport is Tampico (${enAuto("tampico", "valles", true)} by car). You can also fly into the city of San Luis Potosí.`,
        },
      ],
      llegarGuia: "Full guide: getting here, where to stay and where to eat →",

      tarjetaTitulo: "Coming from Mexico City? Tamul is included in the monthly trip",

      faqTitulo: "Frequently asked questions",
      faqs: [
        {
          q: "Do the tours pick me up at my hotel in Ciudad Valles?",
          a: `Yes — the ${n} tours on this page pick you up at your lodging in Ciudad Valles (and in Xilitla)${hora ? `, every day ${hora}` : ", at each tour's departure time"}${CON_CARGO.length ? `. The transfer is included in all of them except ${listaEn(CON_CARGO.map((t) => `the ${nombreEn(t)}, which costs ${cargoEn(t)} extra per booking (not per person) from Valles`))}` : ", with the transfer included"}.${SOLO_XILITLA.length ? ` ${listaEn(SOLO_XILITLA.map(nombreEn))} pick up only at lodgings in Xilitla: you can do them from Ciudad Valles, but the transfer costs extra and we'll quote it on WhatsApp.` : ""}`,
        },
        {
          q: "Why is Ciudad Valles the best base for the Huasteca?",
          a: "Because it's the region's natural gateway: from here every major destination is less than 2 hours away — Tamul Waterfall, the Micos waterfalls, Tamasopo and Puente de Dios, El Naranjo with Minas Viejas and El Meco, and Xilitla with Las Pozas. It also has the widest choice of hotels, restaurants and services.",
        },
        {
          q: "How do I get to Ciudad Valles?",
          a: `By bus, there are direct overnight departures from Mexico City's Terminal del Norte (${enAutobus("cdmx", "valles", true)}; you arrive early and can take a tour that same day). By car it's ${enAuto("cdmx", "valles", true)} from Mexico City and ${enAuto("monterrey", "valles", true)} from Monterrey. By air, Tampico airport is ${enAuto("tampico", "valles", true)} away by car.`,
        },
        {
          q: "How much does a tour from Ciudad Valles cost?",
          a: `The ${n} day tours with pickup in Ciudad Valles range from ${fmtMoney(rango.min, "en")} to ${fmtMoney(rango.max, "en")} per person. They include pickup from your lodging${CON_CARGO.length ? ` (${listaEn(CON_CARGO.map((t) => `${nombreEn(t)}: ${cargoEn(t)} extra per booking from Valles`))})` : ""}, a certified guide, safety gear and photos of the tour${CV_DESAYUNO.length ? `; ${todosDesayuno ? "all of them" : `${CV_DESAYUNO.length} of them (${listaEn(CV_DESAYUNO.map(nombreEn))})`} also include a regional breakfast` : ""}. Rafting and the Tamul rappel include traveler insurance; on the others it's optional: MXN $80 per person (just ask when you book). Full details of what each one includes are on its own page.`,
        },
        {
          q: "Can I book for tomorrow?",
          a: "Yes, we take bookings up to 24 hours ahead (subject to availability). Message us on WhatsApp and we'll confirm within 1 hour.",
        },
      ],

      ctaTitulo: "Book your tour from Ciudad Valles",
      ctaTexto: "We're NOM-09 certified local guides with our own transport. Message us and confirm your spot in under an hour.",
      ctaWhatsapp: "Book on WhatsApp",
      waReservar: "Hi! I'm in Ciudad Valles and I'd like to book a tour. Do you have space?",
      ctaPrecios: "See full pricing",
    };
  }

  // ── Español: el texto de siempre, sin tocar ────────────────────────────────
  const hora = MISMA_HORA ? partesRecogida(TOURS_CV[0], false).hora : null;
  const cargoEs = (t: Tour) => cargoVallesDe(t).toLocaleString("es-MX");
  return {
    metaTitle: "Tours en Ciudad Valles, SLP — Salidas Diarias 2026",
    metaDescription: `Tours guiados con salida desde Ciudad Valles: Cascada de Tamul, rafting, Micos y Xilitla. Pasamos por ti a tu hotel, desde ${money(rango.min)} MXN por persona.`,
    keywords: [
      "tours ciudad valles",
      "tours ciudad valles san luis potosi",
      "tours huasteca potosina desde ciudad valles",
      "agencia de tours ciudad valles",
      "que hacer en ciudad valles",
    ],
    ogTitle: "Tours en Ciudad Valles — Salidas Diarias",
    ogDescription: "La puerta de entrada a la Huasteca Potosina: tours guiados con pickup en tu hotel de Ciudad Valles.",
    ogImageAlt: "Cascadas de Micos, Ciudad Valles — Huasteca Potosina",
    twitterTitle: "Tours en Ciudad Valles — Salidas Diarias",
    twitterDescription: "Tours guiados con pickup en tu hotel de Ciudad Valles.",

    breadcrumb: "Tours en Ciudad Valles",
    schemaListName: "Tours con salida desde Ciudad Valles",

    heroEyebrow: "✦ Salidas diarias · Pickup en tu hotel · Guía certificado",
    heroH1a: "Tours en ",
    heroH1em: "Ciudad Valles",
    heroH1b: ", San Luis Potosí",
    heroIntro: `Ciudad Valles es la puerta de entrada a la Huasteca Potosina: desde aquí todos los destinos principales están a menos de 2 horas. Los ${n} recorridos de esta página pasan por ti a tu hotel todos los días${hora ? ` ${hora}` : ""} — tú solo preocúpate por estar listo${CV_DESAYUNO.length ? ` (en ${todosDesayuno ? "todos" : `${CV_DESAYUNO.length} de ellos`} hasta el desayuno va incluido)` : ""}.`,
    ctaDisponibilidad: "Consultar disponibilidad",
    waDisponibilidad: "Hola, estoy en Ciudad Valles y quiero información de los tours. ¿Qué tienen disponible?",

    toursTitulo: "Tours con salida desde Ciudad Valles",
    // Decía "· todo incluido" en las siete: dos no llevan desayuno y el rappel
    // no incluye entradas. Lo que sí comparten es el traslado.
    sufijoPrecio: (t) =>
      ` MXN ${etiquetaUnidad(t)}${cargoVallesDe(t) > 0 ? ` · traslado desde Valles +$${cargoEs(t)} por reserva` : partesRecogida(t, false).incluyeTraslado ? " · traslado incluido" : ""}`,
    otrosTitulo: "Otros recorridos, que salen de Xilitla o del destino",
    otroFrase: (t) => fraseRecogida(t, false),

    llegar: [
      {
        titulo: "En autobús",
        texto: `Salidas nocturnas directas desde la Terminal del Norte de CDMX (${enAutobus("cdmx", "valles")}). Llegas temprano a Ciudad Valles y puedes tomar el tour ese mismo día.`,
      },
      {
        titulo: "En auto",
        texto: `${enAuto("cdmx", "valles")} desde CDMX y ${enAuto("monterrey", "valles")} desde Monterrey. Recomendamos manejar de día por la sierra y usar Ciudad Valles como base.`,
      },
      {
        titulo: "En avión",
        texto: `El aeropuerto más práctico es Tampico (${enAuto("tampico", "valles")} en auto). También puedes volar a San Luis Potosí capital.`,
      },
    ],
    llegarGuia: "Guía completa: cómo llegar, dónde dormir y dónde comer →",

    tarjetaTitulo: "¿Sales de la CDMX? Tamul va incluido en el viaje del mes",

    faqTitulo: "Preguntas frecuentes",
    // FAQ local: texto plano reutilizado tal cual en el FAQPage JSON-LD. Las
    // cifras y las listas se leen de TOURS_CV: escritas a mano ya anunciaban
    // "de $900 a $1,950" con recorridos que ni recogen en Valles.
    faqs: [
      {
        q: "¿Los tours pasan por mi hotel en Ciudad Valles?",
        a: `Sí, los ${n} recorridos de esta página pasan por ti a tu hospedaje en Ciudad Valles (también en Xilitla)${hora ? `, todos los días ${hora}` : ", a la hora de salida de cada recorrido"}${CON_CARGO.length ? `. El traslado va incluido en todos menos ${listaEs(CON_CARGO.map((t) => `${t.nombreCorto}, que desde Valles cuesta $${cargoEs(t)} más por reserva (no por persona)`))}` : ", con el traslado incluido"}.${SOLO_XILITLA.length ? ` ${listaEs(SOLO_XILITLA.map((t) => t.nombreCorto))} recogen solo en hospedajes de Xilitla: desde Ciudad Valles se pueden hacer, pero el traslado tiene costo adicional que te cotizamos por WhatsApp.` : ""}`,
      },
      {
        q: "¿Por qué Ciudad Valles es la mejor base para la Huasteca?",
        a: "Porque es la puerta de entrada natural de la región: desde aquí, todos los destinos principales están a menos de 2 horas — la Cascada de Tamul, las cascadas de Micos, Tamasopo y el Puente de Dios, El Naranjo con Minas Viejas y El Meco, y Xilitla con Las Pozas. Además tiene la mayor oferta de hoteles, restaurantes y servicios.",
      },
      {
        q: "¿Cómo llego a Ciudad Valles?",
        a: `En autobús hay salidas nocturnas directas desde la Terminal del Norte de CDMX (${enAutobus("cdmx", "valles")}, llegas temprano y puedes tomar el tour ese mismo día). En auto son ${enAuto("cdmx", "valles")} desde CDMX y ${enAuto("monterrey", "valles")} desde Monterrey. En avión, el aeropuerto de Tampico queda a ${enAuto("tampico", "valles")} en auto.`,
      },
      {
        q: "¿Cuánto cuesta un tour desde Ciudad Valles?",
        a: `Los ${n} tours de un día con recogida en Ciudad Valles van de ${money(rango.min)} a ${money(rango.max)} MXN por persona. Incluyen traslado desde tu hospedaje${CON_CARGO.length ? ` (${listaEs(CON_CARGO.map((t) => `${t.nombreCorto}: $${cargoEs(t)} más por reserva desde Valles`))})` : ""}, guía certificado, equipo de seguridad y las fotos del recorrido${CV_DESAYUNO.length ? `; ${todosDesayuno ? "todos" : `${CV_DESAYUNO.length} de ellos (${listaEs(CV_DESAYUNO.map((t) => t.nombreCorto))})`} llevan además desayuno regional` : ""}. El rafting y el rappel en Tamul incluyen seguro de viajero; en los demás es opcional: $80 por persona (pídelo al reservar). Lo que incluye cada uno, con detalle, está en su ficha.`,
      },
      {
        q: "¿Puedo reservar para mañana?",
        a: "Sí, aceptamos reservas con 24 horas de anticipación (sujeto a disponibilidad). Escríbenos por WhatsApp y te confirmamos en menos de 1 hora.",
      },
    ],

    ctaTitulo: "Reserva tu tour desde Ciudad Valles",
    ctaTexto: "Somos guías locales certificados NOM-09 con transporte propio. Escríbenos y confirma tu lugar en menos de 1 hora.",
    ctaWhatsapp: "Reservar por WhatsApp",
    waReservar: "Hola, estoy en Ciudad Valles y quiero reservar un tour. ¿Tienen lugar?",
    ctaPrecios: "Ver precios completos",
  };
}
