import { localePath, type Locale } from "./config";
import { localizeTour } from "./localize";
import type { AvisoTraduccion } from "./cancelacion.en";
import { CONTACTO } from "@/lib/contacto";
import { TOURS_DB, GRUPO_MAX, esPorPersona } from "@/lib/tours";
import { ANTICIPO_PCT } from "@/lib/carrito";

/**
 * Traducción de /terminos (10 nov 2026).
 *
 * 🔴 Es un documento legal: cada porcentaje (anticipo, 50 %, 70 %, 3 %), cada
 * plazo y cada nombre (NOM-09-TUR, PROFECO, Stripe, la ley) está igual en los
 * dos idiomas. Los números que cambian con el negocio NO se escriben: salen de
 * donde vive la regla (`ANTICIPO_PCT` es lo que cobra Stripe, `GRUPO_MAX` el
 * cupo del catálogo, las excepciones de `tours.ts`). El inglés es una
 * traducción de cortesía; manda el español y la página lo dice arriba.
 *
 * El texto va en piezas (`Seg`) para poder llevar negritas, enlaces y correos
 * sin escribir JSX en un .ts; la página las pinta con las mismas clases que
 * tenía el español.
 */

/** Un trozo de párrafo: texto, negrita, enlace interno, correo o el dominio. */
export type Seg =
  | string
  | { b: string }
  | { link: string; href: string }
  | { mail: string }
  | { web: string };

export type BloqueTerminos = { p: Seg[] } | { ul: Seg[][] };

export interface SeccionTerminos {
  h2: string;
  bloques: BloqueTerminos[];
}

export interface TerminosContent {
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
  h1Pre: string;
  h1Em: string;
  ultimaActualizacion: string;

  intro: Seg[];
  secciones: SeccionTerminos[];

  verTambien: string;
  verTambienLinks: { href: string; label: string }[];
}

/**
 * Los recorridos con condiciones de cancelación propias, del catálogo
 * (`cancelacion` en `tours.ts`). El Edén en el Jardín NO tiene reembolso
 * porque la Fundación Las Pozas no lo devuelve; el resumen prometía
 * "cancelación gratuita" a todos. Uno nuevo con la misma excepción entra solo.
 */
const CON_CANCELACION_PROPIA = TOURS_DB.filter((t) => t.cancelacion);

/**
 * Los que NO se cobran por persona: por grupo completo (`tarifaGrupo`, el Edén)
 * o por vehículo (el RZR, `precio × unidades` en RzrBookingForm). En ninguno
 * hay precio de niño.
 * 🔴 Filtraba solo por `tarifaGrupo` y el RZR se quedaba con el 70 %/50 % en
 * los términos aunque el pago nunca lo aplica. `esPorPersona` es el mismo
 * criterio que usan /precios y /tours.
 */
const SIN_PRECIO_NINO = TOURS_DB.filter((t) => !esPorPersona(t));

/** "A", "A y B", "A, B y C" — o "A and B" en inglés. */
function enLista(nombres: string[], locale: Locale): string {
  const y = locale === "en" ? "and" : "y";
  return nombres.length <= 1
    ? nombres.join("")
    : `${nombres.slice(0, -1).join(", ")} ${y} ${nombres[nombres.length - 1]}`;
}

/**
 * Última revisión del documento. Actualízala si cambian las condiciones (en
 * los dos idiomas: es la misma fecha).
 * 28 sep 2026: pago completo del recorrido suelto de un día, cupo máximo real
 * (salía "12" y el catálogo llega a 14) y las excepciones de cancelación y de
 * precio de niños de los recorridos que no se cobran por persona (el Edén,
 * por grupo, y el RZR, por vehículo).
 * 17 nov 2026: el seguro de viajero solo va incluido en rafting, RZR y el rappel en Tamul
 * (en los demás, opcional a $80 por persona) y la nueva escala de niños
 * (3 o menos gratis, 4 a 7 el 50 %, 8 en adelante adulto).
 */
const ULTIMA_ACTUALIZACION = { es: "17 de noviembre de 2026", en: "November 17, 2026" };

function construir(locale: Locale): TerminosContent {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const sinNino = SIN_PRECIO_NINO.map((t) => localizeTour(t, locale).nombreCorto);
  const mail: Seg = { mail: CONTACTO.email };

  if (!en) {
    return {
      metaTitle: "Términos y condiciones — Tours Huasteca Potosina",
      // La descripción no fija el porcentaje a propósito: la regla vive en
      // `pctACobrar` y ha cambiado dos veces en 2026.
      metaDescription:
        "Condiciones de contratación de nuestros tours: reservas, pagos y anticipo, cancelaciones, responsabilidades del viajero, seguridad y uso de imágenes.",
      ogTitle: "Términos y condiciones — Tours Huasteca Potosina",
      ogDescription: "Condiciones de contratación de nuestros tours en la Huasteca Potosina.",
      ogImageAlt: "Tours Huasteca Potosina",

      inLanguage: "es-MX",
      webPageName: "Términos y condiciones",
      webPageDescription:
        "Condiciones de contratación de los tours: reservas, anticipo, pagos, cancelaciones, responsabilidades del viajero, seguridad y uso de imágenes.",
      breadcrumbActual: "Términos y condiciones",

      avisoTraduccion: null,

      eyebrow: "Legal",
      h1Pre: "Términos y ",
      h1Em: "condiciones",
      ultimaActualizacion: `Última actualización: ${ULTIMA_ACTUALIZACION.es}`,

      intro: [
        "Estas condiciones rigen la contratación de los servicios turísticos que ",
        { b: CONTACTO.nombreComercial },
        " ofrece a través de ",
        { web: "www.huasteca-potosina.com" },
        " y por sus canales de atención. Al reservar un tour aceptas lo que se describe a continuación.",
      ],

      secciones: [
        {
          h2: "1. Quiénes somos",
          bloques: [
            {
              p: [
                `Somos una operadora de turismo de aventura con base en ${CONTACTO.ciudadBase}, que opera recorridos guiados en la Huasteca Potosina con guías certificados en la norma NOM-09-TUR.` +
                  (CONTACTO.razonSocial && CONTACTO.rfc
                    ? ` Razón social: ${CONTACTO.razonSocial}, RFC ${CONTACTO.rfc}.`
                    : ""),
              ],
            },
            { p: [`Contacto: WhatsApp ${CONTACTO.telefonoDisplay} · correo `, mail, "."] },
          ],
        },
        {
          h2: "2. Reservas",
          bloques: [
            {
              ul: [
                ["Una reserva queda confirmada cuando recibimos el pago —completo o el anticipo, según el caso (ver «Precios y pagos»)— y te enviamos la confirmación por correo o WhatsApp. Hasta ese momento no hay lugar apartado."],
                // Decía "12 participantes en la mayoría": el catálogo va de 6 a 14 y
                // la mayoría sale con 14. Sale de `GRUPO_MAX`, como en la FAQ.
                [`Los tours operan con un cupo máximo por salida (hasta ${GRUPO_MAX} participantes; la página de cada recorrido indica el suyo). El cupo se asigna por orden de confirmación.`],
                ["Es tu responsabilidad revisar que los datos de la reserva —fecha, número de personas, edades y punto de encuentro— sean correctos. Avísanos de inmediato si algo no coincide."],
                ["Podemos requerir un mínimo de participantes para operar ciertas salidas. Si no se alcanza, te ofrecemos otra fecha o el reembolso completo."],
              ],
            },
          ],
        },
        {
          h2: "3. Precios y pagos",
          bloques: [
            {
              ul: [
                ["Todos los precios están en pesos mexicanos (MXN) e incluyen lo que cada tour detalla en su página."],
                // El término repite exactamente lo que cobra Stripe (`pctACobrar`,
                // 30 % desde el 29 sep 2026): un término que no coincide con el
                // cobro real es un reclamo esperando.
                [`Toda reserva se aparta con un anticipo del ${ANTICIPO_PCT} % del total; el saldo se liquida el día del tour, en efectivo o con tarjeta. Si lo prefieres, puedes pagar el 100 % al reservar.`],
                ["Los pagos con tarjeta se procesan a través de Stripe. No almacenamos los datos de tu tarjeta en ningún momento."],
                ["El saldo se cubre antes de iniciar el tour, en efectivo, por transferencia o con tarjeta mediante una liga de pago, sin comisión."],
                ["Algunos destinos cobran cuotas locales en efectivo (accesos ejidales, pangas). Cuando así sea, viene indicado en la página del tour o del destino."],
                // `totalRecorrido` cobra la tarifa del grupo completo y el RZR, por
                // vehículo: ninguno tiene tramos de menor.
                [
                  "Los precios de niños se aplican por edad: de 4 a 7 años pagan el 50 % del precio de adulto; los de 3 años o menos van gratis, aunque ocupan lugar, y de 8 en adelante pagan como adulto. Podemos pedir identificación el día del tour." +
                    (sinNino.length > 0
                      ? ` No aplica a ${enLista(sinNino, locale)}, que se ${sinNino.length > 1 ? "cobran" : "cobra"} por vehículo o por grupo completo.`
                      : ""),
                ],
              ],
            },
          ],
        },
        {
          h2: "4. Cancelaciones, cambios y clima",
          bloques: [
            {
              p: [
                "Las condiciones completas están en la ",
                { link: "política de cancelación y clima", href: "/politica-de-cancelacion" },
                ", que forma parte de estos términos. En resumen: cancelación gratuita con 48 horas o más de anticipación; entre 48 y 24 horas se retiene el 50 %; con menos de 24 horas no hay reembolso pero puedes reagendar una vez sin costo. Si cancelamos nosotros —por clima, seguridad o cierre del paraje— eliges entre reembolso completo o reagendar sin costo.",
              ],
            },
            // El texto sale tal cual de `cancelacion.es` del catálogo: el mismo que
            // enseñan la ficha y el pago, para que no haya tres versiones.
            ...CON_CANCELACION_PROPIA.map((t) => ({
              p: [{ b: `Excepción — ${t.nombreCorto}:` }, ` ${t.cancelacion!.es}`] as Seg[],
            })),
          ],
        },
        {
          h2: "5. Tu responsabilidad como participante",
          bloques: [
            {
              ul: [
                ["Debes informarnos al reservar de cualquier condición médica, lesión, embarazo, limitación física o tratamiento que pueda afectar tu participación en actividades de aventura."],
                ["Las instrucciones del guía son obligatorias, incluido el uso de chaleco salvavidas, casco y arnés donde corresponda. El guía puede excluir de una actividad a quien no las siga, sin derecho a reembolso."],
                ["No se permite participar bajo el efecto de alcohol o de sustancias que alteren la coordinación o el juicio."],
                ["Los menores de edad viajan bajo la responsabilidad de su padre, madre o tutor, que debe acompañarlos durante todo el recorrido."],
                ["Debes presentarte en el punto y a la hora acordados. El grupo no espera indefinidamente; llegar tarde puede significar perder la salida sin reembolso."],
                ["Eres responsable de tus objetos personales. No respondemos por pérdida o daño de equipo electrónico, joyería o pertenencias en actividades acuáticas."],
              ],
            },
          ],
        },
        {
          h2: "6. Seguridad y seguro",
          bloques: [
            { p: ["Operamos con guías certificados NOM-09-TUR y equipo de seguridad revisado. Los tours de aventura (rafting, RZR y el rappel en Tamul) incluyen seguro de viajero durante la actividad contratada; en los demás es opcional y cuesta $80 por persona, que se piden al reservar. El seguro tiene las coberturas y los límites que fija la póliza vigente, no sustituye a un seguro de gastos médicos personal y no cubre condiciones preexistentes ni conductas contrarias a las instrucciones del guía."] },
            { p: ["El turismo de aventura implica riesgos inherentes que no se pueden eliminar por completo. Al participar los reconoces y los aceptas. Nuestra responsabilidad se limita al valor de los servicios contratados y no cubre gastos derivados de tu traslado a la región, hospedaje ajeno al paquete, ni daños que resulten de incumplir las instrucciones de seguridad."] },
          ],
        },
        {
          h2: "7. Cambios en el itinerario",
          bloques: [
            { p: ["Los tiempos publicados son estimados. Podemos modificar el orden de las visitas, el punto de encuentro o sustituir un destino por otro equivalente cuando lo exijan las condiciones del río, del clima, del tráfico, del acceso o de la seguridad del grupo. Cuando el cambio sea sustancial te lo comunicamos y aplican las opciones de la política de cancelación."] },
          ],
        },
        {
          h2: "8. Imágenes",
          bloques: [
            {
              p: [
                "Durante los recorridos tomamos fotografías y video, que en varios tours se entregan incluidos. Podemos usar ese material con fines de difusión. Si no quieres aparecer, dínoslo antes de la salida o escríbenos después a ",
                mail,
                " y lo retiramos.",
              ],
            },
          ],
        },
        {
          h2: "9. Datos personales",
          bloques: [
            {
              p: [
                "El tratamiento de tus datos se rige por nuestro ",
                { link: "Aviso de Privacidad", href: "/aviso-de-privacidad" },
                ", conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
              ],
            },
          ],
        },
        {
          h2: "10. Quejas y ley aplicable",
          bloques: [
            { p: ["Si algo no salió como esperabas, escríbenos primero a nosotros: la mayoría de los casos se resuelven directo y rápido. Estas condiciones se rigen por la legislación mexicana y por la Ley Federal de Protección al Consumidor. En caso de controversia son competentes los tribunales de San Luis Potosí, sin perjuicio de tu derecho a acudir a PROFECO."] },
          ],
        },
        {
          h2: "11. Cambios a estos términos",
          bloques: [
            { p: ["Podemos actualizar este documento. La versión aplicable a tu reserva es la publicada en esta página el día en que reservaste; la fecha de la última revisión aparece al inicio."] },
          ],
        },
      ],

      verTambien: "Ver también:",
      verTambienLinks: [
        { href: "/politica-de-cancelacion", label: "Política de cancelación" },
        { href: "/aviso-de-privacidad", label: "Aviso de Privacidad" },
        { href: "/contacto", label: "Contacto" },
      ],
    };
  }

  return {
    // 46 caracteres.
    metaTitle: "Terms and Conditions — Huasteca Potosina Tours",
    // Igual que en español, sin fijar el porcentaje del anticipo.
    metaDescription:
      "Terms for booking our tours in the Huasteca Potosina, Mexico: reservations, payments and deposit, cancellations, traveler duties, safety and use of photos.",
    ogTitle: "Terms and Conditions — Huasteca Potosina Tours",
    ogDescription: "Terms for booking our tours in the Huasteca Potosina, Mexico.",
    ogImageAlt: "Huasteca Potosina Tours",

    inLanguage: "en",
    webPageName: "Terms and Conditions",
    webPageDescription:
      "Terms for booking the tours: reservations, deposit, payments, cancellations, traveler responsibilities, safety and use of photos.",
    breadcrumbActual: "Terms and conditions",

    avisoTraduccion: {
      antes: "This is a translation for convenience; ",
      enlace: "the Spanish version",
      despues: " is the legally binding one.",
      href: "/terminos",
    },

    eyebrow: "Legal",
    h1Pre: "Terms and ",
    h1Em: "conditions",
    ultimaActualizacion: `Last updated: ${ULTIMA_ACTUALIZACION.en}`,

    intro: [
      "These terms govern the booking of the tourism services that ",
      { b: CONTACTO.nombreComercial },
      " offers through ",
      { web: "www.huasteca-potosina.com" },
      " and its customer service channels. By booking a tour you accept what is described below.",
    ],

    secciones: [
      {
        h2: "1. Who we are",
        bloques: [
          {
            p: [
              `We are an adventure tour operator based in ${CONTACTO.ciudadBase}, Mexico, running guided tours in the Huasteca Potosina with guides certified under NOM-09-TUR, Mexico's official standard for specialized tour guides.` +
                (CONTACTO.razonSocial && CONTACTO.rfc
                  ? ` Legal name: ${CONTACTO.razonSocial}, RFC (Mexican tax ID) ${CONTACTO.rfc}.`
                  : ""),
            ],
          },
          { p: [`Contact: WhatsApp ${CONTACTO.telefonoDisplay} · email `, mail, "."] },
        ],
      },
      {
        h2: "2. Bookings",
        bloques: [
          {
            ul: [
              ["A booking is confirmed when we receive payment (in full or the deposit, as applicable; see “Prices and payments”) and send you the confirmation by email or WhatsApp. Until then, no spot is held."],
              [`Tours run with a maximum capacity per departure (up to ${GRUPO_MAX} participants; each tour's page shows its own). Spots are assigned in order of confirmation.`],
              ["It is your responsibility to check that the booking details (date, number of people, ages and meeting point) are correct. Let us know right away if anything doesn't match."],
              ["We may require a minimum number of participants to run certain departures. If it isn't reached, we offer you another date or a full refund."],
            ],
          },
        ],
      },
      {
        h2: "3. Prices and payments",
        bloques: [
          {
            ul: [
              ["All prices are in Mexican pesos (MXN) and include what each tour details on its page."],
              [`Every booking is secured with a deposit of ${ANTICIPO_PCT}% of the total; the balance is paid on the day of the tour, in cash or by card. If you prefer, you can pay 100% when you book.`],
              ["Card payments are processed through Stripe. We never store your card details."],
              ["The balance is paid before the tour starts, in cash, by bank transfer or by card through a payment link, with no fee."],
              ["Some destinations charge local fees in cash (ejido access fees, pangas, which are small boats). When that's the case, it's stated on the tour or destination page."],
              [
                "Children's prices go by age: kids 4–7 pay 50 % of the adult price; ages 3 and under ride free, though they still take a seat; 8 and up pay the adult price. We may ask for ID on the day of the tour." +
                  (sinNino.length > 0
                    ? ` This does not apply to ${enLista(sinNino, locale)}, which ${sinNino.length > 1 ? "are" : "is"} charged per vehicle or per whole group.`
                    : ""),
              ],
            ],
          },
        ],
      },
      {
        h2: "4. Cancellations, changes and weather",
        bloques: [
          {
            p: [
              "The full conditions are in the ",
              { link: "cancellation and weather policy", href: lp("/politica-de-cancelacion") },
              ", which is part of these terms. In short: free cancellation 48 hours or more in advance; between 48 and 24 hours, 50% is retained; with less than 24 hours there is no refund, but you can reschedule once at no cost. If we cancel (because of weather, safety or a site closure), you choose between a full refund or rescheduling at no cost.",
            ],
          },
          ...CON_CANCELACION_PROPIA.map((t) => ({
            p: [{ b: `Exception — ${localizeTour(t, locale).nombreCorto}:` }, ` ${t.cancelacion!.en}`] as Seg[],
          })),
        ],
      },
      {
        h2: "5. Your responsibility as a participant",
        bloques: [
          {
            ul: [
              ["When you book, you must tell us about any medical condition, injury, pregnancy, physical limitation or treatment that could affect your participation in adventure activities."],
              ["The guide's instructions are mandatory, including the use of a life jacket, helmet and harness where applicable. The guide may exclude anyone who does not follow them from an activity, with no right to a refund."],
              ["Taking part under the influence of alcohol or of substances that impair coordination or judgment is not allowed."],
              ["Minors travel under the responsibility of their father, mother or guardian, who must accompany them throughout the tour."],
              ["You must be at the agreed meeting point at the agreed time. The group does not wait indefinitely; arriving late may mean missing the departure with no refund."],
              ["You are responsible for your personal belongings. We are not liable for loss of or damage to electronic equipment, jewelry or belongings during water activities."],
            ],
          },
        ],
      },
      {
        h2: "6. Safety and insurance",
        bloques: [
          { p: ["We operate with NOM-09-TUR certified guides and inspected safety equipment. Adventure tours (rafting, RZR and the Tamul rappel) include traveler insurance during the activity booked; on the others it's optional and costs MXN $80 per person, requested when you book. The insurance carries the coverage and limits set by the policy in force; it does not replace your own health insurance and does not cover pre-existing conditions or conduct contrary to the guide's instructions."] },
          { p: ["Adventure tourism involves inherent risks that cannot be completely eliminated. By taking part, you acknowledge and accept them. Our liability is limited to the value of the services booked and does not cover costs arising from your travel to the region, lodging not included in the package, or damages resulting from failure to follow the safety instructions."] },
        ],
      },
      {
        h2: "7. Itinerary changes",
        bloques: [
          { p: ["Published times are estimates. We may change the order of the visits or the meeting point, or replace a destination with an equivalent one, when river, weather, traffic, access or group-safety conditions require it. When the change is substantial, we will let you know and the options in the cancellation policy apply."] },
        ],
      },
      {
        h2: "8. Photos and video",
        bloques: [
          {
            p: [
              "During the tours we take photos and video, which several tours include at no extra cost. We may use that material for promotional purposes. If you don't want to appear, tell us before departure or write to us afterwards at ",
              mail,
              " and we will remove it.",
            ],
          },
        ],
      },
      {
        h2: "9. Personal data",
        bloques: [
          {
            p: [
              "The handling of your data is governed by our ",
              { link: "Privacy Notice", href: lp("/aviso-de-privacidad") },
              ", in accordance with Mexico's Federal Law on the Protection of Personal Data Held by Private Parties (Ley Federal de Protección de Datos Personales en Posesión de los Particulares).",
            ],
          },
        ],
      },
      {
        h2: "10. Complaints and governing law",
        bloques: [
          { p: ["If something didn't go as you expected, write to us first: most cases are resolved directly and quickly. These terms are governed by Mexican law and by the Federal Consumer Protection Law (Ley Federal de Protección al Consumidor). In the event of a dispute, the courts of San Luis Potosí have jurisdiction, without prejudice to your right to go to PROFECO, Mexico's federal consumer protection agency."] },
        ],
      },
      {
        h2: "11. Changes to these terms",
        bloques: [
          { p: ["We may update this document. The version that applies to your booking is the one published on this page on the day you booked; the date of the last revision appears at the top."] },
        ],
      },
    ],

    verTambien: "See also:",
    verTambienLinks: [
      { href: lp("/politica-de-cancelacion"), label: "Cancellation policy" },
      { href: lp("/aviso-de-privacidad"), label: "Privacy Notice" },
      { href: lp("/contacto"), label: "Contact" },
    ],
  };
}

// Todo sale de constantes del código: se arma una vez por idioma.
const CACHE: Partial<Record<Locale, TerminosContent>> = {};

export function getTerminos(locale: Locale): TerminosContent {
  return (CACHE[locale] ??= construir(locale));
}
