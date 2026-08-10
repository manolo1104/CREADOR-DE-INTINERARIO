import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { TourCard } from "@/components/TourCard";
import { UrgencyWidget } from "@/components/UrgencyWidget";
import { HeroTypewriter } from "@/components/HeroTypewriter";
import { StatTile } from "@/components/StatTile";
import { MagneticButton } from "@/components/MagneticButton";
import { HeroStats } from "@/components/HeroStats";
import { ClimaHero } from "@/components/ClimaHero";
import { VisitantesEnVivo } from "@/components/VisitantesEnVivo";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { CountdownViaje } from "@/components/CountdownViaje";
import { GuiaMockup } from "@/components/GuiaMockup";
import { prisma } from "@/lib/prisma";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeTour } from "@/lib/i18n/localize";
import {
  Droplet, Mountain, Landmark, Leaf, Camera, Thermometer,
  MessageCircle, Star, Award, CheckCircle2,
  Bus, Calendar, BedDouble,
  Quote,
} from "lucide-react";

const SITE_URL = SITE;

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const title = locale === "en"
    ? "Huasteca Potosina Tours — Waterfalls, Adventure & Nature | Mexico"
    : "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México";
  // La descripción anterior hablaba solo de la región y no daba ningún motivo
  // para hacer clic en nosotros y no en Viator. Ahora lleva quiénes somos, el
  // precio de arranque y la palanca que sí convierte (anticipo + cancelación).
  const nTours = TOURS_DB.length;
  const desde = `$${Math.min(...TOURS_DB.map((t) => t.precio)).toLocaleString("es-MX")}`;
  const description = locale === "en"
    ? `Guided tours from Xilitla, with our own hotel and restaurant. ${nTours} tours with NOM-09 guide and insurance, from ${desde} MXN. Book with 30% deposit, free cancellation.`
    : `Tours guiados desde Xilitla, con hotel y restaurante propios. ${nTours} recorridos con guía NOM-09 y seguro, desde ${desde}. Aparta con el 30 % y cancela gratis.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Huasteca Potosina" }],
    },
    alternates: buildAlternates("/", locale),
  };
}

export const dynamic = "force-dynamic";

async function getRandomPosts() {
  try {
    const all = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, tags: true, readingTime: true, publishedAt: true,
      },
    });
    const seed = Math.floor(Date.now() / 86_400_000);
    return all
      .map((p, i) => ({ p, sort: (seed * 2654435761 + i * 40503) % all.length }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 3)
      .map((x) => x.p);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  // El blog solo existe en español: en EN no se hace fetch ni se muestra.
  const recentPosts = en ? [] : await getRandomPosts();
  const tours = TOURS_DB.map((t) => localizeTour(t, locale));
  // En el inicio mostramos solo 3 tours destacados; el botón lleva al catálogo completo.
  const HOME_TOUR_SLUGS = ["expedicion-tamul", "cascadas-del-meco", "paraiso-escalonado-minas-micos"];
  const toursHome = HOME_TOUR_SLUGS.map((s) => tours.find((t) => t.slug === s)).filter(Boolean) as typeof tours;

  const CATEGORIAS = [
    { Icon: Droplet,     label: en ? "Waterfalls & Pools" : "Cascadas & Pozas",  href: lp("/experiencias?tipo=cascadas") },
    { Icon: Mountain,    label: en ? "Extreme Adventure"  : "Aventura Extrema",  href: lp("/experiencias?tipo=aventura") },
    { Icon: Landmark,    label: en ? "Culture & Art"      : "Cultura & Arte",    href: lp("/experiencias?tipo=cultura") },
    { Icon: Leaf,        label: en ? "Ecotourism"         : "Ecoturismo",        href: lp("/experiencias?tipo=naturaleza") },
    { Icon: Camera,      label: en ? "Photography"        : "Fotografía",        href: lp("/experiencias?tipo=fotografia") },
    { Icon: Thermometer, label: en ? "Wellness"           : "Bienestar",         href: lp("/experiencias?tipo=bienestar") },
  ];

  const REGION_STATS = [
    { num: "105m",                   label: en ? "The tallest waterfall" : "La cascada más alta" },
    { num: "333m",                   label: en ? "Deepest sinkhole"      : "Sótano más profundo" },
    { num: `+${DESTINOS_DB.length}`, label: en ? "Unique destinations"   : "Destinos únicos" },
    { num: en ? "Year-round" : "Todo el año", label: en ? "Open season"  : "Temporada abierta" },
  ];

  const websiteSchema = {
    "@context": "https://schema.org", "@type": "WebSite",
    name: "Tours Huasteca Potosina", url: `${SITE_URL}${lp("/")}`,
    description: "Tourism in the Huasteca Potosina, San Luis Potosí, Mexico",
    inLanguage: en ? "en" : "es-MX",
  };
  const agencySchema = {
    "@context": "https://schema.org", "@type": ["TouristAgency", "Organization"],
    name: "Tours Huasteca Potosina", url: SITE_URL, logo: `${SITE_URL}/imagenes/hero-home.jpg`,
    description: "Certified tour operator in the Huasteca Potosina, San Luis Potosí, Mexico.",
    address: { "@type": "PostalAddress", addressLocality: "Xilitla", addressRegion: "San Luis Potosí", addressCountry: "MX" },
    telephone: "+524891251458", email: "hola@huasteca-potosina.com",
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.9, bestRating: 5, reviewCount: 492 },
    award: "Best Tour Operator North America — Arival 2023",
    sameAs: ["https://www.facebook.com/huastecatours/"],
  };

  const TESTIMONIOS = en
    ? [
        { img: "/imagenes/reviews/reviewer-turquoise-group.png", imgAlt: "Group of travelers in the turquoise waters of the Huasteca", foto: "/imagenes/reviews/reviewer-5.jpg", quote: "Incredible experience! The turquoise water is like nothing we'd ever seen. Our guide was outstanding — he knew every detail of the region and looked after us the whole time. We already booked to come back with more family!", nombre: "Carlos M.", meta: "Monterrey, N.L. · All Huasteca Tour · Mar 2026" },
        { img: "/imagenes/reviews/reviewer-familia-tamul.png", imgAlt: "Family in front of Tamul Waterfall", foto: "/imagenes/reviews/reviewer-29.jpg", quote: "We took our kids for the first time and it was absolutely magical. Tamul Waterfall exceeded all our expectations. Punctual transport, attentive guide, all-inclusive. The best thing we've done as a family.", nombre: "Ana González", meta: "Mexico City · Tamul Waterfall Tour · Feb 2026" },
        { img: "/imagenes/reviews/reviewer-tamul-grupo.jpg", imgAlt: "Group of friends in the Tamul Canyon", foto: "/imagenes/reviews/reviewer-3.jpg", quote: "We organized the trip for 8 friends and it was perfectly coordinated. From booking to the last moment of the tour, everything was flawless. The Tamul Canyon landscape is simply unreal. I'll definitely be back!", nombre: "Sofía R.", meta: "Guadalajara, Jal. · Tamul & Río Gallinas Tour · Jan 2026" },
      ]
    : [
        { img: "/imagenes/reviews/reviewer-turquoise-group.png", imgAlt: "Grupo de viajeros en las aguas turquesas de la Huasteca", foto: "/imagenes/reviews/reviewer-5.jpg", quote: "¡Increíble experiencia! El agua turquesa es algo que jamás habíamos visto. El guía fue extraordinario — conocía cada detalle de la región y nos cuidó en todo momento. ¡Ya reservamos para volver con más familia!", nombre: "Carlos M.", meta: "Monterrey, N.L. · Tour Todo Huasteca · Mar 2026" },
        { img: "/imagenes/reviews/reviewer-familia-tamul.png", imgAlt: "Familia frente a la Cascada Tamul", foto: "/imagenes/reviews/reviewer-29.jpg", quote: "Llevamos a nuestros hijos por primera vez y fue absolutamente mágico. La cascada Tamul superó todas nuestras expectativas. Transporte puntual, guía atento y todo incluido. Lo más recomendable que hemos hecho en familia.", nombre: "Ana González", meta: "Ciudad de México · Tour Cascada Tamul · Feb 2026" },
        { img: "/imagenes/reviews/reviewer-tamul-grupo.jpg", imgAlt: "Grupo de amigos en el Cañón del Tamul", foto: "/imagenes/reviews/reviewer-3.jpg", quote: "Organizamos el viaje para 8 amigos y fue perfectamente coordinado. Desde la reserva hasta el último momento del tour, todo impecable. El paisaje del Cañón del Tamul es simplemente irreal. ¡Vuelvo seguro!", nombre: "Sofía R.", meta: "Guadalajara, Jal. · Tour Tamul & Río Gallinas · Ene 2026" },
      ];

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agencySchema) }} />

      {/* ── HERO ── */}
      <section
        aria-label={en ? "Welcome to the Huasteca Potosina" : "Bienvenida a la Huasteca Potosina"}
        className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/imagenes/hero-home.jpg" alt={en ? "Paddle surf on the turquoise waters of the Huasteca Potosina" : "Paddle surf en las aguas turquesas de la Huasteca Potosina"} fill className="object-cover object-center" priority quality={90} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-negro/60 via-negro/50 to-negro/85" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="font-cormorant font-light leading-[0.9] tracking-tight mb-8 drop-shadow-2xl">
            {/* Eyebrow dentro del h1: misma estética, pero el heading lleva la keyword principal */}
            <span className="block text-[10px] tracking-[5px] uppercase text-verde-vivo mb-8 font-dm font-normal drop-shadow-lg">
              ✦ {en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina"} · San Luis Potosí ✦
            </span>
            <span className="block text-white" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
              {en ? "The Huasteca" : "La Huasteca"}
            </span>
            <HeroTypewriter />
          </h1>

          <p className="text-crema/80 max-w-xl mb-6 leading-relaxed font-dm drop-shadow" style={{ fontSize: "clamp(15px,1.8vw,18px)" }}>
            {/* Antes esta línea describía la REGIÓN ("cascadas turquesas,
                jardines surrealistas…"), no la empresa: cualquiera de los seis
                competidores podía pegarla igual. Ahora dice lo único que ellos
                no pueden copiar — que somos de Xilitla y el hotel y el
                restaurante son nuestros. Sin superlativos: Huasteca Sharet
                también tiene hospedaje propio, pero desde Ciudad Valles. */}
            {en
              ? "We're from Xilitla, and the hotel and restaurant here are ours. You sleep, eat and set out on your tour from the same place — and we also pick you up in Ciudad Valles. NOM-09 certified guides and travel insurance included."
              : "Somos de Xilitla y aquí tenemos nuestro hotel y nuestro restaurante. Duermes, comes y sales al tour desde el mismo lugar — y también te recogemos en Ciudad Valles. Guías certificados NOM-09 y seguro de viaje incluidos."}
          </p>

          <div className="flex items-center gap-2 mb-12">
            <div className="flex gap-0.5 star-group">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-dorado text-dorado drop-shadow star-icon" />
              ))}
            </div>
            <span className="font-dm text-crema/90 text-sm drop-shadow">
              {en ? "4.9 · Over 10,000 happy travelers" : "4.9 · Más de 10,000 viajeros satisfechos"}
            </span>
          </div>

          <VisitantesEnVivo en={en} />

          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <MagneticButton>
              {/* Dorado = "reservar" en todo el sitio (es el color del botón del
                  menú). En inglés lleva al catálogo: el motor es solo español. */}
              <Link
                href={en ? lp("/tours") : "/reservar"}
                className="bg-dorado text-negro px-10 py-4 text-sm tracking-[2px] uppercase font-dm font-medium hover:bg-terracota hover:text-crema transition-colors duration-300 flex flex-col items-center gap-0.5"
              >
                <span>{en ? "Book a tour →" : "Reservar tour →"}</span>
                <span className="text-[9px] tracking-[1.5px] uppercase text-negro/55 font-normal">
                  {en ? "Free cancellation 48h" : "Apartas con el 30 %"}
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              {en ? (
                <Link href={lp("/tours")} className="relative bg-verde-selva text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300 flex flex-col items-center gap-0.5">
                  <span>✦ See the tours →</span>
                  <span className="text-[9px] tracking-[1.5px] uppercase text-crema/60 font-normal">All-inclusive · Small groups</span>
                </Link>
              ) : (
                <Link href="/recomendar" className="relative bg-verde-selva text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300 flex flex-col items-center gap-0.5">
                  <span>✦ Recomendador IA →</span>
                  <span className="text-[9px] tracking-[1.5px] uppercase text-crema/60 font-normal">2 minutos · Gratuito</span>
                </Link>
              )}
            </MagneticButton>
          </div>

          <ClimaHero en={en} />

          <div className="mb-10 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 rounded-full">
            <UrgencyWidget />
          </div>

          <HeroStats destinosCount={DESTINOS_DB.length} />
        </div>
      </section>

      {/* ── BADGES BANNER ── */}
      <section aria-label={en ? "Awards and recognition" : "Premios y reconocimientos"} className="bg-negro py-5 border-b border-white/8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
          <img src="/badges/tripadvisor.svg" alt="TripAdvisor" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/travellers-choice.svg" alt="Travellers Choice TripAdvisor" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/top-rated-google.svg" alt="Top Rated Google Maps" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/mejor-tour-operador.avif" alt="Best Tour Operator North America" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section aria-label={en ? "Trust and guarantees" : "Confianza y garantías"} className="bg-white border-y border-negro/8 py-5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex flex-wrap items-center gap-6 text-[10px] tracking-[1.5px] uppercase font-dm text-negro/50">
            <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "+10,000 travelers" : "+10,000 viajeros"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <a href="https://maps.app.goo.gl/SWGyihBFTiykTFFM6" target="_blank" rel="noopener noreferrer" className="hover:text-negro/80 transition-colors flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-dorado" aria-hidden="true" />
              <span className="text-negro/70 font-medium">4.9</span> · {en ? "492 Google reviews" : "492 reseñas Google"}
            </a>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "NOM-09 guides" : "Guías NOM-09"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "All inclusive" : "Todo incluido"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "Daily departures" : "Salidas todos los días"}</span>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS STRIP ── */}
      <section aria-label={en ? "Experience categories" : "Categorías de experiencias"} className="bg-arena/40 border-b border-negro/8 py-8 overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-6 min-w-max mx-auto justify-center">
            {CATEGORIAS.map(({ Icon, label, href }) => (
              <Link key={label} href={href} className="flex items-center gap-2 border border-negro/15 bg-white px-5 py-2.5 text-xs tracking-[2px] uppercase font-dm text-negro/60 hover:text-verde-selva hover:border-verde-vivo/60 hover:bg-verde-selva/5 transition-all duration-200 whitespace-nowrap">
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOURS ── */}
      <section aria-label={en ? "Discover the region's tours" : "Descubre los destinos de la región"} className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "Explore the region" : "Explora la región"}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            {en ? <>Our <em className="shimmer-gold">Tours</em></> : <>Nuestros <em className="shimmer-gold">Tours</em></>}
          </h2>
          <div className="heading-underline" aria-hidden="true" />
          <p className="reveal-up reveal-d1 text-negro/45 mt-4 font-dm text-sm max-w-md mx-auto">
            {en
              ? `${TOURS_DB.length} guided tours with transport, breakfast and a certified guide included`
              : `${TOURS_DB.length} recorridos guiados con transporte, desayuno y guía certificado incluidos`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {toursHome.map((t) => (
            <TourCard key={t.slug} tour={t} variant="compact" />
          ))}
        </div>

        <div className="text-center mt-10">
          <MagneticButton className="inline-block">
            <Link href={lp("/tours")} className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 hover:border-verde-selva transition-all duration-200">
              {en ? "View all tours" : "Ver todos los tours"}
            </Link>
          </MagneticButton>
        </div>
      </section>

      {/* ── PAQUETES TODO INCLUIDO ── */}
      {!en && (
        <section aria-label="Paquetes todo incluido: tours + hospedaje" className="bg-arena/40 border-y border-negro/8 py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Tours + hospedaje · Todo coordinado</p>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
                Paquetes <em className="shimmer-gold">Todo Incluido</em>
              </h2>
              <div className="heading-underline" aria-hidden="true" />
              <p className="reveal-up reveal-d1 text-negro/45 mt-4 font-dm text-sm max-w-md mx-auto">
                Combinamos nuestros tours con hospedaje en el Hotel Paraíso Encantado Xilitla. Tú solo preocúpate por llegar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PAQUETES_DB.map((p) => {
                const ahorro = p.valor.reduce((a, v) => a + parseInt(v.precio.replace(/[^0-9]/g, ""), 10), 0) - p.precio;
                return (
                  <Link key={p.id} href={`/paquetes/${p.slug}`} className="group block border border-negro/10 bg-white overflow-hidden rounded-xl shadow-sm hover:border-verde-selva/40 transition-colors">
                    <div className="relative h-44 overflow-hidden">
                      <Image src={p.imagen} alt={p.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-negro/75 to-transparent" />
                      {p.badge && (
                        <span className="absolute top-3 right-3 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1">{p.badge}</span>
                      )}
                      <p className="absolute bottom-3 left-4 text-[9px] tracking-[3px] uppercase text-crema font-dm flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" aria-hidden="true" /> {p.duracion}
                      </p>
                    </div>
                    <div className="p-6">
                      <h3 className="font-cormorant text-verde-profundo text-xl leading-tight mb-1">{p.nombre}</h3>
                      <p className="text-negro/45 font-dm text-xs mb-4">{p.subtitulo}</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-cormorant text-dorado text-3xl leading-none">${p.precio.toLocaleString("es-MX")}</span>
                        <span className="text-negro/40 font-dm text-[10px]">MXN {p.precioLabel}</span>
                      </div>
                      {ahorro > 0 && (
                        <p className="text-[10px] font-dm text-verde-selva font-medium mb-4">✓ Ahorras ${ahorro.toLocaleString("es-MX")} MXN vs. por separado</p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[2px] uppercase text-verde-selva group-hover:text-verde-vivo font-dm font-medium transition-colors">
                        Ver el paquete día por día →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <MagneticButton className="inline-block">
                <Link href="/paquetes" className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 hover:border-verde-selva transition-all duration-200">
                  Ver todos los paquetes
                </Link>
              </MagneticButton>
            </div>
          </div>
        </section>
      )}

      {/* ── VIAJE PROGRAMADO SEPTIEMBRE ── */}
      <section aria-label={en ? "September scheduled trip from Mexico City" : "Viaje programado de septiembre desde CDMX"} className="relative px-6 py-20 overflow-hidden border-y border-white/10">
        <Image src="/imagenes/viaje-septiembre/fondo-cascada.jpg" alt="" fill className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-negro/95 via-negro/88 to-negro/70" />
        <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="bg-negro/55 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-lg">
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
              ✦ {en ? "Scheduled group trip · September long weekend" : "Viaje grupal · Puente de Septiembre"}
            </p>
            <h2 className="reveal-up font-cormorant font-light text-crema leading-tight mb-3" style={{ fontSize: "clamp(30px,4.5vw,52px)" }}>
              {en ? "The Huasteca from " : "La Huasteca desde "}<em className="shimmer-gold not-italic">CDMX</em>
            </h2>
            <p className="reveal-up reveal-d1 text-crema/75 font-dm text-sm leading-relaxed mb-6 max-w-md">
              {en
                ? "4 days / 3 nights · Sep 16–19, 2026. Round-trip transport, lodging and 3 guided all-inclusive tours. You just show up."
                : "4 días / 3 noches · 16–19 sep 2026. Transporte redondo, hospedaje y 3 recorridos guiados todo incluido. Tú solo llega."}
            </p>
            <div className="mb-7">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm">{en ? "from" : "desde"}</p>
              <p className="font-cormorant text-dorado text-4xl leading-none">$7,900 <span className="font-dm text-[11px] text-crema/45">MXN / {en ? "person" : "persona"}</span></p>
            </div>
            <Link href={lp("/viaje-septiembre")} className="inline-flex items-center gap-2 bg-dorado text-negro px-9 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-200">
              {en ? "See the trip →" : "Ver el viaje →"}
            </Link>
          </div>
          <div className="flex md:justify-end">
            <CountdownViaje target="2026-09-16T07:00:00-06:00" en={en} variant="hero" />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section aria-label={en ? "Traveler reviews" : "Reseñas de viajeros"} className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "What travelers say" : "Lo que dicen los viajeros"}</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(32px,4.5vw,48px)" }}>
              {en ? <>492 Reviews · <em className="shimmer-gold">4.9 stars</em></> : <>492 Reseñas · <em className="shimmer-gold">4.9 estrellas</em></>}
            </h2>
            <div className="flex justify-center gap-1 mt-3 star-group">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-dorado text-dorado star-icon" aria-hidden="true" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIOS.map((tt) => (
              <article key={tt.nombre} className="border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors rounded-xl shadow-sm testimonial-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={tt.img} alt={tt.imgAlt} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-6">
                  <Quote className="w-6 h-6 text-dorado/40 mb-3" aria-hidden="true" />
                  <p className="text-negro/70 font-dm text-sm leading-relaxed mb-5 italic">&ldquo;{tt.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <img src={tt.foto} alt={tt.nombre} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-negro/10" loading="lazy" />
                    <div>
                      <p className="font-dm text-negro/80 text-sm font-medium">{tt.nombre}</p>
                      <p className="font-dm text-negro/40 text-[11px]">{tt.meta}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="https://maps.app.goo.gl/SWGyihBFTiykTFFM6" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-verde-selva/40 text-verde-selva px-8 py-3 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all duration-200">
              <Star className="w-4 h-4 fill-dorado text-dorado" aria-hidden="true" />
              {en ? "Read all 492 reviews on Google" : "Ver las 492 reseñas en Google"}
            </a>
          </div>
        </div>
      </section>

      {/* ── BLOG PREVIEW (solo ES) ── */}
      {!en && recentPosts.length > 0 && (
        <section aria-label="Artículos recientes del blog" className="bg-arena/30 border-y border-negro/8 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Del blog</p>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(32px,4.5vw,48px)" }}>
                Guías & <em className="shimmer-gold">Rutas de Viaje</em>
              </h2>
              <div className="heading-underline" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-white border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors h-full flex flex-col rounded-xl shadow-sm">
                    {post.coverImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      {post.tags[0] && (<span className="text-[9px] tracking-[3px] uppercase text-verde-selva/70 font-dm mb-3">{post.tags[0]}</span>)}
                      <h3 className="font-cormorant text-verde-profundo text-xl mb-3 leading-snug group-hover:text-dorado transition-colors flex-1">{post.title}</h3>
                      {post.excerpt && (<p className="text-negro/50 font-dm text-xs leading-relaxed mb-4">{post.excerpt.slice(0, 110)}…</p>)}
                      <div className="flex items-center gap-3 text-[9px] tracking-[2px] uppercase font-dm text-negro/30 mt-auto">
                        <span>{post.readingTime} min lectura</span><span>·</span>
                        <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/blog" className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all duration-200">
                Ver todos los artículos
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── POR QUÉ LA HUASTECA ── */}
      <section aria-label={en ? "Why visit the Huasteca Potosina" : "Por qué visitar la Huasteca Potosina"} className="bg-white border-b border-negro/8 py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "Why the Huasteca?" : "¿Por qué la Huasteca?"}</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>
              {en ? <>A region that <em className="shimmer-gold">changes you</em></> : <>Una región que{" "}<em className="shimmer-gold">te cambia</em></>}
            </h2>
            <div className="reveal-up reveal-d1 space-y-4 text-negro/60 font-dm text-sm leading-relaxed">
              {en ? (
                <>
                  <p>The Huasteca Potosina is one of Mexico's most biodiverse regions, where tropical jungle coexists with karst canyons, turquoise waterfalls and the millennia-old traditions of the Huastec culture, recognized by UNESCO.</p>
                  <p>Here time is measured differently: by the circular flight of thousands of swifts at dawn over the Cave of Swallows, by the shifting color of Tamul's water between January and October, by the light that crosses Puente de Dios only between 11 AM and 1 PM.</p>
                  <p>It's not just a destination. It's an experience that redefines what nature means in Mexico.</p>
                </>
              ) : (
                <>
                  <p>La Huasteca Potosina es una de las regiones más biodiversas de México, donde la selva tropical coexiste con cañones kársticos, cascadas turquesas y tradiciones milenarias de la cultura Huasteca, reconocida por la UNESCO.</p>
                  <p>Aquí el tiempo se mide diferente: por el vuelo circular de miles de vencejos al amanecer sobre el Sótano de las Golondrinas, por el color cambiante del agua del Tamul entre enero y octubre, por la luz que atraviesa el Puente de Dios solo entre las 11 y las 13 horas.</p>
                  <p>No es solo un destino. Es una experiencia que redefine lo que significa la naturaleza en México.</p>
                </>
              )}
            </div>
            {!en && (
              <div className="mt-8">
                <Link href="/sobre-la-huasteca-potosina" className="text-sm tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors border-b border-verde-selva/40 pb-0.5 font-dm">
                  Conoce más sobre la región →
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REGION_STATS.map((s) => (
              <StatTile key={s.label} num={s.num} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANIFICADOR IA + LEAD MAGNET + INFO PRÁCTICA (solo ES) ── */}
      {!en && (
        <>
          <section aria-label="Planea tu viaje con IA" className="py-24 px-6 bg-crema">
            <div className="max-w-3xl mx-auto text-center border border-verde-selva/20 bg-white p-12 md:p-16 shadow-sm">
              <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-selva border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">✦ Tecnología IA</span>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
                Tu viaje perfecto,{" "}<em className="shimmer-gold">diseñado en 2 minutos</em>
              </h2>
              <p className="reveal-up reveal-d1 text-negro/55 font-dm text-sm leading-relaxed mb-8 max-w-xl mx-auto">
                Dinos cuántos días tienes, tu presupuesto y qué te emociona. La IA genera un itinerario personalizado con rutas reales, tiempos de traslado y precios 2026.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mb-10">
                {["Itinerario día a día", "Rutas reales", "Precios actualizados 2026"].map((pill) => (
                  <span key={pill} className="border border-negro/15 bg-crema px-4 py-2 text-xs tracking-[1px] text-negro/60 font-dm">{pill}</span>
                ))}
              </div>
              <MagneticButton className="inline-block mb-5">
                <Link href="/recomendar" className="inline-block bg-dorado text-white px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-terracota transition-colors duration-300">
                  Descubrir mi Tour Ideal →
                </Link>
              </MagneticButton>
              <p className="text-xs text-negro/30 tracking-wide font-dm">Sin registro · Gratis · PDF descargable</p>
            </div>
          </section>

          <section aria-label="Guía Definitiva de la Huasteca Potosina" className="relative py-20 px-6 bg-verde-profundo overflow-hidden">
            <FloatingLeaves />
            <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-vivo/40 px-4 py-1.5 mb-6 font-dm">✦ Guía Definitiva · PDF descargable</span>
                <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
                  Todo lo que necesitas para{" "}<em className="shimmer-gold">viajar solo por la Huasteca</em>
                </h2>
                <p className="reveal-up reveal-d1 text-crema/55 font-dm text-sm leading-relaxed mb-6 max-w-md mx-auto md:mx-0">
                  Cómo llegar, dónde quedarte, presupuesto real, 3 itinerarios probados (3, 5 y 7 días), checklist y los tips locales que no encontrarás en ningún blog. Edición 2026.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-8 text-[10px] tracking-[2px] uppercase font-dm text-crema/40">
                  <span>✓ 8 destinos esenciales</span>
                  <span>✓ Precios 2026</span>
                  <span>✓ 3 itinerarios</span>
                </div>
                <div className="flex items-baseline justify-center md:justify-start gap-3 mb-6">
                  <span className="font-cormorant font-light text-crema/40 line-through text-xl">$199</span>
                  <span className="font-cormorant font-light text-dorado text-4xl">$49 <span className="text-[11px] font-dm text-crema/40">MXN</span></span>
                </div>
                <MagneticButton className="inline-block mb-4">
                  <Link href="/guia" className="inline-block bg-dorado text-negro px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300">
                    Descargar la guía → $49
                  </Link>
                </MagneticButton>
                <p className="text-[11px] text-crema/30 tracking-wide font-dm">Pago seguro · Descarga inmediata · 🛡️ Garantía 7 días</p>
              </div>
              <div className="relative z-10">
                <GuiaMockup />
              </div>
            </div>
          </section>

          <section aria-label="Información práctica para tu viaje" className="bg-white border-y border-negro/8 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
                  Antes de <em className="text-dorado">viajar</em>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { Icon: Bus,       title: "Cómo llegar",    text: "Ciudad Valles es la puerta de entrada. Vuelos desde CDMX o autobús ADO directo en 8 horas.", href: "/info-practica#como-llegar" },
                  { Icon: Calendar,  title: "Mejor época",    text: "Todo el año. Nov–Mayo ideal para cascadas. Jun–Oct lush verde, más lluvia, menos turismo.", href: "/info-practica#cuando-viajar" },
                  { Icon: BedDouble, title: "Dónde quedarse", text: "Ciudad Valles como base. Opciones boutique en Xilitla y Tamasopo para inmersión total.", href: "/info-practica#donde-quedarse" },
                ].map((card) => (
                  <div key={card.title} className="border border-negro/8 bg-crema/60 p-6 hover:border-verde-selva/30 transition-colors group">
                    <card.Icon className="w-7 h-7 text-verde-selva mb-4" aria-hidden="true" />
                    <h3 className="font-cormorant text-verde-profundo text-xl mb-3">{card.title}</h3>
                    <p className="text-negro/50 text-sm font-dm leading-relaxed mb-5">{card.text}</p>
                    <Link href={card.href} className="text-xs tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors font-dm">Ver más →</Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── BADGES DE CERTIFICACIÓN ── */}
      <section aria-label={en ? "Official certifications and recognition" : "Certificaciones y reconocimientos oficiales"} className="bg-white border-t border-negro/8 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="reveal-fade text-center text-[9px] tracking-[3px] uppercase text-negro/30 font-dm mb-8">{en ? "Certified and recognized by" : "Certificados y reconocidos por"}</p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            <img src="/badges/sectur.png" alt="SECTUR — Mexico Ministry of Tourism" loading="lazy" className="h-12 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/tripadvisor-full.png" alt="Tripadvisor" loading="lazy" className="h-10 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/viajemos-todos.png" alt="Viajemos Todos por México" loading="lazy" className="h-12 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/travellers-choice.svg" alt="Travellers' Choice — TripAdvisor" loading="lazy" className="h-10 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/mejor-tour-operador.avif" alt="Best Tour Operator North America — Arival 2023" loading="lazy" className="h-10 w-auto opacity-75 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </section>

      {/* El pie de página vive ahora en el shell (SiteFooter), para que lo
          tengan las 43 páginas y no solo la home. */}
    </main>
  );
}
