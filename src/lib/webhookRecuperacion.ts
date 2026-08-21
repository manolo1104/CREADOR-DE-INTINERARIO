/**
 * Rehacer un pedido desde la metadata de Stripe.
 *
 * Vive fuera del route porque Next.js solo admite los verbos HTTP y su config
 * como exports de un `route.ts` — cualquier otro nombre tumba el build.
 */

import { TOURS_DB } from "./tours";

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

/** El índice abierto lo pide Prisma para aceptarlo como columna Json. */
interface LineaRecuperada {
  [k: string]: string | number | undefined;
  tourSlug?: string;
  tourName:  string;
  tourDate:  string;
  adults:    number;
  children:  number;
  subtotal:  number;
}

/**
 * Rehace los recorridos de un carrito desde `meta.items`, el renglón compacto
 * que escribe `carrito-payment-intent` con la forma
 * `slug|fecha|adultos|niños|subtotal;…`.
 *
 * El nombre se resuelve contra el catálogo, no se guarda en la metadata: son
 * 500 caracteres por valor y los nombres de los tours no caben.
 */
export function reconstruirLineas(meta: Record<string, string>): LineaRecuperada[] {
  if (meta.carrito !== "1" || !meta.items) return [];
  return meta.items
    .split(";")
    .map((crudo) => crudo.split("|"))
    .filter((p) => p.length >= 5 && p[0])
    .map(([slug, fecha, adultos, ninos, subtotal]) => ({
      tourSlug: slug,
      tourName: TOURS_DB.find((t) => t.slug === slug)?.nombre || slug,
      tourDate: fecha || "",
      adults:   Number(adultos)  || 0,
      children: Number(ninos)    || 0,
      subtotal: Number(subtotal) || 0,
    }));
}
