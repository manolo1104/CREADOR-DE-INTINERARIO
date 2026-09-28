import { HABITACIONES_HOTEL } from "@/lib/habitaciones";

/**
 * Las habitaciones del Hotel Paraíso Encantado tal y como las ofrece EL PANEL
 * (cotizaciones y reservas), con su tarifa por noche según cuánta gente duerma
 * en ellas.
 *
 * 🔴 Antes había DOS listas escritas a mano y ninguna coincidía con el hotel:
 * `/cotizaciones` ofrecía dos categorías sueltas ("Vista Montañas $1,800" —un
 * precio que no existe en ninguna otra tabla del sistema— y "Vista Jardines
 * $1,500") y `/reservas` nueve nombres con un solo precio cada uno, entre ellos
 * una "Suite Lajas" que el hotel no tiene. Además ninguna de las dos subía el
 * precio cuando dormían 3 o 4 personas en el cuarto, así que una familia de
 * cuatro se cotizaba al precio de dos.
 *
 * Ahora la lista sale del catálogo real (`src/lib/habitaciones.ts`, copiado del
 * sistema con el que cobra el hotel): si el hotel da de alta un cuarto, aparece
 * solo en el panel.
 *
 * ⚠️ La tarifa del panel NO es siempre la del catálogo. Las tres habitaciones
 * con vista a la montaña se cotizan aquí a $1,900 / $2,400 (decisión de Manolo,
 * 23 sep 2026) mientras la página pública las sigue cobrando a $2,000 / $2,500.
 * Esa diferencia es a propósito y está acotada a la tabla de abajo: el día que
 * el sitio se iguale, se borra la tabla y el panel hereda el catálogo.
 */

/**
 * Tarifas propias del panel, por id de habitación. Lo que no esté aquí usa la
 * tarifa del catálogo del hotel.
 */
const TARIFAS_PANEL: Record<string, Record<number, number>> = {
  // Vista a la montaña: $1,900 hasta 2 personas · $2,400 de 3 a 4.
  "jungla":        { 1: 1900, 2: 1900, 3: 2400, 4: 2400 },
  "flor-de-liz-2": { 1: 1900, 2: 1900, 3: 2400, 4: 2400 },
  "lindavista":    { 1: 1900, 2: 1900, 3: 2400, 4: 2400 },
};

export interface HabitacionPanel {
  id: string;
  /** El nombre que se pinta, se elige y se GUARDA en la cotización/reserva. */
  label: string;
  /** "Montaña", "Selva / jardín", "Terraza con vista a la piscina". */
  vista: string;
  vistaMontana: boolean;
  /** Cuánta gente cabe: 2 en Orquídeas, 4 en casi todas, 6 en Helechos. */
  maxHuespedes: number;
  /** Precio de la habitación completa por noche, por número de huéspedes. */
  tarifas: Record<number, number>;
}

export const HABITACIONES_PANEL: HabitacionPanel[] = HABITACIONES_HOTEL.map(h => ({
  id:           h.id,
  label:        h.nombre,
  vista:        h.vista,
  vistaMontana: h.vistaMontana,
  maxHuespedes: h.maxHuespedes,
  tarifas:      TARIFAS_PANEL[h.id] ?? h.tarifas,
}));

/** La que aparece marcada al agregar una habitación nueva. */
export const HABITACION_POR_DEFECTO =
  HABITACIONES_PANEL.find(h => h.id === "flor-de-liz-2") ?? HABITACIONES_PANEL[0];

/** Busca por el nombre guardado. `undefined` si Manolo lo escribió a mano. */
export function habitacionPanel(nombre: string): HabitacionPanel | undefined {
  return HABITACIONES_PANEL.find(h => h.label === nombre);
}

/**
 * Lo que cuesta esa habitación por noche con esa ocupación.
 *
 * Devuelve 0 si el nombre no es del catálogo (una habitación escrita a mano):
 * ahí manda el precio que se haya tecleado, no lo pisamos.
 */
export function tarifaPanel(nombre: string, huespedes: number): number {
  const h = habitacionPanel(nombre);
  if (!h) return 0;
  const n = Math.min(Math.max(1, Math.round(Number(huespedes)) || 1), h.maxHuespedes);
  return h.tarifas[n] ?? h.tarifas[h.maxHuespedes] ?? 0;
}

/** Cuánta gente admite ese cuarto. 4 para los escritos a mano. */
export function maxHuespedesPanel(nombre: string): number {
  return habitacionPanel(nombre)?.maxHuespedes ?? 4;
}
