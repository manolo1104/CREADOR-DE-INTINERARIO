import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DESTINOS_DB } from "@/lib/destinos";
import { buildDestinationJsonLd } from "@/lib/jsonld";
import { DESTINO_EN_TOURS } from "@/lib/tourMapping";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

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
    title: destino.seo?.metaTitle ?? `${destino.nombre} — Huasteca Potosina`,
    description: destino.seo?.metaDescription ?? destino.descripcion,
    keywords: destino.seo?.keywords ?? ["Huasteca Potosina", destino.zona, destino.nombre, "turismo México"],
    openGraph: destino.imagen_hero
      ? { images: [{ url: destino.imagen_hero }] }
      : undefined,
  };
}

export default function DestinoPage({ params }: Props) {
  const destino = DESTINOS_DB.find((d) => d.slug === params.slug);
  if (!destino) notFound();

  const jsonLd = buildDestinationJsonLd(destino);
  const toursRelacionados = DESTINO_EN_TOURS[destino.slug] ?? [];

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
            <p className="text-crema/75 max-w-2xl leading-relaxed text-base mb-5">{destino.descripcion}</p>
            {toursRelacionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {toursRelacionados.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tours/${t.slug}`}
                    className="inline-flex items-center gap-1.5 bg-verde-selva/80 hover:bg-verde-vivo text-crema text-[9px] tracking-[1.5px] uppercase font-dm px-3 py-1.5 transition-colors"
                  >
                    🗺 Incluido en: {t.nombre} →
                  </Link>
                ))}
              </div>
            )}
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
              { icon: "📍", label: "Punto de encuentro", val: "Ciudad Valles — frente a la central de autobuses" },
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

        {/* CTA WhatsApp */}
        <div className="bg-verde-selva/20 border-t border-verde-vivo/20 py-16 text-center px-6">
          <h2 className="font-cormorant text-crema text-3xl mb-3">
            ¿Quieres visitar <em className="text-dorado">{destino.nombre}?</em>
          </h2>
          <p className="text-crema/50 text-sm mb-8 font-dm max-w-md mx-auto">
            Escríbenos por WhatsApp y te armamos el tour ideal para tu grupo y fechas.
          </p>
          <a
            href={waLink(WA_MESSAGES.destino(destino.nombre))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-4 h-4 flex-shrink-0" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            Reservar tour por WhatsApp
          </a>
          <p className="text-[10px] text-crema/35 font-dm">
            ⚡ Respuesta en menos de 1 hora · Lun–Dom
          </p>
        </div>
      </main>
    </>
  );
}
