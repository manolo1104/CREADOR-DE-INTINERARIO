"use client";

import { Check } from "lucide-react";

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
      className={`bg-white border scroll-mt-4 transition-colors ${abierto ? "border-negro/15 shadow-sm" : "border-negro/10"}`}
    >
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-dm text-[12px] font-medium ${
            estado === "hecho"
              ? "bg-verde-selva text-crema"
              : abierto
                ? "bg-verde-profundo text-crema"
                : "border border-negro/20 text-negro/35"
          }`}
          aria-hidden="true"
        >
          {estado === "hecho" ? <Check className="w-4 h-4" /> : numero}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={`${id}-titulo`}
            className={`font-cormorant text-[22px] leading-tight ${estado === "bloqueado" ? "text-negro/35" : "text-verde-profundo"}`}
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
            className="flex-shrink-0 font-dm text-[12px] text-verde-selva underline underline-offset-2 hover:text-verde-vivo"
          >
            {textoEditar}
          </button>
        )}
      </div>
      {abierto && (
        <div id={`${id}-contenido`} className="px-4 sm:px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}
