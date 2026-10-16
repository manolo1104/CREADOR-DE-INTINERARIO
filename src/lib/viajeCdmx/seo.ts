/**
 * Lo que el viaje CDMX–Xilitla le cuenta a Google y a los asistentes de IA
 * (16 oct 2026): las preguntas de quien busca «huasteca potosina desde cdmx»,
 * la comparación con ir por tu cuenta y los lugares del itinerario.
 *
 * Solo para el servidor (lee el catálogo de tours y de destinos). Lo que el
 * viaje dice de sí mismo sigue en `config.ts`; aquí van las respuestas que
 * cruzan el viaje con el resto del sitio.
 *
 * 🔴 Ninguna cifra se escribe a mano: el precio del viaje sale de la base, el de
 * los recorridos de `TOURS_DB`, el autobús de `AUTOBUS_CDMX`, los tiempos de
 * `tiemposDeViaje.ts` y la temporada de `temporada.ts`. Si una cambia, cambian
 * la página, el marcado y llms.txt a la vez.
 */
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { AUTOBUS_CDMX } from "@/lib/ciudadesOrigen";
import { tiempoDesde, MINUTOS_VALLES_XILITLA, horasEnPalabras } from "@/lib/tiemposDeViaje";
import { fechaInicioTexto } from "@/lib/temporada";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import { SITE } from "@/lib/i18n/config";
import { pesos, pesosEn, rangoLargo, rangoLargoEn } from "./precio";
import { DURACION_TEXTO_EN, NOCHES_TEXTO_EN, REGRESO_TEXTO_EN, VIAJE_RUTA_EN } from "./en";
import type { SalidaVista } from "./salidas";
import {
  ANTICIPO_PCT, CAPACIDAD_INICIAL, DESAYUNOS, DURACION_TEXTO, HORA_CITA, HORA_LLEGADA, HORA_REGRESO, NOCHES_CUALES, NOCHES_TEXTO,
  PUNTO_SALIDA, REGRESO_TEXTO, SALIDA_TEXTO, SUPLEMENTO_PRIVADO, VIAJE_RUTA, type PreguntaFrecuente,
} from "./config";

/** Los dos recorridos que van incluidos, con su precio de lista por persona. */
const SLUG_TAMUL = "expedicion-tamul";
const SLUG_SURREALISTA = "ruta-surrealista-edward-james";

function tour(slug: string) {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`viajeCdmx/seo: el recorrido «${slug}» ya no está en TOURS_DB`);
  return t;
}

export const TOUR_TAMUL = tour(SLUG_TAMUL);
export const TOUR_SURREALISTA = tour(SLUG_SURREALISTA);

/** Fechas que se pueden apartar hoy. */
export function vendibles(salidas: SalidaVista[]): SalidaVista[] {
  return salidas.filter((s) => s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos");
}

/** «20 al 23 de noviembre y 11 al 14 de diciembre» */
function listaFechas(salidas: SalidaVista[]): string {
  const r = salidas.slice(0, 3).map((s) => rangoLargo(s.fechaSalida, s.fechaRegreso));
  return r.length > 1 ? `${r.slice(0, -1).join(", ")} y ${r[r.length - 1]}` : r[0] ?? "";
}

/**
 * La ficha del viaje en renglones: la página la pinta y llms.txt la copia.
 * Es lo que un asistente cita cuando le preguntan «¿qué tour hay a la
 * Huasteca desde la CDMX?».
 */
export function fichaViaje(salidas: SalidaVista[]): { dato: string; valor: string }[] {
  const v = vendibles(salidas);
  const desde = v.length ? Math.min(...v.map((s) => s.precioVigente)) : null;
  return [
    { dato: "Qué es", valor: "Salida grupal mensual desde la Ciudad de México a Xilitla, en la Huasteca Potosina, con todo organizado" },
    { dato: "Duración", valor: `${DURACION_TEXTO} de hotel: sales el viernes a la medianoche y regresas ${REGRESO_TEXTO}` },
    // «Viernes a la medianoche» se puede leer como la noche del jueves: la cita lo deja claro.
    { dato: "Punto de salida", valor: `${PUNTO_SALIDA.nombre}, CDMX: cita el viernes a las ${HORA_CITA} y salida a la medianoche` },
    { dato: "Transporte", valor: `Urvan con conductor, de ${CAPACIDAD_INICIAL} lugares, ida y vuelta y a todos los recorridos` },
    { dato: "Hospedaje", valor: `${NOCHES_TEXTO} (${NOCHES_CUALES}) en el ${HOTEL_PROPIO.nombre}, nuestro hotel en Xilitla, a ${HOTEL_PROPIO.minutosCaminando} minutos caminando de Las Pozas: cuarto compartido o cuarto privado con cama king` },
    { dato: "Recorridos", valor: "Ruta Surrealista (Las Pozas de Edward James, Huichihuayán, Cueva de las Quilas, Castillo de la Salud) y Expedición Tamul (cascada de Tamul en canoa, Cueva del Agua, Sótano de las Huahuas)" },
    { dato: "Comidas", valor: `${DESAYUNOS} desayunos en ${HOTEL_PROPIO.restaurante}; comidas y cenas aparte` },
    {
      dato: "Precio",
      valor: desde
        ? `${pesos(desde)} MXN por persona en cuarto compartido y ${pesos(desde + SUPLEMENTO_PRIVADO)} en cuarto privado con cama king, todo lo anterior incluido; apartas con el ${ANTICIPO_PCT} %`
        : `Se publica con cada fecha; apartas con el ${ANTICIPO_PCT} %`,
    },
    { dato: "Próximas fechas", valor: v.length ? listaFechas(v) : "Una salida al mes; las fechas se publican en esta página" },
  ];
}

/** Un renglón de «por tu cuenta o con el viaje». */
export interface RenglonComparacion {
  concepto: string;
  tuCuenta: string;
  /** Lo que cuesta por tu cuenta, por persona, si se sabe. */
  costo?: [number, number];
  conViaje: string;
}

/**
 * Ir por tu cuenta contra ir en el viaje, con precios públicos: el autobús es
 * aproximado y los recorridos son su precio de lista para 1 o 2 personas.
 * El hotel NO lleva cifra: depende de la habitación y la temporada, y una cifra
 * inventada aquí sería justo lo que una IA citaría con nuestra firma.
 */
export function porTuCuenta(): RenglonComparacion[] {
  return [
    {
      concepto: "Llegar desde la CDMX",
      tuCuenta: `Autobús nocturno de la ${AUTOBUS_CDMX.terminal} (${AUTOBUS_CDMX.hora}), ${pesos(AUTOBUS_CDMX.min)}–${pesos(AUTOBUS_CDMX.max)} por trayecto; o manejar ${tiempoDesde("cdmx")?.autoXilitla ?? "7 h"}, con el tramo final de sierra`,
      costo: [AUTOBUS_CDMX.min * 2, AUTOBUS_CDMX.max * 2],
      conViaje: `Urvan desde el ${PUNTO_SALIDA.nombre}, de noche: duermes en el camino`,
    },
    {
      concepto: "Moverte allá",
      // «Poco más de una hora»: lo mismo que dice /xilitla-o-ciudad-valles (~1 h 15 min).
      tuCuenta: "Tamul queda a poco más de una hora de Xilitla: sin auto dependes de taxis o de un tour",
      conViaje: "Todos los traslados incluidos",
    },
    {
      concepto: "Las Pozas y la Ruta Surrealista",
      tuCuenta: `Contratar la Ruta Surrealista aparte: ${pesos(TOUR_SURREALISTA.precio)} por persona`,
      costo: [TOUR_SURREALISTA.precio, TOUR_SURREALISTA.precio],
      conViaje: "Incluida, con guía y entradas",
    },
    {
      concepto: "Cascada de Tamul",
      tuCuenta: `Contratar la Expedición Tamul aparte: ${pesos(TOUR_TAMUL.precio)} por persona`,
      costo: [TOUR_TAMUL.precio, TOUR_TAMUL.precio],
      conViaje: "Incluida, con canoa, guía y equipo",
    },
    {
      concepto: `Hotel (${NOCHES_TEXTO}) y desayunos`,
      tuCuenta: "Buscar, reservar y pagar aparte",
      conViaje: `${HOTEL_PROPIO.nombre} y ${DESAYUNOS} desayunos en ${HOTEL_PROPIO.restaurante}`,
    },
  ];
}

/** Lo que cuesta, por persona, lo que SÍ tiene precio público al ir por tu cuenta (sin hotel). */
export function costoPorTuCuenta(): [number, number] {
  return porTuCuenta().reduce<[number, number]>((acc, r) => (r.costo ? [acc[0] + r.costo[0], acc[1] + r.costo[1]] : acc), [0, 0]);
}

/**
 * Las preguntas de quien busca la Huasteca desde la CDMX, con la respuesta
 * corta primero (es lo que extraen Google y los asistentes). Van al acordeón
 * de la página y a su FAQPage.
 */
export function preguntasCdmx(salidas: SalidaVista[]): PreguntaFrecuente[] {
  const v = vendibles(salidas);
  const desde = v.length ? Math.min(...v.map((s) => s.precioVigente)) : null;
  const [min, max] = costoPorTuCuenta();
  const auto = tiempoDesde("cdmx")?.autoXilitla ?? "7 h";
  return [
    {
      pregunta: "¿Cuánto cuesta ir a la Huasteca Potosina desde la CDMX?",
      respuesta:
        (desde
          ? `Con nuestro viaje, desde ${pesos(desde)} por persona con todo incluido: transporte redondo, ${NOCHES_TEXTO} de hotel en Xilitla, ${DESAYUNOS} desayunos y dos recorridos con guía (Las Pozas y Tamul). `
          : `Con nuestro viaje, un solo precio por persona que incluye transporte redondo, ${NOCHES_TEXTO} de hotel en Xilitla, ${DESAYUNOS} desayunos y dos recorridos con guía; se publica con cada fecha. `) +
        `Por tu cuenta, solo el autobús redondo (${pesos(AUTOBUS_CDMX.min * 2)}–${pesos(AUTOBUS_CDMX.max * 2)}) y esos dos recorridos (${pesos(TOUR_SURREALISTA.precio)} y ${pesos(TOUR_TAMUL.precio)}) suman ${pesos(min)}–${pesos(max)} por persona, antes de hotel, desayunos y traslados.`,
    },
    {
      // Lo que distingue al viaje, medido contra una docena de salidas desde la
      // CDMX el 15 oct 2026: casi todas duermen en Ciudad Valles o Aquismón.
      pregunta: "¿Qué tiene de distinto este viaje?",
      respuesta: `Que duermes en Xilitla, el Pueblo Mágico de Las Pozas, en nuestro propio hotel: la mayoría de los viajes desde la CDMX duermen en Ciudad Valles o en Aquismón. Y llegas de regreso el lunes a las ${HORA_REGRESO}, a tiempo para ir a trabajar. El grupo es de máximo ${CAPACIDAD_INICIAL} personas en Urvan, no un autobús lleno, y los recorridos los operamos nosotros, desde Xilitla.`,
    },
    {
      pregunta: "¿Cuántas horas son de la CDMX a Xilitla?",
      respuesta: `Unas ${auto} en auto (cerca de ${tiempoDesde("cdmx")?.km ?? 430} km, las últimas dos horas son sierra). En el viaje sales ${SALIDA_TEXTO} y llegas a Xilitla a las ${HORA_LLEGADA} del sábado: el camino se hace dormido y no pierdes ningún día.`,
    },
    {
      pregunta: "¿Cada cuándo hay salidas desde la CDMX?",
      respuesta: v.length
        ? `Una salida al mes, de viernes a domingo: llegas de vuelta el lunes a las ${HORA_REGRESO}. Las próximas: ${listaFechas(v)}. Cada salida lleva máximo ${CAPACIDAD_INICIAL} personas.`
        : `Una salida al mes, de viernes a domingo, con máximo ${CAPACIDAD_INICIAL} personas. Las fechas se publican en esta página; si te anotas en la lista, te avisamos primero.`,
    },
    {
      pregunta: "¿Conviene ir en autobús, en auto o en un viaje organizado?",
      respuesta: `En autobús es lo más barato, pero te deja en la terminal y allá tienes que moverte por tu cuenta: Tamul y Las Pozas están en lados distintos de la Huasteca. En auto tienes libertad, pero el tramo final es sierra con curvas y neblina. En el viaje organizado no manejas ni coordinas nada: sales del ${PUNTO_SALIDA.nombre} y todo lo demás está resuelto.`,
    },
    {
      pregunta: "¿Por qué dormir en Xilitla y no en Ciudad Valles?",
      respuesta: `Porque Xilitla es el Pueblo Mágico de Las Pozas: el ${HOTEL_PROPIO.nombre} está a ${HOTEL_PROPIO.minutosCaminando} minutos caminando del jardín de Edward James, en plena sierra. Desde Ciudad Valles, Xilitla queda a ${horasEnPalabras(MINUTOS_VALLES_XILITLA)} de carretera por trayecto. A Tamul te llevamos nosotros.`,
    },
    {
      pregunta: "¿Cuál es la mejor época para ir a la Huasteca desde la CDMX?",
      respuesta: `Hay salidas todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara, y el turquesa más intenso es de marzo a mayo, cuando más gente hay. De julio a octubre las cascadas van a todo caudal y el agua puede bajar con sedimento.`,
    },
  ];
}

/** Los lugares del itinerario con su ficha en el sitio, para el marcado. */
const LUGARES_SLUGS = [
  "xilitla-pueblo-magico",
  "las-pozas-jardin-surrealista",
  "nacimiento-huichihuayan",
  "castillo-de-la-salud",
  "cascada-de-tamul",
  "sotano-de-las-huahuas",
];

export function lugaresDelViaje() {
  return LUGARES_SLUGS.map((slug) => DESTINOS_DB.find((d) => d.slug === slug))
    .filter((d): d is (typeof DESTINOS_DB)[number] => Boolean(d))
    .map((d) => ({
      "@type": "TouristAttraction",
      name: d.nombre,
      url: `${SITE}/destinos/${d.slug}`,
      geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
    }));
}

/** El punto de salida como `Place`, para `tripOrigin`. */
export function lugarDeSalida() {
  return {
    "@type": "Place",
    name: `${PUNTO_SALIDA.nombre}, Ciudad de México`,
    address: { "@type": "PostalAddress", streetAddress: PUNTO_SALIDA.direccion, addressLocality: "Ciudad de México", addressCountry: "MX" },
    ...(PUNTO_SALIDA.lat != null && PUNTO_SALIDA.lng != null
      ? { geo: { "@type": "GeoCoordinates", latitude: PUNTO_SALIDA.lat, longitude: PUNTO_SALIDA.lng } }
      : {}),
  };
}

/** Texto para llms.txt: la ficha y la URL, en prosa corta. */
export function viajeParaLlms(salidas: SalidaVista[]): string {
  const filas = fichaViaje(salidas).map((f) => `- ${f.dato}: ${f.valor}.`);
  return [
    `Viaje grupal mensual desde la CDMX (${SITE}${VIAJE_RUTA}): la forma de ir a la Huasteca Potosina desde la Ciudad de México sin manejar ni armar nada.`,
    ...filas,
    `- Regreso: ${REGRESO_TEXTO} (al ${PUNTO_SALIDA.nombre}).`,
    "- Si la salida no junta el grupo mínimo, el viajero elige otra fecha o el reembolso del 100 %.",
  ].join("\n");
}

// ── English (página /en, 16 oct 2026) ───────────────────────────────────────

function listaFechasEn(salidas: SalidaVista[]): string {
  const r = salidas.slice(0, 3).map((s) => rangoLargoEn(s.fechaSalida, s.fechaRegreso));
  return r.length > 1 ? `${r.slice(0, -1).join(", ")} and ${r[r.length - 1]}` : r[0] ?? "";
}

/** The trip as facts, for the English page and /en/llms.txt. */
export function fichaViajeEn(salidas: SalidaVista[], usd?: number | null): { dato: string; valor: string }[] {
  const v = vendibles(salidas);
  const desde = v.length ? Math.min(...v.map((s) => s.precioVigente)) : null;
  const enDolares = (n: number) => (usd ? ` (≈ US$${Math.round(n / usd).toLocaleString("en-US")})` : "");
  return [
    { dato: "What it is", valor: "A monthly small-group trip from Mexico City to Xilitla, in the Huasteca Potosina, with everything arranged" },
    { dato: "Length", valor: `${DURACION_TEXTO_EN} at a hotel: you leave Friday at midnight and come back ${REGRESO_TEXTO_EN}` },
    { dato: "Meeting point", valor: `Angel of Independence, Paseo de la Reforma, Mexico City (a short walk from Juárez, Roma and Condesa): meet Friday at ${HORA_CITA}, we leave at midnight` },
    { dato: "Transport", valor: `${CAPACIDAD_INICIAL}-seat Nissan Urvan with a professional driver, there and back and to every tour` },
    { dato: "Stay", valor: `${NOCHES_TEXTO_EN} (Saturday) at ${HOTEL_PROPIO.nombre}, our own hotel in Xilitla, a ${HOTEL_PROPIO.minutosCaminando}-minute walk from Las Pozas: shared room or private room with a king bed` },
    { dato: "Tours", valor: "Surrealist Route (Edward James's Las Pozas, Huichihuayán spring, Quilas cave, Castillo de la Salud) and Tamul Expedition (canoe to Tamul waterfall, Cueva del Agua, Sótano de las Huahuas)" },
    { dato: "Meals", valor: `${DESAYUNOS} breakfasts at ${HOTEL_PROPIO.restaurante}; lunches and dinners on your own` },
    { dato: "Language", valor: "Guided in Spanish, with basic English help from the guides" },
    {
      dato: "Price",
      valor: desde
        ? `${pesosEn(desde)}${enDolares(desde)} per person in a shared room, ${pesosEn(desde + SUPLEMENTO_PRIVADO)}${enDolares(desde + SUPLEMENTO_PRIVADO)} in a private room with a king bed; charged in Mexican pesos, book with ${ANTICIPO_PCT}%`
        : `Published with each date; book with ${ANTICIPO_PCT}%`,
    },
    { dato: "Next dates", valor: v.length ? listaFechasEn(v) : "One departure a month; dates are published on this page" },
  ];
}

/** Doing it on your own vs. the trip, in English. */
export function porTuCuentaEn(): RenglonComparacion[] {
  return [
    {
      concepto: "Getting there from Mexico City",
      tuCuenta: `Overnight bus from the ${AUTOBUS_CDMX.terminal} (${AUTOBUS_CDMX.hora}), ${pesosEn(AUTOBUS_CDMX.min)}–${pesosEn(AUTOBUS_CDMX.max)} each way; or a ${tiempoDesde("cdmx")?.autoXilitlaEn ?? "7 h"} drive ending on a mountain road`,
      costo: [AUTOBUS_CDMX.min * 2, AUTOBUS_CDMX.max * 2],
      conViaje: "Urvan from the Angel of Independence, overnight: you sleep on the way",
    },
    {
      concepto: "Getting around",
      tuCuenta: "Tamul is a little over an hour from Xilitla: without a car you depend on taxis or a tour",
      conViaje: "Every transfer included",
    },
    {
      concepto: "Las Pozas and the Surrealist Route",
      tuCuenta: `Booking the Surrealist Route separately: ${pesosEn(TOUR_SURREALISTA.precio)} per person`,
      costo: [TOUR_SURREALISTA.precio, TOUR_SURREALISTA.precio],
      conViaje: "Included, with guide and entry fees",
    },
    {
      concepto: "Tamul waterfall",
      tuCuenta: `Booking the Tamul Expedition separately: ${pesosEn(TOUR_TAMUL.precio)} per person`,
      costo: [TOUR_TAMUL.precio, TOUR_TAMUL.precio],
      conViaje: "Included, with canoe, guide and gear",
    },
    {
      concepto: `Hotel (${NOCHES_TEXTO_EN}) and breakfasts`,
      tuCuenta: "Find, book and pay separately",
      conViaje: `${HOTEL_PROPIO.nombre} and ${DESAYUNOS} breakfasts at ${HOTEL_PROPIO.restaurante}`,
    },
  ];
}

/** What people in Mexico City ask before going, in English. */
export function preguntasCdmxEn(salidas: SalidaVista[], usd?: number | null): PreguntaFrecuente[] {
  const v = vendibles(salidas);
  const desde = v.length ? Math.min(...v.map((s) => s.precioVigente)) : null;
  const [min, max] = costoPorTuCuenta();
  const enDolares = (n: number) => (usd ? ` (about US$${Math.round(n / usd).toLocaleString("en-US")})` : "");
  return [
    {
      pregunta: "Is there a tour to the Huasteca Potosina from Mexico City?",
      respuesta: `Yes. Our small-group trip leaves the Angel of Independence once a month, Friday at midnight, and comes back ${REGRESO_TEXTO_EN}. It includes transport, ${NOCHES_TEXTO_EN} at our hotel in Xilitla, ${DESAYUNOS} breakfasts, Edward James's Las Pozas and Tamul waterfall with a guide.`,
    },
    {
      pregunta: "How much does it cost to visit the Huasteca Potosina from Mexico City?",
      respuesta:
        (desde
          ? `With our trip, ${pesosEn(desde)}${enDolares(desde)} per person with everything included in a shared room. `
          : "With our trip, one price per person with everything included, published with each date. ") +
        `On your own, the round-trip bus alone (${pesosEn(AUTOBUS_CDMX.min * 2)}–${pesosEn(AUTOBUS_CDMX.max * 2)}) plus those two tours add up to ${pesosEn(min)}–${pesosEn(max)} per person, before hotel, breakfasts and local transport.`,
    },
    {
      pregunta: "How far is Xilitla from Mexico City?",
      respuesta: `About ${tiempoDesde("cdmx")?.autoXilitlaEn ?? "7 h"} by road (around ${tiempoDesde("cdmx")?.km ?? 430} km; the last two hours are mountain road). On the trip you leave Friday at midnight and reach Xilitla at ${HORA_LLEGADA} on Saturday: you sleep through the drive.`,
    },
    {
      pregunta: "Why stay in Xilitla?",
      respuesta: `Xilitla is the Pueblo Mágico of Las Pozas, Edward James's surrealist garden: ${HOTEL_PROPIO.nombre} is a ${HOTEL_PROPIO.minutosCaminando}-minute walk from it. Most trips from Mexico City sleep in Ciudad Valles or Aquismón instead, ${MINUTOS_VALLES_XILITLA === 90 ? "an hour and a half" : `${MINUTOS_VALLES_XILITLA} minutes`} from Xilitla each way. We take you to Tamul.`,
    },
    {
      pregunta: "When is the best time to go?",
      respuesta: `There are departures all year. From ${fechaInicioTexto("en")} to May the water runs clear, and the turquoise is at its most intense from March to May, the busiest time. From July to October the waterfalls run at full force and the water can carry sediment.`,
    },
  ];
}

/** The trip block for /en/llms.txt. */
export function viajeParaLlmsEn(salidas: SalidaVista[]): string {
  const filas = fichaViajeEn(salidas).map((f) => `- ${f.dato}: ${f.valor}.`);
  return [
    `Monthly group trip from Mexico City (${SITE}${VIAJE_RUTA_EN}): the way to visit the Huasteca Potosina from Mexico City without driving or planning anything.`,
    ...filas,
    "- If a departure doesn't reach the minimum group, travelers choose another date or a 100% refund.",
  ].join("\n");
}
