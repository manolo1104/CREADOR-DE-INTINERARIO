import type { Metadata } from "next";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import Link from "next/link";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import { PAQUETES_DB } from "@/lib/paquetes";
import { waLink } from "@/lib/whatsapp";
import { SITE, asLocale, buildAlternates, localePath, localeUrl } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { localizeDestino } from "@/lib/i18n/localize";
import { COMPARATIVA, getXilitlaOValles } from "@/lib/i18n/xilitlaOValles.en";

const PATH = "/xilitla-o-ciudad-valles";

// Todo el texto (y las listas de quién recoge dónde, leídas del catálogo) vive
// en `xilitlaOValles.en.ts`. El idioma llega por el header `x-locale`:
// /en/xilitla-o-ciudad-valles reexporta esta página (10 nov 2026).

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getXilitlaOValles(locale);
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
      images: [{ url: `${SITE}/imagenes/las-pozas-jardin-surrealista/hero.jpg`, width: 1600, height: 960, alt: t.ogImageAlt }],
    },
  };
}

export default function XilitlaOCiudadVallesPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const t = getXilitlaOValles(locale);

  const fichas = COMPARATIVA.flatMap((c) => {
    const d = DESTINOS_DB.find((x) => x.slug === c.slug);
    return d ? [{ ...c, destino: localizeDestino(d, locale) }] : [];
  });

  const paqueteBase = PAQUETES_DB[0];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // Las migas, ahora por el ayudante compartido (antes, a mano): mismo
      // "Inicio" y mismas URL en español; "Home" y /en en inglés.
      buildBreadcrumbNode([{ name: t.breadcrumb, path: PATH }], locale),
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
      <section className="px-6 pt-36 pb-14 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {t.heroEyebrow}
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          {t.h1Pre}<em className="shimmer-gold italic">{t.h1A}</em>{t.h1Medio}<em className="shimmer-gold italic">{t.h1B}</em>{t.h1Post}
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
          {t.heroIntro}
        </p>
      </section>

      {/* ── TABLA ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">{t.tablaTitulo}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="py-3 pr-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70">{t.colDestino}</th>
                  <th className="py-3 px-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70 whitespace-nowrap">{t.colValles}</th>
                  <th className="py-3 pl-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70 whitespace-nowrap">{t.colXilitla}</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.slug} className="border-b border-white/8">
                    <td className="py-3 pr-4">
                      <Link href={localePath(`/destinos/${f.slug}`, locale)} className="font-dm text-sm text-crema/85 hover:text-lima transition-colors">
                        {f.destino.nombre}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-dm text-sm text-crema/60 whitespace-nowrap">{t.tiempo(f.desdeValles)}</td>
                    <td className="py-3 pl-4 font-dm text-sm text-crema/60 whitespace-nowrap">{t.tiempo(f.desdeXilitla)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-crema/40 font-dm text-xs">
            {t.tablaNota}
          </p>
        </div>
      </section>

      {/* ── LAS DOS RESPUESTAS ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-verde-profundo/30 p-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">{t.vallesSi}</p>
            <ul className="space-y-2 text-crema/70 font-dm text-sm leading-relaxed">
              {t.vallesBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-lima/25 bg-verde-profundo/40 p-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">{t.xilitlaSi}</p>
            <ul className="space-y-2 text-crema/70 font-dm text-sm leading-relaxed">
              {t.xilitlaBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── DÓNDE ENTRAMOS NOSOTROS ── */}
      <section className="px-6 pb-16">
        <div className="rounded-2xl max-w-4xl mx-auto border border-white/10 bg-negro/40 p-7">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-4">{t.nosotrosTitulo}</h2>
          {/* SEO-10 (19 oct 2026): el hotel se nombra y enlaza a su sitio, con
              www y sin nofollow; antes era «nuestro hotel» a secas. */}
          <p className="text-crema/70 font-dm text-sm leading-relaxed mb-5">
            {t.nosotrosA}{" "}
            <a
              href="https://www.paraisoencantado.com/"
              className="text-lima underline underline-offset-2 hover:text-crema transition-colors"
            >
              {t.nosotrosHotel}
            </a>
            {t.nosotrosB}{" "}
            <strong className="text-crema">{t.nosotrosFuerte}</strong>
            {t.nosotrosC}
          </p>
          {t.soloXilitla && (
            <p className="text-crema/60 font-dm text-sm leading-relaxed mb-5">
              {t.soloXilitla}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link
              href={localePath("/tours", locale)}
              className="rounded-xl inline-flex items-center gap-2 border border-lima/40 text-lima font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:bg-lima/10 transition-colors"
            >
              {t.btnTours}
            </Link>
            <Link
              href={localePath(`/paquetes/${paqueteBase.slug}`, locale)}
              className="rounded-xl inline-flex items-center gap-2 border border-white/15 text-crema/80 font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:border-lima/40 hover:text-lima transition-colors"
            >
              {t.btnPaquete}
            </Link>
            <Link
              href={localePath("/tours-en-ciudad-valles", locale)}
              className="rounded-xl inline-flex items-center gap-2 border border-white/15 text-crema/80 font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:border-lima/40 hover:text-lima transition-colors"
            >
              {t.btnValles}
            </Link>
          </div>
        </div>
      </section>

      {/* El viaje de cada mes desde la CDMX (17 oct 2026): CTA donde se habla de viajes de varios días. */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <TarjetaViajeCdmx origen={en ? "xilitla-o-valles-en" : "xilitla-o-valles"} titulo={t.tarjetaTitulo} locale={locale} />
      </div>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-5">{t.faqTitulo}</h2>
          <div className="space-y-3">
            {t.faqs.map((f) => (
              <details key={f.q} className="border border-white/10 bg-negro/30 group">
                <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-verde-vivo flex-shrink-0 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5 border-t border-white/8 pt-4">
                  <p className="text-crema/55 font-dm text-sm leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href={waLink(t.waTexto)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
            >
              {t.waBoton}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
