import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { TOURS_DB, tourDurRange } from "@/lib/tours";
import { TOUR_REVIEWS, GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { TourGallery } from "@/components/TourGallery";
import { TourDeparture } from "@/components/TourDeparture";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { TourPageTracker } from "@/components/TourPageTracker";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Star, Clock, Users, Lock, Shield, RefreshCw, Camera, Headphones } from "lucide-react";
import { InventoryBadge } from "@/components/booking/InventoryBadge";
import { SocialProofToast } from "@/components/booking/SocialProofToast";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeTour } from "@/lib/i18n/localize";
import { getDict } from "@/lib/i18n/messages";
import { fmtNumber } from "@/lib/i18n/format";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return TOURS_DB.map((t) => ({ slug: t.slug }));
}

/** Recorta a ~155 chars en frontera de palabra: Google corta el snippet ~160. OG/Twitter conservan la versión larga. */
function metaDesc(txt: string, max = 155): string {
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : max).replace(/[\s,;:.—–-]+$/, "")}…`;
}

export function generateMetadata({ params }: Props): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const base = TOURS_DB.find((t) => t.slug === params.slug);
  if (!base) return {};
  const tour = localizeTour(base, locale);
  const url = `${SITE}${localePath(`/tours/${tour.slug}`, locale)}`;
  const image = tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`;
  // Sufijo corto cuando el nombre del tour ya es largo, para no pasar de ~65 chars en el SERP.
  const title = `${tour.nombre} | ${tour.nombre.length > 40 ? "Huasteca Potosina" : "Tours Huasteca Potosina"}`;
  return {
    title,
    description: metaDesc(tour.descripcion),
    openGraph: {
      title,
      description: tour.descripcion,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: tour.nombre }],
    },
    alternates: buildAlternates(`/tours/${tour.slug}`, locale),
    twitter: {
      card: "summary_large_image",
      title,
      description: tour.descripcion,
      images: [image],
    },
  };
}

const DIFICULTAD_CONFIG = {
  alta:  { label: { es: "Avanzado", en: "Advanced" }, bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: { es: "Moderado", en: "Moderate" }, bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: { es: "Fácil",    en: "Easy"      }, bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

export default function TourDetailPage({ params }: Props) {
  const locale = asLocale(headers().get("x-locale"));
  const t = getDict(locale).tour;
  const tcommon = getDict(locale).common;
  const base = TOURS_DB.find((tr) => tr.slug === params.slug);
  if (!base) notFound();
  const tour = localizeTour(base, locale);

  const dif = DIFICULTAD_CONFIG[tour.dificultad];
  const reviews = TOUR_REVIEWS[tour.id as keyof typeof TOUR_REVIEWS] ?? [];
  const toursHref = localePath("/tours", locale);
  const money = (n: number) => `$${fmtNumber(n, locale)}`;

  // Precio por vehículo (ej. RZR): se reserva por WhatsApp, no por el flujo por persona.
  const esVehiculo = tour.precioUnidad === "vehiculo";
  const pctOff = tour.precioOriginal && tour.precioOriginal > tour.precio
    ? Math.round((1 - tour.precio / tour.precioOriginal) * 100)
    : 0;
  const [durMin, durMax] = tourDurRange(tour);
  const durLabel = durMin === durMax
    ? t.durationApprox(tour.duracion_hrs)
    : tour.rutas
      ? (locale === "en" ? `${durMin}–${durMax} hours depending on route` : `${durMin}–${durMax} horas según la ruta`)
      : (locale === "en" ? `${durMin}–${durMax} hours` : `${durMin}–${durMax} horas`);
  const priceUnitShort = esVehiculo
    ? (locale === "en" ? "MXN per vehicle" : "MXN por vehículo")
    : t.perPerson;
  const priceUnitHero = esVehiculo
    ? (locale === "en" ? "MXN / vehicle · Fuel & guide included" : "MXN / vehículo · Gasolina y guía incluidos")
    : t.perPersonIncluded;

  const tourSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.nombre,
    description: tour.descripcionLarga,
    inLanguage: locale === "en" ? "en" : "es-MX",
    image: tour.imagen_hero?.startsWith("http") ? tour.imagen_hero : `${SITE}${tour.imagen_hero}`,
    url: `${SITE}${localePath(`/tours/${tour.slug}`, locale)}`,
    touristType: locale === "en"
      ? ["Adventure tourism", "Nature tourism", tour.tipo]
      : ["Turismo de aventura", "Turismo de naturaleza", tour.tipo],
    duration: `PT${tour.duracion_hrs}H`,
    provider: { "@type": "TouristAgency", name: "Tours Huasteca Potosina", url: SITE },
    offers: {
      "@type": "Offer",
      price: tour.precio,
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: `${SITE}${localePath(`/tours/${tour.slug}`, locale)}`,
    },
  };

  const faqEntries = locale === "en"
    ? [
        { q: `What's included in the ${tour.nombre}?`, a: tour.incluye.join(", ") + ". Everything is included in the price." },
        { q: `How long is the ${tour.nombre}?`, a: durMin === durMax
            ? `The tour lasts approximately ${tour.duracion_hrs} hours.`
            : tour.rutas
              ? `It depends on the route you choose: between ${durMin} and ${durMax} hours.`
              : `The tour lasts between ${durMin} and ${durMax} hours.` },
        { q: "Can I cancel my booking?", a: "Yes. Free cancellation up to 48 hours before the tour. Full refund, no questions asked." },
        esVehiculo
          ? { q: "Is the price per person or per vehicle?", a: `Pricing is per vehicle, starting at ${money(tour.precio)} MXN depending on the route and unit you choose. Every vehicle includes fuel, safety gear and the guide.` }
          : tour.soloAdultos
            ? { q: "What is the price per person?", a: `The price is ${money(tour.precio)} MXN per person. This activity is for ages 10 and up, so there is no children's discount. The park admission is paid separately on site.` }
            : { q: "What is the price per person?", a: `The price is ${money(tour.precio)} MXN per adult. Children ages 6 to 10 pay 70% of the adult price and ages 3 to 5 pay 50%. Babies under 3 go free.` },
        esVehiculo
          ? { q: "Where does the tour depart from?", a: "We meet at our base in Xilitla, San Luis Potosí. Transportation to Xilitla is not included." }
          : tour.id === "tour-buceo-media-luna"
            ? { q: "Where does the tour depart from?", a: "We meet at the entrance of the Media Luna Lagoon, in Rioverde — about 2 hours from Ciudad Valles. You make your own way there; transportation and the park admission are not included." }
          : tour.id === "tour-rafting-tampaon"
            ? { q: "Where does the tour depart from?", a: "We pick you up at your lodging in Ciudad Valles or Xilitla — round-trip transport included." }
            : { q: "Where does the tour depart from?", a: "The tour departs from Ciudad Valles, San Luis Potosí. We include pickup at your hotel or an agreed meeting point." },
      ]
    : [
        { q: `¿Qué incluye el ${tour.nombre}?`, a: tour.incluye.join(", ") + ". Todo incluido en el precio." },
        { q: `¿Cuánto dura el ${tour.nombre}?`, a: durMin === durMax
            ? `El tour tiene una duración aproximada de ${tour.duracion_hrs} horas.`
            : tour.rutas
              ? `Depende de la ruta que elijas: entre ${durMin} y ${durMax} horas.`
              : `El tour dura entre ${durMin} y ${durMax} horas.` },
        { q: "¿Puedo cancelar mi reserva?", a: "Sí. Cancelación gratuita hasta 48 horas antes del tour. Reembolso completo sin preguntas." },
        esVehiculo
          ? { q: "¿El precio es por persona o por vehículo?", a: `El precio es por vehículo, desde ${money(tour.precio)} MXN según la ruta y la unidad que elijas. Todos los vehículos incluyen gasolina, equipo de seguridad y guía.` }
          : tour.soloAdultos
            ? { q: "¿Cuál es el precio por persona?", a: `El precio es ${money(tour.precio)} MXN por persona. Es una actividad para mayores de 10 años, por lo que no aplica descuento de niños. La entrada al parque se paga aparte en sitio.` }
            : { q: "¿Cuál es el precio por persona?", a: `El precio es ${money(tour.precio)} MXN por persona adulta. Los niños de 6 a 10 años pagan el 70% del precio de adulto y los de 3 a 5 años el 50%. Los bebés menores de 3 años no pagan.` },
        esVehiculo
          ? { q: "¿Dónde es el punto de salida?", a: "El punto de encuentro es nuestra base en Xilitla, San Luis Potosí. El transporte hasta Xilitla no está incluido." }
          : tour.id === "tour-buceo-media-luna"
            ? { q: "¿Dónde es el punto de salida?", a: "El punto de encuentro es la entrada de la Laguna de la Media Luna, en Rioverde — a unas 2 horas de Ciudad Valles. Llegas por tu cuenta; el transporte y la entrada al parque no están incluidos." }
          : tour.id === "tour-rafting-tampaon"
            ? { q: "¿Dónde es el punto de salida?", a: "Pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla — traslado redondo incluido." }
            : { q: "¿Dónde es el punto de salida?", a: "El tour sale desde Ciudad Valles, San Luis Potosí. Incluimos recogida en tu hotel o punto de encuentro acordado." },
      ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "en" ? "en" : "es-MX",
    mainEntity: faqEntries.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.nombre,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: tour.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    ...(reviews.length > 0 ? {
      review: reviews.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.nombre },
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        reviewBody: r.texto,
        datePublished: r.fecha,
      })),
    } : {}),
  };

  const waTour = locale === "en"
    ? `Hi, I'm interested in the "${tour.nombre}" tour. Could you share availability and prices?`
    : esVehiculo
      ? `Hola, me interesa el tour "${tour.nombre}". ¿Me ayudas a elegir ruta y vehículo? ¿Qué disponibilidad tienen?`
      : WA_MESSAGES.tour(tour.nombre, 2, 0, tour.precio * 2);
  const waPrivate = locale === "en"
    ? `Hi, I'd like a private "${tour.nombre}" tour for my group. What would the cost be?`
    : `Hola, me interesa hacer el tour "${tour.nombre}" de forma privada. ¿Cuál sería el costo?`;

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tourSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Inicio", item: `${SITE}${localePath("/", locale)}` },
          { "@type": "ListItem", position: 2, name: "Tours",  item: `${SITE}${toursHref}` },
          { "@type": "ListItem", position: 3, name: tour.nombre, item: `${SITE}${localePath(`/tours/${tour.slug}`, locale)}` },
        ],
      }) }} />

      {/* ── HERO ── */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {tour.imagen_hero && (
          <Image src={tour.imagen_hero} alt={tour.nombre} fill className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/50 to-negro/20" />

        <div className="absolute top-24 left-6 flex gap-2">
          <span className="bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full">
            {tour.tipo}
          </span>
          <span className={`${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
            {dif.label[locale]}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-4xl">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-3">
            {t.guidedAllInclusive}
          </p>
          <h1 className="font-cormorant font-light text-crema leading-tight mb-3" style={{ fontSize: "clamp(28px,5vw,56px)" }}>
            {tour.nombre}
          </h1>
          <p className="text-dorado/80 font-dm text-sm italic mb-4">{tour.tagline}</p>
          <div className="flex flex-wrap items-center gap-3">
            {pctOff > 0 && (
              <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2.5 py-1 rounded-sm">{pctOff}% OFF</span>
            )}
            <div className="flex items-baseline gap-2">
              {esVehiculo && (
                <span className="text-crema/50 font-dm text-xs uppercase tracking-[1px]">{tcommon.desde}</span>
              )}
              <span className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(24px,3.5vw,36px)" }}>
                {money(tour.precio)}
              </span>
              <span className="text-crema/50 font-dm text-xs">{priceUnitHero}</span>
            </div>
          </div>
        </div>
      </section>

      <TourPageTracker tourId={tour.id} nombre={tour.nombre} precio={tour.precio} tipo={tour.tipo} />
      <MobileBookingBar tourSlug={tour.slug} precio={tour.precio} tourId={tour.id} tourName={tour.nombre}
        precioUnidad={tour.precioUnidad} waHref={waLink(waTour)} />

      {/* ── CONTENIDO ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-4">{t.aboutThisTour}</h2>
            <p className="text-crema/65 font-dm text-sm leading-relaxed mb-6">{tour.descripcion}</p>
            {tour.descripcionLarga && (
              <div className="space-y-4 border-l-2 border-verde-vivo/30 pl-5">
                {tour.descripcionLarga.split("\n\n").map((parrafo, i) => (
                  <p key={i} className="text-crema/55 font-dm text-sm leading-relaxed">{parrafo}</p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">{t.destinations}</h2>
            <ul className="space-y-3">
              {tour.destinos.map((d, i) => (
                <li key={d} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-verde-selva/40 border border-verde-vivo/30 flex items-center justify-center text-[11px] text-verde-vivo font-dm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-crema/70 font-dm text-sm pt-1">{d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── RUTAS Y PRECIOS POR VEHÍCULO (solo tours cobrados por vehículo, ej. RZR) ── */}
          {tour.rutas && tour.flota && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-2">
                {locale === "en" ? "Pick your route" : "Elige tu ruta"}
              </h2>
              <p className="text-crema/45 font-dm text-xs mb-5">
                {locale === "en"
                  ? "All prices are per vehicle (not per person) and include fuel, safety gear and guide."
                  : "Todos los precios son por vehículo (no por persona) e incluyen gasolina, equipo de seguridad y guía."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {tour.rutas.map((r) => (
                  <div key={r.nombre} className="border border-white/10 bg-negro/40 p-5">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <h3 className="font-cormorant text-crema text-lg leading-tight">{r.nombre}</h3>
                      <span className="text-[10px] text-crema/40 font-dm flex-shrink-0">{r.duracion_hrs} h</span>
                    </div>
                    <p className="text-crema/55 font-dm text-xs leading-relaxed mb-3">{r.descripcion}</p>
                    {r.destinos && r.destinos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-1.5">
                          {locale === "en" ? "We visit" : "Visitamos"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.destinos.map((d) => (
                            <span key={d} className="text-[10px] font-dm text-crema/70 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.incluye && r.incluye.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {r.incluye.map((it) => (
                          <li key={it} className="flex items-start gap-1.5 text-[10px] font-dm text-lima/80">
                            <span className="flex-shrink-0">✓</span>{it}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[10px] text-crema/40 font-dm">
                      {tcommon.desde}{" "}
                      <span className="font-cormorant text-dorado text-base">{money(r.desde)}</span>{" "}
                      {locale === "en" ? "MXN per vehicle" : "MXN por vehículo"}
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="font-cormorant text-crema text-xl mb-2">
                {locale === "en" ? "Our fleet — price per vehicle" : "Nuestra flota — precio por vehículo"}
              </h3>
              <div className="overflow-x-auto border border-white/10">
                <table className="w-full text-left font-dm text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-negro/60">
                      <th className="px-4 py-3 text-[9px] tracking-[1.5px] uppercase text-crema/40 font-medium">
                        {locale === "en" ? "Vehicle" : "Vehículo"}
                      </th>
                      {tour.rutas.map((r) => (
                        <th key={r.nombre} className="px-3 py-3 text-[9px] tracking-[1px] uppercase text-crema/40 font-medium whitespace-nowrap">
                          {r.nombre.replace(/^(Ruta|Route)\s/i, "")} · {r.duracion_hrs}h
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tour.flota.map((v) => (
                      <tr key={v.nombre} className="border-b border-white/5 last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="text-crema/85 font-medium">{v.nombre}</p>
                          <p className="text-[10px] text-crema/40">{v.capacidad}</p>
                        </td>
                        {v.precios.map((p, i) => (
                          <td key={i} className="px-3 py-3 text-dorado whitespace-nowrap">{money(p)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-crema/35 font-dm mt-3">
                {locale === "en"
                  ? "Book online with card — pick your route, vehicle and date — or message us on WhatsApp and we'll help you set it up."
                  : "Resérvalo en línea con tarjeta —eliges ruta, vehículo y fecha— o escríbenos por WhatsApp y te ayudamos a armarlo."}
              </p>
            </section>
          )}

          {tour.gallery.length > 0 && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-5">{t.images}</h2>
              <TourGallery images={tour.gallery} tourName={tour.nombre} />
            </section>
          )}

          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">{t.allIncluded}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tour.incluye.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-crema/65 font-dm">
                  <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <TourDeparture tourId={tour.id} />

          {reviews.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cormorant text-crema text-2xl">{t.reviewsHeading}</h2>
                <a href={GOOGLE_MAPS_REVIEWS_URL} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors flex-shrink-0">
                  {t.viewOnGoogle}
                </a>
              </div>
              <div className="flex gap-1 mb-6">
                {"★★★★★".split("").map((s, i) => (<span key={i} className="text-dorado text-lg">{s}</span>))}
                <span className="text-crema/40 font-dm text-sm ml-2 self-end">5.0 · {t.reviewsCount(reviews.length)}</span>
              </div>
              <div className="space-y-5">
                {reviews.map((r) => (
                  <div key={r.nombre} className="border border-white/8 bg-negro/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.foto} alt={r.nombre} width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full flex-shrink-0 object-cover" />
                      <div>
                        <p className="text-crema font-dm text-sm font-medium leading-none">{r.nombre}</p>
                        <p className="text-crema/35 font-dm text-[10px] mt-0.5">{r.ciudad} · {r.fecha}</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {"★★★★★".split("").map((s, i) => (<span key={i} className="text-dorado text-xs">{s}</span>))}
                      </div>
                    </div>
                    <p className="text-crema/60 font-dm text-sm leading-relaxed">&ldquo;{r.texto}&rdquo;</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center">
                <a href={GOOGLE_MAPS_REVIEWS_URL} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-verde-vivo hover:text-lima font-dm underline underline-offset-2 transition-colors">
                  {t.viewAllReviews}
                </a>
              </p>
            </section>
          )}
        </div>

        {/* Sidebar sticky */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="border border-white/10 bg-negro/60 p-5">
              {pctOff > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-terracota text-white text-[9px] font-dm font-bold tracking-[1px] px-2 py-0.5">{pctOff}% OFF</span>
                  <span className="text-[9px] text-crema/35 font-dm">{t.specialPrice}</span>
                </div>
              )}
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">{tcommon.desde.toLowerCase()}</p>
              {tour.precioOriginal && tour.precioOriginal > tour.precio && (
                <p className="text-[12px] text-crema/35 font-dm line-through leading-none">{money(tour.precioOriginal)}</p>
              )}
              <p className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(32px,4vw,48px)" }}>{money(tour.precio)}</p>
              <p className="text-[11px] text-crema/40 font-dm mt-1">{priceUnitShort}</p>
              <p className="text-[10px] text-dorado/80 font-dm mt-2 flex items-center gap-1">
                <Star className="w-3 h-3 fill-dorado/80" aria-hidden="true" /> 4.9 · ({t.reviewsCount(tour.reviewCount)})
              </p>
              <p className="text-[10px] text-crema/40 font-dm mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" /> {durLabel}
              </p>
              <p className="text-[10px] text-crema/40 font-dm mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" aria-hidden="true" />{" "}
                {esVehiculo
                  ? (locale === "en" ? "2 to 8 people per vehicle" : "De 2 a 8 personas por vehículo")
                  : t.groupMax(tour.groupMax)}
              </p>
              {tour.privateAvailable && (
                <a href={waLink(waPrivate)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-verde-vivo hover:text-lima font-dm mt-2 transition-colors">
                  <Lock className="w-3 h-3" aria-hidden="true" /> {t.privateTour}
                </a>
              )}
              {!esVehiculo && (
                <InventoryBadge tourId={tour.id} tourName={tour.nombre} groupMax={tour.groupMax} />
              )}
              {tour.urgencia && (
                <p className="text-[9px] text-dorado/80 bg-dorado/10 border border-dorado/20 px-2 py-1 mt-2 font-dm leading-tight">
                  {tour.urgencia}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <Link href={`/reservar-tour/${tour.slug}`}
                className="flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                {esVehiculo ? (locale === "en" ? "Book with card" : "Reservar con tarjeta") : t.bookThisTour}
              </Link>
              <a href={waLink(waTour)} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/8 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                {t.askWhatsapp}
              </a>
              <p className="text-center text-[9px] text-crema/25 font-dm">{t.freeCancel48}</p>
            </div>

            <div className="border border-white/10 bg-negro/60 p-5">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-4">{t.bookWithConfidence}</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.freeCancellation}</p><p className="text-[10px] font-dm text-crema/40">{t.freeCancellationSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.rescheduleRain}</p><p className="text-[10px] font-dm text-crema/40">{t.rescheduleRainSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.photosIncluded}</p><p className="text-[10px] font-dm text-crema/40">{t.photosIncludedSub}</p></div>
                </li>
                <li className="flex items-start gap-3">
                  <Headphones className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div><p className="text-[11px] font-dm font-medium text-crema/85">{t.support247}</p><p className="text-[10px] font-dm text-crema/40">{t.support247Sub}</p></div>
                </li>
              </ul>
            </div>

            <Link href={toursHref}
              className="block text-center border border-white/15 hover:border-crema/30 text-crema/50 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm py-3 transition-all duration-200">
              {t.backToTours}
            </Link>
          </div>
        </aside>
      </div>

      {/* ── TOURS SIMILARES / CROSS-SELL ── */}
      {(() => {
        // OJO: `slug` debe ser el slug REAL del tour (no el id) — se busca con tr.slug === combo.slug
        const COMBOS: Record<string, { slug: string; msg: string }> = {
          "tour-tamul":       { slug: "ruta-surrealista-edward-james",   msg: "Si tienes un día más: Las Pozas de Edward James es el complemento perfecto — arte surrealista después de la naturaleza bruta." },
          "tour-edward-james":{ slug: "expedicion-tamul",                msg: "Combínalo con la Expedición Tamul — cascada + selva al día siguiente. El clásico de 2 días de la Huasteca." },
          "tour-meco":        { slug: "paraiso-escalonado-minas-micos",  msg: "Combínalo con el Tour Minas + Micos para un segundo día de aguas turquesas con más cascadas y tirolesas." },
          "tour-minas-micos": { slug: "cascadas-del-meco",               msg: "Combínalo con Cascada El Meco — aguas turquesas reales con luz perfecta. Dos días, dos experiencias únicas." },
          "tour-puente-dios": { slug: "paraiso-escalonado-minas-micos",  msg: "Combínalo con Minas + Micos al día siguiente — más cascadas, más pozas, la ruta de aguas completa." },
          "tour-rafting-tampaon": { slug: "rappel-tamul",  msg: "Combínalo con el Rappel en Tamul — dos días de adrenalina en el mismo cañón: un día remando los rápidos y otro descendiendo frente a la cascada más alta de México." },
          "tour-rappel-tamul": { slug: "rafting-rio-tampaon", msg: "Combínalo con el Rafting en el Tampaón — después de descender la pared, domina los rápidos del mismo río. El fin de semana de adrenalina completo." },
        };
        const combo = COMBOS[tour.id];
        const comboBase = combo ? TOURS_DB.find((tr) => tr.slug === combo.slug) : null;
        const comboTour = comboBase ? localizeTour(comboBase, locale) : null;
        const otherTours = TOURS_DB.filter((tr) => tr.slug !== tour.slug && tr.slug !== combo?.slug).slice(0, 2).map((tr) => localizeTour(tr, locale));
        const comboMsg = combo ? (locale === "en" ? t.comboGeneric : combo.msg) : "";

        return (
          <section className="border-t border-white/6 py-16 px-6">
            <div className="max-w-5xl mx-auto">
              <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm text-center mb-2">{t.maximizeTrip}</p>
              <h2 className="font-cormorant text-crema text-2xl mb-10 text-center">{t.combineHeading}</h2>

              {comboTour && combo && (
                <div className="border border-dorado/25 bg-dorado/5 p-5 mb-8 flex flex-col sm:flex-row gap-5 items-start">
                  <div className="sm:flex-shrink-0 w-full sm:w-40">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      {comboTour.imagen_hero && (
                        <Image src={comboTour.imagen_hero} alt={comboTour.nombre} fill className="object-cover" sizes="160px" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[8px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 px-2 py-0.5 mb-2">{t.recommendedCombo}</span>
                    <h3 className="font-cormorant text-crema text-lg leading-snug mb-1">{comboTour.nombre}</h3>
                    <p className="text-crema/55 font-dm text-xs leading-relaxed mb-3">{comboMsg}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-cormorant text-dorado text-base">{money(comboTour.precio)} MXN/{tcommon.porPersona.split(" ")[1] ?? "persona"}</span>
                      <Link href={localePath(`/tours/${comboTour.slug}`, locale)}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 hover:bg-dorado/10 px-3 py-1.5 transition-all">
                        {t.viewTour}
                      </Link>
                      <Link href={`/reservar-tour/${comboTour.slug}`}
                        className="text-[9px] tracking-[2px] uppercase font-dm text-negro bg-dorado hover:bg-lima px-3 py-1.5 transition-all">
                        {t.book}
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherTours.map((tr) => (
                  <Link key={tr.slug} href={localePath(`/tours/${tr.slug}`, locale)}
                    className="group border border-white/8 hover:border-verde-vivo/40 bg-negro/40 p-5 flex gap-4 items-start transition-all duration-200">
                    <div className="relative w-20 h-20 overflow-hidden flex-shrink-0">
                      {tr.imagen_hero && (<Image src={tr.imagen_hero} alt={tr.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="80px" />)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{tr.tipo}</p>
                      <h3 className="font-cormorant text-crema text-base leading-tight group-hover:text-dorado transition-colors mb-1">{tr.nombre}</h3>
                      <p className="text-[10px] text-crema/40 font-dm">{tcommon.desde} {money(tr.precio)} MXN</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Espaciador móvil: evita que la MobileBookingBar fija tape el contenido final */}
      <div className="h-20 lg:hidden" aria-hidden="true" />

      <SocialProofToast tourId={tour.id} tourName={tour.nombre} />
    </main>
  );
}
