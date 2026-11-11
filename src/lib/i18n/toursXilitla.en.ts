import type { Locale } from "./config";
import {
  TOURS_DB, cargoVallesDe, etiquetaUnidad, partesRecogida, rankTour, recogidaDeTour, salidaCorta,
  type Tour,
} from "@/lib/tours";
import { excepcionesSalida, horaEnLista } from "@/lib/recogidaTexto";
import { destinosDeTour } from "@/lib/tourMapping";
import { PAQUETES_DB, type Paquete } from "@/lib/paquetes";
import { localizeTour } from "./localize";
import { localizePaquete } from "./paquetes.en";
import { fmtMoney } from "./format";

/**
 * Textos de /tours-en-xilitla y /en/tours-en-xilitla (10 nov 2026).
 *
 * El español es el que ya publicaba la landing, sin cambios: solo se mudó aquí
 * para que el inglés lea los mismos datos del catálogo.
 *
 * 🔴 La landing española ATACA SOLO EL RACIMO COMERCIAL («paquetes a xilitla»,
 * «xilitla tours»…) y enlaza los artículos del blog que ya ganan lo
 * informacional. Esos artículos solo existen en español, así que el bloque
 * «Para planear tu viaje» en inglés manda a las páginas inglesas que sí
 * existen (guía práctica, fichas de Las Pozas y del pueblo, preguntas
 * frecuentes): un enlace inglés que cae en español pierde al cliente.
 * /grupos sí tiene versión inglesa (10 nov 2026): se enlaza /en/grupos.
 *
 * ⚠️ En inglés todo importe lleva «MXN» (`fmtMoney`).
 */

const DIAS_MIN = Math.min(...PAQUETES_DB.map((p) => p.dias));
const DIAS_MAX = Math.max(...PAQUETES_DB.map((p) => p.dias));

/**
 * Cómo se ANUNCIAN los precios, leído de `precioPorPersona` —el mismo campo
 * que decide `precioVisible()`— en vez de afirmarlo a mano.
 *
 * 🔴 Esta página lo afirmaba a mano («el precio está calculado para dos
 * personas») y el régimen ya cambió dos veces. Armada desde el catálogo, la
 * frase se corrige sola cuando cambie un paquete.
 */
const PAQ_POR_PAREJA = PAQUETES_DB.filter((p) => !p.precioPorPersona);
const listaEs = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const listaEn = (xs: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(xs);

function notaPrecios(locale: Locale): string {
  const en = locale === "en";
  if (PAQ_POR_PAREJA.length === 0) return en ? "Prices are per person." : "Los precios son por persona.";
  if (PAQ_POR_PAREJA.length === PAQUETES_DB.length) return en ? "Prices are per couple." : "Los precios son por pareja.";
  const varios = PAQ_POR_PAREJA.length > 1;
  return en
    ? `Prices are per person, except ${listaEn(PAQ_POR_PAREJA.map((p: Paquete) => localizePaquete(p, "en").nombre))}, which ${varios ? "are" : "is"} sold per couple.`
    : `Los precios son por persona, salvo ${listaEs(PAQ_POR_PAREJA.map((p) => p.nombre))}, que se vende${varios ? "n" : ""} por pareja.`;
}

/**
 * Los recorridos que salen del propio Xilitla, sacados del catálogo: los que
 * recogen solo aquí o parten de nuestra base, más los de recogida general que
 * visitan Las Pozas (la Ruta Surrealista). En el orden de venta de /tours.
 *
 * 🔴 La página solo enlazaba el RZR y su FAQ decía que todos pasan «entre las
 * 8:00 y las 9:00 de la mañana»: la Gruta de Xilo sale a las 7 de la NOCHE y
 * el Amanecer de Nubes de madrugada.
 */
export const TOURS_XI = TOURS_DB
  .filter((t) => {
    const tipo = recogidaDeTour(t).tipo;
    if (tipo === "hospedaje-xilitla" || tipo === "base-xilitla") return true;
    return tipo === "hospedaje" && destinosDeTour(t.slug).incluye.includes("las-pozas-jardin-surrealista");
  })
  .sort((a, b) => rankTour(a.slug) - rankTour(b.slug));
/** Los que solo recogen en Xilitla, para decir qué pasa si vienes de Valles. */
const SOLO_XI = TOURS_XI.filter((t) => partesRecogida(t, false).valles);

export interface ToursXilitlaContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  breadcrumb: string;
  schemaPaquetes: string;
  schemaTours: string;

  heroEyebrow: string;
  heroH1a: string;
  heroH1em: string;
  heroH1b: string;
  heroIntro: string;
  ctaDisponibilidad: string;
  waDisponibilidad: string;

  paquetesTitulo: string;
  paquetesTexto: string;
  /** " MXN por pareja · todo incluido" detrás del precio de la tarjeta. */
  paqueteSufijo: (p: Paquete) => string;
  gruposPre: string;
  gruposLink: string;
  gruposHref: string;

  recorridosTitulo: string;
  recorridosTexto: string;
  /** "Salida: 7:00 PM, desde tu hospedaje en Xilitla (…)" o null si no hay hora pública. */
  salidaLinea: (t: Tour) => string | null;
  desde: string;
  unidad: (t: Tour) => string;
  /** Nota de los que solo recogen en Xilitla ("" si no hay). */
  soloXiNota: string;

  destinosTitulo: string;
  destinosTexto: (n: number) => string;

  porQueTitulo: string;
  porQueP1: string;
  porQueP2: string;
  comparaPre: string;
  comparaLink: string;

  tarjetaOrigen: string;

  planearTitulo: string;
  planear: { href: string; t: string; d: string }[];

  faqTitulo: string;
  faqs: { q: string; a: string }[];

  ctaTitulo: string;
  ctaTexto: string;
  ctaWhatsapp: string;
  waReservar: string;
  ctaPaquetes: string;
}

export function getToursXilitla(locale: Locale): ToursXilitlaContent {
  if (locale === "en") {
    const nombreEn = (t: Tour) => localizeTour(t, "en").nombreCorto;
    return {
      metaTitle: "Xilitla Tours & Packages — Las Pozas, Mexico 2026",
      metaDescription:
        "We're from Xilitla: tours to Las Pozas, Xilo Cave at night, the Cerro del Pilón sunrise and Olla de la Luz, plus packages at our own hotel in town.",
      keywords: [
        "xilitla tours",
        "xilitla packages",
        "las pozas xilitla tour",
        "xilitla mexico tours",
        "where to stay in xilitla",
        "huasteca potosina tours from xilitla",
      ],
      ogTitle: "Xilitla tours and packages, San Luis Potosí",
      ogDescription:
        "We operate from Xilitla, the Pueblo Mágico that is home to Edward James' Las Pozas. Tours and packages with our own hotel.",
      ogImageAlt: "Concrete arches and staircases of the Las Pozas surrealist garden, in the Xilitla jungle",
      twitterTitle: "Xilitla tours and packages, San Luis Potosí",
      twitterDescription: "We operate from Xilitla: guided tours and packages with our own hotel in the Pueblo Mágico.",

      breadcrumb: "Tours in Xilitla",
      schemaPaquetes: "Packages with hotel in Xilitla",
      schemaTours: "Tours that leave from Xilitla",

      heroEyebrow: "✦ Pueblo Mágico · Our own hotel · Daily departures",
      heroH1a: "Tours and packages in ",
      heroH1em: "Xilitla",
      heroH1b: ", San Luis Potosí",
      heroIntro:
        "This is where we live. Xilitla isn't a stop on our route: it's the base we operate from, with our own hotel and restaurant ten minutes from Edward James' Las Pozas. Every morning we head out from here to the waterfalls, the sinkholes and the cloud forest, and you come back here to sleep without repacking.",
      ctaDisponibilidad: "Check availability",
      waDisponibilidad: "Hi! I'd like information about your packages with hotel in Xilitla. What do you have available?",

      paquetesTitulo: "Packages with hotel in Xilitla",
      paquetesTexto: `From ${DIAS_MIN} to ${DIAS_MAX} days, all-inclusive: nights at the hotel, each day's tours with transport and entrance fees, breakfast and the guide. ${notaPrecios("en")}`,
      paqueteSufijo: (p) => ` MXN ${p.precioLabel} · all-inclusive`,
      gruposPre: "Coming as a large group, a school or a company? That's quoted separately:",
      gruposLink: "group and school trips",
      // /en/grupos existe desde el 10 nov 2026 (misma tanda): la cotización de
      // grupos en inglés, no el formulario de contacto genérico.
      gruposHref: "/en/grupos",

      recorridosTitulo: "Tours that leave from Xilitla",
      recorridosTexto: `${TOURS_XI.length} tours leave from the town itself: ${listaEn(TOURS_XI.map(nombreEn))}. Each card shows what time it departs and where it starts.`,
      salidaLinea: (t) => {
        // 🔴 El `horaTexto` del Edén son las horas en que ABRE el jardín para
        // el grupo, no la de recogida: «set times depending on the day».
        const salida = recogidaDeTour(t).horaTexto ? horaEnLista(t, true) : salidaCorta(t, true);
        if (!salida) return null;
        const cargo = cargoVallesDe(t);
        return `Departs: ${salida}, from ${partesRecogida(t, true).lugar}${cargo > 0 ? ` (from Valles, +${fmtMoney(cargo, "en")} per booking)` : ""}`;
      },
      desde: "From ",
      unidad: (t) => ` MXN ${etiquetaUnidad(t, true)}`,
      soloXiNota: SOLO_XI.length
        ? `For ${listaEn(SOLO_XI.map(nombreEn))}, the included transfer is from lodgings in Xilitla. ${partesRecogida(SOLO_XI[0], true).valles ?? ""}`
        : "",

      destinosTitulo: "What's in and around Xilitla",
      destinosTexto: (n) => `${n} destinations within the municipality, all less than an hour from town.`,

      porQueTitulo: "Why stay in Xilitla",
      porQueP1:
        "Almost every tour agency in the Huasteca operates out of Ciudad Valles, a pass-through city: handy for getting around the north of the region, but you sleep on a busy avenue. Xilitla is a Pueblo Mágico tucked into the mountains, and it's where Edward James built his surrealist garden. You can stroll at night, eat well and wake up to mist between the mountains.",
      porQueP2:
        "From here we also head out to what's on the other side — Tamul Waterfall, the Micos waterfalls, the sinkholes of Aquismón — so you don't have to choose between sleeping somewhere beautiful and seeing the whole region.",
      comparaPre: "Torn between the two bases? We compare them with real driving times in",
      comparaLink: "Xilitla or Ciudad Valles? Where to stay",

      tarjetaOrigen: "tours-en-xilitla-en",

      planearTitulo: "Planning your trip to Xilitla",
      planear: [
        { href: "/en/info-practica", t: "Getting there and when to go", d: "Routes from Mexico City, Monterrey and San Luis Potosí by bus, car and plane, plus the weather season by season." },
        { href: "/en/destinos/las-pozas-jardin-surrealista", t: "Las Pozas de Edward James", d: "Opening hours, entrance fee and how to make the most of the visit." },
        { href: "/en/destinos/xilitla-pueblo-magico", t: "Xilitla, the Pueblo Mágico", d: "What to see in town and around it, and the mistakes to avoid." },
        { href: "/en/preguntas-frecuentes", t: "Travel FAQ", d: "Prices, deposits, cancellations, rain and traveling with kids." },
      ],

      faqTitulo: "Frequently asked questions",
      faqs: [
        {
          q: "What does a Xilitla package include?",
          a: `Nights at our hotel in Xilitla, each day's guided tours with transport, entrance fees, breakfast and a NOM-09 certified guide with traveler's insurance. Packages run from ${DIAS_MIN} to ${DIAS_MAX} days. ${notaPrecios("en")} From the third person on, you add their place on each tour and whatever room is needed; children pay less.`,
        },
        {
          q: "Why stay in Xilitla instead of Ciudad Valles?",
          a: "Because Edward James' Las Pozas, La Trinidad and the cloud forest are right here, and because Xilitla is a Pueblo Mágico: you can walk around at night, eat well and wake up in the mountains. Ciudad Valles is more practical for the north of the region, but it's a pass-through city. From Xilitla we also run trips to Tamul, Micos and the sinkholes.",
        },
        {
          q: "Do the tours leave from Xilitla?",
          // La frase la arma `excepcionesSalida` desde la `recogida` de cada
          // recorrido; sin los que son en sitio, que no tocan Xilitla.
          a: `Yes. ${excepcionesSalida("en", TOURS_DB.filter((t) => recogidaDeTour(t).tipo !== "en-sitio"))}`,
        },
        {
          q: "Do you have your own hotel in Xilitla?",
          a: "Yes, Hotel Paraíso Encantado. Packages include your nights there, with mountain views and breakfast. For large groups we also work with other lodging in the area.",
        },
        {
          q: "How many days do I need in Xilitla?",
          a: "With two full days you can see Las Pozas without rushing and do one waterfall tour. With three or four you can add Tamul, the cloud forest of La Trinidad and the sinkholes without repeating a destination or changing hotels.",
        },
        {
          q: "Can I book just the tour, without the hotel?",
          a: "Yes. Day tours are sold individually and held with a 30% deposit when you book; the balance is paid on the day of the tour.",
        },
      ],

      ctaTitulo: "Your Xilitla trip, sorted",
      ctaTexto:
        "We're NOM-09 certified local guides with our own hotel and transport in town. Message us and we'll confirm availability in under an hour.",
      ctaWhatsapp: "Book on WhatsApp",
      waReservar: "Hi! I'd like to book a trip to Xilitla. What dates do you have available?",
      ctaPaquetes: "See all packages",
    };
  }

  // ── Español: el texto de siempre ───────────────────────────────────────────
  return {
    metaTitle: "Tours y Paquetes en Xilitla, San Luis Potosí 2026",
    // Decía «Todo incluido, salidas diarias» de todo lo que sale de aquí, y el
    // RZR no incluye el transporte. Ahora nombra lo que de verdad sale del pueblo.
    metaDescription:
      "Somos de Xilitla: tours a Las Pozas, la Gruta de Xilo de noche, el Cerro del Pilón y la Olla de la Luz, y paquetes con hotel propio en el Pueblo Mágico.",
    keywords: [
      "paquetes a xilitla",
      "xilitla paquetes",
      "tours xilitla",
      "viaje a xilitla todo incluido",
      "hoteles en xilitla",
      "paquetes a xilitla san luis potosi",
      "tours huasteca potosina desde xilitla",
    ],
    ogTitle: "Tours y paquetes en Xilitla, San Luis Potosí",
    ogDescription:
      "Operamos desde Xilitla, el Pueblo Mágico donde está Las Pozas de Edward James. Tours y paquetes con hotel propio.",
    ogImageAlt: "Arcos y escaleras de concreto del jardín surrealista de Las Pozas, entre la selva de Xilitla",
    twitterTitle: "Tours y paquetes en Xilitla, San Luis Potosí",
    twitterDescription: "Operamos desde Xilitla: tours guiados y paquetes con hotel propio en el Pueblo Mágico.",

    breadcrumb: "Tours en Xilitla",
    schemaPaquetes: "Paquetes con hotel en Xilitla",
    schemaTours: "Recorridos que salen de Xilitla",

    heroEyebrow: "✦ Pueblo Mágico · Hotel propio · Salidas diarias",
    heroH1a: "Tours y paquetes en ",
    heroH1em: "Xilitla",
    heroH1b: ", San Luis Potosí",
    heroIntro:
      "Aquí vivimos. Xilitla no es nuestra parada: es la base desde la que operamos, con hotel y restaurante propios a diez minutos de Las Pozas de Edward James. Desde aquí salimos cada mañana a las cascadas, los sótanos y el bosque de niebla, y de aquí vuelves a dormir sin rehacer maletas.",
    ctaDisponibilidad: "Consultar disponibilidad",
    waDisponibilidad: "Hola, quiero información de los paquetes con hotel en Xilitla. ¿Qué tienen disponible?",

    paquetesTitulo: "Paquetes con hotel en Xilitla",
    paquetesTexto: `De ${DIAS_MIN} a ${DIAS_MAX} días, todo incluido: las noches en el hotel, los recorridos de cada día con transporte y entradas, el desayuno y el guía. ${notaPrecios("es")}`,
    paqueteSufijo: (p) => ` MXN ${p.precioLabel} · todo incluido`,
    gruposPre: "¿Vienen en grupo grande, de escuela o de empresa? Eso se cotiza aparte:",
    gruposLink: "viajes de grupo y escolares",
    gruposHref: "/grupos",

    recorridosTitulo: "Recorridos que salen de Xilitla",
    recorridosTexto: `${TOURS_XI.length} recorridos salen del propio pueblo: ${listaEs(TOURS_XI.map((t) => t.nombreCorto))}. Cada tarjeta dice a qué hora sale y dónde empieza.`,
    salidaLinea: (t) => {
      // 🔴 El `horaTexto` del Edén son las horas en que ABRE el jardín para
      // el grupo, no la de recogida (pasamos antes), y ya viene separado
      // con «·»: pegado al lugar se leía «pasan por mí a las 7:00 AM».
      // Mismo criterio que la FAQ y /info-practica: «horario según el día».
      const salida = recogidaDeTour(t).horaTexto ? horaEnLista(t, false) : salidaCorta(t);
      if (!salida) return null;
      const cargo = cargoVallesDe(t);
      return `Salida: ${salida}, desde ${partesRecogida(t, false).lugar}${cargo > 0 ? ` (desde Valles, +$${cargo.toLocaleString("es-MX")} por reserva)` : ""}`;
    },
    desde: "Desde ",
    unidad: (t) => ` MXN ${etiquetaUnidad(t)}`,
    soloXiNota: SOLO_XI.length
      ? `En ${listaEs(SOLO_XI.map((t) => t.nombreCorto))}, el traslado incluido es desde hospedajes de Xilitla. ${partesRecogida(SOLO_XI[0], false).valles ?? ""}`
      : "",

    destinosTitulo: "Qué hay en Xilitla y sus alrededores",
    destinosTexto: (n) => `${n} destinos dentro del municipio, todos a menos de una hora del pueblo.`,

    porQueTitulo: "Por qué dormir en Xilitla",
    porQueP1:
      "Casi todas las agencias de la Huasteca operan desde Ciudad Valles, que es una ciudad de paso: buena para moverse al norte de la región, pero se duerme en una avenida. Xilitla es Pueblo Mágico, está metido en la sierra y es donde Edward James construyó su jardín surrealista. Se camina de noche, se cena bien y se amanece con niebla entre las montañas.",
    porQueP2:
      "Desde aquí también salimos a lo que está del otro lado —la Cascada de Tamul, las cascadas de Micos, los sótanos de Aquismón—, así que no hay que elegir entre dormir bonito y ver la región completa.",
    comparaPre: "Si dudas entre las dos bases, lo comparamos con los tiempos reales de carretera en",
    comparaLink: "¿Xilitla o Ciudad Valles? Dónde hospedarte",

    tarjetaOrigen: "tours-en-xilitla",

    // Lo informacional NO se contesta aquí: se enlaza. Esos artículos ya están
    // entre el puesto 4 y el 9 y responderlo otra vez les quitaría fuerza.
    planearTitulo: "Para planear tu viaje a Xilitla",
    planear: [
      { href: "/blog/como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp", t: "Cómo llegar a Xilitla", d: "Rutas desde CDMX, Monterrey y San Luis Potosí, en autobús, auto y avión." },
      { href: "/blog/las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece", t: "Las Pozas de Edward James", d: "Horarios, precio de entrada y cómo aprovechar la visita." },
      { href: "/blog/mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par", t: "Cuándo ir: clima y temporada", d: "Qué esperar del clima mes por mes y cuándo el agua está más azul." },
      { href: "/blog/xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando", t: "Xilitla con niños", d: "Qué sí aguantan los niños y qué conviene dejar para otro viaje." },
    ],

    faqTitulo: "Preguntas frecuentes",
    // Responden al racimo comercial. Lo informacional se enlaza, no se contesta
    // aquí: esos artículos ya están entre el puesto 4 y el 9.
    faqs: [
      {
        q: "¿Qué incluye un paquete a Xilitla?",
        a: `Las noches en nuestro hotel de Xilitla, los recorridos guiados de cada día con transporte, las entradas, el desayuno y el guía certificado NOM-09 con seguro de viajero. Los paquetes van de ${DIAS_MIN} a ${DIAS_MAX} días. ${notaPrecios("es")} Desde la tercera persona se suman su lugar en cada recorrido y la habitación que haga falta; los menores pagan menos.`,
      },
      {
        q: "¿Por qué quedarse en Xilitla y no en Ciudad Valles?",
        a: "Porque Las Pozas de Edward James, La Trinidad y el bosque de niebla están aquí mismo, y porque Xilitla es Pueblo Mágico: se camina de noche, se cena bien y se amanece entre montaña. Ciudad Valles es más práctica para el norte de la región, pero es una ciudad de paso. Desde Xilitla también salimos a Tamul, Micos y los sótanos.",
      },
      {
        q: "¿Los tours salen desde Xilitla?",
        // La frase la arma `excepcionesSalida` desde la `recogida` de cada
        // recorrido; sin el buceo, que es en Rioverde y no toca Xilitla.
        a: `Sí. ${excepcionesSalida("es", TOURS_DB.filter((t) => recogidaDeTour(t).tipo !== "en-sitio"))}`,
      },
      {
        q: "¿Tienen hotel propio en Xilitla?",
        a: "Sí, el Hotel Paraíso Encantado. Los paquetes incluyen las noches ahí, con vista a la sierra y desayuno. Para grupos grandes trabajamos además con hospedaje de la zona.",
      },
      {
        q: "¿Cuántos días necesito en Xilitla?",
        a: "Con dos días completos ves Las Pozas sin prisa y haces un recorrido a las cascadas. Con tres o cuatro entran Tamul, el bosque de niebla de La Trinidad y los sótanos sin repetir destino ni cambiar de hotel.",
      },
      {
        q: "¿Se puede reservar solo el tour, sin hotel?",
        a: "Sí. Los recorridos de un día se compran sueltos y se apartan con el 30 % al reservar; el resto se liquida el día del tour.",
      },
    ],

    ctaTitulo: "Tu viaje a Xilitla, resuelto",
    ctaTexto:
      "Somos guías locales certificados NOM-09, con hotel y transporte propios en el pueblo. Escríbenos y te confirmamos disponibilidad en menos de una hora.",
    ctaWhatsapp: "Reservar por WhatsApp",
    waReservar: "Hola, quiero reservar un viaje a Xilitla. ¿Qué fechas tienen disponibles?",
    ctaPaquetes: "Ver todos los paquetes",
  };
}
