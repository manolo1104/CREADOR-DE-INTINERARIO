import { TOURS_DB, tourDurRange, GRUPO_MAX, esPorPersona, fmtHora12, partesRecogida, recogidaDeTour, salidaCorta } from "@/lib/tours";
import { excepcionesSalida } from "@/lib/recogidaTexto";
import { TOUR_REQUISITOS } from "@/lib/tourRequisitos";
import { incluyeDesayuno, rangoGrupo, rangoPorPersona } from "@/lib/catalogoResumen";
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

// 🔴 Filtraba con `!== "vehiculo"` y el Edén —tarifa del GRUPO entero— subía
// el techo a $2,990 "por persona". `rangoPorPersona` filtra con `esPorPersona`.
const { min: PRECIO_MIN, max: PRECIO_MAX } = rangoPorPersona();

/** Los que no se cobran por cabeza: el RZR por vehículo y el Edén por grupo. */
const OTRA_UNIDAD = TOURS_DB.filter((t) => !esPorPersona(t));

/** Los que llevan desayuno: se cuentan del catálogo, no se escriben. */
const CON_DESAYUNO = TOURS_DB.filter(incluyeDesayuno);

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

/** Con su artículo para ir a media frase ("la Olla de la Luz"); el Edén ya lo trae en el nombre. */
function conArticulo(t: (typeof TOURS_DB)[number], locale: Locale): string {
  const art = t.articulo ? (locale === "en" ? "the " : `${t.articulo} `) : "";
  return `${art}${nombreCorto(t, locale)}`;
}

const yLista = (items: string[], locale: Locale) =>
  new Intl.ListFormat(locale === "en" ? "en" : "es-MX", { type: "conjunction" }).format(items);

/**
 * Los que NO salen a diario: van con un horario que pone otro (`horaTexto`).
 * Hoy es solo el Edén, que sigue al jardín de Las Pozas y no abre los martes.
 */
const SIN_SALIDA_DIARIA = TOURS_DB.filter((t) => recogidaDeTour(t).horaTexto);

/**
 * "Salimos todos los días del año", con la salvedad sacada del catálogo.
 *
 * 🔴 Se prometía a secas de los catorce, en esta FAQ, en el hero de /tours y
 * en llms.txt, mientras la tarjeta del Edén en la MISMA página ya escondía
 * "Salidas todos los días". `corta` deja solo el nombre (para la píldora del
 * hero); la larga pega el horario del catálogo. Devuelve la cláusula SIN
 * punto final.
 */
export function salidaDiaria(locale: Locale, corta = false): string {
  const en = locale === "en";
  const base = en ? "We run tours every day of the year" : "Salimos todos los días del año";
  if (!SIN_SALIDA_DIARIA.length) return base;
  const items = SIN_SALIDA_DIARIA.map((t) => {
    const h = recogidaDeTour(t).horaTexto!;
    return corta ? nombreCorto(t, locale) : `${nombreCorto(t, locale)} (${en ? h.en : h.es})`;
  });
  const varios = items.length > 1;
  return en
    ? `${base}; ${yLista(items, locale)} ${varios ? "run" : "runs"} on ${varios ? "their" : "its"} own schedule`
    : `${base}; ${yLista(items, locale)} ${varios ? "van" : "va"} con horario propio`;
}

/**
 * Los recorridos SIN edad mínima cuya ficha pide que le cuentes las edades
 * antes de apartar (hoy, el Edén), leídos de `edadNota`.
 *
 * 🔴 La FAQ de niños decía que "la única actividad que no es para niños
 * pequeños" era el buceo, y `tourRequisitos.ts` pedía valorar la edad en seis
 * recorridos más. Desde el 2 oct 2026 cinco de ellos tienen edad mínima (8
 * años, dictada por Manolo) y pasan a `CON_EDAD_MINIMA`. Ojo: se detecta por
 * la redacción de `edadNota`; si alguien la reescribe sin "cuéntanos las
 * edades" ni "escríbenos antes de reservar", ese recorrido sale de la lista.
 */
const CONSULTAR_EDADES = TOURS_DB.filter((t) => {
  const r = TOUR_REQUISITOS[t.id];
  return !r?.edadMinima && /cuéntanos las edades|escríbenos antes de reservar/i.test(r?.edadNota ?? "");
});

/** Los que sí tienen edad mínima (el buceo, 10 años; rappel, rafting, Gruta, Amanecer y Olla, 8). */
const CON_EDAD_MINIMA = TOURS_DB.filter((t) => TOUR_REQUISITOS[t.id]?.edadMinima);

/**
 * Las edades mínimas distintas, de menor a mayor. La FAQ arma UNA frase por
 * edad: con seis recorridos, una por cada uno eran seis frases casi iguales.
 */
const EDADES_MINIMAS = Array.from(
  new Set(CON_EDAD_MINIMA.map((t) => TOUR_REQUISITOS[t.id]!.edadMinima!)),
).sort((a, b) => a - b);

/** Tarifa del grupo entero (el Edén): ahí el descuento de niños no aplica. */
const POR_GRUPO = TOURS_DB.filter((t) => t.precioUnidad === "grupo");

/**
 * Los tours de día completo: los que ocupan 8 horas o más.
 *
 * 🔴 Antes eran "los que llegan al tope de duración del catálogo". Valía cuando
 * todos los de día completo duraban 12 h; al pasar Tamul a 12–13 h el tope
 * quedó en 13 y la respuesta decía "1 de ellos son de día completo". Y la
 * lista de "los más cortos" era de cinco slugs escritos a mano: la Gruta y el
 * Edén (3 h) no aparecían. Ahora las dos listas salen del mismo corte.
 */
const HORAS_DIA_COMPLETO = 8;
const DIA_COMPLETO = TOURS_DB.filter((t) => tourDurRange(t)[0] >= HORAS_DIA_COMPLETO);
const DIA_COMPLETO_MIN = Math.min(...DIA_COMPLETO.map((t) => tourDurRange(t)[0]));
const DIA_COMPLETO_MAX = Math.max(...DIA_COMPLETO.map((t) => tourDurRange(t)[1]));
const CORTOS = TOURS_DB.filter((t) => !DIA_COMPLETO.includes(t)).sort(
  (a, b) => tourDurRange(a)[0] - tourDurRange(b)[0] || tourDurRange(a)[1] - tourDurRange(b)[1],
);

/**
 * La salida y el regreso de los de día completo que comparten ventana (hoy,
 * 8–9 AM), con el regreso calculado igual que `regresoDeTour`: hora de salida
 * más duración. Estaba escrito "entre las 6:00 y las 7:00 PM" y Tamul, de
 * 12–13 h, vuelve pasadas las ocho.
 */
const DIA_COMPLETO_COMUN = (() => {
  const grupos = new Map<string, typeof DIA_COMPLETO>();
  for (const t of DIA_COMPLETO.filter((x) => !recogidaDeTour(x).horaTexto)) {
    const k = salidaCorta(t) ?? "";
    grupos.set(k, [...(grupos.get(k) ?? []), t]);
  }
  const lista = Array.from(grupos.values()).sort((a, b) => b.length - a.length)[0] ?? [];
  if (!lista.length) return null;
  const vuelta = lista.map((t) => {
    const ini = recogidaDeTour(t).horaInicio;
    const [a, b] = tourDurRange(t);
    return [ini + a, ini + b];
  });
  return {
    tours: lista,
    desde: fmtHora12(Math.min(...vuelta.map(([a]) => a))),
    hasta: fmtHora12(Math.max(...vuelta.map(([, b]) => b))),
  };
})();

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
  const y = (items: string[]) =>
    new Intl.ListFormat(en ? "en" : "es-MX", { type: "conjunction" }).format(items);
  const diaCompleto = y(DIA_COMPLETO.map((t) => nombreCorto(t, locale)));

  // Los que se cobran de otra forma, cada uno con su unidad. Antes solo se
  // nombraba el RZR y el Edén quedaba dentro de "por persona".
  const otraUnidad = OTRA_UNIDAD.map((t) => {
    const n = conArticulo(t, locale);
    if (t.precioUnidad === "grupo") {
      const r = rangoGrupo(t);
      return en
        ? `${n}, priced per group: ${m(r.min)} to ${m(r.max)} for the whole group depending on its size (${t.groupMin} to ${t.groupMax} people)`
        : `${n}, que se cobra por grupo: de ${m(r.min)} a ${m(r.max)} por el grupo completo según cuántos vayan (de ${t.groupMin} a ${t.groupMax} personas)`;
    }
    return en
      ? `${n}, priced per vehicle from ${m(t.precio)} per unit — fuel, helmets and an instructor guide included — which does not cover transport to Xilitla or meals`
      : `${n}, que se cobra por vehículo desde ${m(t.precio)} por unidad —con gasolina, cascos y guía instructor— y no incluye el transporte hasta Xilitla ni los alimentos`;
  });
  // Con punto y coma: cada excepción ya lleva comas y rayas dentro, y con la
  // lista normal "…ni los alimentos y El Edén…" se leía como una sola.
  const listaLarga = (xs: string[]) =>
    xs.length > 1 ? `${xs.slice(0, -1).join("; ")}; ${en ? "and" : "y"} ${xs[xs.length - 1]}` : (xs[0] ?? "");
  const excepcionUnidad = otraUnidad.length
    ? en
      ? ` The ${otraUnidad.length > 1 ? "exceptions are" : "exception is"} ${listaLarga(otraUnidad)}.`
      : ` ${otraUnidad.length > 1 ? "Las excepciones son" : "La excepción es"} ${listaLarga(otraUnidad)}.`
    : "";
  const desayunos = y(CON_DESAYUNO.map((t) => nombreCorto(t, locale)));

  // "Los demás" (no "los más cortos": ahí caen el rafting de 7 h y el
  // Amanecer de 7–8 h), del catálogo: nombre y horas, con la nota de la ruta
  // cuando el recorrido tiene varias (el RZR).
  const cortos = y(
    CORTOS.map((t) => {
      const h = dur(t.slug, locale);
      const ruta = t.rutas?.length ? (en ? " depending on the route" : " según la ruta") : "";
      return `${nombreCorto(t, locale)} (${h} ${en ? "hours" : "horas"}${ruta})`;
    }),
  );
  const comun = DIA_COMPLETO_COMUN;
  // 🔴 "En 5 de ellos pasamos por ti entre 8:00 y 9:00 AM" dejaba al sexto de
  // día completo (la Olla de la Luz, 7–8 AM) sin hora. Los que no comparten la
  // ventana común se nombran con la suya.
  const otraHora = comun
    ? DIA_COMPLETO.filter((t) => !comun.tours.includes(t))
        .map((t) => ({ t, hora: partesRecogida(t, en).hora }))
        .filter((x) => x.hora)
        .map(({ t, hora }) => (en ? `on ${conArticulo(t, locale)} we pick you up ${hora}` : `en ${conArticulo(t, locale)} pasamos por ti ${hora}`))
    : [];
  const otraHoraTxt = otraHora.length ? `; ${otraHora.join("; ")}` : "";
  const regreso = comun
    ? en
      ? ` ${comun.tours.length === DIA_COMPLETO.length ? "On all of them" : `On ${comun.tours.length} of them`} we pick you up ${partesRecogida(comun.tours[0], true).hora} and bring you back between ${comun.desde} and ${comun.hasta}, depending on the route${otraHoraTxt}. Each tour page gives its exact times.`
      : ` En ${comun.tours.length === DIA_COMPLETO.length ? "todos ellos" : `${comun.tours.length} de ellos`} pasamos por ti ${partesRecogida(comun.tours[0], false).hora} y te regresamos entre las ${comun.desde} y las ${comun.hasta}, según el recorrido${otraHoraTxt}. La ficha de cada uno da la hora exacta.`
    : "";

  // Niños. El descuento solo existe donde se cobra por cabeza: en la tarifa
  // de grupo (el Edén) cada niño cuenta como una persona más del grupo
  // —`calcTourTotal` le pasa a `precioGrupo` adultos + niños—, y el RZR va por
  // vehículo. Edad mínima y "cuéntanos las edades", de `tourRequisitos.ts`.
  const ninosGrupo = POR_GRUPO.length
    ? en
      ? ` On ${yLista(POR_GRUPO.map((t) => conArticulo(t, locale)), locale)} the rate is for the whole group, and each child counts as one more person in it.`
      : ` En ${yLista(POR_GRUPO.map((t) => conArticulo(t, locale)), locale)} la tarifa es del grupo completo y cada niño cuenta como una persona más del grupo.`
    : "";
  // Una frase por edad. "Con buena salud" solo cuando todos los de esa edad son
  // `soloAdultos` (el buceo): sus requisitos publican las condiciones de salud;
  // a los de 8 años nadie les puso esa condición y no se inventa.
  const ninosEdadMin = EDADES_MINIMAS.map((edad) => {
    const tours = CON_EDAD_MINIMA.filter((t) => TOUR_REQUISITOS[t.id]!.edadMinima === edad);
    const lista = yLista(tours.map((t) => nombreCorto(t, locale)), locale);
    const varios = tours.length > 1;
    const salud = tours.every((t) => t.soloAdultos);
    return en
      ? ` ${lista} ${varios ? "are" : "is"} for ages ${edad} and up${salud ? " in good health" : ""}.`
      : ` ${lista} ${varios ? "son" : "es"} a partir de ${edad} años${salud ? " y con buena salud" : ""}.`;
  }).join("");
  const ninosConsultar = CONSULTAR_EDADES.length
    ? en
      ? ` For ${yLista(CONSULTAR_EDADES.map((t) => conArticulo(t, locale)), locale)}, tell us the children's ages before you book and we'll tell you whether it's a good fit.`
      : ` En ${yLista(CONSULTAR_EDADES.map((t) => conArticulo(t, locale)), locale)}, cuéntanos las edades antes de reservar y te decimos si conviene.`
    : "";

  // Política de cancelación propia (el Edén no reembolsa): se nombra con el
  // texto del catálogo en vez de prometer a todos el reembolso del 100 %.
  const cancelPropia = TOURS_DB.filter((t) => t.cancelacion)
    .map((t) => (en ? ` The exception is ${nombreCorto(t, locale)}. ${t.cancelacion!.en}` : ` La excepción es ${nombreCorto(t, locale)}. ${t.cancelacion!.es}`))
    .join("");

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
        a: `Our guided day tours run from $${fmtNumber(PRECIO_MIN, locale)} to ${m(PRECIO_MAX)} per person depending on the route, and the price you see is the final price. Depending on the tour it covers round-trip transport from your lodging (in Ciudad Valles or Xilitla, or in Xilitla only), entrance fees to the parks and attractions on the route, a NOM-09 SECTUR certified guide and safety gear; ${CON_DESAYUNO.length} of them also include breakfast with regional dishes (${desayunos}). Every tour includes travel insurance for everyone in the group and the photos and video your guide takes.${excepcionUnidad}`,
      },
      {
        q: "Where do the tours depart from? Do you pick me up at my hotel?",
        // 🔴 Decía "8:00–9:00 AM en Ciudad Valles o Xilitla… tres recorridos
        // funcionan distinto" escrito a mano; la Gruta sale a las 7 PM y ya
        // eran siete. La lista sale de `excepcionesSalida()`.
        a: `There is no single meeting point, and you do not need to be staying at our hotel: any accommodation works — hotel, hostel, cabin or Airbnb. ${excepcionesSalida(locale)} We confirm your exact pickup time when you book.`,
      },
      {
        q: "How long does a tour last?",
        a: `Between ${DUR_MIN} and ${DUR_MAX} hours, depending on the route. ${DIA_COMPLETO.length} of them are full-day trips of ${DIA_COMPLETO_MIN} to ${DIA_COMPLETO_MAX} hours: ${diaCompleto}. The rest: ${cortos}.${regreso}`,
      },
      {
        q: "When is the best time to visit, and can I come year-round?",
        a: `${salidaDiaria(locale)}. For water at its most intense turquoise, come in the dry season: roughly November through June, at its clearest between March and May. During the rainy season (July to October) the waterfalls carry far more volume and are dramatic to photograph, but the water can turn brown and some river activities are suspended for safety — rafting on the Tampaón, for instance, is confirmed according to the river level on the day.`,
      },
      {
        q: "How do I book, and how much do I pay today?",
        a: `You book online from the tour page — pick a date and the number of travelers — or on WhatsApp, where we reply in under an hour. Book at least 24 hours ahead, subject to availability. A ${ANTICIPO_PCT}% deposit holds your spot and you settle the balance on the day of the tour. Online checkout takes cards (processed by Stripe); if you'd rather pay by bank transfer or a cash deposit at OXXO, message us on WhatsApp and we'll send you the details. If you'd rather arrive with nothing pending, ask us on WhatsApp for a link to pay 100% up front.`,
      },
      {
        q: "Can I bring children?",
        a: `Yes. On tours priced per person there's a children's discount: about 70% of the adult price for ages 6 to 10, and 50% for children under 6.${ninosGrupo} Several low-difficulty routes work very well for families — El Meco Waterfalls, the Stepped Paradise (Minas Viejas and Micos) and the Edward James Surrealist Route.${ninosEdadMin}${ninosConsultar} On the RZR ride, children travel according to the vehicle (the RZR 500 seats 2 adults + 1 child; the Family Defender, 6 adults + 2 kids), so tell us their ages when you book.`,
      },
      {
        q: "What happens if it rains or the tour is called off?",
        a: "We run in light rain: the Huasteca is jungle, and the waterfalls are at their most spectacular with water coming down. If there's an electrical storm, a weather alert, or the river isn't in safe condition, we are the ones who cancel and you choose between a 100% refund or rescheduling at no cost — we never take a group out on a swollen river. The same applies if a site closes: some are run by local ejidos or cooperatives and can close on their own. If you are the one cancelling, it's free 48 hours or more before the tour with a 100% refund including the deposit; between 48 and 24 hours 50% is retained; under 24 hours there is no refund, but you can reschedule once at no cost. One more guarantee: if the water isn't in its turquoise tone on the day of your tour — even if the tour runs — you can reschedule once for free, as long as you tell us on WhatsApp before departure time." + cancelPropia,
      },
      {
        q: "What's the difference between a single tour and a package with lodging?",
        a: `A tour is a one-day departure, usually priced per person, from ${m(PRECIO_MIN)}, with transport from your accommodation, entrance fees and a guide depending on the route, but no hotel. A package is several days with lodging included at Hotel Paraíso Encantado in Xilitla, buffet breakfast on tour days, the tours themselves, transport from the hotel to the start of each tour, entrance fees and certified guides; it is ${comoSeCobra}, from ${m(precioVisible(paqueteMasBarato))} ${etiqueta(paqueteMasBarato)} for the ${paqueteMasBarato.dias}-day / ${paqueteMasBarato.noches}-night package. Both are held with a ${ANTICIPO_PCT}% deposit, with the balance due on the day of the tour. Regular tours run in small groups of up to ${GRUPO_MAX} people either way.`,
      },
    ];
  }

  return [
    {
      q: "¿Cuánto cuesta un tour en la Huasteca Potosina y qué incluye el precio?",
      a: `Los tours guiados de un día cuestan de $${fmtNumber(PRECIO_MIN, locale)} a ${m(PRECIO_MAX)} por persona según el recorrido, y el precio que ves es el precio final. Según el tour incluye: traslado redondo desde tu hospedaje (en Ciudad Valles o Xilitla, o solo en Xilitla), entradas a los parques y atracciones de la ruta, guía certificado NOM-09 SECTUR y equipo de seguridad; ${CON_DESAYUNO.length} de ellos llevan además desayuno con platillos típicos de la región (${desayunos}). Todos incluyen seguro de viaje para todos los integrantes y las fotografías y el video que toma tu guía.${excepcionUnidad}`,
    },
    {
      q: "¿De dónde salen los tours? ¿Pasan por mi hotel?",
      a: `No hay un punto de salida único y no hace falta que te hospedes en nuestro hotel: sirve cualquier hospedaje —hotel, hostal, cabaña o Airbnb—. ${excepcionesSalida(locale)} Confirmamos tu hora exacta de recogida al reservar.`,
    },
    {
      q: "¿Cuánto dura cada tour?",
      a: `De ${DUR_MIN} a ${DUR_MAX} horas, según el recorrido. ${DIA_COMPLETO.length} de ellos son de día completo, de ${DIA_COMPLETO_MIN} a ${DIA_COMPLETO_MAX} horas: ${diaCompleto}. Los demás: ${cortos}.${regreso}`,
    },
    {
      q: "¿Cuál es la mejor época para ir y se puede todo el año?",
      a: `${salidaDiaria(locale)}. Para ver el agua en su tono turquesa más intenso, la mejor temporada es la seca: aproximadamente de noviembre a junio, con su punto más claro entre marzo y mayo. Durante la temporada de lluvias (julio a octubre) el caudal de las cascadas aumenta y es muy fotogénico, pero el agua puede tornarse marrón y algunas actividades acuáticas se suspenden por seguridad — el rafting en el Tampaón, por ejemplo, se confirma según el nivel del río ese día.`,
    },
    {
      q: "¿Cómo reservo y cuánto tengo que pagar hoy?",
      a: `Reservas en línea desde la página del tour —eliges fecha y número de personas— o por WhatsApp, donde respondemos en menos de una hora. Reserva con al menos 24 horas de anticipación, sujeto a disponibilidad. Apartas con el ${ANTICIPO_PCT} % y liquidas el saldo el día del tour. El pago en línea es con tarjeta (los cobros los procesa Stripe); si prefieres transferencia bancaria o depósito en OXXO, escríbenos por WhatsApp y te pasamos los datos. Si prefieres llegar sin pendientes, pídenos por WhatsApp la liga para pagar el 100 % desde el principio.`,
    },
    {
      q: "¿Se puede ir con niños?",
      a: `Sí. En los recorridos que se cobran por persona hay descuento para menores: alrededor del 70 % del precio adulto para edades de 6 a 10 años y 50 % para menores de 6.${ninosGrupo} Los recorridos de dificultad baja más aptos para ir en familia son las Cascadas del Meco, el Paraíso Escalonado (Minas Viejas y Micos) y la Ruta Surrealista de Edward James.${ninosEdadMin}${ninosConsultar} En el Recorrido en RZR los niños viajan según el vehículo (el RZR 500 lleva 2 adultos y 1 niño; el Defender Familiar, 6 adultos y 2 niños), así que avísanos las edades al reservar.`,
    },
    {
      q: "¿Qué pasa si llueve o se suspende el tour?",
      a: "Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, cancelamos nosotros y eliges entre reembolso del 100 % o reagendar sin costo — nunca sacamos un grupo con el río crecido. Lo mismo aplica si el paraje cierra: algunos los administran ejidos o cooperativas locales y pueden cerrar por su cuenta. Si quien cancela eres tú, es gratis con 48 horas o más de anticipación y se te devuelve el 100 % incluido el anticipo; entre 48 y 24 horas antes se retiene el 50 %; con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo. Y una garantía más: si el día de tu tour el agua no está en su tono turquesa —aunque el recorrido opere—, reagendas una vez gratis avisándonos por WhatsApp antes de la hora de salida." + cancelPropia,
    },
    {
      q: "¿Cuál es la diferencia entre un tour suelto y un paquete con hospedaje?",
      a: `Un tour es una salida de un día que casi siempre se cobra por persona, desde ${m(PRECIO_MIN)}, e incluye —según el recorrido— traslado desde tu hospedaje, entradas y guía, pero no el hotel. Un paquete son varios días con hospedaje incluido en el Hotel Paraíso Encantado de Xilitla, desayuno buffet los días de tour, los tours, el transporte del hotel al inicio de cada recorrido, las entradas y los guías certificados; ${comoSeCobra} y va desde ${m(precioVisible(paqueteMasBarato))} ${etiqueta(paqueteMasBarato)} el de ${paqueteMasBarato.dias} días / ${paqueteMasBarato.noches} noches. Los dos se apartan con el ${ANTICIPO_PCT} % y el saldo se liquida el día del tour. En los dos casos los tours regulares salen en grupos pequeños de máximo ${GRUPO_MAX} personas.`,
    },
  ];
}
