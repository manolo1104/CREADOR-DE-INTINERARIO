/**
 * Rehacer un pedido desde la metadata de Stripe.
 *
 * Vive fuera del route porque Next.js solo admite los verbos HTTP y su config
 * como exports de un `route.ts` — cualquier otro nombre tumba el build.
 */

import { TOURS_DB } from "./tours";
import { ID_TRASLADO_VALLES, vehiculoBookingName, type LineaCarrito } from "./tourPricing";

/** JSON de la metadata de Stripe. Nunca revienta: si no parsea, no hay dato. */
export function leerJson<T>(raw: unknown): T | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as T) : null;
  } catch {
    return null;
  }
}

/**
 * Un recorrido del carrito rehecho desde la metadata. Con los datos de
 * `lineaN` (lote 5, 5 nov 2026) trae lo mismo que el renglón de la pantalla
 * (`LineaCarrito`): elección, actividades, menores por tramo, Valles, RZR.
 */
export interface LineaRecuperada {
  tourId?:   string;
  tourSlug?: string;
  tourName:  string;
  tourDate:  string;
  adults:    number;
  children:  number;
  subtotal:  number;
  childrenMid?:   number;
  childrenSmall?: number;
  ruta?:     string;
  vehiculo?: string;
  unidades?: number;
  eleccion?: string;
  addOns?:   { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  subtotalSinDescuento?: number;
  descuentoMultiple?:    number;
  viajeroSolo?: boolean;
  cargoValles?: number;
}

/**
 * Lo que el renglón compacto `items` NO lleva de cada recorrido (lote 5, 5 nov
 * 2026). 🔴 Sin esto, la reserva que arma el webhook (o la conciliación)
 * perdía la elección (Tamasopo o Siete Cascadas), las actividades extra, el
 * traslado de Valles —el corte decía «salió de Valles con $0 cobrado»— y los
 * menores por tramo. Va en una llave por recorrido (`linea1`…`linea8`, 500
 * caracteres cada una) con nombres cortos; los nombres largos salen del
 * catálogo al rehacerlo.
 */
interface ExtraDeLinea {
  /** childrenMid / childrenSmall */
  m?: number;
  s?: number;
  /** La elección obligatoria (su nombre, ya validado contra el catálogo). */
  e?: string;
  /** Actividades opcionales: [id, cantidad, precio]. Sin el traslado de Valles. */
  a?: [string, number, number][];
  /** cargoValles */
  cv?: number;
  /** viajeroSolo */
  v?: 1;
  /** descuentoMultiple / subtotalSinDescuento */
  d?: number;
  sd?: number;
  /** RZR: ruta, vehículo, unidades. */
  r?: string;
  vh?: string;
  u?: number;
}

/** Cuántas llaves `lineaN` caben: las mismas que recorridos admite el carrito (`MAX_ITEMS`). */
export const MAX_RENGLONES_META = 8;
const MAX_VALOR_META = 490;

/**
 * Las llaves `linea1`…`linea8` de la metadata del cobro del carrito. Va una por
 * renglón aunque sea `{}`: su presencia dice «formato completo» (un cobro viejo
 * no la trae y se rehace como antes). Las que sobran van vacías: el carrito
 * REUSA el cobro al cambiar, y Stripe borra una llave solo si se le manda vacía.
 */
export function metadataDeRenglones(lineas: LineaCarrito[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 1; i <= MAX_RENGLONES_META; i++) out[`linea${i}`] = "";
  lineas.slice(0, MAX_RENGLONES_META).forEach((l, i) => {
    const x: ExtraDeLinea = {};
    if (l.childrenMid) x.m = l.childrenMid;
    if (l.childrenSmall) x.s = l.childrenSmall;
    if (l.eleccion) x.e = l.eleccion.slice(0, 120);
    const actividades = (l.addOns ?? [])
      .filter((a) => a.id !== ID_TRASLADO_VALLES)
      .map((a): [string, number, number] => [a.id, a.cantidad, a.precio]);
    if (actividades.length) x.a = actividades;
    if (l.cargoValles) x.cv = l.cargoValles;
    if (l.viajeroSolo) x.v = 1;
    if (l.descuentoMultiple) x.d = l.descuentoMultiple;
    if (l.subtotalSinDescuento !== undefined) x.sd = l.subtotalSinDescuento;
    if (l.ruta) x.r = l.ruta;
    if (l.vehiculo) x.vh = l.vehiculo;
    if (l.unidades) x.u = l.unidades;
    let json = JSON.stringify(x);
    // Nunca pasa con el catálogo de hoy; si un día no cupiera, se queda lo que
    // mueve dinero y cupo (los textos salen de las notas de la pantalla).
    if (json.length > MAX_VALOR_META) {
      const { e: _e, a: _a, ...corto } = x;
      json = JSON.stringify(corto);
    }
    out[`linea${i + 1}`] = json;
  });
  return out;
}

/** El nombre del renglón como lo arma `tarifarRecorridos`: catálogo, RZR y la nota de Valles. */
function nombreDeRenglon(slug: string, x: ExtraDeLinea): string {
  const tour = TOURS_DB.find((t) => t.slug === slug);
  if (!tour) return slug;
  let nombre = x.r && x.vh ? vehiculoBookingName(tour, x.r, x.vh, Math.max(1, Number(x.u) || 1)) : tour.nombre;
  const cargo = Number(x.cv) || 0;
  if (cargo > 0) nombre = `${nombre} · desde Ciudad Valles (+$${cargo.toLocaleString("es-MX")} de traslado)`;
  return nombre;
}

/** Un renglón con sus datos completos (los que trae `lineaN`). */
function renglonCompleto(base: LineaRecuperada, slug: string, x: ExtraDeLinea): LineaRecuperada {
  const tour = TOURS_DB.find((t) => t.slug === slug);
  const l: LineaRecuperada = { ...base, tourName: nombreDeRenglon(slug, x) };
  if (tour) l.tourId = tour.id;
  if (x.r && x.vh) {
    l.ruta = x.r;
    l.vehiculo = x.vh;
    l.unidades = Math.max(1, Number(x.u) || 1);
  } else {
    l.childrenMid = Number(x.m) || 0;
    l.childrenSmall = Number(x.s) || 0;
  }
  if (x.e) l.eleccion = x.e;
  const actividades = (Array.isArray(x.a) ? x.a : []).map(([id, cantidad, precio]) => ({
    id: String(id),
    nombre: tour?.addOns?.find((a) => a.id === id)?.nombre || String(id),
    cantidad: Number(cantidad) || 0,
    precio: Number(precio) || 0,
    subtotal: (Number(precio) || 0) * (Number(cantidad) || 0),
  }));
  const cargo = Number(x.cv) || 0;
  if (cargo > 0) {
    l.cargoValles = cargo;
    actividades.push({ id: ID_TRASLADO_VALLES, nombre: "Traslado desde Ciudad Valles", cantidad: 1, precio: cargo, subtotal: cargo });
  }
  if (actividades.length) l.addOns = actividades;
  if (x.sd !== undefined) l.subtotalSinDescuento = Number(x.sd) || 0;
  if (x.d) l.descuentoMultiple = Number(x.d) || 0;
  if (x.v) l.viajeroSolo = true;
  return l;
}

/**
 * Rehace los recorridos de un carrito desde `meta.items`, el renglón compacto
 * que escribe `carrito-payment-intent` con la forma
 * `slug|fecha|adultos|niños|subtotal;…`, más lo de `lineaN` cuando viene.
 *
 * El nombre se resuelve contra el catálogo, no se guarda en la metadata: son
 * 500 caracteres por valor y los nombres de los tours no caben.
 */
export function reconstruirLineas(meta: Record<string, string>): LineaRecuperada[] {
  if (meta.carrito !== "1" || !meta.items) return [];
  return meta.items
    .split(";")
    // El número de renglón ANTES de filtrar: es el de su llave `lineaN`.
    .map((crudo, i) => ({ p: crudo.split("|"), i }))
    .filter(({ p }) => p.length >= 5 && p[0])
    .map(({ p: [slug, fecha, adultos, ninos, subtotal], i }) => {
      const base: LineaRecuperada = {
        tourSlug: slug,
        tourName: TOURS_DB.find((t) => t.slug === slug)?.nombre || slug,
        tourDate: fecha || "",
        adults:   Number(adultos)  || 0,
        children: Number(ninos)    || 0,
        subtotal: Number(subtotal) || 0,
      };
      // Un cobro de antes del 5 nov 2026 no trae `lineaN`: queda como siempre.
      const extra = leerJson<ExtraDeLinea>(meta[`linea${i + 1}`]);
      return extra ? renglonCompleto(base, slug, extra) : base;
    });
}
