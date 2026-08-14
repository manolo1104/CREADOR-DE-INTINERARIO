import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CIUDADES_ORIGEN_EN, getCiudadOrigenEn } from "@/lib/ciudadesOrigenEn";
import { TOURS_DB, TOURS_DESTACADOS } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { localizeTour } from "@/lib/i18n/localize";
import { getTraslado } from "@/lib/traslados";
import { TrasladoTabla } from "@/components/TrasladoTabla";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

/**
 * Landings de origen del mercado estadounidense.
 *
 * Son SOLO inglés: no tienen espejo en español, igual que `/en/press`. Por eso
 * el slug va en inglés (`/en/from/houston`) y por eso NO llevan `hreflang` —
 * declarar un alterno español que no existe es mandar a Google a un 404. Van al
 * sitemap por el bloque `enOnlyStatic`.
 *
 * Los datos de vuelo viven en `ciudadesOrigenEn.ts`, verificados uno por uno.
 * Los precios salen del catálogo; ninguno se escribe aquí.
 */

export function generateStaticParams() {
  return CIUDADES_ORIGEN_EN.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const c = getCiudadOrigenEn(params.city);
  if (!c) return { title: "City not found" };

  const url = `${SITE}/en/from/${c.slug}`;
  const title = `Huasteca Potosina from ${c.nombre} — Flights, Drive Times and What to Book`;
  const description = `How to get to Mexico's waterfall country from ${c.nombre}: which airport to fly into, how long the drive is, how many days you need, and what a trip actually costs. Book with a 30% deposit.`;

  return {
    title,
    description,
    keywords: [
      `huasteca potosina from ${c.nombre.toLowerCase()}`,
      `${c.nombre.toLowerCase()} to huasteca potosina`,
      `flights ${c.nombre.toLowerCase()} to tampico`,
      `mexico waterfalls trip from ${c.nombre.toLowerCase()}`,
    ],
    // Sin `languages`: esta página no tiene versión en español.
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: `${SITE}/imagenes/cascada-de-tamul/hero.jpg`,
          width: 1600,
          height: 960,
          alt: "Tamul waterfall, 344 feet tall — Huasteca Potosina, Mexico",
        },
      ],
    },
  };
}

export default function FromCityPage({ params }: { params: { city: string } }) {
  const c = getCiudadOrigenEn(params.city);
  if (!c) notFound();

  const url = `${SITE}/en/from/${c.slug}`;
  const paqueteBase = PAQUETES_DB.find((p) => p.slug === c.paqueteSugerido) ?? PAQUETES_DB[0];
  const paquete = localizePaquete(paqueteBase, "en");
  const traslado = getTraslado(c.trasladoSlug);
  const destacados = TOURS_DESTACADOS.map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is (typeof TOURS_DB)[number] => Boolean(t))
    .slice(0, 3)
    .map((t) => localizeTour(t, "en"));

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/en` },
          { "@type": "ListItem", position: 2, name: `From ${c.nombre}`, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: "en-US",
        mainEntity: c.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="px-6 pt-36 pb-14 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          ✦ Getting there · How long you need · What to book
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          The Huasteca Potosina from <em className="shimmer-gold italic">{c.nombre}</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
          Everything you need to settle before you book: which airport actually saves you time,
          where to base yourself, and how much you can see with the days you have.
        </p>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">
            Getting here from {c.aeropuerto}
          </h2>
          <div className="space-y-4">
            {c.llegadas.map((l) => (
              <div
                key={l.modo}
                className={`border p-5 ${
                  l.mejor
                    ? "border-lima/35 bg-verde-profundo/45"
                    : "border-white/10 bg-verde-profundo/25"
                }`}
              >
                <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">{l.modo}</p>
                <p className="text-crema/70 font-dm text-sm leading-relaxed">{l.detalle}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-crema/40 font-dm text-xs">
            Flight times and frequencies are approximate and change by season — confirm them with the
            airline when you buy. Drive times assume daylight and normal conditions.
          </p>

          {/* El traslado propio va justo debajo de las formas de llegar porque es
              la respuesta a la duda que el lector acaba de tener: quién maneja
              las últimas dos horas. */}
          {traslado && (
            <div className="mt-6 border border-dorado/25 bg-verde-profundo/40 p-5">
              <p className="text-[9px] tracking-[2px] uppercase font-dm text-dorado/70 mb-3">
                Or we drive you
              </p>
              <TrasladoTabla ruta={traslado} locale="en" />
            </div>
          )}
        </div>
      </section>

      {/* ── DÓNDE QUEDARTE ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto border border-lima/20 bg-verde-profundo/40 p-6">
          <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">
            Coming from {c.nombre}, base yourself in
          </p>
          <p className="font-cormorant text-crema text-2xl font-light mb-3">{c.base}</p>
          <p className="text-crema/70 font-dm text-sm leading-relaxed mb-4">{c.razonBase}</p>
          <Link
            href="/en/info-practica"
            className="inline-flex items-center gap-2 text-lima font-dm text-xs tracking-[1.5px] uppercase hover:text-crema transition-colors"
          >
            Read the full travel guide →
          </Link>
        </div>
      </section>

      {/* ── QUÉ RESERVAR ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">What to book</h2>

          <div className="border border-white/10 bg-negro/40 p-6 mb-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">The package that fits</p>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <Link href={`/en/paquetes/${paquete.slug}`} className="font-cormorant text-crema text-xl font-light hover:text-lima transition-colors">
                {paquete.nombre} · {paquete.dias} days / {paquete.noches} nights
              </Link>
              <span className="font-dm text-lima whitespace-nowrap">
                ${paquete.precio.toLocaleString("en-US")}
                <span className="text-crema/35 text-xs"> MXN {paquete.precioLabel}</span>
              </span>
            </div>
            <p className="text-crema/55 font-dm text-sm leading-relaxed">
              Includes lodging at our own hotel in Xilitla, breakfasts, transportation to every site,
              all entrance fees and certified guides. That price covers two people, not one. Hold it
              with a 30% deposit and cancel free up to 48 hours before.
            </p>
          </div>

          <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">Or build the trip tour by tour</p>
          <ul className="flex flex-col gap-2 mb-6">
            {destacados.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/en/tours/${t.slug}`}
                  className="group flex items-baseline justify-between gap-4 border-b border-white/8 py-2.5 hover:border-lima/40 transition-colors"
                >
                  <span className="font-dm text-sm text-crema/80 group-hover:text-crema transition-colors">{t.nombre}</span>
                  <span className="font-dm text-sm text-lima whitespace-nowrap">
                    ${t.precio.toLocaleString("en-US")}
                    <span className="text-crema/35 text-xs">
                      {" MXN"}{t.precioUnidad === "vehiculo" ? " /vehicle" : " /person"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/en/tours"
            className="inline-flex items-center gap-2 border border-lima/40 text-lima font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:bg-lima/10 transition-colors"
          >
            See all {TOURS_DB.length} tours
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-5">
            What travelers from {c.nombre} ask
          </h2>
          <div className="space-y-3">
            {c.faqs.map((f) => (
              <details key={f.q} className="border border-white/10 bg-negro/30 group">
                <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-verde-vivo flex-shrink-0 text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5 border-t border-white/8 pt-4">
                  <p className="text-crema/55 font-dm text-sm leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/en/reservar"
              className="inline-flex items-center gap-2 bg-verde-selva text-crema font-dm text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-verde-vivo transition-colors"
            >
              Book your trip
            </Link>
            <a
              href={waLink(
                `Hi! I'm traveling from ${c.nombre} and I'd like help planning a trip to the Huasteca Potosina.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
            >
              Plan it with us on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
