import type { Locale } from "./config";

/**
 * Textos de /donde-hospedarse-en-la-huasteca-potosina y de su gemela
 * /en/where-to-stay-in-huasteca-potosina (10 nov 2026).
 *
 * Por qué existe: «hoteles en la Huasteca Potosina / dónde hospedarse» suma
 * 2,982 impresiones en 90 días en el puesto ~11 y caía en /paquetes, que es
 * otra cosa. Manolo decidió el formato: una guía POR ZONA (Xilitla, Ciudad
 * Valles, Aquismón, Tamasopo) y solo NUESTRO hotel. No se nombra ni se describe
 * ningún hotel de la competencia.
 *
 * 🔴 Aquí NO hay cifras escritas a mano: los tiempos salen de `tiemposDeViaje.ts`,
 * del `como_llegar` de cada ficha (`tiemposADestinos.ts`) y de la tabla de
 * /xilitla-o-ciudad-valles; los precios, de `TOURS_DB` y `PAQUETES_DB`; lo del
 * hotel, de `hotelPropio.ts` y `habitaciones.ts`. Por eso casi todo son
 * funciones que reciben el dato ya calculado por la página.
 *
 * Lo que NO se dice a propósito: el precio por noche del hotel (`hotelPropio.ts`
 * lo deja fuera porque las fuentes se contradicen), cuántos cuartos tiene y que
 * recogemos en Aquismón o Tamasopo (la recogida es en Xilitla o Ciudad Valles).
 *
 * ⚠️ En inglés todo importe lleva «MXN» (lo pone `fmtMoney`, que arma la página).
 */

export const RUTA_HOSPEDAJE_ES = "/donde-hospedarse-en-la-huasteca-potosina";
/** Sin el prefijo /en: así la usan `buildBreadcrumbNode` y `localeUrl`. */
export const RUTA_HOSPEDAJE_EN_SIN_PREFIJO = "/where-to-stay-in-huasteca-potosina";
export const RUTA_HOSPEDAJE_EN = `/en${RUTA_HOSPEDAJE_EN_SIN_PREFIJO}`;

export type ZonaId = "xilitla" | "ciudad-valles" | "aquismon" | "tamasopo";

export interface ZonaTexto {
  /** Lo que se le recomienda a quien duerme ahí, en una línea (la tabla). */
  idealPara: string;
  /** Un párrafo corto para la tarjeta de la zona. */
  texto: string;
}

/** Lo que la FAQ necesita, ya calculado por la página. */
export interface DatosFaqHospedaje {
  /** «hora y media» / «an hour and a half». */
  vallesXilitlaPalabras: string;
  micos: string | null;
  tamul: string | null;
  enLasDos: number;
  total: number;
  /** «Gruta de Xilo, Amanecer de Nubes y …» */
  soloXilitla: string;
  /** Nombre del recorrido que sale de nuestra base (el RZR), si hay. */
  baseXilitla: string | null;
  /** «desde Ciudad Valles, la Ruta Surrealista cuesta $400 más por reserva», o «». */
  cargoValles: string;
  nPaquetes: number;
  diasMin: number;
  diasMax: number;
  /** «$8,699 MXN por pareja». */
  desdePaquete: string;
  metros: number;
  minutosAPie: number;
}

export interface DondeHospedarseContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  breadcrumb: string;
  eyebrow: string;
  h1: string;
  respuestaEtiqueta: string;
  respuesta: (d: { vallesXilitla: string; micos: string | null; tamul: string | null; enLasDos: number; total: number }) => string;

  tablaZonasTitulo: string;
  tablaZonasCabeceras: [string, string, string, string];
  /** Casilla «¿Pasamos por ti?» de la tabla, en corto. */
  recogidaCorta: (d: { zona: ZonaId; n: number; total: number }) => string;
  zonas: Record<ZonaId, ZonaTexto>;
  /** Aquismón y Tamasopo se describen con la ficha del pueblo cuando la hay. */
  zonaPorZonaTitulo: string;
  lugaresDeLaZona: string;
  desdeValles: string;
  pasamosPorTi: string;
  recogidaXilitla: (d: { n: number; total: number; base: string | null }) => string;
  recogidaValles: (d: { n: number; total: number; cargo: string }) => string;
  recogidaFuera: string;
  vallesXilitlaFrase: (t: string) => string;

  tiemposTitulo: string;
  tiemposIntro: (vallesXilitla: string) => string;
  tiemposCabeceras: [string, string, string, string, string];
  enElPueblo: string;
  seCombinaCon: string;
  tiemposNota: string;

  hotelTitulo: string;
  hotelTexto: (d: { zona: string; metros: number; minutos: number; restaurante: string; horario: string }) => string;
  serviciosTitulo: string;
  habitacionesTitulo: string;
  categoriaHabitacion: (categoria: string) => string;
  hastaPersonas: (n: number) => string;
  hotelAutobus: string;
  hotelNoObligatorio: string;
  hotelTarifas: string;
  ctaDisponibilidad: string;
  ctaSitioHotel: string;

  paquetesTitulo: string;
  paquetesIntro: (n: number) => string;
  diasNoches: (dias: number, noches: number) => string;
  nRecorridos: (n: number) => string;
  verPaquete: string;

  toursTitulo: string;
  toursIntro: string;
  grupoDos: string;
  grupoSoloXilitla: string;
  grupoBase: string;
  desde: (monto: string, unidad: string) => string;
  verTodosTours: (n: number) => string;

  faqTitulo: string;
  faq: (d: DatosFaqHospedaje) => { q: string; a: string }[];

  ctaTitulo: string;
  ctaTexto: string;
  ctaReservar: string;
  ctaWhatsApp: string;
  waMensaje: string;
  sigueLeyendo: string;
  enlaceCascadas: string;
  enlaceInfo: string;
  /** /xilitla-o-ciudad-valles, que existe en los dos idiomas con el mismo slug (10 nov 2026). */
  enlaceComparacion: string;
  /** El enlace de la tarjeta de zona a su landing de tours (/tours-en-xilitla, /tours-en-ciudad-valles). */
  toursEnZona: (zona: string) => string;
}

/** «a, b y c» · «a, b and c». */
function lista(items: string[], en: boolean): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${en ? " and " : " y "}${items[items.length - 1]}`;
}

const ES: DondeHospedarseContent = {
  // 57 caracteres.
  metaTitle: "Dónde hospedarse en la Huasteca Potosina: zonas y hoteles",
  metaDescription:
    "Xilitla, Ciudad Valles, Aquismón o Tamasopo: qué te queda cerca desde cada zona, cuánto se hace a cada lugar, qué tours pasan por ti y nuestro hotel.",
  ogTitle: "Dónde hospedarse en la Huasteca Potosina, zona por zona",
  breadcrumb: "Dónde hospedarse",
  eyebrow: "Guía por zonas · Xilitla · Ciudad Valles · Aquismón · Tamasopo",
  h1: "Dónde hospedarse en la Huasteca Potosina",
  respuestaEtiqueta: "La respuesta corta",
  respuesta: ({ vallesXilitla, micos, tamul, enLasDos, total }) =>
    "Si vienes por Las Pozas de Edward James, el pueblo mágico y la sierra, duerme en Xilitla. " +
    `Si vienes sobre todo por las cascadas, en Ciudad Valles, la puerta de entrada de la región` +
    (micos && tamul ? `: desde ahí Micos queda a ${micos} y Tamul a ${tamul}. ` : ". ") +
    `Entre las dos hay ${vallesXilitla} de carretera de sierra, y ${enLasDos} de nuestros ${total} recorridos pasan por ti en cualquiera de las dos. ` +
    "Aquismón (junto a Tamul y los sótanos) y Tamasopo (junto al Puente de Dios) te dejan más cerca de esos lugares, pero la recogida de nuestros recorridos es en Xilitla o en Ciudad Valles.",

  tablaZonasTitulo: "Las cuatro zonas, comparadas",
  tablaZonasCabeceras: ["Zona", "Te conviene si…", "De Ciudad Valles a sus lugares", "¿Pasamos por ti?"],
  recogidaCorta: ({ zona, n, total }) =>
    zona === "xilitla" || zona === "ciudad-valles"
      ? `Sí, en ${n} de ${total} recorridos`
      : "No: en Xilitla o Ciudad Valles",
  zonas: {
    xilitla: {
      idealPara: "Vienes por Las Pozas, el pueblo mágico, la sierra y el bosque de niebla",
      texto:
        "El pueblo mágico de la sierra, donde está el jardín surrealista de Edward James. De aquí salen los recorridos con horario propio, que solo recogen en Xilitla, y aquí está nuestro hotel.",
    },
    "ciudad-valles": {
      idealPara: "Vienes por las cascadas y quieres la mejor conexión por carretera y autobús",
      texto:
        "La puerta de entrada de la región, con la mayor variedad de hospedaje y servicios. Es la base más cercana a las cascadas y adonde llegan los autobuses de la Ciudad de México y de Monterrey.",
    },
    aquismon: {
      idealPara: "Quieres dormir junto a Tamul, el río Tampaón y los sótanos",
      texto: "",
    },
    tamasopo: {
      idealPara: "Quieres dormir junto al Puente de Dios y las cascadas de Tamasopo",
      texto:
        "Sobre la autopista de Ciudad Valles a San Luis Potosí. Aquí están el Puente de Dios y las cascadas que recorre nuestra Ruta Acuática.",
    },
  },
  zonaPorZonaTitulo: "Zona por zona",
  lugaresDeLaZona: "Lugares de la zona (y cuánto se hace desde Ciudad Valles)",
  desdeValles: "Desde Ciudad Valles",
  pasamosPorTi: "¿Pasamos por ti?",
  recogidaXilitla: ({ n, total, base }) =>
    `Sí. ${n} de nuestros ${total} recorridos pasan por ti a tu hospedaje${base ? `, y el ${base} sale de nuestra base en el pueblo` : ""}.`,
  recogidaValles: ({ n, total, cargo }) =>
    `Sí, en ${n} de nuestros ${total} recorridos${cargo ? ` (${cargo})` : ""}. Los de horario propio de Xilitla también vienen por ti, con costo adicional que te cotizamos por WhatsApp.`,
  recogidaFuera:
    "No: nuestros recorridos pasan por ti a tu hospedaje en Xilitla o en Ciudad Valles. Si vas a dormir aquí, escríbenos antes de reservar.",
  vallesXilitlaFrase: (t) => `A Ciudad Valles: ${t} de sierra.`,

  tiemposTitulo: "Cuánto se hace a los lugares principales",
  tiemposIntro: (t) =>
    `Desde las dos bases donde pasamos por ti. Entre Ciudad Valles y Xilitla hay ${t} de carretera de sierra.`,
  tiemposCabeceras: ["Lugar", "Municipio", "Desde Ciudad Valles", "Desde Xilitla", "Recorrido que lo visita"],
  enElPueblo: "en el pueblo",
  seCombinaCon: "Se combina con",
  tiemposNota: "Tiempos aproximados en auto.",

  hotelTitulo: "Nuestro hotel en Xilitla: Hotel Paraíso Encantado",
  hotelTexto: ({ zona, metros, minutos, restaurante, horario }) =>
    `Es nuestro hotel y donde duermen nuestros paquetes. Está en ${zona}, en Xilitla, a ${metros} m de Las Pozas de Edward James (${minutos} min a pie), y adentro está ${restaurante}, nuestro restaurante de cocina huasteca, abierto ${horario}.`,
  serviciosTitulo: "Servicios",
  habitacionesTitulo: "Tipos de habitación",
  categoriaHabitacion: (c) => c,
  hastaPersonas: (n) => `hasta ${n} personas`,
  hotelAutobus:
    "¿Llegas en el autobús de la mañana? Te damos el cuarto al llegar si está libre; si no, dejas las maletas en recepción y la camioneta del tour pasa por ti ahí.",
  hotelNoObligatorio:
    "No necesitas hospedarte con nosotros para tomar un recorrido: pasamos por ti igual a cualquier hospedaje de Xilitla.",
  hotelTarifas: "Pregúntanos tarifa y disponibilidad por WhatsApp con tus fechas.",
  ctaDisponibilidad: "Consultar disponibilidad",
  ctaSitioHotel: "Ver el sitio del hotel",

  paquetesTitulo: "Paquetes con hotel incluido",
  paquetesIntro: (n) =>
    `Si prefieres resolver hospedaje y recorridos de una vez, ${n === 1 ? "este paquete incluye" : `estos ${n} paquetes incluyen`} las noches en nuestro hotel de Xilitla junto con los recorridos.`,
  diasNoches: (d, n) => `${d} días / ${n} noches`,
  nRecorridos: (n) => `${n} ${n === 1 ? "recorrido" : "recorridos"}`,
  verPaquete: "Ver paquete",

  toursTitulo: "Qué recorridos pasan por ti, según dónde duermas",
  toursIntro: "La recogida es parte del recorrido: no tienes que manejar al punto de salida.",
  grupoDos: "Pasan por ti en Xilitla o en Ciudad Valles",
  grupoSoloXilitla: "Pasan por ti solo en Xilitla",
  grupoBase: "Salen de nuestra base en Xilitla",
  desde: (monto, unidad) => `desde ${monto} ${unidad}`,
  verTodosTours: (n) => `Ver los ${n} tours`,

  faqTitulo: "Preguntas frecuentes sobre dónde hospedarse",
  faq: (d) => [
    {
      q: "¿Dónde es mejor hospedarse en la Huasteca Potosina?",
      a:
        "Depende de a qué vengas. Para Las Pozas de Edward James y la sierra, Xilitla. Para las cascadas, Ciudad Valles" +
        (d.micos && d.tamul ? `, de donde Micos queda a ${d.micos} y Tamul a ${d.tamul}` : "") +
        `. Entre las dos hay ${d.vallesXilitlaPalabras} de carretera de sierra, y ${d.enLasDos} de nuestros ${d.total} recorridos pasan por ti en cualquiera de las dos.`,
    },
    {
      q: "¿Cuánto hay de Xilitla a Ciudad Valles?",
      a: `${d.vallesXilitlaPalabras.charAt(0).toUpperCase()}${d.vallesXilitlaPalabras.slice(1)} en auto, por carretera de sierra con curvas y neblina: conviene manejarla de día.`,
    },
    {
      q: "¿Los tours pasan por mí a mi hotel?",
      a:
        `Sí. ${d.enLasDos} de nuestros ${d.total} recorridos pasan por ti a tu hospedaje en Xilitla o en Ciudad Valles` +
        (d.cargoValles ? ` (${d.cargoValles})` : "") +
        `. ${d.soloXilitla ? `${d.soloXilitla} recogen solo en Xilitla; desde Ciudad Valles su traslado tiene costo adicional que te cotizamos por WhatsApp. ` : ""}` +
        (d.baseXilitla ? `El ${d.baseXilitla} sale de nuestra base en Xilitla. ` : "") +
        "No necesitas hospedarte con nosotros.",
    },
    {
      q: "¿Hay paquetes con hotel incluido?",
      a: `Sí: ${d.nPaquetes} paquetes de ${d.diasMin} a ${d.diasMax} días que incluyen las noches en el Hotel Paraíso Encantado, en Xilitla, junto con los recorridos. Desde ${d.desdePaquete}.`,
    },
    {
      q: "¿Me puedo hospedar en Aquismón o en Tamasopo?",
      a: "Sí, y te quedas más cerca de Tamul y los sótanos (Aquismón) o del Puente de Dios (Tamasopo). Solo ten en cuenta que nuestros recorridos pasan por ti a tu hospedaje en Xilitla o en Ciudad Valles: si vas a dormir en otro pueblo, escríbenos antes de reservar.",
    },
    {
      q: "¿Qué tan lejos está el Hotel Paraíso Encantado de Las Pozas?",
      a: `A ${d.metros} metros: unos ${d.minutosAPie} minutos a pie.`,
    },
  ],

  ctaTitulo: "¿Ya sabes dónde dormir?",
  ctaTexto: "Dinos tus fechas y dónde te hospedas, y te decimos qué recorridos te quedan mejor.",
  ctaReservar: "Ver tours y fechas",
  ctaWhatsApp: "Escríbenos por WhatsApp",
  waMensaje:
    "Hola, estoy viendo dónde hospedarme en la Huasteca Potosina.\nLlegada: \nSalida: \nPersonas: \n¿Qué zona y qué tours me recomiendan?",
  sigueLeyendo: "Sigue leyendo",
  enlaceCascadas: "Las cascadas de la Huasteca Potosina, comparadas",
  enlaceInfo: "Guía práctica: cómo llegar, clima y presupuesto",
  enlaceComparacion: "Xilitla o Ciudad Valles: la comparación completa",
  toursEnZona: (zona) => `Tours en ${zona}`,
};

/** Las categorías del sistema del hotel (`habitaciones.ts`) son nombres en español. */
const CATEGORIAS_EN: Record<string, string> = {
  "Suite King": "King suite",
  "Suite doble": "Double suite",
  "Suite familiar": "Family suite",
  "Suite con vista a la montaña": "Mountain-view suite",
  "Suite con spa privado": "Suite with a private spa",
};

const EN: DondeHospedarseContent = {
  // 50 characters.
  metaTitle: "Where to Stay in Huasteca Potosina: Areas & Hotels",
  metaDescription:
    "Xilitla, Ciudad Valles, Aquismón or Tamasopo: what's close to each base, drive times to the main sights, which tours pick you up, and our hotel in Xilitla.",
  ogTitle: "Where to stay in Huasteca Potosina, area by area",
  breadcrumb: "Where to stay",
  eyebrow: "Area guide · Xilitla · Ciudad Valles · Aquismón · Tamasopo",
  h1: "Where to stay in Huasteca Potosina",
  respuestaEtiqueta: "The short answer",
  respuesta: ({ vallesXilitla, micos, tamul, enLasDos, total }) =>
    "If you're coming for Edward James's Las Pozas, the town itself (a Pueblo Mágico, or Magic Town) and the mountains, stay in Xilitla. " +
    "If you're mostly here for the waterfalls, stay in Ciudad Valles, the gateway to the region" +
    (micos && tamul ? `: from there Micos is ${micos} away and Tamul ${tamul}. ` : ". ") +
    `The two are ${vallesXilitla} apart on a mountain road, and ${enLasDos} of our ${total} tours pick you up in either one. ` +
    "Aquismón (next to Tamul and the sinkholes) and Tamasopo (next to Puente de Dios) put you closer to those spots, but our tours pick up in Xilitla or Ciudad Valles.",

  tablaZonasTitulo: "The four areas at a glance",
  tablaZonasCabeceras: ["Area", "Best if…", "From Ciudad Valles to its sights", "Do we pick you up?"],
  recogidaCorta: ({ zona, n, total }) =>
    zona === "xilitla" || zona === "ciudad-valles"
      ? `Yes, on ${n} of ${total} tours`
      : "No: in Xilitla or Ciudad Valles",
  zonas: {
    xilitla: {
      idealPara: "You're coming for Las Pozas, the Magic Town, the mountains and the cloud forest",
      texto:
        "The mountain Magic Town that's home to Edward James's surrealist garden. The tours with their own schedule leave from here and pick up only in Xilitla — and our hotel is here too.",
    },
    "ciudad-valles": {
      idealPara: "You're here for the waterfalls and want the best road and bus connections",
      texto:
        "The gateway to the region, with the widest choice of lodging and services. It's the closest base to the waterfalls and where the buses from Mexico City and Monterrey arrive.",
    },
    aquismon: {
      idealPara: "You want to sleep next to Tamul, the Tampaón River and the sinkholes",
      texto: "",
    },
    tamasopo: {
      idealPara: "You want to sleep next to Puente de Dios and the Tamasopo waterfalls",
      texto:
        "On the highway from Ciudad Valles to San Luis Potosí. This is where you'll find Puente de Dios and the waterfalls on our Water Route tour.",
    },
  },
  zonaPorZonaTitulo: "Area by area",
  lugaresDeLaZona: "Sights in the area (and the drive from Ciudad Valles)",
  desdeValles: "From Ciudad Valles",
  pasamosPorTi: "Do we pick you up?",
  recogidaXilitla: ({ n, total, base }) =>
    `Yes. ${n} of our ${total} tours pick you up at your lodging${base ? `, and the ${base} starts at our base in town` : ""}.`,
  recogidaValles: ({ n, total, cargo }) =>
    `Yes, on ${n} of our ${total} tours${cargo ? ` (${cargo})` : ""}. The Xilitla tours with their own schedule can come for you too, at an additional cost we'll quote on WhatsApp.`,
  recogidaFuera:
    "No: our tours pick you up at your lodging in Xilitla or Ciudad Valles. If you plan to stay here, message us before you book.",
  vallesXilitlaFrase: (t) => `To Ciudad Valles: ${t} on a mountain road.`,

  tiemposTitulo: "Drive times to the main sights",
  tiemposIntro: (t) =>
    `From the two bases where we pick you up. Ciudad Valles and Xilitla are ${t} apart on a mountain road.`,
  tiemposCabeceras: ["Sight", "Municipality", "From Ciudad Valles", "From Xilitla", "Tour that visits it"],
  enElPueblo: "in town",
  seCombinaCon: "Pairs well with",
  tiemposNota: "Approximate driving times.",

  hotelTitulo: "Our hotel in Xilitla: Hotel Paraíso Encantado",
  hotelTexto: ({ zona, metros, minutos, restaurante, horario }) =>
    `It's our own hotel and where our packages stay. It's in ${zona}, in Xilitla, ${metros} m from Edward James's Las Pozas (a ${minutos}-minute walk), and ${restaurante}, our Huastec restaurant, is right inside — open ${horario}.`,
  serviciosTitulo: "Amenities",
  habitacionesTitulo: "Room types",
  categoriaHabitacion: (c) => CATEGORIAS_EN[c] ?? c,
  hastaPersonas: (n) => `sleeps up to ${n}`,
  hotelAutobus:
    "Arriving on the morning bus? You get your room on arrival if it's free; if not, leave your bags at reception and the tour van picks you up right there.",
  hotelNoObligatorio:
    "You don't need to stay with us to take a tour: we pick you up at any lodging in Xilitla.",
  hotelTarifas: "Ask us for rates and availability on WhatsApp with your dates.",
  ctaDisponibilidad: "Check availability",
  ctaSitioHotel: "Visit the hotel's website",

  paquetesTitulo: "Packages with the hotel included",
  paquetesIntro: (n) =>
    `If you'd rather sort out lodging and tours in one go, ${n === 1 ? "this package includes" : `these ${n} packages include`} your nights at our hotel in Xilitla along with the tours.`,
  diasNoches: (d, n) => `${d} days / ${n} nights`,
  nRecorridos: (n) => `${n} ${n === 1 ? "tour" : "tours"}`,
  verPaquete: "See package",

  toursTitulo: "Which tours pick you up, depending on where you stay",
  toursIntro: "Pickup is part of the tour: you don't have to drive to a meeting point.",
  grupoDos: "Pick you up in Xilitla or Ciudad Valles",
  grupoSoloXilitla: "Pick you up in Xilitla only",
  grupoBase: "Start at our base in Xilitla",
  desde: (monto, unidad) => `from ${monto} ${unidad}`,
  verTodosTours: (n) => `See all ${n} tours`,

  faqTitulo: "Where to stay: frequently asked questions",
  faq: (d) => [
    {
      q: "Where is the best place to stay in Huasteca Potosina?",
      a:
        "It depends on what you're coming for. For Edward James's Las Pozas and the mountains, Xilitla. For the waterfalls, Ciudad Valles" +
        (d.micos && d.tamul ? `, where Micos is ${d.micos} away and Tamul ${d.tamul}` : "") +
        `. The two are ${d.vallesXilitlaPalabras} apart on a mountain road, and ${d.enLasDos} of our ${d.total} tours pick you up in either one.`,
    },
    {
      q: "How far is Xilitla from Ciudad Valles?",
      a: `About ${d.vallesXilitlaPalabras} by car, on a winding mountain road that often gets foggy — best driven in daylight.`,
    },
    {
      q: "Do the tours pick me up at my hotel?",
      a:
        `Yes. ${d.enLasDos} of our ${d.total} tours pick you up at your lodging in Xilitla or Ciudad Valles` +
        (d.cargoValles ? ` (${d.cargoValles})` : "") +
        `. ${d.soloXilitla ? `${d.soloXilitla} pick up in Xilitla only; from Ciudad Valles the transfer costs extra and we'll quote it on WhatsApp. ` : ""}` +
        (d.baseXilitla ? `The ${d.baseXilitla} starts at our base in Xilitla. ` : "") +
        "You don't need to stay with us.",
    },
    {
      q: "Are there packages with the hotel included?",
      a: `Yes: ${d.nPaquetes} packages of ${d.diasMin} to ${d.diasMax} days that include your nights at Hotel Paraíso Encantado, in Xilitla, along with the tours. From ${d.desdePaquete}.`,
    },
    {
      q: "Can I stay in Aquismón or Tamasopo?",
      a: "Yes, and you'll be closer to Tamul and the sinkholes (Aquismón) or to Puente de Dios (Tamasopo). Just keep in mind that our tours pick you up at your lodging in Xilitla or Ciudad Valles: if you'll be sleeping in another town, message us before you book.",
    },
    {
      q: "How far is Hotel Paraíso Encantado from Las Pozas?",
      a: `${d.metros} meters — about a ${d.minutosAPie}-minute walk.`,
    },
  ],

  ctaTitulo: "Know where you'll stay?",
  ctaTexto: "Tell us your dates and where you're staying, and we'll tell you which tours fit best.",
  ctaReservar: "See tours and dates",
  ctaWhatsApp: "Message us on WhatsApp",
  waMensaje:
    "Hi! I'm figuring out where to stay in Huasteca Potosina.\nCheck-in: \nCheck-out: \nGuests: \nWhich area and which tours would you recommend?",
  sigueLeyendo: "Keep reading",
  enlaceCascadas: "Huasteca Potosina waterfalls, compared",
  enlaceInfo: "Practical guide: getting here, weather and budget",
  enlaceComparacion: "Xilitla or Ciudad Valles: the full comparison",
  toursEnZona: (zona) => `Tours in ${zona}`,
};

export function getDondeHospedarse(locale: Locale): DondeHospedarseContent {
  return locale === "en" ? EN : ES;
}

export { lista as listaHospedaje };
