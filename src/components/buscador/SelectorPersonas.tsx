"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Minus, Plus, Users, X } from "lucide-react";
import type { buscadorUI } from "@/lib/i18n/buscador";

/**
 * El campo «¿Cuántos van?» del buscador, en su propio archivo porque lo usan
 * DOS pantallas: el hero del inicio y el filtro de `/reservar`. Copiado, el de
 * una se quedaría viejo en cuanto alguien tocara el de la otra — que es justo
 * lo que ya pasó con las píldoras antes de `lib/filtroTours.ts`.
 */

/**
 * El control, sin borde ni fondo propios: en el hero el vidrio es la FILA, no
 * cada campo. En `/reservar` no hay vidrio, así que allá se le añade la caja
 * por fuera.
 */
export const CONTROL_BUSCADOR =
  "flex w-full min-h-[34px] items-center justify-between gap-2 bg-transparent " +
  "font-dm text-base text-crema focus:outline-none";

/**
 * «¿Cuántos van?» con el mismo gesto que los otros dos campos: un botón que
 * abre una hoja centrada en un portal.
 *
 * El portal no es decoración: el hero lleva `overflow-clip` para que el video
 * se quede pegado, y cualquier cosa colgada de la fila se recorta. Es la misma
 * razón por la que el desplegable de «¿Qué quieres ver?» y el calendario abren
 * centrados.
 *
 * 🔴 Antes eran los botones −/+ metidos en la fila. En el teléfono eran dos
 * blancos de 36 px pegados a 9 px uno del otro, que es la receta para tocar el
 * que no era.
 */
export function SelectorPersonas({
  personas, min, max, onChange, ui, montado, etiquetaId,
}: {
  personas: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  ui: ReturnType<typeof buscadorUI>;
  montado: boolean;
  /** El id del `<span>` que dice «¿Cuántos van?», para que el botón lo herede. */
  etiquetaId?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAbierto(false); disparador.current?.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  const mover = (d: number) => onChange(Math.min(max, Math.max(min, personas + d)));

  return (
    <>
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-labelledby={etiquetaId}
        className={CONTROL_BUSCADOR}
      >
        <Users className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true" />
        {/* Sin `truncate`: «2 personas» se cortaba en «2 p…» en escritorio. */}
        <span className="min-w-0 flex-1 whitespace-nowrap text-left tabular-nums">{ui.personas(personas)}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-crema/40 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {abierto && montado && createPortal(
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-negro/70 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="personas-titulo"
            className="absolute left-1/2 top-1/2 w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-centrado overflow-hidden rounded-2xl border border-crema/20 bg-negro shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-crema/10 px-5 py-3.5">
              <p id="personas-titulo" className="font-cormorant text-lg text-crema">{ui.cuantos}</p>
              <button
                type="button"
                onClick={() => { setAbierto(false); disparador.current?.focus(); }}
                aria-label={ui.cerrar}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-crema/50 transition-colors hover:text-crema"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-6 px-6 py-7">
              <button
                type="button"
                aria-label={ui.menos}
                disabled={personas <= min}
                onClick={() => mover(-1)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-crema/25 text-crema/80 transition-colors hover:border-dorado hover:text-dorado disabled:cursor-not-allowed disabled:border-crema/10 disabled:text-crema/20"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>
              <p aria-live="polite" className="font-cormorant text-3xl text-crema tabular-nums">
                {ui.personas(personas)}
              </p>
              <button
                type="button"
                aria-label={ui.mas}
                disabled={personas >= max}
                onClick={() => mover(1)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-crema/25 text-crema/80 transition-colors hover:border-dorado hover:text-dorado disabled:cursor-not-allowed disabled:border-crema/10 disabled:text-crema/20"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setAbierto(false); disparador.current?.focus(); }}
              className="w-full border-t border-crema/10 py-4 font-dm text-[12px] uppercase tracking-[2px] text-dorado transition-colors hover:bg-dorado/10"
            >
              {ui.listo}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
