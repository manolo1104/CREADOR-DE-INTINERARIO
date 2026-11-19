import type { Metadata } from "next";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import Link from "next/link";
import { headers } from "next/headers";
import { tourDurTexto, esPorPersona } from "@/lib/tours";
import { PAQUETES_DB, precioVisible } from "@/lib/paquetes";
import { DESTINOS_DB } from "@/lib/destinos";
import { waLink } from "@/lib/whatsapp";
import { SITE, asLocale, buildAlternates, localePath, localeUrl } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { TOURS_XI, getToursXilitla } from "@/lib/i18n/toursXilitla.en";

/**
 * Landing comercial de Xilitla. Existía la de Ciudad Valles —donde operan los
 * competidores— y no la de Xilitla, que es donde está la empresa y el hotel.
 *
 * 🔴 ATACA SOLO EL RACIMO COMERCIAL, medido el 11 sep 2026 sobre las 1.000
 * consultas del export: 13 consultas, 425 impresiones y 15 clics, todas
 * enterradas entre el puesto 12 y el 22.
 *   paquetes a xilitla 67 · xilitla paquetes 54 · paquetes a xilitla san luis
 *   potosi 44 · xilitla san luis potosi paquetes 44 · viaje a xilitla todo
 *   incluido 32 · xilitla tours 31 · hoteles en xilitla 20 · xilitla hoteles 16
 * Solo el racimo de «paquetes» son 209 impresiones con UN clic.
 *
 * 🔴 NO compite con lo informacional, que ya está bien cubierto y rankeando
 * entre el puesto 4 y el 9: «xilitla como llegar» (493 impr), «las pozas de
 * xilitla» (171), el clima, la seguridad, la historia. Hay 39 páginas del sitio
 * rankeando por Xilitla. Esta las ENLAZA en vez de repetirlas: si respondiera
 * «cómo llegar» le quitaría el puesto 7,15 al artículo que ya lo gana.
 *
 * El molde es `/tours-en-ciudad-valles`, que está probado: 1.111 impresiones y
 * 2,25 % de CTR en el puesto 9,37, más del doble de la media del sitio.
 *
 * Desde el 10 nov 2026 tiene versión inglesa (/en/tours-en-xilitla reexporta
 * esta página). Todo el texto vive en `toursXilitla.en.ts`; el español sale
 * idéntico al de antes.
 */

const PATH = "/tours-en-xilitla";
const OG_IMG = `${SITE}/imagenes/las-pozas-jardin-surrealista/hero.jpg`;

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getToursXilitla(locale);
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
      images: [{ url: OG_IMG, width: 1600, height: 960, alt: t.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle,
      description: t.twitterDescription,
      images: [OG_IMG],
    },
  };
}

export default function ToursEnXilitlaPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const t = getToursXilitla(locale);
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;
  const destinosXi = DESTINOS_DB.filter((d) => d.zona === "Xilitla").map((d) => localizeDestino(d, locale));
  // Los paquetes salen todos de aquí: el hotel está en Xilitla.
  const paquetes = [...PAQUETES_DB].sort((a, b) => a.dias - b.dias).map((p) => localizePaquete(p, locale));
  const toursXi = TOURS_XI.map((x) => localizeTour(x, locale));

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbNode([{ name: t.breadcrumb, path: PATH }], locale),
      {
        "@type": "ItemList",
        name: t.schemaPaquetes,
        numberOfItems: paquetes.length,
        itemListElement: paquetes.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.nombre,
          url: localeUrl(`/paquetes/${p.slug}`, locale),
        })),
      },
      {
        "@type": "ItemList",
        name: t.schemaTours,
        numberOfItems: toursXi.length,
        itemListElement: toursXi.map((x, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: x.nombreCorto,
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
        <h1
          className="font-cormorant font-light text-crema mb-5 leading-tight"
          style={{ fontSize: "clamp(34px,5.5vw,62px)" }}
        >
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

      {/* ── PAQUETES ──
          El racimo de «paquetes a xilitla» son 209 impresiones con UN clic, todas
          en el puesto 12-14. Va primero porque es la consulta que trae a esta
          página, y con el precio visible, que es lo que el otro resultado no da. */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">
            {t.paquetesTitulo}
          </h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            {t.paquetesTexto}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {paquetes.map((p) => (
              <Link
                key={p.slug}
                href={localePath(`/paquetes/${p.slug}`, locale)}
                className="rounded-xl border border-white/10 p-6 hover:border-dorado/50 transition-colors group flex flex-col"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{p.duracion}</p>
                <h3 className="font-cormorant text-crema text-xl leading-snug mb-1 group-hover:text-dorado transition-colors">
                  {p.nombre}
                </h3>
                <p className="font-dm text-xs text-crema/50 leading-relaxed mb-3 flex-1">{p.subtitulo}</p>
                <p className="font-dm text-sm">
                  {/* 🔴 `precioVisible()`, nunca `p.precio`: ese campo es el total de la
                      pareja que cobra el motor, y pintarlo junto a «por persona» anunciaría
                      el doble. La etiqueta sale del mismo paquete, así que cada tarjeta dice
                      «por persona» o «por pareja» según su propio régimen. */}
                  <span className="font-cormorant text-dorado text-2xl">{money(precioVisible(p))}</span>
                  <span className="text-crema/40 text-xs">{t.paqueteSufijo(p)}</span>
                </p>
              </Link>
            ))}
          </div>
          <p className="text-crema/45 font-dm text-xs mt-4">
            {t.gruposPre}{" "}
            <Link
              href={t.gruposHref}
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              {t.gruposLink}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── RECORRIDOS QUE SALEN DE XILITLA ──
          Antes la página solo nombraba el RZR, en una línea al pie de los
          destinos. Todo sale del catálogo: nombre, precio con su unidad (el
          RZR es por vehículo y el Edén por grupo) y hora de salida. */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">
            {t.recorridosTitulo}
          </h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            {t.recorridosTexto}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toursXi.map((x) => {
              const salida = t.salidaLinea(x);
              // «Desde» cuando el precio sube con la ruta (RZR) o con el grupo (Edén).
              const desde = !esPorPersona(x) || (x.rutas?.length ?? 0) > 1;
              return (
                <Link
                  key={x.slug}
                  href={localePath(`/tours/${x.slug}`, locale)}
                  className="rounded-xl border border-white/10 p-5 hover:border-dorado/50 transition-colors group flex flex-col"
                >
                  <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">
                    {x.tipo} · {tourDurTexto(x, " h")}
                  </p>
                  <h3 className="font-cormorant text-crema text-xl leading-snug mb-1 group-hover:text-dorado transition-colors">
                    {x.nombreCorto}
                  </h3>
                  <p className="font-dm text-xs text-crema/50 leading-relaxed mb-3 flex-1">{x.tagline}</p>
                  {salida && (
                    <p className="font-dm text-[11px] text-crema/60 leading-snug mb-2">
                      {salida}
                    </p>
                  )}
                  <p className="font-dm text-sm">
                    {desde && <span className="text-crema/40 text-xs">{t.desde}</span>}
                    <span className="font-cormorant text-dorado text-2xl">{money(x.precio)}</span>
                    <span className="text-crema/40 text-xs">{t.unidad(x)}</span>
                  </p>
                </Link>
              );
            })}
          </div>
          {t.soloXiNota && (
            <p className="text-crema/45 font-dm text-xs mt-4">
              {t.soloXiNota}
            </p>
          )}
        </div>
      </section>

      {/* ── QUÉ HAY EN XILITLA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">
            {t.destinosTitulo}
          </h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            {t.destinosTexto(destinosXi.length)}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {destinosXi.map((d) => (
              <Link
                key={d.slug}
                href={localePath(`/destinos/${d.slug}`, locale)}
                className="rounded-xl border border-white/10 p-5 hover:border-dorado/50 transition-colors group"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{d.tipo}</p>
                <h3 className="font-cormorant text-crema text-lg leading-snug group-hover:text-dorado transition-colors">
                  {d.nombre}
                </h3>
                <p className="font-dm text-xs text-crema/40 mt-2">{d.duracion_hrs} h · {d.precio_entrada}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUÉ XILITLA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-5">{t.porQueTitulo}</h2>
          <p className="font-dm text-sm text-crema/65 leading-relaxed mb-4">
            {t.porQueP1}
          </p>
          <p className="font-dm text-sm text-crema/65 leading-relaxed">
            {t.porQueP2}
          </p>
          <p className="text-crema/45 font-dm text-xs mt-5">
            {t.comparaPre}{" "}
            <Link
              href={localePath("/xilitla-o-ciudad-valles", locale)}
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              {t.comparaLink}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* El viaje de cada mes desde la CDMX: duerme en Xilitla y hace los dos recorridos de aquí. */}
      <div className="px-6 pb-16">
        <TarjetaViajeCdmx origen={t.tarjetaOrigen} className="max-w-5xl mx-auto" locale={locale} />
      </div>

      {/* ── PLANEAR EL VIAJE ──
          Lo informacional NO se contesta aquí: se enlaza. En español, a los
          artículos del blog que ya ganan esas búsquedas; en inglés, a las
          páginas inglesas que sí existen (el blog no tiene versión /en). */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">{t.planearTitulo}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.planear.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-xl border border-white/10 p-5 hover:border-dorado/50 transition-colors group"
              >
                <h3 className="font-cormorant text-crema text-lg leading-snug mb-2 group-hover:text-dorado transition-colors">
                  {a.t}
                </h3>
                <p className="font-dm text-xs text-crema/50 leading-relaxed">{a.d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
            href={localePath("/paquetes", locale)}
            className="rounded-xl inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            {t.ctaPaquetes}
          </Link>
        </div>
      </section>
    </main>
  );
}
