import { logger } from "@/lib/logger";

/**
 * Manda la COMPRA a Google Analytics desde el servidor.
 *
 * El `purchase` del navegador (`lib/analytics.ts`) funciona, pero se pierde en
 * tres casos reales y frecuentes:
 *
 *   1. La persona cierra la pestaña entre que Stripe confirma y la pantalla
 *      pinta el folio. Es tan común que el propio webhook existe para eso:
 *      "el cliente no completó la pantalla de confirmación".
 *   2. El pago queda en `processing` y se acredita minutos después. Ahí el
 *      navegador ya no está.
 *   3. Un bloqueador de anuncios tumba googletagmanager y `window.gtag` nunca
 *      llega a existir.
 *
 * El webhook de Stripe sí se entera siempre. Esto lo cuenta desde ahí.
 *
 * ── Nunca lanza ──────────────────────────────────────────────────────────────
 * Misma regla que `serverTrack.ts`: un fallo de analítica no puede tumbar una
 * venta. Si falta la clave o Google contesta mal, se anota y el cobro sigue.
 *
 * ── Falta configurar ────────────────────────────────────────────────────────
 * `GA4_API_SECRET` se crea en GA4 → Administrar → Flujos de datos → el flujo
 * web → Measurement Protocol → Crear. Mientras no exista, esto no hace nada:
 * el código puede desplegarse antes que la clave sin romper nada.
 */

const ENDPOINT = "https://www.google-analytics.com/mp/collect";

export interface CompraGA4 {
  /** El folio (HP-…). GA4 deduplica por aquí, así que tiene que ser el MISMO que manda el navegador. */
  transactionId: string;
  /** Identidad del navegador, de la cookie `_ga`. Sin esto GA4 pierde el canal de origen. */
  clientId?: string | null;
  value: number;
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
  /** 30 o 100: cuánto se cobró hoy. Sirve para comparar conversión entre las dos formas. */
  paymentPlan?: number;
  hasHotel?: boolean;
  hasTransfer?: boolean;
  coupon?: string | null;
}

/**
 * Un `client_id` de reserva cuando no se pudo leer la cookie.
 *
 * GA4 exige el campo, y sin él descarta el evento entero: es peor perder la
 * venta del informe que registrarla como un usuario suelto. El formato imita el
 * de gtag (`<aleatorio>.<epoch>`) para que no desentone en los datos.
 */
function clientIdDeReserva(): string {
  return `${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1000)}`;
}

export async function enviarCompraGA4(compra: CompraGA4): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_ID;
  const apiSecret     = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    // No es un error: es el estado normal hasta que se cree la clave.
    logger.warn("ga4_purchase_sin_configurar", {
      transaction: compra.transactionId,
      falta: !measurementId ? "NEXT_PUBLIC_GA4_ID" : "GA4_API_SECRET",
    });
    return;
  }

  try {
    const res = await fetch(
      `${ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: compra.clientId || clientIdDeReserva(),
          // Sin esto GA4 marca la sesión como "no engaged" y la conversión sale
          // huérfana en los informes de sesión.
          events: [{
            name: "purchase",
            params: {
              transaction_id:      compra.transactionId,
              currency:            "MXN",
              value:               compra.value,
              engagement_time_msec: 1,
              items:               compra.items,
              ...(compra.coupon      ? { coupon: compra.coupon } : {}),
              ...(compra.paymentPlan ? { payment_plan: compra.paymentPlan } : {}),
              has_hotel:    compra.hasHotel    ? 1 : 0,
              has_transfer: compra.hasTransfer ? 1 : 0,
              // Para poder separar en los informes lo que midió el servidor de
              // lo que midió el navegador mientras se comprueba la cobertura.
              origen_medicion: "servidor",
            },
          }],
        }),
      },
    );

    // El Measurement Protocol contesta 204 sin cuerpo incluso con datos
    // inválidos: un 2xx NO garantiza que el evento haya entrado. Para depurar
    // de verdad hay que usar la URL /debug/mp/collect a mano.
    if (!res.ok) {
      logger.warn("ga4_purchase_rechazado", { transaction: compra.transactionId, status: res.status });
      return;
    }
    logger.info("ga4_purchase_enviado", { transaction: compra.transactionId, value: compra.value });
  } catch (e) {
    logger.warn("ga4_purchase_falló", {
      transaction: compra.transactionId,
      reason: e instanceof Error ? e.message.split("\n").find(Boolean) : "desconocido",
    });
  }
}
