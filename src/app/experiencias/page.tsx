import Link from "next/link";
import { Metadata } from "next";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB, TOURS_DESTACADOS } from "@/lib/tours";
import ExperienciasClient from "./ExperienciasClient";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { TourCard } from "@/components/TourCard";
import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { getExperiencias, conNumero } from "@/lib/i18n/experiencias.en";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getExperiencias(locale);
  const n = DESTINOS_DB.length;
  const url = localeUrl("/experiencias", locale);
  return {
    // El título era idéntico al de /que-hacer-en-la-huasteca-potosina, así que
    // las dos páginas competían entre sí por la misma búsqueda. Esta se queda
    // con "experiencias" (el catálogo) y la otra con "qué hacer" (la guía).
    title: conNumero(t.metaTitle, n, locale),
    description: conNumero(t.metaDescription, n, locale),
    alternates: buildAlternates("/experiencias", locale),
    openGraph: {
      title: t.ogTitle,
      description: conNumero(t.ogDescription, n, locale),
      url,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle,
      description: conNumero(t.twitterDescription, n, locale),
    },
  };
}

export default function ExperienciasPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getExperiencias(locale);
  const url = localeUrl("/experiencias", locale);
  const nDestinos = DESTINOS_DB.length;

  // Los destinos del JSON-LD se localizan: publicar el catálogo en español
  // dentro de la página inglesa le dice a Google que la página no está traducida.
  const destinos = DESTINOS_DB.map((d) => localizeDestino(d, locale));

  const experienciasSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: t.schemaListName,
        description: t.schemaListDescription,
        url,
        numberOfItems: nDestinos,
        itemListElement: destinos.map((d, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "TouristAttraction",
            name: d.nombre,
            description: d.descripcion,
            url: localeUrl(`/destinos/${d.slug}`, locale),
            image: d.imagen_hero ? `${SITE}${d.imagen_hero}` : undefined,
            touristType: d.tipo,
            geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
            address: {
              "@type": "PostalAddress",
              addressLocality: d.zona,
              addressRegion: "San Luis Potosí",
              addressCountry: "MX",
            },
            offers: {
              "@type": "Offer",
              price: d.precio_entrada.match(/\d+/)?.[0] || "0",
              priceCurrency: "MXN",
              availability: "https://schema.org/InStock",
            },
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeUrl("/", locale) },
          { "@type": "ListItem", position: 2, name: t.breadcrumbActual, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: t.inLanguage,
        mainEntity: t.faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-negro">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(experienciasSchema) }}
      />

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {t.heroEyebrow}
        </p>
        <h1
          className="reveal-up font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(40px,7vw,76px)" }}
        >
          {t.heroH1a} <em className="shimmer-gold">{t.heroH1Enfasis}</em>
        </h1>
        <p className="reveal-up text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed" style={{ animationDelay: "80ms" }}>
          {conNumero(t.heroIntro, nDestinos, locale)}
        </p>
      </section>

      {/* ── BANNER PLANIFICADOR IA ──
          Solo español: `/recomendar` no tiene versión /en y mandar ahí al
          visitante inglés lo saca del sitio en su idioma. */}
      {t.bannerVisible && (
        <div className="bg-verde-profundo/30 border-y border-verde-vivo/15 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-0.5">{t.bannerEyebrow}</p>
              <p className="text-crema font-dm text-sm">{t.bannerTexto}</p>
            </div>
            <Link
              href={localePath("/reservar", locale)}
              className="flex-shrink-0 bg-dorado text-negro text-[10px] tracking-[2px] uppercase font-dm px-6 py-3 hover:bg-lima transition-colors whitespace-nowrap font-medium"
            >
              {t.bannerCta}
            </Link>
          </div>
        </div>
      )}

      {/* ── TOURS GUIADOS ──
          Esta página lista los 41 DESTINOS, no tours: hasta ahora el único
          toque de producto era un link "Ver todos los tours" hasta el final.
          Aquí van arriba los cuatro que concentran el interés real. */}
      <section className="px-6 py-14 border-b border-white/6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
            <div>
              <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-1">{t.toursEyebrow}</p>
              <h2 className="font-cormorant font-light text-crema text-3xl">
                {t.toursTitulo}
              </h2>
            </div>
            <Link
              href={localePath("/tours", locale)}
              className="text-[10px] tracking-[2px] uppercase text-dorado hover:text-lima transition-colors font-dm"
            >
              {conNumero(t.toursVerTodos, TOURS_DB.length, locale)}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TOURS_DESTACADOS.map((slug) => {
              const tour = TOURS_DB.find((t) => t.slug === slug);
              return tour ? (
                <TourCard key={tour.slug} tour={localizeTour(tour, locale)} variant="compact" />
              ) : null;
            })}
          </div>
        </div>
      </section>

      {/* ── GRID CON FILTROS (client component) ── */}
      <ExperienciasClient />

      {/* ── CTA TOURS ── */}
      <section className="relative py-16 px-6 text-center bg-verde-profundo/20 border-t border-white/6 overflow-hidden">
        <FloatingLeaves count={12} />
        <div className="relative z-10">
        <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">
          {t.ctaBadge}
        </span>
        <h2
          className="reveal-up font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(26px,4vw,44px)" }}
        >
          {t.ctaH2a} <em className="shimmer-gold">{t.ctaH2Enfasis}</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          {t.ctaTexto}
        </p>
        <Link
          href={localePath("/tours", locale)}
          className="inline-block bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors"
        >
          {t.ctaBoton}
        </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 border-t border-white/6">
        <div className="max-w-3xl mx-auto">
          <h2
            className="reveal-up font-cormorant font-light text-crema text-center mb-10"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            {t.faqTituloA} <em className="text-dorado">{t.faqTituloEnfasis}</em>
          </h2>
          <div className="space-y-2">
            {t.faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-white/10 overflow-hidden open:border-verde-selva/30"
              >
                <summary className="cursor-pointer px-5 py-4 text-crema font-dm text-sm font-medium list-none select-none hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                  <span>{q}</span>
                  <span className="text-verde-vivo text-lg flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="px-5 pb-5 pt-1 text-crema/55 font-dm text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEAD MAGNET ──
          Solo español: la guía PDF está escrita y se entrega en español, así
          que cobrarla en la página inglesa sería venderle al lector un
          documento que no puede leer. */}
      {t.guiaVisible && (
        <section className="relative py-20 px-6 bg-verde-profundo border-t border-white/8 overflow-hidden">
          <FloatingLeaves count={18} />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-vivo/40 px-4 py-1.5 mb-6 font-dm">
              {t.guiaBadge}
            </span>
            <h2
              className="reveal-up font-cormorant font-light text-crema mb-4"
              style={{ fontSize: "clamp(26px,4vw,44px)" }}
            >
              {t.guiaH2a}{" "}
              <em className="text-dorado">{t.guiaH2Enfasis}</em>
            </h2>
            <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto leading-relaxed">
              {t.guiaTexto}
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-cormorant font-light text-crema/40 line-through text-xl">$199</span>
                <span className="font-cormorant font-light text-dorado text-3xl">$49 <span className="text-[11px] font-dm text-crema/40">MXN</span></span>
              </div>
              <Link href="/guia" className="inline-block bg-dorado text-negro px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300">
                {t.guiaBoton}
              </Link>
              <p className="text-[11px] text-crema/30 tracking-wide font-dm">{t.guiaGarantia}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
