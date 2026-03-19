import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Huasteca IA — Tu Viaje Perfecto a la Huasteca Potosina",
  description:
    "Diseña tu itinerario perfecto para la Huasteca Potosina con IA. Cascadas turquesas, jardines surrealistas, aventura extrema.",
};

const DESTINOS_DESTACADOS = [
  { emoji: "🌈", nombre: "Cascada de Tamul", zona: "Aquismón", slug: "cascada-de-tamul" },
  { emoji: "🏛️", nombre: "Las Pozas de Xilitla", zona: "Xilitla", slug: "las-pozas-jardin-surrealista" },
  { emoji: "💦", nombre: "Cascadas de Micos", zona: "Ciudad Valles", slug: "cascadas-de-micos" },
  { emoji: "🌀", nombre: "Puente de Dios", zona: "Tamasopo", slug: "puente-de-dios-tamasopo" },
  { emoji: "🐦", nombre: "Sótano de las Golondrinas", zona: "Aquismón", slug: "sotano-de-las-golondrinas" },
  { emoji: "🗿", nombre: "Zona Arqueológica Tamtoc", zona: "Tamuín", slug: "zona-arqueologica-tamtoc" },
];

const STATS = [
  { num: "18+", label: "Destinos" },
  { num: "∞", label: "Posibilidades" },
  { num: "1", label: "Viaje único" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-radial from-verde-profundo/30 via-negro to-negro" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-verde-selva/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-dorado/8 rounded-full blur-3xl" />
        </div>

        <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-8">
          ✦ Huasteca Potosina · México ✦
        </p>

        <h1 className="font-cormorant font-light leading-[0.92] tracking-tight mb-8">
          <span className="block text-crema" style={{ fontSize: "clamp(56px,10vw,110px)" }}>
            Tu Viaje
          </span>
          <span
            className="block text-dorado italic"
            style={{ fontSize: "clamp(56px,10vw,110px)" }}
          >
            Perfecto
          </span>
        </h1>

        <p className="font-cormorant italic text-crema/55 max-w-md mb-12 leading-relaxed"
           style={{ fontSize: "clamp(18px,2.5vw,22px)" }}>
          Inteligencia artificial y conocimiento local para diseñar el viaje huasteco que siempre soñaste.
        </p>

        {/* Stats */}
        <div className="flex gap-14 mb-12 flex-wrap justify-center">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <span className="font-cormorant font-light text-dorado block leading-none"
                    style={{ fontSize: "44px" }}>
                {s.num}
              </span>
              <span className="text-[9px] tracking-[3px] uppercase text-crema/40 mt-1.5 block">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/planear"
          className="inline-block bg-verde-selva text-crema px-14 py-5 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300"
        >
          Crear mi Itinerario
        </Link>

        <p className="mt-6 text-[11px] text-crema/30 tracking-wide">
          Gratis · Sin registro · 2 minutos
        </p>
      </section>

      {/* ── DESTINOS DESTACADOS ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">
            Explora la región
          </p>
          <h2 className="font-cormorant font-light text-crema"
              style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            Destinos <em className="text-dorado">imperdibles</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DESTINOS_DESTACADOS.map((d) => (
            <Link
              key={d.slug}
              href={`/destinos/${d.slug}`}
              className="group border border-white/8 p-6 bg-white/2 hover:border-verde-vivo/40 hover:bg-verde-selva/8 transition-all duration-250 flex items-center gap-4"
            >
              <span className="text-3xl">{d.emoji}</span>
              <div>
                <div className="text-sm font-medium text-crema group-hover:text-lima transition-colors">
                  {d.nombre}
                </div>
                <div className="text-[10px] text-crema/35 mt-1 tracking-wide">{d.zona}</div>
              </div>
              <span className="ml-auto text-crema/20 group-hover:text-verde-vivo transition-colors text-lg">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/planear"
            className="text-[11px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors border-b border-verde-vivo/30 pb-0.5"
          >
            Ver todos los destinos →
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-verde-profundo/40 border-y border-white/6 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-cormorant font-light text-crema mb-16"
              style={{ fontSize: "clamp(32px,4vw,48px)" }}>
            Tu itinerario en <em className="text-dorado">3 pasos</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Cuéntanos tu viaje", desc: "Días disponibles, presupuesto, tipo de viajero y lo que más te emociona." },
              { n: "02", title: "La IA lo diseña", desc: "Rutas reales con tiempos de traslado, precios 2026 y consejos de locales." },
              { n: "03", title: "Descarga y viaja", desc: "PDF listo para compartir con todos los detalles prácticos de tu aventura." },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="font-cormorant text-dorado/50 font-light mb-4"
                     style={{ fontSize: "56px" }}>
                  {step.n}
                </div>
                <h3 className="text-crema font-medium mb-3 text-base">{step.title}</h3>
                <p className="text-crema/50 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <Link
            href="/planear"
            className="inline-block mt-14 bg-dorado text-negro px-12 py-4 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors"
          >
            ✦ Empezar ahora
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="text-center py-12 text-crema/25 text-[11px] tracking-wide border-t border-white/5">
        <p>Huasteca IA · Xilitla, San Luis Potosí · {new Date().getFullYear()}</p>
        <p className="mt-2">Itinerarios generados con IA y conocimiento local</p>
      </footer>
    </main>
  );
}
