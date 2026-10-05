"use client";

import Image from "next/image";
import { formatMXN } from "@/lib/tourBooking";
import { TOURS_DB, etiquetaUnidad } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/** «＋ Agregar otro recorrido» con la lista del catálogo, sin salir del carrito. */
export function AgregarRecorrido({ c }: { c: CarritoCheckout }) {
  const { locale, en, t, items, mostrarLista, setMostrarLista, agregarDelCatalogo } = c;
  // Agregar otro recorrido sin salir del carrito: antes había que volver al
  // catálogo, buscarlo y regresar.
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setMostrarLista((v) => !v)}
        aria-expanded={mostrarLista}
        className="w-full border border-dashed border-verde-selva/40 text-verde-selva hover:bg-verde-selva/5 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
      >
        {t.agregarOtroRecorrido}
        <span className="block mt-1 font-dm text-[11px] tracking-normal normal-case text-verde-selva">
          {items.length === 1 ? t.gancho2doRecorrido : t.gancho3erRecorrido}
        </span>
      </button>

      {mostrarLista && (
        <div className="mt-3 border border-negro/10 bg-white divide-y divide-negro/8 max-h-80 overflow-y-auto">
          {TOURS_DB.filter((x) => !items.some((i) => i.tourSlug === x.slug))
            .map((x) => localizeTour(x, locale))
            .map((x) => (
            <button
              key={x.slug}
              type="button"
              onClick={() => { agregarDelCatalogo(x.slug); setMostrarLista(false); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-verde-selva/5 text-left transition-colors"
            >
              <span className="relative w-14 h-11 flex-shrink-0 overflow-hidden">
                <Image src={x.imagen_hero} alt="" fill className="object-cover" sizes="56px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-dm text-[13px] text-negro/85 truncate">{x.nombre.split("—")[0].trim()}</span>
                {/* `etiquetaUnidad` y no un ternario de dos casos: el Edén
                    se cobra por GRUPO y aquí salía "por persona". Y con
                    "desde": su `precio` es solo el primer escalón. */}
                <span className="block font-dm text-[11px] text-negro/45">
                  {x.precioUnidad === "grupo" ? `${t.desde} ` : ""}{formatMXN(x.precio)} {etiquetaUnidad(x, en)}
                </span>
              </span>
              <span className="flex-shrink-0 text-verde-selva font-dm text-lg" aria-hidden="true">+</span>
            </button>
          ))}
          {TOURS_DB.every((x) => items.some((i) => i.tourSlug === x.slug)) && (
            <p className="p-4 font-dm text-[12px] text-negro/45 text-center">
              {t.yaTienesTodos}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
