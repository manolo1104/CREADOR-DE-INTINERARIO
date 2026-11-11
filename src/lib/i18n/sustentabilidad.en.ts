import { localePath, type Locale } from "./config";
import { GRUPO_MAX } from "@/lib/tours";

/**
 * Traducción de /sustentabilidad-y-conservacion (10 nov 2026).
 *
 * 🔴 Las cifras de esta página (Fondo de Conservación Huasteca, $30 MXN por
 * tour, 90 % del pago, 2.4 ha, 12 km, 3 ejidos, SEMARNAT, los años de la línea
 * de tiempo) NO tienen fuente en el código: la auditoría del 7 oct 2026 vio que
 * la página la escribió una IA en abril y que algunas se contradicen (cero
 * plásticos «desde 2022» y «primer tour sin plásticos» en 2019; la
 * reforestación en 2024 y «en 2025 financiamos» la misma). Manolo decidió que
 * se quedan «por ahora». El inglés las copia TAL CUAL —ninguna nueva, ninguna
 * redondeada— para que, cuando él las confirme o las quite, se cambien aquí en
 * los dos idiomas a la vez.
 *
 * Lo único que sale de datos es el tope de grupo (`GRUPO_MAX`).
 */

export interface SustentabilidadContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  inLanguage: string;
  webPageName: string;
  webPageDescription: string;
  breadcrumbActual: string;

  heroBadge: string;
  h1: string;
  h1Em: string;
  heroTexto: string;

  filosofiaEyebrow: string;
  filosofiaH2Pre: string;
  filosofiaH2Em: string;
  filosofiaH2Post: string;
  filosofia: string[];

  compromisosEyebrow: string;
  compromisosH2Pre: string;
  compromisosH2Em: string;
  /** Mismo orden que los iconos de la página. */
  compromisos: { titulo: string; texto: string }[];

  historiaEyebrow: string;
  historiaH2Pre: string;
  historiaH2Em: string;
  acciones: { año: string; accion: string }[];

  fondoH2Pre: string;
  fondoH2Em: string;
  fondoTexto: string;
  fondoCta: string;
  fondoCtaHref: string;

  ctaPregunta: string;
  ctaWhatsapp: string;
  ctaBoton: string;
}

const ES: SustentabilidadContent = {
  metaTitle: "Sustentabilidad y Conservación — Tours Huasteca Potosina",
  metaDescription:
    "Nuestro compromiso con la conservación de la Huasteca Potosina: turismo responsable, apoyo a comunidades locales y protección de ecosistemas únicos de México.",
  keywords: [
    "turismo responsable huasteca potosina",
    "turismo sustentable méxico",
    "conservación huasteca potosina",
    "ecoturismo san luis potosí",
  ],
  ogTitle: "Sustentabilidad y Conservación — Tours Huasteca Potosina",
  ogDescription:
    "Turismo responsable, cero plásticos, empleo local 100% y fondo de conservación activo en la Huasteca Potosina.",
  ogImageAlt: "Tours Huasteca Potosina",
  twitterTitle: "Sustentabilidad — Tours Huasteca Potosina",
  twitterDescription: "Turismo responsable y conservación de ecosistemas.",

  inLanguage: "es-MX",
  webPageName: "Sustentabilidad y Conservación — Tours Huasteca Potosina",
  webPageDescription:
    "Compromiso con la conservación de la Huasteca Potosina: turismo responsable, empleo local, cero plásticos y protección de ecosistemas.",
  breadcrumbActual: "Sustentabilidad y conservación",

  heroBadge: "Turismo Responsable",
  h1: "Sustentabilidad",
  h1Em: " y Conservación",
  heroTexto:
    "La Huasteca Potosina es uno de los ecosistemas más frágiles y extraordinarios de México. Nuestra responsabilidad es asegurarnos de que siga siendo así para las próximas generaciones.",

  filosofiaEyebrow: "Nuestra filosofía",
  filosofiaH2Pre: "El turismo que ",
  filosofiaH2Em: "protege",
  filosofiaH2Post: ", no que destruye",
  filosofia: [
    "Cada año la Huasteca Potosina recibe cientos de miles de visitantes. El turismo masivo sin regulación ha provocado erosión en senderos, contaminación de cuerpos de agua y perturbación de especies endémicas como los vencejos del Sótano de las Golondrinas.",
    "Nosotros elegimos un camino diferente: grupos pequeños, guías locales certificados, cero impacto ambiental y una parte de cada pago destinada directamente a la conservación de los ecosistemas que hacen única a esta región.",
    "Viajar con nosotros es votar por la Huasteca que queremos para el futuro.",
  ],

  compromisosEyebrow: "Lo que hacemos",
  compromisosH2Pre: "Nuestros ",
  compromisosH2Em: "compromisos",
  compromisos: [
    {
      titulo: "Protección de ecosistemas",
      texto:
        "Operamos exclusivamente en senderos autorizados por SEMARNAT y ejidos locales. Nunca llevamos grupos a zonas de anidación activa ni áreas de recuperación ecológica.",
    },
    {
      titulo: "Empleo local 100%",
      texto:
        "Todos nuestros guías, cocineros y transportistas son originarios de la región. El 90% de cada pago se queda en comunidades huastecas.",
    },
    {
      titulo: "Cero plásticos de un solo uso",
      texto:
        "Desde 2022 eliminamos las botellas de plástico de todos nuestros tours. Cada viajero recibe una cantimplora reutilizable con su kit de bienvenida.",
    },
    {
      titulo: "Residuos cero en campo",
      texto:
        "Seguimos la regla 'deja sin huella': todo lo que entra sale. Nuestros guías llevan bolsas de recolección y educamos a cada grupo sobre manejo de residuos.",
    },
    {
      titulo: "Límite de aforo",
      texto: `Ningún grupo nuestro supera ${GRUPO_MAX} personas. Esto reduce el impacto por pisoteo, la contaminación sonora y el estrés en fauna silvestre.`,
    },
    {
      titulo: "Donación por tour",
      texto:
        "$30 MXN de cada tour se destinan al Fondo de Conservación Huasteca, que financia reforestación con especies nativas y limpieza de ríos.",
    },
  ],

  historiaEyebrow: "Historia",
  historiaH2Pre: "Acciones ",
  historiaH2Em: "concretas",
  acciones: [
    { año: "2019", accion: "Primer tour sin plásticos de un solo uso en la Huasteca Potosina" },
    { año: "2021", accion: "Alianza con ejido Tamul para protección de zona de anidación de vencejos" },
    { año: "2022", accion: "Eliminación total de botellas plásticas — kit cantimplora incluido en todos los tours" },
    { año: "2023", accion: "Creación del Fondo de Conservación Huasteca con 3 ejidos socios" },
    { año: "2024", accion: "Reforestación de 2.4 hectáreas de galería riparia en el Río Tampaón" },
    { año: "2025", accion: "Certificación de guías en primeros auxilios para vida silvestre" },
  ],

  fondoH2Pre: "Fondo de ",
  fondoH2Em: "Conservación Huasteca",
  fondoTexto:
    "$30 MXN de cada tour se destinan automáticamente al fondo. En 2025 financiamos la reforestación de 2.4 hectáreas y la limpieza de 12 km del Río Tampaón junto con 3 ejidos locales.",
  fondoCta: "Reservar un tour →",
  fondoCtaHref: "/tours",

  ctaPregunta: "¿Tienes preguntas sobre nuestras prácticas sustentables?",
  ctaWhatsapp: "Hola, quisiera saber más sobre sustentabilidad",
  ctaBoton: "Hablar con el equipo →",
};

const EN: SustentabilidadContent = {
  // 55 caracteres.
  metaTitle: "Sustainability & Conservation — Huasteca Potosina Tours",
  metaDescription:
    "Our commitment to conserving the Huasteca Potosina: responsible tourism, support for local communities and protection of some of Mexico's unique ecosystems.",
  keywords: [
    "responsible tourism huasteca potosina",
    "sustainable tourism mexico",
    "huasteca potosina conservation",
    "ecotourism san luis potosi",
  ],
  ogTitle: "Sustainability & Conservation — Huasteca Potosina Tours",
  ogDescription:
    "Responsible tourism, zero plastics, 100% local employment and an active conservation fund in the Huasteca Potosina.",
  ogImageAlt: "Huasteca Potosina Tours",
  twitterTitle: "Sustainability — Huasteca Potosina Tours",
  twitterDescription: "Responsible tourism and ecosystem conservation.",

  inLanguage: "en",
  webPageName: "Sustainability and Conservation — Huasteca Potosina Tours",
  webPageDescription:
    "Our commitment to conserving the Huasteca Potosina: responsible tourism, local employment, zero plastics and ecosystem protection.",
  breadcrumbActual: "Sustainability and conservation",

  heroBadge: "Responsible Tourism",
  h1: "Sustainability",
  h1Em: " and Conservation",
  heroTexto:
    "The Huasteca Potosina is one of the most fragile and extraordinary ecosystems in Mexico. Our responsibility is to make sure it stays that way for generations to come.",

  filosofiaEyebrow: "Our philosophy",
  filosofiaH2Pre: "Tourism that ",
  filosofiaH2Em: "protects",
  filosofiaH2Post: ", not destroys",
  filosofia: [
    "Every year the Huasteca Potosina receives hundreds of thousands of visitors. Unregulated mass tourism has caused trail erosion, water pollution and disturbance of endemic species such as the swifts of the Sótano de las Golondrinas (Cave of Swallows).",
    "We chose a different path: small groups, certified local guides, zero environmental impact and a share of every payment going directly to conserving the ecosystems that make this region unique.",
    "Traveling with us is a vote for the Huasteca we want for the future.",
  ],

  compromisosEyebrow: "What we do",
  compromisosH2Pre: "Our ",
  compromisosH2Em: "commitments",
  compromisos: [
    {
      titulo: "Ecosystem protection",
      texto:
        "We operate only on trails authorized by SEMARNAT (Mexico's environment ministry) and local ejidos. We never take groups into active nesting zones or ecological recovery areas.",
    },
    {
      titulo: "100% local employment",
      texto:
        "All our guides, cooks and drivers are from the region. 90% of every payment stays in Huasteca communities.",
    },
    {
      titulo: "Zero single-use plastics",
      texto:
        "Since 2022 we have eliminated plastic bottles from all our tours. Every traveler gets a reusable water bottle with their welcome kit.",
    },
    {
      titulo: "Zero waste in the field",
      texto:
        "We follow the 'leave no trace' rule: everything that goes in comes out. Our guides carry collection bags and we teach every group about waste management.",
    },
    {
      titulo: "Group size limit",
      texto: `None of our groups is larger than ${GRUPO_MAX} people. This reduces trampling, noise pollution and stress on wildlife.`,
    },
    {
      titulo: "Donation per tour",
      texto:
        "$30 MXN from every tour goes to the Huasteca Conservation Fund (Fondo de Conservación Huasteca), which pays for reforestation with native species and river clean-ups.",
    },
  ],

  historiaEyebrow: "History",
  historiaH2Pre: "Concrete ",
  historiaH2Em: "actions",
  acciones: [
    { año: "2019", accion: "First tour without single-use plastics in the Huasteca Potosina" },
    { año: "2021", accion: "Partnership with the Tamul ejido to protect a swift nesting area" },
    { año: "2022", accion: "Plastic bottles eliminated entirely — reusable bottle kit included on every tour" },
    { año: "2023", accion: "Creation of the Huasteca Conservation Fund with 3 partner ejidos" },
    { año: "2024", accion: "Reforestation of 2.4 hectares of riparian forest along the Tampaón River" },
    { año: "2025", accion: "Guides certified in wildlife first aid" },
  ],

  fondoH2Pre: "The ",
  fondoH2Em: "Huasteca Conservation Fund",
  fondoTexto:
    "$30 MXN from every tour goes to the fund automatically. In 2025 we funded the reforestation of 2.4 hectares and the clean-up of 12 km of the Tampaón River together with 3 local ejidos.",
  fondoCta: "Book a tour →",
  fondoCtaHref: localePath("/tours", "en"),

  ctaPregunta: "Have questions about our sustainable practices?",
  ctaWhatsapp: "Hi, I'd like to know more about your sustainability practices",
  ctaBoton: "Talk to the team →",
};

export function getSustentabilidad(locale: Locale): SustentabilidadContent {
  return locale === "en" ? EN : ES;
}
