// Lo que cuesta operar cada recorrido, y qué queda de ganancia.
//
// 🔴 El agujero que esto tapa: el panel sabía al peso cuánto se COBRÓ y nada de
// cuánto se GANÓ. Cada vez que un cliente pedía descuento, la decisión se
// tomaba de memoria — y un descuento de $200 por persona puede ser regalado o
// puede ser la mitad de la ganancia, según el tour y según cuánta gente venga.
//
// La distinción que hace útil todo esto es POR PERSONA vs FIJO POR SALIDA:
//   · La entrada al parque se paga por cabeza: cada persona extra la vuelve a pagar.
//   · La camioneta y el guía se pagan por salida: cuestan lo mismo con 2 que con 8.
// Por eso un grupo grande aguanta un descuento que uno de dos no aguanta, y por
// eso no se puede contestar "¿cuánto puedo rebajar?" con un solo número.

export type TipoCosto = "persona" | "fijo";

export interface ConceptoCosto {
  /** "Entradas", "Camioneta", "Lanchero"… */
  concepto: string;
  /** MXN. Por persona o por salida completa, según `tipo`. */
  monto:    number;
  tipo:     TipoCosto;
}

export interface CostoTour {
  tourSlug:  string;
  conceptos: ConceptoCosto[];
  notas:     string;
}

/** Los costos que aparecen una y otra vez, con el tipo que casi siempre les toca. */
export const CONCEPTOS_PRESET: { concepto: string; tipo: TipoCosto }[] = [
  { concepto: "Entradas y accesos", tipo: "persona" },
  { concepto: "Comida",             tipo: "persona" },
  { concepto: "Lancha",             tipo: "persona" },
  { concepto: "Seguro de viajero",  tipo: "persona" },
  { concepto: "Guía",               tipo: "fijo"    },
  { concepto: "Transporte",         tipo: "fijo"    },
  { concepto: "Gasolina y casetas", tipo: "fijo"    },
  { concepto: "Equipo",             tipo: "fijo"    },
];

export const EMPTY_CONCEPTO: ConceptoCosto = { concepto: "", monto: 0, tipo: "persona" };

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/** Única puerta de entrada al JSON de la columna: siempre devuelve algo sano. */
export function conceptosDe(raw: unknown): ConceptoCosto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c: any) => c && typeof c === "object")
    .map((c: any) => ({
      concepto: String(c.concepto ?? "").trim(),
      monto:    entero(c.monto),
      tipo:     c.tipo === "fijo" ? ("fijo" as const) : ("persona" as const),
    }))
    .filter(c => c.concepto !== "");
}

export interface ResumenCosto {
  /** Lo que cuesta CADA persona que va. */
  porPersona: number;
  /** Lo que cuesta la salida, vayan los que vayan. */
  fijo:       number;
}

export function resumirCostos(conceptos: ConceptoCosto[]): ResumenCosto {
  return {
    porPersona: conceptos.filter(c => c.tipo === "persona").reduce((s, c) => s + c.monto, 0),
    fijo:       conceptos.filter(c => c.tipo === "fijo").reduce((s, c) => s + c.monto, 0),
  };
}

/** Lo que cuesta operar un recorrido para un grupo de N personas. */
export function costoDeLinea(conceptos: ConceptoCosto[], personas: number): number {
  const { porPersona, fijo } = resumirCostos(conceptos);
  return porPersona * Math.max(0, personas) + fijo;
}

export interface Margen {
  venta:      number;
  costo:      number;
  ganancia:   number;
  /** Ganancia sobre la venta, en %. 0 si no hay venta. */
  margenPct:  number;
}

export function calcularMargen(venta: number, costo: number): Margen {
  const ganancia = venta - costo;
  return {
    venta, costo, ganancia,
    margenPct: venta > 0 ? Math.round((ganancia / venta) * 100) : 0,
  };
}

/**
 * El descuento más grande que se puede dar sin bajar de `margenObjetivo` %.
 *
 * Con `margenObjetivo = 0` devuelve el punto exacto en el que se deja de ganar:
 * un peso más de rebaja y la salida cuesta más de lo que deja.
 *
 * Devuelve 0 —nunca un número negativo— cuando el precio ya está por debajo de
 * ese objetivo: ahí no hay descuento que dar, hay que subir el precio.
 */
export function descuentoMaximo(venta: number, costo: number, margenObjetivo = 0): { monto: number; pct: number } {
  const m = Math.min(0.95, Math.max(0, margenObjetivo / 100));
  const ventaMinima = costo / (1 - m);
  const monto = Math.max(0, Math.floor(venta - ventaMinima));
  return { monto, pct: venta > 0 ? Math.round((monto / venta) * 100) : 0 };
}

/** Tamaños de grupo con los que se compara el margen. Cubren de la pareja al camión. */
export const TAMANOS_GRUPO = [2, 4, 6, 8, 10, 12];
