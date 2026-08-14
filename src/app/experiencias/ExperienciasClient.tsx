"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { DestinoIcon } from "@/components/icons/DestinoIcon";
import { useLocale } from "@/lib/i18n/useLocale";
import { localizeDestino } from "@/lib/i18n/localize";
import { getExperiencias } from "@/lib/i18n/experiencias.en";

// Los `value` de los filtros NO se traducen: son la llave del mapa de slugs.
// Solo cambian las etiquetas visibles, que vienen de `experiencias.en.ts`.
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

const DIFICULTAD_CLS: Record<string, string> = {
  baja:    "bg-emerald-900/50 text-emerald-400",
  media:   "bg-amber-900/50   text-amber-400",
  alta:    "bg-orange-900/50  text-orange-400",
  extrema: "bg-red-900/50     text-red-400",
};

// USD approximation — fixed rate ~17 MXN/USD
function toUSD(precioStr: string): string {
  const num = parseInt(precioStr.match(/\d+/)?.[0] || "0", 10);
  if (!num) return "";
  return `≈ US$${Math.round(num / 17)}`;
}

function waLink(mensaje: string): string {
  return `https://wa.me/524891251458?text=${encodeURIComponent(mensaje)}`;
}

export default function ExperienciasClient() {
  const { locale, lp } = useLocale();
  const t = getExperiencias(locale);
  const [filtro, setFiltro] = useState("todos");

  const base = filtro === "todos"
    ? DESTINOS_DB
    : DESTINOS_DB.filter((d) => (SLUGS_POR_FILTRO[filtro] || []).includes(d.slug));

  // El nombre y la descripción se traducen aquí: son los 41 destinos que ya
  // viven traducidos en `destinos.en.ts`.
  const filtrados = base.map((d) => localizeDestino(d, locale));

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      {/* Filtros — type="button" para evitar submit accidental en forms */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {t.filtros.map((f) => (
          <button
            key={f.value}
            type="button"
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
          {filtrados.length} {filtrados.length !== 1 ? t.contadorPlural : t.contadorSingular}
        </span>
      </div>

      {/* Grid de tarjetas — stretched link pattern: toda la tarjeta lleva a detalle,
          el botón de WhatsApp es independiente con z-10 para no quedar bloqueado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtrados.map((d) => {
          const difCls = DIFICULTAD_CLS[d.dificultad] ?? DIFICULTAD_CLS.media;
          const difLabel = t.dificultad[d.dificultad] ?? t.dificultad.media;
          const usd = toUSD(d.precio_entrada);
          return (
            <div
              key={d.slug}
              className="group relative border border-white/8 bg-negro/40 hover:border-verde-vivo/40 transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Stretched link — cubre toda la tarjeta */}
              <Link
                href={lp(`/destinos/${d.slug}`)}
                aria-label={t.verAria(d.nombre)}
                className="absolute inset-0 z-0"
              />

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
                <span className={`absolute top-3 right-3 text-[8px] tracking-[1.5px] uppercase px-2 py-0.5 font-dm font-medium ${difCls}`}>
                  {difLabel}
                </span>

                {/* Badge ícono */}
                <div className="absolute top-3 left-3 w-7 h-7 bg-negro/60 backdrop-blur-sm flex items-center justify-center">
                  <DestinoIcon name={d.icon} className="w-4 h-4 text-verde-vivo" />
                </div>

                {/* Botón Reservar — visible en hover, z-10 sobre el stretched link */}
                <a
                  href={waLink(t.waMensaje(d.nombre))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.reservarAria(d.nombre)}
                  className="relative z-10 absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1da851] text-white text-[9px] tracking-[1.5px] uppercase font-dm px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  {t.reservarBadge}
                </a>
              </div>

              {/* Contenido */}
              <div className="relative z-0 p-4 flex flex-col flex-1">
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

                {/* Footer — precio con "/ persona · entrada" + USD */}
                <div className="flex items-end justify-between border-t border-white/8 pt-3">
                  <div>
                    <span className="text-dorado text-sm font-dm">
                      {d.precio_entrada.split(" ").slice(0, 2).join(" ")}
                    </span>
                    <span className="text-crema/30 text-[9px] font-dm block leading-none mt-0.5">
                      {t.precioNota}{usd && ` · ${usd}`}
                    </span>
                  </div>
                  <span className="text-[9px] tracking-[2px] uppercase text-verde-vivo group-hover:text-lima transition-colors font-dm">
                    {t.verMas}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-20">
          <p className="text-crema/40 font-dm text-sm mb-4">{t.vacioTexto}</p>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className="text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima font-dm border-b border-verde-vivo/30 transition-colors"
          >
            {t.vacioBoton}
          </button>
        </div>
      )}
    </section>
  );
}
