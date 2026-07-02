// Cálculo de precios AUTORITATIVO en el servidor.
// El cliente nunca decide el monto a cobrar: aquí se recalcula desde TOURS_DB.

import { TOURS_DB, type Tour } from "./tours";
import { calcTourTotal, validatePromoCode } from "./tourBooking";

export interface TourChargeInput {
  tourId?:        string;
  tourSlug?:      string;
  adults:         number;
  childrenMid:    number;
  childrenSmall:  number;
  promoCode?:     string;
}

export interface TourChargeResult {
  tour:          Tour;
  total:         number; // total completo (MXN)
  charge:        number; // monto a cobrar ahora (siempre el total — pago 100%)
  promoDiscount: number; // porcentaje aplicado
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(Number(n) || 0);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Recalcula el cargo real de una reserva de tour a partir del catálogo del
 * servidor. Devuelve null si el tour no existe o si se excede el cupo máximo.
 */
export function computeTourCharge(input: TourChargeInput): TourChargeResult | null {
  const tour = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!tour) return null;

  // Tours cobrados POR VEHÍCULO (ej. RZR) no se venden por el flujo por persona:
  // el precio depende de ruta + unidad y se cotiza por WhatsApp.
  if (tour.precioUnidad === "vehiculo") return null;

  const adults        = clampInt(input.adults, 1, tour.groupMax);
  const childrenMid   = clampInt(input.childrenMid, 0, tour.groupMax);
  const childrenSmall = clampInt(input.childrenSmall, 0, tour.groupMax);

  if (adults + childrenMid + childrenSmall > tour.groupMax) return null;

  const promo = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discount: 0 };
  const promoDiscount = promo.valid ? promo.discount : 0;

  const { total } = calcTourTotal(tour.precio, adults, childrenMid, childrenSmall, promoDiscount);

  // Pago 100%: siempre se cobra el total completo (ya no hay opción de depósito).
  return { tour, total, charge: total, promoDiscount };
}
