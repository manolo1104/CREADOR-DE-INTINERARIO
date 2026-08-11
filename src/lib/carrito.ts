/**
 * Carrito de varios recorridos.
 *
 * Hasta ahora el motor solo sabía vender UN tour por pago: quien quería tres
 * días tenía que pasar por el checkout tres veces, con tres cobros y tres
 * folios. Esto guarda una lista y la liquida en un solo pago.
 *
 * ⚠️ Los importes que viajan aquí son SOLO para pintar la pantalla. El precio
 * que se cobra lo vuelve a calcular el servidor en `create-payment-intent` con
 * `computeTourCharge` / `computeVehiculoCharge`, porque esto vive en el
 * localStorage del visitante y cualquiera puede editarlo.
 *
 * No se confunde con `guardar-carrito`, que es la secuencia de correos de
 * carrito abandonado y no tiene nada que ver.
 */

export const CARRITO_KEY = "hp_carrito";
/** Evento propio para que la barra del carrito se entere sin recargar. */
export const CARRITO_EVENT = "hp:carrito";

/** Tope sano: la metadata de Stripe admite 500 caracteres por valor. */
export const MAX_ITEMS = 8;

export interface CarritoItem {
  /** Identificador estable del renglón, para poder borrarlo. */
  uid:           string;
  tourId:        string;
  tourSlug:      string;
  tourName:      string;
  tourImage:     string;
  tourDate:      string; // YYYY-MM-DD
  adults:        number;
  childrenMid:   number; // 6–10 años
  childrenSmall: number; // menores de 6
  promoCode?:    string;
  /** Solo en tours cobrados por vehículo (RZR, café). */
  ruta?:         string;
  vehiculo?:     string;
  unidades?:     number;
  /** Actividades opcionales: solo id y cantidad; el precio lo pone el servidor. */
  addOns?:       { id: string; cantidad: number }[];
  /** Elección de recorrido cuando el tour la exige (ej. Ruta Acuática). */
  eleccion?:     string;
  /** Referencial, para pintar. El servidor manda. */
  total:         number;
}

function esItem(x: unknown): x is CarritoItem {
  if (!x || typeof x !== "object") return false;
  const i = x as Partial<CarritoItem>;
  return (
    typeof i.tourSlug === "string" &&
    typeof i.tourDate === "string" &&
    typeof i.total === "number"
  );
}

export function leerCarrito(): CarritoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CARRITO_KEY);
    if (!crudo) return [];
    const datos = JSON.parse(crudo);
    // Se filtra en vez de confiar: un localStorage viejo de otra versión del
    // sitio reventaría la página del carrito entera.
    return Array.isArray(datos) ? datos.filter(esItem).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function guardar(items: CarritoItem[]): CarritoItem[] {
  if (typeof window === "undefined") return items;
  const recortado = items.slice(0, MAX_ITEMS);
  window.localStorage.setItem(CARRITO_KEY, JSON.stringify(recortado));
  window.dispatchEvent(new CustomEvent(CARRITO_EVENT));
  return recortado;
}

export function agregarAlCarrito(item: Omit<CarritoItem, "uid">): CarritoItem[] {
  const items = leerCarrito();
  const uid = `it_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  // Mismo tour el mismo día = el cliente está corrigiendo, no acumulando dos
  // salidas idénticas. Se reemplaza en vez de duplicar.
  const sinDuplicado = items.filter(
    (i) => !(i.tourSlug === item.tourSlug && i.tourDate === item.tourDate),
  );
  return guardar([...sinDuplicado, { ...item, uid }]);
}

/**
 * Cambia un renglón ya guardado (fecha, personas). Se agrega desde el catálogo
 * sin fecha, así que el carrito TIENE que dejar ponerla; si no, el cliente
 * quedaría atrapado con un carrito que no puede pagar.
 */
export function actualizarItem(uid: string, cambios: Partial<CarritoItem>): CarritoItem[] {
  return guardar(
    leerCarrito().map((i) => (i.uid === uid ? { ...i, ...cambios, uid: i.uid } : i)),
  );
}

export function quitarDelCarrito(uid: string): CarritoItem[] {
  return guardar(leerCarrito().filter((i) => i.uid !== uid));
}

export function vaciarCarrito(): CarritoItem[] {
  return guardar([]);
}

/** Cuántas personas van en un renglón (los vehículos no cuentan personas). */
export function personasDeItem(i: CarritoItem): number {
  if (i.unidades) return 0;
  return (i.adults || 0) + (i.childrenMid || 0) + (i.childrenSmall || 0);
}

export interface ResumenCarrito {
  items:    CarritoItem[];
  total:    number;
  anticipo: number;
  saldo:    number;
  /** Fechas distintas: sirve para decir "3 días de recorridos". */
  dias:     number;
}

/** El anticipo de los tours es del 30 %, igual que en el checkout de uno solo. */
export const ANTICIPO_PCT = 30;

export function resumirCarrito(items: CarritoItem[]): ResumenCarrito {
  const total    = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const anticipo = Math.round((total * ANTICIPO_PCT) / 100);
  const dias     = new Set(items.map((i) => i.tourDate).filter(Boolean)).size;
  return { items, total, anticipo, saldo: total - anticipo, dias };
}
