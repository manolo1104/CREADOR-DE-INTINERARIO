import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB } from "@/lib/tours";
import { TourCard } from "@/components/TourCard";
import { UrgencyWidget } from "@/components/UrgencyWidget";
import { prisma } from "@/lib/prisma";
import {
  Droplet, Mountain, Landmark, Leaf, Camera, Thermometer,
  MessageCircle, Star, Award, CheckCircle2,
  Bus, Calendar, BedDouble,
  AtSign, Share2, Music2,
} from "lucide-react";

const SITE_URL = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Tours Huasteca Potosina — Turismo, Cascadas & Aventura | México",
  description:
    `Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. ${DESTINOS_DB.length} destinos únicos en San Luis Potosí, México.`,
};

const CATEGORIAS = [
  { Icon: Droplet,     label: "Cascadas & Pozas",  href: "/experiencias?tipo=cascadas" },
  { Icon: Mountain,    label: "Aventura Extrema",  href: "/experiencias?tipo=aventura" },
  { Icon: Landmark,    label: "Cultura & Arte",    href: "/experiencias?tipo=cultura" },
  { Icon: Leaf,        label: "Ecoturismo",        href: "/experiencias?tipo=naturaleza" },
  { Icon: Camera,      label: "Fotografía",        href: "/experiencias?tipo=fotografia" },
  { Icon: Thermometer, label: "Bienestar",         href: "/experiencias?tipo=bienestar" },
];

const REGION_STATS = [
  { num: "105m",                          label: "La cascada más alta" },
  { num: "333m",                          label: "Sótano más profundo" },
  { num: `+${DESTINOS_DB.length}`,        label: "Destinos únicos" },
  { num: "Todo el año",                   label: "Temporada abierta" },
];

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Tours Huasteca Potosina",
  url: SITE_URL,
  description: "Turismo en la Huasteca Potosina, San Luis Potosí, México",
  inLanguage: "es-MX",
};

const destinosSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Destinos en Tours Huasteca Potosina",
  numberOfItems: DESTINOS_DB.length,
  itemListElement: DESTINOS_DB.map((d, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "TouristDestination",
      name: d.nombre,
      url: `${SITE_URL}/destinos/${d.slug}`,
      image: d.imagen_hero,
      description: d.descripcion,
    },
  })),
};

export const dynamic = "force-dynamic";

async function getRecentPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, tags: true, readingTime: true, publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentPosts = await getRecentPosts();

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      {/* ── JSON-LD ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destinosSchema) }} />

      {/* ── HERO ── */}
      <section
        aria-label="Bienvenida a la Huasteca Potosina"
        className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden"
      >
        {/* DESKTOP: Video de YouTube */}
        <div className="absolute inset-0 overflow-hidden hidden md:block" aria-hidden="true">
          <iframe
            src="https://www.youtube.com/embed/yE3i_hUYmMU?autoplay=1&mute=1&loop=1&playlist=yE3i_hUYmMU&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3"
            allow="autoplay; encrypted-media"
            title=""
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "177.78vh",
              minWidth: "100%",
              height: "56.25vw",
              minHeight: "100%",
              border: "none",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* MOBILE: Imagen estática Cascada de Tamul */}
        <div className="absolute inset-0 block md:hidden" aria-hidden="true">
          <Image
            src="/imagenes/cascada-de-tamul/hero-mobile.jpg"
            alt="Cascada de Tamul, Huasteca Potosina"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-negro/60 via-negro/50 to-negro/85" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col items-center">
          <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-8 font-dm drop-shadow-lg">
            ✦ San Luis Potosí · México ✦
          </p>

          <h1 className="font-cormorant font-light leading-[0.9] tracking-tight mb-8 drop-shadow-2xl">
            <span className="block text-white" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
              La Huasteca
            </span>
            <span className="block text-dorado italic" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
              Potosina
            </span>
          </h1>

          <p
            className="text-crema/80 max-w-xl mb-12 leading-relaxed font-dm drop-shadow"
            style={{ fontSize: "clamp(15px,1.8vw,18px)" }}
          >
            Cascadas turquesas, jardines surrealistas, cañones imposibles.
            La región más extraordinaria de México.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <Link
              href="/destinos"
              className="border border-crema/40 text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-crema/10 transition-all duration-300"
            >
              Explorar Destinos
            </Link>
            <Link
              href="/planear"
              className="bg-verde-selva text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300"
            >
              Planear mi Viaje IA
            </Link>
          </div>

          {/* Urgency widget */}
          <div className="mb-10 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 rounded-full">
            <UrgencyWidget />
          </div>

          {/* Stats row */}
          <div className="flex gap-10 md:gap-16 flex-wrap justify-center border-t border-white/10 pt-10">
            {[
              { num: String(DESTINOS_DB.length), label: "Destinos Únicos" },
              { num: "Todo el año",              label: "Temporada" },
              { num: "Desde $60",                label: "MXN entrada" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <span className="font-cormorant font-light text-dorado block leading-none" style={{ fontSize: "clamp(28px,4vw,40px)" }}>
                  {s.num}
                </span>
                <span className="text-[9px] tracking-[3px] uppercase text-crema/40 mt-2 block font-dm">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BADGES BANNER (negro, justo debajo del hero) ── */}
      <section aria-label="Premios y reconocimientos" className="bg-negro py-5 border-b border-white/8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
          <img src="/badges/tripadvisor.svg"        alt="TripAdvisor"                        className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/travellers-choice.svg"  alt="Travellers Choice TripAdvisor"      className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/top-rated-google.svg"   alt="Top Rated Google Maps"              className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/mejor-tour-operador.avif" alt="Mejor Tour Operador Norteamérica" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section aria-label="Confianza y garantías" className="bg-white border-y border-negro/8 py-5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 md:gap-10">

          {/* Texto stats */}
          <div className="flex flex-wrap items-center gap-6 text-[10px] tracking-[1.5px] uppercase font-dm text-negro/50">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> +500 viajeros
            </span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <a
              href="https://maps.app.goo.gl/SWGyihBFTiykTFFM6"
              target="_blank" rel="noopener noreferrer"
              className="hover:text-negro/80 transition-colors flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 text-dorado" aria-hidden="true" />
              <span className="text-negro/70 font-medium">4.9</span> · 492 reseñas Google
            </a>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" aria-hidden="true" /> Guías NOM-09</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Todo incluido</span>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS STRIP ── */}
      <section aria-label="Categorías de experiencias" className="bg-arena/40 border-b border-negro/8 py-8 overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-6 min-w-max mx-auto justify-center">
            {CATEGORIAS.map(({ Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2 border border-negro/15 bg-white px-5 py-2.5 text-xs tracking-[2px] uppercase font-dm text-negro/60 hover:text-verde-selva hover:border-verde-vivo/60 hover:bg-verde-selva/5 transition-all duration-200 whitespace-nowrap"
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTINOS DESTACADOS ── */}
      <section aria-label="Descubre los destinos de la región" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">
            Explora la región
          </p>
          <h2 className="font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            Nuestros <em className="text-dorado">Tours</em>
          </h2>
          <p className="text-negro/45 mt-4 font-dm text-sm max-w-md mx-auto">
            {TOURS_DB.length} recorridos guiados con transporte, desayuno y guía certificado incluidos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOURS_DB.map((t) => (
            <TourCard key={t.slug} tour={t} variant="compact" />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/tours"
            className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 hover:border-verde-selva transition-all duration-200"
          >
            Ver todos los tours
          </Link>
        </div>
      </section>

      {/* ── BLOG PREVIEW ── */}
      <section aria-label="Artículos recientes del blog" className="bg-arena/30 border-y border-negro/8 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Del blog</p>
            <h2 className="font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(32px,4.5vw,48px)" }}>
              Guías & <em className="text-dorado">Rutas de Viaje</em>
            </h2>
          </div>

          {recentPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <article className="bg-white border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors h-full flex flex-col rounded-xl shadow-sm">
                      {post.coverImageUrl && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.coverImageUrl}
                            alt={post.coverImageAlt || post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                      )}
                      <div className="p-6 flex flex-col flex-1">
                        {post.tags[0] && (
                          <span className="text-[9px] tracking-[3px] uppercase text-verde-selva/70 font-dm mb-3">{post.tags[0]}</span>
                        )}
                        <h3 className="font-cormorant text-verde-profundo text-xl mb-3 leading-snug group-hover:text-dorado transition-colors flex-1">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-negro/50 font-dm text-xs leading-relaxed mb-4">
                            {post.excerpt.slice(0, 110)}…
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[9px] tracking-[2px] uppercase font-dm text-negro/30 mt-auto">
                          <span>{post.readingTime} min lectura</span>
                          <span>·</span>
                          <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-10">
                <Link
                  href="/blog"
                  className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all duration-200"
                >
                  Ver todos los artículos
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12 border border-negro/8 bg-white">
              <p className="text-negro/40 font-dm text-sm mb-4">Artículos en camino — próximamente guías, rutas y consejos de la Huasteca.</p>
              <Link href="/blog" className="inline-block border border-verde-selva/40 text-verde-selva px-8 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all">
                Ir al blog →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── POR QUÉ LA HUASTECA ── */}
      <section aria-label="Por qué visitar la Huasteca Potosina" className="bg-white border-b border-negro/8 py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">
              ¿Por qué la Huasteca?
            </p>
            <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>
              Una región que{" "}<em className="text-dorado">te cambia</em>
            </h2>
            <div className="space-y-4 text-negro/60 font-dm text-sm leading-relaxed">
              <p>
                La Huasteca Potosina es una de las regiones más biodiversas de México, donde la
                selva tropical coexiste con cañones kársticos, cascadas turquesas y tradiciones
                milenarias de la cultura Huasteca, reconocida por la UNESCO.
              </p>
              <p>
                Aquí el tiempo se mide diferente: por el vuelo circular de miles de vencejos
                al amanecer sobre el Sótano de las Golondrinas, por el color cambiante del agua
                del Tamul entre enero y octubre, por la luz que atraviesa el Puente de Dios solo
                entre las 11 y las 13 horas.
              </p>
              <p>
                No es solo un destino. Es una experiencia que redefine lo que significa la
                naturaleza en México.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/sobre-la-huasteca-potosina"
                className="text-sm tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors border-b border-verde-selva/40 pb-0.5 font-dm"
              >
                Conoce más sobre la región →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REGION_STATS.map((s) => (
              <div
                key={s.label}
                className="border border-negro/10 bg-crema p-6 text-center hover:border-dorado/40 transition-colors"
              >
                <div className="font-cormorant font-light text-dorado leading-none mb-2" style={{ fontSize: "clamp(32px,4vw,48px)" }}>
                  {s.num}
                </div>
                <div className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANIFICADOR IA ── */}
      <section aria-label="Planea tu viaje con IA" className="py-24 px-6 bg-crema">
        <div className="max-w-3xl mx-auto text-center border border-verde-selva/20 bg-white p-12 md:p-16 shadow-sm">
          <span className="inline-block text-[9px] tracking-[4px] uppercase text-verde-selva border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">
            ✦ Tecnología IA
          </span>
          <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
            Tu viaje perfecto,{" "}<em className="text-dorado">diseñado en 2 minutos</em>
          </h2>
          <p className="text-negro/55 font-dm text-sm leading-relaxed mb-8 max-w-xl mx-auto">
            Dinos cuántos días tienes, tu presupuesto y qué te emociona. La IA genera un itinerario
            personalizado con rutas reales, tiempos de traslado y precios 2026.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {["Itinerario día a día", "Rutas reales", "Precios actualizados 2026"].map((pill) => (
              <span key={pill} className="border border-negro/15 bg-crema px-4 py-2 text-xs tracking-[1px] text-negro/60 font-dm">
                {pill}
              </span>
            ))}
          </div>

          <Link
            href="/planear"
            className="inline-block bg-dorado text-white px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-terracota transition-colors duration-300 mb-5"
          >
            Crear mi Itinerario Gratis →
          </Link>

          <p className="text-xs text-negro/30 tracking-wide font-dm">
            Sin registro · Gratis · PDF descargable
          </p>
        </div>
      </section>

      {/* ── INFO PRÁCTICA PREVIEW ── */}
      <section aria-label="Información práctica para tu viaje" className="bg-white border-y border-negro/8 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              Antes de <em className="text-dorado">viajar</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: Bus,
                title: "Cómo llegar",
                text: "Ciudad Valles es la puerta de entrada. Vuelos desde CDMX o autobús ADO directo en 8 horas.",
                href: "/info-practica#como-llegar",
              },
              {
                Icon: Calendar,
                title: "Mejor época",
                text: "Todo el año. Nov–Mayo ideal para cascadas. Jun–Oct lush verde, más lluvia, menos turismo.",
                href: "/info-practica#cuando-viajar",
              },
              {
                Icon: BedDouble,
                title: "Dónde quedarse",
                text: "Ciudad Valles como base. Opciones boutique en Xilitla y Tamasopo para inmersión total.",
                href: "/info-practica#donde-quedarse",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border border-negro/8 bg-crema/60 p-6 hover:border-verde-selva/30 transition-colors group"
              >
                <card.Icon className="w-7 h-7 text-verde-selva mb-4" aria-hidden="true" />
                <h3 className="font-cormorant text-verde-profundo text-xl mb-3">{card.title}</h3>
                <p className="text-negro/50 text-sm font-dm leading-relaxed mb-5">{card.text}</p>
                <Link href={card.href} className="text-xs tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors font-dm">
                  Ver más →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-verde-profundo border-t border-white/8 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="mb-4">
                <div className="font-cormorant text-crema text-2xl font-light tracking-[4px] uppercase">HUASTECA</div>
                <div className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mt-0.5">Potosina</div>
              </div>
              <p className="text-crema/40 text-xs font-dm leading-relaxed mb-4">
                La región más extraordinaria de México. Cascadas turquesas, jardines surrealistas, aventura sin límites.
              </p>
              <a href="https://wa.me/524891251458" target="_blank" rel="noopener noreferrer" className="text-xs text-verde-vivo hover:text-lima transition-colors font-dm">
                WhatsApp: +52 489 125 1458
              </a>
            </div>

            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">Destinos</h3>
              <ul className="space-y-3">
                {DESTINOS_DB.slice(0, 4).map((d) => (
                  <li key={d.slug}>
                    <Link href={`/destinos/${d.slug}`} className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2">
                      <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                      {d.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">Explora</h3>
              <ul className="space-y-3">
                {[
                  { label: "Experiencias",         href: "/experiencias" },
                  { label: "Info Práctica",        href: "/info-practica" },
                  { label: "Planear mi Viaje",     href: "/planear" },
                  { label: "Blog",                 href: "/blog" },
                  { label: "Sobre la Huasteca",    href: "/sobre-la-huasteca-potosina" },
                  { label: "Sustentabilidad",      href: "/sustentabilidad-y-conservacion" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2">
                      <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">Conecta</h3>
              <div className="flex gap-4 mb-5">
                <a href="https://www.facebook.com/huastecatours/?locale=es_LA" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 border border-white/20 hover:border-verde-vivo/60 flex items-center justify-center text-crema/50 hover:text-verde-vivo transition-all">
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                </a>
                <span className="w-10 h-10 border border-white/8 flex items-center justify-center opacity-35 cursor-not-allowed">
                  <AtSign className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="w-10 h-10 border border-white/8 flex items-center justify-center opacity-35 cursor-not-allowed">
                  <Music2 className="w-4 h-4" aria-hidden="true" />
                </span>
              </div>
              <p className="text-[10px] tracking-[1px] text-crema/30 font-dm mb-3">14K seguidores en Facebook</p>
              <a href="mailto:hola@huastecapotosina.mx" className="text-crema/50 hover:text-crema text-sm font-dm transition-colors">
                hola@huastecapotosina.mx
              </a>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-crema/25 font-dm tracking-wide">
            <span>© 2026 Tours Huasteca Potosina · Todos los derechos reservados</span>
            <span>San Luis Potosí, México</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
