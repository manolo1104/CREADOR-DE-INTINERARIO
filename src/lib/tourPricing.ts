// Cálculo de precios AUTORITATIVO en el servidor.
// El cliente nunca decide el monto a cobrar: aquí se recalcula desde TOURS_DB.

import { TOURS_DB, type Tour, type TourRuta, type TourVehiculo } from "./tours";
import { calcTourTotal, validatePromoCode } from "./tourBooking";

/**
 * Porcentajes de pago permitidos. 30 = "aparta tu lugar" (el resto se liquida
 * el día del tour), 100 = pago completo. Cualquier otro valor cae a 100.
 */
export const PCTS_TOUR = new Set([30, 100]);

/** Normaliza el porcentaje que llega del cliente. Nunca se confía en él. */
export function normalizarPct(pct: unknown): number {
  const n = Math.round(Number(pct));
  return PCTS_TOUR.has(n) ? n : 100;
}

export interface TourChargeInput {
  tourId?:        string;
  tourSlug?:      string;
  adults:         number;
  childrenMid:    number;
  childrenSmall:  number;
  promoCode?:     string;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:           number;
  /** Actividades opcionales. Del cliente SOLO se acepta el id y la cantidad. */
  addOns?:        { id: string; cantidad: number }[];
}

export interface TourChargeResult {
  tour:          Tour;
  total:         number; // total completo de la reserva (MXN)
  charge:        number; // monto a cobrar AHORA (total, o el 30 % si es anticipo)
  saldo:         number; // lo que queda por pagar el día del tour
  pct:           number; // porcentaje efectivamente cobrado
  promoDiscount: number; // porcentaje de descuento aplicado
  /** Add-ons validados, ya con su precio de catálogo. Vacío si no hubo. */
  addOns:        { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  addOnsTotal:   number;
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(Number(n) || 0);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Valida la fecha del tour contra el calendario real. Hasta ahora el servidor
 * NO la miraba: se podía cobrar una reserva para una fecha pasada o para dentro
 * de dos años manipulando el sessionStorage. Vacía se acepta (los tours por
 * WhatsApp coordinan la fecha después).
 */
export function fechaTourValida(tourDate: unknown): boolean {
  if (!tourDate) return true;
  if (typeof tourDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) return false;

  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoyMX.split("-").map(Number);
  const hoy   = new Date(y, m - 1, d);
  const tope  = new Date(y, m - 1 + 12, d); // un año vista, holgado

  const [ty, tm, td] = tourDate.split("-").map(Number);
  const fecha = new Date(ty, tm - 1, td);
  if (Number.isNaN(fecha.getTime())) return false;

  return fecha >= hoy && fecha <= tope;
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

  const personas = adults + childrenMid + childrenSmall;
  if (personas > tour.groupMax) return null;

  // Mínimo del tour. Existía en los datos pero solo lo miraba el bot: por la web
  // se podía pagar un rafting para 2 cuando la balsa no sale con menos de 4, y
  // eso terminaba en una llamada para reprogramar o en un reembolso.
  if (personas < tour.groupMin) return null;

  // Tours solo para adultos (ej. buceo Media Luna, edad mínima 10): el servidor
  // RECHAZA cualquier reserva con niños aunque la UI los oculte. Sin esta guarda
  // se podía pagar con descuento de niño manipulando el sessionStorage.
  if (tour.soloAdultos && childrenMid + childrenSmall > 0) return null;

  const promo = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discount: 0 };
  const promoDiscount = promo.valid ? promo.discount : 0;

  const { total: totalTour } = calcTourTotal(tour.precio, adults, childrenMid, childrenSmall, promoDiscount);

  // ── Add-ons ───────────────────────────────────────────────────────────────
  // El precio se lee SIEMPRE del catálogo del propio tour, nunca del cliente.
  // Un id que no exista en este tour se ignora en silencio en vez de cobrarse.
  const addOns: TourChargeResult["addOns"] = [];
  for (const pedido of input.addOns ?? []) {
    const cat = (tour.addOns ?? []).find((a) => a.id === pedido?.id);
    if (!cat) continue;
    // Nadie puede comprar el add-on para más gente de la que va en la reserva.
    const cantidad = clampInt(pedido?.cantidad, 0, personas);
    if (cantidad <= 0) continue;
    addOns.push({
      id:       cat.id,
      nombre:   cat.nombre,
      cantidad,
      precio:   cat.precio,
      subtotal: cat.precio * cantidad,
    });
  }
  const addOnsTotal = addOns.reduce((acc, a) => acc + a.subtotal, 0);

  // Los add-ons no llevan descuento de promo ni tarifa de niño: son precio fijo
  // por persona que lo toma.
  const total = totalTour + addOnsTotal;

  // Anticipo: se cobra ahora el 30 % y el saldo se liquida el día del tour.
  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return { tour, total, charge, saldo: total - charge, pct, promoDiscount, addOns, addOnsTotal };
}

// ── Tours cobrados POR VEHÍCULO (ej. RZR) ────────────────────────────────────

export interface VehiculoChargeInput {
  tourId?:   string;
  tourSlug?: string;
  ruta?:     string;
  vehiculo?: string;
  unidades?: number;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:      number;
}

export interface VehiculoChargeResult {
  tour:     Tour;
  ruta:     TourRuta;
  vehiculo: TourVehiculo;
  unidades: number;
  total:    number; // precio del vehículo × unidades (MXN)
  charge:   number; // monto a cobrar ahora (total, o el 30 % si es anticipo)
  saldo:    number; // lo que queda por pagar el día del tour
  pct:      number; // porcentaje efectivamente cobrado
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

  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return {
    tour, ruta: tour.rutas[rutaIdx], vehiculo, unidades,
    total, charge, saldo: total - charge, pct,
  };
}

/** Nombre descriptivo de una reserva por vehículo: "RZR — Ruta Nacimiento · Defender ×2". */
export function vehiculoBookingName(tour: Tour, rutaNombre: string, vehiculoNombre: string, unidades: number): string {
  const base = tour.nombre.split(" — ")[0];
  const uni  = unidades > 1 ? ` ×${unidades}` : "";
  return `${base} — ${rutaNombre} · ${vehiculoNombre}${uni}`;
}
