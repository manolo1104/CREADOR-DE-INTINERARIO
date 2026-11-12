import type { Metadata } from "next";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { waLink } from "@/lib/whatsapp";
import { SITE, asLocale, buildAlternates, localePath, localeUrl } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { FOTOS_QUE_HACER, getQueHacer } from "@/lib/i18n/queHacer.en";

const PATH = "/que-hacer-en-la-huasteca-potosina";

// Todo el texto vive en `queHacer.en.ts` (con la nota de por qué el título y
// el H1 dicen «actividades»: /destinos se queda con los LUGARES). El idioma
// llega por el header `x-locale`: /en/que-hacer-en-la-huasteca-potosina
// reexporta esta página (10 nov 2026).

// Función y no `const metadata`: el número de actividades y el idioma se
// resuelven en cada petición.
export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getQueHacer(locale);
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
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: t.ogImageAlt }],
    },
  };
}

export default function QueHacerPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const t = getQueHacer(locale);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // Mismas migas, por el ayudante compartido de `lib/jsonld`; en inglés
      // salen solas con "Home" y las URL /en.
      buildBreadcrumbNode([{ name: t.breadcrumb, path: PATH }], locale),
      {
        "@type": "ItemList",
        name: t.schemaListName,
        numberOfItems: t.experiencias.length,
        itemListElement: t.experiencias.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: e.titulo,
          url: localeUrl(e.href, locale),
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
      <section className="relative px-6 pt-36 pb-20 overflow-hidden">
        <Image
          src="/imagenes/cascada-de-tamul/hero.jpg"
          alt={t.heroAlt}
          fill
          className="object-cover object-center"
          priority
        />
        {/* Degradado escrito a mano, no con from-/to- de Tailwind: una extensión
            de Chrome hecha con Tailwind 4 (estilo `wxt-shadow-root-document-styles`)
            registra --tw-gradient-from/to como <color> y anula el from/to de
            Tailwind 3 → la foto terminaba en una raya dura (11 nov 2026). */}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(to bottom, rgb(14 23 16 / 0.75), rgb(14 23 16 / 0.6) 50%, #0e1710)" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            {t.heroEyebrow}
          </p>
          <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,60px)" }}>
            {t.heroH1a}<em className="shimmer-gold italic">{t.heroH1em}</em>{t.heroH1b}
          </h1>
          <p className="text-crema/75 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
            {t.heroIntro}
          </p>
          {/* Lugares ≠ actividades (10 nov 2026): quien busca la lista de
              lugares tiene su página, y Google ve cuál es cuál. */}
          <p className="text-crema/55 font-dm text-xs leading-relaxed max-w-2xl mx-auto mt-4">
            {t.destinosPre}{" "}
            <Link
              href={localePath("/destinos", locale)}
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              {t.destinosLink}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── LISTA DE EXPERIENCIAS ── */}
      {/* pt: sin aire arriba, la foto de la 1.ª actividad quedaba pegada al
          borde del hero y se veía cortada (Manolo, 11 nov 2026). */}
      <section className="px-6 pt-14 md:pt-16 pb-20">
        <div className="max-w-3xl mx-auto space-y-10">
          {t.experiencias.map((e, i) => {
            // Una foto real por actividad (11 nov 2026): `FOTOS_QUE_HACER`.
            // Arriba en el celular; a la izquierda en pantalla grande.
            const foto = FOTOS_QUE_HACER[e.href];
            return (
              <article key={e.href} className="border-b border-white/10 pb-10 md:flex md:items-start md:gap-8">
                {foto && (
                  <Link
                    href={localePath(e.href, locale)}
                    aria-label={e.cta}
                    tabIndex={-1}
                    className="group relative block aspect-[16/9] md:aspect-[4/3] md:w-[42%] md:shrink-0 overflow-hidden mb-5 md:mb-0 bg-verde-profundo/40"
                  >
                    <Image
                      src={foto.src}
                      alt={en ? foto.alt.en : foto.alt.es}
                      fill
                      sizes="(min-width: 768px) 330px, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      style={foto.pos ? { objectPosition: foto.pos } : undefined}
                    />
                  </Link>
                )}
                <div className="min-w-0">
                  <h2 className="font-cormorant font-light text-crema text-2xl md:text-3xl mb-3 leading-snug">
                    <span className="text-dorado">{i + 1}.</span> {e.titulo}
                  </h2>
                  <p className="font-dm text-sm text-crema/70 leading-relaxed mb-4">{e.descripcion}</p>
                  <Link
                    href={localePath(e.href, locale)}
                    className="inline-flex items-center gap-1.5 text-verde-vivo hover:text-dorado transition-colors font-dm text-xs tracking-[1px] uppercase"
                  >
                    {e.cta} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── CUÁNTOS DÍAS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto border border-verde-selva/30 bg-verde-profundo/30 p-8">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-4">{t.organizarTitulo}</h2>
          <p className="font-dm text-sm text-crema/70 leading-relaxed mb-6">
            {t.organizarTexto}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href={localePath("/paquetes", locale)}
              className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-6 py-3.5 hover:bg-dorado hover:text-negro transition-all"
            >
              {t.btnPaquetes}
            </Link>
            <Link
              href={localePath("/precios", locale)}
              className="inline-flex items-center gap-2 border border-white/20 text-crema/80 font-dm font-bold text-xs tracking-[1.5px] uppercase px-6 py-3.5 hover:border-crema transition-all"
            >
              {t.btnPrecios}
            </Link>
          </div>
        </div>
      </section>

      {/* El viaje de cada mes desde la CDMX (17 oct 2026): CTA donde se habla de viajes de varios días. */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <TarjetaViajeCdmx origen={en ? "que-hacer-en" : "que-hacer"} titulo={t.tarjetaTitulo} locale={locale} />
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
        <a
          href={waLink(t.waTexto)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          {t.waBoton}
        </a>
      </section>
    </main>
  );
}
