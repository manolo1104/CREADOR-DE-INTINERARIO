import { prisma } from "@/lib/prisma";

/**
 * Prueba social del motor de reservas, sacada de reservas REALES y pagadas.
 *
 * Regla de la casa: aquí no se inventan números. Nada de "23 personas viendo
 * ahora" ni contadores que suben solos. Si el dato real no da, no se enseña
 * nada — omitir es honesto, inflar no.
 */
export interface ReservasStats {
  /** Reservas pagadas en los últimos 30 días. */
  ultimos30: number;
  /** Reservas pagadas en total. */
  total: number;
  /** Reservas pagadas por slug de tour. */
  porTour: Record<string, number>;
  /** El tour con más reservas, si destaca de verdad sobre el resto. */
  masReservado: string | null;
}

/** Debajo de esto un número no impresiona, así que no se enseña. */
const MINIMO_PARA_ENSENAR = 5;

export function vale(n: number): boolean {
  return n >= MINIMO_PARA_ENSENAR;
}

/**
 * Devuelve `null` si la base no responde: la página de reservas tiene que
 * cargar aunque las estadísticas fallen. Nunca se bloquea una venta por un
 * adorno.
 */
export async function getReservasStats(): Promise<ReservasStats | null> {
  try {
    const hace30 = new Date(Date.now() - 30 * 864e5);

    const [total, ultimos30, agrupado] = await Promise.all([
      prisma.tourBooking.count({ where: { status: "paid" } }),
      prisma.tourBooking.count({ where: { status: "paid", createdAt: { gte: hace30 } } }),
      prisma.tourBooking.groupBy({
        by: ["tourSlug"],
        where: { status: "paid" },
        _count: { _all: true },
      }),
    ]);

    const porTour: Record<string, number> = {};
    for (const g of agrupado) porTour[g.tourSlug] = g._count._all;

    // "El más reservado" solo si de verdad lo es: al menos 5 reservas y el
    // doble que el segundo. Con números parejos la etiqueta no dice nada.
    const orden = Object.entries(porTour).sort((a, b) => b[1] - a[1]);
    const primero = orden[0];
    const segundo = orden[1]?.[1] ?? 0;
    const masReservado =
      primero && vale(primero[1]) && primero[1] >= segundo * 2 ? primero[0] : null;

    return { total, ultimos30, porTour, masReservado };
  } catch {
    return null;
  }
}
