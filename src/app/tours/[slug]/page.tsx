import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { TOURS_DB } from "@/lib/tours";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { TourGallery } from "@/components/TourGallery";
import { TourDeparture } from "@/components/TourDeparture";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { TourPageTracker } from "@/components/TourPageTracker";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Star, Clock, Users, Lock, Shield, RefreshCw, Camera, Headphones } from "lucide-react";
import { InventoryBadge } from "@/components/booking/InventoryBadge";
import { SocialProofToast } from "@/components/booking/SocialProofToast";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return TOURS_DB.map((t) => ({ slug: t.slug }));
}

const SITE = "https://www.huasteca-potosina.com";

export function generateMetadata({ params }: Props): Metadata {
  const tour = TOURS_DB.find((t) => t.slug === params.slug);
  if (!tour) return {};
  const url = `${SITE}/tours/${tour.slug}`;
  const image = tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`;
  return {
    title: `${tour.nombre} | Tours Huasteca Potosina`,
    description: tour.descripcion,
    openGraph: {
      title: `${tour.nombre} | Tours Huasteca Potosina`,
      description: tour.descripcion,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: tour.nombre }],
    },
    alternates: { canonical: url },
    twitter: {
      card: "summary_large_image",
      title: `${tour.nombre} | Tours Huasteca Potosina`,
      description: tour.descripcion,
      images: [image],
    },
  };
}

const DIFICULTAD_CONFIG = {
  alta:  { label: "Avanzado", bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: "Moderado", bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: "Fácil",    bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

export default function TourDetailPage({ params }: Props) {
  const tour = TOURS_DB.find((t) => t.slug === params.slug);
  if (!tour) notFound();

  const dif = DIFICULTAD_CONFIG[tour.dificultad];
  const reviews = TOUR_REVIEWS[tour.id as keyof typeof TOUR_REVIEWS] ?? [];

  const tourSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.nombre,
    description: tour.descripcionLarga,
    image: tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`,
    url: `${SITE}/tours/${tour.slug}`,
    touristType: ["Turismo de aventura", "Turismo de naturaleza", tour.tipo],
    duration: `PT${tour.duracion_hrs}H`,
    provider: {
      "@type": "TouristAgency",
      name: "Tours Huasteca Potosina",
      url: SITE,
    },
    offers: {
      "@type": "Offer",
      price: tour.precio,
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: `${SITE}/tours/${tour.slug}`,
    },
    // aggregateRating va en Product (abajo) — TouristTrip no es soportado por Google para rich snippets de reseñas
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Qué incluye el ${tour.nombre}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: tour.incluye.join(", ") + ". Todo incluido en el precio.",
        },
      },
      {
        "@type": "Question",
        name: `¿Cuánto dura el ${tour.nombre}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `El tour tiene una duración aproximada de ${tour.duracion_hrs} horas e incluye transporte, guía certificado y todas las entradas.`,
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo cancelar mi reserva?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Cancelación gratuita hasta 48 horas antes del tour. Reembolso completo sin preguntas.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cuál es el precio por persona?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `El precio es $${tour.precio.toLocaleString("es-MX")} MXN por persona adulta. Niños (4–12 años) tienen un 40% de descuento. Menores de 4 años entran gratis.`,
        },
      },
      {
        "@type": "Question",
        name: "¿Dónde es el punto de salida?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El tour sale desde Ciudad Valles, San Luis Potosí. Incluimos recogida en tu hotel o punto de encuentro acordado.",
        },
      },
    ],
  };

  // Product: único tipo soportado por Google para rich snippets de reseñas con AggregateRating
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.nombre,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.9,          // Number, no string — valor real de Google Maps
      reviewCount: tour.reviewCount, // Total real de reseñas
      bestRating: 5,
      worstRating: 1,
    },
    ...(reviews.length > 0 ? {
      review: reviews.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.nombre },
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.texto,
        datePublished: r.fecha,
      })),
    } : {}),
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tourSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Tours",  item: `${SITE}/tours` },
          { "@type": "ListItem", position: 3, name: tour.nombre, item: `${SITE}/tours/${tour.slug}` },
        ],
      }) }} />

      {/* ── HERO ── */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {tour.imagen_hero && (
          <Image
            src={tour.imagen_hero}
            alt={tour.nombre}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/50 to-negro/20" />

        {/* Badges */}
        <div className="absolute top-24 left-6 flex gap-2">
          <span className="bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full">
            {tour.tipo}
          </span>
          <span className={`${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
            {dif.label}
          </span>
        </div>

        {/* Título */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-4xl">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-3">
            Tour guiado con todo incluido
          </p>
          <h1
            className="font-cormorant font-light text-crema leading-tight mb-3"
            style={{ fontSize: "clamp(28px,5vw,56px)" }}
          >
            {tour.nombre}
          </h1>
          <p className="text-dorado/80 font-dm text-sm italic mb-4">{tour.tagline}</p>
          {/* Precio visible en el fold */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2.5 py-1 rounded-sm">
              30% OFF
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(24px,3.5vw,36px)" }}>
                ${tour.precio.toLocaleString("es-MX")}
              </span>
              <span className="text-crema/50 font-dm text-xs">MXN / persona · Todo incluido</span>
            </div>
          </div>
        </div>
      </section>

      <TourPageTracker tourId={tour.id} nombre={tour.nombre} precio={tour.precio} tipo={tour.tipo} />
      <MobileBookingBar tourSlug={tour.slug} precio={tour.precio} tourId={tour.id} tourName={tour.nombre} />

      {/* ── CONTENIDO ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-10">

          {/* Descripción aspiracional */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-4">
              Acerca de este tour
            </h2>
            <p className="text-crema/65 font-dm text-sm leading-relaxed mb-6">
              {tour.descripcion}
            </p>
            {tour.descripcionLarga && (
              <div className="space-y-4 border-l-2 border-verde-vivo/30 pl-5">
                {tour.descripcionLarga.split("\n\n").map((parrafo, i) => (
                  <p key={i} className="text-crema/55 font-dm text-sm leading-relaxed">
                    {parrafo}
                  </p>
                ))}
              </div>
            )}
          </section>

          {/* Destinos */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">
              Destinos del recorrido
            </h2>
            <ul className="space-y-3">
              {tour.destinos.map((d, i) => (
                <li key={d} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-verde-selva/40 border border-verde-vivo/30 flex items-center justify-center text-[11px] text-verde-vivo font-dm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-crema/70 font-dm text-sm pt-1">{d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Galería interactiva */}
          {tour.gallery.length > 0 && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-5">
                Imágenes del recorrido
              </h2>
              <TourGallery images={tour.gallery} tourName={tour.nombre} />
            </section>
          )}

          {/* Todo incluido */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">
              Todo incluido ✦
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tour.incluye.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-crema/65 font-dm">
                  <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Punto de salida */}
          <TourDeparture />

          {/* Reseñas */}
          {TOUR_REVIEWS[tour.id]?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cormorant text-crema text-2xl">
                  Lo que dicen quienes ya fueron
                </h2>
                <a
                  href={GOOGLE_MAPS_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors flex-shrink-0"
                >
                  Ver en Google →
                </a>
              </div>
              <div className="flex gap-1 mb-6">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-dorado text-lg">{s}</span>
                ))}
                <span className="text-crema/40 font-dm text-sm ml-2 self-end">5.0 · {TOUR_REVIEWS[tour.id].length} reseñas</span>
              </div>
              <div className="space-y-5">
                {TOUR_REVIEWS[tour.id].map((r) => (
                  <div key={r.nombre} className="border border-white/8 bg-negro/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.foto}
                        alt={r.nombre}
                        width={36}
                        height={36}
                        loading="lazy"
                        className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                      />
                      <div>
                        <p className="text-crema font-dm text-sm font-medium leading-none">{r.nombre}</p>
                        <p className="text-crema/35 font-dm text-[10px] mt-0.5">{r.ciudad} · {r.fecha}</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {"★★★★★".split("").map((s, i) => (
                          <span key={i} className="text-dorado text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-crema/60 font-dm text-sm leading-relaxed">
                      &ldquo;{r.texto}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center">
                <a
                  href={GOOGLE_MAPS_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors"
                >
                  Ver todas las reseñas en Google Maps →
                </a>
              </p>
            </section>
          )}
        </div>

        {/* Sidebar sticky */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="border border-white/10 bg-negro/60 p-5">
              {/* Descuento badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2 py-0.5">
                  30% OFF
                </span>
                <span className="text-[9px] text-crema/35 font-dm">Precio especial</span>
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">desde</p>
              <p className="text-[12px] text-crema/35 font-dm line-through leading-none">
                ${tour.precioOriginal.toLocaleString("es-MX")}
              </p>
              <p className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(32px,4vw,48px)" }}>
                ${tour.precio.toLocaleString("es-MX")}
              </p>
              <p className="text-[11px] text-crema/40 font-dm mt-1">MXN por persona</p>
              {/* Rating */}
              <p className="text-[10px] text-dorado/80 font-dm mt-2 flex items-center gap-1">
                <Star className="w-3 h-3 fill-dorado/80" aria-hidden="true" /> 4.9 · ({tour.reviewCount} reseñas)
              </p>
              {/* Duración */}
              <p className="text-[10px] text-crema/40 font-dm mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" /> Duración: {tour.duracion_hrs} horas aprox.
              </p>
              {/* Tamaño de grupo */}
              <p className="text-[10px] text-crema/40 font-dm mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" aria-hidden="true" /> Grupo: máx. {tour.groupMax} personas
              </p>
              {/* Tour privado */}
              {tour.privateAvailable && (
                <a
                  href={waLink(`Hola, me interesa hacer el tour "${tour.nombre}" de forma privada. ¿Cuál sería el costo?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-verde-vivo hover:text-lima font-dm mt-2 transition-colors"
                >
                  <Lock className="w-3 h-3" aria-hidden="true" /> ¿Tour privado para tu grupo? →
                </a>
              )}
              {/* Inventory badge */}
              <InventoryBadge tourId={tour.id} tourName={tour.nombre} />
              {/* Urgencia */}
              {tour.urgencia && (
                <p className="text-[9px] text-dorado/80 bg-dorado/10 border border-dorado/20 px-2 py-1 mt-2 font-dm leading-tight">
                  {tour.urgencia}
                </p>
              )}
            </div>

            {/* CTA directo — sin form, van a /reservar-tour */}
            <div className="space-y-2.5">
              <Link
                href={`/reservar-tour/${tour.slug}`}
                className="flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                Reservar este tour
              </Link>
              <a
                href={waLink(WA_MESSAGES.tour(tour.nombre, 2, 0, tour.precio * 2))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                Preguntar por WhatsApp
              </a>
              <p className="text-center text-[9px] text-crema/25 font-dm">Cancela gratis · 48h antes</p>
            </div>

            {/* Garantías explícitas */}
            <div className="border border-white/10 bg-negro/60 p-5">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-4">Reserva con total confianza</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">Cancelación gratuita</p>
                    <p className="text-[10px] font-dm text-crema/40">Hasta 48h antes · Reembolso completo</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">Si llueve, reprogramamos</p>
                    <p className="text-[10px] font-dm text-crema/40">Sin costo adicional · Fecha flexible</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">Fotos y video incluidos</p>
                    <p className="text-[10px] font-dm text-crema/40">Entregados el mismo día · Sin extra</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Headphones className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-dm font-medium text-crema/85">Soporte en WhatsApp 24/7</p>
                    <p className="text-[10px] font-dm text-crema/40">Respuesta en menos de 1 hora</p>
                  </div>
                </li>
              </ul>
            </div>

            <Link
              href="/tours"
              className="block text-center border border-white/15 hover:border-crema/30 text-crema/50 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm py-3 transition-all duration-200"
            >
              ← Ver todos los tours
            </Link>
          </div>
        </aside>
      </div>

      {/* ── TOURS SIMILARES / CROSS-SELL ── */}
      {(() => {
        const COMBOS: Record<string, { slug: string; msg: string }> = {
          "tour-tamul":       { slug: "tour-edward-james", msg: "Si tienes un día más: Las Pozas de Edward James es el complemento perfecto — arte surrealista después de la naturaleza bruta." },
          "tour-edward-james":{ slug: "tour-tamul",        msg: "Combínalo con la Expedición Tamul — cascada + selva al día siguiente. El clásico de 2 días de la Huasteca." },
          "tour-meco":        { slug: "tour-minas-micos",  msg: "Combínalo con el Tour Minas + Micos para un segundo día de aguas turquesas con más cascadas y tirolesas." },
          "tour-minas-micos": { slug: "tour-meco",         msg: "Combínalo con Cascada El Meco — aguas turquesas reales con luz perfecta. Dos días, dos experiencias únicas." },
          "tour-puente-dios": { slug: "tour-minas-micos",  msg: "Combínalo con Minas + Micos al día siguiente — más cascadas, más pozas, la ruta de aguas completa." },
        };
        const combo = COMBOS[tour.id];
        const comboTour = combo ? TOURS_DB.find((t) => t.slug === combo.slug) : null;
        const otherTours = TOURS_DB.filter((t) => t.slug !== tour.slug && t.slug !== combo?.slug).slice(0, 2);

        return (
          <section className="border-t border-white/6 py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm text-center mb-2">Maximiza tu viaje</p>
              <h2 className="font-cormorant text-crema text-2xl mb-10 text-center">
                Tours que combinan con este recorrido
              </h2>

              {/* Combo destacado */}
              {comboTour && combo && (
                <div className="border border-dorado/25 bg-dorado/5 p-5 mb-8 flex flex-col sm:flex-row gap-5 items-start">
                  <div className="sm:flex-shrink-0 w-full sm:w-40">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      {comboTour.imagen_hero && (
                        <Image
                          src={comboTour.imagen_hero}
                          alt={comboTour.nombre}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[8px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 px-2 py-0.5 mb-2">
                      ✦ Combinación recomendada
                    </span>
                    <h3 className="font-cormorant text-crema text-lg leading-snug mb-1">{comboTour.nombre}</h3>
                    <p className="text-crema/55 font-dm text-xs leading-relaxed mb-3">{combo.msg}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-cormorant text-dorado text-base">
                        ${comboTour.precio.toLocaleString("es-MX")} MXN/persona
                      </span>
                      <Link
                        href={`/tours/${comboTour.slug}`}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 hover:bg-dorado/10 px-3 py-1.5 transition-all"
                      >
                        Ver tour →
                      </Link>
                      <Link
                        href={`/reservar-tour/${comboTour.slug}`}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-negro bg-dorado hover:bg-lima px-3 py-1.5 transition-all"
                      >
                        Reservar →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Otros tours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherTours.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tours/${t.slug}`}
                    className="group border border-white/8 hover:border-verde-vivo/40 bg-negro/40 p-5 flex gap-4 items-start transition-all duration-200"
                  >
                    <div className="relative w-20 h-20 overflow-hidden flex-shrink-0">
                      {t.imagen_hero && (
                        <Image src={t.imagen_hero} alt={t.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="80px" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{t.tipo}</p>
                      <h3 className="font-cormorant text-crema text-base leading-tight group-hover:text-dorado transition-colors mb-1">{t.nombre}</h3>
                      <p className="text-[10px] text-crema/40 font-dm">Desde ${t.precio.toLocaleString("es-MX")} MXN</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      <SocialProofToast tourId={tour.id} tourName={tour.nombre} />
    </main>
  );
}
