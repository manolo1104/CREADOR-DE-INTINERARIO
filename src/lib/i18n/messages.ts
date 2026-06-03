import type { Locale } from "./config";

// Diccionario de strings de interfaz COMPARTIDA (chrome + labels de componentes
// que renderizan tanto las páginas ES como las EN). El copy largo de páginas de
// marketing vive en sus propios archivos /en, no aquí.
//
// La interfaz `Messages` obliga a que `en` tenga exactamente las mismas claves que `es`.

export interface Messages {
  nav: {
    tours: string;
    destinos: string;
    paquetes: string;
    experiencias: string;
    nosotros: string;
    infoPractica: string;
    blog: string;
    reservar: string;
  };
  common: {
    reservar: string;
    verTour: string;
    verDestino: string;
    verMas: string;
    verTodos: string;
    desde: string;
    porPersona: string;
    preguntarWhatsapp: string;
    reservarTour: string;
    cancelaGratis: string;
    personas: string;
    horas: string;
    dificultad: string;
    resenas: string;
  };
  tour: {
    guidedAllInclusive: string;
    aboutThisTour: string;
    destinations: string;
    images: string;
    allIncluded: string;
    reviewsHeading: string;
    viewOnGoogle: string;
    viewAllReviews: string;
    perPersonIncluded: string;
    specialPrice: string;
    perPerson: string;
    durationApprox: (h: number) => string;
    groupMax: (n: number) => string;
    privateTour: string;
    bookWithConfidence: string;
    freeCancellation: string;
    freeCancellationSub: string;
    rescheduleRain: string;
    rescheduleRainSub: string;
    photosIncluded: string;
    photosIncludedSub: string;
    support247: string;
    support247Sub: string;
    backToTours: string;
    maximizeTrip: string;
    combineHeading: string;
    recommendedCombo: string;
    comboGeneric: string;
    viewTour: string;
    book: string;
    reviewsCount: (n: number) => string;
    bookThisTour: string;
    askWhatsapp: string;
    freeCancel48: string;
  };
  destino: {
    allDestinations: string;
    opinions: string;
    practicalData: string;
    duration: string;
    hoursUnit: (h: number) => string;
    entrance: string;
    difficulty: string;
    difficultyVal: (v: string) => string;
    schedule: string;
    daysOpen: string;
    bestTime: string;
    bestSeason: string;
    meetingPoint: string;
    meetingPointVal: string;
    advertencias: string;
    comoLlegar: string;
    queLlevar: string;
    datosCuriosos: string;
    location: string;
    openInMaps: string;
    travelersSay: string;
    toursThatInclude: string;
    bookOrAsk: string;
    bookWithCard: string;
    askWhatsapp: string;
    replyUnder1h: string;
    wantToVisit: string;
    writeWhatsapp: string;
    bookViaWhatsapp: string;
    includedIn: string;
    alsoInclude: (name: string) => string;
    createItinerary: string;
    faqTitulo: string;
  };
  footer: {
    derechos: string;
    idioma: string;
  };
  switcher: {
    es: string;
    en: string;
    label: string;
  };
}

const es: Messages = {
  nav: {
    tours: "Tours",
    destinos: "Destinos",
    paquetes: "Paquetes",
    experiencias: "Experiencias",
    nosotros: "Nosotros",
    infoPractica: "Info práctica",
    blog: "Blog",
    reservar: "Reservar",
  },
  common: {
    reservar: "Reservar",
    verTour: "Ver tour",
    verDestino: "Ver destino",
    verMas: "Ver más",
    verTodos: "Ver todos",
    desde: "Desde",
    porPersona: "por persona",
    preguntarWhatsapp: "Preguntar por WhatsApp",
    reservarTour: "Reservar este tour",
    cancelaGratis: "Cancela gratis · 48h antes",
    personas: "personas",
    horas: "horas",
    dificultad: "Dificultad",
    resenas: "reseñas",
  },
  tour: {
    guidedAllInclusive: "Tour guiado con todo incluido",
    aboutThisTour: "Acerca de este tour",
    destinations: "Destinos del recorrido",
    images: "Imágenes del recorrido",
    allIncluded: "Todo incluido ✦",
    reviewsHeading: "Lo que dicen quienes ya fueron",
    viewOnGoogle: "Ver en Google →",
    viewAllReviews: "Ver todas las reseñas en Google Maps →",
    perPersonIncluded: "MXN / persona · Todo incluido",
    specialPrice: "Precio especial",
    perPerson: "MXN por persona",
    durationApprox: (h) => `Duración: ${h} horas aprox.`,
    groupMax: (n) => `Grupo: máx. ${n} personas`,
    privateTour: "¿Tour privado para tu grupo? →",
    bookWithConfidence: "Reserva con total confianza",
    freeCancellation: "Cancelación gratuita",
    freeCancellationSub: "Hasta 48h antes · Reembolso completo",
    rescheduleRain: "Si llueve, reprogramamos",
    rescheduleRainSub: "Sin costo adicional · Fecha flexible",
    photosIncluded: "Fotos y video incluidos",
    photosIncludedSub: "Entregados el mismo día · Sin extra",
    support247: "Soporte en WhatsApp 24/7",
    support247Sub: "Respuesta en menos de 1 hora",
    backToTours: "← Ver todos los tours",
    maximizeTrip: "Maximiza tu viaje",
    combineHeading: "Tours que combinan con este recorrido",
    recommendedCombo: "✦ Combinación recomendada",
    comboGeneric: "El complemento perfecto para un segundo día de aventura en la Huasteca.",
    viewTour: "Ver tour →",
    book: "Reservar →",
    reviewsCount: (n) => `${n} reseñas`,
    bookThisTour: "Reservar este tour",
    askWhatsapp: "Preguntar por WhatsApp",
    freeCancel48: "Cancela gratis · 48h antes",
  },
  destino: {
    allDestinations: "← Todos los destinos",
    opinions: "opiniones",
    practicalData: "Datos prácticos",
    duration: "Duración",
    hoursUnit: (h) => `${h} horas`,
    entrance: "Entrada",
    difficulty: "Dificultad",
    difficultyVal: (v) => v,
    schedule: "Horario",
    daysOpen: "Días abierto",
    bestTime: "Mejor hora",
    bestSeason: "Temporada ideal",
    meetingPoint: "Punto de encuentro",
    meetingPointVal: "Ciudad Valles — frente a la central de autobuses",
    advertencias: "Advertencias",
    comoLlegar: "Cómo llegar",
    queLlevar: "Qué llevar",
    datosCuriosos: "Datos curiosos",
    location: "Ubicación",
    openInMaps: "Abrir en Google Maps →",
    travelersSay: "Lo que dicen los viajeros",
    toursThatInclude: "Tours que incluyen",
    bookOrAsk: "Reserva directamente con tarjeta o pregunta por WhatsApp.",
    bookWithCard: "Reservar con tarjeta",
    askWhatsapp: "Preguntar por WhatsApp",
    replyUnder1h: "Respuesta en menos de 1 hora · Lun–Dom",
    wantToVisit: "¿Quieres visitar",
    writeWhatsapp: "Escríbenos por WhatsApp y te armamos el tour ideal para tu grupo y fechas.",
    bookViaWhatsapp: "Reservar tour por WhatsApp",
    includedIn: "Incluido en:",
    alsoInclude: (name) => `Los viajeros que visitan ${name} también suelen incluir:`,
    createItinerary: "✦ Crear itinerario personalizado",
    faqTitulo: "Preguntas frecuentes",
  },
  footer: {
    derechos: "Todos los derechos reservados",
    idioma: "Idioma",
  },
  switcher: {
    es: "Español",
    en: "English",
    label: "Cambiar idioma",
  },
};

const en: Messages = {
  nav: {
    tours: "Tours",
    destinos: "Destinations",
    paquetes: "Packages",
    experiencias: "Experiences",
    nosotros: "About us",
    infoPractica: "Travel info",
    blog: "Blog",
    reservar: "Book now",
  },
  common: {
    reservar: "Book",
    verTour: "View tour",
    verDestino: "View destination",
    verMas: "Learn more",
    verTodos: "View all",
    desde: "From",
    porPersona: "per person",
    preguntarWhatsapp: "Ask on WhatsApp",
    reservarTour: "Book this tour",
    cancelaGratis: "Free cancellation · 48h before",
    personas: "people",
    horas: "hours",
    dificultad: "Difficulty",
    resenas: "reviews",
  },
  tour: {
    guidedAllInclusive: "Guided, all-inclusive tour",
    aboutThisTour: "About this tour",
    destinations: "On this tour",
    images: "Tour photos",
    allIncluded: "All included ✦",
    reviewsHeading: "What past travelers say",
    viewOnGoogle: "View on Google →",
    viewAllReviews: "See all reviews on Google Maps →",
    perPersonIncluded: "MXN / person · All included",
    specialPrice: "Special price",
    perPerson: "MXN per person",
    durationApprox: (h) => `Duration: approx. ${h} hours`,
    groupMax: (n) => `Group: max. ${n} people`,
    privateTour: "Private tour for your group? →",
    bookWithConfidence: "Book with total confidence",
    freeCancellation: "Free cancellation",
    freeCancellationSub: "Up to 48h before · Full refund",
    rescheduleRain: "If it rains, we reschedule",
    rescheduleRainSub: "No extra cost · Flexible date",
    photosIncluded: "Photos and video included",
    photosIncludedSub: "Delivered same day · No extra charge",
    support247: "WhatsApp support 24/7",
    support247Sub: "Reply in under 1 hour",
    backToTours: "← View all tours",
    maximizeTrip: "Make the most of your trip",
    combineHeading: "Tours that pair well with this one",
    recommendedCombo: "✦ Recommended combination",
    comboGeneric: "The perfect add-on for a second day of adventure in the Huasteca.",
    viewTour: "View tour →",
    book: "Book →",
    reviewsCount: (n) => `${n} reviews`,
    bookThisTour: "Book this tour",
    askWhatsapp: "Ask on WhatsApp",
    freeCancel48: "Free cancellation · 48h before",
  },
  destino: {
    allDestinations: "← All destinations",
    opinions: "reviews",
    practicalData: "Practical info",
    duration: "Duration",
    hoursUnit: (h) => `${h} hours`,
    entrance: "Entrance",
    difficulty: "Difficulty",
    difficultyVal: (v) => {
      const map: Record<string, string> = { baja: "Easy", media: "Moderate", alta: "Hard" };
      return map[v.toLowerCase()] ?? v;
    },
    schedule: "Hours",
    daysOpen: "Open days",
    bestTime: "Best time of day",
    bestSeason: "Best season",
    meetingPoint: "Meeting point",
    meetingPointVal: "Ciudad Valles — in front of the bus station",
    advertencias: "Good to know",
    comoLlegar: "How to get there",
    queLlevar: "What to bring",
    datosCuriosos: "Did you know?",
    location: "Location",
    openInMaps: "Open in Google Maps →",
    travelersSay: "What travelers say",
    toursThatInclude: "Tours that include",
    bookOrAsk: "Book directly by card or ask on WhatsApp.",
    bookWithCard: "Book by card",
    askWhatsapp: "Ask on WhatsApp",
    replyUnder1h: "Reply in under 1 hour · Mon–Sun",
    wantToVisit: "Want to visit",
    writeWhatsapp: "Message us on WhatsApp and we'll build the ideal tour for your group and dates.",
    bookViaWhatsapp: "Book a tour on WhatsApp",
    includedIn: "Included in:",
    alsoInclude: (name) => `Travelers who visit ${name} also tend to include:`,
    createItinerary: "✦ Create a custom itinerary",
    faqTitulo: "Frequently asked questions",
  },
  footer: {
    derechos: "All rights reserved",
    idioma: "Language",
  },
  switcher: {
    es: "Español",
    en: "English",
    label: "Change language",
  },
};

const MESSAGES: Record<Locale, Messages> = { es, en };

export function getDict(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES.es;
}
