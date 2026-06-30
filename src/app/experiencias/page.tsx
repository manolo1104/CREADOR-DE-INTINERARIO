import Link from "next/link";
import { Metadata } from "next";
import { DESTINOS_DB } from "@/lib/destinos";
import ExperienciasClient from "./ExperienciasClient";
import { FloatingLeaves } from "@/components/FloatingLeaves";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Qué Hacer en la Huasteca Potosina — Cascadas, Aventura y Cultura 2026",
  description: `Descubre las ${DESTINOS_DB.length} mejores experiencias en la Huasteca Potosina: cascadas turquesas, aventura extrema, cultura huasteca y naturaleza. Tours guiados con transporte incluido.`,
  alternates: { canonical: `${SITE}/experiencias` },
  openGraph: {
    title: "Experiencias en la Huasteca Potosina — Cascadas, Aventura y Cultura",
    description: `${DESTINOS_DB.length} experiencias únicas en la Huasteca Potosina. Cascadas turquesas, sótanos kársticos, jardines surrealistas y aguas termales en San Luis Potosí.`,
    url: `${SITE}/experiencias`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Experiencias Huasteca Potosina — Cascadas, Aventura y Cultura 2026",
    description: `${DESTINOS_DB.length} experiencias únicas en la Huasteca Potosina. Cascadas, aventura y cultura.`,
  },
};

const FAQS = [
  {
    q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
    a: "De noviembre a marzo es la temporada ideal: clima fresco (18–26°C), cascadas con nivel óptimo y el color turquesa más intenso. Semana Santa y julio–agosto son temporada alta con más afluencia y calor.",
  },
  {
    q: "¿Qué incluye el precio de cada experiencia?",
    a: "El precio indicado es el acceso o entrada por persona al destino natural. Los tours guiados con transporte desde tu hotel, desayuno típico, entradas y guía certificado NOM-09 tienen un costo adicional disponible en la sección de Tours.",
  },
  {
    q: "¿Se puede visitar la Huasteca Potosina con niños?",
    a: "Sí. Las Cascadas de Tamasopo, Puente de Dios y Las Pozas de Xilitla son perfectas para familias con niños desde los 5 años. El Sótano de las Golondrinas (333m de profundidad) y el río Tampaón requieren mayor edad y condición física.",
  },
  {
    q: "¿Cómo llegar a la Huasteca Potosina desde Ciudad de México?",
    a: "Desde CDMX son aproximadamente 6 horas en coche por la carretera 85D. En autobús ADO desde la Terminal Norte hasta Ciudad Valles son 8 horas (~$600 MXN). Ciudad Valles es la base de operaciones de la región.",
  },
];

const experienciasSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ItemList",
      name: "Experiencias en la Huasteca Potosina",
      description: "Tours y actividades en la Huasteca Potosina, San Luis Potosí, México",
      url: `${SITE}/experiencias`,
      numberOfItems: DESTINOS_DB.length,
      itemListElement: DESTINOS_DB.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TouristAttraction",
          name: d.nombre,
          description: d.descripcion,
          url: `${SITE}/destinos/${d.slug}`,
          image: d.imagen_hero ? `${SITE}${d.imagen_hero}` : undefined,
          touristType: d.tipo,
          geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
          address: {
            "@type": "PostalAddress",
            addressLocality: d.zona,
            addressRegion: "San Luis Potosí",
            addressCountry: "MX",
          },
          offers: {
            "@type": "Offer",
            price: d.precio_entrada.match(/\d+/)?.[0] || "0",
            priceCurrency: "MXN",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio",        item: SITE },
        { "@type": "ListItem", position: 2, name: "Experiencias",  item: `${SITE}/experiencias` },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function ExperienciasPage() {
  return (
    <main className="min-h-screen bg-negro">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(experienciasSchema) }}
      />

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          ✦ Huasteca Potosina · San Luis Potosí ✦
        </p>
        <h1
          className="reveal-up font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(40px,7vw,76px)" }}
        >
          Experiencias en la <em className="shimmer-gold">Huasteca Potosina</em>
        </h1>
        <p className="reveal-up text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed" style={{ animationDelay: "80ms" }}>
          {DESTINOS_DB.length} destinos únicos — cascadas turquesas, aventura extrema, arte surrealista y aguas
          termales. Una experiencia para cada tipo de viajero.
        </p>
      </section>

      {/* ── BANNER PLANIFICADOR IA ── */}
      <div className="bg-verde-profundo/30 border-y border-verde-vivo/15 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-0.5">✦ Planificador IA · Gratis</p>
            <p className="text-crema font-dm text-sm">¿No sabes qué combinar? Arma tu itinerario perfecto en 2 minutos.</p>
          </div>
          <Link
            href="/recomendar"
            className="flex-shrink-0 bg-dorado text-negro text-[10px] tracking-[2px] uppercase font-dm px-6 py-3 hover:bg-lima transition-colors whitespace-nowrap font-medium"
          >
            Encontrar mi tour ideal →
          </Link>
        </div>
      </div>

      {/* ── GRID CON FILTROS (client component) ── */}
      <ExperienciasClient />

      {/* ── CTA TOURS ── */}
      <section className="relative py-16 px-6 text-center bg-verde-profundo/20 border-t border-white/6 overflow-hidden">
        <FloatingLeaves count={12} />
        <div className="relative z-10">
        <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">
          ✦ Tours con todo incluido
        </span>
        <h2
          className="reveal-up font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(26px,4vw,44px)" }}
        >
          ¿Listo para <em className="shimmer-gold">reservar?</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          Transporte, desayuno, entradas y guía NOM-09 incluidos. Grupos máx. 12 personas.
          Cancelación gratis con 48h de antelación.
        </p>
        <Link
          href="/tours"
          className="inline-block bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors"
        >
          Ver todos los tours →
        </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 border-t border-white/6">
        <div className="max-w-3xl mx-auto">
          <h2
            className="reveal-up font-cormorant font-light text-crema text-center mb-10"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            Preguntas <em className="text-dorado">frecuentes</em>
          </h2>
          <div className="space-y-2">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group border border-white/10 overflow-hidden open:border-verde-selva/30"
              >
                <summary className="cursor-pointer px-5 py-4 text-crema font-dm text-sm font-medium list-none select-none hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                  <span>{q}</span>
                  <span className="text-verde-vivo text-lg flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <p className="px-5 pb-5 pt-1 text-crema/55 font-dm text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEAD MAGNET ── */}
      <section className="relative py-20 px-6 bg-verde-profundo border-t border-white/8 overflow-hidden">
        <FloatingLeaves count={18} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-vivo/40 px-4 py-1.5 mb-6 font-dm">
            ✦ Guía PDF Gratuita
          </span>
          <h2
            className="reveal-up font-cormorant font-light text-crema mb-4"
            style={{ fontSize: "clamp(26px,4vw,44px)" }}
          >
            Los 5 mejores días para visitar{" "}
            <em className="text-dorado">la Huasteca en 2026</em>
          </h2>
          <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Itinerarios reales, precios actualizados y consejos de guías locales — todo en un PDF descargable.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-cormorant font-light text-crema/40 line-through text-xl">$199</span>
              <span className="font-cormorant font-light text-dorado text-3xl">$49 <span className="text-[11px] font-dm text-crema/40">MXN</span></span>
            </div>
            <Link href="/guia" className="inline-block bg-dorado text-negro px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300">
              Descargar la guía → $49
            </Link>
            <p className="text-[11px] text-crema/30 tracking-wide font-dm">Pago seguro · Descarga inmediata · 🛡️ Garantía 7 días</p>
          </div>
        </div>
      </section>
    </main>
  );
}
