// Los items sueltos de una cotización o una reserva: la comida, el transporte,
// el guía privado, la cerveza al final. Todo lo que se cobra ADEMÁS del
// recorrido —y todo lo que se regala y conviene que el cliente vea escrito.
//
// 🔴 Antes esto no existía en el panel. Un "transporte desde Ciudad Valles" se
// metía subiendo a mano el total de la cotización: el cliente veía un importe
// más alto que la suma de sus tours y sin una línea que lo explicara, y al mes
// siguiente ni nosotros sabíamos de dónde salía ese dinero.
//
// Vive en su propia columna (`extraItems`) y NO dentro de `lineItems` o
// `packageItems`: esas dos ya esconden un objeto `_meta` entre los datos
// reales, y meter ahí un tercer tipo de fila obliga a filtrar en cada lectura,
// en cada correo y en cada PDF.

export interface ExtraItem {
  /** Lo que el cliente lee: "Comida del día 2", "Transporte Cd. Valles → Xilitla". */
  concepto:       string;
  /** Detalle opcional en letra chica: "Enchiladas huastecas + agua fresca". */
  detalle:        string;
  /** Cuántas unidades: normalmente personas, a veces viajes o noches. */
  cantidad:       number;
  /** Precio de venta por unidad, en MXN. */
  precioUnitario: number;
  /**
   * true = va SIN COSTO para el cliente ("comida incluida").
   * No suma al total y se anuncia como incluido en el PDF y en el correo.
   * Sigue pudiendo tener `costoUnitario`: a nosotros la cortesía nos cuesta.
   */
  incluido:       boolean;
  /**
   * Lo que a NOSOTROS nos cuesta esa unidad. SOLO para el margen del panel y
   * del Cotizador: no sale al cliente por ningún lado (ni PDF, ni correo).
   */
  costoUnitario:  number;
  /** cantidad × precioUnitario, o 0 si va incluido. Se recalcula al guardar. */
  subtotal:       number;
}

const entero = (v: unknown, min = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, n) : min;
};

/**
 * Un concepto con su precio: lo que se le cobra al cliente por unidad y lo que
 * a nosotros nos cuesta. Vive en la tabla `PrecioExtra` y lo edita Manolo desde
 * el Cotizador — la lista de abajo es solo el arranque, para que el panel no
 * aparezca vacío el primer día.
 */
export interface PresetExtra {
  concepto:   string;
  detalle:    string;
  /** Lo que se le cobra al cliente, por unidad. */
  precio:     number;
  /** Lo que nos cuesta, por unidad. Nunca sale al cliente. */
  costo:      number;
  /** true = se cobra por cabeza (nace con el tamaño del grupo como cantidad). */
  porPersona: boolean;
}

/**
 * Arranque de la lista de conceptos, con los precios que Manolo dio el 31 ago
 * 2026. En cuanto guarda la pestaña "Precios de extras" del Cotizador, manda la
 * tabla y esto deja de usarse.
 *
 * Todos son SUGERENCIAS, no reglas: rellenan el item al crearlo y después se
 * pisan cotización por cotización. Lo que se le prometió a un cliente vive en
 * SU cotización, así que subir un precio aquí nunca reescribe el pasado.
 */
export const EXTRAS_PRESET: PresetExtra[] = [
  { concepto: "Comida",             detalle: "Comida típica en ruta",                 precio: 200, costo: 0, porPersona: true  },
  { concepto: "Transporte",         detalle: "Traslado desde Ciudad Valles",          precio: 0,   costo: 0, porPersona: false },
  { concepto: "Desayuno",           detalle: "",                                      precio: 0,   costo: 0, porPersona: true  },
  { concepto: "Bebidas",            detalle: "Agua y refrescos durante el recorrido",  precio: 0,   costo: 0, porPersona: true  },
  { concepto: "Guía privado",       detalle: "Guía exclusivo para el grupo",          precio: 0,   costo: 0, porPersona: false },
  { concepto: "Fotografía y video", detalle: "Fotos del recorrido editadas",          precio: 0,   costo: 0, porPersona: false },
  { concepto: "Entradas extra",     detalle: "",                                      precio: 0,   costo: 0, porPersona: true  },
  { concepto: "Equipo especial",    detalle: "",                                      precio: 0,   costo: 0, porPersona: false },
];

/** Normaliza un renglón de la tabla de precios (viene de la base o del panel). */
export function normalizarPreset(p: Partial<PresetExtra>): PresetExtra {
  return {
    concepto:   String(p.concepto ?? "").trim(),
    detalle:    String(p.detalle ?? "").trim(),
    precio:     entero(p.precio, 0),
    costo:      entero(p.costo, 0),
    porPersona: p.porPersona !== false,
  };
}

export const EMPTY_EXTRA: ExtraItem = {
  concepto: "", detalle: "", cantidad: 1, precioUnitario: 0,
  incluido: false, costoUnitario: 0, subtotal: 0,
};

/** Lo que se cobra por este item. Un item incluido siempre vale 0. */
export function calcExtraLine(e: Pick<ExtraItem, "cantidad" | "precioUnitario" | "incluido">): number {
  if (e.incluido) return 0;
  return entero(e.cantidad, 0) * entero(e.precioUnitario, 0);
}

/** Lo que nos cuesta este item (lo incluido también cuesta). */
export function costoExtraLine(e: Pick<ExtraItem, "cantidad" | "costoUnitario">): number {
  return entero(e.cantidad, 0) * entero(e.costoUnitario, 0);
}

/** Suma de lo que se cobra por los extras. */
export function totalExtras(extras: ExtraItem[]): number {
  return extras.reduce((s, e) => s + calcExtraLine(e), 0);
}

/** Suma de lo que nos cuestan los extras. */
export function costoExtras(extras: ExtraItem[]): number {
  return extras.reduce((s, e) => s + costoExtraLine(e), 0);
}

/**
 * Recalcula el subtotal SIN tocar el texto. Es lo que se usa mientras se
 * escribe: limpiar espacios en cada tecla impide escribir dos palabras.
 */
export function recalcularExtra(e: ExtraItem): ExtraItem {
  return { ...e, subtotal: calcExtraLine(e) };
}

/** Normaliza un item antes de guardarlo (subtotal coherente, texto limpio). */
export function normalizarExtra(e: Partial<ExtraItem>): ExtraItem {
  const item: ExtraItem = {
    concepto:       String(e.concepto ?? "").trim(),
    detalle:        String(e.detalle ?? "").trim(),
    cantidad:       Math.max(1, entero(e.cantidad, 1)),
    precioUnitario: entero(e.precioUnitario, 0),
    incluido:       !!e.incluido,
    costoUnitario:  entero(e.costoUnitario, 0),
    subtotal:       0,
  };
  item.subtotal = calcExtraLine(item);
  return item;
}

/**
 * Lee los extras de una cotización o reserva. La columna es JSON libre y puede
 * traer cualquier cosa (o nada): esto es la única puerta de entrada, y siempre
 * devuelve una lista de items sanos.
 */
export function extrasDe(raw: unknown): ExtraItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => e && typeof e === "object" && !e._meta)
    .map((e: any) => normalizarExtra(e))
    .filter(e => e.concepto !== "");
}

/** Los que el cliente paga aparte. */
export const extrasCobrados = (extras: ExtraItem[]) => extras.filter(e => !e.incluido && calcExtraLine(e) > 0);

/** Los que van de cortesía: se anuncian como incluidos, no se cobran. */
export const extrasIncluidos = (extras: ExtraItem[]) => extras.filter(e => e.incluido || calcExtraLine(e) === 0);

/** "Comida × 4" / "Transporte" — etiqueta corta para listados y correos. */
export function etiquetaExtra(e: ExtraItem): string {
  return e.cantidad > 1 ? `${e.concepto} × ${e.cantidad}` : e.concepto;
}
