import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2 } from "lucide-react";

import { asLocale, localePath, SITE, type Locale } from "@/lib/i18n/config";
import { fmtMoney } from "@/lib/i18n/format";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { getInfoPractica } from "@/lib/i18n/infoPractica.en";
import {
  getDondeHospedarse, listaHospedaje, RUTA_HOSPEDAJE_EN, RUTA_HOSPEDAJE_EN_SIN_PREFIJO, RUTA_HOSPEDAJE_ES,
  type ZonaId,
} from "@/lib/i18n/dondeHospedarse.en";
import { RUTA_CASCADAS_EN, RUTA_CASCADAS_ES } from "@/lib/i18n/cascadas.en";
import { COMPARATIVA } from "@/lib/i18n/xilitlaOValles.en";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import { TOURS_DB, etiquetaUnidad, fraseRecogida, partesRecogida, recogidaDeTour, type Tour } from "@/lib/tours";
import { recogenEnValles, notaCargoValles } from "@/lib/catalogoResumen";
import { toursCercaDe, toursQueIncluyen } from "@/lib/tourMapping";
import { PAQUETES_DB, precioVisible } from "@/lib/paquetes";
import { HABITACIONES_HOTEL, serviciosHotel } from "@/lib/habitaciones";
import { HOTEL_PROPIO, horarioRestaurante } from "@/lib/hotelPropio";
import { MINUTOS_VALLES_XILITLA, horasEnPalabras } from "@/lib/tiemposDeViaje";
import { duracionTexto, minutosDesdeValles, tiempoDesdeValles } from "@/lib/tiemposADestinos";
import { buildBreadcrumbNode, buildHotelNode, HOTEL_REF } from "@/lib/jsonld";
import { waLink } from "@/lib/whatsapp";
import {
  CAJA, CONTENEDOR, ENLACE, ETIQUETA, H1_SIZE, H2, H2_SIZE, PARRAFO, PILDORA_DORADA, PILDORA_LINEA, PILDORA_WHATSAPP,
  SECCION, TABLA, TABLA_CAJA, TD, TH,
} from "@/components/guias/estilos";

/**
 * /donde-hospedarse-en-la-huasteca-potosina y /en/where-to-stay-in-huasteca-potosina
 * (10 nov 2026). Una plantilla para los dos idiomas: el idioma llega en
 * `x-locale`, como en /info-practica. Slug distinto por idioma, así que el
 * hreflang se declara a mano (patrón de /viaje-cdmx-xilitla).
 *
 * Patrón de las páginas que sí ganan en Search Console: H1 = la búsqueda,
 * respuesta directa en la primera pantalla, tabla comparativa, FAQ con su
 * FAQPage y salida clara a los recorridos (las fichas de tour convierten; el
 * blog, no). Textos y por qué de cada cifra: `i18n/dondeHospedarse.en.ts`.
 */

const URL_ES = `${SITE}${RUTA_HOSPEDAJE_ES}`;
const URL_EN = `${SITE}${RUTA_HOSPEDAJE_EN}`;
const FOTO_HOTEL = "/imagenes/hotel-paraiso-encantado/hero.jpg";
const FOTO_TERRAZA = "/imagenes/hotel-paraiso-encantado/terraza.jpg";

/**
 * Las cuatro zonas que pidió Manolo, con el nombre EXACTO de `zona` en
 * `DESTINOS_DB` (de ahí salen sus lugares), la ficha del pueblo cuando existe
 * y su landing de tours (las dos existen en español y en inglés, mismo slug).
 */
const ZONAS: { id: ZonaId; zona: string; nombre: string; pueblo?: string; landing?: string }[] = [
  { id: "xilitla", zona: "Xilitla", nombre: "Xilitla", pueblo: "xilitla-pueblo-magico", landing: "/tours-en-xilitla" },
  { id: "ciudad-valles", zona: "Ciudad Valles", nombre: "Ciudad Valles", landing: "/tours-en-ciudad-valles" },
  { id: "aquismon", zona: "Aquismón", nombre: "Aquismón", pueblo: "aquismon-pueblo-magico" },
  { id: "tamasopo", zona: "Tamasopo", nombre: "Tamasopo" },
];

const idioma = (): Locale => asLocale(headers().get("x-locale"));

export function generateMetadata(): Metadata {
  const locale = idioma();
  const en = locale === "en";
  const t = getDondeHospedarse(locale);
  const url = en ? URL_EN : URL_ES;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    // hreflang de ida y vuelta: las dos se declaran gemelas y el español es el x-default.
    alternates: { canonical: url, languages: { "es-MX": URL_ES, en: URL_EN, "x-default": URL_ES } },
    openGraph: {
      title: t.ogTitle,
      description: t.metaDescription,
      url,
      siteName: en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina",
      locale: en ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}${FOTO_HOTEL}`, width: 1600, height: 1066, alt: getInfoPractica(locale).paraisoFotoHeroAlt }],
    },
    twitter: { card: "summary_large_image", title: t.metaTitle, description: t.metaDescription },
  };
}

/** Primera frase de un texto, con su punto. */
const primeraFrase = (s: string) => `${s.split(". ")[0].replace(/\.$/, "")}.`;

/** «15 min–20 min» o un solo valor: lo que se tarda de Ciudad Valles a los lugares de una zona. */
function rangoZona(lugares: Destino[]): string | null {
  const mins = lugares.map(minutosDesdeValles).filter((n): n is number => n !== null);
  if (!mins.length) return null;
  const a = Math.min(...mins);
  const b = Math.max(...mins);
  return a === b ? duracionTexto(a) : `${duracionTexto(a)}–${duracionTexto(b)}`;
}

export default function DondeHospedarsePage() {
  const locale = idioma();
  const en = locale === "en";
  const t = getDondeHospedarse(locale);
  const ip = getInfoPractica(locale);
  const lp = (p: string) => localePath(p, locale);
  const url = en ? URL_EN : URL_ES;
  const rutaCascadas = en ? RUTA_CASCADAS_EN : RUTA_CASCADAS_ES;

  const destino = (slug: string) => DESTINOS_DB.find((d) => d.slug === slug);
  const nombreDestino = (d: Destino) => localizeDestino(d, locale).nombre;
  const nombreTour = (tour: Tour) => localizeTour(tour, locale).nombreCorto;
  const tourPorSlug = (slug: string) => TOURS_DB.find((x) => x.slug === slug);
  const precioTour = (tour: Tour) => t.desde(fmtMoney(tour.precio, locale), etiquetaUnidad(tour, en));

  // ── Tiempos (todos de datos) ────────────────────────────────────────────
  const vallesXilitla = duracionTexto(MINUTOS_VALLES_XILITLA);
  // `horasEnPalabras` solo habla español («hora y media»); en inglés va la cifra.
  const vallesXilitlaPalabras = en ? vallesXilitla : horasEnPalabras(MINUTOS_VALLES_XILITLA);
  const dMicos = destino("cascadas-de-micos");
  const dTamul = destino("cascada-de-tamul");
  const micos = dMicos ? tiempoDesdeValles(dMicos) : null;
  const tamul = dTamul ? tiempoDesdeValles(dTamul) : null;

  // ── Quién recoge dónde (de `recogida` en tours.ts) ──────────────────────
  const tipo = (tour: Tour) => recogidaDeTour(tour).tipo;
  const enLasDos = recogenEnValles(TOURS_DB);
  const soloXilitla = TOURS_DB.filter((x) => tipo(x) === "hospedaje-xilitla");
  const baseXilitla = TOURS_DB.filter((x) => tipo(x) === "base-xilitla");
  const total = TOURS_DB.length;
  const nXilitla = enLasDos.length + soloXilitla.length;
  const cargoValles = notaCargoValles(en, nombreTour);
  const conMayuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // ── Zonas ───────────────────────────────────────────────────────────────
  const zonas = ZONAS.map((z) => {
    const lugares = DESTINOS_DB.filter((d) => d.zona === z.zona);
    const pueblo = z.pueblo ? destino(z.pueblo) : undefined;
    // Aquismón se cuenta con su propia ficha (la frase del pueblo), no con una redacción nueva.
    const texto = t.zonas[z.id].texto || (pueblo ? primeraFrase(localizeDestino(pueblo, locale).descripcion) : "");
    const recogida =
      z.id === "xilitla"
        ? t.recogidaXilitla({ n: nXilitla, total, base: baseXilitla[0] ? nombreTour(baseXilitla[0]) : null })
        : z.id === "ciudad-valles"
          ? t.recogidaValles({ n: enLasDos.length, total, cargo: cargoValles })
          : t.recogidaFuera;
    const nCorta = z.id === "xilitla" ? nXilitla : enLasDos.length;
    return { ...z, lugares, texto, recogida, nCorta, rango: rangoZona(lugares) };
  });

  // ── Lugares principales: la tabla de /xilitla-o-ciudad-valles ────────────
  const principales = COMPARATIVA.flatMap((c) => {
    const d = destino(c.slug);
    if (!d) return [];
    const incluye = toursQueIncluyen(c.slug).map((r) => tourPorSlug(r.slug)).filter((x): x is Tour => !!x);
    const cerca = toursCercaDe(c.slug).map((r) => tourPorSlug(r.slug)).filter((x): x is Tour => !!x);
    const xilitla = c.desdeXilitla === "en el pueblo" ? t.enElPueblo : c.desdeXilitla;
    return [{ d, valles: tiempoDesdeValles(d) ?? c.desdeValles, xilitla, tour: incluye[0], cerca: incluye[0] ? undefined : cerca[0] }];
  });

  // ── Hotel ───────────────────────────────────────────────────────────────
  const categorias = Array.from(
    HABITACIONES_HOTEL.reduce((m, h) => m.set(h.categoria, Math.max(m.get(h.categoria) ?? 0, h.maxHuespedes)), new Map<string, number>()),
  );

  // ── Paquetes que incluyen nuestro hotel ──────────────────────────────────
  const conHotel = (incluye: string[]) => incluye.find((i) => /Paraíso Encantado/i.test(i));
  const paquetes = PAQUETES_DB.filter((p) => conHotel(p.incluye)).map((p) => ({ p, loc: localizePaquete(p, locale) }));
  const masBarato = paquetes.reduce<(typeof paquetes)[number] | undefined>(
    (min, x) => (!min || precioVisible(x.p) < precioVisible(min.p) ? x : min),
    undefined,
  );

  const faqs = t.faq({
    vallesXilitlaPalabras,
    micos,
    tamul,
    enLasDos: enLasDos.length,
    total,
    soloXilitla: listaHospedaje(soloXilitla.map(nombreTour), en),
    baseXilitla: baseXilitla[0] ? nombreTour(baseXilitla[0]) : null,
    cargoValles,
    nPaquetes: paquetes.length,
    diasMin: paquetes.length ? Math.min(...paquetes.map((x) => x.p.dias)) : 0,
    diasMax: paquetes.length ? Math.max(...paquetes.map((x) => x.p.dias)) : 0,
    desdePaquete: masBarato ? `${fmtMoney(precioVisible(masBarato.p), locale)} ${masBarato.loc.precioLabel}` : "",
    metros: HOTEL_PROPIO.metrosALasPozas,
    minutosAPie: HOTEL_PROPIO.minutosCaminando,
  }).filter((f) => paquetes.length || !/paquetes|packages/i.test(f.q));

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#pagina`,
        url,
        name: t.h1,
        description: t.metaDescription,
        inLanguage: en ? "en" : "es-MX",
        about: { "@type": "Place", name: "Huasteca Potosina" },
        mentions: HOTEL_REF,
      },
      buildHotelNode(),
      {
        "@type": "ItemList",
        name: t.tablaZonasTitulo,
        itemListElement: zonas.map((z, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Place",
            name: `${z.nombre}, San Luis Potosí`,
            description: t.zonas[z.id].idealPara,
            url: `${url}#${z.id}`,
            address: { "@type": "PostalAddress", addressLocality: z.zona, addressRegion: "San Luis Potosí", addressCountry: "MX" },
            containsPlace: z.lugares.map((d) => ({
              "@type": "TouristAttraction",
              name: nombreDestino(d),
              url: `${SITE}${lp(`/destinos/${d.slug}`)}`,
            })),
          },
        })),
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      buildBreadcrumbNode([{ name: t.breadcrumb, path: en ? RUTA_HOSPEDAJE_EN_SIN_PREFIJO : RUTA_HOSPEDAJE_ES }], locale),
    ],
  };

  const grupos: { titulo: string; tours: Tour[]; nota: string | null }[] = [
    { titulo: t.grupoDos, tours: enLasDos, nota: cargoValles ? `${conMayuscula(cargoValles)}.` : null },
    { titulo: t.grupoSoloXilitla, tours: soloXilitla, nota: soloXilitla[0] ? partesRecogida(soloXilitla[0], en).valles : null },
    { titulo: t.grupoBase, tours: baseXilitla, nota: baseXilitla[0] ? fraseRecogida(baseXilitla[0], en) : null },
  ].filter((g) => g.tours.length);

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── PORTADA: la búsqueda como H1 y la respuesta en la primera pantalla ── */}
      <section className="px-4 pb-10 pt-[calc(var(--navbar-alto,64px)+20px)] sm:px-6 sm:pb-14 sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        <div className="mx-auto max-w-4xl">
          <nav aria-label={en ? "Breadcrumb" : "Ruta"} className="mb-6 font-dm text-[13px] text-negro/50">
            <Link href={lp("/")} prefetch={false} className="transition-colors hover:text-verde-selva">{en ? "Home" : "Inicio"}</Link>
            <span className="mx-2">/</span>
            <span className="text-negro/70">{t.breadcrumb}</span>
          </nav>
          <p className={`mb-3 ${ETIQUETA}`}>{t.eyebrow}</p>
          <h1 className="font-cormorant font-light leading-[1.05] text-verde-profundo" style={H1_SIZE}>
            {t.h1}
          </h1>
          <div className="mt-6 rounded-2xl border border-dorado/40 bg-dorado/10 p-5 sm:p-6">
            <p className="mb-1.5 font-dm text-[15px] font-medium text-verde-profundo">{t.respuestaEtiqueta}</p>
            <p className={PARRAFO}>
              {t.respuesta({ vallesXilitla: vallesXilitlaPalabras, micos, tamul, enLasDos: enLasDos.length, total })}
            </p>
          </div>

          {/* Tabla de zonas: la comparación que pide la búsqueda, sin bajar. */}
          <h2 className={`mt-10 mb-4 ${H2}`} style={H2_SIZE}>{t.tablaZonasTitulo}</h2>
          <div className={TABLA_CAJA}>
            <table className={`${TABLA} min-w-[640px]`}>
              <thead>
                <tr className="border-b border-negro/15">
                  {t.tablaZonasCabeceras.map((c) => <th key={c} scope="col" className={TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {zonas.map((z) => (
                  <tr key={z.id} className="border-b border-negro/10 last:border-0">
                    <th scope="row" className={`${TH} font-medium`}>
                      <a href={`#${z.id}`} className={ENLACE}>{z.nombre}</a>
                    </th>
                    <td className={TD}>{t.zonas[z.id].idealPara}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{z.rango ?? "—"}</td>
                    <td className={TD}>{t.recogidaCorta({ zona: z.id, n: z.nCorta, total })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── ZONA POR ZONA ── */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-8 ${H2}`} style={H2_SIZE}>{t.zonaPorZonaTitulo}</h2>
          <div className="space-y-5">
            {zonas.map((z) => (
              <article key={z.id} id={z.id} className={`${CAJA} scroll-mt-[calc(var(--navbar-offset,64px)+24px)]`}>
                <h3 className="font-cormorant text-[28px] font-light leading-tight text-verde-profundo">{z.nombre}</h3>
                <p className={`mt-1 mb-3 ${ETIQUETA}`}>{t.zonas[z.id].idealPara}</p>
                {z.texto && <p className={`mb-4 ${PARRAFO}`}>{z.texto}</p>}
                {z.id === "xilitla" && <p className={`mb-4 ${PARRAFO}`}>{t.vallesXilitlaFrase(vallesXilitla)}</p>}
                {z.lugares.length > 0 && (
                  <>
                    <p className="mb-2 font-dm text-[13px] font-medium text-verde-profundo">{t.lugaresDeLaZona}</p>
                    <ul className="mb-4 flex flex-wrap gap-2">
                      {z.lugares.map((d) => {
                        const tiempo = tiempoDesdeValles(d);
                        return (
                          <li key={d.slug}>
                            <Link
                              href={lp(`/destinos/${d.slug}`)}
                              prefetch={false}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-negro/15 px-3 font-dm text-[13px] text-verde-profundo transition-colors hover:border-verde-selva hover:text-verde-selva"
                            >
                              {nombreDestino(d)}
                              {tiempo && <span className="text-negro/45">· {tiempo}</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                <p className="font-dm text-[13px] font-medium text-verde-profundo">{t.pasamosPorTi}</p>
                <p className={PARRAFO}>{z.recogida}</p>
                {z.landing && (
                  <p className="mt-3">
                    <Link href={lp(z.landing)} prefetch={false} className={`font-dm text-sm ${ENLACE}`}>
                      {t.toursEnZona(z.nombre)} →
                    </Link>
                  </p>
                )}
              </article>
            ))}
          </div>
          <p className="mt-6">
            <Link href={lp("/xilitla-o-ciudad-valles")} prefetch={false} className={`font-dm text-sm ${ENLACE}`}>
              {t.enlaceComparacion} →
            </Link>
          </p>
        </div>
      </section>

      {/* ── TIEMPOS A LOS LUGARES PRINCIPALES ── */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.tiemposTitulo}</h2>
          <p className={`mb-6 ${PARRAFO}`}>{t.tiemposIntro(vallesXilitlaPalabras)}</p>
          <div className={TABLA_CAJA}>
            <table className={`${TABLA} min-w-[640px]`}>
              <thead>
                <tr className="border-b border-negro/15">
                  {t.tiemposCabeceras.map((c) => <th key={c} scope="col" className={TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {principales.map((f) => (
                  <tr key={f.d.slug} className="border-b border-negro/10 last:border-0">
                    <th scope="row" className={`${TH} font-normal`}>
                      <Link href={lp(`/destinos/${f.d.slug}`)} prefetch={false} className={ENLACE}>{nombreDestino(f.d)}</Link>
                    </th>
                    <td className={TD}>{f.d.zona}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{f.valles}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{f.xilitla}</td>
                    <td className={TD}>
                      {f.tour ? (
                        <Link href={lp(`/tours/${f.tour.slug}`)} prefetch={false} className={ENLACE}>{nombreTour(f.tour)}</Link>
                      ) : f.cerca ? (
                        <>
                          {t.seCombinaCon}{" "}
                          <Link href={lp(`/tours/${f.cerca.slug}`)} prefetch={false} className={ENLACE}>{nombreTour(f.cerca)}</Link>
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-dm text-[13px] text-negro/50">{t.tiemposNota}</p>
        </div>
      </section>

      {/* ── NUESTRO HOTEL ── solo el nuestro: no se nombra a la competencia */}
      <section id="hotel-paraiso-encantado" className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-6 ${H2}`} style={H2_SIZE}>{t.hotelTitulo}</h2>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image src={FOTO_HOTEL} alt={ip.paraisoFotoHeroAlt} fill sizes="(max-width: 640px) 100vw, 440px" className="object-cover" />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image src={FOTO_TERRAZA} alt={ip.paraisoFotoTerrazaAlt} fill sizes="(max-width: 640px) 100vw, 440px" className="object-cover" />
            </div>
          </div>
          <p className={`mb-6 ${PARRAFO}`}>
            {t.hotelTexto({
              zona: HOTEL_PROPIO.zona,
              metros: HOTEL_PROPIO.metrosALasPozas,
              minutos: HOTEL_PROPIO.minutosCaminando,
              restaurante: HOTEL_PROPIO.restaurante,
              horario: horarioRestaurante(en),
            })}
          </p>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={CAJA}>
              <h3 className="mb-3 font-dm text-[15px] font-medium text-verde-profundo">{t.serviciosTitulo}</h3>
              <ul className="space-y-1.5">
                {serviciosHotel(locale).map((s) => (
                  <li key={s} className={`flex items-start gap-2 ${PARRAFO}`}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-dorado" strokeWidth={1.5} aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className={CAJA}>
              <h3 className="mb-3 font-dm text-[15px] font-medium text-verde-profundo">{t.habitacionesTitulo}</h3>
              <ul className="space-y-1.5">
                {categorias.map(([cat, max]) => (
                  <li key={cat} className={PARRAFO}>
                    {t.categoriaHabitacion(cat)} <span className="text-negro/45">· {t.hastaPersonas(max)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className={`mb-3 ${PARRAFO}`}>{t.hotelAutobus}</p>
          <p className={`mb-3 ${PARRAFO}`}>{t.hotelNoObligatorio}</p>
          <p className={`mb-5 ${PARRAFO}`}>{t.hotelTarifas}</p>
          <div className="flex flex-wrap gap-3">
            <a href={waLink(ip.waHospedaje)} target="_blank" rel="noopener noreferrer" className={PILDORA_WHATSAPP}>
              {t.ctaDisponibilidad}
            </a>
            <a href={ip.paraisoUrl} target="_blank" rel="noopener" className={PILDORA_LINEA}>
              {t.ctaSitioHotel}
            </a>
          </div>
        </div>
      </section>

      {/* ── PAQUETES CON HOTEL ── */}
      {paquetes.length > 0 && (
        <section className={SECCION}>
          <div className={CONTENEDOR}>
            <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.paquetesTitulo}</h2>
            <p className={`mb-6 ${PARRAFO}`}>{t.paquetesIntro(paquetes.length)}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {paquetes.map(({ p, loc }) => (
                <Link
                  key={p.slug}
                  href={lp(`/paquetes/${p.slug}`)}
                  prefetch={false}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] bg-negro/5">
                    <Image src={p.imagen} alt={loc.nombre} fill sizes="(max-width: 640px) 100vw, 440px" className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-cormorant text-2xl font-light text-verde-profundo group-hover:text-verde-selva">{loc.nombre}</p>
                    <p className="mt-1 font-dm text-[13px] text-negro/55">
                      {t.diasNoches(p.dias, p.noches)} · {t.nRecorridos(p.tours.length)}
                    </p>
                    <p className={`mt-2 flex-1 ${PARRAFO}`}>{conHotel(loc.incluye) ?? conHotel(p.incluye)}</p>
                    <p className="mt-3 font-dm text-[15px] font-medium text-verde-profundo">
                      {fmtMoney(precioVisible(p), locale)} <span className="font-normal text-negro/55">{loc.precioLabel}</span>
                    </p>
                    <span className={`mt-3 font-dm text-sm ${ENLACE}`}>{t.verPaquete} →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── QUÉ RECORRIDOS PASAN POR TI ── la salida a lo que se vende */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.toursTitulo}</h2>
          <p className={`mb-6 ${PARRAFO}`}>{t.toursIntro}</p>
          <div className="space-y-4">
            {grupos.map((g) => (
              <div key={g.titulo} className={CAJA}>
                <h3 className="mb-3 font-dm text-[15px] font-medium text-verde-profundo">{g.titulo}</h3>
                <ul className="divide-y divide-negro/10">
                  {g.tours.map((tour) => (
                    <li key={tour.slug}>
                      <Link
                        href={lp(`/tours/${tour.slug}`)}
                        prefetch={false}
                        className="group flex min-h-[48px] flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                      >
                        <span className="font-dm text-[15px] text-verde-profundo transition-colors group-hover:text-verde-selva">{nombreTour(tour)}</span>
                        <span className="font-dm text-sm text-negro/60">{precioTour(tour)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.nota && <p className="mt-3 font-dm text-[13px] text-negro/55">{g.nota}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href={lp("/tours")} prefetch={false} className={PILDORA_DORADA}>{t.verTodosTours(total)}</Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── lo mismo que va al FAQPage, a la vista */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-6 ${H2}`} style={H2_SIZE}>{t.faqTitulo}</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-dm text-[15px] text-verde-profundo">
                  {f.q}
                  <span className="text-lg leading-none text-verde-selva transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className={`px-5 pb-5 ${PARRAFO}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CIERRE ── */}
      <section className="px-4 pb-20 pt-6 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-verde-profundo px-6 py-10 sm:px-10 sm:py-14">
          <h2 className="font-cormorant font-light leading-[1.08] text-crema" style={H2_SIZE}>{t.ctaTitulo}</h2>
          <p className="mt-3 max-w-[55ch] font-dm text-[15px] leading-relaxed text-crema/70">{t.ctaTexto}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={lp("/reservar")} prefetch={false} className={`${PILDORA_DORADA} min-h-[52px] px-8`}>{t.ctaReservar}</Link>
            <a
              href={waLink(t.waMensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-crema/40 px-8 font-dm text-[15px] font-medium text-crema transition-colors hover:bg-crema/10"
            >
              {t.ctaWhatsApp}
            </a>
          </div>
          <p className="mt-8 font-dm text-[13px] text-crema/60">{t.sigueLeyendo}</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href={rutaCascadas} prefetch={false} className="font-dm text-sm text-crema underline decoration-crema/30 underline-offset-4 hover:text-dorado">
                {t.enlaceCascadas}
              </Link>
            </li>
            <li>
              <Link href={lp("/info-practica")} prefetch={false} className="font-dm text-sm text-crema underline decoration-crema/30 underline-offset-4 hover:text-dorado">
                {t.enlaceInfo}
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
