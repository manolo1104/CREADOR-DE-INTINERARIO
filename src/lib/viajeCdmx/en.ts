/**
 * The CDMX–Xilitla trip in English (16 oct 2026): the page at
 * /en/huasteca-potosina-from-mexico-city, for foreigners living in or visiting
 * Mexico City (Juárez, Roma and Condesa are a short walk from the Angel).
 *
 * Same trip, same photos and same numbers as `config.ts` — every hour, count
 * and price is read from there, never typed here. If the Spanish itinerary
 * changes, this file changes with it.
 */
import {
  CAPACIDAD_INICIAL, DESAYUNOS, HORA_CITA, HORA_LLEGADA, HORA_REGRESO, HORA_SALIDA, HORA_SALIDA_REGRESO, INCLUIDO, ITINERARIO, NOCHES,
  type DiaItinerario, type Incluido,
} from "./config";

export const VIAJE_RUTA_EN = "/en/huasteca-potosina-from-mexico-city";
export const VIAJE_NOMBRE_EN = "Mexico City to Xilitla weekend trip";

export const NOCHES_TEXTO_EN = `${NOCHES} night${NOCHES === 1 ? "" : "s"}`;
export const DURACION_TEXTO_EN = `2 days and ${NOCHES_TEXTO_EN}`;
export const REGRESO_TEXTO_EN = `on Sunday night, arriving in Mexico City on Monday at ${HORA_REGRESO}`;

/** The itinerary, moment by moment, on the same photos as the Spanish one. */
export const ITINERARIO_EN: DiaItinerario[] = [
  {
    ...ITINERARIO[0],
    diaSemana: "Saturday",
    titulo: "Arrive in Xilitla + the Surrealist Route",
    momentos: [
      { hora: `Fri ${HORA_CITA}`, texto: "Meet us at the Angel of Independence." },
      { hora: HORA_SALIDA, texto: "We leave in a Nissan Urvan with a professional driver. You sleep on the way.", incluido: true },
      { hora: HORA_LLEGADA, texto: "Arrive in Xilitla at Hotel Paraíso Encantado and drop your bag.", incluido: true },
      { hora: "8:15 am", texto: "Breakfast at El Papán Huasteco, the hotel's restaurant.", incluido: true },
      { hora: "9:30 am", texto: "Surrealist Route with a guide: Edward James's Las Pozas, the Huichihuayán spring (you swim here), the Quilas cave and the Castillo de la Salud. Entry fees included.", incluido: true },
      { hora: "Afternoon", texto: "Back at the hotel: check-in and a free evening in the Pueblo Mágico." },
    ],
    alt: "The stairway to heaven at Edward James's Las Pozas, with the Xilitla mountains behind",
    fotos: [
      { src: ITINERARIO[0].fotos[0].src, alt: "The Huichihuayán spring: a turquoise pool between the trees" },
      { src: ITINERARIO[0].fotos[1].src, alt: "The Quilas cave: sunlight between the rock walls" },
      { src: ITINERARIO[0].fotos[2].src, alt: "The colorful towers of the Castillo de la Salud" },
    ],
  },
  {
    ...ITINERARIO[1],
    diaSemana: "Sunday",
    titulo: "Tamul Expedition + the ride back",
    momentos: [
      { hora: "8:00 am", texto: "Breakfast at El Papán Huasteco and check-out: your bag rides in the van.", incluido: true },
      { hora: "9:00 am", texto: "We head to the Tampaón River.", incluido: true },
      { texto: "Paddle a canoe up the Tampaón canyon to Tamul waterfall, the tallest in San Luis Potosí (105 m).", incluido: true },
      { texto: "Swim and jump into the Cueva del Agua, a turquoise sinkhole.", incluido: true },
      { texto: "Lunch on the road (not included: you choose where and how much)." },
      { hora: "Sunset", texto: "Sótano de las Huahuas: thousands of birds spiral back into a 478 m pit.", incluido: true },
      { hora: "Evening", texto: "Back in Xilitla. Dinner on your own in town." },
      { hora: HORA_SALIDA_REGRESO, texto: "We drive back to Mexico City. You sleep on the way.", incluido: true },
      { hora: `Mon ${HORA_REGRESO}`, texto: "Arrival at the Angel of Independence, in time for Monday." },
    ],
    alt: "Two travelers in front of Tamul waterfall",
    fotos: [
      { src: ITINERARIO[1].fotos[0].src, alt: "Tamul waterfall seen from the river" },
      { src: ITINERARIO[1].fotos[1].src, alt: "Jumping into the Cueva del Agua" },
      { src: ITINERARIO[1].fotos[2].src, alt: "Birds flying back into the Sótano de las Huahuas at sunset" },
    ],
  },
];

/** What's included, as photo cards. Same photos and order as `INCLUIDO`. */
const INCLUIDO_TEXTO_EN: Pick<Incluido, "titulo" | "detalle" | "alt">[] = [
  { titulo: "Round-trip transport", detalle: "A Nissan Urvan with a driver, from the Angel of Independence to Xilitla and back, plus every transfer to the tours.", alt: "The tour van in front of the hotel in Xilitla" },
  { titulo: `${NOCHES_TEXTO_EN} at Hotel Paraíso Encantado`, detalle: "Saturday night in Xilitla, a 5-minute walk from Las Pozas.", alt: "Hotel Paraíso Encantado, with its pool in the jungle" },
  { titulo: `${DESAYUNOS} breakfasts at El Papán Huasteco`, detalle: "Saturday and Sunday, at the hotel's restaurant, cooked over a wood fire.", alt: "Chilaquiles with arrachera at El Papán Huasteco" },
  { titulo: "Surrealist Route", detalle: "Edward James's Las Pozas, the Huichihuayán spring, the Quilas cave and the Castillo de la Salud, with a guide.", alt: "A traveler sitting among the structures of Las Pozas" },
  { titulo: "Tamul Expedition", detalle: "Canoe up the Tampaón canyon to Tamul waterfall, the Cueva del Agua and the Sótano de las Huahuas at sunset.", alt: "A group canoeing on the Tampaón River, between waterfalls" },
  { titulo: "Guides, entry fees and insurance", detalle: "NOM-09 certified guides, all entry fees, life jackets and helmets, first-aid kit and travel insurance.", alt: "A group with their guide on the riverbank" },
];
export const INCLUIDO_EN: Incluido[] = INCLUIDO.map((x, i) => ({ ...x, ...INCLUIDO_TEXTO_EN[i] }));

export const INCLUYE_EN: string[] = [
  "Round-trip transport Mexico City–Xilitla in a Nissan Urvan with a driver, from the Angel of Independence",
  "Every transfer to the tours",
  `${NOCHES_TEXTO_EN} at Hotel Paraíso Encantado (Saturday)`,
  `${DESAYUNOS} breakfasts at El Papán Huasteco (Saturday and Sunday)`,
  "Surrealist Route with a guide: Edward James's Las Pozas, Huichihuayán spring, Quilas cave and Castillo de la Salud",
  "Tamul Expedition: canoe up the Tampaón canyon, Tamul waterfall, Cueva del Agua and Sótano de las Huahuas",
  "Entry fees to every site on both tours",
  "NOM-09 SECTUR certified guides (tours in Spanish, with basic English help)",
  "Safety gear (life jackets and helmets) and first-aid kit",
  "Travel insurance for every traveler",
];

export const NO_INCLUYE_EN: string[] = [
  "Lunches and dinners: on the tours we stop where the food is good and everyone chooses",
  "Snacks and drinks at the stops",
  "Tips and personal expenses",
];

export const QUE_LLEVAR_EN: string[] = [
  "A travel pillow for Friday night",
  "Swimsuit, towel and a dry change of clothes",
  "Shoes that can get wet",
  "Biodegradable sunscreen and bug spray",
  "A light jacket (Xilitla cools down at night)",
  "Passport or ID",
  "Cash in pesos for meals and snacks",
];

export const CUPO_TEXTO_EN = `${CAPACIDAD_INICIAL} seats per departure`;

/** What we send to WhatsApp, with the date if one was picked. */
export function mensajeWhatsAppEn(fechaTexto?: string): string {
  return fechaTexto
    ? `Hi! I'm interested in the Mexico City–Xilitla trip on ${fechaTexto}.`
    : "Hi! I'm interested in the Mexico City–Xilitla trip.";
}
