import type { Locale } from "./config";

/**
 * Traducción de /contacto.
 *
 * ⚠️ Los DATOS (correo, teléfono, ciudad base, Maps) no viven aquí: salen de
 * `lib/contacto.ts`, que es la fuente única. Aquí solo está el texto que los
 * envuelve. Copiar el correo a este archivo sería reabrir el problema que
 * `contacto.ts` cerró: tres correos distintos repartidos por el sitio, uno de
 * ellos en un dominio sin registros MX.
 *
 * ⚠️ Los atajos en inglés apuntan solo a rutas que EXISTEN en `/en`. En español
 * el tercer atajo es la política de cancelación; esa página no está traducida,
 * así que el inglés lleva a la guía práctica y la política se lee en la FAQ,
 * donde sí está en inglés.
 */

export interface AtajoContent {
  /** Cuál de los tres iconos usa. La página los mapea. */
  icono: "reservar" | "faq" | "guia";
  titulo: string;
  texto: string;
  href: string;
}

export interface ContactoContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;

  schemaName: string;
  schemaAreaServed: string;

  eyebrow: string;
  h1a: string;
  h1Enfasis: string;
  intro: string;

  canalWhatsappTitulo: string;
  canalWhatsappNota: string;
  canalWhatsappCta: string;
  /** Mensaje con el que se abre WhatsApp. Va en el idioma del visitante. */
  canalWhatsappMensaje: string;

  canalCorreoTitulo: string;
  canalCorreoNota: string;
  canalCorreoCta: string;

  canalUbicacionTitulo: string;
  canalUbicacionNota: string;
  canalUbicacionCta: string;

  horarioTitulo: string;

  atajosTitulo: string;
  atajos: AtajoContent[];

  gruposTitulo: string;
  gruposTextoA: string;
  gruposTextoB: string;

  privacidadPre: string;
  privacidadLink: string;
  /** Aclara que el documento legal solo existe en español. Vacío en ES. */
  privacidadNota: string;
}

const ES: ContactoContent = {
  metaTitle: "Contacto — Tours Huasteca Potosina | WhatsApp y correo",
  metaDescription:
    "Habla con nosotros por WhatsApp o correo para reservar tu tour en la Huasteca Potosina, cotizar un grupo o resolver dudas antes de viajar. Base de operaciones en Xilitla, San Luis Potosí.",
  ogTitle: "Contacto — Tours Huasteca Potosina",
  ogDescription: "WhatsApp, correo y ubicación de nuestra base en Xilitla, San Luis Potosí.",

  schemaName: "Contacto — Tours Huasteca Potosina",
  schemaAreaServed: "Huasteca Potosina, San Luis Potosí, México",

  eyebrow: "Contacto",
  h1a: "Hablemos de",
  h1Enfasis: "tu viaje",
  intro:
    "Somos una operadora local con base en la Huasteca Potosina. Escríbenos para reservar, cotizar un grupo o resolver cualquier duda antes de viajar — incluso si todavía no tienes fechas.",

  canalWhatsappTitulo: "WhatsApp",
  canalWhatsappNota: "La vía más rápida. Aquí resolvemos disponibilidad, fechas y grupos.",
  canalWhatsappCta: "Abrir WhatsApp",
  canalWhatsappMensaje:
    "Hola, quiero información sobre los tours de la Huasteca. ¿Qué opciones tienen disponibles?",

  canalCorreoTitulo: "Correo",
  canalCorreoNota: "Para cotizaciones de grupo, facturación y temas que necesitan archivos.",
  canalCorreoCta: "Escribir correo",

  canalUbicacionTitulo: "Dónde estamos",
  canalUbicacionNota: "Nuestra base de operaciones. Los tours recogen en Xilitla y en Ciudad Valles.",
  canalUbicacionCta: "Ver en Google Maps",

  horarioTitulo: "Horario de atención",

  atajosTitulo: "Quizá esto te ahorre el mensaje",
  atajos: [
    {
      icono: "reservar",
      titulo: "Reservar un tour",
      texto: "Aparta tu lugar con el 30 % y liquida el día del tour.",
      href: "/reservar",
    },
    {
      icono: "faq",
      titulo: "Preguntas frecuentes",
      texto: "Precios, qué incluye, cómo llegar, mejor época y seguridad.",
      href: "/preguntas-frecuentes",
    },
    {
      icono: "guia",
      titulo: "Política de cancelación",
      texto: "Qué pasa si cambias de fecha, si no puedes ir o si llueve.",
      href: "/politica-de-cancelacion",
    },
  ],

  gruposTitulo: "Grupos y facturación",
  gruposTextoA:
    "Para grupos de más de 12 personas, salidas privadas, empresas o escuelas, escríbenos por WhatsApp o a",
  gruposTextoB: "con las fechas y el número de personas, y te armamos una cotización.",

  privacidadPre: "Sobre el tratamiento de tus datos, consulta el",
  privacidadLink: "Aviso de Privacidad",
  privacidadNota: "",
};

const EN: ContactoContent = {
  metaTitle: "Contact Us — Huasteca Potosina Tours | WhatsApp and Email",
  metaDescription:
    "Talk to a local operator based in Xilitla, San Luis Potosí. Message us on WhatsApp or email to book a tour in the Huasteca Potosina, quote a group, or ask anything before you travel.",
  ogTitle: "Contact — Huasteca Potosina Tours",
  ogDescription: "WhatsApp, email and the location of our base in Xilitla, San Luis Potosí.",

  schemaName: "Contact — Huasteca Potosina Tours",
  schemaAreaServed: "Huasteca Potosina, San Luis Potosí, Mexico",

  eyebrow: "Contact",
  h1a: "Let's talk about",
  h1Enfasis: "your trip",
  intro:
    "We're a local tour operator based in the Huasteca Potosina — not a booking platform reselling someone else's trip. Write to us to book, to quote a group, or to ask anything before you travel, even if you don't have dates yet. We answer in English.",

  canalWhatsappTitulo: "WhatsApp",
  canalWhatsappNota:
    "The fastest way to reach us. Availability, dates and group logistics get sorted here.",
  canalWhatsappCta: "Open WhatsApp",
  canalWhatsappMensaje:
    "Hi! I'd like information about your tours in the Huasteca Potosina. What options do you have available?",

  canalCorreoTitulo: "Email",
  canalCorreoNota: "For group quotes, invoicing, and anything that needs attachments.",
  canalCorreoCta: "Send an email",

  canalUbicacionTitulo: "Where we are",
  canalUbicacionNota:
    "Our base of operations. Tours pick you up in Xilitla or in Ciudad Valles.",
  canalUbicacionCta: "Open in Google Maps",

  horarioTitulo: "Hours",

  atajosTitulo: "This might save you the message",
  atajos: [
    {
      icono: "reservar",
      titulo: "Book a tour",
      texto: "Hold your spot with a 30% deposit and pay the balance on the day.",
      href: "/en/reservar",
    },
    {
      icono: "faq",
      titulo: "Frequently asked questions",
      texto: "Prices, what's included, how to get here, best season, safety and cancellations.",
      href: "/en/preguntas-frecuentes",
    },
    {
      icono: "guia",
      titulo: "Travel guide",
      texto: "Getting here, when to come, where to stay, budgets and what to pack.",
      href: "/en/info-practica",
    },
  ],

  gruposTitulo: "Groups and invoicing",
  gruposTextoA:
    "For groups larger than 12, private departures, companies or schools, message us on WhatsApp or write to",
  gruposTextoB: "with your dates and headcount, and we'll put together a quote.",

  privacidadPre: "For how we handle your data, see our",
  privacidadLink: "Privacy Notice",
  privacidadNota: "(in Spanish)",
};

export function getContacto(locale: Locale): ContactoContent {
  return locale === "en" ? EN : ES;
}
