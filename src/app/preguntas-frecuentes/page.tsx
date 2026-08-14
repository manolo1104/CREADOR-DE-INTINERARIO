import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { getFaq } from "@/lib/i18n/faq.en";
import { CONTACTO } from "@/lib/contacto";

// Todo el copy (y los precios, leídos del catálogo) vive en `faq.en.ts`.
// Esta página solo lo pinta: el locale llega por el header `x-locale` que
// inyecta el middleware, igual que en /info-practica y /nosotros.

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getFaq(locale);
  const url = localeUrl("/preguntas-frecuentes", locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: buildAlternates("/preguntas-frecuentes", locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
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

const CLASE_CTA: Record<string, string> = {
  primaria:
    "bg-verde-selva hover:bg-verde-vivo text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors",
  secundaria:
    "border border-dorado/40 hover:bg-dorado/10 text-dorado px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors",
  terciaria:
    "border border-white/15 hover:border-crema/40 text-crema/70 hover:text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors",
};

export default function PreguntasFrecuentesPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getFaq(locale);
  const url = localeUrl("/preguntas-frecuentes", locale);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: t.inLanguage,
    mainEntity: t.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeUrl("/", locale) },
      { "@type": "ListItem", position: 2, name: t.breadcrumbActual, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main id="main-content" className="min-h-screen bg-negro pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
            <Link href={localePath("/", locale)} className="hover:text-crema/60 transition-colors">
              {t.breadcrumbHome}
            </Link>
            <span>/</span>
            <span className="text-verde-vivo/70">{t.breadcrumbActual}</span>
          </nav>

          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
            {t.heroEyebrow}
          </p>
          <h1 className="font-cormorant font-light text-crema leading-tight mb-6" style={{ fontSize: "clamp(34px,5vw,56px)" }}>
            {t.heroH1}
          </h1>
          <p className="text-crema/60 font-dm text-base leading-relaxed mb-14 max-w-2xl">
            {t.heroIntro}
          </p>

          {/* FAQ list */}
          <div className="divide-y divide-white/8 border-t border-white/8">
            {t.faqs.map((f) => (
              <section key={f.q} className="py-8">
                <h2 className="font-cormorant text-crema text-xl md:text-2xl leading-snug mb-3">
                  {f.q}
                </h2>
                <p className="text-crema/65 font-dm text-sm md:text-[15px] leading-relaxed">
                  {f.a}
                </p>
              </section>
            ))}
          </div>

          {/* CTA + links internos estratégicos */}
          <div className="mt-16 border border-verde-vivo/20 bg-verde-selva/10 p-8 text-center">
            <h2 className="font-cormorant text-crema text-2xl mb-3">{t.ctaTitulo}</h2>
            <p className="text-crema/55 font-dm text-sm mb-6 max-w-md mx-auto">
              {t.ctaTexto}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {t.ctaLinks.map((l) => (
                <Link key={l.href} href={l.href} className={CLASE_CTA[l.variante]}>
                  {l.label}
                </Link>
              ))}
            </div>
            <p className="mt-6 text-[11px] text-crema/40 font-dm">
              {t.ctaWhatsappPre}{" "}
              <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-verde-vivo hover:text-lima underline underline-offset-2">
                {CONTACTO.telefonoDisplay}
              </a>
            </p>
          </div>

          {/* Link de cierre (link strategy) */}
          <p className="mt-10 text-center text-[11px] text-crema/35 font-dm">
            {t.cierrePre}{" "}
            <Link href={t.cierreHref} className="text-verde-vivo/70 hover:text-lima underline underline-offset-2">
              {t.cierreLink}
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
