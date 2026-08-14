import { Destino } from "./destinos";
import { RATING_DESTINO } from "./destinoData";
import { CONTACTO } from "./contacto";
import { localePath, type Locale } from "./i18n/config";

const BASE_URL = "https://www.huasteca-potosina.com";

/**
 * Identificador único de la empresa dentro del grafo de schema.org.
 *
 * Es una URL con fragmento, no una página: nombra a la ENTIDAD "Tours Huasteca
 * Potosina", no a un documento. Sirve para que todas las páginas hablen del
 * mismo negocio en vez de declarar cada una su propia organización suelta —que
 * es lo que pasaba: la home publicaba una `TouristAgency` y /nosotros otra
 * distinta y más completa, sin nada que las relacionara. Un buscador de IA leía
 * dos operadoras con el mismo nombre.
 */
export const ORG_ID = `${BASE_URL}/#organization`;

/** Referencia a la organización desde cualquier otro schema (`provider`, `publisher`…). */
export const ORG_REF = { "@id": ORG_ID } as const;

/** Reseñas verificadas en el Perfil de Empresa de Google. */
const GOOGLE_REVIEWS_URL = "https://share.google/YS3dbxN4wrnHZ8lO9";

/**
 * La empresa, declarada UNA sola vez y en un solo sitio.
 *
 * Los datos son los que ya publicaba /nosotros (la versión rica), no los de la
 * home (la pobre). Lo que NO se declara es tan importante como lo que sí:
 * `CONTACTO.direccion` y `CONTACTO.razonSocial` están pendientes de confirmar,
 * así que no se inventa un domicilio exacto. `sameAs` solo lleva perfiles que
 * existen de verdad —antes incluía una URL de BÚSQUEDA de TripAdvisor, que no
 * es un perfil y no identifica a nadie.
 */
export function buildOrganizationNode(locale: Locale = "es", description?: string) {
  return {
    "@type": ["TouristAgency", "Organization"],
    "@id": ORG_ID,
    name: CONTACTO.nombreComercial,
    url: BASE_URL,
    inLanguage: locale === "en" ? "en" : "es-MX",
    description:
      description ??
      (locale === "en"
        ? "Certified tour operator based in Xilitla, San Luis Potosí. Guided day tours across the Huasteca Potosina with NOM-09 certified guides, transport and insurance included."
        : "Operadora de tours certificada con base en Xilitla, San Luis Potosí. Tours guiados de un día por la Huasteca Potosina con guías certificados NOM-09, transporte y seguro incluidos."),
    logo: { "@type": "ImageObject", url: `${BASE_URL}/logos/huasteca-logo-light.svg`, width: 600, height: 600 },
    image: `${BASE_URL}/og-image.jpg`,
    telephone: CONTACTO.telefonoE164,
    email: CONTACTO.email,
    foundingDate: "2019",
    priceRange: "$$$",
    currenciesAccepted: "MXN",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Xilitla",
      addressRegion: "San Luis Potosí",
      postalCode: "79900",
      addressCountry: "MX",
    },
    areaServed: {
      "@type": "Place",
      name: "Huasteca Potosina",
      address: { "@type": "PostalAddress", addressRegion: "San Luis Potosí", addressCountry: "MX" },
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "06:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "05:00", closes: "20:00" },
    ],
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 492, bestRating: 5, worstRating: 1 },
    award: "Best Tour Operator North America — Arival 2023",
    sameAs: [CONTACTO.facebook, GOOGLE_REVIEWS_URL, CONTACTO.mapsUrl],
  };
}

/**
 * La empresa como documento JSON-LD suelto, para páginas que emiten un `<script>`
 * por schema. Las que arman un `@graph` usan `buildOrganizationNode` directamente:
 * dentro de un grafo el `@context` va una sola vez, arriba.
 */
export function buildOrganizationJsonLd(locale: Locale = "es", description?: string) {
  return { "@context": "https://schema.org", ...buildOrganizationNode(locale, description) };
}

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
