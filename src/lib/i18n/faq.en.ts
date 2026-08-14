import type { Locale } from "./config";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { TRASLADOS } from "@/lib/traslados";
import { formatMXN } from "@/lib/tourBooking";
import { fmtMoney } from "./format";

/**
 * Traducción de /preguntas-frecuentes.
 *
 * ⚠️ Ningún precio se escribe a mano. Se leen del catálogo igual que hacía la
 * página en español: esta página llegó a publicar $1,300 / $1,450 / $1,600
 * mientras el catálogo decía $1,400 / $1,550 / $1,700, y un cliente que
 * comparaba dos páginas del mismo sitio encontraba la contradicción en un
 * minuto. Traducirla a mano habría abierto ese mismo hueco en inglés.
 *
 * ⚠️ CDMX → Ciudad Valles son **6.5 a 7 horas** en auto (430 km). Es el dato de
 * Manolo, que hace la carretera, y el 14 ago 2026 se puso en TODAS las páginas
 * a la vez. Ninguna de las dos cifras que publicaba el sitio era correcta: esta
 * página decía 9–10 h (que es el tiempo del AUTOBÚS, colado en la fila del
 * coche) y la guía práctica decía 5.5 h. Lo de "9 horas desde Guadalajara" no
 * tenía ninguna fuente — `ciudadesOrigen.ts` había dejado fuera esa ciudad a
 * propósito por eso mismo — y se sustituyó por el tramo que sí está medido.
 *
 * OJO al comparar: los 339 km / ~5.5–6 h de `ciudadesOrigen.ts` y `paquetes.ts`
 * son CDMX → **Xilitla**, otro destino, y esos siguen siendo correctos.
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

const preciosPorPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo").map((t) => t.precio);
const PRECIO_MIN_N = Math.min(...preciosPorPersona);
const PRECIO_MAX_N = Math.max(...preciosPorPersona);

const preciosPaquete = PAQUETES_DB.map((p) => p.precio);
const PAQ_MIN_N = Math.min(...preciosPaquete);
const PAQ_MAX_N = Math.max(...preciosPaquete);
const PAQ_DIAS_MIN = Math.min(...PAQUETES_DB.map((p) => p.dias));
const PAQ_DIAS_MAX = Math.max(...PAQUETES_DB.map((p) => p.dias));

/** Tarifa de grupo chico (1–4 pax) de una ruta de traslado, para la FAQ inglesa. */
const trasladoBase = (slug: string) =>
  TRASLADOS.find((t) => t.slug === slug)?.tarifas[0]?.precio ?? 0;

// ── Español: EL TEXTO NO CAMBIA ────────────────────────────────────────────
// Es copia literal de la página anterior, con los mismos precios calculados.

const ES: FaqContent = {
  metaTitle: "Preguntas Frecuentes — Tours Huasteca Potosina 2026",
  metaDescription:
    "Todo lo que necesitas saber antes de visitar la Huasteca Potosina: cuánto cuesta, qué incluyen los tours, mejor época, cómo llegar desde CDMX, Monterrey o Guadalajara, seguridad, qué llevar y más.",
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
      a: `Nuestros tours guiados de un día cuestan entre ${formatMXN(PRECIO_MIN_N)} y ${formatMXN(PRECIO_MAX_N)} MXN por persona, según el recorrido, y son todo incluido. Los más populares: Ruta Surrealista (Edward James) ${formatMXN(precioTour("tour-edward-james"))}, Expedición Tamul ${formatMXN(precioTour("tour-tamul"))}, Cascadas del Meco ${formatMXN(precioTour("tour-meco"))}. El Recorrido en RZR por Xilitla se cobra por vehículo, desde ${formatMXN(precioTour("tour-rzr-xilitla"))} MXN por unidad. Si prefieres varios días con hospedaje, los paquetes van de ${formatMXN(PAQ_MIN_N)} (${PAQ_DIAS_MIN} días) a ${formatMXN(PAQ_MAX_N)} MXN (${PAQ_DIAS_MAX} días) por pareja.`,
    },
    {
      q: "¿Qué incluyen los tours?",
      a: "Según el tour: traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, desayuno con platillos típicos de la región, entradas a todos los parques y atracciones, guía certificado NOM-09 SECTUR, equipo de seguridad, fotografías y video del recorrido, y botiquín de primeros auxilios. El precio que ves es el precio final por persona, sin sorpresas.",
    },
    {
      q: "¿Cómo llegar a la Huasteca Potosina desde CDMX, Monterrey o Guadalajara?",
      a: "En auto, con Ciudad Valles como destino: unas 6.5 a 7 horas desde Ciudad de México (430 km por la autopista de cuota Mex-85 / MEX-70) y unas 6 horas desde Monterrey. Desde Guadalajara se llega vía la ciudad de San Luis Potosí, de donde son 260 km / ~3 horas del tramo final. En autobús hay salidas nocturnas desde la Terminal del Norte de CDMX: ~8 horas a Ciudad Valles y ~9–10 horas si vas directo a Xilitla. En avión, Tampico es el aeropuerto más práctico (~2 h en auto a Ciudad Valles, ~2.5 h a Xilitla); también puedes volar a la ciudad de San Luis Potosí (~3 h). Recomendamos manejar de día por la sierra.",
    },
    {
      q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
      a: "Para ver el agua en su tono turquesa más intenso, la mejor temporada es la seca: aproximadamente de noviembre a junio, con su punto más claro entre marzo y mayo. Durante la temporada de lluvias (julio a octubre) el caudal de las cascadas aumenta y es muy fotogénico, pero el agua puede tornarse marrón y algunas actividades acuáticas se suspenden por seguridad. Salimos todos los días del año.",
    },
    {
      q: "¿Es seguro viajar a la Huasteca Potosina?",
      a: "Sí. Es uno de los destinos de naturaleza más visitados del centro-norte de México y recibe viajeros nacionales e internacionales todo el año. Para mayor tranquilidad recomendamos recorrer con guías certificados NOM-09, manejar de día por la sierra y seguir siempre las indicaciones de seguridad en ríos y cascadas. Nuestros grupos son pequeños (máximo 6 a 12 personas) y cada tour incluye equipo de seguridad y botiquín.",
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
      a: "Sí. Con 3 días bien organizados se cubre lo esencial: la Cascada de Tamul, Las Pozas de Edward James en Xilitla y un día de cascadas turquesa (Micos, Minas Viejas o el Puente de Dios en Tamasopo). Nuestro Paquete Aventura de 3 días / 2 noches está diseñado justo para eso. Con 4 o 5 días se recorre con más calma y se incluyen más destinos.",
    },
    {
      q: "¿Qué es el Sótano de las Golondrinas?",
      a: "Es un abismo vertical natural ubicado en Aquismón, San Luis Potosí, con aproximadamente 376 metros de caída libre y hasta 512 metros de profundidad total. Al amanecer miles de aves (vencejos y pericos) salen en espiral, y al atardecer regresan: un espectáculo natural único. Es uno de los tiros verticales más impresionantes del mundo.",
    },
    {
      q: "¿Qué es Las Pozas de Edward James (Xilitla)?",
      a: "Es un jardín escultórico surrealista en Xilitla, Pueblo Mágico, creado por el poeta y mecenas británico Edward James a mediados del siglo XX. Entre la selva y las cascadas hay decenas de estructuras de concreto con formas imposibles, escaleras que no llevan a ningún lado y columnas inacabadas. Es uno de los sitios más enigmáticos y fotografiados de México.",
    },
    {
      q: "¿Cómo reservo y cuánto tengo que pagar por adelantado?",
      a: "Reservas en línea desde la página del tour: eliges fecha y número de personas, y apartas con un anticipo del 30 %. El saldo lo liquidas el día del tour, en efectivo o con tarjeta. También puedes pagar el 100 % al reservar si prefieres llegar sin pendientes.",
    },
    {
      q: "¿Puedo pagar con tarjeta? ¿Es seguro?",
      a: "Sí. Los pagos con tarjeta se procesan con Stripe sobre conexión cifrada, la misma plataforma que usan miles de comercios en México. Nosotros nunca vemos ni guardamos los datos de tu tarjeta. También aceptamos transferencia; escríbenos por WhatsApp si la prefieres.",
    },
    {
      q: "¿Cuál es la política de cancelación?",
      a: "Cancelación gratuita con 48 horas o más de anticipación, con reembolso del 100 % incluido el anticipo. Entre 48 y 24 horas antes se retiene el 50 %. Con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo. Si cancelamos nosotros por clima, seguridad o cierre del paraje, eliges entre reembolso completo o reagendar sin costo.",
    },
    {
      q: "¿Qué pasa si llueve el día de mi tour?",
      a: "Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, cancelamos nosotros y eliges entre reembolso del 100 % o reagendar sin costo. Nunca sacamos un grupo con el río crecido.",
    },
    {
      q: "¿Hacen tours privados o para grupos grandes?",
      a: "Sí. Los tours regulares operan en grupos pequeños de 6 a 12 personas. Para salidas privadas, grupos de más de 12, empresas o escuelas, escríbenos por WhatsApp con tus fechas y el número de personas y te armamos una cotización a la medida.",
    },
    {
      q: "¿Los guías hablan inglés?",
      a: "Nuestros guías están certificados NOM-09 y tenemos guías completamente bilingües disponibles: pídelo al reservar y te asignamos uno.",
    },
  ],

  ctaTitulo: "¿List@ para vivirlo?",
  ctaTexto:
    "Explora nuestros recorridos con todo incluido o deja que la IA te recomiende el ideal según los días que tengas y tu grupo.",
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
  metaTitle: "Huasteca Potosina FAQ — Prices, Best Time to Go, Getting There",
  metaDescription:
    "Straight answers before you book a trip to Mexico's waterfall country: what a guided day tour costs, what's included, the best months for turquoise water, how to get there from Tampico or Mexico City, safety, and what to pack.",
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
      a: `Our guided day tours run between ${fmtMoney(PRECIO_MIN_N, "en")} and ${fmtMoney(PRECIO_MAX_N, "en")} per person depending on the route, and they are all-inclusive. The most popular ones: the Surrealist Route (Edward James) at ${fmtMoney(precioTour("tour-edward-james"), "en")}, the Tamul Expedition at ${fmtMoney(precioTour("tour-tamul"), "en")}, and Cascadas del Meco at ${fmtMoney(precioTour("tour-meco"), "en")}. The RZR ride around Xilitla is priced per vehicle, starting at ${fmtMoney(precioTour("tour-rzr-xilitla"), "en")} per unit. If you'd rather stay several days with lodging included, our packages go from ${fmtMoney(PAQ_MIN_N, "en")} (${PAQ_DIAS_MIN} days) to ${fmtMoney(PAQ_MAX_N, "en")} (${PAQ_DIAS_MAX} days) — and that price is for two people, not per person.`,
    },
    {
      q: "What's included in the tours?",
      a: "Depending on the tour: round-trip transportation from your lodging in Xilitla or Ciudad Valles, breakfast with regional dishes, entrance fees to every park and attraction on the route, a NOM-09 SECTUR certified guide, safety gear, photos and video of the day, and a first-aid kit. The price you see is the final price per person — no add-ons at the trailhead.",
    },
    {
      q: "How do I get to the Huasteca Potosina from the United States?",
      a: `Fly into Tampico (TAM): it's the closest airport, about a 2.5-hour drive to Ciudad Valles and roughly the same to Xilitla. Mexico City (MEX) is the other common route — about 6.5 to 7 hours by road — and San Luis Potosí (SLP) is around 3.5 hours. You do not need to rent a car: we run private round-trip transfers priced per vehicle for up to 12 passengers, from ${fmtMoney(trasladoBase("tampico"), "en")} from Tampico, ${fmtMoney(trasladoBase("san-luis-potosi"), "en")} from San Luis Potosí and ${fmtMoney(trasladoBase("cdmx"), "en")} from Mexico City. If you do drive yourself, drive the mountain stretch in daylight.`,
    },
    {
      q: "How do I get there from Mexico City or Monterrey?",
      a: "By car, with Ciudad Valles as your destination: about 6.5 to 7 hours from Mexico City — 267 miles (430 km) on the Mex-85 / MEX-70 toll highway — and about 6 hours from Monterrey. By bus, there are overnight departures from Mexico City's Terminal del Norte: roughly 8 hours to Ciudad Valles, or 9–10 if you ride straight through to Xilitla. By air, Tampico is the most practical airport (about a 2-hour drive to Ciudad Valles, 2.5 to Xilitla); San Luis Potosí is another option at about 3 hours. Drive the mountain stretches in daylight.",
    },
    {
      q: "When is the best time to visit the Huasteca Potosina?",
      a: "For water at its most intense turquoise, come in the dry season: roughly November through June, at its clearest between March and May. During the rainy season (July to October) the waterfalls carry far more volume and are dramatic to photograph, but the water can turn brown and some river activities are suspended for safety. We run tours every day of the year.",
    },
    {
      q: "Is the Huasteca Potosina safe to travel to?",
      a: "Yes. It is one of the most visited nature destinations in central-northern Mexico and receives Mexican and international travelers year-round. For extra peace of mind we recommend traveling with NOM-09 certified guides, driving the mountain roads during daylight, and always following the safety instructions at rivers and waterfalls. Our groups are small (6 to 12 people maximum) and every tour includes safety gear and a first-aid kit.",
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
      a: "Yes. Three well-organized days cover the essentials: the Tamul waterfall, Edward James' Las Pozas in Xilitla, and a day of turquoise waterfalls (Micos, Minas Viejas or Puente de Dios in Tamasopo). Our 3-day / 2-night Adventure Package is built for exactly that. With 4 or 5 days you go at a calmer pace and cover more ground.",
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
      a: "You book online from the tour page: pick a date and the number of travelers, and hold your spot with a 30% deposit. The balance is due on the day of the tour, in cash or by card. You can also pay 100% at booking if you'd rather arrive with nothing pending.",
    },
    {
      q: "Can I pay by card? Is it secure?",
      a: "Yes. Card payments are processed by Stripe over an encrypted connection — the same platform used by thousands of businesses in Mexico. We never see or store your card details. Apple Pay and Google Pay also work at checkout. Prices are charged in Mexican pesos (MXN), so your bank may apply its own exchange rate.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Free cancellation 48 hours or more before the tour, with a 100% refund including the deposit. Between 48 and 24 hours before, 50% is retained. Under 24 hours there is no refund, but you can reschedule once at no cost. If we are the ones who cancel — weather, safety, or a site closure — you choose between a full refund or rescheduling at no cost.",
    },
    {
      q: "What happens if it rains on the day of my tour?",
      a: "We run in light rain: the Huasteca is jungle, and the waterfalls are at their most spectacular with water coming down. If there's an electrical storm, a weather alert, or the river isn't in safe condition, we cancel and you choose between a 100% refund or rescheduling at no cost. We never take a group out on a swollen river.",
    },
    {
      q: "Do you run private tours or tours for large groups?",
      a: "Yes. Regular tours run in small groups of 6 to 12 people. For private departures, groups larger than 12, companies or schools, message us on WhatsApp with your dates and headcount and we'll put together a custom quote.",
    },
    {
      q: "Do the guides speak English?",
      a: "Our guides are NOM-09 certified and we have fully bilingual guides available — ask for one when you book and we'll assign them to your tour.",
    },
  ],

  ctaTitulo: "Ready to see it for yourself?",
  ctaTexto:
    "Browse the all-inclusive day tours, or take the multi-day packages that already include lodging, breakfasts and every entrance fee.",
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
