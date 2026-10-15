/**
 * Lo que el webhook de Stripe hace con los cobros del viaje CDMX–Xilitla.
 * Se llama ANTES que cualquier otra rama del webhook y se espera su resultado:
 * si falla, el webhook responde 500 y Stripe lo reintenta.
 *
 * Eventos (hay que suscribir el endpoint a los cuatro):
 *  - payment_intent.succeeded       → la reserva
 *  - payment_intent.requires_action → ficha OXXO creada: el apartado se alarga
 *  - payment_intent.canceled        → el lugar vuelve
 *  - payment_intent.payment_failed  → con OXXO es la ficha vencida (el lugar
 *    vuelve); con tarjeta es un rechazo y el cliente puede reintentar sobre el
 *    MISMO cobro, así que el apartado se queda.
 */
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { confirmarPasaje } from "./confirmar";
import { registrarFichaOxxo, soltarPorCobro } from "./apartar";
import { correoFichaOxxo } from "./correos";

export async function manejarEventoViaje(tipo: string, pi: Stripe.PaymentIntent): Promise<void> {
  switch (tipo) {
    case "payment_intent.succeeded":
      await confirmarPasaje(pi, "webhook");
      return;
    case "payment_intent.requires_action": {
      const f = await registrarFichaOxxo(pi);
      if (f.estado === "ficha" && f.primeraVez) await correoFichaOxxo(f.apartado, f.voucherUrl, f.vence);
      return;
    }
    case "payment_intent.canceled":
      await soltarPorCobro(pi);
      return;
    case "payment_intent.payment_failed": {
      const tipoMetodo = pi.last_payment_error?.payment_method?.type;
      logger.warn("viaje_cdmx_pago_fallido", { pi: pi.id, metodo: tipoMetodo ?? null, codigo: pi.last_payment_error?.code ?? null });
      if (tipoMetodo === "oxxo") await soltarPorCobro(pi);
      return;
    }
    default:
      return;
  }
}
