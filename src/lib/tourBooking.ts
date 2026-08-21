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
  chargeAmount:  number;  // monto real a cobrar hoy (anticipo o total)
  pct:           number;  // 30 (anticipo) o 100 (pago completo)
  saldo:         number;  // lo que queda por pagar el día del tour
  paymentMode:   "deposit" | "full";
  sessionId:     string;
  // Tours cobrados por vehículo (RZR): ruta + unidad elegida
  ruta?:         string;
  vehiculo?:     string;
  unidades?:     number;
  /** Actividades opcionales elegidas. El servidor revalida id y cantidad. */
  addOns?:       { id: string; nombre: string; cantidad: number; precio: number }[];
  /** Elección de recorrido cuando el tour la exige (ej. Ruta Acuática). */
  eleccion?:     { id: string; nombre: string };
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

/**
 * Códigos promocionales, con la fecha en que dejan de servir.
 *
 * Antes eran tres números sueltos sin caducidad ni condiciones: quien
 * encontrara `HUASTECA20` —en una captura, en un foro, en un correo viejo—
 * tenía 20 % de por vida sobre cualquier reserva. Un descuento que no vence no
 * es una promoción, es un precio nuevo.
 *
 * `vence` es el ÚLTIMO día en que el código sirve (inclusive), en horario de
 * México. Para retirar un código basta con ponerle una fecha pasada; para
 * dejarlo indefinido, omitir el campo — pero eso debería ser la excepción.
 */
// Sin códigos activos por decisión de Manolo (20 ago 2026). Los tres que había
// —HUASTECA20, GRUPAL15, XILITLA10— se retiraron; se agregarán otros después.
// La maquinaria se queda en pie: basta añadir una línea aquí para revivirlos,
// y `vence` los caduca solo.
const PROMO_CODES: Record<string, { pct: number; vence?: string }> = {};

/** Hoy en Ciudad de México, como YYYY-MM-DD. El servidor puede correr en UTC. */
function hoyMX(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

export function validatePromoCode(code: string): { valid: boolean; discount: number; msg: string } {
  const upper = code.trim().toUpperCase();
  const promo = PROMO_CODES[upper];
  if (!promo) return { valid: false, discount: 0, msg: "Código no válido" };
  if (promo.vence && hoyMX() > promo.vence) {
    // Se distingue de "no válido" a propósito: quien teclea un código vencido
    // sí lo tuvo alguna vez, y merece saber que existió y ya no sirve.
    return { valid: false, discount: 0, msg: "Ese código ya venció" };
  }
  return { valid: true, discount: promo.pct, msg: `${promo.pct} % de descuento aplicado ✓` };
}

// ── Formato de fecha para UI ─────────────────────────────────

/**
 * Fecha larga para la interfaz.
 *
 * El locale es opcional y cae en español: hay una veintena de llamadas en el
 * lado ES y en los correos que no tienen por qué enterarse de que existe el
 * inglés. El motor sí lo pasa — un cliente que reserva en `/en` tiene que ver
 * "Saturday, September 5, 2026", no "Sábado, 5 de septiembre de 2026".
 */
export function formatTourDate(dateStr: string, locale: "es" | "en" = "es") {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  const f = d.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

// Fecha mínima seleccionable (mañana, en horario de México para evitar
// desfases por UTC cerca de la medianoche).
export function minBookingDate() {
  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }); // YYYY-MM-DD
  const [y, m, d] = hoyMX.split("-").map(Number);
  const manana = new Date(y, m - 1, d + 1);
  const yyyy = manana.getFullYear();
  const mm = String(manana.getMonth() + 1).padStart(2, "0");
  const dd = String(manana.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
