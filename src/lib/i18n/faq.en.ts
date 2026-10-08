import type { Locale } from "./config";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB, precioVisible, type Paquete } from "@/lib/paquetes";
import { TRASLADOS } from "@/lib/traslados";
import { enAuto, enAutobus } from "@/lib/tiemposDeViaje";
import { formatMXN } from "@/lib/tourBooking";
import { fmtMoney } from "./format";
import { localizePaquete } from "./paquetes.en";
import { localizeTour } from "./localize";
import { rangoPorPersona, rangoGrupo } from "@/lib/catalogoResumen";
import { fechaInicioTexto } from "@/lib/temporada";

import { GRUPO_MAX } from "@/lib/tours";
/**
 * Traducción de /preguntas-frecuentes.
 *
 * ⚠️ Ningún precio se escribe a mano. Se leen del catálogo igual que hacía la
 * página en español: esta página llegó a publicar $1,300 / $1,450 / $1,600
 * mientras el catálogo decía $1,400 / $1,550 / $1,700, y un cliente que
 * comparaba dos páginas del mismo sitio encontraba la contradicción en un
 * minuto. Traducirla a mano habría abierto ese mismo hueco en inglés.
 *
 * ⚠️ Ningún tiempo de carretera se escribe a mano: salen de
 * `tiemposDeViaje.ts`. El 14 ago 2026 se emparejaron NUEVE páginas a mano y en
 * seis semanas volvieron a desparejarse, porque el número no vivía en ningún
 * sitio una sola vez. Dos respuestas seguidas de ESTA página llegaron a decir
 * 2.5 h y 2 h del aeropuerto de Tampico a Ciudad Valles.
 *
 * OJO al leerlas: «a Xilitla» y «a Ciudad Valles» son destinos distintos y sus
 * tiempos también. Por eso la fuente tiene los dos y hay que pedir el que toca.
 *
 * ⚠️ Las CIFRAS son las mismas en los dos idiomas. Lo único que cambia es la
 * unidad cuando el lector americano no piensa en métrico: el Sótano de las
 * Golondrinas lleva pies con los metros entre paréntesis, nunca en lugar de
 * ellos. Es la misma trampa que ya mordió con Tamul (105 m ≠ 105 ft).
 *
 * ⚠️ Los CTA en inglés NO pueden apuntar a rutas que solo existen en español.
 * `/recomendar` y `/blog` no tienen versión `/en`, así que el bloque inglés
 * manda a `/en/info-practica` y `/en/destinos`. Es la lección de las guardas:
 * abrir el embudo inglés y dejar los enlaces mandando al sitio español es
 * perder al cliente justo cuando ya estaba convencido.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCtaLink {
  href: string;
  label: string;
  /** Jerarquía visual: la principal, la dorada y la discreta. */
  variante: "primaria" | "secundaria" | "terciaria";
}

export interface FaqContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;

  /** Idioma que se declara en el JSON-LD del FAQPage. */
  inLanguage: string;

  breadcrumbHome: string;
  breadcrumbActual: string;

  heroEyebrow: string;
  heroH1: string;
  heroIntro: string;

  faqs: FaqItem[];

  ctaTitulo: string;
  ctaTexto: string;
  ctaLinks: FaqCtaLink[];
  ctaWhatsappPre: string;

  cierrePre: string;
  cierreLink: string;
  cierreHref: string;
}

// ── Precios, leídos del catálogo ───────────────────────────────────────────
// Se calculan una vez por idioma porque el agrupado de miles cambia (y porque
// el inglés lleva la etiqueta "MXN" pegada: un lector americano que ve "$1,400"
// sin moneda asume dólares y se lleva un susto de 20x).

const precioTour = (id: string) => TOURS_DB.find((t) => t.id === id)?.precio ?? 0;

// 🔴 Filtraba con `!== "vehiculo"` y el Edén —tarifa del GRUPO entero— subía
// el techo a $2,990 «por persona», visible y dentro del FAQPage. Es el mismo
// error que ya se corrigió en `faqTours.ts` y en /precios: `rangoPorPersona`
// filtra con `esPorPersona`.
const { min: PRECIO_MIN_N, max: PRECIO_MAX_N } = rangoPorPersona();

/**
 * Los que se cobran por GRUPO (hoy, el Edén), con sus escalones: «de $2,990 a
 * $4,160 por el grupo completo». Sacados del rango de arriba tienen que decirse
 * aparte, o la respuesta callaría el recorrido más caro del catálogo.
 */
const TOURS_GRUPO = TOURS_DB.filter((t) => t.precioUnidad === "grupo");
const nombreTour = (t: (typeof TOURS_DB)[number], locale: Locale) =>
  localizeTour(t, locale).nombre.split("—")[0].trim();
const GRUPO_NOTA_ES = TOURS_GRUPO.map((t) => {
  const r = rangoGrupo(t);
  return ` ${nombreTour(t, "es")} se cobra por grupo: de ${formatMXN(r.min)} a ${formatMXN(r.max)} MXN por el grupo completo según cuántos vayan (de ${t.groupMin} a ${t.groupMax} personas).`;
}).join("");
const GRUPO_NOTA_EN = TOURS_GRUPO.map((t) => {
  const r = rangoGrupo(t);
  return ` ${nombreTour(t, "en")} is priced per group: ${fmtMoney(r.min, "en")} to ${fmtMoney(r.max, "en")} for the whole group depending on its size (${t.groupMin} to ${t.groupMax} people).`;
}).join("");

/**
 * Los tours con política de cancelación PROPIA (hoy, el Edén, que no
 * reembolsa), con el texto del campo `cancelacion` del catálogo.
 *
 * 🔴 La respuesta de cancelación prometía «reembolso del 100 %» a TODOS los
 * tours y la de lluvia «eliges entre reembolso o reagendar», las dos dentro del
 * FAQPage y en la misma página cuya primera respuesta ya nombra al Edén. Es la
 * promesa por la que existe ese campo. Se arma igual que en `faqTours.ts`, así
 * la FAQ no puede decir otra cosa que la ficha del tour.
 */
const TOURS_CANCEL_PROPIA = TOURS_DB.filter((t) => t.cancelacion);
const cancelPropia = (locale: Locale) =>
  TOURS_CANCEL_PROPIA.map((t) =>
    locale === "en"
      ? ` The exception is ${nombreTour(t, "en")}. ${t.cancelacion!.en}`
      : ` La excepción es ${nombreTour(t, "es")}. ${t.cancelacion!.es}`,
  ).join("");

/**
 * Para la respuesta de lluvia basta la frase del CLIMA de esa política (la
 * misma que pinta la insignia de la ficha del tour); repetir la política entera
 * dos respuestas seguidas sobra. Si un día esa política no habla del clima, se
 * remite a la respuesta de cancelación en vez de inventarle una.
 */
const climaPropio = (locale: Locale) =>
  TOURS_CANCEL_PROPIA.map((t) => {
    const nombre = nombreTour(t, locale);
    const frase = t.cancelacion![locale].split(/(?<=\.)\s+/).find((f) => /clima|weather/i.test(f));
    if (!frase) {
      return locale === "en"
        ? ` ${nombre} follows its own cancellation policy, explained on this page.`
        : ` ${nombre} se rige por su propia política de cancelación, explicada en esta misma página.`;
    }
    const f = frase.charAt(0).toLowerCase() + frase.slice(1);
    return locale === "en" ? ` The exception is ${nombre}: ${f}` : ` La excepción es ${nombre}: ${f}`;
  }).join("");

/**
 * Los paquetes que nombra la respuesta de «¿3 días?», elegidos por lo que
 * RECORREN (el más corto que lleva esos tours) y con el nombre de
 * `localizePaquete`, nunca escritos a mano.
 *
 * 🔴 Decía «Luna de Miel» y «Paquete Familiar» después de retirarlos; y al
 * corregirlo, la versión inglesa quedó con «Inmersión Huasteca» en español
 * mientras /en/paquetes dice «Huasteca Immersion».
 */
const paqueteConTours = (...slugs: string[]): Paquete | undefined =>
  PAQUETES_DB.filter((p) => slugs.every((s) => p.itinerario.some((d) => d.tourSlug === s))).sort(
    (a, b) => a.dias - b.dias,
  )[0];
const PAQ_ESENCIAL = paqueteConTours("expedicion-tamul", "ruta-surrealista-edward-james");
const PAQ_CON_MECO = paqueteConTours("expedicion-tamul", "ruta-surrealista-edward-james", "cascadas-del-meco");

/** «paquete Inmersión Huasteca» / «Huasteca Immersion package», sin duplicar la palabra si el nombre ya la trae («Gran Huasteca Package»). */
const conPalabraPaquete = (p: Paquete, locale: Locale) => {
  const n = localizePaquete(p, locale).nombre;
  if (/paquete|package/i.test(n)) return n;
  return locale === "en" ? `${n} package` : `paquete ${n}`;
};
const TRES_DIAS_ES =
  (PAQ_ESENCIAL
    ? ` Nuestro ${conPalabraPaquete(PAQ_ESENCIAL, "es")} (${PAQ_ESENCIAL.dias} días / ${PAQ_ESENCIAL.noches} noches) hace exactamente ese recorrido.`
    : "") +
  (PAQ_CON_MECO
    ? ` Para añadir un día completo de cascadas —las Cascadas del Meco— hacen falta ${PAQ_CON_MECO.dias} días: es lo que recorre el ${conPalabraPaquete(PAQ_CON_MECO, "es")}.`
    : "");
const TRES_DIAS_EN =
  (PAQ_ESENCIAL
    ? ` Our ${conPalabraPaquete(PAQ_ESENCIAL, "en")} (${PAQ_ESENCIAL.dias} days / ${PAQ_ESENCIAL.noches} nights) does exactly that route.`
    : "") +
  (PAQ_CON_MECO
    ? ` To add a full day of waterfalls — the Cascadas del Meco — you need ${PAQ_CON_MECO.dias} days: that is what the ${conPalabraPaquete(PAQ_CON_MECO, "en")} covers.`
    : "");

/**
 * El rango de paquetes sale de lo que se ENSEÑA (`precioVisible`), nunca de
 * `p.precio`, que es siempre el total de la pareja porque es el contrato del
 * motor de cobro. Con `p.precio` esta FAQ diría «de $9,800 a $20,500» mientras
 * las tarjetas del mismo sitio dicen «$6,250 por persona»: dos cifras que no
 * cuadran, y el visitante encuentra la contradicción en un minuto.
 *
 * Los días se toman del paquete que de verdad marca cada extremo, no del
 * mínimo y el máximo sueltos: al ordenar por precio visible el más barato deja
 * de ser el más corto, y emparejar las dos cifras a ciegas inventa un paquete
 * que no existe.
 */
const paqBarato = PAQUETES_DB.reduce((a, b) => (precioVisible(b) < precioVisible(a) ? b : a));
const paqCaro = PAQUETES_DB.reduce((a, b) => (precioVisible(b) > precioVisible(a) ? b : a));
const PAQ_MIN_N = precioVisible(paqBarato);
const PAQ_MAX_N = precioVisible(paqCaro);
const PAQ_DIAS_MIN = paqBarato.dias;
const PAQ_DIAS_MAX = paqCaro.dias;

/**
 * La unidad y su aclaración, leídas de `precioPorPersona` paquete por paquete.
 *
 * 🔴 La nota decía «La excepción es Inmersión Huasteca, que se vende por
 * pareja…; Gran Huasteca…; Paquete Aventura…; Odisea Huasteca…» justo después
 * de «van de $8,699 a $16,500 MXN por pareja»: los cuatro eran «la excepción»
 * de una regla que ya decía «por pareja». Se armaba siempre que hubiera UN
 * paquete por pareja. Ahora hay tres casos, y solo el mixto nombra paquetes.
 */
const PAQ_PAREJA = PAQUETES_DB.filter((p) => !p.precioPorPersona);
const TODOS_PAREJA = PAQ_PAREJA.length === PAQUETES_DB.length;
const TODOS_PERSONA = PAQ_PAREJA.length === 0;
const MIXTO = !TODOS_PAREJA && !TODOS_PERSONA;

/** Con unidades mezcladas, el rango no tiene una sola: no se afirma ninguna. */
const PAQ_UNIDAD_ES = MIXTO ? "según el paquete" : paqBarato.precioLabel;
const PAQ_UNIDAD_EN = MIXTO ? "depending on the package" : TODOS_PAREJA ? "per couple" : "per person";

const nombresY = (ps: typeof PAQUETES_DB, locale: Locale) =>
  new Intl.ListFormat(locale === "en" ? "en-US" : "es-MX", { type: "conjunction" }).format(
    ps.map((p) => localizePaquete(p, locale).nombre),
  );
const PAQ_NOTA_ES = TODOS_PAREJA
  ? " Cada cifra es el total de las dos personas, que comparten habitación."
  : MIXTO
    ? ` Se venden por pareja, con la cifra de los dos, ${nombresY(PAQ_PAREJA, "es")}; los demás se anuncian por persona.`
    : "";
const PAQ_NOTA_EN = TODOS_PAREJA
  ? " Each figure is the total for two people sharing a room."
  : MIXTO
    ? ` ${nombresY(PAQ_PAREJA, "en")} ${PAQ_PAREJA.length > 1 ? "are" : "is"} sold per couple, with the figure covering both of you; the rest are priced per person.`
    : "";

/** Tarifa de grupo chico (1–4 pax) de una ruta de traslado, para la FAQ inglesa. */
const trasladoBase = (slug: string) =>
  TRASLADOS.find((t) => t.slug === slug)?.tarifas[0]?.precio ?? 0;

// ── Español: EL TEXTO NO CAMBIA ────────────────────────────────────────────
// Es copia literal de la página anterior, con los mismos precios calculados.

const ES: FaqContent = {
  metaTitle: "Preguntas Frecuentes — Tours Huasteca Potosina 2026",
  // ≤ 155 caracteres: la de antes (196) la cortaba Google a media frase.
  metaDescription:
    "Cuánto cuesta, qué incluyen los tours, la mejor época, cómo llegar desde CDMX, Monterrey o Guadalajara, seguridad y qué llevar a la Huasteca Potosina.",
  keywords: [
    "preguntas frecuentes huasteca potosina",
    "cuánto cuesta huasteca potosina",
    "mejor época huasteca potosina",
    "cómo llegar a la huasteca potosina",
    "qué llevar a las cascadas",
    "huasteca potosina con familia",
  ],
  ogTitle: "Preguntas Frecuentes — Tours Huasteca Potosina",
  ogDescription:
    "Precios, qué incluyen los tours, mejor época, cómo llegar, seguridad y consejos para visitar la Huasteca Potosina.",
  ogImageAlt: "Preguntas frecuentes sobre la Huasteca Potosina",
  twitterTitle: "Preguntas Frecuentes — Tours Huasteca Potosina",
  twitterDescription:
    "Precios, mejor época, cómo llegar, seguridad y consejos para visitar la Huasteca Potosina.",

  inLanguage: "es-MX",

  breadcrumbHome: "Inicio",
  breadcrumbActual: "Preguntas frecuentes",

  heroEyebrow: "Antes de tu viaje",
  heroH1: "Preguntas frecuentes sobre la Huasteca Potosina",
  heroIntro:
    "Precios, qué incluyen los tours, la mejor época, cómo llegar, seguridad y consejos prácticos. Si te queda alguna duda, escríbenos por WhatsApp y te respondemos en menos de una hora, todos los días.",

  faqs: [
    {
      q: "¿Cuánto cuesta un tour en la Huasteca Potosina?",
      // «Precio final» y no «todo incluido»: 5 de 14 tours llevan desayuno, el
      // RZR no lleva traslado y al buceo se llega por cuenta propia.
      a: `Nuestros tours guiados de un día cuestan entre ${formatMXN(PRECIO_MIN_N)} y ${formatMXN(PRECIO_MAX_N)} MXN por persona, según el recorrido, y ese es el precio final. Los más populares: Ruta Surrealista (Edward James) ${formatMXN(precioTour("tour-edward-james"))}, Expedición Tamul ${formatMXN(precioTour("tour-tamul"))}, Cascadas del Meco ${formatMXN(precioTour("tour-meco"))}. El Recorrido en RZR por Xilitla se cobra por vehículo, desde ${formatMXN(precioTour("tour-rzr-xilitla"))} MXN por unidad.${GRUPO_NOTA_ES} Si prefieres varios días con hospedaje, los paquetes van de ${formatMXN(PAQ_MIN_N)} (${PAQ_DIAS_MIN} días) a ${formatMXN(PAQ_MAX_N)} MXN (${PAQ_DIAS_MAX} días) ${PAQ_UNIDAD_ES}.${PAQ_NOTA_ES}`,
    },
    {
      q: "¿Qué incluyen los tours?",
      // Sin «por persona»: el RZR se cobra por vehículo y el Edén por grupo.
      a: "Según el tour: traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, desayuno con platillos típicos de la región, entradas a todos los parques y atracciones, guía certificado NOM-09 SECTUR, equipo de seguridad, fotografías y video del recorrido, y botiquín de primeros auxilios. El precio que ves es el precio final, sin sorpresas.",
    },
    {
      q: "¿Cómo llegar a la Huasteca Potosina desde CDMX, Monterrey o Guadalajara?",
      a: `En auto, con Ciudad Valles como destino: unas ${enAuto("cdmx", "valles")} desde Ciudad de México (430 km por la autopista de cuota Mex-85 / MEX-70) y unas ${enAuto("monterrey", "valles")} desde Monterrey. Desde Guadalajara se llega vía la ciudad de San Luis Potosí, de donde son 260 km / ${enAuto("san-luis-potosi", "valles")} del tramo final. En autobús hay salidas nocturnas desde la Terminal del Norte de CDMX: ${enAutobus("cdmx", "valles")} a Ciudad Valles y ${enAutobus("cdmx", "xilitla")} si vas directo a Xilitla. En avión, Tampico es el aeropuerto más práctico (${enAuto("tampico", "valles")} en auto a Ciudad Valles, ${enAuto("tampico")} a Xilitla); también puedes volar a la ciudad de San Luis Potosí (${enAuto("san-luis-potosi", "valles")}). Recomendamos manejar de día por la sierra.`,
    },
    {
      // La regla de temporada.ts, con su fecha (7 oct 2026). Decía «seca de
      // noviembre a junio» y «se suspenden actividades»; la política de
      // cancelación dice que con el río crecido se reprograma sin costo.
      q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
      a: `Se puede venir todo el año: salimos todos los días. Del ${fechaInicioTexto("es")} a mayo el agua baja clara, y el turquesa más intenso es de marzo a mayo, que es también cuando más gente hay. De julio a octubre las cascadas van a todo caudal y el agua puede bajar con sedimento; si el río crece, reprogramamos el rafting sin costo. Si buscas agua clara antes de las multitudes de primavera, la mejor temporada para venir es del ${fechaInicioTexto("es")} a diciembre.`,
    },
    {
      q: "¿Es seguro viajar a la Huasteca Potosina?",
      a: `Sí. Es uno de los destinos de naturaleza más visitados del centro-norte de México y recibe viajeros nacionales e internacionales todo el año. Para mayor tranquilidad recomendamos recorrer con guías certificados NOM-09, manejar de día por la sierra y seguir siempre las indicaciones de seguridad en ríos y cascadas. Nuestros grupos son pequeños (máximo ${GRUPO_MAX} personas) y cada tour incluye equipo de seguridad y botiquín.`,
    },
    {
      q: "¿Qué llevar a las cascadas de la Huasteca Potosina?",
      a: "Traje de baño, ropa ligera que se pueda mojar y ensuciar, calzado cerrado para agua o sandalias con sujeción, una muda de cambio, toalla, bloqueador biodegradable (para no dañar los ríos), gorra, repelente, efectivo (muchos sitios no tienen cajero) y una funda impermeable para el celular. Nosotros ponemos el equipo de seguridad y el transporte.",
    },
    {
      q: "¿Hay tours para niños o familias?",
      a: "Sí. Varios recorridos son de dificultad baja y muy aptos para ir en familia, como las Cascadas del Meco, el Paraíso Escalonado (Minas Viejas y Micos) y la Ruta Surrealista de Edward James. El precio es por persona con descuento para niños: alrededor del 70 % del precio adulto para edades de 6 a 10 años y 50 % para menores de 6 años.",
    },
    {
      q: "¿Se puede conocer la Huasteca Potosina en 3 días?",
      a: `Sí. En 3 días cabe lo esencial de la Huasteca: la Cascada de Tamul y Las Pozas de Edward James en Xilitla.${TRES_DIAS_ES} Con 5 o 6 días se va con más calma y sin repetir un solo lugar.`,
    },
    {
      q: "¿Qué es el Sótano de las Golondrinas?",
      a: "Es un abismo vertical natural ubicado en Aquismón, San Luis Potosí, con aproximadamente 376 metros de caída libre y hasta 512 metros de profundidad total. Al amanecer miles de aves (vencejos y loros) salen en espiral, y al atardecer regresan: un espectáculo natural único. Es uno de los tiros verticales más impresionantes del mundo.",
    },
    {
      q: "¿Qué es Las Pozas de Edward James (Xilitla)?",
      a: "Es un jardín escultórico surrealista en Xilitla, Pueblo Mágico, creado por el poeta y mecenas británico Edward James a mediados del siglo XX. Entre la selva y las cascadas hay decenas de estructuras de concreto con formas imposibles, escaleras que no llevan a ningún lado y columnas inacabadas. Es uno de los sitios más enigmáticos y fotografiados de México.",
    },
    {
      q: "¿Cómo reservo y cuánto tengo que pagar por adelantado?",
      a: "Reservas en línea desde la página del tour: eliges fecha y número de personas. Apartas con el 30 % y liquidas el saldo el día del tour, en efectivo o con tarjeta. También puedes pagar el 100 % desde el principio si prefieres llegar sin pendientes.",
    },
    {
      q: "¿Puedo pagar con tarjeta? ¿Es seguro?",
      a: "Sí. Los pagos con tarjeta se procesan con Stripe sobre conexión cifrada, la misma plataforma que usan miles de comercios en México. Nosotros nunca vemos ni guardamos los datos de tu tarjeta. También aceptamos transferencia; escríbenos por WhatsApp si la prefieres.",
    },
    {
      q: "¿Cuál es la política de cancelación?",
      a: "Cancelación gratuita con 48 horas o más de anticipación, con reembolso del 100 % incluido el anticipo. Entre 48 y 24 horas antes se retiene el 50 %. Con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo. Si cancelamos nosotros por clima, seguridad o cierre del paraje, eliges entre reembolso completo o reagendar sin costo." + cancelPropia("es"),
    },
    {
      q: "¿Qué pasa si llueve el día de mi tour?",
      a: `Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, lo primero que te ofrecemos es CAMBIAR DE ACTIVIDAD: hay recorridos que no dependen del río —Las Pozas de Edward James, la Gruta de Xilo, el pueblo— y ese día se puede armar igual. Si ninguno te late, eliges entre reembolso del 100 % o reagendar sin costo.${climaPropio("es")} Nunca sacamos un grupo con el río crecido, y la idea es que la pases bien de todos modos.`,
    },
    {
      q: "¿Hacen tours privados o para grupos grandes?",
      a: `Sí. Los tours regulares operan en grupos pequeños de hasta ${GRUPO_MAX} personas. Para salidas privadas, grupos de más de ${GRUPO_MAX}, empresas o escuelas, habla con el equipo por WhatsApp con tus fechas y el número de personas y te armamos una cotización a la medida.`,
    },
    {
      q: "¿Los guías hablan inglés?",
      a: "Nuestros guías están certificados NOM-09 y en una salida compartida manejan inglés básico. Si quieres uno que lo hable con soltura, márcalo al reservar —la casilla «Quiero guía en inglés», sin costo— y te lo conseguimos; si ese día no lo tenemos, te avisamos antes por WhatsApp.",
    },
  ],

  ctaTitulo: "¿List@ para vivirlo?",
  ctaTexto:
    "Explora nuestros recorridos, a precio final y sin sorpresas, o deja que la IA te recomiende el ideal según los días que tengas y tu grupo.",
  ctaLinks: [
    { href: "/tours", label: "Ver todos los tours", variante: "primaria" },
    { href: "/paquetes", label: "Paquetes con hospedaje", variante: "secundaria" },
    { href: "/recomendar", label: "Recomendador IA", variante: "terciaria" },
  ],
  ctaWhatsappPre: "¿Otra pregunta? WhatsApp",

  cierrePre: "¿Quieres más detalle? Lee nuestras",
  cierreLink: "guías de viaje de la Huasteca Potosina",
  cierreHref: "/blog",
};

// ── Inglés ─────────────────────────────────────────────────────────────────

const EN: FaqContent = {
  // ≤ 60 y ≤ 155 caracteres: el título (62) y la descripción (226) salían
  // cortados en Google.
  metaTitle: "Huasteca Potosina FAQ — Prices, Best Time, Getting There",
  metaDescription:
    "What a guided day tour costs, what's included, the best months for turquoise water, how to get there, safety and what to pack for the Huasteca Potosina.",
  keywords: [
    "huasteca potosina faq",
    "huasteca potosina tour cost",
    "best time to visit huasteca potosina",
    "how to get to huasteca potosina",
    "is huasteca potosina safe",
    "what to pack huasteca potosina",
  ],
  ogTitle: "Huasteca Potosina FAQ — Everything You Ask Before Booking",
  ogDescription:
    "Prices, what's included, the best season for turquoise water, how to get there, safety, and packing advice for the Huasteca Potosina.",
  ogImageAlt: "Frequently asked questions about the Huasteca Potosina",
  twitterTitle: "Huasteca Potosina FAQ — Everything You Ask Before Booking",
  twitterDescription:
    "Prices, best season, how to get there, safety, and packing advice for Mexico's waterfall country.",

  inLanguage: "en-US",

  breadcrumbHome: "Home",
  breadcrumbActual: "FAQ",

  heroEyebrow: "Before you travel",
  heroH1: "Frequently asked questions about the Huasteca Potosina",
  heroIntro:
    "Prices, what the tours include, the best season, how to get here, safety, and practical advice. If something is still unclear, message us on WhatsApp — we answer in under an hour, every day of the year.",

  faqs: [
    {
      q: "How much does a tour in the Huasteca Potosina cost?",
      a: `Our guided day tours run between ${fmtMoney(PRECIO_MIN_N, "en")} and ${fmtMoney(PRECIO_MAX_N, "en")} per person depending on the route, and that is the final price. The most popular ones: the Surrealist Route (Edward James) at ${fmtMoney(precioTour("tour-edward-james"), "en")}, the Tamul Expedition at ${fmtMoney(precioTour("tour-tamul"), "en")}, and Cascadas del Meco at ${fmtMoney(precioTour("tour-meco"), "en")}. The RZR ride around Xilitla is priced per vehicle, starting at ${fmtMoney(precioTour("tour-rzr-xilitla"), "en")} per unit.${GRUPO_NOTA_EN} If you'd rather stay several days with lodging included, our packages go from ${fmtMoney(PAQ_MIN_N, "en")} (${PAQ_DIAS_MIN} days) to ${fmtMoney(PAQ_MAX_N, "en")} (${PAQ_DIAS_MAX} days) ${PAQ_UNIDAD_EN}.${PAQ_NOTA_EN}`,
    },
    {
      q: "What's included in the tours?",
      a: "Depending on the tour: round-trip transportation from your lodging in Xilitla or Ciudad Valles, breakfast with regional dishes, entrance fees to every park and attraction on the route, a NOM-09 SECTUR certified guide, safety gear, photos and video of the day, and a first-aid kit. The price you see is the final price — no add-ons at the trailhead.",
    },
    {
      q: "How do I get to the Huasteca Potosina from the United States?",
      a: `Fly into Tampico (TAM): it's the closest airport, about ${enAuto("tampico", "valles", true)} by road to Ciudad Valles and ${enAuto("tampico", "xilitla", true)} to Xilitla. Mexico City (MEX) is the other common route — about ${enAuto("cdmx", "valles", true)} by road — and San Luis Potosí (SLP) is around ${enAuto("san-luis-potosi", "valles", true)}. You do not need to rent a car: we run private round-trip transfers priced per vehicle for up to 12 passengers, from ${fmtMoney(trasladoBase("tampico"), "en")} from Tampico, ${fmtMoney(trasladoBase("san-luis-potosi"), "en")} from San Luis Potosí and ${fmtMoney(trasladoBase("cdmx"), "en")} from Mexico City. If you do drive yourself, drive the mountain stretch in daylight.`,
    },
    {
      q: "How do I get there from Mexico City or Monterrey?",
      a: `By car, with Ciudad Valles as your destination: about ${enAuto("cdmx", "valles", true)} from Mexico City — 267 miles (430 km) on the Mex-85 / MEX-70 toll highway — and about ${enAuto("monterrey", "valles", true)} from Monterrey. By bus, there are overnight departures from Mexico City's Terminal del Norte: roughly ${enAutobus("cdmx", "valles", true)} to Ciudad Valles, or ${enAutobus("cdmx", "xilitla", true)} if you ride straight through to Xilitla. By air, Tampico is the most practical airport (about ${enAuto("tampico", "valles", true)} by road to Ciudad Valles, ${enAuto("tampico", "xilitla", true)} to Xilitla); San Luis Potosí is another option at about ${enAuto("san-luis-potosi", "valles", true)}. Drive the mountain stretches in daylight.`,
    },
    {
      q: "When is the best time to visit the Huasteca Potosina?",
      a: `You can come any time of year: we run tours every day. From ${fechaInicioTexto("en")} through May the water runs clear, and the turquoise is at its most intense from March to May, which is also the busiest time. From July to October the waterfalls run at full force and the water can carry sediment; if the river rises, we reschedule rafting at no cost. For clear water ahead of the spring crowds, the best season to visit is ${fechaInicioTexto("en")} through December.`,
    },
    {
      q: "Is the Huasteca Potosina safe to travel to?",
      a: `Yes. It is one of the most visited nature destinations in central-northern Mexico and receives Mexican and international travelers year-round. For extra peace of mind we recommend traveling with NOM-09 certified guides, driving the mountain roads during daylight, and always following the safety instructions at rivers and waterfalls. Our groups are small (up to ${GRUPO_MAX} people) and every tour includes safety gear and a first-aid kit.`,
    },
    {
      q: "What should I pack for the waterfalls?",
      a: "A swimsuit, light clothes you don't mind getting wet and muddy, closed-toe water shoes or strapped sandals, a change of clothes, a towel, biodegradable sunscreen (regular sunscreen damages the rivers), a hat, insect repellent, cash (many sites have no ATM) and a waterproof pouch for your phone. We provide the safety gear and the transportation.",
    },
    {
      q: "Are there tours for kids and families?",
      a: "Yes. Several routes are low difficulty and work very well for families — Cascadas del Meco, the Stepped Paradise (Minas Viejas and Micos) and the Edward James Surrealist Route. Pricing is per person with a children's discount: about 70% of the adult price for ages 6 to 10, and 50% for children under 6.",
    },
    {
      q: "Can I see the Huasteca Potosina in 3 days?",
      a: `Yes. Three days fit the essentials: the Tamul waterfall and Edward James' Las Pozas in Xilitla.${TRES_DIAS_EN} With 5 or 6 days you go at a calmer pace and never repeat a place.`,
    },
    {
      q: "What is the Sótano de las Golondrinas?",
      a: "It's a natural vertical abyss in Aquismón, San Luis Potosí, with roughly 1,234 feet (376 m) of free fall and up to 1,680 feet (512 m) of total depth. At dawn thousands of birds — swifts and parakeets — spiral out of the opening, and at dusk they drop back in. It's one of the most striking vertical shafts on Earth.",
    },
    {
      q: "What is Las Pozas (Edward James' garden in Xilitla)?",
      a: "It's a surrealist sculpture garden in Xilitla, a designated Pueblo Mágico, built by the British poet and art patron Edward James in the mid-20th century. Set between jungle and waterfalls, it holds dozens of concrete structures with impossible shapes, staircases that lead nowhere and columns left deliberately unfinished. James was the patron of Dalí and Magritte, and he never lived in the structures he built here.",
    },
    {
      q: "How do I book, and how much do I pay up front?",
      a: "You book online from the tour page: pick a date and the number of travelers. A 30% deposit holds your spot and the balance is due on the day of the tour, in cash or by card. You can also pay 100% up front if you'd rather arrive with nothing pending.",
    },
    {
      q: "Can I pay by card? Is it secure?",
      a: "Yes. Card payments are processed by Stripe over an encrypted connection — the same platform used by thousands of businesses in Mexico. We never see or store your card details. Apple Pay and Google Pay also work at checkout. Prices are charged in Mexican pesos (MXN), so your bank may apply its own exchange rate.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Free cancellation 48 hours or more before the tour, with a 100% refund including the deposit. Between 48 and 24 hours before, 50% is retained. Under 24 hours there is no refund, but you can reschedule once at no cost. If we are the ones who cancel — weather, safety, or a site closure — you choose between a full refund or rescheduling at no cost." + cancelPropia("en"),
    },
    {
      q: "What happens if it rains on the day of my tour?",
      a: `We run in light rain: the Huasteca is jungle, and the waterfalls are at their most spectacular with water coming down. If there's an electrical storm, a weather alert, or the river isn't in safe condition, the first thing we offer is to SWITCH THE ACTIVITY: some tours don't depend on the river — Las Pozas de Edward James, the Xilo Cave, the town itself — and the day still works. If none of them appeals, you choose between a 100% refund or rescheduling at no cost.${climaPropio("en")} We never take a group out on a swollen river, and the point is that you have a good day anyway.`,
    },
    {
      q: "Do you run private tours or tours for large groups?",
      a: `Yes. Regular tours run in small groups of up to ${GRUPO_MAX} people. For private departures, groups larger than ${GRUPO_MAX}, companies or schools, talk to the team on WhatsApp with your dates and headcount and we'll put together a custom quote.`,
    },
    {
      q: "Do the guides speak English?",
      a: "Our guides are NOM-09 certified and handle basic English on a shared departure. If you want one who speaks it fluently, tick «I'd like an English-speaking guide» when you book — it's free — and we'll arrange it; if we don't have one that day, we'll tell you on WhatsApp beforehand.",
    },
  ],

  ctaTitulo: "Ready to see it for yourself?",
  ctaTexto:
    "Browse the day tours — the price you see is the final price — or take the multi-day packages that already include lodging, breakfasts and every entrance fee.",
  ctaLinks: [
    { href: "/en/tours", label: "See all tours", variante: "primaria" },
    { href: "/en/paquetes", label: "Packages with lodging", variante: "secundaria" },
    { href: "/en/info-practica", label: "Travel guide", variante: "terciaria" },
  ],
  ctaWhatsappPre: "Still have a question? WhatsApp",

  cierrePre: "Want more detail? Browse the",
  cierreLink: "destination guides for the Huasteca Potosina",
  cierreHref: "/en/destinos",
};

export function getFaq(locale: Locale): FaqContent {
  return locale === "en" ? EN : ES;
}
