import { notFound } from "next/navigation";
import { resenasTexto } from "@/lib/resenas";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { TOURS_DB, tourDurRange, esPorPersona, PRIVADO_EXTRA_POR_PERSONA, precioTachado, recogidaDeTour, type Tour } from "@/lib/tours";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { TOUR_REQUISITOS, noIncluyeDe, queLlevarDe } from "@/lib/tourRequisitos";
import { getTourFaqs } from "@/lib/i18n/tourFaqs.en";
import { TourGallery } from "@/components/TourGallery";
import { HeroTourMedia } from "@/components/HeroTourMedia";
import { TourDeparture } from "@/components/TourDeparture";
import { SelloGarantia } from "@/components/SelloGarantia";
import { ItinerarioLinea } from "@/components/ItinerarioLinea";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { TourPageTracker } from "@/components/TourPageTracker";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Star, Clock, Users, Lock, Shield, RefreshCw, Camera, Headphones, ChevronDown, Award, MapPin, Gauge, Baby, CreditCard } from "lucide-react";
import { InventoryBadge } from "@/components/booking/InventoryBadge";
import { ReservaFichaTour, ID_MODULO_RESERVA } from "@/components/booking/ReservaFichaTour";
import { SocialProofToast } from "@/components/booking/SocialProofToast";
import { asLocale, localePath, buildAlternates, SITE, type Locale } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, ORG_REF } from "@/lib/jsonld";
import { localizeTour } from "@/lib/i18n/localize";
import { getDict } from "@/lib/i18n/messages";
import { fmtNumber } from "@/lib/i18n/format";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return TOURS_DB.map((t) => ({ slug: t.slug }));
}

/** Recorta a ~155 chars en frontera de palabra: Google corta el snippet ~160. OG/Twitter conservan la versión larga. */
function metaDesc(txt: string, max = 155): string {
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : max).replace(/[\s,;:.—–-]+$/, "")}…`;
}

/** Google corta el título del SERP cerca de los 60 caracteres: nos quedamos por debajo. */
const MAX_TITLE = 59;

/** Palabras con las que ningún título debería quedarse colgando tras un recorte. */
const COLA_VACIA = /(?:\s+(?:de|del|la|el|los|las|en|y|a|con|por|un|una|the|at|in|on|of|and|with|to|for|your|by))+$/i;

/**
 * El nombre propio del recorrido, sin el reclamo comercial de después del guion.
 *
 * Los nombres de TOURS_DB llevan detrás de un guion largo la promesa de venta
 * («Expedición Tamul — Sótano, Cañón & Cueva del Agua»). Con el sufijo de marca
 * pegado, nueve de los diez títulos pasaban de 60 caracteres —el del buceo
 * llegaba a 110— y Google los cortaba justo donde empieza lo que distingue al
 * tour. Aquí nos quedamos con la parte de delante y, si aún no cabe, se recorta
 * en frontera de palabra sin dejar un «de la» al aire.
 */
function nombreCortoTour(nombre: string, max = Number.MAX_SAFE_INTEGER): string {
  const corto = nombre.split(/\s*[—–]\s*/)[0].trim() || nombre.trim();
  if (corto.length <= max) return corto;
  const cortado = corto.slice(0, max);
  const espacio = cortado.lastIndexOf(" ");
  return (espacio > 0 ? cortado.slice(0, espacio) : cortado)
    .replace(COLA_VACIA, "")
    .replace(/[\s,;:·|-]+$/, "");
}

/**
 * Lo que de verdad puede pagar el cliente: [mínimo, máximo].
 *
 * `tour.precio` es un número suelto, y en el RZR ese número es solo el punto de
 * partida: cada combinación de ruta y vehículo tiene su propia tarifa, de
 * $1,600 a $7,000. Declarar 1.600 como precio cerrado era un dato falso.
 */
function rangoPrecio(t: Pick<Tour, "precio" | "flota" | "rutas">): [number, number] {
  const precios = [
    ...(t.flota ?? []).flatMap((v) => v.precios),
    ...(t.rutas ?? []).map((r) => r.desde),
  ];
  if (!precios.length) return [t.precio, t.precio];
  return [Math.min(...precios), Math.max(...precios)];
}

/** "$1,550 MXN por persona" o "de $1,600 a $7,000 MXN por vehículo". */
function frasePrecio(min: number, max: number, esVehiculo: boolean, locale: Locale): string {
  const unidad = esVehiculo
    ? locale === "en" ? "MXN per vehicle" : "MXN por vehículo"
    : locale === "en" ? "MXN per person" : "MXN por persona";
  const n = (v: number) => `$${fmtNumber(v, locale)}`;
  if (max <= min) return `${n(min)} ${unidad}`;
  return locale === "en" ? `${n(min)} to ${n(max)} ${unidad}` : `de ${n(min)} a ${n(max)} ${unidad}`;
}

/** "9 horas" o "8–10 horas". */
function fraseDuracion(t: Parameters<typeof tourDurRange>[0], locale: Locale): string {
  const [a, b] = tourDurRange(t);
  const horas = locale === "en" ? "hours" : "horas";
  return a === b ? `${a} ${horas}` : `${a}–${b} ${horas}`;
}

/**
 * Título del SERP: nombre del tour, la palabra «tour» y el precio en MXN, por
 * debajo de 60 caracteres.
 *
 * Ningún título de ficha contenía «tour» ni un precio —el visitante decidía si
 * hacer clic sin saber cuánto cuesta—. Se intenta primero la versión con marca
 * («| Tour Huasteca $1,550 MXN») y, si no cabe, la corta; solo cuando ninguna
 * entra se recorta el nombre.
 */
/**
 * El lugar que se anuncia en el title sale de `destinos` —lo que el tour VISITA
 * de verdad—, no de partir el nombre por el guion. El nombre de casa ("Ruta
 * Acuática", "Paraíso Escalonado") no lo teclea nadie; el lugar sí:
 * "Puente de Dios" solo son 11.242 impresiones, y están además Edward James,
 * Las Pozas, Minas Viejas, Micos y Media Luna.
 */
function lugarDelTour(destinos: string[] | undefined, head: string): string {
  const crudo = (destinos ?? [])[0];
  if (!crudo) return "";
  // "Puente de Dios", no "A elegir: Hacienda… (mismo lugar)".
  let d = crudo.replace(/\([^)]*\)/g, "").split(/\s+—\s+|:\s+/).pop()!.trim();
  if (!d) return "";
  if (d.length > 22) {
    // Se va acortando por la izquierda hasta que quepa, quedándose siempre con
    // el final, que es donde está el nombre propio:
    //   "Jardín Surrealista Edward James"          → "Edward James"
    //   "Cafetal bajo sombra de la sierra de Xilitla" → "Xilitla"
    //   "Cascadas de Minas Viejas"                 → "Minas Viejas"
    const palabras = d.split(/\s+/);
    d = "";
    for (let i = 1; i < palabras.length; i++) {
      const cola = palabras.slice(i).join(" ");
      if (cola.length <= 22 && /^[A-ZÁÉÍÓÚÑ]/.test(cola)) { d = cola; break; }
    }
  }
  if (!d) return "";
  // Si la cabeza ya lo nombra, repetirlo solo gasta caracteres.
  const nucleo = d.split(/\s+/).pop()!.toLowerCase();
  return head.toLowerCase().includes(nucleo) ? "" : d;
}

function construirTitulo(
  nombre: string,
  precioTxt: string,
  hayRango: boolean,
  locale: Locale,
  destinos?: string[],
): string {
  const desde = hayRango ? (locale === "en" ? "from " : "desde ") : "";
  const sufijos = locale === "en"
    ? [` | Huasteca Tour ${desde}${precioTxt} MXN`, ` | Tour ${desde}${precioTxt} MXN`, ` | ${desde}${precioTxt} MXN`]
    : [` | Tour Huasteca ${desde}${precioTxt} MXN`, ` | Tour ${desde}${precioTxt} MXN`, ` | ${desde}${precioTxt} MXN`];

  const head = nombre.split(/\s*[—–]\s*/)[0].trim();
  // Sin el verbo de arranque cabe el lugar: "Descubre el Buceo en la Laguna de
  // la Media Luna" perdía "de la Media Luna" al recortarse por la cola.
  const headCorto = head.replace(/^(Descubre el|Descubre|Conoce el|Conoce|Vive el|Vive|Discover the|Discover|Experience the|Experience)\s+/i, "");
  const lugar = lugarDelTour(destinos, head);

  const bases = [
    lugar ? `${head}: ${lugar}` : "",
    lugar ? `${headCorto}: ${lugar}` : "",
    head,
    headCorto,
  ].filter(Boolean);

  for (const base of bases) {
    for (const sufijo of sufijos) {
      if (base.length + sufijo.length <= MAX_TITLE) return base + sufijo;
    }
  }
  // Último recurso: recortar el nombre de casa, nunca el lugar.
  return nombreCortoTour(headCorto, MAX_TITLE - sufijos[2].length) + sufijos[2];
}



/**
 * Descripción del SERP: por debajo de 155 caracteres y con el precio DENTRO.
 *
 * Antes se recortaba `tour.descripcion` a 155, y en varias fichas el precio
 * vivía por el carácter 320: el fragmento de Google nunca lo enseñaba. Ahora el
 * precio va en la primera frase y la segunda («Traslado, guía…») solo se añade
 * si cabe entera —preferimos una descripción corta a una cortada a medias.
 */
function construirDescripcion(
  corto: string,
  region: string,
  durTxt: string,
  precioTxt: string,
  conTraslado: boolean,
  conGuiaCertificado: boolean,
  locale: Locale,
): string {
  const s1 = locale === "en"
    ? `${corto} ${region}: guided tour of ${durTxt}, ${precioTxt}.`
    : `${corto} ${region}: tour guiado de ${durTxt}, ${precioTxt}.`;
  // «Guía certificado» solo donde la fuente lo dice: la Travesía del Café
  // declara un «recorrido guiado», no un guía certificado, y prometerlo en el
  // fragmento de Google era decir algo que TOURS_DB no respalda.
  const guia = conGuiaCertificado
    ? locale === "en" ? "certified guide" : "guía certificado"
    : locale === "en" ? "guide" : "guía";
  const s2 = conTraslado
    ? locale === "en" ? `Transport, ${guia} and insurance included.` : `Traslado, ${guia} y seguro incluidos.`
    : locale === "en" ? `Gear, ${guia} and insurance included.` : `Equipo, ${guia} y seguro incluidos.`;
  const completa = `${s1} ${s2}`;
  return completa.length <= 155 ? completa : metaDesc(s1);
}

/** ¿El precio incluye el traslado? Se lee del `incluye` en español, que es la fuente. */
function tieneTraslado(base: Pick<Tour, "incluye">): boolean {
  return /traslado/i.test(base.incluye.join(" "));
}

/** ¿La fuente declara un guía (o instructor) CERTIFICADO? Mismo criterio que la prosa de la ficha. */
function tieneGuiaCertificado(base: Pick<Tour, "incluye">): boolean {
  return /(?:gu[ií]a|instructor)[^|]*certificad/i.test(base.incluye.join(" | "));
}

/**
 * Dónde ocurre de verdad el recorrido.
 *
 * Nueve de los diez están en la Huasteca Potosina, pero la Laguna de la Media
 * Luna está en Rioverde —`zona: "Rioverde"` en `destinos.ts`, y su propio
 * metaTitle dice «Rioverde», nunca «Huasteca»—. Meterla en la Huasteca en el
 * fragmento de Google es un dato falso, y además tira la consulta real
 * («media luna rioverde»).
 */
function regionTour(id: string, locale: Locale): string {
  if (id === "tour-buceo-media-luna") {
    return locale === "en" ? "in Rioverde, San Luis Potosí" : "en Rioverde, San Luis Potosí";
  }
  return locale === "en" ? "in the Huasteca Potosina" : "en la Huasteca Potosina";
}

/**
 * Dónde se recoge al cliente, según la línea de traslado de TOURS_DB.
 *
 * La política general es recoger en el hospedaje, en Xilitla o en Ciudad
 * Valles, pero dos recorridos declaran una sola ciudad en su `incluye` —el
 * Rappel de Tamul, «Traslado desde Ciudad Valles», y la Travesía del Café,
 * «desde tu hospedaje en Xilitla»—. Esa lista se pinta en la propia ficha, así
 * que prometer las dos ciudades arriba contradecía lo que el cliente lee unas
 * líneas más abajo. Se dice solo lo que la fuente respalda.
 */
function ciudadesRecogida(base: Pick<Tour, "incluye">, locale: Locale): string {
  const linea = base.incluye.find((i) => /traslado/i.test(i)) ?? "";
  const xilitla = /xilitla/i.test(linea);
  const valles = /ciudad valles/i.test(linea);
  if (xilitla && !valles) return "Xilitla";
  if (valles && !xilitla) return "Ciudad Valles";
  return locale === "en" ? "Xilitla or Ciudad Valles" : "Xilitla o en Ciudad Valles";
}

export function generateMetadata({ params }: Props): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const base = TOURS_DB.find((t) => t.slug === params.slug);
  if (!base) return {};
  const tour = localizeTour(base, locale);
  const url = `${SITE}${localePath(`/tours/${tour.slug}`, locale)}`;
  const image = tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`;
  const [precioMin, precioMax] = rangoPrecio(base);
  const esVehiculo = base.precioUnidad === "vehiculo";
  // 🔴 Se le pasa `nombreCorto` del catálogo, no el nombre completo: el
  // constructor sabía recortar por el guion largo, pero el repo derivaba ese
  // nombre a mano en más de treinta sitios con dos variantes del separador.
  // Ahora hay un solo campo y esto lo usa.
  const title = construirTitulo(tour.nombreCorto, `$${fmtNumber(precioMin, locale)}`, precioMax > precioMin, locale, base.destinos);
  const description = construirDescripcion(
    tour.nombreCorto,
    regionTour(base.id, locale),
    fraseDuracion(tour, locale),
    frasePrecio(precioMin, precioMax, esVehiculo, locale),
    tieneTraslado(base),
    tieneGuiaCertificado(base),
    locale,
  );
  return {
    title,
    description,
    openGraph: {
      title,
      description: tour.descripcion,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: tour.nombre }],
    },
    alternates: buildAlternates(`/tours/${tour.slug}`, locale),
    twitter: {
      card: "summary_large_image",
      title,
      description: tour.descripcion,
      images: [image],
    },
  };
}

const DIFICULTAD_CONFIG = {
  alta:  { label: { es: "Avanzado", en: "Advanced" }, bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: { es: "Moderado", en: "Moderate" }, bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: { es: "Fácil",    en: "Easy"      }, bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

export default function TourDetailPage({ params }: Props) {
  const locale = asLocale(headers().get("x-locale"));
  const t = getDict(locale).tour;
  const tcommon = getDict(locale).common;
  const base = TOURS_DB.find((tr) => tr.slug === params.slug);
  if (!base) notFound();
  const tour = localizeTour(base, locale);

  const dif = DIFICULTAD_CONFIG[tour.dificultad];
  const reviews = TOUR_REVIEWS[tour.id as keyof typeof TOUR_REVIEWS] ?? [];
  const toursHref = localePath("/tours", locale);
  const money = (n: number) => `$${fmtNumber(n, locale)}`;

  // Precio por vehículo (ej. RZR): se reserva por WhatsApp, no por el flujo por persona.
  const esVehiculo = tour.precioUnidad === "vehiculo";
  const [precioMin, precioMax] = rangoPrecio(base);
  const hayRangoPrecio = precioMax > precioMin;
  // Tarifa del GRUPO COMPLETO por escalones (ej. el Edén en el Jardín): sí pasa
  // por el flujo en línea, pero la cifra NO se multiplica por cabeza.
  const esGrupo = tour.precioUnidad === "grupo";
  const maxGrupo = tour.tarifaGrupo?.length ?? tour.groupMax;
  // `precioTachado` apaga la promoción sola el día que vence (`PROMO_VENCE`).
  const antesDe = precioTachado(tour);
  const pctOff = antesDe ? Math.round((1 - tour.precio / antesDe) * 100) : 0;
  const [durMin, durMax] = tourDurRange(tour);
  const durLabel = durMin === durMax
    ? t.durationApprox(tour.duracion_hrs)
    : tour.rutas
      ? (locale === "en" ? `${durMin}–${durMax} hours depending on route` : `${durMin}–${durMax} horas según la ruta`)
      : (locale === "en" ? `${durMin}–${durMax} hours` : `${durMin}–${durMax} horas`);
  const priceUnitShort = esVehiculo
    ? (locale === "en" ? "MXN per vehicle" : "MXN por vehículo")
    : esGrupo
      ? (locale === "en" ? `MXN for the group (up to ${maxGrupo})` : `MXN por el grupo (hasta ${maxGrupo})`)
      : t.perPerson;
  const priceUnitHero = esVehiculo
    ? (locale === "en" ? "MXN / vehicle · Fuel & guide included" : "MXN / vehículo · Gasolina y guía incluidos")
    : esGrupo
      ? (locale === "en" ? `MXN / group of up to ${maxGrupo} · Not per person` : `MXN / grupo de hasta ${maxGrupo} · No es por persona`)
      : t.perPersonIncluded;

  // ── Datos de la banda de "Datos rápidos" ──────────────────────────────────
  // Salen del catálogo y de `TOUR_REQUISITOS`; ninguno se escribe a mano.
  const req = TOUR_REQUISITOS[tour.id];
  const edadResumen = req?.edadMinima
    ? (locale === "en" ? `From age ${req.edadMinima}` : `Desde ${req.edadMinima} años`)
    : req?.edadNota
      ? (locale === "en" ? "All ages — ask us" : "Todas las edades — pregúntanos")
      : null;
  // De dónde sale cada recorrido.
  //
  // 🔴 Antes esto era una escalera de `tour.id === "..."` repetida aquí, en las
  // dos preguntas frecuentes y en `TourDeparture`, y las listas ya no coincidían:
  // el Edén salía aquí como "Recogida en Xilitla" y TourDeparture, 300 px más
  // abajo, le prometía al cliente recogida en Ciudad Valles. Ahora las cuatro
  // leen el mismo campo del catálogo.
  const recogida = recogidaDeTour(tour);
  const puntoDeSalida =
    recogida.tipo === "base-xilitla"
      ? (locale === "en" ? "Meet at our Xilitla base" : "Punto de encuentro en Xilitla")
      : recogida.tipo === "en-sitio"
        ? (locale === "en" ? "Meet at Media Luna, Rioverde" : "Punto de encuentro en Media Luna")
        : recogida.tipo === "hospedaje-xilitla"
          ? (locale === "en" ? "Pickup in Xilitla" : "Recogida en Xilitla")
          : (locale === "en" ? "Pickup in Xilitla or Ciudad Valles" : "Recogida en Xilitla o Ciudad Valles");

  // ── LA FRASE CITABLE ──────────────────────────────────────────────────────
  // El precio, la duración y el punto de salida vivían solo dentro de insignias
  // de Tailwind: un "$1,550" suelto en un `<span>` no lo puede citar nadie —ni
  // una persona que copia una línea, ni un buscador de IA que necesita un
  // pasaje con sujeto y verbo—. Aquí van los mismos datos, los de TOURS_DB, en
  // una oración que se sostiene sola. No se inventa nada: el punto de salida es
  // el mismo que ya dice el bloque de recogida de la página, y la hora solo se
  // menciona donde existe (el buceo se llega por cuenta propia y no la tiene).
  const nombreCitable = nombreCortoTour(tour.nombre);
  const precioCitable = frasePrecio(precioMin, precioMax, esVehiculo, locale);
  const duracionCitable = durMin === durMax
    ? (locale === "en" ? `lasts about ${tour.duracion_hrs} hours` : `dura unas ${tour.duracion_hrs} horas`)
    : (locale === "en" ? `lasts between ${durMin} and ${durMax} hours` : `dura entre ${durMin} y ${durMax} horas`);
  const salidaCitable = esVehiculo
    ? (locale === "en"
        ? "sets off from our base in Xilitla between 8:00 and 9:00 AM"
        : "sale de nuestra base en Xilitla entre las 8:00 y las 9:00 AM")
    : tour.id === "tour-buceo-media-luna"
      ? (locale === "en"
          ? "meets at the entrance of the Media Luna Lagoon, in Rioverde, San Luis Potosí"
          : "tiene su punto de encuentro en la entrada de la Laguna de la Media Luna, en Rioverde, San Luis Potosí")
      : (locale === "en"
          ? `picks you up at your own lodging in ${ciudadesRecogida(base, locale)} between 8:00 and 9:00 AM`
          : `pasa por ti a tu hospedaje en ${ciudadesRecogida(base, locale)} entre las 8:00 y las 9:00 AM`);
  const fraseCitable = locale === "en"
    ? `The ${nombreCitable} tour costs ${precioCitable}, ${duracionCitable} and ${salidaCitable}.`
    : `El tour ${nombreCitable} cuesta ${precioCitable}, ${duracionCitable} y ${salidaCitable}.`;

  // Lo que va dentro de ese precio, leído del `incluye` en español —la fuente—
  // y no de una plantilla: dos de los diez recorridos NO llevan traslado y
  // prometérselo al cliente en prosa sería mentirle.
  const incluyeBase = base.incluye.join(" | ").toLowerCase();
  const piezasIncluidas: string[] = [];
  // "Traslado redondo desde tu hospedaje" y "Traslado desde Ciudad Valles" no
  // prometen lo mismo: solo se dice "redondo" donde la fuente lo dice.
  if (/traslado redondo/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "round-trip transport from your lodging" : "el traslado redondo desde tu hospedaje");
  else if (/traslado/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "the transport" : "el traslado");
  else {
    // Los dos recorridos sin traslado (el RZR y el buceo) se quedaban con una
    // frase pobrísima: lo que sí llevan dentro del precio es el vehículo o el
    // equipo.
    if (/gasolina/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "the vehicle with fuel" : "el vehículo con gasolina");
    if (/equipo|casco/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "the gear" : "el equipo");
  }
  if (/desayuno/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "breakfast" : "el desayuno");
  else if (/comida/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "a meal" : "la comida");
  if (/entrada/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "the admissions" : "las entradas");
  // El buceo lo guía un instructor PADI, no un guía de ruta; y no todos los
  // guías se declaran "certificados" en la fuente.
  if (/gu[ií]a[^|]*certificad/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "a certified guide" : "el guía certificado");
  else if (/instructor certificad/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "a certified PADI instructor" : "el instructor certificado PADI");
  else if (/gu[ií]a/.test(incluyeBase)) piezasIncluidas.push(locale === "en" ? "the guide" : "el guía");
  piezasIncluidas.push(locale === "en" ? "travel insurance for everyone in the group" : "el seguro de viaje para todo el grupo");
  const listaIncluida = piezasIncluidas.length > 1
    ? `${piezasIncluidas.slice(0, -1).join(", ")} ${locale === "en" ? "and" : "y"} ${piezasIncluidas[piezasIncluidas.length - 1]}`
    : piezasIncluidas[0];
  const fraseIncluye = locale === "en"
    ? `The price includes ${listaIncluida}.`
    : `El precio incluye ${listaIncluida}.`;

  const tourUrl = `${SITE}${localePath(`/tours/${tour.slug}`, locale)}`;
  const tourImagen = tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`;

  /**
   * Identificador único del RECORRIDO dentro del grafo, al estilo de `ORG_ID`.
   *
   * La ficha publicaba dos entidades con el mismo nombre y ninguna con `@id`:
   * un `TouristTrip` que llevaba el precio y un `Product` que llevaba la
   * calificación, y el nodo que aparecía en los fragmentos de producto era el
   * que NO tenía precio. Cada una tiene ahora su propio identificador estable
   * (`#tour` y `#product`) y las dos llevan `offers`, que es lo que faltaba.
   *
   * Va sin idioma —como `ORG_ID`— porque la versión en inglés describe el mismo
   * recorrido, no otro distinto; lo que cambia de idioma es el documento, y de
   * eso ya se encargan el `hrefLang` y el canónico.
   */
  const TOUR_ID = `${SITE}/tours/${tour.slug}#tour`;

  /**
   * El precio, tal y como se cobra.
   *
   * Cuando cada ruta y cada vehículo tienen tarifa propia (el RZR: de $1,600 a
   * $7,000 por vehículo), un `price` cerrado declara un precio que no existe.
   * `AggregateOffer` es la forma honesta de decir "hay un rango".
   */
  const ofertaSchema = hayRangoPrecio
    ? {
        "@type": "AggregateOffer",
        lowPrice: precioMin,
        highPrice: precioMax,
        priceCurrency: "MXN",
        offerCount: (tour.flota?.length ?? 0) * (tour.rutas?.length ?? 0) || undefined,
        availability: "https://schema.org/InStock",
        url: tourUrl,
        ...(esVehiculo ? { description: locale === "en" ? "Price per vehicle, not per person." : "Precio por vehículo, no por persona." } : {}),
      }
    : {
        "@type": "Offer",
        price: tour.precio,
        priceCurrency: "MXN",
        availability: "https://schema.org/InStock",
        url: tourUrl,
        ...(esVehiculo ? { description: locale === "en" ? "Price per vehicle, not per person." : "Precio por vehículo, no por persona." } : {}),
      };

  const tourSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": TOUR_ID,
    name: tour.nombre,
    // 🔴 28 sep 2026 — se retiraron `duration` e `inLanguage`. Ninguna de las
    // dos pertenece a `Trip`/`TouristTrip` en schema.org (`duration` es de
    // `Event`, `Movie`, `HowTo`…; `inLanguage` de `CreativeWork`), así que se
    // declaraban al vacío. Además `duration: "PT12H"` contradecía a la propia
    // página, que dice "12–13 horas". La duración va donde sí se lee: en la
    // descripción, en la banda de datos rápidos y en las FAQ.
    description: `${tour.descripcionLarga}\n\n${durLabel}.`,
    image: tourImagen,
    url: tourUrl,
    touristType: locale === "en"
      ? ["Adventure tourism", "Nature tourism", tour.tipo]
      : ["Turismo de aventura", "Turismo de naturaleza", tour.tipo],
    // `itinerary` SÍ es propiedad de `Trip`, y el dato ya existía sin publicar:
    // son las paradas del recorrido, en orden. Con el día hora por hora se
    // usan sus momentos; si el tour no lo tiene todavía, sus destinos.
    itinerary: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: (tour.itinerario?.length ?? tour.destinos.length),
      itemListElement: (tour.itinerario?.length
        ? tour.itinerario.map((m, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Place", name: m.momento, description: m.texto },
          }))
        : tour.destinos.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Place", name: d },
          }))),
    },
    provider: ORG_REF,
    offers: ofertaSchema,
  };

  // 🔴 Las dos primeras preguntas se generaban con un `el` fijo delante del
  // nombre COMPLETO: "¿Qué incluye el Expedición Tamul — Tamul, Cueva del Agua
  // y Sótano?". Mal concordado y kilométrico, y eso viaja al JSON-LD de las
  // FAQ, que es lo que Google lee. Ahora sale del catálogo: nombre corto más
  // su artículo (vacío en "El Edén en el Jardín", que ya lo trae).
  const conArticulo = tour.articulo ? `${tour.articulo} ${tour.nombreCorto}` : tour.nombreCorto;
  // Y el verbo concuerda: "¿Qué incluyen las Cascadas del Meco?", no "incluye".
  const esPlural = tour.articulo === "los" || tour.articulo === "las";

  const faqEntries = locale === "en"
    ? [
        { q: `What's included in the ${tour.nombreCorto}?`, a: tour.incluye.join(", ") + ". Everything is included in the price." },
        { q: `How long is the ${tour.nombreCorto}?`, a: durMin === durMax
            ? `The tour lasts approximately ${tour.duracion_hrs} hours.`
            : tour.rutas
              ? `It depends on the route you choose: between ${durMin} and ${durMax} hours.`
              : `The tour lasts between ${durMin} and ${durMax} hours.` },
        // La promesa del sitio —48 h y reembolso completo— no vale para los
        // recorridos que un tercero cobra por adelantado y no devuelve. Cuando
        // el tour trae su propia política, manda la suya (ver `cancelacion`).
        { q: "Can I cancel my booking?", a: tour.cancelacion?.en ?? "Yes. Free cancellation up to 48 hours before the tour. Full refund, no questions asked." },
        esVehiculo
          ? { q: "Is the price per person or per vehicle?", a: `Pricing is per vehicle, starting at ${money(tour.precio)} MXN depending on the route and unit you choose. Every vehicle includes fuel, safety gear and the guide.` }
          : esGrupo
          ? { q: "Is the price per person?", a: `No — it is a flat rate for the whole group, from ${money(tour.precio)} MXN for one person up to ${money(tour.tarifaGrupo?.[maxGrupo - 1] ?? tour.precio)} MXN for ${maxGrupo}, which is the maximum the garden allows. The more of you, the less each pays.` }
          : tour.soloAdultos
            ? { q: "What is the price per person?", a: `The price is ${money(tour.precio)} MXN per person. This activity is for ages 10 and up, so there is no children's discount. The park admission is paid separately on site.` }
            : { q: "What is the price per person?", a: `The price is ${money(tour.precio)} MXN per adult. Children ages 6 to 10 pay 70% (${money(Math.round(tour.precio * 0.7))} MXN) and children under 6 pay 50% (${money(Math.round(tour.precio * 0.5))} MXN). The discount applies when you book online.` },
        // No hay un punto de salida único: pasamos por el cliente a SU
        // hospedaje, en Xilitla o en Ciudad Valles. Solo el RZR (se maneja en
        // Xilitla) y Media Luna (Rioverde) tienen punto de encuentro fijo.
        recogida.tipo === "base-xilitla"
          ? { q: "Where does the tour depart from?", a: "We meet at our base in Xilitla, San Luis Potosí. Transportation to Xilitla is not included." }
          : recogida.tipo === "en-sitio"
            ? { q: "Where does the tour depart from?", a: "We meet at the entrance of the Media Luna Lagoon, in Rioverde — about 2 hours from Ciudad Valles. You make your own way there; transportation and the park admission are not included." }
          : recogida.tipo === "hospedaje-xilitla"
            ? { q: "Where does the tour depart from?", a: `We pick you up at your lodging in Xilitla and bring you back at the end.${recogida.nota ? " " + recogida.nota.en : ""}` }
            : { q: "Where does the tour depart from?", a: "There is no single departure point: we pick you up at your lodging — hotel, hostel, cabin or Airbnb — in Xilitla or Ciudad Valles, and bring you back at the end of the day. Round-trip transport is included and you don't need to stay with us. We confirm the exact time and address by WhatsApp after you book." },
      ]
    : [
        { q: `¿Qué ${esPlural ? "incluyen" : "incluye"} ${conArticulo}?`, a: tour.incluye.join(", ") + ". Todo incluido en el precio." },
        { q: `¿Cuánto ${esPlural ? "duran" : "dura"} ${conArticulo}?`, a: durMin === durMax
            ? `El tour tiene una duración aproximada de ${tour.duracion_hrs} horas.`
            : tour.rutas
              ? `Depende de la ruta que elijas: entre ${durMin} y ${durMax} horas.`
              : `El tour dura entre ${durMin} y ${durMax} horas.` },
        { q: "¿Puedo cancelar mi reserva?", a: tour.cancelacion?.es ?? "Sí. Cancelación gratuita hasta 48 horas antes del tour. Reembolso completo sin preguntas." },
        esVehiculo
          ? { q: "¿El precio es por persona o por vehículo?", a: `El precio es por vehículo, desde ${money(tour.precio)} MXN según la ruta y la unidad que elijas. Todos los vehículos incluyen gasolina, equipo de seguridad y guía.` }
          : esGrupo
          ? { q: "¿El precio es por persona?", a: `No: es una tarifa del grupo completo, desde ${money(tour.precio)} MXN si va una sola persona hasta ${money(tour.tarifaGrupo?.[maxGrupo - 1] ?? tour.precio)} MXN si van ${maxGrupo}, que es el máximo que permite el jardín. Entre más van, menos le toca a cada uno.` }
          : tour.soloAdultos
            ? { q: "¿Cuál es el precio por persona?", a: `El precio es ${money(tour.precio)} MXN por persona. Es una actividad para mayores de 10 años, por lo que no aplica descuento de niños. La entrada al parque se paga aparte en sitio.` }
            : { q: "¿Cuál es el precio por persona?", a: `El precio es ${money(tour.precio)} MXN por persona adulta. Los niños de 6 a 10 años pagan el 70% (${money(Math.round(tour.precio * 0.7))} MXN) y los menores de 6 años el 50% (${money(Math.round(tour.precio * 0.5))} MXN). El descuento se aplica solo al reservar en línea.` },
        recogida.tipo === "base-xilitla"
          ? { q: "¿Dónde es el punto de salida?", a: "El punto de encuentro es nuestra base en Xilitla, San Luis Potosí. El transporte hasta Xilitla no está incluido." }
          : recogida.tipo === "en-sitio"
            ? { q: "¿Dónde es el punto de salida?", a: "El punto de encuentro es la entrada de la Laguna de la Media Luna, en Rioverde — a unas 2 horas de Ciudad Valles. Llegas por tu cuenta; el transporte y la entrada al parque no están incluidos." }
          : recogida.tipo === "hospedaje-xilitla"
            ? { q: "¿Dónde es el punto de salida?", a: `Pasamos por ti a tu hospedaje en Xilitla${recogida.vehiculo ? ` —en el propio ${recogida.vehiculo.es}—` : ""} y te regresamos al terminar.${recogida.nota ? " " + recogida.nota.es : ""}` }
            : { q: "¿Dónde es el punto de salida?", a: "No hay un punto de salida único: pasamos por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, y te regresamos al terminar el día. El traslado redondo va incluido y no necesitas hospedarte con nosotros. La hora y la dirección exactas las confirmamos por WhatsApp al reservar." },
      ];

  // `TOUR_FAQS` llevaba ~150 líneas de preguntas específicas por tour que
  // NADIE importaba: código muerto, y por eso se había desincronizado (decía
  // que el rappel no incluía transporte cuando su propio `incluye` sí lo trae).
  // Se suman aquí, sin duplicar las que ya existen en `faqEntries`.
  // Temas que ya responden `faqEntries` arriba o la sección "Antes de ir":
  // repetirlos aquí solo infla la página y el JSON-LD.
  const FAQ_YA_CUBIERTO = /cuánto dura|qué incluye|debo llevar|punto de salida/i;
  // Estuvieron en `[]` en inglés mientras no había traducción; desde el 14 ago
  // se resuelven por idioma, así que el JSON-LD inglés ya emite sus preguntas.
  const faqsEspecificas = getTourFaqs(tour.id, locale);
  const faqPreguntasBase = new Set(faqEntries.map((f) => f.q.toLowerCase()));
  const faqTodas = [
    ...faqEntries,
    ...faqsEspecificas.filter(
      (f) => !faqPreguntasBase.has(f.q.toLowerCase()) && !FAQ_YA_CUBIERTO.test(f.q),
    ),
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "en" ? "en" : "es-MX",
    mainEntity: faqTodas.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Solo se declara calificación si el tour TIENE reseñas. Un tour recién
  // publicado trae reviewCount 0, y emitir "4.7 sobre 0 reseñas" es una
  // calificación inventada — además Google rechaza el aggregateRating sin al
  // menos una reseña.
  /**
   * El `Product` existe por sus `offers`: sin ellas el recorrido salía en
   * Google como un producto sin precio y el fragmento quedaba vacío.
   *
   * 🔴 28 sep 2026 — lo que SÍ se retira es el `aggregateRating` por recorrido
   * y el bloque `review`. Emitían `ratingValue: 4.9` fijo y el `reviewCount`
   * del tour, pero los once tours sumaban 757 reseñas contra las 161 que el
   * negocio tiene de verdad en Google. La travesía del café declaraba 43 sin
   * tener ni una escrita, y las fechas iban como "Marzo 2025", que no es
   * ISO-8601 y Google no puede leer.
   *
   * Las reseñas son del NEGOCIO, no de cada recorrido: van una sola vez en el
   * `aggregateRating` de la organización (`buildOrganizationJsonLd`, arriba en
   * esta misma página). Repetirlas por tour las multiplicaba por once.
   *
   * ⚠️ Mantiene su `@id` propio (`#product`) y NO el del `TouristTrip`:
   * compartirlo fusionaría los dos nodos en una sola entidad.
   *
   * Ya no va condicionado a `reviewCount > 0`: el precio es del producto,
   * exista o no una reseña, y los recorridos nuevos nacen con cero.
   */
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE}/tours/${tour.slug}#product`,
    name: tour.nombre,
    description: tour.descripcion,
    url: tourUrl,
    image: tourImagen,
    brand: ORG_REF,
    offers: ofertaSchema,
  };

  const waTour = locale === "en"
    ? `Hi, I'm interested in the "${tour.nombre}" tour. Could you share availability and prices?`
    : esVehiculo
      ? `Hola, me interesa el tour "${tour.nombre}". ¿Me ayudas a elegir ruta y vehículo? ¿Qué disponibilidad tienen?`
      // Con tarifa de grupo, `precio × 2` anunciaría el doble de lo que cuesta
      // para dos: el precio es uno solo y depende de cuántos van.
      : esGrupo
        ? `Hola, me interesa la experiencia "${tour.nombre}". ¿Qué fechas tienen disponibles?`
        : WA_MESSAGES.tour(tour.nombre, 2, 0, tour.precio * 2);
  const waPrivate = locale === "en"
    ? `Hi, I'd like a private "${tour.nombre}" tour for my group. What would the cost be?`
    : `Hola, me interesa hacer el tour "${tour.nombre}" de forma privada. ¿Cuál sería el costo?`;

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      {/* La empresa, con su `@id`. Va en la página porque el `provider` del tour
          la referencia por `@id`: sin el nodo completo aquí, la referencia queda
          colgando y el buscador no sabe a qué operadora apunta. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd(locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tourSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {reviewSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Inicio", item: `${SITE}${localePath("/", locale)}` },
          { "@type": "ListItem", position: 2, name: "Tours",  item: `${SITE}${toursHref}` },
          { "@type": "ListItem", position: 3, name: tour.nombre, item: `${SITE}${localePath(`/tours/${tour.slug}`, locale)}` },
        ],
      }) }} />

      {/* ── HERO ── */}
      {/* El hero mide 60vh en los 14 recorridos. Los que traen vídeo vertical
          crecen a 85vh EN TELÉFONO: el corte es 9:16 y dentro de una caja de
          60vh se veía menos de la mitad del cuadro. En escritorio vuelve a
          60vh, porque ahí no hay vídeo y una foto apaisada estirada solo
          empujaría el contenido hacia abajo sin enseñar nada más. */}
      <section
        className={`relative overflow-hidden ${
          tour.videoHeroMovil
            ? "h-[85vh] min-h-[560px] lg:h-[60vh] lg:min-h-[400px]"
            : "h-[60vh] min-h-[400px]"
        }`}
      >
        {tour.imagen_hero && (
          <HeroTourMedia foto={tour.imagen_hero} video={tour.videoHeroMovil} alt={tour.nombre} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/50 to-negro/20" />

        {/* `flex-wrap` y el margen a la derecha son por el sello de
            exclusividad: es el más largo de los tres y en un teléfono se salía
            de la pantalla en vez de bajar a la segunda línea. */}
        <div className="absolute top-24 left-6 right-6 flex flex-wrap gap-2">
          <span className="bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full">
            {tour.tipo}
          </span>
          <span className={`${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
            {dif.label[locale]}
          </span>
          {tour.exclusivo && (
            <span className="bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Award className="w-3 h-3" aria-hidden="true" />
              {tour.exclusivo[locale]}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-4xl">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-3">
            {t.guidedAllInclusive}
          </p>
          {/* El nombre corto: el detalle que iba tras el guion ya está en el
              tagline de la línea siguiente, así que repetirlo solo alargaba el
              titular ("Expedición Tamul — Tamul, Cueva del Agua y Sótano"). */}
          <h1 className="font-cormorant font-light text-crema leading-tight mb-3" style={{ fontSize: "clamp(28px,5vw,56px)" }}>
            {tour.nombreCorto}
          </h1>
          <p className="text-dorado/80 font-dm text-sm italic mb-4">{tour.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            {pctOff > 0 && (
              <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2.5 py-1 rounded-sm">{pctOff}% OFF</span>
            )}
            <div className="flex items-baseline gap-2">
              {(esVehiculo || esGrupo) && (
                <span className="text-crema/50 font-dm text-xs uppercase tracking-[1px]">{tcommon.desde}</span>
              )}
              <span className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(24px,3.5vw,36px)" }}>
                {money(tour.precio)}
              </span>
              <span className="text-crema/50 font-dm text-xs">{priceUnitHero}</span>
            </div>
            {/* 🔴 La primera pantalla no tenía NI UN elemento en el que hacer
                clic: ni el hero, ni la banda de datos, ni la columna de
                contenido. En escritorio tampoco hay barra fija —el botón
                flotante está apagado a propósito en las fichas de tour— así que
                la única acción posible estaba en el sidebar, fuera de pantalla.
                Este ancla no necesita JavaScript: baja al módulo de reserva. */}
            <a
              href={esVehiculo ? localePath(`/reservar/carrito?agregar=${tour.slug}`, locale) : `#${ID_MODULO_RESERVA}`}
              /* Va DENTRO del `flex flex-wrap` del precio, a su derecha: en escritorio
                 se leen juntos —cuánto cuesta y qué hacer— y en un teléfono el
                 `flex-wrap` lo baja solo a su propia línea. Sin `mt-*`, que
                 aquí solo lo desalinearía respecto al precio. */
              className="inline-flex items-center gap-2 bg-verde-selva hover:bg-verde-vivo text-crema px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              {locale === "en" ? "See available dates" : "Ver fechas disponibles"}
            </a>
          </div>
        </div>
      </section>

      <TourPageTracker tourId={tour.id} nombre={tour.nombre} precio={tour.precio} tipo={tour.tipo} />
      <MobileBookingBar tourSlug={tour.slug} precio={tour.precio} tourId={tour.id} tourName={tour.nombre}
        precioUnidad={tour.precioUnidad} waHref={waLink(waTour)} conModulo={!esVehiculo} />

      {/* ── DATOS RÁPIDOS ──────────────────────────────────────────────────
          Las cinco preguntas que alguien se hace ANTES de leer nada: cuánto
          dura, de dónde salgo, cuántos vamos, qué tan pesado es y si mi hijo
          puede ir. Hoy esas respuestas estaban repartidas entre el sidebar, la
          sección "Antes de ir" y "Recogida y transporte" —en un teléfono, a
          dos y tres pantallas de distancia—.
          No hay contenido nuevo: todo sale del catálogo, así que se rellena
          solo para los once recorridos y no se puede desincronizar. */}
      <section aria-label={locale === "en" ? "Tour at a glance" : "Datos rápidos del recorrido"}
        className="border-y border-white/8 bg-verde-profundo/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {[
            { Icon: Clock, txt: durLabel },
            { Icon: MapPin, txt: puntoDeSalida },
            { Icon: Users,  txt: tour.groupMin > 1
                ? (locale === "en" ? `${tour.groupMin}–${tour.groupMax} people` : `De ${tour.groupMin} a ${tour.groupMax} personas`)
                : t.groupMax(tour.groupMax) },
            { Icon: Gauge,  txt: `${locale === "en" ? "Level" : "Nivel"}: ${dif.label[locale].toLowerCase()}` },
            ...(edadResumen ? [{ Icon: Baby, txt: edadResumen }] : []),
          ].map(({ Icon, txt }) => (
            <span key={txt} className="flex items-center gap-2 text-[12px] font-dm text-crema/65">
              <Icon className="w-4 h-4 text-verde-vivo/70 flex-shrink-0" aria-hidden="true" />
              {txt}
            </span>
          ))}
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-4">{t.aboutThisTour}</h2>
            {/* Los datos duros en prosa, antes del texto de venta: es el pasaje
                que se puede citar tal cual. */}
            <p className="text-crema/85 font-dm text-sm leading-relaxed mb-4">
              {fraseCitable} {fraseIncluye}
            </p>
            <p className="text-crema/65 font-dm text-sm leading-relaxed mb-6">{tour.descripcion}</p>
            {/* El relato largo arranca PLEGADO. Son cuatro párrafos: en un
                teléfono empujaban el resto de la ficha —los destinos, lo que
                incluye, el módulo de reserva— media pantalla hacia abajo, y
                quien ya se decidió con el primer párrafo no necesita leerlos.
                Se usa `<details>` nativo, el mismo patrón que las preguntas
                frecuentes de esta página: funciona sin JavaScript y el lector
                de pantalla lo anuncia solo. */}
            {tour.descripcionLarga && (
              <details className="group border-l-2 border-verde-vivo/30 pl-5">
                <summary className="flex items-center gap-2 cursor-pointer list-none font-dm text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima transition-colors">
                  <span className="group-open:hidden">{t.keepReading}</span>
                  <span className="hidden group-open:inline">{t.showLess}</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-4 mt-4">
                  {tour.descripcionLarga.split("\n\n").map((parrafo, i) => (
                    <p key={i} className="text-crema/55 font-dm text-sm leading-relaxed">{parrafo}</p>
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* ── GARANTÍA HUASTECA ──────────────────────────────────────────
              El sello sale en la tarjeta de /tours sin explicación: aquí dice
              qué significa. Va justo debajo de la descripción, que es donde
              alguien acaba de decidir si el recorrido le interesa y lo que
              sigue es «¿y por qué con ustedes?». */}
          {tour.garantiaHuasteca && (
            <section
              aria-label={locale === "en" ? "Huasteca Guarantee" : "Garantía Huasteca"}
              className="flex items-start gap-5 border border-dorado/25 bg-dorado/[0.06] p-5"
            >
              <SelloGarantia size={72} idSuffix="-ficha" variante="plano" className="flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-cormorant text-crema text-xl leading-tight mb-2">
                  {locale === "en" ? "Huasteca Guarantee" : "Garantía Huasteca"}
                </h2>
                <p className="text-crema/65 font-dm text-sm leading-relaxed">
                  {locale === "en"
                    ? "This tour carries our seal: it goes to the most striking and best-loved places in the Huasteca, the ones you should not leave without seeing. And it comes with our service: impeccable, genuinely fun, and quality guaranteed."
                    : "Este recorrido lleva nuestro sello: va a los destinos más impresionantes y populares de la Huasteca, los que no te puedes ir sin ver. Y va con nuestro servicio: impecable, divertido de verdad y con la calidad garantizada."}
                </p>
              </div>
            </section>
          )}

          {/* ── TU DÍA, HORA POR HORA ──────────────────────────────────────
              Lo que más pesa al decidir y lo que la ficha no tenía: decía
              cuánto dura y qué lugares visita, pero no en qué orden ni a qué
              hora. Quien compara con GetYourGuide o Viator —donde el itinerario
              por horas es lo primero que se ve— no tenía con qué.

              Solo se pinta si el recorrido trae `itinerario`: a medias no sirve.
              La columna de horas es una línea de tiempo; las fotos salen de la
              galería del propio tour, así que no hay material nuevo que pedir. */}
          {tour.itinerario && tour.itinerario.length > 0 && (() => {
            /* Los `alt` de la galería, para que la foto de cada momento herede
               una descripción de verdad en vez del nombre del momento. */
            const altsGaleria = new Map(tour.gallery.map((g) => [g.src, g.alt]));
            return (
            <section aria-labelledby="itinerario-tour">
              <h2 id="itinerario-tour" className="font-cormorant text-crema text-2xl mb-2">
                {locale === "en" ? "Your day, hour by hour" : "Tu día, hora por hora"}
              </h2>
              <p className="text-crema/45 font-dm text-xs mb-6">
                {locale === "en"
                  ? "Approximate times. We confirm your exact pickup by WhatsApp when you book."
                  : "Horas aproximadas. La hora exacta de tu recogida te la confirmamos por WhatsApp al reservar."}
              </p>
              {/* La línea ya no es un `border-l`: es un elemento propio para
                  poder dibujarla al bajar (ver `.itinerario-linea`). El riel
                  apagado se queda detrás, así que la columna nunca se ve rota
                  donde el trazo todavía no llega. */}
              <ol className="relative ml-[52px] sm:ml-[64px] space-y-7">
                {/* El carril apagado. Iba al 15 % y sobre el negro del sitio
                    desaparecía: debajo de la punta no se veía NADA y la línea
                    parecía cortada en vez de estarse llenando. Al 35 % se lee
                    como un riel por recorrer sin competir con el trazo vivo. */}
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-px bg-verde-selva/35" />
                {/* El degradado del trazo vive en `.itinerario-linea`, no aquí:
                    con utilidades de Tailwind los extremos salían transparentes. */}
                <ItinerarioLinea className="absolute left-0 top-0 bottom-0 w-px" />
                {tour.itinerario.map((m) => (
                  <li key={m.hora + m.momento} className="itinerario-momento relative pl-5">
                    {/* La hora vive FUERA de la línea, a su izquierda, para que
                        se lea como una columna de tiempo y no como una viñeta. */}
                    <span className="absolute right-[calc(100%+1.25rem)] top-0 w-[46px] sm:w-[58px] text-right font-dm text-[11px] text-dorado tabular-nums leading-5">
                      {m.hora}
                    </span>
                    <span aria-hidden="true" className="itinerario-punto absolute -left-[5px] top-[7px] w-[9px] h-[9px] rounded-full bg-verde-vivo" />
                    <h3 className="font-dm text-sm font-medium text-crema/90 leading-5 mb-1">{m.momento}</h3>
                    <p className="text-crema/60 font-dm text-sm leading-relaxed">{m.texto}</p>
                    {m.foto && (
                      /* 🔴 Dos fallos que solo se ven cuando hay 13 itinerarios y
                         no uno: la foto declaraba 420×236 (16:9) y se dibujaba
                         con `h-auto`, así que en las VERTICALES —que son la
                         mitad de las fotos— Next reservaba un hueco de la
                         altura equivocada y la página saltaba al cargar. Y sin
                         `sizes`, Next asume 100vw y en un móvil de 400 px se
                         bajaba la variante de escritorio.
                         El recorte fijo también es una decisión de diseño: con
                         proporciones mezcladas la columna se veía irregular;
                         con una sola, la línea de tiempo tiene ritmo. */
                      <div className="relative mt-3 w-full max-w-[420px] aspect-[16/10] overflow-hidden rounded">
                        <Image
                          src={m.foto}
                          /* El `alt` era el nombre del momento («Recogida»), que
                             no describe la foto. Si la imagen está en la galería
                             del tour reusamos su alt, que sí, y que además ya
                             viene traducido. */
                          alt={altsGaleria.get(m.foto) ?? `${m.momento} — ${tour.nombreCorto}`}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 420px, 100vw"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
            );
          })()}

          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">{t.destinations}</h2>
            <ul className="space-y-3">
              {tour.destinos.map((d, i) => (
                <li key={d} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-verde-selva/40 border border-verde-vivo/30 flex items-center justify-center text-[11px] text-verde-vivo font-dm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-crema/70 font-dm text-sm pt-1">{d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── RUTAS Y PRECIOS POR VEHÍCULO (solo tours cobrados por vehículo, ej. RZR) ── */}
          {tour.rutas && tour.flota && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-2">
                {locale === "en" ? "Pick your route" : "Elige tu ruta"}
              </h2>
              <p className="text-crema/45 font-dm text-xs mb-5">
                {locale === "en"
                  ? "All prices are per vehicle (not per person) and include fuel, safety gear and guide."
                  : "Todos los precios son por vehículo (no por persona) e incluyen gasolina, equipo de seguridad y guía."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {tour.rutas.map((r) => (
                  <div key={r.nombre} className="border border-white/10 bg-negro/40 p-5">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="font-cormorant text-crema text-lg leading-tight">{r.nombre}</h3>
                      <span className="text-[10px] text-crema/40 font-dm flex-shrink-0">{r.duracion_hrs} h</span>
                    </div>
                    <p className="text-crema/55 font-dm text-xs leading-relaxed mb-3">{r.descripcion}</p>
                    {r.destinos && r.destinos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-1.5">
                          {locale === "en" ? "We visit" : "Visitamos"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.destinos.map((d) => (
                            <span key={d} className="text-[10px] font-dm text-crema/70 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.incluye && r.incluye.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {r.incluye.map((it) => (
                          <li key={it} className="flex items-start gap-1.5 text-[10px] font-dm text-lima/80">
                            <span className="flex-shrink-0">✓</span>{it}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[10px] text-crema/40 font-dm">
                      {tcommon.desde}{" "}
                      <span className="font-cormorant text-dorado text-base">{money(r.desde)}</span>{" "}
                      {locale === "en" ? "MXN per vehicle" : "MXN por vehículo"}
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="font-cormorant text-crema text-xl mb-2">
                {locale === "en" ? "Our fleet — price per vehicle" : "Nuestra flota — precio por vehículo"}
              </h3>
              <div className="overflow-x-auto border border-white/10">
                <table className="w-full text-left font-dm text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-negro/60">
                      <th className="px-4 py-3 text-[9px] tracking-[1.5px] uppercase text-crema/40 font-medium">
                        {locale === "en" ? "Vehicle" : "Vehículo"}
                      </th>
                      {tour.rutas.map((r) => (
                        <th key={r.nombre} className="px-3 py-3 text-[9px] tracking-[1px] uppercase text-crema/40 font-medium whitespace-nowrap">
                          {r.nombre.replace(/^(Ruta|Route)\s/i, "")} · {r.duracion_hrs}h
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tour.flota.map((v) => (
                      <tr key={v.nombre} className="border-b border-white/5 last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="text-crema/85 font-medium">{v.nombre}</p>
                          <p className="text-[10px] text-crema/40">{v.capacidad}</p>
                        </td>
                        {v.precios.map((p, i) => (
                          <td key={i} className="px-3 py-3 text-dorado whitespace-nowrap">{money(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-crema/35 font-dm mt-3">
                {locale === "en"
                  ? "Book online with card — pick your route, vehicle and date — or message us on WhatsApp and we'll help you set it up."
                  : "Resérvalo en línea con tarjeta —eliges ruta, vehículo y fecha— o escríbenos por WhatsApp y te ayudamos a armarlo."}
              </p>
            </section>
          )}

          {tour.gallery.length > 0 && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-5">{t.images}</h2>
              <TourGallery images={tour.gallery} tourName={tour.nombre} />
            </section>
          )}

          {reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cormorant text-crema text-2xl">{t.reviewsHeading}</h2>
                <a href={GOOGLE_MAPS_REVIEWS_URL} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors flex-shrink-0">
                  {t.viewOnGoogle}
                </a>
              </div>
              {/*
                La calificación de este bloque sale del MISMO sitio que la del
                sidebar y la del JSON-LD (`tour.reviewCount`). Antes decía
                "5.0 · 3 reseñas" —el promedio de los testimonios escritos— al
                lado de un sidebar que decía "4.9 · 127": dos cifras distintas
                de lo mismo en la misma pantalla, justo en el momento de
                decidir la compra. Los testimonios de abajo son una muestra,
                no el total, y así se etiquetan.
              */}
              <div className="flex gap-1 mb-2">
                {"★★★★★".split("").map((s, i) => (<span key={i} className="text-dorado text-lg">{s}</span>))}
                <span className="text-crema/40 font-dm text-sm ml-2 self-end">{resenasTexto(locale === "en")}</span>
              </div>
              <p className="text-crema/30 font-dm text-[11px] mb-6">{t.reviewsSample(reviews.length)}</p>
              {/* Lo que se lee primero es LO QUE DIJERON, no quién lo dijo: el
                  bloque de cabecera empujaba la cita hasta la cuarta línea. La
                  comilla ancla la tarjeta y deja claro de un vistazo que es voz
                  de cliente, sin gastar una línea de texto en decirlo.
                  Las tres entran escalonadas (80 ms) — ver `.reveal-up`. */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {reviews.map((r, i) => (
                  <figure
                    key={r.nombre}
                    className={`resena-card reveal-up ${i === 1 ? "reveal-d1" : i === 2 ? "reveal-d2" : ""} relative flex flex-col border border-white/8 bg-negro/30 p-5 pt-7 rounded-sm`}
                  >
                    <span aria-hidden="true"
                      className="absolute left-4 top-1 font-cormorant text-dorado/25 text-5xl leading-none select-none">
                      &ldquo;
                    </span>
                    <blockquote className="text-crema/70 font-dm text-sm leading-relaxed mb-4">
                      {r.texto}
                    </blockquote>
                    <figcaption className="mt-auto flex items-center gap-3 border-t border-white/8 pt-4">
                      {/* ⚠️ Las fotos volvieron el 28 sep por decisión de Manolo.
                          Lo que se le dijo y queda anotado: son 19 archivos para
                          27 reseñas —ocho repetidos— y una misma cara firma como
                          "Fernando" y como "Mariana". El campo `iniciales` sigue
                          en `tourReviews.ts` por si se quiere volver atrás. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.foto} alt="" width={32} height={32} loading="lazy"
                        className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                      <div className="min-w-0">
                        <p className="text-crema/90 font-dm text-[13px] font-medium leading-none truncate">{r.nombre}</p>
                        <p className="text-crema/35 font-dm text-[10px] mt-1">{r.ciudad} · {r.fecha}</p>
                      </div>
                      <span className="ml-auto flex gap-0.5 text-dorado text-[11px] leading-none" aria-label={`${r.rating} de 5`}>
                        {"★★★★★".split("").map((st, j) => (<span key={j} aria-hidden="true">{st}</span>))}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-4 text-center">
                <a href={GOOGLE_MAPS_REVIEWS_URL} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors">
                  {t.viewAllReviews}
                </a>
              </p>
            </section>
          )}

          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">{t.allIncluded}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tour.incluye.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-crema/65 font-dm">
                  <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>

          </section>

          {/* ── NO INCLUYE · QUÉ LLEVAR · REQUISITOS ──
              La ficha solo listaba lo que SÍ incluye. Lo demás vivía disperso
              (el "No incluye" en /precios, el "Qué llevar" en /info-practica)
              o directamente no existía, como los requisitos y la edad. En un
              rafting Clase III y en un rappel de 105 m eso no es un hueco de
              contenido, es un hueco operativo. Ver src/lib/tourRequisitos.ts. */}
          {locale !== "en" && (
            <section aria-labelledby="antes-de-ir">
              <h2 id="antes-de-ir" className="font-cormorant text-crema text-2xl mb-5">
                Antes de ir
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="border border-white/10 p-5">
                  <h3 className="font-dm text-[10px] tracking-[2px] uppercase text-crema/40 mb-4">No incluye</h3>
                  <ul className="space-y-2">
                    {noIncluyeDe(tour.id).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-crema/60 font-dm leading-relaxed">
                        <span className="text-terracota mt-0.5 flex-shrink-0" aria-hidden="true">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-white/10 p-5">
                  <h3 className="font-dm text-[10px] tracking-[2px] uppercase text-crema/40 mb-4">Qué llevar</h3>
                  <ul className="space-y-2">
                    {queLlevarDe(tour.id).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-crema/60 font-dm leading-relaxed">
                        <span className="text-verde-vivo mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(() => {
                const req = TOUR_REQUISITOS[tour.id];
                const edadTexto = req?.edadMinima
                  ? `Edad mínima: ${req.edadMinima} años.`
                  : null;
                if (!req?.requisitos?.length && !edadTexto && !req?.edadNota) return null;
                // 🔴 El título prometía una edad que en casi todos los tours no
                // existe: de los once, solo el buceo tiene `edadMinima`. En
                // Tamul salía un recuadro llamado "Requisitos y edad" con tres
                // viñetas y ninguna edad dentro. La cabecera de
                // `tourRequisitos.ts` ya decía que sin dato la ficha debía
                // "invitar a preguntar"; esto es lo que faltaba para cumplirlo.
                const hayEdad = Boolean(edadTexto || req?.edadNota);
                return (
                  <div className="border border-dorado/25 bg-dorado/[0.06] p-5">
                    <h3 className="font-dm text-[10px] tracking-[2px] uppercase text-dorado/80 mb-4">
                      {hayEdad ? "Requisitos y edad" : "Requisitos"}
                    </h3>
                    {hayEdad ? (
                      <p className="text-sm text-crema/75 font-dm leading-relaxed mb-3">
                        {edadTexto} {req?.edadNota}
                      </p>
                    ) : (
                      <p className="text-sm text-crema/60 font-dm leading-relaxed mb-3">
                        ¿Van menores? Este recorrido no tiene una edad mínima fija.
                        Cuéntanos las edades al reservar y te confirmamos si conviene.
                      </p>
                    )}
                    {req?.requisitos && req.requisitos.length > 0 && (
                      <ul className="space-y-2">
                        {req.requisitos.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-crema/60 font-dm leading-relaxed">
                            <span className="text-dorado mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-crema/40 font-dm mt-4 leading-relaxed">
                      Avísanos al reservar de cualquier condición médica, lesión, embarazo o
                      limitación física que pueda afectar tu participación. Ver{" "}
                      <Link href="/terminos" className="underline underline-offset-2 hover:text-crema/70">
                        términos y condiciones
                      </Link>
                      .
                    </p>
                  </div>
                );
              })()}
            </section>
          )}

          <TourDeparture tourId={tour.id} />

          {/* La misma caja, para móvil, al final de todo (ver la nota del aside). */}
          <div className="lg:hidden space-y-4">
            <div className="border border-white/10 bg-negro/60 p-5">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-4">{t.bookWithConfidence}</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">
                      {tour.cancelacion ? (locale === "en" ? "Move your date" : "Cambia tu fecha") : t.freeCancellation}
                    </p>
                    <p className="text-[10px] font-dm text-crema/40">
                      {tour.cancelacion
                        ? (locale === "en" ? "Up to 5 days before · no refunds" : "Hasta 5 días antes · no hay reembolsos")
                        : t.freeCancellationSub}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.rescheduleRain}</p><p className="text-[10px] font-dm text-crema/40">{t.rescheduleRainSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.photosIncluded}</p><p className="text-[10px] font-dm text-crema/40">{t.photosIncludedSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Headphones className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.support247}</p><p className="text-[10px] font-dm text-crema/40">{t.support247Sub}</p></div>
                </li>
                {/* Cómo se paga. Estaba SOLO en la pantalla de checkout, o sea
                    después de decidir: quien dudaba de si podía pagar con
                    tarjeta —o de a quién le estaba dando el número— no tenía
                    respuesta hasta el final. Es el mismo texto que ya se usa
                    en `reservar-tour/[slug]/checkout`. */}
                <li className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">
                      {locale === "en" ? "Card, cash or transfer" : "Tarjeta, efectivo o transferencia"}
                    </p>
                    <p className="text-[10px] font-dm text-crema/40">
                      {locale === "en" ? "Encrypted payment · Processed by Stripe" : "Pago cifrado · Procesado por Stripe"}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <Link href={toursHref}
              className="block text-center border border-white/15 hover:border-crema/30 text-crema/50 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm py-3 transition-all duration-200">
              {t.backToTours}
            </Link>
          </div>
        </div>

        {/* Sidebar sticky.
            `order-first` en móvil: en un teléfono la rejilla se apila y esta
            columna caía DESPUÉS de todo —descripción, galería, incluye, FAQ,
            reseñas—, a casi veinte mil píxeles del inicio. El módulo de reserva
            existía y nadie llegaba a él en el 74 % de las visitas.
            Arriba, además, resuelve de paso que el precio del hero va sobre una
            foto turquesa y apenas se lee: aquí sale con su fondo. */}
        <aside className="lg:col-span-1 order-first lg:order-none lg:flex lg:flex-col">
          {/* 🔴 Este envoltorio NO es decorativo: es lo que evita que las dos
              cajas se pisen. `position: sticky` se mantiene pegado mientras su
              CONTENEDOR esté en pantalla. Si el contenedor fuera el `<aside>`
              entero —que el grid estira a casi 6.000 px—, el bloque fijo
              seguiría flotando arriba cuando el bloque de abajo llega a esa
              misma altura, y se montarían uno sobre otro. Con `flex-1` este
              contenedor ocupa todo el hueco MENOS lo que necesita el bloque de
              abajo, así que el fijo se despega justo cuando el otro empieza. */}
          <div className="lg:flex-1 lg:min-h-0">
            <div className="sticky top-24 space-y-4">
            <div className="border border-white/10 bg-negro/60 p-5">
              {pctOff > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2 py-0.5">{pctOff}% OFF</span>
                  <span className="text-[9px] text-crema/35 font-dm">{t.specialPrice}</span>
                </div>
              )}
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">{tcommon.desde.toLowerCase()}</p>
              {antesDe && (
                <p className="text-[12px] text-crema/35 font-dm line-through leading-none">{money(antesDe)}</p>
              )}
              <p className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(32px,4vw,48px)" }}>{money(tour.precio)}</p>
              <p className="text-[11px] text-crema/40 font-dm mt-1">{priceUnitShort}</p>
              {tour.reviewCount > 0 && (
                <p className="text-[10px] text-dorado/80 font-dm mt-2 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-dorado/80" aria-hidden="true" /> {resenasTexto(locale === "en")}
                </p>
              )}
              {/* La duración y el aforo salieron de aquí: ya están, con su
                  icono, en la banda de "Datos rápidos" que va justo debajo del
                  hero. Repetirlos costaba 34 px del bloque fijo, y esos 34 px
                  eran justo los que impedían que cupiera entero en una laptop:
                  con ellos medía 739 px contra los ~820 de la ventana menos los
                  96 del `top-24`, así que el sidebar scrolleaba en vez de
                  acompañar. */}
            </div>

            {/* Fecha, personas y total AQUÍ, no una pantalla más allá. Los
                recorridos por vehículo (RZR, café) se quedan con el enlace: su
                precio depende de la ruta y del modelo, y eso se elige en el
                carrito con su propio formulario. */}
            {!esVehiculo && (
              <ReservaFichaTour
                slug={tour.slug}
                tourId={tour.id}
                nombre={localizeTour(tour, locale).nombre}
                precio={tour.precio}
                groupMin={tour.groupMin}
                groupMax={tour.groupMax}
                soloMayores={!!tour.soloAdultos}
                tarifaGrupo={tour.tarifaGrupo}
              />
            )}

            <div className="space-y-2.5">
              {esVehiculo && (
                <Link href={localePath(`/reservar/carrito?agregar=${tour.slug}`, locale)}
                  className="flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.bookThisTour}
                </Link>
              )}
              <a href={waLink(waTour)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                {t.askWhatsapp}
              </a>
              {/* Un recorrido con política propia no puede llevar debajo el
                  "cancela gratis 48 h" del resto del sitio: es justo el
                  renglón que el cliente cita cuando pide su dinero de vuelta. */}
              <p className="text-center text-[9px] text-crema/25 font-dm">
                {tour.cancelacion
                  ? (locale === "en" ? "Non-refundable · date changes allowed up to 5 days before" : "Sin reembolso · cambio de fecha hasta 5 días antes")
                  : t.freeCancel48}
              </p>
            </div>
            </div>
          </div>

          {/* 🔴 Fuera del bloque fijo a propósito. `position: sticky` no puede
              enseñar lo que no cabe en la ventana: con todo esto dentro, el
              bloque medía 1.288 px contra los ~820 de una laptop y el botón de
              reservar quedaba inalcanzable durante casi 5.000 px de scroll.
              Arriba se queda lo que vende —precio, fecha, personas y botón—,
              que ahora sí cabe y acompaña al visitante mientras lee. Esto de
              aquí se lee cuando ya se decidió, así que cae al final y scrollea.

              ⚠️ Sin `mt-auto`: lo que coloca este bloque al final es el
              `lg:flex-1` del envoltorio de arriba, y ESE es también el que
              impide que las dos cajas se monten una sobre otra. */}
          <div className="space-y-4 mt-4">

            {/* 🔴 28 sep 2026 — estos tres bajaron aquí desde la caja de precio.
                Medido en el navegador: empujaban el botón de reservar a 831 px
                del borde superior cuando una laptop tiene ~820, así que el
                botón quedaba fuera de pantalla durante casi 5.000 px de scroll.
                El bloque fijo mide más que la ventana, y `position: sticky` no
                puede enseñar lo que no cabe. Abajo siguen cumpliendo su papel
                —se leen cuando ya se decidió— y el botón vuelve a verse solo. */}
            <div className="space-y-2.5">
                {/* 🔴 28 sep 2026 — el privado NO es una tarifa aparte. Decía
                    "desde $8,500 por el grupo completo" (el viejo `privateMinPrice`)
                    cuando en realidad se cobra el precio normal del recorrido MÁS
                    $250 por cabeza: para dos personas en Tamul son $3,600, no
                    $8,500. Ahora se publica el recargo y el total ya sumado, que
                    es lo que el cliente necesita para decidir. */}
                {tour.privateAvailable && (
                  <a href={waLink(waPrivate)} target="_blank" rel="noopener noreferrer"
                    className="block mt-3 border border-verde-vivo/30 hover:border-verde-vivo/60 bg-verde-vivo/5 px-3 py-2.5 transition-colors group/priv">
                    <span className="flex items-center gap-1.5 text-[10px] tracking-[1px] uppercase font-dm text-verde-vivo">
                      <Lock className="w-3 h-3" aria-hidden="true" />
                      {locale === "en" ? "Private tour for your group" : "Tour privado para tu grupo"}
                    </span>
                    {esPorPersona(tour) && (
                      <>
                        <span className="block font-cormorant text-crema text-lg leading-tight mt-1">
                          {money(tour.precio + PRIVADO_EXTRA_POR_PERSONA)}
                          {/* `t.perPerson` YA trae el "MXN" delante: ponerlo otra
                              vez dejaba "$1,800 MXN MXN por persona". */}
                          <span className="font-dm text-[11px] text-crema/50"> {t.perPerson}</span>
                        </span>
                        <span className="block text-[10px] font-dm text-crema/45 leading-tight">
                          {locale === "en"
                            ? `Only your group · +${money(PRIVADO_EXTRA_POR_PERSONA)} per person`
                            : `Solo tu grupo · +${money(PRIVADO_EXTRA_POR_PERSONA)} por persona`}
                        </span>
                      </>
                    )}
                    <span className="block text-[10px] font-dm text-crema/40 mt-0.5 group-hover/priv:text-crema/60 transition-colors">
                      {locale === "en" ? "Ask on WhatsApp →" : "Cotizar por WhatsApp →"}
                    </span>
                  </a>
                )}
                {!esVehiculo && (
                  <InventoryBadge tourId={tour.id} tourName={tour.nombre} groupMax={tour.groupMax} />
                )}
                {tour.urgencia && (
                  <p className="text-[9px] text-dorado/80 bg-dorado/10 border border-dorado/20 px-2 py-1 mt-2 font-dm leading-tight">
                    {tour.urgencia}
                  </p>
                )}
            </div>


            {/* En un TELÉFONO el `<aside>` entero sube al primer lugar
                (`order-first`), así que estos sellos y el enlace "ver todos los
                tours" salían ANTES que la descripción del recorrido: un enlace
                de salida colocado encima del argumento de venta. En escritorio
                se quedan aquí; en móvil se pintan al final de la columna. */}
            <div className="hidden lg:block space-y-4">
            <div className="border border-white/10 bg-negro/60 p-5">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-4">{t.bookWithConfidence}</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">
                      {tour.cancelacion ? (locale === "en" ? "Move your date" : "Cambia tu fecha") : t.freeCancellation}
                    </p>
                    <p className="text-[10px] font-dm text-crema/40">
                      {tour.cancelacion
                        ? (locale === "en" ? "Up to 5 days before · no refunds" : "Hasta 5 días antes · no hay reembolsos")
                        : t.freeCancellationSub}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.rescheduleRain}</p><p className="text-[10px] font-dm text-crema/40">{t.rescheduleRainSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.photosIncluded}</p><p className="text-[10px] font-dm text-crema/40">{t.photosIncludedSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Headphones className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.support247}</p><p className="text-[10px] font-dm text-crema/40">{t.support247Sub}</p></div>
                </li>
                {/* Cómo se paga. Estaba SOLO en la pantalla de checkout, o sea
                    después de decidir: quien dudaba de si podía pagar con
                    tarjeta —o de a quién le estaba dando el número— no tenía
                    respuesta hasta el final. Es el mismo texto que ya se usa
                    en `reservar-tour/[slug]/checkout`. */}
                <li className="flex items-start gap-3">
                  <CreditCard className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">
                      {locale === "en" ? "Card, cash or transfer" : "Tarjeta, efectivo o transferencia"}
                    </p>
                    <p className="text-[10px] font-dm text-crema/40">
                      {locale === "en" ? "Encrypted payment · Processed by Stripe" : "Pago cifrado · Procesado por Stripe"}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <Link href={toursHref}
              className="block text-center border border-white/15 hover:border-crema/30 text-crema/50 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm py-3 transition-all duration-200">
              {t.backToTours}
            </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── PREGUNTAS FRECUENTES ──
          Estas cinco preguntas ya se emitían en el JSON-LD (FAQPage) pero no se
          mostraban en la página. Google exige que el contenido marcado sea
          visible, así que ahora se renderizan: además de quitar el riesgo de
          acción manual, responden las dudas que hoy se van por WhatsApp. */}
      <section aria-labelledby="faq-tour" className="bg-crema border-t border-negro/8 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">
            {locale === "en" ? "Before you book" : "Antes de reservar"}
          </p>
          <h2 id="faq-tour" className="font-cormorant font-light text-verde-profundo text-3xl md:text-4xl mb-8">
            {locale === "en" ? "Frequently asked questions" : "Preguntas frecuentes"}
          </h2>
          <div className="divide-y divide-negro/10 border-y border-negro/10">
            {faqTodas.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-sm font-medium text-verde-profundo">
                  <span>{f.q}</span>
                  <span
                    className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="font-dm text-sm text-negro/60 leading-relaxed mt-3 pr-8">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="font-dm text-xs text-negro/45 mt-6">
            {locale === "en" ? (
              <>
                More detail in our{" "}
                <Link href="/politica-de-cancelacion" className="underline underline-offset-2 hover:text-negro/70">
                  cancellation and weather policy
                </Link>
                .
              </>
            ) : (
              <>
                Más detalle en la{" "}
                <Link href="/politica-de-cancelacion" className="underline underline-offset-2 hover:text-negro/70">
                  política de cancelación y clima
                </Link>
                , en{" "}
                <Link href="/preguntas-frecuentes" className="underline underline-offset-2 hover:text-negro/70">
                  preguntas frecuentes
                </Link>{" "}
                y en{" "}
                <Link href="/info-practica" className="underline underline-offset-2 hover:text-negro/70">
                  info práctica
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </section>

      {/* ── TOURS SIMILARES / CROSS-SELL ── */}
      {(() => {
        // OJO: `slug` debe ser el slug REAL del tour (no el id) — se busca con tr.slug === combo.slug
        const COMBOS: Record<string, { slug: string; msg: string }> = {
          "tour-tamul":       { slug: "ruta-surrealista-edward-james",   msg: "Si tienes un día más: Las Pozas de Edward James es el complemento perfecto — arte surrealista después de la naturaleza bruta." },
          "tour-edward-james":{ slug: "expedicion-tamul",                msg: "Combínalo con la Expedición Tamul — cascada + selva al día siguiente. El clásico de 2 días de la Huasteca." },
          "tour-meco":        { slug: "paraiso-escalonado-minas-micos",  msg: "Combínalo con el Tour Minas + Micos para un segundo día de aguas turquesas con más cascadas y tirolesas." },
          "tour-minas-micos": { slug: "cascadas-del-meco",               msg: "Combínalo con Cascada El Meco — aguas turquesas reales con luz perfecta. Dos días, dos experiencias únicas." },
          "tour-puente-dios": { slug: "paraiso-escalonado-minas-micos",  msg: "Combínalo con Minas + Micos al día siguiente — más cascadas, más pozas, la ruta de aguas completa." },
          "tour-rafting-tampaon": { slug: "rappel-tamul",  msg: "Combínalo con el Rappel en Tamul — dos días de adrenalina en el mismo cañón: un día remando los rápidos y otro descendiendo frente a la cascada más alta de San Luis Potosí." },
          "tour-rappel-tamul": { slug: "rafting-rio-tampaon", msg: "Combínalo con el Rafting en el Tampaón — después de descender la pared, domina los rápidos del mismo río. El fin de semana de adrenalina completo." },
        };
        const combo = COMBOS[tour.id];
        const comboBase = combo ? TOURS_DB.find((tr) => tr.slug === combo.slug) : null;
        const comboTour = comboBase ? localizeTour(comboBase, locale) : null;
        const otherTours = TOURS_DB.filter((tr) => tr.slug !== tour.slug && tr.slug !== combo?.slug).slice(0, 2).map((tr) => localizeTour(tr, locale));
        const comboMsg = combo ? (locale === "en" ? t.comboGeneric : combo.msg) : "";

        return (
          <section className="border-t border-white/6 py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm text-center mb-2">{t.maximizeTrip}</p>
              <h2 className="font-cormorant text-crema text-2xl mb-10 text-center">{t.combineHeading}</h2>

              {comboTour && combo && (
                <div className="border border-dorado/25 bg-dorado/5 p-5 mb-8 flex flex-col sm:flex-row gap-5 items-start">
                  <div className="sm:flex-shrink-0 w-full sm:w-40">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      {comboTour.imagen_hero && (
                        <Image src={comboTour.imagen_hero} alt={comboTour.nombre} fill className="object-cover" sizes="160px" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[8px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 px-2 py-0.5 mb-2">{t.recommendedCombo}</span>
                    <h3 className="font-cormorant text-crema text-lg leading-snug mb-1">{comboTour.nombre}</h3>
                    <p className="text-crema/55 font-dm text-xs leading-relaxed mb-3">{comboMsg}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-cormorant text-dorado text-base">{money(comboTour.precio)} MXN/{tcommon.porPersona.split(" ")[1] ?? "persona"}</span>
                      <Link href={localePath(`/tours/${comboTour.slug}`, locale)}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 hover:bg-dorado/10 px-3 py-1.5 transition-all">
                        {t.viewTour}
                      </Link>
                      <Link href={localePath(`/reservar/carrito?agregar=${comboTour.slug}`, locale)}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-negro bg-dorado hover:bg-lima px-3 py-1.5 transition-all">
                        {t.book}
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherTours.map((tr) => (
                  <Link key={tr.slug} href={localePath(`/tours/${tr.slug}`, locale)}
                    className="group border border-white/8 hover:border-verde-vivo/40 bg-negro/40 p-5 flex gap-4 items-start transition-all duration-200">
                    <div className="relative w-20 h-20 overflow-hidden flex-shrink-0">
                      {tr.imagen_hero && (<Image src={tr.imagen_hero} alt={tr.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="80px" />)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{tr.tipo}</p>
                      <h3 className="font-cormorant text-crema text-base leading-tight group-hover:text-dorado transition-colors mb-1">{tr.nombre}</h3>
                      <p className="text-[10px] text-crema/40 font-dm">{tcommon.desde} {money(tr.precio)} MXN</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Espaciador móvil: evita que la MobileBookingBar fija tape el contenido final */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      <SocialProofToast tourId={tour.id} tourName={tour.nombre} />
    </main>
  );
}
