"use client";

import { useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { useComparador } from "./ComparadorShell";
import { personasDe, type Grupo } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";
import { waLink } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * "¿Cuántos viajan?". Va plegado ("Para 2 adultos · Cambiar"): casi todos
 * comparan en pareja y no hace falta enseñarles tres contadores para eso.
 * Los mismos tres tramos del carrito, así que el total que se ve aquí es el
 * que se ve al reservar.
 */
export function SelectorGrupo() {
  const { grupo, cambiarGrupo, limites, tipo, locale, nombres } = useComparador();
  const ui = comparadorUI(locale);
  const [abierto, setAbierto] = useState(false);
  const lleno = personasDe(grupo) >= limites.maxPersonas;

  const filas: { clave: keyof Grupo; etiqueta: string; min: number }[] = [
    { clave: "adultos", etiqueta: ui.grupo.adultos, min: limites.minAdultos },
    { clave: "ninosMid", etiqueta: ui.grupo.de6a10, min: 0 },
    { clave: "ninosSmall", etiqueta: ui.grupo.menoresDe6, min: 0 },
  ];

  const mover = (clave: keyof Grupo, delta: number) => cambiarGrupo({ ...grupo, [clave]: grupo[clave] + delta });

  return (
    <div className="border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <p className="flex items-center gap-2.5 font-dm text-sm text-crema/85">
          <Users className="w-4 h-4 text-dorado shrink-0" aria-hidden="true" />
          <span>
            <span className="text-crema/50">{ui.grupo.titulo} </span>
            <span className="text-crema">{ui.grupo.resumen(grupo)}</span>
          </span>
        </p>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="comparador-grupo"
          onClick={() => setAbierto((v) => !v)}
          className="min-h-[44px] px-4 font-dm text-[11px] tracking-[2px] uppercase text-dorado border border-dorado/40 hover:bg-dorado/10 transition-colors"
        >
          {abierto ? ui.grupo.listo : ui.grupo.cambiar}
        </button>
      </div>

      {abierto && (
        <div id="comparador-grupo" className="grid gap-2 sm:grid-cols-3 px-4 pb-4">
          {filas.map((f) => (
            <div key={f.clave} className="flex items-center justify-between gap-3 border border-white/8 bg-negro/40 pl-3">
              <span className="font-dm text-sm text-crema/80">{f.etiqueta}</span>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={ui.grupo.menos(f.etiqueta)}
                  disabled={grupo[f.clave] <= f.min}
                  onClick={() => mover(f.clave, -1)}
                  className="w-11 h-11 inline-flex items-center justify-center text-crema/80 hover:text-dorado disabled:text-crema/20 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <span aria-live="polite" className="w-6 text-center font-dm text-base text-crema tabular-nums">
                  {grupo[f.clave]}
                </span>
                <button
                  type="button"
                  aria-label={ui.grupo.mas(f.etiqueta)}
                  disabled={lleno}
                  onClick={() => mover(f.clave, 1)}
                  className="w-11 h-11 inline-flex items-center justify-center text-crema/80 hover:text-dorado disabled:text-crema/20 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {lleno && (
            <p className="sm:col-span-3 font-dm text-xs text-crema/60 pt-1">
              {ui.grupo.tope(limites.maxPersonas)}{" "}
              <a
                href={waLink(ui.total.waGrande(
                  personasDe(grupo),
                  new Intl.ListFormat(locale === "en" ? "en" : "es-MX", { type: "conjunction" }).format(nombres),
                ))}
                target="_blank"
                rel="noopener noreferrer"
                data-wa-manual="1"
                onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "comparador", boton: "grupo_grande", personas: personasDe(grupo) })}
                className="text-[#25D366] underline underline-offset-2"
              >
                WhatsApp
              </a>
            </p>
          )}
          {tipo === "paquetes" && <p className="sm:col-span-3 font-dm text-xs text-crema/45 pt-1">{ui.grupo.notaPaquetes}</p>}
        </div>
      )}
    </div>
  );
}
