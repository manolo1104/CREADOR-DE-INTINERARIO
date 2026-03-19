import Link from "next/link";
import { Metadata } from "next";
import { DESTINOS_DB } from "@/lib/destinos";

export const metadata: Metadata = {
  title: "Experiencias — Huasteca Potosina",
  description:
    "Cascadas y pozas, aventura extrema, arte y cultura, naturaleza y bienestar, fotografía. Todas las experiencias de la Huasteca Potosina.",
};

const CASCADAS_SLUGS = [
  "cascada-de-tamul",
  "cascadas-de-micos",
  "cascadas-de-tamasopo",
  "puente-de-dios-tamasopo",
];
const AVENTURA_SLUGS = [
  "sotano-de-las-golondrinas",
  "cascadas-de-micos",
  "cascada-de-tamul",
];
const CULTURA_SLUGS = [
  "las-pozas-jardin-surrealista",
  "zona-arqueologica-tamtoc",
];
const BIENESTAR_SLUGS = [
  "balneario-taninul",
  "cascadas-de-tamasopo",
  "puente-de-dios-tamasopo",
];
const FOTOGRAFIA_SLUGS = [
  "las-pozas-jardin-surrealista",
  "cascada-de-tamul",
  "puente-de-dios-tamasopo",
  "sotano-de-las-golondrinas",
];

function getDestinos(slugs: string[]) {
  return slugs
    .map((slug) => DESTINOS_DB.find((d) => d.slug === slug))
    .filter(Boolean) as typeof DESTINOS_DB;
}

interface ExperienceCardProps {
  destino: typeof DESTINOS_DB[0];
  description?: string;
}

function ExperienceCard({ destino, description }: ExperienceCardProps) {
  return (
    <div className="flex-shrink-0 w-64 border border-white/8 bg-negro/40 hover:border-verde-vivo/40 transition-all duration-200 group">
      <div className="p-5 flex flex-col h-full">
        <div className="text-4xl mb-3">{destino.emoji}</div>
        <h3 className="font-cormorant text-crema text-base leading-tight mb-1">
          {destino.nombre}
        </h3>
        <p className="text-[10px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">
          {destino.zona}
        </p>
        <p className="text-crema/50 text-xs font-dm leading-relaxed mb-4 flex-1">
          {description || destino.descripcion.slice(0, 80) + "…"}
        </p>
        <div className="flex items-center justify-between border-t border-white/8 pt-3">
          <span className="text-dorado text-sm font-dm">
            {destino.precio_entrada.split(" ").slice(0, 2).join(" ")}
          </span>
          <Link
            href={`/destinos/${destino.slug}`}
            className="text-[9px] tracking-[2px] uppercase text-verde-vivo hover:text-lima transition-colors font-dm"
          >
            Ver más →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  slugs: string[];
  descriptions?: Record<string, string>;
}

function CategorySection({ id, emoji, title, subtitle, slugs, descriptions }: CategorySectionProps) {
  const destinos = getDestinos(slugs);

  return (
    <section id={id} className="py-16 border-b border-white/6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{emoji}</span>
            <h2
              className="font-cormorant font-light text-crema"
              style={{ fontSize: "clamp(26px,3.5vw,40px)" }}
            >
              {title}
            </h2>
          </div>
          <p className="text-crema/45 font-dm text-sm ml-12">{subtitle}</p>
        </div>

        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-4">
          {destinos.map((d) => (
            <ExperienceCard
              key={d.slug}
              destino={d}
              description={descriptions?.[d.slug]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ExperienciasPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          Huasteca Potosina
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(40px,7vw,76px)" }}
        >
          Experiencias para <em className="text-dorado">todos</em>
        </h1>
        <p className="text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-8">
          Desde la adrenalina de asomarse a un sótano de 333 metros hasta relajarte en aguas
          termales. La Huasteca tiene una experiencia para cada tipo de viajero.
        </p>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: "Cascadas", href: "#cascadas" },
            { label: "Aventura", href: "#aventura" },
            { label: "Cultura", href: "#cultura" },
            { label: "Bienestar", href: "#bienestar" },
            { label: "Fotografía", href: "#fotografia" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="border border-white/20 px-4 py-1.5 text-[10px] tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema hover:border-verde-vivo/50 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>

      {/* Category Sections */}
      <CategorySection
        id="cascadas"
        emoji="💧"
        title="Cascadas & Pozas"
        subtitle="Las aguas turquesas más espectaculares de México. Cada cascada tiene su carácter único."
        slugs={CASCADAS_SLUGS}
        descriptions={{
          "cascada-de-tamul": "La cascada más alta de SLP (105m). Solo accesible en lancha por el río Tampaón.",
          "cascadas-de-micos": "7 cascadas en un mismo circuito con actividades de aventura incluidas.",
          "cascadas-de-tamasopo": "Pozas turquesas ideales para nadar. La favorita de las familias.",
          "puente-de-dios-tamasopo": "Poza azul cobalto bajo puente natural con efecto de luz único.",
        }}
      />

      <CategorySection
        id="aventura"
        emoji="🏔️"
        title="Aventura Extrema"
        subtitle="Para quienes necesitan más adrenalina. La Huasteca desafía tus límites."
        slugs={AVENTURA_SLUGS}
        descriptions={{
          "sotano-de-las-golondrinas": "Abismo kárstico de 333m. El vuelo en espiral al amanecer es irrepetible.",
          "cascadas-de-micos": "Tirolesa, saltos, kayak y skybike en el río más versátil de la zona.",
          "cascada-de-tamul": "Remada de 45 min por selva virgen para llegar a la cascada más alta.",
        }}
      />

      <CategorySection
        id="cultura"
        emoji="🏛️"
        title="Arte & Cultura"
        subtitle="El legado de Edward James y la civilización Huasteca. Historia que asombra."
        slugs={CULTURA_SLUGS}
        descriptions={{
          "las-pozas-jardin-surrealista": "El jardín surrealista más único del mundo: esculturas de concreto entre cascadas.",
          "zona-arqueologica-tamtoc": "El asentamiento prehispánico más importante de la cultura Huasteca.",
        }}
      />

      <CategorySection
        id="bienestar"
        emoji="♨️"
        title="Naturaleza & Bienestar"
        subtitle="Aguas termales, pozas para nadar y paisajes que sanan el espíritu."
        slugs={BIENESTAR_SLUGS}
        descriptions={{
          "balneario-taninul": "Aguas termales sulfurosas a 36°C constante. Lodo terapéutico incluido.",
          "cascadas-de-tamasopo": "Pozas de agua cristalina para nadar rodeado de naturaleza exuberante.",
          "puente-de-dios-tamasopo": "Una poza de silencio y color azul cobalto bajo un puente de roca.",
        }}
      />

      <CategorySection
        id="fotografia"
        emoji="📸"
        title="Fotografía & Naturaleza"
        subtitle="Los mejores spots fotográficos de la Huasteca. Imágenes que no se olvidan."
        slugs={FOTOGRAFIA_SLUGS}
        descriptions={{
          "las-pozas-jardin-surrealista": "Estructuras surrealistas, vegetación desbordante. Cada ángulo es una obra de arte.",
          "cascada-de-tamul": "105 metros de caída turquesa. En octubre: follaje naranja + agua turquesa.",
          "puente-de-dios-tamasopo": "La luz entra a la cueva entre 11:00 y 13:00. Efecto único en México.",
          "sotano-de-las-golondrinas": "Miles de vencejos en vuelo espiral al amanecer. Espectáculo natural.",
        }}
      />

      {/* CTA Planner */}
      <section className="py-20 px-6 text-center bg-verde-profundo/20 border-t border-white/6">
        <span className="inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">
          ✦ Planificador IA
        </span>
        <h2
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(26px,4vw,44px)" }}
        >
          ¿No sabes por dónde <em className="text-dorado">empezar?</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          Usa el planificador IA para combinar experiencias en un itinerario día a día con rutas
          reales, tiempos de traslado y presupuesto personalizado.
        </p>
        <Link
          href="/planear"
          className="inline-block bg-dorado text-negro px-12 py-4 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors"
        >
          Crear mi Itinerario IA →
        </Link>
        <p className="mt-4 text-[11px] text-crema/30 font-dm">Sin registro · Gratis · 2 minutos</p>
      </section>
    </main>
  );
}
