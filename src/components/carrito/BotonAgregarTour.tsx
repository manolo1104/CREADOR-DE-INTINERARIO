"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { agregarAlCarrito } from "@/lib/carrito";
import { itemDesdeSlug } from "@/lib/carritoItems";
import { useCarritoSlugs } from "./useCarritoSlugs";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";

/**
 * Agrega un recorrido al carrito desde la propia tarjeta del catálogo, sin
 * tener que entrar a la ficha.
 *
 * Va SIN fecha a propósito. Obligar a elegirla aquí metería un calendario en
 * cada tarjeta del catálogo; la fecha se pone en el carrito, que además es donde
 * el cliente ya está viendo sus días juntos y puede ordenarlos. El pago no deja
 * cobrar nada sin fecha, así que no hay forma de que se cuele una reserva sin
 * día.
 *
 * El botón refleja si el tour YA está en el carrito, no solo si se acaba de
 * pulsar. Antes el "Agregado" era un `setTimeout` de 2.2 s y luego volvía a
 * decir "Carrito": desde el catálogo era imposible saber qué llevabas puesto, y
 * el segundo clic no llevaba a ningún lado.
 */
export function BotonAgregarTour({
  tourSlug, tourName,
}: {
  tourId?: string;
  tourSlug: string;
  tourName: string;
  tourImage?: string;
  precio?: number;
  porVehiculo?: boolean;
}) {
  const router = useRouter();
  const { locale, lp } = useLocale();
  const t = getBooking(locale).barra;
  const enCarrito = useCarritoSlugs().has(tourSlug);
  const [recienAgregado, setRecienAgregado] = useState(false);

  function alPulsar() {
    // Ya lo lleva: el clic sirve para ir a cerrarlo, no para volver a meterlo.
    if (enCarrito) {
      router.push(lp("/reservar/carrito"));
      return;
    }
    const item = itemDesdeSlug(tourSlug);
    if (!item) return;
    agregarAlCarrito(item);
    setRecienAgregado(true);
    setTimeout(() => setRecienAgregado(false), 2200);
  }

  const estado = recienAgregado ? "agregado" : enCarrito ? "dentro" : "fuera";
  const texto  = estado === "agregado" ? t.agregado : estado === "dentro" ? t.enTuCarrito : t.carrito;

  return (
    <button
      type="button"
      onClick={alPulsar}
      className={`px-3 flex items-center gap-1.5 border text-[10px] tracking-[1.5px] uppercase font-dm transition-colors ${
        estado === "fuera"
          ? "border-white/15 hover:border-dorado/60 text-crema/60 hover:text-dorado"
          : "border-verde-vivo text-verde-vivo bg-verde-vivo/10 hover:bg-verde-vivo/20"
      }`}
      aria-label={
        enCarrito
          ? t.yaEstaEnCarrito(tourName)
          : t.agregarAlCarrito(tourName)
      }
    >
      {estado === "fuera"    && <Plus className="w-3 h-3" aria-hidden="true" />}
      {estado === "agregado" && <Check className="w-3 h-3" aria-hidden="true" />}
      {estado === "dentro"   && <ShoppingBag className="w-3 h-3" aria-hidden="true" />}
      {texto}
    </button>
  );
}
