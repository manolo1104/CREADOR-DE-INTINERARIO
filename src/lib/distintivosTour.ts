// Distintivos de las tarjetas de /reservar (13 nov 2026, pedido de Manolo:
// «ordénalos por los más reservados y pon badges tipo “ideal para tu primera
// vez”»). Salen de DATOS —reservas reales y la ficha del catálogo—, nunca
// escritos a mano: si un tour deja de venderse, deja de decir que se vende.
//
// Puro (sin Prisma) para probarlo en `__tests__/distintivosTour.test.ts`.

export type Distintivo = "masReservado" | "primeraVez" | "conNinos" | "aventura";

/** Lo que hace falta de cada recorrido. */
export interface TourParaDistintivo {
  slug: string;
  dificultad: string;
  soloAdultos?: boolean;
}

/** Una reserva vendida, como sale de la base: su tour principal y sus renglones. */
export interface ReservaParaConteo {
  tourSlug: string | null;
  lineItems: unknown;
}

/**
 * Cuántas reservas lleva cada recorrido, contando TODOS los de cada reserva.
 *
 * 🔴 Antes se agrupaba por `tourSlug`, que guarda solo el PRIMER tour de un
 * carrito: el Meco salía en 4 reservas cuando estaba en 18 (lo mismo que ya
 * corrigió `admin/kpis.ts`). Cada reserva cuenta una vez por recorrido, aunque
 * lo lleve dos días.
 */
export function contarReservasPorTour(reservas: ReservaParaConteo[]): Record<string, number> {
  const porTour: Record<string, number> = {};
  for (const r of reservas) {
    const lineas = Array.isArray(r.lineItems)
      ? (r.lineItems as Record<string, unknown>[]).filter((l) => !!l && typeof l === "object" && !l._meta && typeof l.tourSlug === "string" && l.tourSlug)
      : [];
    const slugs = new Set<string>(lineas.length ? lineas.map((l) => String(l.tourSlug)) : r.tourSlug ? [r.tourSlug] : []);
    for (const s of Array.from(slugs)) porTour[s] = (porTour[s] ?? 0) + 1;
  }
  return porTour;
}

/** Cuántos tours se llevan «Ideal para tu primera vez». */
const PRIMERA_VEZ = 3;
/** Cuántos distintivos caben en una tarjeta sin taparle la foto. */
const MAX_POR_TARJETA = 2;

/**
 * Los distintivos de cada recorrido, en orden de importancia (los primeros
 * dos se pintan):
 *  · «El más reservado»: el que dice `masReservado` (al menos 5 reservas y el
 *    doble que el segundo; la regla vive en `reservasStats`).
 *  · «Ideal para tu primera vez»: los 3 más reservados de dificultad baja o
 *    media — lo que más gente elige y cualquiera puede hacer.
 *  · «Aventura extrema»: dificultad alta.
 *  · «Para ir con niños»: dificultad baja y sin la marca de solo adultos.
 */
export function distintivosDeTours(
  tours: TourParaDistintivo[],
  porTour: Record<string, number> | null,
  masReservado: string | null,
): Record<string, Distintivo[]> {
  const conReservas = porTour ?? {};
  const primeraVez = new Set(
    tours
      .filter((t) => (t.dificultad === "baja" || t.dificultad === "media") && (conReservas[t.slug] ?? 0) > 0 && t.slug !== masReservado)
      .sort((a, b) => (conReservas[b.slug] ?? 0) - (conReservas[a.slug] ?? 0))
      .slice(0, PRIMERA_VEZ)
      .map((t) => t.slug),
  );
  const res: Record<string, Distintivo[]> = {};
  for (const t of tours) {
    const d: Distintivo[] = [];
    if (t.slug === masReservado) d.push("masReservado");
    if (primeraVez.has(t.slug)) d.push("primeraVez");
    if (t.dificultad === "alta") d.push("aventura");
    if (t.dificultad === "baja" && !t.soloAdultos) d.push("conNinos");
    if (d.length) res[t.slug] = d.slice(0, MAX_POR_TARJETA);
  }
  return res;
}
