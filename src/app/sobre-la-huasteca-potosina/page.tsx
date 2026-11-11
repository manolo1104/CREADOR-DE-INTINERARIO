import type { Metadata } from "next";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import { MapaRegion } from "@/components/MapaRegion";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { MapPin, Thermometer, Calendar, Globe, Mountain, Droplet } from "lucide-react";
import { SITE, asLocale, buildAlternates, localePath, localeUrl } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { getSobreHuasteca } from "@/lib/i18n/sobreHuasteca.en";

const PATH = "/sobre-la-huasteca-potosina";
const OG_IMG = `${SITE}/imagenes/cascada-de-tamul/hero-mobile.jpg`;

// Todo el texto vive en `sobreHuasteca.en.ts`, con la nota de qué cambió el
// 10 nov 2026 (H1 propio, respuesta a «dónde está», FAQ) y por qué. El idioma
// llega por el header `x-locale`: /en/sobre-la-huasteca-potosina reexporta
// esta página.

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getSobreHuasteca(locale);
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
      images: [{ url: OG_IMG, width: 1920, height: 1280, alt: t.ogImageAlt }],
    },
    twitter: { card: "summary_large_image", title: t.twitterTitle, description: t.twitterDescription, images: [OG_IMG] },
  };
}

/** Los iconos de los datos rápidos, en el mismo orden que `datos` del diccionario. */
const ICONOS_DATOS = [MapPin, Mountain, Thermometer, Calendar, Globe, Droplet];

export default function SobreLaHuastecaPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getSobreHuasteca(locale);
  const url = localeUrl(PATH, locale);

  // Página de referencia sobre la región: se declara como Article para que los
  // buscadores (y los asistentes de IA) puedan citarla como fuente, y ahora
  // también como FAQPage (la respuesta a «dónde está»).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: t.articleHeadline,
        description: t.articleDescription,
        url,
        image: OG_IMG,
        inLanguage: t.inLanguage,
        author: { "@type": "Organization", name: "Tours Huasteca Potosina", url: SITE },
        publisher: {
          "@type": "Organization",
          name: "Tours Huasteca Potosina",
          url: SITE,
          logo: { "@type": "ImageObject", url: `${SITE}/logos/huasteca-logo.svg` },
        },
        about: {
          "@type": "Place",
          name: "Huasteca Potosina",
          address: { "@type": "PostalAddress", addressRegion: "San Luis Potosí", addressCountry: "MX" },
        },
      },
      buildBreadcrumbNode([{ name: t.breadcrumb, path: PATH }], locale),
      {
        "@type": "FAQPage",
        inLanguage: t.inLanguage,
        mainEntity: t.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── HERO ──
          H1 propio (10 nov 2026): antes decía «La Huasteca Potosina», igual que
          el inicio. Ahora responde lo que se busca: dónde está. */}
      <section className="relative min-h-[65vh] flex items-end overflow-hidden">
        <Image
          src="/imagenes/cascada-de-tamul/hero-mobile.jpg"
          alt={t.heroAlt}
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/80 via-negro/30 to-transparent" />
        <div className="relative z-10 px-6 pb-16 max-w-4xl">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            {t.heroEyebrow}
          </p>
          <h1 className="font-cormorant font-light text-crema leading-tight" style={{ fontSize: "clamp(36px,5.5vw,68px)" }}>
            {t.heroH1}{" "}
            <em className="text-dorado block italic text-[0.62em] mt-2">{t.heroH1em}</em>
          </h1>
          <p className="text-crema/70 font-dm text-sm mt-4 max-w-xl leading-relaxed">
            {t.heroIntro}
          </p>
        </div>
      </section>

      {/* ── DATOS RÁPIDOS ── */}
      <section className="bg-white border-b border-negro/8 py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {t.datos.map((d, i) => {
            const Icon = ICONOS_DATOS[i] ?? MapPin;
            return (
              <div key={d.label} className="text-center p-4 border border-negro/8 bg-crema/50">
                <Icon className="w-5 h-5 text-verde-selva mx-auto mb-2" aria-hidden="true" />
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-1">{d.label}</p>
                <p className="text-sm font-dm text-negro/75 font-medium leading-tight">{d.valor}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DÓNDE QUEDA: la respuesta directa ──
          Estado, municipios (de `zona` en DESTINOS_DB) y tiempos de carretera
          (de `tiemposDeViaje.ts`). Querétaro y Guadalajara no salen porque esa
          fuente no los tiene: mejor no decir nada que inventar un número. */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-16">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm">{t.dondeEyebrow}</p>
        <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(26px,3.5vw,40px)" }}>
          {t.dondeTitulo}
        </h2>
        <p className="text-negro/75 font-dm text-base leading-relaxed mb-8">{t.dondeRespuesta}</p>

        <h3 className="font-dm text-sm font-medium text-verde-profundo mb-2">{t.municipiosTitulo}</h3>
        <p className="text-negro/60 font-dm text-sm leading-relaxed mb-8">{t.municipiosTexto}</p>

        <h3 className="font-dm text-sm font-medium text-verde-profundo mb-3">{t.tiemposTitulo}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-negro/15">
                {t.tiemposCols.map((c) => (
                  <th key={c} className="py-2.5 pr-4 font-dm text-[10px] tracking-[2px] uppercase text-negro/45 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.tiempos.map((r) => (
                <tr key={r.ciudad} className="border-b border-negro/8">
                  <td className="py-2.5 pr-4 font-dm text-sm text-negro/75">{r.ciudad}</td>
                  <td className="py-2.5 pr-4 font-dm text-sm text-negro/60 whitespace-nowrap">{r.valles}</td>
                  <td className="py-2.5 pr-4 font-dm text-sm text-negro/60 whitespace-nowrap">{r.xilitla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-negro/50 font-dm text-xs leading-relaxed">{t.tiemposBus}</p>
        <p className="mt-6 text-negro/60 font-dm text-sm leading-relaxed">
          {t.basePre}{" "}
          <Link
            href={localePath("/xilitla-o-ciudad-valles", locale)}
            className="text-verde-selva underline underline-offset-2 hover:text-terracota transition-colors"
          >
            {t.baseLink}
          </Link>
        </p>
      </section>

      {/* ── MAPA ── El mismo esquema del inicio: coordenadas reales de `destinos.ts`. */}
      <MapaRegion locale={locale} />

      {/* ── SECCIONES EDITORIALES ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        {t.secciones.map((s) => (
          <div key={s.titulo}>
            <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(26px,3.5vw,40px)" }}>
              {s.titulo}
            </h2>
            <div className="text-negro/60 font-dm text-sm leading-relaxed space-y-4">
              {s.texto.trim().split("\n\n").map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── DESTINOS ICÓNICOS ── */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.destinosEyebrow}</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.destinosH2a}<em className="text-dorado">{t.destinosH2em}</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {t.destinosIcono.map((d) => (
              <div key={d.img} className="group border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={d.img}
                    alt={d.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-cormorant text-verde-profundo text-lg mb-2">{d.nombre}</h3>
                  <p className="text-negro/55 font-dm text-sm leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href={localePath("/destinos", locale)}
              className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all"
            >
              {t.destinosBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(26px,3.5vw,42px)" }}>
          {t.llegarH2a}<em className="text-dorado">{t.llegarH2em}</em>{t.llegarH2b}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          {t.llegar.map((m) => (
            <div key={m.medio} className="border border-negro/8 bg-white p-5">
              <p className="font-cormorant text-dorado text-lg mb-2">{m.medio}</p>
              <p className="text-negro/55 font-dm text-sm leading-relaxed">{m.detalle}</p>
            </div>
          ))}
        </div>
        <Link
          href={localePath("/info-practica", locale)}
          className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all"
        >
          {t.llegarBtn}
        </Link>
      </section>

      {/* ── PREGUNTAS FRECUENTES ── (10 nov 2026) El mismo texto va al FAQPage. */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-verde-profundo mb-10" style={{ fontSize: "clamp(26px,3.5vw,40px)" }}>
            {t.faqTitulo}
          </h2>
          <div className="divide-y divide-negro/8 border-t border-negro/8">
            {t.faqs.map((f) => (
              <div key={f.q} className="py-6">
                <h3 className="font-cormorant text-verde-profundo text-xl leading-snug mb-2">{f.q}</h3>
                <p className="text-negro/60 font-dm text-sm leading-relaxed">{f.a}</p>
                {f.link && (
                  <Link
                    href={f.link.href}
                    className="inline-block mt-3 text-verde-selva font-dm text-sm underline underline-offset-2 hover:text-terracota transition-colors"
                  >
                    {f.link.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* El viaje de cada mes desde la CDMX (17 oct 2026): CTA donde se habla de viajes de varios días. */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <TarjetaViajeCdmx origen={t.tarjetaOrigen} locale={locale} />
      </div>

      {/* ── CTA TOURS ── */}
      <section className="bg-verde-profundo py-20 px-6 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-lima mb-4 font-dm">{t.ctaEyebrow}</p>
        <h2 className="font-cormorant font-light text-crema mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
          {t.ctaH2a}<em className="text-dorado">{t.ctaH2em}</em>
        </h2>
        <p className="text-crema/55 font-dm text-sm mb-8 max-w-md mx-auto leading-relaxed">
          {t.ctaTexto}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href={localePath("/reservar", locale)}
            className="inline-block bg-dorado text-white px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-terracota transition-colors"
          >
            {t.ctaReservar}
          </Link>
          <Link
            href={localePath("/tours", locale)}
            className="inline-block border border-crema/30 text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-crema/10 transition-colors"
          >
            {t.ctaTours}
          </Link>
        </div>
      </section>
    </main>
  );
}
