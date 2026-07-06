// Cálculo de precios AUTORITATIVO en el servidor.
// El cliente nunca decide el monto a cobrar: aquí se recalcula desde TOURS_DB.

import { TOURS_DB, type Tour, type TourRuta, type TourVehiculo } from "./tours";
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

// ── Tours cobrados POR VEHÍCULO (ej. RZR) ────────────────────────────────────

export interface VehiculoChargeInput {
  tourId?:   string;
  tourSlug?: string;
  ruta?:     string;
  vehiculo?: string;
  unidades?: number;
}

export interface VehiculoChargeResult {
  tour:     Tour;
  ruta:     TourRuta;
  vehiculo: TourVehiculo;
  unidades: number;
  total:    number; // precio del vehículo × unidades (MXN)
  charge:   number; // se cobra el total completo (100%)
}

/**
 * Recalcula el cargo de un tour por vehículo (RZR) desde la matriz flota×ruta
 * del catálogo del servidor. El precio depende de la ruta y de la unidad
 * elegida — el cliente nunca decide el monto. Devuelve null si algo no cuadra.
 */
export function computeVehiculoCharge(input: VehiculoChargeInput): VehiculoChargeResult | null {
  const tour = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!tour || tour.precioUnidad !== "vehiculo" || !tour.rutas || !tour.flota) return null;

  const rutaIdx = tour.rutas.findIndex((r) => r.nombre === input.ruta);
  if (rutaIdx < 0) return null;

  const vehiculo = tour.flota.find((v) => v.nombre === input.vehiculo);
  if (!vehiculo) return null;

  const precio = vehiculo.precios[rutaIdx];
  if (!precio || precio <= 0) return null;

  const unidades = clampInt(input.unidades, 1, 10);
  const total = precio * unidades;

  return { tour, ruta: tour.rutas[rutaIdx], vehiculo, unidades, total, charge: total };
}

/** Nombre descriptivo de una reserva por vehículo: "RZR — Ruta Nacimiento · Defender ×2". */
export function vehiculoBookingName(tour: Tour, rutaNombre: string, vehiculoNombre: string, unidades: number): string {
  const base = tour.nombre.split(" — ")[0];
  const uni  = unidades > 1 ? ` ×${unidades}` : "";
  return `${base} — ${rutaNombre} · ${vehiculoNombre}${uni}`;
}
