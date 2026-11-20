import { notFound } from "next/navigation";
import { resenasTexto, GOOGLE_PERFIL_URL } from "@/lib/resenas";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Clock, Calendar, Sun, CloudSun, MapPin, Backpack, Lightbulb, Map, Zap, Lock, Star,
} from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { buildDestinationJsonLd, getDestinoFaqs } from "@/lib/jsonld";
import { altsGaleriaDestino } from "@/lib/altImagenes";
import { toursQueIncluyen, toursCercaDe } from "@/lib/tourMapping";
import { blogDeDestino } from "@/lib/blogDestinoMap";
import { TOURS_DB, etiquetaUnidad, esPorPersona, partesRecogida, type Tour } from "@/lib/tours";
import { resumenSalidas } from "@/lib/recogidaTexto";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { DestinoIcon } from "@/components/icons/DestinoIcon";
import { DestinoGallery } from "@/components/DestinoGallery";
import { MejorEpocaWidget } from "@/components/MejorEpocaWidget";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { BlogNewsletterInline } from "@/components/BlogNewsletterInline";
import { PageViewTracker } from "@/components/PageViewTracker";
import { TrackedLink } from "@/components/TrackedLink";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import { AvatarResena } from "@/components/AvatarResena";
import {
  narrativaDestino,
  COMBINACION_DESTINO,
  GUIAS_BLOG_DESTINO,
  PALABRAS_RESENA_DESTINO,
} from "@/lib/destinoData";
import { guiaDe } from "@/lib/destinosGuia";
import { atributosDe } from "@/lib/destinosAtributos";
import { EstadoRioFicha } from "@/components/destinos/EstadoRioFicha";
import {
  MigasDestino, RespuestaRapida, CostosYTour, ComoLlegar, QueEsperarYSeguridad,
  TemporadasServicios, CercaDeAqui, FuentesDestino,
} from "./SeccionesGuia";
import { resenasRealesPara, ROTULO_TRADUCCION } from "@/lib/i18n/resenasReales.en";
import { asLocale, localePath, localeUrl, buildAlternates, SITE, type Locale } from "@/lib/i18n/config";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import { getDict, type Messages } from "@/lib/i18n/messages";
import { fmtNumber } from "@/lib/i18n/format";
import { slugEnDe, urlBlogEn } from "@/lib/blogEn";

/** Los destinos que recorre el viaje CDMX–Xilitla, con el titular de su tarjeta. */
const DESTINOS_DEL_VIAJE_CDMX: Record<string, string> = {
  "xilitla-pueblo-magico": "¿Sales de la CDMX? Duerme en Xilitla, todo incluido",
  "las-pozas-jardin-surrealista": "¿Sales de la CDMX? Las Pozas va incluido en el viaje del mes",
  "cascada-de-tamul": "¿Sales de la CDMX? Tamul va incluido en el viaje del mes",
  "nacimiento-huichihuayan": "¿Sales de la CDMX? Huichihuayán va incluido en el viaje del mes",
  "castillo-de-la-salud": "¿Sales de la CDMX? El Castillo de la Salud va incluido en el viaje",
  "sotano-de-las-huahuas": "¿Sales de la CDMX? Las Huahuas van incluidas en el viaje del mes",
};

// Los precios de la promo de temporada baja se apagan solos al terminar (ver
// `TOURS_DB` en lib/tours.ts); esta página estática se regenera cada hora para
// que lo que anuncia no se quede congelado desde el último despliegue.

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return DESTINOS_DB.map((d) => ({ slug: d.slug }));
}

export async function metadataPagina({ params }: Props, locale: Locale): Promise<Metadata> {
  const base = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!base) return { title: locale === "en" ? "Destination not found" : "Destino no encontrado" };
  const destino = localizeDestino(base, locale);
  const title = destino.seo?.metaTitle ?? `${destino.nombre} — Huasteca Potosina`;
  const description = destino.seo?.metaDescription ?? destino.descripcion;
  // Sin foto propia, la genérica del sitio (la misma del layout).
  const ogImagen = `${SITE}${destino.imagen_hero || destino.imagen_galeria[0] || "/og-image.jpg"}`;
  return {
    title,
    description,
    keywords: destino.seo?.keywords ?? ["Huasteca Potosina", destino.zona, destino.nombre, "tourism Mexico"],
    // 🔴 El openGraph de una página REEMPLAZA entero al del layout, no se
    // mezcla: con solo `{ images }` las 82 fichas (ES + EN) salían sin og:url,
    // og:type, og:locale ni og:site_name. Y como no declaraban `twitter`,
    // heredaban el del layout: título genérico del sitio y /og-image.jpg.
    openGraph: {
      title,
      description,
      url: localeUrl(`/destinos/${destino.slug}`, locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: ogImagen, alt: destino.nombre }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagen],
    },
    alternates: buildAlternates(`/destinos/${destino.slug}`, locale),
  };
}

/**
 * ¿El precio mostrado es solo el primer escalón? Por grupo (el Edén sube con
 * cada persona) o por ruta (cada ruta del RZR tiene el suyo).
 *
 * 🔴 Sin el "Desde", "$X MXN por grupo" o "por vehículo" se leía como tarifa
 * fija. Mismo criterio que `precioConUnidad` en /tours/[slug].
 */
function llevaDesde(t: Tour): boolean {
  return !esPorPersona(t) || !!t.rutas?.length;
}

function precioConUnidad(t: Tour, locale: Locale): string {
  const desde = llevaDesde(t) ? `${getDict(locale).common.desde} ` : "";
  return `${desde}$${fmtNumber(t.precio, locale)} MXN ${etiquetaUnidad(t, locale === "en")}`;
}

/**
 * Rejilla de los recorridos "cerca" (`toursCercaDe`): operan en la zona pero NO
 * visitan el destino. Se pinta en las dos ramas del cierre: sola cuando el
 * destino no tiene tour propio, y debajo de los que sí lo visitan como "También
 * en la zona". 🔴 Antes solo existía la primera: la ficha de Xilitla —la puerta
 * de quien ya decidió quedarse ahí— escondía los cinco recorridos que salen del
 * pueblo (Edén, Gruta, Amanecer, Olla, Café) porque ya tenía dos incluidos.
 *
 * Cada tarjeta lleva su propio botón al MOTOR —no solo a la ficha—. Estas
 * páginas son el 19 % del tráfico y en 14 días mandaron CERO sesiones al
 * carrito: la tarjeta entera era un enlace a `/tours/[slug]`, un paso más antes
 * de poder reservar, y el único botón de verdad era el verde de WhatsApp.
 */
function RejillaCercanos({ tours, locale, dd }: { tours: Tour[]; locale: Locale; dd: Messages["destino"] }) {
  const en = locale === "en";
  return (
    <div className="grid gap-3 sm:grid-cols-2 text-left">
      {tours.map((t) => (
        <div
          key={t.slug}
          className="rounded-xl border border-verde-vivo/25 bg-negro/25 hover:border-verde-vivo/50 transition-colors p-4 flex flex-col gap-3"
        >
          <Link
            href={localePath(`/tours/${t.slug}`, locale)}
            className="group flex items-center gap-4"
          >
            {t.imagen_hero && (
              <span className="relative block w-16 h-16 flex-shrink-0 overflow-hidden">
                <Image src={t.imagen_hero} alt={t.nombre} fill className="object-cover" sizes="64px" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-dm text-sm text-crema leading-snug">{t.nombre}</span>
              {/* Con la unidad siempre: el RZR se cobra por vehículo y salía
                  como "$X MXN" a secas, que se lee como precio por persona. */}
              <span className="block font-dm text-xs text-dorado mt-1">
                {precioConUnidad(t, locale)}
              </span>
            </span>
            <span className="ml-auto text-verde-vivo group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
          <Link
            href={localePath(`/reservar/carrito?agregar=${t.slug}`, locale)}
            className="rounded-xl flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-colors"
          >
            {/* 🔴 El Edén no se reembolsa (ver `cancelacion` en tours.ts): a
                él no se le puede prometer "cancela gratis 48 h antes". */}
            <Lock className="w-3 h-3" />{dd.reservarCercano}{t.cancelacion ? "" : ` · ${dd.deposit30}`}
          </Link>
        </div>
      ))}
    </div>
  );
}

export function Pagina({ params, locale }: Props & { locale: Locale }) {
  const dd = getDict(locale).destino;
  const base = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!base) notFound();
  const destino = localizeDestino(base, locale);
  const en = locale === "en";
  const verTour = getDict(locale).tour.viewTour;
  const money = (n: number) => `$${fmtNumber(n, locale)}`;
  // La guía escrita a mano (solo los destinos más buscados, solo español) y los
  // atributos prácticos (todos): ver `destinosGuia.ts` y `destinosAtributos.ts`.
  const guia = guiaDe(base.slug);
  const atr = atributosDe(base.slug);

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
  // que los destinos sin tour propio no terminen en un CTA vacío.
  const toursCercanos     = toursCercaDe(destino.slug)
    .map((t) => TOURS_DB.find((tour) => tour.slug === t.slug))
    .filter(Boolean)
    .map((tour) => localizeTour(tour!, locale));
  const tourPrincipal     = toursCompletos[0];
  // La fila "Recogida" de los datos prácticos, armada desde `recogida` de los
  // tours que SÍ visitan el destino. Sin tour propio la lista queda vacía y la
  // fila no se pinta.
  const toursBaseIncluyen = toursQueIncluyen(destino.slug)
    .map((t) => TOURS_DB.find((tour) => tour.slug === t.slug))
    .filter((t): t is Tour => !!t);
  const salidas           = resumenSalidas(toursBaseIncluyen, locale);
  const etiquetaSalida    = toursBaseIncluyen.every((t) => partesRecogida(t, en).incluyeTraslado)
    ? dd.meetingPoint
    : en ? "Meeting point" : "Punto de encuentro";
  const narrativa        = narrativaDestino(destino.slug, locale);
  const guiaEs           = blogDeDestino(destino.slug);
  const guiaEn           = guiaEs ? slugEnDe(guiaEs) : undefined;
  const guiaHref         = en
    ? (guiaEn ? urlBlogEn(guiaEn) : undefined)
    : (guiaEs ? `/blog/${guiaEs}` : undefined);
  const guiasBlog        = en ? undefined : GUIAS_BLOG_DESTINO[base.slug];
  const combinaciones    = COMBINACION_DESTINO[destino.slug] ?? [];
  // Reseñas REALES de Google que nombran el lugar (20 nov 2026: fuera los
  // testimonios inventados de `REVIEWS_POR_DESTINO`). En inglés, traducidas y
  // rotuladas; se busca el nombre en el ORIGINAL en español.
  const palabras         = PALABRAS_RESENA_DESTINO[base.slug];
  const resenasLugar     = palabras
    ? resenasRealesPara(locale).filter((r) => palabras.test(r.original) && (!en || r.traducida))
    : [];
  const tourHref         = toursRelacionados[0] ? localePath(`/tours/${toursRelacionados[0].slug}`, locale) : undefined;
  const comboName        = (slug: string, fallback: string) => {
    const b = DESTINOS_DB.find((d) => d.slug === slug);
    return b ? localizeDestino(b, locale).nombre : fallback;
  };
  const waDestino = en
    ? `Hi, I'd like information about visiting ${destino.nombre} in the Huasteca Potosina.`
    : WA_MESSAGES.destino(destino.nombre);
  const waCorreccion = en
    ? `Hi, I think some information on the ${destino.nombre} page has changed: `
    : `Hola, creo que un dato de la ficha de ${destino.nombre} cambió: `;

  const fotosGaleria = [destino.imagen_hero, ...destino.imagen_galeria].filter(Boolean);
  const altsGaleria  = altsGaleriaDestino(destino, fotosGaleria, locale);
  const allImages    = fotosGaleria.map((src, i) => ({ src, alt: altsGaleria[i] }));

  const mapsUrl  = `https://www.google.com/maps/search/${encodeURIComponent(destino.nombre + " " + destino.zona + " San Luis Potosí")}/@${destino.lat},${destino.lng},13z`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${destino.lng - 0.08},${destino.lat - 0.06},${destino.lng + 0.08},${destino.lat + 0.06}&layer=mapnik&marker=${destino.lat},${destino.lng}`;

  // El agua hoy: solo donde hay agua de por medio.
  const conAgua = atr.nado !== "no" || atr.categorias.some((c) => c === "cascadas" || c === "pozas" || c === "aventura");
  const recogidaTexto = salidas.length ? salidas.join(" · ") : undefined;
  const comparable = tourPrincipal
    ? { tour: tourPrincipal, precioTexto: precioConUnidad(tourPrincipal, locale), recogida: recogidaTexto }
    : undefined;
  const cercano = !tourPrincipal && toursCercanos[0]
    ? { tour: toursCercanos[0], precioTexto: precioConUnidad(toursCercanos[0], locale) }
    : undefined;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageViewTracker
        event="DESTINO_PAGE_VIEW"
        data={{
          destino:  base.slug,
          nombre:   base.nombre,
          zona:     base.zona,
          tourSlug: tourPrincipal?.slug,
          conTour:  tourPrincipal ? "incluye" : toursCercanos.length ? "cerca" : "ninguno",
        }}
      />
      <main className="min-h-screen">

        {/* ── HERO ──
            `hero-bajo-menu`: arranca justo debajo del menú fijo. Desde el
            20 nov 2026 lleva migas de pan VISIBLES (Inicio › Destinos ›
            municipio › lugar) en lugar de «← Todos los destinos». */}
        <div className="hero-bajo-menu relative min-h-[60vh] flex flex-col justify-end overflow-hidden">
          {destino.imagen_hero ? (
            <>
              <Image src={destino.imagen_hero} alt={altsGaleria[0]} fill priority className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/60 to-transparent" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-40"
                style={{ backgroundImage: "linear-gradient(to bottom, rgb(14 23 16 / 0.7), rgb(14 23 16 / 0))" }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-verde-profundo to-verde-bosque" />
          )}

          <div className="relative z-10 px-6 md:px-20 py-14">
            <MigasDestino destino={destino} locale={locale} />
            <DestinoIcon name={destino.icon} className="w-12 h-12 text-crema/60 mb-4" />
            <h1 className="font-cormorant font-light text-crema mb-3 break-words max-w-full" style={{ fontSize: "clamp(34px,6vw,64px)" }}>
              {destino.nombre}
            </h1>
            <p className="texto-sobre-foto text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4">{destino.zona} · {destino.tipo}</p>
            <p className="text-crema/75 max-w-2xl leading-relaxed text-base mb-5">{destino.descripcion}</p>

            {/* Un solo «Incluido en» arriba (la auditoría pidió quitar el
                segundo): las píldoras de los tours que SÍ lo visitan. */}
            {toursRelacionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {toursRelacionados.map((t) => (
                  <TrackedLink key={t.slug} href={localePath(`/tours/${t.slug}`, locale)}
                    event="DESTINO_TOUR_CLICK"
                    data={{ destino: base.slug, tourSlug: t.slug, tour_name: t.nombre, source: "pildora_hero" }}
                    className="rounded-full inline-flex items-center gap-1.5 bg-verde-selva/80 hover:bg-verde-vivo text-crema text-[9px] tracking-[1.5px] uppercase font-dm px-3 py-1.5 transition-colors">
                    <Map className="w-3 h-3 flex-shrink-0" />
                    {dd.includedIn} {t.nombre} →
                  </TrackedLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 1. RESPUESTA RÁPIDA + EL AGUA HOY ── */}
        <RespuestaRapida destino={destino} guia={guia} locale={locale} waMensaje={waCorreccion} />
        {conAgua && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <EstadoRioFicha en={en} destino={base.slug} />
          </div>
        )}

        {/* ── 2. COSTOS + POR TU CUENTA VS CON TOUR ──
            Va ANTES de la galería por lo mismo que la vieja «banda de
            producto» (10 oct 2026): la galería es un bento largo y el único
            botón al tour quedaba muy abajo. Ahora ese botón vive en la
            comparación honesta, que convierte mejor que esconder la opción
            de ir por tu cuenta. */}
        <CostosYTour destino={destino} guia={guia} locale={locale} comparable={comparable} cercano={cercano} />

        {(allImages.length > 1 || (!destino.imagen_hero && allImages.length > 0)) && (
          <DestinoGallery images={allImages} nombre={destino.nombre} />
        )}

        {narrativa && (
          <div className="max-w-4xl mx-auto px-6 pt-14 pb-2">
            <div className="border-l-2 border-verde-vivo/40 pl-6 py-2">
              <p className="text-crema/75 font-dm text-sm leading-relaxed italic">{narrativa}</p>
            </div>
          </div>
        )}

        {/* ── 3. CÓMO LLEGAR, QUÉ ESPERAR, NIVEL Y SEGURIDAD ── */}
        <ComoLlegar destino={destino} guia={guia} locale={locale} embedUrl={embedUrl} mapsUrl={mapsUrl} />
        <QueEsperarYSeguridad destino={destino} guia={guia} locale={locale} />

        {/* ── 4. TEMPORADAS, DATOS PRÁCTICOS, SERVICIOS ── */}
        {guia && !en && <TemporadasServicios guia={guia} />}
        {!en && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <MejorEpocaWidget
              temporada={destino.temporada_ideal}
              destinoNombre={destino.nombre}
              tourHref={tourHref}
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 pb-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1">
            <h2 className="font-cormorant text-crema text-2xl mb-4">{dd.practicalData}</h2>
            {(
              [
                { Icon: Clock,     label: dd.schedule,     val: (!en && guia?.horario) || destino.horario },
                { Icon: Calendar,  label: dd.daysOpen,     val: destino.dias_abierto },
                { Icon: Sun,       label: dd.bestTime,     val: destino.mejor_hora },
                { Icon: CloudSun,  label: dd.bestSeason,   val: destino.temporada_ideal },
                { Icon: MapPin,    label: etiquetaSalida,  val: salidas },
              ] as { Icon: LucideIcon; label: string; val: string | string[] | undefined }[]
            ).filter(i => i.val?.length).map((item) => (
              <div key={item.label} className="flex gap-3 py-3 border-b border-white/5">
                <item.Icon className="w-4 h-4 flex-shrink-0 text-verde-selva mt-0.5" />
                <div>
                  <div className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-0.5">{item.label}</div>
                  {(Array.isArray(item.val) ? item.val : [item.val]).map((linea) => (
                    <div key={linea} className="text-sm text-crema">{linea}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
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

        {/* ── DÓNDE DORMIR (solo Las Pozas, solo en español) ──
            SEO-10, 19 oct 2026. El jardín no tiene estacionamiento y quien
            llega tarde pierde su turno: dormir sobre el camino es un dato de
            la visita. Enlaces normales (sin nofollow) a las dos páginas del
            hotel que responden «dónde dormir»; no tienen versión en inglés,
            por eso el bloque no sale en /en. 🔴 Sin metros: el sitio dice
            400 m, Google mide ~560 y nadie lo ha medido a pie. */}
        {base.slug === "las-pozas-jardin-surrealista" && locale !== "en" && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <h2 className="font-cormorant text-crema text-xl mb-4">Dónde dormir cerca de Las Pozas</h2>
            <p className="text-crema/70 font-dm text-sm leading-relaxed">
              Para tomar el primer turno sin manejar, duerme sobre el camino al jardín, que no tiene
              estacionamiento: el Hotel Paraíso Encantado está a unos minutos a pie de la entrada (
              <a
                href="https://www.paraisoencantado.com/hotel-cerca-de-las-pozas"
                className="text-lima underline underline-offset-2 hover:text-crema transition-colors"
              >
                dormir junto al jardín
              </a>
              ). Si buscas otras opciones del pueblo, aquí están comparadas:{" "}
              <a
                href="https://www.paraisoencantado.com/hoteles-en-xilitla"
                className="text-lima underline underline-offset-2 hover:text-crema transition-colors"
              >
                hoteles en Xilitla
              </a>
              .
            </p>
          </div>
        )}

        {/* ── 5. RESEÑAS Y PREGUNTAS ── */}
        {/* ── RESEÑAS ── */}
        {(resenasLugar.length > 0 || toursCompletos.length > 0) && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5">
              <h2 className="font-cormorant text-crema text-xl">
                {dd.travelersSay}
                {/* Aquí iba `dd.resenasEnEspanol` («In their own words
                    (Spanish).»), que solo tenía texto en inglés. Ya no aplica:
                    en /en cada tarjeta trae su traducción rotulada y el
                    original a un clic. En español la cadena es vacía, así que
                    quitarla no cambia nada allá. */}
              </h2>
              {/* La cifra es de la OPERADORA, no del lugar, y se dice con su
                  nombre: junto al nombre del destino se leía como la nota de
                  Maps de Tamtoc o de Tamul (`src/lib/resenas.ts` prohíbe
                  atribuirla por destino). Enlaza al perfil donde se comprueba. */}
              <a
                href={GOOGLE_PERFIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-start sm:items-end gap-1"
              >
                <span className="text-[9px] tracking-[2px] uppercase font-dm text-crema/45">
                  {locale === "en" ? "Tours Huasteca Potosina rating" : "Calificación de Tours Huasteca Potosina"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-dorado text-dorado" />)}</span>
                  <span className="text-dorado font-dm text-sm font-medium group-hover:underline underline-offset-2">{resenasTexto(locale === "en")}</span>
                </span>
              </a>
            </div>
            {/* Solo reseñas REALES de Google que nombran el lugar
                (`PALABRAS_RESENA_DESTINO`); en inglés, con su traducción
                rotulada y el original a un clic. Sin coincidencia, no hay citas:
                la calificación del negocio y el enlace al perfil. */}
            {resenasLugar.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {resenasLugar.map((r) => (
                  <div key={r.autor} className="rounded-xl border border-white/10 bg-negro/30 p-4">
                    <div className="flex gap-0.5 mb-2">{[...Array(r.estrellas)].map((_,i) => <Star key={i} className="w-3 h-3 fill-dorado text-dorado" />)}</div>
                    <p className="text-crema/65 font-dm text-xs leading-relaxed italic mb-2">&ldquo;{r.texto}&rdquo;</p>
                    {r.traducida && (
                      <>
                        <p className="text-[9px] tracking-[1px] uppercase text-crema/35 font-dm mb-1">{ROTULO_TRADUCCION.traducida}</p>
                        <details className="mb-3">
                          <summary className="cursor-pointer text-[10px] font-dm text-verde-vivo hover:text-lima transition-colors">
                            {ROTULO_TRADUCCION.verOriginal}
                          </summary>
                          <p lang="es" className="mt-2 text-crema/50 font-dm text-xs leading-relaxed italic">&ldquo;{r.original}&rdquo;</p>
                        </details>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="flex-shrink-0">
                        <AvatarResena autor={r.autor} foto={r.foto} className="w-7 h-7" />
                      </span>
                      <div>
                        <p className="font-dm text-xs text-crema/80 font-medium leading-none">{r.autor}</p>
                        <p className="text-[9px] text-crema/35 font-dm">{locale === "en" ? `${r.fecha} · Google review` : `${r.fecha} · Reseña de Google`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-dm text-sm text-crema/55">
                {locale === "en"
                  ? "We only quote real Google reviews that mention this place. Read all of them on our profile."
                  : "Solo citamos reseñas reales de Google que mencionan este lugar. Léelas todas en nuestro perfil."}
              </p>
            )}
          </div>
        )}

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
                  <div className="px-5 pb-5 border-t border-white/10 pt-4">
                    <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.respuesta}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ── GUÍA A FONDO ──
            La ficha y su artículo del blog competían por la misma consulta. En
            vez de canonicalizar (el artículo tiene el doble de texto y es el que
            Google posiciona), cada una conserva su intención y se enlazan: aquí
            los datos prácticos, allá el desarrollo largo. */}
        {guiasBlog ? (
          <div className="max-w-4xl mx-auto px-6 pb-12 space-y-3">
            {guiasBlog.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="rounded-xl group flex items-center justify-between gap-4 border border-white/10 bg-negro/30 px-5 py-4 hover:border-lima/40 transition-colors"
              >
                <span>
                  <span className="block text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-1">{g.rotulo}</span>
                  <span className="font-cormorant text-crema text-lg font-light group-hover:text-lima transition-colors">{g.ancla}</span>
                </span>
                <span className="text-verde-vivo text-xl leading-none flex-shrink-0" aria-hidden>→</span>
              </Link>
            ))}
          </div>
        ) : guiaHref && (
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <Link
              href={guiaHref}
              className="rounded-xl group flex items-center justify-between gap-4 border border-white/10 bg-negro/30 px-5 py-4 hover:border-lima/40 transition-colors"
            >
              <span>
                <span className="block text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-1">
                  {locale === "en" ? "In-depth guide" : "Guía a fondo"}
                </span>
                <span className="font-cormorant text-crema text-lg font-light group-hover:text-lima transition-colors">
                  {locale === "en"
                    ? `Complete guide to ${destino.nombre}`
                    : `Guía completa de ${destino.nombre}`}
                </span>
              </span>
              <span className="text-verde-vivo text-xl leading-none flex-shrink-0" aria-hidden>→</span>
            </Link>
          </div>
        )}

        {/* ── 6. TOURS QUE LO INCLUYEN, CERCA DE AQUÍ, FUENTES, CORREO ── */}
        {/* ── TOURS RELACIONADOS ── */}
        {toursCompletos.length > 0 ? (
          <div className="bg-verde-selva/20 border-t border-verde-vivo/20 py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="font-cormorant text-crema text-3xl mb-3">
                {dd.toursThatInclude} <em className="text-dorado">{destino.nombre}</em>
              </h2>
              <p className="text-crema/50 text-sm mb-10 font-dm max-w-md mx-auto">{dd.bookOrAsk}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
                {toursCompletos.map((tour) => {
                  const clic = { destino: base.slug, tourSlug: tour.slug, tour_name: tour.nombre, amount: tour.precio, source: "tarjeta_destino" };
                  return (
                  <div key={tour.slug} className="rounded-2xl border border-white/10 bg-negro/60 overflow-hidden text-left">
                    {/* La tarjeta solo llevaba al carrito y a WhatsApp: quien
                        quería ver el itinerario antes de pagar no tenía por
                        dónde. Foto, tipo y nombre son UN solo enlace a la ficha
                        (medido): con la foto como enlace aparte, sin medir, se
                        perdían los clics en la zona más grande de la tarjeta.
                        🔴 10 nov 2026: la foto iba con alt vacío («el nombre ya
                        nombra el enlace») y la auditoría la contó como imagen
                        de contenido sin texto en las 17 fichas que tienen tour.
                        Ahora dice qué es —la foto del recorrido—, sin inventar
                        qué se ve en ella. El botón de reservar se queda tal cual. */}
                    <TrackedLink
                      href={localePath(`/tours/${tour.slug}`, locale)}
                      event="DESTINO_TOUR_CLICK"
                      data={clic}
                      className="group block"
                    >
                      {tour.imagen_hero && (
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={tour.imagen_hero}
                            alt={locale === "en" ? `Tour photo: ${tour.nombre}` : `Foto del recorrido: ${tour.nombre}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
                        </div>
                      )}
                      <div className="px-5 pt-5">
                        <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{tour.tipo}</p>
                        <h3 className="font-cormorant text-crema text-base leading-snug group-hover:text-lima transition-colors">
                          {tour.nombre}
                        </h3>
                      </div>
                    </TrackedLink>
                    <div className="px-5 pb-5 pt-3">
                      <div className="flex items-end justify-between gap-3 mb-4">
                        <p className="font-cormorant text-dorado text-xl leading-none">
                          {llevaDesde(tour) && (
                            <span className="font-dm text-[10px] text-crema/40 mr-1">{getDict(locale).common.desde}</span>
                          )}
                          {money(tour.precio)}
                          <span className="font-dm text-[10px] text-crema/40 ml-1">MXN {etiquetaUnidad(tour, locale === "en")}</span>
                        </p>
                        <TrackedLink
                          href={localePath(`/tours/${tour.slug}`, locale)}
                          event="DESTINO_TOUR_CLICK"
                          data={clic}
                          className="flex-shrink-0 text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors"
                        >
                          {verTour}
                        </TrackedLink>
                      </div>
                      <div className="space-y-2">
                        <Link href={localePath(`/reservar/carrito?agregar=${tour.slug}`, locale)}
                          className="rounded-xl flex items-center justify-center gap-2 w-full bg-verde-selva hover:bg-verde-vivo text-crema py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors">
                          <Lock className="w-3 h-3" />{dd.bookWithCard}
                        </Link>
                        <a href={waLink(waDestino)} target="_blank" rel="noopener noreferrer"
                          className="rounded-xl flex items-center justify-center gap-2 w-full border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                          {dd.askWhatsapp}
                        </a>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              <p className="mt-8 text-[10px] text-crema/35 font-dm flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3" /> {dd.replyUnder1h}
              </p>

              {toursCercanos.length > 0 && (
                <div className="max-w-2xl mx-auto mt-14 pt-10 border-t border-white/10">
                  <h3 className="font-cormorant text-crema text-2xl mb-2">
                    {locale === "en" ? "Also in the area" : "También en la zona"}
                  </h3>
                  {/* No es `dd.nearbyIntro`: esa frase dice "no visitamos X
                      dentro de un tour", y aquí justo arriba hay uno que sí. */}
                  <p className="text-crema/50 text-sm mb-6 font-dm">
                    {locale === "en"
                      ? "Other tours that run in the same area and combine well on the same trip:"
                      : "Otros recorridos que operamos en la misma zona y que se combinan en el mismo viaje:"}
                  </p>
                  <RejillaCercanos tours={toursCercanos} locale={locale} dd={dd} />
                  <p className="text-[10px] text-crema/35 font-dm mt-5">{dd.combineWhatsapp}</p>
                </div>
              )}
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
                <RejillaCercanos tours={toursCercanos} locale={locale} dd={dd} />
                <p className="text-[10px] text-crema/35 font-dm mt-5">{dd.combineWhatsapp}</p>
              </div>
            )}

            <p className="text-crema/50 text-sm mb-8 font-dm max-w-md mx-auto">{dd.writeWhatsapp}</p>

            {/* El catálogo del motor, antes que WhatsApp: quien llega aquí desde
                Google no tiene por qué abrir una conversación para ver qué se
                puede reservar y a qué precio. */}
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              <Link
                href={localePath("/reservar", locale)}
                className="rounded-xl inline-flex items-center gap-2.5 bg-dorado hover:bg-terracota text-negro hover:text-crema px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
              >
                <Lock className="w-4 h-4 flex-shrink-0" />
                {dd.verTodosYReservar}
              </Link>
            <a href={waLink(waDestino)} target="_blank" rel="noopener noreferrer"
              className="rounded-xl inline-flex items-center gap-2.5 border border-[#25D366]/50 hover:border-[#25D366] text-[#25D366] px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
              {dd.bookViaWhatsapp}
            </a>
            </div>
            <p className="text-[10px] text-crema/35 font-dm flex items-center justify-center gap-1.5">
              <Zap className="w-3 h-3" /> {dd.replyUnder1h}
            </p>
          </div>
        )}

        {/* El viaje desde la CDMX: estaba arriba, antes de cualquier dato del
            lugar; la auditoría lo bajó junto a los tours (20 nov 2026). */}
        {DESTINOS_DEL_VIAJE_CDMX[destino.slug] && (
          <div className="max-w-4xl mx-auto px-6 pt-12">
            {en
              ? <TarjetaViajeCdmx origen={`destino-${destino.slug}-en`} locale="en" titulo="In Mexico City? It's on our weekend trip, all included" />
              : <TarjetaViajeCdmx origen={`destino-${destino.slug}`} titulo={DESTINOS_DEL_VIAJE_CDMX[destino.slug]} />}
          </div>
        )}

        <div className="pt-14">
          <CercaDeAqui destino={destino} locale={locale} />
        </div>
        {guia && !en && <FuentesDestino guia={guia} />}

        {/* ── CAPTURA DE CORREO ──
            Las páginas de destino son el grueso del tráfico orgánico y hasta
            ahora no capturaban un solo correo: el recomendador es el único
            formulario del sitio y casi nadie lo encuentra. (ES por ahora: el
            itinerario que se envía está escrito en español.) */}
        {locale !== "en" && (
          <div className="max-w-4xl mx-auto px-6">
            <BlogNewsletterInline
              fuente={`Destino: ${base.nombre}`}
              tourSlug={(tourPrincipal ?? toursCercanos[0])?.slug}
            />
          </div>
        )}

        {/* ── CROSS-SELL ── */}
        {combinaciones.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 py-12 border-t border-white/5">
            <p className="text-[9px] tracking-[3px] uppercase text-crema/35 font-dm mb-3">{dd.alsoInclude(destino.nombre)}</p>
            <div className="flex flex-wrap gap-3">
              {combinaciones.map((c) => (
                <Link key={c.slug} href={localePath(`/destinos/${c.slug}`, locale)}
                  className="rounded-xl border border-verde-selva/30 bg-verde-selva/10 hover:bg-verde-selva/15 text-crema/75 hover:text-crema font-dm text-xs px-4 py-2.5 transition-all flex items-center gap-1.5">
                  <span className="text-verde-vivo text-sm">→</span>
                  {comboName(c.slug, c.nombre)}
                </Link>
              ))}
              {locale !== "en" && (
                <Link href="/recomendar"
                  className="rounded-xl border border-dorado/30 bg-dorado/10 hover:bg-dorado/15 text-dorado/75 hover:text-dorado font-dm text-xs px-4 py-2.5 transition-all flex items-center gap-1.5">
                  {dd.createItinerary}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Barra móvil de reserva. En /tours/[slug] es el CTA que más convierte
            (todos los "INICIÓ RESERVA" del log salieron de ahí) y vivía en una
            sola plantilla.
            🔴 10 oct 2026 — antes solo se montaba si había un tour que SÍ visita
            el destino, «para no prometer un itinerario que no existe». El efecto
            real: 23 de los 41 destinos se quedaban sin NINGÚN CTA persistente.
            Con el tour de la zona la promesa sigue siendo honesta —la banda de
            arriba dice que no lo visitamos y que se puede combinar— y el teléfono
            deja de ser un callejón sin salida. */}
        {(tourPrincipal ?? toursCercanos[0]) && (() => {
          const t = tourPrincipal ?? toursCercanos[0];
          return (
            <>
              <MobileBookingBar
                tourSlug={t.slug}
                precio={t.precio}
                tourId={t.id}
                tourName={t.nombre}
                precioUnidad={t.precioUnidad}
                waHref={waLink(waDestino)}
                source="destino_bar"
                etiqueta={t.nombreCorto || t.nombre}
              />
              <div className="h-20 lg:hidden" aria-hidden="true" />
            </>
          );
        })()}
      </main>
    </>
  );
}
