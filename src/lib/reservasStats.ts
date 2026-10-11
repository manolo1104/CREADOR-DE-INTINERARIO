import { prisma } from "@/lib/prisma";
import { NO_CUENTAN } from "@/lib/cupoTour";

/**
 * Prueba social del motor de reservas, sacada de reservas REALES.
 *
 * Regla de la casa: aquí no se inventan números. Nada de "23 personas viendo
 * ahora" ni contadores que suben solos. Si el dato real no da, no se enseña
 * nada — omitir es honesto, inflar no.
 */
export interface ReservasStats {
  /** Reservas de los últimos 30 días. Qué cuenta: ver `esVenta` más abajo. */
  ultimos30: number;
  /** Reservas en total. */
  total: number;
  /** Reservas por slug de tour. */
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

    // 🔴 10 oct 2026 — antes era `status: "paid"` a secas, igual que la prueba
    // social, y por lo mismo se quedaba corto: casi toda venta entra con el
    // anticipo del 30 % y el panel la deja en `pending`. Cuentan TODAS menos
    // canceladas y borradores (decisión de Manolo), con la misma lista que el
    // cupo. Si las dos pantallas usaran reglas distintas, el número de
    // `/reservar` contradiría al aviso de reservas recientes de esa misma
    // página.
    const esVenta = { status: { notIn: NO_CUENTAN } };

    // 🔴 Y por qué el texto de `/reservar` puede seguir diciendo «reservas
    // CONFIRMADAS» con las `pending` dentro (comprobado el 11 oct 2026 contra
    // la base): ninguna fila nace sin cobro —solo las crean el webhook de
    // Stripe, `send-confirmation` y el panel—, y las 52 de los últimos 90 días
    // tienen `depositoPagado > 0`. `pending` aquí significa «anticipo cobrado,
    // saldo pendiente», no «sin pagar»; lo dice igual `api/bot/booking`. Si
    // algún día se crearan reservas antes de cobrar, ESTE número deja de ser
    // honesto y hay que volver a filtrar.

    const [total, ultimos30, agrupado] = await Promise.all([
      prisma.tourBooking.count({ where: esVenta }),
      prisma.tourBooking.count({ where: { ...esVenta, createdAt: { gte: hace30 } } }),
      prisma.tourBooking.groupBy({
        by: ["tourSlug"],
        where: esVenta,
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
