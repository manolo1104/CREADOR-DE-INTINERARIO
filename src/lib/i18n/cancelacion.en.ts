import { localePath, type Locale } from "./config";
import { localizeTour } from "./localize";
import { TOURS_DB } from "@/lib/tours";
import { CONTACTO } from "@/lib/contacto";

/**
 * Traducción de /politica-de-cancelacion (10 nov 2026).
 *
 * 🔴 Es un texto con dinero detrás: plazos (48 h, 24 h, 12 meses, 5 a 10 días
 * hábiles) y porcentajes (100 %, 50 %) se copian TAL CUAL del español. Si
 * cambia uno, cambia en los dos bloques de este archivo, que están juntos a
 * propósito para que no se separen. El español es el que obliga: la versión
 * inglesa lo dice arriba y enlaza al original.
 *
 * 🔴 Las excepciones (hoy El Edén en el Jardín) NO se escriben aquí: salen del
 * catálogo (`cancelacion` en `tours.ts`, que ya trae `.es` y `.en`), igual que
 * en la ficha y en el pago, para que no haya tres versiones que puedan
 * separarse. El nombre en inglés sale de `localizeTour`.
 *
 * 🔴 Las respuestas van también al FAQPage, que un buscador o una IA cita SIN
 * la página alrededor: cada una tiene que entenderse sola (de ahí que la
 * remisión a la excepción no diga "abajo").
 */

export interface TramoEscala {
  titulo: string;
  sub: string;
  detalle: string;
}

export interface ExcepcionCancelacion {
  slug: string;
  /** "Excepción: El Edén en el Jardín" */
  titulo: string;
  /** El texto del catálogo (`cancelacion.es` / `cancelacion.en`). */
  texto: string;
  href: string;
}

/** La línea que avisa, solo en inglés, que el texto que obliga es el español. */
export interface AvisoTraduccion {
  antes: string;
  enlace: string;
  despues: string;
  href: string;
}

export interface CancelacionContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;

  /** JSON-LD */
  inLanguage: string;
  webPageName: string;
  webPageDescription: string;
  breadcrumbActual: string;

  avisoTraduccion: AvisoTraduccion | null;

  eyebrow: string;
  h1Pre: string;
  h1Em: string;
  intro: string;
  alcance: string;

  h2SiCancelas: string;
  escala: TramoEscala[];

  h2SiCancelamos: string;
  siCancelamosPre: string;
  siCancelamosStrong: string;
  siCancelamosPost: string;
  opciones: string[];
  decisionGuia: string;

  excepciones: ExcepcionCancelacion[];
  excepcionLink: string;

  h2Preguntas: string;
  faqs: { q: string; a: string }[];

  ayudaTitulo: string;
  ayudaTexto: string;
  ayudaWhatsapp: string;
  ayudaBoton: string;

  verTambien: string;
  verTambienLinks: { href: string; label: string }[];
}

/** Los recorridos que NO siguen esta política (hoy uno: El Edén en el Jardín). */
const EXCEPCIONES = TOURS_DB.filter((t) => t.cancelacion);

/** "A", "A y B", "A, B y C" — o "A and B" en inglés. */
function enLista(nombres: string[], locale: Locale): string {
  const y = locale === "en" ? "and" : "y";
  return nombres.length <= 1
    ? nombres.join("")
    : `${nombres.slice(0, -1).join(", ")} ${y} ${nombres[nombres.length - 1]}`;
}

function construir(locale: Locale): CancelacionContent {
  const en = locale === "en";
  const nombres = EXCEPCIONES.map((t) => localizeTour(t, locale).nombreCorto);
  const varias = nombres.length > 1;

  /** " (salvo El Edén en el Jardín)" o nada, si algún día no queda ninguna excepción. */
  const SALVO = nombres.length
    ? en
      ? ` (except ${enLista(nombres, locale)})`
      : ` (salvo ${enLista(nombres, locale)})`
    : "";

  /**
   * La frase que remite a las condiciones propias, para las respuestas que
   * prometen reembolso. Tiene que entenderse SOLA (va al FAQPage).
   */
  const REMITE = nombres.length
    ? en
      ? ` This does not apply to ${enLista(nombres, locale)}, which ${varias ? "have their" : "has its"} own cancellation terms, described on this same page and on ${varias ? "their tour pages" : "its tour page"}.`
      : ` Esto no aplica a ${enLista(nombres, locale)}, que ${varias ? "tienen" : "tiene"} sus propias condiciones de cancelación, descritas en esta misma página y en ${varias ? "sus fichas" : "su ficha"}.`
    : "";

  const excepciones: ExcepcionCancelacion[] = EXCEPCIONES.map((t, i) => ({
    slug: t.slug,
    titulo: en ? `Exception: ${nombres[i]}` : `Excepción: ${nombres[i]}`,
    texto: en ? t.cancelacion!.en : t.cancelacion!.es,
    href: localePath(`/tours/${t.slug}`, locale),
  }));

  // Una pregunta por excepción, con su texto del catálogo: va también al
  // FAQPage, que es donde un asistente de IA lee "¿tiene reembolso?".
  const faqsExcepcion = excepciones.map((x, i) => ({
    q: en ? `Does this policy apply to ${nombres[i]}?` : `¿Aplica esta política a ${nombres[i]}?`,
    a: `No. ${x.texto}`,
  }));

  if (!en) {
    return {
      metaTitle: "Política de cancelación y clima — Tours Huasteca Potosina",
      // Con la salvedad del Edén no cabía en 155: se acortó la segunda frase
      // ("no te presentas" → "no llegas", 154), no la salvedad (es justo lo que el
      // buscador tiene que enseñar). Una segunda excepción la pasaría del tope.
      metaDescription: `Cancelación gratis hasta 48 h antes con reembolso completo${SALVO}. Qué pasa si cancelas tarde, no llegas, llueve o cierra el paraje.`,
      ogTitle: "Política de cancelación y clima — Tours Huasteca Potosina",
      ogDescription: `Cancelación gratuita hasta 48 h antes${SALVO}. Operamos con lluvia ligera; si el río no es seguro, eliges entre reembolso del 100 % o cambiar la fecha.`,
      ogImageAlt: "Tours Huasteca Potosina",

      inLanguage: "es-MX",
      webPageName: "Política de cancelación y clima",
      webPageDescription:
        "Qué pasa si cancelas o si llueve: plazos de reembolso, reprogramación y el criterio de cancelación por clima.",
      breadcrumbActual: "Política de cancelación",

      avisoTraduccion: null,

      eyebrow: "Política",
      h1Pre: "Cancelación y ",
      h1Em: "clima",
      intro:
        "Reservar un viaje con meses de anticipación da nervios. Estas son las reglas completas, por escrito, para que sepas exactamente qué pasa en cada caso antes de pagar.",
      alcance: `Aplica a todos los tours de un día reservados en este sitio${SALVO}. Los paquetes con hospedaje tienen condiciones propias de hotel que te confirmamos al reservar.`,

      h2SiCancelas: "Si cancelas tú",
      escala: [
        {
          titulo: "48 h o más antes",
          sub: "Reembolso del 100 %",
          // Igual que la FAQ: cubre el anticipo del 30 % y a quien pagó el 100 %.
          detalle: "Se te devuelve todo lo pagado, sea el anticipo o el pago completo. Sin preguntas.",
        },
        {
          titulo: "Entre 48 y 24 h antes",
          sub: "Se retiene el 50 %",
          detalle: "A esa altura ya están comprometidos guía, transporte y entradas.",
        },
        {
          titulo: "Menos de 24 h antes",
          sub: "Sin reembolso · Reagendas 1 vez gratis",
          detalle: "Conservas el valor de tu reserva para otra fecha dentro de 12 meses.",
        },
        {
          titulo: "No presentarse",
          sub: "Sin reembolso",
          detalle: "Si nos avisas antes de la hora de salida, entras en el caso anterior.",
        },
      ],

      h2SiCancelamos: "Si cancelamos nosotros",
      siCancelamosPre:
        "Cancelamos por tormenta eléctrica, alerta meteorológica, río en condiciones no seguras, cierre del paraje por parte del ejido o de Protección Civil, o cualquier causa operativa nuestra. En todos esos casos ",
      siCancelamosStrong: "tú eliges",
      siCancelamosPost: ":",
      opciones: [
        "Reembolso del 100 % de lo pagado.",
        "Reagendar para otra fecha sin ningún costo adicional.",
        "Cambiar a un destino alternativo del mismo nivel, sin cargo extra.",
      ],
      decisionGuia:
        "La decisión de salir o no la toma el guía responsable la mañana del tour, con la información del río y del clima en mano. Tu seguridad va antes que la venta: nunca sacamos un grupo con el río crecido.",

      excepciones,
      excepcionLink: "Ver la experiencia",

      h2Preguntas: "Preguntas sobre la política",
      faqs: [
        {
          q: "¿Puedo cancelar mi tour y recuperar mi dinero?",
          // "sea el anticipo o el pago completo" cubre los dos casos reales: el
          // anticipo del 30 % y quien decidió pagar el 100 % al reservar.
          a: `Sí. Si cancelas con 48 horas o más de anticipación, te devolvemos el 100 % de lo que hayas pagado, sea el anticipo o el pago completo. Sin preguntas y sin trámites.${REMITE}`,
        },
        {
          q: "¿Qué pasa si cancelo con menos de 48 horas?",
          a: "Entre 48 y 24 horas antes de la salida se retiene el 50 % de lo pagado, porque a esa altura ya reservamos guía, transporte y entradas. Con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo adicional dentro de los siguientes 12 meses.",
        },
        {
          q: "¿Qué pasa si no me presento el día del tour?",
          a: "Si no te presentas y no nos avisaste, no hay reembolso ni reagendamiento. Un mensaje de WhatsApp antes de la hora de salida siempre te deja en mejor posición que el silencio.",
        },
        {
          q: "¿Qué pasa si llueve?",
          a: `Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, nosotros cancelamos y eliges entre reembolso del 100 % o reagendar sin costo. Nunca sacamos un grupo con el río crecido.${REMITE}`,
        },
        {
          // 19 nov 2026, Manolo: fuera la «garantía de caudal» (29 sep): el color
          // no lo controlamos nosotros, así que no se garantiza. La pregunta se
          // queda porque la gente la hace; la respuesta es la honesta.
          q: "¿Y si el agua no está turquesa?",
          a: "El color del agua depende del río y del clima, no de nosotros, así que no lo podemos garantizar. En temporada de lluvias el río puede venir crecido y con sedimento aunque el tour opere con normalidad. Si quieres saber cómo está antes de tu salida, pregúntanos por WhatsApp. Si el río no está en condiciones seguras, nosotros cancelamos y eliges entre reembolso del 100 % o reagendar sin costo.",
        },
        {
          q: "¿Qué pasa si el paraje está cerrado?",
          a: `Algunos destinos los administran ejidos o cooperativas locales y pueden cerrar por su cuenta, o Protección Civil puede restringir el acceso. Si eso ocurre te avisamos en cuanto lo sabemos y aplica lo mismo que en una cancelación nuestra: reembolso del 100 % o reagendamiento sin costo, a tu elección. También podemos proponerte un destino alternativo del mismo nivel; si lo aceptas, no hay ningún cargo extra.${REMITE}`,
        },
        {
          q: "¿Cómo cancelo?",
          a: `Por WhatsApp al ${CONTACTO.telefonoDisplay} o por correo a ${CONTACTO.email}, con el nombre de quien reservó y la fecha del tour. Cuenta la hora en que nos escribes, no la hora en que respondemos.`,
        },
        {
          q: "¿Cuánto tarda el reembolso?",
          a: "Si pagaste con tarjeta, el reembolso sale por la misma vía y suele reflejarse en tu estado de cuenta entre 5 y 10 días hábiles, según tu banco. Si pagaste por transferencia, te lo depositamos a la cuenta que nos indiques.",
        },
        ...faqsExcepcion,
      ],

      ayudaTitulo: "¿Tu caso no está aquí?",
      ayudaTexto: "Escríbenos y lo resolvemos como personas.",
      ayudaWhatsapp: "Hola, tengo una duda sobre la política de cancelación de un tour.",
      ayudaBoton: "Escríbenos",

      verTambien: "Ver también:",
      verTambienLinks: [
        { href: "/terminos", label: "Términos y condiciones" },
        { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
        { href: "/info-practica", label: "Info práctica" },
      ],
    };
  }

  return {
    // 55 caracteres. "Policy" va en el título porque es lo que escribe quien
    // lo busca en inglés ("cancellation policy"), no "cancellation and weather".
    metaTitle: "Cancellation & Weather Policy — Huasteca Potosina Tours",
    metaDescription: `Free cancellation up to 48 h before, with a full refund${SALVO}. What happens if you cancel late, miss the tour, it rains or a site closes.`,
    ogTitle: "Cancellation & Weather Policy — Huasteca Potosina Tours",
    ogDescription: `Free cancellation up to 48 h before${SALVO}. We run in light rain; if the river isn't safe, you choose a 100% refund or a new date.`,
    ogImageAlt: "Huasteca Potosina Tours",

    inLanguage: "en",
    webPageName: "Cancellation and Weather Policy",
    webPageDescription:
      "What happens if you cancel or if it rains: refund windows, rescheduling and our criteria for weather cancellations.",
    breadcrumbActual: "Cancellation policy",

    avisoTraduccion: {
      antes: "This is a translation for convenience; ",
      enlace: "the Spanish version",
      despues: " is the legally binding one.",
      href: "/politica-de-cancelacion",
    },

    eyebrow: "Policy",
    h1Pre: "Cancellation and ",
    h1Em: "weather",
    intro:
      "Booking a trip months in advance can be nerve-racking. These are the complete rules, in writing, so you know exactly what happens in each case before you pay.",
    alcance: `Applies to all day tours booked on this site${SALVO}. Packages with lodging have their own hotel terms, which we confirm when you book.`,

    h2SiCancelas: "If you cancel",
    escala: [
      {
        titulo: "48 h or more before",
        sub: "100% refund",
        detalle: "Everything you paid is refunded, whether it was the deposit or the full amount. No questions asked.",
      },
      {
        titulo: "Between 48 and 24 h before",
        sub: "50% is retained",
        detalle: "By then the guide, transportation and entrance fees are already committed.",
      },
      {
        titulo: "Less than 24 h before",
        sub: "No refund · Reschedule once for free",
        detalle: "You keep the value of your booking for another date within 12 months.",
      },
      {
        titulo: "No-show",
        sub: "No refund",
        detalle: "If you let us know before the departure time, the previous case applies.",
      },
    ],

    h2SiCancelamos: "If we cancel",
    siCancelamosPre:
      "We cancel for thunderstorms, weather alerts, unsafe river conditions, closure of the site by the ejido (the community that manages the land) or by Civil Protection (Protección Civil), or any operational reason on our side. In all of those cases ",
    siCancelamosStrong: "you choose",
    siCancelamosPost: ":",
    opciones: [
      "A 100% refund of what you paid.",
      "Rescheduling for another date at no additional cost.",
      "Switching to an alternative destination of the same level, at no extra charge.",
    ],
    decisionGuia:
      "The decision to go or not is made by the lead guide on the morning of the tour, with the river and weather information in hand. Your safety comes before the sale: we never take a group out when the river is running high.",

    excepciones,
    excepcionLink: "See the experience",

    h2Preguntas: "Questions about the policy",
    faqs: [
      {
        q: "Can I cancel my tour and get my money back?",
        a: `Yes. If you cancel 48 hours or more in advance, we refund 100% of what you paid, whether it was the deposit or the full amount. No questions asked and no paperwork.${REMITE}`,
      },
      {
        q: "What happens if I cancel less than 48 hours before?",
        a: "Between 48 and 24 hours before departure, 50% of what you paid is retained, because by then we have already booked the guide, transportation and entrance fees. With less than 24 hours' notice there is no refund, but you can reschedule once at no additional cost within the following 12 months.",
      },
      {
        q: "What happens if I don't show up on the day of the tour?",
        a: "If you don't show up and didn't let us know, there is no refund and no rescheduling. A WhatsApp message before the departure time always leaves you in a better position than silence.",
      },
      {
        q: "What happens if it rains?",
        a: `We run in light rain: the Huasteca is a jungle and the waterfalls look even more spectacular with water. If there is a thunderstorm, a weather alert or the river is not safe, we cancel and you choose between a 100% refund or rescheduling at no cost. We never take a group out when the river is running high.${REMITE}`,
      },
      {
        q: "What if the water isn't turquoise?",
        a: "The water's color depends on the river and the weather, not on us, so we can't guarantee it. In the rainy season the river can run high and carry sediment even when the tour operates normally. If you'd like to know how it looks before your departure, ask us on WhatsApp. If the river isn't safe, we cancel and you choose between a 100% refund or rescheduling at no cost.",
      },
      {
        q: "What happens if the site is closed?",
        a: `Some destinations are managed by ejidos (communal landholders) or local cooperatives and can close on their own, or Civil Protection (Protección Civil) can restrict access. If that happens, we let you know as soon as we find out, and the same applies as when we cancel: a 100% refund or rescheduling at no cost, your choice. We can also suggest an alternative destination of the same level; if you accept it, there is no extra charge.${REMITE}`,
      },
      {
        q: "How do I cancel?",
        a: `By WhatsApp at ${CONTACTO.telefonoDisplay} or by email at ${CONTACTO.email}, with the name of the person who booked and the date of the tour. What counts is the time you write to us, not the time we reply.`,
      },
      {
        q: "How long does the refund take?",
        a: "If you paid by card, the refund goes back the same way and usually shows up on your statement within 5 to 10 business days, depending on your bank. If you paid by bank transfer, we deposit it into the account you give us.",
      },
      ...faqsExcepcion,
    ],

    ayudaTitulo: "Is your case not covered here?",
    ayudaTexto: "Write to us and we'll sort it out, person to person.",
    ayudaWhatsapp: "Hi, I have a question about the cancellation policy for a tour.",
    ayudaBoton: "Message us",

    verTambien: "See also:",
    verTambienLinks: [
      { href: "/en/terminos", label: "Terms and conditions" },
      { href: "/en/preguntas-frecuentes", label: "FAQ" },
      { href: "/en/info-practica", label: "Practical info" },
    ],
  };
}

// El catálogo de excepciones no cambia en caliente (es código), así que se
// arma una vez por idioma.
const CACHE: Partial<Record<Locale, CancelacionContent>> = {};

export function getCancelacion(locale: Locale): CancelacionContent {
  return (CACHE[locale] ??= construir(locale));
}
