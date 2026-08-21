"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS_DB } from "@/lib/destinos";
import { DestinoProductCard } from "@/components/DestinoProductCard";
import { localizeDestino } from "@/lib/i18n/localize";

// Agrupación por MUNICIPIO (campo `zona`). Orden: los municipios con más destinos
// primero y luego alfabético. Los nombres de municipio NO se traducen (place names),
// así que la etiqueta es la misma en español e inglés.
type GrupoMuni = { key: string; label: string; destinos: typeof DESTINOS_DB };

const POR_MUNICIPIO: Record<string, typeof DESTINOS_DB> = {};
for (const d of DESTINOS_DB) {
  (POR_MUNICIPIO[d.zona] ||= []).push(d);
}

const GRUPOS_CON_DATOS: GrupoMuni[] = Object.entries(POR_MUNICIPIO)
  .map(([zona, destinos]) => ({ key: zona, label: zona, destinos }))
  .sort((a, b) => b.destinos.length - a.destinos.length || a.label.localeCompare(b.label, "es"));

export default function DestinosClient() {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const [grupoActivo, setGrupoActivo] = useState("todos");

  // ⚠️ Los grupos se arman a nivel de módulo desde `DESTINOS_DB`, que está en
  // español. La ficha SÍ localizaba, pero el LISTADO no: en /en las 41 tarjetas
  // salían con el nombre, la temporada y los días de apertura en español.
  const gruposBase =
    grupoActivo === "todos"
      ? GRUPOS_CON_DATOS
      : GRUPOS_CON_DATOS.filter(g => g.key === grupoActivo);

  const gruposVisibles = gruposBase.map((g) => ({
    ...g,
    destinos: g.destinos.map((d) => localizeDestino(d, en ? "en" : "es")),
  }));

  let idx = 0;

  return (
    <>
      {/* Barra de filtros */}
      <div className="sticky sticky-subnav z-30 bg-negro/90 backdrop-blur-md border-b border-white/8 py-4 px-6" style={{ top: "var(--navbar-offset, 64px)" }}>
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto scrollbar-none justify-start">
          {[{ key: "todos", label: en ? "All" : "Todos" }, ...GRUPOS_CON_DATOS.map(g => ({ key: g.key, label: g.label }))].map((f) => (
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
          const destinos = g.destinos;
          return (
            <div key={g.key} className="mb-16 last:mb-0">
              <div className="flex items-baseline gap-3 mb-8 border-b border-white/8 pb-3">
                <h2 className="reveal-up font-cormorant font-light text-crema" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
                  {g.label}
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
        <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
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
            href="/reservar"
            className="inline-block bg-dorado text-negro px-12 py-4 text-[11px] tracking-[3px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium"
          >
            Ver recorridos y reservar →
          </Link>
        )}
      </section>
    </>
  );
}
