import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import { TOURS_DB, TOURS_DESTACADOS, tourDurTexto } from "@/lib/tours";
import { GuideProfile } from "@/components/GuideProfile";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import type { LucideIcon } from "lucide-react";
import { Award, Bus, Calendar, Camera, CheckCircle2, Clock, MessageCircle, Star, Users } from "lucide-react";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { PageViewTracker } from "@/components/PageViewTracker";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeTour } from "@/lib/i18n/localize";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  // El conteo y el precio de arranque salen de TOURS_DB: escritos a mano se
  // habían quedado en "8 tours desde $1,300" cuando ya son 10 desde $900, y el
  // gancho de precio más fuerte del catálogo no se estaba usando.
  const nTours = TOURS_DB.length;
  const desde = Math.min(...TOURS_DB.map((t) => t.precio));
  const desdeTxt = `$${desde.toLocaleString("es-MX")}`;
  const title = en
    ? `Huasteca Potosina Tours 2026 · All-Inclusive from ${desdeTxt}`
    : `Tours Huasteca Potosina 2026 · Todo Incluido desde ${desdeTxt}`;
  const description = en
    ? `${nTours} guided tours with transport, breakfast, entrance fees and a NOM-09 certified guide. Free cancellation 48h before. Book with 30% deposit.`
    : `${nTours} tours guiados con transporte, desayuno, entradas y guía NOM-09 incluidos. Cancela gratis con 48h. Aparta con el 30 %.`;
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

const BADGES_ES: { Icon: LucideIcon; title: string; sub: string }[] = [
  { Icon: Award,         title: "Guías Certificados",    sub: "NOM-09 SECTUR" },
  { Icon: Bus,           title: "Transporte Incluido",   sub: "Desde tu hotel" },
  { Icon: Camera,        title: "Fotos & Video",         sub: "Del recorrido completo" },
  { Icon: CheckCircle2,  title: "Todo Incluido",         sub: "Sin costos ocultos" },
  { Icon: MessageCircle, title: "Respuesta en < 1 hora", sub: "Lun–Dom, todo el día" },
  { Icon: CheckCircle2,  title: "Confirmación inmediata",sub: "Por WhatsApp al reservar" },
];
const BADGES_EN: { Icon: LucideIcon; title: string; sub: string }[] = [
  { Icon: Award,         title: "Certified Guides",     sub: "NOM-09 SECTUR" },
  { Icon: Bus,           title: "Transport Included",   sub: "From your hotel" },
  { Icon: Camera,        title: "Photos & Video",       sub: "Of the whole trip" },
  { Icon: CheckCircle2,  title: "All Inclusive",        sub: "No hidden costs" },
  { Icon: MessageCircle, title: "Reply in < 1 hour",    sub: "Mon–Sun, all day" },
  { Icon: CheckCircle2,  title: "Instant confirmation", sub: "On WhatsApp when you book" },
];

const COMO_FUNCIONA_ES = [
  { num: "01", titulo: "Escríbenos por WhatsApp", detalle: "Cuéntanos cuántas personas son, qué fechas manejan y qué tours te interesan. Respondemos en menos de una hora." },
  { num: "02", titulo: "Confirmamos y apartamos tu lugar", detalle: "Te enviamos los detalles del tour: dónde y a qué hora pasamos por ti, lista de qué llevar y el link de pago." },
  { num: "03", titulo: "Disfruta sin preocupaciones", detalle: "El día del tour solo preocúpate de llegar. Todo lo demás —transporte, entradas, desayuno, guía— ya está incluido." },
];
const COMO_FUNCIONA_EN = [
  { num: "01", titulo: "Message us on WhatsApp", detalle: "Tell us how many people you are, what dates work for you and which tours you're interested in. We reply in under an hour." },
  { num: "02", titulo: "We confirm and reserve your spot", detalle: "We send you the tour details: meeting point, departure time, a what-to-bring list and the payment link." },
  { num: "03", titulo: "Enjoy, worry-free", detalle: "On tour day, all you have to do is show up. Everything else — transport, entrance fees, breakfast, guide — is already included." },
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
  // Destacados primero: son los que concentran el interés real (ver TOURS_DESTACADOS).
  const destacados = tours.filter((t) => (TOURS_DESTACADOS as readonly string[]).includes(t.slug));
  const otros      = tours.filter((t) => !(TOURS_DESTACADOS as readonly string[]).includes(t.slug));
  const ordenados  = [...destacados, ...otros];
  const BADGES = en ? BADGES_EN : BADGES_ES;
  const COMO_FUNCIONA = en ? COMO_FUNCIONA_EN : COMO_FUNCIONA_ES;
  const TESTIMONIOS = en ? TESTIMONIOS_EN : TESTIMONIOS_ES;
  const waGeneral = en ? "Hi, I'd like information about your Huasteca Potosina tours." : WA_MESSAGES.tourGeneral;

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
        offers: { "@type": "Offer", price: t.precio, priceCurrency: "MXN" },
      },
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

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-verde-profundo px-6 pt-32 pb-16 text-center">
        <Image src="/imagenes/guias/equipo-guias.jpg" alt="Equipo de guías certificados de Tours Huasteca Potosina recorriendo la región" fill className="object-cover object-center" priority quality={85} />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/70 to-negro/65" />
        <div className="relative z-10 max-w-3xl mx-auto">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {en ? "All-inclusive tours" : "Tours con todo incluido"}
        </p>
        <h1 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(42px,7vw,80px)" }}>
          {en ? <>Guided <em className="shimmer-gold">Tours</em> in the Huasteca</> : <>Tours <em className="shimmer-gold">Guiados</em> por la Huasteca</>}
        </h1>
        <p className="text-crema/80 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-4">
          {en
            ? `${tours.length} tours designed to experience the Huasteca worry-free. Transport, breakfast, entrance fees and a certified guide included in every trip.`
            : `${tours.length} tours diseñados para vivir la Huasteca sin preocupaciones. Transporte, desayuno, entradas y guía certificado incluidos en cada recorrido.`}
        </p>
        <div className="inline-flex items-center gap-2 bg-verde-selva/20 border border-verde-vivo/30 px-5 py-2 mb-6 text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {en ? "Departures every day of the year — book 24h in advance" : "Salidas todos los días del año — reserva con 24h de anticipación"}
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          <a href="https://share.google/YS3dbxN4wrnHZ8lO9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 px-5 py-2 transition-all group">
            <span className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" aria-hidden="true" />))}
            </span>
            <span className="font-dm text-sm text-crema/85 group-hover:text-crema transition-colors">{en ? "4.9 · 492 Google reviews" : "4.9 · 492 reseñas Google"}</span>
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
          <Link href="/reservar" className="inline-flex items-center justify-center gap-2.5 bg-dorado hover:bg-lima text-negro px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors duration-200 min-h-[44px]">
            {en ? "Book online" : "Reservar en línea"}
          </Link>
          <a href={waLink(waGeneral)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2.5 border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all duration-200 min-h-[44px]">
            {WA_SVG}
            {en ? "Ask on WhatsApp" : "Preguntar por WhatsApp"}
          </a>
        </div>
        </div>
      </section>

      {/* ── ANCLAS ── */}
      <nav aria-label={en ? "Jump to a tour" : "Ir directamente al tour"} className="sticky sticky-subnav z-40 bg-negro/98 backdrop-blur-md border-b border-white/8 py-3 px-6 overflow-x-auto scrollbar-none" style={{ top: "var(--navbar-offset, 64px)" }}>
        <ul className="flex items-center justify-center gap-1 min-w-max mx-auto">
          {tours.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 text-[9px] tracking-[1.5px] uppercase font-dm text-crema/55 hover:text-crema hover:bg-white/8 border border-transparent hover:border-white/10 transition-all duration-150">
                <span className="text-verde-vivo text-[8px]">→</span>
                {t.nombre.split(" ").slice(0, 2).join(" ")}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <GuideProfile />

      {/* ── BADGES ── */}
      <section className="relative bg-verde-profundo/20 border-y border-white/6 py-12 px-6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="reveal-fade text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-8 font-dm">{en ? "Why choose us" : "Por qué elegirnos"}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {BADGES.map((item, i) => (
              <div key={item.title} className="reveal-up border border-white/8 bg-negro/30 p-4" style={{ animationDelay: `${i * 55}ms` }}>
                <item.Icon className="w-6 h-6 text-verde-selva mx-auto mb-2" aria-hidden="true" />
                <p className="font-cormorant text-crema text-sm mb-0.5 leading-tight">{item.title}</p>
                <p className="text-[9px] text-crema/40 font-dm tracking-wide">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageViewTracker event="TOURS_LIST_VIEW" data={{ total: tours.length }} />

      {/* ── TOURS GRID ──
          Los cuatro destacados (≈66 % del interés real) van arriba; el resto
          queda bajo "Otros recorridos". Nadie pierde su página ni su SEO. */}
      <section id="tours-grid" className="max-w-6xl mx-auto px-6 py-20">
        {otros.length > 0 && (
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-6">
            {en ? "Most booked" : "Los más reservados"}
          </p>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {ordenados.map((tour, tourIndex) => (
            <Fragment key={tour.id}>
            {tourIndex === destacados.length && (
              <p className="lg:col-span-2 text-[9px] tracking-[3px] uppercase text-crema/35 font-dm pt-8 border-t border-white/8">
                {en ? "Other tours" : "Otros recorridos"}
              </p>
            )}
            <article id={tour.id} className="stagger-reveal group relative border border-white/8 bg-negro/40 hover:border-verde-vivo/40 transition-colors duration-300 flex flex-col scroll-mt-28 overflow-hidden" style={{ animationDelay: `${tourIndex * 80}ms` }}>
              <Link href={lp(`/tours/${tour.slug}`)} aria-label={`${en ? "View full tour" : "Ver tour completo"}: ${tour.nombre}`} className="absolute inset-0 z-0" />

              {/* ── IMAGEN ── */}
              {tour.imagen_hero && (
                <div className="relative h-56 overflow-hidden flex-shrink-0">
                  <Image src={tour.imagen_hero} alt={tour.nombre} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/85 via-negro/10 to-negro/30" />
                  <span className={`absolute top-3 left-3 text-[9px] tracking-[1px] uppercase border px-2 py-0.5 font-dm ${DIFICULTAD_STYLE[tour.dificultad]}`}>
                    {en ? DIF_LABEL_EN[tour.dificultad] : tour.dificultad}
                  </span>
                  <span className="absolute top-3 right-3 bg-verde-selva/90 text-white text-[9px] font-dm font-bold tracking-[1px] px-2.5 py-1">
                    {en ? "Daily departures" : "Salidas todos los días"}
                  </span>
                  <span className="absolute bottom-3 left-3 bg-negro/70 text-crema/80 text-[9px] font-dm tracking-[1px] px-2 py-1">
                    ⏱ {tourDurTexto(tour, en ? " hours" : " horas")}
                  </span>
                </div>
              )}

              {/* ── INFO ── */}
              <div className="flex flex-col flex-1 p-7">
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{tour.tipo}</p>
                <h2 className="font-cormorant text-crema text-2xl leading-tight mb-1">{tour.nombre}</h2>
                <p className="text-[10px] tracking-[1px] uppercase text-dorado/70 font-dm mb-3">{tour.tagline}</p>

                {/* Breve descripción de lo que se hace en el recorrido */}
                <p className="text-[12.5px] text-crema/60 font-dm leading-relaxed mb-4 line-clamp-3">{tour.descripcion}</p>

                <p className="flex items-center gap-1.5 text-[11px] text-crema/55 font-dm mb-4">
                  <span className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (<Star key={i} className="w-3 h-3 fill-dorado text-dorado" aria-hidden="true" />))}
                  </span>
                  4.9 · {tour.reviewCount} {en ? "reviews" : "reseñas"}
                </p>

                {/* Todos los destinos que se visitan en el recorrido */}
                <div className="mb-5">
                  <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2">{en ? "Stops on this tour" : "Visitas en este recorrido"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tour.destinos.map((d) => (
                      <span key={d} className="text-[10px] font-dm text-crema/60 border border-white/10 bg-white/[0.03] px-2 py-0.5 rounded-sm">
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
                  <span className="text-verde-vivo/70 font-medium">✦ {en ? "Daily departures" : "Salidas diarias"}</span>
                </div>

                <div className="mb-5">
                  <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-1">{en ? "from" : "desde"}</p>
                  <p className="flex items-baseline gap-2">
                    <span className="font-cormorant text-dorado text-3xl font-light leading-none">{money(tour.precio)}</span>
                    {tour.precioOriginal && tour.precioOriginal > tour.precio && (
                      <span className="text-[11px] text-crema/30 font-dm line-through">{money(tour.precioOriginal)}</span>
                    )}
                  </p>
                  <p className="text-[9px] text-crema/35 font-dm mt-1">
                    MXN {tour.precioUnidad === "vehiculo" ? (en ? "per vehicle" : "por vehículo") : (en ? "per person" : "por persona")}
                  </p>
                </div>

                {/* Señal de urgencia honesta (campo real por tour) + CTA */}
                <div className="mt-auto">
                  {tour.urgencia && (
                    <p className="flex items-start gap-1.5 text-[10px] text-dorado/85 font-dm mb-3 leading-snug">
                      <span aria-hidden="true" className="mt-px">⚡</span>
                      <span>{tour.urgencia}</span>
                    </p>
                  )}
                  <span className="block text-center bg-verde-selva group-hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3.5 transition-colors duration-200">
                    {en ? "View full tour →" : "Ver tour completo →"}
                  </span>
                </div>
              </div>
            </article>
            </Fragment>
          ))}
        </div>
        {!en && (
          <p className="text-center text-crema/50 font-dm text-xs mt-10">
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
          <div className="reveal-up text-center mt-14">
            <a href={waLink(waGeneral)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 min-h-[44px]">
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
            <span className="reveal-fade inline-block text-[9px] tracking-[3px] uppercase text-verde-vivo border border-verde-selva/40 px-3 py-1 font-dm mb-5">{en ? "Groups · 2–12 people" : "Grupos · 2–12 personas"}</span>
            <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3vw,36px)" }}>{en ? "Shared group tours" : "Tours en grupo compartido"}</h2>
            <p className="text-crema/60 font-dm text-sm leading-relaxed mb-6">
              {en
                ? "Experience it with other travelers. Small groups of max. 12 people to guarantee personal attention, access to exclusive corners and a pace no tour bus can offer."
                : "Vive la experiencia con otros viajeros. Grupos pequeños de máximo 12 personas para garantizar atención personalizada, acceso a rincones exclusivos y un ritmo que ningún autobús turístico puede ofrecer."}
            </p>
            <ul className="space-y-2 mb-7">
              {(en
                ? ["Max. 12 people per group", "Dedicated guide the whole trip", "Transport from your accommodation", `From $${Math.min(...TOURS_DB.map((t) => t.precio)).toLocaleString("es-MX")} MXN per person`]
                : ["Máximo 12 personas por grupo", "Guía dedicado todo el recorrido", "Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles", `Precio desde $${Math.min(...TOURS_DB.map((t) => t.precio)).toLocaleString("es-MX")} MXN por persona`]
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
                ? ["A private transport unit just for your group", "Move at your own pace — no fixed schedules or waiting", "Your guide entirely at your disposal all day", "A custom itinerary tailored to you", "From $3,200 MXN for 2 people", "Discounts for large groups"]
                : ["Unidad de transporte privada solo para tu grupo", "Se mueven a sus tiempos — sin horarios fijos ni esperas", "Tu guía a tu entera disposición todo el día", "Itinerario personalizado a tu medida", "Desde $3,200 MXN para 2 personas", "Descuentos para grupos grandes"]
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
            +52 489 125 1458
          </a>
          <p className="mt-4 text-[10px] text-crema/50 font-dm">
            {en ? "✓ Free cancellation up to 48h before · No hidden fees" : "✓ Cancelación gratuita con 48h de anticipación · Sin cargos ocultos"}
          </p>
        </div>
      </section>
    </main>
  );
}
