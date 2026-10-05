import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, ArrowRight } from "lucide-react";
import { getPaquete, eventoALaVenta, precioVisible } from "@/lib/paquetes";
import { lugaresDePaqueteSeguro } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { NOCHE_XANTOLO } from "@/lib/nocheXantolo";
import { XAN_FONDO, XAN_FLOR, XAN_TINTA_BOTON, XAN_CSS_ENTRADA } from "@/lib/xantoloEstilo";
import { TOURS_DB, salidaCorta, regresoDeTour } from "@/lib/tours";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";
import { PCTS_PAQUETE } from "@/lib/paquetePricing";

/**
 * La página de venta del paquete Xantolo 2026 (pedido de Manolo, 2 oct).
 *
 * Lectura de diseño: landing de un paquete con fecha fija para parejas que ya
 * buscan el Xantolo; lenguaje nocturno y ritual; tipografías del sitio
 * (Cormorant + DM) con la identidad de Xantolo que ya usan el popup y los
 * bloques del artículo (morado de altar y cempasúchil). Un solo acento, el
 * cempasúchil. Movimiento solo en la entrada del hero, con CSS.
 *
 * 🔴 Los lugares que se anuncian son REALES (`lugaresDePaquete`: reservas en
 * línea + lo que el equipo anota en el panel). Por eso la página es dinámica.
 *
 * Fotos: el altar es la portada del artículo de Xantolo (ya se usa en el
 * sitio); la comparsa de noche y la habitación (Lirios 2) las eligió Manolo el
 * 2 oct; Las Pozas es la del catálogo.
 */

export const dynamic = "force-dynamic";

const SLUG = "xantolo-2026";

const FONDO = XAN_FONDO;
const FLOR = XAN_FLOR;
const TINTA_BOTON = XAN_TINTA_BOTON;

const FOTO_ALTAR = "/imagenes/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia/hero.jpg";
const FOTO_POZAS = "/imagenes/las-pozas-jardin-surrealista/gallery-1.jpg";
// 🔴 La comparsa mide 921×519: NO va a sangre (a 1440 px se estira 1.6× y se ve
// borrosa). Va en un recuadro de 16:9 que no pasa de su tamaño real.
const FOTO_COMPARSA = "/imagenes/paquetes/xantolo-2026/comparsa-noche.jpg";
const FOTO_HABITACION = "/imagenes/paquetes/xantolo-2026/habitacion.jpg";

const mxn = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
/** Las horas del catálogo traen guion largo de rango; aquí van con guion simple. */
const rango = (s: string | null | undefined) => (s ?? "").replace(/\s*[–—]\s*/g, "-");

const MENSAJE_WA =
  "Hola, me interesa el paquete Xantolo en Xilitla (domingo 1 de noviembre). ¿Me ayudan?";
const MENSAJE_WA_AGOTADO =
  "Hola, vi que se acabaron los lugares del paquete Xantolo del 1 de noviembre. ¿Me avisan si se libera uno?";

const CSS_ENTRADA = XAN_CSS_ENTRADA;

export function generateMetadata(): Metadata {
  const p = getPaquete(SLUG);
  const aLaVenta = !!p && eventoALaVenta(p);
  const titulo = "Paquete Xantolo 2026 en Xilitla para parejas y familias, 1 de noviembre";
  const descripcion = p
    ? `Una noche en Xilitla el 1 de noviembre: Ruta Surrealista de día, degustación de temporada y la noche de Xantolo con guía. Para parejas o familias de hasta 4, ${mxn(precioVisible(p))} la pareja.`
    : "Paquete Xantolo 2026 en Xilitla.";
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `${SITE}/paquetes/${SLUG}` },
    // Pasado el evento la página se queda (por los enlaces viejos) pero deja de
    // pedir que la indexen.
    robots: aLaVenta ? undefined : { index: false, follow: true },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `${SITE}/paquetes/${SLUG}`,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
      images: [{ url: `${SITE}${FOTO_ALTAR}`, width: 1600, height: 1200, alt: "Altar de Xantolo con arcos de cempasúchil y velas" }],
    },
  };
}

export default async function PaqueteXantoloPage() {
  const paquete = getPaquete(SLUG);
  if (!paquete?.evento) notFound();
  const evento = paquete.evento;
  const aLaVenta = eventoALaVenta(paquete);
  const lugares = await lugaresDePaqueteSeguro(paquete);
  // Agotado = ya no cabe ni una pareja (sin cuartos o sin lugar en la salida).
  const agotado = lugares !== null && !cabeEnCupo(lugares, 2);
  // Un ejemplo de familia con el MISMO motor que cobra: lo que se anuncia es
  // lo que se paga.
  const familia = computePaqueteCharge({ slug: SLUG, personas: 2, childrenMid: 2, pct: 100 });
  const nocheSola = mxn(NOCHE_XANTOLO.precioAdulto);
  const precio = precioVisible(paquete);
  const pctMinimo = PCTS_PAQUETE[0];
  const anticipo = Math.round((paquete.precio * pctMinimo) / 100);

  const ruta = TOURS_DB.find((t) => t.slug === "ruta-surrealista-edward-james");
  const salida = rango(ruta ? salidaCorta(ruta, false) : "8:00-9:00 AM");
  const regreso = rango(ruta ? regresoDeTour(ruta, false) : "4:00-6:00 PM");

  if (!aLaVenta) return <EventoPasado />;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: "Paquete Xantolo en Xilitla",
        description: paquete.subtitulo,
        url: `${SITE}/paquetes/${SLUG}`,
        image: `${SITE}${FOTO_ALTAR}`,
        touristType: ["Parejas", "Familias"],
        itinerary: { "@type": "ItemList", itemListElement: paquete.incluye.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x })) },
        offers: {
          "@type": "Offer",
          price: paquete.precio,
          priceCurrency: "MXN",
          availability: agotado ? "https://schema.org/SoldOut" : "https://schema.org/LimitedAvailability",
          validThrough: `${evento.fecha}T00:00:00-06:00`,
          url: `${SITE}/reservar-paquete/${SLUG}`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Paquetes", item: `${SITE}/paquetes` },
          { "@type": "ListItem", position: 3, name: "Xantolo en Xilitla", item: `${SITE}/paquetes/${SLUG}` },
        ],
      },
    ],
  };

  const pasos = [
    { cuando: salida, titulo: "Ruta Surrealista", texto: "Te recogemos en el hotel. El jardín de Edward James, los manantiales de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud, con desayuno, entradas y guía." },
    { cuando: regreso, titulo: "Regreso al hotel", texto: "Tu habitación te espera. Hay tiempo para descansar antes de que caiga la tarde." },
    { cuando: "Al atardecer", titulo: "Degustación de temporada", texto: "Tamales, atole, bocoles y pan de muerto." },
    { cuando: "En la noche", titulo: "Xantolo en el centro de Xilitla", texto: "Transporte con guía para ver las comparsas y los shows más representativos de esta celebración. Volvemos juntos al hotel." },
    { cuando: "Lunes 2", titulo: "Salida", texto: "Check-out y camino a casa." },
  ];

  const mesa = [
    { nombre: "Tamales", texto: "Recién hechos, como los que se ponen en el altar." },
    { nombre: "Atole", texto: "Caliente, para la noche en la sierra." },
    { nombre: "Bocoles", texto: "Gorditas de maíz de la Huasteca." },
    { nombre: "Pan de muerto", texto: "El pan de la temporada." },
  ];

  const preguntas: { q: string; a: string; enlace?: { texto: string; href: string } }[] = [
    { q: "¿Podemos llegar el sábado 31?", a: `El hotel solo tiene cuartos para la noche del domingo 1. Si llegan el sábado y ya tienen dónde dormir, la Noche de Xantolo del sábado 31 se vende sola: ${nocheSola} por persona con transporte, guía y degustación.`, enlace: { texto: "Ver la noche sola", href: NOCHE_XANTOLO.pagina } },
    { q: "¿A qué hora tenemos que estar en Xilitla?", a: `Antes de las 8:00 AM del domingo: la Ruta Surrealista sale del hotel entre ${salida}.` },
    { q: "¿Pueden ir niños o más personas?", a: `Sí: hasta ${evento.maxPorReserva} personas por cuarto, tu pareja o tu familia. Cada persona más paga su parte de hotel, de la Ruta Surrealista y de la noche; de 6 a 10 años el 70 %, menores de 6 el 50 %, y los bebés menores de 3 no pagan.${familia ? ` Por ejemplo, 2 adultos y 2 niños de 6 a 10 años pagan ${mxn(familia.total)}.` : ""} La salida de la noche es de máximo ${evento.salidaMaxima} personas. Si son más de ${evento.maxPorReserva}, escríbenos y lo armamos.` },
    { q: "¿Cómo se paga?", a: `En línea con tarjeta. Apartas con el ${pctMinimo} % (${mxn(anticipo)}) y el resto se cubre antes o durante tu llegada.` },
    { q: "¿Y si cambia el programa del pueblo?", a: "Las comparsas y los shows los organiza Xilitla. Si el programa cambia, el guía los lleva a lo que sí haya esa noche." },
    { q: "¿Se puede cancelar?", a: "Es un paquete con hospedaje: las condiciones de cambio y cancelación son las del hotel y te las confirmamos al reservar." },
  ];

  return (
    <main className="text-crema" style={{ backgroundColor: FONDO }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* La entrada del hero: la foto se asienta y el texto sube en orden.
          Con «reducir movimiento» no se anima nada y todo se ve desde el
          primer cuadro (la página está completa en reposo). */}
      <style dangerouslySetInnerHTML={{ __html: CSS_ENTRADA }} />

      {/* ── Hero ─────────────────────────────────────────────────────────
          Celular: la foto llena la pantalla y el texto va abajo, sobre un
          velo, con el botón visible sin bajar. Escritorio: texto a la
          izquierda y la foto a la derecha hasta el borde. */}
      <section className="relative isolate overflow-hidden lg:grid lg:min-h-[88dvh] lg:grid-cols-12">
        <div className="absolute inset-0 -z-10 lg:relative lg:z-0 lg:col-span-6 lg:col-start-7 lg:row-start-1">
          <Image
            src={FOTO_ALTAR}
            alt="Mujer de espaldas frente a un altar de Xantolo con arcos de cempasúchil y velas encendidas"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="xan-asienta object-cover object-[50%_30%]"
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: `linear-gradient(to top, ${FONDO} 6%, rgba(20,10,24,0.9) 38%, rgba(20,10,24,0.25) 72%, rgba(20,10,24,0.45) 100%)` }}
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{ background: `linear-gradient(to right, ${FONDO} 0%, rgba(20,10,24,0) 30%)` }}
          />
        </div>

        <div className="flex min-h-[calc(100dvh-4rem)] flex-col justify-end px-5 pb-10 pt-44 sm:px-8 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:justify-center lg:py-24 lg:pl-12 lg:pr-10 xl:pl-20">
          <p className="xan-sube font-dm text-[11px] uppercase tracking-[2.5px]" style={{ color: FLOR, animationDelay: "120ms" }}>
            Domingo 1 de noviembre · Xilitla
          </p>
          <h1
            className="xan-sube mt-4 [text-wrap:balance] font-cormorant text-[44px] font-light leading-[1.04] text-crema sm:text-[54px] lg:text-[54px] xl:text-[62px]"
            style={{ animationDelay: "200ms" }}
          >
            Xantolo en Xilitla, una noche con hotel
          </h1>
          <p className="xan-sube mt-5 max-w-[34ch] font-dm text-[16px] leading-relaxed text-crema/80 sm:text-[17px]" style={{ animationDelay: "300ms" }}>
            Las Pozas de día. Tamales, atole y pan de muerto al atardecer. Comparsas y shows de Xantolo con guía.
          </p>
          <div className="xan-sube mt-7 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "400ms" }}>
            <BotonReservar agotado={agotado} />
            <a
              href={waLink(agotado ? MENSAJE_WA_AGOTADO : MENSAJE_WA)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90 transition-colors hover:border-crema/70 hover:text-crema active:scale-[0.98]"
            >
              {agotado ? "Avísame si se libera" : "Preguntar por WhatsApp"}
            </a>
          </div>
        </div>
      </section>

      {/* ── Los tres números ──────────────────────────────────────────────
          Precio, lugares (reales) y anticipo. No son tarjetas: una franja
          con divisiones, porque se leen juntos. */}
      <section aria-label="Precio y lugares" className="border-y border-crema/10">
        <dl className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-crema/10">
          <Dato valor={mxn(precio)} etiqueta="la pareja" />
          <Dato
            valor={lugares ? (agotado ? "0" : `${lugares.libres} de ${lugares.cupo}`) : `${evento.cupo}`}
            etiqueta={lugares ? (agotado ? "cuartos: agotado" : "cuartos libres") : "cuartos en total"}
          />
          <Dato valor={`${pctMinimo} %`} etiqueta={`para apartar (${mxn(anticipo)})`} />
        </dl>
      </section>

      {/* ── El domingo, en orden ──────────────────────────────────────────
          Una línea de tiempo: las horas de la Ruta Surrealista salen del
          catálogo; lo de la noche se dice por momento, porque el programa
          del pueblo sale a mediados de octubre. */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h2 className="font-cormorant text-[34px] font-light leading-tight text-crema sm:text-[42px] [text-wrap:balance]">
              Cómo es el domingo
            </h2>
            <ol className="mt-10 grid gap-9 border-l border-crema/15 pl-6 sm:pl-8">
              {pasos.map((p) => (
                <li key={p.titulo} className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
                  <p className="xan-num font-dm text-[13px] font-medium" style={{ color: FLOR }}>{p.cuando}</p>
                  <div className="min-w-0">
                    <h3 className="font-cormorant text-[24px] leading-snug text-crema">{p.titulo}</h3>
                    <p className="mt-1 max-w-[52ch] font-dm text-[15px] leading-relaxed text-crema/65">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 font-dm text-[14px] text-crema/55">
              ¿Quieres ver la Ruta Surrealista a detalle?{" "}
              <Link href="/tours/ruta-surrealista-edward-james" className="underline underline-offset-4 hover:text-crema" style={{ color: FLOR }}>
                Ver el recorrido
              </Link>
            </p>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden lg:col-span-5 lg:mt-20">
            <Image
              src={FOTO_POZAS}
              alt="Esculturas de Edward James entre la selva en Las Pozas, Xilitla"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── La mesa de temporada ──────────────────────────────────────────
          No hay fotos propias de estos platillos, así que va como lo que es:
          un menú. Mejor tipografía que una foto que no es de aquí. */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto max-w-6xl border px-6 py-12 sm:px-12 sm:py-16" style={{ backgroundColor: "#2a1231", borderColor: `${FLOR}40` }}>
          <p className="font-dm text-[11px] uppercase tracking-[2.5px]" style={{ color: FLOR }}>Al atardecer</p>
          <h2 className="mt-3 font-cormorant text-[34px] font-light leading-tight text-crema sm:text-[42px]">
            Degustación de temporada
          </h2>
          <ul className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {mesa.map((m) => (
              <li key={m.nombre} className="border-t pt-5" style={{ borderColor: `${FLOR}33` }}>
                <p className="font-cormorant text-[30px] leading-none text-crema">{m.nombre}</p>
                <p className="mt-2 font-dm text-[15px] text-crema/65">{m.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── La noche ──────────────────────────────────────────────────────
          La foto de la comparsa de noche es chica (921×519), así que va en un
          recuadro y no a sangre. En celular va primero la foto; en escritorio,
          el texto a la izquierda y la foto a la derecha (la habitación, abajo,
          va al revés). */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 lg:pt-28">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="relative order-1 aspect-[16/9] w-full max-w-[921px] overflow-hidden lg:order-2 lg:col-span-7">
            <Image
              src={FOTO_COMPARSA}
              alt="Comparsa de Xantolo de noche: danzantes con máscaras, una calavera y trajes de colores en pleno desfile"
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="order-2 lg:order-1 lg:col-span-5">
            <h2 className="max-w-[16ch] font-cormorant text-[38px] font-light leading-[1.05] text-crema sm:text-[48px] [text-wrap:balance]">
              La noche de Xantolo, con guía
            </h2>
            <p className="mt-5 max-w-[46ch] font-dm text-[16px] leading-relaxed text-crema/80">
              Te llevamos al centro de Xilitla con un guía del pueblo para ver las comparsas y los shows más representativos de esta celebración. Volvemos juntos al hotel.
            </p>
            <p className="mt-4 max-w-[46ch] font-dm text-[13px] text-crema/55">
              El programa oficial de Xilitla sale a mediados de octubre. Te lo mandamos por WhatsApp en cuanto salga.
            </p>
          </div>
        </div>
      </section>

      {/* ── Dónde duermes ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[3/2] w-full overflow-hidden lg:col-span-6">
            <Image
              src={FOTO_HABITACION}
              alt="Habitación del Hotel Paraíso Encantado: pared azul, cama matrimonial con camino de cama bordado y ventana a la selva"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="lg:col-span-6">
            <h2 className="font-cormorant text-[34px] font-light leading-tight text-crema sm:text-[42px] [text-wrap:balance]">
              Una noche en el Hotel Paraíso Encantado
            </h2>
            <p className="mt-5 max-w-[48ch] font-dm text-[16px] leading-relaxed text-crema/70">
              Un cuarto para tu pareja o tu familia (hasta {evento.maxPorReserva} personas), del domingo 1 al lunes 2 de noviembre. Lo asigna el hotel y lo tienes listo al volver de la Ruta Surrealista.
            </p>
            <p className="mt-4 max-w-[48ch] font-dm text-[14px] leading-relaxed text-crema/55">
              Es la única noche con cuartos: el sábado 31 el hotel ya está lleno. ¿Llegas el sábado y ya tienes dónde dormir?{" "}
              <Link href={NOCHE_XANTOLO.pagina} className="underline underline-offset-4 hover:text-crema" style={{ color: FLOR }}>
                La noche del 31 se vende sola
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── Qué incluye ───────────────────────────────────────────────── */}
      <section className="border-t border-crema/10">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 lg:py-24">
          <div>
            <h2 className="font-cormorant text-[30px] font-light text-crema">Qué incluye</h2>
            <ul className="mt-6 grid gap-4">
              {paquete.incluye.map((x) => (
                <li key={x} className="flex gap-3 font-dm text-[15px] leading-relaxed text-crema/75">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0" style={{ color: FLOR }} strokeWidth={2} aria-hidden="true" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-cormorant text-[30px] font-light text-crema">No incluye</h2>
            <ul className="mt-6 grid gap-4">
              {paquete.noIncluye.map((x) => (
                <li key={x} className="flex gap-3 font-dm text-[15px] leading-relaxed text-crema/55">
                  <Minus className="mt-1 h-4 w-4 flex-shrink-0 text-crema/35" strokeWidth={2} aria-hidden="true" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Reservar ──────────────────────────────────────────────────────
          El cierre repite el MISMO botón del hero (una sola etiqueta por
          intención) con lo que hace falta para decidir al lado. */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 border px-6 py-12 sm:px-12 md:grid-cols-[1fr_auto] md:items-end" style={{ borderColor: `${FLOR}55` }}>
          <div>
            <h2 className="font-cormorant text-[36px] font-light leading-tight text-crema sm:text-[44px] [text-wrap:balance]">
              {agotado ? "Se acabaron los cuartos" : "Cuatro cuartos, una noche"}
            </h2>
            <p className="xan-num mt-4 font-dm text-[16px] text-crema/75">
              {mxn(precio)} la pareja. Cada persona más, hasta {evento.maxPorReserva} por cuarto, suma su parte{familia ? ` (2 adultos y 2 niños de 6 a 10 años: ${mxn(familia.total)})` : ""}. Apartas con el {pctMinimo} % y el resto se cubre antes o durante tu llegada.
            </p>
            {lugares && !agotado && (
              <p className="xan-num mt-2 font-dm text-[14px]" style={{ color: FLOR }}>
                Quedan {lugares.libres} de {lugares.cupo} cuartos.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <BotonReservar agotado={agotado} />
            <a
              href={waLink(agotado ? MENSAJE_WA_AGOTADO : MENSAJE_WA)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90 transition-colors hover:border-crema/70 hover:text-crema active:scale-[0.98]"
            >
              {agotado ? "Avísame si se libera" : "Preguntar por WhatsApp"}
            </a>
          </div>
        </div>
      </section>

      {/* ── Preguntas ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-28 pt-20 sm:px-8">
        <h2 className="font-cormorant text-[30px] font-light text-crema">Preguntas</h2>
        <div className="mt-6 divide-y divide-crema/10 border-y border-crema/10">
          {preguntas.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-dm text-[16px] text-crema/90 hover:text-crema [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="font-dm text-[20px] leading-none transition-transform duration-200 group-open:rotate-45" style={{ color: FLOR }}>+</span>
              </summary>
              <p className="max-w-[60ch] pb-5 font-dm text-[15px] leading-relaxed text-crema/65">
                {f.a}
                {f.enlace && (
                  <>
                    {" "}
                    <Link href={f.enlace.href} className="underline underline-offset-4 hover:text-crema" style={{ color: FLOR }}>
                      {f.enlace.texto}
                    </Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-10 font-dm text-[14px] text-crema/55">
          ¿Primera vez en el Xantolo?{" "}
          <Link href="/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia" className="underline underline-offset-4 hover:text-crema" style={{ color: FLOR }}>
            Lee la guía completa
          </Link>
        </p>
      </section>
    </main>
  );
}

/** El botón principal. Agotado no lleva al pago: se queda dicho. */
function BotonReservar({ agotado }: { agotado: boolean }) {
  if (agotado) {
    return (
      <span className="inline-flex cursor-not-allowed items-center justify-center border border-crema/15 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/45">
        Lugares agotados
      </span>
    );
  }
  return (
    <Link
      href={`/reservar-paquete/${SLUG}`}
      className="group inline-flex items-center justify-center gap-2 px-7 py-4 font-dm text-[11px] font-medium uppercase tracking-[2px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
      style={{ backgroundColor: FLOR, color: TINTA_BOTON }}
    >
      Reservar mi cuarto
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="min-w-0 px-3 py-6 text-center sm:px-6 sm:py-8">
      <dt className="sr-only">{etiqueta}</dt>
      <dd className="xan-num font-cormorant text-[26px] leading-none text-crema sm:text-[36px]">{valor}</dd>
      <dd className="mt-2 font-dm text-[11px] text-crema/55 sm:text-[13px]">{etiqueta}</dd>
    </div>
  );
}

/** Después del 31 de octubre la página se queda para los enlaces viejos. */
function EventoPasado() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 pb-20 pt-36 text-crema sm:px-8" style={{ backgroundColor: FONDO }}>
      <div className="mx-auto max-w-xl">
        <h1 className="font-cormorant text-[40px] font-light leading-tight">El paquete Xantolo 2026 ya pasó</h1>
        <p className="mt-4 font-dm text-[16px] text-crema/70">Fue la noche del 1 de noviembre. Mientras tanto, los demás paquetes salen todo el año.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/paquetes" className="inline-flex items-center justify-center px-6 py-4 font-dm text-[11px] font-medium uppercase tracking-[2px]" style={{ backgroundColor: FLOR, color: TINTA_BOTON }}>
            Ver los paquetes
          </Link>
          <Link href="/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia" className="inline-flex items-center justify-center border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90">
            La guía del Xantolo
          </Link>
        </div>
      </div>
    </main>
  );
}
