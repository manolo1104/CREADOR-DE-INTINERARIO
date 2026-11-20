import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, CalendarDays, ChevronRight, MapPin, Moon, Route } from "lucide-react";
import { PAQUETES_DB, getPaquete, precioVisible } from "@/lib/paquetes";
import { localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, buildHotelNode, ORG_REF } from "@/lib/jsonld";
import { localizePaquete, getPaqueteDetalleUI, formatoMXN } from "@/lib/i18n/paquetes.en";
import { construirFicha } from "@/lib/fichaPaquete";
import { textosFicha, resumenPaquete } from "@/lib/i18n/fichaPaqueteTextos";
import { textosTienda } from "@/lib/i18n/paquetesTiendaTextos";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import { MAX_POR_HABITACION } from "@/lib/paquetePricing";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { waLink } from "@/lib/whatsapp";
import { PageViewTracker } from "@/components/PageViewTracker";
import { PackageGallery } from "@/components/paquete/PackageGallery";
import { PackageRouteMap } from "@/components/paquete/PackageRouteMap";
import { PackageItinerary } from "@/components/paquete/PackageItinerary";
import { BookingWidget } from "@/components/paquete/BookingWidget";
import { StickyBookingBar } from "@/components/paquete/StickyBookingBar";
import { RoomOptions } from "@/components/paquete/RoomOptions";
import {
  Encabezado, PackageSummary, PackageHighlights, InclusionsExclusions, PricingSection,
  ImportantInformation, ReviewsSection, FAQSection, RelatedPackages,
} from "@/components/paquete/PackageSections";

/**
 * La ficha de un paquete multidía — plantilla universal (20 nov 2026).
 *
 * Todo sale de `construirFicha()` (`lib/fichaPaquete.ts`), que DERIVA cada dato
 * del catálogo existente; esta página solo ordena los módulos:
 *  1 hero y galería · 2 resumen · 3 lo mejor · 4 mapa · 5 itinerario ·
 *  6 hospedaje · 7 incluye · 8 precio · (9 fechas = cotizador) · 10 antes de
 *  viajar · 11 opiniones · 12 preguntas · 13 relacionados · 14 cierre.
 *
 * El cotizador vive en la columna derecha (sticky) en escritorio y, en el
 * celular, entre «precio» y «antes de viajar», con su barra fija abajo.
 * Las reseñas inventadas que llevaba la ficha (`RESENAS_POR_PAQUETE`) ya no se
 * enseñan: solo las reales de Google.
 */

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return PAQUETES_DB.map((p) => ({ slug: p.slug }));
}

export function metadataPagina({ params }: Props, locale: Locale): Metadata {
  const t = getPaqueteDetalleUI(locale);
  const base = getPaquete(params.slug);
  if (!base) return { title: t.noEncontrado };
  const p = localizePaquete(base, locale);
  return {
    title: t.metaTitle(p.nombre, p.duracion),
    description: t.metaDescription(
      p.nombre, p.subtitulo, p.duracion,
      `${formatoMXN(precioVisible(p), locale)} MXN ${p.precioLabel}`,
    ),
    keywords: t.keywords(p.nombre, p.dias),
    alternates: buildAlternates(`/paquetes/${p.slug}`, locale),
    openGraph: {
      title: t.ogTitle(p.nombre),
      description: t.ogDescription(p.duracion, p.subtitulo),
      url: localeUrl(`/paquetes/${p.slug}`, locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}${p.imagen}`, alt: t.ogAlt(p.nombre) }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.ogTitle(p.nombre),
      description: t.ogDescription(p.duracion, p.subtitulo),
      images: [`${SITE}${p.imagen}`],
    },
  };
}

export function Pagina({ params, locale }: Props & { locale: Locale }) {
  const base = getPaquete(params.slug);
  if (!base) notFound();
  // Los paquetes de evento (Xantolo) tienen su propia página, solo en español.
  if (base.evento) redirect(base.evento.pagina);
  const f = construirFicha(params.slug, locale);
  if (!f) notFound();

  const en = locale === "en";
  const t = textosFicha(locale);
  const ui = getPaqueteDetalleUI(locale);
  const lp = (x: string) => localePath(x, locale);
  const m = (n: number) => formatoMXN(n, locale);
  const url = localeUrl(`/paquetes/${f.slug}`, locale);
  const categoria = textosTienda(locale).categorias[f.categorias[0]]?.nombre;
  const resumen = resumenPaquete(f.slug, locale);
  const waGeneral = waLink(t.ctaWaMsg(f.nombre));

  // Las preguntas de este viaje primero; de las de siempre se quita la que ya
  // contesta «¿Cómo puedo reservar?».
  const repetidas = new Set(["¿Cómo confirman la disponibilidad?", "How do you confirm availability?"]);
  const faqs = [
    ...t.faqExtra(m(MSI_DESDE), f.noIncluye.join("; ")),
    ...f.faqsBase.filter((x) => !repetidas.has(x.q)),
  ];

  // ── Datos estructurados: TouristTrip + Offer real + FAQ + migas. Sin ratings.
  const diasDeTour = f.diasFicha.filter((d) => d.tour);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: f.nombre,
        description: resumen ?? ui.schemaDescripcion(f.subtitulo, f.duracion),
        url,
        image: f.galeria.slice(0, 5).map((x) => `${SITE}${x.src}`),
        inLanguage: en ? "en" : "es-MX",
        touristType: f.paquete.perfiles,
        provider: ORG_REF,
        itinerary: {
          "@type": "ItemList",
          numberOfItems: diasDeTour.length,
          itemListElement: diasDeTour.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristTrip",
              name: d.tour!.nombre,
              description: d.descripcion,
              url: `${SITE}${d.tour!.href}`,
              provider: ORG_REF,
            },
          })),
        },
        offers: {
          "@type": "Offer",
          // El importe que se ENSEÑA (`precioVisible`), con su unidad: el total
          // de la pareja nunca se publica como precio por persona.
          price: f.precio,
          priceCurrency: "MXN",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: f.precio,
            priceCurrency: "MXN",
            unitText: f.paquete.precioPorPersona
              ? (en ? "per person" : "por persona")
              : (en ? "per couple (2 people)" : "por pareja (2 personas)"),
          },
          eligibleQuantity: { "@type": "QuantitativeValue", minValue: 2, unitText: en ? "people" : "personas" },
          availability: "https://schema.org/InStock",
          url,
          description: ui.offerDescripcion(f.precioLabel, f.duracion),
          seller: ORG_REF,
        },
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: faqs.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.migasInicio, item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: t.migasPaquetes, item: localeUrl("/paquetes", locale) },
          { "@type": "ListItem", position: 3, name: f.nombre, item: url },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen overflow-x-clip bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd(locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...buildHotelNode() }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageViewTracker event="VIEW_PACKAGE_DETAIL" data={{ slug: f.slug, locale }} />

      {/* ── 1 · HERO Y GALERÍA ── */}
      <section data-seccion="hero" className="hero-bajo-menu mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <nav aria-label={en ? "Breadcrumb" : "Migas de pan"} className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 font-dm text-[12px] text-crema/55">
            <li><Link href={lp("/")} className="hover:text-crema">{t.migasInicio}</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li><Link href={lp("/paquetes")} className="hover:text-crema">{t.migasPaquetes}</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
            <li aria-current="page" className="text-crema/80">{f.nombre}</li>
          </ol>
        </nav>

        <PackageGallery
          fotos={f.galeria}
          nombre={f.nombre}
          slug={f.slug}
          locale={locale}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="font-dm text-[12px] uppercase tracking-[3px] text-agua">
              {categoria}{f.paquete.badge ? <span className="text-dorado"> · {f.paquete.badge}</span> : null}
            </p>
            <h1 className="reveal-up mt-3 font-cormorant font-light leading-[0.98] text-crema" style={{ fontSize: "clamp(44px,7vw,84px)" }}>
              {f.nombre}
            </h1>
            <p className="reveal-up mt-4 max-w-2xl font-dm text-[17px] leading-relaxed text-crema/75" style={{ animationDelay: "80ms" }}>{f.subtitulo}</p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-dm text-[13px] text-crema/70">
              <li className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-agua" aria-hidden="true" />{t.base}</li>
              <li className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-agua" aria-hidden="true" />{t.diasValor(f.dias)}</li>
              <li className="inline-flex items-center gap-1.5"><Moon className="h-4 w-4 text-agua" aria-hidden="true" />{t.nochesValor(f.noches)}</li>
              {f.destinos > 0 && <li className="inline-flex items-center gap-1.5"><Route className="h-4 w-4 text-agua" aria-hidden="true" />{t.destinosValor(f.destinos)}</li>}
            </ul>
          </div>
          {/* En escritorio el precio y la reserva ya están en el cotizador de la derecha. */}
          <div className="rounded-2xl border border-white/12 bg-verde-profundo/30 p-5 lg:hidden">
            <p className="font-dm text-[11px] uppercase tracking-[2px] text-crema/50">{t.desde}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="whitespace-nowrap font-cormorant text-[44px] leading-none text-dorado">{m(f.precio)}</span>
              <span className="whitespace-nowrap font-dm text-[13px] text-crema/60">MXN {f.precioLabel}</span>
            </p>
            <div className="mt-4 grid gap-2">
              <a href="#cotizador" className="tactil inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-dorado px-4 font-dm text-[12px] font-medium uppercase tracking-[1.5px] text-negro hover:bg-crema">
                {t.consultarDisponibilidad} <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href={waGeneral} target="_blank" rel="noopener noreferrer" className="tactil inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/20 px-4 font-dm text-[12px] uppercase tracking-[1.5px] text-crema hover:bg-white/5">
                {t.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CUERPO: contenido + cotizador fijo ── */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-x-12 gap-y-16 px-4 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Parte A: resumen → precio */}
        <div className="min-w-0 space-y-16 md:space-y-24 lg:col-start-1 lg:row-start-1">
          <PackageSummary f={f} resumen={resumen} t={t} />
          <PackageHighlights f={f} t={t} />

          {f.paradas.length > 2 && (
            <section aria-labelledby="h-mapa">
              <Encabezado eyebrow={t.mapaEyebrow} titulo={t.mapaTitulo} em={t.mapaTituloEm} id="h-mapa" />
              <div className="mt-8">
                <PackageRouteMap paradas={f.paradas} slug={f.slug} locale={locale} />
              </div>
            </section>
          )}

          <section aria-labelledby="h-iti">
            <Encabezado eyebrow={t.itiEyebrow} titulo={t.itiTitulo} em={t.itiTituloEm} id="h-iti" />
            <div className="mt-8">
              <PackageItinerary dias={f.diasFicha} slug={f.slug} locale={locale} />
            </div>
          </section>

          <section aria-labelledby="h-hotel">
            <Encabezado eyebrow={t.hotelEyebrow} titulo={t.hotelTitulo} em={t.hotelTituloEm} id="h-hotel" />
            <p className="mt-4 max-w-2xl font-dm text-[15px] leading-relaxed text-crema/70">
              {t.hotelIntro(f.noches, HOTEL_PROPIO.metrosALasPozas, HOTEL_PROPIO.minutosCaminando)}
            </p>
            <div className="mt-6">
              <RoomOptions
                habitaciones={f.habitaciones}
                slug={f.slug}
                suplemento={f.suplementoMontana ? m(f.suplementoMontana) : null}
                locale={locale}
              />
            </div>
            <ul className="mt-4 space-y-1.5">
              {t.hotelReglas(MAX_POR_HABITACION).map((x) => (
                <li key={x} className="flex gap-2 font-dm text-[13px] text-crema/60"><span className="text-agua">·</span>{x}</li>
              ))}
            </ul>
          </section>

          <InclusionsExclusions f={f} t={t} />
          <PricingSection f={f} t={t} locale={locale} />
        </div>

        {/* Cotizador: columna fija en escritorio; en el celular, aquí. */}
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label={t.cotTitulo}>
          <div className="scrollbar-none lg:sticky lg:top-[calc(var(--navbar-offset,65px)+16px)] lg:max-h-[calc(100vh-var(--navbar-offset,65px)-32px)] lg:overflow-y-auto">
            <BookingWidget
              slug={f.slug}
              nombre={f.nombre}
              duracion={f.duracion}
              habitaciones={f.habitaciones}
              precioDesde={m(f.precio)}
              unidad={f.precioLabel}
              carritoHref={lp("/reservar/carrito")}
              locale={locale}
            />
          </div>
        </aside>

        {/* Parte B: antes de viajar → preguntas */}
        <div className="min-w-0 space-y-16 md:space-y-24 lg:col-start-1 lg:row-start-2">
          <ImportantInformation f={f} t={t} />
          <ReviewsSection f={f} t={t} en={en} />
          <FAQSection faqs={faqs} t={t} />
        </div>
      </div>

      {/* ── 13 · RELACIONADOS ── */}
      <div className="mt-8 border-t border-white/10">
        <RelatedPackages f={f} t={t} locale={locale} />
      </div>

      {/* ── 14 · CIERRE ── */}
      <section data-seccion="cierre" aria-labelledby="h-cierre" className="relative overflow-hidden">
        <Image src={f.galeria[1]?.src ?? f.paquete.imagen} alt={f.galeria[1]?.alt ?? f.nombre} fill sizes="100vw" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-negro via-negro/50 to-negro/25" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 md:py-32">
          <h2 id="h-cierre" className="texto-sobre-foto font-cormorant font-light leading-[1.02] text-crema" style={{ fontSize: "clamp(36px,5vw,60px)" }}>
            {t.ctaTitulo} <em className="text-dorado">{t.ctaTituloEm}</em>
          </h2>
          <p className="texto-sobre-foto mx-auto mt-4 max-w-xl font-dm text-[16px] leading-relaxed text-crema/85">{t.ctaSub}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#cotizador" className="tactil inline-flex min-h-[52px] items-center justify-center rounded-xl bg-dorado px-7 font-dm text-[12px] font-medium uppercase tracking-[2px] text-negro hover:bg-crema">{t.ctaReservar}</a>
            <a href={waGeneral} target="_blank" rel="noopener noreferrer" className="tactil inline-flex min-h-[52px] items-center justify-center rounded-xl border border-crema/40 px-7 font-dm text-[12px] uppercase tracking-[2px] text-crema hover:bg-crema/10">{t.ctaWa}</a>
          </div>
        </div>
      </section>

      <StickyBookingBar
        precio={m(f.precio)}
        unidad={f.precioLabel}
        slug={f.slug}
        waHref={waGeneral}
        t={{ desde: t.barraDesde, reservar: t.barraReservar, whatsapp: t.whatsapp }}
      />
    </main>
  );
}
