import type { Locale } from "@/lib/i18n/config";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, Car, Compass, Route, MessagesSquare, Mountain, BedDouble, Languages, Users, Star, Plane, Bus } from "lucide-react";
import { BloqueXantolo } from "@/components/BloqueXantolo";
import { AvatarResena } from "@/components/AvatarResena";
import { ResenaOriginal } from "@/components/ResenaOriginal";
import { PageViewTracker } from "@/components/PageViewTracker";
import { ListaToursTracker } from "@/components/ListaToursTracker";
import { TiendaPaquetes } from "@/components/paquetes/TiendaPaquetes";
import { PorDuracion } from "@/components/paquetes/PorDuracion";
import { EnlaceMedido } from "@/components/paquetes/EnlaceMedido";
import { TRASLADOS_TEXTO, precioVisible } from "@/lib/paquetes";
import { GOOGLE_PERFIL_URL, GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { GRUPO_MAX, PRIVADO_EXTRA_POR_PERSONA } from "@/lib/tours";
import { TRASLADO_MIN } from "@/lib/traslados";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationNode, buildHotelNode } from "@/lib/jsonld";
import { getLocalizedPaquetes, getLocalizedFaqs, getPaquetesUI, formatoMXN } from "@/lib/i18n/paquetes.en";
import { resenasRealesPara } from "@/lib/i18n/resenasReales.en";
import { textosTienda } from "@/lib/i18n/paquetesTiendaTextos";
import { itemsTienda } from "@/lib/paquetesTienda";
import { urlComparar } from "@/lib/comparador";
import { waLink } from "@/lib/whatsapp";
import { salidasPublicas } from "@/lib/viajeCdmx/salidas";

/**
 * /paquetes y /en/paquetes — rediseño del 20 nov 2026 (Manolo: «una tienda de
 * experiencias premium, no un catálogo»).
 *
 *  1 hero · 2 encuentra tu experiencia · 3 destacados · 4 por duración ·
 *  5 viaje a tu manera · 6 por qué nosotros · 7 reseñas · 8 complementa ·
 *  9 preguntas · 10 cierre
 *
 * 🔴 Reglas que no se rompen aquí:
 *  - Precio SIEMPRE con `precioVisible()` (`precio` es el total de la pareja).
 *  - Reseñas: solo las reales de Google (`resenasReales.ts`). Las de
 *    `RESENAS_PAQUETES` NO están en el perfil y ya no se enseñan.
 *  - La página es ISR (`revalidate` en page.tsx): no leer la petición (ni
 *    cabeceras ni cookies).
 *    `isr.test.ts` lo vigila.
 */

export function metadataPagina(locale: Locale): Metadata {
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
      // Sin `images`: la tarjeta la pone `opengraph-image.tsx` de cada segmento.
    },
  };
}

/** El precio del viaje CDMX de la próxima salida a la venta; null si no hay o la base no responde. */
async function precioViajeCdmx(): Promise<number | null> {
  try {
    const salidas = await Promise.race([
      salidasPublicas(),
      new Promise<never>((_, no) => setTimeout(() => no(new Error("lento")), 1500)),
    ]);
    const s = salidas.find((x) => x.estado === "preventa" || x.estado === "disponible" || x.estado === "ultimos");
    return s ? s.precioVigente : null;
  } catch {
    return null;
  }
}

const H2 = "font-cormorant font-light leading-[1.05] text-crema";
const EYEBROW = "font-dm text-[12px] uppercase tracking-[3px] text-agua";
const TAM_H2 = { fontSize: "clamp(32px,4.4vw,54px)" };
const BOTON_PRIMARIO =
  "tactil inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-dorado px-7 font-dm text-[12px] font-medium uppercase tracking-[2px] text-negro hover:bg-crema";
const BOTON_SECUNDARIO =
  "tactil inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-crema/35 px-7 font-dm text-[12px] uppercase tracking-[2px] text-crema hover:border-crema hover:bg-crema/10";

export async function Pagina({ locale: localeProp }: { locale: Locale }) {
  const locale = asLocale(localeProp);
  const en = locale === "en";
  const ui = getPaquetesUI(locale);
  const t = textosTienda(locale);
  const lp = (path: string) => localePath(path, locale);
  const paquetes = getLocalizedPaquetes(locale);
  const items = itemsTienda(locale, await precioViajeCdmx());
  const resenas = resenasRealesPara(locale, 3);
  const mxn = (n: number) => formatoMXN(n, locale);

  // Las del prompt primero; de las de siempre se quita la que ya responde «¿Cómo puedo reservar?».
  const repetidas = new Set(["¿Cómo confirman la disponibilidad?", "How do you confirm availability?"]);
  const faqs = [
    ...t.faqExtra(mxn(MSI_DESDE), mxn(PRIVADO_EXTRA_POR_PERSONA)),
    ...getLocalizedFaqs(locale, TRASLADOS_TEXTO(locale)).filter((f) => !repetidas.has(f.q)),
  ];

  // «Diseñar mi viaje»: el recomendador solo existe en español; en inglés, WhatsApp.
  const itinerario = en
    ? { href: waLink(t.persWa), externo: true }
    : { href: "/recomendar", externo: false };

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationNode(locale),
      buildHotelNode(),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: ui.breadcrumbInicio, item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: ui.breadcrumbPaquetes, item: localeUrl("/paquetes", locale) },
        ],
      },
      {
        "@type": "ItemList",
        name: ui.breadcrumbPaquetes,
        itemListElement: paquetes.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: localeUrl(`/paquetes/${p.slug}`, locale),
          name: p.nombre,
        })),
      },
      ...paquetes.map((p) => ({
        "@type": "Product",
        name: p.nombre,
        description: ui.productDescripcion(p.subtitulo, p.duracion),
        image: `${SITE}${p.imagen}`,
        url: localeUrl(`/paquetes/${p.slug}`, locale),
        brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
        // 🔴 `precioVisible` y con su unidad: `p.precio` es el total de la pareja.
        offers: {
          "@type": "Offer",
          price: precioVisible(p),
          priceCurrency: "MXN",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: precioVisible(p),
            priceCurrency: "MXN",
            unitText: p.precioPorPersona
              ? (en ? "per person" : "por persona")
              : (en ? "per couple (2 people)" : "por pareja (2 personas)"),
          },
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
    ],
  };

  const iconosPorque = [Route, BadgeCheck, MessagesSquare, Mountain];
  const iconosComp: Record<string, typeof Car> = { hotel: BedDouble, traslado: Car, tours: Compass, ingles: Languages, grupos: Users };
  const fotosViajeros = [
    "/imagenes/puente-de-dios-tamasopo/gallery-15.jpg",
    "/imagenes/rio-tampaon-rafting/gallery-7.jpg",
    "/imagenes/tours/rzr-xilitla/familia-sobre-el-maverick-mirador.jpg",
    "/imagenes/tours/meco/rio-turquesa-entre-sabinos.jpg",
  ];

  return (
    <main id="main-content" className="min-h-screen overflow-x-clip bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageViewTracker event="VIEW_PACKAGES" data={{ locale }} />
      <ListaToursTracker
        listaId="catalogo_paquetes"
        listaNombre={en ? "Packages" : "Paquetes"}
        tours={paquetes.map((p) => ({ id: p.slug, nombre: p.nombre, precio: precioVisible(p), tipo: "paquete" }))}
      />

      {/* ── 1 · HERO ──
          Tamul desde el río: la foto que dice «agua turquesa» en un vistazo. En
          el celular se recorta al centro, donde cae la cascada. */}
      <section
        data-seccion="hero"
        className="hero-bajo-menu relative flex min-h-[calc(100svh_-_var(--menu-alto))] items-end overflow-hidden supports-[overflow:clip]:overflow-clip"
      >
        <Image
          src="/imagenes/cascada-de-tamul/hero-mobile.jpg"
          alt={t.heroAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[47%_50%]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-negro/40 via-negro/30 to-negro/95" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-28 sm:px-6 md:pb-20">
          <p className="texto-sobre-foto font-dm text-[12px] uppercase tracking-[3px] text-crema/85">{t.heroEyebrow}</p>
          <h1 className="reveal-up mt-4 max-w-4xl font-cormorant font-light leading-[0.98] text-crema" style={{ fontSize: "clamp(40px,7vw,88px)" }}>
            {t.heroH1} <em className="text-dorado">{t.heroH1Em}</em>
          </h1>
          <p className="reveal-up texto-sobre-foto mt-5 max-w-2xl font-dm text-[16px] leading-relaxed text-crema/85 md:text-[18px]" style={{ animationDelay: "80ms" }}>
            {t.heroSub}
          </p>
          <div className="reveal-up mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "160ms" }}>
            <a href="#catalogo" className={BOTON_PRIMARIO}>
              {t.heroCta}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
            <EnlaceMedido
              href={itinerario.href}
              externo={itinerario.externo}
              event="CLICK_CUSTOM_ITINERARY"
              data={{ origen: "hero" }}
              className={BOTON_SECUNDARIO}
            >
              {t.heroCta2}
            </EnlaceMedido>
          </div>
          <ul className="texto-sobre-foto mt-8 flex flex-wrap gap-x-6 gap-y-2 font-dm text-[13px] text-crema/80">
            <li className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-dorado text-dorado" aria-hidden="true" />
              {t.heroConfianza(String(GOOGLE_RATING), GOOGLE_RESENAS)}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-agua" aria-hidden="true" />
              {t.heroGuias}
            </li>
          </ul>
        </div>
      </section>

      {/* Paquete de temporada (Xantolo): no pinta nada fuera de sus fechas. */}
      {!en && <BloqueXantolo origen="paquetes" />}

      {/* ── 2 y 3 · ENCUENTRA TU EXPERIENCIA + DESTACADOS ── */}
      <TiendaPaquetes
        items={items}
        locale={locale}
        urlComparar={urlComparar("paquetes", paquetes.map((p) => p.slug), { locale, origen: "paquetes" })}
        hrefTours={lp("/tours")}
      />

      {/* ── 4 · POR DURACIÓN ── */}
      <section aria-labelledby="h-duracion" className="mt-20 border-y border-white/10 bg-verde-profundo/30 md:mt-28">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className={EYEBROW}>{t.durEyebrow}</p>
          <h2 id="h-duracion" className={`${H2} mt-3`} style={TAM_H2}>
            {t.durH2} <em className="text-dorado">{t.durH2Em}</em>
          </h2>
          <p className="mb-8 mt-3 max-w-xl font-dm text-[15px] leading-relaxed text-crema/65">{t.durLead}</p>
          <PorDuracion items={items} locale={locale} />
        </div>
      </section>

      {/* ── 5 · TU VIAJE, A TU MANERA ── */}
      <section data-seccion="personalizado" aria-labelledby="h-personalizado" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-negro md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto">
            <Image
              src="/imagenes/cascada-el-meco/gallery-9.jpg"
              alt={en ? "Turquoise terraces below a waterfall in the Huasteca Potosina" : "Terrazas de agua turquesa bajo una cascada de la Huasteca Potosina"}
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <p className={EYEBROW}>{t.persEyebrow}</p>
            <h2 id="h-personalizado" className={`${H2} mt-3`} style={TAM_H2}>
              {t.persH2} <em className="text-dorado">{t.persH2Em}</em>
            </h2>
            <p className="mt-4 font-dm text-[15px] leading-relaxed text-crema/70">{t.persTexto}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col">
              <EnlaceMedido
                href={itinerario.href}
                externo={itinerario.externo}
                event="CLICK_CUSTOM_ITINERARY"
                data={{ origen: "personalizado" }}
                className={BOTON_PRIMARIO}
              >
                {t.persCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </EnlaceMedido>
              {!en && (
                <a href={waLink(t.persWa)} target="_blank" rel="noopener noreferrer" className={BOTON_SECUNDARIO}>
                  {t.persCta2}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 · POR QUÉ NOSOTROS ── */}
      <section aria-labelledby="h-porque" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className={EYEBROW}>{t.porqueEyebrow}</p>
          <h2 id="h-porque" className={`${H2} mt-3`} style={TAM_H2}>
            {t.porqueH2} <em className="text-dorado">{t.porqueH2Em}</em>
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4">
            {t.porque(GRUPO_MAX).map((p, i) => {
              const Icono = iconosPorque[i];
              return (
                <li key={p.t} className="border-t border-white/15 pt-6">
                  <Icono className="h-6 w-6 text-agua" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="mt-4 font-cormorant text-[21px] leading-tight text-crema sm:text-[24px]">{p.t}</h3>
                  <p className="mt-2 font-dm text-[13px] leading-relaxed text-crema/65 sm:text-[14px]">{p.d}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── 7 · RESEÑAS REALES ──
          Solo las de Google, con su nombre y su foto de perfil (o su inicial).
          Las fotos de abajo son de nuestros recorridos y NO se le atribuyen a
          quien firma la reseña. */}
      <section data-seccion="resenas" aria-labelledby="h-resenas" className="border-t border-white/10 bg-verde-profundo/20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={EYEBROW}>{t.resEyebrow}</p>
              <h2 id="h-resenas" className={`${H2} mt-3`} style={TAM_H2}>
                {t.resH2} <em className="text-dorado">{t.resH2Em}</em>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-cormorant text-[56px] leading-none text-dorado">{GOOGLE_RATING}</p>
              <div>
                <div className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-dorado text-dorado" />
                  ))}
                </div>
                <p className="mt-1 font-dm text-[13px] text-crema/60">{t.resRating(GOOGLE_RESENAS)}</p>
              </div>
            </div>
          </div>

          <ul className="mt-10 grid gap-5 lg:grid-cols-3">
            {resenas.map((r) => (
              <li key={r.autor}>
                <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-negro/50 p-6">
                  <div className="flex gap-0.5" role="img" aria-label={en ? `${r.estrellas} out of 5 stars` : `${r.estrellas} de 5 estrellas`}>
                    {Array.from({ length: r.estrellas }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-dorado text-dorado" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 font-cormorant text-[20px] font-light italic leading-snug text-crema/90 line-clamp-6">
                    &ldquo;{r.texto}&rdquo;
                  </blockquote>
                  <ResenaOriginal r={r} className="mt-3" />
                  <figcaption className="mt-auto flex items-center gap-3 pt-6">
                    <AvatarResena autor={r.autor} foto={r.foto} className="h-10 w-10 border border-white/15" />
                    <div>
                      <p className="font-dm text-sm font-medium text-crema">{r.autor}</p>
                      <p className="mt-0.5 font-dm text-[12px] text-crema/45">Google · {r.fecha}{r.recorrido ? ` · ${r.recorrido}` : ""}</p>
                    </div>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          <a
            href={GOOGLE_PERFIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-[44px] items-center gap-2 font-dm text-[14px] text-crema/80 underline decoration-white/25 underline-offset-4 hover:text-crema"
          >
            {t.resVerMas}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>

          <p className="mt-12 font-dm text-[12px] uppercase tracking-[2px] text-crema/45">{t.resFotos}</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {fotosViajeros.map((src, i) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src={src} alt={t.resFotosAlt[i]} fill sizes="(max-width: 768px) 50vw, 280px" className="zoom-foto object-cover" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 8 · COMPLEMENTA TU EXPERIENCIA ── */}
      <section data-seccion="complementa" aria-labelledby="h-complementa" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className={EYEBROW}>{t.compEyebrow}</p>
          <h2 id="h-complementa" className={`${H2} mt-3`} style={TAM_H2}>
            {t.compH2} <em className="text-dorado">{t.compH2Em}</em>
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {t.comp(mxn(TRASLADO_MIN)).map((c) => {
              const Icono = iconosComp[c.id];
              const clase = "tactil mt-auto inline-flex min-h-[44px] items-center gap-1.5 pt-4 font-dm text-[13px] text-agua hover:text-crema";
              return (
                <li key={c.id} className="flex flex-col rounded-2xl border border-white/10 bg-verde-profundo/25 p-4 last:col-span-2 sm:p-5 lg:last:col-span-1">
                  <Icono className="h-5 w-5 text-agua" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="mt-3 font-cormorant text-[22px] leading-tight text-crema">{c.t}</h3>
                  <p className="mt-2 font-dm text-[13px] leading-relaxed text-crema/65">{c.d}</p>
                  {"wa" in c && c.wa ? (
                    <a href={waLink(c.wa)} target="_blank" rel="noopener noreferrer" className={clase}>
                      {c.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={lp(c.href!)} className={clase}>
                      {c.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* «Cómo llegar»: las respuestas del FAQ y la lista de «no incluye» mandan aquí. */}
          <div id="como-llegar" className="mt-10 scroll-mt-24 rounded-2xl border border-white/10 bg-negro/40 p-6">
            <h3 className="font-cormorant text-[24px] text-crema">{t.llegarTitulo}</h3>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {t.llegar.map((l, i) => {
                const Icono = [Car, Plane, Bus][i];
                return (
                  <li key={l} className="flex items-start gap-2.5 font-dm text-[14px] leading-relaxed text-crema/70">
                    <Icono className="mt-0.5 h-4 w-4 flex-shrink-0 text-agua" aria-hidden="true" />
                    {l}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 9 · PREGUNTAS FRECUENTES ── */}
      <section aria-labelledby="h-faq" className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24">
          <p className={EYEBROW}>{t.faqEyebrow}</p>
          <h2 id="h-faq" className={`${H2} mt-3`} style={TAM_H2}>
            {t.faqH2} <em className="text-dorado">{t.faqH2Em}</em>
          </h2>
          {/* Las 8 del prompt a la vista; las demás (que siguen en el FAQPage)
              plegadas para no hacer un bloque eterno en el celular. */}
          <div className="mt-8 space-y-3">
            {faqs.slice(0, 8).map((f) => <Pregunta key={f.q} q={f.q} a={f.a} />)}
          </div>
          {faqs.length > 8 && (
            <details className="group/mas mt-3">
              <summary className="tactil inline-flex min-h-[44px] cursor-pointer list-none items-center gap-2 font-dm text-[14px] text-agua hover:text-crema [&::-webkit-details-marker]:hidden">
                {t.faqMas(faqs.length - 8)}
                <ArrowDown className="h-4 w-4 transition-transform group-open/mas:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-3 space-y-3">
                {faqs.slice(8).map((f) => <Pregunta key={f.q} q={f.q} a={f.a} />)}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* ── 10 · CIERRE ── */}
      <section data-seccion="cierre" aria-labelledby="h-cierre" className="relative overflow-hidden">
        <Image
          src="/imagenes/cascada-el-salto/hero.jpg"
          alt={t.ctaAlt}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-negro via-negro/45 to-negro/20" />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 md:py-32">
          <h2 id="h-cierre" className={`${H2} texto-sobre-foto`} style={{ fontSize: "clamp(40px,6vw,76px)" }}>
            {t.ctaH2} <em className="text-dorado">{t.ctaH2Em}</em>
          </h2>
          <p className="texto-sobre-foto mx-auto mt-4 max-w-xl font-dm text-[16px] leading-relaxed text-crema/85">{t.ctaSub}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#catalogo" className={BOTON_PRIMARIO}>{t.ctaExplorar}</a>
            <a href={waLink(t.ctaWa)} target="_blank" rel="noopener noreferrer" className={BOTON_SECUNDARIO}>
              {t.ctaAsesor}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pregunta({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-negro/30 open:border-white/20">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-dm text-[15px] text-crema/90 hover:text-crema [&::-webkit-details-marker]:hidden">
        {q}
        <span aria-hidden="true" className="flex-shrink-0 text-xl leading-none text-agua transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <p className="border-t border-white/10 px-5 pb-5 pt-4 font-dm text-[14px] leading-relaxed text-crema/65">{a}</p>
    </details>
  );
}
