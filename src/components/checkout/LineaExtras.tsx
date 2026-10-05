"use client";

import { useState } from "react";
import Image from "next/image";
import { BedDouble } from "lucide-react";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { formatMXN } from "@/lib/tourBooking";
import { trackTourEvent } from "@/lib/tourTracker";
import { getBooking } from "@/lib/i18n/booking";
import { precioHotelDesde } from "@/components/carrito/carritoComun";
import { HospedajeCarrito } from "@/components/carrito/HospedajeCarrito";
import { TrasladoCarrito } from "@/components/carrito/TrasladoCarrito";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/**
 * Hospedaje y traslado en UNA línea plegada (decisión de Manolo, 4 oct 2026):
 * abiertos a media página alargaban el camino a pagar para todos, aunque la
 * mayoría ya viene con hotel. Se vuelven a ofrecer después de pagar.
 *
 * ⚠️ No se apaga del todo: los carritos con hotel promedian $18,137 contra
 * $7,669 sin él. Por eso la línea lleva foto y precio (no un texto suelto) y
 * se mide cuántos la abren (`EXTRAS_ABIERTO`). Si ya eligió algo, arranca abierta.
 */
export function LineaExtras({ c }: { c: CarritoCheckout }) {
  const { conHotel, conTraslado, locale, items } = c;
  const textos = getBooking(locale).checkout;
  const [abierta, setAbierta] = useState(conHotel || conTraslado);
  // La misma foto con la que arranca el bloque de hospedaje del carrito.
  const foto = (HABITACIONES_HOTEL.find((h) => h.id === "orquideas-2") ?? HABITACIONES_HOTEL[0])?.imagen;

  if (abierta) {
    return (
      <div className="mt-2">
        <HospedajeCarrito c={c} />
        <TrasladoCarrito c={c} />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setAbierta(true);
        trackTourEvent("EXTRAS_ABIERTO", { recorridos: items.length });
      }}
      aria-expanded={false}
      className="mt-5 w-full flex items-center gap-3 border border-negro/10 bg-white hover:border-verde-selva/50 p-3 text-left transition-colors"
    >
      <span className="relative w-14 h-12 flex-shrink-0 overflow-hidden bg-verde-selva/10 flex items-center justify-center">
        {foto ? (
          <Image src={foto} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <BedDouble className="w-5 h-5 text-verde-selva" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-dm text-[13px] text-negro/85">{textos.extrasTitulo}</span>
        <span className="block font-dm text-[11px] text-negro/50 leading-snug">{textos.extrasSub(formatMXN(precioHotelDesde))}</span>
      </span>
      <span className="flex-shrink-0 text-verde-selva font-dm text-lg" aria-hidden="true">+</span>
    </button>
  );
}
