import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { TOURS_DB, tourDurRange, tourDurTexto } from "@/lib/tours";
import { PAQUETES_DB, type Paquete } from "@/lib/paquetes";
import { waLink } from "@/lib/whatsapp";
import { asLocale, localePath, localeUrl, buildAlternates, SITE, type Locale } from "@/lib/i18n/config";
import { localizeTour } from "@/lib/i18n/localize";
import { getLocalizedPaquetes } from "@/lib/i18n/paquetes.en";

// Formato de importe. El agrupado de miles es el mismo en es-MX y en-US para
// estas cifras, así que se usa uno solo: lo que cambia en inglés no es el
// número, es que hay que DECIR que son pesos mexicanos.
const money = (n: number) => `$${n.toLocaleString("es-MX")}`;

const DIF_LABEL_ES: Record<string, string> = { baja: "Fácil", media: "Moderado", alta: "Avanzado" };
const DIF_LABEL_EN: Record<string, string> = { baja: "Easy", media: "Moderate", alta: "Advanced" };

// El rango se calcula del catálogo, no se escribe a mano: el texto decía
// "$1,300 a $1,850" mientras la tabla de esta misma página llegaba a $1,950
// (rafting) y bajaba a $900 (Travesía del Café).
const preciosPorPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo").map((t) => t.precio);
const RANGO_MIN = `$${Math.min(...preciosPorPersona).toLocaleString("es-MX")}`;
const RANGO_MAX = `$${Math.max(...preciosPorPersona).toLocaleString("es-MX")}`;
// Derivado del catálogo: estos importes estaban escritos a mano en la respuesta
// de abajo y se quedaron viejos en cuanto cambió un paquete.
const preciosPaquete = PAQUETES_DB.map((p) => p.precio);
const PAQ_MIN = `$${Math.min(...preciosPaquete).toLocaleString("es-MX")}`;
const PAQ_MAX = `$${Math.max(...preciosPaquete).toLocaleString("es-MX")}`;
const RZR = TOURS_DB.find((t) => t.precioUnidad === "vehiculo");
const RZR_DESDE = `$${(RZR?.precio ?? 0).toLocaleString("es-MX")}`;
// Techo real del RZR: el vehículo más caro en la ruta más larga. Sale de
// `flota[].precios`, que es donde vive de verdad la tarifa por unidad.
const RZR_PRECIOS = (RZR?.flota ?? []).flatMap((v) => v.precios);
const RZR_MIN = RZR_PRECIOS.length ? Math.min(...RZR_PRECIOS) : (RZR?.precio ?? 0);
const RZR_MAX = RZR_PRECIOS.length ? Math.max(...RZR_PRECIOS) : (RZR?.precio ?? 0);

// Duración y conteo de los recorridos de un día: para poder decir el dato en
// prosa (una insignia de Tailwind con "9h" dentro no se puede citar).
const N_TOURS_DIA = TOURS_DB.length;
const N_TOURS_PERSONA = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo").length;
const HORAS = TOURS_DB.flatMap((t) => tourDurRange(t));
const HRS_MIN = Math.min(...HORAS);
const HRS_MAX = Math.max(...HORAS);

// Días que cubren los paquetes: también del catálogo, y sin la cifra escrita
// en el comentario — la línea pasó de 3 paquetes de 3-5 días a 5 de 3-6.
const DIAS_MIN = Math.min(...PAQUETES_DB.map((p) => p.dias));
const DIAS_MAX = Math.max(...PAQUETES_DB.map((p) => p.dias));
// Cuántos días de recorrido trae un paquete. NO se cuenta `p.tours.length`:
// en «Tu Huasteca» ese campo son dos líneas de explicación ("Cuatro recorridos
// completos, a elegir de una lista de seis"), no la lista de tours, así que
// contarlo diría "2 tours" de un paquete que trae cuatro. El itinerario sí es
// fiable: los cinco paquetes cierran con un único día de tipo `salida`.
const diasDeTour = (p: Paquete) => p.itinerario.filter((d) => d.tipo !== "salida").length;

// Tours con formato privado: el dato ya vivía en el catálogo sin publicarse.
const PRIVADOS = TOURS_DB.filter((t) => t.privateAvailable && t.privateMinPrice);
const PRIVADO_MIN = `$${Math.min(...PRIVADOS.map((t) => t.privateMinPrice!)).toLocaleString("es-MX")}`;
const PRIVADO_MAX = `$${Math.max(...PRIVADOS.map((t) => t.privateMinPrice!)).toLocaleString("es-MX")}`;
// Cuántos son, dicho en cada idioma. Era una constante de módulo escrita solo
// en español y se colaba tal cual dentro de la respuesta inglesa ("5 de
// nuestros recorridos can be run privately...").
const PRIVADOS_CUANTOS = (locale: Locale) =>
  locale === "en" ? `${PRIVADOS.length} of our tours` : `${PRIVADOS.length} de nuestros recorridos`;

/**
 * Todo el texto de /precios en los dos idiomas, en un solo sitio.
 *
 * Mismo patrón que `getPaquetesUI` (paquetes.en.ts): la página es UNA y el
 * locale llega por el header `x-locale` del middleware; /en/precios solo
 * reexporta este módulo. Ninguna cifra se escribe aquí: todas entran ya
 * calculadas desde TOURS_DB y PAQUETES_DB.
 *
 * Las respuestas de las preguntas frecuentes son AUTOCONTENIDAS a propósito:
 * cada una se puede citar sola, sin haber leído el resto de la página. Se
 * reutilizan tal cual en el FAQPage del JSON-LD.
 */
function preciosUI(locale: Locale) {
  const en = locale === "en";
  const paquetes = getLocalizedPaquetes(locale);
  /**
   * El paquete más corto, para la consulta "cuánto cuesta un viaje de N días".
   *
   * Antes esto buscaba `p.dias === 3` y devolvía el paquete de 3 días de la
   * escalera por duración. La línea se rehízo: ahora son cinco paquetes
   * ordenados por QUIÉN viaja, y el más corto es el de Luna de Miel. Contestar
   * "¿cuánto cuesta un viaje de 3 días?" con un paquete de luna de miel, a
   * secas, desorienta: esa consulta la teclea cualquiera, no una pareja de
   * recién casados. Así que la respuesta dice las tres cosas —que es el más
   * corto, para quién está hecho, y qué hay al lado— y todas salen del
   * catálogo, ninguna escrita a mano.
   */
  const porDias = [...paquetes].sort((a, b) => a.dias - b.dias || a.precio - b.precio);
  const paqCorto: Paquete | undefined = porDias[0];
  const otros = porDias.slice(1);
  // Un paquete se cotiza por pareja; el precio por persona es la mitad y es la
  // cifra con la que la gente compara contra un tour suelto.
  const paqCortoPorPersona = paqCorto ? money(Math.round(paqCorto.precio / 2)) : "";
  // Para quién está hecho: sale de `perfiles`, no de una etiqueta escrita aquí.
  const paqCortoPerfiles = (paqCorto?.perfiles ?? [])
    .slice(0, 2)
    .map((x) => x.toLowerCase())
    .join(en ? " and " : " y ");
  // La frase que impide leer el más corto como si fuera la oferta general.
  const otrosDias = otros.map((x) => x.dias);
  const otrosPrecios = otros.map((x) => x.precio);
  const otrosTexto = otros.length
    ? en
      ? ` The rest of the packages are not sorted by length but by who is traveling (${otros.map((x) => x.nombre).join(", ")}): ${Math.min(...otrosDias)} to ${Math.max(...otrosDias)} days, from ${money(Math.min(...otrosPrecios))} to ${money(Math.max(...otrosPrecios))} MXN per couple.`
      : ` Los demás paquetes no se ordenan por duración sino por quién viaja (${otros.map((x) => x.nombre).join(", ")}): de ${Math.min(...otrosDias)} a ${Math.max(...otrosDias)} días y de ${money(Math.min(...otrosPrecios))} a ${money(Math.max(...otrosPrecios))} MXN por pareja.`
    : "";
  // Nombre corto del recorrido por vehículo, del catálogo (ya localizado): el
  // nombre completo lleva un subtítulo tras el guion largo que no cabe en prosa.
  const rzrNombre = RZR ? localizeTour(RZR, locale).nombre.split(" — ")[0] : "";

  const faqs: { q: string; a: string }[] = en
    ? [
        {
          q: "How much does it cost to visit the Huasteca Potosina?",
          a: `It depends on how many days you stay. A guided all-inclusive day tour in the Huasteca Potosina costs between ${RANGO_MIN} and ${RANGO_MAX} MXN per person (Mexican pesos), with transport, breakfast, entrance fees and a certified guide included. A full ${DIAS_MIN}-to-${DIAS_MAX}-day trip with hotel and tours runs from ${PAQ_MIN} to ${PAQ_MAX} MXN per couple with our packages. On top of that, budget how you get to the region (a bus from Mexico City is roughly $800–$1,100 MXN each way) plus your lunches and dinners, which are not included.`,
        },
        ...(paqCorto
          ? [
              {
                q: `How much does a ${paqCorto.dias}-day trip to the Huasteca Potosina with hotel cost?`,
                a: `The shortest trip with hotel we run is ${paqCorto.duracion}: the ${paqCorto.nombre} package, built for ${paqCortoPerfiles}, at ${money(paqCorto.precio)} MXN per couple — ${paqCortoPorPersona} MXN per person. It includes ${paqCorto.noches} nights at Hotel Paraíso Encantado in Xilitla, buffet breakfast on tour days, ${diasDeTour(paqCorto)} days of guided touring, transport from the hotel to each tour and back, entrance fees, NOM-09 SECTUR certified guides, safety gear and travel insurance. It does not include getting to Xilitla, or lunches and dinners.${otrosTexto}`,
              },
            ]
          : []),
        {
          q: "Are tour prices per person?",
          a: `Yes. Every day tour in the Huasteca Potosina is priced per person in Mexican pesos, except the RZR Off-Road Ride in Xilitla, which is priced per vehicle (from ${RZR_DESDE} MXN per unit, seating 2 to 6 people depending on the model, up to ${money(RZR_MAX)} MXN for the largest vehicle on the longest route). Packages with hotel are quoted per couple (2 people).`,
        },
        {
          q: "What is included in the price, and what is not?",
          a: "The price you see is the final price. It includes round-trip transport from your hotel in Xilitla or Ciudad Valles, a regional breakfast, every entrance fee to parks and attractions, a NOM-09 SECTUR certified local guide, safety gear, photos and video of the trip, and a first-aid kit. It does not include getting to the Huasteca (bus or flight to Ciudad Valles or Xilitla), lunches and dinners beyond breakfast, tips, or souvenirs and personal spending. There are no surprise charges on arrival.",
        },
        {
          q: "How much do you pay when you book?",
          a: "From 2 days on, a 30% deposit holds your booking and you settle the rest on the day of the tour, in cash or by card; a single one-day tour is paid in full when you book. You can also pay 100% up front if you prefer. Cancellation is free up to 48 hours before the tour.",
        },
        {
          q: "Is there a discount for children?",
          a: "Yes. Children aged 6 to 10 pay around 70% of the adult price, and children under 6 pay 50%. The discount is applied automatically when you book online.",
        },
        {
          q: "Can I pay by card, or do I have to pay cash?",
          a: "You can book and pay online by credit or debit card securely, or hold your spot over WhatsApp. We do recommend carrying some cash for souvenirs and local food, because several spots in the mountains have no ATMs.",
        },
        {
          q: "How much does a private tour cost?",
          a: `${PRIVADOS_CUANTOS(locale)} can be run privately for your group, from ${PRIVADO_MIN} MXN for the whole group (the most expensive one reaches ${PRIVADO_MAX} MXN). The final price depends on the tour and the number of travelers — message us on WhatsApp and we'll quote you the same day.`,
        },
      ]
    : [
        {
          q: "¿Cuánto cuesta ir a la Huasteca Potosina?",
          a: `Depende de los días y del plan. Un tour guiado de un día todo incluido en la Huasteca Potosina cuesta entre ${RANGO_MIN} y ${RANGO_MAX} MXN por persona (transporte, desayuno, entradas y guía certificado incluidos). Un viaje completo de ${DIAS_MIN} a ${DIAS_MAX} días con hotel y tours va de ${PAQ_MIN} a ${PAQ_MAX} MXN por pareja con nuestros paquetes. A eso súmale cómo llegues a la región (autobús desde CDMX ~$800–$1,100 por trayecto) y tus comidas y cenas, que no van incluidas.`,
        },
        ...(paqCorto
          ? [
              {
                q: `¿Cuánto cuesta un viaje de ${paqCorto.dias} días a la Huasteca Potosina con hotel?`,
                a: `El viaje con hotel más corto que armamos es de ${paqCorto.duracion}: el paquete ${paqCorto.nombre}, hecho para ${paqCortoPerfiles}, en ${money(paqCorto.precio)} MXN por pareja —${paqCortoPorPersona} MXN por persona—. Incluye ${paqCorto.noches} noches en el Hotel Paraíso Encantado de Xilitla, desayuno buffet los días de tour, ${diasDeTour(paqCorto)} días de recorrido guiado, transporte del hotel al inicio de cada tour y de regreso, entradas, guías certificados NOM-09 SECTUR, equipo de seguridad y seguro de viaje. No incluye el traslado hasta Xilitla ni las comidas y cenas.${otrosTexto}`,
              },
            ]
          : []),
        {
          q: "¿Los precios de los tours son por persona?",
          a: `Sí, todos los tours de un día se cobran por persona, excepto el Recorrido en RZR por Xilitla, que se cobra por vehículo (desde ${RZR_DESDE} MXN por unidad, para 2 a 6 ocupantes según el modelo, y hasta ${money(RZR_MAX)} MXN en el vehículo más grande de la ruta más larga). Los paquetes con hotel se cotizan por pareja (2 personas).`,
        },
        {
          q: "¿Qué incluye el precio del tour y qué no?",
          a: "El precio que ves es el precio final: incluye traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, desayuno regional, todas las entradas a parques y atracciones, guía local certificado NOM-09 SECTUR, equipo de seguridad, fotos y video del recorrido y botiquín. No incluye cómo llegar a la Huasteca (autobús o vuelo hasta Ciudad Valles o Xilitla), las comidas y cenas fuera del desayuno, las propinas ni los souvenirs y gastos personales. No hay cargos sorpresa al llegar.",
        },
        {
          q: "¿Cuánto se paga al reservar?",
          a: "Desde 2 días apartas con el 30 % del total y liquidas el resto el día del tour, en efectivo o con tarjeta; un recorrido suelto de un día se paga completo al reservar. También puedes pagar el 100 % desde el principio si prefieres llegar sin pendientes. La cancelación es gratuita hasta 48 horas antes.",
        },
        {
          q: "¿Hay descuento para niños?",
          a: "Sí. Los niños de 6 a 10 años pagan alrededor del 70 % del precio de adulto y los menores de 6 años el 50 %. El descuento se aplica automáticamente al reservar en línea.",
        },
        {
          q: "¿Puedo pagar con tarjeta o tengo que pagar en efectivo?",
          a: "Puedes reservar y pagar en línea con tarjeta de crédito o débito de forma segura, o apartar por WhatsApp. Te recomendamos llevar algo de efectivo para souvenirs y antojos locales, porque en varios puntos de la sierra no hay cajeros.",
        },
        {
          q: "¿Cuánto cuesta un tour privado?",
          // Decía "casi todos" cuando son 5 de 10, y no daba precio pese a que
          // `privateMinPrice` ya existe en el catálogo para cada uno de esos 5.
          a: `${PRIVADOS_CUANTOS(locale)} se pueden hacer en formato privado para tu grupo, desde ${PRIVADO_MIN} MXN por el grupo completo (el más caro llega a ${PRIVADO_MAX} MXN). El precio final depende del tour y del número de personas — escríbenos por WhatsApp y te cotizamos el mismo día.`,
        },
      ];

  return {
    faqs,
    paquetes,
    dif: en ? DIF_LABEL_EN : DIF_LABEL_ES,

    metaTitle: en
      ? `Huasteca Potosina Tour Prices 2026 · From ${RANGO_MIN} MXN per Person`
      : "Precios de Tours en la Huasteca Potosina 2026",
    metaDescription: en
      ? `The full 2026 price list, in Mexican pesos: all-inclusive day tours from ${RANGO_MIN} MXN per person and ${DIAS_MIN}–${DIAS_MAX} day packages with hotel from ${PAQ_MIN} MXN per couple. No hidden costs, discounts for children.`
      : `Lista completa de precios 2026: tours de un día todo incluido desde ${RANGO_MIN} MXN por persona y paquetes con hotel desde ${PAQ_MIN} MXN por pareja. Sin costos ocultos y con descuento para niños.`,
    keywords: en
      ? [
          "huasteca potosina tour prices",
          "how much does the huasteca potosina cost",
          "tamul waterfall tour price",
          "huasteca potosina packages price",
          "xilitla tour cost",
        ]
      : [
          "precios tours huasteca potosina",
          "cuánto cuesta la huasteca potosina",
          "cuánto cuesta ir a la huasteca potosina",
          "tour cascada tamul precio",
          "paquetes huasteca potosina precios",
        ],
    ogTitle: en
      ? "Huasteca Potosina Tour Prices 2026 — All Prices in Mexican Pesos"
      : "Precios de Tours en la Huasteca Potosina 2026",
    ogDescription: en
      ? "How much a trip to the Huasteca Potosina costs: every tour and package price, all inclusive and with no surprises. Prices in MXN."
      : "Cuánto cuesta visitar la Huasteca Potosina: precios de todos los tours y paquetes, todo incluido y sin sorpresas.",
    ogAlt: en ? "Tour prices in the Huasteca Potosina" : "Precios de tours en la Huasteca Potosina",
    twitterDescription: en
      ? "Every tour and package price, all inclusive and with no surprises. Prices in Mexican pesos."
      : "Precios de todos los tours y paquetes, todo incluido y sin sorpresas.",

    breadcrumbInicio: en ? "Home" : "Inicio",
    breadcrumbPrecios: en ? "Prices" : "Precios",
    itemListNombre: en
      ? "Huasteca Potosina tour and package prices 2026"
      : "Precios de tours y paquetes en la Huasteca Potosina 2026",
    itemListDescripcion: en
      ? "Full price list: guided day tours priced per person and multi-day packages with hotel priced per couple. All amounts in Mexican pesos (MXN)."
      : "Lista completa de precios: tours guiados de un día por persona y paquetes de varios días con hotel por pareja. Todos los importes en pesos mexicanos (MXN).",
    unidadPersona: en ? "per person" : "por persona",
    unidadVehiculo: en ? "per vehicle" : "por vehículo",

    eyebrow: en ? "✦ Clear prices · All inclusive · No surprises" : "✦ Precios claros · Todo incluido · Sin sorpresas",
    h1Antes: en ? "Tour Prices in the " : "Precios de Tours en la ",
    h1Em: "Huasteca Potosina",
    heroP: en
      ? `Guided day tours from ${RANGO_MIN} MXN per person and packages with hotel from ${PAQ_MIN} MXN per couple. The price you see includes transport, breakfast, entrance fees and a NOM-09 certified guide — no hidden costs on arrival.`
      : `Tours guiados de un día desde ${RANGO_MIN} MXN por persona y paquetes con hotel desde ${PAQ_MIN} MXN por pareja. El precio que ves incluye transporte, desayuno, entradas y guía certificado NOM-09 — sin costos ocultos al llegar.`,
    // Cuidado con esta frase: el conteo TOTAL de recorridos y el rango de
    // precio POR PERSONA no son el mismo conjunto. El RZR se cobra por
    // vehículo y no entra en el rango — decir "los 10 cuestan entre $900 y
    // $1,950 por persona" sería falso.
    heroProsa: en
      ? `In short: the ${N_TOURS_DIA} day tours last ${HRS_MIN} to ${HRS_MAX} hours. ${N_TOURS_PERSONA} of them are priced per person, between ${RANGO_MIN} and ${RANGO_MAX} MXN, and the ${rzrNombre} is priced per vehicle, from ${RZR_DESDE} MXN. The packages with hotel run ${DIAS_MIN} to ${DIAS_MAX} days and cost between ${PAQ_MIN} and ${PAQ_MAX} MXN per couple.`
      : `En corto: los ${N_TOURS_DIA} tours de un día duran de ${HRS_MIN} a ${HRS_MAX} horas. ${N_TOURS_PERSONA} se cobran por persona, entre ${RANGO_MIN} y ${RANGO_MAX} MXN, y el ${rzrNombre} se cobra por vehículo, desde ${RZR_DESDE} MXN. Los paquetes con hotel van de ${DIAS_MIN} a ${DIAS_MAX} días y cuestan entre ${PAQ_MIN} y ${PAQ_MAX} MXN por pareja.`,
    monedaNota: en
      ? "Every amount on this page is in Mexican pesos (MXN), not US dollars."
      : "Todos los importes de esta página están en pesos mexicanos (MXN).",

    tablaTitulo: en ? "Day tours (per person)" : "Tours de un día (por persona)",
    thTour: en ? "Tour" : "Tour",
    thDuracion: en ? "Duration" : "Duración",
    thDificultad: en ? "Difficulty" : "Dificultad",
    thPrecio: en ? "Price per person" : "Precio por persona",
    aprox: en ? "approx." : "aprox.",
    desde: en ? "from " : "desde ",
    porVehiculo: en ? " MXN per vehicle" : " MXN por vehículo",
    reservar: en ? "Book →" : "Reservar →",
    notaTabla: en
      ? "Children aged 6 to 10 pay ~70% of the adult price; under 6, 50%. Free cancellation up to 48 h before. Departures every day of the year between 8:00 and 9:00 AM."
      : "Niños de 6 a 10 años pagan ~70 % del precio de adulto; menores de 6 años, 50 %. Cancelación gratuita con 48 h de anticipación. Salidas todos los días del año entre 8:00 y 9:00 AM.",

    paqTitulo: en ? "How much does a full trip cost?" : "¿Cuánto cuesta un viaje completo?",
    paqIntro: en
      ? "If you're staying several days, the packages combine tours + lodging at Hotel Paraíso Encantado in Xilitla, all coordinated. Prices per couple (2 people):"
      : "Si vienes varios días, los paquetes combinan tours + hospedaje en el Hotel Paraíso Encantado de Xilitla, con todo coordinado. Precios por pareja (2 personas):",
    paqPorPareja: en ? "MXN per couple" : "MXN por pareja",
    // Los mismos precios de las tarjetas, dichos en una frase que se puede citar.
    paqProsa:
      (en ? "In detail: " : "En detalle: ") +
      paquetes
        .map((p) => `${p.nombre}, ${money(p.precio)} MXN ${p.precioLabel} (${p.duracion}, ${diasDeTour(p)} ${en ? "tour days" : "días de recorrido"})`)
        .join("; ") +
      (en
        ? ". All packages include lodging at Hotel Paraíso Encantado in Xilitla, buffet breakfast on tour days, transport, entrance fees, NOM-09 certified guides and travel insurance; they do not include getting to Xilitla, or lunches and dinners."
        : ". Todos los paquetes incluyen hospedaje en el Hotel Paraíso Encantado de Xilitla, desayuno buffet los días de tour, transporte, entradas, guías certificados NOM-09 y seguro de viaje; no incluyen el traslado hasta Xilitla ni las comidas y cenas."),
    paqGrupo: en
      ? "Traveling as a group or a family, or want more nights? We build custom quotes from 2 people. "
      : "¿Grupo, familia o más noches? Armamos cotizaciones a la medida desde 2 personas. ",
    paqCta: en ? "See the full packages →" : "Ver paquetes completos →",

    incluyeTitulo: en ? "The price always includes" : "El precio siempre incluye",
    incluyeItems: en
      ? [
          "Round-trip transport from your hotel in Xilitla or Ciudad Valles",
          "Breakfast with traditional dishes from the region",
          "Every entrance fee to parks and attractions",
          "NOM-09 SECTUR certified local guide",
          "Safety gear (life vest, helmet, depending on the tour)",
          "Photos and video of the trip",
          "First-aid kit",
        ]
      : [
          "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles",
          "Desayuno con platillos típicos de la región",
          "Todas las entradas a parques y atracciones",
          "Guía local certificado NOM-09 SECTUR",
          "Equipo de seguridad (chaleco, casco según el tour)",
          "Fotografías y video del recorrido",
          "Botiquín de primeros auxilios",
        ],
    noIncluyeTitulo: en ? "Not included" : "No incluye",
    noIncluyeItems: en
      ? [
          "Getting to the Huasteca (bus or flight to Ciudad Valles / Xilitla)",
          "Lunches and dinners beyond breakfast",
          "Tips (optional, always appreciated)",
          "Souvenirs and personal spending",
        ]
      : [
          "Cómo llegar a la Huasteca (autobús o vuelo hasta Ciudad Valles / Xilitla)",
          "Comidas y cenas fuera del desayuno",
          "Propinas (opcionales, siempre agradecidas)",
          "Souvenirs y gastos personales",
        ],
    guiaAntes: en ? "Not sure how to get here? We walk you through it step by step in the " : "¿No sabes cómo llegar? Te lo explicamos paso a paso en la ",
    guiaLink: en ? "practical travel guide" : "Guía práctica de viaje",

    faqTitulo: en ? "Frequently asked questions about prices" : "Preguntas frecuentes sobre precios",

    ctaTitulo: en ? "Ready to see the Huasteca?" : "¿Listo para conocer la Huasteca?",
    ctaP: en
      ? "Message us on WhatsApp and we'll help you build the right plan for your dates and your budget — we reply in under an hour."
      : "Escríbenos por WhatsApp y te ayudamos a armar el plan perfecto para tus fechas y tu presupuesto — respondemos en menos de 1 hora.",
    ctaWa: en ? "Get a quote on WhatsApp" : "Cotizar por WhatsApp",
    ctaTours: en ? "See all tours" : "Ver todos los tours",
    waMsg: en
      ? "Hi! I saw your prices page and I'd like a quote for my trip to the Huasteca. Can you help?"
      : "Hola, vi la página de precios y quiero cotizar mi viaje a la Huasteca. ¿Me ayudan?",
  };
}

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = preciosUI(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    // hreflang recíproco es-MX / en / x-default: hasta ahora /precios declaraba
    // un canonical suelto porque no tenía gemela en inglés.
    alternates: buildAlternates("/precios", locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/precios", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: t.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.ogTitle,
      description: t.twitterDescription,
      images: [`${SITE}/og-image.jpg`],
    },
  };
}

export default function PreciosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const t = preciosUI(locale);
  const lp = (path: string) => localePath(path, locale);
  const tours = TOURS_DB.map((tour) => localizeTour(tour, locale));
  // Solo tours por persona en la tabla principal; el RZR (por vehículo) se muestra aparte.
  const porPersona = tours.filter((x) => x.precioUnidad !== "vehiculo");
  const porVehiculo = tours.filter((x) => x.precioUnidad === "vehiculo");
  const paquetes = t.paquetes;

  /**
   * Todos los importes de esta página, legibles por máquina.
   *
   * Hasta ahora /precios era la única página comercial que no le daba a Google
   * ni un solo precio estructurado: los números vivían dentro de la tabla y
   * nada más. Cada `Offer` sale de TOURS_DB / PAQUETES_DB — la misma fuente que
   * pinta la tabla, así que no pueden divergir.
   *
   * El RZR NO lleva un `price` suelto: se cobra por VEHÍCULO y su tarifa es un
   * rango real (`flota[].precios`), así que va como `AggregateOffer` con
   * lowPrice/highPrice. Declararle "$1,600" a secas diría que ese es el precio,
   * y es solo el de la unidad más barata en la ruta más corta.
   */
  const ofertaTour = (x: (typeof tours)[number]) => {
    const url = localeUrl(`/tours/${x.slug}`, locale);
    if (x.precioUnidad === "vehiculo") {
      return {
        "@type": "AggregateOffer",
        priceCurrency: "MXN",
        lowPrice: RZR_MIN,
        highPrice: RZR_MAX,
        offerCount: RZR_PRECIOS.length,
        availability: "https://schema.org/InStock",
        url,
      };
    }
    return {
      "@type": "Offer",
      price: x.precio,
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: x.precio,
        priceCurrency: "MXN",
        unitText: t.unidadPersona,
      },
    };
  };

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbInicio, item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: t.breadcrumbPrecios, item: localeUrl("/precios", locale) },
        ],
      },
      {
        "@type": "ItemList",
        name: t.itemListNombre,
        description: t.itemListDescripcion,
        numberOfItems: tours.length + paquetes.length,
        itemListElement: [
          ...tours.map((x, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: x.nombre,
              description: x.tagline,
              image: `${SITE}${x.imagen_hero}`,
              url: localeUrl(`/tours/${x.slug}`, locale),
              brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
              offers: ofertaTour(x),
            },
          })),
          ...paquetes.map((p, i) => ({
            "@type": "ListItem",
            position: tours.length + i + 1,
            item: {
              "@type": "Product",
              name: p.nombre,
              description: `${p.subtitulo} — ${p.duracion}`,
              image: `${SITE}${p.imagen}`,
              url: localeUrl(`/paquetes/${p.slug}`, locale),
              brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
              offers: {
                "@type": "Offer",
                price: p.precio,
                priceCurrency: "MXN",
                availability: "https://schema.org/InStock",
                url: localeUrl(`/paquetes/${p.slug}`, locale),
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: p.precio,
                  priceCurrency: "MXN",
                  unitText: p.precioLabel,
                },
              },
            },
          })),
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(36px,5.5vw,64px)" }}>
          {t.h1Antes}
          <em className="shimmer-gold italic">{t.h1Em}</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">{t.heroP}</p>
        {/* El dato clave también en prosa: un "$900" dentro de una insignia no
            se puede citar; esta frase sí. */}
        <p className="text-crema/55 font-dm text-sm leading-relaxed max-w-2xl mx-auto mt-4">{t.heroProsa}</p>
        <p className="text-crema/40 font-dm text-xs mt-3">{t.monedaNota}</p>
      </section>

      {/* ── TABLA DE TOURS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-6">{t.tablaTitulo}</h2>
          <div className="overflow-x-auto border border-white/10">
            <table className="w-full text-left font-dm text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/15 text-[10px] tracking-[2px] uppercase text-crema/50">
                  <th className="px-4 py-3 font-medium">{t.thTour}</th>
                  <th className="px-4 py-3 font-medium">{t.thDuracion}</th>
                  <th className="px-4 py-3 font-medium">{t.thDificultad}</th>
                  <th className="px-4 py-3 font-medium text-right">{t.thPrecio}</th>
                </tr>
              </thead>
              <tbody>
                {porPersona.map((x) => (
                  <tr key={x.slug} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-4">
                      <Link href={lp(`/tours/${x.slug}`)} className="text-crema hover:text-dorado transition-colors">
                        {x.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-crema/60 whitespace-nowrap">{tourDurTexto(x, " h")} {t.aprox}</td>
                    <td className="px-4 py-4 text-crema/60">{t.dif[x.dificultad]}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {/* El precio es el enlace: quien llega a /precios ya está
                          comparando, y antes tenía que dar dos saltos más para
                          poder reservar. */}
                      <Link href={lp(`/reservar/carrito?agregar=${x.slug}`)} className="group/precio inline-block">
                        <span className="font-cormorant text-dorado text-xl group-hover/precio:text-lima transition-colors">{money(x.precio)}</span>
                        <span className="text-crema/40 text-xs"> MXN</span>
                        <span className="block text-[9px] tracking-[1.5px] uppercase font-dm text-crema/35 group-hover/precio:text-lima transition-colors">{t.reservar}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {porVehiculo.map((x) => (
                  <tr key={x.slug} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-4">
                      <Link href={lp(`/tours/${x.slug}`)} className="text-crema hover:text-dorado transition-colors">
                        {x.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-crema/60 whitespace-nowrap">
                      {tourDurTexto(x, " h")}
                    </td>
                    <td className="px-4 py-4 text-crema/60">{t.dif[x.dificultad]}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <Link href={lp(`/reservar/carrito?agregar=${x.slug}`)} className="group/precio inline-block">
                        <span className="text-crema/50 text-xs">{t.desde}</span>
                        <span className="font-cormorant text-dorado text-xl group-hover/precio:text-lima transition-colors">{money(x.precio)}</span>
                        <span className="text-crema/40 text-xs">{t.porVehiculo}</span>
                        <span className="block text-[9px] tracking-[1.5px] uppercase font-dm text-crema/35 group-hover/precio:text-lima transition-colors">{t.reservar}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-crema/45 font-dm text-xs mt-3">{t.notaTabla}</p>
        </div>
      </section>

      {/* ── PAQUETES ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-2">{t.paqTitulo}</h2>
          <p className="text-crema/60 font-dm text-sm mb-8 max-w-2xl">{t.paqIntro}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paquetes.map((p) => (
              <Link
                key={p.slug}
                href={lp(`/paquetes/${p.slug}`)}
                className="border border-white/10 p-6 hover:border-dorado/50 transition-colors group"
              >
                <p className="text-[10px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{p.duracion}</p>
                <h3 className="font-cormorant text-crema text-2xl mb-3 group-hover:text-dorado transition-colors">
                  {p.nombre}
                </h3>
                <p className="font-cormorant text-dorado text-3xl">
                  {money(p.precio)} <span className="font-dm text-crema/40 text-xs">{t.paqPorPareja}</span>
                </p>
              </Link>
            ))}
          </div>
          {/* Los mismos importes de las tarjetas, en una frase citable. */}
          <p className="text-crema/55 font-dm text-sm leading-relaxed mt-6 max-w-3xl">{t.paqProsa}</p>
          <p className="text-crema/45 font-dm text-xs mt-4">
            {t.paqGrupo}
            <Link href={lp("/paquetes")} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
              {t.paqCta}
            </Link>
          </p>
        </div>
      </section>

      {/* ── QUÉ INCLUYE ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="border border-verde-selva/30 bg-verde-profundo/30 p-7">
            <h2 className="font-cormorant font-light text-crema text-2xl mb-4">{t.incluyeTitulo}</h2>
            <ul className="space-y-2 font-dm text-sm text-crema/75">
              {t.incluyeItems.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div className="border border-white/10 p-7">
            <h2 className="font-cormorant font-light text-crema text-2xl mb-4">{t.noIncluyeTitulo}</h2>
            <ul className="space-y-2 font-dm text-sm text-crema/60">
              {t.noIncluyeItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <p className="font-dm text-xs text-crema/45 mt-4">
              {t.guiaAntes}
              <Link href={lp("/info-practica")} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
                {t.guiaLink}
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">{t.faqTitulo}</h2>
          <div className="space-y-6">
            {t.faqs.map((f) => (
              <div key={f.q} className="border-b border-white/10 pb-6">
                <h3 className="font-dm font-medium text-crema text-sm mb-2">{f.q}</h3>
                <p className="font-dm text-sm text-crema/65 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-28 text-center">
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.ctaTitulo}</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">{t.ctaP}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink(t.waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            {t.ctaWa}
          </a>
          <Link
            href={lp("/tours")}
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            {t.ctaTours}
          </Link>
        </div>
      </section>
    </main>
  );
}
