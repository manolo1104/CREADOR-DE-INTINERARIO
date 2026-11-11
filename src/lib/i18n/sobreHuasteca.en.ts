import type { Locale } from "./config";
import { DESTINOS_DB } from "@/lib/destinos";
import { GRUPO_MAX, TOURS_DB, partesRecogida } from "@/lib/tours";
import { TIEMPOS_DE_VIAJE, enAuto, enAutobus } from "@/lib/tiemposDeViaje";
import { fechaInicioTexto } from "@/lib/temporada";

/**
 * Textos de /sobre-la-huasteca-potosina y /en/sobre-la-huasteca-potosina.
 *
 * 🔴 10 nov 2026 — Search Console: ~6,900 impresiones en 90 días de «dónde
 * está / dónde queda / dónde es la huasteca potosina» en el puesto ~9 con ~10
 * clics. La página tenía 655 palabras, ningún FAQPage y el MISMO H1 que el
 * inicio («La Huasteca Potosina»). Cambios:
 *  · H1 propio que responde la búsqueda: «¿Dónde está la Huasteca Potosina?».
 *  · Bloque de respuesta directa arriba: estado, municipios y tiempos de
 *    carretera (de `tiemposDeViaje.ts`, la única fuente), más el mapa de la
 *    región que ya usa el inicio (`MapaRegion`).
 *  · Preguntas frecuentes con su FAQPage.
 *  · El título se queda cerca del de antes (rankeaba en el 7.3).
 * La geografía, la historia y la gastronomía se quedan tal cual: rankean.
 *
 * Correcciones de paso (anotadas para Manolo):
 *  · «franja nororiental» → «franja oriental»: la Huasteca está en el ORIENTE
 *    del estado (el norte es el Altiplano). La respuesta nueva dice «oriente»
 *    y la sección de geografía no podía decir otra cosa dos pantallas abajo.
 *  · La tarjeta «Avión» decía «Vuelos a Ciudad Valles (CVM)… desde CVM son
 *    ~40 min»: CVM es el código de Ciudad Victoria y todo el resto del sitio
 *    (info práctica, paquetes, /desde/*) da Tampico como el aeropuerto más
 *    práctico. Ahora dice eso, con los tiempos de `tiemposDeViaje.ts`.
 *  · El cierre prometía «transporte, desayuno… incluido» en todos los tours:
 *    solo algunos llevan desayuno y el RZR no lleva transporte (el mismo error
 *    que ya se corrigió en `catalogoResumen.ts`). Ahora cuenta del catálogo.
 *
 * En inglés NO se repiten dos afirmaciones del texto español que nadie ha
 * podido respaldar (quedan en la lista para Manolo): que el huapango esté
 * declarado Patrimonio por la UNESCO y el nombre «charanda potosina».
 * Tampoco «el abismo aéreo más profundo del mundo» del Sótano de las
 * Golondrinas: en inglés dice «uno de los más grandes», como /en/preguntas-frecuentes.
 */

/**
 * Los municipios que nombra la página, leídos de `zona` en DESTINOS_DB (donde
 * están los lugares que visitamos), no de una lista escrita a mano: un destino
 * nuevo en otro municipio entra solo.
 *
 * 🔴 Fuera Rioverde: es de la Zona Media del estado, no de la Huasteca (la
 * Media Luna es el único destino del catálogo fuera de la región).
 */
const FUERA_DE_LA_HUASTECA = new Set(["Rioverde"]);
const MUNICIPIOS = Array.from(new Set(DESTINOS_DB.map((d) => d.zona)))
  .filter((z) => !FUERA_DE_LA_HUASTECA.has(z))
  .sort((a, b) => a.localeCompare(b, "es"));

/** Cuántos recorridos pasan por ti a tu hospedaje (el resto sale de nuestra base o es en sitio). */
const CON_RECOGIDA = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado);

const listaEs = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const listaEn = (xs: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(xs);

export interface SobreFaq {
  q: string;
  a: string;
  /** Enlace que se pinta debajo de la respuesta (no va al JSON-LD). Ruta ya localizada. */
  link?: { href: string; label: string };
}

export interface SobreContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  articleHeadline: string;
  articleDescription: string;
  inLanguage: string;
  breadcrumb: string;

  heroAlt: string;
  heroEyebrow: string;
  heroH1: string;
  heroH1em: string;
  heroIntro: string;

  /** Seis datos rápidos, en el orden de los iconos de la página. */
  datos: { label: string; valor: string }[];

  dondeEyebrow: string;
  dondeTitulo: string;
  dondeRespuesta: string;
  municipiosTitulo: string;
  municipiosTexto: string;
  tiemposTitulo: string;
  tiemposCols: [string, string, string];
  tiempos: { ciudad: string; valles: string; xilitla: string }[];
  tiemposBus: string;
  basePre: string;
  baseLink: string;

  secciones: { titulo: string; texto: string }[];

  destinosEyebrow: string;
  destinosH2a: string;
  destinosH2em: string;
  destinosIcono: { nombre: string; desc: string; img: string }[];
  destinosBtn: string;

  llegarH2a: string;
  llegarH2em: string;
  llegarH2b: string;
  llegar: { medio: string; detalle: string }[];
  llegarBtn: string;

  faqTitulo: string;
  faqs: SobreFaq[];

  tarjetaOrigen: string;

  ctaEyebrow: string;
  ctaH2a: string;
  ctaH2em: string;
  ctaTexto: string;
  ctaReservar: string;
  ctaTours: string;
}

export function getSobreHuasteca(locale: Locale): SobreContent {
  return locale === "en" ? contenidoEn() : contenidoEs();
}

function contenidoEs(): SobreContent {
  const municipios = listaEs(MUNICIPIOS);
  return {
    // ≤60 y cerca del de antes («Sobre la Huasteca Potosina — Historia, Cultura
    // y Geografía», puesto 7.3), pero abriendo con lo que se busca.
    metaTitle: "Huasteca Potosina: dónde está, historia y cultura",
    metaDescription:
      "¿Dónde está la Huasteca Potosina? En el oriente de San Luis Potosí, México. Sus municipios, cómo llegar desde CDMX y Monterrey, historia teenek y clima.",
    keywords: [
      "huasteca potosina",
      "dónde está la huasteca potosina",
      "dónde queda la huasteca potosina",
      "huasteca potosina mapa",
      "municipios de la huasteca potosina",
      "qué es la huasteca potosina",
      "cultura teenek",
      "clima huasteca potosina",
      "historia de la huasteca",
    ],
    ogTitle: "¿Dónde está la Huasteca Potosina? Historia y cultura",
    ogDescription:
      "Dónde queda la Huasteca Potosina, sus municipios y cómo llegar, más su geografía, historia teenek y gastronomía, en San Luis Potosí.",
    ogImageAlt: "Cascada de Tamul — Huasteca Potosina",
    twitterTitle: "Huasteca Potosina: dónde está, historia y cultura",
    twitterDescription: "Dónde queda, cómo llegar, historia teenek y gastronomía de la Huasteca Potosina.",

    articleHeadline: "Huasteca Potosina: dónde está, historia y cultura",
    articleDescription:
      "Dónde está la Huasteca Potosina y cómo llegar, más su geografía, clima, cultura Teenek, gastronomía, historia y mejores épocas para visitarla, en San Luis Potosí, México.",
    inLanguage: "es-MX",
    breadcrumb: "Sobre la Huasteca Potosina",

    heroAlt: "Huasteca Potosina — Cascada de Tamul",
    heroEyebrow: "✦ San Luis Potosí · México",
    heroH1: "¿Dónde está la Huasteca Potosina?",
    heroH1em: "Región, mapa y cómo llegar",
    heroIntro:
      "Una región donde la selva, las cascadas turquesas y una cultura milenaria conviven en uno de los paisajes más extraordinarios de México.",

    datos: [
      { label: "Ubicación", valor: "San Luis Potosí, México" },
      { label: "Altitud", valor: "50 – 2,000 msnm" },
      { label: "Temperatura", valor: "22 – 34°C promedio" },
      // La regla de temporada.ts y del inicio: del 30 de octubre a mayo el agua
      // baja clara. Decía «Nov – Mayo», con otra fecha. No se acorta a «a
      // diciembre» aunque esa sea la ventana de la banda del inicio: en una ficha
      // de la región daría a entender que de enero a mayo no conviene, y es justo
      // cuando el turquesa está más intenso.
      { label: "Mejor época", valor: `Del ${fechaInicioTexto("es")} a mayo` },
      { label: "Idiomas", valor: "Español · Teenek (Huasteco)" },
      { label: "Ríos", valor: "Tampaón, Axtla, Gallinas, Moctezuma" },
    ],

    dondeEyebrow: "La respuesta corta",
    dondeTitulo: "Dónde queda: estado, municipios y distancias",
    dondeRespuesta: `La Huasteca Potosina está en el oriente del estado de San Luis Potosí, en México: es la franja donde la Sierra Madre Oriental baja hacia la llanura costera. Su puerta de entrada es Ciudad Valles (${enAuto("cdmx", "valles")} en auto desde la Ciudad de México) y su pueblo más conocido es Xilitla, en la sierra, donde está el jardín surrealista de Las Pozas.`,
    municipiosTitulo: "Municipios",
    municipiosTexto: `Entre sus municipios están ${municipios}: los que tienen destinos en este sitio.`,
    tiemposTitulo: "Cuánto se hace en auto",
    tiemposCols: ["Desde", "A Ciudad Valles", "A Xilitla"],
    tiempos: TIEMPOS_DE_VIAJE.map((t) => ({ ciudad: t.ciudad, valles: t.autoValles, xilitla: t.autoXilitla })),
    tiemposBus: `En autobús: ${enAutobus("cdmx", "valles")} de la CDMX a Ciudad Valles y ${enAutobus("cdmx", "xilitla")} a Xilitla; ${enAutobus("monterrey", "valles")} de Monterrey a Ciudad Valles.`,
    basePre: "¿Dónde conviene dormir? Lo comparamos con los tiempos reales desde cada base en",
    baseLink: "¿Xilitla o Ciudad Valles?",

    // Tal cual estaba (rankea). Solo «nororiental» → «oriental»: ver la nota de arriba.
    secciones: [
      {
        titulo: "Geografía y naturaleza",
        texto: `La Huasteca Potosina ocupa la franja oriental del estado de San Luis Potosí,
    donde la Sierra Madre Oriental desciende abruptamente hacia la llanura costera. Este desnivel
    geográfico crea uno de los paisajes más dramáticos de México: ríos que corren turquesas sobre
    lecho de roca caliza, cañones profundos tallados por millones de años de erosión, y selvas
    tropicales que albergan cientos de especies endémicas.

    El sistema kárstico de la región produce fenómenos únicos: sótanos verticales que cortan la
    tierra por cientos de metros, manantiales de agua cristalina que emergen de la roca, y cuevas
    con formaciones geológicas milenarias. La biodiversidad es extraordinaria — más de 3,000 especies
    de plantas y cientos de aves registradas en un territorio relativamente pequeño.`,
      },
      {
        titulo: "Historia y cultura Teenek",
        texto: `La Huasteca ha sido habitada por más de 3,000 años. La cultura Teenek (también llamada
    Huasteca) desarrolló aquí una de las civilizaciones mesoamericanas más sofisticadas, con
    arquitectura monumental visible en la zona arqueológica de Tamtoc, considerada uno de los
    centros ceremoniales más importantes del México prehispánico.

    Los Teenek resistieron la conquista española más que muchos otros pueblos, y su cultura
    permanece viva hoy: el huapango huasteco está declarado Patrimonio Cultural Inmaterial por
    la UNESCO, y las artesanías bordadas a mano conservan diseños que datan de siglos antes
    de la colonización. La gastronomía local — el zacahuil, los bocoles, las enchiladas huastecas
    — es igualmente antigua e incomparable.`,
      },
      {
        titulo: "Gastronomía",
        texto: `La cocina huasteca es una de las más distintivas de México. El zacahuil es su pieza
    maestra: un tamal gigante de hasta 3 metros de largo cocido en hoyo de tierra durante toda
    la noche de los sábados. Los bocoles son tortillas gruesas de masa con frijol negro integrado,
    fritas en comal. Las enchiladas huastecas llevan cecina de res y queso fresco local.

    El café de altura cultivado en las faldas de la sierra de Xilitla es excepcional — orgánico,
    de sombra, con notas de chocolate y frutos rojos. El aguardiente de caña artesanal de la
    región, conocido como "charanda potosina", acompaña las fiestas patronales de cada comunidad.`,
      },
    ],

    destinosEyebrow: "Lugares imperdibles",
    destinosH2a: "Destinos ",
    destinosH2em: "icónicos",
    destinosIcono: [
      { nombre: "Cascada de Tamul",           desc: "La cascada más alta de la región, 105 metros sobre el Río Tampaón.",    img: "/imagenes/cascada-de-tamul/hero.jpg" },
      { nombre: "Las Pozas de Edward James",  desc: "Jardín surrealista único en el mundo construido en la selva de Xilitla.", img: "/imagenes/las-pozas-jardin-surrealista/hero.webp" },
      { nombre: "Sótano de las Golondrinas",  desc: "El abismo aéreo más profundo del mundo. Hogar de miles de vencejos.",    img: "/imagenes/sotano-de-las-golondrinas/hero.jpg" },
      { nombre: "Cascadas de Micos",          desc: "7 cascadas escalonadas en un paraje de selva tropical exuberante.",      img: "/imagenes/cascadas-de-micos/hero.jpg" },
    ],
    destinosBtn: "Ver todos los destinos →",

    llegarH2a: "¿Cómo llegar a la ",
    llegarH2em: "Huasteca Potosina",
    llegarH2b: "?",
    llegar: [
      // Decía «Vuelos a Ciudad Valles (CVM)…»: ver la nota de arriba.
      { medio: "Avión", detalle: `El aeropuerto más práctico es Tampico (TAM), a ${enAuto("tampico", "valles")} de Ciudad Valles en auto. También puedes volar a San Luis Potosí capital (${enAuto("san-luis-potosi", "valles")} a Valles).` },
      { medio: "Autobús", detalle: `ADO y Ómnibus de México desde CDMX, Monterrey y SLP. Ciudad Valles en ${enAutobus("cdmx", "valles")} desde CDMX.` },
      { medio: "Auto",   detalle: `Desde CDMX por la carretera 85D: ${enAuto("cdmx", "valles")} por autopista. Recomendamos llegar de día.` },
    ],
    llegarBtn: "Guía completa de información práctica →",

    faqTitulo: "Preguntas frecuentes sobre la Huasteca Potosina",
    faqs: [
      {
        q: "¿Dónde está la Huasteca Potosina?",
        a: `En el oriente del estado de San Luis Potosí, en México, donde la Sierra Madre Oriental baja hacia la llanura costera. Su puerta de entrada es Ciudad Valles y su pueblo más conocido es Xilitla, en la sierra. Desde la Ciudad de México son ${enAuto("cdmx", "valles")} en auto hasta Ciudad Valles.`,
      },
      {
        q: "¿En qué estado está la Huasteca Potosina?",
        a: `En San Luis Potosí: «potosina» quiere decir justo eso, la parte de la Huasteca que queda en ese estado. Entre sus municipios están ${municipios}.`,
      },
      {
        q: "¿Cuál es el aeropuerto más cercano a la Huasteca Potosina?",
        a: `El más práctico es el de Tampico (TAM): ${enAuto("tampico", "valles")} en auto hasta Ciudad Valles y ${enAuto("tampico")} hasta Xilitla. La otra opción es volar a la ciudad de San Luis Potosí, a ${enAuto("san-luis-potosi", "valles")} de Ciudad Valles. Desde el aeropuerto conviene rentar auto o pedir un transfer privado.`,
      },
      {
        q: "¿Cómo llegar a la Huasteca Potosina desde la CDMX?",
        a: `En auto son ${enAuto("cdmx", "valles")} hasta Ciudad Valles y ${enAuto("cdmx")} hasta Xilitla. En autobús, ${enAutobus("cdmx", "valles")} hasta Ciudad Valles (hay corridas nocturnas desde la Terminal del Norte) y ${enAutobus("cdmx", "xilitla")} hasta Xilitla. Y cada mes sale un viaje en grupo desde la CDMX con transporte, hotel, desayunos, Las Pozas y Tamul incluidos.`,
      },
      {
        q: "¿Conviene hospedarse en Xilitla o en Ciudad Valles?",
        a: "Depende de a qué vengas. Ciudad Valles queda más cerca de Micos, Tamul y Tamasopo y tiene más oferta de hoteles; Xilitla es Pueblo Mágico, está en la sierra y tiene Las Pozas en el pueblo. Lo comparamos con los tiempos de traslado desde cada base.",
        link: { href: "/xilitla-o-ciudad-valles", label: "¿Xilitla o Ciudad Valles? Dónde hospedarte →" },
      },
      {
        q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
        a: `Del ${fechaInicioTexto("es")} a mayo, cuando el agua baja clara. De marzo a mayo el turquesa está en su punto más intenso, pero es cuando más gente hay (Semana Santa se llena). De julio a octubre es temporada de lluvias: las cascadas van a todo caudal y la selva está más verde, pero el agua puede bajar con sedimento.`,
        link: { href: "/blog/mejor-epoca-para-visitar-la-huasteca-potosina", label: "La mejor época para visitar la Huasteca, mes por mes →" },
      },
    ],

    tarjetaOrigen: "sobre-la-huasteca",

    ctaEyebrow: "Listo para explorar",
    ctaH2a: "Empieza tu aventura en la ",
    ctaH2em: "Huasteca",
    // Decía «con transporte, desayuno… incluido» de todos: ver la nota de arriba.
    ctaTexto: `Tours guiados con guía certificado y seguro de viaje incluidos; ${CON_RECOGIDA.length} de nuestros ${TOURS_DB.length} recorridos pasan por ti a tu hospedaje. Grupos máximo ${GRUPO_MAX} personas — si son más, habla con el equipo y armamos una salida privada.`,
    ctaReservar: "Ver recorridos y reservar",
    ctaTours: "Conocer los tours a fondo →",
  };
}

function contenidoEn(): SobreContent {
  const municipios = listaEn(MUNICIPIOS);
  return {
    metaTitle: "Huasteca Potosina: Where It Is, History & Culture",
    metaDescription:
      "Where is Huasteca Potosina? In eastern San Luis Potosí, Mexico. Its towns, drive times from Mexico City and Monterrey, Teenek history and climate.",
    keywords: [
      "huasteca potosina",
      "where is huasteca potosina",
      "huasteca potosina map",
      "huasteca potosina mexico",
      "how to get to huasteca potosina",
      "teenek culture",
      "huasteca potosina weather",
    ],
    ogTitle: "Where is Huasteca Potosina? History and culture",
    ogDescription:
      "Where Huasteca Potosina is, its towns and how to get there, plus its geography, Teenek history and food, in San Luis Potosí, Mexico.",
    ogImageAlt: "Tamul Waterfall — Huasteca Potosina",
    twitterTitle: "Huasteca Potosina: Where It Is, History & Culture",
    twitterDescription: "Where it is, how to get there, Teenek history and the food of Huasteca Potosina.",

    articleHeadline: "Huasteca Potosina: Where It Is, History & Culture",
    articleDescription:
      "Where Huasteca Potosina is and how to get there, plus its geography, climate, Teenek culture, food, history and the best time to visit, in San Luis Potosí, Mexico.",
    inLanguage: "en",
    breadcrumb: "About Huasteca Potosina",

    heroAlt: "Huasteca Potosina — Tamul Waterfall",
    heroEyebrow: "✦ San Luis Potosí · Mexico",
    heroH1: "Where is Huasteca Potosina?",
    heroH1em: "Region, map and getting there",
    heroIntro:
      "A region where jungle, turquoise waterfalls and an ancient culture share one of the most extraordinary landscapes in Mexico.",

    datos: [
      { label: "Location", valor: "San Luis Potosí, Mexico" },
      { label: "Altitude", valor: "50 – 2,000 m (164 – 6,562 ft)" },
      { label: "Temperature", valor: "22 – 34°C average (72 – 93°F)" },
      { label: "Best time", valor: `${fechaInicioTexto("en")} to May` },
      { label: "Languages", valor: "Spanish · Teenek (Huastec)" },
      { label: "Rivers", valor: "Tampaón, Axtla, Gallinas, Moctezuma" },
    ],

    dondeEyebrow: "The short answer",
    dondeTitulo: "Where it is: state, towns and distances",
    dondeRespuesta: `Huasteca Potosina is in the east of the state of San Luis Potosí, in Mexico: the strip where the Sierra Madre Oriental drops down toward the coastal plain. Its gateway is Ciudad Valles (${enAuto("cdmx", "valles", true)} by car from Mexico City) and its best-known town is Xilitla, up in the mountains, home to the Las Pozas surrealist garden.`,
    municipiosTitulo: "Municipalities",
    municipiosTexto: `Its municipalities include ${municipios}: the ones with destinations on this site.`,
    tiemposTitulo: "Driving times",
    tiemposCols: ["From", "To Ciudad Valles", "To Xilitla"],
    tiempos: TIEMPOS_DE_VIAJE.map((t) => ({ ciudad: t.ciudadEn, valles: t.autoVallesEn, xilitla: t.autoXilitlaEn })),
    tiemposBus: `By bus: ${enAutobus("cdmx", "valles", true)} from Mexico City to Ciudad Valles and ${enAutobus("cdmx", "xilitla", true)} to Xilitla; ${enAutobus("monterrey", "valles", true)} from Monterrey to Ciudad Valles.`,
    basePre: "Where should you stay? We compare both bases with real travel times in",
    baseLink: "Xilitla or Ciudad Valles?",

    secciones: [
      {
        titulo: "Geography and nature",
        texto:
          "Huasteca Potosina occupies the eastern strip of the state of San Luis Potosí, where the Sierra Madre Oriental drops sharply toward the coastal plain. That change in elevation creates one of the most dramatic landscapes in Mexico: rivers running turquoise over limestone beds, deep canyons carved by millions of years of erosion, and tropical forests that are home to hundreds of endemic species." +
          "\n\n" +
          "The region's karst system produces unique phenomena: vertical sinkholes that cut hundreds of meters into the earth, crystal-clear springs that rise out of the rock, and caves with ancient geological formations. The biodiversity is extraordinary — more than 3,000 plant species and hundreds of bird species recorded in a relatively small area.",
      },
      {
        titulo: "History and Teenek culture",
        texto:
          "The Huasteca has been inhabited for more than 3,000 years. The Teenek culture (also called Huastec) developed one of the most sophisticated civilizations in Mesoamerica here, with monumental architecture you can still see at the Tamtoc archaeological site, considered one of the most important ceremonial centers of pre-Hispanic Mexico." +
          "\n\n" +
          "The Teenek resisted the Spanish conquest longer than many other peoples, and their culture is still alive today: hand-embroidered crafts keep designs that date back centuries before colonization. The local food — zacahuil, bocoles, enchiladas huastecas — is just as old and just as unique.",
      },
      {
        titulo: "Food",
        texto:
          "Huastec cooking is one of the most distinctive in Mexico. Zacahuil is its masterpiece: a giant tamale up to 3 meters (10 ft) long, cooked overnight in an earth pit on Saturdays. Bocoles are thick masa cakes with black beans worked into the dough, cooked on a comal. Enchiladas huastecas come with cecina (salt-dried beef) and fresh local cheese." +
          "\n\n" +
          "The high-altitude coffee grown on the slopes of the Xilitla sierra is exceptional — organic, shade-grown, with notes of chocolate and red berries. The region's artisanal sugarcane spirit (aguardiente) accompanies every community's patron-saint festivals.",
      },
    ],

    destinosEyebrow: "Must-see places",
    destinosH2a: "Iconic ",
    destinosH2em: "destinations",
    destinosIcono: [
      { nombre: "Tamul Waterfall",                            desc: "The tallest waterfall in the region: 344 ft (105 m) over the Tampaón River.", img: "/imagenes/cascada-de-tamul/hero.jpg" },
      { nombre: "Las Pozas by Edward James",                  desc: "A one-of-a-kind surrealist garden built in the Xilitla jungle.",               img: "/imagenes/las-pozas-jardin-surrealista/hero.webp" },
      { nombre: "Sótano de las Golondrinas (Cave of Swallows)", desc: "One of the largest open-air pit caves in the world, home to thousands of swifts.", img: "/imagenes/sotano-de-las-golondrinas/hero.jpg" },
      { nombre: "Micos Waterfalls",                           desc: "Seven stepped waterfalls in lush tropical jungle.",                              img: "/imagenes/cascadas-de-micos/hero.jpg" },
    ],
    destinosBtn: "See all destinations →",

    llegarH2a: "How to get to ",
    llegarH2em: "Huasteca Potosina",
    llegarH2b: "?",
    llegar: [
      { medio: "By air", detalle: `The most convenient airport is Tampico (TAM), ${enAuto("tampico", "valles", true)} by car from Ciudad Valles. You can also fly into the city of San Luis Potosí (${enAuto("san-luis-potosi", "valles", true)} to Valles).` },
      { medio: "By bus", detalle: `ADO and Ómnibus de México run from Mexico City, Monterrey and San Luis Potosí. Ciudad Valles is ${enAutobus("cdmx", "valles", true)} from Mexico City.` },
      { medio: "By car", detalle: `From Mexico City on Highway 85D: ${enAuto("cdmx", "valles", true)} on the toll road. We recommend arriving in daylight.` },
    ],
    llegarBtn: "Complete practical travel guide →",

    faqTitulo: "Huasteca Potosina: frequently asked questions",
    faqs: [
      {
        q: "Where is Huasteca Potosina?",
        a: `In the east of the state of San Luis Potosí, in Mexico, where the Sierra Madre Oriental drops down toward the coastal plain. Its gateway is Ciudad Valles and its best-known town is Xilitla, up in the mountains. From Mexico City it's ${enAuto("cdmx", "valles", true)} by car to Ciudad Valles.`,
      },
      {
        q: "What state is Huasteca Potosina in?",
        a: `San Luis Potosí — that's exactly what "Potosina" means: the part of the Huasteca that lies in that state. Its municipalities include ${municipios}.`,
      },
      {
        q: "What is the closest airport to Huasteca Potosina?",
        a: `The most convenient is Tampico (TAM): ${enAuto("tampico", "valles", true)} by car to Ciudad Valles and ${enAuto("tampico", "xilitla", true)} to Xilitla. The other option is flying into the city of San Luis Potosí, ${enAuto("san-luis-potosi", "valles", true)} from Ciudad Valles. From the airport, a rental car or a private transfer works best.`,
      },
      {
        q: "How do I get to Huasteca Potosina from Mexico City?",
        a: `By car it's ${enAuto("cdmx", "valles", true)} to Ciudad Valles and ${enAuto("cdmx", "xilitla", true)} to Xilitla. By bus, ${enAutobus("cdmx", "valles", true)} to Ciudad Valles (there are overnight departures from the Terminal del Norte) and ${enAutobus("cdmx", "xilitla", true)} to Xilitla. And every month there's a small-group trip from Mexico City with transport, hotel, breakfasts, Las Pozas and Tamul included.`,
      },
      {
        q: "Should I stay in Xilitla or Ciudad Valles?",
        a: "It depends on what you're coming for. Ciudad Valles is closer to Micos, Tamul and Tamasopo and has more hotels; Xilitla is a Pueblo Mágico up in the mountains, with Las Pozas right in town. We compare them with travel times from each base.",
        link: { href: "/en/xilitla-o-ciudad-valles", label: "Xilitla or Ciudad Valles? Where to stay →" },
      },
      {
        q: "When is the best time to visit Huasteca Potosina?",
        a: `From ${fechaInicioTexto("en")} to May, when the water runs clear. From March to May the turquoise is at its most intense, but that's also when it's busiest (Holy Week fills up). July to October is the rainy season: the waterfalls are in full flow and the jungle is at its greenest, but the water can run cloudy with sediment.`,
        link: { href: "/en/info-practica", label: "When to go, season by season →" },
      },
    ],

    tarjetaOrigen: "sobre-la-huasteca-en",

    ctaEyebrow: "Ready to explore",
    ctaH2a: "Start your adventure in the ",
    ctaH2em: "Huasteca",
    ctaTexto: `Guided tours with a certified guide and travel insurance included; ${CON_RECOGIDA.length} of our ${TOURS_DB.length} tours pick you up at your lodging. Groups of up to ${GRUPO_MAX} people — if there are more of you, talk to the team and we'll set up a private departure.`,
    ctaReservar: "See tours and book",
    ctaTours: "Get to know the tours →",
  };
}
