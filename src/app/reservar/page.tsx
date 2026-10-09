import { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, Shield, Check, MapPin, CalendarCheck, CreditCard, Lock, Star, Flame } from "lucide-react";
import { TOURS_DB, tourDurTexto, type Tour } from "@/lib/tours";
import { formatMXN } from "@/lib/tourBooking";
import { getReservasStats, vale, type ReservasStats } from "@/lib/reservasStats";
import { waLink } from "@/lib/whatsapp";
import { GOOGLE_PERFIL_URL, GOOGLE_RATING } from "@/lib/resenas";
import { getLocalizedPaquetes } from "@/lib/i18n/paquetes.en";
import { precioVisible } from "@/lib/paquetes";
import { PCTS_PAQUETE } from "@/lib/paquetePricing";
import { ToursFiltroReservar } from "@/components/reservar/ToursFiltroReservar";
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

      {/* ── BARRA DE CONFIANZA ─────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-negro/60">
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
          {[CreditCard, Shield, Users, MapPin].map((Icon, n) => (
            <div key={t.confianza[n].t} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-tight">
                <span className="block text-[12px] font-dm text-crema/90 font-medium">{t.confianza[n].t}</span>
                <span className="block text-[11px] font-dm text-crema/45">{t.confianza[n].s}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/*
        🔴 Aquí vivía «Cómo funciona», tres pasos explicados (9 oct 2026, Manolo:
        «la de Paraíso se ve mucho más limpia, quita lo que no sea
        indispensable»). Decía lo mismo que la barra de confianza que tiene
        JUSTO ENCIMA —«apartas con el 30 %», «liquidas el día del tour»— con
        otras palabras y 127 px más, y empujaba el catálogo media pantalla hacia
        abajo. Quien entra al motor viene a elegir recorrido, no a leer cómo
        funciona el motor. Los textos siguen en `i18n/booking.ts` (`t.pasos`)
        por si vuelven a hacer falta en otra parte.
      */}

      {/* ── CATÁLOGO ───────────────────────────────────────────────────── */}
      <section id="catalogo" className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-8 border-b border-white/8 pb-4">
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(24px,3.5vw,38px)" }}>
            {t.todosLosRecorridos}
          </h2>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <p className="text-[11px] font-dm text-crema/45">
              {t.conteo(TOURS_DB.length, formatMXN(desde))}
              {stats && t.ordenadosPorReservas}
            </p>
            {/*
              El ritmo real de ventas, por fin dicho en voz alta.
              `getReservasStats` ya lo contaba desde siempre para ordenar las
              tarjetas, pero el número nunca se veía.

              🔴 Va AQUÍ y no en el encabezado de la página: ahí arriba está la
              calificación de Google, y el comentario de más arriba explica por
              qué el conteo se había quitado —un número chico al lado del
              "+10,000 viajeros" resta—. Pegado al catálogo no compite con
              nada: dice que esto se mueve justo cuando se va a elegir.

              El umbral es el de la casa (`vale()`, 5 reservas): por debajo no
              impresiona, así que no se enseña.

              Va en DORADO y no en terracota: esta página es negra (#0e1710) y
              el terracota da 2.95:1 contra ella, que no pasa AA. El dorado da
              6.07:1, y es el color con el que el calendario ya avisa en
              oscuro.
            */}
            {stats && vale(stats.ultimos30) && (
              <p className="flex items-center gap-1.5 font-dm text-[11px] text-dorado" role="status">
                <Flame className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{t.reservasUltimoMes(stats.ultimos30)}</span>
              </p>
            )}
          </div>
        </div>

        {/* El mismo filtro que el inicio (8 oct 2026). El buscador del hero manda
            aquí, y quien eligió «cascadas, 20 de noviembre, 4 personas» llegaba
            a quince tarjetas sin filtrar y tenía que volver a buscar a ojo lo
            que acababa de pedir. La intención viaja en sessionStorage, no en la
            URL: así esta página sigue sirviendo el mismo HTML para todos. */}
        <ToursFiltroReservar tours={tours} masReservado={stats?.masReservado ?? undefined} />
      </section>

      {/* ── PAQUETES ───────────────────────────────────────────────────── */}
      {/*
        La página se llamaba "motor de reservas" pero solo listaba los tours de
        un día: los paquetes de varios días —el producto de mayor ticket— no
        aparecían por ningún lado. Quien llegaba aquí buscando un viaje completo
        no encontraba nada y se iba.
      */}
      {/* Los paquetes estuvieron ocultos en inglés mientras /reservar-paquete y
          /paquetes/[slug] eran solo-ES. Ambas se tradujeron y están en prod
          desde el 14 ago, así que la tarjeta vuelve a los dos idiomas: es el
          producto de mayor ticket y el visitante inglés no lo veía. */}
      <section id="paquetes" className="max-w-6xl mx-auto px-6 pb-14">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-8 border-b border-white/8 pb-4">
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(24px,3.5vw,38px)" }}>
            {en ? "Multi-day trips" : "Viajes de varios días"}
          </h2>
          <p className="text-[11px] font-dm text-crema/45">
            {en
              ? "Hotel, breakfasts and in-region transport included"
              : "Con hospedaje, desayunos y traslados incluidos"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getLocalizedPaquetes(locale).map((paq) => (
            <article
              key={paq.id}
              className="group relative flex flex-col border border-dorado/20 bg-negro/40 hover:border-dorado/50 transition-colors duration-300 overflow-hidden"
            >
              <div className="relative h-44 overflow-hidden flex-shrink-0">
                <Image
                  src={paq.imagen}
                  alt={paq.nombre}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/15 to-negro/25" />
                <span className="absolute bottom-3 left-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
                  {en
                    ? `${paq.dias} days · ${paq.noches} nights`
                    : `${paq.dias} días · ${paq.noches} noches`}
                </span>
              </div>

              <div className="flex flex-col flex-1 p-5">
                <p className="text-[9px] tracking-[2px] uppercase text-dorado font-dm mb-1.5">{en ? "Package" : "Paquete"}</p>
                <h3 className="font-cormorant text-crema text-xl leading-tight mb-2">
                  {paq.nombre.split("—")[0].trim()}
                </h3>
                <p className="text-[11px] font-dm text-crema/50 leading-snug mb-3 line-clamp-3">
                  {paq.subtitulo}
                </p>

                <div className="mt-auto pt-4 border-t border-white/8">
                  <p className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-cormorant text-dorado text-3xl font-light leading-none">
                      {formatMXN(precioVisible(paq))}
                    </span>
                    <span className="text-[10px] text-crema/40 font-dm">MXN {paq.precioLabel}</span>
                  </p>
                  {/* El anticipo se saca de PCTS_PAQUETE (el motor sólo acepta
                      30/50/100 %), no de un 0.1 escrito a mano: la tarjeta
                      ofrecía $1,450 y el checkout más barato pide $4,350.
                      Y va sobre `paq.precio` —el total de los dos— con su
                      porcentaje a la vista, para que no se lea como anticipo
                      por persona debajo del titular «por persona». */}
                  <p className="text-[11px] font-dm text-crema/55 mb-4">
                    {en ? `Reserve from (${PCTS_PAQUETE[0]}%) ` : `Apartas desde (${PCTS_PAQUETE[0]} %) `}
                    {/* En inglés todo importe lleva "MXN": un "$2,610" a secas se lee en dólares. */}
                    <strong className="text-crema/85">{formatMXN(Math.round(paq.precio * PCTS_PAQUETE[0] / 100))}{en ? " MXN" : ""}</strong>
                  </p>

                  <div className="flex gap-2">
                    <Link
                      href={lp(`/reservar-paquete/${paq.slug}`)}
                      className="flex-1 text-center bg-dorado hover:bg-lima text-negro text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors"
                    >
                      {en ? "Book" : "Reservar"}
                    </Link>
                    <Link
                      href={lp(`/paquetes/${paq.slug}`)}
                      className="px-3 flex items-center border border-white/15 hover:border-crema/40 text-crema/60 hover:text-crema text-[10px] tracking-[1.5px] uppercase font-dm transition-colors"
                    >
                      {en ? "Details" : "Detalles"}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── REVERSIÓN DE RIESGO ────────────────────────────────────────── */}
      <section className="bg-verde-profundo/30 border-y border-white/8 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-center mb-8" style={{ fontSize: "clamp(22px,3vw,34px)" }}>
            {t.sinRiesgoTitulo}
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {t.sinRiesgo.map((linea) => (
              <p key={linea} className="flex items-start gap-2.5 text-[13px] font-dm text-crema/70 leading-relaxed">
                <Check className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                {linea}
              </p>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="inline-flex items-center gap-2 text-[11px] font-dm text-crema/40">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> {t.pagoSeguro}
            </p>
          </div>
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
