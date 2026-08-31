// Las tarifas de un PROVEEDOR de servicios: lo que cobra por llevar al grupo,
// todo incluido (transporte, guía, desayuno y entradas), por persona.
//
// Es un modelo de costo distinto al propio y por eso vive aparte:
//
//   · Costos propios  → tanto por persona + tanto fijo por salida. La ganancia
//     sube con el grupo porque el costo fijo se reparte entre más gente.
//   · Proveedor       → una sola tarifa por cabeza que BAJA por escalones. No
//     hay nada fijo que repartir: el descuento por volumen ya lo da él.
//
// Los dos contestan la misma pregunta —cuánto me queda— pero por caminos
// distintos, así que el Cotizador pregunta con cuál calcular antes de nada.

import { TOURS_DB } from "@/lib/tours";

export interface Escalon {
  /** A partir de cuántas personas aplica esta tarifa. */
  personas: number;
  /** MXN por persona, todo incluido. */
  precio:   number;
}

export interface TarifaProveedor {
  /** `<tourSlug>` o `<tourSlug>::<varianteId>` cuando el recorrido tiene dos versiones. */
  clave:    string;
  tourSlug: string;
  /** Id de la elección del catálogo (ej. "tamasopo"). Vacío si el tour no se bifurca. */
  variante: string;
  /** Etiqueta que ve Manolo en el panel. */
  nombre:   string;
  tarifas:  Escalon[];
}

/** Los escalones de grupo que maneja el proveedor. */
export const ESCALONES = [2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20];

export const claveProveedor = (tourSlug: string, variante?: string | null) =>
  variante ? `${tourSlug}::${variante}` : tourSlug;

const fila = (tourSlug: string, variante: string, nombre: string, precios: number[]): TarifaProveedor => ({
  clave: claveProveedor(tourSlug, variante || null),
  tourSlug,
  variante,
  nombre,
  tarifas: ESCALONES.map((personas, i) => ({ personas, precio: precios[i] })),
});

/**
 * Las tarifas que dio Manolo el 31 ago 2026. Son el ARRANQUE: en cuanto guarda
 * la pestaña del proveedor, manda la tabla de la base y esto deja de usarse.
 *
 * El proveedor no cotiza los diez recorridos —el RZR, el rappel, el rafting, el
 * buceo y la Travesía del Café no están—, y eso se dice en pantalla en vez de
 * calcular una ganancia inventada.
 */
export const TARIFAS_PROVEEDOR_BASE: TarifaProveedor[] = [
  //                                                        2     3     4     6     8    10    12    14    16    18    20
  fila("ruta-surrealista-edward-james", "", "Ruta Surrealista",
       [1100, 1050, 1050, 1000, 1000,  980,  960,  940,  920,  900,  850]),
  fila("expedicion-tamul", "", "Expedición Tamul",
       [1250, 1200, 1200, 1150, 1100, 1050, 1040, 1020, 1000, 1000,  980]),
  fila("cascadas-del-meco", "", "Cascadas del Meco",
       [1300, 1250, 1200, 1200, 1150, 1100, 1050, 1040, 1020, 1000,  990]),
  fila("ruta-acuatica-puente-de-dios", "siete-cascadas", "Ruta Acuática — Puente de Dios, Hacienda Los Gómez y Siete Cascadas",
       [1250, 1200, 1200, 1150, 1100, 1080, 1060, 1040, 1000,  950,  900]),
  fila("ruta-acuatica-puente-de-dios", "tamasopo", "Ruta Acuática — Puente de Dios con Cascadas de Tamasopo",
       [1350, 1300, 1300, 1250, 1200, 1200, 1150, 1100, 1050, 1000, 1000]),
  fila("paraiso-escalonado-minas-micos", "", "Paraíso Escalonado",
       [1300, 1200, 1200, 1150, 1100, 1050, 1040, 1030, 1000,  970,  950]),
];

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/** Única puerta de entrada al JSON de la columna. */
export function escalonesDe(raw: unknown): Escalon[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => e && typeof e === "object")
    .map((e: any) => ({ personas: entero(e.personas), precio: entero(e.precio) }))
    .filter(e => e.personas > 0)
    .sort((a, b) => a.personas - b.personas);
}

/**
 * La tarifa por persona que le toca a un grupo de N.
 *
 * Se toma el escalón MÁS ALTO que no pase de N: un grupo de 5 paga la tarifa
 * de 4, no la de 6. Es el criterio conservador —el que no inventa un descuento
 * que el proveedor no dio— y el que deja la ganancia estimada por lo bajo en
 * vez de por lo alto.
 *
 * Por debajo del escalón más chico se usa ese, y por encima del más grande,
 * el último.
 */
export function tarifaPorPersona(tarifas: Escalon[], personas: number): number {
  if (!tarifas.length) return 0;
  const orden = [...tarifas].sort((a, b) => a.personas - b.personas);
  const n = Math.max(1, Math.round(personas) || 1);
  let elegido = orden[0];
  for (const e of orden) if (e.personas <= n) elegido = e;
  return elegido.precio;
}

/** Lo que cuesta llevar a N personas con el proveedor. */
export function costoProveedor(tarifas: Escalon[], personas: number): number {
  return tarifaPorPersona(tarifas, personas) * Math.max(0, Math.round(personas) || 0);
}

/** El escalón concreto que se está aplicando, para poder decirlo en pantalla. */
export function escalonAplicado(tarifas: Escalon[], personas: number): number | null {
  if (!tarifas.length) return null;
  const orden = [...tarifas].sort((a, b) => a.personas - b.personas);
  const n = Math.max(1, Math.round(personas) || 1);
  let elegido = orden[0];
  for (const e of orden) if (e.personas <= n) elegido = e;
  return elegido.personas;
}

/** Las tarifas que el proveedor tiene para un recorrido (una, dos o ninguna). */
export function tarifasDeTour(lista: TarifaProveedor[], tourSlug: string): TarifaProveedor[] {
  return lista.filter(t => t.tourSlug === tourSlug);
}

/** El nombre del recorrido del catálogo, para la pantalla del proveedor. */
export function nombreDeTour(tourSlug: string): string {
  return TOURS_DB.find(t => t.slug === tourSlug)?.nombre.split(" — ")[0] ?? tourSlug;
}
