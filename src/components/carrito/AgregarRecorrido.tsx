"use client";

import Image from "next/image";
import { Plus, ChevronDown } from "lucide-react";
import { formatMXN } from "@/lib/tourBooking";
import { TOURS_DB, etiquetaUnidad } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { itemDesdeSlug } from "@/lib/carritoItems";
import { trackAddToCart, renglonDeCarrito } from "@/lib/analytics";
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
        /* 🔴 Era un borde PUNTEADO al 40 % con letra de 11 px: el lenguaje de
           «esto es opcional y secundario». Ahora es una superficie de verdad
           —fondo verde claro, borde sólido, el ＋ en un disco— y el gancho se
           lee antes que la acción, porque el gancho es el argumento. Sigue sin
           ser dorado a propósito: el dorado es «pagar», y esto no lo es. */
        className="flex w-full items-center gap-3 border border-verde-selva/35 bg-verde-selva/[0.07] px-4 py-4 text-left transition-colors hover:border-verde-selva/60 hover:bg-verde-selva/10"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-verde-selva text-crema"
        >
          <Plus className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-dm text-[13px] font-medium leading-snug text-verde-profundo">
            {items.length === 1 ? t.gancho2doRecorrido : t.gancho3erRecorrido}
          </span>
          <span className="mt-0.5 block font-dm text-[11px] uppercase tracking-[1.5px] text-verde-selva">
            {t.agregarOtroRecorrido}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-verde-selva/60 transition-transform duration-200 ${mostrarLista ? "rotate-180" : ""}`}
        />
      </button>

      {mostrarLista && (
        <div className="mt-3 border border-negro/10 bg-white divide-y divide-negro/8 max-h-80 overflow-y-auto">
          {TOURS_DB.filter((x) => !items.some((i) => i.tourSlug === x.slug))
            .map((x) => localizeTour(x, locale))
            .map((x) => (
            <button
              key={x.slug}
              type="button"
              onClick={() => {
                agregarDelCatalogo(x.slug);
                setMostrarLista(false);
                // A GA4, el mismo renglón que acaba de armar el carrito
                // (`itemDesdeSlug` siempre da lo mismo para el mismo slug).
                const nuevo = itemDesdeSlug(x.slug);
                if (nuevo) trackAddToCart({ ...renglonDeCarrito(nuevo), source: "carrito" });
              }}
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
