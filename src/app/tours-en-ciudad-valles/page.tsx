import type { Metadata } from "next";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import Link from "next/link";
import { headers } from "next/headers";
import { tourDurTexto } from "@/lib/tours";
import { waLink } from "@/lib/whatsapp";
import { SITE, asLocale, buildAlternates, localePath, localeUrl } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { localizeTour } from "@/lib/i18n/localize";
import { TOURS_CV, OTROS_CV, getToursValles } from "@/lib/i18n/toursValles.en";

const PATH = "/tours-en-ciudad-valles";

// Todo el texto (y las cifras, leídas del catálogo) vive en `toursValles.en.ts`.
// El idioma llega por el header `x-locale` del middleware: /en/tours-en-ciudad-valles
// reexporta esta misma página (10 nov 2026). El español sale idéntico al de antes.

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getToursValles(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: buildAlternates(PATH, locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl(PATH, locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}/imagenes/cascadas-de-micos/hero.jpg`, width: 1600, height: 960, alt: t.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle,
      description: t.twitterDescription,
      images: [`${SITE}/imagenes/cascadas-de-micos/hero.jpg`],
    },
  };
}

export default function ToursCiudadVallesPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const t = getToursValles(locale);
  // Nombre, tipo y nombre corto en el idioma de la página; precio, horario y
  // recogida siguen saliendo del registro español (no se traducen).
  const toursCV = TOURS_CV.map((x) => localizeTour(x, locale));
  const otros = OTROS_CV.map((x) => localizeTour(x, locale));
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // Mismas migas, por el ayudante compartido de `lib/jsonld`; en inglés
      // salen solas con "Home" y las URL /en.
      buildBreadcrumbNode([{ name: t.breadcrumb, path: PATH }], locale),
      {
        "@type": "ItemList",
        name: t.schemaListName,
        numberOfItems: toursCV.length,
        itemListElement: toursCV.map((x, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: x.nombre,
          url: localeUrl(`/tours/${x.slug}`, locale),
        })),
      },
      {
        "@type": "FAQPage",
        ...(en ? { inLanguage: "en" } : {}),
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {t.heroEyebrow}
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          {t.heroH1a}<em className="shimmer-gold italic">{t.heroH1em}</em>{t.heroH1b}
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8">
          {t.heroIntro}
        </p>
        <a
          href={waLink(t.waDisponibilidad)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          {t.ctaDisponibilidad}
        </a>
      </section>

      {/* ── TOURS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-6">
            {t.toursTitulo}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {toursCV.map((x) => (
              <Link
                key={x.slug}
                href={localePath(`/tours/${x.slug}`, locale)}
                className="rounded-xl border border-white/10 p-6 hover:border-dorado/50 transition-colors group flex flex-col"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">
                  {x.tipo} · {tourDurTexto(x, " h")}
                </p>
                <h3 className="font-cormorant text-crema text-xl leading-snug mb-3 group-hover:text-dorado transition-colors flex-1">
                  {x.nombre}
                </h3>
                <p className="font-dm text-sm">
                  <span className="font-cormorant text-dorado text-2xl">{money(x.precio)}</span>
                  {/* Decía "· todo incluido" en las siete: dos no llevan desayuno y el
                      rappel no incluye entradas. Lo que sí comparten es el traslado. */}
                  <span className="text-crema/40 text-xs">{t.sufijoPrecio(x)}</span>
                </p>
              </Link>
            ))}
          </div>
          {/* Los que no recogen en Valles no desaparecen: se dice cómo se
              llega a cada uno, con la frase del catálogo (`fraseRecogida`). */}
          {otros.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="font-dm text-[10px] tracking-[2px] uppercase text-crema/50 mb-3">
                {t.otrosTitulo}
              </h3>
              <ul className="space-y-2">
                {otros.map((x) => (
                  <li key={x.slug} className="font-dm text-xs text-crema/50 leading-relaxed">
                    <Link href={localePath(`/tours/${x.slug}`, locale)} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
                      {x.nombreCorto}
                    </Link>
                    : {t.otroFrase(x)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {t.llegar.map((b) => (
            <div key={b.titulo} className="rounded-2xl border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">{b.titulo}</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">{b.texto}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-6">
          <Link
            href={localePath("/info-practica", locale)}
            className="text-verde-vivo hover:text-dorado transition-colors font-dm text-xs tracking-[1px] uppercase underline underline-offset-4"
          >
            {t.llegarGuia}
          </Link>
        </p>
      </section>

      {/* El viaje de cada mes desde la CDMX (17 oct 2026): CTA donde se habla de viajes de varios días. */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <TarjetaViajeCdmx origen={en ? "tours-en-valles-en" : "tours-en-valles"} titulo={t.tarjetaTitulo} locale={locale} />
      </div>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">{t.faqTitulo}</h2>
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
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.ctaTitulo}</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          {t.ctaTexto}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink(t.waReservar)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            {t.ctaWhatsapp}
          </a>
          <Link
            href={localePath("/precios", locale)}
            className="rounded-xl inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            {t.ctaPrecios}
          </Link>
        </div>
      </section>
    </main>
  );
}
