import type { Locale } from "./config";
import type { AvisoTraduccion } from "./cancelacion.en";

/**
 * Traducción de /aviso-de-privacidad (10 nov 2026).
 *
 * 🔴 Documento legal mexicano (LFPDPPP): el que obliga es el español, y la
 * versión inglesa lo dice arriba con un enlace al original. Los plazos (20 y
 * 15 días hábiles, 30 días de aviso), el correo ARCO, los proveedores (Stripe,
 * Brevo, Railway) y los nombres propios de la ley y de la autoridad se copian
 * TAL CUAL; el nombre oficial en español de la ley va siempre junto a su
 * traducción, porque es el que vale ante la autoridad.
 *
 * 🔴 La FECHA no vive aquí: está en `src/app/aviso-de-privacidad/page.tsx`,
 * donde la busca `AVISO_VERSION` de `src/lib/encuestas/opciones.ts`. Al cambiar
 * una sola palabra de este aviso, cambiar las dos.
 *
 * El texto va en piezas (`SegAviso`) para llevar negritas, cursivas, enlaces y
 * saltos de línea sin JSX en un .ts.
 */

export const RESPONSABLE = "Tours Huasteca Potosina";
export const DOMICILIO = "Xilitla, San Luis Potosí, México";
export const EMAIL_ARCO = "privacidad@huasteca-potosina.com";
export const SITIO = "https://www.huasteca-potosina.com";
const RFC = { es: "En trámite", en: "in process" };
const LEY = "Ley Federal de Protección de Datos Personales en Posesión de los Particulares";

/**
 * Un trozo de párrafo. `a` con `hover` lleva el estilo con transición que tenía
 * la sección I; sin él, el subrayado simple del resto del aviso.
 */
export type SegAviso =
  | string
  | { b: string }
  | { em: string }
  | { a: string; href: string; hover?: boolean }
  | { br: true };

/** `amplio`: la lista de finalidades primarias tenía más aire debajo (mb-6). */
export type BloqueAviso = { p: SegAviso[] } | { ul: SegAviso[][]; amplio?: boolean };

export interface SeccionAviso {
  h2: string;
  bloques: BloqueAviso[];
}

export interface PrivacidadContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;

  inLanguage: string;
  webPageName: string;
  webPageDescription: string;
  breadcrumbActual: string;

  avisoTraduccion: AvisoTraduccion | null;

  eyebrow: string;
  h1: string;
  /** "Última actualización: " — la fecha la pone la página. */
  actualizacionPre: string;

  secciones: SeccionAviso[];
  notaLegal: SegAviso[];
  volver: { label: string; href: string };
}

const mailto = (hover?: boolean): SegAviso => ({ a: EMAIL_ARCO, href: `mailto:${EMAIL_ARCO}`, hover });

const ES: PrivacidadContent = {
  metaTitle: "Aviso de Privacidad — Tours Huasteca Potosina",
  metaDescription:
    "Aviso de Privacidad de Tours Huasteca Potosina conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
  ogTitle: "Aviso de Privacidad — Tours Huasteca Potosina",
  ogDescription:
    "Qué datos personales recabamos, para qué los usamos, a quién se transfieren y cómo ejercer tus derechos ARCO.",
  ogImageAlt: "Tours Huasteca Potosina",

  inLanguage: "es-MX",
  webPageName: "Aviso de Privacidad",
  webPageDescription:
    "Aviso de Privacidad conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
  breadcrumbActual: "Aviso de Privacidad",

  avisoTraduccion: null,

  eyebrow: "Legal",
  h1: "Aviso de Privacidad",
  actualizacionPre: "Última actualización: ",

  secciones: [
    {
      h2: "I. Identidad y domicilio del Responsable",
      bloques: [
        {
          p: [
            { b: RESPONSABLE },
            ` (en adelante "el Responsable"), con domicilio en ${DOMICILIO}, RFC ${RFC.es}, es el responsable del tratamiento de sus datos personales conforme a lo establecido en la `,
            { em: LEY },
            " (LFPDPPP) y su Reglamento.",
          ],
        },
        {
          p: [
            "Sitio web: ",
            { a: SITIO, href: SITIO, hover: true },
            { br: true },
            "Correo electrónico ARCO: ",
            mailto(true),
          ],
        },
      ],
    },
    {
      h2: "II. Datos personales que se recaban",
      bloques: [
        { p: ["Para las finalidades descritas en el presente aviso, el Responsable podrá recabar las siguientes categorías de datos personales:"] },
        {
          ul: [
            [{ b: "Datos de identificación:" }, " nombre completo, número de personas en el grupo."],
            [{ b: "Datos de contacto:" }, " número de teléfono (WhatsApp), correo electrónico."],
            [{ b: "Datos de preferencias de viaje:" }, " fechas deseadas, tour de interés, número de participantes, presupuesto aproximado."],
            [{ b: "Datos del check-in previo al tour" }, " (opcional, lo llena usted): ciudad de origen, fecha de nacimiento, con quién viaja (pareja, amigos, familia, empresa o solo), cómo nos conoció, si es su primera visita a la Huasteca Potosina y el motivo del viaje."],
            [{ b: "Su opinión sobre el servicio:" }, " la calificación, la probabilidad de recomendarnos y los comentarios que nos deje en la encuesta de satisfacción."],
            [{ b: "Datos financieros:" }, " información de pago procesada a través de Stripe (los datos de tarjeta son gestionados exclusivamente por Stripe y no son almacenados por el Responsable)."],
            [{ b: "Datos de navegación:" }, " dirección IP, tipo de navegador, páginas visitadas, duración de la sesión (vía cookies analíticas)."],
          ],
        },
        { p: ["El Responsable ", { b: "no recaba datos personales sensibles" }, " en el sentido de la LFPDPPP. La fecha de nacimiento y la ciudad de origen no son datos sensibles."] },
      ],
    },
    {
      h2: "III. Finalidades del tratamiento",
      bloques: [
        { p: [{ b: "Finalidades primarias" }, " (necesarias para la relación jurídica):"] },
        {
          amplio: true,
          ul: [
            ["Procesar y confirmar reservaciones de tours guiados."],
            ["Enviar información sobre el tour reservado (punto de encuentro, hora de salida, lista de qué llevar)."],
            ["Preparar la logística de su tour con lo que nos cuente en el check-in previo."],
            ["Procesar pagos a través de la pasarela Stripe."],
            ["Emitir confirmaciones y comprobantes de pago."],
            ["Atender aclaraciones, cambios o cancelaciones de reservación."],
            ["Cumplir con obligaciones legales y fiscales aplicables."],
          ],
        },
        { p: [{ b: "Finalidades secundarias" }, " (no necesarias para la relación jurídica — puede oponerse):"] },
        {
          ul: [
            ["Enviar información sobre nuevos tours, destinos y promociones."],
            ["Enviarle una felicitación en su cumpleaños con un beneficio (un descuento para su siguiente tour), solo si lo autoriza con la casilla correspondiente del check-in."],
            ["Realizar encuestas de satisfacción post-tour."],
            ["Elaborar estadísticas internas sobre el perfil de nuestros visitantes y los medios por los que nos conocen, para mejorar nuestros servicios y nuestra publicidad."],
            ["Análisis estadístico anónimo de navegación para mejorar el sitio web."],
          ],
        },
        {
          p: [
            "Si no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo enviando un correo a ",
            mailto(),
            " con el asunto \"Oposición a finalidades secundarias\", dejando sin marcar la casilla de promociones del check-in, o con la liga «Darme de baja» que viene en nuestros correos de promoción.",
          ],
        },
      ],
    },
    {
      h2: "IV. Transferencias de datos personales",
      bloques: [
        { p: ["El Responsable podrá transferir sus datos personales a los siguientes terceros:"] },
        {
          ul: [
            [{ b: "Stripe, Inc." }, " (procesador de pagos) — para gestionar transacciones seguras. Stripe opera bajo su propia política de privacidad."],
            [{ b: "Autoridades competentes" }, " — cuando sea requerido por ley, orden judicial o autoridad administrativa."],
            [{ b: "Guías y operadores locales" }, " — exclusivamente para coordinar la logística de los tours reservados, con datos mínimos necesarios."],
          ],
        },
        { p: ["Además, proveedores que nos prestan servicios tratan sus datos solo por cuenta nuestra y bajo nuestras instrucciones: el envío de correos (Brevo) y el alojamiento del sitio y de la base de datos (Railway)."] },
        { p: ["El Responsable no comercializa, vende ni cede datos personales a terceros con fines de mercadotecnia ajena. Todas las transferencias están sujetas a las mismas medidas de seguridad descritas en este aviso."] },
      ],
    },
    {
      h2: "V. Derechos ARCO",
      bloques: [
        { p: ["Usted tiene derecho a ", { b: "Acceder, Rectificar, Cancelar y Oponerse" }, " (derechos ARCO) al tratamiento de sus datos personales, conforme a la LFPDPPP. También puede revocar en cualquier momento el consentimiento que nos haya dado."] },
        { p: ["Para ejercer sus derechos ARCO, envíe una solicitud a ", mailto(), " que contenga:"] },
        {
          ul: [
            ["Nombre completo e identificación oficial (INE, pasaporte)."],
            ["Descripción clara del derecho que desea ejercer."],
            ["Cualquier elemento que facilite la localización de sus datos."],
          ],
        },
        { p: ["El Responsable dará respuesta en un plazo máximo de ", { b: "20 días hábiles" }, " a partir de recibida la solicitud. Si la respuesta es procedente, se hará efectiva en un plazo de 15 días hábiles adicionales."] },
      ],
    },
    {
      h2: "VI. Uso de cookies y tecnologías de rastreo",
      bloques: [
        { p: ["El sitio web utiliza cookies propias de sesión y cookies analíticas de terceros para mejorar la experiencia de navegación y medir el tráfico. Puede gestionar sus preferencias de cookies a través del banner que aparece en su primera visita o configurando su navegador."] },
        { p: ["Deshabilitar las cookies analíticas no afectará el funcionamiento esencial del sitio ni su capacidad de realizar reservaciones."] },
      ],
    },
    {
      h2: "VII. Medidas de seguridad",
      bloques: [
        { p: ["El Responsable ha implementado medidas de seguridad administrativas, técnicas y físicas para proteger sus datos personales contra daño, pérdida, alteración o acceso no autorizado, incluyendo: transmisión cifrada mediante HTTPS/TLS, acceso restringido a bases de datos mediante autenticación, y proveedores de alojamiento con certificaciones de seguridad."] },
      ],
    },
    {
      h2: "VIII. Cambios al Aviso de Privacidad",
      bloques: [
        {
          p: [
            "El Responsable se reserva el derecho de modificar el presente Aviso de Privacidad en cualquier momento. Cualquier cambio será notificado a través de este sitio web con al menos 30 días de anticipación. La versión vigente siempre estará disponible en ",
            { a: `${SITIO}/aviso-de-privacidad`, href: `${SITIO}/aviso-de-privacidad` },
            ".",
          ],
        },
      ],
    },
    {
      h2: "IX. Contacto",
      bloques: [
        {
          p: [
            "Para cualquier duda, aclaración o ejercicio de derechos ARCO, contáctenos en:",
            { br: true },
            "📧 ",
            mailto(),
            { br: true },
            `📍 ${DOMICILIO}`,
          ],
        },
      ],
    },
  ],

  notaLegal: [
    "Este Aviso de Privacidad fue elaborado conforme a la ",
    { em: LEY },
    " publicada en el DOF el 20 de marzo de 2025. La autoridad en la materia es la Secretaría Anticorrupción y Buen Gobierno, que asumió las funciones del extinto INAI.",
  ],
  volver: { label: "← Volver al inicio", href: "/" },
};

const EN: PrivacidadContent = {
  // 40 caracteres. "Privacy Notice" es el nombre que da la propia ley en sus
  // traducciones; "Privacy Policy" es lo que se busca, y va en la descripción.
  metaTitle: "Privacy Notice — Huasteca Potosina Tours",
  metaDescription:
    "Privacy policy of Huasteca Potosina Tours: what personal data we collect, why, who receives it and how to exercise your ARCO rights under Mexican law.",
  ogTitle: "Privacy Notice — Huasteca Potosina Tours",
  ogDescription:
    "What personal data we collect, what we use it for, who it is transferred to and how to exercise your ARCO rights.",
  ogImageAlt: "Huasteca Potosina Tours",

  inLanguage: "en",
  webPageName: "Privacy Notice",
  webPageDescription:
    "Privacy Notice under Mexico's Federal Law on the Protection of Personal Data Held by Private Parties (LFPDPPP).",
  breadcrumbActual: "Privacy Notice",

  avisoTraduccion: {
    antes: "This is a translation for convenience; ",
    enlace: "the Spanish version",
    despues: " is the legally binding one.",
    href: "/aviso-de-privacidad",
  },

  eyebrow: "Legal",
  h1: "Privacy Notice",
  actualizacionPre: "Last updated: ",

  secciones: [
    {
      h2: "I. Identity and address of the Data Controller",
      bloques: [
        {
          p: [
            { b: RESPONSABLE },
            ` (hereinafter "the Controller"), with its address in ${DOMICILIO} (RFC, Mexican tax ID: ${RFC.en}), is responsible for the processing of your personal data as established in the `,
            { em: LEY },
            " (Federal Law on the Protection of Personal Data Held by Private Parties, LFPDPPP) and its Regulations.",
          ],
        },
        {
          p: [
            "Website: ",
            { a: SITIO, href: SITIO, hover: true },
            { br: true },
            "ARCO rights email: ",
            mailto(true),
          ],
        },
      ],
    },
    {
      h2: "II. Personal data we collect",
      bloques: [
        { p: ["For the purposes described in this notice, the Controller may collect the following categories of personal data:"] },
        {
          ul: [
            [{ b: "Identification data:" }, " full name, number of people in the group."],
            [{ b: "Contact data:" }, " phone number (WhatsApp), email address."],
            [{ b: "Travel preference data:" }, " desired dates, tour of interest, number of participants, approximate budget."],
            [{ b: "Pre-tour check-in data" }, " (optional, filled in by you): city of origin, date of birth, who you are traveling with (partner, friends, family, company or alone), how you heard about us, whether it is your first visit to the Huasteca Potosina and the reason for your trip."],
            [{ b: "Your opinion of the service:" }, " the rating, how likely you are to recommend us and the comments you leave in the satisfaction survey."],
            [{ b: "Financial data:" }, " payment information processed through Stripe (card details are handled exclusively by Stripe and are not stored by the Controller)."],
            [{ b: "Browsing data:" }, " IP address, browser type, pages visited, session length (through analytics cookies)."],
          ],
        },
        { p: ["The Controller ", { b: "does not collect sensitive personal data" }, " as defined by the LFPDPPP. Date of birth and city of origin are not sensitive data."] },
      ],
    },
    {
      h2: "III. Purposes of processing",
      bloques: [
        { p: [{ b: "Primary purposes" }, " (necessary for the legal relationship):"] },
        {
          amplio: true,
          ul: [
            ["Processing and confirming guided tour bookings."],
            ["Sending information about the tour you booked (meeting point, departure time, packing list)."],
            ["Preparing the logistics of your tour with what you tell us in the pre-tour check-in."],
            ["Processing payments through the Stripe payment gateway."],
            ["Issuing confirmations and payment receipts."],
            ["Handling questions, changes or cancellations of bookings."],
            ["Complying with applicable legal and tax obligations."],
          ],
        },
        { p: [{ b: "Secondary purposes" }, " (not necessary for the legal relationship — you may object):"] },
        {
          ul: [
            ["Sending information about new tours, destinations and promotions."],
            ["Sending you a birthday greeting with a benefit (a discount on your next tour), only if you authorize it with the corresponding box in the check-in."],
            ["Conducting post-tour satisfaction surveys."],
            ["Compiling internal statistics on the profile of our visitors and how they hear about us, to improve our services and our advertising."],
            ["Anonymous statistical analysis of browsing to improve the website."],
          ],
        },
        {
          p: [
            "If you do not want your data to be processed for the secondary purposes, you can say so by sending an email to ",
            mailto(),
            " with the subject \"Oposición a finalidades secundarias\" (objection to secondary purposes), by leaving the promotions box unchecked in the check-in, or through the «Darme de baja» (unsubscribe) link included in our promotional emails.",
          ],
        },
      ],
    },
    {
      h2: "IV. Transfers of personal data",
      bloques: [
        { p: ["The Controller may transfer your personal data to the following third parties:"] },
        {
          ul: [
            [{ b: "Stripe, Inc." }, " (payment processor) — to handle secure transactions. Stripe operates under its own privacy policy."],
            [{ b: "Competent authorities" }, " — when required by law, court order or administrative authority."],
            [{ b: "Local guides and operators" }, " — exclusively to coordinate the logistics of booked tours, with the minimum data necessary."],
          ],
        },
        { p: ["In addition, providers that render services to us process your data only on our behalf and under our instructions: email delivery (Brevo) and hosting of the website and the database (Railway)."] },
        { p: ["The Controller does not market, sell or assign personal data to third parties for other parties' marketing purposes. All transfers are subject to the same security measures described in this notice."] },
      ],
    },
    {
      h2: "V. ARCO rights",
      bloques: [
        { p: ["You have the right to ", { b: "Access, Rectify, Cancel and Oppose" }, " (ARCO rights) the processing of your personal data, under the LFPDPPP. You may also revoke at any time the consent you have given us."] },
        { p: ["To exercise your ARCO rights, send a request to ", mailto(), " that includes:"] },
        {
          ul: [
            ["Full name and official ID (INE voter card, passport)."],
            ["A clear description of the right you wish to exercise."],
            ["Any information that helps locate your data."],
          ],
        },
        { p: ["The Controller will respond within a maximum of ", { b: "20 business days" }, " from receipt of the request. If the request is granted, it will take effect within an additional 15 business days."] },
      ],
    },
    {
      h2: "VI. Use of cookies and tracking technologies",
      bloques: [
        { p: ["The website uses its own session cookies and third-party analytics cookies to improve the browsing experience and measure traffic. You can manage your cookie preferences through the banner shown on your first visit or in your browser settings."] },
        { p: ["Disabling analytics cookies will not affect the essential operation of the site or your ability to make bookings."] },
      ],
    },
    {
      h2: "VII. Security measures",
      bloques: [
        { p: ["The Controller has implemented administrative, technical and physical security measures to protect your personal data against damage, loss, alteration or unauthorized access, including: encrypted transmission via HTTPS/TLS, authentication-restricted access to databases, and hosting providers with security certifications."] },
      ],
    },
    {
      h2: "VIII. Changes to this Privacy Notice",
      bloques: [
        {
          // La dirección es la del aviso en español a propósito: es la versión
          // vigente que obliga.
          p: [
            "The Controller reserves the right to modify this Privacy Notice at any time. Any change will be announced on this website at least 30 days in advance. The current version will always be available at ",
            { a: `${SITIO}/aviso-de-privacidad`, href: `${SITIO}/aviso-de-privacidad` },
            ".",
          ],
        },
      ],
    },
    {
      h2: "IX. Contact",
      bloques: [
        {
          p: [
            "For any question, clarification or to exercise your ARCO rights, contact us at:",
            { br: true },
            "📧 ",
            mailto(),
            { br: true },
            `📍 ${DOMICILIO}`,
          ],
        },
      ],
    },
  ],

  notaLegal: [
    "This Privacy Notice was prepared in accordance with the ",
    { em: LEY },
    " published in the Diario Oficial de la Federación (DOF, Mexico's official gazette) on March 20, 2025. The authority on this matter is the Secretaría Anticorrupción y Buen Gobierno (Ministry of Anti-Corruption and Good Governance), which took over the functions of the now-defunct INAI.",
  ],
  volver: { label: "← Back to home", href: "/en" },
};

export function getPrivacidad(locale: Locale): PrivacidadContent {
  return locale === "en" ? EN : ES;
}
