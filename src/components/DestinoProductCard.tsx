"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Destino } from "@/lib/destinos";
import { Clock, CloudSun, Calendar, Star } from "lucide-react";
import { useItinerario } from "@/context/ItinerarioContext";
import { DestinoIcon } from "@/components/icons/DestinoIcon";
import { RATING_DESTINO } from "@/lib/destinoData";

// ── Colores por nivel de dificultad ──────────────────────────────────────────

const dificultadConfig = {
  baja:    { label: "FÁCIL",   labelEn: "EASY",    bg: "bg-emerald-600",  dot: "bg-emerald-400" },
  media:   { label: "MEDIA",   labelEn: "MEDIUM",  bg: "bg-amber-600",    dot: "bg-amber-400"   },
  alta:    { label: "DIFÍCIL", labelEn: "HARD",    bg: "bg-orange-700",   dot: "bg-orange-400"  },
  extrema: { label: "EXTREMA", labelEn: "EXTREME", bg: "bg-red-700",      dot: "bg-red-400"     },
} as const;

type DificultadKey = keyof typeof dificultadConfig;

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  destino: Destino;
  /** "compact" uses a smaller image ratio — for 4-col homepage grid */
  variant?: "compact" | "default";
}

export function DestinoProductCard({ destino: d, variant = "default" }: Props) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const lp = (p: string) => (en ? `/en${p}` : p);
  const { agregar, quitar, tieneDestino } = useItinerario();
  const yaAgregado = tieneDestino(d.slug);

  const difKey = d.dificultad.toLowerCase() as DificultadKey;
  const difConfig = dificultadConfig[difKey] ?? dificultadConfig.media;
  const difLabel = en ? difConfig.labelEn : difConfig.label;

  return (
    <article className="group flex flex-col h-full rounded-xl overflow-hidden border border-white/10 bg-negro hover:border-verde-vivo/50 transition-colors duration-300">

      {/* ── ZONA IMAGEN ────────────────────────────────────────────── */}
      <Link
        href={lp(`/destinos/${d.slug}`)}
        aria-label={`${en ? "View" : "Ver"} ${d.nombre}`}
        className="block relative h-56 md:h-64 overflow-hidden flex-shrink-0"
      >
        {(d.imagen_hero || d.imagen_galeria?.[0]) ? (
          <Image
            src={d.imagen_hero || d.imagen_galeria[0]}
            alt={d.nombre}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-verde-selva/40 via-verde-profundo to-negro" />
        )}

        {/* Degradado inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/30 to-transparent" />

        {/* Badge categoría — esquina superior izquierda */}
        <span className="absolute top-3 left-3 z-10 bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full">
          <DestinoIcon name={d.icon} className="w-3 h-3 inline-block mr-1" />
          {d.tipo}
        </span>

        {/* Badge dificultad — esquina superior derecha */}
        <span
          className={`absolute top-3 right-3 z-10 ${difConfig.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${difConfig.dot}`} aria-hidden="true" />
          {difLabel}
        </span>

        {/* Título + zona + rating sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
          <h3 className="font-cormorant text-crema text-lg font-normal leading-tight uppercase tracking-wide">
            {d.nombre}
          </h3>
          <p className="text-crema/50 text-[10px] font-dm tracking-[1px] uppercase mt-0.5">
            {d.zona}
          </p>
          {/* Rating */}
          {RATING_DESTINO[d.slug] ? (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-dorado text-dorado flex-shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-dm text-dorado font-medium">{RATING_DESTINO[d.slug].rating}</span>
              <span className="text-[9px] font-dm text-crema/35">({RATING_DESTINO[d.slug].count} {en ? "reviews" : "opiniones"})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-dorado/60 text-dorado/60 flex-shrink-0" aria-hidden="true" />
              <span className="text-[9px] font-dm text-dorado/60">{en ? "Recommended" : "Recomendado"}</span>
            </div>
          )}
        </div>
      </Link>

      {/* ── ZONA INFO ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 bg-negro/80">

        {/* Metadatos — fila 1 */}
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mb-3">
          <span className="flex items-center gap-1.5 text-crema/60 text-[11px] font-dm">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{d.duracion_hrs}h</span>
          </span>
          {d.temporada_ideal && (
            <span className="flex items-center gap-1.5 text-crema/60 text-[11px] font-dm">
              <CloudSun className="w-3 h-3" aria-hidden="true" />
              <span>{d.temporada_ideal}</span>
            </span>
          )}
          {d.dias_abierto && (
            <span className="flex items-center gap-1.5 text-crema/60 text-[11px] font-dm">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span>{d.dias_abierto}</span>
            </span>
          )}
        </div>

        {/* Separador */}
        <div className="border-t border-white/8 mb-3" />

        {/* CTA — siempre al fondo */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Botón principal: Agregar a itinerario (solo español — el itinerario es feature ES) */}
          {!en && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (yaAgregado) {
                  quitar(d.slug);
                } else {
                  agregar(d.slug);
                }
              }}
              className={`w-full text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors duration-200 rounded ${
                yaAgregado
                  ? "bg-verde-profundo text-crema/60 border border-verde-vivo/30"
                  : "bg-verde-selva hover:bg-verde-vivo text-crema"
              }`}
              aria-label={
                yaAgregado
                  ? `Quitar ${d.nombre} de mi itinerario`
                  : `Agregar ${d.nombre} a mi itinerario`
              }
            >
              {yaAgregado ? "✓ EN TU ITINERARIO" : "+ AGREGAR A ITINERARIO"}
            </button>
          )}

          {/* Botón: Ver detalles (en EN es el principal) */}
          <Link
            href={lp(`/destinos/${d.slug}`)}
            className={`w-full block text-center text-[10px] tracking-[2px] uppercase font-dm py-2.5 transition-all duration-200 rounded ${
              en
                ? "bg-verde-selva hover:bg-verde-vivo text-crema font-medium py-3"
                : "border border-white/15 hover:border-crema/40 text-crema/60 hover:text-crema"
            }`}
            aria-label={`${en ? "View details of" : "Ver detalles de"} ${d.nombre}`}
          >
            {en ? "VIEW DETAILS →" : "VER DETALLES →"}
          </Link>
        </div>
      </div>
    </article>
  );
}
