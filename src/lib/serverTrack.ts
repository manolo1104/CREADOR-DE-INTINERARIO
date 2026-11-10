import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { MARCA_EQUIPO, esMarcaDelEquipo } from "@/lib/equipoInterno";

/**
 * ¿La petición en curso viene de un navegador del equipo? La MISMA marca que
 * GA4, Clarity y /api/track (lote 8, 10 nov 2026). Fuera de una petición (un
 * cron, el webhook de Stripe) no hay navegador: no es del equipo.
 */
export function peticionDelEquipo(): boolean {
  try {
    return esMarcaDelEquipo(cookies().get(MARCA_EQUIPO)?.value);
  } catch {
    return false;
  }
}

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
  // Lo que hace el equipo no se mide (lote 8): antes «llegó al pago» contaba
  // también las pruebas del equipo, que GA4 y /api/track ya dejaban fuera.
  if (peticionDelEquipo()) return;
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
