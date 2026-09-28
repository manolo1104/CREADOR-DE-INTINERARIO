import { TOURS_DB, tourDurRange, GRUPO_MAX } from "@/lib/tours";
import { PAQUETES_DB, precioVisible, type Paquete } from "@/lib/paquetes";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { fmtMoney, fmtNumber } from "@/lib/i18n/format";
import { localizeTour } from "@/lib/i18n/localize";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import type { Locale } from "@/lib/i18n/config";

/**
 * Preguntas frecuentes de /tours.
 *
 * `/tours` era la única página comercial del sitio SIN bloque de preguntas —
 * 2.154 palabras y posición 18,7— mientras `/tours-en-ciudad-valles`, con un
 * tercio del texto pero CON preguntas, está en la 9,4. Estas ocho salen de las
 * consultas reales de Search Console (precio, salidas, duración, clima, cómo
 * reservar, niños, lluvia, tour suelto vs. paquete), no de un manual.
 *
 * ⚠️ NINGUNA cifra se escribe a mano: precios y duraciones se leen de
 * `TOURS_DB`, los paquetes de `PAQUETES_DB` y el porcentaje del anticipo de
 * `ANTICIPO_PCT` (`carrito.ts`), que es el mismo número que cobra el servidor.
 * Escritas a mano se desfasan: ya pasó con los $1,300 / $1,450 que publicaba
 * /preguntas-frecuentes mientras el catálogo decía otra cosa.
 *
 * ⚠️ Las respuestas son AUTOCONTENIDAS a propósito: una persona —o una IA— debe
 * poder citar una sola de ellas sin haber leído el resto de la página. Nada de
 * "como decíamos arriba".
 */
export interface FaqTour {
  q: string;
  a: string;
}

const porPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo");
const PRECIO_MIN = Math.min(...porPersona.map((t) => t.precio));
const PRECIO_MAX = Math.max(...porPersona.map((t) => t.precio));

/** El RZR es el único recorrido que se cobra por vehículo, no por persona. */
const rzr = TOURS_DB.find((t) => t.precioUnidad === "vehiculo");

const rangos = TOURS_DB.map((t) => tourDurRange(t));
const DUR_MIN = Math.min(...rangos.map(([a]) => a));
const DUR_MAX = Math.max(...rangos.map(([, b]) => b));

/** Duración de un recorrido concreto, leída del catálogo: "4" o "8 a 10". */
function dur(slug: string, locale: Locale): string {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) return "";
  const [a, b] = tourDurRange(t);
  return a === b ? `${a}` : `${a} ${locale === "en" ? "to" : "a"} ${b}`;
}

/**
 * Nombre corto de un recorrido en el idioma pedido: lo que va antes del guion
 * largo de su nombre completo ("Expedición Tamul — Sótano, Cañón & Cueva del
 * Agua" → "Expedición Tamul"). Así los nombres de las respuestas siguen al
 * catálogo aunque alguien renombre un tour.
 */
function nombreCorto(t: (typeof TOURS_DB)[number], locale: Locale): string {
  return localizeTour(t, locale).nombre.split("—")[0].trim();
}

/** Los tours de día completo: los que llegan al tope de duración del catálogo. */
const DIA_COMPLETO = TOURS_DB.filter((t) => tourDurRange(t)[1] === DUR_MAX);
const DIA_COMPLETO_MIN = Math.min(...DIA_COMPLETO.map((t) => tourDurRange(t)[0]));

/**
 * El más barato DE LO QUE SE ENSEÑA. Ordenar por `p.precio` mezclaba peras con
 * manzanas desde el 12 sep 2026: ese campo es siempre el total de la pareja
 * —lo que cobra el motor— y cuatro de los cinco paquetes se anuncian por
 * persona, así que el barato de verdad se decide con `precioVisible()`.
 */
const paqueteMasBarato = [...PAQUETES_DB].sort(
  (a, b) => precioVisible(a) - precioVisible(b),
)[0];

/** Los paquetes que NO se anuncian por persona (hoy, solo la Luna de Miel). */
const PAQ_POR_PAREJA = PAQUETES_DB.filter((p) => !p.precioPorPersona);

export function getToursFaqs(locale: Locale): FaqTour[] {
  const en = locale === "en";
  const m = (n: number) => fmtMoney(n, locale);
  const diaCompleto = DIA_COMPLETO.map((t) => nombreCorto(t, locale)).join(", ");
  const nom = (slug: string) => {
    const t = TOURS_DB.find((x) => x.slug === slug);
    return t ? nombreCorto(t, locale) : "";
  };

  /** «por persona» / «por pareja» de UN paquete, en el idioma pedido. */
  const etiqueta = (p: Paquete) =>
    en ? (p.precioPorPersona ? "per person" : "per couple") : p.precioLabel;

  /**
   * Cómo se cobra un paquete, armado desde `precioPorPersona` —el mismo campo
   * que decide `precioVisible()`— y no escrito a mano. Decir "todos por
   * persona" sería falso mientras la Luna de Miel se venda por pareja; y si
   * mañana todos se anuncian igual, la salvedad desaparece sola.
   */
  const todosPorPareja = PAQ_POR_PAREJA.length === PAQUETES_DB.length;
  const nombresPareja = PAQ_POR_PAREJA.map((p) => localizePaquete(p, locale).nombre);
  const lista = new Intl.ListFormat(en ? "en" : "es-MX", { type: "conjunction" }).format(
    nombresPareja,
  );
  const salvedad =
    nombresPareja.length && !todosPorPareja
      ? en
        ? ` (${lista} ${nombresPareja.length > 1 ? "are" : "is"} priced per couple)`
        : ` (${lista} se cobra${nombresPareja.length > 1 ? "n" : ""} por pareja)`
      : "";
  const comoSeCobra = en
    ? `priced ${todosPorPareja ? "per couple" : "per person"}${salvedad}`
    : `se cobra ${todosPorPareja ? "por pareja" : "por persona"}${salvedad}`;

  if (en) {
    return [
      {
        q: "How much does a tour in the Huasteca Potosina cost, and what does the price include?",
        a: `Our guided day tours run from $${fmtNumber(PRECIO_MIN, locale)} to ${m(PRECIO_MAX)} per person depending on the route, and the price you see is the final price. Depending on the tour it covers round-trip transport from your lodging in Ciudad Valles or Xilitla, breakfast with regional dishes, entrance fees to every park and attraction on the route, a NOM-09 SECTUR certified guide, safety gear, travel insurance for everyone in the group, and the photos and video your guide takes. The one exception is ${nom("rzr-xilitla")}, which is priced per vehicle from ${rzr ? m(rzr.precio) : ""} per unit — fuel, helmets and an instructor guide included — and does not cover transport to Xilitla or meals.`,
      },
      {
        q: "Where do the tours depart from? Do you pick me up at my hotel?",
        a: "There is no single meeting point: we pick you up at your accommodation — hotel, hostel, cabin or Airbnb — in Ciudad Valles or Xilitla between 8:00 and 9:00 AM, with round-trip transport included, and we confirm your exact pickup time when you book. You do not need to be staying at our hotel. Three routes work differently: the RZR off-road ride starts at our base in Xilitla (getting to Xilitla is not included), the Coffee Trail picks you up at your accommodation in Xilitla only, and Discover Scuba Diving takes place at the Media Luna Lagoon in Rioverde.",
      },
      {
        q: "How long does a tour last?",
        a: `Between ${DUR_MIN} and ${DUR_MAX} hours, depending on the route. ${DIA_COMPLETO.length} of them are full-day trips of ${DIA_COMPLETO_MIN} to ${DUR_MAX} hours: ${diaCompleto}. The shorter ones: ${nom("buceo-media-luna")}, ${dur("buceo-media-luna", locale)} hours; ${nom("travesia-del-cafe")}, ${dur("travesia-del-cafe", locale)} hours; ${nom("rappel-tamul")}, ${dur("rappel-tamul", locale)} hours; ${nom("rafting-rio-tampaon")}, ${dur("rafting-rio-tampaon", locale)} hours; and ${nom("rzr-xilitla")}, ${dur("rzr-xilitla", locale)} hours depending on the route you choose. On a full-day tour we pick you up between 8:00 and 9:00 AM and drop you back at your accommodation between 6:00 and 7:00 PM.`,
      },
      {
        q: "When is the best time to visit, and can I come year-round?",
        a: "We run tours every day of the year. For water at its most intense turquoise, come in the dry season: roughly November through June, at its clearest between March and May. During the rainy season (July to October) the waterfalls carry far more volume and are dramatic to photograph, but the water can turn brown and some river activities are suspended for safety — rafting on the Tampaón, for instance, is confirmed according to the river level on the day.",
      },
      {
        q: "How do I book, and how much do I pay today?",
        a: `You book online from the tour page — pick a date and the number of travelers — or on WhatsApp, where we reply in under an hour. Book at least 24 hours ahead, subject to availability. A single-day tour with no lodging is paid in full when you book; from two days on you hold your spot with ${ANTICIPO_PCT}% and settle the balance on the day of the tour. You can pay by card (processed by Stripe), bank transfer or a cash deposit at OXXO, and you can also pay 100% up front if you'd rather arrive with nothing pending.`,
      },
      {
        q: "Can I bring children?",
        a: "Yes. Pricing is per person with a children's discount: about 70% of the adult price for ages 6 to 10, and 50% for children under 6. Several low-difficulty routes work very well for families — El Meco Waterfalls, the Stepped Paradise (Minas Viejas and Micos) and the Edward James Surrealist Route. The one activity that is not for small children is Discover Scuba Diving at the Media Luna Lagoon: it is for ages 10 and up in good health. On the RZR ride, children travel according to the vehicle (the RZR 500 seats 2 adults + 1 child; the Family Defender, 6 adults + 2 kids), so tell us their ages when you book.",
      },
      {
        q: "What happens if it rains or the tour is called off?",
        a: "We run in light rain: the Huasteca is jungle, and the waterfalls are at their most spectacular with water coming down. If there's an electrical storm, a weather alert, or the river isn't in safe condition, we are the ones who cancel and you choose between a 100% refund or rescheduling at no cost — we never take a group out on a swollen river. The same applies if a site closes: some are run by local ejidos or cooperatives and can close on their own. If you are the one cancelling, it's free 48 hours or more before the tour with a 100% refund including the deposit; between 48 and 24 hours 50% is retained; under 24 hours there is no refund, but you can reschedule once at no cost.",
      },
      {
        q: "What's the difference between a single tour and a package with lodging?",
        a: `A tour is a one-day departure priced per person, from ${m(PRECIO_MIN)}, with transport from your accommodation, entrance fees and guide included, but no hotel. A package is several days with lodging included at Hotel Paraíso Encantado in Xilitla, buffet breakfast on tour days, the tours themselves, transport from the hotel to the start of each tour, entrance fees and certified guides; it is ${comoSeCobra}, from ${m(precioVisible(paqueteMasBarato))} ${etiqueta(paqueteMasBarato)} for the ${paqueteMasBarato.dias}-day / ${paqueteMasBarato.noches}-night package. Payment differs too: a single-day tour is paid in full, while from two days on you hold with ${ANTICIPO_PCT}%. Regular tours run in small groups of up to ${GRUPO_MAX} people either way.`,
      },
    ];
  }

  return [
    {
      q: "¿Cuánto cuesta un tour en la Huasteca Potosina y qué incluye el precio?",
      a: `Los tours guiados de un día cuestan de $${fmtNumber(PRECIO_MIN, locale)} a ${m(PRECIO_MAX)} por persona según el recorrido, y el precio que ves es el precio final. Según el tour incluye: traslado redondo desde tu hospedaje en Ciudad Valles o Xilitla, desayuno con platillos típicos de la región, entradas a todos los parques y atracciones de la ruta, guía certificado NOM-09 SECTUR, equipo de seguridad, seguro de viaje para todos los integrantes y las fotografías y el video que toma tu guía. La excepción es ${nom("rzr-xilitla")}, que se cobra por vehículo desde ${rzr ? m(rzr.precio) : ""} por unidad —con gasolina, cascos y guía instructor— y no incluye el transporte hasta Xilitla ni los alimentos.`,
    },
    {
      q: "¿De dónde salen los tours? ¿Pasan por mi hotel?",
      a: "No hay un punto de salida único: pasamos por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Ciudad Valles o en Xilitla entre las 8:00 y las 9:00 AM, con traslado redondo incluido, y confirmamos tu hora exacta de recogida al reservar. No hace falta que te hospedes en nuestro hotel. Tres recorridos funcionan distinto: el Recorrido en RZR sale de nuestra base en Xilitla (el transporte hasta Xilitla no va incluido), la Travesía del Café recoge únicamente en hospedajes de Xilitla y el buceo Descubre el Buceo se realiza en la Laguna de la Media Luna, en Rioverde.",
    },
    {
      q: "¿Cuánto dura cada tour?",
      a: `De ${DUR_MIN} a ${DUR_MAX} horas, según el recorrido. ${DIA_COMPLETO.length} de ellos son de día completo, de ${DIA_COMPLETO_MIN} a ${DUR_MAX} horas: ${diaCompleto}. Los más cortos: ${nom("buceo-media-luna")} dura ${dur("buceo-media-luna", locale)} horas, ${nom("travesia-del-cafe")} ${dur("travesia-del-cafe", locale)}, ${nom("rappel-tamul")} ${dur("rappel-tamul", locale)}, ${nom("rafting-rio-tampaon")} ${dur("rafting-rio-tampaon", locale)} y ${nom("rzr-xilitla")} va de ${dur("rzr-xilitla", locale)} horas según la ruta que elijas. En un tour de día completo pasamos por ti entre las 8:00 y las 9:00 AM y te regresamos a tu hospedaje entre las 6:00 y las 7:00 PM.`,
    },
    {
      q: "¿Cuál es la mejor época para ir y se puede todo el año?",
      a: "Salimos todos los días del año. Para ver el agua en su tono turquesa más intenso, la mejor temporada es la seca: aproximadamente de noviembre a junio, con su punto más claro entre marzo y mayo. Durante la temporada de lluvias (julio a octubre) el caudal de las cascadas aumenta y es muy fotogénico, pero el agua puede tornarse marrón y algunas actividades acuáticas se suspenden por seguridad — el rafting en el Tampaón, por ejemplo, se confirma según el nivel del río ese día.",
    },
    {
      q: "¿Cómo reservo y cuánto tengo que pagar hoy?",
      a: `Reservas en línea desde la página del tour —eliges fecha y número de personas— o por WhatsApp, donde respondemos en menos de una hora. Reserva con al menos 24 horas de anticipación, sujeto a disponibilidad. Un recorrido suelto de un día, sin hospedaje, se paga completo al reservar; desde 2 días apartas con el ${ANTICIPO_PCT} % y liquidas el saldo el día del tour. Puedes pagar con tarjeta (los cobros los procesa Stripe), por transferencia bancaria o con depósito en OXXO, y también puedes pagar el 100 % desde el principio si prefieres llegar sin pendientes.`,
    },
    {
      q: "¿Se puede ir con niños?",
      a: "Sí. El precio es por persona con descuento para menores: alrededor del 70 % del precio adulto para edades de 6 a 10 años y 50 % para menores de 6. Los recorridos de dificultad baja más aptos para ir en familia son las Cascadas del Meco, el Paraíso Escalonado (Minas Viejas y Micos) y la Ruta Surrealista de Edward James. La única actividad que no es para niños pequeños es Descubre el Buceo en la Laguna de la Media Luna: es para mayores de 10 años con buena salud. En el Recorrido en RZR los niños viajan según el vehículo (el RZR 500 lleva 2 adultos y 1 niño; el Defender Familiar, 6 adultos y 2 niños), así que avísanos las edades al reservar.",
    },
    {
      q: "¿Qué pasa si llueve o se suspende el tour?",
      a: "Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, cancelamos nosotros y eliges entre reembolso del 100 % o reagendar sin costo — nunca sacamos un grupo con el río crecido. Lo mismo aplica si el paraje cierra: algunos los administran ejidos o cooperativas locales y pueden cerrar por su cuenta. Si quien cancela eres tú, es gratis con 48 horas o más de anticipación y se te devuelve el 100 % incluido el anticipo; entre 48 y 24 horas antes se retiene el 50 %; con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo.",
    },
    {
      q: "¿Cuál es la diferencia entre un tour suelto y un paquete con hospedaje?",
      a: `Un tour es una salida de un día que se cobra por persona, desde ${m(PRECIO_MIN)}, e incluye traslado desde tu hospedaje, entradas y guía, pero no el hotel. Un paquete son varios días con hospedaje incluido en el Hotel Paraíso Encantado de Xilitla, desayuno buffet los días de tour, los tours, el transporte del hotel al inicio de cada recorrido, las entradas y los guías certificados; ${comoSeCobra} y va desde ${m(precioVisible(paqueteMasBarato))} ${etiqueta(paqueteMasBarato)} el de ${paqueteMasBarato.dias} días / ${paqueteMasBarato.noches} noches. El pago también cambia: un recorrido suelto de un día se paga completo, mientras que desde 2 días apartas con el ${ANTICIPO_PCT} %. En los dos casos los tours regulares salen en grupos pequeños de máximo ${GRUPO_MAX} personas.`,
    },
  ];
}
