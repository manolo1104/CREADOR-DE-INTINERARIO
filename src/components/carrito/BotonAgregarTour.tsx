"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { agregarAlCarrito } from "@/lib/carrito";

/**
 * Agrega un recorrido al carrito desde la propia tarjeta del catálogo, sin
 * tener que entrar a la ficha.
 *
 * Va SIN fecha a propósito. Obligar a elegirla aquí metería un calendario en
 * cada tarjeta del catálogo; la fecha se pone en el carrito, que además es donde
 * el cliente ya está viendo sus días juntos y puede ordenarlos. El pago no deja
 * cobrar nada sin fecha, así que no hay forma de que se cuele una reserva sin
 * día.
 */
export function BotonAgregarTour({
  tourId, tourSlug, tourName, tourImage, precio, porVehiculo,
}: {
  tourId: string;
  tourSlug: string;
  tourName: string;
  tourImage: string;
  precio: number;
  porVehiculo?: boolean;
}) {
  const router = useRouter();
  const [agregado, setAgregado] = useState(false);

  function agregar() {
    // Los tours por vehículo necesitan ruta y unidad, que no caben en una
    // tarjeta: se manda a la ficha, donde sí se eligen.
    if (porVehiculo) {
      router.push(`/reservar-tour/${tourSlug}`);
      return;
    }
    agregarAlCarrito({
      tourId,
      tourSlug,
      tourName,
      tourImage,
      tourDate: "",      // se elige en el carrito
      adults: 2,
      childrenMid: 0,
      childrenSmall: 0,
      total: precio * 2, // referencial; el servidor lo recalcula al cobrar
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={agregar}
      className={`px-3 flex items-center gap-1.5 border text-[10px] tracking-[1.5px] uppercase font-dm transition-colors ${
        agregado
          ? "border-verde-vivo text-verde-vivo bg-verde-vivo/10"
          : "border-white/15 hover:border-dorado/60 text-crema/60 hover:text-dorado"
      }`}
      aria-label={`Agregar ${tourName} al carrito`}
    >
      {agregado ? <Check className="w-3 h-3" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
      {agregado ? "Agregado" : "Carrito"}
    </button>
  );
}
