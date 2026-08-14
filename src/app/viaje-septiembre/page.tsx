import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import type { LucideIcon } from "lucide-react";
import {
  MapPin, Waves, Bus, BedDouble, UtensilsCrossed, Camera, ShieldCheck,
  Check, Star, CalendarDays, Compass,
} from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { CountdownViaje } from "@/components/CountdownViaje";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, ORG_REF } from "@/lib/jsonld";

// Salida: miércoles 16 de septiembre de 2026, 7:00 AM (CDMX, UTC-6 todo el año desde 2022)
const TARGET = "2026-09-16T07:00:00-06:00";
const PRECIO = 7900;
const VALOR_TOTAL = 10200;
const HERO_IMG = "/imagenes/cascada-de-tamul/hero.jpg";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const title = en
    ? "September Trip CDMX → Huasteca 2026 — 4 days, 3 tours, all included"
    : "Viaje a la Huasteca desde CDMX — Puente de Septiembre 2026 · 4 días, 3 recorridos";
  const description = en
    ? "Scheduled group trip from Mexico City to Xilitla, Sept 16–19, 2026. 3 nights, round-trip transport, lodging at Hotel Paraíso Encantado and 3 guided all-inclusive tours. From $7,900 MXN/person."
    : "Viaje grupal programado de CDMX a Xilitla, 16–19 sep 2026. 3 noches, transporte redondo, hospedaje en Hotel Paraíso Encantado y 3 recorridos guiados todo incluido. Desde $7,900 MXN/persona.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/viaje-septiembre", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: en ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Viaje a la Huasteca Potosina" }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: buildAlternates("/viaje-septiembre", locale),
  };
}

// ── Datos (ES/EN) ─────────────────────────────────────────────────────────────
const IMG_DIA1 = "/imagenes/las-pozas-jardin-surrealista/hero.webp";
const IMG_DIA2 = "/imagenes/cascada-de-tamul/gallery-1.jpg";
const IMG_DIA3 = "/imagenes/puente-de-dios-tamasopo/hero-new.webp";
const IMG_DIA4 = "/imagenes/cascadas-de-tamasopo/hero.jpg";

type Dia = { Icon: LucideIcon; img: string; etiqueta: string; fecha: string; titulo: string; detalle: string };

const ITINERARIO_ES: Dia[] = [
  { Icon: MapPin,  img: IMG_DIA1, etiqueta: "Día 1", fecha: "Mié 16 sep", titulo: "Salida de CDMX → Xilitla + Las Pozas",
    detalle: "Salimos temprano de la Ciudad de México rumbo a la Huasteca. Llegada a Xilitla, Pueblo Mágico, check-in en el Hotel Paraíso Encantado y por la tarde recorremos Las Pozas, el jardín surrealista de Edward James." },
  { Icon: Compass, img: IMG_DIA2, etiqueta: "Día 2", fecha: "Jue 17 sep", titulo: "Expedición Tamul",
    detalle: "Día completo: navegamos el cañón del río hasta la Cascada de Tamul —la más alta de San Luis Potosí— con paradas en la Cueva del Agua y miradores que solo se conocen con guía local." },
  { Icon: Waves,   img: IMG_DIA3, etiqueta: "Día 3", fecha: "Vie 18 sep", titulo: "Ruta Acuática — Puente de Dios",
    detalle: "Nadamos en las aguas turquesa del Puente de Dios, recorremos la hacienda y las siete cascadas. Un día de agua cristalina y selva, a tu ritmo." },
  { Icon: Bus,     img: IMG_DIA4, etiqueta: "Día 4", fecha: "Sáb 19 sep", titulo: "Desayuno y regreso a CDMX",
    detalle: "Desayuno en el hotel, tiempo para las últimas fotos y emprendemos el viaje de regreso a la Ciudad de México con la maleta llena de recuerdos." },
];
const ITINERARIO_EN: Dia[] = [
  { Icon: MapPin,  img: IMG_DIA1, etiqueta: "Day 1", fecha: "Wed Sep 16", titulo: "Depart CDMX → Xilitla + Las Pozas",
    detalle: "We leave Mexico City early toward the Huasteca. Arrival in Xilitla, a Magic Town, check-in at Hotel Paraíso Encantado and an afternoon visit to Las Pozas, Edward James' surrealist garden." },
  { Icon: Compass, img: IMG_DIA2, etiqueta: "Day 2", fecha: "Thu Sep 17", titulo: "Tamul Expedition",
    detalle: "Full day: we navigate the river canyon up to Tamul Waterfall —the tallest in San Luis Potosí— with stops at the Water Cave and lookouts only locals know." },
  { Icon: Waves,   img: IMG_DIA3, etiqueta: "Day 3", fecha: "Fri Sep 18", titulo: "Water Route — Puente de Dios",
    detalle: "We swim in the turquoise waters of Puente de Dios and explore the hacienda and the seven waterfalls. A full day of crystal-clear water and jungle, at your own pace." },
  { Icon: Bus,     img: IMG_DIA4, etiqueta: "Day 4", fecha: "Sat Sep 19", titulo: "Breakfast and return to CDMX",
    detalle: "Breakfast at the hotel, time for last photos and we head back to Mexico City with a suitcase full of memories." },
];

const INCLUYE_ES = [
  "Transporte redondo CDMX ⇄ Xilitla en unidad cómoda",
  "3 noches en Hotel Paraíso Encantado Xilitla (ocupación doble)",
  "Desayuno los 3 días",
  "3 recorridos guiados completos: Edward James, Expedición Tamul y Puente de Dios",
  "Guías locales certificados NOM-09 SECTUR",
  "Todas las entradas y accesos de los recorridos",
  "Transporte local del hotel a cada recorrido",
  "Fotos y video de los recorridos",
];
const INCLUYE_EN = [
  "Round-trip transport CDMX ⇄ Xilitla in a comfortable vehicle",
  "3 nights at Hotel Paraíso Encantado Xilitla (double occupancy)",
  "Breakfast all 3 days",
  "3 full guided tours: Edward James, Tamul Expedition and Puente de Dios",
  "Local NOM-09 SECTUR certified guides",
  "All entrance fees and access for the tours",
  "Local transport from the hotel to each tour",
  "Photos and video of the tours",
];

const NO_INCLUYE_ES = [
  "Comidas y cenas (excepto los desayunos indicados)",
  "Gastos personales y propinas",
  "Actividades opcionales no listadas",
];
const NO_INCLUYE_EN = [
  "Lunches and dinners (except the breakfasts noted)",
  "Personal expenses and tips",
  "Optional activities not listed",
];

const VALOR_ES: { item: string; precio: string }[] = [
  { item: "Transporte redondo CDMX ⇄ Xilitla", precio: "$2,000" },
  { item: "3 noches en Hotel Paraíso Encantado", precio: "$2,400" },
  { item: "3 recorridos guiados (todo incluido)", precio: "$5,800" },
  { item: "Desayunos, entradas y guías NOM-09", precio: "Incluido" },
];
const VALOR_EN: { item: string; precio: string }[] = [
  { item: "Round-trip transport CDMX ⇄ Xilitla", precio: "$2,000" },
  { item: "3 nights at Hotel Paraíso Encantado", precio: "$2,400" },
  { item: "3 guided tours (all inclusive)", precio: "$5,800" },
  { item: "Breakfasts, entrance fees & NOM-09 guides", precio: "Included" },
];

const FAQ_ES = [
  { q: "¿Desde dónde sale el viaje?", a: "Desde un punto de encuentro en la Ciudad de México (te lo confirmamos al apartar). La salida es la mañana del miércoles 16 de septiembre de 2026." },
  { q: "¿Cómo aparto mi lugar?", a: "Escríbenos por WhatsApp y aparta con un anticipo. El cupo es limitado por el transporte, así que los lugares se reservan por orden de anticipo." },
  { q: "¿El precio es por persona?", a: "Sí, $7,900 por persona en ocupación doble. Si viajas solo/a o prefieren habitación individual, escríbenos y lo cotizamos." },
  { q: "¿Qué pasa si se llena?", a: "Al ser un viaje grupal con cupo limitado, una vez lleno abrimos lista de espera. Apartar con anticipo asegura tu lugar." },
];
const FAQ_EN = [
  { q: "Where does the trip depart from?", a: "From a meeting point in Mexico City (we confirm it when you book). Departure is the morning of Wednesday, September 16, 2026." },
  { q: "How do I reserve my spot?", a: "Message us on WhatsApp and reserve with a deposit. Capacity is limited by transport, so spots are held in order of deposit." },
  { q: "Is the price per person?", a: "Yes, $7,900 per person in double occupancy. If you travel solo or prefer a single room, message us and we'll quote it." },
  { q: "What if it sells out?", a: "Since it's a small-capacity group trip, once full we open a waitlist. Reserving with a deposit secures your spot." },
];

const QUICK_ES: { Icon: LucideIcon; t: string }[] = [
  { Icon: Bus, t: "Transporte redondo CDMX" },
  { Icon: BedDouble, t: "3 noches de hotel" },
  { Icon: Compass, t: "3 recorridos guiados" },
  { Icon: UtensilsCrossed, t: "Desayunos incluidos" },
  { Icon: ShieldCheck, t: "Guías NOM-09" },
  { Icon: Camera, t: "Fotos y video" },
];
const QUICK_EN: { Icon: LucideIcon; t: string }[] = [
  { Icon: Bus, t: "Round-trip from CDMX" },
  { Icon: BedDouble, t: "3 hotel nights" },
  { Icon: Compass, t: "3 guided tours" },
  { Icon: UtensilsCrossed, t: "Breakfasts included" },
  { Icon: ShieldCheck, t: "NOM-09 guides" },
  { Icon: Camera, t: "Photos & video" },
];

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

export default function ViajeSeptiembrePage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  const ITINERARIO = en ? ITINERARIO_EN : ITINERARIO_ES;
  const INCLUYE = en ? INCLUYE_EN : INCLUYE_ES;
  const NO_INCLUYE = en ? NO_INCLUYE_EN : NO_INCLUYE_ES;
  const VALOR = en ? VALOR_EN : VALOR_ES;
  const FAQ = en ? FAQ_EN : FAQ_ES;
  const QUICK = en ? QUICK_EN : QUICK_ES;

  const waMsg = en
    ? "Hi! I'd like to reserve my spot on the September trip to the Huasteca (Sep 16–19, 3 nights, departing from CDMX). How do I pay the deposit?"
    : "¡Hola! Quiero apartar mi lugar en el Viaje a la Huasteca del 16 al 19 de septiembre (3 noches, salida desde CDMX). ¿Cómo doy el anticipo?";
  const fechasTxt = en ? "September 16–19, 2026 · 4 days / 3 nights" : "16–19 de septiembre 2026 · 4 días / 3 noches";

  const url = `${SITE}${lp("/viaje-septiembre")}`;

  // Schema.org del viaje programado: es un producto con fecha fija, así que se
  // declara como TouristTrip + Event (Google entiende mejor las fechas de salida).
  const viajeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: en ? "September Trip: Mexico City → Huasteca Potosina 2026" : "Viaje a la Huasteca Potosina desde CDMX — Puente de Septiembre 2026",
        description: en
          ? "Scheduled group trip from Mexico City to Xilitla, September 16–19, 2026: round-trip transport, 3 nights at Hotel Paraíso Encantado, breakfasts and 3 guided all-inclusive tours."
          : "Viaje grupal programado de CDMX a Xilitla, 16–19 de septiembre de 2026: transporte redondo, 3 noches en el Hotel Paraíso Encantado, desayunos y 3 recorridos guiados todo incluido.",
        url,
        image: `${SITE}${HERO_IMG}`,
        inLanguage: en ? "en" : "es-MX",
        provider: ORG_REF,
        itinerary: {
          "@type": "ItemList",
          numberOfItems: ITINERARIO.length,
          itemListElement: ITINERARIO.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: d.titulo,
              description: d.detalle,
              address: { "@type": "PostalAddress", addressRegion: "San Luis Potosí", addressCountry: "MX" },
            },
          })),
        },
        offers: {
          "@type": "Offer",
          price: PRECIO,
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url,
          description: en ? "Per person, double occupancy" : "Por persona en ocupación doble",
          validThrough: "2026-09-16",
          seller: ORG_REF,
        },
      },
      {
        "@type": "Event",
        name: en ? "September Trip: Mexico City → Huasteca Potosina" : "Viaje a la Huasteca Potosina desde CDMX (Puente de Septiembre)",
        startDate: "2026-09-16T07:00:00-06:00",
        endDate: "2026-09-19T22:00:00-06:00",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: `${SITE}${HERO_IMG}`,
        url,
        description: en
          ? "4 days / 3 nights in the Huasteca Potosina departing from Mexico City. Transport, lodging, breakfasts and 3 guided tours included."
          : "4 días / 3 noches en la Huasteca Potosina con salida desde CDMX. Transporte, hospedaje, desayunos y 3 recorridos guiados incluidos.",
        location: {
          "@type": "Place",
          name: "Xilitla, Huasteca Potosina",
          address: { "@type": "PostalAddress", addressLocality: "Xilitla", addressRegion: "San Luis Potosí", addressCountry: "MX" },
        },
        organizer: ORG_REF,
        offers: {
          "@type": "Offer",
          price: PRECIO,
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url,
          validFrom: "2026-06-20",
        },
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: en ? "September trip" : "Viaje de septiembre", item: url },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      {/* La empresa con su `@id`: el `provider`/`seller` de abajo la referencia. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd(locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(viajeSchema) }} />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-36 pb-24 overflow-hidden min-h-[640px] flex items-center">
        <Image src={HERO_IMG} alt="Cascada de Tamul — Huasteca Potosina" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-negro/75 via-negro/60 to-negro/90" />
        <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ {en ? "Scheduled group trip · September long weekend" : "Viaje grupal programado · Puente de Septiembre"}
          </p>
          <h1 className="reveal-up font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(38px,6.5vw,72px)" }}>
            {en ? "The Huasteca from " : "La Huasteca desde "}
            <em className="shimmer-gold not-italic">CDMX</em>
          </h1>
          <p className="reveal-up text-crema/80 font-dm text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-3" style={{ animationDelay: "80ms" }}>
            {en
              ? "A done-for-you trip: round-trip transport, 3 nights of lodging and 3 guided all-inclusive tours. You just show up."
              : "Un viaje resuelto: transporte redondo, 3 noches de hospedaje y 3 recorridos guiados todo incluido. Tú solo llega."}
          </p>
          <p className="reveal-up inline-flex items-center gap-2 text-dorado font-dm text-xs tracking-[2px] uppercase mb-8" style={{ animationDelay: "120ms" }}>
            <CalendarDays className="w-4 h-4" aria-hidden="true" /> {fechasTxt}
          </p>

          <div className="mb-9"><CountdownViaje target={TARGET} en={en} variant="hero" /></div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-9 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[48px]">
              {WA_SVG}
              {en ? "Reserve with a deposit" : "Apartar con anticipo"}
            </a>
            <a href="#detalle" className="inline-flex items-center gap-2 border border-white/25 text-crema hover:bg-white/10 px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[48px]">
              {en ? "See the itinerary" : "Ver el itinerario"}
            </a>
          </div>
          <p className="mt-5 text-[11px] text-crema/45 font-dm">
            {en ? "From " : "Desde "}<span className="text-dorado font-medium">{money(PRECIO)} MXN</span>{en ? " / person · only 16 spots" : " / persona · solo 16 lugares"}
          </p>
        </div>
      </section>

      {/* ── QUICK INCLUDED ── */}
      <section className="border-b border-white/6 bg-negro/80 py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          {QUICK.map(({ Icon, t }) => (
            <div key={t} className="flex flex-col items-center gap-2">
              <Icon className="w-6 h-6 text-verde-vivo" aria-hidden="true" />
              <p className="text-[10px] text-crema/55 font-dm leading-tight">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ITINERARIO ── */}
      <section id="detalle" className="relative max-w-4xl mx-auto px-6 py-20 scroll-mt-24">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">{en ? "Day by day" : "Día por día"}</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            {en ? "Your 4 days in the " : "Tus 4 días en la "}<em className="text-dorado">Huasteca</em>
          </h2>
        </div>
        <div className="space-y-4">
          {ITINERARIO.map((d) => (
            <div key={d.etiqueta} className="flex flex-col sm:flex-row border border-white/8 bg-negro/40 hover:border-verde-vivo/30 transition-colors overflow-hidden">
              <div className="relative h-44 sm:h-auto sm:w-52 flex-shrink-0">
                <Image src={d.img} alt={d.titulo} fill className="object-cover" sizes="(max-width: 640px) 100vw, 210px" />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/70 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-negro/60" />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-negro/70 backdrop-blur-sm text-crema text-[9px] tracking-[2px] uppercase font-dm px-2.5 py-1">
                  <d.Icon className="w-3.5 h-3.5 text-dorado" aria-hidden="true" /> {d.etiqueta}
                </span>
              </div>
              <div className="p-6 min-w-0 flex-1">
                <span className="text-[10px] text-crema/40 font-dm">{d.fecha}</span>
                <h3 className="font-cormorant text-crema text-xl leading-tight mb-2 mt-0.5">{d.titulo}</h3>
                <p className="text-sm text-crema/60 font-dm leading-relaxed">{d.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INCLUYE / NO INCLUYE ── */}
      <section className="relative bg-verde-profundo/25 border-y border-white/6 py-20 px-6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-5 font-dm">{en ? "All included" : "Todo incluido"}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INCLUYE.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-crema/70 font-dm leading-relaxed">
                  <Check className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />{item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-5 font-dm">{en ? "Not included" : "No incluye"}</p>
            <ul className="space-y-3">
              {NO_INCLUYE.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-crema/45 font-dm leading-relaxed">
                  <span className="text-crema/30 flex-shrink-0 mt-0.5">—</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── HOSPEDAJE ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative h-64 md:h-72 overflow-hidden border border-white/8">
            <Image src="/imagenes/hotel-paraiso-encantado/hero.jpg" alt="Hotel Paraíso Encantado, Xilitla" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-3 font-dm">{en ? "Where you'll stay" : "Dónde te hospedas"}</p>
            <h2 className="font-cormorant font-light text-crema mb-3 leading-tight" style={{ fontSize: "clamp(24px,3.5vw,38px)" }}>
              Hotel Paraíso Encantado <em className="text-dorado">Xilitla</em>
            </h2>
            <p className="text-crema/60 font-dm text-sm leading-relaxed">
              {en
                ? "3 nights at a hotel minutes from Edward James' garden, with jungle views and typical breakfasts — the best base to explore the Huasteca."
                : "3 noches en un hotel a minutos del Jardín de Edward James, con vista a la selva y desayunos típicos. La mejor base para explorar la Huasteca."}
            </p>
          </div>
        </div>
      </section>

      {/* ── PRECIO + ANCLAJE + URGENCIA ── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="border border-dorado/25 bg-gradient-to-b from-dorado/8 to-transparent p-8 sm:p-10 text-center">
          <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-6 font-dm">{en ? "Trip price" : "Precio del viaje"}</p>

          <div className="max-w-sm mx-auto mb-7 text-left">
            {VALOR.map((v) => (
              <div key={v.item} className="flex items-center justify-between gap-4 py-2 border-b border-white/8 last:border-0">
                <span className="text-[13px] text-crema/60 font-dm">{v.item}</span>
                <span className="text-[13px] text-crema/45 font-dm whitespace-nowrap">{v.precio}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 pt-3 mt-1">
              <span className="text-[11px] tracking-[1px] uppercase text-crema/40 font-dm">{en ? "Separate value" : "Valor por separado"}</span>
              <span className="text-[13px] text-crema/35 font-dm line-through whitespace-nowrap">{money(VALOR_TOTAL)}</span>
            </div>
          </div>

          <p className="text-[10px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{en ? "Your price" : "Tu precio"}</p>
          <p className="font-cormorant text-dorado leading-none mb-1" style={{ fontSize: "clamp(48px,8vw,76px)" }}>{money(PRECIO)}</p>
          <p className="text-[11px] text-crema/45 font-dm mb-2">MXN {en ? "per person · double occupancy" : "por persona · ocupación doble"}</p>
          <p className="text-[12px] text-verde-vivo font-dm mb-6">
            {en ? `You save over ${money(VALOR_TOTAL - PRECIO)} MXN` : `Ahorras más de ${money(VALOR_TOTAL - PRECIO)} MXN`}
          </p>

          {/* Tarifas por ocupación (aprox., por confirmar) */}
          <div className="max-w-xs mx-auto mb-8 border-t border-white/8 pt-5 space-y-1.5 text-left">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{en ? "Per person, by room" : "Por persona, según habitación"}</p>
            {(en
              ? [["Double occupancy", "$7,900"], ["Triple occupancy", "$7,500"], ["Quad occupancy", "$7,200"], ["Single room", "$9,900"]]
              : [["Ocupación doble", "$7,900"], ["Ocupación triple", "$7,500"], ["Ocupación cuádruple", "$7,200"], ["Habitación individual", "$9,900"]]
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-crema/55 font-dm">{k}</span>
                <span className="text-[12px] text-crema/75 font-dm whitespace-nowrap">{v} <span className="text-crema/30">MXN</span></span>
              </div>
            ))}
          </div>

          <div className="mb-7 flex justify-center"><CountdownViaje target={TARGET} en={en} variant="inline" /></div>

          <p className="inline-flex items-center gap-2 text-[11px] text-dorado/85 font-dm mb-6">
            <span aria-hidden="true">⚡</span>
            {en ? "Only 16 spots — held in order of deposit" : "Solo 16 lugares — se aparta por orden de anticipo"}
          </p>

          <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-9 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[48px]">
            {WA_SVG}
            {en ? "Reserve my spot on WhatsApp" : "Apartar mi lugar por WhatsApp"}
          </a>
          <p className="mt-3 text-[12px] text-crema/60 font-dm">{en ? "Reserve with a $2,000 deposit · pay the balance before Sep 16" : "Aparta con $2,000 de anticipo · liquidas antes del 16 de sep"}</p>
          <p className="mt-1.5 text-[11px] text-crema/35 font-dm">{en ? "We reply in under an hour · Mon–Sun" : "Respondemos en menos de una hora · Lun–Dom"}</p>
        </div>
      </section>

      {/* ── CÓMO RESERVAR + GRUPOS (inspirado en agencias tipo Mundo Joven) ── */}
      <section className="max-w-4xl mx-auto px-6 pb-4">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">{en ? "How to book" : "Cómo reservar"}</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
            {en ? "Three easy steps" : "Tres pasos sencillos"}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {(en
            ? [
                { n: "01", t: "Write us on WhatsApp", d: "Tell us how many of you are coming and we hold your spot with a $2,000 deposit." },
                { n: "02", t: "We confirm your place", d: "We send you the meeting point, what to bring and the payment details." },
                { n: "03", t: "Pay the balance before the trip", d: "Settle the rest before September 16 and just get ready to enjoy." },
              ]
            : [
                { n: "01", t: "Escríbenos por WhatsApp", d: "Dinos cuántos van y apartamos tu lugar con un anticipo de $2,000." },
                { n: "02", t: "Confirmamos tu lugar", d: "Te enviamos el punto de encuentro, qué llevar y los datos de pago." },
                { n: "03", t: "Liquidas antes del viaje", d: "Pagas el resto antes del 16 de septiembre y solo te preparas para disfrutar." },
              ]
          ).map((s) => (
            <div key={s.n} className="text-center md:text-left">
              <div className="font-cormorant text-dorado/30 leading-none mb-2" style={{ fontSize: "clamp(40px,6vw,56px)" }}>{s.n}</div>
              <h3 className="font-cormorant text-crema text-lg mb-1.5">{s.t}</h3>
              <p className="text-crema/55 font-dm text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-crema/45 font-dm mb-10 -mt-2">
          {en
            ? "Departure 7:00 AM from Mexico City (Terminal Norte — exact point on confirmation) · Pay by bank transfer or card · ask about monthly installments."
            : "Salida 7:00 AM desde CDMX (Terminal Norte — punto exacto al confirmar) · Pago por transferencia o tarjeta · pregunta por meses sin intereses."}
        </p>

        {/* Grupos grandes */}
        <div className="border border-white/10 bg-verde-profundo/30 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-cormorant text-crema text-lg leading-tight">{en ? "Traveling as a big group? (10+)" : "¿Van en grupo grande? (10+)"}</p>
            <p className="text-crema/55 font-dm text-[13px]">{en ? "We arrange special pricing and a private departure." : "Armamos precio especial y salida privada para tu grupo."}</p>
          </div>
          <a
            href={waLink(en
              ? "Hi! We're a group of 10+ interested in the September trip to the Huasteca. Could you send us a special quote?"
              : "¡Hola! Somos un grupo de 10+ interesados en el viaje de septiembre a la Huasteca. ¿Nos pueden cotizar un precio especial?")}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors whitespace-nowrap"
          >
            {WA_SVG}{en ? "Get a group quote" : "Cotizar grupo"}
          </a>
        </div>
      </section>

      {/* ── RECOMENDACIONES / QUÉ LLEVAR ── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-5 font-dm text-center">{en ? "What to pack" : "Qué llevar"}</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {(en
            ? ["Light clothing", "Swimsuit", "Water shoes / sandals", "Towel", "Biodegradable sunscreen", "Insect repellent", "Cash", "Power bank", "Light jacket"]
            : ["Ropa ligera", "Traje de baño", "Calzado para agua / sandalias", "Toalla", "Bloqueador biodegradable", "Repelente", "Efectivo", "Power bank", "Chamarra ligera"]
          ).map((item) => (
            <span key={item} className="text-[11px] font-dm text-crema/65 border border-white/12 bg-white/[0.03] px-3 py-1.5 rounded-sm">{item}</span>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="font-cormorant text-crema text-2xl mb-8 text-center">{en ? "Frequently asked " : "Preguntas "}<em className="text-dorado">{en ? "questions" : "frecuentes"}</em></h2>
        <div className="space-y-4">
          {FAQ.map((faq) => (
            <details key={faq.q} className="border border-white/10 bg-negro/40">
              <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-verde-vivo flex-shrink-0 text-lg leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 border-t border-white/8 pt-4">
                <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
        <p className="text-center text-[12px] text-crema/40 font-dm mt-8">
          {en ? "Prefer to build your own dates? " : "¿Prefieres armar tus propias fechas? "}
          <Link href={lp("/paquetes")} className="text-verde-vivo hover:text-lima underline underline-offset-2">
            {en ? "See our packages →" : "Ver nuestros paquetes →"}
          </Link>
        </p>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative bg-verde-profundo/40 border-t border-white/6 py-16 px-6 text-center overflow-hidden">
        <FloatingLeaves count={12} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-dorado text-dorado" aria-hidden="true" />))}
          </div>
          <h2 className="font-cormorant text-crema mb-3" style={{ fontSize: "clamp(26px,4vw,44px)" }}>
            {en ? "One trip. Zero logistics." : "Un viaje. Cero logística."}
          </h2>
          <p className="text-crema/55 font-dm text-sm mb-8 max-w-md mx-auto leading-relaxed">
            {en
              ? "We organize transport, hotel and the three best tours of the region. You just enjoy the Huasteca."
              : "Nosotros organizamos transporte, hotel y los tres mejores recorridos de la región. Tú solo disfruta la Huasteca."}
          </p>
          <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[48px]">
            {WA_SVG}
            {en ? "Reserve with a deposit" : "Apartar con anticipo"}
          </a>
        </div>
      </section>

    </main>
  );
}
