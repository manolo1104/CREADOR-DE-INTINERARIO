// Cerrar el carrito abandonado cuando la venta YA se hizo.
//
// Existe porque la venta puede cerrarse por dos caminos distintos y solo uno
// cerraba el carrito:
//   1. Motor web  → /api/tours/send-confirmation  (sí lo cerraba)
//   2. A mano desde el panel → /api/admin/reservas  (NO lo cerraba)
//
// El camino 2 es justamente el que más vende (links de pago manuales), así que
// dejaba carritos fantasma de gente que ya había pagado — y el cron de
// recuperación les seguía escribiendo "¿Apartamos tu lugar?".
//
// Una sola función para que la regla no vuelva a vivir en dos sitios.

import { prisma } from "@/lib/prisma";
import { ESTADOS_VIVOS } from "@/lib/cartFollowUp";

export interface TourReservado {
  tourSlug?: string | null;
  tourDate?: string | null;
}

/**
 * Marca "converted" los carritos vivos que correspondan a lo que se acaba de
 * reservar. Nunca lanza: cerrar el carrito es higiene, no puede tumbar el
 * registro de una venta que ya ocurrió.
 *
 * Acepta varios tours porque una reserva del panel puede traer varias líneas,
 * y cada línea pudo haber dejado su propio carrito.
 */
export async function cerrarCarritosDe(
  email: string | null | undefined,
  tours: TourReservado[],
): Promise<number> {
  if (!email || !email.includes("@")) return 0;

  // Deduplica pares tour+fecha; ignora las líneas sin tour (p. ej. el `_meta`).
  const vistos = new Set<string>();
  const pares: { tourSlug: string; tourDate: string }[] = [];
  for (const t of tours) {
    if (!t?.tourSlug) continue;
    const par = { tourSlug: String(t.tourSlug), tourDate: t.tourDate ? String(t.tourDate) : "" };
    const clave = `${par.tourSlug}|${par.tourDate}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    pares.push(par);
  }
  if (!pares.length) return 0;

  try {
    const { count } = await prisma.abandonedCart.updateMany({
      where: {
        customerEmail: email,
        status: { in: [...ESTADOS_VIVOS] },
        OR: pares,
      },
      data: { status: "converted" },
    });
    return count;
  } catch {
    return 0;
  }
}

/** Saca los tours de una reserva del panel: el principal + cada línea real. */
export function toursDeReserva(body: {
  tourSlug?: unknown;
  tourDate?: unknown;
  lineItems?: unknown;
}): TourReservado[] {
  const tours: TourReservado[] = [
    { tourSlug: typeof body.tourSlug === "string" ? body.tourSlug : null,
      tourDate: typeof body.tourDate === "string" ? body.tourDate : null },
  ];
  // La primera entrada de lineItems es el objeto `_meta` (no tiene tourSlug).
  if (Array.isArray(body.lineItems)) {
    for (const l of body.lineItems) {
      if (!l || typeof l !== "object") continue;
      const linea = l as Record<string, unknown>;
      if (linea._meta) continue;
      if (typeof linea.tourSlug !== "string") continue;
      tours.push({
        tourSlug: linea.tourSlug,
        tourDate: typeof linea.tourDate === "string" ? linea.tourDate : null,
      });
    }
  }
  return tours;
}
