import { Destino } from "./destinos";
import { RATING_DESTINO } from "./destinoData";
import { localePath, type Locale } from "./i18n/config";

const BASE_URL = "https://www.huasteca-potosina.com";

export interface DestinoFaq {
  pregunta: string;
  respuesta: string;
}

/**
 * FAQs de un destino: primero las curadas a mano (`seo.faqPrincipales`) y luego
 * las prácticas generadas de sus datos reales (precio, cómo llegar, temporada,
 * duración, qué llevar), sin repetir preguntas.
 *
 * Antes las curadas REEMPLAZABAN a las automáticas, así que las fichas mejor
 * trabajadas acababan publicando MENOS preguntas que las demás. Se usa tanto
 * para el JSON-LD como para la sección visible de la página (Google pide que el
 * contenido del schema se vea, y para los buscadores de IA es texto citable).
 */
export function getDestinoFaqs(d: Destino, locale: Locale = "es"): DestinoFaq[] {
  const curadas: DestinoFaq[] = d.seo?.faqPrincipales?.length ? [...d.seo.faqPrincipales] : [];

  const automaticas: DestinoFaq[] = locale === "en"
    ? [
        {
          pregunta: `How much is admission to ${d.nombre}?`,
          respuesta: `Admission to ${d.nombre} costs ${d.precio_entrada}. ${
            d.advertencias?.toLowerCase().includes("cash")
              ? "Cash only — there is no ATM on site."
              : "Bringing cash is recommended just in case."
          }`,
        },
        {
          pregunta: `How do I get to ${d.nombre} from Ciudad Valles?`,
          respuesta: `${d.como_llegar}. The destination is in ${d.zona}, San Luis Potosí, Mexico.`,
        },
        {
          pregunta: `What time of year is best to visit ${d.nombre}?`,
          respuesta: `The best season to visit ${d.nombre} is ${d.temporada_ideal}. The best time of day to arrive is ${d.mejor_hora} to make the most of the experience.`,
        },
        {
          pregunta: `How much time do you need to tour ${d.nombre}?`,
          respuesta: `Plan about ${d.duracion_hrs} hours to enjoy ${d.nombre} at a relaxed pace. The site is open ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `What should you bring to visit ${d.nombre}?`,
          respuesta: `To visit ${d.nombre} we recommend bringing: ${d.que_llevar.join(", ")}. ${d.advertencias ? `Important: ${d.advertencias}` : ""}`.trim(),
        },
      ]
    : [
        {
          pregunta: `¿Cuánto cuesta la entrada a ${d.nombre}?`,
          respuesta: `La entrada a ${d.nombre} cuesta ${d.precio_entrada}. ${
            d.advertencias?.toLowerCase().includes("efectivo")
              ? "Solo se acepta efectivo, no hay cajero en el lugar."
              : "Se recomienda llevar efectivo por si acaso."
          }`,
        },
        {
          pregunta: `¿Cómo llegar a ${d.nombre} desde Ciudad Valles?`,
          respuesta: `${d.como_llegar}. El destino se encuentra en ${d.zona}, San Luis Potosí, México.`,
        },
        {
          pregunta: `¿En qué época del año es mejor visitar ${d.nombre}?`,
          respuesta: `La temporada ideal para visitar ${d.nombre} es ${d.temporada_ideal}. La mejor hora del día para llegar es ${d.mejor_hora} para aprovechar al máximo la experiencia.`,
        },
        {
          pregunta: `¿Cuánto tiempo se necesita para recorrer ${d.nombre}?`,
          respuesta: `Se recomienda destinar aproximadamente ${d.duracion_hrs} horas para recorrer ${d.nombre} con calma. El sitio abre ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `¿Qué llevar para visitar ${d.nombre}?`,
          respuesta: `Para visitar ${d.nombre} se recomienda llevar: ${d.que_llevar.join(", ")}. ${
            d.advertencias ? `Importante: ${d.advertencias}` : ""
          }`.trim(),
        },
      ];

  const norm = (s: string) => s.toLowerCase().replace(/[¿?¡!.,\s]/g, "");
  const vistas = new Set(curadas.map((f) => norm(f.pregunta)));

  return [...curadas, ...automaticas.filter((f) => !vistas.has(norm(f.pregunta)))];
}

function buildFAQs(d: Destino, locale: Locale) {
  return getDestinoFaqs(d, locale).map((faq) => ({
    "@type": "Question",
    name: faq.pregunta,
    acceptedAnswer: { "@type": "Answer", text: faq.respuesta },
  }));
}

function buildOpeningHours(d: Destino) {
  // Horario en formato "08:00–18:00" → opens/closes
  const match = d.horario.match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  if (!match) return [];
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "https://schema.org/Monday",
        "https://schema.org/Tuesday",
        "https://schema.org/Wednesday",
        "https://schema.org/Thursday",
        "https://schema.org/Friday",
        "https://schema.org/Saturday",
        "https://schema.org/Sunday",
      ],
      opens: match[1],
      closes: match[2],
    },
  ];
}

export function buildDestinationJsonLd(d: Destino, locale: Locale = "es") {
  const url = `${BASE_URL}${localePath(`/destinos/${d.slug}`, locale)}`;
  const precio = d.precio_entrada.match(/\d+/)?.[0] || "0";
  const esGratis = /libre|gratis|free/i.test(d.precio_entrada);
  const imagen = d.imagen_hero || d.imagen_galeria[0];
  const inLanguage = locale === "en" ? "en" : "es-MX";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        name: d.nombre,
        description: d.descripcion,
        url,
        inLanguage,
        touristType: d.tipo,
        geo: {
          "@type": "GeoCoordinates",
          latitude: d.lat,
          longitude: d.lng,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: d.zona,
          addressRegion: "San Luis Potosí",
          addressCountry: "MX",
        },
        openingHoursSpecification: buildOpeningHours(d),
        // Sin Offer cuando no hay tarifa publicada ni es gratuito ("Consultar")
        ...(esGratis || precio !== "0"
          ? {
              offers: {
                "@type": "Offer",
                price: esGratis ? "0" : precio,
                priceCurrency: "MXN",
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        amenityFeature: d.que_llevar.map((item) => ({
          "@type": "LocationFeatureSpecification",
          name: item,
          value: true,
        })),
        isAccessibleForFree: esGratis,
        image: imagen ? `${BASE_URL}${imagen}` : undefined,
        // aggregateRating movido a Product — TouristAttraction no soportado por Google para rich snippets de reseñas
      },
      // Product: único tipo soportado por Google para AggregateRating rich snippets
      ...(RATING_DESTINO[d.slug] ? [{
        "@type": "Product",
        name: d.nombre,
        description: d.descripcion,
        image: imagen ? `${BASE_URL}${imagen}` : undefined,
        aggregateRating: {
          "@type":      "AggregateRating",
          ratingValue:  RATING_DESTINO[d.slug].rating,
          reviewCount:  RATING_DESTINO[d.slug].count,
          bestRating:   5,
          worstRating:  1,
        },
      }] : []),
      {
        "@type": "FAQPage",
        inLanguage,
        mainEntity: buildFAQs(d, locale),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: locale === "en" ? "Home" : "Inicio",
            item: `${BASE_URL}${localePath("/", locale)}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: locale === "en" ? "Destinations" : "Destinos",
            item: `${BASE_URL}${localePath("/destinos", locale)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: d.nombre,
            item: url,
          },
        ],
      },
    ],
  };
}
