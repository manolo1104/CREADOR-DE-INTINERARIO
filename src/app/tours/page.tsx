import Link from "next/link";
import { resenasTexto } from "@/lib/resenas";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
// Una sola lista de @/lib/tours con lo que usan LOS DOS lados: el catalogo y el
// texto de duracion de siempre, `tourDurRange` (la frase citable "duran entre X
// y Y horas" del bloque de datos), y el orden por ranking + categorias +
// collage que trajo la linea nueva de producto. `TOURS_DESTACADOS` y
// `GuideProfile` ya no se importan: el cuerpo resultante ordena por
// `rankTour` y agrupa por `TOUR_CATEGORIAS`, y no queda ninguna referencia a
// ellos (verificado con grep antes de quitarlos).
import { TOURS_DB, TOUR_CATEGORIAS, TOURS_RANKING, rankTour, tourCollage, tourDurTexto, tourDurRange, etiquetaUnidad, precioTachado, promoDe, esPorPersona, partesRecogida, recogidaDeTour } from "@/lib/tours";
import { excepcionesSalida } from "@/lib/recogidaTexto";
import { incluyeDesayuno, rangoPorPersona, recogenEnValles } from "@/lib/catalogoResumen";
import { TourCarrusel } from "@/components/TourCarrusel";
import { SelloGarantia } from "@/components/SelloGarantia";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import type { LucideIcon } from "lucide-react";
import { Award, Bus, Calendar, Camera, CheckCircle2, Clock, MessageCircle, Star, Users } from "lucide-react";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { PageViewTracker } from "@/components/PageViewTracker";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeTour } from "@/lib/i18n/localize";
import { getToursFaqs, salidaDiaria } from "@/lib/faqTours";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { urlComparar } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";

import { GRUPO_MAX, GRUPO_MIN, PRIVADO_EXTRA_POR_PERSONA } from "@/lib/tours";
export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  // El conteo y el precio de arranque salen de TOURS_DB: escritos a mano se
  // habían quedado en "8 tours desde $1,300" cuando ya son 10 desde $900, y el
  // gancho de precio más fuerte del catálogo no se estaba usando.
  const nTours = TOURS_DB.length;
  const desde = rangoPorPersona().min;
  const desdeTxt = `$${desde.toLocaleString(en ? "en-US" : "es-MX")}`;
  // El inglés NO calca el título español. "Huasteca Potosina Tours 2026" no lo
  // busca nadie en EE. UU.; "adventure tours Mexico" sí, y es la consulta a la
  // que apunta esta página. La marca ya la lleva el título del home.
  //
  // 🔴 El español decía "Todo Incluido desde $900": el de $900 (Gruta y
  // Travesía) no lleva desayuno, el RZR no lleva traslado y en el buceo llegas
  // por tu cuenta. Es lo primero que se lee en Google.
  //
  // 🔴 En inglés el precio lleva "MXN": "From $900" a secas, en un resultado de
  // Google que lee alguien en EE. UU., son dólares. Con el "MXN" la frase
  // "in the Huasteca…" ya no cabía en 60; así mide 58, y 60 si el mínimo
  // llega a cuatro cifras ("$1,000 MXN").
  const title = en
    ? `Adventure Tours, Huasteca Potosina, Mexico · From ${desdeTxt} MXN`
    : `Tours Huasteca Potosina 2026 · Guiados desde ${desdeTxt}`;
  // La regla real vive en `pctACobrar` (src/lib/carrito.ts): un viaje de un
  // solo día sin hotel se cobra al 100 %. Esta página vende justo eso, así que
  // "Aparta con el 30 %" a secas era falso para casi todo lo que lista.
  //
  // 🔴 Decía "con transporte, desayuno, entradas y guía incluidos" de los 14:
  // el desayuno lo llevan 5 y los de $900 no. Los conteos salen del catálogo.
  const nTraslado = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado).length;
  const nDesayuno = TOURS_DB.filter(incluyeDesayuno).length;
  const description = en
    ? `${nTours} guided day tours from ${desdeTxt} MXN: waterfalls, caves, rafting, Las Pozas. ${nTraslado} include hotel pickup, ${nDesayuno} breakfast. A 30% deposit holds your spot.`
    : `${nTours} tours guiados desde ${desdeTxt}: ${nTraslado} pasan por tu hospedaje y ${nDesayuno} incluyen desayuno. Apartas con el 30 % y liquidas el resto el día del tour.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/tours", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: en ? "en_US" : "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: buildAlternates("/tours", locale),
  };
}

const DIFICULTAD_STYLE: Record<string, string> = {
  alta:  "text-terracota border-terracota/50",
  media: "text-dorado border-dorado/50",
  baja:  "text-lima border-lima/50",
};
const DIF_LABEL_EN: Record<string, string> = { alta: "advanced", media: "moderate", baja: "easy" };

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

// 🔴 "Transporte Incluido — Desde tu hotel" y "Todo Incluido" iban para los
// catorce: el RZR sale de nuestra base y al buceo llegas por tu cuenta. El
// conteo de recogidas sale del catálogo.
const N_CON_TRASLADO = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado).length;
const BADGES_ES: { Icon: LucideIcon; title: string; sub: string }[] = [
  { Icon: Award,         title: "Guías Certificados",    sub: "NOM-09 SECTUR" },
  { Icon: Bus,           title: "Te recogemos",          sub: `En ${N_CON_TRASLADO} de ${TOURS_DB.length} recorridos` },
  { Icon: Camera,        title: "Fotos & Video",         sub: "Del recorrido completo" },
  { Icon: CheckCircle2,  title: "Precio final",          sub: "Sin costos ocultos" },
  { Icon: MessageCircle, title: "Respuesta en < 1 hora", sub: "Lun–Dom, todo el día" },
  { Icon: CheckCircle2,  title: "Confirmación inmediata",sub: "Por WhatsApp al reservar" },
];
const BADGES_EN: { Icon: LucideIcon; title: string; sub: string }[] = [
  { Icon: Award,         title: "Certified Guides",     sub: "NOM-09 SECTUR" },
  { Icon: Bus,           title: "Hotel pickup",         sub: `On ${N_CON_TRASLADO} of ${TOURS_DB.length} tours` },
  { Icon: Camera,        title: "Photos & Video",       sub: "Of the whole trip" },
  { Icon: CheckCircle2,  title: "Final price",          sub: "No hidden costs" },
  { Icon: MessageCircle, title: "Reply in < 1 hour",    sub: "Mon–Sun, all day" },
  { Icon: CheckCircle2,  title: "Instant confirmation", sub: "On WhatsApp when you book" },
];

// Los dos canales pesan igual a propósito: reservar en línea es tan válido como
// escribir por WhatsApp, y antes el paso 01 solo ofrecía WhatsApp.
const COMO_FUNCIONA_ES = [
  { num: "01", titulo: "Reserva en línea o por WhatsApp", detalle: "Aparta tu lugar tú mismo en el motor de reservas, o escríbenos por WhatsApp con cuántos son, sus fechas y qué tours les interesan. Las dos formas valen igual; por WhatsApp respondemos en menos de una hora." },
  { num: "02", titulo: "Confirmamos y apartamos tu lugar", detalle: "Te enviamos los detalles del tour: dónde y a qué hora pasamos por ti, la lista de qué llevar y cómo pagar — link de pago, transferencia bancaria o depósito en OXXO." },
  // 🔴 Decía "estar listo en el lobby de tu hotel en Xilitla o Ciudad Valles…
  // transporte, entradas, desayuno, guía": ni todos recogen en Valles (cinco
  // solo en Xilitla, el RZR en nuestra base, el buceo en la laguna) ni todos
  // llevan desayuno. El detalle de cada uno va en el bloque `#salidas`.
  { num: "03", titulo: "Disfruta sin preocupaciones", detalle: "El día del tour solo preocúpate por estar listo a la hora que te confirmamos: en casi todos los recorridos pasamos por ti a tu hospedaje. Lo que incluye cada uno —transporte, entradas, guía y, según el recorrido, desayuno— ya va en el precio." },
];
const COMO_FUNCIONA_EN = [
  { num: "01", titulo: "Book online or on WhatsApp", detalle: "Reserve your spot yourself in our booking engine, or message us on WhatsApp with your group size, your dates and the tours you're interested in. Either way works; on WhatsApp we reply in under an hour." },
  { num: "02", titulo: "We confirm and reserve your spot", detalle: "We send you the tour details: meeting point, departure time, a what-to-bring list and how to pay — payment link, bank transfer or cash deposit at OXXO." },
  { num: "03", titulo: "Enjoy, worry-free", detalle: "On tour day, just be ready at the time we confirm: on almost every tour we pick you up at your lodging. Whatever each tour includes — transport, entrance fees, a guide and, depending on the tour, breakfast — is already in the price." },
];

const TESTIMONIOS_ES = [
  { nombre: "Sandra Morales", ciudad: "Ciudad de México", texto: "Increíble experiencia. El guía conocía cada rincón del Tamul y nos llevó a miradores que nunca hubiéramos encontrado solos. 100% lo recomiendo.", tour: "Expedición Tamul" },
  { nombre: "Carlos Reyes", ciudad: "Guadalajara", texto: "Todo fue exactamente como prometieron: transporte puntual, desayuno incluido, guía certificado. Sin sorpresas de último momento. ¡Ya vamos en el segundo tour!", tour: "Ruta Surrealista" },
  { nombre: "Valeria Guzmán", ciudad: "Monterrey", texto: "Las Minas Viejas me dejaron sin palabras. El agua turquesa, la selva… Respondieron mi WhatsApp en 20 minutos y todo estuvo organizado en el día.", tour: "Paraíso Escalonado" },
];
const TESTIMONIOS_EN = [
  { nombre: "Sandra Morales", ciudad: "Mexico City", texto: "Incredible experience. Our guide knew every corner of Tamul and took us to lookouts we'd never have found on our own. 100% recommend.", tour: "Tamul Expedition" },
  { nombre: "Carlos Reyes", ciudad: "Guadalajara", texto: "Everything was exactly as promised: punctual transport, breakfast included, certified guide. No last-minute surprises. We're already on our second tour!", tour: "Surrealist Route" },
  { nombre: "Valeria Guzmán", ciudad: "Monterrey", texto: "Minas Viejas left me speechless. The turquoise water, the jungle… They answered my WhatsApp in 20 minutes and everything was arranged that same day.", tour: "Stepped Paradise" },
];

export default function ToursPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;
  const tours = TOURS_DB.map((t) => localizeTour(t, locale));
  // El orden lo decide lo que de verdad se vende (TOURS_RANKING, del panel), no
  // una lista escrita a mano.
  const ordenados = [...tours].sort((a, b) => rankTour(a.slug) - rankTour(b.slug));
  const BADGES = en ? BADGES_EN : BADGES_ES;
  const COMO_FUNCIONA = en ? COMO_FUNCIONA_EN : COMO_FUNCIONA_ES;
  const TESTIMONIOS = en ? TESTIMONIOS_EN : TESTIMONIOS_ES;
  const waGeneral = en ? "Hi, I'd like information about your Huasteca Potosina tours." : WA_MESSAGES.tourGeneral;
  // 🔴 28 sep 2026 — el privado NO es una tarifa del grupo completo. Se cobra
  // el precio normal del recorrido más $250 por persona; el `privateMinPrice`
  // de $7,000 a $8,500 que se publicaba aquí anunciaba más del doble de lo que
  // se cobra (Tamul para dos: $3,600, no $8,500). Se calcula con la regla real
  // para que no vuelva a desfasarse.
  const privadoDesde = Math.min(
    ...TOURS_DB.filter((t) => t.privateAvailable).map((t) => t.precio)
  ) + PRIVADO_EXTRA_POR_PERSONA;

  const faqs = getToursFaqs(locale);
  // Los datos que una IA tiene que poder citar de esta página, leídos del
  // catálogo: cuántos recorridos hay, desde cuánto, cuánto duran y de dónde
  // salen. En insignias sueltas ("$1,550" en un <span>) no se pueden citar.
  const precioMinPersona = rangoPorPersona().min;
  const rangos    = TOURS_DB.map((t) => tourDurRange(t));
  const durMin    = Math.min(...rangos.map(([a]) => a));
  const durMax    = Math.max(...rangos.map(([, b]) => b));
  // Los que NO se cobran por cabeza, con su unidad: "Recorrido en RZR por
  // Xilitla: por vehículo, desde $1,600 MXN". Antes solo se nombraba el RZR, y
  // el Edén —tarifa del grupo entero— quedaba metido en el "desde X por persona".
  const otraUnidad = tours
    .filter((t) => !esPorPersona(t))
    .map((t) => `${t.nombreCorto}: ${etiquetaUnidad(t, en)}, ${en ? "from" : "desde"} ${money(t.precio)} MXN`)
    .join("; ");
  // Cuántos recogen dónde. La lista completa, con horas, la arma
  // `excepcionesSalida()` en el bloque #salidas.
  // 🔴 Decía "En 7 pasamos por ti…; los otros 7 salen solo de Xilitla o del
  // mismo destino": cinco de esos siete SÍ pasan por ti (en Xilitla) y desde
  // Valles se pueden hacer con costo adicional. Se desglosa por tipo.
  const nValles = recogenEnValles(TOURS_DB).length;
  const nSoloXilitla = TOURS_DB.filter((t) => partesRecogida(t, false).valles).length;
  const tiposResto = TOURS_DB.map((t) => recogidaDeTour(t).tipo).filter((x) => x === "base-xilitla" || x === "en-sitio");
  const nResto = tiposResto.length;
  const dondeResto = [
    tiposResto.includes("base-xilitla") ? (en ? "at our base in Xilitla" : "en nuestra base de Xilitla") : null,
    tiposResto.includes("en-sitio") ? (en ? "at the site itself" : "en el mismo destino") : null,
  ].filter(Boolean).join(en ? " or " : " o ");
  const desglose = en
    ? `On ${nValles} of them we pick you up at your accommodation in Ciudad Valles or Xilitla${nSoloXilitla ? `; on another ${nSoloXilitla}, only at your lodging in Xilitla (from Ciudad Valles, for an additional charge)` : ""}${nResto ? `; and on the remaining ${nResto} we meet ${dondeResto}` : ""}`
    : `En ${nValles} de ellos pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla${nSoloXilitla ? `; en otros ${nSoloXilitla}, solo en tu hospedaje de Xilitla (desde Ciudad Valles, con costo adicional)` : ""}${nResto ? `, y en ${nResto === 1 ? "el restante" : `los ${nResto} restantes`} nos vemos ${dondeResto}` : ""}`;
  // Tours con política de cancelación propia (el Edén no reembolsa).
  const cancelPropia = tours.filter((t) => t.cancelacion).map((t) => t.nombreCorto);

  const toursItemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Huasteca Potosina Tours",
    url: `${SITE}${lp("/tours")}`,
    inLanguage: en ? "en" : "es-MX",
    numberOfItems: tours.length,
    itemListElement: tours.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristTrip",
        name: t.nombre,
        description: t.descripcion,
        url: `${SITE}${lp(`/tours/${t.slug}`)}`,
        image: t.imagen_hero?.startsWith("http") ? t.imagen_hero : `${SITE}${t.imagen_hero}`,
        // La oferta lleva la URL y la disponibilidad, y —lo importante— dice a
        // qué se refiere el precio: el RZR se cobra POR VEHÍCULO, no por
        // persona. Un `price: 1600` a secas se lee como "por persona" y
        // desinforma a quien cite el marcado. `unitText` lo hace explícito.
        offers: {
          "@type": "Offer",
          price: t.precio,
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url: `${SITE}${lp(`/tours/${t.slug}`)}`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: t.precio,
            priceCurrency: "MXN",
            // `etiquetaUnidad` y no un ternario RZR/persona: la tarifa del
            // Edén es del grupo entero y salía declarada "por persona".
            unitText: etiquetaUnidad(t, en),
          },
        },
      },
    })),
  };

  // Preguntas frecuentes en datos estructurados, igual que ya lo hace
  // /paquetes. `/tours` era la única página comercial sin ellas.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: en ? "en" : "es-MX",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toursItemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: "Tours",  item: `${SITE}${lp("/tours")}` },
        ],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-verde-profundo px-6 pt-32 pb-16 text-center">
        <Image src="/imagenes/guias/equipo-guias.jpg" alt="Equipo de guías certificados de Tours Huasteca Potosina recorriendo la región" fill className="object-cover object-center" priority quality={85} />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/70 to-negro/65" />
        <div className="relative z-10 max-w-3xl mx-auto">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {/* Decía "Tours con todo incluido"; "guiados" ya lo dice el H1. */}
          {en ? "Day tours" : "Tours de un día"}
        </p>
        {/* El H1 decía sólo "Huasteca": las consultas que venden llevan las dos
            palabras ("huasteca potosina tours", 3.114 impresiones en pos. 6). */}
        <h1 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(42px,7vw,80px)" }}>
          {en ? <>Guided <em className="shimmer-gold">Tours</em> in the Huasteca Potosina</> : <>Tours <em className="shimmer-gold">Guiados</em> por la Huasteca Potosina</>}
        </h1>
        <p className="text-crema/80 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-3">
          {en
            ? `${tours.length} tours designed to experience the Huasteca Potosina worry-free, with a guide on every trip: ${TOURS_DB.filter((t) => partesRecogida(t, true).incluyeTraslado).length} include pickup at your lodging and ${TOURS_DB.filter(incluyeDesayuno).length} include breakfast.`
            : `${tours.length} tours diseñados para vivir la Huasteca Potosina sin preocupaciones, con guía en cada recorrido: ${TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado).length} pasan por ti a tu hospedaje y ${TOURS_DB.filter(incluyeDesayuno).length} incluyen desayuno.`}
        </p>
        {/* El precio, la duración y el punto de salida vivían SOLO dentro de
            insignias de Tailwind: un "$1,550" suelto en un <span> no se puede
            citar. Esta frase deja los mismos datos —leídos del catálogo— en
            prosa, para que una persona o una IA puedan citar una sola línea y
            quedarse con lo esencial.
            🔴 La salida decía "salvo el RZR, el buceo y la Travesía, pasamos
            por ti en Ciudad Valles o Xilitla entre 8:00 y 9:00 AM", escrito a
            mano: la Gruta sale a las 7 PM y solo de Xilitla. Aquí queda la
            cuenta; la lista con horas sale de `excepcionesSalida()` en #salidas,
            para no meter un párrafo entero en el hero. */}
        <p className="text-crema/65 font-dm text-[13px] max-w-2xl mx-auto leading-relaxed mb-6">
          {en
            ? <>The {tours.length} tours cost from {money(precioMinPersona)} MXN per person{otraUnidad ? ` (${otraUnidad})` : ""} and last between {durMin} and {durMax} hours. {desglose} — <a href="#salidas" className="underline underline-offset-2 hover:text-crema transition-colors">pickup times and meeting points</a>. Free cancellation up to 48 hours before with a 100% refund{cancelPropia.length ? ` (except ${cancelPropia.join(", ")}, which has its own policy)` : ""}; you hold your spot with a {ANTICIPO_PCT}% deposit and settle the rest on the day of the tour.</>
            : <>Los {tours.length} recorridos cuestan desde {money(precioMinPersona)} MXN por persona{otraUnidad ? ` (${otraUnidad})` : ""} y duran entre {durMin} y {durMax} horas. {desglose} — <a href="#salidas" className="underline underline-offset-2 hover:text-crema transition-colors">horarios y puntos de salida</a>. Cancelas gratis hasta 48 horas antes con reembolso del 100 %{cancelPropia.length ? ` (salvo ${cancelPropia.join(", ")}, con su propia política)` : ""}; apartas con el {ANTICIPO_PCT} % y liquidas el resto el día del tour.</>}
        </p>
        <div className="inline-flex items-center gap-2 bg-verde-selva/20 border border-verde-vivo/30 px-5 py-2 mb-6 text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {/* Con la salvedad del Edén, que va con el horario del jardín. */}
          {salidaDiaria(locale, true)} — {en ? "book 24h in advance" : "reserva con 24 h de anticipación"}
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <a href="https://share.google/YS3dbxN4wrnHZ8lO9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 px-5 py-2 transition-all group">
            <span className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" aria-hidden="true" />))}
            </span>
            {/* La ÚNICA vez que la cifra sale en /tours: es la del negocio y va
                en la cabecera, de `resenas.ts`. Las tarjetas ya no la repiten. */}
            <span className="font-dm text-sm text-crema/85 group-hover:text-crema transition-colors">{resenasTexto(en)}</span>
          </a>
          <span className="text-crema/40 font-dm text-xs hidden sm:block">·</span>
          <span className="font-dm text-xs text-crema/70 hidden sm:block">{en ? "+10,000 happy travelers" : "+10,000 viajeros satisfechos"}</span>
        </div>

        {/*
          El botón dominante era el verde de WhatsApp, sin ninguna alternativa
          de reserva online al lado: mandábamos el tráfico más caliente del
          canal automático al canal manual. Ahora reservar en línea es el CTA
          principal y WhatsApp queda como la opción secundaria, que sigue
          siendo la buena para quien tiene dudas antes de pagar.
        */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href={lp("/reservar")} className="inline-flex items-center justify-center gap-2.5 bg-dorado hover:bg-lima text-negro px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors duration-200 min-h-[44px]">
            {en ? "Book online" : "Reservar en línea"}
          </Link>
          <a href={waLink(waGeneral)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all duration-200 min-h-[44px]">
            {WA_SVG}
            {en ? "Ask on WhatsApp" : "Preguntar por WhatsApp"}
          </a>
        </div>
        </div>
      </section>

      {/* ── LOS MÁS RESERVADOS + RECOMENDADOR ──
          Contra la parálisis de elegir entre 14 (hallazgo de la revisión de
          conversión, sep 2026): tres héroes con datos REALES de venta
          (TOURS_RANKING, del panel) y el recomendador en el primer scroll, no
          enterrado en el pie. Solo el 1º presume «el más reservado»: es el
          único con respaldo que un cliente puede verificar. */}
      <section aria-labelledby="mas-reservados" className="px-6 pt-14 pb-4 max-w-7xl mx-auto">
        <h2 id="mas-reservados" className="font-cormorant font-light text-crema text-3xl md:text-4xl mb-8 text-center">
          {en ? <>Start with the <em className="shimmer-gold">favorites</em></> : <>Empieza por los <em className="shimmer-gold">favoritos</em></>}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TOURS_RANKING.slice(0, 3).map((slug, i) => {
            const t = tours.find((x) => x.slug === slug);
            if (!t) return null;
            return (
              <Link key={slug} href={lp(`/tours/${slug}`)} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden">
                  {(t.imagenTarjeta ?? t.imagen_hero) && (
                    <Image
                      src={t.imagenTarjeta ?? t.imagen_hero}
                      alt={t.nombre}
                      fill
                      className="object-cover transition-transform duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.04]"
                      sizes="(min-width: 640px) 400px, 100vw"
                    />
                  )}
                  {i === 0 && (
                    <p className="absolute top-3 left-3 bg-dorado text-negro font-dm text-[10px] tracking-[1.5px] uppercase px-2.5 py-1">
                      {en ? "Most booked" : "El más reservado"}
                    </p>
                  )}
                  {/* Panel de vidrio: sobre agua turquesa o follaje claro, el
                      precio en texto suelto no se leía (queja de Manolo, 29
                      sep). Blur + borde 1px + brillo interior, con respaldo
                      sólido para quien apaga la transparencia. */}
                  <div className="absolute inset-x-3 bottom-3 border border-white/15 bg-negro/45 backdrop-blur-md p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] supports-[not(backdrop-filter:blur(0))]:bg-negro/80">
                    <p className="font-cormorant text-crema text-2xl leading-tight">{t.nombreCorto}</p>
                    <p className="mt-1.5 font-dm text-xs text-crema/85">
                      {precioTachado(t) && (
                        <span className="mr-1.5 text-crema/50 line-through">{money(precioTachado(t)!)}</span>
                      )}
                      <span className="text-dorado font-medium text-sm">{money(t.precio)}</span> MXN {etiquetaUnidad(t, en)} · {tourDurTexto(t, en ? " hours" : " horas")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Dos formas de salir de la duda: ponerlos lado a lado (comparador,
            con los tres de arriba ya puestos) o contestar 7 preguntas
            (recomendador, solo en español). */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 border border-white/10 bg-white/[0.03] px-6 py-5">
          <p className="font-dm text-sm text-crema/75 text-center sm:text-left">
            {en
              ? "Not sure which one? Put the favorites side by side: price, length and what each one includes."
              : "¿No sabes cuál elegir? Contesta 7 preguntas y te decimos cuál va contigo."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href={urlComparar("recorridos", TOURS_RANKING.slice(0, 3), { locale, origen: "favoritos" })}
              className="inline-flex items-center justify-center min-h-[44px] border border-dorado/60 text-dorado hover:bg-dorado/10 px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
            >
              {comparadorUI(locale).entradas.favoritos}
            </Link>
            {!en && (
              <Link
                href="/recomendar"
                className="inline-flex items-center justify-center min-h-[44px] border border-dorado/60 text-dorado hover:bg-dorado/10 px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
              >
                Descubrir mi tour →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS ──
          Antes esta barra listaba los 10 tours cortando el nombre a dos
          palabras, así que decía "CASCADAS DEL" y "TRAVESÍA DEL". Ahora lleva a
          las tres familias, que sí caben enteras. */}
      <nav aria-label={en ? "Tour categories" : "Categorías de tours"} className="sticky sticky-subnav z-40 bg-negro/98 backdrop-blur-md border-b border-white/8 px-6 overflow-x-auto scrollbar-none" style={{ top: "var(--navbar-offset, 64px)" }}>
        <ul className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto py-2.5">
          {TOUR_CATEGORIAS.map((c) => {
            const n = tours.filter((t) => t.categoria === c.id).length;
            if (!n) return null;
            return (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-[10px] tracking-[1.5px] uppercase font-dm text-crema/65 hover:text-crema hover:border-verde-vivo/50 hover:bg-verde-selva/15 active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-200 ease-out"
                >
                  {en ? c.labelEn : c.label}
                  <span className="text-verde-vivo/75 font-dm text-[10px] tabular-nums">{n}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── FRANJA DE CONFIANZA ──
          Eran seis cajas de 4 rem con título de sección encima: 250 px que
          había que pasar para llegar al catálogo. Ahora es una franja de una
          línea; dice lo mismo y cuesta un scroll corto. */}
      <section className="border-b border-white/6 bg-verde-profundo/25">
        <ul className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-3.5">
          {BADGES.map((item) => (
            <li key={item.title} className="flex items-center gap-2.5 min-w-0">
              <item.Icon className="w-[18px] h-[18px] text-verde-vivo flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-dm text-[11.5px] text-crema/85 leading-tight truncate">{item.title}</span>
                <span className="block font-dm text-[9.5px] text-crema/40 leading-tight truncate mt-0.5">{item.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <PageViewTracker event="TOURS_LIST_VIEW" data={{ total: tours.length }} />

      {/* ── CATÁLOGO POR CATEGORÍA ──
          Las tres familias sustituyen al par "Los más reservados / Otros
          recorridos": el visitante llega sabiendo si quiere mojarse o no.
          Dentro de cada familia manda el orden real de venta del panel
          (TOURS_RANKING), no una lista escrita a mano. Ninguna URL cambia. */}
      <section id="tours-grid" className="max-w-6xl mx-auto px-6 py-16">
        {TOUR_CATEGORIAS.map((cat) => {
          const deLaCat = ordenados.filter((t) => t.categoria === cat.id);
          if (!deLaCat.length) return null;
          return (
            <div key={cat.id} id={cat.id} className="scroll-mt-32 mb-16 last:mb-0">
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-white/10 pt-6 mb-14">
                <h2 className="font-cormorant font-light text-crema leading-tight" style={{ fontSize: "clamp(26px,3.2vw,38px)" }}>
                  {en ? cat.labelEn : cat.label}
                </h2>
                <p className="font-dm text-[12.5px] text-crema/45 leading-relaxed">{en ? cat.descEn : cat.desc}</p>
                <span className="ml-auto font-dm text-[10px] tracking-[2px] uppercase text-verde-vivo/75 tabular-nums">
                  {deLaCat.length} {deLaCat.length === 1 ? "tour" : "tours"}
                </span>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-16">
                {deLaCat.map((tour, tourIndex) => {
                  const panels = tourCollage(tour);
                  return (
            <article id={tour.id} key={tour.id} className="stagger-reveal group relative rounded-xl border border-white/10 bg-negro hover:border-verde-vivo/50 transition-colors duration-300 flex flex-col scroll-mt-32" style={{ animationDelay: `${tourIndex * 70}ms` }}>
              <Link href={lp(`/tours/${tour.slug}`)} aria-label={`${en ? "View full tour" : "Ver tour completo"}: ${tour.nombre}`} className="absolute inset-0 z-0" />

              {/* ── FOTOS ──
                  Una a la vez, a tamaño completo, y se pasan deslizando.
                  Antes era un collage en diagonal de dos a cuatro franjas: cada
                  franja medía entre 216 y 267 px y a ese tamaño no se reconoce
                  ningún lugar, que es lo único que la foto tenía que hacer.
                  Así lo resuelven Airbnb, GetYourGuide y Viator. */}
              <div className="relative h-56 flex-shrink-0 rounded-t-xl overflow-hidden">
                <TourCarrusel
                  panels={panels}
                  nombre={tour.nombre}
                  href={lp(`/tours/${tour.slug}`)}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/85 via-negro/10 to-negro/35 pointer-events-none" />
                <span className={`absolute top-3 left-3 z-10 text-[9px] tracking-[1px] uppercase border px-2.5 py-1 rounded-full font-dm bg-negro/60 backdrop-blur-sm ${DIFICULTAD_STYLE[tour.dificultad]}`}>
                  {en ? DIF_LABEL_EN[tour.dificultad] : tour.dificultad}
                </span>
                {/* El Edén va con el horario del jardín (`horaTexto`), que no
                    abre todos los días: a ése no se le promete salida diaria. */}
                {!recogidaDeTour(tour).horaTexto && (
                  <span className="absolute top-3 right-3 z-10 bg-verde-selva/90 backdrop-blur-sm text-white text-[9px] font-dm font-bold tracking-[1px] px-2.5 py-1 rounded-full">
                    {en ? "Daily departures" : "Salidas todos los días"}
                  </span>
                )}
                <span className="absolute bottom-3 left-3 z-10 bg-negro/70 backdrop-blur-sm text-crema/85 text-[9px] font-dm tracking-[1px] px-2.5 py-1 rounded-full">
                  {tourDurTexto(tour, en ? " hours" : " horas")}
                </span>
                {/* El sello de la Garantía Huasteca, solo en los recorridos
                    que lo llevan. Sustituye al emblema que dibujaba el lugar:
                    aquél repetía lo que la foto ya decía, éste dice algo que la
                    foto no puede decir. */}
                {tour.garantiaHuasteca && (
                  <SelloGarantia
                    size={64}
                    idSuffix={`-card-${tour.slug}`}
                    className="absolute bottom-3 right-3 z-20 transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                )}
              </div>


              {/* ── INFO ── */}
              <div className="flex flex-col flex-1 p-7">
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{tour.tipo}</p>
                {/* El nombre del tour se ve SIEMPRE, tenga logotipo o no: el
                    logo va sobre la foto y el nombre completo es lo que dice a
                    dónde se va. Antes se ocultaba a la vista cuando había logo
                    y el visitante perdía la mitad del título. */}
                <h3 className="font-cormorant text-crema text-2xl leading-tight mb-1">
                  {tour.nombre}
                </h3>
                <p className="text-[10px] tracking-[1px] uppercase text-dorado/70 font-dm mb-3">{tour.tagline}</p>

                {/* Breve descripción de lo que se hace en el recorrido */}
                <p className="text-[12.5px] text-crema/60 font-dm leading-relaxed mb-4 line-clamp-3">{tour.descripcion}</p>

                {/* 🔴 Cada tarjeta repetía "★★★★★ 4.7 · 161 reseñas de Google":
                    diez veces en la misma página, pegado al nombre del tour, se
                    leía como la nota de ESE recorrido. Es la del negocio y ya
                    sale una vez en la cabecera (ver la regla de `resenas.ts`).
                    Aquí solo queda lo que sí es del recorrido: que es nuevo. */}
                {tour.reviewCount === 0 && (
                  <p className="text-[11px] text-verde-vivo/85 font-dm mb-4">
                    {en ? "New tour" : "Recorrido nuevo"}
                  </p>
                )}

                {/* Todos los destinos que se visitan en el recorrido */}
                <div className="mb-5">
                  <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2">{en ? "Stops on this tour" : "Visitas en este recorrido"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tour.destinos.map((d) => (
                      <span key={d} className="text-[10px] font-dm text-crema/60 border border-white/10 bg-white/[0.03] px-2 py-0.5 rounded-full">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-5 text-[11px] text-crema/45 font-dm flex-wrap border-t border-white/8 pt-5">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                    {tourDurTexto(tour)}
                  </span>
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "max." : "máx."} {tour.groupMax}</span>
                  {!recogidaDeTour(tour).horaTexto && (
                    <span className="text-verde-vivo/70 font-medium">{en ? "Daily departures" : "Salidas diarias"}</span>
                  )}
                </div>

                <div className="mb-5">
                  <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-1">{en ? "from" : "desde"}</p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-cormorant text-dorado text-3xl font-light leading-none">{money(tour.precio)}</span>
                    {precioTachado(tour) && (
                      <>
                        <span className="text-[11px] text-crema/30 font-dm line-through">{money(precioTachado(tour)!)}</span>
                        <span className="border border-dorado/40 bg-dorado/10 text-dorado text-[9px] font-dm tracking-wide px-1.5 py-0.5">
                          {en ? `save $${promoDe(tour)!.monto}` : `−$${promoDe(tour)!.monto}`}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-[9px] text-crema/35 font-dm mt-1">
                    MXN {etiquetaUnidad(tour, en)}
                  </p>
                </div>

                {/* Actividades opcionales con costo aparte. El dato ya vivía en
                    `addOns` y solo se veía al reservar: quien comparaba en el
                    catálogo no sabía que el salto se paga aparte. */}
                {tour.addOns && tour.addOns.length > 0 && (
                  <ul className="mb-5 space-y-1">
                    {tour.addOns.map((extra) => (
                      <li key={extra.id} className="flex items-center justify-between gap-3 text-[10.5px] font-dm border border-white/10 bg-white/[0.03] rounded px-2.5 py-1.5">
                        <span className="text-crema/70">{extra.nombre}</span>
                        <span className="text-dorado whitespace-nowrap">
                          +{money(extra.precio)} MXN {en ? "per person" : "por persona"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Señal de urgencia honesta (campo real por tour) + CTA */}
                <div className="mt-auto">
                  {tour.urgencia && (
                    <p className="flex items-start gap-1.5 text-[10px] text-dorado/85 font-dm mb-3 leading-snug">
                      <span aria-hidden="true" className="mt-px">⚡</span>
                      <span>{tour.urgencia}</span>
                    </p>
                  )}
                  <span className="block text-center rounded bg-verde-selva group-hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3.5 transition-colors duration-200">
                    {en ? "View full tour →" : "Ver tour completo →"}
                  </span>
                  <Link
                    href={urlComparar("recorridos", [tour.slug], { locale, origen: "tarjeta" })}
                    className="relative z-10 flex items-center justify-center min-h-[44px] mt-1 font-dm text-[11px] tracking-[1px] text-crema/60 hover:text-dorado underline decoration-white/20 underline-offset-4 transition-colors"
                  >
                    {comparadorUI(locale).entradas.parecidos}
                  </Link>
                </div>
              </div>
            </article>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!en && (
          <p className="text-center text-crema/50 font-dm text-xs mt-12">
            ¿Comparando opciones? Consulta la{" "}
            <Link href="/precios" className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
              lista completa de precios de tours y paquetes →
            </Link>
          </p>
        )}
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="relative bg-verde-profundo/20 border-y border-white/6 py-20 px-6 overflow-hidden">
        <FloatingLeaves count={16} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="reveal-fade text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{en ? "Simple and hassle-free" : "Simple y sin complicaciones"}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-14" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {en ? <>How it <em className="shimmer-gold">works</em></> : <>Cómo <em className="shimmer-gold">funciona</em></>}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMO_FUNCIONA.map((step, i) => (
              <div key={step.num} className="reveal-up text-center" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-cormorant text-dorado/30 leading-none mb-4" style={{ fontSize: "clamp(60px,8vw,80px)" }}>{step.num}</div>
                <h3 className="font-cormorant text-crema text-xl mb-3">{step.titulo}</h3>
                <p className="text-crema/50 font-dm text-sm leading-relaxed">{step.detalle}</p>
              </div>
            ))}
          </div>
          {/* La regla de salida y sus excepciones, armadas del catálogo
              (`excepcionesSalida`). El hero enlaza aquí en vez de cargar el
              párrafo entero: es lo que el paso 03 promete sin detallar. */}
          <div id="salidas" className="reveal-up scroll-mt-32 mt-14 max-w-3xl mx-auto border border-white/10 bg-negro/30 px-6 py-5">
            <h3 className="text-[10px] tracking-[3px] uppercase text-verde-vivo font-dm mb-2">
              {en ? "Where and when we pick you up" : "Dónde y a qué hora pasamos por ti"}
            </h3>
            <p className="text-crema/60 font-dm text-sm leading-relaxed">{excepcionesSalida(locale)}</p>
          </div>
          <div className="reveal-up text-center mt-14">
            {/* El cierre de la página también arranca con reservar en línea:
                antes solo ofrecía WhatsApp, así que quien bajaba hasta el final
                —el más decidido— salía del canal automático. */}
            <Link href={lp("/reservar")} className="inline-flex items-center justify-center gap-2.5 bg-dorado hover:bg-lima text-negro px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors duration-200 min-h-[44px]">
              {en ? "Book a tour" : "Reservar tour"}
            </Link>
            <a href={waLink(waGeneral)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[44px]">
              {WA_SVG}
              {en ? "Book on WhatsApp" : "Reservar por WhatsApp"}
            </a>
            <p className="text-crema/40 font-dm text-[11px] mt-3">{en ? "We reply in under an hour · Mon–Sun" : "Respondemos en menos de una hora · Lun–Dom"}</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="reveal-fade text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{en ? "What our travelers say" : "Lo que dicen nuestros viajeros"}</p>
        <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-14" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          {en ? <>Real <em className="shimmer-gold">experiences</em></> : <>Experiencias <em className="shimmer-gold">reales</em></>}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIOS.map((t, i) => (
            <div key={t.nombre} className="reveal-up border border-white/8 bg-negro/30 p-6 flex flex-col" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" aria-hidden="true" />))}
              </div>
              <p className="text-crema/70 font-dm text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.texto}&rdquo;</p>
              <div>
                <p className="text-crema font-dm text-sm font-medium">{t.nombre}</p>
                <p className="text-crema/35 font-dm text-[10px] mt-0.5">{t.ciudad}</p>
                <p className="text-verde-vivo font-dm text-[10px] mt-1 tracking-wide">✓ {t.tour}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ATENCIÓN A GRUPOS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-white/10 overflow-hidden">
          <div className="p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-white/10">
            <span className="reveal-fade inline-block text-[9px] tracking-[3px] uppercase text-verde-vivo border border-verde-selva/40 px-3 py-1 font-dm mb-5">{en ? `Groups · ${GRUPO_MIN}–${GRUPO_MAX} people` : `Grupos · ${GRUPO_MIN}–${GRUPO_MAX} personas`}</span>
            <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3vw,36px)" }}>{en ? "Shared group tours" : "Tours en grupo compartido"}</h2>
            <p className="text-crema/60 font-dm text-sm leading-relaxed mb-6">
              {en
                ? `Experience it with other travelers. Small groups of max. ${GRUPO_MAX} people to guarantee personal attention, access to exclusive corners and a pace no tour bus can offer. Traveling with more? Talk to the team and we'll arrange a private departure.`
                : `Vive la experiencia con otros viajeros. Grupos pequeños de máximo ${GRUPO_MAX} personas para garantizar atención personalizada, acceso a rincones exclusivos y un ritmo que ningún autobús turístico puede ofrecer. ¿Son más? Habla con el equipo y armamos una salida privada.`}
            </p>
            <ul className="space-y-2 mb-7">
              {(en
                ? [`Max. ${GRUPO_MAX} people per group — more? talk to the team`, "Dedicated guide the whole trip", "Round-trip transport from your accommodation on most tours", `From ${money(precioMinPersona)} MXN per person`]
                : [`Máximo ${GRUPO_MAX} personas por grupo — si son más, habla con el equipo`, "Guía dedicado todo el recorrido", "Traslado redondo desde tu hospedaje en casi todos los recorridos", `Precio desde ${money(precioMinPersona)} MXN por persona`]
              ).map(item => (
                <li key={item} className="flex items-start gap-2 text-xs font-dm text-crema/65"><span className="text-verde-vivo mt-0.5 flex-shrink-0">✓</span>{item}</li>
              ))}
            </ul>
            <a href="#tours-grid" className="inline-block border border-verde-selva/50 text-verde-vivo px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-selva/15 transition-colors">{en ? "View all tours →" : "Ver todos los tours →"}</a>
          </div>

          <div className="p-8 md:p-10 bg-dorado/8">
            <span className="reveal-fade inline-block text-[9px] tracking-[3px] uppercase text-dorado border border-dorado/40 px-3 py-1 font-dm mb-5">{en ? "Private Tour · Exclusive" : "Tour Privado · Exclusivo"}</span>
            <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3vw,36px)" }}>
              {en ? <>Your group, your pace,<br/><em className="text-dorado">your experience</em></> : <>Tu grupo, tu ritmo,<br/><em className="text-dorado">tu experiencia</em></>}
            </h2>
            <p className="text-crema/60 font-dm text-sm leading-relaxed mb-6">
              {en
                ? "Ideal for families, corporate teams, bachelor/ette parties, anniversaries or any special occasion. A private transport unit just for you — you move at your own pace and have the guide entirely at your disposal, with no fixed schedules and no strangers."
                : "Ideal para familias, equipos corporativos, despedidas, aniversarios o cualquier ocasión especial. Una unidad de transporte privada solo para ustedes, se mueven a sus tiempos y tienen al guía a su entera disposición — sin horarios fijos y sin extraños."}
            </p>
            <ul className="space-y-2 mb-7">
              {(en
                ? ["A private transport unit just for your group", "Move at your own pace — no fixed schedules or waiting", "Your guide entirely at your disposal all day", "A custom itinerary tailored to you", `From ${money(privadoDesde)} MXN per person — the tour price plus ${money(PRIVADO_EXTRA_POR_PERSONA)}`, "Discounts for large groups"]
                : ["Unidad de transporte privada solo para tu grupo", "Se mueven a sus tiempos — sin horarios fijos ni esperas", "Tu guía a tu entera disposición todo el día", "Itinerario personalizado a tu medida", `Desde ${money(privadoDesde)} MXN por persona — el precio del recorrido más ${money(PRIVADO_EXTRA_POR_PERSONA)}`, "Descuentos para grupos grandes"]
              ).map(item => (
                <li key={item} className="flex items-start gap-2 text-xs font-dm text-crema/65"><span className="text-dorado mt-0.5 flex-shrink-0">✦</span>{item}</li>
              ))}
            </ul>
            <a href={waLink(en ? "Hi, I'd like information about private tours for my group." : "Hola, quiero información sobre tours privados para mi grupo.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-dorado hover:bg-terracota text-negro hover:text-crema px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors font-medium">
              {WA_SVG}
              {en ? "Get a private tour quote" : "Cotizar tour privado"}
            </a>
          </div>
        </div>
      </section>

      {/* ── PREGUNTAS FRECUENTES ──
          Mismo componente y mismo estilo que /paquetes: <details> nativo, sin
          JavaScript de cliente. Las respuestas salen del catálogo (ver
          `faqTours.ts`) y van también en el FAQPage de arriba. */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="reveal-fade text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {en ? "Before you book" : "Antes de reservar"}
        </p>
        <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-12" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          {en ? <>Frequently asked <em className="shimmer-gold">questions</em></> : <>Preguntas <em className="shimmer-gold">frecuentes</em></>}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details key={faq.q} className="border border-white/10 bg-negro/40">
              <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-verde-vivo flex-shrink-0 text-lg leading-none" aria-hidden="true">+</span>
              </summary>
              <div className="px-5 pb-5 border-t border-white/8 pt-4">
                <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
        <p className="text-center text-crema/45 font-dm text-xs mt-8">
          <Link href={lp("/preguntas-frecuentes")} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-4">
            {en ? "More questions: the full Huasteca Potosina FAQ →" : "¿Más dudas? Todas las preguntas sobre la Huasteca Potosina →"}
          </Link>
        </p>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative py-20 px-6 text-center bg-verde-profundo overflow-hidden">
        <FloatingLeaves count={18} />
        <div className="relative z-10">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{en ? "Have questions?" : "¿Tienes dudas?"}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
            {en ? <>Message us and we'll <em className="text-dorado">advise you</em></> : <>Escríbenos y te <em className="text-dorado">asesoramos</em></>}
          </h2>
          <p className="text-crema/70 font-dm text-sm max-w-md mx-auto mb-8">
            {en
              ? "Our team replies in under an hour. We'll help you choose the ideal tour for your dates, group and preferences."
              : "Nuestro equipo responde en menos de una hora. Te ayudamos a elegir el tour ideal según tus días, grupo y preferencias."}
          </p>
          <a href={waLink(waGeneral)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[44px]">
            {WA_SVG}
            +52 489 109 0388
          </a>
          <p className="mt-4 text-[10px] text-crema/50 font-dm">
            {en ? "✓ Free cancellation up to 48h before · No hidden fees" : "✓ Cancelación gratuita con 48h de anticipación · Sin cargos ocultos"}
          </p>
        </div>
      </section>
    </main>
  );
}
