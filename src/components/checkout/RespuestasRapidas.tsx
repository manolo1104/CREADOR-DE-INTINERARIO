"use client";

import type { RespuestaRapida } from "@/lib/checkoutRespuestas";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Las dudas de último minuto, plegadas, dentro del paso «Tu experiencia».
 * Las respuestas salen de `respuestasRapidas()`; aquí solo se pintan y se mide
 * cuál se abre, para saber qué duda pesa más.
 */
export function RespuestasRapidas({ titulo, respuestas }: { titulo: string; respuestas: RespuestaRapida[] }) {
  if (!respuestas.length) return null;
  return (
    <div className="mt-5 border border-verde-selva/20 bg-verde-selva/[0.04]">
      <p className="px-4 pt-3.5 pb-1 font-dm text-[10px] tracking-[2px] uppercase text-verde-selva">{titulo}</p>
      <div className="divide-y divide-verde-selva/15">
        {respuestas.map((r) => (
          <details
            key={r.id}
            className="group px-4 py-3"
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) trackTourEvent("RESPUESTA_ABIERTA", { id: r.id });
            }}
          >
            <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-[13px] text-negro/80">
              <span>{r.pregunta}</span>
              <span className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="font-dm text-[12px] text-negro/60 leading-relaxed mt-2 pr-6">{r.respuesta}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
