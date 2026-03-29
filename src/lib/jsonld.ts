import { Destino } from "./destinos";

const BASE_URL = "https://huastecapotosina.mx";

function buildFAQs(d: Destino) {
  return [
    {
      "@type": "Question",
      name: `¿Cuánto cuesta la entrada a ${d.nombre}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `La entrada a ${d.nombre} cuesta ${d.precio_entrada}. ${
          d.advertencias?.toLowerCase().includes("efectivo")
            ? "Solo se acepta efectivo, no hay cajero en el lugar."
            : "Se recomienda llevar efectivo por si acaso."
        }`,
      },
    },
    {
      "@type": "Question",
      name: `¿Cómo llegar a ${d.nombre} desde Ciudad Valles?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${d.como_llegar}. El destino se encuentra en ${d.zona}, San Luis Potosí, México.`,
      },
    },
    {
      "@type": "Question",
      name: `¿En qué época del año es mejor visitar ${d.nombre}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `La temporada ideal para visitar ${d.nombre} es ${d.temporada_ideal}. La mejor hora del día para llegar es ${d.mejor_hora} para aprovechar al máximo la experiencia.`,
      },
    },
    {
      "@type": "Question",
      name: `¿Cuánto tiempo se necesita para recorrer ${d.nombre}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Se recomienda destinar aproximadamente ${d.duracion_hrs} horas para recorrer ${d.nombre} con calma. El sitio abre ${d.horario} (${d.dias_abierto}).`,
      },
    },
    {
      "@type": "Question",
      name: `¿Qué llevar para visitar ${d.nombre}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Para visitar ${d.nombre} se recomienda llevar: ${d.que_llevar.join(", ")}. ${
          d.advertencias ? `Importante: ${d.advertencias}` : ""
        }`,
      },
    },
  ];
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

export function buildDestinationJsonLd(d: Destino) {
  const url = `${BASE_URL}/destinos/${d.slug}`;
  const precio = d.precio_entrada.replace(/[^0-9]/g, "") || "0";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        name: d.nombre,
        description: d.descripcion,
        url,
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
        offers: {
          "@type": "Offer",
          price: precio,
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
        },
        amenityFeature: d.que_llevar.map((item) => ({
          "@type": "LocationFeatureSpecification",
          name: item,
          value: true,
        })),
        isAccessibleForFree: false,
      },
      {
        "@type": "FAQPage",
        mainEntity: buildFAQs(d),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: BASE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Destinos",
            item: `${BASE_URL}/destinos`,
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
