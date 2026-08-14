/**
 * Landings de origen para el mercado estadounidense: `/en/from/<city>`.
 *
 * Hermanas de `ciudadesOrigen.ts`, y con su misma regla, que aquí es aún más
 * estricta: **una landing por ciudad sin datos ciertos de cómo llegar es una
 * página inventada**. Por eso cada ruta aérea de este archivo se verificó antes
 * de escribirla (14 ago 2026), y las cuatro ciudades salieron distintas:
 *
 *   · Houston (IAH) → Tampico (TAM): DIRECTO, United, ~1 h 54 min, 24 vuelos
 *     por semana. Es la mejor puerta de entrada de todo Texas.
 *   · Dallas-Fort Worth (DFW) → Tampico (TAM): DIRECTO, American, 733 millas
 *     (1,180 km), ~2 h 18 min. Es el vuelo más largo que sale de Tampico.
 *   · Austin (AUS) y San Antonio (SAT) NO tienen vuelo directo a Tampico. Su
 *     único directo a la zona es VivaAerobus a Monterrey (1 h 20 min desde AUS,
 *     1 h 10 min desde SAT) — pero Monterrey deja 6 horas de carretera por
 *     delante, así que la ruta buena es una escala en Houston o Dallas.
 *
 * Las distancias por carretera NO son nuevas: salen de `infoPractica.en.ts` y
 * de `ciudadesOrigen.ts`, que son las páginas donde ya viven auditadas.
 * Tampico → Ciudad Valles ~2 h; Tampico → Xilitla ~2.5 h; Monterrey → Ciudad
 * Valles ~6 h en auto y ~8 h en autobús; San Luis Potosí → Ciudad Valles ~3 h.
 *
 * ⚠️ Ningún horario, aerolínea o precio de vuelo se promete: se describe la
 * ruta y se marca como aproximada. Las aerolíneas cambian su malla cada
 * temporada y una landing no puede envejecer peor que el producto.
 */

export interface RutaLlegada {
  /** Etiqueta corta del modo: "Fly into Tampico (TAM) — best route". */
  modo: string;
  detalle: string;
  /** La ruta recomendada se pinta destacada. Solo una por ciudad. */
  mejor?: boolean;
}

export interface CiudadOrigenEn {
  slug: string;
  /** Nombre de la ciudad tal cual se escribe en una frase. */
  nombre: string;
  /** Aeropuerto de salida, con código IATA. */
  aeropuerto: string;
  /** Slug de `TRASLADOS` que le corresponde a su puerta de entrada mexicana. */
  trasladoSlug: string;
  /** Base recomendada en la Huasteca, y por qué. */
  base: "Xilitla" | "Ciudad Valles";
  razonBase: string;
  llegadas: RutaLlegada[];
  /** Slug del paquete que mejor le queda a esa distancia. */
  paqueteSugerido: string;
  faqs: { q: string; a: string }[];
}

// Texto que se repite en las cuatro y que describe el mismo tramo mexicano.
const TRAMO_TAMPICO =
  "From Tampico it's about a 2-hour drive to Ciudad Valles and about 2.5 hours to Xilitla. You can rent a car at the airport, or we can pick you up — our private transfer is priced per vehicle, round trip, for up to 12 passengers.";

export const CIUDADES_ORIGEN_EN: CiudadOrigenEn[] = [
  {
    slug: "houston",
    nombre: "Houston",
    aeropuerto: "George Bush Intercontinental (IAH)",
    trasladoSlug: "tampico",
    base: "Ciudad Valles",
    razonBase:
      "Landing in Tampico puts you two hours from Ciudad Valles, and from there Micos is 20 minutes away and Tamul about 45. If Las Pozas and Xilitla are what you came for, stay in Xilitla instead — it's another two hours south, and we pick you up in either town.",
    llegadas: [
      {
        modo: "Fly to Tampico (TAM) — the short way",
        mejor: true,
        detalle:
          "United flies nonstop from Houston (IAH) to Tampico in about 1 hour and 55 minutes, with roughly two dozen departures a week. It's the shortest hop from the United States into the Huasteca, and it skips Mexico City entirely. " +
          TRAMO_TAMPICO,
      },
      {
        modo: "Fly to Mexico City (MEX)",
        detalle:
          "More flights and often cheaper fares, but you trade the savings back for road time: Mexico City to Ciudad Valles is 267 miles (430 km) on the Mex-85 / MEX-70 toll highway, about 6.5 to 7 hours by car. Worth it only if you want a couple of days in the capital anyway.",
      },
      {
        modo: "Drive",
        detalle:
          "It's a long haul — Houston to the Huasteca is a two-day drive with a border crossing and a mountain stretch at the end. Almost everyone who asks us ends up flying to Tampico instead.",
      },
    ],
    paqueteSugerido: "completo",
    faqs: [
      {
        q: "Why fly to Tampico instead of Mexico City?",
        a: "Because of what happens after you land. Tampico is a 2-hour drive from Ciudad Valles; Mexico City is closer to 7. The nonstop from Houston is under two hours, so you can leave in the morning and be swimming under a waterfall the same afternoon.",
      },
      {
        q: "Do I need to rent a car?",
        a: "No. Every tour includes round-trip transportation from where you're staying in Xilitla or Ciudad Valles, and we run private airport transfers priced per vehicle. Plenty of our guests never touch a steering wheel. If you do rent, drive the mountain sections in daylight.",
      },
      {
        q: "How many days should I plan coming from Houston?",
        a: "Four days and three nights is the sweet spot: the flight is short enough that you don't lose a day getting there, so you get three full days of tours. Three days works if you're only doing the Ciudad Valles side.",
      },
      {
        q: "Do the guides speak English?",
        a: "Our guides are NOM-09 certified and we have fully bilingual guides available — ask for one when you book and we'll assign them to your group.",
      },
    ],
  },
  {
    slug: "dallas",
    nombre: "Dallas",
    aeropuerto: "Dallas–Fort Worth (DFW)",
    trasladoSlug: "tampico",
    base: "Ciudad Valles",
    razonBase:
      "Coming in through Tampico, Ciudad Valles is the closer base and it's where the waterfalls are: Micos at 20 minutes, Tamul at 45. Xilitla and Las Pozas are two hours further south — we pick you up in either one.",
    llegadas: [
      {
        modo: "Fly to Tampico (TAM) — the short way",
        mejor: true,
        detalle:
          "American Airlines flies nonstop from Dallas–Fort Worth to Tampico: 733 miles (1,180 km) in about 2 hours and 20 minutes. It's the longest route out of Tampico, and it's still shorter than driving from Mexico City. " +
          TRAMO_TAMPICO,
      },
      {
        modo: "Fly to Mexico City (MEX)",
        detalle:
          "More frequencies and often a cheaper fare, but Mexico City to Ciudad Valles is 267 miles (430 km), about 6.5 to 7 hours by road. It only pays off if you were going to spend time in the capital regardless.",
      },
      {
        modo: "Fly to Monterrey (MTY)",
        detalle:
          "A short flight into northern Mexico, but Monterrey leaves you about 6 hours from Ciudad Valles by car (around 8 by bus). The Tampico nonstop is the better trade almost every time.",
      },
    ],
    paqueteSugerido: "completo",
    faqs: [
      {
        q: "Is there a nonstop from Dallas to the Huasteca Potosina?",
        a: "There's no airport in the Huasteca itself. The closest one is Tampico (TAM), and American flies there nonstop from DFW in about 2 hours and 20 minutes. From Tampico it's a 2-hour drive to Ciudad Valles — we can pick you up at the terminal.",
      },
      {
        q: "How many days should I plan coming from Dallas?",
        a: "Four days and three nights is comfortable: the nonstop is short enough that arrival day still counts, leaving three full days of tours. Five days if you want both the Ciudad Valles waterfalls and Xilitla's surrealist garden without rushing.",
      },
      {
        q: "What does a trip actually cost once I'm there?",
        a: "Our multi-day packages include lodging, breakfasts, transportation to each site, every entrance fee and certified guides — and the package price covers two people, not one. You hold it with a 30% deposit and pay the balance on arrival.",
      },
      {
        q: "Do the guides speak English?",
        a: "Our guides are NOM-09 certified and we have fully bilingual guides available — ask for one when you book and we'll assign them to your group.",
      },
    ],
  },
  {
    slug: "austin",
    nombre: "Austin",
    aeropuerto: "Austin–Bergstrom (AUS)",
    trasladoSlug: "tampico",
    base: "Ciudad Valles",
    razonBase:
      "Whichever way you come in, Ciudad Valles is the base that costs you the least road time, and it's where the turquoise waterfalls are. Xilitla is two hours further south if Las Pozas is the reason you're coming.",
    llegadas: [
      {
        modo: "Connect through Houston or Dallas to Tampico (TAM)",
        mejor: true,
        detalle:
          "There's no nonstop from Austin to Tampico, but both Texas hubs have one — United from Houston (about 1 h 55 min) and American from Dallas (about 2 h 20 min). One stop gets you to the closest airport to the Huasteca. " +
          TRAMO_TAMPICO,
      },
      {
        modo: "Fly nonstop to Monterrey (MTY)",
        detalle:
          "VivaAerobus flies Austin to Monterrey nonstop in about 1 hour and 20 minutes. It's the only direct flight from Austin into the region — but Monterrey is still about 6 hours from Ciudad Valles by car, or 8 by bus. Take it if the fare difference is large and you don't mind the drive.",
      },
      {
        modo: "Fly to Mexico City (MEX)",
        detalle:
          "The most frequent option, but it leaves 267 miles (430 km) of road ahead of you — about 6.5 to 7 hours on the Mex-85 / MEX-70 toll highway to Ciudad Valles.",
      },
    ],
    paqueteSugerido: "completo",
    faqs: [
      {
        q: "Can I fly from Austin to the Huasteca Potosina without connecting?",
        a: "Not to Tampico, which is the closest airport. Austin's only nonstop into the region is VivaAerobus to Monterrey — but that leaves about a 6-hour drive. Connecting through Houston or Dallas to Tampico is usually faster door to door, and it ends with a 2-hour drive instead.",
      },
      {
        q: "Monterrey is cheaper. Is the drive worth it?",
        a: "Sometimes. Monterrey to Ciudad Valles is around 6 hours by car and about 8 by bus, but it's flat highway most of the way — not mountain road. If you were renting a car anyway and the fare gap is big, it's a reasonable trade. If you want to land and start, fly into Tampico.",
      },
      {
        q: "How many days should I plan coming from Austin?",
        a: "Plan on four days and three nights minimum, since you'll spend part of a day connecting. Five days if you want both the waterfalls around Ciudad Valles and Edward James' garden in Xilitla.",
      },
      {
        q: "Do the guides speak English?",
        a: "Our guides are NOM-09 certified and we have fully bilingual guides available — ask for one when you book and we'll assign them to your group.",
      },
    ],
  },
  {
    slug: "san-antonio",
    nombre: "San Antonio",
    aeropuerto: "San Antonio International (SAT)",
    trasladoSlug: "tampico",
    base: "Ciudad Valles",
    razonBase:
      "Ciudad Valles is the shortest transfer from every route in, and the turquoise waterfalls are on its doorstep. Xilitla, two hours south, is the base to pick if you're coming for Las Pozas.",
    llegadas: [
      {
        modo: "Connect through Houston or Dallas to Tampico (TAM)",
        mejor: true,
        detalle:
          "San Antonio has no nonstop to Tampico, but Houston and Dallas both do — United from IAH in about 1 h 55 min, American from DFW in about 2 h 20 min. One connection puts you at the closest airport to the Huasteca. " +
          TRAMO_TAMPICO,
      },
      {
        modo: "Fly nonstop to Monterrey (MTY)",
        detalle:
          "VivaAerobus flies San Antonio to Monterrey nonstop in about 1 hour and 10 minutes, roughly eight times a week. It's the fastest way into Mexico from San Antonio — but Monterrey is about 6 hours from Ciudad Valles by car, or 8 by bus.",
      },
      {
        modo: "Fly to Mexico City (MEX)",
        detalle:
          "The option with the most departures, at the cost of the longest drive: 267 miles (430 km) and about 6.5 to 7 hours to Ciudad Valles on the toll highway.",
      },
    ],
    paqueteSugerido: "completo",
    faqs: [
      {
        q: "What's the fastest way from San Antonio to the Huasteca Potosina?",
        a: "Connect through Houston or Dallas into Tampico (TAM), then drive about 2 hours to Ciudad Valles. The nonstop to Monterrey is a shorter flight — about 1 h 10 min — but it leaves roughly 6 hours of road afterward.",
      },
      {
        q: "I have family in San Luis Potosí. Can I come from there?",
        a: "Yes. The city of San Luis Potosí is about a 3-hour drive from Ciudad Valles, and we run a private round-trip transfer on that route too, priced per vehicle for up to 12 passengers. Tell us where you're starting and we'll build the trip around it.",
      },
      {
        q: "How many days should I plan coming from San Antonio?",
        a: "Four days and three nights at a minimum, since the trip in takes most of a day. Five days lets you cover both the Ciudad Valles waterfalls and Xilitla without spending your vacation in a van.",
      },
      {
        q: "Do the guides speak English?",
        a: "Our guides are NOM-09 certified and we have fully bilingual guides available — ask for one when you book and we'll assign them to your group.",
      },
    ],
  },
];

export function getCiudadOrigenEn(slug: string): CiudadOrigenEn | undefined {
  return CIUDADES_ORIGEN_EN.find((c) => c.slug === slug);
}
