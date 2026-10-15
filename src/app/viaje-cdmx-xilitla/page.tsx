import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Bus, BedDouble, Coffee, Waves, Landmark, ShieldCheck, Check, MapPin, Clock, Star, X } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { tiempoDesde } from "@/lib/tiemposDeViaje";
import { SITE } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, buildBreadcrumbNode, ORG_REF } from "@/lib/jsonld";
import { GOOGLE_PERFIL_URL, resenasTexto } from "@/lib/resenas";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import { logger } from "@/lib/logger";
import { salidasPublicas, pruebaSocial, type SalidaVista } from "@/lib/viajeCdmx/salidas";
import { diaMX, fechaLarga, pesos, rangoCorto, rangoLargo } from "@/lib/viajeCdmx/precio";
import {
  ANTICIPO_PCT, CORTE_DIAS_ANTES, DIAS, HORA_CITA, HORA_LLEGADA, HORA_REGRESO, HORA_SALIDA, INCLUIDO, INCLUYE,
  ITINERARIO, LIDER_PERSONAS, NO_INCLUYE, NOCHES, PUNTO_SALIDA, QUE_LLEVAR, SALIDA_TEXTO, VIAJE_NOMBRE, VIAJE_RUTA,
  mensajeWhatsApp, preguntasFrecuentes, type Incluido,
} from "@/lib/viajeCdmx/config";
import { RESENAS_VIAJE } from "@/lib/viajeCdmx/resenas";
import { ReservaViaje } from "@/components/viajeCdmx/ReservaViaje";
import { FormLider } from "@/components/viajeCdmx/FormLider";
import { MapaPunto } from "@/components/viajeCdmx/MapaPunto";
import { BarraViaje } from "@/components/viajeCdmx/BarraViaje";
import { BotonWhatsApp } from "@/components/viajeCdmx/BotonWhatsApp";

/**
 * /viaje-cdmx-xilitla — la salida grupal mensual desde CDMX (15 oct 2026).
 *
 * 🔴 Siempre en vivo, sin caché: los lugares y el precio de cada fecha salen
 * de la base en cada visita, y la preventa termina a una hora fija. Con ISR la
 * página podría enseñar un precio que el cobro ya no acepta.
 *
 * Solo en español: el público son anuncios en CDMX. Lo que dice el viaje
 * (itinerario, qué incluye, fotos) vive en `lib/viajeCdmx/config.ts`.
 *
 * Las fotos son lo que vende (Manolo, 15 oct): todas reales, de las fichas de
 * los recorridos y del hotel. Abajo del pliegue van en diferido.
 */
export const dynamic = "force-dynamic";

const URL_VIAJE = `${SITE}${VIAJE_RUTA}`;
/**
 * La foto más impresionante de Tamul que tenemos (Manolo, 15 oct: «la imagen
 * más impresionante de la cascada»): la caída de 105 m con arcoíris, real, de
 * la galería del tour. La cascada queda a la IZQUIERDA del encuadre, así que en
 * escritorio el texto va a la derecha para no taparla.
 */
const HERO = "/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg";

/** Una sola lectura por visita: la comparten los metadatos y la página. */
const cargar = cache(async (): Promise<{ salidas: SalidaVista[]; estaSemana: number; yaViajaron: number; ok: boolean }> => {
  try {
    const [salidas, social] = await Promise.all([salidasPublicas(), pruebaSocial()]);
    return { salidas, ...social, ok: true };
  } catch (e) {
    // Sin base, la página sigue en pie: sin fechas y con la lista de espera.
    logger.error("viaje_cdmx_pagina_sin_datos", { reason: e instanceof Error ? e.message : String(e) });
    return { salidas: [], estaSemana: 0, yaViajaron: 0, ok: false };
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const { salidas, ok } = await cargar();
  const title = "Viaje a Xilitla desde CDMX · Tamul, Las Pozas y 2 noches de hotel";
  const description =
    "Salida grupal cada mes desde el Ángel de la Independencia: transporte redondo, 2 noches en el Hotel Paraíso Encantado, " +
    `3 desayunos, la Ruta Surrealista y la Expedición Tamul con guía. Aparta tu lugar con el ${ANTICIPO_PCT} %.`;
  return {
    title,
    description,
    alternates: { canonical: URL_VIAJE },
    // La imagen sale de `opengraph-image.tsx` (sin precios ni lugares: Facebook
    // la guarda y una cifra vieja ahí sería urgencia falsa). Por eso aquí NO va
    // `images`: en Next 14 lo de la página le gana al archivo.
    openGraph: {
      title: "Fin de semana en Xilitla desde CDMX",
      description: "Salida grupal cada mes · transporte, 2 noches de hotel, 3 desayunos, Tamul y Las Pozas. Todo incluido.",
      url: URL_VIAJE,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    // Mientras no haya ninguna fecha publicada, fuera del índice: una página de
    // venta sin nada que vender no debe ser lo que Google enseñe.
    ...(ok && salidas.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

function esquema(salidas: SalidaVista[]) {
  const disponibilidad = (s: SalidaVista) =>
    s.estado === "agotado" ? "https://schema.org/SoldOut"
      : s.estado === "proxima" ? "https://schema.org/PreOrder"
        : s.estado === "ultimos" ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/InStock";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        "@id": `${URL_VIAJE}#viaje`,
        name: `${VIAJE_NOMBRE}: salida grupal mensual`,
        description: `Viaje de fin de semana desde el Ángel de la Independencia (CDMX) a Xilitla, San Luis Potosí: transporte redondo, ${NOCHES} noches en el Hotel Paraíso Encantado, 3 desayunos en El Papán Huasteco, la Ruta Surrealista con Las Pozas de Edward James y la Expedición Tamul.`,
        url: URL_VIAJE,
        image: `${SITE}${HERO}`,
        touristType: ["Viajeros de la Ciudad de México", "Grupos de amigos", "Viajeros solos"],
        provider: ORG_REF,
        itinerary: {
          "@type": "ItemList",
          itemListElement: ITINERARIO.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `${d.diaSemana}: ${d.titulo}` })),
        },
        ...(salidas.length
          ? {
              offers: salidas.map((s) => ({
                "@type": "Offer",
                name: rangoLargo(s.fechaSalida, s.fechaRegreso),
                price: s.precioVigente,
                priceCurrency: "MXN",
                availability: disponibilidad(s),
                validFrom: s.abreEl,
                priceValidUntil: (s.enPreventa && s.finPreventa ? s.finPreventa : s.fechaCorte).slice(0, 10),
                url: `${URL_VIAJE}?fecha=${s.fechaSalida}`,
                seller: ORG_REF,
              })),
            }
          : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: preguntasFrecuentes().map((f) => ({
          "@type": "Question",
          name: f.pregunta,
          acceptedAnswer: { "@type": "Answer", text: f.respuesta },
        })),
      },
      buildBreadcrumbNode([{ name: VIAJE_NOMBRE, path: VIAJE_RUTA }]),
    ],
  };
}

const ICONO: Record<Incluido["icono"], LucideIcon> = {
  bus: Bus, cama: BedDouble, desayuno: Coffee, pozas: Landmark, tamul: Waves, escudo: ShieldCheck,
};

/** Dónde duermes y desayunas: el hotel y su restaurante, en fotos. */
const HOTEL_FOTOS = [
  { src: "/imagenes/hotel-paraiso-encantado/gallery-4.jpg", alt: "Terraza con vista a la sierra en el Hotel Paraíso Encantado", grande: true },
  { src: "/imagenes/hotel-paraiso-encantado/habitaciones/lirios-1.jpg", alt: "Habitación del Hotel Paraíso Encantado" },
  { src: "/imagenes/hotel-paraiso-encantado/habitaciones/flor-de-liz-2.jpg", alt: "Balcón de una habitación con vista a la selva" },
  { src: "/imagenes/papan-huasteco/fogon-de-lena.jpg", alt: "El fogón de leña de El Papán Huasteco" },
  { src: "/imagenes/papan-huasteco/platillos.jpg", alt: "Platillos huastecos de El Papán Huasteco" },
];

/** La galería: lo mejor de los dos recorridos, sin repetir lo que ya salió arriba. */
const GALERIA = [
  { src: "/imagenes/tours/tamul/grupo-frente-a-tamul.jpg", alt: "Un grupo de viajeros frente a la cascada de Tamul" },
  { src: "/imagenes/tours/tamul/canoas-guerra-de-agua.jpg", alt: "Guerra de agua entre canoas en el río Tampaón" },
  { src: "/imagenes/tours/edward-james/las-pozas-poza-bajo-la-cascada.jpg", alt: "Poza bajo una cascada entre las esculturas de Las Pozas" },
  { src: "/imagenes/tours/tamul/cueva-del-agua-poza-azul.jpg", alt: "La poza azul de la Cueva del Agua" },
  { src: "/imagenes/tours/edward-james/las-pozas-manos-gigantes.jpg", alt: "Las manos gigantes de concreto en Las Pozas" },
  { src: "/imagenes/tours/tamul/viajera-frente-a-tamul.jpg", alt: "Viajera con chaleco frente a la cascada de Tamul" },
  { src: "/imagenes/tours/edward-james/nacimiento-huichihuayan-agua-cristalina.jpg", alt: "Nadando en el agua cristalina del Nacimiento de Huichihuayán" },
  { src: "/imagenes/castillo-de-la-salud/hero.jpg", alt: "Pareja entre los muros de colores del Castillo de la Salud" },
  { src: "/imagenes/tours/tamul/asomado-al-sotano-huahuas.jpg", alt: "Viajero asomado al Sótano de las Huahuas" },
  { src: "/imagenes/tours/edward-james/las-pozas-esculturas-azules.jpg", alt: "Esculturas de columnas azules en Las Pozas" },
];

const etiquetaSeccion = "text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm";

export default async function Page({ searchParams }: { searchParams: { lider?: string; fecha?: string } }) {
  const { salidas, estaSemana, yaViajaron } = await cargar();
  const vendibles = salidas.filter((s) => s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos");
  const proxima = vendibles[0] ?? null;
  const desde = vendibles.length ? Math.min(...vendibles.map((s) => s.precioVigente)) : null;
  const preventaProxima = proxima?.enPreventa && proxima.finPreventa ? proxima : null;
  const lider = typeof searchParams.lider === "string" && /^[A-Za-z0-9]{3,20}$/.test(searchParams.lider) ? searchParams.lider.toUpperCase() : null;
  const fecha = typeof searchParams.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha) ? searchParams.fecha : null;
  const faqs = preguntasFrecuentes();
  const horasCamino = tiempoDesde("cdmx")?.autoXilitla ?? "7 h";

  return (
    <main id="main-content" className="min-h-screen bg-negro pb-24 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd("es")) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(esquema(salidas)) }} />

      {/* ── HERO ── La foto arriba y el texto debajo en el celular: sobre la foto, el precio se perdía. */}
      <section data-hero-viaje className="relative lg:min-h-[640px] lg:flex lg:items-end">
        <div className="relative h-[44vh] min-h-[280px] lg:absolute lg:inset-0 lg:h-auto">
          <Image src={HERO} alt="La cascada de Tamul cae 105 metros al río turquesa, con un arcoíris en la brisa" fill priority sizes="100vw" className="object-cover object-[28%_50%] lg:object-[20%_50%]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,23,16,0.15)_0%,rgba(14,23,16,0)_70%,#0e1710_100%)] lg:bg-[linear-gradient(270deg,#0e1710_0%,rgba(14,23,16,0.86)_42%,rgba(14,23,16,0.05)_100%)]" />
        </div>
        <div className="relative px-4 sm:px-6 pt-2 pb-12 lg:pt-36 lg:pb-20 w-full max-w-6xl mx-auto">
          <div className="max-w-xl lg:ml-auto">
            <p className={etiquetaSeccion}>Salida grupal cada mes desde CDMX</p>
            <h1 className="font-cormorant font-light text-crema leading-[1.05] mb-4" style={{ fontSize: "clamp(38px,7vw,68px)" }}>
              Xilitla y la Huasteca, <em className="text-dorado">todo incluido</em>
            </h1>
            <p className="text-crema/80 font-dm text-[15px] leading-relaxed mb-5">
              Sales {SALIDA_TEXTO} del Ángel de la Independencia y despiertas en Xilitla. {NOCHES} noches en el Hotel Paraíso Encantado,
              3 desayunos en El Papán Huasteco, la Ruta Surrealista con Las Pozas de Edward James y la Expedición Tamul.
            </p>

            {proxima ? (
              <div className="border border-white/15 bg-negro/60 backdrop-blur-sm p-4 mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-dm text-crema/60 text-xs uppercase tracking-[1.5px]">Próxima salida</p>
                  <p className="font-dm text-crema/60 text-xs">
                    Quedan <strong className="text-crema">{proxima.disponibles}</strong> de {proxima.capacidad} lugares
                  </p>
                </div>
                <p className="font-cormorant text-crema text-2xl mt-1">{rangoLargo(proxima.fechaSalida, proxima.fechaRegreso)}</p>
                <p className="font-dm text-crema mt-1">
                  {/* El precio de ESTA fecha, no el «desde» de todas: con otra fecha en preventa, el «desde» le ponía a la próxima un precio que no es el suyo. */}
                  <span className="font-cormorant text-dorado text-3xl">{pesos(proxima.precioVigente)}</span> <span className="text-xs text-crema/55">por persona, todo incluido</span>
                </p>
                {preventaProxima && (
                  <p className="text-xs font-dm text-dorado/90 mt-1">Precio de preventa hasta el {diaMX(preventaProxima.finPreventa!)}; después, {pesos(preventaProxima.precio)}.</p>
                )}
              </div>
            ) : (
              <p className="font-dm text-crema/70 text-sm mb-6 border-l-2 border-dorado pl-3">
                Las próximas fechas abren muy pronto. Anótate y te avisamos con el precio de preventa.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#fechas" data-cta-viaje className="inline-flex items-center justify-center min-h-[52px] px-8 bg-dorado text-negro hover:bg-crema text-[12px] tracking-[2px] uppercase font-dm transition-colors">
                {proxima ? "Apartar mi lugar" : "Avísame de las fechas"}
              </a>
              <BotonWhatsApp
                href={waLink(mensajeWhatsApp(proxima ? rangoLargo(proxima.fechaSalida, proxima.fechaRegreso) : undefined))}
                boton="hero"
                className="inline-flex items-center justify-center min-h-[52px] px-8 border border-white/25 text-crema hover:bg-white/10 text-[12px] tracking-[2px] uppercase font-dm transition-colors"
              >
                Preguntar por WhatsApp
              </BotonWhatsApp>
            </div>
            <p className="mt-4 text-[11px] font-dm text-crema/45">Apartas con el {ANTICIPO_PCT} % · el resto, antes de salir · {resenasTexto()}</p>
          </div>
        </div>
      </section>

      {/* ── TODO LO INCLUIDO ── Lo primero después del hero: lo que vende es saber qué te llevas por el precio. */}
      <section id="incluye" className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-14 scroll-mt-20">
        <div className="text-center mb-8">
          <p className={etiquetaSeccion}>Un solo precio</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>
            Todo esto ya está <em className="text-dorado">incluido</em>
          </h2>
          <p className="text-sm text-crema/60 font-dm mt-2">Tú solo llegas al Ángel con tu maleta. Del resto nos encargamos.</p>
        </div>
        {/* Dos columnas también en el celular: seis tarjetas a lo ancho eran casi tres pantallas antes de llegar a las fechas. */}
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {INCLUIDO.map((x) => {
            const Icono = ICONO[x.icono];
            return (
              <li key={x.titulo} className="relative overflow-hidden border border-white/10 bg-negro/40 group">
                <div className="relative aspect-[4/3] sm:aspect-[16/10]">
                  <Image src={x.foto} alt={x.alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 50vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/85 via-negro/10 to-transparent" />
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 inline-flex items-center gap-1 bg-verde-vivo text-negro text-[9px] sm:text-[10px] tracking-[1.5px] sm:tracking-[2px] uppercase font-dm px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Incluido
                  </span>
                </div>
                <div className="p-3 sm:p-5">
                  <p className="font-cormorant text-crema text-lg sm:text-2xl leading-tight mb-1 sm:mb-1.5 flex items-start gap-1.5 sm:gap-2">
                    <Icono className="w-4 h-4 sm:w-5 sm:h-5 text-dorado shrink-0 mt-0.5 sm:mt-1" aria-hidden="true" /> {x.titulo}
                  </p>
                  <p className="text-xs sm:text-sm font-dm text-crema/65 leading-relaxed">{x.detalle}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 grid md:grid-cols-3 gap-6 border border-white/10 bg-verde-profundo/25 p-5 sm:p-7">
          <div className="md:col-span-2">
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4 font-dm">La lista completa</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {INCLUYE.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm text-crema/80 font-dm leading-relaxed">
                  <Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />{x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-4 font-dm">Lo único que pagas aparte</p>
            <ul className="space-y-2.5">
              {NO_INCLUYE.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[13px] text-crema/55 font-dm leading-relaxed">
                  <X className="w-3.5 h-3.5 text-crema/35 shrink-0 mt-1" aria-hidden="true" />{x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CALENDARIO Y APARTADO ── */}
      <ReservaViaje salidasIniciales={salidas} estaSemana={estaSemana} liderInicial={lider} fechaInicial={fecha} />

      {/* ── ITINERARIO ── */}
      <section id="itinerario" className="max-w-4xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <p className={etiquetaSeccion}>Día por día</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            Tus {DIAS} días en <em className="text-dorado">Xilitla</em>
          </h2>
          <p className="text-sm text-crema/60 font-dm mt-2">
            Sales el viernes a la medianoche y llegas el sábado a las {HORA_LLEGADA}. Regresas el lunes por la tarde.
          </p>
        </div>
        <ol className="space-y-6">
          {ITINERARIO.map((d) => (
            <li key={d.dia} className="border border-white/10 bg-negro/40 overflow-hidden">
              <div className="relative aspect-[16/9] sm:aspect-[21/9]">
                <Image src={d.foto} alt={d.alt} fill className="object-cover" sizes="(max-width: 896px) 100vw, 896px" />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="inline-block bg-dorado text-negro text-[10px] tracking-[2px] uppercase font-dm px-2.5 py-1 mb-2">Día {d.dia} · {d.diaSemana}</span>
                  <h3 className="font-cormorant text-crema text-3xl leading-tight">{d.titulo}</h3>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <ul className="space-y-2.5">
                  {d.momentos.map((mo, i) => (
                    <li key={i} className="flex gap-3 text-sm font-dm leading-relaxed">
                      <span className="w-[88px] shrink-0 text-dorado/90 tabular-nums whitespace-nowrap">{mo.hora ?? ""}</span>
                      <span className={mo.incluido ? "text-crema/85" : "text-crema/55"}>
                        {mo.texto}
                        {mo.incluido && (
                          <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px] tracking-[1.5px] uppercase text-verde-vivo">
                            <Check className="w-3 h-3" aria-hidden="true" />incluido
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-2 mt-5">
                  {d.fotos.map((f) => (
                    <div key={f.src} className="relative aspect-square overflow-hidden">
                      <Image src={f.src} alt={f.alt} fill className="object-cover" sizes="(max-width: 640px) 33vw, 290px" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs font-dm text-crema/40 mt-4 text-center">Las horas son aproximadas: el camino y el clima mandan.</p>
      </section>

      {/* ── DÓNDE DUERMES Y DESAYUNAS ── */}
      <section className="bg-verde-profundo/25 border-y border-white/5 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-8 items-center">
          <div>
            <p className={etiquetaSeccion}>Dónde duermes y desayunas</p>
            <h2 className="font-cormorant font-light text-crema text-4xl leading-tight mb-4">
              Hotel Paraíso Encantado y <em className="text-dorado">El Papán Huasteco</em>
            </h2>
            <ul className="space-y-3 text-sm font-dm text-crema/75">
              <li className="flex gap-2.5"><Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />{NOCHES} noches en el hotel, el sábado y el domingo.</li>
              <li className="flex gap-2.5"><Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />A {HOTEL_PROPIO.minutosCaminando} minutos caminando de Las Pozas, en {HOTEL_PROPIO.zona}.</li>
              <li className="flex gap-2.5"><Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />Los 3 desayunos en {HOTEL_PROPIO.restaurante}, el restaurante del hotel, con cocina de fogón.</li>
              <li className="flex gap-2.5"><Check className="w-4 h-4 text-verde-vivo shrink-0 mt-0.5" aria-hidden="true" />El hotel es nuestro.</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {HOTEL_FOTOS.map((f) => (
              <div key={f.src} className={`relative overflow-hidden ${f.grande ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                <Image src={f.src} alt={f.alt} fill className="object-cover" sizes={f.grande ? "(max-width: 1024px) 100vw, 640px" : "(max-width: 1024px) 50vw, 320px"} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PUNTO DE SALIDA ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className={etiquetaSeccion}>Punto de salida</p>
            <h2 className="font-cormorant font-light text-crema text-3xl mb-4">Salimos {SALIDA_TEXTO} del {PUNTO_SALIDA.nombre}</h2>
            <ul className="space-y-3 text-sm font-dm text-crema/75">
              <li className="flex gap-3"><MapPin className="w-4 h-4 text-dorado shrink-0 mt-0.5" aria-hidden="true" />{PUNTO_SALIDA.direccion}</li>
              <li className="flex gap-3"><span className="w-4 shrink-0 text-dorado text-center font-medium">M</span>Metro {PUNTO_SALIDA.metro}. Ojo: el metro cierra a la medianoche.</li>
              <li className="flex gap-3"><Clock className="w-4 h-4 text-dorado shrink-0 mt-0.5" aria-hidden="true" />Llega a las {HORA_CITA}: la camioneta sale puntual a la medianoche ({HORA_SALIDA}).</li>
              <li className="flex gap-3"><Bus className="w-4 h-4 text-dorado shrink-0 mt-0.5" aria-hidden="true" />Unas {horasCamino} de camino, de noche: duermes y llegas a desayunar.</li>
              <li className="flex gap-3"><MapPin className="w-4 h-4 text-dorado shrink-0 mt-0.5" aria-hidden="true" />El lunes te dejamos en el mismo punto, alrededor de las {HORA_REGRESO}.</li>
            </ul>
            {PUNTO_SALIDA.mapa && (
              <a href={PUNTO_SALIDA.mapa} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-xs font-dm text-dorado underline underline-offset-4">Abrir en Google Maps</a>
            )}
          </div>
          {PUNTO_SALIDA.lat != null && PUNTO_SALIDA.lng != null && (
            <MapaPunto lat={PUNTO_SALIDA.lat} lng={PUNTO_SALIDA.lng} nombre={PUNTO_SALIDA.nombre} />
          )}
        </div>
      </section>

      {/* ── PRUEBA SOCIAL ── Solo lo real: fotos de nuestros recorridos, la calificación del perfil de Google y,
          cuando existan, reseñas y viajeros de este viaje. */}
      <section className="border-t border-white/5 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className={etiquetaSeccion}>Así se ve</p>
            <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              Lo que vas a <em className="text-dorado">vivir</em>
            </h2>
            <p className="text-sm font-dm text-crema/60 mt-2 inline-flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
              <Star className="w-4 h-4 text-dorado fill-dorado" aria-hidden="true" />
              <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-crema">{resenasTexto()}</a>
              {yaViajaron > 0 && <span>· {yaViajaron} viajeros ya hicieron este viaje</span>}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {GALERIA.map((g, i) => (
              <div key={g.src} className={`relative overflow-hidden ${i === 0 ? "col-span-2 md:col-span-1 aspect-[16/10] md:aspect-square" : "aspect-square"}`}>
                <Image src={g.src} alt={g.alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" loading="lazy" />
              </div>
            ))}
          </div>
          {RESENAS_VIAJE.length > 0 && (
            <ul className="grid md:grid-cols-3 gap-4 mt-10">
              {RESENAS_VIAJE.map((r) => (
                <li key={`${r.autor}-${r.fecha}`} className="border border-white/10 bg-negro/40 p-5">
                  <p className="text-dorado text-sm mb-2" aria-label={`${r.estrellas} de 5 estrellas`}>{"★".repeat(Math.max(1, Math.min(5, r.estrellas)))}</p>
                  <p className="text-sm font-dm text-crema/80 leading-relaxed mb-3">“{r.texto}”</p>
                  <p className="text-xs font-dm text-crema/50">{r.autor} · {r.fecha}{r.salida ? ` · salida ${r.salida}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── ARMA TU GRUPO ── */}
      <section id="grupo" className="relative bg-verde-profundo/30 border-y border-white/5 py-16 px-4 sm:px-6 scroll-mt-20 overflow-hidden">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="relative aspect-[16/10] overflow-hidden mb-6">
              <Image src="/imagenes/tours/tamul/grupo-selfie-frente-a-tamul.jpg" alt="Selfie de un grupo de amigos frente a la cascada de Tamul" fill className="object-cover object-[50%_35%]" sizes="(max-width: 768px) 100vw, 448px" loading="lazy" />
            </div>
            <p className="text-[10px] tracking-[4px] uppercase text-dorado mb-3 font-dm">Para quien organiza</p>
            <h2 className="font-cormorant font-light text-crema text-4xl leading-tight mb-4">
              Arma tu grupo y <em className="text-dorado">viaja gratis</em>
            </h2>
            <p className="text-sm font-dm text-crema/70 leading-relaxed mb-4">
              Junta a tu gente —amigos, familia, compañeros de trabajo— y cuando {LIDER_PERSONAS} personas aparten su lugar con tu liga, tu lugar
              corre por nuestra cuenta.
            </p>
            <ol className="space-y-2 text-sm font-dm text-crema/70">
              <li><span className="text-dorado mr-2">1.</span>Déjanos tus datos y te mandamos tu liga personal.</li>
              <li><span className="text-dorado mr-2">2.</span>Compártela: cada quien aparta y paga su lugar.</li>
              <li><span className="text-dorado mr-2">3.</span>Con {LIDER_PERSONAS} lugares pagados, te confirmamos tu lugar gratis.</li>
            </ol>
          </div>
          <div className="border border-white/10 bg-negro/50 p-5 sm:p-6">
            <FormLider />
          </div>
        </div>
      </section>

      {/* ── QUÉ LLEVAR + PREGUNTAS ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4 font-dm">Qué llevar</p>
        <ul className="flex flex-wrap gap-2 mb-12">
          {QUE_LLEVAR.map((x) => (
            <li key={x} className="text-xs font-dm text-crema/70 border border-white/15 px-3 py-1.5">{x}</li>
          ))}
        </ul>
        <h2 className="font-cormorant font-light text-crema text-3xl mb-6">Preguntas frecuentes</h2>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map((f, i) => (
            <details key={f.pregunta} className="group py-4" open={i === 0}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-dm text-crema text-[15px] min-h-[44px]">
                {f.pregunta}
                <span className="text-dorado text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="text-sm font-dm text-crema/65 leading-relaxed mt-2">{f.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CIERRE ── */}
      <section className="relative border-t border-white/5 py-20 px-4 text-center overflow-hidden">
        <Image src="/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg" alt="" fill className="object-cover opacity-30" sizes="100vw" loading="lazy" aria-hidden="true" />
        <div className="relative">
          <ShieldCheck className="w-8 h-8 text-verde-vivo mx-auto mb-4" aria-hidden="true" />
          <h2 className="font-cormorant font-light text-crema text-4xl mb-3">¿Te vienes?</h2>
          <p className="text-sm font-dm text-crema/75 max-w-md mx-auto mb-6">
            Transporte, hotel, desayunos y dos recorridos con guía, en un solo precio. Apartas con el {ANTICIPO_PCT} %; si la salida no junta
            el grupo a {CORTE_DIAS_ANTES} días de salir, eliges otra fecha o te devolvemos todo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#fechas" className="inline-flex items-center justify-center min-h-[52px] px-8 bg-dorado text-negro hover:bg-crema text-[12px] tracking-[2px] uppercase font-dm transition-colors">
              {proxima ? `Apartar · ${rangoCorto(proxima.fechaSalida, proxima.fechaRegreso)}` : "Avísame de las fechas"}
            </a>
            <BotonWhatsApp
              href={waLink(mensajeWhatsApp())}
              boton="cierre"
              className="inline-flex items-center justify-center min-h-[52px] px-8 border border-white/25 text-crema hover:bg-white/10 text-[12px] tracking-[2px] uppercase font-dm transition-colors"
            >
              WhatsApp
            </BotonWhatsApp>
          </div>
          {proxima && <p className="text-[11px] font-dm text-crema/50 mt-4">Próxima salida: {fechaLarga(proxima.fechaSalida)} a la medianoche</p>}
        </div>
      </section>

      <BarraViaje desde={desde} quedan={proxima?.disponibles ?? null} />
    </main>
  );
}
