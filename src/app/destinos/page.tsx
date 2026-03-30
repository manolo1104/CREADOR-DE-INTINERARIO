"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DESTINOS_DB } from "@/lib/destinos";

const FILTROS = [
  { label: "Todos", value: "todos" },
  { label: "Cascadas", value: "cascadas" },
  { label: "Aventura", value: "aventura" },
  { label: "Cultura", value: "cultura" },
  { label: "Naturaleza", value: "naturaleza" },
  { label: "Arqueología", value: "arqueologia" },
];

function matchFiltro(tipo: string, filtro: string): boolean {
  if (filtro === "todos") return true;
  const t = tipo.toLowerCase();
  if (filtro === "cascadas") return t.includes("aventura") || t.includes("naturaleza");
  if (filtro === "aventura") return t.includes("aventura") || t.includes("extrema");
  if (filtro === "cultura") return t.includes("arte") || t.includes("cultura") || t.includes("historia");
  if (filtro === "naturaleza") return t.includes("naturaleza") || t.includes("bienestar");
  if (filtro === "arqueologia") return t.includes("arqueología") || t.includes("arqueologia");
  return false;
}

function getCardBg(tipo: string) {
  if (tipo.includes("Aventura") || tipo.includes("Extrema")) {
    return "from-terracota/25 via-terracota/8 to-negro";
  }
  if (tipo.includes("Arqueología") || tipo.includes("Arte")) {
    return "from-dorado/25 via-dorado/8 to-negro";
  }
  if (tipo.includes("Naturaleza")) {
    return "from-agua/20 via-agua/6 to-negro";
  }
  return "from-verde-selva/25 via-verde-selva/8 to-negro";
}

function getDificultadColor(dificultad: string) {
  if (dificultad === "alta") return "text-terracota border-terracota/40";
  if (dificultad === "media") return "text-dorado border-dorado/40";
  return "text-lima border-lima/40";
}

export default function DestinosPage() {
  const [filtroActivo, setFiltroActivo] = useState("todos");

  const destinosFiltrados = DESTINOS_DB.filter((d) =>
    matchFiltro(d.tipo, filtroActivo)
  );

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          San Luis Potosí · México
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(42px,7vw,80px)" }}
        >
          Explora los <em className="text-dorado">Destinos</em>
        </h1>
        <p className="text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed">
          Ocho rincones únicos de la Huasteca Potosina. Cascadas, pozas, cañones, arte y cultura
          ancestral en uno de los paisajes más diversos de México.
        </p>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-16 z-30 bg-negro/90 backdrop-blur-md border-b border-white/8 py-4 px-6">
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto scrollbar-none justify-start md:justify-center">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroActivo(f.value)}
              className={`flex-shrink-0 px-5 py-2 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 border ${
                filtroActivo === f.value
                  ? "bg-verde-selva border-verde-selva text-crema"
                  : "border-white/15 text-crema/50 hover:border-verde-vivo/50 hover:text-crema"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Destinations Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[11px] tracking-[2px] uppercase text-crema/30 font-dm mb-8">
          {destinosFiltrados.length} destino{destinosFiltrados.length !== 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {destinosFiltrados.map((d) => (
            <div
              key={d.slug}
              className="group border border-white/8 hover:border-verde-vivo/50 transition-all duration-300 overflow-hidden bg-negro/40"
            >
              {/* Imagen de cabecera */}
              {d.imagen_hero && (
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={d.imagen_hero}
                    alt={d.nombre}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
                  <span className="absolute bottom-3 left-4 text-3xl">{d.emoji}</span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-start gap-5 p-6 pb-4 border-b border-white/6">
                {!d.imagen_hero && <div className="text-6xl flex-shrink-0">{d.emoji}</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-cormorant text-crema text-xl leading-tight">{d.nombre}</h2>
                    <span
                      className={`flex-shrink-0 text-[9px] tracking-[1px] uppercase border px-2 py-0.5 font-dm ${getDificultadColor(d.dificultad)}`}
                    >
                      {d.dificultad}
                    </span>
                  </div>
                  <p className="text-[10px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{d.zona}</p>
                  <span className="inline-block text-[9px] tracking-[1px] uppercase border border-white/15 px-2 py-0.5 text-crema/45 font-dm">
                    {d.tipo}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="px-6 py-4 border-b border-white/6">
                <p className="text-crema/60 text-sm font-dm leading-relaxed">
                  {d.descripcion.slice(0, 120)}{d.descripcion.length > 120 ? "…" : ""}
                </p>
              </div>

              {/* Key info row */}
              <div className="grid grid-cols-4 divide-x divide-white/6 border-b border-white/6">
                {[
                  { icon: "⏱️", val: `${d.duracion_hrs}h`, label: "Duración" },
                  { icon: "🎟️", val: d.precio_entrada.split(" ").slice(0, 2).join(" "), label: "Precio" },
                  { icon: "🕐", val: d.horario.split("–")[0], label: "Abre" },
                  { icon: "🌤️", val: d.temporada_ideal, label: "Ideal" },
                ].map((item) => (
                  <div key={item.label} className="p-3 text-center">
                    <div className="text-sm mb-0.5">{item.icon}</div>
                    <div className="text-[11px] text-crema/80 font-dm leading-tight">{item.val}</div>
                    <div className="text-[9px] text-crema/30 font-dm mt-0.5 tracking-[1px] uppercase">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              {d.datos_curiosos && d.datos_curiosos.length > 0 && (
                <div className="px-6 py-4 border-b border-white/6">
                  <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-2">
                    Datos curiosos
                  </p>
                  <ul className="space-y-1">
                    {d.datos_curiosos.slice(0, 2).map((dato) => (
                      <li key={dato} className="flex items-start gap-2 text-xs text-crema/55 font-dm">
                        <span className="text-dorado mt-0.5 flex-shrink-0">·</span>
                        {dato}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className="px-6 py-4 flex items-center justify-between">
                <p className="text-[10px] text-crema/35 font-dm">{d.como_llegar?.split("·")[0]}</p>
                <Link
                  href={`/destinos/${d.slug}`}
                  className="text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima transition-colors font-dm border-b border-verde-vivo/30 pb-0.5 group-hover:border-lima/30"
                >
                  Ver destino →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {destinosFiltrados.length === 0 && (
          <div className="text-center py-20">
            <p className="text-crema/40 font-dm">No hay destinos en esta categoría.</p>
            <button
              onClick={() => setFiltroActivo("todos")}
              className="mt-4 text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima font-dm border-b border-verde-vivo/30"
            >
              Ver todos →
            </button>
          </div>
        )}
      </section>

      {/* CTA Planner */}
      <section className="bg-verde-profundo/30 border-t border-white/6 py-16 px-6 text-center">
        <h2
          className="font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
        >
          ¿No sabes por dónde empezar?
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          Nuestro planificador IA crea un itinerario personalizado combinando los mejores destinos
          según tus días, presupuesto y preferencias.
        </p>
        <Link
          href="/planear"
          className="inline-block bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
        >
          Usar planificador IA →
        </Link>
      </section>
    </main>
  );
}
