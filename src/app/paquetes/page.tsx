import { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { Star, TreePine, UtensilsCrossed, MapPin, Bus } from "lucide-react";
import { PaquetesInteractivo } from "@/components/PaquetesInteractivo";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { RESENAS_PAQUETES, TRASLADOS_TEXTO } from "@/lib/paquetes";
import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationNode, buildHotelNode } from "@/lib/jsonld";
import { getLocalizedPaquetes, getLocalizedFaqs, getPaquetesUI } from "@/lib/i18n/paquetes.en";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getPaquetesUI(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: buildAlternates("/paquetes", locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/paquetes", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // Sin `images`: la tarjeta la pone `opengraph-image.tsx` de cada segmento
      // (español aquí, inglés en /en/paquetes). Declararla aquí las anularía —
      // lo que declara la página gana al archivo. Ver la nota en destinos/page.tsx.
    },
  };
}

export default function PaquetesPage() {
  const locale   = asLocale(headers().get("x-locale"));
  const t        = getPaquetesUI(locale);
  const lp       = (path: string) => localePath(path, locale);
  const paquetes = getLocalizedPaquetes(locale);
  const faqs     = getLocalizedFaqs(locale, TRASLADOS_TEXTO(locale));
  const paquetesSchema = {
    "@context": "https://schema.org",
    "@graph": [
      // La operadora y el hotel: dos entidades distintas del mismo dueño. Los
      // paquetes son justo donde se juntan (tours de una, camas del otro).
      buildOrganizationNode(locale),
      buildHotelNode(locale),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbInicio, item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: t.breadcrumbPaquetes, item: localeUrl("/paquetes", locale) },
        ],
      },
      ...paquetes.map((p) => ({
        "@type": "Product",
        name: p.nombre,
        description: t.productDescripcion(p.subtitulo, p.duracion),
        image: `${SITE}${p.imagen}`,
        url: localeUrl(`/paquetes/${p.slug}`, locale),
        brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
        offers: {
          "@type": "Offer",
          price: p.precio,
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url: localeUrl(`/paquetes/${p.slug}`, locale),
        },
      })),
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        // HowTo — refleja la sección visible "Si vienes de CDMX". Alta intención
        // para "cómo llegar a Xilitla desde CDMX" en buscadores de IA.
        "@type": "HowTo",
        name: t.howToNombre,
        description: t.howToDescripcion,
        totalTime: "PT8H",
        estimatedCost: { "@type": "MonetaryAmount", currency: "MXN", value: 650 },
        step: [
          ...t.cdmxPasos.map((paso, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: paso.t,
            text: paso.d,
            url: `${localeUrl("/paquetes", locale)}#si-vienes-de-cdmx`,
          })),
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(paquetesSchema) }}
      />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-36 pb-28 overflow-hidden min-h-[520px] flex items-center">
        <Image
          src="/imagenes/cascada-de-tamul/hero.jpg"
          alt="Cascada de Tamul — Huasteca Potosina"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-negro/70 via-negro/55 to-negro/85" />
        <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            {t.heroEyebrow}
          </p>
          <h1 className="reveal-up font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(38px,6vw,70px)" }}>
            {t.heroH1a}
            <em className="shimmer-gold block italic">{t.heroH1b}</em>
          </h1>
          <p className="reveal-up text-crema/75 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8" style={{ animationDelay: "80ms" }}>
            {t.heroIntro1}
            <strong className="text-crema">{t.heroHotel}</strong>
            {t.heroIntro2}
          </p>
          <div className="inline-flex items-center gap-3 bg-negro/60 backdrop-blur-sm border border-white/15 px-5 py-3">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-dorado text-sm">{s}</span>
                ))}
              </div>
              <p className="text-[9px] font-dm text-crema/50 text-left">{t.googleReviews}</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.9</p>
              {/* Era "+320" mientras el resto del sitio dice 492: la misma
                  cifra no puede cambiar según la página que abra el cliente. */}
              <p className="text-[9px] font-dm text-crema/50">{t.resenasN}</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.8</p>
              <p className="text-[9px] font-dm text-crema/50">{t.bookingOp}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SI VIENES DE CDMX ── */}
      <section id="si-vienes-de-cdmx" className="relative border-b border-white/6 bg-gradient-to-b from-verde-profundo/45 to-negro py-16 px-6 overflow-hidden scroll-mt-24">
        <FloatingLeaves count={10} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-3 flex items-center justify-center gap-1.5">
              <Bus className="w-3.5 h-3.5" aria-hidden="true" /> {t.cdmxEyebrow}
            </p>
            <h2 className="reveal-up font-cormorant font-light text-crema leading-tight mb-3" style={{ fontSize: "clamp(26px,4vw,44px)" }}>
              {t.cdmxH2a}<em className="shimmer-gold">{t.cdmxH2b}</em>
            </h2>
            <p className="text-crema/60 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
              {t.cdmxIntro}
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {t.cdmxPasos.map((s) => (
              <li key={s.n} className="relative border border-white/10 bg-negro/40 p-5 list-none">
                <span className="font-cormorant text-dorado text-3xl leading-none" aria-hidden="true">{s.n}</span>
                <p className="font-dm text-crema/90 text-sm font-medium mt-3 mb-1.5">{s.t}</p>
                <p className="font-dm text-crema/55 text-[12px] leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <a
              href="https://coordinados.conectagfa.com.mx/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-verde-vivo/50 text-verde-vivo hover:bg-verde-vivo/10 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
            >
              {t.cdmxBoletos}
            </a>
            <p className="text-crema/40 font-dm text-[11px] max-w-xs">
              {t.cdmxAutoAvion1}
              <span className="text-crema/60">&ldquo;{t.cdmxComoLlegar}&rdquo;</span>{t.cdmxAutoAvion2}
            </p>
          </div>
        </div>
      </section>

      {/* ── RESEÑAS ── */}
      <section className="relative border-b border-white/6 bg-negro/80 py-12 px-6 overflow-hidden">
        <FloatingLeaves count={12} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-crema/30 font-dm text-center mb-8">
            {t.resenasTitulo}
            {t.resenasEnEspanol && (
              <span className="block normal-case tracking-normal text-crema/40 italic mt-1">{t.resenasEnEspanol}</span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {RESENAS_PAQUETES.map((r) => (
              <div key={r.nombre} className="border border-white/8 bg-negro/50 p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(r.estrellas)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />
                  ))}
                </div>
                <p className="font-dm text-xs text-crema/70 leading-relaxed italic mb-4">
                  &ldquo;{r.texto}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img src={r.foto} alt={r.nombre} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/15" loading="lazy" />
                  <div>
                    <p className="font-dm text-xs text-crema/80 font-medium leading-none">{r.nombre}</p>
                    <p className="text-[9px] font-dm text-crema/35 mt-0.5">{r.ciudad} · {r.tour}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTA ── */}
      <div className="border-b border-white/6 bg-dorado/8">
        <div className="max-w-5xl mx-auto px-6 py-3.5 text-center">
          <p className="text-[11px] text-dorado/80 font-dm">
            {t.notaWhatsapp}
          </p>
        </div>
      </div>

      {/* ── QUIZ + PAQUETES + STICKY BAR ── */}
      <PaquetesInteractivo paquetes={paquetes} />

      {/* ── HOTEL INFO ── */}
      <section className="relative bg-verde-profundo/30 border-t border-white/6 py-16 px-6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">{t.hotelEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(26px,4vw,44px)" }}>
            {t.hotelH2}<em className="shimmer-gold">Xilitla</em>
          </h2>
          <p className="text-crema/55 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-10">
            {t.hotelIntro}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[TreePine, UtensilsCrossed, MapPin].map((Icon, i) => {
              const text = t.hotelPuntos[i];
              return (
              <div key={text} className="border border-white/10 bg-negro/30 px-4 py-4 text-center">
                <Icon className="w-6 h-6 text-verde-vivo mx-auto mb-2" aria-hidden="true" />
                <p className="text-[11px] text-crema/60 font-dm">{text}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="reveal-up font-cormorant text-crema text-2xl mb-8 text-center">{t.faqTitulo}<em className="text-dorado">{t.faqTituloEm}</em></h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
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
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative bg-verde-profundo/40 border-t border-white/6 py-16 px-6 text-center overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10">
          <h2 className="reveal-up font-cormorant text-crema text-2xl mb-3">{t.ctaH2}</h2>
          <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
            {t.ctaTexto}
          </p>
          <a
            href={`https://wa.me/524891251458?text=${encodeURIComponent(t.ctaWa)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
            {t.ctaBoton}
          </a>
        </div>
      </section>

    </main>
  );
}
