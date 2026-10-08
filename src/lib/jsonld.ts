import { Destino } from "./destinos";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "./resenas";
import { CONTACTO } from "./contacto";
import { TOURS_DB, etiquetaUnidad, type Tour } from "./tours";
import { rangoGrupo } from "./catalogoResumen";
import { localizeTour } from "./i18n/localize";
import { localePath, localeUrl, type Locale } from "./i18n/config";

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
        ? "Certified tour operator based in Xilitla, San Luis Potosí. Guided day tours across the Huasteca Potosina with NOM-09 certified guides, transport and insurance included."
        : "Operadora de tours certificada con base en Xilitla, San Luis Potosí. Tours guiados de un día por la Huasteca Potosina con guías certificados NOM-09, transporte y seguro incluidos."),
    logo: { "@type": "ImageObject", url: `${BASE_URL}/logos/huasteca-logo-light.svg`, width: 600, height: 600 },
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
    sameAs: [CONTACTO.facebook, GOOGLE_REVIEWS_URL, CONTACTO.mapsUrl],
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

/** El hotel es una entidad aparte de la operadora, con su propio `@id`. */
export const HOTEL_ID = `${BASE_URL}/#hotel`;
export const HOTEL_REF = { "@id": HOTEL_ID } as const;

/**
 * El Hotel Paraíso Encantado, donde duermen los paquetes.
 *
 * Existe como entidad propia por una razón concreta: su Instagram
 * (@_paraiso_encantado) es del HOTEL, no de la operadora. El perfil se presenta
 * como "Paraíso Encantado | Xilitla · 15 habitaciones únicas". Colgarlo del
 * `sameAs` de "Tours Huasteca Potosina" habría afirmado que la operadora y el
 * hotel son la misma cosa, y son dos marcas del mismo dueño. Aquí la cuenta
 * queda declarada donde sí es verdad, y `parentOrganization` dice la relación
 * real —el hotel es de la operadora, como ya afirma el propio sitio.
 *
 * NO se declara `numberOfRooms`: `habitaciones.ts` lista 9 y la biografía de
 * Instagram dice 15. Mientras las dos fuentes no coincidan, no se publica.
 * Tampoco `address` con calle: `CONTACTO.direccion` sigue sin confirmarse.
 */
export function buildHotelNode(locale: Locale = "es") {
  return {
    "@type": "Hotel",
    "@id": HOTEL_ID,
    name: "Hotel Paraíso Encantado",
    url: "https://www.paraisoencantado.com",
    inLanguage: locale === "en" ? "en" : "es-MX",
    description:
      locale === "en"
        ? "Our own hotel in Xilitla, San Luis Potosí, a short walk from Edward James's surrealist garden. It is where the multi-day packages stay."
        : "Nuestro hotel en Xilitla, San Luis Potosí, a unos pasos del jardín surrealista de Edward James. Es donde se hospedan los paquetes de varios días.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Xilitla",
      addressRegion: "San Luis Potosí",
      postalCode: "79900",
      addressCountry: "MX",
    },
    parentOrganization: ORG_REF,
    sameAs: ["https://www.instagram.com/_paraiso_encantado/"],
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
 * FAQs de un destino: primero las curadas a mano (`seo.faqPrincipales`) y luego
 * las prácticas generadas de sus datos reales (precio, cómo llegar, temporada,
 * duración, qué llevar), sin repetir preguntas.
 *
 * Antes las curadas REEMPLAZABAN a las automáticas, así que las fichas mejor
 * trabajadas acababan publicando MENOS preguntas que las demás. Se usa tanto
 * para el JSON-LD como para la sección visible de la página (Google pide que el
 * contenido del schema se vea, y para los buscadores de IA es texto citable).
 */
export function getDestinoFaqs(d: Destino, locale: Locale = "es"): DestinoFaq[] {
  const curadas: DestinoFaq[] = d.seo?.faqPrincipales?.length ? [...d.seo.faqPrincipales] : [];
  const precioCurado = curadas.some((f) => PREGUNTA_PRECIO[locale].test(f.pregunta));
  const precio = precioCurado ? [] : [faqPrecioDestino(d, locale)];

  const automaticas: DestinoFaq[] = locale === "en"
    ? [
        ...precio,
        {
          pregunta: `How do I get to ${d.nombre} from Ciudad Valles?`,
          respuesta: `${d.como_llegar}. The destination is in ${d.zona}, San Luis Potosí, Mexico.`,
        },
        {
          pregunta: `What time of year is best to visit ${d.nombre}?`,
          respuesta: `The best season to visit ${d.nombre} is ${d.temporada_ideal}. The best time of day to arrive is ${d.mejor_hora} to make the most of the experience.`,
        },
        {
          pregunta: `How much time do you need to tour ${d.nombre}?`,
          respuesta: `Plan about ${d.duracion_hrs} hours to enjoy ${d.nombre} at a relaxed pace. The site is open ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `What should you bring to visit ${d.nombre}?`,
          respuesta: `To visit ${d.nombre} we recommend bringing: ${d.que_llevar.join(", ")}. ${d.advertencias ? `Important: ${d.advertencias}` : ""}`.trim(),
        },
      ]
    : [
        ...precio,
        {
          pregunta: `¿Cómo llegar a ${d.nombre} desde Ciudad Valles?`,
          respuesta: `${d.como_llegar}. El destino se encuentra en ${d.zona}, San Luis Potosí, México.`,
        },
        {
          pregunta: `¿En qué época del año es mejor visitar ${d.nombre}?`,
          respuesta: `La temporada ideal para visitar ${d.nombre} es ${d.temporada_ideal}. La mejor hora del día para llegar es ${d.mejor_hora} para aprovechar al máximo la experiencia.`,
        },
        {
          pregunta: `¿Cuánto tiempo se necesita para recorrer ${d.nombre}?`,
          respuesta: `Se recomienda destinar aproximadamente ${d.duracion_hrs} horas para recorrer ${d.nombre} con calma. El sitio abre ${d.horario} (${d.dias_abierto}).`,
        },
        {
          pregunta: `¿Qué llevar para visitar ${d.nombre}?`,
          respuesta: `Para visitar ${d.nombre} se recomienda llevar: ${d.que_llevar.join(", ")}. ${
            d.advertencias ? `Importante: ${d.advertencias}` : ""
          }`.trim(),
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
      },
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
