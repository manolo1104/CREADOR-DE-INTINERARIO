"use client";

import type { SalidaVista } from "@/lib/viajeCdmx/salidas";
import { diaMX, pesos, rangoCorto } from "@/lib/viajeCdmx/precio";
import { weekdayYMD } from "@/lib/dates";
import { FaltaPara } from "./FaltaPara";

const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Cómo se ve cada estado. Todos salen de un dato real (`estadoSalida`). */
const ESTADO: Record<SalidaVista["estado"], { texto: string; clase: string }> = {
  preventa:   { texto: "Preventa",          clase: "bg-dorado text-negro" },
  disponible: { texto: "Disponible",        clase: "bg-verde-vivo/20 text-verde-vivo border border-verde-vivo/40" },
  ultimos:    { texto: "Últimos lugares",   clase: "bg-terracota text-crema" },
  agotado:    { texto: "Agotado",           clase: "bg-white/10 text-crema/70" },
  proxima:    { texto: "Próximamente",      clase: "bg-agua/20 text-agua border border-agua/40" },
  cerrada:    { texto: "Ventas cerradas",   clase: "bg-white/10 text-crema/60" },
};

export function TarjetaFecha({
  s,
  elegida,
  onElegir,
  onEspera,
  onCambioDePrecio,
}: {
  s: SalidaVista;
  elegida: boolean;
  onElegir: () => void;
  onEspera: () => void;
  /** La preventa acaba de terminar: hay que volver a pedir los precios. */
  onCambioDePrecio: () => void;
}) {
  const e = ESTADO[s.estado];
  const seVende = s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos";
  const dias = `${DIA_CORTO[weekdayYMD(s.fechaSalida)]} → ${DIA_CORTO[weekdayYMD(s.fechaRegreso)]}`;

  return (
    <article
      className={`relative flex flex-col border p-5 transition-colors ${
        elegida ? "border-dorado bg-dorado/10" : "border-white/10 bg-negro/40 hover:border-white/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-cormorant text-crema text-3xl leading-none">{rangoCorto(s.fechaSalida, s.fechaRegreso)}</p>
          <p className="text-[11px] font-dm text-crema/50 mt-1 uppercase tracking-[1.5px]">{dias}</p>
        </div>
        <span className={`shrink-0 text-[10px] tracking-[1.5px] uppercase font-dm px-2.5 py-1 ${e.clase}`}>{e.texto}</span>
      </div>

      {s.estado === "proxima" ? (
        <p className="text-sm font-dm text-crema/65 mb-4">Abre el {diaMX(s.abreEl)}.</p>
      ) : (
        <>
          <div className="mb-3">
            {s.enPreventa && <p className="text-xs font-dm text-crema/40 line-through">{pesos(s.precio)}</p>}
            <p className="font-dm text-crema">
              <span className="font-cormorant text-dorado text-3xl">{pesos(s.precioVigente)}</span>
              <span className="text-xs text-crema/55"> por persona</span>
            </p>
            {s.enPreventa && s.finPreventa && (
              <p className="text-xs font-dm text-dorado/90 mt-1">
                Preventa hasta el {diaMX(s.finPreventa)} · termina en{" "}
                <FaltaPara hasta={s.finPreventa} onFin={onCambioDePrecio} />
              </p>
            )}
          </div>
          <p className="text-sm font-dm text-crema/75 mb-1">
            {s.estado === "agotado"
              ? "Sin lugares"
              : <>Quedan <strong className="text-crema">{s.disponibles}</strong> de {s.capacidad} lugares</>}
          </p>
          {s.enPago > 0 && (
            <p className="text-xs font-dm text-crema/45 mb-1">
              {s.enPago} {s.enPago === 1 ? "persona está" : "personas están"} pagando en este momento
            </p>
          )}
          <p className="text-[11px] font-dm text-crema/40 mb-4">Se puede apartar hasta el {diaMX(s.fechaCorte)}</p>
        </>
      )}

      <div className="mt-auto">
        {seVende ? (
          <button
            type="button"
            onClick={onElegir}
            aria-pressed={elegida}
            className={`w-full min-h-[48px] text-[11px] tracking-[2px] uppercase font-dm transition-colors ${
              elegida ? "bg-dorado text-negro" : "bg-crema text-verde-profundo hover:bg-dorado"
            }`}
          >
            {elegida ? "Fecha elegida" : "Elegir esta fecha"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEspera}
            className="w-full min-h-[48px] border border-white/25 text-crema hover:bg-white/10 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            {s.estado === "proxima" ? "Avísame cuando abra" : "Lista de espera"}
          </button>
        )}
      </div>
    </article>
  );
}
