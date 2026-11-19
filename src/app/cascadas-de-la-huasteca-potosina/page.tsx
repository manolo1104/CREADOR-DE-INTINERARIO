import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { asLocale, localePath, SITE, type Locale } from "@/lib/i18n/config";
import { fmtMoney } from "@/lib/i18n/format";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import {
  getCascadas, RUTA_CASCADAS_EN, RUTA_CASCADAS_EN_SIN_PREFIJO, RUTA_CASCADAS_ES,
} from "@/lib/i18n/cascadas.en";
import { RUTA_HOSPEDAJE_EN, RUTA_HOSPEDAJE_ES } from "@/lib/i18n/dondeHospedarse.en";
import { COMPARATIVA } from "@/lib/i18n/xilitlaOValles.en";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import { TOURS_DB, etiquetaUnidad, rankTour, recogidaDeTour, type Tour } from "@/lib/tours";
import { destinosDeTour, toursCercaDe, toursQueIncluyen } from "@/lib/tourMapping";
import { fechaInicioTexto } from "@/lib/temporada";
import { MINUTOS_VALLES_XILITLA, horasEnPalabras } from "@/lib/tiemposDeViaje";
import { duracionTexto, minutosDesdeValles, tiempoDesdeValles } from "@/lib/tiemposADestinos";
import { buildBreadcrumbNode } from "@/lib/jsonld";
import { waLink } from "@/lib/whatsapp";
import {
  CAJA, CONTENEDOR, ENLACE, ETIQUETA, H1_SIZE, H2, H2_SIZE, PARRAFO, PILDORA_DORADA, SECCION, TABLA, TABLA_CAJA, TD, TH,
} from "@/components/guias/estilos";

/**
 * /cascadas-de-la-huasteca-potosina y /en/huasteca-potosina-waterfalls
 * (10 nov 2026). Una plantilla, dos idiomas (`x-locale`), slug distinto por
 * idioma y hreflang declarado a mano, como /viaje-cdmx-xilitla.
 *
 * 🔴 La lista se ARMA de `DESTINOS_DB`: entra toda ficha cuyo slug es de
 * cascada («cascada-…», «cascadas-…», «siete-cascadas-…»). El campo `tipo` no
 * sirve para decidirlo —Tamul y Micos son «Aventura», Tamasopo y El Salto
 * «Naturaleza»— y el nombre sí lo dice. Una cascada nueva en el catálogo entra
 * sola; el Puente de Dios (un arco sobre una poza) y Hacienda Los Gómez (un
 * paraje de río) no entran porque su ficha no es de cascada.
 *
 * Orden: primero las que visita un recorrido nuestro, por el ranking de ventas
 * del recorrido (`rankTour`) y, dentro de un mismo recorrido, en el orden de
 * `tourMapping.ts` (El Meco antes que El Salto); después las demás en el orden
 * del catálogo.
 * Textos y por qué: `i18n/cascadas.en.ts`.
 */

const URL_ES = `${SITE}${RUTA_CASCADAS_ES}`;
const URL_EN = `${SITE}${RUTA_CASCADAS_EN}`;

const esCascada = (d: Destino) => /(^|-)cascadas?(-|$)/.test(d.slug);

const idioma = (): Locale => asLocale(headers().get("x-locale"));

/** Las cascadas del catálogo, con sus recorridos y en el orden de la página. */
function cascadas() {
  const tourPorSlug = (slug: string) => TOURS_DB.find((x) => x.slug === slug);
  return DESTINOS_DB.filter(esCascada)
    .map((d, i) => ({
      d,
      i,
      incluye: toursQueIncluyen(d.slug).map((r) => tourPorSlug(r.slug)).filter((x): x is Tour => !!x),
      cerca: toursCercaDe(d.slug).map((r) => tourPorSlug(r.slug)).filter((x): x is Tour => !!x),
    }))
    .sort((a, b) => {
      const ra = a.incluye[0] ? rankTour(a.incluye[0].slug) : Infinity;
      const rb = b.incluye[0] ? rankTour(b.incluye[0].slug) : Infinity;
      if (ra !== rb) return ra - rb;
      if (a.incluye[0] && b.incluye[0] && a.incluye[0].slug === b.incluye[0].slug) {
        const orden = destinosDeTour(a.incluye[0].slug).incluye;
        return orden.indexOf(a.d.slug) - orden.indexOf(b.d.slug);
      }
      return a.i - b.i;
    });
}

/** La primera foto que tenga la ficha. */
const fotoDe = (d: Destino) => d.imagen_hero || d.imagen_galeria[0] || "";

export function generateMetadata(): Metadata {
  const locale = idioma();
  const en = locale === "en";
  const t = getCascadas(locale);
  const url = en ? URL_EN : URL_ES;
  const lista = cascadas();
  const portada = lista[0]?.d;
  const description = t.metaDescription(lista.length);
  return {
    title: t.metaTitle,
    description,
    // hreflang de ida y vuelta: las dos se declaran gemelas y el español es el x-default.
    alternates: { canonical: url, languages: { "es-MX": URL_ES, en: URL_EN, "x-default": URL_ES } },
    openGraph: {
      title: t.ogTitle,
      description,
      url,
      siteName: en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina",
      locale: en ? "en_US" : "es_MX",
      type: "website",
      images: portada && fotoDe(portada)
        ? [{ url: `${SITE}${fotoDe(portada)}`, alt: localizeDestino(portada, locale).nombre }]
        : undefined,
    },
    twitter: { card: "summary_large_image", title: t.metaTitle, description },
  };
}

export default function CascadasPage() {
  const locale = idioma();
  const en = locale === "en";
  const t = getCascadas(locale);
  const lp = (p: string) => localePath(p, locale);
  const url = en ? URL_EN : URL_ES;
  const rutaHospedaje = en ? RUTA_HOSPEDAJE_EN : RUTA_HOSPEDAJE_ES;

  const lista = cascadas();
  const conTour = lista.filter((c) => c.incluye.length);
  const sinTour = lista.filter((c) => !c.incluye.length);
  const nombre = (d: Destino) => localizeDestino(d, locale).nombre;
  const nombreTour = (tour: Tour) => localizeTour(tour, locale).nombreCorto;
  const precioTour = (tour: Tour) => t.desde(fmtMoney(tour.precio, locale), etiquetaUnidad(tour, en));
  const listaY = (xs: string[]) =>
    new Intl.ListFormat(en ? "en-US" : "es-MX", { type: "conjunction" }).format(xs);

  // Los recorridos que visitan alguna cascada, sin repetir, en el orden de la página.
  const toursCascada = Array.from(new Map(conTour.flatMap((c) => c.incluye).map((x): [string, Tour] => [x.slug, x])).values());
  const recogenEnLasDos = toursCascada.length > 0 && toursCascada.every((x) => recogidaDeTour(x).tipo === "hospedaje");
  // Los que dicen en su `incluye` que la entrada va pagada (se lee la lista española, la del catálogo).
  const toursConEntradas = listaY(toursCascada.filter((x) => x.incluye.some((i) => /^Entradas/i.test(i.trim()))).map(nombreTour));

  // ── FAQ: todo calculado ─────────────────────────────────────────────────
  const tamul = DESTINOS_DB.find((d) => d.slug === "cascada-de-tamul");
  const idxAlta = tamul?.seo?.faqPrincipales.findIndex((f) => /alta/i.test(f.pregunta)) ?? -1;
  const respuestaAlta = tamul && idxAlta >= 0 ? localizeDestino(tamul, locale).seo?.faqPrincipales[idxAlta]?.respuesta : undefined;

  const conPrecio = lista.filter((c) => (c.d.precio_entrada_mxn ?? 0) > 0);
  const precios = conPrecio.map((c) => c.d.precio_entrada_mxn as number);
  const libres = lista.filter((c) => c.d.precio_entrada_mxn === 0).map((c) => nombre(c.d));
  const conMinutos = lista
    .map((c) => ({ c, min: minutosDesdeValles(c.d) }))
    .filter((x): x is { c: (typeof lista)[number]; min: number } => x.min !== null)
    .sort((a, b) => a.min - b.min);
  const cercana = conMinutos[0];
  const lejana = conMinutos[conMinutos.length - 1];
  const vallesXilitla = en ? duracionTexto(MINUTOS_VALLES_XILITLA) : horasEnPalabras(MINUTOS_VALLES_XILITLA);
  // Tiempos desde Xilitla: solo los que respalda la tabla de /xilitla-o-ciudad-valles.
  const xilitlaDe = (slug: string) => {
    const v = COMPARATIVA.find((c) => c.slug === slug)?.desdeXilitla;
    return v && v !== "en el pueblo" ? v : null;
  };
  const desdeXilitla = lista
    .filter((c) => xilitlaDe(c.d.slug))
    .map((c) => `${nombre(c.d)}: ${xilitlaDe(c.d.slug)}`)
    .join("; ");
  const temporada = t.temporada(fechaInicioTexto(locale));

  // «Cascadas (recorridos)», agrupado: Tamul sale una vez con sus dos
  // recorridos. 🔴 La Ruta Acuática no visita las dos de Tamasopo: se ELIGE una
  // («A elegir: …» en su `destinos`). Cuando un recorrido trae esa elección, sus
  // cascadas se unen con «o».
  const listaO = (xs: string[]) =>
    new Intl.ListFormat(en ? "en-US" : "es-MX", { type: "disjunction" }).format(xs);
  const grupos = new Map<string, string[]>();
  for (const tour of toursCascada) {
    const suyas = conTour.filter((c) => c.incluye.some((x) => x.slug === tour.slug)).map((c) => nombre(c.d));
    const aElegir = suyas.length > 1 && tour.destinos.some((x) => /^A elegir/i.test(x.trim()));
    const clave = aElegir ? `${listaO(suyas)}, ${en ? "your choice" : "a elegir"}` : listaY(suyas);
    grupos.set(clave, [...(grupos.get(clave) ?? []), nombreTour(tour)]);
  }
  const porTour = Array.from(grupos).map(([cas, tours]) => `${cas} (${listaY(tours)})`);
  const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  const faqs = t.faq({
    masAlta: tamul && respuestaAlta ? { nombre: nombre(tamul), respuesta: minuscula(respuestaAlta) } : null,
    conTour: porTour.join("; "),
    entradaMin: precios.length ? fmtMoney(Math.min(...precios), locale) : null,
    entradaMax: precios.length ? fmtMoney(Math.max(...precios), locale) : null,
    entradaTamul: tamul ? localizeDestino(tamul, locale).precio_entrada : null,
    libres: libres.length
      ? en
        ? `${listaY(libres)} ${libres.length > 1 ? "are" : "is"} free to enter`
        : `${listaY(libres)} ${libres.length > 1 ? "son" : "es"} de acceso libre`
      : "",
    toursConEntradas,
    temporada,
    cercana: cercana ? { nombre: nombre(cercana.c.d), tiempo: duracionTexto(cercana.min) } : null,
    lejana: lejana && lejana !== cercana ? { nombre: nombre(lejana.c.d), tiempo: duracionTexto(lejana.min) } : null,
    vallesXilitla,
    desdeXilitla,
  });

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "@id": `${url}#cascadas`,
        name: t.h1,
        numberOfItems: lista.length,
        itemListElement: lista.map((c, i) => {
          const loc = localizeDestino(c.d, locale);
          const foto = fotoDe(c.d);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: loc.nombre,
              description: loc.descripcion,
              url: `${SITE}${lp(`/destinos/${c.d.slug}`)}`,
              ...(foto ? { image: `${SITE}${foto}` } : {}),
              geo: { "@type": "GeoCoordinates", latitude: c.d.lat, longitude: c.d.lng },
              address: { "@type": "PostalAddress", addressLocality: c.d.zona, addressRegion: "San Luis Potosí", addressCountry: "MX" },
            },
          };
        }),
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      buildBreadcrumbNode([{ name: t.breadcrumb, path: en ? RUTA_CASCADAS_EN_SIN_PREFIJO : RUTA_CASCADAS_ES }], locale),
    ],
  };

  const portada = lista[0]?.d;

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── PORTADA: la búsqueda como H1 y la respuesta en la primera pantalla ── */}
      <section className="px-4 pb-10 pt-[calc(var(--navbar-alto,64px)+20px)] sm:px-6 sm:pb-14 sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={en ? "Breadcrumb" : "Ruta"} className="mb-6 font-dm text-[13px] text-negro/50">
            <Link href={lp("/")} prefetch={false} className="transition-colors hover:text-verde-selva">{en ? "Home" : "Inicio"}</Link>
            <span className="mx-2">/</span>
            <span className="text-negro/70">{t.breadcrumb}</span>
          </nav>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>
              <p className={`mb-3 ${ETIQUETA}`}>{t.eyebrow}</p>
              <h1 className="font-cormorant font-light leading-[1.05] text-verde-profundo" style={H1_SIZE}>{t.h1}</h1>
              <div className="mt-6 rounded-2xl border border-dorado/40 bg-dorado/10 p-5 sm:p-6">
                <p className="mb-1.5 font-dm text-[15px] font-medium text-verde-profundo">{t.respuestaEtiqueta}</p>
                <p className={PARRAFO}>
                  {t.respuesta({
                    n: lista.length,
                    conTour: conTour.length,
                    tours: listaY(toursCascada.map(nombreTour)),
                    recogenEnLasDos,
                  })}
                </p>
              </div>
            </div>
            {portada && fotoDe(portada) && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
                <Image
                  src={fotoDe(portada)}
                  alt={localizeDestino(portada, locale).nombre}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── LA TABLA ── */}
      <section className={SECCION}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className={`mb-6 ${H2}`} style={H2_SIZE}>{t.tablaTitulo}</h2>
          <div className={TABLA_CAJA}>
            <table className={`${TABLA} min-w-[820px]`}>
              <thead>
                <tr className="border-b border-negro/15">
                  {t.tablaCabeceras.map((c) => <th key={c} scope="col" className={TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const loc = localizeDestino(c.d, locale);
                  return (
                    <tr key={c.d.slug} className="border-b border-negro/10 last:border-0">
                      <th scope="row" className={`${TH} font-normal`}>
                        <Link href={lp(`/destinos/${c.d.slug}`)} prefetch={false} className={ENLACE}>{loc.nombre}</Link>
                      </th>
                      <td className={TD}>{c.d.zona}</td>
                      <td className={TD}>{loc.precio_entrada}</td>
                      <td className={TD}>{loc.temporada_ideal}</td>
                      <td className={`${TD} whitespace-nowrap tabular-nums`}>{tiempoDesdeValles(c.d) ?? "—"}</td>
                      <td className={TD}>
                        {c.incluye.length ? (
                          c.incluye.map((tour, i) => (
                            <span key={tour.slug}>
                              {i > 0 && ", "}
                              <Link href={lp(`/tours/${tour.slug}`)} prefetch={false} className={ENLACE}>{nombreTour(tour)}</Link>
                            </span>
                          ))
                        ) : c.cerca[0] ? (
                          <>
                            {t.seCombinaCon}{" "}
                            <Link href={lp(`/tours/${c.cerca[0].slug}`)} prefetch={false} className={ENLACE}>{nombreTour(c.cerca[0])}</Link>
                          </>
                        ) : (
                          t.porTuCuenta
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-dm text-[13px] text-negro/50">{t.tablaNota(toursConEntradas)}</p>
        </div>
      </section>

      {/* ── CUÁNDO IR: la regla de temporada.ts ── */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-4 ${H2}`} style={H2_SIZE}>{t.temporadaTitulo}</h2>
          <p className={PARRAFO}>{temporada}</p>
        </div>
      </section>

      {/* ── LAS QUE VISITAN NUESTROS RECORRIDOS ── la salida a lo que se vende */}
      <section className={SECCION}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.conTourTitulo}</h2>
          <p className={`mb-8 ${PARRAFO}`}>{t.conTourIntro}</p>
          <div className="space-y-6">
            {conTour.map((c) => {
              const loc = localizeDestino(c.d, locale);
              const foto = fotoDe(c.d);
              const xil = xilitlaDe(c.d.slug);
              const datos: [string, string][] = [
                [t.entrada, loc.precio_entrada],
                [t.mejorEpoca, loc.temporada_ideal],
                [t.mejorHora, loc.mejor_hora],
                [t.comoLlegar, loc.como_llegar],
                ...(xil ? [[t.desdeXilitla, xil] as [string, string]] : []),
              ];
              return (
                <article key={c.d.slug} id={c.d.slug} className={`${CAJA} overflow-hidden`}>
                  <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
                    {foto && (
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-negro/5 sm:aspect-auto sm:min-h-[180px]">
                        <Image src={foto} alt={loc.nombre} fill sizes="(max-width: 640px) 100vw, 200px" className="object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-cormorant text-[28px] font-light leading-tight text-verde-profundo">{loc.nombre}</h3>
                      <p className={`mt-1 mb-3 ${ETIQUETA}`}>{c.d.zona}</p>
                      <p className={`mb-4 ${PARRAFO}`}>{loc.descripcion}</p>
                      <dl className="mb-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                        {datos.map(([k, v]) => (
                          <div key={k}>
                            <dt className="font-dm text-[12px] font-medium uppercase tracking-[1px] text-negro/45">{k}</dt>
                            <dd className="font-dm text-sm text-negro/75">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        {c.incluye.map((tour) => (
                          <Link key={tour.slug} href={lp(`/tours/${tour.slug}`)} prefetch={false} className={PILDORA_DORADA}>
                            {t.tourCta(nombreTour(tour), precioTour(tour))}
                          </Link>
                        ))}
                        <Link href={lp(`/destinos/${c.d.slug}`)} prefetch={false} className={`font-dm text-sm ${ENLACE}`}>
                          {t.fichaDe(loc.nombre)} →
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LAS DEMÁS ── */}
      {sinTour.length > 0 && (
        <section className={SECCION}>
          <div className={CONTENEDOR}>
            <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.otrasTitulo}</h2>
            <p className={`mb-6 ${PARRAFO}`}>{t.otrasIntro}</p>
            <ul className="space-y-3">
              {sinTour.map((c) => {
                const loc = localizeDestino(c.d, locale);
                return (
                  <li key={c.d.slug} className={CAJA}>
                    <Link href={lp(`/destinos/${c.d.slug}`)} prefetch={false} className="font-cormorant text-2xl font-light text-verde-profundo hover:text-verde-selva">
                      {loc.nombre}
                    </Link>
                    <p className={`mt-1 ${ETIQUETA}`}>{c.d.zona}</p>
                    <p className={`mt-2 ${PARRAFO}`}>{loc.descripcion}</p>
                    {c.cerca[0] && (
                      <p className="mt-2 font-dm text-sm text-negro/60">
                        {t.seCombinaCon}{" "}
                        <Link href={lp(`/tours/${c.cerca[0].slug}`)} prefetch={false} className={ENLACE}>{nombreTour(c.cerca[0])}</Link>
                        {" · "}{precioTour(c.cerca[0])}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

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
            <Link href={lp("/reservar")} prefetch={false} className={`${PILDORA_DORADA} min-h-[52px] px-8`}>{t.ctaTours}</Link>
            <a
              href={waLink(t.waMensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-crema/40 px-8 font-dm text-[15px] font-medium text-crema transition-colors hover:bg-crema/10"
            >
              {t.ctaWhatsApp}
            </a>
          </div>
          <p className="mt-8 font-dm text-[13px] text-crema/60">{t.sigueLeyendo}</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href={rutaHospedaje} prefetch={false} className="font-dm text-sm text-crema underline decoration-crema/30 underline-offset-4 hover:text-dorado">
                {t.enlaceHospedaje}
              </Link>
            </li>
            <li>
              <Link href={lp("/que-hacer-en-la-huasteca-potosina")} prefetch={false} className="font-dm text-sm text-crema underline decoration-crema/30 underline-offset-4 hover:text-dorado">
                {t.enlaceQueHacer}
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
