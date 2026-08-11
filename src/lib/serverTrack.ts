import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Guarda un evento del embudo desde el SERVIDOR.
 *
 * El pago se crea en `/api/tours/create-payment-intent`, que solo escribía a
 * stdout con `actividad()`. Railway rota esos logs, así que el paso más
 * importante del embudo —que alguien llegó a pagar— nunca quedaba en
 * `TrackEvent`: el reporte de `embudo.ts` marcaba 0 pagos mientras los logs
 * mostraban intentos reales. Sin esto no se puede calcular una conversión.
 *
 * Nunca lanza ni bloquea el cobro: si la base falla, se pierde el evento y el
 * pago sigue su curso. Un error de analítica no puede tumbar una venta.
 */
export async function trackServerEvent(
  event: string,
  {
    sid,
    tourSlug,
    amount,
    data,
  }: {
    sid?: string | null;
    tourSlug?: string | null;
    amount?: number | null;
    data?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await prisma.trackEvent.create({
      data: {
        event,
        // "ssr"/"anonymous" son marcadores del cliente cuando no hay sesión
        // real; guardarlos ensuciaría el conteo de sesiones distintas.
        sid:      sid && sid !== "anonymous" && sid !== "ssr" ? sid : null,
        tourSlug: tourSlug ?? null,
        amount:   typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null,
        data:     data && Object.keys(data).length ? (data as object) : undefined,
      },
    });
  } catch (e) {
    // La clave no puede llamarse `event`: el logger hace {level, event, ts,
    // ...data} y el spread la sobrescribiría.
    logger.warn("server_track_failed", {
      evento: event,
      reason: e instanceof Error ? e.message.split("\n").find(Boolean) : "desconocido",
    });
  }
}
