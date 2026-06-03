"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS_DB } from "@/lib/destinos";
import { DestinoProductCard } from "@/components/DestinoProductCard";

// Grupos por tipo de experiencia. El orden importa: cada destino se asigna al PRIMER
// grupo que coincida (sin repetir). Se agrupa por el `tipo` ORIGINAL (español).
const GRUPOS: { key: string; label: string; labelEn: string; match: (tipo: string) => boolean }[] = [
  { key: "aventura",    label: "Aventura en agua y cañones",     labelEn: "Adventure in water & canyons", match: t => t === "Aventura" },
  { key: "extrema",     label: "Adrenalina extrema",             labelEn: "Extreme adrenaline",           match: t => t === "Extrema" },
  { key: "naturaleza",  label: "Naturaleza, pozas y nacimientos",labelEn: "Nature, pools & springs",      match: t => t === "Naturaleza" },
  { key: "cultura",     label: "Arte & cultura",                 labelEn: "Art & culture",                match: t => t.includes("Arte") },
  { key: "arqueologia", label: "Arqueología",                    labelEn: "Archaeology",                  match: t => t.includes("Arqueolog") },
  { key: "bienestar",   label: "Bienestar & relax",              labelEn: "Wellness & relaxation",        match: t => t === "Bienestar" },
];

function grupoDe(tipo: string): string {
  const g = GRUPOS.find(g => g.match(tipo));
  return g ? g.key : "otros";
}

const DESTINOS_POR_GRUPO: Record<string, typeof DESTINOS_DB> = {};
for (const d of DESTINOS_DB) {
  const k = grupoDe(d.tipo);
  (DESTINOS_POR_GRUPO[k] ||= []).push(d);
}

const GRUPOS_CON_DATOS = GRUPOS.filter(g => (DESTINOS_POR_GRUPO[g.key]?.length ?? 0) > 0);

export default function DestinosClient() {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const [grupoActivo, setGrupoActivo] = useState("todos");

  const gruposVisibles =
    grupoActivo === "todos"
      ? GRUPOS_CON_DATOS
      : GRUPOS_CON_DATOS.filter(g => g.key === grupoActivo);

  const grupoLabel = (g: typeof GRUPOS[number]) => (en ? g.labelEn : g.label);
  let idx = 0;

  return (
    <>
      {/* Barra de filtros */}
      <div className="sticky sticky-subnav z-30 bg-negro/90 backdrop-blur-md border-b border-white/8 py-4 px-6" style={{ top: "var(--navbar-offset, 64px)" }}>
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto scrollbar-none justify-start md:justify-center">
          {[{ key: "todos", label: en ? "All" : "Todos" }, ...GRUPOS_CON_DATOS.map(g => ({ key: g.key, label: grupoLabel(g) }))].map((f) => (
            <button
              key={f.key}
              onClick={() => setGrupoActivo(f.key)}
              className={`flex-shrink-0 px-5 py-2 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 border ${
                grupoActivo === f.key
                  ? "bg-verde-selva border-verde-selva text-crema"
                  : "border-white/15 text-crema/50 hover:border-verde-vivo/50 hover:text-crema"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secciones agrupadas */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        {gruposVisibles.map((g) => {
          const destinos = DESTINOS_POR_GRUPO[g.key] ?? [];
          return (
            <div key={g.key} className="mb-16 last:mb-0">
              <div className="flex items-baseline gap-3 mb-8 border-b border-white/8 pb-3">
                <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
                  {grupoLabel(g)}
                </h2>
                <span className="text-[11px] tracking-[2px] uppercase text-crema/30 font-dm">
                  {destinos.length} {en ? `destination${destinos.length !== 1 ? "s" : ""}` : `destino${destinos.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {destinos.map((d) => (
                  <div key={d.slug} className="stagger-reveal" style={{ animationDelay: `${Math.min(idx++, 8) * 65}ms` }}>
                    <DestinoProductCard destino={d} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA final — ES: planificador IA · EN: WhatsApp (el recomendador es solo-ES) */}
      <section className="bg-verde-profundo/30 border-t border-white/6 py-16 px-6 text-center">
        <h2 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
          {en ? "Not sure where to start?" : "¿No sabes por dónde empezar?"}
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          {en
            ? "Tell us your dates and interests and we'll build a custom itinerary combining the best destinations."
            : "Nuestro planificador IA crea un itinerario personalizado combinando los mejores destinos según tus días, presupuesto y preferencias."}
        </p>
        {en ? (
          <a
            href="https://wa.me/524891251458?text=Hi%2C%20I%27d%20like%20help%20planning%20a%20trip%20to%20the%20Huasteca%20Potosina."
            target="_blank" rel="noopener noreferrer"
            className="inline-block bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            Plan with us on WhatsApp →
          </a>
        ) : (
          <Link
            href="/recomendar"
            className="inline-block bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            Descubrir mi tour ideal →
          </Link>
        )}
      </section>
    </>
  );
}
