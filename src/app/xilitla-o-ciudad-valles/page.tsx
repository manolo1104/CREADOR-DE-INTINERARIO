import type { Metadata } from "next";
import Link from "next/link";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/xilitla-o-ciudad-valles`;

export const metadata: Metadata = {
  title: "¿Xilitla o Ciudad Valles? Dónde Hospedarte en la Huasteca 2026",
  description:
    "Tiempos reales desde cada base. Ciudad Valles conviene para cubrir toda la región; Xilitla, si vienes por Las Pozas. Pasamos por ti en las dos.",
  keywords: [
    "xilitla o ciudad valles",
    "donde hospedarse huasteca potosina",
    "mejor base huasteca potosina",
    "xilitla vs ciudad valles",
    "donde quedarse huasteca potosina",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "¿Xilitla o Ciudad Valles? Dónde hospedarte en la Huasteca",
    description:
      "Los tiempos reales de traslado desde cada base, y cuándo conviene cada una. Sin vendértela.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/imagenes/las-pozas-jardin-surrealista/hero.jpg`, width: 1600, height: 960, alt: "Las Pozas, Xilitla — Huasteca Potosina" }],
  },
};

/**
 * Tiempos desde Ciudad Valles: NO son estimados nuestros, salen del campo
 * `como_llegar` de cada ficha en DESTINOS_DB. Si un dato cambia ahí, cambia
 * aquí. Los de Xilitla solo se declaran donde la ficha lo respalda.
 */
const COMPARATIVA: { slug: string; desdeValles: string; desdeXilitla: string }[] = [
  { slug: "cascadas-de-micos",            desdeValles: "20 min",      desdeXilitla: "~2 h" },
  { slug: "cascada-de-tamul",             desdeValles: "45 min",      desdeXilitla: "~1 h 15 min" },
  { slug: "puente-de-dios-tamasopo",      desdeValles: "1 h",         desdeXilitla: "~2 h 30 min" },
  { slug: "sotano-de-las-golondrinas",    desdeValles: "1 h 15 min",  desdeXilitla: "~1 h" },
  { slug: "las-pozas-jardin-surrealista", desdeValles: "1 h 45 min",  desdeXilitla: "en el pueblo" },
  { slug: "cascada-los-comales",          desdeValles: "1 h 45 min",  desdeXilitla: "~15 min" },
  { slug: "nacimiento-huichihuayan",      desdeValles: "1 h 20 min",  desdeXilitla: "~40 min" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Xilitla o Ciudad Valles: cuál conviene más?",
    a: "Depende de a qué vengas. Si quieres cubrir la mayor cantidad de cascadas en pocos días, Ciudad Valles gana: Micos queda a 20 minutos, Tamul a 45 y el Puente de Dios a una hora. Si vienes principalmente por Las Pozas de Edward James y el Pueblo Mágico, Xilitla te ahorra casi dos horas de carretera al día, porque el jardín está en el pueblo.",
  },
  {
    q: "¿Puedo quedarme en Xilitla y aun así hacer el tour a Tamul?",
    a: "Sí. Pasamos por ti a tu hospedaje tanto en Xilitla como en Ciudad Valles, sin costo extra. Desde Xilitla, Tamul queda a poco más de una hora.",
  },
  {
    q: "¿Cuántos días necesito para la Huasteca Potosina?",
    a: "Con 3 días alcanzas para tres recorridos completos si te quedas en una sola base. Con 4 o 5 puedes combinar el lado de Xilitla (Las Pozas, Comales, Huichihuayán) con el lado de Valles (Tamul, Micos, Tamasopo) sin manejar de más.",
  },
  {
    q: "¿La carretera entre Xilitla y Ciudad Valles es difícil?",
    a: "Son unos 100 km de carretera de sierra por la 120, con curvas continuas. Se recomienda manejar de día. En nuestros tours no tienes que manejarla: el traslado va incluido.",
  },
];

export default function XilitlaOCiudadVallesPage() {
  const fichas = COMPARATIVA.map((c) => ({
    ...c,
    destino: DESTINOS_DB.find((d) => d.slug === c.slug),
  })).filter((c) => c.destino);

  const desde = Math.min(...TOURS_DB.map((t) => t.precio));
  const paqueteBase = PAQUETES_DB[0];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Xilitla o Ciudad Valles", item: URL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
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
          ✦ Comparación honesta · Tiempos reales de traslado
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          ¿<em className="shimmer-gold italic">Xilitla</em> o <em className="shimmer-gold italic">Ciudad Valles</em>?
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
          Es la primera duda de casi todo el que planea este viaje, y la respuesta honesta es que
          depende de a qué vengas. Aquí están los tiempos reales desde cada base — incluyendo cuándo
          Ciudad Valles es la mejor opción, aunque nosotros seamos de Xilitla.
        </p>
      </section>

      {/* ── TABLA ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-6">Cuánto tardas en llegar a cada lugar</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="py-3 pr-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70">Destino</th>
                  <th className="py-3 px-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70 whitespace-nowrap">Desde Cd. Valles</th>
                  <th className="py-3 pl-4 font-dm text-[10px] tracking-[2px] uppercase text-lima/70 whitespace-nowrap">Desde Xilitla</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.slug} className="border-b border-white/8">
                    <td className="py-3 pr-4">
                      <Link href={`/destinos/${f.slug}`} className="font-dm text-sm text-crema/85 hover:text-lima transition-colors">
                        {f.destino!.nombre}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-dm text-sm text-crema/60 whitespace-nowrap">{f.desdeValles}</td>
                    <td className="py-3 pl-4 font-dm text-sm text-crema/60 whitespace-nowrap">{f.desdeXilitla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-crema/40 font-dm text-xs">
            Los tiempos desde Ciudad Valles vienen de la ficha de cada destino. Los de Xilitla son
            aproximados por carretera de sierra y pueden variar con el clima.
          </p>
        </div>
      </section>

      {/* ── LAS DOS RESPUESTAS ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 bg-verde-profundo/30 p-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">Quédate en Ciudad Valles si…</p>
            <ul className="space-y-2 text-crema/70 font-dm text-sm leading-relaxed">
              <li>· Vienes por las cascadas y quieres ver el mayor número posible en 3 días.</li>
              <li>· Tienes poco tiempo: Micos, Tamul y Tamasopo están todos a menos de una hora.</li>
              <li>· Llegas en avión por Tampico o en autobús, y quieres la mayor oferta de hoteles y restaurantes.</li>
            </ul>
          </div>
          <div className="border border-lima/25 bg-verde-profundo/40 p-6">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">Quédate en Xilitla si…</p>
            <ul className="space-y-2 text-crema/70 font-dm text-sm leading-relaxed">
              <li>· Vienes principalmente por Las Pozas de Edward James: el jardín está en el pueblo.</li>
              <li>· Quieres el Pueblo Mágico, el café de altura y la sierra, no solo las cascadas.</li>
              <li>· Prefieres hospedaje con carácter a la oferta de ciudad.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── DÓNDE ENTRAMOS NOSOTROS ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto border border-white/10 bg-negro/40 p-7">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-4">Con nosotros no tienes que elegir</h2>
          <p className="text-crema/70 font-dm text-sm leading-relaxed mb-5">
            Somos de Xilitla y aquí tenemos nuestro hotel y nuestro restaurante, pero{" "}
            <strong className="text-crema">pasamos por ti a tu hospedaje en las dos ciudades</strong>, sin costo
            extra. Si te quedas en Ciudad Valles, te recogemos ahí. Si te quedas con nosotros en Xilitla, sales
            al tour desde la puerta.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tours"
              className="inline-flex items-center gap-2 border border-lima/40 text-lima font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:bg-lima/10 transition-colors"
            >
              Ver los {TOURS_DB.length} tours · desde ${desde.toLocaleString("es-MX")}
            </Link>
            <Link
              href={`/paquetes/${paqueteBase.slug}`}
              className="inline-flex items-center gap-2 border border-white/15 text-crema/80 font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:border-lima/40 hover:text-lima transition-colors"
            >
              Paquete con hospedaje en Xilitla
            </Link>
            <Link
              href="/tours-en-ciudad-valles"
              className="inline-flex items-center gap-2 border border-white/15 text-crema/80 font-dm text-xs tracking-[1.5px] uppercase px-6 py-3 hover:border-lima/40 hover:text-lima transition-colors"
            >
              Tours desde Ciudad Valles
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-2xl mb-5">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
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
              href={waLink("Hola, estoy decidiendo entre hospedarme en Xilitla o en Ciudad Valles. ¿Me ayudan?")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
            >
              Pregúntanos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
