import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { TOURS_DB } from "@/lib/tours";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return TOURS_DB.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const tour = TOURS_DB.find((t) => t.slug === params.slug);
  if (!tour) return {};
  return {
    title: `${tour.nombre} | Tours Huasteca Potosina`,
    description: tour.descripcion,
  };
}

const DIFICULTAD_CONFIG = {
  alta:  { label: "Avanzado", bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: "Moderado", bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: "Fácil",    bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

export default function TourDetailPage({ params }: Props) {
  const tour = TOURS_DB.find((t) => t.slug === params.slug);
  if (!tour) notFound();

  const dif = DIFICULTAD_CONFIG[tour.dificultad];
  const waText = encodeURIComponent(`Hola, me interesa el ${tour.nombre}. ¿Tienen disponibilidad?`);

  return (
    <main id="main-content" className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {tour.imagen_hero && (
          <Image
            src={tour.imagen_hero}
            alt={tour.nombre}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/50 to-negro/20" />

        {/* Badges */}
        <div className="absolute top-24 left-6 flex gap-2">
          <span className="bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full">
            {tour.emoji} {tour.tipo}
          </span>
          <span className={`${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
            {dif.label}
          </span>
        </div>

        {/* Título */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-4xl">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-3">
            Tour guiado con todo incluido
          </p>
          <h1
            className="font-cormorant font-light text-crema leading-tight mb-3"
            style={{ fontSize: "clamp(28px,5vw,56px)" }}
          >
            {tour.nombre}
          </h1>
          <p className="text-dorado/80 font-dm text-sm italic">{tour.tagline}</p>
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-10">

          {/* Descripción */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-4">
              Acerca de este tour
            </h2>
            <p className="text-crema/65 font-dm text-sm leading-relaxed">
              {tour.descripcion}
            </p>
          </section>

          {/* Destinos */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">
              Destinos del recorrido
            </h2>
            <ul className="space-y-3">
              {tour.destinos.map((d, i) => (
                <li key={d} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-verde-selva/40 border border-verde-vivo/30 flex items-center justify-center text-[11px] text-verde-vivo font-dm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-crema/70 font-dm text-sm pt-1">{d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Galería de imágenes */}
          {tour.imagenes.length > 1 && (
            <section>
              <h2 className="font-cormorant text-crema text-2xl mb-5">
                Imágenes del recorrido
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {tour.imagenes.map((img, i) => (
                  <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg">
                    <Image
                      src={img}
                      alt={`${tour.nombre} — imagen ${i + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Todo incluido */}
          <section>
            <h2 className="font-cormorant text-crema text-2xl mb-5">
              Todo incluido ✦
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tour.incluye.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-crema/65 font-dm">
                  <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar sticky */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 border border-white/10 bg-negro/60 p-6 space-y-5">
            <div>
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">desde</p>
              <p className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(32px,4vw,48px)" }}>
                ${tour.precio.toLocaleString("es-MX")}
              </p>
              <p className="text-[11px] text-crema/40 font-dm mt-1">MXN por persona</p>
            </div>

            <div className="border-t border-white/8 pt-5 space-y-3">
              <a
                href={`https://wa.me/524891251458?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
                Reservar ahora
              </a>

              <Link
                href="/tours"
                className="block text-center border border-white/15 hover:border-crema/30 text-crema/50 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm py-3 transition-all duration-200"
              >
                ← Ver todos los tours
              </Link>
            </div>

            <div className="border-t border-white/8 pt-5 space-y-2">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/25 font-dm">Incluye</p>
              {["Transporte", "Desayuno", "Guía certificado", "Fotos & video"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[11px] text-crema/50 font-dm">
                  <span className="text-verde-vivo">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── OTROS TOURS ── */}
      <section className="bg-verde-profundo/20 border-t border-white/6 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant text-crema text-2xl mb-8 text-center">
            Otros tours disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TOURS_DB.filter((t) => t.slug !== tour.slug).slice(0, 3).map((t) => (
              <Link
                key={t.slug}
                href={`/tours/${t.slug}`}
                className="group border border-white/8 hover:border-verde-vivo/40 bg-negro/40 p-5 transition-all duration-200"
              >
                <div className="relative aspect-[3/2] overflow-hidden mb-4">
                  {t.imagen_hero && (
                    <Image
                      src={t.imagen_hero}
                      alt={t.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/60 to-transparent" />
                </div>
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{t.tipo}</p>
                <h3 className="font-cormorant text-crema text-base leading-tight group-hover:text-dorado transition-colors">
                  {t.nombre}
                </h3>
                <p className="text-[10px] text-crema/40 font-dm mt-2">
                  Desde ${t.precio.toLocaleString("es-MX")} MXN
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
