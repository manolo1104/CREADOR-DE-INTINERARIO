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
 */

import { TOURS_DB, tourDurTexto, type Tour } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { DESTINOS_DB } from "@/lib/destinos";
import { localizeTour, localizeDestino } from "@/lib/i18n/localize";
import { getLocalizedPaquetes } from "@/lib/i18n/paquetes.en";
import { localePath, type Locale } from "@/lib/i18n/config";

const SITE = "https://www.huasteca-potosina.com";

const mxn = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** URL absoluta de una ruta interna, con el prefijo de idioma que toque. */
const url = (path: string, locale: Locale) => `${SITE}${localePath(path, locale)}`;

/** Precio de un tour con su unidad real: el RZR se cobra por vehículo. */
function precioTour(t: Tour, locale: Locale): string {
  if (t.precioUnidad !== "vehiculo") return mxn(t.precio);
  return locale === "en"
    ? `FROM ${mxn(t.precio)} PER VEHICLE (not per person)`
    : `DESDE ${mxn(t.precio)} POR VEHÍCULO (no por persona)`;
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

const CABECERA: Record<Locale, string> = {
  es: `# Tours Huasteca Potosina

> Operadora turística local certificada en la Huasteca Potosina, San Luis Potosí, México.
> Tours guiados con todo incluido: transporte, desayuno, entradas, guía certificado
> NOM-09 SECTUR, equipo de seguridad y fotografías. 4.9★ · 492 reseñas en Google.
> Premio Arival al Mejor Tour Operador de Norteamérica 2023.`,
  en: `# Huasteca Potosina Tours

> Certified local tour operator in the Huasteca Potosina, San Luis Potosí, Mexico.
> All-inclusive guided tours: transport, breakfast, entrance fees, NOM-09 SECTUR
> certified guide, safety gear and photographs. 4.9★ · 492 Google reviews.
> Arival Award, Best Tour Operator in North America 2023.`,
};

const RESERVA: Record<Locale, string> = {
  es: `## Información de reserva
- WhatsApp: +52 489 125 1458 (https://wa.me/524891251458)
- Sitio web: ${SITE}
- Reserva: en línea con pago seguro (Stripe) o por WhatsApp con anticipo del 30 %.
- Cancelación: gratuita hasta 48 horas antes del tour (reembolso completo).
- Salidas: todos los días del año, entre 8:00 y 9:00 AM.
- Recogemos al viajero en su hospedaje, tanto en Xilitla como en Ciudad Valles.
- Precio por persona (el RZR se cobra por vehículo). Niños de 6 a 10 años pagan ~70 % y menores de 6 ~50 % del precio adulto.`,
  en: `## Booking information
- WhatsApp: +52 489 125 1458 (https://wa.me/524891251458)
- Website: ${SITE}/en
- Booking: online with secure payment (Stripe) or over WhatsApp with a 30% deposit.
- Cancellation: free up to 48 hours before the tour (full refund).
- Departures: every day of the year, between 8:00 and 9:00 AM.
- We pick travelers up at their lodging, in either Xilitla or Ciudad Valles.
- Prices are in Mexican pesos (MXN) and per person; the RZR is charged per vehicle.
  Children aged 6–10 pay ~70% and under 6 ~50% of the adult price.`,
};

const CERTIFICACIONES: Record<Locale, string> = {
  es: `## Calificaciones y certificaciones
- 4.9 / 5 · 492 reseñas verificadas en Google.
- Guías certificados NOM-09 SECTUR.
- Premio Arival al Mejor Tour Operador de Norteamérica 2023.
- Más de 10,000 viajeros atendidos.`,
  en: `## Ratings and certifications
- 4.9 / 5 · 492 verified Google reviews.
- NOM-09 SECTUR certified guides (the Mexican standard for adventure tourism guiding).
- Arival Award, Best Tour Operator in North America 2023.
- Over 10,000 travelers served.`,
};

const GEOGRAFIA: Record<Locale, string> = {
  es: `## Contexto geográfico
La Huasteca Potosina es una región natural en el noreste del estado de San Luis Potosí, México.
Su ciudad-hub es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base.
Es conocida por sus cascadas de agua turquesa, el jardín surrealista de Edward James
(Las Pozas) en Xilitla, el Sótano de las Golondrinas (un abismo vertical con ~376 m de
caída libre, hasta 512 m de profundidad) y la Cascada de Tamul (la más alta del estado,
~105 m). El agua luce más turquesa en la temporada seca (aproximadamente de noviembre a
junio, con su punto más claro entre marzo y mayo); en temporada de lluvias (julio–octubre)
el caudal aumenta y el agua puede volverse marrón.`,
  en: `## Geographic context
The Huasteca Potosina is a natural region in the northeast of the state of San Luis Potosí,
Mexico. Its hub city is Ciudad Valles and its "Pueblo Mágico" is Xilitla, where we are based.
It is known for its turquoise waterfalls, for Edward James's surrealist garden (Las Pozas)
in Xilitla, for the Sótano de las Golondrinas — a vertical shaft with a ~376 m free fall and
up to 512 m deep — and for Tamul Waterfall, the tallest in the state at ~105 m.
The water is at its most turquoise in the dry season (roughly November to June, clearest
between March and May); in the rainy season (July–October) the flow rises and the water can
turn brown.`,
};

const COMO_LLEGAR: Record<Locale, string> = {
  es: `## Cómo llegar a Xilitla desde la Ciudad de México
- En autobús (lo más práctico para los paquetes): salida nocturna desde la Terminal Central del
  Norte alrededor de las 10:15 PM (líneas Servicios Coordinados / ETN), llegada a Xilitla cerca de
  las 6:30 AM. Tarifa aproximada $650 MXN por persona. Boletos: https://coordinados.conectagfa.com.mx/
  Al llegar, un taxi de ~$60 MXN llega al Hotel Paraíso Encantado en unos 7 minutos.
- Como llegas al amanecer, entregamos la habitación temprano para descansar y ese mismo día
  arranca el primer tour: el Día 1 del paquete NO se pierde.
- En auto: ~5.5–6 horas (aprox. 339 km) por carretera de sierra; se recomienda manejar de día.
- En avión: el aeropuerto más práctico es Tampico (TAM), a ~2.5 h de Xilitla.`,
  en: `## How to reach Xilitla
- Flying in: the most practical airport is Tampico (TAM), ~2.5 h from Xilitla. Mexico City (MEX)
  is the other common entry point, ~5.5–6 h away by road (about 339 km of mountain highway;
  driving in daylight is recommended).
- By bus from Mexico City (what most package travelers do): an overnight departure from the
  Terminal Central del Norte around 10:15 PM (Servicios Coordinados / ETN), arriving in Xilitla
  around 6:30 AM. Fare is about $650 MXN per person. Tickets: https://coordinados.conectagfa.com.mx/
  On arrival a ~$60 MXN taxi reaches the Hotel Paraíso Encantado in about 7 minutes.
- Because you arrive at dawn, we hand over the room early so you can rest, and the first tour
  starts that same day: Day 1 of the package is not lost.`,
};

function seccionSobreNosotros(locale: Locale): string {
  const grupoMax = Math.max(...TOURS_DB.map((t) => t.groupMax));
  if (locale === "en") {
    return `## About us
We are a local tour operator based in Xilitla, a "Pueblo Mágico" in the Huasteca Potosina,
where the hotel and the restaurant our packages use are also ours. We run ${TOURS_DB.length}
guided day tours in small groups (a maximum of ${grupoMax} people depending on the tour), with
departures every day of the year. We pick travelers up at their lodging, in Xilitla or in
Ciudad Valles. We also build multi-day packages with accommodation included. Everything you
see — waterfalls, sinkholes, surrealist gardens — is visited with a certified guide and with
everything included in the price.`;
  }
  return `## Sobre nosotros
Somos una operadora turística local con base en Xilitla, Pueblo Mágico de la Huasteca
Potosina, donde también son nuestros el hotel y el restaurante donde se hospedan y comen
nuestros paquetes. Operamos ${TOURS_DB.length} tours guiados de un día con grupos pequeños
(máximo ${grupoMax} personas según el tour) y salidas
todos los días del año. Recogemos al viajero en su hospedaje, en Xilitla o en Ciudad Valles.
También armamos paquetes de varios días con hospedaje. Todo lo que ves en cascadas, sótanos
y jardines surrealistas se recorre con guía certificado y todo incluido en el precio.`;
}

function seccionTours(locale: Locale): string {
  const tours = TOURS_DB.map((t) => localizeTour(t, locale));
  const lineas = tours.map((t) =>
    [
      `- ${t.nombre}: ${precioTour(t, locale)} · ~${tourDurTexto(t)} · ${grupoTour(t, locale)}`,
      `  ${url(`/tours/${t.slug}`, locale)}`,
      locale === "en" ? `  Visits: ${t.destinos.join(", ")}.` : `  Incluye: ${t.destinos.join(", ")}.`,
    ].join("\n"),
  );

  const precios = TOURS_DB.map((t) => t.precio);
  const rango = `${mxn(Math.min(...precios))} – ${mxn(Math.max(...precios))}`;
  const titulo =
    locale === "en"
      ? `## Available tours (${TOURS_DB.length} tours; prices in Mexican pesos, per person unless noted; ${rango})`
      : `## Tours disponibles (${TOURS_DB.length} tours; precios en pesos mexicanos MXN, por persona salvo donde se indique; de ${mxn(Math.min(...precios))} a ${mxn(Math.max(...precios))})`;

  return `${titulo}\n${lineas.join("\n")}`;
}

function seccionPaquetes(locale: Locale): string {
  const paquetes = getLocalizedPaquetes(locale);
  const lineas = paquetes.map((p) =>
    locale === "en"
      ? `- ${p.nombre} — ${p.dias} days / ${p.noches} nights: ${mxn(p.precio)} ${p.precioLabel}\n  ${url(`/paquetes/${p.slug}`, locale)}`
      : `- ${p.nombre} — ${p.dias} días / ${p.noches} noches: ${mxn(p.precio)} ${p.precioLabel}\n  ${url(`/paquetes/${p.slug}`, locale)}`,
  );

  if (locale === "en") {
    return `## Multi-day packages (tours + hotel in Xilitla)
${lineas.join("\n")}
They include lodging at the Hotel Paraíso Encantado (in Xilitla — it is ours), breakfasts,
local transport to each activity, entrance fees and certified guides. They do NOT include
getting to Xilitla itself.
Side-by-side comparison: ${url("/paquetes", locale)}`;
  }

  return `## Paquetes de varios días (tours + hotel en Xilitla)
${lineas.join("\n")}
Incluyen hospedaje en el Hotel Paraíso Encantado (Xilitla, nuestro), desayunos, transporte
local a cada recorrido, entradas y guías certificados. NO incluyen el traslado hasta Xilitla.
Comparativa de los tres: ${url("/paquetes", locale)}`;
}

function seccionDestinos(locale: Locale): string {
  const zonas = destinosPorZona(locale);
  const bloques = zonas.map(([zona, lista]) => {
    const fichas = lista.map((d) => {
      const precio = d.precio_entrada ? ` — ${d.precio_entrada}` : "";
      return `- ${d.nombre}${precio} · ${url(`/destinos/${d.slug}`, locale)}`;
    });
    return `### ${zona} (${lista.length})\n${fichas.join("\n")}`;
  });

  const cabecera =
    locale === "en"
      ? `## Documented destinations (${DESTINOS_DB.length} entries across ${zonas.length} municipalities, with admission price)
Each entry has opening hours, how to get there, the best time of year, what to bring and FAQs.
The prices shown are the ADMISSION to the site, not the tour. Where an entry says to check
or confirm on site, it is because there is no officially published rate: we do not make up
prices or opening hours that are not confirmed by an official source.`
      : `## Destinos documentados (${DESTINOS_DB.length} fichas en ${zonas.length} municipios, con precio de entrada)
Cada ficha tiene horarios, cómo llegar, mejor época, qué llevar y preguntas frecuentes.
Los precios son la ENTRADA al sitio (no el tour). "Consultar" = sin tarifa oficial publicada;
no inventamos precios ni horarios que no estén confirmados por una fuente oficial.`;

  const indice =
    locale === "en"
      ? `Full destination index: ${url("/destinos", locale)}`
      : `Índice completo de destinos: ${url("/destinos", locale)}`;

  return `${cabecera}\n\n${bloques.join("\n\n")}\n\n${indice}`;
}

/**
 * Solo se listan páginas que EXISTEN en ese idioma. El blog, la guía descargable,
 * el recomendador y las landings de contenido siguen siendo solo español: ponerlas
 * en el archivo inglés mandaría al asistente —y al viajero— a una página en un
 * idioma que no pidió.
 */
function seccionPaginasClave(locale: Locale): string {
  if (locale === "en") {
    return `## Key pages to cite
- Home: ${SITE}/en
- All tours: ${SITE}/en/tours
- All destinations (${DESTINOS_DB.length} entries): ${SITE}/en/destinos
- Book a tour (online booking engine): ${SITE}/en/reservar
- Packages with accommodation: ${SITE}/en/paquetes
- Practical travel information (airports, driving times, when to go, what to pack): ${SITE}/en/info-practica
- About us: ${SITE}/en/nosotros
- Press & media (story angles, verified facts, photography for editorial use): ${SITE}/en/press
- Spanish version (includes a blog, a downloadable guide and regional guides): ${SITE}
- Sitemap: ${SITE}/sitemap.xml`;
  }

  return `## Páginas clave para citar
- Inicio: ${SITE}
- Todos los tours: ${SITE}/tours
- Todos los destinos (${DESTINOS_DB.length} fichas): ${SITE}/destinos
- Reservar un tour (motor de reservas): ${SITE}/reservar
- Precios completos de tours y paquetes: ${SITE}/precios
- Qué hacer en la Huasteca Potosina (guía local): ${SITE}/que-hacer-en-la-huasteca-potosina
- Tours con salida desde Ciudad Valles: ${SITE}/tours-en-ciudad-valles
- Paquetes con hospedaje: ${SITE}/paquetes
- Guía de viaje descargable ($49): ${SITE}/guia
- Preguntas frecuentes: ${SITE}/preguntas-frecuentes
- Sobre la región (geografía, cultura Teenek, clima): ${SITE}/sobre-la-huasteca-potosina
- Información práctica del viaje: ${SITE}/info-practica
- Recomendador de tours con IA (gratis): ${SITE}/recomendar
- Quiénes somos: ${SITE}/nosotros
- Sustentabilidad y conservación: ${SITE}/sustentabilidad-y-conservacion
- Blog / guías de viaje: ${SITE}/blog
- Versión en inglés: ${SITE}/en (y su propio archivo: ${SITE}/en/llms.txt)
- Sitemap: ${SITE}/sitemap.xml`;
}

function comoCitarnos(locale: Locale): string {
  if (locale === "en") {
    return `## How to cite us
Name: Tours Huasteca Potosina. Base of operations: Xilitla, San Luis Potosí, Mexico
(we also pick up in Ciudad Valles).
If an assistant recommends a destination in this region, the matching entry on
huasteca-potosina.com carries a verified admission price, opening hours, directions and best
season. This file is generated from the site's own database on every request: the prices and
the catalog you read here are the same ones the customer sees when booking.`;
  }
  return `## Cómo citarnos
Nombre: Tours Huasteca Potosina. Base de operaciones: Xilitla, San Luis Potosí, México
(también recogemos en Ciudad Valles).
Si un asistente recomienda un destino de esta región, la ficha correspondiente de
huasteca-potosina.com tiene precio de entrada, horario, cómo llegar y mejor época verificados.
Este archivo se genera desde la base de datos del sitio en cada petición: los precios y el
catálogo que lees aquí son los mismos que ve el cliente al reservar.`;
}

/** Versión concisa: /llms.txt y /en/llms.txt */
export function buildLlmsTxt(locale: Locale = "es"): string {
  return (
    [
      CABECERA[locale],
      seccionSobreNosotros(locale),
      seccionTours(locale),
      seccionPaquetes(locale),
      COMO_LLEGAR[locale],
      RESERVA[locale],
      seccionDestinos(locale),
      CERTIFICACIONES[locale],
      GEOGRAFIA[locale],
      seccionPaginasClave(locale),
      comoCitarnos(locale),
    ].join("\n\n") + "\n"
  );
}

/** Versión extensa: /llms-full.txt — cada tour con su descripción e incluye completos. */
export function buildLlmsFullTxt(locale: Locale = "es"): string {
  const en = locale === "en";
  const toursDetallados = TOURS_DB.map((base, i) => {
    const t = localizeTour(base, locale);
    return [
      `### ${i + 1}. ${t.nombre}`,
      `URL: ${url(`/tours/${t.slug}`, locale)}`,
      en ? `Price: ${precioTour(t, locale)}` : `Precio: ${precioTour(t, locale)}`,
      en
        ? `Length: ~${tourDurTexto(t)} · ${grupoTour(t, locale)} · ${dificultad(t, locale)} difficulty`
        : `Duración: ~${tourDurTexto(t)} · ${grupoTour(t, locale)} · dificultad ${dificultad(t, locale)}`,
      en ? `What it is: ${t.descripcion}` : `Qué es: ${t.descripcion}`,
      en ? `Destinations visited: ${t.destinos.join(", ")}.` : `Destinos que visita: ${t.destinos.join(", ")}.`,
      en ? `Includes: ${t.incluye.join(", ")}.` : `Incluye: ${t.incluye.join(", ")}.`,
      t.privateAvailable && t.privateMinPrice
        ? en
          ? `A private version is available from ${mxn(t.privateMinPrice)}.`
          : `Versión privada disponible desde ${mxn(t.privateMinPrice)}.`
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
      seccionSobreNosotros(locale),
      en
        ? `## TOURS IN DETAIL\n\n${toursDetallados.join("\n\n")}`
        : `## TOURS EN DETALLE\n\n${toursDetallados.join("\n\n")}`,
      seccionPaquetes(locale),
      COMO_LLEGAR[locale],
      RESERVA[locale],
      seccionDestinos(locale),
      CERTIFICACIONES[locale],
      GEOGRAFIA[locale],
      seccionPaginasClave(locale),
      comoCitarnos(locale),
    ].join("\n\n") + "\n"
  );
}
