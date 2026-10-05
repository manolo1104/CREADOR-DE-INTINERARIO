import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Minus, ArrowRight } from "lucide-react";
import { getPaquete, eventoALaVenta, type Paquete } from "@/lib/paquetes";
import { lugaresDePaqueteSeguro, type LugaresPaquete } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { NOCHE_XANTOLO, precioNinoNoche } from "@/lib/nocheXantolo";
import { PCTS_PAQUETE } from "@/lib/paquetePricing";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";
import { XAN_FONDO, XAN_FLOR, XAN_TINTA_BOTON, XAN_MORADO, XAN_CSS_ENTRADA } from "@/lib/xantoloEstilo";

/**
 * La página de venta de la Noche de Xantolo SIN hotel (decisión de Manolo, 4
 * oct 2026): $990 por persona, sábado 31 de octubre y domingo 1 de noviembre,
 * 12 lugares cada noche, con transporte, guía y degustación.
 *
 * Por qué existe: 43 personas vieron el paquete con hotel y ninguna tocó
 * «Reservar»; preguntaban si podían ir niños o más personas y si se podía
 * llegar el sábado. Esta página contesta las tres.
 *
 * Misma piel que `/paquetes/xantolo-2026` (`xantoloEstilo.ts`). Los lugares de
 * cada noche son REALES (`lugaresDePaquete`), por eso la página es dinámica.
 *
 * 🔴 La noche se describe SOLO como «las comparsas y los shows más
 * representativos de esta celebración» (`NOCHE_XANTOLO.queVes`).
 */

export const dynamic = "force-dynamic";

const PAGINA = NOCHE_XANTOLO.pagina;
const FOTO_COMPARSA = "/imagenes/paquetes/xantolo-2026/comparsa-noche.jpg";
const FOTO_ALTAR = "/imagenes/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia/hero.jpg";

const mxn = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

const MENSAJE_WA = "Hola, me interesa la Noche de Xantolo en Xilitla. ¿Me ayudan?";

interface NocheConLugares {
  paquete: Paquete;
  corta: string;
  lugares: LugaresPaquete | null;
  aLaVenta: boolean;
  agotada: boolean;
}

async function lasNoches(): Promise<NocheConLugares[]> {
  return Promise.all(
    NOCHE_XANTOLO.noches.map(async (n) => {
      const paquete = getPaquete(n.slug)!;
      const aLaVenta = eventoALaVenta(paquete);
      const lugares = aLaVenta ? await lugaresDePaqueteSeguro(paquete) : null;
      return { paquete, corta: n.corta, lugares, aLaVenta, agotada: lugares !== null && !cabeEnCupo(lugares, 1) };
    }),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const aLaVenta = NOCHE_XANTOLO.noches.some((n) => {
    const p = getPaquete(n.slug);
    return !!p && eventoALaVenta(p);
  });
  const titulo = "Noche de Xantolo en Xilitla con guía: 31 de octubre y 1 de noviembre";
  const descripcion = `Transporte con guía desde tu hospedaje en Xilitla, degustación de temporada y ${NOCHE_XANTOLO.queVes}. ${mxn(NOCHE_XANTOLO.precioAdulto)} por persona; niños con descuento. 12 lugares por noche.`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `${SITE}${PAGINA}` },
    robots: aLaVenta ? undefined : { index: false, follow: true },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `${SITE}${PAGINA}`,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
      images: [{ url: `${SITE}${FOTO_ALTAR}`, width: 1600, height: 1200, alt: "Altar de Xantolo con arcos de cempasúchil y velas" }],
    },
  };
}

export default async function NocheXantoloPage() {
  const noches = await lasNoches();
  const aLaVenta = noches.filter((n) => n.aLaVenta);
  if (aLaVenta.length === 0) return <NochePasada />;

  const pctMinimo = PCTS_PAQUETE[0];
  const conLugar = aLaVenta.filter((n) => !n.agotada);
  const todasAgotadas = conLugar.length === 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        name: NOCHE_XANTOLO.nombre,
        description: `Transporte con guía, degustación de temporada y ${NOCHE_XANTOLO.queVes}.`,
        url: `${SITE}${PAGINA}`,
        image: `${SITE}${FOTO_COMPARSA}`,
        touristType: ["Familias", "Parejas", "Grupos"],
        offers: aLaVenta.map((n) => ({
          "@type": "Offer",
          name: `${NOCHE_XANTOLO.nombre} · ${n.corta}`,
          price: NOCHE_XANTOLO.precioAdulto,
          priceCurrency: "MXN",
          availability: n.agotada ? "https://schema.org/SoldOut" : "https://schema.org/LimitedAvailability",
          validThrough: `${n.paquete.evento!.fecha}T00:00:00-06:00`,
          url: `${SITE}/reservar-paquete/${n.paquete.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Paquetes", item: `${SITE}/paquetes` },
          { "@type": "ListItem", position: 3, name: NOCHE_XANTOLO.nombre, item: `${SITE}${PAGINA}` },
        ],
      },
    ],
  };

  const pasos = [
    { cuando: NOCHE_XANTOLO.horaRecogida, titulo: "Pasamos por ti", texto: `A ${NOCHE_XANTOLO.recogida}. Nos dices dónde al reservar.` },
    { cuando: "Al caer la tarde", titulo: "Degustación de temporada", texto: "Tamales, atole, bocoles y pan de muerto." },
    { cuando: "En la noche", titulo: "El centro de Xilitla, con guía", texto: `Un guía del pueblo te lleva a ver ${NOCHE_XANTOLO.queVes}.` },
    { cuando: NOCHE_XANTOLO.regreso, titulo: "De regreso", texto: "Te dejamos en tu hospedaje." },
  ];

  const preguntas: { q: string; a: string; enlace?: { texto: string; href: string } }[] = [
    { q: "¿Dónde nos recogen?", a: `En tu hospedaje en Xilitla, a las ${NOCHE_XANTOLO.horaRecogida}. Si te hospedas fuera de Xilitla, escríbelo al reservar y te decimos dónde vernos.` },
    { q: "¿Pueden ir niños?", a: `Sí. De 6 a 10 años pagan ${mxn(precioNinoNoche("medio"))}, los menores de 6 pagan ${mxn(precioNinoNoche("chico"))} y los bebés menores de 3 no pagan. Avísanos de los bebés en una nota para contarlos en la camioneta.` },
    { q: "Somos un grupo, ¿caben?", a: `Cada noche hay ${NOCHE_XANTOLO.noches[0].cupo} lugares. Si son más de los que quedan, escríbenos por WhatsApp y vemos cómo acomodarlos.` },
    { q: "¿Todavía no tenemos hospedaje?", a: "Pregúntanos por WhatsApp. Para la noche del domingo 1 hay un paquete con hotel para parejas y familias.", enlace: { texto: "Ver el paquete con hotel", href: "/paquetes/xantolo-2026" } },
    { q: "¿Cómo se paga?", a: `En línea con tarjeta. Apartas con el ${pctMinimo} % y el resto se cubre el día de la salida.` },
    { q: "¿Se puede cancelar?", a: NOCHE_XANTOLO.cancelacion },
    { q: "¿Y si cambia el programa del pueblo?", a: "Las comparsas y los shows los organiza Xilitla. Si el programa cambia, el guía los lleva a lo que sí haya esa noche. El programa oficial sale a mediados de octubre y te lo mandamos por WhatsApp." },
  ];

  return (
    <main className="text-crema" style={{ backgroundColor: XAN_FONDO }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: XAN_CSS_ENTRADA }} />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden lg:grid lg:min-h-[80dvh] lg:grid-cols-12">
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
            style={{ background: `linear-gradient(to top, ${XAN_FONDO} 6%, rgba(20,10,24,0.9) 38%, rgba(20,10,24,0.25) 72%, rgba(20,10,24,0.45) 100%)` }}
          />
          <div className="absolute inset-0 hidden lg:block" style={{ background: `linear-gradient(to right, ${XAN_FONDO} 0%, rgba(20,10,24,0) 30%)` }} />
        </div>

        <div className="flex min-h-[calc(100dvh-4rem)] flex-col justify-end px-5 pb-10 pt-44 sm:px-8 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:justify-center lg:py-24 lg:pl-12 lg:pr-10 xl:pl-20">
          <p className="xan-sube font-dm text-[11px] uppercase tracking-[2.5px]" style={{ color: XAN_FLOR, animationDelay: "120ms" }}>
            Sábado 31 o domingo 1 · Xilitla
          </p>
          <h1
            className="xan-sube mt-4 [text-wrap:balance] font-cormorant text-[44px] font-light leading-[1.04] text-crema sm:text-[54px] xl:text-[62px]"
            style={{ animationDelay: "200ms" }}
          >
            La noche de Xantolo en Xilitla, con guía
          </h1>
          <p className="xan-sube mt-5 max-w-[36ch] font-dm text-[16px] leading-relaxed text-crema/80 sm:text-[17px]" style={{ animationDelay: "300ms" }}>
            Pasamos por ti, probamos lo de la temporada y vamos al centro a ver {NOCHE_XANTOLO.queVes}. Sin hotel: para quien ya tiene dónde dormir.
          </p>
          <div className="xan-sube mt-7 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "400ms" }}>
            {todasAgotadas ? (
              <span className="inline-flex cursor-not-allowed items-center justify-center border border-crema/15 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/45">
                Lugares agotados
              </span>
            ) : (
              <a
                href="#noches"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 font-dm text-[11px] font-medium uppercase tracking-[2px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: XAN_FLOR, color: XAN_TINTA_BOTON }}
              >
                Elegir mi noche
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            )}
            <a
              href={waLink(MENSAJE_WA)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90 transition-colors hover:border-crema/70 hover:text-crema active:scale-[0.98]"
            >
              Preguntar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Los tres números ──────────────────────────────────────────── */}
      <section aria-label="Precio y horario" className="border-y border-crema/10">
        <dl className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-crema/10">
          <Dato valor={mxn(NOCHE_XANTOLO.precioAdulto)} etiqueta="por persona" />
          <Dato valor={`${NOCHE_XANTOLO.noches[0].cupo}`} etiqueta="lugares por noche" />
          <Dato valor="5:30 PM" etiqueta={`regreso ${NOCHE_XANTOLO.regreso}`} />
        </dl>
      </section>

      {/* ── Elige tu noche ──────────────────────────────────────────────
          Una tarjeta por fecha con sus lugares REALES. */}
      <section id="noches" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24">
        <h2 className="font-cormorant text-[34px] font-light leading-tight text-crema sm:text-[42px]">Elige tu noche</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {noches.map((n) => (
            <div key={n.paquete.slug} className="border p-6 sm:p-8" style={{ borderColor: `${XAN_FLOR}55`, backgroundColor: XAN_MORADO }}>
              <p className="font-dm text-[11px] uppercase tracking-[2.5px]" style={{ color: XAN_FLOR }}>{NOCHE_XANTOLO.horario}</p>
              <p className="xan-num mt-3 font-cormorant text-[32px] font-light leading-tight text-crema">{n.corta}</p>
              <p className="xan-num mt-2 font-dm text-[14px] text-crema/70">
                {!n.aLaVenta
                  ? "Ya no se vende en línea."
                  : n.agotada
                    ? "Se acabaron los lugares."
                    : n.lugares
                      ? `Quedan ${n.lugares.libres} de ${n.lugares.cupo} lugares.`
                      : `${n.paquete.evento!.cupo} lugares.`}
              </p>
              <div className="mt-6">
                {n.aLaVenta && !n.agotada ? (
                  <Link
                    href={`/reservar-paquete/${n.paquete.slug}`}
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 font-dm text-[11px] font-medium uppercase tracking-[2px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
                    style={{ backgroundColor: XAN_FLOR, color: XAN_TINTA_BOTON }}
                  >
                    Reservar esta noche
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    href={waLink(`Hola, me interesa la Noche de Xantolo del ${n.corta.toLowerCase()}. ¿Se libera algún lugar?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center border border-crema/30 px-6 py-3.5 font-dm text-[11px] uppercase tracking-[2px] text-crema/90 hover:border-crema/70"
                  >
                    Avísame si se libera
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="xan-num mt-6 font-dm text-[14px] text-crema/60">
          Niños de 6 a 10 años: {mxn(precioNinoNoche("medio"))}. Menores de 6: {mxn(precioNinoNoche("chico"))}. Bebés menores de 3: no pagan. Apartas con el {pctMinimo} %.
        </p>
      </section>

      {/* ── La noche, en orden ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <h2 className="font-cormorant text-[34px] font-light leading-tight text-crema sm:text-[42px] [text-wrap:balance]">Cómo es la noche</h2>
            <ol className="mt-10 grid gap-9 border-l border-crema/15 pl-6 sm:pl-8">
              {pasos.map((p) => (
                <li key={p.titulo} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
                  <p className="xan-num font-dm text-[13px] font-medium" style={{ color: XAN_FLOR }}>{p.cuando}</p>
                  <div className="min-w-0">
                    <h3 className="font-cormorant text-[24px] leading-snug text-crema">{p.titulo}</h3>
                    <p className="mt-1 max-w-[52ch] font-dm text-[15px] leading-relaxed text-crema/65">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {/* La comparsa mide 921×519: en un recuadro, nunca a sangre. */}
          <div className="relative aspect-[16/9] w-full max-w-[921px] overflow-hidden lg:col-span-6">
            <Image
              src={FOTO_COMPARSA}
              alt="Comparsa de Xantolo de noche: danzantes con máscaras, una calavera y trajes de colores en pleno desfile"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Qué incluye ───────────────────────────────────────────────── */}
      <section className="border-t border-crema/10">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 lg:py-24">
          <div>
            <h2 className="font-cormorant text-[30px] font-light text-crema">Qué incluye</h2>
            <ul className="mt-6 grid gap-4">
              {NOCHE_XANTOLO.incluye.map((x) => (
                <li key={x} className="flex gap-3 font-dm text-[15px] leading-relaxed text-crema/75">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0" style={{ color: XAN_FLOR }} strokeWidth={2} aria-hidden="true" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-cormorant text-[30px] font-light text-crema">No incluye</h2>
            <ul className="mt-6 grid gap-4">
              {NOCHE_XANTOLO.noIncluye.map((x) => (
                <li key={x} className="flex gap-3 font-dm text-[15px] leading-relaxed text-crema/55">
                  <Minus className="mt-1 h-4 w-4 flex-shrink-0 text-crema/35" strokeWidth={2} aria-hidden="true" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ¿Con hotel? ───────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 border px-6 py-10 sm:px-12 md:grid-cols-[1fr_auto] md:items-center" style={{ borderColor: `${XAN_FLOR}55` }}>
          <div>
            <h2 className="font-cormorant text-[30px] font-light leading-tight text-crema sm:text-[36px] [text-wrap:balance]">
              ¿Todavía no tienes dónde dormir el domingo 1?
            </h2>
            <p className="mt-3 font-dm text-[15px] text-crema/70">
              El paquete con hotel trae la Ruta Surrealista de día, la degustación y esta misma noche con guía. Para parejas y familias de hasta 4.
            </p>
          </div>
          <Link
            href="/paquetes/xantolo-2026"
            className="inline-flex items-center justify-center gap-2 border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90 transition-colors hover:border-crema/70 hover:text-crema"
          >
            Ver el paquete con hotel <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
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
                <span aria-hidden="true" className="font-dm text-[20px] leading-none transition-transform duration-200 group-open:rotate-45" style={{ color: XAN_FLOR }}>+</span>
              </summary>
              <p className="max-w-[60ch] pb-5 font-dm text-[15px] leading-relaxed text-crema/65">
                {f.a}
                {f.enlace && (
                  <>
                    {" "}
                    <Link href={f.enlace.href} className="underline underline-offset-4 hover:text-crema" style={{ color: XAN_FLOR }}>
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
          <Link href="/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia" className="underline underline-offset-4 hover:text-crema" style={{ color: XAN_FLOR }}>
            Lee la guía completa
          </Link>
        </p>
      </section>
    </main>
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

/** Pasadas las dos noches, la página se queda para los enlaces viejos. */
function NochePasada() {
  return (
    <main className="flex min-h-[70vh] items-center px-5 pb-20 pt-36 text-crema sm:px-8" style={{ backgroundColor: XAN_FONDO }}>
      <div className="mx-auto max-w-xl">
        <h1 className="font-cormorant text-[40px] font-light leading-tight">La Noche de Xantolo 2026 ya pasó</h1>
        <p className="mt-4 font-dm text-[16px] text-crema/70">Fue el 31 de octubre y el 1 de noviembre. Mientras tanto, los recorridos salen todo el año.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/tours" className="inline-flex items-center justify-center px-6 py-4 font-dm text-[11px] font-medium uppercase tracking-[2px]" style={{ backgroundColor: XAN_FLOR, color: XAN_TINTA_BOTON }}>
            Ver los recorridos
          </Link>
          <Link href="/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia" className="inline-flex items-center justify-center border border-crema/30 px-6 py-4 font-dm text-[11px] uppercase tracking-[2px] text-crema/90">
            La guía del Xantolo
          </Link>
        </div>
      </div>
    </main>
  );
}
