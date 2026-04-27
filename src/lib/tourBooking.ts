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
  children:      number; // 4–12 años → 60 % del precio adulto
  promoCode:     string;
  promoDiscount: number; // porcentaje 0–100
  subtotal:      number;
  total:         number;
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
  priceAdult: number,
  adults: number,
  children: number,
  promoDiscount: number
) {
  const childPrice = Math.round(priceAdult * 0.6);
  const subtotal   = priceAdult * adults + childPrice * children;
  const discount   = Math.round(subtotal * promoDiscount / 100);
  return { subtotal, discount, total: subtotal - discount, childPrice };
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
