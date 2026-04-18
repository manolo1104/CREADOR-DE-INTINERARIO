import Link from "next/link";
import Image from "next/image";
import type { Tour } from "@/lib/tours";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Star, Clock, Users } from "lucide-react";

const dificultadConfig = {
  alta:  { label: "AVANZADO", bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: "MODERADO", bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: "FÁCIL",    bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

interface Props {
  tour: Tour;
  variant?: "compact" | "default";
}

export function TourCard({ tour: t, variant = "default" }: Props) {
  const dif = dificultadConfig[t.dificultad];
  const imageHeight = variant === "compact" ? "h-52 md:h-56" : "h-56 md:h-64";

  return (
    <article className="group relative flex flex-col h-full rounded-xl overflow-hidden border border-white/10 bg-negro hover:border-verde-vivo/50 transition-colors duration-300">

      {/* Stretched link — covers entire card */}
      <Link
        href={`/tours/${t.slug}`}
        aria-label={`Ver tour: ${t.nombre}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      {/* ── IMAGEN ── */}
      <div className={`relative ${imageHeight} overflow-hidden flex-shrink-0`}>
        {t.imagen_hero ? (
          <Image
            src={t.imagen_hero}
            alt={t.nombre}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-verde-selva/40 via-verde-profundo to-negro" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/30 to-transparent" />

        {/* Badge tipo — top left */}
        <span className="absolute top-3 left-3 z-10 bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full">
          {t.tipo}
        </span>

        {/* Badge dificultad — top right */}
        <span className={`absolute top-3 right-3 z-10 ${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
          {dif.label}
        </span>

        {/* Nombre + tagline sobre imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
          <h3 className="font-cormorant text-crema text-lg font-normal leading-tight uppercase tracking-wide">
            {t.nombre}
          </h3>
          <p className="text-crema/50 text-[10px] font-dm tracking-[1px] mt-0.5">
            {t.tagline}
          </p>
          <p className="text-[10px] font-dm text-dorado/90 mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 fill-dorado/90" aria-hidden="true" /> 4.9 · ({t.reviewCount} reseñas)
          </p>
        </div>
      </div>

      {/* ── INFO ── */}
      <div className="flex flex-col flex-1 p-4 bg-negro/80">

        {/* Destinos incluidos */}
        <div className="mb-3">
          <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-2">
            Visitas incluidas
          </p>
          <ul className="space-y-1">
            {t.destinos.slice(0, 3).map((d) => (
              <li key={d} className="flex items-start gap-1.5 text-[11px] text-crema/60 font-dm">
                <span className="text-verde-vivo flex-shrink-0 mt-0.5">→</span>
                {d}
              </li>
            ))}
            {t.destinos.length > 3 && (
              <li className="text-[11px] text-crema/35 font-dm pl-3.5">
                +{t.destinos.length - 3} más…
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-white/8 mb-3" />

        {/* Duración + grupo */}
        <div className="flex items-center gap-4 mb-3 text-[10px] text-crema/40 font-dm">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> {t.duracion_hrs}h</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" /> máx. {t.groupMax} personas</span>
        </div>

        {/* Precio */}
        <div className="mb-4">
          <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-0.5">
            desde
          </p>
          <p className="font-cormorant text-dorado text-2xl font-normal leading-none">
            ${t.precio.toLocaleString("es-MX")}
            <span className="font-dm text-[10px] text-crema/40 ml-1 font-normal">MXN / persona</span>
          </p>
        </div>

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-2">
          <span className="w-full block text-center bg-verde-selva group-hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors duration-200 rounded">
            Ver tour completo →
          </span>
          <a
            href={waLink(WA_MESSAGES.tour(t.nombre, 2, 0, t.precio * 2))}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 w-full block text-center border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 text-[10px] tracking-[2px] uppercase font-dm py-2.5 transition-all duration-200 rounded"
          >
            Reservar por WhatsApp
          </a>
          <p className="text-center text-[9px] text-crema/25 font-dm pt-1">
            ✓ Cancelación gratuita con 48h de anticipación
          </p>
        </div>
      </div>
    </article>
  );
}
