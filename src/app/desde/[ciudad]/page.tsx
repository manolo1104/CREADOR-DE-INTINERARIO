import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CIUDADES_ORIGEN, getCiudadOrigen } from "@/lib/ciudadesOrigen";
import { TOURS_DB, TOURS_DESTACADOS } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

export function generateStaticParams() {
  return CIUDADES_ORIGEN.map((c) => ({ ciudad: c.slug }));
}

export function generateMetadata({ params }: { params: { ciudad: string } }): Metadata {
  const c = getCiudadOrigen(params.ciudad);
  if (!c) return { title: "Ciudad no encontrada" };

  const url = `${SITE}/desde/${c.slug}`;
  const desde = Math.min(...TOURS_DB.map((t) => t.precio));
  const title = `Huasteca Potosina desde ${c.nombre} — Cómo Llegar y Qué Reservar 2026`;
  const description = `Cómo llegar desde ${c.nombre}, cuántos días necesitas y qué paquete te queda. Tours desde $${desde.toLocaleString("es-MX")}, apartas con el 30 %.`;

  return {
    title,
    description,
    keywords: [
      `huasteca potosina desde ${c.nombre.toLowerCase()}`,
      `tours huasteca potosina desde ${c.nombre.toLowerCase()}`,
      `como llegar a la huasteca potosina desde ${c.nombre.toLowerCase()}`,
      `viaje a la huasteca desde ${c.nombre.toLowerCase()}`,
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Tours Huasteca Potosina",
      locale: "es_MX",
      type: "website",
      images: [{ url: `${SITE}/imagenes/cascada-de-tamul/hero.jpg`, width: 1600, height: 960, alt: "Cascada de Tamul — Huasteca Potosina" }],
    },
  };
}

export default function DesdeCiudadPage({ params }: { params: { ciudad: string } }) {
  const c = getCiudadOrigen(params.ciudad);
  if (!c) notFound();

  const url = `${SITE}/desde/${c.slug}`;
  const paquete = PAQUETES_DB.find((p) => p.slug === c.paqueteSugerido) ?? PAQUETES_DB[0];
  const destacados = TOURS_DESTACADOS.map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is (typeof TOURS_DB)[number] => Boolean(t))
    .slice(0, 3);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: `Desde ${c.nombre}`, item: url },
        ],
      },
      {
        "@type": "FAQPage",
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
          ✦ Cómo llegar · Cuántos días · Qué reservar
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          La Huasteca Potosina desde <em className="shimmer-gold italic">{c.nombre}</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
          Todo lo que necesitas resolver antes de reservar: cómo llegar {c.nombreLargo === c.nombre ? `desde ${c.nombre}` : `desde ${c.nombreLargo}`},
          dónde te conviene quedarte y qué alcanzas a ver según los días que tengas.
        </p>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">Cómo llegar</h2>
          <div className="space-y-4">
            {c.llegadas.map((l) => (
              <div key={l.modo} className="border border-white/10 bg-verde-profundo/25 p-5">
                <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">{l.modo}</p>
                <p className="text-crema/70 font-dm text-sm leading-relaxed">{l.detalle}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-crema/40 font-dm text-xs">
            Horarios y tarifas aproximados: cambian por temporada. Confírmalos al comprar tu boleto.
          </p>
        </div>
      </section>

      {/* ── DÓNDE QUEDARTE ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto border border-lima/20 bg-verde-profundo/40 p-6">
          <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">
            Viniendo de {c.nombre}, te conviene
          </p>
          <p className="font-cormorant text-crema text-2xl font-light mb-3">{c.baseRecomendada}</p>
          <p className="text-crema/70 font-dm text-sm leading-relaxed mb-4">{c.razonBase}</p>
          <Link
            href="/xilitla-o-ciudad-valles"
            className="inline-flex items-center gap-2 text-lima font-dm text-xs tracking-[1.5px] uppercase hover:text-crema transition-colors"
          >
            Ver la comparación completa →
          </Link>
        </div>
      </section>

      {/* ── QUÉ RESERVAR ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">Qué reservar</h2>

          <div className="border border-white/10 bg-negro/40 p-6 mb-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">El paquete que te queda</p>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <Link href={`/paquetes/${paquete.slug}`} className="font-cormorant text-crema text-xl font-light hover:text-lima transition-colors">
                {paquete.nombre} · {paquete.dias} días / {paquete.noches} noches
              </Link>
              <span className="font-dm text-lima whitespace-nowrap">
                ${paquete.precio.toLocaleString("es-MX")}
                <span className="text-crema/35 text-xs"> {paquete.precioLabel}</span>
              </span>
            </div>
            <p className="text-crema/55 font-dm text-sm leading-relaxed">
              Incluye hospedaje en nuestro hotel en Xilitla, desayunos, transporte a cada recorrido,
              entradas y guías certificados. Apartas con el 30 % y cancelas gratis hasta 48 h antes.
            </p>
          </div>

          <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">O arma tu viaje por tours</p>
          <ul className="flex flex-col gap-2 mb-6">
            {destacados.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tours/${t.slug}`}
                  className="group flex items-baseline justify-between gap-4 border-b border-white/8 py-2.5 hover:border-lima/40 transition-colors"
                >
                  <span className="font-dm text-sm text-crema/80 group-hover:text-crema transition-colors">{t.nombre}</span>
                  <span className="font-dm text-sm text-lima whitespace-nowrap">
                    ${t.precio.toLocaleString("es-MX")}
                    <span className="text-crema/35 text-xs">{t.precioUnidad === "vehiculo" ? " /vehículo" : " /persona"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 border border-lima/40 text-lima font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:bg-lima/10 transition-colors"
          >
            Ver los {TOURS_DB.length} tours
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-5">Preguntas de quien viene de {c.nombre}</h2>
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
          <div className="mt-8 text-center">
            <a
              href={waLink(`Hola, vengo desde ${c.nombre} y quiero información para el viaje a la Huasteca.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
            >
              Planéalo con nosotros por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
