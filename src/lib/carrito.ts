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
  /** Porcentaje que se cobra hoy: 100 si es un solo día, 30 si son varios. */
  pct:      number;
  /** Lo que costaría el viaje sin el descuento por varios recorridos. */
  totalSinDescuento: number;
  /** Pesos ahorrados por llevar más de un recorrido. 0 si va uno solo. */
  ahorroMultiple:    number;
  /** El descuento que le tocó a cada renglón, por `uid`. */
  descuentoPorItem:  Record<string, number>;
}

/** El anticipo de los tours es del 30 %, igual que en el checkout de uno solo. */
export const ANTICIPO_PCT = 30;

/**
 * Qué porcentaje del total se cobra HOY.
 *
 * Un viaje de **un solo día de recorrido se cobra completo** (decisión de
 * Manolo, 20 ago 2026): son montos chicos y no vale la pena quedarse con un
 * saldo que hay que perseguir el día del tour.
 *
 * El hospedaje cuenta como "varios días": una noche de hotel ya estira el viaje
 * más allá de la jornada, y cobrar $12,000 de golpe espanta al cliente. Esos
 * siguen apartándose con el 30 %.
 *
 * ⚠️ Vive aquí porque lo usan los DOS lados: el carrito para pintar y
 * `carrito-payment-intent` para cobrar de verdad. Si divergieran, la pantalla
 * diría un importe y Stripe cobraría otro.
 */
export function pctACobrar(dias: number, conHospedaje = false): number {
  return dias <= 1 && !conHospedaje ? 100 : ANTICIPO_PCT;
}

/**
 * Cuánto se descuenta el recorrido que ocupa la posición `i` del carrito,
 * ordenado de más caro a más barato: el más caro paga completo, el segundo
 * −10 % y del tercero en adelante −15 %.
 *
 * De las 35 reservas del negocio, 21 son de varios recorridos y hacen el 85 %
 * del ingreso: un cliente de tres tours deja $20,392 contra los $4,311 de uno
 * de un solo tour. El descuento estaba en el sitio equivocado —un "26 % OFF"
 * fijo sobre el PRIMER recorrido, o sea sobre la venta que ya estaba hecha—;
 * aquí se rebaja únicamente lo que probablemente no se habría vendido.
 *
 * Se ordena por precio para que el total no dependa del orden en que la persona
 * fue agregando cosas.
 *
 * ⚠️ Vive en este módulo, que NO importa el catálogo, porque lo usan los dos
 * lados: esto para pintar y `tarifarRecorridos` para cobrar. Si divergieran, el
 * carrito enseñaría un total y el pago cobraría otro.
 */
export function descuentoPorPosicion(_i: number): number {
  // APAGADO por decisión de Manolo (20 ago 2026): todavía no se lanza el
  // descuento por varios recorridos. Devolver 0 lo desaparece entero —de la
  // pantalla y del cobro— porque toda la UI que lo pinta va tras un `&&`.
  // Para revivirlo: 2.º recorrido 10 %, 3.º en adelante 15 %.
  //   if (i <= 0) return 0;
  //   if (i === 1) return 10;
  //   return 15;
  return 0;
}

export function resumirCarrito(items: CarritoItem[]): ResumenCarrito {
  const totalSinDescuento = items.reduce((s, i) => s + (Number(i.total) || 0), 0);

  // El MISMO cálculo que hace el servidor en `tarifarRecorridos`: el recorrido
  // más caro paga completo, el segundo −10 % y del tercero en adelante −15 %.
  //
  // Esto solo pinta. El precio que se cobra lo vuelve a calcular el servidor —
  // pero tiene que coincidir al peso, o la persona ve un total en el carrito y
  // otro en la pantalla del pago, que es la peor forma de perder una venta.
  const descuentoPorItem: Record<string, number> = {};
  let ahorroMultiple = 0;

  if (items.length > 1) {
    [...items]
      .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
      .forEach((i, pos) => {
        const pct = descuentoPorPosicion(pos);
        if (pct === 0) return;
        const rebaja = Math.round((Number(i.total) || 0) * pct / 100);
        descuentoPorItem[i.uid] = pct;
        ahorroMultiple += rebaja;
      });
  }

  const total    = totalSinDescuento - ahorroMultiple;
  const dias     = new Set(items.map((i) => i.tourDate).filter(Boolean)).size;
  // Sin hospedaje aquí: `resumirCarrito` solo conoce los recorridos. La página
  // recalcula el porcentaje cuando el cliente agrega hotel.
  const pct      = pctACobrar(dias);
  const anticipo = Math.round((total * pct) / 100);
  return {
    items, total, anticipo, saldo: total - anticipo, dias, pct,
    totalSinDescuento, ahorroMultiple, descuentoPorItem,
  };
}
