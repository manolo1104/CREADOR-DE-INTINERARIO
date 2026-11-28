import { RUTA_SERVICIOS_ES, RUTA_SERVICIOS_EN } from "./serviciosGrupos.en";
import { localePath, type Locale } from "./config";
import { localizePaquete } from "./paquetes.en";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { WA_MESSAGES } from "@/lib/whatsapp";
import { CAPACIDAD_INICIAL, VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { VIAJE_RUTA_EN } from "@/lib/viajeCdmx/en";

/**
 * Traducción de /grupos (10 nov 2026).
 *
 * 🔴 Lo que esta página NO puede decir, por decisión de Manolo (11 sep), vale
 * igual en inglés: ningún precio ni rango de grupo, ningún porcentaje de
 * descuento, ningún mínimo ni máximo de personas, ninguna cortesía prometida,
 * ninguna ciudad de origen salvo la CDMX, ninguna reseña. Por eso la versión
 * inglesa tampoco trae `Offer` ni `aggregateRating` en el JSON-LD.
 *
 * Los números que sí aparecen salen de datos: cuántos recorridos hay
 * (`TOURS_DB`), de cuántos a cuántos días van los paquetes (`PAQUETES_DB`), los
 * asientos de la camioneta del viaje CDMX (`CAPACIDAD_INICIAL`) y cómo se
 * anuncian los precios de los paquetes (`precioPorPersona`).
 */

export type SegGrupos = string | { link: string; href: string };

export interface GruposContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  inLanguage: string;
  breadcrumbActual: string;

  /** El mensaje que abre WhatsApp: pide de entrada los datos para cotizar. */
  whatsapp: string;
  botonWhatsapp: string;

  heroEyebrow: string;
  h1Pre: string;
  h1Em: string;
  heroTexto: string;
  heroNota: string;
  heroNotaStrong: string;

  comoFuncionaH2: string;
  comoFunciona: { n: string; t: string; d: string }[];

  incluyeH2: string;
  incluyeIntro: string;
  recorridosTitulo: string;
  recorridosTexto: string;
  hospedajeTitulo: string;
  hospedajeTexto: string;
  transporteTitulo: string;
  transporteTexto: string;
  viajeCdmx: SegGrupos[];
  /** Enlace a la página de piezas sueltas: transporte, guía y comida (12 nov 2026).
   *  Sin nombrar ciudades: aquí solo la CDMX (regla del 11 sep, arriba). */
  serviciosSueltos: SegGrupos[];

  composicionH2: string;
  composicion: SegGrupos[];
  composicionNota: string;

  faqH2: string;
  faqs: { q: string; a: string }[];

  ctaH2: string;
  ctaTexto: string;
  ctaNosotros: { label: string; href: string };
}

/**
 * Los 41 destinos de la región, como los cuenta la página en español desde
 * septiembre. Escrito aquí una sola vez para que los dos idiomas digan lo mismo.
 */
const DESTINOS_REGION = 41;

function construir(locale: Locale): GruposContent {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const nTours = TOURS_DB.length;
  const diasMin = Math.min(...PAQUETES_DB.map((p) => p.dias));
  const diasMax = Math.max(...PAQUETES_DB.map((p) => p.dias));

  /**
   * Cómo se anuncian los precios del catálogo de paquetes, leído de
   * `precioPorPersona` —el mismo campo que decide `precioVisible()`—.
   *
   * 🔴 Esta página decía «están calculados para dos personas»: desde el 12 sep
   * 2026 algunos paquetes se anuncian por persona y otros por pareja. La
   * segunda mitad de la frase —que no son tarifa de grupo— sigue siendo verdad.
   */
  const porPareja = PAQUETES_DB.filter((p) => !p.precioPorPersona).map((p) => localizePaquete(p, locale).nombre);
  const lista = (xs: string[]) =>
    new Intl.ListFormat(en ? "en-US" : "es-MX", { type: "conjunction" }).format(xs);
  const comoSeAnuncian =
    porPareja.length === 0
      ? en ? "per person" : "por persona"
      : porPareja.length === PAQUETES_DB.length
        ? en ? "per couple" : "por pareja"
        : en
          ? `per person (except ${lista(porPareja)}, which ${porPareja.length > 1 ? "are" : "is"} listed per couple)`
          : `por persona —salvo ${lista(porPareja)}, que se anuncia${porPareja.length > 1 ? "n" : ""} por pareja—`;

  if (!en) {
    return {
      metaTitle: "Viajes de Grupo a la Huasteca Potosina — Escuelas",
      metaDescription:
        "Escuelas, empresas y agencias: armamos el itinerario, el hospedaje, los alimentos y el transporte desde CDMX. Cotización a la medida por WhatsApp.",
      keywords: [
        "viajes escolares huasteca potosina",
        "viaje de grupo huasteca potosina",
        "tours para grupos huasteca potosina",
        "viaje escolar xilitla",
        "agencia de viajes huasteca potosina",
        "viajes corporativos huasteca potosina",
      ],
      ogTitle: "Viajes de grupo a la Huasteca Potosina",
      ogDescription:
        "Escuelas, empresas y agencias: armamos el itinerario, el hospedaje, los alimentos y el transporte. Cotización a la medida.",
      ogImageAlt: "Grupo navegando en canoa por el Cañón del Tampaón hacia la Cascada de Tamul",
      twitterTitle: "Viajes de grupo a la Huasteca Potosina",
      twitterDescription: "Escuelas, empresas y agencias: itinerario, hospedaje, alimentos y transporte a la medida.",

      inLanguage: "es-MX",
      breadcrumbActual: "Viajes de grupo",

      whatsapp: WA_MESSAGES.grupos,
      botonWhatsapp: "Pedir cotización por WhatsApp",

      heroEyebrow: "✦ Escuelas · Empresas · Agencias de viajes",
      h1Pre: "Viajes de grupo a la ",
      h1Em: "Huasteca Potosina",
      heroTexto:
        "Si vienes organizando el viaje de otros, no empieces por armar un itinerario tú. Dinos las fechas, cuántos son y de dónde salen, y te proponemos el recorrido completo: qué destino cada día, dónde duermen, qué comen y cómo se mueven. Con guías certificados NOM-09; el seguro de viajero se suma a la propuesta si lo necesitan.",
      heroNota:
        "Los grupos se cotizan, no se reservan en línea: cada uno llega con un número de personas, un presupuesto y unos días distintos, y eso se resuelve platicándolo. ",
      heroNotaStrong: "Hay descuento según el número de personas.",

      comoFuncionaH2: "Cómo funciona",
      comoFunciona: [
        {
          n: "1",
          t: "Nos escribes por WhatsApp",
          d: "Con tres datos basta para empezar: las fechas aproximadas, cuántas personas son más o menos y de qué ciudad salen. Si ya sabes qué tipo de grupo es —escuela, empresa, familia grande— dilo también.",
        },
        {
          n: "2",
          t: "Te proponemos el itinerario",
          d: "Armamos el recorrido día por día según los días que tengan y el perfil del grupo, y te decimos qué entra en el precio: recorridos, hospedaje, alimentos, transporte y guías.",
        },
        {
          n: "3",
          t: "Lo ajustamos contigo",
          d: "Se cambia lo que haga falta: quitar un día, cambiar un destino, mover fechas, ajustar el hospedaje. La propuesta se rehace las veces que necesites antes de comprometer nada.",
        },
        {
          n: "4",
          t: "Confirmas y se aparta",
          d: "Cuando la propuesta está aprobada por quien tenga que aprobarla, se confirman fechas y lugares. Te decimos el anticipo y las formas de pago en ese momento.",
        },
      ],

      incluyeH2: "Qué puede incluir la propuesta",
      incluyeIntro:
        "No todos los grupos necesitan lo mismo. Estos son los bloques que podemos armar; en tu propuesta entran los que pidas.",
      recorridosTitulo: "Recorridos",
      recorridosTexto: `Los ${nTours} recorridos del catálogo y los ${DESTINOS_REGION} destinos de la región: cascadas, sótanos, rafting, rappel, el jardín surrealista de Edward James y los pueblos de la sierra. Se eligen según la edad y la condición física del grupo.`,
      hospedajeTitulo: "Hospedaje y alimentos",
      hospedajeTexto:
        "Hotel propio en Xilitla —el Paraíso Encantado— y hospedaje de la zona cuando el grupo no cabe en una sola propiedad. Los alimentos se pueden incluir completos o solo los desayunos.",
      transporteTitulo: "Transporte",
      transporteTexto:
        "Traslados entre los destinos durante todo el viaje, y transporte desde la Ciudad de México si salen de ahí. Desde otras ciudades lo revisamos caso por caso.",
      // Para el grupo chico que sale de la CDMX ya existe un producto con fecha
      // (16 oct 2026). El número son los asientos de la camioneta.
      viajeCdmx: [
        `¿Son menos de ${CAPACIDAD_INICIAL} y salen de la CDMX? Súmense a nuestro `,
        { link: "viaje a la Huasteca desde CDMX", href: VIAJE_RUTA },
        ", que sale cada mes del Ángel de la Independencia.",
      ],
      serviciosSueltos: [
        "¿Solo necesitan el transporte, un guía o la comida? Mira ",
        { link: "transporte privado, guías y comida para grupos", href: RUTA_SERVICIOS_ES },
        ".",
      ],

      composicionH2: "De qué se compone un viaje",
      composicion: [
        "Para hacerte una idea de cómo se arman los días, puedes ver nuestros ",
        { link: `viajes de ${diasMin} a ${diasMax} días con hotel en Xilitla`, href: "/paquetes" },
        " y el ",
        { link: `catálogo de ${nTours} recorridos guiados`, href: "/tours" },
        ". Sirven como referencia del tipo de itinerario que armamos y del ritmo de cada día.",
      ],
      composicionNota: `Los precios que verás ahí se anuncian ${comoSeAnuncian} y no son la tarifa de un grupo. El precio de tu grupo sale en la cotización y depende del número de personas, los días y lo que decidas incluir.`,

      faqH2: "Preguntas frecuentes",
      // Salen de lo que preguntaron de verdad las dos organizadoras del 11 sep,
      // no de lo que uno supone que preguntan. Van tal cual al FAQPage.
      faqs: [
        {
          q: "¿Cuántas personas piden para dar cortesías?",
          a: "No manejamos cortesías como tal. Lo que hacemos es un descuento que depende del número de personas del grupo: cuantos más vayan, mejor queda el precio por persona. Escríbenos con el número aproximado y te decimos exactamente cómo queda.",
        },
        {
          q: "Necesito una propuesta para enseñarla a los papás o a mi jefe. ¿Me la mandan?",
          a: "Sí. Te armamos una propuesta con el itinerario día por día, qué incluye cada día, el hospedaje, los alimentos y el transporte, con el precio desglosado por persona. Te llega por WhatsApp o por correo, lista para reenviar a quien tenga que autorizarla.",
        },
        {
          q: "No sé qué recorridos elegir. ¿Ustedes lo arman?",
          a: "Es justo lo que hacemos. Nos dices cuántos días tienen, con qué grupo viajan y qué les interesa, y proponemos el itinerario nosotros: qué destino cada día, en qué orden y con qué ritmo, para que no terminen manejando de más ni repitiendo lugares. Conocemos la región y vivimos aquí.",
        },
        {
          q: "¿Hay transporte desde la Ciudad de México?",
          a: "Sí, podemos incluir el transporte desde la Ciudad de México dentro de la propuesta. Si salen de otra ciudad, pregúntanos y lo revisamos caso por caso.",
        },
        {
          q: "¿Se puede para varios días?",
          a: `Sí. Nuestros viajes de varios días van de ${diasMin} a ${diasMax} días, y para un grupo el itinerario se arma a la medida: se puede alargar, acortar o cambiar el orden según sus fechas.`,
        },
        {
          q: "¿Dónde duerme un grupo grande?",
          a: "Tenemos hotel propio en Xilitla, el Paraíso Encantado, y trabajamos con hospedaje de la zona para los grupos que no caben en una sola propiedad. El hospedaje concreto se define en la propuesta, según cuántos sean y en qué fechas.",
        },
        {
          q: "¿Por qué no puedo reservar en línea como los demás tours?",
          a: "Porque cada grupo llega con una situación distinta: número de personas, edades, presupuesto, días disponibles, de dónde salen y qué necesitan incluir. Eso no se resuelve con un formulario. Nos escribes por WhatsApp, lo platicamos y te mandamos una propuesta hecha para tu caso.",
        },
        {
          q: "¿Los guías están certificados?",
          a: "Sí. Todos nuestros recorridos van con guía certificado NOM-09. El seguro de viajero va incluido en los tours de aventura (rafting, RZR y el rappel en Tamul) y en los demás se agrega por $80 por persona. Para grupos escolares eso no es un detalle —es el requisito que normalmente pide la escuela—, así que dinos si lo necesitan y va en la propuesta.",
        },
      ],

      ctaH2: "Cuéntanos de tu grupo",
      ctaTexto:
        "Con las fechas, el número aproximado de personas y la ciudad de salida ya podemos empezar a armarte la propuesta. Contestamos personalmente, no con un formulario.",
      ctaNosotros: { label: "Conoce quiénes somos", href: "/nosotros" },
    };
  }

  return {
    // 58 caracteres.
    metaTitle: "Group Trips to the Huasteca Potosina — Schools & Companies",
    metaDescription:
      "Schools, companies and agencies: we plan the itinerary, lodging, meals and transportation from Mexico City. Custom quote on WhatsApp.",
    keywords: [
      "huasteca potosina group tours",
      "school trips huasteca potosina",
      "group travel huasteca potosina",
      "xilitla group trip",
      "huasteca potosina travel agency",
      "corporate trips huasteca potosina",
    ],
    ogTitle: "Group trips to the Huasteca Potosina",
    ogDescription:
      "Schools, companies and agencies: we plan the itinerary, lodging, meals and transportation. A quote made for your group.",
    ogImageAlt: "Group canoeing through the Tampaón Canyon toward Tamul Waterfall (Cascada de Tamul)",
    twitterTitle: "Group trips to the Huasteca Potosina",
    twitterDescription: "Schools, companies and agencies: itinerary, lodging, meals and transportation made to measure.",

    inLanguage: "en",
    breadcrumbActual: "Group trips",

    // Los mismos cinco datos que el mensaje en español (`WA_MESSAGES.grupos`),
    // para que el equipo reciba la cotización ya armada en los dos idiomas.
    whatsapp:
      "Hi, I'd like a quote for a group trip to the Huasteca Potosina.\n\n" +
      "· Approximate dates:\n" +
      "· Number of people (approx.):\n" +
      "· Departure city:\n" +
      "· Type of group (school, company, family, agency):\n" +
      "· Number of days we have:",
    botonWhatsapp: "Get a quote on WhatsApp",

    heroEyebrow: "✦ Schools · Companies · Travel agencies",
    h1Pre: "Group trips to the ",
    h1Em: "Huasteca Potosina",
    heroTexto:
      "If you're organizing a trip for other people, don't start by building an itinerary yourself. Tell us your dates, how many of you there are and where you're leaving from, and we'll propose the whole trip: which destination each day, where you sleep, what you eat and how you get around. With guides certified under NOM-09 (Mexico's official standard for specialized guides); traveler insurance goes into the proposal if you need it.",
    heroNota:
      "Groups are quoted, not booked online: each one comes with a different number of people, budget and number of days, and that gets sorted out by talking it through. ",
    heroNotaStrong: "There's a discount based on the number of people.",

    comoFuncionaH2: "How it works",
    comoFunciona: [
      {
        n: "1",
        t: "Message us on WhatsApp",
        d: "Three details are enough to start: your approximate dates, roughly how many people and which city you're leaving from. If you already know what kind of group it is (a school, a company, a large family), tell us that too.",
      },
      {
        n: "2",
        t: "We propose the itinerary",
        d: "We plan the trip day by day around the days you have and the group's profile, and tell you what the price includes: tours, lodging, meals, transportation and guides.",
      },
      {
        n: "3",
        t: "We fine-tune it with you",
        d: "We change whatever is needed: drop a day, swap a destination, move dates, adjust the lodging. The proposal is reworked as many times as you need before you commit to anything.",
      },
      {
        n: "4",
        t: "You confirm and we hold it",
        d: "Once the proposal is approved by whoever needs to approve it, dates and spots are confirmed. We'll tell you the deposit and payment methods at that point.",
      },
    ],

    incluyeH2: "What the proposal can include",
    incluyeIntro:
      "Not every group needs the same thing. These are the building blocks we can put together; your proposal includes the ones you ask for.",
    recorridosTitulo: "Tours",
    recorridosTexto: `The ${nTours} tours in our catalog and the region's ${DESTINOS_REGION} destinations: waterfalls, sinkhole caves, rafting, rappelling, Edward James's surrealist garden and the mountain towns. They're chosen according to the group's age and fitness level.`,
    hospedajeTitulo: "Lodging and meals",
    hospedajeTexto:
      "Our own hotel in Xilitla, Paraíso Encantado, plus local lodging when the group doesn't fit in a single property. Meals can be fully included or breakfast only.",
    transporteTitulo: "Transportation",
    transporteTexto:
      "Transfers between destinations throughout the trip, and transportation from Mexico City if that's where you're leaving from. From other cities, we look at it case by case.",
    viajeCdmx: [
      `Fewer than ${CAPACIDAD_INICIAL} of you, leaving from Mexico City? Join our `,
      { link: "Huasteca trip from Mexico City", href: VIAJE_RUTA_EN },
      ", which leaves every month from the Ángel de la Independencia.",
    ],
    serviciosSueltos: [
      "Only need the transport, a guide or the meals? See ",
      { link: "private transport, guides and meals for groups", href: RUTA_SERVICIOS_EN },
      ".",
    ],

    composicionH2: "What a trip is made of",
    composicion: [
      "To get a sense of how the days come together, take a look at our ",
      { link: `${diasMin}- to ${diasMax}-day trips with a hotel in Xilitla`, href: lp("/paquetes") },
      " and our ",
      { link: `catalog of ${nTours} guided tours`, href: lp("/tours") },
      ". They're a reference for the kind of itinerary we put together and the pace of each day.",
    ],
    composicionNota: `The prices you'll see there are listed ${comoSeAnuncian} and are not a group rate. Your group's price comes in the quote and depends on the number of people, the days and what you decide to include.`,

    faqH2: "Frequently asked questions",
    faqs: [
      {
        q: "How many people do you need to give complimentary spots?",
        a: "We don't offer complimentary spots as such. What we do is a discount that depends on the number of people in the group: the more people go, the better the price per person. Message us with the approximate number and we'll tell you exactly how it works out.",
      },
      {
        q: "I need a proposal to show the parents or my boss. Can you send one?",
        a: "Yes. We put together a proposal with the day-by-day itinerary, what each day includes, the lodging, the meals and the transportation, with the price broken down per person. It reaches you by WhatsApp or email, ready to forward to whoever has to approve it.",
      },
      {
        q: "I don't know which tours to choose. Can you plan it?",
        a: "That's exactly what we do. Tell us how many days you have, who's in the group and what they're interested in, and we'll propose the itinerary: which destination each day, in what order and at what pace, so you don't end up driving too much or repeating places. We know the region and we live here.",
      },
      {
        q: "Is there transportation from Mexico City?",
        a: "Yes, we can include transportation from Mexico City in the proposal. If you're leaving from another city, ask us and we'll look at it case by case.",
      },
      {
        q: "Can it be a multi-day trip?",
        a: `Yes. Our multi-day trips run from ${diasMin} to ${diasMax} days, and for a group the itinerary is made to measure: it can be made longer, shorter or reordered to fit your dates.`,
      },
      {
        q: "Where does a large group stay?",
        a: "We have our own hotel in Xilitla, Paraíso Encantado, and we work with local lodging for groups that don't fit in a single property. The specific lodging is set in the proposal, based on how many of you there are and your dates.",
      },
      {
        q: "Why can't I book online like the other tours?",
        a: "Because every group comes with a different situation: number of people, ages, budget, available days, where you're leaving from and what you need to include. A form can't solve that. Message us on WhatsApp, we talk it through and send you a proposal made for your case.",
      },
      {
        q: "Are the guides certified?",
        a: "Yes. All our tours come with a NOM-09 certified guide. Traveler insurance is included on adventure tours (rafting, RZR and the Tamul rappel) and can be added on the others for MXN $80 per person. For school groups that's not a detail — it's the requirement schools usually ask for — so tell us if you need it and it goes into the proposal.",
      },
    ],

    ctaH2: "Tell us about your group",
    ctaTexto:
      "With your dates, the approximate number of people and the departure city, we can start putting your proposal together. We reply personally, not with a form.",
    ctaNosotros: { label: "Meet the team", href: lp("/nosotros") },
  };
}

const CACHE: Partial<Record<Locale, GruposContent>> = {};

export function getGrupos(locale: Locale): GruposContent {
  return (CACHE[locale] ??= construir(locale));
}
