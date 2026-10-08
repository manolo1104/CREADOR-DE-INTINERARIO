/**
 * Generación de /llms.txt y /llms-full.txt a partir de la fuente real.
 *
 * Antes eran dos archivos estáticos en `public/`, escritos a mano. Se
 * desfasaron sin que nadie lo notara: publicaban 8 tours cuando ya había 10
 * (faltaban buceo Media Luna y Travesía del Café), seis de los ocho precios
 * estaban $100 por debajo del real y decían "16 municipios" habiendo 15.
 * Como es el archivo que leen ChatGPT, Perplexity y Claude, el catálogo y los
 * precios que citaban al viajero eran falsos.
 *
 * Ahora se arman desde TOURS_DB / PAQUETES_DB / DESTINOS_DB, igual que
 * `sitemap.ts`, así que no pueden volver a desfasarse al agregar un tour.
 *
 * Desde el 14 ago se generan también en INGLÉS (/en/llms.txt). El sitio ya
 * estaba traducido, pero este archivo seguía siendo solo español: un ChatGPT
 * respondiendo en inglés a "tours in Huasteca Potosina" leía el catálogo en un
 * idioma que su usuario no habla. Los precios NO se convierten: se quedan en
 * pesos, etiquetados como MXN, porque el tipo de cambio del día no es un dato
 * que este archivo pueda conocer.
 *
 * Formato (29 sep 2026): el de llmstxt.org, y así se arma cada archivo:
 *
 * - /llms.txt y /en/llms.txt siguen la especificación AL PIE: H1, un blockquote
 *   de resumen en UN renglón, luego la prosa (quiénes somos, reserva, cómo
 *   llegar…) SIN encabezados —la especificación la admite ahí, "de cualquier
 *   tipo salvo encabezados"— y al final secciones H2 que son SOLO listas de
 *   enlaces «- [Nombre](url): notas», con las notas en el mismo renglón.
 *   🔴 El parser de referencia (`parse_llms_file` de AnswerDotAI/llms-txt, el
 *   que usa `llms_txt2ctx`) pasa CADA renglón no vacío de cada H2 por un regex
 *   de enlace y revienta con AttributeError en el primero que no lo es. El 28
 *   sep ya iban en enlaces Markdown, pero con la prosa dentro de "## Sobre
 *   nosotros", renglones de continuación ("  Visita:", "  Salida:") y dos
 *   enlaces sin viñeta, tronaba en el primer H2: 84 renglones en español y 94
 *   en inglés. Tampoco sirve un H3 dentro de un H2: su regex `^##` lo toma
 *   como otra sección. Antes de eso la URL iba suelta en el renglón de abajo
 *   y no extraía NINGUNO de los 14 tours.
 * - /llms-full.txt es el documento de contexto ya expandido (lo que
 *   `llms_txt2ctx` produciría): prosa bajo H2 y un H3 por tour. No está hecho
 *   para pasar por `parse_llms_file`, y no hace falta.
 *
 * La prosa se escribe una sola vez (`Bloque`) y `bloque()` decide si va como
 * párrafo con título en negritas (corto) o como sección H2 (completo).
 */

import {
  TOURS_DB,
  tourDurTexto,
  PRIVADO_EXTRA_POR_PERSONA,
  esPorPersona,
  etiquetaUnidad,
  fraseRecogida,
  incluyeDeTour,
  partesRecogida,
  type Tour,
} from "@/lib/tours";
import { excepcionesSalida, horaEnLista } from "@/lib/recogidaTexto";
import { enAuto } from "@/lib/tiemposDeViaje";
import { salidaDiaria } from "@/lib/faqTours";
import { rangoGrupo, rangoPorPersona, recogenEnValles } from "@/lib/catalogoResumen";
import { urlBlog } from "@/lib/blogDestinoMap";
import { prisma } from "@/lib/prisma";
import { PAQUETES_DB, precioVisible, type Paquete } from "@/lib/paquetes";
import { DESTINOS_DB } from "@/lib/destinos";
import { fechaInicioTexto } from "@/lib/temporada";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { GOOGLE_RATING, GOOGLE_RESENAS, resenasTexto } from "@/lib/resenas";
import { CIUDADES_ORIGEN } from "@/lib/ciudadesOrigen";
import { CIUDADES_ORIGEN_EN } from "@/lib/ciudadesOrigenEn";
// La MISMA función con que la ficha del tour decide la ciudad de recogida (ver
// `salidaDeTour`). Vive en el componente y no en `tours.ts`; se importa de ahí
// en vez de copiarla para que el llms y la ficha no puedan volver a decir cosas
// distintas. Solo la usan las rutas /llms*.txt, que corren en el servidor.
import { ciudadUnicaDeRecogida } from "@/components/TourDeparture";
import { localizeTour, localizeDestino } from "@/lib/i18n/localize";
import { getLocalizedPaquetes } from "@/lib/i18n/paquetes.en";
import { localePath, type Locale } from "@/lib/i18n/config";

const SITE = "https://www.huasteca-potosina.com";

const mxn = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** URL absoluta de una ruta interna, con el prefijo de idioma que toque. */
const url = (path: string, locale: Locale) => `${SITE}${localePath(path, locale)}`;

/**
 * Precio de un tour con su unidad real: el RZR se cobra por vehículo y el Edén
 * por grupo.
 *
 * 🔴 El Edén salía como "$2,990 MXN" a secas bajo un encabezado de "precios por
 * persona": un asistente le habría dicho a una familia de siete que pagaba
 * siete veces $2,990, cuando el grupo entero paga $4,160.
 */
function precioTour(t: Tour, locale: Locale): string {
  const en = locale === "en";
  if (t.precioUnidad === "grupo") {
    const { min, max } = rangoGrupo(t);
    const rango = min === max ? mxn(min) : en ? `${mxn(min)} TO ${mxn(max)}` : `DE ${mxn(min)} A ${mxn(max)}`;
    return en
      ? `${rango} PER WHOLE GROUP, depending on its size (not per person)`
      : `${rango} POR GRUPO COMPLETO, según cuántos vayan (no por persona)`;
  }
  if (t.precioUnidad !== "vehiculo") {
    // La escalera por tamaño de grupo se dice entera: un asistente que solo lea
    // "$1,550 por persona" cotizaría de más a un grupo de seis.
    if (t.escalaPersona?.length) {
      const tramos = [...t.escalaPersona]
        .sort((a, b) => a.desde - b.desde)
        .map((e) => (en
          ? `from ${e.desde} people ${mxn(t.precio - e.menos)} each`
          : `desde ${e.desde} personas ${mxn(t.precio - e.menos)} cada uno`))
        .join(" · ");
      return en
        ? `${mxn(t.precio)} per person for 1 or 2; the per-person price drops with the group size: ${tramos}. It does NOT stack with the low-season promo.`
        : `${mxn(t.precio)} por persona con 1 o 2; el precio por persona baja según el tamaño del grupo: ${tramos}. NO se suma a la promo de temporada baja.`;
    }
    return mxn(t.precio);
  }
  return en
    ? `FROM ${mxn(t.precio)} PER VEHICLE (not per person)`
    : `DESDE ${mxn(t.precio)} POR VEHÍCULO (no por persona)`;
}

/** El tour tal cual está en `TOURS_DB` (español), a partir del localizado. */
const tourBase = (t: Tour): Tour => TOURS_DB.find((x) => x.id === t.id) ?? t;

/**
 * "Otros nombres: Hoya de la Luz, …" cuando el tour trae `seo.alias`.
 *
 * 🔴 En inglés el recorrido se llama "Xilo Cave", pero el letrero, Google Maps
 * y quien pregunta desde México dicen "Gruta de Xilo", y ese nombre no salía en
 * /en/llms.txt (solo el plural del alias). Igual con el Edén, el Amanecer, la
 * Ruta Acuática… En inglés va primero el nombre corto en español de
 * `TOURS_DB` cuando es distinto del traducido; es el mismo criterio del
 * `alternateName` de la ficha (tours/[slug]/page.tsx). Sin duplicados.
 */
function aliasTour(t: Tour, locale: Locale): string | null {
  const base = tourBase(t);
  const alias = Array.from(new Set([
    ...(locale === "en" && base.nombreCorto !== t.nombreCorto ? [base.nombreCorto] : []),
    ...(base.seo?.alias?.filter(Boolean) ?? []),
  ]));
  if (!alias.length) return null;
  return locale === "en" ? `Also known as: ${alias.join(", ")}.` : `También se le conoce como: ${alias.join(", ")}.`;
}

/**
 * Cómo llega el cliente a este recorrido, con la ciudad única ya aplicada.
 *
 * 🔴 IA-03: el Rappel no declara `recogida`, así que `fraseRecogida` le daba el
 * caso por defecto ("tu hospedaje en Xilitla o Ciudad Valles"), mientras que
 * su ficha, su pregunta frecuente y su `incluye` ("Traslado desde Ciudad
 * Valles") dicen SOLO Ciudad Valles. La ficha aplica `ciudadUnicaDeRecogida`
 * encima de `partesRecogida`; aquí se hace lo mismo con la misma función. No
 * se decide nada nuevo: si mañana el catálogo le da al Rappel una `recogida`
 * propia, esta rama deja de aplicarse sola.
 */
function salidaDeTour(t: Tour, locale: Locale): string {
  const en = locale === "en";
  const ciudad = ciudadUnicaDeRecogida(tourBase(t));
  if (!ciudad) return fraseRecogida(t, en);
  // `ciudadUnicaDeRecogida` solo responde con recogida en hospedaje, así que
  // no hay nota de Ciudad Valles que añadir: la misma forma que `fraseRecogida`.
  const p = partesRecogida(t, en);
  const hora = p.hora ? ` ${p.hora}` : "";
  const veh = p.vehiculo ? (en ? `, in an ${p.vehiculo},` : `, en ${p.vehiculo},`) : "";
  return en
    ? `We pick you up at your lodging in ${ciudad}${veh}${hora}.`
    : `Pasamos por ti a tu hospedaje en ${ciudad}${veh}${hora}.`;
}

/**
 * Los recorridos que recogen en UNA sola ciudad aunque el catálogo los cuente
 * como "Xilitla o Ciudad Valles" (hoy, el Rappel). `excepcionesSalida()` los
 * mete en "la mayoría"; esto añade la excepción con la frase de su ficha.
 */
function excepcionesCiudadUnica(locale: Locale): string {
  const en = locale === "en";
  return TOURS_DB.filter((t) => ciudadUnicaDeRecogida(t))
    .map((t) => {
      const nombre = localizeTour(t, locale).nombreCorto;
      const ciudad = ciudadUnicaDeRecogida(t)!;
      return en
        ? ` Exception — ${nombre} (${horaEnLista(t, en)}): we pick you up only at your lodging in ${ciudad}.`
        : ` Excepción — ${nombre} (${horaEnLista(t, en)}): pasamos por ti solo a tu hospedaje en ${ciudad}.`;
    })
    .join("");
}

/**
 * Los que NO se cobran por persona, con su unidad: "Recorrido en RZR por
 * Xilitla: por vehículo; El Edén en el Jardín: por grupo". Antes era "(el RZR
 * se cobra por vehículo)" escrito a mano.
 */
function otrasUnidades(locale: Locale): string {
  return TOURS_DB.filter((t) => !esPorPersona(t))
    .map((t) => `${localizeTour(t, locale).nombreCorto}: ${etiquetaUnidad(t, locale === "en")}`)
    .join("; ");
}

/** Tours con política de cancelación propia, con el texto del catálogo. */
function cancelacionPropia(locale: Locale): string {
  return TOURS_DB.filter((t) => t.cancelacion)
    .map((t) =>
      locale === "en"
        ? ` Exception — ${localizeTour(t, locale).nombreCorto}: ${t.cancelacion!.en}`
        : ` Excepción — ${localizeTour(t, locale).nombreCorto}: ${t.cancelacion!.es}`,
    )
    .join("");
}

function grupoTour(t: Tour, locale: Locale): string {
  if (locale === "en") {
    return t.groupMin === t.groupMax
      ? `group of ${t.groupMax}`
      : `group of ${t.groupMin}–${t.groupMax}`;
  }
  return t.groupMin === t.groupMax
    ? `grupo de ${t.groupMax} personas`
    : `grupo ${t.groupMin}–${t.groupMax} personas`;
}

/** `dificultad` no se traduce en la base (es una clave), así que se mapea aquí. */
const DIFICULTAD_EN: Record<string, string> = { baja: "easy", media: "moderate", alta: "advanced" };
const dificultad = (t: Tour, locale: Locale) =>
  locale === "en" ? DIFICULTAD_EN[t.dificultad] ?? t.dificultad : t.dificultad;

type Destino = (typeof DESTINOS_DB)[number];

/** Municipios ordenados de más a menos fichas. */
function destinosPorZona(locale: Locale): [string, Destino[]][] {
  const porZona: Record<string, Destino[]> = {};
  for (const base of DESTINOS_DB) {
    const d = localizeDestino(base, locale);
    (porZona[d.zona] ??= []).push(d);
  }
  return Object.entries(porZona).sort((a, b) => b[1].length - a[1].length);
}

// ── Bloques de prosa fija, por idioma ──────────────────────────────────────

/** Un bloque de prosa con su título, sin decidir todavía cómo se encabeza. */
interface Bloque {
  titulo: string;
  cuerpo: string;
}

/**
 * Cómo se escribe un bloque según el archivo.
 *
 * - Completo (`full`): sección H2, que es como mejor se lee un documento.
 * - Corto: va en el preámbulo, entre el blockquote y el primer H2, así que NO
 *   puede llevar encabezado (ni H2 ni H3: el `^##` del parser también los
 *   parte). El título va en negritas; si el cuerpo es una lista, en su propio
 *   renglón, porque "**Título.** - WhatsApp…" no sería lista.
 */
function bloque(b: Bloque, full: boolean): string {
  if (full) return `## ${b.titulo}\n${b.cuerpo}`;
  return b.cuerpo.startsWith("- ") ? `**${b.titulo}**\n${b.cuerpo}` : `**${b.titulo}.** ${b.cuerpo}`;
}

// La calificación sale de `resenas.ts` y de nadie más: escrita a mano aquí, el
// día que cambie el perfil de Google este archivo seguiría citando la vieja,
// que es justo como se coló el 4.9 / 492 en el resto del sitio.
// El blockquote va en UN renglón: el parser de referencia toma como resumen
// solo el primer renglón de la cita, y partido en cuatro se quedaba con "…San
// Luis Potosí, México." y sin precios, seguro ni calificación.
const CABECERA: Record<Locale, string> = {
  es: `# Tours Huasteca Potosina

> Operadora turística local certificada en la Huasteca Potosina, San Luis Potosí, México. Tours guiados con precio final en pesos mexicanos (MXN): seguro de viaje y fotografías en todos; transporte desde tu hospedaje, entradas, equipo de seguridad y desayuno según el recorrido. Guías certificados NOM-09 SECTUR. ${resenasTexto(false)}.`,
  en: `# Huasteca Potosina Tours

> Certified local tour operator in the Huasteca Potosina, San Luis Potosí, Mexico. Guided tours at a final price in Mexican pesos (MXN): travel insurance and photographs on every tour; transport from your lodging, entrance fees, safety gear and breakfast depending on the tour. NOM-09 SECTUR certified guides. ${resenasTexto(true)}.`,
};

/**
 * 🔴 Decía "Salidas: todos los días, entre 8:00 y 9:00 AM. Recogemos al
 * viajero en su hospedaje, tanto en Xilitla como en Ciudad Valles" de todos.
 * Con la Gruta (7 PM, solo Xilitla) un asistente mandaba al viajero a esperar
 * de mañana en Valles. La salida y sus excepciones salen de
 * `excepcionesSalida()`, y las unidades y la cancelación, del catálogo.
 */
function reserva(locale: Locale): Bloque {
  const otras = otrasUnidades(locale);
  // La regla de cobro es la de `pctACobrar()` (carrito.ts): `ANTICIPO_PCT`
  // de anticipo para todo, desde el 29 sep 2026.
  if (locale === "en") {
    return {
      titulo: "Booking information",
      cuerpo: `- WhatsApp: +52 489 109 0388 (https://wa.me/524891090388)
- Website: ${SITE}/en
- Booking: online with secure payment (Stripe) or over WhatsApp. A ${ANTICIPO_PCT}% deposit holds any booking (packages included); the balance is settled on the day of the tour.
- Cancellation: free up to 48 hours before the tour (full refund). Turquoise-water guarantee: if the water isn't turquoise on the day of your tour, you can reschedule once for free (notify on WhatsApp before departure).${cancelacionPropia(locale)}
- Departures and pickup: ${excepcionesSalida(locale)}${excepcionesCiudadUnica(locale)}
- Prices are in Mexican pesos (MXN) and per person${otras ? ` (except — ${otras})` : ""}.
  On per-person tours, children aged 6–10 pay ~70% and under 6 ~50% of the adult price.`,
    };
  }
  return {
    titulo: "Información de reserva",
    cuerpo: `- WhatsApp: +52 489 109 0388 (https://wa.me/524891090388)
- Sitio web: ${SITE}
- Reserva: en línea con pago seguro (Stripe) o por WhatsApp. Cualquier reserva (paquetes incluidos) se aparta con el ${ANTICIPO_PCT} %; el saldo se liquida el día del tour.
- Cancelación: gratuita hasta 48 horas antes del tour (reembolso completo). Garantía de caudal: si el día del tour el agua no está turquesa, se puede reagendar una vez sin costo (avisando por WhatsApp antes de la salida).${cancelacionPropia(locale)}
- Salidas y recogida: ${excepcionesSalida(locale)}${excepcionesCiudadUnica(locale)}
- Precios en pesos mexicanos (MXN) y por persona${otras ? ` (salvo — ${otras})` : ""}. En los recorridos por persona, niños de 6 a 10 años pagan ~70 % y menores de 6 ~50 % del precio adulto.`,
  };
}

const CERTIFICACIONES: Record<Locale, Bloque> = {
  es: {
    titulo: "Calificaciones y certificaciones",
    cuerpo: `- ${GOOGLE_RATING} / 5 · ${GOOGLE_RESENAS} reseñas en Google (calificación de la operadora, no de un tour en particular).
- Guías certificados NOM-09 SECTUR.
- Más de 10,000 viajeros atendidos.`,
  },
  en: {
    titulo: "Ratings and certifications",
    cuerpo: `- ${GOOGLE_RATING} / 5 · ${GOOGLE_RESENAS} Google reviews (the operator's rating, not any single tour's).
- NOM-09 SECTUR certified guides (the Mexican standard for adventure tourism guiding).
- Over 10,000 travelers served.`,
  },
};

const GEOGRAFIA: Record<Locale, Bloque> = {
  es: {
    titulo: "Contexto geográfico",
    cuerpo: `La Huasteca Potosina es una región natural en el noreste del estado de San Luis Potosí, México.
Su ciudad-hub es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base.
Es conocida por sus cascadas de agua turquesa, el jardín surrealista de Edward James
(Las Pozas) en Xilitla, el Sótano de las Golondrinas (un abismo vertical con ~376 m de
caída libre, hasta 512 m de profundidad) y la Cascada de Tamul (la más alta del estado,
~105 m). Se puede venir todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara;
el turquesa más intenso es de marzo a mayo, y es cuando más gente hay. De julio a octubre
las cascadas van a todo caudal y el agua puede bajar con sedimento; si el río crece,
reprogramamos el rafting sin costo. La mejor temporada para venir, con agua clara y antes
de las multitudes de primavera, es del ${fechaInicioTexto("es")} a diciembre.`,
  },
  en: {
    titulo: "Geographic context",
    cuerpo: `The Huasteca Potosina is a natural region in the northeast of the state of San Luis Potosí,
Mexico. Its hub city is Ciudad Valles and its "Pueblo Mágico" is Xilitla, where we are based.
It is known for its turquoise waterfalls, for Edward James's surrealist garden (Las Pozas)
in Xilitla, for the Sótano de las Golondrinas — a vertical shaft with a ~376 m free fall and
up to 512 m deep — and for Tamul Waterfall, the tallest in the state at ~105 m.
You can visit year-round. From ${fechaInicioTexto("en")} through May the water runs clear; the
turquoise is at its most intense from March to May, which is also the busiest time. From
July to October the waterfalls run at full force and the water can carry sediment; if the
river rises, we reschedule rafting at no cost. The best season to visit, with clear water
and ahead of the spring crowds, is ${fechaInicioTexto("en")} through December.`,
  },
};

const COMO_LLEGAR: Record<Locale, Bloque> = {
  es: {
    titulo: "Cómo llegar a Xilitla desde la Ciudad de México",
    cuerpo: `- En autobús (lo más práctico para los paquetes): salida nocturna desde la Terminal Central del
  Norte alrededor de las 10:15 PM (líneas Servicios Coordinados / ETN), llegada a Xilitla cerca de
  las 6:30 AM. Tarifa aproximada $650 MXN por persona. Boletos: https://coordinados.conectagfa.com.mx/
  Al llegar, un taxi de ~$60 MXN llega al Hotel Paraíso Encantado en unos 7 minutos.
- Como llegas al amanecer, entregamos la habitación temprano para descansar y ese mismo día
  arranca el primer tour: el Día 1 del paquete NO se pierde.
- En auto: ${enAuto("cdmx")} (aprox. 339 km) por carretera de sierra; se recomienda manejar de día.
- En avión: el aeropuerto más práctico es Tampico (TAM), a ${enAuto("tampico")} de Xilitla.`,
  },
  en: {
    titulo: "How to reach Xilitla",
    cuerpo: `- Flying in: the most practical airport is Tampico (TAM), ${enAuto("tampico", "xilitla", true)} from Xilitla. Mexico City (MEX)
  is the other common entry point, ${enAuto("cdmx", "xilitla", true)} away by road (about 339 km of mountain highway;
  driving in daylight is recommended).
- By bus from Mexico City (what most package travelers do): an overnight departure from the
  Terminal Central del Norte around 10:15 PM (Servicios Coordinados / ETN), arriving in Xilitla
  around 6:30 AM. Fare is about $650 MXN per person. Tickets: https://coordinados.conectagfa.com.mx/
  On arrival a ~$60 MXN taxi reaches the Hotel Paraíso Encantado in about 7 minutes.
- Because you arrive at dawn, we hand over the room early so you can rest, and the first tour
  starts that same day: Day 1 of the package is not lost.`,
  },
};

function sobreNosotros(locale: Locale): Bloque {
  const grupoMax = Math.max(...TOURS_DB.map((t) => t.groupMax));
  // Cuántos recogen dónde, contado: "recogemos en Xilitla o en Ciudad Valles"
  // a secas dejaba fuera a los cinco que solo recogen en Xilitla.
  //
  // 🔴 IA-03: el Rappel entraba en "los 7 que recogen en las dos ciudades" y su
  // ficha dice solo Ciudad Valles. Los de ciudad única (`ciudadUnicaDeRecogida`,
  // la función de la ficha) se cuentan aparte y con su nombre.
  const nDos = recogenEnValles(TOURS_DB).filter((t) => !ciudadUnicaDeRecogida(t)).length;
  const soloValles = TOURS_DB.filter((t) => ciudadUnicaDeRecogida(t) === "Ciudad Valles");
  const nXilitla =
    TOURS_DB.filter((t) => partesRecogida(t, false).valles).length +
    TOURS_DB.filter((t) => ciudadUnicaDeRecogida(t) === "Xilitla").length;
  const nombres = (ts: Tour[]) => ts.map((t) => localizeTour(t, locale).nombreCorto).join(", ");
  // 🔴 "Salidas todos los días del año" a secas: el Edén va con el horario del
  // jardín, que no abre los martes. La salvedad sale de `salidaDiaria()`.
  if (locale === "en") {
    const valles = soloValles.length ? `, ${soloValles.length} in Ciudad Valles only (${nombres(soloValles)})` : "";
    return {
      titulo: "About us",
      cuerpo: `We are a local tour operator based in Xilitla, a "Pueblo Mágico" in the Huasteca Potosina,
where the hotel and the restaurant our packages use are also ours. We run ${TOURS_DB.length}
guided day tours in small groups (a maximum of ${grupoMax} people depending on the tour).
${salidaDiaria(locale)}. Of the ${TOURS_DB.length} tours, ${nDos} pick travelers up at their lodging in
Xilitla or Ciudad Valles${valles} and ${nXilitla} in Xilitla only; the rest meet at our base in
Xilitla or at the site itself. We also build multi-day packages with accommodation included.
Everything you see — waterfalls, sinkholes, surrealist gardens — is visited with a guide, and
what each tour includes is already in its price.`,
    };
  }
  const valles = soloValles.length ? `, ${soloValles.length} solo en Ciudad Valles (${nombres(soloValles)})` : "";
  return {
    titulo: "Sobre nosotros",
    cuerpo: `Somos una operadora turística local con base en Xilitla, Pueblo Mágico de la Huasteca
Potosina, donde también son nuestros el hotel y el restaurante donde se hospedan y comen
nuestros paquetes. Operamos ${TOURS_DB.length} tours guiados de un día con grupos pequeños
(máximo ${grupoMax} personas según el tour). ${salidaDiaria(locale)}.
De los ${TOURS_DB.length}, ${nDos} pasan por el viajero a su hospedaje en Xilitla o en Ciudad
Valles${valles} y ${nXilitla} solo en Xilitla; los demás parten de nuestra base en Xilitla o del
mismo destino. También armamos paquetes de varios días con hospedaje. Todo lo que ves en
cascadas, sótanos y jardines surrealistas se recorre con guía, y lo que incluye cada recorrido
ya va en su precio.`,
  };
}

function seccionTours(locale: Locale): string {
  const en = locale === "en";
  const tours = TOURS_DB.map((t) => localizeTour(t, locale));
  // 🔴 UN renglón por tour: enlace Markdown y, tras los dos puntos, todas las
  // notas. "Visita" y "Salida" iban en renglones de continuación y cada uno
  // tumbaba el parser de llmstxt.org (ver la cabecera del archivo).
  const lineas = tours.map((t) =>
    [
      `- [${t.nombre}](${url(`/tours/${t.slug}`, locale)}): ${precioTour(t, locale)} · ~${tourDurTexto(t)} · ${grupoTour(t, locale)}.`,
      // "Visita", no "Incluye": son los destinos, no lo que cubre el precio
      // (que en la versión completa va aparte, con su propia etiqueta).
      en ? `Visits: ${t.destinos.join(", ")}.` : `Visita: ${t.destinos.join(", ")}.`,
      // Dónde y a qué hora, por tour: la misma frase que dice su ficha.
      en ? `Pickup: ${salidaDeTour(t, locale)}` : `Salida: ${salidaDeTour(t, locale)}`,
      aliasTour(t, locale),
    ]
      .filter(Boolean)
      .join(" "),
  );

  // Solo los que se cobran por cabeza: con el Edén dentro, el techo del
  // rango "por persona" era la tarifa de un grupo entero.
  const { min, max } = rangoPorPersona();
  const titulo = en
    ? `## Available tours (${TOURS_DB.length} tours; prices in Mexican pesos, per person unless noted; ${mxn(min)} – ${mxn(max)} per person)`
    : `## Tours disponibles (${TOURS_DB.length} tours; precios en pesos mexicanos MXN, por persona salvo donde se indique; de ${mxn(min)} a ${mxn(max)} por persona)`;

  return `${titulo}\n${lineas.join("\n")}`;
}

/**
 * La unidad en la que se ANUNCIA un paquete.
 *
 * Sale de `precioPorPersona` y no de `precioLabel` porque la etiqueta es texto
 * suelto y duplicado (catálogo español y `paquetes.en.ts`): si una de las dos
 * copias se queda en "per couple" pegada a un importe ya dividido entre dos,
 * este archivo publica la mitad del precio real —el mismo desfase que arrastró
 * durante meses—. Derivarla del campo que usa `precioVisible()` para dividir
 * mantiene importe y unidad atados.
 */
function unidadPaquete(p: Paquete, locale: Locale): string {
  if (p.precioPorPersona) return locale === "en" ? "per person" : "por persona";
  return locale === "en" ? "per couple" : "por pareja";
}

/**
 * Qué significa la unidad de los paquetes, según cuántos se anuncian por
 * persona. Sale de `precioPorPersona`, el mismo campo que usa `precioVisible()`.
 *
 * 🔴 IA-06: decía «Los que dicen "por persona" se cotizan sobre una base de dos
 * adultos» cuando, desde el catálogo de cuatro del 24 sep, NINGUNO dice "por
 * persona": los cuatro van por pareja. Un asistente podía leer que había
 * paquetes por persona y partir el importe entre dos.
 */
function notaUnidadPaquetes(paquetes: Paquete[], locale: Locale): string {
  const en = locale === "en";
  const porPersona = paquetes.filter((p) => p.precioPorPersona);
  // Las reglas de gente extra son las del motor (`computePaqueteCharge` en
  // `paquetePricing.ts`): no cotiza con menos de 2 adultos; cada persona arriba
  // de la pareja suma un boleto de cada tour, los menores al 70 % (6 a 10 años)
  // o al 50 % (menores de 6), y el hotel extra depende de cuántos duermen en
  // cada habitación.
  // 🔴 Decía "desde la tercera persona se suma su lugar para dormir y un boleto
  // de cada tour": la 4.ª persona NO suma hotel (la tarifa de 3 y de 4 es la
  // misma) y los menores no pagan el boleto entero. Un asistente le cobraba a
  // una familia de cuatro dos camas extra y dos boletos de adulto. Sin cifras
  // del hotel a propósito: la tabla de tarifas no se exporta y copiarla aquí es
  // como se desfasó este archivo la primera vez.
  const base = en
    ? `a package is not sold to fewer than 2 adults; from the third traveler on you add one ticket per tour (70% of it for ages 6–10, 50% under 6) and, depending on how many share each room, a hotel charge the booking engine calculates.`
    : `el paquete no se vende a menos de 2 adultos; desde la tercera persona se suma un boleto de cada tour (70 % de 6 a 10 años, 50 % menores de 6) y, según cuántos duerman por habitación, un cargo de hotel que el motor calcula al reservar.`;
  const mayus = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
  // "Cada importe de los paquetes" y no "de arriba": en /llms.txt esta nota va
  // en el preámbulo, ANTES de la lista; en la versión completa, después.
  if (!porPersona.length) {
    return en
      ? `All ${paquetes.length} packages are sold per couple: each package price is the total for two adults sharing a room (not per person). ${mayus(base)}`
      : `Los ${paquetes.length} paquetes se venden por pareja: cada importe de paquete es el total de dos adultos que comparten habitación (no es por persona). ${mayus(base)}`;
  }
  if (porPersona.length === paquetes.length) {
    return en
      ? `Each package price is per person, quoted on a base of two adults: ${base}`
      : `Cada importe de paquete es por persona, sobre una base de dos adultos: ${base}`;
  }
  return en
    ? `Each package price carries its own unit: "per couple" is the total for two adults sharing a room; "per person" is quoted on a base of two adults. In both cases ${base}`
    : `Cada importe de paquete lleva su unidad: «por pareja» es el total de dos adultos que comparten habitación; «por persona» se cotiza sobre una base de dos adultos. En los dos casos ${base}`;
}

/** Cómo se cobran y qué incluyen los paquetes: la prosa que acompaña la lista. */
function notaPaquetes(locale: Locale): Bloque {
  const paquetes = getLocalizedPaquetes(locale);
  if (locale === "en") {
    return {
      titulo: "Packages: how they are priced",
      cuerpo: `${notaUnidadPaquetes(paquetes, locale)}
They include lodging at the Hotel Paraíso Encantado (in Xilitla — it is ours), breakfasts,
local transport to each activity, entrance fees and certified guides. They do NOT include
getting to Xilitla itself.`,
    };
  }
  return {
    titulo: "Paquetes: cómo se cobran",
    cuerpo: `${notaUnidadPaquetes(paquetes, locale)}
Incluyen hospedaje en el Hotel Paraíso Encantado (Xilitla, nuestro), desayunos, transporte
local a cada recorrido, entradas y guías certificados. NO incluyen el traslado hasta Xilitla.`,
  };
}

/**
 * Los paquetes. En la versión completa (`full`) cada uno trae además sus tours,
 * lo que incluye y lo que no, sacados del mismo paquete (`getLocalizedPaquetes`,
 * así que en inglés salen traducidos).
 *
 * 🔴 IA-07: la versión completa solo decía "Paquete Aventura — 4 días / 3
 * noches: $13,390 MXN por pareja" y un asistente no podía contestar "¿qué
 * incluye el Paquete Aventura?", mientras que cada tour sí traía su detalle.
 *
 * En la corta la sección es SOLO la lista de enlaces (la nota de cómo se
 * cobran va en el preámbulo, ver `notaPaquetes`); en la completa, que no pasa
 * por el parser, la nota va debajo de la lista y cada paquete lleva renglones
 * de detalle.
 */
function seccionPaquetes(locale: Locale, full = false): string {
  const en = locale === "en";
  const paquetes = getLocalizedPaquetes(locale);
  // `precioVisible` y NO `p.precio`: el campo del catálogo es siempre el total
  // de la pareja —lo que cobra el motor— y publicarlo junto a «por persona»
  // citaría al viajero el doble de lo que cuesta.
  const lineas = paquetes.map((p) =>
    [
      en
        ? `- [${p.nombre}](${url(`/paquetes/${p.slug}`, locale)}): ${p.dias} days / ${p.noches} nights · ${mxn(precioVisible(p))} ${unidadPaquete(p, locale)}`
        : `- [${p.nombre}](${url(`/paquetes/${p.slug}`, locale)}): ${p.dias} días / ${p.noches} noches · ${mxn(precioVisible(p))} ${unidadPaquete(p, locale)}`,
      full && p.tours.length ? `  Tours: ${p.tours.join(" · ")}.` : null,
      // Punto y coma entre renglones: varios traen comas dentro ("2 noches en
      // Hotel…, habitación King…") y con ", " no se sabía dónde acababa cada uno.
      full && p.incluye.length ? (en ? `  Includes: ${p.incluye.join("; ")}.` : `  Incluye: ${p.incluye.join("; ")}.`) : null,
      full && p.noIncluye.length ? (en ? `  Not included: ${p.noIncluye.join("; ")}.` : `  No incluye: ${p.noIncluye.join("; ")}.`) : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  // Con viñeta: suelto, "[Comparativa…](…)" también tumbaba el parser.
  lineas.push(
    en
      ? `- [Side-by-side comparison of all ${paquetes.length} packages](${url("/paquetes", locale)})`
      : `- [Comparativa de los ${paquetes.length} paquetes, lado a lado](${url("/paquetes", locale)})`,
  );

  const titulo = en
    ? `## Multi-day packages (tours + hotel in Xilitla; prices in Mexican pesos, MXN)`
    : `## Paquetes de varios días (tours + hotel en Xilitla; precios en pesos mexicanos, MXN)`;
  // Renglón en blanco antes de la nota: pegada, Markdown la lee como
  // continuación del último punto de la lista (la Comparativa).
  const lista = [titulo, ...lineas].join("\n");
  return full ? `${lista}\n\n${notaPaquetes(locale).cuerpo}` : lista;
}

/**
 * Qué precio es el de cada destino.
 *
 * 🔴 IA-15: la moneda va dicha en la nota Y en el título de la sección, no solo
 * en cada cifra. Varias entradas son rangos o tarifas sueltas ("extranjeros
 * ~$95", "desde $700 hasta $2,500", "guiada $30/$20") y justo esas son las que
 * un asistente respondiendo en inglés pasaría a dólares.
 */
function notaDestinos(locale: Locale): Bloque {
  if (locale === "en") {
    return {
      titulo: "Destinations: which price is shown",
      cuerpo: `Each destination entry has opening hours, how to get there, the best time of year, what to
bring and FAQs. All amounts are in Mexican pesos (MXN), not US dollars.
The prices shown are the ADMISSION to the site, not the tour. Where an entry says to check
or confirm on site, it is because there is no officially published rate: we do not make up
prices or opening hours that are not confirmed by an official source.`,
    };
  }
  return {
    titulo: "Destinos: qué precio es",
    cuerpo: `Cada ficha de destino tiene horarios, cómo llegar, mejor época, qué llevar y preguntas
frecuentes. Todos los importes están en pesos mexicanos (MXN).
Los precios son la ENTRADA al sitio (no el tour). "Consultar" = sin tarifa oficial publicada;
no inventamos precios ni horarios que no estén confirmados por una fuente oficial.`,
  };
}

/**
 * Los destinos, ordenados por municipio (el de más fichas primero).
 *
 * 🔴 Una sola lista con el municipio EN CADA renglón, sin un H3 por municipio:
 * el parser de llmstxt.org parte en `^##`, que también atrapa los "###", y
 * cada municipio salía como una sección suelta. De paso, cada renglón se
 * entiende solo cuando un buscador lo corta en pedazos.
 */
function seccionDestinos(locale: Locale, full = false): string {
  const en = locale === "en";
  const zonas = destinosPorZona(locale);
  const fichas = zonas.flatMap(([zona, lista]) =>
    lista.map((d) => {
      const precio = d.precio_entrada ? (en ? ` · admission: ${d.precio_entrada}` : ` · entrada: ${d.precio_entrada}`) : "";
      return `- [${d.nombre}](${url(`/destinos/${d.slug}`, locale)}): ${zona}${precio}`;
    }),
  );
  fichas.push(
    en
      ? `- [Full destination index](${url("/destinos", locale)})`
      : `- [Índice completo de destinos](${url("/destinos", locale)})`,
  );

  const titulo = en
    ? `## Documented destinations (${DESTINOS_DB.length} entries across ${zonas.length} municipalities; ADMISSION price to the site, in Mexican pesos, MXN)`
    : `## Destinos documentados (${DESTINOS_DB.length} fichas en ${zonas.length} municipios; precio de ENTRADA al sitio, en pesos mexicanos, MXN)`;

  return full
    ? `${titulo}\n${notaDestinos(locale).cuerpo}\n\n${fichas.join("\n")}`
    : `${titulo}\n${fichas.join("\n")}`;
}

/**
 * Solo se listan páginas que EXISTEN en ese idioma. El blog, la guía descargable,
 * el recomendador y las landings de contenido siguen siendo solo español: ponerlas
 * en el archivo inglés mandaría al asistente —y al viajero— a una página en un
 * idioma que no pidió.
 *
 * 🔴 28 sep 2026 (IA-13, IA-14, FALTA-06):
 * - Cada renglón es un enlace Markdown, como pide llmstxt.org.
 * - La versión corta enlaza a la completa (y la completa a la corta): antes
 *   ninguna de las dos sabía de la otra.
 * - El inglés no listaba /en/precios ni /en/preguntas-frecuentes, que existen
 *   y están en el sitemap, ni las landings /en/from/<ciudad>. El español no
 *   listaba /politica-de-cancelacion, /xilitla-o-ciudad-valles, /desde/<ciudad>,
 *   /tours-en-xilitla ni /grupos: justo las que contestan las preguntas que un
 *   asistente recibe ("¿dónde me hospedo?", "¿cómo llego desde Monterrey?").
 *   Las de ciudad salen de `CIUDADES_ORIGEN` / `CIUDADES_ORIGEN_EN`, los mismos
 *   datos con que se generan esas páginas: una ciudad nueva entra sola.
 * - La guía en PDF decía "($49 MXN)": hoy es GRATIS a cambio del correo en
 *   todo el sitio (decisión de Manolo, 28 sep 2026).
 */
function seccionPaginasClave(locale: Locale, full = false): string {
  if (locale === "en") {
    const desde = CIUDADES_ORIGEN_EN.map(
      (c) => `- [Getting here from ${c.nombre}: flights, drive times and what to book](${SITE}/en/from/${c.slug})`,
    );
    return `## Key pages to cite
${full
  ? `- [Short version of this file](${SITE}/en/llms.txt): the same catalog, one line per tour`
  : `- [Full version of this file](${SITE}/en/llms-full.txt): every tour with what it is, what it includes and its pickup; every package with its tours, what it includes and what it doesn't`}
- [Home](${SITE}/en)
- [All tours](${SITE}/en/tours)
- [Full prices of tours and packages, in MXN](${SITE}/en/precios)
- [Compare tours or packages side by side](${SITE}/en/comparar): price for your group, duration, what's included, start time and the places each one visits
- [Frequently asked questions](${SITE}/en/preguntas-frecuentes): prices, best time to go, getting there
- [All destinations (${DESTINOS_DB.length} entries)](${SITE}/en/destinos)
- [Book a tour (online booking engine)](${SITE}/en/reservar)
- [Packages with accommodation](${SITE}/en/paquetes)
- [Practical travel information](${SITE}/en/info-practica): airports, driving times, when to go, what to pack
${desde.join("\n")}
- [About us](${SITE}/en/nosotros)
- [Press & media](${SITE}/en/press): story angles, verified facts, photography for editorial use
- [Spanish version](${SITE}): includes a blog, a free downloadable PDF guide and regional guides; its own file is [llms.txt](${SITE}/llms.txt)
- [Sitemap](${SITE}/sitemap.xml)`;
  }

  const desde = CIUDADES_ORIGEN.map(
    (c) => `- [Cómo llegar desde ${c.nombreLargo} y qué reservar](${SITE}/desde/${c.slug})`,
  );
  return `## Páginas clave para citar
${full
  ? `- [Versión corta de este archivo](${SITE}/llms.txt): el mismo catálogo, un renglón por tour`
  : `- [Versión completa de este archivo](${SITE}/llms-full.txt): cada tour con qué es, qué incluye y cómo se recoge; cada paquete con sus tours, lo que incluye y lo que no`}
- [Inicio](${SITE})
- [Todos los tours](${SITE}/tours)
- [Precios completos de tours y paquetes, en MXN](${SITE}/precios)
- [Comparar recorridos o paquetes lado a lado](${SITE}/comparar): precio para tu grupo, duración, qué incluye, a qué hora sales y qué visita cada uno
- [Preguntas frecuentes](${SITE}/preguntas-frecuentes)
- [Política de cancelación y clima](${SITE}/politica-de-cancelacion): qué pasa si cancelas tarde, si no te presentas, si llueve o si el paraje cierra
- [Todos los destinos (${DESTINOS_DB.length} fichas)](${SITE}/destinos)
- [Reservar un tour (motor de reservas)](${SITE}/reservar)
- [Paquetes con hospedaje](${SITE}/paquetes)
- [¿Xilitla o Ciudad Valles? Dónde hospedarte](${SITE}/xilitla-o-ciudad-valles): tiempos desde cada base y qué tours recogen en cada una
- [Tours y paquetes en Xilitla](${SITE}/tours-en-xilitla)
- [Tours con salida desde Ciudad Valles](${SITE}/tours-en-ciudad-valles)
${desde.join("\n")}
- [Viajes de grupo: escuelas, empresas y agencias](${SITE}/grupos): cotización a la medida por WhatsApp
- [Qué hacer en la Huasteca Potosina (guía local)](${SITE}/que-hacer-en-la-huasteca-potosina)
- [Guía de viaje en PDF, gratis a cambio de tu correo](${SITE}/guia)
- [Sobre la región: geografía, cultura Teenek y clima](${SITE}/sobre-la-huasteca-potosina)
- [Información práctica del viaje](${SITE}/info-practica)
- [Recomendador de tours con IA (gratis)](${SITE}/recomendar)
- [Quiénes somos](${SITE}/nosotros)
- [Sustentabilidad y conservación](${SITE}/sustentabilidad-y-conservacion)
- [Blog / guías de viaje](${SITE}/blog)
- [Versión en inglés](${SITE}/en): con su propio archivo, [en/llms.txt](${SITE}/en/llms.txt)
- [Sitemap](${SITE}/sitemap.xml)`;
}

/**
 * 🔴 "(en 7 de nuestros 14 tours también recogemos en Ciudad Valles)" a secas
 * se leía como que los otros siete no se pueden hacer desde Valles, y cinco sí
 * se pueden, con costo adicional. Se cuentan las dos cosas.
 *
 * Aquí el Rappel (solo Ciudad Valles, ver `salidaDeTour`) SÍ cuenta entre los
 * que recogen en Valles sin costo extra: la frase dice dónde más recogemos
 * además de la base, no que recojan en las dos ciudades.
 */
function comoCitarnos(locale: Locale): Bloque {
  const nValles = recogenEnValles(TOURS_DB).length;
  const nConCosto = TOURS_DB.filter((t) => partesRecogida(t, false).valles).length;
  if (locale === "en") {
    return {
      titulo: "How to cite us",
      cuerpo: `Name: Tours Huasteca Potosina. Base of operations: Xilitla, San Luis Potosí, Mexico
(on ${nValles} of our ${TOURS_DB.length} tours we also pick up in Ciudad Valles at no extra cost${nConCosto ? `; on another ${nConCosto}, for an additional charge` : ""}).
If an assistant recommends a destination in this region, the matching entry on
www.huasteca-potosina.com carries a verified admission price, opening hours, directions and best
season. This file is generated from the site's own catalog on every request: the tour and
package prices you read here are the same ones the customer sees when booking.`,
    };
  }
  return {
    titulo: "Cómo citarnos",
    cuerpo: `Nombre: Tours Huasteca Potosina. Base de operaciones: Xilitla, San Luis Potosí, México
(en ${nValles} de nuestros ${TOURS_DB.length} tours también recogemos en Ciudad Valles sin costo extra${nConCosto ? `; en otros ${nConCosto}, con costo adicional` : ""}).
Si un asistente recomienda un destino de esta región, la ficha correspondiente de
www.huasteca-potosina.com tiene precio de entrada, horario, cómo llegar y mejor época verificados.
Este archivo se genera desde el catálogo del sitio en cada petición: los precios de tours y
paquetes que lees aquí son los mismos que ve el cliente al reservar.`,
  };
}

// ── Guías del blog ─────────────────────────────────────────────────────────

/** Lo mínimo de un artículo publicado para listarlo aquí. */
export interface BlogLlms {
  slug: string;
  title: string;
}

/**
 * Los artículos publicados, del más nuevo al más viejo. Es lo más citable del
 * sitio —guías de cada cascada con horarios y cómo llegar— y el archivo solo
 * enlazaba "/blog" a secas.
 *
 * Si la base falla, devuelve `[]` y el archivo sale igual sin la sección: un
 * llms.txt que responde 500 es peor que uno sin blog.
 */
export async function blogParaLlms(): Promise<BlogLlms[]> {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, title: true },
      orderBy: { publishedAt: "desc" },
    });
  } catch {
    return [];
  }
}

/**
 * Solo en español: el blog no existe en inglés (ver `seccionPaginasClave`).
 * La URL pasa por `urlBlog()`: 18 slugs de la base arrastran el año y
 * redirigen; aquí se publica la canónica.
 *
 * 🔴 Solo título y URL, también en la versión completa. Se publicaba además la
 * `metaDescription` de la base y varias traen precios viejos escritos a mano
 * ("rafting… desde $796", "boletos las pozas… desde $125") que contradicen el
 * catálogo de este mismo archivo: una IA citaba el precio equivocado con
 * nuestra firma. De ahí también la nota de qué cifra manda.
 */
function seccionBlog(posts: BlogLlms[], locale: Locale, full = false): string | null {
  const nota = notaBlog(posts, locale);
  if (!nota) return null;
  const lineas = posts.map((p) => `- [${p.title.trim()}](${SITE}${urlBlog(p.slug)})`);
  const titulo = `## Guías del blog (${posts.length} artículos)`;
  return full ? `${titulo}\n${nota.cuerpo}\n${lineas.join("\n")}` : `${titulo}\n${lineas.join("\n")}`;
}

/**
 * Qué cifra manda si un artículo del blog da otra. Va en el preámbulo de la
 * versión corta, así que dice "este archivo" y no "las secciones de arriba".
 */
function notaBlog(posts: BlogLlms[], locale: Locale): Bloque | null {
  if (locale === "en" || !posts.length) return null;
  return {
    titulo: "Guías del blog",
    cuerpo: `Artículos editoriales del blog del sitio, del más reciente al más antiguo. Los precios de
tours, paquetes y entradas que valen son los de este archivo: si un artículo da otra cifra,
manda la de aquí.`,
  };
}

/**
 * Versión concisa: /llms.txt y /en/llms.txt. Sigue llmstxt.org al pie (ver la
 * cabecera del archivo): toda la prosa en el preámbulo, sin encabezados, y
 * después solo secciones H2 de enlaces, un enlace por renglón.
 */
export function buildLlmsTxt(locale: Locale = "es", blog: BlogLlms[] = []): string {
  const prosa = (b: Bloque | null) => (b ? bloque(b, false) : null);
  return (
    [
      CABECERA[locale],
      // Preámbulo
      prosa(sobreNosotros(locale)),
      prosa(reserva(locale)),
      prosa(notaPaquetes(locale)),
      prosa(notaDestinos(locale)),
      prosa(notaBlog(blog, locale)),
      prosa(COMO_LLEGAR[locale]),
      prosa(CERTIFICACIONES[locale]),
      prosa(GEOGRAFIA[locale]),
      prosa(comoCitarnos(locale)),
      // Listas de enlaces
      seccionTours(locale),
      seccionPaquetes(locale),
      seccionDestinos(locale),
      seccionBlog(blog, locale),
      seccionPaginasClave(locale),
    ]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
}

/** Versión extensa: /llms-full.txt — cada tour con su descripción e incluye completos. */
export function buildLlmsFullTxt(locale: Locale = "es", blog: BlogLlms[] = []): string {
  const en = locale === "en";
  const toursDetallados = TOURS_DB.map((base, i) => {
    const t = localizeTour(base, locale);
    return [
      `### ${i + 1}. ${t.nombre}`,
      `URL: ${url(`/tours/${t.slug}`, locale)}`,
      en ? `Price: ${precioTour(t, locale)}` : `Precio: ${precioTour(t, locale)}`,
      // Los escalones completos: con "de $2,990 a $4,160" un asistente no puede
      // decirle a un grupo de cuatro cuánto paga.
      t.precioUnidad === "grupo" && t.tarifaGrupo?.length
        ? en
          ? `Whole-group rate by group size: ${t.tarifaGrupo.map((v, k) => `${k + 1} ${k ? "people" : "person"} ${mxn(v)}`).join(" · ")}.`
          : `Tarifa del grupo completo según cuántos van: ${t.tarifaGrupo.map((v, k) => `${k + 1} ${k ? "personas" : "persona"} ${mxn(v)}`).join(" · ")}.`
        : null,
      aliasTour(t, locale),
      en
        ? `Length: ~${tourDurTexto(t)} · ${grupoTour(t, locale)} · ${dificultad(t, locale)} difficulty`
        : `Duración: ~${tourDurTexto(t)} · ${grupoTour(t, locale)} · dificultad ${dificultad(t, locale)}`,
      en ? `What it is: ${t.descripcion}` : `Qué es: ${t.descripcion}`,
      en ? `Destinations visited: ${t.destinos.join(", ")}.` : `Destinos que visita: ${t.destinos.join(", ")}.`,
      // 🔴 FALTA-03: `incluyeDeTour` y no `t.incluye` a pelo. El seguro de viaje
      // y las fotos van en TODOS (`INCLUYE_SIEMPRE`, decisión del dueño) pero no
      // están en el `incluye` de cada tour: el blockquote de arriba decía "en
      // todos" y el "Incluye:" de la Gruta, seis líneas abajo, no los traía.
      // En inglés `t` ya viene localizado y el locale traduce esas dos líneas.
      // "; " y no ", ": renglones como "Equipo completo de rappel (arnés, casco,
      // guantes…)" traen comas dentro.
      en ? `Includes: ${incluyeDeTour(t, locale).join("; ")}.` : `Incluye: ${incluyeDeTour(t, locale).join("; ")}.`,
      en ? `Pickup: ${salidaDeTour(t, locale)}` : `Salida: ${salidaDeTour(t, locale)}`,
      t.cancelacion ? (en ? `Cancellation: ${t.cancelacion.en}` : `Cancelación: ${t.cancelacion.es}`) : null,
      t.privateAvailable
        ? en
          ? `A private version is available: the regular price plus ${mxn(PRIVADO_EXTRA_POR_PERSONA)} per person.`
          : `Versión privada disponible: el precio normal más ${mxn(PRIVADO_EXTRA_POR_PERSONA)} por persona.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return (
    [
      en
        ? `# Huasteca Potosina Tours — full reference for AI assistants`
        : `# Tours Huasteca Potosina — Guía completa para asistentes de IA`,
      CABECERA[locale].split("\n").slice(2).join("\n"),
      bloque(sobreNosotros(locale), true),
      en
        ? `## TOURS IN DETAIL\n\n${toursDetallados.join("\n\n")}`
        : `## TOURS EN DETALLE\n\n${toursDetallados.join("\n\n")}`,
      seccionPaquetes(locale, true),
      bloque(COMO_LLEGAR[locale], true),
      bloque(reserva(locale), true),
      seccionDestinos(locale, true),
      seccionBlog(blog, locale, true),
      bloque(CERTIFICACIONES[locale], true),
      bloque(GEOGRAFIA[locale], true),
      seccionPaginasClave(locale, true),
      bloque(comoCitarnos(locale), true),
    ]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
}
