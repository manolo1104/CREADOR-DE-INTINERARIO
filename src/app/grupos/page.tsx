import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { waLink } from "@/lib/whatsapp";
import { asLocale, buildAlternates, localeUrl, SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getGrupos, type SegGrupos } from "@/lib/i18n/grupos.en";

/**
 * Landing para quien ORGANIZA el viaje de otros: escuelas, empresas y agencias.
 *
 * Nace de dos compradoras reales del 11 sep 2026, las dos por teléfono y
 * WhatsApp y ninguna por el sitio: un grupo de 40-50 personas para 5-6 días en
 * abril que pedía «la orientación que nos proporcione», y una escuela que
 * necesitaba «enviar la propuesta a los papás» incluyendo dos hoteles,
 * alimentos, transporte «partiendo de la CDMX» y cortesías para los profesores.
 *
 * 🔴 Lo que esta página NO puede decir, por decisión de Manolo (11 sep), está
 * al inicio de `src/lib/i18n/grupos.en.ts`, donde vive todo el texto (los dos
 * idiomas): ningún precio, porcentaje, mínimo, cortesía, ciudad salvo CDMX ni
 * reseña.
 *
 * Inglés desde el 10 nov 2026 (/en/grupos). Nació solo en español porque el
 * comprador era una escuela o empresa mexicana; el plan SEO del 10 nov
 * (aprobado por Manolo) la incluye en el sitio inglés completo, con la gemela
 * declarada en hreflang ahora que sí existe. La versión inglesa abre WhatsApp
 * con el mismo mensaje de cinco datos, en inglés.
 */

const RUTA = "/grupos";
const OG = `${SITE}/imagenes/cascada-de-tamul/hero.jpg`;

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getGrupos(locale);
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
      images: [{ url: OG, width: 1600, height: 960, alt: t.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle,
      description: t.twitterDescription,
      images: [OG],
    },
  };
}

const CLASE_ENLACE = "text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2";

/** Pinta un párrafo con enlaces del diccionario. */
function Rico({ segs, claseEnlace }: { segs: SegGrupos[]; claseEnlace: string }) {
  return (
    <>
      {segs.map((s, i) =>
        typeof s === "string" ? (
          <Fragment key={i}>{s}</Fragment>
        ) : (
          <Link key={i} href={s.href} className={claseEnlace}>
            {s.link}
          </Link>
        ),
      )}
    </>
  );
}

export default function GruposPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getGrupos(locale);
  const wa = waLink(t.whatsapp);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbNode([{ name: t.breadcrumbActual, path: RUTA }], locale),
      {
        "@type": "FAQPage",
        inLanguage: t.inLanguage,
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      // Sin `Offer` a propósito: no hay tarifa de grupo publicada. Declarar un
      // precio que no existe es peor que no declarar ninguno. Y sin
      // `aggregateRating`: no hay reseñas reales de grupos.
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{t.heroEyebrow}</p>
        <h1
          className="font-cormorant font-light text-crema mb-5 leading-tight"
          style={{ fontSize: "clamp(34px,5.5vw,62px)" }}
        >
          {t.h1Pre}<em className="shimmer-gold italic">{t.h1Em}</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-4">{t.heroTexto}</p>
        <p className="text-crema/50 font-dm text-xs leading-relaxed max-w-2xl mx-auto mb-8">
          {t.heroNota}<strong className="text-crema/70">{t.heroNotaStrong}</strong>
        </p>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          {t.botonWhatsapp}
        </a>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">{t.comoFuncionaH2}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.comoFunciona.map((p) => (
              <div key={p.n} className="border border-white/10 p-6 flex flex-col">
                <p className="font-cormorant text-dorado text-3xl leading-none mb-3">{p.n}</p>
                <h3 className="font-dm font-medium text-crema text-sm mb-2">{p.t}</h3>
                <p className="font-dm text-xs text-crema/60 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUÉ PUEDE INCLUIR ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">{t.incluyeH2}</h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">{t.incluyeIntro}</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">{t.recorridosTitulo}</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">{t.recorridosTexto}</p>
            </div>
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">{t.hospedajeTitulo}</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">{t.hospedajeTexto}</p>
            </div>
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">{t.transporteTitulo}</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">{t.transporteTexto}</p>
              {/* Para el grupo chico que sale de la CDMX ya existe un producto con fecha (16 oct 2026). */}
              <p className="font-dm text-sm text-crema/65 leading-relaxed mt-3">
                <Rico segs={t.viajeCdmx} claseEnlace="text-dorado underline underline-offset-4 hover:text-crema" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DE QUÉ SE COMPONE UN VIAJE ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.composicionH2}</h2>
          <p className="font-dm text-sm text-crema/65 leading-relaxed mb-4">
            <Rico segs={t.composicion} claseEnlace={CLASE_ENLACE} />
          </p>
          <p className="font-dm text-sm text-crema/45 leading-relaxed">{t.composicionNota}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">{t.faqH2}</h2>
          <div className="space-y-6">
            {t.faqs.map((f) => (
              <div key={f.q} className="border-b border-white/10 pb-6">
                <h3 className="font-dm font-medium text-crema text-sm mb-2">{f.q}</h3>
                <p className="font-dm text-sm text-crema/65 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-28 text-center">
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.ctaH2}</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">{t.ctaTexto}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            {t.botonWhatsapp}
          </a>
          <Link
            href={t.ctaNosotros.href}
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            {t.ctaNosotros.label}
          </Link>
        </div>
      </section>
    </main>
  );
}
