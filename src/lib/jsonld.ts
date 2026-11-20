import { Destino } from "./destinos";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "./resenas";
import { CONTACTO } from "./contacto";
import { TOURS_DB, etiquetaUnidad, type Tour } from "./tours";
import { rangoGrupo } from "./catalogoResumen";
import { localizeTour } from "./i18n/localize";
import { localePath, localeUrl, type Locale } from "./i18n/config";
import { guiaDe } from "./destinosGuia";

const BASE_URL = "https://www.huasteca-potosina.com";

/** "$1,950": el mismo agrupado en los dos idiomas; el "MXN" lo pone quien escribe la frase. */
const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;

/**
 * Identificador único de la empresa dentro del grafo de schema.org.
 *
 * Es una URL con fragmento, no una página: nombra a la ENTIDAD "Tours Huasteca
 * Potosina", no a un documento. Sirve para que todas las páginas hablen del
 * mismo negocio en vez de declarar cada una su propia organización suelta —que
 * es lo que pasaba: la home publicaba una `TouristAgency` y /nosotros otra
 * distinta y más completa, sin nada que las relacionara. Un buscador de IA leía
 * dos operadoras con el mismo nombre.
 */
export const ORG_ID = `${BASE_URL}/#organization`;

/** Referencia a la organización desde cualquier otro schema (`provider`, `publisher`…). */
export const ORG_REF = { "@id": ORG_ID } as const;

/** Reseñas verificadas en el Perfil de Empresa de Google. */
const GOOGLE_REVIEWS_URL = "https://share.google/YS3dbxN4wrnHZ8lO9";

/**
 * La empresa, declarada UNA sola vez y en un solo sitio.
 *
 * Los datos son los que ya publicaba /nosotros (la versión rica), no los de la
 * home (la pobre). Lo que NO se declara es tan importante como lo que sí:
 * `CONTACTO.direccion` y `CONTACTO.razonSocial` están pendientes de confirmar,
 * así que no se inventa un domicilio exacto. `sameAs` solo lleva perfiles que
 * existen de verdad —antes incluía una URL de BÚSQUEDA de TripAdvisor, que no
 * es un perfil y no identifica a nadie.
 */
export function buildOrganizationNode(locale: Locale = "es", description?: string) {
  return {
    "@type": ["TouristAgency", "Organization"],
    "@id": ORG_ID,
    name: CONTACTO.nombreComercial,
    url: BASE_URL,
    inLanguage: locale === "en" ? "en" : "es-MX",
    description:
      description ??
      (locale === "en"
        ? "Certified tour operator based in Xilitla, San Luis Potosí. Guided day tours across the Huasteca Potosina with NOM-09 certified guides and transport included."
        : "Operadora de tours certificada con base en Xilitla, San Luis Potosí. Tours guiados de un día por la Huasteca Potosina con guías certificados NOM-09 y transporte incluidos."),
    logo: { "@type": "ImageObject", url: `${BASE_URL}/logos/huasteca-potosina-tours-color.png`, width: 1296, height: 985 },
    image: `${BASE_URL}/og-image.jpg`,
    telephone: CONTACTO.telefonoE164,
    email: CONTACTO.email,
    foundingDate: "2019",
    priceRange: "$$$",
    currenciesAccepted: "MXN",
    paymentAccepted: "Cash, Credit Card, Debit Card",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Xilitla",
      addressRegion: "San Luis Potosí",
      postalCode: "79900",
      addressCountry: "MX",
    },
    areaServed: {
      "@type": "Place",
      name: "Huasteca Potosina",
      address: { "@type": "PostalAddress", addressRegion: "San Luis Potosí", addressCountry: "MX" },
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "06:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "05:00", closes: "20:00" },
    ],
    aggregateRating: { "@type": "AggregateRating", ratingValue: GOOGLE_RATING, reviewCount: GOOGLE_RESENAS, bestRating: 5, worstRating: 1 },
    // 🔴 28 sep 2026 — se retiró `award`. Declaraba un premio con nombre,
    // categoría, región y año sin ninguna fuente que lo respaldara en el sitio.
    // Los datos estructurados son justo lo que se contrasta.
    // Sin `CONTACTO.mapsUrl`: esa liga abre la ficha de Google del HOTEL Paraíso
    // Encantado, otra marca (`resenas.ts`), y `sameAs` declara que es la misma
    // entidad que Tours.
    sameAs: [CONTACTO.facebook, GOOGLE_REVIEWS_URL],
  };
}

/**
 * La empresa como documento JSON-LD suelto, para páginas que emiten un `<script>`
 * por schema. Las que arman un `@graph` usan `buildOrganizationNode` directamente:
 * dentro de un grafo el `@context` va una sola vez, arriba.
 */
export function buildOrganizationJsonLd(locale: Locale = "es", description?: string) {
  return { "@context": "https://schema.org", ...buildOrganizationNode(locale, description) };
}

/**
 * El hotel es una entidad aparte de la operadora, y su `@id` es el que declara
 * SU sitio (www.paraisoencantado.com, comprobado el 19 oct 2026).
 *
 * 🔴 Hasta el 19 oct 2026 era `https://www.huasteca-potosina.com/#hotel`: para
 * Google y las IA, un SEGUNDO hotel con el mismo nombre, sin calle, sin
 * teléfono y con dueño distinto, que competía con el de verdad (SEO-10).
 */
export const HOTEL_ID = "https://www.paraisoencantado.com/#hotel";
export const HOTEL_REF = { "@id": HOTEL_ID } as const;

/**
 * El Hotel Paraíso Encantado, donde duermen los paquetes, como REFERENCIA: el
 * `@id` del sitio del hotel con su nombre y su URL, y nada más.
 *
 * Con el `@id` del hotel, todo lo que se declare aquí se suma a SU ficha. Por
 * eso ya no van:
 *  - `parentOrganization` (la operadora): el sitio del hotel lo declara como
 *    entidad propia, y se le pegaba «es de la operadora».
 *  - `description` («Nuestro hotel…»): dice lo mismo con otras palabras.
 *  - `address` y `sameAs` (su Instagram dice «15 habitaciones»; el sitio del
 *    hotel, 13): la dirección, el teléfono (489 100 7679), los cuartos y las
 *    redes los publica el hotel, que es quien los sabe.
 */
export function buildHotelNode() {
  return {
    "@type": "Hotel",
    "@id": HOTEL_ID,
    name: "Hotel Paraíso Encantado",
    url: "https://www.paraisoencantado.com",
  };
}

/**
 * Un escalón de la ruta de migas, SIN el "Inicio" (lo pone el ayudante).
 * `path` es la ruta interna sin prefijo de idioma ("/destinos"), igual que en
 * `buildAlternates`: así el inglés sale solo y nadie escribe "/en/..." a mano.
 */
export interface Crumb {
  name: string;
  path: string;
}

/**
 * `BreadcrumbList` reutilizable — el nodo suelto, para meterlo en un `@graph`.
 *
 * Existía el mismo objeto copiado a mano en más de veinte páginas, y en las que
 * no se copió simplemente no hay migas: /info-practica, la SEGUNDA página del
 * sitio por impresiones, publicaba sus preguntas frecuentes sin decirle a Google
 * dónde encaja. El "Inicio" se genera aquí para que ninguna página pueda
 * olvidarlo ni traducirlo distinto, y las URLs salen de `localeUrl`, que es la
 * misma función que firma los canónicos (home sin barra final incluida).
 *
 * La jerarquía se pasa tal cual está el menú: /destinos, /experiencias e
 * /info-practica cuelgan de la home, no unas de otras.
 */
export function buildBreadcrumbNode(crumbs: Crumb[], locale: Locale = "es") {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "en" ? "Home" : "Inicio",
        item: localeUrl("/", locale),
      },
      ...crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.name,
        item: localeUrl(c.path, locale),
      })),
    ],
  };
}

/** Igual que `buildBreadcrumbNode` pero como documento suelto, con `@context`. */
export function buildBreadcrumbJsonLd(crumbs: Crumb[], locale: Locale = "es") {
  return { "@context": "https://schema.org", ...buildBreadcrumbNode(crumbs, locale) };
}

/**
 * Lo más barato y lo más caro que se cobra por un recorrido, EN SU UNIDAD, y
 * cuántas tarifas distintas hay detrás.
 *
 *   · por persona → el precio suelto (una sola tarifa).
 *   · por grupo   → los escalones de `tarifaGrupo` (el Edén: $2,990 con una
 *     persona … $4,160 con siete, por el grupo entero).
 *   · por vehículo → toda la matriz `flota[].precios` (el RZR: de la unidad más
 *     chica en la ruta corta a la más grande en la larga).
 */
function tarifaDeTour(t: Pick<Tour, "precio" | "precioUnidad" | "tarifaGrupo" | "escalaPersona" | "flota">) {
  if (t.precioUnidad === "grupo") {
    const r = rangoGrupo(t);
    return { ...r, n: t.tarifaGrupo?.length || 1 };
  }
  if (t.precioUnidad === "vehiculo") {
    const precios = (t.flota ?? []).flatMap((v) => v.precios);
    if (precios.length) return { min: Math.min(...precios), max: Math.max(...precios), n: precios.length };
  }
  // Escalera por tamaño de grupo: el precio por persona baja de 3 en adelante,
  // así que lo honesto para Google es el rango, no el precio de una persona.
  if (t.escalaPersona?.length) {
    const menos = Math.max(...t.escalaPersona.map((e) => e.menos));
    return { min: t.precio - menos, max: t.precio, n: t.escalaPersona.length + 1 };
  }
  return { min: t.precio, max: t.precio, n: 1 };
}

/**
 * La oferta de schema.org de UN recorrido, siempre con su unidad.
 *
 * 🔴 Existe porque cada página armaba su `Offer` a mano y en varias se perdía
 * la unidad: /reservar publicaba el Edén como `{"price": 2990}` y el RZR como
 * `{"price": 1600}` sin `priceSpecification`, que un buscador lee "por
 * persona" —siete veces lo que cuesta el Edén por cabeza, y el RZR como si se
 * cobrara por ocupante—. Además apuntaba a /reservar-tour/<slug>, que redirige
 * (307) al carrito con noindex: una oferta cuya URL no se puede indexar.
 *
 * Reglas:
 *   · Precio siempre en MXN y SIEMPRE con `UnitPriceSpecification.unitText`
 *     sacado de `etiquetaUnidad()` —la misma que pinta la tarjeta—.
 *   · Si la tarifa es un rango (grupo o vehículo) va como `AggregateOffer` con
 *     lowPrice/highPrice: declarar "$2,990" a secas diría que ése es EL precio,
 *     y solo es el escalón de una persona.
 *   · `url` por defecto es la ficha del tour (/tours/<slug>), que es la página
 *     indexable del producto.
 *
 * No lleva `seller`: la página que la use decide si referencia a la
 * organización (y en ese caso debe tener el nodo en su grafo).
 */
export function buildTourOffer(
  t: Pick<Tour, "slug" | "precio" | "precioUnidad" | "tarifaGrupo" | "escalaPersona" | "flota">,
  locale: Locale = "es",
  url: string = localeUrl(`/tours/${t.slug}`, locale),
) {
  const { min, max, n } = tarifaDeTour(t);
  const unitText = etiquetaUnidad(t, locale === "en");
  const comun = {
    priceCurrency: "MXN",
    availability: "https://schema.org/InStock",
    url,
  };
  if (min !== max) {
    return {
      "@type": "AggregateOffer",
      ...comun,
      lowPrice: min,
      highPrice: max,
      offerCount: n,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        minPrice: min,
        maxPrice: max,
        priceCurrency: "MXN",
        unitText,
      },
    };
  }
  return {
    "@type": "Offer",
    ...comun,
    price: min,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: min,
      priceCurrency: "MXN",
      unitText,
    },
  };
}

/**
 * La entrada de un destino tal como se le declara a Google: `offers` solo si se
 * COBRA algo por persona, e `isAccessibleForFree` cuando la entrada es libre.
 *
 * 🔴 Una sola regla para la ficha del destino y para /experiencias. Antes
 * /experiencias sacaba el precio parseando el texto libre y publicaba otros
 * números que la ficha (rafting 1,850 contra 1,950; Tamul sin oferta aquí y
 * con oferta allá).
 *
 * 🔴 Sin `Offer` de precio 0 en los sitios de acceso libre: no agrega nada
 * (`isAccessibleForFree` ya lo dice) y en algunos contradecía el texto de la
 * propia ficha —Tamohí cobra la videocámara, en Axtla el chalán tiene cuota,
 * en el Trampolín puede haber estacionamiento—.
 *
 * El número sale de `precio_entrada_mxn`, NUNCA de parsear `precio_entrada`
 * (ver el comentario de ese campo en `destinos.ts`). Sin número, sin oferta.
 * Ese campo solo se llena con una tarifa POR PERSONA clara, así que la unidad
 * se declara como tal, igual que en los tours.
 */
export function entradaDestinoSchema(d: Pick<Destino, "precio_entrada_mxn">, locale: Locale = "es") {
  const mxn = d.precio_entrada_mxn;
  return {
    ...(mxn !== undefined && mxn > 0
      ? {
          offers: {
            "@type": "Offer",
            price: String(mxn),
            priceCurrency: "MXN",
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: mxn,
              priceCurrency: "MXN",
              unitText: etiquetaUnidad({ precioUnidad: "persona" }, locale === "en"),
            },
          },
        }
      : {}),
    isAccessibleForFree: mxn === 0,
  };
}

export interface DestinoFaq {
  pregunta: string;
  respuesta: string;
}

/**
 * La pregunta del PRECIO de un destino, redactada según lo que de verdad dice
 * su tarifa.
 *
 * 🔴 La plantilla vieja escribía SIEMPRE «La entrada a X cuesta
 * {precio_entrada}», aunque el texto no fuera una cifra. Salía, visible y en el
 * FAQPage: «La entrada a Aquismón cuesta Acceso libre. Se recomienda llevar
 * efectivo por si acaso», «cuesta Consultar acceso localmente», «costs Free
 * access». Y en el rafting, cuya "entrada" es nuestro tour y se paga en línea
 * con tarjeta, remataba con «Solo se acepta efectivo, no hay cajero».
 *
 * Cuatro casos:
 *   1. La "entrada" ES un tour nuestro (`entradaEsTour`): se contesta con el
 *      precio del catálogo, su unidad y la regla de pago del motor.
 *   2. Se cobra y el texto empieza por la cifra ("$150 MXN"): «La entrada a X
 *      cuesta $150 MXN».
 *   3. Se cobra (o no hay cifra clara) pero el texto es prosa ("General $50 ·
 *      estudiantes $25…", "Consultar acceso localmente"): «Entrada a X: …».
 *   4. Acceso libre (`precio_entrada_mxn === 0`): se pregunta si hay que pagar
 *      y se contesta con el texto tal cual, SIN la frase del efectivo.
 */
function faqPrecioDestino(d: Destino, locale: Locale): DestinoFaq {
  const en = locale === "en";
  const txt = d.precio_entrada.trim().replace(/\.$/, "");
  // Después de dos puntos va minúscula ("Entrada a X: consultar…"). Solo se
  // baja la primera letra si la segunda ya es minúscula: una sigla ("MXN") se
  // queda como está.
  const txtMinus = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(txt) ? txt[0].toLowerCase() + txt.slice(1) : txt;
  const efectivo = en
    ? d.advertencias?.toLowerCase().includes("cash")
      ? "Cash only — there is no ATM on site."
      : "Bringing cash is recommended just in case."
    : d.advertencias?.toLowerCase().includes("efectivo")
      ? "Solo se acepta efectivo, no hay cajero en el lugar."
      : "Se recomienda llevar efectivo por si acaso.";

  // 1. La "entrada" es uno de nuestros recorridos.
  const base = d.entradaEsTour ? TOURS_DB.find((t) => t.slug === d.entradaEsTour) : undefined;
  if (base) {
    const tour = localizeTour(base, locale);
    const { min, max } = tarifaDeTour(tour);
    const desde = min !== max ? (en ? "from " : "desde ") : "";
    const importe = `${desde}${pesos(min)} MXN ${etiquetaUnidad(tour, en)}`;
    const ficha = localeUrl(`/tours/${tour.slug}`, locale).replace(/^https?:\/\//, "");
    return en
      ? {
          pregunta: `How much does it cost to visit ${d.nombre}?`,
          respuesta: `${d.nombre} is done on our ${tour.nombreCorto} tour: ${importe}, the final price of the tour. You book and pay online by card: a 30% deposit holds your spot and the balance is settled on the day of the tour. Details at ${ficha}.`,
        }
      : {
          pregunta: `¿Cuánto cuesta visitar ${d.nombre}?`,
          respuesta: `${d.nombre} se recorre con nuestro tour ${tour.nombreCorto}: ${importe}, precio final del recorrido. Se reserva y se paga en línea con tarjeta: apartas con el 30 % y liquidas el resto el día del tour. Detalles en ${ficha}.`,
        };
  }

  // 4. Acceso libre: no hay "cuánto cuesta".
  if (d.precio_entrada_mxn === 0) {
    return en
      ? { pregunta: `Is there an entrance fee at ${d.nombre}?`, respuesta: `${txt} at ${d.nombre}.` }
      : { pregunta: `¿Hay que pagar para entrar a ${d.nombre}?`, respuesta: `${txt} en ${d.nombre}.` };
  }

  // 2. y 3. Se cobra algo (o no hay tarifa clara publicada).
  const esCifra = txt.startsWith("$");
  return en
    ? {
        pregunta: `How much is admission to ${d.nombre}?`,
        respuesta: `${esCifra ? `Admission to ${d.nombre} costs ${txt}.` : `Admission to ${d.nombre}: ${txtMinus}.`} ${efectivo}`,
      }
    : {
        pregunta: `¿Cuánto cuesta la entrada a ${d.nombre}?`,
        respuesta: `${esCifra ? `La entrada a ${d.nombre} cuesta ${txt}.` : `Entrada a ${d.nombre}: ${txtMinus}.`} ${efectivo}`,
      };
}

/**
 * ¿Alguna pregunta curada ya habla del precio? Entonces la automática sobra.
 *
 * El filtro de abajo solo quita repetidas LITERALES, y las curadas preguntan
 * el precio con otras palabras («¿Cuánto cuesta ir a la Cascada de Tamul?»,
 * «¿Qué días abre Las Pozas y cuánto cuesta?»): la ficha acababa con dos
 * respuestas de precio, y en Tamohí la automática decía una cosa y la curada
 * otra.
 */
// ⚠️ "how much" a secas no basta: también es «How much TIME do you need…?».
const PREGUNTA_PRECIO = {
  es: /cu[aá]nto (cuesta|se paga|vale)|precio|tarifa|hay que pagar/i,
  en: /how much (does|is|do|are)\b|\bprice|admission|entrance fee|\bcosts?\b/i,
};

/**
 * «Mañana» → «por la mañana» · «08:00–10:00» → «entre las 08:00 y las 10:00».
 *
 * 🔴 20 nov 2026 (auditoría de Destinos): la plantilla vieja pegaba el campo tal
 * cual y publicaba en 41 fichas «La mejor hora del día para llegar es Mañana
 * para aprovechar al máximo la experiencia»: texto que se lee generado sin
 * revisión, justo lo que Google llama contenido a escala de poco esfuerzo.
 */
function cuandoLlegar(hora: string, en: boolean): string {
  const h = hora.trim();
  const rango = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/.exec(h);
  if (rango) return en ? `between ${rango[1]} and ${rango[2]}` : `entre las ${rango[1]} y las ${rango[2]}`;
  const dos = /^(\d{1,2}:\d{2})\s*(?:o|or)\s*(\d{1,2}:\d{2})$/.exec(h);
  if (dos) return en ? `at ${dos[1]} or at ${dos[2]}` : `a las ${dos[1]} o a las ${dos[2]}`;
  const una = /^(\d{1,2}:\d{2})(?:\s*AM)?$/i.exec(h);
  if (una) return en ? `at ${una[1]}` : `a las ${una[1]}`;
  const es: Record<string, string> = {
    "Mañana": "por la mañana",
    "Media mañana": "a media mañana",
    "Mañana temprana": "temprano por la mañana",
    "Mañana o atardecer": "por la mañana o al atardecer",
    "Amanecer (para la niebla)": "al amanecer, para ver la niebla",
    "Tarde (luz dorada entre los árboles)": "por la tarde, cuando la luz dorada entra entre los árboles",
  };
  const ing: Record<string, string> = {
    "Morning": "in the morning",
    "Mid-morning": "mid-morning",
    "Early morning": "early in the morning",
    "Morning or sunset": "in the morning or at sunset",
    "Sunrise (for the fog)": "at sunrise, to see the fog",
    "Afternoon (golden light through the trees)": "in the afternoon, when golden light filters through the trees",
  };
  return (en ? ing[h] : es[h]) ?? (en ? `around ${h.toLowerCase()}` : `hacia ${h.toLowerCase()}`);
}

/**
 * FAQs de un destino.
 *
 * · Con guía escrita a mano (`destinosGuia.ts`, solo español): SOLO esas. Están
 *   revisadas con fuentes y fechadas; las curadas viejas de `seo.faqPrincipales`
 *   y las automáticas podían contradecirlas (Tamul: «$220 + $300 panga»).
 * · Sin guía: primero las curadas (`seo.faqPrincipales`) y luego las prácticas
 *   que salen de sus datos (precio, cómo llegar, temporada, duración, qué
 *   llevar), redactadas como frases normales y sin repetir preguntas.
 *
 * Se usa para el JSON-LD y para la sección visible (Google pide que lo marcado
 * como FAQPage se vea, y los buscadores de IA citan este texto).
 */
export function getDestinoFaqs(d: Destino, locale: Locale = "es"): DestinoFaq[] {
  const guia = locale === "es" ? guiaDe(d.slug) : undefined;
  if (guia?.faqs.length) return guia.faqs;

  const curadas: DestinoFaq[] = d.seo?.faqPrincipales?.length ? [...d.seo.faqPrincipales] : [];
  const precioCurado = curadas.some((f) => PREGUNTA_PRECIO[locale].test(f.pregunta));
  const precio = precioCurado ? [] : [faqPrecioDestino(d, locale)];
  const en = locale === "en";
  const llegar = cuandoLlegar(d.mejor_hora, en);
  const lleva = d.que_llevar.join(", ");

  const automaticas: DestinoFaq[] = en
    ? [
        ...precio,
        {
          pregunta: `How do I get to ${d.nombre} from Ciudad Valles?`,
          respuesta: `${d.nombre} is in ${d.zona}, San Luis Potosí. From Ciudad Valles: ${d.como_llegar.replace(/\.$/, "")}.`,
        },
        {
          pregunta: `What time of year is best to visit ${d.nombre}?`,
          respuesta: `The best season is ${d.temporada_ideal}. On the day, try to arrive ${llegar}.`,
        },
        {
          pregunta: `How much time do you need at ${d.nombre}?`,
          respuesta: `Plan about ${d.duracion_hrs} hours. Hours: ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `What should I bring to ${d.nombre}?`,
          respuesta: `Bring ${lleva}.${d.advertencias ? ` Keep in mind: ${d.advertencias}` : ""}`,
        },
      ]
    : [
        ...precio,
        {
          pregunta: `¿Cómo llegar a ${d.nombre} desde Ciudad Valles?`,
          respuesta: `${d.nombre} está en ${d.zona}, San Luis Potosí. Desde Ciudad Valles: ${d.como_llegar.replace(/\.$/, "")}.`,
        },
        {
          pregunta: `¿Cuál es la mejor época para visitar ${d.nombre}?`,
          respuesta: `La mejor temporada es ${d.temporada_ideal}. Ese día, procura llegar ${llegar}.`,
        },
        {
          pregunta: `¿Cuánto tiempo se necesita en ${d.nombre}?`,
          respuesta: `Calcula unas ${d.duracion_hrs} horas. Horario: ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `¿Qué llevar a ${d.nombre}?`,
          respuesta: `Lleva ${lleva}.${d.advertencias ? ` Toma en cuenta: ${d.advertencias}` : ""}`,
        },
      ];

  const norm = (s: string) => s.toLowerCase().replace(/[¿?¡!.,\s]/g, "");
  const vistas = new Set(curadas.map((f) => norm(f.pregunta)));

  return [...curadas, ...automaticas.filter((f) => !vistas.has(norm(f.pregunta)))];
}

function buildFAQs(d: Destino, locale: Locale) {
  return getDestinoFaqs(d, locale).map((faq) => ({
    "@type": "Question",
    name: faq.pregunta,
    acceptedAnswer: { "@type": "Answer", text: faq.respuesta },
  }));
}

function buildOpeningHours(d: Destino) {
  // Horario en formato "08:00–18:00" → opens/closes
  const match = d.horario.match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  if (!match) return [];
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "https://schema.org/Monday",
        "https://schema.org/Tuesday",
        "https://schema.org/Wednesday",
        "https://schema.org/Thursday",
        "https://schema.org/Friday",
        "https://schema.org/Saturday",
        "https://schema.org/Sunday",
      ],
      opens: match[1],
      closes: match[2],
    },
  ];
}

export function buildDestinationJsonLd(d: Destino, locale: Locale = "es") {
  const url = `${BASE_URL}${localePath(`/destinos/${d.slug}`, locale)}`;
  // 🔴 El precio que se le declara a Google sale del campo NUMÉRICO del destino,
  // nunca de parsear `precio_entrada`. Ese texto lleva formato: el `\d+` que
  // vivía aquí se paraba en la coma de millares y el rafting del Tampaón
  // publicaba una entrada de 1 peso cobrando $1,950 —un error de 1,950 veces—,
  // y el `/gratis/` declaraba gratuito al museo Leonora Carrington porque su
  // tarifa termina en "menores de 12 años gratis". Sin campo numérico no se
  // publica oferta: mejor callar un precio que inventarlo. La regla completa
  // (y la de acceso libre) vive en `entradaDestinoSchema`, que también usa
  // /experiencias.
  const imagen = d.imagen_hero || d.imagen_galeria[0];
  const inLanguage = locale === "en" ? "en" : "es-MX";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        name: d.nombre,
        description: d.descripcion,
        url,
        inLanguage,
        touristType: d.tipo,
        geo: {
          "@type": "GeoCoordinates",
          latitude: d.lat,
          longitude: d.lng,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: d.zona,
          addressRegion: "San Luis Potosí",
          addressCountry: "MX",
        },
        openingHoursSpecification: buildOpeningHours(d),
        // Sin Offer cuando no hay tarifa por persona clara ("Consultar", cuotas
        // por grupo, rangos) ni cuando la entrada es libre: ver
        // `entradaDestinoSchema`. `isAccessibleForFree` sale de ahí también.
        ...entradaDestinoSchema(d, locale),
        amenityFeature: d.que_llevar.map((item) => ({
          "@type": "LocationFeatureSpecification",
          name: item,
          value: true,
        })),
        image: imagen ? `${BASE_URL}${imagen}` : undefined,
        // Jerarquía geográfica (20 nov 2026, auditoría): lugar → municipio →
        // la Huasteca Potosina, que es el índice /destinos.
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: d.zona,
          containedInPlace: {
            "@type": "TouristDestination",
            name: "Huasteca Potosina",
            url: `${BASE_URL}${localePath("/destinos", locale)}`,
          },
        },
      },
      // La página misma, con la fecha REAL de revisión de su guía (solo las
      // fichas con guía escrita a mano la tienen; las demás no inventan una).
      ...(guiaDe(d.slug)
        ? [{
            "@type": "WebPage",
            "@id": `${url}#pagina`,
            url,
            name: d.seo?.metaTitle ?? d.nombre,
            inLanguage,
            dateModified: guiaDe(d.slug)!.revisado,
            about: { "@type": "TouristAttraction", name: d.nombre },
          }]
        : []),
      // 🔴 28 sep 2026 — retirado el aggregateRating de destinos.
      // `RATING_DESTINO` repartía 1,188 reseñas entre 20 destinos, con notas de
      // 4.5 a 4.7, todas inventadas: el negocio tiene 161 reseñas en Google y
      // un destino (un lugar público, no un producto que vendamos) no tiene
      // reseñas propias que declarar. El rating real va una sola vez, en la
      // organización. Ver `src/lib/resenas.ts`. La constante se BORRÓ de
      // `destinoData.ts` (quedaba importada aquí sin usarse, lista para volver).
      {
        "@type": "FAQPage",
        inLanguage,
        mainEntity: buildFAQs(d, locale),
      },
      // Mismas migas de siempre (Inicio › Destinos › la ficha), ahora por el
      // ayudante compartido en vez de un objeto escrito a mano.
      buildBreadcrumbNode(
        [
          { name: locale === "en" ? "Destinations" : "Destinos", path: "/destinos" },
          { name: d.nombre, path: `/destinos/${d.slug}` },
        ],
        locale,
      ),
    ],
  };
}
