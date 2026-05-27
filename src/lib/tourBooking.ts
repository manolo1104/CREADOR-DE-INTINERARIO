// Estado del carrito de reserva de tours — persiste en sessionStorage

export interface TourBookingState {
  tourId:        string;
  tourSlug:      string;
  tourName:      string;
  tourImage:     string;
  tourDuration:  number;
  priceAdult:    number;
  tourDate:      string; // YYYY-MM-DD
  adults:        number;
  children:      number; // total menores (childrenMid + childrenSmall)
  childrenMid:   number; // 6–10 años → 70 % del precio adulto
  childrenSmall: number; // menores de 6 → 50 % del precio adulto
  promoCode:     string;
  promoDiscount: number; // porcentaje 0–100
  subtotal:      number;
  total:         number;  // precio total completo
  chargeAmount:  number;  // monto real a cobrar (depósito o total)
  paymentMode:   "deposit" | "full";
  sessionId:     string;
}

const KEY = "hp_tour_booking_state";

export function saveTourBookingState(state: TourBookingState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function loadTourBookingState(): TourBookingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearTourBookingState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function formatMXN(n: number) {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

// ── Precios ──────────────────────────────────────────────────

export function calcTourTotal(
  priceAdult:    number,
  adults:        number,
  childrenMid:   number, // 6–10 años → 70 %
  childrenSmall: number, // menores de 6 → 50 %
  promoDiscount: number
) {
  const childPriceMid   = Math.round(priceAdult * 0.7);
  const childPriceSmall = Math.round(priceAdult * 0.5);
  const subtotal = priceAdult * adults + childPriceMid * childrenMid + childPriceSmall * childrenSmall;
  const discount = Math.round(subtotal * promoDiscount / 100);
  return { subtotal, discount, total: subtotal - discount, childPriceMid, childPriceSmall };
}

// ── Códigos promo ────────────────────────────────────────────

const PROMO_CODES: Record<string, number> = {
  HUASTECA20:  20,
  GRUPAL15:    15,
  XILITLA10:   10,
};

export function validatePromoCode(code: string): { valid: boolean; discount: number; msg: string } {
  const upper = code.trim().toUpperCase();
  const pct   = PROMO_CODES[upper];
  if (!pct) return { valid: false, discount: 0, msg: "Código no válido" };
  return { valid: true, discount: pct, msg: `${pct} % de descuento aplicado ✓` };
}

// ── Formato de fecha para UI ─────────────────────────────────

export function formatTourDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const f = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

// Fecha mínima seleccionable (mañana)
export function minBookingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
