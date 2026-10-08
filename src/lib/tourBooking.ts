// Estado del carrito de reserva de tours — persiste en sessionStorage

import { precioGrupo, precioPorCabeza, type Tour } from "./tours";

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

// ── Viajero solo ─────────────────────────────────────────────

/**
 * Cuántos días antes se le confirma —o se le cancela— a quien reservó solo.
 *
 * No es un plazo de reembolso: el dinero lo devuelve Manolo a mano en Stripe y
 * prometer un «en X días» que nadie va a cumplir es peor que no decir nada. Es
 * cuándo se le avisa si la salida corre o no.
 */
export const CONFIRMA_SALIDA_DIAS = 7;

/** Lo mínimo de un recorrido que la regla necesita para decidir. */
type TourParaSolo = Pick<Tour, "groupMin" | "precioUnidad" | "tarifaGrupo">;

/**
 * ¿Este recorrido se puede reservar para UNA persona?
 *
 * ## La historia, porque el modelo cambió dos veces
 *
 * Hasta el 1 oct 2026 el mínimo de 2 era un muro mudo: en Clarity, un visitante
 * de EE. UU. tocó «−» doce veces para bajar a un adulto, el contador no se
 * movió, nada le explicó por qué, y se fue. Ese día se abrió, pero cobrándole
 * **el precio de dos personas menos $2**: la salida tiene costos fijos (en
 * Tamul, $1,700 por salida contra $395 por persona) y con uno no se pagaban.
 *
 * 🔴 **8 oct 2026, Manolo lo cambió:** paga SU lugar, a tarifa normal, se le
 * une a una salida compartida y **si no se junta el mínimo se le devuelve
 * todo**. Lo que protege el margen ya no es el precio, es que la salida no
 * corre si no se llena. Pagar casi el doble por ir solo era, en los hechos,
 * seguir diciéndole que no.
 *
 * Por eso ahora entran TAMBIÉN el rappel (mínimo 4) y el rafting (mínimo 5),
 * que antes mandaban a WhatsApp: con la promesa del reembolso, el mínimo deja
 * de ser el muro y pasa a ser la condición, que es algo que sí se puede decir.
 *
 * Siguen fuera, y no por capricho:
 * - **tarifa por grupo** (el Edén): ya acepta a una persona con su escalón, y
 *   ahí el precio es del grupo, no de la cabeza;
 * - **por vehículo** (el RZR): no cuenta personas, cuenta unidades.
 */
export function aceptaViajeroSolo(tour: TourParaSolo): boolean {
  return tour.precioUnidad !== "vehiculo" && !tour.tarifaGrupo?.length;
}

/** Con cuántas personas se puede reservar en línea este recorrido. */
export function minimoPersonas(tour: TourParaSolo): number {
  return aceptaViajeroSolo(tour) ? 1 : tour.groupMin;
}

/**
 * ¿Va UNA persona a una salida que todavía no está armada?
 *
 * Sirve para avisar —en la ficha, en el carrito, en el correo y al equipo— que
 * esa reserva depende de que se junte el grupo. Ya NO cambia el precio.
 */
export function esViajeroSolo(tour: TourParaSolo, adults: number, childrenMid = 0, childrenSmall = 0): boolean {
  return aceptaViajeroSolo(tour) && adults + childrenMid + childrenSmall < tour.groupMin;
}

/**
 * Lo que cuesta un recorrido para esta gente, por el camino que le toque:
 * tarifa del GRUPO COMPLETO por escalones si el tour la tiene, la de viajero
 * solo si va una persona, y si no el precio por cabeza con los tramos de menor.
 *
 * 🔴 Existe porque el carrito tenía su propio `calcTourTotal` a pelo y le
 * pintaba al cliente $11,960 (2,990 × 4) por una experiencia que el servidor
 * iba a cobrar en $3,480. Todo lo que muestre un total de recorrido tiene que
 * pasar por aquí; el servidor hace la misma bifurcación en `computeTourCharge`.
 */
export function totalRecorrido(
  tour: Pick<Tour, "precio" | "precioLista" | "tarifaGrupo" | "escalaPersona" | "groupMin" | "precioUnidad">,
  adults: number,
  childrenMid = 0,
  childrenSmall = 0,
  promoDiscount = 0,
): number {
  const delGrupo = precioGrupo(tour, adults + childrenMid + childrenSmall);
  if (delGrupo !== null) return delGrupo - Math.round(delGrupo * promoDiscount / 100);
  // 🔴 Aquí vivía la tarifa de viajero solo (precio × 2 − $2). Se fue el 8 oct
  // 2026: quien va solo paga su lugar y punto. Lo que cuida el margen es que la
  // salida no corre bajo el mínimo, no cobrarle el doble.
  // El escalón lo decide el total de cabezas —los niños también ocupan lugar—
  // y después cada quien paga lo suyo sobre ESE precio: el adulto completo, el
  // de 6 a 10 el 70 % y el menor de 6 el 50 %.
  const porCabeza = precioPorCabeza(tour, adults + childrenMid + childrenSmall);
  return calcTourTotal(porCabeza, adults, childrenMid, childrenSmall, promoDiscount).total;
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
// Los tres que había —HUASTECA20, GRUPAL15, XILITLA10— se retiraron por
// decisión de Manolo (20 ago 2026). Para revivir uno basta una línea aquí, y
// `vence` lo caduca solo.
const PROMO_CODES: Record<string, { pct: number; vence?: string }> = {
  // Tarjeta impresa que el guía entrega EN PERSONA a quien llegó por Viator o
  // GetYourGuide, para que su siguiente tour lo reserve directo (decisión de
  // Manolo, 7 oct 2026; nunca «traslado gratis»: cuesta más que la comisión).
  // 🔴 Los contratos de Viator (Supplier Agreement 4.5, ago 2026) y de
  // GetYourGuide (Supplier T&C 5.1, 1 oct 2026) prohíben promover la reserva
  // directa entre SUS clientes: a quién se entrega lo decide Manolo.
  // El carrito no tiene campo de código: se canjea por WhatsApp y el equipo lo
  // aplica en la cotización o la reserva del panel.
  DIRECTO10: { pct: 10, vence: "2027-10-31" },
};

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
