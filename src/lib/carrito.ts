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

/**
 * Mañana en hora de México (`YYYY-MM-DD`): la primera fecha que se puede
 * reservar. La misma cuenta que `minBookingDate()`; va repetida aquí para que
 * el carrito (que carga la barra de todo el sitio) no arrastre el catálogo.
 */
export function fechaMinimaCarrito(ahora: Date = new Date()): string {
  const hoy = ahora.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoy.split("-").map(Number);
  const manana = new Date(Date.UTC(y, m - 1, d + 1));
  return manana.toISOString().slice(0, 10);
}

export interface FechaQuitada { tourName: string; fecha: string }

/**
 * 🔴 Las fechas que ya pasaron se quitan (auditoría del 13 nov 2026): un
 * carrito de hace dos semanas regresaba con «sábado 1 de noviembre» y el
 * cliente solo se enteraba al pagar, con un error del servidor. El renglón se
 * queda, sin fecha, para que elija otra; `quitadas` alimenta el aviso.
 */
export function limpiarFechasPasadas(items: CarritoItem[], min: string): { items: CarritoItem[]; quitadas: FechaQuitada[] } {
  const quitadas: FechaQuitada[] = [];
  const limpios = items.map((i) => {
    if (!i.tourDate || i.tourDate >= min) return i;
    quitadas.push({ tourName: i.tourName, fecha: i.tourDate });
    return { ...i, tourDate: "" };
  });
  return { items: limpios, quitadas };
}

let quitadasSinAvisar: FechaQuitada[] = [];

/** Las fechas que el carrito quitó por viejas y nadie ha avisado todavía (las entrega una vez). */
export function tomarFechasQuitadas(): FechaQuitada[] {
  const q = quitadasSinAvisar;
  quitadasSinAvisar = [];
  return q;
}

export function leerCarrito(): CarritoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CARRITO_KEY);
    if (!crudo) return [];
    const datos = JSON.parse(crudo);
    // Se filtra en vez de confiar: un localStorage viejo de otra versión del
    // sitio reventaría la página del carrito entera.
    const lista = Array.isArray(datos) ? datos.filter(esItem).slice(0, MAX_ITEMS) : [];
    const { items, quitadas } = limpiarFechasPasadas(lista, fechaMinimaCarrito());
    if (quitadas.length) {
      quitadasSinAvisar.push(...quitadas);
      // Se guarda ya limpio (sin avisar al resto de la página: lo leerá igual).
      try { window.localStorage.setItem(CARRITO_KEY, JSON.stringify(items)); } catch { /* sigue sin guardar */ }
    }
    return items;
  } catch {
    return [];
  }
}

function guardar(items: CarritoItem[]): CarritoItem[] {
  if (typeof window === "undefined") return items;
  const recortado = items.slice(0, MAX_ITEMS);
  // Con el almacenamiento bloqueado (Safari privado, cuota llena) escribir
  // lanza: sin el try, «Agregar» reventaba en vez de seguir sin guardar.
  try { window.localStorage.setItem(CARRITO_KEY, JSON.stringify(recortado)); } catch { /* sigue sin guardar */ }
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
  /** Porcentaje que se cobra hoy (`pctACobrar`: el 30 % desde el 29 sep 2026). */
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
 * Qué porcentaje del total se cobra HOY: el 30 %, siempre.
 *
 * Hasta el 29 sep 2026 un viaje de un solo día se cobraba completo (decisión
 * del 20 ago). Manolo la revirtió en la revisión de conversión de temporada
 * baja: pagar $3,100 de golpe a un desconocido espanta al viajero mexicano, y
 * el anticipo del 30 % es lo que ya cobra todo el sector. El saldo se liquida
 * el día del tour.
 *
 * Se conservan la firma y los parámetros: si la regla vuelve a distinguir
 * casos, los que llaman ya pasan los datos necesarios.
 *
 * ⚠️ Vive aquí porque lo usan los DOS lados: el carrito para pintar y
 * `carrito-payment-intent` para cobrar de verdad. Si divergieran, la pantalla
 * diría un importe y Stripe cobraría otro.
 */
export function pctACobrar(_dias?: number, _conHospedaje = false): number {
  return ANTICIPO_PCT;
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
  //
  // 🔴 AL ENCENDERLO: hay que dejar fuera los recorridos de tarifa por grupo
  // (`tarifaGrupo` en tours.ts). El servidor ya los excluye en
  // `tarifarRecorridos`; aquí no se puede filtrar igual porque este módulo NO
  // importa el catálogo a propósito, así que la exclusión tendría que viajar
  // en el propio `CarritoItem`. Si no, el carrito pinta un total y el pago
  // cobra otro — y el Edén en el Jardín, cuyo costo es una tarifa fija que nos
  // cobra la Fundación Las Pozas, se vendería por debajo de lo que cuesta.
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
  // Un recorrido = un día. No es una suposición: `carrito-payment-intent`
  // RECHAZA el cobro si dos renglones comparten fecha, porque cada recorrido
  // ocupa la jornada entera.
  //
  // Antes se contaban las fechas ya elegidas (`new Set(...).filter(Boolean)`),
  // y los recorridos entran al carrito SIN fecha —se elige dentro—. Así que un
  // viaje de cuatro días recién armado contaba 0 días, caía en la rama del
  // "un solo día" y la barra anunciaba "Pagas hoy (100 %) · $18,900" cuando el
  // cobro real iba a ser el 30 %: $5,670. Tres veces y media de más, justo en
  // la pantalla donde la gente decide.
  const dias     = items.length;
  // Sin hospedaje aquí: `resumirCarrito` solo conoce los recorridos. La página
  // recalcula el porcentaje cuando el cliente agrega hotel.
  const pct      = pctACobrar(dias);
  const anticipo = Math.round((total * pct) / 100);
  return {
    items, total, anticipo, saldo: total - anticipo, dias, pct,
    totalSinDescuento, ahorroMultiple, descuentoPorItem,
  };
}
