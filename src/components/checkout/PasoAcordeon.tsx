"use client";

import { Check, Lock } from "lucide-react";
import { SOMBRA_ACTIVA, TARJETA } from "./estilos";

export type EstadoPaso = "abierto" | "hecho" | "bloqueado";

/**
 * Un paso del checkout que se pliega en una línea al terminarlo.
 *
 * La página de antes era una sola columna de casi 4,000 px en celular: no se
 * sabía cuánto faltaba. Con los tres pasos a la vista —y los terminados
 * resumidos en una línea que se puede editar— la persona ve dónde está y que
 * le falta poco (Baymard, «accordion checkout»).
 */
export function PasoAcordeon({
  id,
  numero,
  titulo,
  estado,
  resumen,
  textoEditar,
  onEditar,
  children,
}: {
  id: string;
  numero: number;
  titulo: string;
  estado: EstadoPaso;
  /** Lo elegido, en una línea, cuando el paso ya está hecho. */
  resumen?: string;
  textoEditar: string;
  onEditar?: () => void;
  children: React.ReactNode;
}) {
  const abierto = estado === "abierto";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`${TARJETA} scroll-mt-4 transition-[box-shadow,border-color,background-color] duration-200 ${
        abierto ? `border-negro/10 ${SOMBRA_ACTIVA}` : estado === "bloqueado" ? "bg-white/60" : ""
      }`}
    >
      <div className={`flex items-center gap-3 px-4 sm:px-6 ${abierto ? "pt-5 pb-4" : "py-4"}`}>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-dm text-[13px] font-medium transition-colors ${
            estado === "hecho"
              ? "bg-verde-selva/10 text-verde-selva"
              : abierto
                ? "bg-verde-selva text-crema shadow-[0_0_0_4px_rgba(58,107,26,0.12)]"
                : "border border-negro/15 text-negro/35"
          }`}
          aria-hidden="true"
        >
          {estado === "hecho" ? <Check className="w-4 h-4" strokeWidth={2.5} /> : numero}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={`${id}-titulo`}
            className={`font-cormorant leading-tight ${abierto ? "text-[24px]" : "text-[21px]"} ${estado === "bloqueado" ? "text-negro/40" : "text-verde-profundo"}`}
          >
            {titulo}
          </h2>
          {estado === "hecho" && resumen && (
            <p className="font-dm text-[12px] text-negro/55 truncate">{resumen}</p>
          )}
        </div>
        {estado === "hecho" && onEditar && (
          <button
            type="button"
            onClick={onEditar}
            aria-expanded={false}
            aria-controls={`${id}-contenido`}
            className="flex-shrink-0 min-h-[36px] rounded-full border border-verde-selva/25 px-3.5 font-dm text-[12px] text-verde-selva transition-colors hover:border-verde-selva hover:bg-verde-selva/5"
          >
            {textoEditar}
          </button>
        )}
        {estado === "bloqueado" && <Lock className="w-3.5 h-3.5 flex-shrink-0 text-negro/25" aria-hidden="true" />}
      </div>
      {abierto && (
        <div id={`${id}-contenido`} className="px-4 sm:px-6 pb-6">
          {children}
        </div>
      )}
    </section>
  );
}
