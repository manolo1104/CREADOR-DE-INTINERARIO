"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { DestinoIcon } from "@/components/icons/DestinoIcon";

const FILTROS = [
  { label: "Todos",      value: "todos"      },
  { label: "Cascadas",   value: "cascadas"   },
  { label: "Aventura",   value: "aventura"   },
  { label: "Cultura",    value: "cultura"    },
  { label: "Bienestar",  value: "bienestar"  },
  { label: "Fotografía", value: "fotografia" },
];

const SLUGS_POR_FILTRO: Record<string, string[]> = {
  cascadas:  [
    "cascada-de-tamul", "cascadas-de-micos", "cascadas-de-tamasopo",
    "puente-de-dios-tamasopo", "cascadas-minas-viejas",
    "nacimiento-tambaque", "nacimiento-huichihuayan",
  ],
  aventura:  [
    "sotano-de-las-golondrinas", "sotano-de-las-huahuas",
    "cascadas-de-micos", "cascada-de-tamul", "rio-tampaon-rafting",
  ],
  cultura:   [
    "las-pozas-jardin-surrealista", "zona-arqueologica-tamtoc",
    "voladores-tamaleton", "xilitla-pueblo-magico",
  ],
  bienestar: [
    "balneario-taninul", "cascadas-de-tamasopo",
    "puente-de-dios-tamasopo", "laguna-media-luna", "nacimiento-tambaque",
  ],
  fotografia:[
    "las-pozas-jardin-surrealista", "cascada-de-tamul",
    "puente-de-dios-tamasopo", "sotano-de-las-golondrinas", "sotano-de-las-huahuas",
  ],
};

const DIFICULTAD_BADGE: Record<string, { label: string; cls: string }> = {
  baja:    { label: "Fácil",   cls: "bg-emerald-900/50 text-emerald-400" },
  media:   { label: "Media",   cls: "bg-amber-900/50   text-amber-400"   },
  alta:    { label: "Difícil", cls: "bg-orange-900/50  text-orange-400"  },
  extrema: { label: "Extrema", cls: "bg-red-900/50     text-red-400"     },
};

export default function ExperienciasClient() {
  const [filtro, setFiltro] = useState("todos");

  const filtrados = filtro === "todos"
    ? DESTINOS_DB
    : DESTINOS_DB.filter((d) => (SLUGS_POR_FILTRO[filtro] || []).includes(d.slug));

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      {/* Filtros dinámicos */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-5 py-2 text-[10px] tracking-[2px] uppercase font-dm border transition-all duration-200 ${
              filtro === f.value
                ? "bg-verde-selva text-crema border-verde-selva"
                : "border-white/20 text-crema/55 hover:border-verde-vivo/50 hover:text-crema"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-dm text-crema/30 tracking-widest">
          {filtrados.length} destino{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtrados.map((d) => {
          const dif = DIFICULTAD_BADGE[d.dificultad] ?? DIFICULTAD_BADGE.media;
          return (
            <Link
              key={d.slug}
              href={`/destinos/${d.slug}`}
              className="group border border-white/8 bg-negro/40 hover:border-verde-vivo/40 transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Imagen con zoom en hover */}
              <div className="relative h-44 overflow-hidden flex-shrink-0">
                <img
                  src={d.imagen_hero}
                  alt={d.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/70 via-negro/10 to-transparent" />

                {/* Badge dificultad */}
                <span className={`absolute top-3 right-3 text-[8px] tracking-[1.5px] uppercase px-2 py-0.5 font-dm font-medium ${dif.cls}`}>
                  {dif.label}
                </span>

                {/* Badge ícono */}
                <div className="absolute top-3 left-3 w-7 h-7 bg-negro/60 backdrop-blur-sm flex items-center justify-center">
                  <DestinoIcon name={d.icon} className="w-4 h-4 text-verde-vivo" />
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4 flex flex-col flex-1">
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{d.zona}</p>
                <h3 className="font-cormorant text-crema text-base leading-tight mb-2 group-hover:text-lima transition-colors">
                  {d.nombre}
                </h3>
                <p className="text-crema/45 text-[11px] font-dm leading-relaxed mb-3 flex-1 line-clamp-2">
                  {d.descripcion}
                </p>

                {/* Info rápida */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[9px] font-dm text-crema/40">
                    <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    {d.duracion_hrs}h
                  </span>
                  <span className="text-crema/15">·</span>
                  <span className="text-[9px] font-dm text-crema/40 truncate">{d.temporada_ideal}</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/8 pt-3">
                  <span className="text-dorado text-sm font-dm">
                    {d.precio_entrada.split(" ").slice(0, 2).join(" ")}
                  </span>
                  <span className="text-[9px] tracking-[2px] uppercase text-verde-vivo group-hover:text-lima transition-colors font-dm">
                    Ver más →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-20">
          <p className="text-crema/40 font-dm text-sm mb-4">No hay destinos en esta categoría.</p>
          <button
            onClick={() => setFiltro("todos")}
            className="text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima font-dm border-b border-verde-vivo/30 transition-colors"
          >
            Ver todos →
          </button>
        </div>
      )}
    </section>
  );
}
