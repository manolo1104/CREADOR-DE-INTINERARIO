import { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { CalendarCheck, Star } from "lucide-react";
import { TOURS_DB, type Tour } from "@/lib/tours";
import { formatMXN } from "@/lib/tourBooking";
import { getReservasStats, vale, type ReservasStats } from "@/lib/reservasStats";
import { waLink } from "@/lib/whatsapp";
import { GOOGLE_PERFIL_URL, GOOGLE_RATING } from "@/lib/resenas";
import { getLocalizedPaquetes } from "@/lib/i18n/paquetes.en";
import { precioVisible } from "@/lib/paquetes";
import { ReservaEnTresPasos } from "@/components/reservar/ReservaEnTresPasos";
import { ReservasRecientes } from "@/components/booking/ReservasRecientes";
import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationNode, buildTourOffer, ORG_REF } from "@/lib/jsonld";
import { getBooking } from "@/lib/i18n/booking";
import { localizeTour } from "@/lib/i18n/localize";

/**
 * Las estadísticas se refrescan cada hora.
 *
 * La página ya NO puede ser estática: lee `headers()` para saber el idioma, y
 * eso la vuelve dinámica. Sin este envoltorio, cada visita al catálogo lanzaba
 * tres consultas a la base solo para pintar la etiqueta de "el más reservado".
 */
const statsCacheadas = unstable_cache(getReservasStats, ["reservas-stats"], { revalidate: 3600 });

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getBooking(locale).catalogo;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: buildAlternates("/reservar", locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/reservar", locale),
      locale: locale === "en" ? "en_US" : "es_MX",
      images: [{ url: `${SITE}/imagenes/cascada-de-tamul/hero.jpg` }],
    },
  };
}

/** Orden del catálogo: primero lo que la gente reserva de verdad. */
function ordenarPorReservas(tours: Tour[], stats: ReservasStats | null): Tour[] {
  if (!stats) return tours;
  return [...tours].sort(
    (a, b) => (stats.porTour[b.slug] ?? 0) - (stats.porTour[a.slug] ?? 0),
  );
}

export default async function ReservarPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en     = locale === "en";
  const t      = getBooking(locale).catalogo;
  const lp     = (path: string) => localePath(path, locale);

  const stats  = await statsCacheadas();
  const tours  = ordenarPorReservas(TOURS_DB, stats).map((x) => localizeTour(x, locale));
  const desde  = Math.min(...TOURS_DB.map((x) => x.precio));

  /**
   * El catálogo del motor no publicaba NINGÚN dato estructurado, siendo la
   * página de conversión y con prioridad 0.9 en el sitemap: Google veía diez
   * tours con precio y no podía leer ni uno.
   *
   * El orden del `ItemList` es el real de la página —el más reservado primero—,
   * no un orden inventado para el buscador.
   */
  const catalogoSchema = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationNode(locale),
      {
        "@type": "ItemList",
        name: t.metaTitle,
        url: `${SITE}${lp("/reservar")}`,
        inLanguage: en ? "en" : "es-MX",
        numberOfItems: tours.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: tours.map((x, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "TouristTrip",
            name: x.nombre,
            description: x.descripcion,
            url: `${SITE}${lp(`/tours/${x.slug}`)}`,
            image: x.imagen_hero?.startsWith("http") ? x.imagen_hero : `${SITE}${x.imagen_hero}`,
            duration: `PT${x.duracion_hrs}H`,
            provider: ORG_REF,
            // 🔴 La oferta la arma `buildTourOffer`: antes era un `Offer` suelto
            // con `price: x.precio` y sin unidad, así que el Edén (tarifa del
            // GRUPO, $2,990–$4,160) y el RZR (por VEHÍCULO) se leían "por
            // persona", y su url era /reservar-tour/<slug>, que redirige al
            // carrito con noindex. Ahora lleva unitText y apunta a la ficha.
            offers: { ...buildTourOffer(x, locale), seller: ORG_REF },
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: `${SITE}${lp("/")}` },
          { "@type": "ListItem", position: 2, name: en ? "Book" : "Reservar", item: `${SITE}${lp("/reservar")}` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogoSchema) }} />

      {/* ── ENCABEZADO ─────────────────────────────────────────────────── */}
      {/*
        🔴 El encabezado (9 oct 2026), en dos pasos del mismo día.

        Primero adelgazó: era un H1 de 68 px con `pt-32`/`pb-12`, 487 px —más de
        media pantalla de teléfono— antes del primer recorrido, y el de Paraíso
        cabe en 190 px. Mismo texto y mismo orden, menos aire.

        Después tomó el DISEÑO del hero de /sustentabilidad (Manolo: «copia el
        diseño y ponlo en /reservar, solo el diseño»): el resplandor verde de
        arriba, la píldora con borde e icono en vez del rótulo suelto, y el
        título partido con la segunda mitad en cursiva lima. Lo que NO se copió
        de ahí es el tamaño (`pt-36 pb-28`, H1 de 70 px): volvería a inflar
        justo lo que se acababa de recortar.
      */}
      <section className="relative bg-verde-profundo px-6 pt-28 pb-9 text-center overflow-hidden">
        {/* El resplandor verde que nace arriba al centro: es lo que levanta el
            verde plano y lo que hace que ese hero se vea distinto. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(90,158,42,0.3),transparent_70%)]"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* La píldora con borde e icono, en vez del rótulo suelto. */}
          <span className="mb-5 inline-flex items-center gap-2 border border-lima/30 px-4 py-1.5 font-dm text-[10px] uppercase tracking-[4px] text-lima">
            <CalendarCheck className="h-3 w-3" aria-hidden="true" /> {t.eyebrow}
          </span>
          <h1
            className="font-cormorant font-light text-crema mb-4 leading-tight"
            style={{ fontSize: "clamp(32px,4.2vw,48px)" }}
          >
            {t.h1}
            <em className="block italic text-lima">{t.h1Acento}</em>
          </h1>
          <p className="text-crema/65 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
            {t.introApartas}<strong className="text-crema">{t.introY}</strong>
            {t.introMedio}
            <strong className="text-crema">{t.introCancelas}</strong>.
          </p>

          {/*
            Prueba social del encabezado: la CALIFICACIÓN, no el conteo de
            reservas. El histórico de la base arrancó hace poco, así que decía
            "30 reservas" debajo del "+10,000 viajeros" del home — un número
            chico y verdadero al lado de uno grande y también verdadero, que
            restaba en vez de sumar. La calificación de Google es la misma que
            ya se usa en el home y en /tours, y es verificable: el enlace lleva
            a las reseñas reales.
          */}
          <a
            href={GOOGLE_PERFIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 group inline-flex items-center gap-2.5 border border-dorado/30 bg-dorado/10 px-4 py-2 hover:border-dorado/60 transition-colors"
          >
            <span className="flex gap-0.5" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />
              ))}
            </span>
            <span className="font-dm text-[13px] text-crema/90">
              {/* La cifra sale de `resenas.ts`: escrita aquí a mano se habría
                  quedado atrás el día que cambie el perfil. Es el ÚNICO sitio de
                  la página donde va; las tarjetas ya no la repiten. */}
              <strong className="text-crema">{GOOGLE_RATING}</strong> · {t.resenasGoogle}
            </span>
            <span className="font-dm text-[11px] text-crema/45 group-hover:text-crema/70 transition-colors hidden sm:inline">
              {t.verlas}
            </span>
          </a>
        </div>
      </section>

      {/* ── RESERVA EN 3 PASOS (28 oct 2026) ───────────────────────────── */}
      <section id="catalogo" className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
        <ReservaEnTresPasos tours={tours} />
      </section>

      {/* ── PAQUETES (compacto) ────────────────────────────────────────── */}
      <section id="paquetes" className="mx-auto max-w-3xl px-6 pb-12">
        <div className="border border-white/10 bg-negro/40 p-5 sm:p-6">
          <p className="font-dm text-[10px] uppercase tracking-[2px] text-crema/45">{en ? "Multi-day trips" : "¿Varios días?"}</p>
          <h2 className="mt-1 font-cormorant text-[24px] font-light leading-tight text-crema">
            {en ? "Packages with hotel, breakfasts and transport" : "Paquetes con hotel, desayunos y traslados"}
          </h2>
          <ul className="mt-4 divide-y divide-white/8 border-y border-white/8">
            {getLocalizedPaquetes(locale).map((paq) => (
              <li key={paq.id}>
                <Link href={lp(`/paquetes/${paq.slug}`)} className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-dorado">
                  <span className="min-w-0">
                    <span className="block truncate font-cormorant text-[19px] leading-tight text-crema">{paq.nombre.split("—")[0].trim()}</span>
                    <span className="block font-dm text-[11px] text-crema/50">{en ? `${paq.dias} days · ${paq.noches} nights` : `${paq.dias} días · ${paq.noches} noches`}</span>
                  </span>
                  <span className="flex-shrink-0 text-right">
                    <span className="block font-cormorant text-[18px] leading-none text-dorado">{formatMXN(precioVisible(paq))}</span>
                    <span className="block font-dm text-[9px] uppercase tracking-[1px] text-crema/40">{paq.precioLabel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── AYUDA ──────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <CalendarCheck className="w-7 h-7 text-verde-vivo mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
          {t.ayudaTitulo}
        </h2>
        <p className="text-crema/55 font-dm text-sm mb-7 max-w-md mx-auto leading-relaxed">
          {t.ayudaTexto}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {/* El recomendador con IA solo existe en español, como el resto de las
              funciones solo-ES que ya se ocultan en /en. Enseñarlo aquí sería
              mandar al visitante inglés a una pantalla en español desde el
              propio motor de reservas. */}
          {!en && (
            <Link
              href="/recomendar"
              className="bg-verde-selva hover:bg-verde-vivo text-crema px-8 py-3.5 text-[10px] tracking-[2.5px] uppercase font-dm transition-colors"
            >
              {t.verMiTourIdeal}
            </Link>
          )}
          <a
            href={waLink(t.waAyuda)}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 hover:border-crema/50 text-crema/75 hover:text-crema px-8 py-3.5 text-[10px] tracking-[2.5px] uppercase font-dm transition-colors"
          >
            {t.preguntarWhatsapp}
          </a>
        </div>
      </section>

      {/* Quién reservó de verdad (`/api/prueba-social`). Aquí no hay otro aviso
          en la esquina, pero pide turno igual: el componente es el mismo. */}
      <ReservasRecientes />
    </main>
  );
}
