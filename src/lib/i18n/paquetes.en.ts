import type { Locale } from "./config";
import { PAQUETES_DB, HABITACIONES, LOGISTICA, FAQS_PAQUETES, type Paquete, type Habitacion } from "@/lib/paquetes";

/**
 * Traducciones al inglés de los PAQUETES y de todo lo que los rodea (hotel,
 * cómo llegar, preguntas frecuentes).
 *
 * Mismo criterio que `tours.en.ts` y `destinos.en.ts`: solo los campos de cara
 * al usuario, indexados por slug, y lo que falte cae al español.
 *
 * ⚠️ Los números (precios, noches, días, suplementos, kilómetros, horarios de
 * autobús) NO se traducen: se copian tal cual del español. Ninguna cifra de este
 * archivo es nueva.
 *
 * Las RESEÑAS no se traducen a propósito: son de viajeros con nombre y ciudad, y
 * ponerles palabras en la boca en otro idioma no es traducir, es inventar. En
 * `/en` se enseñan con una etiqueta que avisa del idioma.
 */

export interface PaqueteTranslation {
  nombre?: string;
  subtitulo?: string;
  duracion?: string;
  precioLabel?: string;
  badge?: string;
  urgencia?: string;
  perfiles?: string[];
  tours?: string[];
  /** En el MISMO orden que el itinerario español. */
  itinerario?: { titulo?: string; descripcion?: string }[];
  eleccionTour?: { titulo?: string; opciones?: { nombre?: string; nota?: string }[] };
  /** En el MISMO orden que las fotos españolas; la ruta no se traduce. */
  galeriaExtra?: { titulo?: string; texto?: string; alt?: string[] };
  incluye?: string[];
  noIncluye?: string[];
  /** En el MISMO orden; el `precio` es una cifra y no se traduce. */
  valor?: string[];
}

const PAQUETES_EN: Record<string, PaqueteTranslation> = {
  "luna-de-miel": {
    nombre: "Honeymoon",
    subtitulo: "The Huasteca for two, unhurried",
    duracion: "3 days / 2 nights",
    precioLabel: "per couple",
    badge: "Honeymooners",
    urgencia: "Includes the Jungla suite with its spa pool and the romantic dinner on the second night",
    perfiles: ["Newlyweds", "Couples", "Anniversaries", "Easy pace"],
    tours: [
      "Las Pozas, Edward James' surrealist garden (Day 1)",
      "Tamul Expedition — Tamul, Water Cave and Sinkhole (Day 2)",
    ],
    galeriaExtra: {
      titulo: "The second night",
      texto: "While you are out at Tamul, the hotel team gets the room ready: petals, candles and the lights on. By the time you are back the table is set on your private terrace, with the lights of Xilitla below, your bottle ready and dinner being plated.",
      alt: [
        "The bed in the Jungla suite set with rose petals, heart-shaped string lights and towels folded into swans",
        "The private terrace table at dusk with candles, roses and two wine glasses, the lights of Xilitla behind",
        "A bottle of wine on ice beside the terrace table, candles lit and the sierra at night",
      ],
    },
    itinerario: [
      {
        titulo: "Arrival, check-in and Edward James' garden",
        descripcion: "You arrive, check in, and the only plan of the day is Las Pozas, the sculpture garden Edward James raised in the jungle. Nothing else: no early start, no road. The garden is open from 9 in the morning to 4 in the afternoon and the last guided walk leaves right at 4 and runs two hours, so arriving mid-afternoon still costs you nothing.",
      },
      {
        titulo: "Tamul Expedition and a romantic dinner",
        descripcion: "The big day: canoe through the Tampaón Canyon to the 105 metres of Tamul Waterfall, cliff jumping at the Water Cave and the Sótano de las Huahuas at dusk, when the parrots fly out. Back at the hotel the room is waiting with candles and petals, your bottle ready and dinner being plated: a formal dish out on your private terrace.",
      },
      {
        titulo: "Departure",
        descripcion: "Breakfast and back on the road. The buffet breakfast is included on tour days only.",
      },
    ],
    incluye: [
      "2 nights in the Jungla suite at Hotel Paraíso Encantado, with a private terrace, mountain view and an outdoor spa pool",
      "Buffet breakfast on tour days",
      "Romantic dinner on the second night: a formal dish and a bottle of wine",
      "The room set up with candles and petals for that night",
      "Entry and a guided walk at Las Pozas, Edward James' garden",
      "Full Tamul Expedition tour, a whole day",
      "Transport from the hotel to Las Pozas and to the start of day 2's tour, both ways",
      "NOM-09 SECTUR certified guides",
      "Entrance to every attraction",
      "Safety equipment",
      "Travel insurance",
      "Photography and video of the trip",
    ],
    noIncluye: [
      "Travel to Xilitla itself (you get there on your own — see the 'How to get here' section)",
      "Lunches and dinners, except breakfasts and the romantic dinner on day 2",
      "Tips and personal expenses",
    ],
    valor: [
      "2 nights, Jungla suite (2 people)",
      "Tamul Expedition (2 people)",
      "Transport, 2 days",
      "Entrance fees + guides",
      "Photography and video of the trip",
    ],
  },

  familiar: {
    nombre: "Family Package",
    subtitulo: "Three days the kids can actually handle",
    duracion: "4 days / 3 nights",
    precioLabel: "per couple",
    badge: "Most popular",
    urgencia: "All three tours are rated easy: no long hikes, no descents",
    perfiles: ["Families with kids", "Groups", "Easy difficulty"],
    tours: [
      "El Meco Waterfalls — El Meco, Panoramic Lookout and The Great Falls (Day 1)",
      "Surrealist Route — Edward James, Springs, Caves and Castle (Day 2)",
      "Stepped Paradise — Minas Viejas & Micos Waterfalls (Day 3)",
    ],
    itinerario: [
      {
        titulo: "Arrival + El Meco Waterfalls",
        descripcion: "If you arrive on the morning bus we hand over the room early and set off the same day. Turquoise pools, a panoramic lookout and a life jacket for everyone: the first day is the one that hooks the kids.",
      },
      {
        titulo: "Edward James' Las Pozas",
        descripcion: "A day of walking little and looking a lot. The garden of staircases that lead nowhere tends to be the thing children talk about most when they get home. It closes at the springs of Huichihuayán.",
      },
      {
        titulo: "Minas Viejas and Micos Waterfalls",
        descripcion: "The calm-water day. The terraces at Minas Viejas are natural steps with a pool on every level, and at Micos you swim with a life jacket. Nothing physically demanding.",
      },
      {
        titulo: "Departure",
        descripcion: "Breakfast, check out and back on the road.",
      },
    ],
    incluye: [
      "3 nights at Hotel Paraíso Encantado Xilitla",
      "Buffet breakfast on tour days",
      "Full El Meco Waterfalls tour",
      "Full Surrealist Route tour",
      "Full Stepped Paradise tour",
      "Transport from the hotel to the start of each tour and back",
      "NOM-09 SECTUR certified guides",
      "Entrance to every attraction",
      "Life jackets for the whole family",
      "Travel insurance",
      "Photography and video of the trip",
    ],
    noIncluye: [
      "Travel to Xilitla itself (you get there on your own — see the 'How to get here' section)",
      "Children are quoted separately: ages 6 to 10 pay 70% and under 6 pay 50% of the tour portion",
      "An extra room or extra bed for the children (message us and we will quote it)",
      "Lunches and dinners (breakfasts excepted)",
      "Supplement for the Jungla room with mountain view (+$400/night)",
      "Tips and personal expenses",
    ],
    valor: [
      "3 nights' hotel (2 people)",
      "El Meco Waterfalls (2 people)",
      "Surrealist Route (2 people)",
      "Stepped Paradise (2 people)",
      "Transport, 3 days",
      "Entrance fees + guides",
      "Photography and video of the trip",
    ],
  },

  "aventura-extrema": {
    nombre: "Extreme Adventure",
    subtitulo: "Ropes, rapids and the highest waterfall in Mexico",
    duracion: "4 days / 3 nights",
    precioLabel: "per couple",
    badge: "Adrenaline",
    urgencia: "Rappelling and rafting require good physical condition and a minimum age",
    perfiles: ["Adventurous friends", "Adrenaline", "Good physical condition"],
    tours: [
      "Tamul Expedition — Tamul, Water Cave and Sinkhole (Day 1)",
      "Rafting the Tampaón River — Class III Rapids (Day 2)",
      "Rappelling at Tamul Waterfall (Day 3)",
    ],
    itinerario: [
      {
        titulo: "Arrival + Tamul Expedition",
        descripcion: "The scouting day: you paddle the Tampaón Canyon up to Tamul Waterfall and see from below the wall you will descend on day 3. Cliff jumping at the Water Cave and the Sótano de las Huahuas at dusk.",
      },
      {
        titulo: "Rafting the Tampaón River",
        descripcion: "Class III rapids on the same river, with the canyon closing in over the raft. Helmet, life jacket and a river guide in every boat.",
      },
      {
        titulo: "Rappelling at Tamul Waterfall",
        descripcion: "The descent facing the highest waterfall in Mexico. You go down on certified gear with a guide on the rope. No previous experience needed, but you do need to be fine with heights.",
      },
      {
        titulo: "Departure",
        descripcion: "Breakfast, check out and back on the road.",
      },
    ],
    incluye: [
      "3 nights at Hotel Paraíso Encantado Xilitla",
      "Buffet breakfast on tour days",
      "Full Tamul Expedition tour",
      "Full Tampaón River rafting tour",
      "Full Tamul Waterfall rappelling tour",
      "Transport from the hotel to the start of each tour and back",
      "NOM-09 SECTUR certified guides and a rope guide on the rappel",
      "Entrance to every attraction",
      "Safety equipment: harness, helmet and life jacket",
      "Travel insurance",
      "Photography and video of the trip",
    ],
    noIncluye: [
      "Travel to Xilitla itself (you get there on your own — see the 'How to get here' section)",
      "Lunches and dinners (breakfasts excepted)",
      "Supplement for the Jungla room with mountain view (+$400/night)",
      "Tips and personal expenses",
    ],
    valor: [
      "3 nights' hotel (2 people)",
      "Tamul Expedition (2 people)",
      "Tampaón River rafting (2 people)",
      "Tamul Waterfall rappelling (2 people)",
      "Transport, 3 days",
      "Entrance fees, guides and safety equipment",
      "Photography and video of the trip",
    ],
  },

  "tu-huasteca": {
    nombre: "Your Huasteca",
    subtitulo: "Four tour days, and you pick them",
    duracion: "5 days / 4 nights",
    precioLabel: "per couple",
    badge: "You build it",
    urgencia: "The only package where you decide the itinerary, tour by tour",
    perfiles: ["You choose", "Second visit", "Groups of friends"],
    tours: [
      "Four full tours, chosen from a list of six",
      "You pick them when you book and can swap them up to 7 days before",
    ],
    eleccionTour: {
      titulo: "Pick your four tours",
      opciones: [
        { nombre: "Surrealist Route", nota: "Edward James' garden, the springs of Huichihuayán and the Quilas Cave" },
        { nombre: "Tamul Expedition", nota: "Canoe through the canyon to the 105-metre waterfall, and the parrot sinkhole at dusk" },
        { nombre: "Stepped Paradise", nota: "The travertine terraces of Minas Viejas and the seven falls at Micos" },
        { nombre: "Water Route", nota: "The Puente de Dios cave and the Tamasopo waterfalls" },
        { nombre: "El Meco Waterfalls", nota: "Three waterfalls, the panoramic lookout and El Gran Salto" },
        { nombre: "Rappelling at Tamul Waterfall", nota: "A roped descent facing the tallest waterfall in Mexico. Asks that you not fear the drop" },
      ],
    },
    itinerario: [
      {
        titulo: "Arrival + your first tour",
        descripcion: "If you arrive on the morning bus we hand you the room early and head out that same day: day 1 is already a tour day. Which of the four goes first we settle with you, based on the weather and the distance.",
      },
      {
        titulo: "Your second tour",
        descripcion: "We order the four so you never get two long days back to back: Tamul and the rappel are the ones that ask for an early start, so they rarely land side by side.",
      },
      {
        titulo: "Your third tour",
        descripcion: "You leave from the same hotel every morning. No bags to repack, no check-outs in between.",
      },
      {
        titulo: "Your fourth tour",
        descripcion: "We keep the last tour day on the Xilitla side whenever we can, so the drive back to the hotel is short.",
      },
      {
        titulo: "Departure",
        descripcion: "Breakfast, check-out and the road home.",
      },
    ],
    incluye: [
      "4 nights at Hotel Paraíso Encantado Xilitla",
      "Buffet breakfast on tour days",
      "4 full tours, chosen by you from a list of six",
      "Transport from the hotel to the start of each tour and back",
      "NOM-09 SECTUR certified guides",
      "Entrance fees to every attraction",
      "Safety equipment",
      "Travel insurance",
      "Photography and video of every tour",
    ],
    noIncluye: [
      "Travel to Xilitla itself (you get there on your own — see the 'How to get here' section)",
      "Tampaón River rafting and RZR tours: booked separately, we quote them for you",
      "Lunches and dinners (breakfasts excepted)",
      "Supplement for the Jungla room with mountain view (+$400/night)",
      "Tips and personal expenses",
    ],
    valor: [
      "4 nights' hotel (2 people)",
      "4 tours of your choice (2 people)",
      "Transport, 4 days",
      "Entrance fees and guides",
      "Photography and video of the trip",
    ],
  },

  "odisea-huasteca": {
    nombre: "Huasteca Odyssey",
    subtitulo: "Five days of tours without repeating a single place",
    duracion: "6 days / 5 nights",
    precioLabel: "per couple",
    badge: "See it all",
    urgencia: "Five days of tours and one suitcase: you sleep at the same hotel every night",
    perfiles: ["See it all", "First time in the Huasteca", "No repeated stops"],
    tours: [
      "Surrealist Route — Edward James, Springs, Caves and Castle (Day 1)",
      "Tamul Expedition — Tamul, Water Cave and Sinkhole (Day 2)",
      "Stepped Paradise — Minas Viejas & Micos Waterfalls (Day 3)",
      "Water Route or El Meco Waterfalls, your choice (Day 4)",
      "Coffee Trail — Xilitla Coffee Farm (Day 5)",
    ],
    eleccionTour: {
      titulo: "Day 4 is your call",
      opciones: [
        { nombre: "Water Route — Puente de Dios", nota: "The natural cave with the river running past your feet" },
        { nombre: "El Meco Waterfalls", nota: "Three waterfalls and the panoramic lookout" },
      ],
    },
    itinerario: [
      {
        titulo: "Arrival + Edward James' Las Pozas",
        descripcion: "We start with what is closest to the hotel and least demanding: the surrealist garden, the springs of Huichihuayán and the Quilas Cave.",
      },
      {
        titulo: "Tamul Expedition",
        descripcion: "The big day. Canoe through the Tampaón Canyon to Tamul Waterfall, cliff jumping at the Water Cave and the Sótano de las Huahuas at dusk, when the parrots fly out.",
      },
      {
        titulo: "Minas Viejas and Micos Waterfalls",
        descripcion: "A water-and-rest day after the longest one: travertine terraces at Minas Viejas and the seven falls at Micos.",
      },
      {
        titulo: "The day you choose",
        descripcion: "Puente de Dios, the natural cave with the river running through it, or El Meco Waterfalls with its lookout. Both cost the same, so the choice does not move the price: pick whichever you are missing.",
      },
      {
        titulo: "Coffee Trail",
        descripcion: "The quiet closer: a coffee farm in the Xilitla highlands, from the plant to the cup, to slow down before the drive back.",
      },
      {
        titulo: "Departure",
        descripcion: "Breakfast, check out and back on the road.",
      },
    ],
    incluye: [
      "5 nights at Hotel Paraíso Encantado Xilitla",
      "Buffet breakfast on tour days",
      "5 full tours with no repeated destination",
      "One day to choose between the Water Route and El Meco Waterfalls",
      "Transport from the hotel to the start of each tour and back",
      "NOM-09 SECTUR certified guides",
      "Entrance to every attraction",
      "Safety equipment",
      "Travel insurance",
      "Photography and video of every trip",
    ],
    noIncluye: [
      "Travel to Xilitla itself (you get there on your own — see the 'How to get here' section)",
      "Lunches and dinners (breakfasts excepted)",
      "Supplement for the Jungla room with mountain view (+$400/night)",
      "Tips and personal expenses",
    ],
    valor: [
      "5 nights' hotel (2 people)",
      "Surrealist Route (2 people)",
      "Tamul Expedition (2 people)",
      "Stepped Paradise (2 people)",
      "Your chosen day (2 people)",
      "Coffee Trail (2 people)",
      "Transport, 5 days",
      "Entrance fees + guides",
      "Photography and video of the trip",
    ],
  },
};

/** Superpone el inglés sobre el paquete español (fallback a ES campo por campo). */
export function localizePaquete(p: Paquete, locale: Locale): Paquete {
  if (locale === "es") return p;
  const t = PAQUETES_EN[p.slug];
  if (!t) return p;
  return {
    ...p,
    nombre: t.nombre ?? p.nombre,
    subtitulo: t.subtitulo ?? p.subtitulo,
    duracion: t.duracion ?? p.duracion,
    precioLabel: t.precioLabel ?? p.precioLabel,
    badge: t.badge ?? p.badge,
    urgencia: t.urgencia ?? p.urgencia,
    perfiles: t.perfiles ?? p.perfiles,
    tours: t.tours ?? p.tours,
    itinerario: t.itinerario
      ? p.itinerario.map((d, i) => ({
          ...d,
          titulo: t.itinerario![i]?.titulo ?? d.titulo,
          descripcion: t.itinerario![i]?.descripcion ?? d.descripcion,
        }))
      : p.itinerario,
    // La elección del día 3 decide a dónde va el cliente: si sale en español,
    // está eligiendo a ciegas.
    galeriaExtra: t.galeriaExtra && p.galeriaExtra
      ? {
          ...p.galeriaExtra,
          titulo: t.galeriaExtra.titulo ?? p.galeriaExtra.titulo,
          texto:  t.galeriaExtra.texto  ?? p.galeriaExtra.texto,
          fotos:  p.galeriaExtra.fotos.map((f, i) => ({
            ...f,
            alt: t.galeriaExtra!.alt?.[i] ?? f.alt,
          })),
        }
      : p.galeriaExtra,
    eleccionTour: t.eleccionTour && p.eleccionTour
      ? {
          ...p.eleccionTour,
          titulo: t.eleccionTour.titulo ?? p.eleccionTour.titulo,
          opciones: p.eleccionTour.opciones.map((o, i) => ({
            ...o,
            nombre: t.eleccionTour!.opciones?.[i]?.nombre ?? o.nombre,
            nota: t.eleccionTour!.opciones?.[i]?.nota ?? o.nota,
          })),
        }
      : p.eleccionTour,
    incluye: t.incluye ?? p.incluye,
    noIncluye: t.noIncluye ?? p.noIncluye,
    // Solo se traduce la etiqueta; el importe es una cifra.
    valor: t.valor ? p.valor.map((v, i) => ({ ...v, item: t.valor![i] ?? v.item })) : p.valor,
  };
}

export function getLocalizedPaquetes(locale: Locale): Paquete[] {
  return PAQUETES_DB.map((p) => localizePaquete(p, locale));
}

// ── Hotel ───────────────────────────────────────────────────────────────────

const HABITACIONES_EN: Record<string, { descripcion: string; vista: string }> = {
  "orquideas-2": {
    descripcion: "One of our most requested rooms: quiet and wrapped in the hotel's greenery.",
    vista: "Jungle / garden",
  },
  "bromelias-1": {
    descripcion: "A comfortable room with the jungle feel that defines Paraíso Encantado.",
    vista: "Jungle / garden",
  },
  "lirios-2": {
    descripcion: "A bright, welcoming space to rest after a day of tours.",
    vista: "Jungle / garden",
  },
  "flor-de-liz-2": {
    descripcion: "A terrace looking over the town and a private outdoor spa — the same features as the Jungla.",
    vista: "Mountain",
  },
  jungla: {
    descripcion: "A suite with a private terrace, a straight view of the mountain and an outdoor spa pool — the favorite for waking up to the sierra.",
    vista: "Mountain",
  },
};

/** El NOMBRE de la habitación no se traduce: así la conoce el hotel y así llega la reserva al equipo. */
export function getLocalizedHabitaciones(locale: Locale): Habitacion[] {
  if (locale === "es") return HABITACIONES;
  return HABITACIONES.map((h) => ({ ...h, ...(HABITACIONES_EN[h.id] ?? {}) }));
}

// ── Cómo llegar ─────────────────────────────────────────────────────────────

const LOGISTICA_EN = {
  nota: "Public transport times and fares are approximate and change with the season — confirm them when you book.",
  modos: [
    {
      titulo: "By car",
      puntos: [
        "From Mexico City: ~5.5 hours (about 339 km).",
        "From the city of San Luis Potosí: ~5 hours.",
        "The approach to Xilitla is a mountain road with tight bends and fog: we recommend driving in daylight, slowly and with a full tank.",
      ],
    },
    {
      titulo: "By plane",
      puntos: [
        "The most practical airport is Tampico (TAM): ~2.5 h to Xilitla and ~2 h to Ciudad Valles.",
        "Alternatives: San Luis Potosí (~5 h), Querétaro (via Jalpan) or Mexico City / AIFA (further away).",
        "From the airport it's best to rent a car or take a private transfer, since the buses leave from city terminals, not the airport.",
      ],
    },
    {
      titulo: "By bus",
      puntos: [
        "From Mexico City there's an overnight departure from the Terminal Central del Norte at around 10:15 PM (Servicios Coordinados, Transportes Frontera and ETN).",
        "It reaches Xilitla in the morning (about 6:30 AM); the trip takes ~9–10 h. Fares are roughly $520–$900 MXN per person.",
        "If you arrive on that morning bus, we can start the first tour that same day.",
      ],
    },
  ],
  intra:
    "Once you're in the area, our transport takes you from the hotel to the start of each tour and back. For reference: Xilitla is ~40 min from Aquismón and ~1 h from Ciudad Valles; Ciudad Valles is ~50 min from Tamasopo.",
};

export function getLocalizedLogistica(locale: Locale): typeof LOGISTICA {
  if (locale === "es") return LOGISTICA;
  return {
    nota: LOGISTICA_EN.nota,
    // `id` e `icon` se conservan: son claves de código, no texto.
    modos: LOGISTICA.modos.map((m, i) => ({ ...m, ...(LOGISTICA_EN.modos[i] ?? {}) })),
    intra: LOGISTICA_EN.intra,
  };
}

// ── Preguntas frecuentes ────────────────────────────────────────────────────

/**
 * La respuesta del traslado se arma con los precios reales de `TRASLADOS`, igual
 * que en español: la cifra sale del catálogo, no de aquí.
 */
export function getLocalizedFaqs(
  locale: Locale,
  trasladosTexto: string,
): { q: string; a: string }[] {
  if (locale === "es") return [...FAQS_PAQUETES];
  return [
    {
      q: "Is the price per person or per couple?",
      a: "Package prices are per couple (2 people). For groups, families or extra people we put together a quote tailored to you — message us on WhatsApp.",
    },
    {
      q: "How do I get to Xilitla?",
      a: "You can come by car, by plane (Tampico is the most practical airport) or on the overnight bus from Mexico City (Terminal Norte, ~10:15 PM, arriving ~6:30 AM). The 'How to get here' section above explains each option in detail.",
    },
    {
      q: "How do I get to Xilitla from Mexico City?",
      a: "The most practical way is the overnight bus from the Terminal Central del Norte (~10:15 PM, Servicios Coordinados / ETN), which reaches Xilitla around 6:30 AM for about $650 per person. A taxi of roughly $60 drops you at the hotel in 7 minutes. Since you arrive at dawn, we give you your room early so you can rest, and your first tour starts that same day: you don't lose Day 1.",
    },
    {
      q: "Can I choose my room?",
      a: "Yes. Hotel Paraíso Encantado has several rooms (Orquídeas, Bromelias, Lirios and Jungla). The jungle-view rooms are included in the price; the Jungla suite, with a mountain view, carries a supplement of $400 MXN per night. On the Honeymoon package the Jungla is already included, with no supplement.",
    },
    {
      q: "Does the price include getting to Xilitla?",
      a: `It isn't included, but we do arrange it separately: we offer private transfers from ${trasladosTexto}. The package price does cover transport from the hotel to the start of each tour and back. If you'd rather make your own way, the 'How to get here' section lists the car, plane and bus options.`,
    },
    {
      q: "How do you confirm availability?",
      a: "When you send us your enquiry on WhatsApp we check hotel availability and dates in real time. We reply in under 1 hour, and you don't need to pay anything up front to hold your dates.",
    },
  ];
}

// ── Interfaz de las páginas /paquetes y /paquetes/[slug] ────────────────────

export interface PaquetesUI {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogAlt: string;
  breadcrumbInicio: string;
  breadcrumbPaquetes: string;
  productDescripcion: (subtitulo: string, duracion: string) => string;
  howToNombre: string;
  howToDescripcion: string;
  // Hero
  heroEyebrow: string;
  heroH1a: string;
  heroH1b: string;
  heroIntro1: string;
  heroHotel: string;
  heroIntro2: string;
  googleReviews: string;
  resenasN: string;
  bookingOp: string;
  // Si vienes de CDMX
  cdmxEyebrow: string;
  cdmxH2a: string;
  cdmxH2b: string;
  cdmxIntro: string;
  cdmxPasos: { n: string; t: string; d: string }[];
  cdmxBoletos: string;
  cdmxAutoAvion1: string;
  cdmxComoLlegar: string;
  cdmxAutoAvion2: string;
  // Reseñas
  resenasTitulo: string;
  /** Vacío en español; en inglés avisa del idioma original. */
  resenasEnEspanol: string;
  // Nota
  notaWhatsapp: string;
  // Hotel
  hotelEyebrow: string;
  hotelH2: string;
  hotelIntro: string;
  hotelPuntos: string[];
  // FAQ + CTA
  faqTitulo: string;
  faqTituloEm: string;
  ctaH2: string;
  ctaTexto: string;
  ctaBoton: string;
  ctaWa: string;
}

const UI_ES: PaquetesUI = {
  metaTitle: "Paquetes Huasteca Potosina — Tours + Hotel Todo Incluido",
  metaDescription:
    "Paquetes de 3, 4 o 5 días: tours guiados + hotel en Xilitla, todo incluido. Transporte, desayunos, entradas y guías certificados NOM-09. Precios por pareja.",
  keywords: [
    "paquetes huasteca potosina",
    "paquetes todo incluido huasteca potosina",
    "tour huasteca potosina con hotel",
    "viaje a la huasteca potosina 3 días",
    "paquete xilitla con hospedaje",
  ],
  ogTitle: "Paquetes Todo Incluido — Huasteca Potosina",
  ogDescription: "Tours + Hotel Paraíso Encantado Xilitla. 3, 4 o 5 días todo coordinado.",
  ogAlt: "Paquetes Huasteca Potosina",
  breadcrumbInicio: "Inicio",
  breadcrumbPaquetes: "Paquetes Todo Incluido",
  productDescripcion: (subtitulo, duracion) =>
    `${subtitulo} · ${duracion} · Tours + hotel en Xilitla, todo incluido. Precio por pareja (2 personas).`,
  howToNombre: "Cómo llegar a Xilitla desde la Ciudad de México",
  howToDescripcion:
    "Ruta recomendada en autobús nocturno desde CDMX para aprovechar el primer día completo de tour en la Huasteca Potosina.",
  heroEyebrow: "✦ Tours + Hospedaje · Todo Coordinado",
  heroH1a: "Paquetes",
  heroH1b: " Todo Incluido",
  heroIntro1: "Combinamos nuestros tours guiados con hospedaje en ",
  heroHotel: "Hotel Paraíso Encantado Xilitla",
  heroIntro2: ". Tú solo preocúpate por llegar — nosotros nos encargamos del resto.",
  googleReviews: "Google Reviews",
  resenasN: "492 reseñas",
  bookingOp: "Booking · 180 op.",
  cdmxEyebrow: "Si vienes de CDMX",
  cdmxH2a: "Llegas de noche y ",
  cdmxH2b: "tu tour empieza el Día 1",
  cdmxIntro:
    "Con el autobús nocturno desde la Ciudad de México aprovechas el primer día completo: llegas al amanecer, descansas en el hotel y esa misma mañana sales a tu primer tour.",
  cdmxPasos: [
    { n: "1", t: "Autobús nocturno", d: "Sales de la Terminal Central del Norte alrededor de las 10:15 PM (Servicios Coordinados / ETN). Aprox. $650 por persona." },
    { n: "2", t: "Amaneces en Xilitla", d: "Llegas a la central de Xilitla cerca de las 6:30 AM. Un taxi de ~$60 te deja en el hotel en unos 7 minutos." },
    { n: "3", t: "Descansas al llegar", d: "Te entregamos la habitación temprano para que duermas un rato antes de salir. El desayuno ya va incluido en tu tour." },
    { n: "4", t: "Tour completo el Día 1", d: "Esa misma mañana pasa por ti nuestra camioneta y arranca tu primer tour. No pierdes el día de llegada." },
  ],
  cdmxBoletos: "Comprar boletos de autobús →",
  cdmxAutoAvion1: "¿Vienes en auto o avión? En cada paquete tienes la sección ",
  cdmxComoLlegar: "Cómo llegar",
  cdmxAutoAvion2: " con todas las opciones.",
  resenasTitulo: "Lo que dicen quienes ya vivieron la experiencia",
  resenasEnEspanol: "",
  notaWhatsapp:
    "Reserva por WhatsApp y te confirmamos disponibilidad del hotel en menos de 1 hora. Sin pago anticipado.",
  hotelEyebrow: "El hotel de los paquetes",
  hotelH2: "Hotel Paraíso Encantado ",
  hotelIntro:
    "Ubicado a minutos del Jardín Surrealista de Edward James en Xilitla, Pueblo Mágico. Habitaciones con vista a la selva, desayunos con platillos típicos y la mejor base para explorar la Huasteca Potosina.",
  hotelPuntos: [
    "Vista a la selva tropical",
    "Desayunos con platillos típicos",
    "5 min del Jardín de Edward James",
  ],
  faqTitulo: "Preguntas ",
  faqTituloEm: "frecuentes",
  ctaH2: "¿No encuentras el paquete ideal?",
  ctaTexto:
    "Armamos el itinerario exacto que necesitas. Escríbenos y en menos de 1 hora tienes tu propuesta.",
  ctaBoton: "Armar paquete personalizado →",
  ctaWa: "Hola, quisiera un paquete personalizado de tours + hotel en la Huasteca Potosina. ¿Me pueden ayudar?",
};

const UI_EN: PaquetesUI = {
  metaTitle: "Huasteca Potosina Packages — Tours + Hotel, All Inclusive",
  metaDescription:
    "3, 4 or 5-day packages: guided tours + a hotel in Xilitla, all inclusive. Transport, breakfasts, entrance fees and NOM-09 certified guides. Prices per couple.",
  keywords: [
    "huasteca potosina packages",
    "all inclusive huasteca potosina",
    "huasteca potosina tour with hotel",
    "3 day trip to huasteca potosina",
    "xilitla package with accommodation",
  ],
  ogTitle: "All-Inclusive Packages — Huasteca Potosina",
  ogDescription: "Tours + Hotel Paraíso Encantado Xilitla. 3, 4 or 5 days, all arranged.",
  ogAlt: "Huasteca Potosina Packages",
  breadcrumbInicio: "Home",
  breadcrumbPaquetes: "All-Inclusive Packages",
  productDescripcion: (subtitulo, duracion) =>
    `${subtitulo} · ${duracion} · Tours + hotel in Xilitla, all inclusive. Price per couple (2 people).`,
  howToNombre: "How to get to Xilitla from Mexico City",
  howToDescripcion:
    "The recommended overnight bus route from Mexico City so you get a full first day of touring in the Huasteca Potosina.",
  heroEyebrow: "✦ Tours + Lodging · All Arranged",
  heroH1a: "All-Inclusive",
  heroH1b: " Packages",
  heroIntro1: "We combine our guided tours with a stay at ",
  heroHotel: "Hotel Paraíso Encantado Xilitla",
  heroIntro2: ". All you have to worry about is getting here — we take care of the rest.",
  googleReviews: "Google Reviews",
  resenasN: "492 reviews",
  bookingOp: "Booking · 180 reviews",
  cdmxEyebrow: "Coming from Mexico City",
  cdmxH2a: "You arrive at night and ",
  cdmxH2b: "your tour starts on Day 1",
  cdmxIntro:
    "With the overnight bus from Mexico City you get a full first day: you arrive at dawn, rest at the hotel and set off on your first tour that same morning.",
  cdmxPasos: [
    { n: "1", t: "Overnight bus", d: "You leave the Terminal Central del Norte at around 10:15 PM (Servicios Coordinados / ETN). Roughly $650 per person." },
    { n: "2", t: "You wake up in Xilitla", d: "You reach the Xilitla bus station around 6:30 AM. A taxi of about $60 drops you at the hotel in some 7 minutes." },
    { n: "3", t: "You rest on arrival", d: "We give you your room early so you can sleep for a while before heading out. Breakfast is already included in your tour." },
    { n: "4", t: "A full tour on Day 1", d: "That same morning our van picks you up and your first tour begins. You don't lose your arrival day." },
  ],
  cdmxBoletos: "Buy bus tickets →",
  cdmxAutoAvion1: "Coming by car or plane? Every package has a ",
  cdmxComoLlegar: "How to get here",
  cdmxAutoAvion2: " section with all the options.",
  resenasTitulo: "What people who've already done it say",
  // Mismo criterio que en el carrito y en los destinos: son viajeros con nombre
  // y ciudad, así que se dejan como los escribieron y se avisa del idioma.
  resenasEnEspanol: "In their own words (Spanish).",
  notaWhatsapp:
    "Book on WhatsApp and we'll confirm hotel availability in under 1 hour. No payment up front.",
  hotelEyebrow: "The hotel behind the packages",
  hotelH2: "Hotel Paraíso Encantado ",
  hotelIntro:
    "Minutes from Edward James's Surrealist Garden in Xilitla, a Pueblo Mágico. Rooms looking out over the jungle, breakfasts with regional dishes and the best base for exploring the Huasteca Potosina.",
  hotelPuntos: [
    "Rainforest views",
    "Breakfasts with regional dishes",
    "5 min from Edward James's Garden",
  ],
  faqTitulo: "Frequently asked ",
  faqTituloEm: "questions",
  ctaH2: "Can't find the right package?",
  ctaTexto:
    "We'll build the exact itinerary you need. Message us and you'll have your proposal in under an hour.",
  ctaBoton: "Build a custom package →",
  ctaWa: "Hi, I'd like a custom package of tours + hotel in the Huasteca Potosina. Can you help?",
};

export function getPaquetesUI(locale: Locale): PaquetesUI {
  return locale === "en" ? UI_EN : UI_ES;
}

// ── Interfaz del quiz y las tarjetas (PaquetesInteractivo) ──────────────────

export interface PaquetesInteractivoUI {
  toursIncluidos: string;
  queIncluye: string;
  verDesglose: string;
  valorTotal: string;
  precioPaquete: string;
  verDiaPorDia: string;
  reservaFlexible: string;
  /** Las etiquetas de noches; el ÍNDICE es lo que decide el paquete, no el texto. */
  reservarLabel: string;
  waPaquete: (nombre: string, precio: string) => string;
}

const INT_ES: PaquetesInteractivoUI = {
  toursIncluidos: "Tours incluidos",
  queIncluye: "Qué incluye",
  verDesglose: "Ver desglose de valor incluido",
  valorTotal: "Valor total",
  precioPaquete: "Precio paquete",
  verDiaPorDia: "Ver el paquete día por día →",
  reservaFlexible: "Reserva por WhatsApp o con tarjeta · Cancelación flexible",
  reservarLabel: "Reservar:",
  waPaquete: (nombre, precio) => `Hola, me interesa el ${nombre} (${precio} MXN). ¿Tienen disponibilidad?`,
};

const INT_EN: PaquetesInteractivoUI = {
  toursIncluidos: "Tours included",
  queIncluye: "What's included",
  verDesglose: "See the value breakdown",
  valorTotal: "Total value",
  precioPaquete: "Package price",
  verDiaPorDia: "See the package day by day →",
  reservaFlexible: "Book on WhatsApp or by card · Flexible cancellation",
  reservarLabel: "Book:",
  waPaquete: (nombre, precio) => `Hi, I'm interested in the ${nombre} (${precio} MXN). Do you have availability?`,
};

export function getPaquetesInteractivoUI(locale: Locale): PaquetesInteractivoUI {
  return locale === "en" ? INT_EN : INT_ES;
}

// ── Interfaz de la ficha /paquetes/[slug] ──────────────────────────────────

export interface PaqueteDetalleUI {
  noEncontrado: string;
  metaTitle: (nombre: string, duracion: string) => string;
  metaDescription: (nombre: string, subtitulo: string, duracion: string) => string;
  keywords: (nombre: string, dias: number) => string[];
  ogTitle: (nombre: string) => string;
  ogDescription: (duracion: string, subtitulo: string) => string;
  ogAlt: (nombre: string) => string;
  schemaDescripcion: (subtitulo: string, duracion: string) => string;
  offerDescripcion: (precioLabel: string, duracion: string) => string;
  breadcrumbInicio: string;
  breadcrumbPaquetes: string;
  todosLosPaquetes: string;
  ahorras: (monto: string) => string;
  reservarWhatsapp: string;
  waMsg: (nombre: string, duracion: string, precio: string) => string;
  planCompleto: string;
  itinerarioTitulo: string;
  /** Catálogo de recorridos elegibles, en el paquete a la carta. */
  eligeTitulo: string;
  eligeSub: (cuantos: number, total: number) => string;
  eligeHoras: (horas: string) => string;
  llegada: string;
  salida: string;
  diaN: (n: number) => string;
  verTourCompleto: string;
  /** Para un día que visita un lugar suelto, no un recorrido del catálogo. */
  verDestino: string;
  queIncluye: string;
  noIncluye: string;
  tuHospedaje: string;
  hotelTitulo: string;
  hotelIntro: string;
  habitacionAlt: (nombre: string) => string;
  incluida: string;
  porNoche: (monto: number) => string;
  vista: string;
  notaJungla1: string;
  /** Cuando el paquete ya trae la suite de montaña, no hay suplemento que anunciar. */
  notaJunglaIncluida: (habitacion: string) => string;
  /** Cuando la habitación no se elige: viene puesta, y detrás hay un reemplazo. */
  hotelIntroAsignada: (habitacion: string) => string;
  habitacionTuya: string;
  /** Etiqueta del botón que abre la galería del cuarto. */
  verFotos: string;
  habitacionReemplazo: string;
  notaReemplazo: (habitacion: string, alternativa: string) => string;
  notaJunglaHab: string;
  notaJungla2: string;
  notaJunglaPrecio: string;
  notaJungla3: string;
  comoLlegar: string;
  logisticaTitulo: string;
  yaEnLaZona: string;
  reservaTu: (nombre: string) => string;
  sinPagoAnticipado: string;
  loQuePagarias: string;
  valorPorSeparado: string;
  precioDelPaquete: string;
  precioPorPareja: string;
  ahorrasCorto: (monto: string) => string;
  resenasTitulo: string;
  resenasEnEspanol: string;
  faqTitulo: string;
  faqTituloEm: string;
  ctaH2a: string;
  ctaH2b: string;
  ctaTexto: string;
  verOtrosPaquetes: string;
}

const DET_ES: PaqueteDetalleUI = {
  noEncontrado: "Paquete no encontrado — Huasteca Potosina",
  metaTitle: (nombre, duracion) => `${nombre} — ${duracion} | Tours + Hotel Xilitla`,
  metaDescription: (nombre, subtitulo, duracion) =>
    `${nombre}: ${subtitulo}. ${duracion} con tours guiados, hospedaje en Hotel Paraíso Encantado Xilitla, desayunos, transporte local y guías certificados. Itinerario día por día, logística y precios.`,
  keywords: (nombre, dias) => [
    nombre.toLowerCase(),
    "paquetes huasteca potosina",
    `huasteca potosina ${dias} días`,
    "tour huasteca potosina con hotel",
    "viaje a xilitla todo incluido",
  ],
  ogTitle: (nombre) => `${nombre} — Huasteca Potosina`,
  ogDescription: (duracion, subtitulo) => `${duracion} · ${subtitulo}`,
  ogAlt: (nombre) => `${nombre} — Huasteca Potosina`,
  schemaDescripcion: (subtitulo, duracion) =>
    `${subtitulo}. ${duracion} con tours guiados, hospedaje en el Hotel Paraíso Encantado (Xilitla), desayunos, transporte local y guías certificados NOM-09.`,
  offerDescripcion: (precioLabel, duracion) => `Precio ${precioLabel} · ${duracion}`,
  breadcrumbInicio: "Inicio",
  breadcrumbPaquetes: "Paquetes",
  todosLosPaquetes: "Todos los paquetes",
  ahorras: (monto) => `✓ Ahorras ${monto} MXN vs. por separado`,
  reservarWhatsapp: "Reservar por WhatsApp →",
  waMsg: (nombre, duracion, precio) =>
    `Hola, me interesa el ${nombre} (${duracion}, ${precio} MXN). ¿Tienen disponibilidad?`,
  planCompleto: "El plan completo",
  itinerarioTitulo: "Itinerario día por día",
  eligeTitulo: "De aquí salen tus recorridos",
  eligeSub: (cuantos, total) => `Eliges ${cuantos} de estos ${total} al reservar. Cuestan lo mismo dentro del paquete, así que la elección no mueve el precio.`,
  eligeHoras: (horas) => `${horas} h`,
  llegada: "Llegada",
  salida: "Salida",
  diaN: (n) => `Día ${n}`,
  verTourCompleto: "Ver el tour completo →",
  verDestino: "Conocer el lugar →",
  queIncluye: "Qué incluye",
  noIncluye: "No incluye",
  tuHospedaje: "Tu hospedaje",
  hotelTitulo: "Hotel Paraíso Encantado, Xilitla",
  hotelIntro:
    "A minutos del Jardín Surrealista de Edward James, rodeado de naturaleza y con desayunos de platillos típicos. Estas son las habitaciones disponibles para tu paquete:",
  habitacionAlt: (nombre) => `Habitación ${nombre} — Hotel Paraíso Encantado`,
  incluida: "Incluida",
  porNoche: (monto) => `+$${monto}/noche`,
  vista: "Vista:",
  notaJungla1: "Las habitaciones con vista a la selva están incluidas en el precio. La habitación ",
  notaJunglaIncluida: (habitacion) => `Este paquete ya incluye la suite ${habitacion}, con vista a la montaña: no paga suplemento. Si prefieren una de vista a la selva, el precio es el mismo.`,
  hotelIntroAsignada: (habitacion) => `A minutos del Jardín Surrealista de Edward James, rodeado de naturaleza y con desayunos de platillos típicos. En este paquete no hay que elegir habitación: viene la suite ${habitacion}.`,
  habitacionTuya: "Tu habitación",
  verFotos: "ver todas las fotos",
  habitacionReemplazo: "Si no hay fechas",
  notaReemplazo: (habitacion, alternativa) => `La suite ${habitacion} es la que se asigna. Si sus fechas no la tienen libre, entra la ${alternativa}: misma tarifa, misma categoría y las mismas prestaciones —terraza con vista y spa privado al aire libre—. En los dos casos el precio del paquete es el mismo.`,
  notaJunglaHab: "Jungla",
  notaJungla2: ", con vista a la montaña, tiene un suplemento de ",
  notaJunglaPrecio: "$400 MXN por noche",
  notaJungla3: ".",
  comoLlegar: "Cómo llegar",
  logisticaTitulo: "Logística del viaje",
  yaEnLaZona: "Ya en la zona",
  reservaTu: (nombre) => `Reserva tu ${nombre}`,
  sinPagoAnticipado: "Sin pago anticipado · Confirmamos disponibilidad en <1 hora",
  loQuePagarias: "Lo que pagarías por separado",
  valorPorSeparado: "Valor por separado",
  precioDelPaquete: "Precio del paquete",
  precioPorPareja: "Precio por pareja. Grupos y personas adicionales se cotizan aparte.",
  ahorrasCorto: (monto) => `✓ Ahorras ${monto} MXN`,
  resenasTitulo: "Lo que dicen quienes ya hicieron este paquete",
  resenasEnEspanol: "",
  faqTitulo: "Preguntas ",
  faqTituloEm: "frecuentes",
  ctaH2a: "¿Listo para vivir la ",
  ctaH2b: "?",
  ctaTexto: "Escríbenos por WhatsApp con tus fechas y armamos todo. Respuesta en menos de 1 hora.",
  verOtrosPaquetes: "Ver los otros paquetes",
};

const DET_EN: PaqueteDetalleUI = {
  noEncontrado: "Package not found — Huasteca Potosina",
  metaTitle: (nombre, duracion) => `${nombre} — ${duracion} | Tours + Hotel in Xilitla`,
  metaDescription: (nombre, subtitulo, duracion) =>
    `${nombre}: ${subtitulo}. ${duracion} with guided tours, a stay at Hotel Paraíso Encantado Xilitla, breakfasts, local transport and certified guides. Day-by-day itinerary, logistics and prices.`,
  keywords: (nombre, dias) => [
    nombre.toLowerCase(),
    "huasteca potosina packages",
    `huasteca potosina ${dias} days`,
    "huasteca potosina tour with hotel",
    "all inclusive trip to xilitla",
  ],
  ogTitle: (nombre) => `${nombre} — Huasteca Potosina`,
  ogDescription: (duracion, subtitulo) => `${duracion} · ${subtitulo}`,
  ogAlt: (nombre) => `${nombre} — Huasteca Potosina`,
  schemaDescripcion: (subtitulo, duracion) =>
    `${subtitulo}. ${duracion} with guided tours, a stay at Hotel Paraíso Encantado (Xilitla), breakfasts, local transport and NOM-09 certified guides.`,
  offerDescripcion: (precioLabel, duracion) => `Price ${precioLabel} · ${duracion}`,
  breadcrumbInicio: "Home",
  breadcrumbPaquetes: "Packages",
  todosLosPaquetes: "All packages",
  ahorras: (monto) => `✓ You save ${monto} MXN vs. booking separately`,
  reservarWhatsapp: "Book on WhatsApp →",
  waMsg: (nombre, duracion, precio) =>
    `Hi, I'm interested in the ${nombre} (${duracion}, ${precio} MXN). Do you have availability?`,
  planCompleto: "The full plan",
  itinerarioTitulo: "Day-by-day itinerary",
  eligeTitulo: "Your tours come from this list",
  eligeSub: (cuantos, total) => `You pick ${cuantos} of these ${total} when you book. They cost the same inside the package, so your choice does not change the price.`,
  eligeHoras: (horas) => `${horas} h`,
  llegada: "Arrival",
  salida: "Departure",
  diaN: (n) => `Day ${n}`,
  verTourCompleto: "See the full tour →",
  verDestino: "About this place →",
  queIncluye: "What's included",
  noIncluye: "Not included",
  tuHospedaje: "Where you'll stay",
  hotelTitulo: "Hotel Paraíso Encantado, Xilitla",
  hotelIntro:
    "Minutes from Edward James's Surrealist Garden, surrounded by nature and with breakfasts of regional dishes. These are the rooms available for your package:",
  habitacionAlt: (nombre) => `${nombre} room — Hotel Paraíso Encantado`,
  incluida: "Included",
  porNoche: (monto) => `+$${monto}/night`,
  vista: "View:",
  notaJungla1: "The jungle-view rooms are included in the price. The ",
  notaJunglaIncluida: (habitacion) => `This package already includes the ${habitacion} suite, facing the mountain, with no supplement. If you would rather have a jungle-view room, the price is the same.`,
  hotelIntroAsignada: (habitacion) => `Minutes from Edward James' Surrealist Garden, surrounded by nature, with breakfasts of regional dishes. On this package there is no room to choose: you get the ${habitacion} suite.`,
  habitacionTuya: "Your room",
  verFotos: "see every photo",
  habitacionReemplazo: "If dates are taken",
  notaReemplazo: (habitacion, alternativa) => `The ${habitacion} suite is the one assigned. If your dates are already taken, the ${alternativa} steps in: same rate, same category and the same features, a terrace with a view and a private outdoor spa. Either way the package price is the same.`,
  notaJunglaHab: "Jungla",
  notaJungla2: " room, with a mountain view, carries a supplement of ",
  notaJunglaPrecio: "$400 MXN per night",
  notaJungla3: ".",
  comoLlegar: "How to get here",
  logisticaTitulo: "Trip logistics",
  yaEnLaZona: "Once you're in the area",
  reservaTu: (nombre) => `Book your ${nombre}`,
  sinPagoAnticipado: "No payment up front · We confirm availability in <1 hour",
  loQuePagarias: "What you'd pay separately",
  valorPorSeparado: "Value if booked separately",
  precioDelPaquete: "Package price",
  precioPorPareja: "Price per couple. Groups and extra people are quoted separately.",
  ahorrasCorto: (monto) => `✓ You save ${monto} MXN`,
  resenasTitulo: "What people who've done this package say",
  resenasEnEspanol: "In their own words (Spanish).",
  faqTitulo: "Frequently asked ",
  faqTituloEm: "questions",
  ctaH2a: "Ready to live the ",
  ctaH2b: "?",
  ctaTexto: "Message us on WhatsApp with your dates and we'll arrange everything. A reply in under an hour.",
  verOtrosPaquetes: "See the other packages",
};

export function getPaqueteDetalleUI(locale: Locale): PaqueteDetalleUI {
  return locale === "en" ? DET_EN : DET_ES;
}

// ── Formulario de consulta del paquete ─────────────────────────────────────

export interface PaqueteFormUI {
  consultaRapida: string;
  tuNombre: string;
  fechaTentativa: string;
  numPersonas: string;
  abriendoWhatsapp: string;
  consultarDisponibilidad: string;
  o: string;
  reservarConTarjeta: string;
  reservarEnLinea: string;
  reservaSegura: string;
  oConsultaAntes: string;
  reservarEstePaquete: string;
  waMsg: (paquete: string, nombre: string, fecha: string, personas: number | string) => string;
  porDefinir: string;
  porConfirmar: string;
}

const FORM_ES: PaqueteFormUI = {
  consultaRapida: "Consulta rápida — respuesta en <1 hora",
  tuNombre: "Tu nombre *",
  fechaTentativa: "Fecha tentativa",
  numPersonas: "# personas",
  abriendoWhatsapp: "✓ Abriendo WhatsApp…",
  consultarDisponibilidad: "Consultar disponibilidad →",
  o: "o",
  // Decían 10 %, y el checkout de paquetes solo ofrece 30, 50 o 100
  // (`PCTS_PAQUETE` en `lib/paquetePricing.ts`). Prometían un anticipo que no
  // existe, tres veces más barato que el mínimo real, en el producto de ticket
  // más alto del sitio.
  reservarConTarjeta: "Reservar con tarjeta (30/50/100%)",
  reservarEnLinea: "Reservar en línea →",
  reservaSegura: "Pago seguro con Stripe · Apple Pay y Google Pay · Aparta desde el 30 %",
  oConsultaAntes: "o consulta antes por WhatsApp",
  reservarEstePaquete: "Reservar este paquete",
  waMsg: (paquete, nombre, fecha, personas) =>
    `Hola, me interesa el ${paquete}.\n• Nombre: ${nombre}\n• Fecha tentativa: ${fecha}\n• Número de personas: ${personas}\n¿Cuál es la disponibilidad y cómo procedo para reservar?`,
  porDefinir: "por definir",
  porConfirmar: "por confirmar",
};

const FORM_EN: PaqueteFormUI = {
  consultaRapida: "Quick enquiry — a reply in <1 hour",
  tuNombre: "Your name *",
  fechaTentativa: "Approximate date",
  numPersonas: "# of people",
  abriendoWhatsapp: "✓ Opening WhatsApp…",
  consultarDisponibilidad: "Check availability →",
  o: "or",
  reservarConTarjeta: "Pay by card (30/50/100%)",
  reservarEnLinea: "Book online →",
  reservaSegura: "Secure payment with Stripe · Apple Pay and Google Pay · Hold it from 30 %",
  oConsultaAntes: "or ask us first on WhatsApp",
  reservarEstePaquete: "Book this package",
  waMsg: (paquete, nombre, fecha, personas) =>
    `Hi, I'm interested in the ${paquete}.\n• Name: ${nombre}\n• Approximate date: ${fecha}\n• Number of people: ${personas}\nWhat's your availability and how do I go about booking?`,
  porDefinir: "to be decided",
  porConfirmar: "to be confirmed",
};

export function getPaqueteFormUI(locale: Locale): PaqueteFormUI {
  return locale === "en" ? FORM_EN : FORM_ES;
}

// ── Checkout de paquete (/reservar-paquete/[slug]) ─────────────────────────

export interface PaqueteCheckoutUI {
  volverAlPaquete: string;
  reservaConfirmada: string;
  tuConfirmacionEs: string;
  detallesPorCorreo: string;
  pagasteParcial: (cobrado: string, pct: number, saldo: string) => string;
  pagaste100: string;
  teContactamos: string;
  verMasPaquetes: string;
  compartirSalida: (fecha: string) => string;
  compartirPersonas: (adultos: number, menores: number) => string;
  compartirHabitacion: (hab: string) => string;
  compartirDia: (dia: number, opcion: string) => string;
  compartirElegidos: (nombres: string) => string;
  compartirNocheExtra: string;
  compartirTotal: (total: string) => string;
  waReservar: (paquete: string) => string;
  // Fecha y personas
  fechaYPersonas: string;
  fechaInicio: string;
  salimosA: string;
  salimosAFuerte: string;
  salimosACola: string;
  numeroPersonas: string;
  menosPersonas: string;
  masPersonas: string;
  paqueteBase: string;
  hotelPorPersonas: (n: number, habs: number) => string;
  toursPorPersonas: (n: number) => string;
  totalDelViaje: string;
  precioCubre2: string;
  ninos610: string;
  ninos610Nota: string;
  menores6: string;
  menores6Nota: string;
  menosDe: (label: string) => string;
  masDe: (label: string) => string;
  bebesNota: string;
  sonMasDe: (max: number) => string;
  cotizamosWhatsapp: string;
  waGrupoGrande: (n: number, paquete: string) => string;
  // Itinerario
  tuViajeDiaPorDia: string;
  salimosCadaDia: string;
  salimosCadaDiaFuerte: string;
  salimosCadaDiaCola: string;
  pasamosPorTi: string;
  pasamosPorTiFuerte: string;
  pasamosPorTiCola: string;
  nochesEnHotel: (noches: number) => string;
  incluido: string;
  noIncluido: string;
  cadaPersonaSuma: (monto: string, tours: string) => string;
  // Elección de tour
  eleccionDia: (dia: number) => string;
  eleccionElige: string;
  /** Subtítulo cuando el paquete entero es a la carta: "elige 4 de 6". */
  eleccionMultiSub: (cuantos: number, total: number) => string;
  /** Cuántos le faltan por elegir. */
  eleccionMultiFaltan: (n: number) => string;
  // Llegada
  cuandoLlegas: string;
  cuandoLlegasSub: string;
  llegoMismoDia: string;
  llegoMismoDiaSub: string;
  llegoDiaAntes: string;
  llegoDiaAntesSub: string;
  entrasEl: (fecha: string) => string;
  // Habitación
  tuHabitacion: string;
  vistaSelva: string;
  vistaSelvaSub: string;
  vistaMontana: string;
  vistaMontanaSub: string;
  porLasNoches: (monto: string, noches: number) => string;
  laHabitacion: string;
  eligeTuHabitacion: string;
  /** Cuando la habitación viene puesta y la segunda es sólo el reemplazo. */
  tuHabitacionYReemplazo: string;
  elegida: string;
  verFotosDe: (hab: string) => string;
  hastaPersonas: (n: number) => string;
  noCaben: (n: number) => string;
  habitacionApartada: string;
  eligeUnaParaContinuar: string;
  comoSeReparten: string;
  repartoTexto: (total: number, max: number, habs: number) => string;
  habitacionN: (n: number) => string;
  personasN: (n: number) => string;
  menosEnHabitacion: (n: number) => string;
  masEnHabitacion: (n: number) => string;
  precioYaCuenta: string;
  // Hotel
  elHotel: string;
  elHotelSub: string;
  elHotelNota: string;
  // Pago
  cuantoPagarHoy: string;
  cuantoPagarHoySub: string;
  pctOpciones: { label: string; sub: string }[];
  pagasHoy: (pct: number) => string;
  saldoPendiente: string;
  // Contacto
  datosContacto: string;
  nombreCompleto: string;
  nombrePlaceholder: string;
  correo: string;
  correoPlaceholder: string;
  confirmacionSeEnvia: string;
  whatsappTelefono: string;
  telefonoPlaceholder: string;
  notaPlaceholder: string;
  agregarNota: string;
  // Errores y botones
  errNombreCorreo: string;
  errCorreoInvalido: string;
  errHabitacion: string;
  errEleccion: (dia: number) => string;
  errEleccionMulti: (cuantos: number) => string;
  errConexion: string;
  /** El grupo salió del rango que el motor cobra solo. */
  errGrupoNoCotizable: (max: number) => string;
  preparandoPago: string;
  continuarPagar: (monto: string) => string;
  cancelacionFlexible: string;
  infoPago: string;
  procesandoPago: string;
  pagar: (monto: string) => string;
  pagoCifrado: string;
  errPago: string;
  errPagoIncompleto: string;
  // Detalle del resumen
  adultos: (n: number) => string;
  ninos610Resumen: (n: number) => string;
  menores6Resumen: (n: number) => string;
  diasNoches: (dias: number, noches: number) => string;
  habJungla: string;
  habSelva: string;
  /**
   * Los extras del paquete, desglosados en el resumen de reserva. Antes todo
   * —gente adicional, noche extra y habitación con vista— iba aplastado en un
   * solo importe y el cliente veía el precio subir sin una línea que lo
   * explicara. Los tres renglones suman EXACTAMENTE el total.
   */
  resumenHotelExtra: (noches: number, habs: number, habitacion: string) => string;
  resumenToursExtra: (personas: number) => string;
  resumenNocheExtra: string;
}

const CHK_ES: PaqueteCheckoutUI = {
  volverAlPaquete: "Volver al paquete",
  reservaConfirmada: "¡Reserva confirmada!",
  tuConfirmacionEs: "Tu confirmación es",
  detallesPorCorreo: "Te enviamos los detalles por correo.",
  pagasteParcial: (cobrado, pct, saldo) => `Pagaste ${cobrado} (${pct}%); el saldo de ${saldo} se cubre después.`,
  pagaste100: "Pagaste el 100%.",
  teContactamos: "Te contactamos por WhatsApp para coordinar.",
  verMasPaquetes: "Ver más paquetes",
  compartirSalida: (fecha) => `Salida: ${fecha}`,
  compartirPersonas: (adultos, menores) =>
    `${adultos} adulto${adultos !== 1 ? "s" : ""}${menores > 0 ? ` · ${menores} menor${menores !== 1 ? "es" : ""}` : ""}`,
  compartirHabitacion: (hab) => `Habitación: ${hab}`,
  compartirDia: (dia, opcion) => `Día ${dia}: ${opcion}`,
  compartirElegidos: (nombres) => `Recorridos elegidos: ${nombres}`,
  compartirNocheExtra: "Con noche extra (llegada la víspera)",
  compartirTotal: (total) => `Total: ${total} MXN`,
  waReservar: (paquete) => `Hola, quiero reservar el ${paquete}.`,
  fechaYPersonas: "Fecha y personas",
  fechaInicio: "Fecha de inicio del tour",
  salimosA: "Salimos a las ",
  salimosAFuerte: "8:30 AM aprox.",
  salimosACola: " del primer día. Pasamos por ti a tu hospedaje.",
  numeroPersonas: "Número de personas",
  menosPersonas: "Menos personas",
  masPersonas: "Más personas",
  paqueteBase: "Paquete base (2 personas)",
  hotelPorPersonas: (n, habs) => `Hotel por ${n} persona${n > 1 ? "s" : ""} más · ${habs} habitación${habs > 1 ? "es" : ""}`,
  toursPorPersonas: (n) => `Tours por ${n} persona${n > 1 ? "s" : ""} más`,
  totalDelViaje: "Total del viaje",
  precioCubre2: "El precio publicado cubre a 2 personas. Cada persona más suma su hotel y sus tours, y lo verás desglosado aquí.",
  ninos610: "Niños 6–10 años",
  ninos610Nota: "70 % del tour",
  menores6: "Menores de 6",
  menores6Nota: "50 % del tour",
  menosDe: (label) => `Menos ${label}`,
  masDe: (label) => `Más ${label}`,
  bebesNota: "Los bebés menores de 3 no pagan tour. Los menores sí ocupan lugar en la habitación.",
  sonMasDe: (max) => `¿Son más de ${max}?`,
  cotizamosWhatsapp: "Lo cotizamos por WhatsApp",
  waGrupoGrande: (n, paquete) => `Hola, somos ${n} personas y queremos el ${paquete}. ¿Nos lo cotizan?`,
  tuViajeDiaPorDia: "Tu viaje, día por día",
  salimosCadaDia: "Salimos a las ",
  salimosCadaDiaFuerte: "8:30 AM aprox.",
  salimosCadaDiaCola: " cada día de tour.",
  pasamosPorTi: "Pasamos por ti a tu hospedaje en ",
  pasamosPorTiFuerte: "Xilitla o Ciudad Valles",
  pasamosPorTiCola: " y te regresamos al terminar.",
  nochesEnHotel: (noches) => `${noches} noche${noches > 1 ? "s" : ""} en el Hotel Paraíso Encantado, en Xilitla.`,
  incluido: "Incluido",
  noIncluido: "No incluido",
  cadaPersonaSuma: (monto, tours) => `Cada persona adicional suma ${monto} de tours (${tours}).`,
  eleccionDia: (dia) => `Día ${dia} de tu itinerario. Cuesta lo mismo en las dos opciones.`,
  eleccionElige: "Elige uno para poder continuar.",
  eleccionMultiSub: (cuantos, total) => `Elige ${cuantos} de los ${total}. Cuestan lo mismo dentro del paquete, así que la elección no mueve el precio.`,
  eleccionMultiFaltan: (n) => n === 1 ? "Te falta 1 por elegir." : `Te faltan ${n} por elegir.`,
  cuandoLlegas: "¿Cuándo llegas?",
  cuandoLlegasSub: "Tu primer día ya es día de tour: salimos del hotel entre 8:30 y 9:00 de la mañana.",
  llegoMismoDia: "Llego el mismo día del primer tour",
  llegoMismoDiaSub: "Tienes que estar en el hotel antes de las 9:00 AM. Si vienes de lejos, es salir de madrugada.",
  llegoDiaAntes: "Llego un día antes",
  llegoDiaAntesSub: "Check-in desde las 3:00 PM de la víspera. Duermes ahí y arrancas descansado.",
  entrasEl: (fecha) => `Entras el ${fecha} desde las 3:00 PM — un día antes de tu primer tour.`,
  tuHabitacion: "Tu habitación",
  vistaSelva: "Vista a la selva",
  vistaSelvaSub: "Incluida en el precio del paquete.",
  vistaMontana: "Vista a la montaña",
  vistaMontanaSub: "Para despertar con el paisaje de la sierra.",
  porLasNoches: (monto, noches) => `+${monto} MXN por las ${noches} noches`,
  laHabitacion: "La habitación",
  eligeTuHabitacion: "Elige tu habitación",
  tuHabitacionYReemplazo: "Tu habitación, y su reemplazo si no hay fechas",
  elegida: "Elegida",
  verFotosDe: (hab) => `Ver fotos de ${hab}`,
  hastaPersonas: (n) => `Hasta ${n} persona${n > 1 ? "s" : ""}`,
  noCaben: (n) => `No caben ${n} aquí`,
  habitacionApartada: "Te la apartamos para tus fechas. Si no estuviera disponible te avisamos antes de cobrarte.",
  eligeUnaParaContinuar: "Elige una para continuar.",
  comoSeReparten: "Cómo se reparten",
  repartoTexto: (total, max, habs) =>
    `Son ${total} personas y cada habitación admite hasta ${max}. Necesitas ${habs} habitaciones — dinos cómo quieren dormir.`,
  habitacionN: (n) => `Habitación ${n}`,
  personasN: (n) => `${n} persona${n !== 1 ? "s" : ""}`,
  menosEnHabitacion: (n) => `Menos personas en la habitación ${n}`,
  masEnHabitacion: (n) => `Más personas en la habitación ${n}`,
  precioYaCuenta: "El precio de arriba ya cuenta este reparto.",
  elHotel: "El hotel",
  elHotelSub: "Hotel Paraíso Encantado, en Xilitla. Es nuestro, así que el hospedaje y los recorridos los coordina el mismo equipo.",
  elHotelNota: "No tienes que hospedarte aquí para hacer los tours, pero en este paquete el hotel va incluido. Pasamos por ti en la puerta cada mañana.",
  cuantoPagarHoy: "¿Cuánto quieres pagar hoy?",
  cuantoPagarHoySub: "Tú eliges. El resto se cubre antes o durante tu llegada.",
  pctOpciones: [
    { label: "Aparta tu lugar", sub: "Anticipo del 30 %" },
    { label: "Mitad ahora",     sub: "50% hoy, 50% después" },
    { label: "Pago completo",   sub: "Liquida el 100%" },
  ],
  pagasHoy: (pct) => `Pagas hoy (${pct}%)`,
  saldoPendiente: "Saldo pendiente",
  datosContacto: "Datos de contacto",
  nombreCompleto: "Nombre completo *",
  nombrePlaceholder: "Juan García",
  correo: "Correo electrónico *",
  correoPlaceholder: "juan@correo.com",
  confirmacionSeEnvia: "La confirmación se envía a este correo",
  whatsappTelefono: "WhatsApp / Teléfono",
  telefonoPlaceholder: "+52 489 123 4567",
  notaPlaceholder: "Preferencias de habitación, alergias, necesidades especiales...",
  agregarNota: "+ Agregar una nota",
  errNombreCorreo: "Nombre y correo son obligatorios.",
  errCorreoInvalido: "El correo no tiene un formato válido.",
  errHabitacion: "Elige tu habitación para continuar.",
  errEleccion: (dia) => `Elige el recorrido del día ${dia} para continuar.`,
  errEleccionMulti: (cuantos) => `Elige tus ${cuantos} recorridos para continuar.`,
  errConexion: "Error de conexión. Intenta de nuevo.",
  errGrupoNoCotizable: (max) => `No podemos cotizar ese grupo en línea (máximo ${max} personas). Escríbenos por WhatsApp y lo armamos a tu medida.`,
  preparandoPago: "Preparando pago seguro...",
  continuarPagar: (monto) => `Continuar — pagar ${monto} MXN`,
  cancelacionFlexible: "Cancelación flexible · Te contactamos para coordinar fechas",
  infoPago: "Información de pago",
  procesandoPago: "Procesando pago...",
  pagar: (monto) => `Pagar ${monto} MXN`,
  pagoCifrado: "Pago cifrado con TLS · Procesado por Stripe",
  errPago: "Error al procesar el pago.",
  errPagoIncompleto: "El pago no fue completado. Intenta de nuevo.",
  adultos: (n) => `${n} adulto${n > 1 ? "s" : ""}`,
  ninos610Resumen: (n) => `${n} niño${n > 1 ? "s" : ""} 6–10`,
  menores6Resumen: (n) => `${n} menor${n > 1 ? "es" : ""} de 6`,
  diasNoches: (dias, noches) => `${dias} días / ${noches} noches`,
  habJungla: "Habitación Jungla",
  habSelva: "Habitación vista a la selva",
  resumenHotelExtra: (noches, habs, habitacion) =>
    `Hotel · ${noches} noche${noches > 1 ? "s" : ""} · ${habs} habitación${habs > 1 ? "es" : ""}${habitacion ? ` · ${habitacion}` : ""}`,
  resumenToursExtra: (personas) =>
    `Boletos de tour · ${personas} persona${personas > 1 ? "s" : ""} más`,
  resumenNocheExtra: "noche extra",
};

const CHK_EN: PaqueteCheckoutUI = {
  volverAlPaquete: "Back to the package",
  reservaConfirmada: "Booking confirmed!",
  tuConfirmacionEs: "Your confirmation number is",
  detallesPorCorreo: "We've emailed you the details.",
  pagasteParcial: (cobrado, pct, saldo) => `You paid ${cobrado} (${pct}%); the ${saldo} balance is settled later.`,
  pagaste100: "You paid 100%.",
  teContactamos: "We'll contact you on WhatsApp to arrange everything.",
  verMasPaquetes: "See more packages",
  compartirSalida: (fecha) => `Departure: ${fecha}`,
  compartirPersonas: (adultos, menores) =>
    `${adultos} adult${adultos !== 1 ? "s" : ""}${menores > 0 ? ` · ${menores} child${menores !== 1 ? "ren" : ""}` : ""}`,
  compartirHabitacion: (hab) => `Room: ${hab}`,
  compartirDia: (dia, opcion) => `Day ${dia}: ${opcion}`,
  compartirElegidos: (nombres) => `Tours chosen: ${nombres}`,
  compartirNocheExtra: "With an extra night (arriving the day before)",
  compartirTotal: (total) => `Total: ${total} MXN`,
  waReservar: (paquete) => `Hi, I'd like to book the ${paquete}.`,
  fechaYPersonas: "Date and party",
  fechaInicio: "Start date of the tour",
  salimosA: "We leave at ",
  salimosAFuerte: "8:30 AM approx.",
  salimosACola: " on the first day. We pick you up at your lodging.",
  numeroPersonas: "Number of people",
  menosPersonas: "Fewer people",
  masPersonas: "More people",
  paqueteBase: "Base package (2 people)",
  hotelPorPersonas: (n, habs) => `Hotel for ${n} more ${n > 1 ? "people" : "person"} · ${habs} room${habs > 1 ? "s" : ""}`,
  toursPorPersonas: (n) => `Tours for ${n} more ${n > 1 ? "people" : "person"}`,
  totalDelViaje: "Trip total",
  precioCubre2: "The published price covers 2 people. Each extra person adds their hotel and their tours, and you'll see it itemised here.",
  ninos610: "Children 6–10",
  ninos610Nota: "70 % of the tour",
  menores6: "Under 6",
  menores6Nota: "50 % of the tour",
  menosDe: (label) => `Fewer ${label}`,
  masDe: (label) => `More ${label}`,
  bebesNota: "Babies under 3 don't pay for the tour. Children do take up a place in the room.",
  sonMasDe: (max) => `More than ${max} of you?`,
  cotizamosWhatsapp: "We'll quote it on WhatsApp",
  waGrupoGrande: (n, paquete) => `Hi, there are ${n} of us and we'd like the ${paquete}. Could you quote it?`,
  tuViajeDiaPorDia: "Your trip, day by day",
  salimosCadaDia: "We leave at ",
  salimosCadaDiaFuerte: "8:30 AM approx.",
  salimosCadaDiaCola: " on every tour day.",
  pasamosPorTi: "We pick you up at your lodging in ",
  pasamosPorTiFuerte: "Xilitla or Ciudad Valles",
  pasamosPorTiCola: " and bring you back at the end.",
  nochesEnHotel: (noches) => `${noches} night${noches > 1 ? "s" : ""} at Hotel Paraíso Encantado, in Xilitla.`,
  incluido: "Included",
  noIncluido: "Not included",
  cadaPersonaSuma: (monto, tours) => `Each additional person adds ${monto} in tours (${tours}).`,
  eleccionDia: (dia) => `Day ${dia} of your itinerary. Both options cost the same.`,
  eleccionElige: "Choose one to continue.",
  eleccionMultiSub: (cuantos, total) => `Pick ${cuantos} of the ${total}. They cost the same inside the package, so your choice does not change the price.`,
  eleccionMultiFaltan: (n) => n === 1 ? "1 left to pick." : `${n} left to pick.`,
  cuandoLlegas: "When do you arrive?",
  cuandoLlegasSub: "Your first day is already a tour day: we leave the hotel between 8:30 and 9:00 in the morning.",
  llegoMismoDia: "I arrive on the day of the first tour",
  llegoMismoDiaSub: "You need to be at the hotel before 9:00 AM. If you're coming from far away, that means setting off before dawn.",
  llegoDiaAntes: "I arrive the day before",
  llegoDiaAntesSub: "Check-in from 3:00 PM the previous day. You sleep there and start rested.",
  entrasEl: (fecha) => `You check in on ${fecha} from 3:00 PM — the day before your first tour.`,
  tuHabitacion: "Your room",
  vistaSelva: "Jungle view",
  vistaSelvaSub: "Included in the package price.",
  vistaMontana: "Mountain view",
  vistaMontanaSub: "To wake up to the sierra.",
  porLasNoches: (monto, noches) => `+${monto} MXN for the ${noches} nights`,
  laHabitacion: "The room",
  eligeTuHabitacion: "Choose your room",
  tuHabitacionYReemplazo: "Your room, and its replacement if dates are taken",
  elegida: "Selected",
  verFotosDe: (hab) => `See photos of ${hab}`,
  hastaPersonas: (n) => `Up to ${n} ${n > 1 ? "people" : "person"}`,
  noCaben: (n) => `${n} won't fit in here`,
  habitacionApartada: "We hold it for your dates. If it turns out not to be available we'll tell you before charging you.",
  eligeUnaParaContinuar: "Choose one to continue.",
  comoSeReparten: "How you'll split up",
  repartoTexto: (total, max, habs) =>
    `There are ${total} of you and each room sleeps up to ${max}. You need ${habs} rooms — tell us how you'd like to split.`,
  habitacionN: (n) => `Room ${n}`,
  personasN: (n) => `${n} ${n !== 1 ? "people" : "person"}`,
  menosEnHabitacion: (n) => `Fewer people in room ${n}`,
  masEnHabitacion: (n) => `More people in room ${n}`,
  precioYaCuenta: "The price above already accounts for this split.",
  elHotel: "The hotel",
  elHotelSub: "Hotel Paraíso Encantado, in Xilitla. It's ours, so the same team handles both the stay and the tours.",
  elHotelNota: "You don't have to stay here to do the tours, but with this package the hotel is included. We pick you up at the door every morning.",
  cuantoPagarHoy: "How much do you want to pay today?",
  cuantoPagarHoySub: "It's up to you. The rest is settled before or during your arrival.",
  pctOpciones: [
    { label: "Hold your place", sub: "30 % deposit" },
    { label: "Half now",        sub: "50% today, 50% later" },
    { label: "Pay in full",     sub: "Settle 100%" },
  ],
  pagasHoy: (pct) => `You pay today (${pct}%)`,
  saldoPendiente: "Outstanding balance",
  datosContacto: "Contact details",
  nombreCompleto: "Full name *",
  nombrePlaceholder: "Jane Smith",
  correo: "Email address *",
  correoPlaceholder: "jane@email.com",
  confirmacionSeEnvia: "The confirmation goes to this address",
  whatsappTelefono: "WhatsApp / Phone",
  telefonoPlaceholder: "+1 555 123 4567",
  notaPlaceholder: "Room preferences, allergies, special requirements...",
  agregarNota: "+ Add a note",
  errNombreCorreo: "Name and email are required.",
  errCorreoInvalido: "That email address doesn't look valid.",
  errHabitacion: "Choose your room to continue.",
  errEleccion: (dia) => `Choose the tour for day ${dia} to continue.`,
  errEleccionMulti: (cuantos) => `Pick your ${cuantos} tours to continue.`,
  errConexion: "Connection error. Please try again.",
  errGrupoNoCotizable: (max) => `We can't quote that group online (${max} people max). Message us on WhatsApp and we'll put it together for you.`,
  preparandoPago: "Preparing secure payment...",
  continuarPagar: (monto) => `Continue — pay ${monto} MXN`,
  cancelacionFlexible: "Flexible cancellation · We'll contact you to arrange dates",
  infoPago: "Payment details",
  procesandoPago: "Processing payment...",
  pagar: (monto) => `Pay ${monto} MXN`,
  pagoCifrado: "TLS-encrypted payment · Processed by Stripe",
  errPago: "Something went wrong with the payment.",
  errPagoIncompleto: "The payment wasn't completed. Please try again.",
  adultos: (n) => `${n} adult${n > 1 ? "s" : ""}`,
  ninos610Resumen: (n) => `${n} child${n > 1 ? "ren" : ""} 6–10`,
  menores6Resumen: (n) => `${n} under 6`,
  diasNoches: (dias, noches) => `${dias} days / ${noches} nights`,
  habJungla: "Jungla room",
  habSelva: "Jungle-view room",
  resumenHotelExtra: (noches, habs, habitacion) =>
    `Hotel · ${noches} night${noches > 1 ? "s" : ""} · ${habs} room${habs > 1 ? "s" : ""}${habitacion ? ` · ${habitacion}` : ""}`,
  resumenToursExtra: (personas) =>
    `Tour tickets · ${personas} more ${personas > 1 ? "people" : "person"}`,
  resumenNocheExtra: "extra night",
};

export function getPaqueteCheckoutUI(locale: Locale): PaqueteCheckoutUI {
  return locale === "en" ? CHK_EN : CHK_ES;
}
