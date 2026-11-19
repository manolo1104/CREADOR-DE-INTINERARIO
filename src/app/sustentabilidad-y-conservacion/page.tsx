import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Leaf, Droplet, Users, TreePine, Heart, Shield, Sun, Recycle } from "lucide-react";
import { asLocale, buildAlternates, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { waLink } from "@/lib/whatsapp";
import { getSustentabilidad } from "@/lib/i18n/sustentabilidad.en";

/**
 * Sustentabilidad y conservación, en español y en inglés (/en desde el
 * 10 nov 2026). Todo el texto vive en `src/lib/i18n/sustentabilidad.en.ts`.
 * 🔴 Las cifras de esta página no tienen fuente (ver la nota de ese archivo):
 * se cambian allí, en los dos idiomas a la vez.
 */

const RUTA = "/sustentabilidad-y-conservacion";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getSustentabilidad(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: buildAlternates(RUTA, locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl(RUTA, locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // 1200×800 es la medida REAL del archivo (decía 630).
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: t.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle,
      description: t.twitterDescription,
      images: [`${SITE}/og-image.jpg`],
    },
  };
}

// Mismo orden que `compromisos` del diccionario.
const ICONOS_COMPROMISOS = [TreePine, Users, Droplet, Recycle, Sun, Heart];

export default function SustentabilidadPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getSustentabilidad(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: t.webPageName,
        description: t.webPageDescription,
        url: localeUrl(RUTA, locale),
        inLanguage: t.inLanguage,
        isPartOf: { "@type": "WebSite", name: "Tours Huasteca Potosina", url: SITE },
        publisher: { "@type": "Organization", name: "Tours Huasteca Potosina", url: SITE },
      },
      buildBreadcrumbNode([{ name: t.breadcrumbActual, path: RUTA }], locale),
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── HERO ── */}
      <section className="relative bg-verde-profundo px-6 pt-36 pb-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(90,158,42,0.3),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="rounded-full inline-flex items-center gap-2 text-[10px] tracking-[4px] uppercase text-lima border border-lima/30 px-4 py-1.5 mb-6 font-dm">
            <Leaf className="w-3 h-3" /> {t.heroBadge}
          </span>
          <h1 className="font-cormorant font-light text-crema mb-6 leading-tight" style={{ fontSize: "clamp(36px,6vw,70px)" }}>
            {t.h1}
            <em className="text-lima block italic">{t.h1Em}</em>
          </h1>
          <p className="text-crema/65 font-dm text-sm leading-relaxed max-w-2xl mx-auto">{t.heroTexto}</p>
        </div>
      </section>

      {/* ── DECLARACIÓN ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{t.filosofiaEyebrow}</p>
        <h2 className="font-cormorant font-light text-verde-profundo mb-8" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
          {t.filosofiaH2Pre}<em className="text-dorado">{t.filosofiaH2Em}</em>{t.filosofiaH2Post}
        </h2>
        <div className="space-y-5 text-negro/65 font-dm text-sm leading-relaxed text-left max-w-2xl mx-auto">
          {t.filosofia.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      {/* ── COMPROMISOS ── */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.compromisosEyebrow}</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.compromisosH2Pre}<em className="text-dorado">{t.compromisosH2Em}</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.compromisos.map((c, i) => {
              const Icon = ICONOS_COMPROMISOS[i];
              return (
                <div key={c.titulo} className="rounded-2xl border border-verde-selva/15 bg-crema/60 p-6 hover:border-verde-selva/40 transition-colors">
                  <Icon className="w-7 h-7 text-verde-selva mb-4" aria-hidden="true" />
                  <h3 className="font-cormorant text-verde-profundo text-lg mb-2 leading-tight">{c.titulo}</h3>
                  <p className="text-negro/55 font-dm text-sm leading-relaxed">{c.texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LÍNEA DE TIEMPO ── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.historiaEyebrow}</p>
        <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          {t.historiaH2Pre}<em className="text-dorado">{t.historiaH2Em}</em>
        </h2>
        <div className="relative">
          <div className="absolute left-14 top-0 bottom-0 w-px bg-verde-selva/20" />
          <div className="space-y-8">
            {t.acciones.map((a) => (
              <div key={a.año} className="flex gap-6 items-start">
                <span className="w-12 text-right font-cormorant text-dorado text-lg font-light flex-shrink-0">{a.año}</span>
                <div className="w-3 h-3 rounded-full bg-verde-selva flex-shrink-0 mt-1.5 relative z-10" />
                <p className="text-negro/65 font-dm text-sm leading-relaxed">{a.accion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONDO DE CONSERVACIÓN ── */}
      <section className="bg-verde-profundo py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <Shield className="w-10 h-10 text-lima mx-auto mb-6" aria-hidden="true" />
          <h2 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.fondoH2Pre}<em className="text-lima">{t.fondoH2Em}</em>
          </h2>
          <p className="text-crema/60 font-dm text-sm leading-relaxed mb-8">{t.fondoTexto}</p>
          <Link
            href={t.fondoCtaHref}
            className="rounded-xl inline-block bg-lima text-negro px-10 py-4 text-sm tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo hover:text-crema transition-colors duration-300"
          >
            {t.fondoCta}
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 text-center bg-crema">
        <p className="text-negro/50 font-dm text-sm mb-4">{t.ctaPregunta}</p>
        <a
          href={waLink(t.ctaWhatsapp)}
          target="_blank" rel="noopener noreferrer"
          className="rounded-xl inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
        >
          {t.ctaBoton}
        </a>
      </section>

    </main>
  );
}
