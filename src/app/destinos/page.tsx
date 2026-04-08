"use client";

import { useState } from "react";
import Link from "next/link";
import { DESTINOS_DB } from "@/lib/destinos";
import { DestinoProductCard } from "@/components/DestinoProductCard";

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
          {DESTINOS_DB.length} destinos únicos en la Huasteca Potosina. Cascadas, pozas, cañones,
          arte y cultura ancestral en uno de los paisajes más diversos de México.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinosFiltrados.map((d) => (
            <DestinoProductCard key={d.slug} destino={d} />
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
