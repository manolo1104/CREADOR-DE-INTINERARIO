import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
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
    openGraph: destino.imagen_hero
      ? { images: [{ url: destino.imagen_hero }] }
      : undefined,
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

        {/* Hero — imagen de fondo cuando hay foto, gradiente cuando no */}
        <div className="relative min-h-[60vh] flex flex-col justify-end overflow-hidden">
          {destino.imagen_hero ? (
            <>
              <Image
                src={destino.imagen_hero}
                alt={destino.nombre}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/60 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-verde-profundo to-verde-bosque" />
          )}

          <div className="relative z-10 px-6 md:px-20 py-14">
            <Link href="/destinos" className="text-[10px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors mb-8 block">
              ← Todos los destinos
            </Link>
            <div className="text-5xl mb-4">{destino.emoji}</div>
            <h1 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(40px,6vw,64px)" }}>
              {destino.nombre}
            </h1>
            <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo mb-4">{destino.zona} · {destino.tipo}</p>
            <p className="text-crema/75 max-w-2xl leading-relaxed text-base">{destino.descripcion}</p>
          </div>
        </div>

        {/* Galería de imágenes adicionales */}
        {destino.imagen_galeria.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {destino.imagen_galeria.map((src, i) => (
              <div key={src} className="relative aspect-video overflow-hidden">
                <Image
                  src={src}
                  alt={`${destino.nombre} — foto ${i + 2}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  sizes="50vw"
                />
              </div>
            ))}
          </div>
        )}

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
