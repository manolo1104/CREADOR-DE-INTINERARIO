import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Clock, Ticket, BarChart2, Calendar, Sun, CloudSun, MapPin,
  AlertTriangle, Car, Backpack, Lightbulb, Map, Zap, Lock, Star, ExternalLink,
} from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { buildDestinationJsonLd, getDestinoFaqs } from "@/lib/jsonld";
import { toursQueIncluyen, toursCercaDe } from "@/lib/tourMapping";
import { TOURS_DB } from "@/lib/tours";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { DestinoIcon } from "@/components/icons/DestinoIcon";
import { DestinoGallery } from "@/components/DestinoGallery";
import { MejorEpocaWidget } from "@/components/MejorEpocaWidget";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { BlogNewsletterInline } from "@/components/BlogNewsletterInline";
import { PageViewTracker } from "@/components/PageViewTracker";
import { TrackedLink } from "@/components/TrackedLink";
import {
  NARRATIVA_DESTINO,
  COMBINACION_DESTINO,
  REVIEWS_POR_DESTINO,
  RATING_DESTINO,
} from "@/lib/destinoData";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import { getDict } from "@/lib/i18n/messages";
import { fmtNumber } from "@/lib/i18n/format";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return DESTINOS_DB.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale(headers().get("x-locale"));
  const base = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!base) return { title: locale === "en" ? "Destination not found" : "Destino no encontrado" };
  const destino = localizeDestino(base, locale);
  const ogImagen = destino.imagen_hero || destino.imagen_galeria[0];
  return {
    title: destino.seo?.metaTitle ?? `${destino.nombre} — Huasteca Potosina`,
    description: destino.seo?.metaDescription ?? destino.descripcion,
    keywords: destino.seo?.keywords ?? ["Huasteca Potosina", destino.zona, destino.nombre, "tourism Mexico"],
    openGraph: ogImagen ? { images: [{ url: `${SITE}${ogImagen}` }] } : undefined,
    alternates: buildAlternates(`/destinos/${destino.slug}`, locale),
  };
}

export default function DestinoPage({ params }: Props) {
  const locale = asLocale(headers().get("x-locale"));
  const dd = getDict(locale).destino;
  const base = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!base) notFound();
  const destino = localizeDestino(base, locale);

  const jsonLd            = buildDestinationJsonLd(destino, locale);
  const faqs              = getDestinoFaqs(destino, locale);
  // Tours que SÍ visitan este destino (para las píldoras del hero y la banda).
  const toursRelacionados = toursQueIncluyen(destino.slug).map((t) => {
    const b = TOURS_DB.find((tour) => tour.slug === t.slug);
    return b ? localizeTour(b, locale) : { slug: t.slug, nombre: t.nombre };
  });
  const toursCompletos    = toursQueIncluyen(destino.slug)
    .map((t) => TOURS_DB.find((tour) => tour.slug === t.slug))
    .filter(Boolean)
    .map((tour) => localizeTour(tour!, locale));
  // Tours de la misma zona que NO lo visitan: se ofrecen como combinables para
  // que los 26 destinos sin tour propio dejen de terminar en un CTA vacío.
  const toursCercanos     = toursCercaDe(destino.slug)
    .map((t) => TOURS_DB.find((tour) => tour.slug === t.slug))
    .filter(Boolean)
    .map((tour) => localizeTour(tour!, locale));
  const tourPrincipal     = toursCompletos[0];
  const narrativa        = locale === "en" ? undefined : NARRATIVA_DESTINO[destino.slug];
  const combinaciones    = COMBINACION_DESTINO[destino.slug] ?? [];
  const reviewsDestino   = REVIEWS_POR_DESTINO[destino.slug] ?? [];
  const rating           = RATING_DESTINO[destino.slug];
  const tourHref         = toursRelacionados[0] ? localePath(`/tours/${toursRelacionados[0].slug}`, locale) : undefined;
  const money            = (n: number) => `$${fmtNumber(n, locale)}`;
  const comboName        = (slug: string, fallback: string) => {
    const b = DESTINOS_DB.find((d) => d.slug === slug);
    return b ? localizeDestino(b, locale).nombre : fallback;
  };
  const waDestino = locale === "en"
    ? `Hi, I'd like information about visiting ${destino.nombre} in the Huasteca Potosina.`
    : WA_MESSAGES.destino(destino.nombre);

  const allImages = [
    { src: destino.imagen_hero, alt: destino.nombre },
    ...destino.imagen_galeria.map((src, i) => ({ src, alt: `${destino.nombre} — ${locale === "en" ? "photo" : "foto"} ${i + 2}` })),
  ].filter(img => !!img.src);

  const mapsUrl  = `https://www.google.com/maps/search/${encodeURIComponent(destino.nombre + " " + destino.zona + " San Luis Potosí")}/@${destino.lat},${destino.lng},13z`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${destino.lng - 0.08},${destino.lat - 0.06},${destino.lng + 0.08},${destino.lat + 0.06}&layer=mapnik&marker=${destino.lat},${destino.lng}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageViewTracker
        event="DESTINO_PAGE_VIEW"
        data={{
          destino:  base.slug,
          nombre:   base.nombre,
          zona:     base.zona,
          // Para medir el puente: ¿los destinos con tour propio convierten más?
          tourSlug: tourPrincipal?.slug,
          conTour:  tourPrincipal ? "incluye" : toursCercanos.length ? "cerca" : "ninguno",
        }}
      />
      <main className="min-h-screen">

        {/* ── HERO ── */}
        <div className="relative min-h-[60vh] flex flex-col justify-end overflow-hidden">
          {destino.imagen_hero ? (
            <>
              <Image src={destino.imagen_hero} alt={destino.nombre} fill priority className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/60 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-verde-profundo to-verde-bosque" />
          )}

          <div className="relative z-10 px-6 md:px-20 py-14">
            <Link href={localePath("/destinos", locale)} className="text-[10px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors mb-8 block">
              {dd.allDestinations}
            </Link>
            <DestinoIcon name={destino.icon} className="w-12 h-12 text-crema/60 mb-4" />
            <h1 className="font-cormorant font-light text-crema mb-3 break-words max-w-full" style={{ fontSize: "clamp(34px,6vw,64px)" }}>
              {destino.nombre}
            </h1>
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-2">{destino.zona} · {destino.tipo}</p>

            {rating && (
              <div className="flex items-center gap-1.5 mb-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_,i) => <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />)}
                </div>
                <span className="font-dm text-sm text-dorado font-medium">{rating.rating}</span>
                <span className="font-dm text-xs text-crema/40">· {rating.count} {dd.opinions}</span>
              </div>
            )}

            <p className="text-crema/75 max-w-2xl leading-relaxed text-base mb-5">{destino.descripcion}</p>

            {toursRelacionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {toursRelacionados.map((t) => (
                  <Link key={t.slug} href={localePath(`/tours/${t.slug}`, locale)}
                    className="inline-flex items-center gap-1.5 bg-verde-selva/80 hover:bg-verde-vivo text-crema text-[9px] tracking-[1.5px] uppercase font-dm px-3 py-1.5 transition-colors">
                    <Map className="w-3 h-3 flex-shrink-0" />
                    {dd.includedIn} {t.nombre} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {(allImages.length > 1 || (!destino.imagen_hero && allImages.length > 0)) && (
          <DestinoGallery images={allImages} nombre={destino.nombre} />
        )}

        {/* ── BANDA DE PRODUCTO ──
            El 92 % del tráfico entra por contenido (destinos) y se va sin ver
            un tour. El bloque completo de "Tours relacionados" vive hasta
            abajo, después del mapa, las FAQs y las reseñas — casi nadie llega.
            Esta banda pone el producto y su precio arriba del pliegue. */}
        {tourPrincipal && (
          <section className="bg-verde-profundo border-y border-verde-vivo/20">
            <div className="max-w-5xl mx-auto px-6 md:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex-1 min-w-0">
                <p className="font-cormorant text-crema text-xl md:text-2xl leading-snug">
                  {dd.partOfTour(destino.nombre, tourPrincipal.nombre)}
                </p>
                <p className="font-dm text-crema/60 text-sm mt-1">
                  {money(tourPrincipal.precio)} MXN {dd.perPerson}
                  {tourPrincipal.precioUnidad === "vehiculo" ? "" : ` · ${dd.deposit30}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <TrackedLink
                  href={localePath(`/tours/${tourPrincipal.slug}`, locale)}
                  event="DESTINO_TOUR_CLICK"
                  data={{
                    destino:  base.slug,
                    tourSlug: tourPrincipal.slug,
                    tour_name: tourPrincipal.nombre,
                    amount:   tourPrincipal.precio,
                    source:   "banda_destino",
                  }}
                  className="inline-flex items-center gap-2 bg-lima text-negro px-5 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo hover:text-crema transition-colors"
                >
                  {dd.seeDepartures} →
                </TrackedLink>
              </div>
            </div>
          </section>
        )}

        {narrativa && (
          <div className="max-w-4xl mx-auto px-6 pt-14 pb-2">
            <div className="border-l-2 border-verde-vivo/40 pl-6 py-2">
              <p className="text-crema/75 font-dm text-sm leading-relaxed italic">{narrativa}</p>
            </div>
          </div>
        )}

        {locale !== "en" && (
          <div className="max-w-4xl mx-auto px-6 pt-8 pb-2">
            <MejorEpocaWidget
              temporada={destino.temporada_ideal}
              destinoNombre={destino.nombre}
              tourHref={tourHref}
            />
          </div>
        )}

        {/* ── INFO GRID ── */}
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="font-cormorant text-crema text-2xl mb-6">{dd.practicalData}</h2>
            {(
              [
                { Icon: Clock,     label: dd.duration,     val: dd.hoursUnit(destino.duracion_hrs) },
                { Icon: Ticket,    label: dd.entrance,     val: destino.precio_entrada },
                { Icon: BarChart2, label: dd.difficulty,   val: dd.difficultyVal(destino.dificultad) },
                { Icon: Clock,     label: dd.schedule,     val: destino.horario },
                { Icon: Calendar,  label: dd.daysOpen,     val: destino.dias_abierto },
                { Icon: Sun,       label: dd.bestTime,     val: destino.mejor_hora },
                { Icon: CloudSun,  label: dd.bestSeason,   val: destino.temporada_ideal },
                { Icon: MapPin,    label: dd.meetingPoint, val: dd.meetingPointVal },
              ] as { Icon: LucideIcon; label: string; val: string | undefined }[]
            ).filter(i => i.val).map((item) => (
              <div key={item.label} className="flex gap-3 py-3 border-b border-white/6">
                <item.Icon className="w-4 h-4 flex-shrink-0 text-verde-selva mt-0.5" />
                <div>
                  <div className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-0.5">{item.label}</div>
                  <div className="text-sm text-crema">{item.val}</div>
                  {/* La entrada y la panga se leían como una contradicción con el
                      "todo incluido" del tour. No lo son: este costo es para
                      quien va por su cuenta. Decirlo aquí evita la duda y de
                      paso enseña lo que el tour ya te ahorra. */}
                  {item.label === dd.entrance && (
                    <div className="text-[11px] text-crema/45 font-dm mt-1 leading-relaxed">
                      {locale === "en"
                        ? "This is the cost if you come on your own. On our tours, admission is already included."
                        : "Este es el costo si vienes por tu cuenta. En nuestros tours las entradas ya van incluidas."}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {destino.advertencias && (
              <div className="border-l-2 border-terracota bg-terracota/8 p-4">
                <p className="text-[10px] tracking-[2px] uppercase text-terracota mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {dd.advertencias}</p>
                <p className="text-sm text-crema/75">{destino.advertencias}</p>
              </div>
            )}
            {destino.como_llegar && (
              <div className="border-l-2 border-agua bg-agua/8 p-4">
                <p className="text-[10px] tracking-[2px] uppercase text-agua mb-2 flex items-center gap-1.5"><Car className="w-3 h-3" /> {dd.comoLlegar}</p>
                <p className="text-sm text-crema/75">{destino.como_llegar}</p>
              </div>
            )}
            {destino.que_llevar?.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-3 flex items-center gap-1.5"><Backpack className="w-3 h-3" /> {dd.queLlevar}</p>
                <ul className="space-y-1.5">
                  {destino.que_llevar.map((item) => (
                    <li key={item} className="text-sm text-crema/70 flex gap-2"><span className="text-verde-vivo">·</span> {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {destino.datos_curiosos?.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-3 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" /> {dd.datosCuriosos}</p>
                <ul className="space-y-1.5">
                  {destino.datos_curiosos.map((d) => (
                    <li key={d} className="text-sm text-crema/70 flex gap-2"><span className="text-dorado">·</span> {d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── MAPA ── */}
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <h2 className="font-cormorant text-crema text-xl mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-verde-selva" /> {dd.location}
          </h2>
          <div className="relative overflow-hidden border border-white/10" style={{ height: "280px" }}>
            <div className="absolute inset-0 bg-verde-profundo/30 animate-pulse" />
            <iframe src={embedUrl} width="100%" height="280" style={{ border: 0, position: "relative", zIndex: 10 }} loading="lazy" title={`${dd.location}: ${destino.nombre}`} allowFullScreen={false} />
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors">
            <ExternalLink className="w-3 h-3" /> {dd.openInMaps}
          </a>
        </div>

        {/* ── PREGUNTAS FRECUENTES ──
            Mismo contenido que el JSON-LD (getDestinoFaqs): Google exige que lo
            que se marca como FAQPage esté visible en la página, y los buscadores
            de IA citan este texto. */}
        {faqs.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <h2 className="font-cormorant text-crema text-xl mb-4">{dd.faqTitulo}</h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.pregunta} className="border border-white/10 bg-negro/30 group">
                  <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                    {faq.pregunta}
                    <span className="text-verde-vivo flex-shrink-0 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-white/8 pt-4">
                    <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.respuesta}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ── RESEÑAS ── */}
        {reviewsDestino.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-crema text-xl">{dd.travelersSay}</h2>
              {rating && (
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-dorado text-dorado" />)}</div>
                  <span className="text-dorado font-dm text-sm font-medium">{rating.rating}</span>
                  <span className="text-crema/40 font-dm text-xs">({rating.count})</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {reviewsDestino.map((r) => (
                <div key={r.nombre} className="border border-white/8 bg-negro/30 p-4">
                  <div className="flex gap-0.5 mb-2">{[...Array(r.rating)].map((_,i) => <Star key={i} className="w-3 h-3 fill-dorado text-dorado" />)}</div>
                  <p className="text-crema/65 font-dm text-xs leading-relaxed italic mb-3">&ldquo;{r.texto}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.foto} alt={r.nombre} width={28} height={28} loading="lazy" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    <div>
                      <p className="font-dm text-xs text-crema/80 font-medium leading-none">{r.nombre}</p>
                      <p className="text-[9px] text-crema/35 font-dm">{r.ciudad}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOURS RELACIONADOS ── */}
        {toursCompletos.length > 0 ? (
          <div className="bg-verde-selva/20 border-t border-verde-vivo/20 py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="font-cormorant text-crema text-3xl mb-3">
                {dd.toursThatInclude} <em className="text-dorado">{destino.nombre}</em>
              </h2>
              <p className="text-crema/50 text-sm mb-10 font-dm max-w-md mx-auto">{dd.bookOrAsk}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
                {toursCompletos.map((tour) => (
                  <div key={tour.slug} className="border border-white/10 bg-negro/60 overflow-hidden text-left">
                    {tour.imagen_hero && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image src={tour.imagen_hero} alt={tour.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                        <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
                      </div>
                    )}
                    <div className="p-5">
                      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{tour.tipo}</p>
                      <h3 className="font-cormorant text-crema text-base leading-snug mb-3">{tour.nombre}</h3>
                      <p className="font-cormorant text-dorado text-xl leading-none mb-4">
                        {money(tour.precio)}
                        <span className="font-dm text-[10px] text-crema/40 ml-1">MXN / {locale === "en" ? "person" : "persona"}</span>
                      </p>
                      <div className="space-y-2">
                        <Link href={`/reservar-tour/${tour.slug}`}
                          className="flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors">
                          <Lock className="w-3 h-3" />{dd.bookWithCard}
                        </Link>
                        <a href={waLink(waDestino)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                          {dd.askWhatsapp}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-[10px] text-crema/35 font-dm flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3" /> {dd.replyUnder1h}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-verde-selva/20 border-t border-verde-vivo/20 py-16 text-center px-6">
            <h2 className="font-cormorant text-crema text-3xl mb-3">
              {dd.wantToVisit} <em className="text-dorado">{destino.nombre}?</em>
            </h2>

            {/* Antes esta rama era solo-WhatsApp: 26 de 41 destinos terminaban
                sin un solo producto a la vista. Ahora se ofrecen los tours de
                la misma zona, diciendo con claridad que NO lo visitan. */}
            {toursCercanos.length > 0 && (
              <div className="max-w-3xl mx-auto mb-10">
                <p className="text-crema/50 text-sm mb-6 font-dm">{dd.nearbyIntro(destino.nombre)}</p>
                <div className="grid gap-3 sm:grid-cols-2 text-left">
                  {toursCercanos.map((t) => (
                    <Link
                      key={t.slug}
                      href={localePath(`/tours/${t.slug}`, locale)}
                      className="group border border-verde-vivo/25 bg-negro/25 hover:bg-negro/40 hover:border-verde-vivo/50 transition-colors p-4 flex items-center gap-4"
                    >
                      {t.imagen_hero && (
                        <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden">
                          <Image src={t.imagen_hero} alt={t.nombre} fill className="object-cover" sizes="64px" />
                        </div>
                      )}
                      <span className="min-w-0">
                        <span className="block font-dm text-sm text-crema leading-snug">{t.nombre}</span>
                        <span className="block font-dm text-xs text-dorado mt-1">
                          {money(t.precio)} MXN {t.precioUnidad === "vehiculo" ? "" : dd.perPerson}
                        </span>
                      </span>
                      <span className="ml-auto text-verde-vivo group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                  ))}
                </div>
                <p className="text-[10px] text-crema/35 font-dm mt-5">{dd.combineWhatsapp}</p>
              </div>
            )}

            <p className="text-crema/50 text-sm mb-8 font-dm max-w-md mx-auto">{dd.writeWhatsapp}</p>
            <a href={waLink(waDestino)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
              {dd.bookViaWhatsapp}
            </a>
            <p className="text-[10px] text-crema/35 font-dm flex items-center justify-center gap-1.5">
              <Zap className="w-3 h-3" /> {dd.replyUnder1h}
            </p>
          </div>
        )}

        {/* ── CAPTURA DE CORREO ──
            Las páginas de destino son el grueso del tráfico orgánico y hasta
            ahora no capturaban un solo correo: el recomendador es el único
            formulario del sitio y casi nadie lo encuentra. (ES por ahora: el
            itinerario que se envía está escrito en español.) */}
        {locale !== "en" && (
          <div className="max-w-4xl mx-auto px-6">
            <BlogNewsletterInline fuente={`Destino: ${base.nombre}`} />
          </div>
        )}

        {/* ── CROSS-SELL ── */}
        {combinaciones.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 py-12 border-t border-white/6">
            <p className="text-[9px] tracking-[3px] uppercase text-crema/35 font-dm mb-3">{dd.alsoInclude(destino.nombre)}</p>
            <div className="flex flex-wrap gap-3">
              {combinaciones.map((c) => (
                <Link key={c.slug} href={localePath(`/destinos/${c.slug}`, locale)}
                  className="border border-verde-selva/30 bg-verde-selva/8 hover:bg-verde-selva/15 text-crema/75 hover:text-crema font-dm text-xs px-4 py-2.5 transition-all flex items-center gap-1.5">
                  <span className="text-verde-vivo text-sm">→</span>
                  {comboName(c.slug, c.nombre)}
                </Link>
              ))}
              {locale !== "en" && (
                <Link href="/recomendar"
                  className="border border-dorado/30 bg-dorado/8 hover:bg-dorado/15 text-dorado/75 hover:text-dorado font-dm text-xs px-4 py-2.5 transition-all flex items-center gap-1.5">
                  {dd.createItinerary}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Barra móvil de reserva. En /tours/[slug] es el CTA que más convierte
            (todos los "INICIÓ RESERVA" del log salieron de ahí) y vivía en una
            sola plantilla. Aquí solo aparece si hay un tour que SÍ visita el
            destino, para no prometer un itinerario que no existe. */}
        {tourPrincipal && (
          <>
            <MobileBookingBar
              tourSlug={tourPrincipal.slug}
              precio={tourPrincipal.precio}
              tourId={tourPrincipal.id}
              tourName={tourPrincipal.nombre}
              precioUnidad={tourPrincipal.precioUnidad}
              waHref={waLink(waDestino)}
              source="destino_bar"
            />
            <div className="h-20 lg:hidden" aria-hidden="true" />
          </>
        )}
      </main>
    </>
  );
}
