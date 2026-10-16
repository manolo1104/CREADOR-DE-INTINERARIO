import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bus, BedDouble, Coffee, Waves, Landmark, ShieldCheck, Check, MapPin, Clock, Star, X, Route, UserRound, MessageCircle,
} from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { tiempoDesde } from "@/lib/tiemposDeViaje";
import { SITE, asLocale } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, ORG_REF } from "@/lib/jsonld";
import { GOOGLE_PERFIL_URL, GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { RESENAS_REALES } from "@/lib/resenasReales";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import { logger } from "@/lib/logger";
import { salidasPublicas, pruebaSocial, type SalidaVista } from "@/lib/viajeCdmx/salidas";
import { diaMX, diaMXEn, fechaLarga, fechaLargaEn, pesos, pesosEn, rangoCorto, rangoCortoEn, rangoLargo, rangoLargoEn } from "@/lib/viajeCdmx/precio";
import {
  ANTICIPO_PCT, CORTE_DIAS_ANTES, CUARTOS, DESAYUNOS, DIAS, HORA_CITA, HORA_LLEGADA, HORA_REGRESO, HORA_SALIDA, HORA_SALIDA_REGRESO,
  INCLUIDO, INCLUYE, ITINERARIO, LIDER_PERSONAS, NO_INCLUYE, NOCHES_CUALES, NOCHES_TEXTO, PUNTO_SALIDA, QUE_LLEVAR, REGRESO_TEXTO,
  SALIDA_TEXTO, SUPLEMENTO_PRIVADO, VIAJE_NOMBRE, VIAJE_RUTA, mensajeWhatsApp, politicas, preguntasFrecuentes, seguridad,
  type Incluido, type Locale, type PreguntaFrecuente,
} from "@/lib/viajeCdmx/config";
import {
  INCLUIDO_EN, INCLUYE_EN, ITINERARIO_EN, NOCHES_TEXTO_EN, NO_INCLUYE_EN, QUE_LLEVAR_EN, REGRESO_TEXTO_EN, VIAJE_NOMBRE_EN, VIAJE_RUTA_EN,
  mensajeWhatsAppEn,
} from "@/lib/viajeCdmx/en";
import {
  costoPorTuCuenta, fichaViaje, fichaViajeEn, lugarDeSalida, lugaresDelViaje, porTuCuenta, porTuCuentaEn, preguntasCdmx, preguntasCdmxEn,
  vendibles,
} from "@/lib/viajeCdmx/seo";
import { pesosPorDolar } from "@/lib/viajeCdmx/usd";
import { RESENAS_VIAJE } from "@/lib/viajeCdmx/resenas";
import { ReservaViaje } from "@/components/viajeCdmx/ReservaViaje";
import { FormLider } from "@/components/viajeCdmx/FormLider";
import { MapaPunto } from "@/components/viajeCdmx/MapaPunto";
import { BarraViaje } from "@/components/viajeCdmx/BarraViaje";
import { BotonWhatsApp } from "@/components/viajeCdmx/BotonWhatsApp";
import { AvatarResena } from "@/components/AvatarResena";

/**
 * /viaje-cdmx-xilitla y /en/huasteca-potosina-from-mexico-city — la salida
 * grupal mensual desde CDMX (15 oct 2026; en inglés desde el 16 oct).
 *
 * 🔴 Siempre en vivo, sin caché: los lugares y el precio de cada fecha salen
 * de la base en cada visita, y la preventa termina a una hora fija. Con ISR la
 * página podría enseñar un precio que el cobro ya no acepta.
 *
 * Una sola plantilla para los dos idiomas (el idioma llega en `x-locale`, como
 * en el resto del sitio). La versión en inglés es para los extranjeros que
 * viven o pasean en Juárez, Roma y Condesa, a unos pasos del Ángel: enseña el
 * precio también en dólares (aproximado; se cobra en pesos).
 *
 * Lo que pidió Manolo el 16 oct, en orden: reseñas reales de Google junto al
 * primer botón, una sección del viaje de noche, los cuartos con su precio
 * (compartido o privado con cama king) y las políticas a la vista.
 *
 * Las fotos son lo que vende (Manolo, 15 oct): todas reales, de las fichas de
 * los recorridos y del hotel. Abajo del pliegue van en diferido.
 */
export const dynamic = "force-dynamic";

const URL_ES = `${SITE}${VIAJE_RUTA}`;
const URL_EN = `${SITE}${VIAJE_RUTA_EN}`;
/**
 * La foto más impresionante de Tamul que tenemos (Manolo, 15 oct: «la imagen
 * más impresionante de la cascada»): la caída de 105 m con arcoíris, real, de
 * la galería del tour. La cascada queda a la IZQUIERDA del encuadre, así que en
 * escritorio el texto va a la derecha para no taparla.
 */
const HERO = "/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg";

const idioma = (): Locale => (asLocale(headers().get("x-locale")) === "en" ? "en" : "es");

/** Una sola lectura por visita: la comparten los metadatos y la página. */
const cargar = cache(async (locale: Locale): Promise<{ salidas: SalidaVista[]; estaSemana: number; yaViajaron: number; usd: number | null }> => {
  const usd = locale === "en" ? await pesosPorDolar() : null;
  try {
    const [salidas, social] = await Promise.all([salidasPublicas(), pruebaSocial()]);
    return { salidas, ...social, usd };
  } catch (e) {
    // Sin base, la página sigue en pie: sin fechas y con la lista de espera.
    logger.error("viaje_cdmx_pagina_sin_datos", { reason: e instanceof Error ? e.message : String(e) });
    return { salidas: [], estaSemana: 0, yaViajaron: 0, usd };
  }
});

const enDolares = (n: number, usd: number | null) => (usd ? `US$${Math.round(n / usd).toLocaleString("en-US")}` : "");

export async function generateMetadata(): Promise<Metadata> {
  const locale = idioma();
  const { salidas, usd } = await cargar(locale);
  const v = vendibles(salidas);
  const desde = v.length ? Math.min(...v.map((s) => s.precioVigente)) : null;
  // hreflang de ida y vuelta: las dos páginas se declaran gemelas y el español es el x-default.
  const alternates = { languages: { "es-MX": URL_ES, en: URL_EN, "x-default": URL_ES } };

  if (locale === "en") {
    const title = "Huasteca Potosina from Mexico City · Weekend Trip to Xilitla";
    const description =
      `Small-group weekend trip from Mexico City, all included: transport from the Angel, a night in Xilitla, breakfasts, Las Pozas and Tamul waterfall. ` +
      (desde ? `From ${pesosEn(desde)} (≈${enDolares(desde, usd)}).` : `Monthly departures; book with ${ANTICIPO_PCT}%.`);
    return {
      title,
      description,
      alternates: { canonical: URL_EN, ...alternates },
      openGraph: {
        title: "Huasteca Potosina from Mexico City: a weekend, all included",
        description: `Monthly small-group trip from the Angel of Independence · transport, ${NOCHES_TEXTO_EN} in Xilitla, ${DESAYUNOS} breakfasts, Tamul and Las Pozas. Back on Monday at ${HORA_REGRESO}.`,
        url: URL_EN,
        siteName: "Huasteca Potosina Tours",
        locale: "en_US",
        type: "website",
        images: [{ url: `${SITE}${HERO}`, width: 1772, height: 1181, alt: "Tamul waterfall falling 105 m into a turquoise river, with a rainbow" }],
      },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  // «Huasteca Potosina desde CDMX» es como lo busca la gente (el nombre de la
  // región es la mitad de las impresiones del sitio); Xilitla, Tamul y Las
  // Pozas son lo que el viaje tiene y la competencia de Ciudad Valles no.
  const title = "Viaje a la Huasteca Potosina desde CDMX · Tamul y Las Pozas";
  const description =
    `Tour de fin de semana desde la CDMX, todo incluido: transporte, ${NOCHES_TEXTO} en Xilitla, desayunos, ` +
    `Las Pozas y Tamul con guía. ${desde ? `Desde ${pesos(desde)} por persona.` : `Sale cada mes del Ángel; apartas con el ${ANTICIPO_PCT} %.`}`;
  return {
    title,
    description,
    alternates: { canonical: URL_ES, ...alternates },
    // La imagen sale de `opengraph-image.tsx` (sin precios ni lugares: Facebook
    // la guarda y una cifra vieja ahí sería urgencia falsa). Por eso aquí NO va
    // `images`: en Next 14 lo de la página le gana al archivo.
    openGraph: {
      title: "Fin de semana en la Huasteca Potosina desde CDMX, todo incluido",
      description: `Salida grupal cada mes del Ángel de la Independencia · transporte, ${NOCHES_TEXTO} en Xilitla, ${DESAYUNOS} desayunos, Tamul y Las Pozas. De vuelta el lunes a las ${HORA_REGRESO}.`,
      url: URL_ES,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    // 🔴 Indexable SIEMPRE, también sin fechas (16 oct 2026). Antes salía con
    // noindex mientras no hubiera fecha publicada, y eso la escondía justo
    // mientras Google y las IA deciden qué recomendar para «huasteca potosina
    // desde cdmx». Es un producto de cada mes: sin fecha, la página explica el
    // viaje y junta la lista de espera, que también es una venta.
  };
}

function esquema(salidas: SalidaVista[], faqs: PreguntaFrecuente[], locale: Locale) {
  const en = locale === "en";
  const url = en ? URL_EN : URL_ES;
  const disponibilidad = (s: SalidaVista) =>
    s.estado === "agotado" ? "https://schema.org/SoldOut"
      : s.estado === "proxima" ? "https://schema.org/PreOrder"
        : s.estado === "ultimos" ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/InStock";
  const ofertas = salidas.map((s) => ({
    "@type": "Offer",
    name: en ? `${rangoLargoEn(s.fechaSalida, s.fechaRegreso)} · shared room` : `${rangoLargo(s.fechaSalida, s.fechaRegreso)} · cuarto compartido`,
    price: s.precioVigente,
    priceCurrency: "MXN",
    priceSpecification: { "@type": "UnitPriceSpecification", price: s.precioVigente, priceCurrency: "MXN", unitText: en ? "per person" : "por persona" },
    availability: disponibilidad(s),
    validFrom: s.abreEl,
    priceValidUntil: (s.enPreventa && s.finPreventa ? s.finPreventa : s.fechaCorte).slice(0, 10),
    url: `${url}?fecha=${s.fechaSalida}`,
    seller: ORG_REF,
  }));
  const nombre = en
    ? "Huasteca Potosina from Mexico City: monthly small-group trip to Xilitla"
    : "Viaje a la Huasteca Potosina desde CDMX: salida grupal mensual a Xilitla";
  const descripcion = en
    ? `Monthly weekend trip from the Angel of Independence (Mexico City) to Xilitla, in the Huasteca Potosina, San Luis Potosí: round-trip transport in a Nissan Urvan, ${NOCHES_TEXTO_EN} at Hotel Paraíso Encantado, ${DESAYUNOS} breakfasts at El Papán Huasteco, the Surrealist Route with Edward James's Las Pozas and the Tamul Expedition to Tamul waterfall. Guided in Spanish with basic English.`
    : `Viaje de fin de semana, cada mes, desde el Ángel de la Independencia (Ciudad de México) a Xilitla, en la Huasteca Potosina, San Luis Potosí: transporte redondo en Urvan, ${NOCHES_TEXTO} en el Hotel Paraíso Encantado, ${DESAYUNOS} desayunos en El Papán Huasteco, la Ruta Surrealista con Las Pozas de Edward James y la Expedición Tamul a la cascada de Tamul.`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        "@id": `${url}#viaje`,
        name: nombre,
        alternateName: en ? [VIAJE_NOMBRE_EN, "Huasteca Potosina tour from Mexico City"] : [VIAJE_NOMBRE, "Tour a la Huasteca Potosina desde CDMX"],
        description: descripcion,
        url,
        image: `${SITE}${HERO}`,
        inLanguage: en ? "en" : "es-MX",
        touristType: en ? ["Travelers based in Mexico City", "Groups of friends", "Solo travelers"] : ["Viajeros de la Ciudad de México", "Grupos de amigos", "Viajeros solos"],
        provider: ORG_REF,
        tripOrigin: lugarDeSalida(),
        // Los lugares, con su ficha y sus coordenadas: así el viaje queda atado
        // a las entidades que la gente busca (Las Pozas, Tamul, Xilitla).
        itinerary: {
          "@type": "ItemList",
          itemListElement: lugaresDelViaje().map((l, i) => ({ "@type": "ListItem", position: i + 1, item: l })),
        },
        ...(ofertas.length ? { offers: ofertas } : {}),
      },
      // El precio por fecha, como en las fichas de tour: `Product` aparte, con su
      // propio `@id` (compartirlo fusionaría los dos nodos). Solo con fechas.
      ...(ofertas.length
        ? [{
            "@type": "Product",
            "@id": `${url}#product`,
            name: nombre,
            description: descripcion,
            url,
            image: `${SITE}${HERO}`,
            brand: ORG_REF,
            offers: ofertas,
          }]
        : []),
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.pregunta,
          acceptedAnswer: { "@type": "Answer", text: f.respuesta },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: en ? `${SITE}/en` : SITE },
          { "@type": "ListItem", position: 2, name: en ? "Trip from Mexico City" : "Viaje desde CDMX", item: url },
        ],
      },
    ],
  };
}

const ICONO: Record<Incluido["icono"], LucideIcon> = {
  bus: Bus, cama: BedDouble, desayuno: Coffee, pozas: Landmark, tamul: Waves, escudo: ShieldCheck,
};
const ICONO_SEGURIDAD: Record<ReturnType<typeof seguridad>[number]["icono"], LucideIcon> = {
  ruta: Route, camioneta: Bus, conductor: UserRound, seguro: ShieldCheck, horario: Clock, contacto: MessageCircle,
};

/** Dónde duermes y desayunas: el hotel y su restaurante, en fotos. */
const HOTEL_FOTOS = [
  { src: "/imagenes/hotel-paraiso-encantado/gallery-4.jpg", es: "Terraza con vista a la sierra en el Hotel Paraíso Encantado", en: "Terrace with mountain views at Hotel Paraíso Encantado", grande: true },
  { src: "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-1.jpg", es: "Habitación del Hotel Paraíso Encantado", en: "A room at Hotel Paraíso Encantado" },
  { src: "/imagenes/hotel-paraiso-encantado/habitaciones/flor-de-liz-2.jpg", es: "Balcón de una habitación con vista a la selva", en: "A room balcony overlooking the jungle" },
  { src: "/imagenes/papan-huasteco/fogon-de-lena.jpg", es: "El fogón de leña de El Papán Huasteco", en: "The wood-fired stove at El Papán Huasteco" },
  { src: "/imagenes/papan-huasteco/platillos.jpg", es: "Platillos huastecos de El Papán Huasteco", en: "Huastec dishes at El Papán Huasteco" },
];

/** La galería: lo mejor de los dos recorridos, sin repetir lo que ya salió arriba. */
const GALERIA = [
  { src: "/imagenes/tours/tamul/grupo-frente-a-tamul.jpg", es: "Un grupo de viajeros frente a la cascada de Tamul", en: "A group of travelers in front of Tamul waterfall" },
  { src: "/imagenes/tours/tamul/canoas-guerra-de-agua.jpg", es: "Guerra de agua entre canoas en el río Tampaón", en: "A water fight between canoes on the Tampaón River" },
  { src: "/imagenes/tours/edward-james/las-pozas-poza-bajo-la-cascada.jpg", es: "Poza bajo una cascada entre las esculturas de Las Pozas", en: "A pool under a waterfall among the sculptures of Las Pozas" },
  { src: "/imagenes/tours/tamul/cueva-del-agua-poza-azul.jpg", es: "La poza azul de la Cueva del Agua", en: "The blue pool of the Cueva del Agua" },
  { src: "/imagenes/tours/edward-james/las-pozas-manos-gigantes.jpg", es: "Las manos gigantes de concreto en Las Pozas", en: "The giant concrete hands at Las Pozas" },
  { src: "/imagenes/tours/tamul/viajera-frente-a-tamul.jpg", es: "Viajera con chaleco frente a la cascada de Tamul", en: "A traveler in a life jacket in front of Tamul waterfall" },
  { src: "/imagenes/tours/edward-james/nacimiento-huichihuayan-agua-cristalina.jpg", es: "Nadando en el agua cristalina del Nacimiento de Huichihuayán", en: "Swimming in the clear water of the Huichihuayán spring" },
  { src: "/imagenes/castillo-de-la-salud/hero.jpg", es: "Pareja entre los muros de colores del Castillo de la Salud", en: "A couple among the colorful walls of the Castillo de la Salud" },
  { src: "/imagenes/tours/tamul/asomado-al-sotano-huahuas.jpg", es: "Viajero asomado al Sótano de las Huahuas", en: "A traveler looking into the Sótano de las Huahuas" },
  { src: "/imagenes/tours/edward-james/las-pozas-esculturas-azules.jpg", es: "Esculturas de columnas azules en Las Pozas", en: "Blue-column sculptures at Las Pozas" },
];

/** Los textos de la página que no son del viaje en sí (títulos, etiquetas, botones). */
const P = {
  es: {
    eyebrow: "Salida grupal cada mes · a Xilitla, SLP",
    h1: <>La Huasteca Potosina desde CDMX, <em className="text-dorado">todo incluido</em></>,
    intro: `Sales ${SALIDA_TEXTO} del Ángel de la Independencia y despiertas en Xilitla. ${NOCHES_TEXTO} en el Hotel Paraíso Encantado, ${DESAYUNOS} desayunos en El Papán Huasteco, la Ruta Surrealista con Las Pozas de Edward James y la Expedición Tamul. Regresas ${REGRESO_TEXTO}.`,
    proxima: "Próxima salida",
    quedan: (n: number, c: number) => <>Quedan <strong className="text-crema">{n}</strong> de {c} lugares</>,
    porPersona: "por persona en cuarto compartido",
    preventa: (fin: string, despues: number) => `Precio de preventa hasta el ${diaMX(fin)}; después, ${pesos(despues)}.`,
    sinFechas: "Las próximas fechas abren muy pronto. Anótate y te avisamos con el precio de preventa.",
    apartar: "Apartar mi lugar", avisame: "Avísame de las fechas", preguntar: "Preguntar por WhatsApp",
    anticipo: `Apartas con el ${ANTICIPO_PCT} % · el resto, ${CORTE_DIAS_ANTES} días antes de salir`,
    resenasLink: `${GOOGLE_RATING} · ${GOOGLE_RESENAS} reseñas en Google`,
    resenasEyebrow: "Lo que dicen en Google",
    resenasTitulo: <>{GOOGLE_RATING} estrellas · <em className="text-dorado">{GOOGLE_RESENAS} reseñas</em></>,
    resenasNota: "Reseñas reales de nuestros recorridos, copiadas tal cual del perfil de Google de la operadora. Este viaje es nuevo: sus primeras reseñas llegan con la primera salida.",
    resenasTodas: "Leer todas en Google",
    incluidoEyebrow: "Un solo precio", incluidoTitulo: <>Todo esto ya está <em className="text-dorado">incluido</em></>, incluidoSub: "Tú solo llegas al Ángel con tu maleta. Del resto nos encargamos.",
    badgeIncluido: "Incluido", listaCompleta: "La lista completa", aparte: "Lo único que pagas aparte",
    cuartosEyebrow: "Dónde duermes", cuartosTitulo: <>Tú eliges <em className="text-dorado">el cuarto</em></>,
    cuartosSub: `${NOCHES_TEXTO} en el ${HOTEL_PROPIO.nombre}, ${NOCHES_CUALES}. El precio es por persona.`,
    cuartosNota: "Los cuartos se asignan al confirmar la salida. Si vienen juntos, duermen juntos.",
    porPersonaCorto: "por persona",
    masSuplemento: `+$${SUPLEMENTO_PRIVADO} por persona sobre el precio de la fecha`,
    itinerarioEyebrow: "Día por día", itinerarioTitulo: <>Tus {DIAS} días en <em className="text-dorado">Xilitla</em></>,
    itinerarioSub: `Sales el viernes a la medianoche y llegas el sábado a las ${HORA_LLEGADA}. Regresas ${REGRESO_TEXTO}.`,
    dia: "Día", incluido: "incluido", horasAprox: "Las horas son aproximadas: el camino y el clima mandan.",
    nocheEyebrow: "El viaje de noche", nocheTitulo: <>Siete horas de carretera, <em className="text-dorado">sin sorpresas</em></>,
    nocheSub: "Lo que necesitas saber antes de subirte a la camioneta.",
    hotelEyebrow: "Dónde duermes y desayunas", hotelTitulo: <>Hotel Paraíso Encantado y <em className="text-dorado">El Papán Huasteco</em></>,
    hotelLista: [
      `${NOCHES_TEXTO} en el hotel, ${NOCHES_CUALES}.`,
      `A ${HOTEL_PROPIO.minutosCaminando} minutos caminando de Las Pozas, en ${HOTEL_PROPIO.zona}.`,
      `Los ${DESAYUNOS} desayunos en ${HOTEL_PROPIO.restaurante}, el restaurante del hotel, con cocina de fogón.`,
      "El hotel es nuestro.",
    ],
    salidaEyebrow: "Punto de salida", salidaTitulo: `Salimos ${SALIDA_TEXTO} del ${PUNTO_SALIDA.nombre}`,
    salidaLista: [
      PUNTO_SALIDA.direccion,
      `Metro ${PUNTO_SALIDA.metro}. Ojo: el metro cierra a la medianoche.`,
      `Llega a las ${HORA_CITA}: la camioneta sale puntual a la medianoche (${HORA_SALIDA}).`,
      `Unas ${tiempoDesde("cdmx")?.autoXilitla ?? "7 h"} de camino, de noche: duermes y llegas a desayunar.`,
      `El domingo a las ${HORA_SALIDA_REGRESO} salimos de vuelta y el lunes alrededor de las ${HORA_REGRESO} te dejamos en el mismo punto.`,
    ],
    abrirMapa: "Abrir en Google Maps",
    cdmxEyebrow: "Huasteca Potosina desde la CDMX", cdmxTitulo: <>¿Por tu cuenta o <em className="text-dorado">con el viaje</em>?</>,
    enDatos: "El viaje en datos", porTuCuenta: "Por tu cuenta", conElViaje: "Con el viaje", concepto: "Concepto",
    caption: "Ir a la Huasteca Potosina desde la CDMX por tu cuenta o con el viaje",
    suman: (a: number, b: number) => <>Solo el autobús redondo y los dos recorridos ya suman <strong className="text-crema">{pesos(a)}–{pesos(b)}</strong> por persona, antes de hotel, desayunos y traslados.</>,
    viajeCuesta: (d: number) => <>El viaje cuesta <strong className="text-dorado">desde {pesos(d)}</strong> con todo eso incluido.</>,
    viajeIncluye: "El viaje lo incluye todo en un solo precio.",
    notaPrecios: "Autobús: tarifa aproximada por trayecto. Recorridos: precio de lista para 1 o 2 personas.",
    linkLlegar: "Todas las formas de llegar desde la CDMX", linkBase: "¿Xilitla o Ciudad Valles?",
    preguntanCdmx: "Lo que más nos preguntan desde la CDMX",
    politicasEyebrow: "Reglas claras", politicasTitulo: <>Pagos, cambios y <em className="text-dorado">cancelaciones</em></>,
    politicasNota: "¿Algo que no esté aquí? Escríbenos por WhatsApp antes de apartar.",
    galeriaEyebrow: "Así se ve", galeriaTitulo: <>Lo que vas a <em className="text-dorado">vivir</em></>,
    yaViajaron: (n: number) => `· ${n} viajeros ya hicieron este viaje`,
    queLlevar: "Qué llevar", faq: "Preguntas frecuentes",
    cierre: "¿Te vienes?",
    cierreTexto: `Transporte, hotel, desayunos y dos recorridos con guía, en un solo precio. Apartas con el ${ANTICIPO_PCT} %; si la salida no junta el grupo a ${CORTE_DIAS_ANTES} días de salir, eliges otra fecha o te devolvemos todo.`,
    cierreBoton: (r: string | null) => (r ? `Apartar · ${r}` : "Avísame de las fechas"),
    proximaSalida: (ymd: string) => `Próxima salida: ${fechaLarga(ymd)} a la medianoche`,
    heroAlt: "La cascada de Tamul cae 105 metros al río turquesa, con un arcoíris en la brisa",
    gruposAlt: "Selfie de un grupo de amigos frente a la cascada de Tamul",
  },
  en: {
    eyebrow: "Monthly small-group trip · to Xilitla, SLP",
    h1: <>The Huasteca Potosina from Mexico City, <em className="text-dorado">all included</em></>,
    intro: `Leave the Angel of Independence on Friday at midnight and wake up in Xilitla. ${NOCHES_TEXTO_EN} at Hotel Paraíso Encantado, ${DESAYUNOS} breakfasts at El Papán Huasteco, the Surrealist Route with Edward James's Las Pozas and the Tamul Expedition. You come back ${REGRESO_TEXTO_EN}.`,
    proxima: "Next departure",
    quedan: (n: number, c: number) => <><strong className="text-crema">{n}</strong> of {c} spots left</>,
    porPersona: "per person, shared room",
    preventa: (fin: string, despues: number) => `Early-bird price until ${diaMXEn(fin)}; then ${pesosEn(despues)}.`,
    sinFechas: "New dates open very soon. Leave your email and we'll send you the early-bird price.",
    apartar: "Book my spot", avisame: "Notify me of dates", preguntar: "Ask on WhatsApp",
    anticipo: `Book with ${ANTICIPO_PCT}% · the rest ${CORTE_DIAS_ANTES} days before · charged in Mexican pesos`,
    resenasLink: `${GOOGLE_RATING} · ${GOOGLE_RESENAS} Google reviews`,
    resenasEyebrow: "What people say on Google",
    resenasTitulo: <>{GOOGLE_RATING} stars · <em className="text-dorado">{GOOGLE_RESENAS} reviews</em></>,
    resenasNota: "Real reviews of our tours, copied word for word (in Spanish) from the operator's Google profile. This trip is new: its first reviews come with the first departure.",
    resenasTodas: "Read them all on Google",
    incluidoEyebrow: "One price", incluidoTitulo: <>All of this is <em className="text-dorado">included</em></>, incluidoSub: "Just show up at the Angel with your bag. We handle the rest.",
    badgeIncluido: "Included", listaCompleta: "The full list", aparte: "The only things you pay for",
    cuartosEyebrow: "Where you sleep", cuartosTitulo: <>Pick <em className="text-dorado">your room</em></>,
    cuartosSub: `${NOCHES_TEXTO_EN} at ${HOTEL_PROPIO.nombre}, on Saturday. Prices are per person.`,
    cuartosNota: "Rooms are assigned when the departure is confirmed. If you come together, you sleep together.",
    porPersonaCorto: "per person",
    masSuplemento: `+MX$${SUPLEMENTO_PRIVADO} per person over the date's price`,
    itinerarioEyebrow: "Day by day", itinerarioTitulo: <>Your {DIAS} days in <em className="text-dorado">Xilitla</em></>,
    itinerarioSub: `You leave Friday at midnight and arrive Saturday at ${HORA_LLEGADA}. You come back ${REGRESO_TEXTO_EN}.`,
    dia: "Day", incluido: "included", horasAprox: "Times are approximate: the road and the weather decide.",
    nocheEyebrow: "The overnight drive", nocheTitulo: <>Seven hours on the road, <em className="text-dorado">explained</em></>,
    nocheSub: "What you need to know before you get in the van.",
    hotelEyebrow: "Where you sleep and eat breakfast", hotelTitulo: <>Hotel Paraíso Encantado and <em className="text-dorado">El Papán Huasteco</em></>,
    hotelLista: [
      `${NOCHES_TEXTO_EN} at the hotel, on Saturday.`,
      `A ${HOTEL_PROPIO.minutosCaminando}-minute walk from Las Pozas, in ${HOTEL_PROPIO.zona}.`,
      `${DESAYUNOS} breakfasts at ${HOTEL_PROPIO.restaurante}, the hotel's restaurant, cooked over a wood fire.`,
      "The hotel is ours.",
    ],
    salidaEyebrow: "Meeting point", salidaTitulo: "We leave Friday at midnight from the Angel of Independence",
    salidaLista: [
      "Glorieta del Ángel, Paseo de la Reforma: a short walk from Juárez, Roma and Condesa.",
      "Metro Insurgentes or Sevilla (Line 1), about 10 minutes on foot. The metro closes at midnight.",
      `Be there at ${HORA_CITA}: the van leaves on time at midnight (${HORA_SALIDA}).`,
      `About ${tiempoDesde("cdmx")?.autoXilitlaEn ?? "7 h"} on the road, overnight: you sleep and arrive for breakfast.`,
      `On Sunday at ${HORA_SALIDA_REGRESO} we head back, and on Monday around ${HORA_REGRESO} we drop you at the same spot.`,
    ],
    abrirMapa: "Open in Google Maps",
    cdmxEyebrow: "Huasteca Potosina from Mexico City", cdmxTitulo: <>On your own or <em className="text-dorado">with us</em>?</>,
    enDatos: "The trip at a glance", porTuCuenta: "On your own", conElViaje: "With the trip", concepto: "Item",
    caption: "Visiting the Huasteca Potosina from Mexico City on your own or with the trip",
    suman: (a: number, b: number) => <>The round-trip bus and the two tours alone add up to <strong className="text-crema">{pesosEn(a)}–{pesosEn(b)}</strong> per person, before hotel, breakfasts and local transport.</>,
    viajeCuesta: (d: number) => <>The trip costs <strong className="text-dorado">from {pesosEn(d)}</strong> with all of that included.</>,
    viajeIncluye: "The trip includes all of it in one price.",
    notaPrecios: "Bus: approximate one-way fare. Tours: list price for 1 or 2 people.",
    linkLlegar: "", linkBase: "",
    preguntanCdmx: "What people in Mexico City ask us",
    politicasEyebrow: "Clear rules", politicasTitulo: <>Payments, changes and <em className="text-dorado">cancellations</em></>,
    politicasNota: "Anything missing? Message us on WhatsApp before booking.",
    galeriaEyebrow: "What it looks like", galeriaTitulo: <>What you'll <em className="text-dorado">live</em></>,
    yaViajaron: (n: number) => `· ${n} travelers have done this trip`,
    queLlevar: "What to bring", faq: "Frequently asked questions",
    cierre: "Coming?",
    cierreTexto: `Transport, hotel, breakfasts and two guided tours in one price. Book with ${ANTICIPO_PCT}%; if the departure doesn't fill ${CORTE_DIAS_ANTES} days before, you pick another date or get everything back.`,
    cierreBoton: (r: string | null) => (r ? `Book · ${r}` : "Notify me of dates"),
    proximaSalida: (ymd: string) => `Next departure: ${fechaLargaEn(ymd)} at midnight`,
    heroAlt: "Tamul waterfall falls 105 meters into a turquoise river, with a rainbow in the mist",
    gruposAlt: "A group of friends taking a selfie in front of Tamul waterfall",
  },
};

const etiquetaSeccion = "text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm";

export default async function Page({ searchParams }: { searchParams: { lider?: string; fecha?: string } }) {
  const locale = idioma();
  const en = locale === "en";
  const t = P[locale];
  const $ = en ? pesosEn : pesos;
  const { salidas, estaSemana, yaViajaron, usd } = await cargar(locale);
  const aLaVenta = vendibles(salidas);
  const proxima = aLaVenta[0] ?? null;
  const desde = aLaVenta.length ? Math.min(...aLaVenta.map((s) => s.precioVigente)) : null;
  const preventaProxima = proxima?.enPreventa && proxima.finPreventa ? proxima : null;
  const lider = typeof searchParams.lider === "string" && /^[A-Za-z0-9]{3,20}$/.test(searchParams.lider) ? searchParams.lider.toUpperCase() : null;
  const fecha = typeof searchParams.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha) ? searchParams.fecha : null;

  const faqs = preguntasFrecuentes(locale);
  const faqsCdmx = en ? preguntasCdmxEn(salidas, usd) : preguntasCdmx(salidas);
  const ficha = en ? fichaViajeEn(salidas, usd) : fichaViaje(salidas);
  const comparacion = en ? porTuCuentaEn() : porTuCuenta();
  const [cuentaMin, cuentaMax] = costoPorTuCuenta();
  const itinerario = en ? ITINERARIO_EN : ITINERARIO;
  const incluido = en ? INCLUIDO_EN : INCLUIDO;
  const incluye = en ? INCLUYE_EN : INCLUYE;
  const noIncluye = en ? NO_INCLUYE_EN : NO_INCLUYE;
  const queLlevar = en ? QUE_LLEVAR_EN : QUE_LLEVAR;
  const reglas = politicas(locale);
  const noche = seguridad(locale);
  const rango = (s: SalidaVista) => (en ? rangoLargoEn(s.fechaSalida, s.fechaRegreso) : rangoLargo(s.fechaSalida, s.fechaRegreso));
  const waTexto = (f?: string) => (en ? mensajeWhatsAppEn(f) : mensajeWhatsApp(f));
  const usdDe = (n: number) => (usd ? <span className="text-xs text-crema/55"> ≈ {enDolares(n, usd)}</span> : null);
  const precioBase = desde ?? proxima?.precioVigente ?? null;

  return (
    <main id="main-content" lang={en ? "en" : "es"} className="min-h-screen bg-negro pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd(locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema(salidas, [...faqsCdmx, ...faqs], locale)) }} />

      {/* ── HERO ── La foto arriba y el texto debajo en el celular: sobre la foto, el precio se perdía. */}
      <section data-hero-viaje className="relative lg:min-h-[640px] lg:flex lg:items-end">
        <div className="relative h-[44vh] min-h-[280px] lg:absolute lg:inset-0 lg:h-auto">
          <Image src={HERO} alt={t.heroAlt} fill priority sizes="100vw" className="object-cover object-[28%_50%] lg:object-[20%_50%]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,23,16,0.15)_0%,rgba(14,23,16,0)_70%,#0e1710_100%)] lg:bg-[linear-gradient(270deg,#0e1710_0%,rgba(14,23,16,0.86)_42%,rgba(14,23,16,0.05)_100%)]" />
        </div>
        <div className="relative px-4 sm:px-6 pt-2 pb-12 lg:pt-36 lg:pb-20 w-full max-w-6xl mx-auto">
          <div className="max-w-xl lg:ml-auto">
            <p className={etiquetaSeccion}>{t.eyebrow}</p>
            <h1 className="font-cormorant font-light text-crema leading-[1.05] mb-4" style={{ fontSize: "clamp(38px,7vw,68px)" }}>{t.h1}</h1>
            <p className="text-crema/80 font-dm text-[15px] leading-relaxed mb-5">{t.intro}</p>

            {proxima ? (
              <div className="border border-white/15 bg-negro/60 backdrop-blur-sm p-4 mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-dm text-crema/60 text-xs uppercase tracking-[1.5px]">{t.proxima}</p>
                  <p className="font-dm text-crema/60 text-xs">{t.quedan(proxima.disponibles, proxima.capacidad)}</p>
                </div>
                <p className="font-cormorant text-crema text-2xl mt-1">{rango(proxima)}</p>
                <p className="font-dm text-crema mt-1">
                  {/* El precio de ESTA fecha, no el «desde» de todas: con otra fecha en preventa, el «desde» le ponía a la próxima un precio que no es el suyo. */}
                  <span className="font-cormorant text-dorado text-3xl">{$(proxima.precioVigente)}</span> <span className="text-xs text-crema/55">{t.porPersona}</span>
                  {usdDe(proxima.precioVigente)}
                </p>
                {preventaProxima && <p className="text-xs font-dm text-dorado/90 mt-1">{t.preventa(preventaProxima.finPreventa!, preventaProxima.precio)}</p>}
              </div>
            ) : (
              <p className="font-dm text-crema/70 text-sm mb-6 border-l-2 border-dorado pl-3">{t.sinFechas}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#fechas" data-cta-viaje className="inline-flex items-center justify-center min-h-[52px] px-8 bg-dorado text-negro hover:bg-crema text-[12px] tracking-[2px] uppercase font-dm transition-colors">
                {proxima ? t.apartar : t.avisame}
              </a>
              <BotonWhatsApp
                href={waLink(waTexto(proxima ? rango(proxima) : undefined))}
                boton="hero"
                className="inline-flex items-center justify-center min-h-[52px] px-8 border border-white/25 text-crema hover:bg-white/10 text-[12px] tracking-[2px] uppercase font-dm transition-colors"
              >
                {t.preguntar}
              </BotonWhatsApp>
            </div>

            {/* Las reseñas, a la vista junto al botón (Manolo, 16 oct: «solo un número en letra gris chiquita»). */}
            <a href="#resenas" className="mt-5 flex items-center gap-3 group">
              <span className="flex -space-x-2.5" aria-hidden="true">
                {RESENAS_REALES.slice(0, 4).map((r) => (
                  <AvatarResena key={r.autor} autor={r.autor} foto={r.foto} className="h-9 w-9 ring-2 ring-negro" />
                ))}
              </span>
              <span className="font-dm">
                <span className="flex items-center gap-1 text-dorado" aria-label={en ? `${GOOGLE_RATING} out of 5 stars` : `${GOOGLE_RATING} de 5 estrellas`}>
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-4 h-4 fill-dorado" aria-hidden="true" />)}
                </span>
                <span className="block text-sm text-crema/85 group-hover:text-crema underline-offset-4 group-hover:underline">{t.resenasLink}</span>
              </span>
            </a>
            <p className="mt-3 text-[11px] font-dm text-crema/50">{t.anticipo}</p>
          </div>
        </div>
      </section>

      {/* ── RESEÑAS DE GOOGLE ── reales y con su foto de perfil (`resenasReales.ts`), justo después del primer botón. */}
      {RESENAS_REALES.length > 0 && (
        <section id="resenas" className="border-y border-white/5 bg-verde-profundo/20 py-12 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className={etiquetaSeccion}>{t.resenasEyebrow}</p>
                <h2 className="font-cormorant font-light text-crema text-3xl sm:text-4xl">{t.resenasTitulo}</h2>
              </div>
              <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-dm text-dorado underline underline-offset-4 hover:text-crema">{t.resenasTodas}</a>
            </div>
            {/* En el celular, una fila que se desliza; en escritorio, tres columnas. */}
            <ul className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
              {RESENAS_REALES.slice(0, 6).map((r) => (
                <li key={`${r.autor}-${r.fecha}`} className="snap-start shrink-0 w-[82%] sm:w-[60%] md:w-auto flex flex-col border border-white/10 bg-negro/50 p-5">
                  <p className="text-dorado text-sm mb-2" aria-label={en ? `${r.estrellas} out of 5 stars` : `${r.estrellas} de 5 estrellas`}>{"★".repeat(Math.max(1, Math.min(5, r.estrellas)))}</p>
                  <blockquote className="text-sm font-dm text-crema/80 leading-relaxed mb-4">“{r.texto}”</blockquote>
                  <div className="mt-auto flex items-center gap-3">
                    <AvatarResena autor={r.autor} foto={r.foto} />
                    <div>
                      <p className="text-sm font-dm text-crema">{r.autor}</p>
                      <p className="text-[11px] font-dm text-crema/45">Google · {r.fecha}{r.recorrido ? ` · ${r.recorrido}` : ""}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] font-dm text-crema/45 max-w-3xl">{t.resenasNota}</p>
          </div>
        </section>
      )}

      {/* ── TODO LO INCLUIDO ── Lo primero después de las reseñas: lo que vende es saber qué te llevas por el precio. */}
      <section id="incluye" className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-14 scroll-mt-20">
        <div className="text-center mb-8">
          <p className={etiquetaSeccion}>{t.incluidoEyebrow}</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>{t.incluidoTitulo}</h2>
          <p className="text-sm text-crema/60 font-dm mt-2">{t.incluidoSub}</p>
        </div>
        {/* Dos columnas también en el celular: seis tarjetas a lo ancho eran casi tres pantallas antes de llegar a las fechas. */}
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {incluido.map((x) => {
            const Icono = ICONO[x.icono];
            return (
              <li key={x.titulo} className="relative overflow-hidden border border-white/10 bg-negro/40 group">
                <div className="relative aspect-[4/3] sm:aspect-[16/10]">
                  <Image src={x.foto} alt={x.alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 50vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/85 via-negro/10 to-transparent" />
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 inline-flex items-center gap-1 bg-verde-vivo text-negro text-[9px] sm:text-[10px] tracking-[1.5px] sm:tracking-[2px] uppercase font-dm px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> {t.badgeIncluido}
                  </span>
                </div>
                <div className="p-3 sm:p-5">
                  <p className="font-cormorant text-crema text-lg sm:text-2xl leading-tight mb-1 sm:mb-1.5 flex items-start gap-1.5 sm:gap-2">
                    <Icono className="w-4 h-4 sm:w-5 sm:h-5 text-dorado shrink-0 mt-0.5 sm:mt-1" aria-hidden="true" /> {x.titulo}
                  </p>
                  <p className="text-xs sm:text-sm font-dm text-crema/65 leading-relaxed">{x.detalle}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 grid md:grid-cols-3 gap-6 border border-white/10 bg-verde-profundo/25 p-5 sm:p-7">
          <div className="md:col-span-2">
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4 font-dm">{t.listaCompleta}</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {incluye.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm text-crema/80 font-dm leading-relaxed">
                  <Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />{x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-4 font-dm">{t.aparte}</p>
            <ul className="space-y-2.5">
              {noIncluye.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[13px] text-crema/55 font-dm leading-relaxed">
                  <X className="w-3.5 h-3.5 text-crema/35 shrink-0 mt-1" aria-hidden="true" />{x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CALENDARIO Y APARTADO ── */}
      <ReservaViaje salidasIniciales={salidas} estaSemana={estaSemana} liderInicial={lider} fechaInicial={fecha} locale={locale} usd={usd} />

      {/* ── LOS CUARTOS ── (Manolo, 16 oct): compartido al precio de la fecha o privado con cama king. */}
      <section id="cuartos" className="border-y border-white/5 bg-verde-profundo/20 py-16 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className={etiquetaSeccion}>{t.cuartosEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.cuartosTitulo}</h2>
            <p className="text-sm text-crema/60 font-dm mt-2">{t.cuartosSub}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {([
              // Fotos reales de los cuartos: Bromelias 1 tiene dos camas; Orquídeas 2, una cama grande.
              { c: "compartido" as const, foto: "/imagenes/hotel-paraiso-encantado/habitaciones/bromelias-1.jpg", alt: en ? "A room with two beds at Hotel Paraíso Encantado" : "Cuarto de dos camas del Hotel Paraíso Encantado" },
              { c: "privado" as const, foto: "/imagenes/hotel-paraiso-encantado/habitaciones/orquideas-2.jpg", alt: en ? "A room with one large bed at Hotel Paraíso Encantado" : "Cuarto con una cama grande del Hotel Paraíso Encantado" },
            ]).map(({ c, foto, alt }) => {
              const precio = precioBase != null ? precioBase + (c === "privado" ? SUPLEMENTO_PRIVADO : 0) : null;
              return (
                <article key={c} className="border border-white/10 bg-negro/50 overflow-hidden flex flex-col">
                  <div className="relative aspect-[16/9]">
                    <Image src={foto} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 512px" loading="lazy" />
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col gap-2 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-cormorant text-crema text-2xl leading-tight">{CUARTOS[c][locale].titulo}</h3>
                      {precio != null ? (
                        <p className="font-dm text-right shrink-0">
                          <span className="font-cormorant text-dorado text-3xl">{$(precio)}</span>
                          <span className="block text-[11px] text-crema/50">{t.porPersonaCorto}{usd ? ` · ≈ ${enDolares(precio, usd)}` : ""}</span>
                        </p>
                      ) : c === "privado" ? (
                        <p className="font-dm text-xs text-crema/60 text-right">{t.masSuplemento}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-dm text-crema/70 leading-relaxed">{CUARTOS[c][locale].detalle}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs font-dm text-crema/50 text-center">{t.cuartosNota}</p>
        </div>
      </section>

      {/* ── ITINERARIO ── */}
      <section id="itinerario" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <p className={etiquetaSeccion}>{t.itinerarioEyebrow}</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.itinerarioTitulo}</h2>
          <p className="text-sm text-crema/60 font-dm mt-2">{t.itinerarioSub}</p>
        </div>
        <ol className="space-y-6">
          {itinerario.map((d) => (
            <li key={d.dia} className="border border-white/10 bg-negro/40 overflow-hidden">
              <div className="relative aspect-[16/9] sm:aspect-[21/9]">
                <Image src={d.foto} alt={d.alt} fill className="object-cover" sizes="(max-width: 896px) 100vw, 896px" />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="inline-block bg-dorado text-negro text-[10px] tracking-[2px] uppercase font-dm px-2.5 py-1 mb-2">{t.dia} {d.dia} · {d.diaSemana}</span>
                  <h3 className="font-cormorant text-crema text-3xl leading-tight">{d.titulo}</h3>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <ul className="space-y-2.5">
                  {d.momentos.map((mo, i) => (
                    <li key={i} className="flex gap-3 text-sm font-dm leading-relaxed">
                      <span className="w-[88px] shrink-0 text-dorado/90 tabular-nums whitespace-nowrap">{mo.hora ?? ""}</span>
                      <span className={mo.incluido ? "text-crema/85" : "text-crema/55"}>
                        {mo.texto}
                        {mo.incluido && (
                          <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px] tracking-[1.5px] uppercase text-verde-vivo">
                            <Check className="w-3 h-3" aria-hidden="true" />{t.incluido}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  {d.fotos.map((f) => (
                    <div key={f.src} className="relative aspect-square overflow-hidden">
                      <Image src={f.src} alt={f.alt} fill className="object-cover" sizes="(max-width: 640px) 33vw, 290px" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs font-dm text-crema/40 mt-4 text-center">{t.horasAprox}</p>
      </section>

      {/* ── EL VIAJE DE NOCHE ── (Manolo, 16 oct): ruta, camioneta, conductor, seguro y horarios. Solo lo que él confirmó. */}
      <section id="seguridad" className="border-y border-white/5 bg-verde-profundo/25 py-16 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className={etiquetaSeccion}>{t.nocheEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.nocheTitulo}</h2>
            <p className="text-sm text-crema/60 font-dm mt-2">{t.nocheSub}</p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {noche.map((x) => {
              const Icono = ICONO_SEGURIDAD[x.icono];
              return (
                <li key={x.titulo} className="bg-negro p-5 sm:p-6">
                  <Icono className="w-6 h-6 text-dorado mb-3" aria-hidden="true" />
                  <h3 className="font-cormorant text-crema text-2xl leading-tight mb-1.5">{x.titulo}</h3>
                  <p className="text-sm font-dm text-crema/70 leading-relaxed">{x.texto}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── DÓNDE DUERMES Y DESAYUNAS ── */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-8 items-center">
          <div>
            <p className={etiquetaSeccion}>{t.hotelEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema text-4xl leading-tight mb-4">{t.hotelTitulo}</h2>
            <ul className="space-y-3 text-sm font-dm text-crema/75">
              {t.hotelLista.map((x) => (
                <li key={x} className="flex gap-2.5"><Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {HOTEL_FOTOS.map((f) => (
              <div key={f.src} className={`relative overflow-hidden ${f.grande ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                <Image src={f.src} alt={f[locale]} fill className="object-cover" sizes={f.grande ? "(max-width: 1024px) 100vw, 640px" : "(max-width: 1024px) 50vw, 320px"} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PUNTO DE SALIDA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-white/5">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className={etiquetaSeccion}>{t.salidaEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.salidaTitulo}</h2>
            <ul className="space-y-3 text-sm font-dm text-crema/75">
              {t.salidaLista.map((x, i) => {
                const Icono = [MapPin, MapPin, Clock, Bus, MapPin][i] ?? MapPin;
                return <li key={x} className="flex gap-3"><Icono className="w-4 h-4 text-dorado shrink-0 mt-0.5" aria-hidden="true" />{x}</li>;
              })}
            </ul>
            {PUNTO_SALIDA.mapa && (
              <a href={PUNTO_SALIDA.mapa} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-xs font-dm text-dorado underline underline-offset-4">{t.abrirMapa}</a>
            )}
          </div>
          {PUNTO_SALIDA.lat != null && PUNTO_SALIDA.lng != null && (
            <MapaPunto lat={PUNTO_SALIDA.lat} lng={PUNTO_SALIDA.lng} nombre={PUNTO_SALIDA.nombre} />
          )}
        </div>
      </section>

      {/* ── DESDE LA CDMX ── Para quien todavía compara (16 oct 2026): la ficha en datos, ir por tu cuenta
          contra ir en el viaje y lo que pregunta quien busca «huasteca potosina desde cdmx». Texto a la vista,
          sin acordeón: es lo que Google y los asistentes de IA citan. */}
      <section id="desde-cdmx" className="border-t border-white/5 py-16 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className={etiquetaSeccion}>{t.cdmxEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.cdmxTitulo}</h2>
          </div>

          <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-3 font-dm">{t.enDatos}</p>
          <dl className="grid sm:grid-cols-2 gap-x-8 border-y border-white/10 py-2 mb-10">
            {ficha.map((f) => (
              <div key={f.dato} className="flex gap-3 py-2.5">
                <dt className="w-[110px] shrink-0 text-[10px] tracking-[1.5px] uppercase font-dm text-crema/45 pt-0.5">{f.dato}</dt>
                <dd className="text-[13px] font-dm text-crema/80 leading-relaxed">{f.valor}</dd>
              </div>
            ))}
          </dl>

          {/* Tabla de verdad (la leen los buscadores); en el celular cada renglón se apila. */}
          <table className="w-full text-left border border-white/10">
            <caption className="sr-only">{t.caption}</caption>
            <thead className="hidden md:table-header-group bg-white/5">
              <tr>
                <th scope="col" className="p-3 w-[26%]"><span className="sr-only">{t.concepto}</span></th>
                <th scope="col" className="p-3 text-[10px] tracking-[2px] uppercase font-dm font-normal text-crema/50">{t.porTuCuenta}</th>
                <th scope="col" className="p-3 text-[10px] tracking-[2px] uppercase font-dm font-normal text-dorado">{t.conElViaje}</th>
              </tr>
            </thead>
            <tbody>
              {comparacion.map((r) => (
                <tr key={r.concepto} className="block md:table-row border-t border-white/10 first:border-t-0 md:first:border-t">
                  <th scope="row" className="block md:table-cell p-3 pb-1 md:pb-3 font-dm font-normal text-sm text-crema align-top">{r.concepto}</th>
                  <td className="block md:table-cell px-3 py-1 md:p-3 text-[13px] font-dm text-crema/60 leading-relaxed align-top">
                    <span className="md:hidden block text-[9px] tracking-[1.5px] uppercase text-crema/35">{t.porTuCuenta}</span>
                    {r.tuCuenta}
                  </td>
                  <td className="block md:table-cell px-3 pt-1 pb-3 md:p-3 text-[13px] font-dm text-crema/85 leading-relaxed align-top">
                    <span className="md:hidden block text-[9px] tracking-[1.5px] uppercase text-dorado/70">{t.conElViaje}</span>
                    <span className="inline-flex gap-2"><Check className="w-3.5 h-3.5 text-verde-vivo shrink-0 mt-1" aria-hidden="true" />{r.conViaje}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm font-dm text-crema/70 leading-relaxed">
            {t.suman(cuentaMin, cuentaMax)}{" "}
            {desde ? t.viajeCuesta(desde) : t.viajeIncluye}
          </p>
          <p className="mt-1 text-[11px] font-dm text-crema/40">{t.notaPrecios}</p>
          {!en && (
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-dm">
              <Link href="/desde/cdmx" className="text-dorado underline underline-offset-4 hover:text-crema">{t.linkLlegar}</Link>
              <Link href="/xilitla-o-ciudad-valles" className="text-dorado underline underline-offset-4 hover:text-crema">{t.linkBase}</Link>
            </p>
          )}

          <h3 className="font-cormorant font-light text-crema text-3xl mt-14 mb-6">{t.preguntanCdmx}</h3>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-7">
            {faqsCdmx.map((f) => (
              <div key={f.pregunta}>
                <h4 className="font-dm text-crema text-[15px] mb-1.5">{f.pregunta}</h4>
                <p className="text-sm font-dm text-crema/65 leading-relaxed">{f.respuesta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POLÍTICAS ── a la vista (Manolo, 16 oct): cuándo se liquida, qué pasa si cancelas y si puedes ceder tu lugar. */}
      <section id="politicas" className="border-y border-white/5 bg-verde-profundo/20 py-16 px-4 sm:px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className={etiquetaSeccion}>{t.politicasEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.politicasTitulo}</h2>
          </div>
          <ol className="grid md:grid-cols-2 gap-4">
            {reglas.map((r, i) => (
              <li key={r.titulo} className="border border-white/10 bg-negro/50 p-5 flex gap-4">
                <span className="font-cormorant text-dorado text-3xl leading-none tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-dm text-crema text-[15px] mb-1">{r.titulo}</h3>
                  <p className="text-sm font-dm text-crema/65 leading-relaxed">{r.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs font-dm text-crema/50 text-center">{t.politicasNota}</p>
        </div>
      </section>

      {/* ── GALERÍA ── Solo fotos reales de nuestros recorridos y, cuando existan, reseñas de este viaje. */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className={etiquetaSeccion}>{t.galeriaEyebrow}</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>{t.galeriaTitulo}</h2>
            {yaViajaron > 0 && <p className="text-sm font-dm text-crema/60 mt-2">{t.yaViajaron(yaViajaron)}</p>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {GALERIA.map((g, i) => (
              <div key={g.src} className={`relative overflow-hidden ${i === 0 ? "col-span-2 md:col-span-1 aspect-[16/10] md:aspect-square" : "aspect-square"}`}>
                <Image src={g.src} alt={g[locale]} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" loading="lazy" />
              </div>
            ))}
          </div>
          {RESENAS_VIAJE.length > 0 && (
            <ul className="grid md:grid-cols-3 gap-4 mt-10">
              {RESENAS_VIAJE.map((r) => (
                <li key={`${r.autor}-${r.fecha}`} className="border border-white/10 bg-negro/40 p-5">
                  <p className="text-dorado text-sm mb-2" aria-label={`${r.estrellas} / 5`}>{"★".repeat(Math.max(1, Math.min(5, r.estrellas)))}</p>
                  <p className="text-sm font-dm text-crema/80 leading-relaxed mb-3">“{r.texto}”</p>
                  <p className="text-xs font-dm text-crema/50">{r.autor} · {r.fecha}{r.salida ? ` · ${r.salida}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── ARMA TU GRUPO ── Solo en español: el programa de líder y sus correos viven en español. */}
      {!en && (
        <section id="grupo" className="relative bg-verde-profundo/30 border-y border-white/5 py-16 px-4 sm:px-6 scroll-mt-20 overflow-hidden">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden mb-6">
                <Image src="/imagenes/tours/tamul/grupo-selfie-frente-a-tamul.jpg" alt={t.gruposAlt} fill className="object-cover object-[50%_35%]" sizes="(max-width: 768px) 100vw, 448px" loading="lazy" />
              </div>
              <p className="text-[10px] tracking-[4px] uppercase text-dorado mb-3 font-dm">Para quien organiza</p>
              <h2 className="font-cormorant font-light text-crema text-4xl leading-tight mb-4">
                Arma tu grupo y <em className="text-dorado">viaja gratis</em>
              </h2>
              <p className="text-sm font-dm text-crema/70 leading-relaxed mb-4">
                Junta a tu gente —amigos, familia, compañeros de trabajo— y cuando {LIDER_PERSONAS} personas aparten su lugar con tu liga, tu lugar
                corre por nuestra cuenta.
              </p>
              <ol className="space-y-2 text-sm font-dm text-crema/70">
                <li><span className="text-dorado mr-2">1.</span>Déjanos tus datos y te mandamos tu liga personal.</li>
                <li><span className="text-dorado mr-2">2.</span>Compártela: cada quien aparta y paga su lugar.</li>
                <li><span className="text-dorado mr-2">3.</span>Con {LIDER_PERSONAS} lugares pagados, te confirmamos tu lugar gratis.</li>
              </ol>
            </div>
            <div className="border border-white/10 bg-negro/50 p-5 sm:p-6">
              <FormLider />
            </div>
          </div>
        </section>
      )}

      {/* ── QUÉ LLEVAR + PREGUNTAS ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4 font-dm">{t.queLlevar}</p>
        <ul className="flex flex-wrap gap-2 mb-12">
          {queLlevar.map((x) => (
            <li key={x} className="text-xs font-dm text-crema/70 border border-white/15 px-3 py-1.5">{x}</li>
          ))}
        </ul>
        <h2 className="font-cormorant font-light text-crema text-3xl mb-6">{t.faq}</h2>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map((f, i) => (
            <details key={f.pregunta} className="group py-4" open={i === 0}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-dm text-crema text-[15px] min-h-[44px]">
                {f.pregunta}
                <span className="text-dorado text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="text-sm font-dm text-crema/65 leading-relaxed mt-2">{f.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CIERRE ── */}
      <section className="relative border-t border-white/5 py-20 px-4 text-center overflow-hidden">
        <Image src="/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg" alt="" fill className="object-cover opacity-30" sizes="100vw" loading="lazy" aria-hidden="true" />
        <div className="relative">
          <ShieldCheck className="w-8 h-8 text-verde-vivo mx-auto mb-4" aria-hidden="true" />
          <h2 className="font-cormorant font-light text-crema text-4xl mb-3">{t.cierre}</h2>
          <p className="text-sm font-dm text-crema/75 max-w-md mx-auto mb-6">{t.cierreTexto}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#fechas" className="inline-flex items-center justify-center min-h-[52px] px-8 bg-dorado text-negro hover:bg-crema text-[12px] tracking-[2px] uppercase font-dm transition-colors">
              {t.cierreBoton(proxima ? (en ? rangoCortoEn(proxima.fechaSalida, proxima.fechaRegreso) : rangoCorto(proxima.fechaSalida, proxima.fechaRegreso)) : null)}
            </a>
            <BotonWhatsApp
              href={waLink(waTexto())}
              boton="cierre"
              className="inline-flex items-center justify-center min-h-[52px] px-8 border border-white/25 text-crema hover:bg-white/10 text-[12px] tracking-[2px] uppercase font-dm transition-colors"
            >
              WhatsApp
            </BotonWhatsApp>
          </div>
          {proxima && <p className="text-[11px] font-dm text-crema/50 mt-4">{t.proximaSalida(proxima.fechaSalida)}</p>}
        </div>
      </section>

      <BarraViaje desde={desde} quedan={proxima?.disponibles ?? null} locale={locale} />
    </main>
  );
}
