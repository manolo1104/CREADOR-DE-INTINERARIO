import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { DESTINOS_DB } from "@/lib/destinos";
import { buildDestinationJsonLd } from "@/lib/jsonld";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return DESTINOS_DB.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const destino = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!destino) return { title: "Destino no encontrado" };
  return {
    title: `${destino.nombre} — Huasteca Potosina`,
    description: destino.descripcion,
    keywords: ["Huasteca Potosina", destino.zona, destino.nombre, "turismo México"],
  };
}

export default function DestinoPage({ params }: Props) {
  const destino = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!destino) notFound();

  const jsonLd = buildDestinationJsonLd(destino);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <main className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-verde-profundo to-verde-bosque px-6 md:px-20 py-20 border-b border-white/8">
        <Link href="/" className="text-[10px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors mb-8 block">
          ← Todos los destinos
        </Link>
        <div className="text-5xl mb-4">{destino.emoji}</div>
        <h1 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(40px,6vw,64px)" }}>
          {destino.nombre}
        </h1>
        <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-6">{destino.zona} · {destino.tipo}</p>
        <p className="text-crema/65 max-w-2xl leading-relaxed">{destino.descripcion}</p>
      </div>

      {/* Info Grid */}
      <div className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Datos prácticos */}
        <div className="space-y-4">
          <h2 className="font-cormorant text-crema text-2xl mb-6">Datos prácticos</h2>
          {[
            { icon: "⏱️", label: "Duración", val: `${destino.duracion_hrs} horas` },
            { icon: "🎟️", label: "Entrada", val: destino.precio_entrada },
            { icon: "📊", label: "Dificultad", val: destino.dificultad },
            { icon: "🕐", label: "Horario", val: destino.horario },
            { icon: "📅", label: "Días abierto", val: destino.dias_abierto },
            { icon: "⭐", label: "Mejor hora", val: destino.mejor_hora },
            { icon: "🌤️", label: "Temporada ideal", val: destino.temporada_ideal },
          ].filter(i => i.val).map((item) => (
            <div key={item.label} className="flex gap-3 py-3 border-b border-white/6">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div>
                <div className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-0.5">{item.label}</div>
                <div className="text-sm text-crema">{item.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Consejos */}
        <div className="space-y-6">
          {destino.advertencias && (
            <div className="border-l-2 border-terracota bg-terracota/8 p-4">
              <p className="text-[10px] tracking-[2px] uppercase text-terracota mb-2">⚠️ Advertencias</p>
              <p className="text-sm text-crema/75">{destino.advertencias}</p>
            </div>
          )}
          {destino.como_llegar && (
            <div className="border-l-2 border-agua bg-agua/8 p-4">
              <p className="text-[10px] tracking-[2px] uppercase text-agua mb-2">🚗 Cómo llegar</p>
              <p className="text-sm text-crema/75">{destino.como_llegar}</p>
            </div>
          )}
          {destino.que_llevar?.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-3">🎒 Qué llevar</p>
              <ul className="space-y-1.5">
                {destino.que_llevar.map((item) => (
                  <li key={item} className="text-sm text-crema/70 flex gap-2">
                    <span className="text-verde-vivo">·</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {destino.datos_curiosos?.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/40 mb-3">💡 Datos curiosos</p>
              <ul className="space-y-1.5">
                {destino.datos_curiosos.map((d) => (
                  <li key={d} className="text-sm text-crema/70 flex gap-2">
                    <span className="text-dorado">·</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-verde-profundo/40 border-t border-white/6 py-16 text-center px-6">
        <h2 className="font-cormorant text-crema text-3xl mb-4">
          ¿Quieres visitar <em className="text-dorado">{destino.nombre}?</em>
        </h2>
        <p className="text-crema/50 text-sm mb-8">Incluye este destino en tu itinerario personalizado</p>
        <Link
          href="/planear"
          className="inline-block bg-dorado text-negro px-12 py-4 text-[11px] tracking-[4px] uppercase font-medium hover:bg-lima transition-colors"
        >
          Crear mi Itinerario
        </Link>
      </div>
    </main>
    </>
  );
}
