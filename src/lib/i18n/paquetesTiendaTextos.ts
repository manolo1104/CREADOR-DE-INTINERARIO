/**
 * Los textos del rediseño de /paquetes (20 nov 2026), en los dos idiomas.
 *
 * 🔴 Nada de cifras escritas a mano: la calificación, el grupo máximo, el
 * traslado mínimo y los precios llegan como argumento desde sus constantes.
 * Cada frase de «por qué nosotros» y del FAQ dice solo lo que ya está en el
 * código (incluye/noIncluye de los paquetes, `cancelacion.en.ts`,
 * `stripeMsi.ts`, `paquetePricing.ts`).
 */
import type { Locale } from "./config";
import type { CategoriaTienda } from "@/lib/paquetesTienda";

export interface CategoriaTexto { nombre: string; desc: string; foto: string; alt: string }

export function textosTienda(locale: Locale) {
  return locale === "en" ? EN : ES;
}

const FOTOS: Record<CategoriaTienda, string> = {
  // Las fotos REALES más fuertes de cada tipo (20 nov 2026, Manolo: «las más
  // impresionantes»). Ninguna de las marcadas con ✦ (IA).
  aventura: "/imagenes/tours/rappel-tamul/gallery-5.jpg",
  naturaleza: "/imagenes/las-pozas-jardin-surrealista/gallery-9.jpg",
  escapadas: "/imagenes/tours/meco/meco-cascadas-desde-arriba.jpg",
  privadas: "/imagenes/tours/edward-james/gallery-4.jpg",
  multidia: "/imagenes/tours/tamul/hero.jpg",
};

const ES = {
  heroEyebrow: "Paquetes turísticos · Huasteca Potosina",
  heroH1: "Descubre la Huasteca Potosina a través de experiencias",
  heroH1Em: "extraordinarias.",
  heroSub: "Explora cascadas, ríos, paisajes y rincones extraordinarios. Nosotros nos encargamos de organizar tu próxima aventura.",
  heroCta: "Explorar paquetes",
  heroCta2: "Diseñar mi viaje",
  heroConfianza: (rating: string, n: number) => `${rating} en Google · ${n} reseñas`,
  heroGuias: "Guías certificados por SECTUR",
  heroAlt: "La cascada de Tamul cae al río Santa María, de agua turquesa, Huasteca Potosina",

  catEyebrow: "Encuentra tu experiencia",
  catH2: "¿Qué tipo de viaje",
  catH2Em: "buscas?",
  categorias: {
    aventura: { nombre: "Aventura", desc: "Rappel, rafting, RZR y saltos de cascada", foto: FOTOS.aventura, alt: "Rappel por la pared junto a la cascada de Tamul" },
    naturaleza: { nombre: "Naturaleza y cultura", desc: "Cascadas, ríos turquesa y el jardín surrealista", foto: FOTOS.naturaleza, alt: "Las Pozas, el jardín surrealista de Edward James en Xilitla" },
    escapadas: { nombre: "Escapadas", desc: "Fines de semana de 2 y 3 días", foto: FOTOS.escapadas, alt: "Las cascadas del Meco vistas desde el aire" },
    privadas: { nombre: "Experiencias privadas", desc: "Solo tu grupo, con tu guía", foto: FOTOS.privadas, alt: "Poza turquesa con rayos de sol en el jardín de Edward James" },
    multidia: { nombre: "Paquetes multidía", desc: "De 2 a 5 días con hotel", foto: FOTOS.multidia, alt: "Pareja en la punta de una canoa frente a la cascada de Tamul" },
  } satisfies Record<CategoriaTienda, CategoriaTexto>,
  todos: "Todos",
  filtroAria: "Filtrar por tipo de viaje",

  destEyebrow: "Paquetes destacados",
  destH2: "Viajes armados",
  destH2Em: "día por día",
  destLead: "Hotel en Xilitla, desayunos, entradas, traslado a cada tour y guía. Tú solo llegas.",
  comparar: "Comparar paquetes",
  resultados: (n: number) => `${n} ${n === 1 ? "experiencia" : "experiencias"}`,
  toursDeUnDia: "Tours de un día",
  toursDeUnDiaLead: "Para sumar a tu paquete o vivir por separado.",
  verTodosTours: "Ver todos los tours",
  vacio: "No hay experiencias en esta categoría por ahora.",
  limpiar: "Ver todo",
  sinPrecio: "Precio en la página del viaje",

  verPaquete: "Ver paquete",
  verTour: "Ver tour",
  verViaje: "Ver fechas",
  reservar: "Reservar",
  whatsapp: "WhatsApp",
  incluyeHotel: "Hotel incluido",
  tipo: "Tipo",
  desde: "Desde",

  durEyebrow: "Paquetes multidía",
  durH2: "Elige por los días",
  durH2Em: "que tienes",
  durLead: "Mientras más días, más lugares sin prisa. En todos duermes en el mismo hotel: deshaces la maleta una vez.",
  durTabs: { "2": "2 días", "3": "3 días", "4": "4 días", "5+": "5 o más" } as Record<string, string>,
  durAria: "Duración del viaje",
  durDestinos: "Destinos",
  durHotel: "Hospedaje",
  durHotelSi: "Hotel Paraíso Encantado, Xilitla",
  durConsultar: "Consultar",
  durVacio: "Todavía no tenemos un viaje de esta duración. Te lo armamos a la medida.",

  persEyebrow: "Viajes personalizados",
  persH2: "Tu viaje,",
  persH2Em: "a tu manera.",
  persTexto: "Cada viajero tiene una forma diferente de descubrir la Huasteca. Diseñamos experiencias adaptadas a tus días disponibles, intereses y presupuesto.",
  persCta: "Diseñar mi itinerario",
  persCta2: "Prefiero hablar con alguien",
  persWa: "Hola, quiero armar un viaje a la medida a la Huasteca Potosina. Tengo __ días y viajamos __ personas.",

  porqueEyebrow: "¿Por qué viajar con nosotros?",
  porqueH2: "Lo organizamos todo,",
  porqueH2Em: "tú lo vives",
  porque: (grupoMax: number) => [
    { t: "Experiencias organizadas", d: "Itinerario día por día, traslado del hotel a cada tour y entradas incluidas en los paquetes." },
    { t: "Guías locales", d: "Guías de la región, certificados por SECTUR (NOM-09), en cada recorrido." },
    { t: "Atención personalizada", d: "Una sola persona coordina tu viaje y te confirmamos por WhatsApp." },
    { t: "Aventuras auténticas", d: `Grupos pequeños de máximo ${grupoMax} personas y hotel propio en Xilitla.` },
  ],

  resEyebrow: "Experiencias de nuestros viajeros",
  resH2: "Lo que dicen",
  resH2Em: "quienes ya vinieron",
  resRating: (n: number) => `${n} reseñas en Google`,
  resVerMas: "Ver todas las opiniones en Google",
  resFotos: "Fotos de nuestros recorridos",
  resFotosAlt: [
    "Salto a la poza turquesa de Puente de Dios, en Tamasopo",
    "Rafting en los rápidos del río Tampaón",
    "Familia sobre un RZR en un mirador de la sierra de Xilitla",
    "Río turquesa entre sabinos, camino a las cascadas del Meco",
  ],

  compEyebrow: "Complementa tu experiencia",
  compH2: "Suma lo que",
  compH2Em: "te haga falta",
  comp: (trasladoMin: string) => [
    { id: "hotel", t: "Hospedaje", d: "Hotel Paraíso Encantado, a 5 minutos a pie de Las Pozas. Ya viene en cada paquete.", cta: "Conocer el hotel", href: "/donde-hospedarse-en-la-huasteca-potosina" },
    { id: "traslado", t: "Transporte privado", d: `Ida y vuelta desde San Luis Potosí, Tampico o CDMX. Desde ${trasladoMin} MXN por vehículo.`, cta: "Cotizar traslado", wa: "Hola, quiero cotizar un traslado privado a Xilitla para mi paquete. Salimos de __ y somos __ personas." },
    { id: "tours", t: "Experiencias adicionales", d: "Suma un tour de un día antes o después de tu paquete.", cta: "Ver tours", href: "/tours" },
    { id: "ingles", t: "Guía en inglés", d: "Pídelo por WhatsApp al reservar; no tiene costo extra.", cta: "Preguntar", wa: "Hola, quiero reservar un paquete con guía en inglés." },
    { id: "grupos", t: "Grupos y empresas", d: "Escuelas, empresas y familias grandes: transporte y comidas para el grupo.", cta: "Ver grupos", href: "/grupos" },
  ],
  llegarTitulo: "Cómo llegar a Xilitla",
  llegar: [
    "En auto: por carretera desde San Luis Potosí, Querétaro o Tampico.",
    "En avión: Tampico es el aeropuerto más práctico.",
    "En autobús: el nocturno desde la Terminal Norte de la CDMX llega al amanecer.",
  ],

  faqEyebrow: "Preguntas frecuentes",
  faqH2: "Antes de",
  faqH2Em: "reservar",
  faqMas: (n: number) => `Ver ${n} preguntas más`,
  faqExtra: (msiDesde: string, privadoExtra: string) => [
    { q: "¿Qué incluye cada paquete?", a: "Las noches en el Hotel Paraíso Encantado de Xilitla (habitación King con vista a la selva), el desayuno los días de tour, los tours completos del itinerario, el traslado del hotel al inicio de cada tour y de regreso, guías certificados NOM-09 SECTUR, las entradas, el equipo de seguridad y fotos y video del recorrido. No incluye llegar a Xilitla, las comidas y cenas, el seguro de viajero opcional ($80 por persona) ni propinas. Cada ficha trae su lista completa." },
    { q: "¿Cómo puedo reservar?", a: "Abre el paquete y toca «Reservar»: eliges la fecha en un calendario que ya enseña la disponibilidad, cuántas personas van y pagas en línea. Si prefieres, escríbenos por WhatsApp y te confirmamos el hotel y las fechas en menos de 1 hora." },
    { q: "¿Puedo personalizar mi viaje?", a: "Sí. Si ningún paquete te queda, cuéntanos cuántos días tienes, qué te gusta y tu presupuesto, y te armamos el itinerario: puedes empezar con nuestro recomendador o escribirnos por WhatsApp." },
    { q: "¿Necesito pagar un anticipo?", a: "Sí: apartas tu paquete con el 30 % de anticipo o, si lo prefieres, pagas todo de una vez. El resto se paga al llegar." },
    { q: "¿Qué métodos de pago aceptan?", a: `Tarjeta de crédito o débito, Apple Pay y Google Pay en línea. Transferencia SPEI u OXXO se acuerdan por WhatsApp. Con tarjeta de crédito puedes pagar a 3, 6 o 9 meses sin intereses cuando lo que pagas hoy es de ${msiDesde} MXN o más.` },
    { q: "¿Los tours son privados o compartidos?", a: `Los tours salen en grupos pequeños. La mayoría también se puede hacer privado, solo con tu grupo: por lo general cuesta ${privadoExtra} MXN más por persona y cada ficha dice su precio. El Edén en el Jardín es privado siempre. Si quieres tu paquete en privado, escríbenos por WhatsApp y te lo cotizamos.` },
    { q: "¿Qué pasa si el clima impide hacer una actividad?", a: "Si nosotros cancelamos un recorrido por tormenta, alerta meteorológica, río inseguro o cierre del paraje, eliges entre el reembolso del 100 %, otra fecha sin costo o un destino equivalente. El color del agua depende de la lluvia y no se puede garantizar." },
    { q: "¿Puedo reservar para grupos?", a: "Sí. En línea reservas hasta 12 personas y el precio se calcula solo. Para grupos más grandes, escuelas o empresas te cotizamos a mano por WhatsApp." },
  ],

  ctaH2: "La Huasteca",
  ctaH2Em: "te espera.",
  ctaSub: "Descubre paisajes extraordinarios y vive una experiencia que recordarás siempre.",
  ctaExplorar: "Explorar paquetes",
  ctaAsesor: "Hablar con un asesor",
  ctaWa: "Hola, quiero ayuda para elegir un paquete a la Huasteca Potosina.",
  ctaAlt: "La cascada de El Salto al atardecer, con sus pozas turquesa",

  barraVer: "Ver paquetes",
  barraWa: "WhatsApp",
};

const EN: typeof ES = {
  heroEyebrow: "Huasteca Potosina tour packages",
  heroH1: "Discover the Huasteca Potosina through",
  heroH1Em: "extraordinary experiences.",
  heroSub: "Explore waterfalls, rivers, landscapes and remarkable places. We take care of organizing your next adventure.",
  heroCta: "Explore packages",
  heroCta2: "Plan my trip",
  heroConfianza: (rating, n) => `${rating} on Google · ${n} reviews`,
  heroGuias: "SECTUR-certified guides",
  heroAlt: "Tamul waterfall pouring into the turquoise Santa María river, Huasteca Potosina",

  catEyebrow: "Find your experience",
  catH2: "What kind of trip",
  catH2Em: "are you after?",
  categorias: {
    aventura: { nombre: "Adventure", desc: "Rappelling, rafting, RZR and waterfall jumps", foto: FOTOS.aventura, alt: "Rappelling down the wall next to Tamul waterfall" },
    naturaleza: { nombre: "Nature & culture", desc: "Waterfalls, turquoise rivers and the surrealist garden", foto: FOTOS.naturaleza, alt: "Las Pozas, Edward James's surrealist garden in Xilitla" },
    escapadas: { nombre: "Getaways", desc: "2- and 3-day weekends", foto: FOTOS.escapadas, alt: "The Meco waterfalls seen from the air" },
    privadas: { nombre: "Private experiences", desc: "Just your group, with your own guide", foto: FOTOS.privadas, alt: "Turquoise pool with sunbeams in Edward James's garden" },
    multidia: { nombre: "Multi-day packages", desc: "2 to 5 days with hotel", foto: FOTOS.multidia, alt: "A couple on the bow of a canoe facing Tamul waterfall" },
  },
  todos: "All",
  filtroAria: "Filter by type of trip",

  destEyebrow: "Featured packages",
  destH2: "Trips planned",
  destH2Em: "day by day",
  destLead: "Hotel in Xilitla, breakfasts, entrance fees, transport to each tour and a guide. You just show up.",
  comparar: "Compare packages",
  resultados: (n) => `${n} ${n === 1 ? "experience" : "experiences"}`,
  toursDeUnDia: "Day tours",
  toursDeUnDiaLead: "Add one to your package or enjoy it on its own.",
  verTodosTours: "See all tours",
  vacio: "No experiences in this category yet.",
  limpiar: "Show all",
  sinPrecio: "Price on the trip page",

  verPaquete: "View package",
  verTour: "View tour",
  verViaje: "See dates",
  reservar: "Book",
  whatsapp: "WhatsApp",
  incluyeHotel: "Hotel included",
  tipo: "Type",
  desde: "From",

  durEyebrow: "Multi-day packages",
  durH2: "Choose by the days",
  durH2Em: "you have",
  durLead: "More days, more places without rushing. You stay at the same hotel on every trip: unpack once.",
  durTabs: { "2": "2 days", "3": "3 days", "4": "4 days", "5+": "5 or more" },
  durAria: "Trip length",
  durDestinos: "Destinations",
  durHotel: "Lodging",
  durHotelSi: "Hotel Paraíso Encantado, Xilitla",
  durConsultar: "Ask us",
  durVacio: "We don't have a trip of this length yet. We'll tailor one for you.",

  persEyebrow: "Tailor-made trips",
  persH2: "Your trip,",
  persH2Em: "your way.",
  persTexto: "Every traveler discovers the Huasteca differently. We design experiences around the days you have, your interests and your budget.",
  persCta: "Design my itinerary",
  persCta2: "Talk to someone",
  persWa: "Hi, I'd like a tailor-made trip to the Huasteca Potosina. We have __ days and we are __ people.",

  porqueEyebrow: "Why travel with us?",
  porqueH2: "We organize everything,",
  porqueH2Em: "you live it",
  porque: (grupoMax) => [
    { t: "Organized experiences", d: "Day-by-day itinerary, transport from the hotel to each tour and entrance fees included in packages." },
    { t: "Local guides", d: "Guides from the region, SECTUR-certified (NOM-09), on every tour." },
    { t: "Personal attention", d: "One person coordinates your trip and we confirm on WhatsApp." },
    { t: "Authentic adventures", d: `Small groups of up to ${grupoMax} people and our own hotel in Xilitla.` },
  ],

  resEyebrow: "Our travelers' experiences",
  resH2: "What past travelers",
  resH2Em: "say",
  resRating: (n) => `${n} reviews on Google`,
  resVerMas: "Read all reviews on Google",
  resFotos: "Photos from our tours",
  resFotosAlt: [
    "Jumping into the turquoise pool at Puente de Dios, Tamasopo",
    "Rafting the rapids of the Tampaón river",
    "Family on an RZR at a viewpoint in the Xilitla mountains",
    "Turquoise river among cypress trees on the way to the Meco waterfalls",
  ],

  compEyebrow: "Complete your experience",
  compH2: "Add whatever",
  compH2Em: "you need",
  comp: (trasladoMin) => [
    { id: "hotel", t: "Lodging", d: "Hotel Paraíso Encantado, a 5-minute walk from Las Pozas. It comes with every package.", cta: "See the hotel", href: "/where-to-stay-in-huasteca-potosina" },
    { id: "traslado", t: "Private transport", d: `Round trip from San Luis Potosí, Tampico or Mexico City. From ${trasladoMin} MXN per vehicle.`, cta: "Get a quote", wa: "Hi, I'd like a quote for a private transfer to Xilitla for my package. We leave from __ and we are __ people." },
    { id: "tours", t: "Extra experiences", d: "Add a day tour before or after your package.", cta: "See tours", href: "/tours" },
    { id: "ingles", t: "English-speaking guide", d: "Ask for it on WhatsApp when you book, at no extra cost.", cta: "Ask us", wa: "Hi, I'd like to book a package with an English-speaking guide." },
    { id: "grupos", t: "Groups & companies", d: "Schools, companies and large families: transport and meals for the group.", cta: "Groups", href: "/grupos" },
  ],
  llegarTitulo: "How to get to Xilitla",
  llegar: [
    "By car: by road from San Luis Potosí, Querétaro or Tampico.",
    "By plane: Tampico is the most practical airport.",
    "By bus: the overnight bus from Mexico City's Terminal Norte arrives at dawn.",
  ],

  faqEyebrow: "Frequently asked questions",
  faqH2: "Before you",
  faqH2Em: "book",
  faqMas: (n) => `See ${n} more questions`,
  faqExtra: (msiDesde, privadoExtra) => [
    { q: "What does each package include?", a: "Your nights at Hotel Paraíso Encantado in Xilitla (King room with a jungle view), breakfast on tour days, the full tours of the itinerary, transport from the hotel to the start of each tour and back, NOM-09 SECTUR certified guides, entrance fees, safety gear, and photos and video of the tours. It doesn't include getting to Xilitla, lunches and dinners, the optional travel insurance ($80 per person) or tips. Each package page has its full list." },
    { q: "How do I book?", a: "Open the package and tap \"Book\": you choose the date on a calendar that already shows availability, how many people are going, and pay online. If you prefer, message us on WhatsApp and we'll confirm the hotel and dates in under 1 hour." },
    { q: "Can I customize my trip?", a: "Yes. If no package fits, tell us how many days you have, what you enjoy and your budget, and we'll put the itinerary together for you on WhatsApp." },
    { q: "Do I need to pay a deposit?", a: "Yes: you hold your package with a 30% deposit or, if you prefer, pay it all at once. The rest is paid on arrival." },
    { q: "Which payment methods do you accept?", a: `Credit or debit card, Apple Pay and Google Pay online. SPEI bank transfer or OXXO are arranged on WhatsApp. With a credit card you can pay in 3, 6 or 9 interest-free installments when today's payment is ${msiDesde} MXN or more.` },
    { q: "Are the tours private or shared?", a: `Tours run in small groups. Most can also be done privately, just your group: it's usually ${privadoExtra} MXN more per person and each tour page shows its price. Edén en el Jardín is always private. If you'd like your whole package private, message us on WhatsApp for a quote.` },
    { q: "What if the weather prevents an activity?", a: "If we cancel a tour because of a storm, a weather alert, an unsafe river or a site closure, you choose between a 100% refund, a new date at no cost or an equivalent destination. Water color depends on rainfall and can't be guaranteed." },
    { q: "Can I book for a group?", a: "Yes. Online you can book up to 12 people and the price is calculated automatically. For larger groups, schools or companies we quote by hand on WhatsApp." },
  ],

  ctaH2: "The Huasteca",
  ctaH2Em: "is waiting.",
  ctaSub: "Discover extraordinary landscapes and live an experience you'll always remember.",
  ctaExplorar: "Explore packages",
  ctaAsesor: "Talk to an advisor",
  ctaWa: "Hi, I'd like help choosing a Huasteca Potosina package.",
  ctaAlt: "El Salto waterfall at sunset, with its turquoise pools",

  barraVer: "See packages",
  barraWa: "WhatsApp",
};
