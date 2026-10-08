"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { agregarAlCarrito } from "@/lib/carrito";
import { itemDesdeSlug } from "@/lib/carritoItems";
import type { CarritoItem } from "@/lib/carrito";
import { leerIntencion } from "@/lib/intencionInicio";
import { TOURS_DB } from "@/lib/tours";
import { minBookingDate, minimoPersonas } from "@/lib/tourBooking";
import { trackAddToCart, renglonDeCarrito } from "@/lib/analytics";
import { useCarritoSlugs } from "./useCarritoSlugs";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";

/**
 * Agrega un recorrido al carrito desde la propia tarjeta del catálogo, sin
 * tener que entrar a la ficha.
 *
 * NO pide la fecha aquí: un calendario en cada tarjeta del catálogo es ruido, y
 * la fecha se elige dentro del carrito, que es donde el cliente ve sus días
 * juntos y puede ordenarlos. El pago no deja cobrar nada sin fecha, así que no
 * hay forma de que se cuele una reserva sin día.
 *
 * 🔴 Lo que sí hace desde el 8 oct 2026 es USAR la que ya dio. Quien declaró
 * «20 de noviembre, 4 personas» en el buscador del inicio llegaba al catálogo,
 * agregaba un recorrido y el renglón entraba vacío y con 2 personas: tenía que
 * volver a decir lo mismo por tercera vez. Pedirla y aprovecharla no son lo
 * mismo.
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
    /* Lo que declaró en el buscador del inicio, si sigue valiendo. Se valida
       aquí y no se confía: `leerIntencion` ya borra una fecha de ayer, pero el
       grupo tiene que caber en ESTE recorrido —el buscador no sabe de cupos— y
       una fecha de hoy no sirve, porque el mínimo del motor es mañana. */
    const intencion = leerIntencion();
    const tour = TOURS_DB.find((x) => x.slug === tourSlug);
    const base: Partial<Omit<CarritoItem, "uid">> = {};
    if (intencion && tour) {
      if (intencion.fecha && intencion.fecha >= minBookingDate()) base.tourDate = intencion.fecha;
      const n = intencion.personas;
      if (n >= minimoPersonas(tour) && n <= tour.groupMax && tour.precioUnidad !== "vehiculo") {
        base.adults = n;
      }
    }
    const item = itemDesdeSlug(tourSlug, base);
    if (!item) return;
    agregarAlCarrito(item);
    // A GA4 va el renglón tal como entró de verdad: con la fecha y la gente que
    // traía del buscador, si las traía.
    trackAddToCart({ ...renglonDeCarrito(item), source: "catalogo" });
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
