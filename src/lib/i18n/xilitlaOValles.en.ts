import type { Locale } from "./config";
import { TOURS_DB, cargoVallesDe, partesRecogida, recogidaDeTour, type Tour } from "@/lib/tours";
import { rangoPorPersona, recogenEnValles } from "@/lib/catalogoResumen";
import { localizeTour } from "./localize";
import { fmtMoney } from "./format";

/**
 * Textos de /xilitla-o-ciudad-valles y /en/xilitla-o-ciudad-valles (10 nov 2026).
 *
 * El español es el que ya publicaba la página, sin cambiar una coma: solo se
 * mudó aquí para que el inglés lea las MISMAS listas del catálogo y no una
 * copia escrita a mano que se despareje.
 *
 * ⚠️ En inglés todo importe lleva «MXN» (`fmtMoney`).
 */

/**
 * Quién recoge dónde, leído del catálogo.
 *
 * 🔴 La página decía "pasamos por ti a tu hospedaje en las dos ciudades, sin
 * costo extra" de todos los recorridos. Es cierto para los de tipo
 * `hospedaje`; los que recogen solo en Xilitla (Gruta, Amanecer, Olla, Edén,
 * Travesía) cobran aparte el traslado desde Valles, el RZR sale de nuestra base
 * y el buceo es en la laguna. En una comparativa Xilitla/Valles es justo lo que
 * decide dónde dormir.
 */
export const EN_LAS_DOS = recogenEnValles(TOURS_DB);
/** Recogen en las dos, pero desde Valles cobran el traslado (la Ruta Surrealista, $400 por reserva). */
const CON_CARGO = EN_LAS_DOS.filter((t) => cargoVallesDe(t) > 0);
const SOLO_XILITLA = TOURS_DB.filter((t) => partesRecogida(t, false).valles);
const OTROS = TOURS_DB.filter((t) => !EN_LAS_DOS.includes(t) && !SOLO_XILITLA.includes(t));

const listaEs = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const listaEn = (xs: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(xs);
const nombreEn = (t: Tour) => localizeTour(t, "en").nombreCorto;
const cargoTextoEs = (t: Tour) => `$${cargoVallesDe(t).toLocaleString("es-MX")} más por reserva (no por persona)`;
const cargoTextoEn = (t: Tour) => `${fmtMoney(cargoVallesDe(t), "en")} extra per booking (not per person)`;
/** "La Ruta Surrealista" con su artículo y mayúscula: sin él se lee cojo. */
const conArticulo = (t: Tour) => (t.articulo ? `${t.articulo.charAt(0).toUpperCase()}${t.articulo.slice(1)} ` : "");

/**
 * Tiempos desde Ciudad Valles: NO son estimados nuestros, salen del campo
 * `como_llegar` de cada ficha en DESTINOS_DB. Si un dato cambia ahí, cambia
 * aquí. Los de Xilitla solo se declaran donde la ficha lo respalda.
 * Las cifras no se traducen; solo «en el pueblo».
 */
export const COMPARATIVA: { slug: string; desdeValles: string; desdeXilitla: string }[] = [
  { slug: "cascadas-de-micos",            desdeValles: "20 min",      desdeXilitla: "~2 h" },
  { slug: "cascada-de-tamul",             desdeValles: "45 min",      desdeXilitla: "~1 h 15 min" },
  { slug: "puente-de-dios-tamasopo",      desdeValles: "1 h",         desdeXilitla: "~2 h 30 min" },
  { slug: "sotano-de-las-golondrinas",    desdeValles: "1 h 15 min",  desdeXilitla: "~1 h" },
  { slug: "las-pozas-jardin-surrealista", desdeValles: "1 h 45 min",  desdeXilitla: "en el pueblo" },
  { slug: "cascada-los-comales",          desdeValles: "1 h 45 min",  desdeXilitla: "~15 min" },
  { slug: "nacimiento-huichihuayan",      desdeValles: "1 h 20 min",  desdeXilitla: "~40 min" },
];

export interface XilitlaOVallesContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;

  breadcrumb: string;

  heroEyebrow: string;
  /** El H1 en piezas: «¿», Xilitla, « o », Ciudad Valles, «?» (el inglés no abre interrogación). */
  h1Pre: string;
  h1A: string;
  h1Medio: string;
  h1B: string;
  h1Post: string;
  heroIntro: string;

  tablaTitulo: string;
  colDestino: string;
  colValles: string;
  colXilitla: string;
  /** «en el pueblo» → «in town»; las cifras pasan tal cual. */
  tiempo: (s: string) => string;
  tablaNota: string;

  vallesSi: string;
  vallesBullets: string[];
  xilitlaSi: string;
  xilitlaBullets: string[];

  nosotrosTitulo: string;
  nosotrosA: string;
  nosotrosHotel: string;
  nosotrosB: string;
  nosotrosFuerte: string;
  nosotrosC: string;
  /** Párrafo de los que recogen solo en Xilitla y de los que no recogen ("" si no hay). */
  soloXilitla: string;
  btnTours: string;
  btnPaquete: string;
  btnValles: string;

  tarjetaTitulo: string;

  faqTitulo: string;
  faqs: { q: string; a: string }[];
  waTexto: string;
  waBoton: string;
}

export function getXilitlaOValles(locale: Locale): XilitlaOVallesContent {
  const desde = rangoPorPersona().min;
  const nGratis = EN_LAS_DOS.length - CON_CARGO.length;
  const total = TOURS_DB.length;

  if (locale === "en") {
    const otrosEn = OTROS.map((t) => {
      const p = partesRecogida(t, true);
      return recogidaDeTour(t).tipo === "base-xilitla"
        ? ` The ${nombreEn(t)} leaves from ${p.lugar}; transport to Xilitla isn't included.`
        : ` The ${nombreEn(t)} takes place at ${p.lugar}: you make your own way there.`;
    }).join("");
    return {
      metaTitle: "Xilitla or Ciudad Valles? Where to Stay in the Huasteca",
      metaDescription: `Real drive times from each base. Ciudad Valles is best for covering the whole region; Xilitla, if you're coming for Las Pozas. ${EN_LAS_DOS.length} tours pick up in both.`,
      keywords: [
        "xilitla or ciudad valles",
        "where to stay in huasteca potosina",
        "best base for huasteca potosina",
        "xilitla vs ciudad valles",
        "huasteca potosina where to stay",
      ],
      ogTitle: "Xilitla or Ciudad Valles? Where to stay in the Huasteca",
      ogDescription: "Real travel times from each base, and when each one makes sense. No sales pitch.",
      ogImageAlt: "Las Pozas, Xilitla — Huasteca Potosina",

      breadcrumb: "Xilitla or Ciudad Valles",

      heroEyebrow: "✦ An honest comparison · Real travel times",
      h1Pre: "",
      h1A: "Xilitla",
      h1Medio: " or ",
      h1B: "Ciudad Valles",
      h1Post: "?",
      heroIntro:
        "It's the first question almost everyone planning this trip asks, and the honest answer is that it depends on what you're coming for. Here are the real travel times from each base — including when Ciudad Valles is the better choice, even though we're from Xilitla.",

      tablaTitulo: "How long it takes to reach each place",
      colDestino: "Destination",
      colValles: "From Cd. Valles",
      colXilitla: "From Xilitla",
      tiempo: (s) => (s === "en el pueblo" ? "in town" : s),
      tablaNota:
        "Times from Ciudad Valles come from each destination's page. Times from Xilitla are approximate, on mountain roads, and can vary with the weather.",

      vallesSi: "Stay in Ciudad Valles if…",
      vallesBullets: [
        "· You're coming for the waterfalls and want to see as many as possible in 3 days.",
        "· You're short on time: Micos, Tamul and Tamasopo are all less than an hour away.",
        "· You're flying into Tampico or arriving by bus, and want the widest choice of hotels and restaurants.",
      ],
      xilitlaSi: "Stay in Xilitla if…",
      xilitlaBullets: [
        `· You're mainly coming for Edward James' Las Pozas: the garden is in town${CON_CARGO[0] ? ` and the ${nombreEn(CON_CARGO[0])} picks you up at no extra cost; from Valles it's ${fmtMoney(cargoVallesDe(CON_CARGO[0]), "en")} extra per booking.` : "."}`,
        "· You want the Pueblo Mágico, the mountain-grown coffee and the sierra, not just the waterfalls.",
        "· You'd rather stay somewhere with character than in a city hotel.",
      ],

      nosotrosTitulo: "With us you don't have to choose",
      nosotrosA: "We're from Xilitla, where we have our own hotel, the",
      nosotrosHotel: "Paraíso Encantado",
      nosotrosB: `, and our restaurant — but on ${nGratis} of our ${total} tours`,
      nosotrosFuerte: "we pick you up at your lodging in either town",
      nosotrosC:
        ", at no extra cost. If you stay in Ciudad Valles, we pick you up there. If you stay with us in Xilitla, you leave for the tour from the front door." +
        CON_CARGO.map((t) => ` The ${nombreEn(t)} also picks you up in Ciudad Valles, for ${cargoTextoEn(t)}.`).join(""),
      soloXilitla: SOLO_XILITLA.length
        ? `${listaEn(SOLO_XILITLA.map(nombreEn))} pick up only at lodgings in Xilitla: if you stay in Ciudad Valles you can still do them, but the transfer from Valles costs extra and we'll quote it on WhatsApp.${otrosEn}`
        : "",
      btnTours: `See all ${total} tours · from ${fmtMoney(desde, "en")}`,
      btnPaquete: "Package with lodging in Xilitla",
      btnValles: "Tours from Ciudad Valles",

      tarjetaTitulo: "Coming from Mexico City? The monthly trip stays in Xilitla and takes you to Tamul",

      faqTitulo: "Frequently asked questions",
      faqs: [
        {
          q: "Xilitla or Ciudad Valles: which is better?",
          a: "It depends on what you're coming for. If you want to cover as many waterfalls as possible in a few days, Ciudad Valles wins: Micos is 20 minutes away, Tamul 45 and Puente de Dios an hour. If you're mainly coming for Edward James' Las Pozas and the Pueblo Mágico, Xilitla saves you almost two hours of driving a day, because the garden is in town.",
        },
        {
          q: "Can I stay in Xilitla and still do the Tamul tour?",
          a: "Yes. We pick you up at your lodging in either Xilitla or Ciudad Valles at no extra cost. From Xilitla, Tamul is a little over an hour away.",
        },
        ...CON_CARGO.map((t) => ({
          q: `Can I do the ${nombreEn(t)} if I'm staying in Ciudad Valles?`,
          a: `Yes. We pick you up at your lodging in Ciudad Valles, but from there the transfer costs ${cargoTextoEn(t)}; from Xilitla it's included. Las Pozas is 1 h 45 min from Valles, and right in town if you stay in Xilitla.`,
        })),
        {
          q: "How many days do I need for the Huasteca Potosina?",
          a: "With 3 days you have time for three full tours if you stay at a single base. With 4 or 5 you can combine the Xilitla side (Las Pozas, Comales, Huichihuayán) with the Valles side (Tamul, Micos, Tamasopo) without extra driving.",
        },
        {
          q: "Is the road between Xilitla and Ciudad Valles difficult?",
          a: "It's about 100 km (around 60 miles) of mountain road on Highway 120, with constant curves. Driving in daylight is recommended. On the tours that pick you up in both towns you don't have to drive it: the transfer is included.",
        },
      ],
      waTexto: "Hi! I'm deciding whether to stay in Xilitla or Ciudad Valles. Can you help?",
      waBoton: "Ask us on WhatsApp",
    };
  }

  // ── Español: el texto de siempre ───────────────────────────────────────────
  const otrosEs = OTROS.map((t) => {
    const p = partesRecogida(t, false);
    return recogidaDeTour(t).tipo === "base-xilitla"
      ? ` ${conArticulo(t)}${t.nombreCorto} sale de ${p.lugar}; el transporte hasta Xilitla no va incluido.`
      : ` ${conArticulo(t)}${t.nombreCorto} es en ${p.lugar}: llegas por tu cuenta.`;
  }).join("");
  return {
    // ≤60: con el "2026" salía de 62 y Google lo cortaba.
    metaTitle: "¿Xilitla o Ciudad Valles? Dónde Hospedarte en la Huasteca",
    metaDescription: `Tiempos reales desde cada base. Ciudad Valles conviene para cubrir toda la región; Xilitla, si vienes por Las Pozas. ${EN_LAS_DOS.length} tours recogen en las dos.`,
    keywords: [
      "xilitla o ciudad valles",
      "donde hospedarse huasteca potosina",
      "mejor base huasteca potosina",
      "xilitla vs ciudad valles",
      "donde quedarse huasteca potosina",
    ],
    ogTitle: "¿Xilitla o Ciudad Valles? Dónde hospedarte en la Huasteca",
    ogDescription: "Los tiempos reales de traslado desde cada base, y cuándo conviene cada una. Sin vendértela.",
    ogImageAlt: "Las Pozas, Xilitla — Huasteca Potosina",

    breadcrumb: "Xilitla o Ciudad Valles",

    heroEyebrow: "✦ Comparación honesta · Tiempos reales de traslado",
    h1Pre: "¿",
    h1A: "Xilitla",
    h1Medio: " o ",
    h1B: "Ciudad Valles",
    h1Post: "?",
    heroIntro:
      "Es la primera duda de casi todo el que planea este viaje, y la respuesta honesta es que depende de a qué vengas. Aquí están los tiempos reales desde cada base — incluyendo cuándo Ciudad Valles es la mejor opción, aunque nosotros seamos de Xilitla.",

    tablaTitulo: "Cuánto tardas en llegar a cada lugar",
    colDestino: "Destino",
    colValles: "Desde Cd. Valles",
    colXilitla: "Desde Xilitla",
    tiempo: (s) => s,
    tablaNota:
      "Los tiempos desde Ciudad Valles vienen de la ficha de cada destino. Los de Xilitla son aproximados por carretera de sierra y pueden variar con el clima.",

    vallesSi: "Quédate en Ciudad Valles si…",
    vallesBullets: [
      "· Vienes por las cascadas y quieres ver el mayor número posible en 3 días.",
      "· Tienes poco tiempo: Micos, Tamul y Tamasopo están todos a menos de una hora.",
      "· Llegas en avión por Tampico o en autobús, y quieres la mayor oferta de hoteles y restaurantes.",
    ],
    xilitlaSi: "Quédate en Xilitla si…",
    xilitlaBullets: [
      `· Vienes principalmente por Las Pozas de Edward James: el jardín está en el pueblo${CON_CARGO[0] ? ` y la ${CON_CARGO[0].nombreCorto} pasa por ti sin costo; desde Valles son $${cargoVallesDe(CON_CARGO[0]).toLocaleString("es-MX")} más por reserva.` : "."}`,
      "· Quieres el Pueblo Mágico, el café de altura y la sierra, no solo las cascadas.",
      "· Prefieres hospedaje con carácter a la oferta de ciudad.",
    ],

    nosotrosTitulo: "Con nosotros no tienes que elegir",
    // SEO-10 (19 oct 2026): el hotel se nombra y enlaza a su sitio, con www y
    // sin nofollow; antes era «nuestro hotel» a secas.
    nosotrosA: "Somos de Xilitla y aquí tenemos nuestro hotel, el",
    nosotrosHotel: "Paraíso Encantado",
    nosotrosB: `, y nuestro restaurante, pero en ${nGratis} de nuestros ${total} recorridos`,
    nosotrosFuerte: "pasamos por ti a tu hospedaje en las dos ciudades",
    nosotrosC:
      ", sin costo extra. Si te quedas en Ciudad Valles, te recogemos ahí. Si te quedas con nosotros en Xilitla, sales al tour desde la puerta." +
      CON_CARGO.map((t) => ` ${conArticulo(t)}${t.nombreCorto} también pasa por ti en Ciudad Valles, con ${cargoTextoEs(t)}.`).join(""),
    soloXilitla: SOLO_XILITLA.length
      ? `${listaEs(SOLO_XILITLA.map((t) => t.nombreCorto))} recogen solo en hospedajes de Xilitla: si duermes en Ciudad Valles se pueden hacer, pero el traslado desde Valles tiene costo adicional que te cotizamos por WhatsApp.${otrosEs}`
      : "",
    btnTours: `Ver los ${total} tours · desde $${desde.toLocaleString("es-MX")}`,
    btnPaquete: "Paquete con hospedaje en Xilitla",
    btnValles: "Tours desde Ciudad Valles",

    tarjetaTitulo: "¿Sales de la CDMX? El viaje del mes duerme en Xilitla y te lleva a Tamul",

    faqTitulo: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Xilitla o Ciudad Valles: cuál conviene más?",
        a: "Depende de a qué vengas. Si quieres cubrir la mayor cantidad de cascadas en pocos días, Ciudad Valles gana: Micos queda a 20 minutos, Tamul a 45 y el Puente de Dios a una hora. Si vienes principalmente por Las Pozas de Edward James y el Pueblo Mágico, Xilitla te ahorra casi dos horas de carretera al día, porque el jardín está en el pueblo.",
      },
      {
        q: "¿Puedo quedarme en Xilitla y aun así hacer el tour a Tamul?",
        a: "Sí. Pasamos por ti a tu hospedaje tanto en Xilitla como en Ciudad Valles, sin costo extra. Desde Xilitla, Tamul queda a poco más de una hora.",
      },
      ...CON_CARGO.map((t) => ({
        q: `¿Puedo hacer la ${t.nombreCorto} si me quedo en Ciudad Valles?`,
        a: `Sí. Pasamos por ti a tu hospedaje en Ciudad Valles, pero desde ahí el traslado cuesta ${cargoTextoEs(t)}; desde Xilitla va incluido. Las Pozas queda a 1 h 45 min de Valles y en el pueblo si duermes en Xilitla.`,
      })),
      {
        q: "¿Cuántos días necesito para la Huasteca Potosina?",
        a: "Con 3 días alcanzas para tres recorridos completos si te quedas en una sola base. Con 4 o 5 puedes combinar el lado de Xilitla (Las Pozas, Comales, Huichihuayán) con el lado de Valles (Tamul, Micos, Tamasopo) sin manejar de más.",
      },
      {
        q: "¿La carretera entre Xilitla y Ciudad Valles es difícil?",
        a: "Son unos 100 km de carretera de sierra por la 120, con curvas continuas. Se recomienda manejar de día. En los tours que pasan por ti en las dos ciudades no tienes que manejarla: el traslado va incluido.",
      },
    ],
    waTexto: "Hola, estoy decidiendo entre hospedarme en Xilitla o en Ciudad Valles. ¿Me ayudan?",
    waBoton: "Pregúntanos por WhatsApp",
  };
}
