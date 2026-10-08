import type Stripe from "stripe";

/**
 * Meses sin intereses (MSI) en Stripe México. **La única fuente.**
 *
 * Lo pidió Manolo el 8 oct 2026: «lo quiero en todos los productos y en
 * carrito». Vive aquí y no copiado en cada ruta porque son tres rutas de cobro
 * (tours, carrito y paquetes) y basta con que una se quede sin la opción para
 * que el mismo cliente vea meses en una pantalla y no en la siguiente.
 *
 * ## Cómo funciona
 *
 * MSI es una función de la TARJETA: el banco del cliente le cobra en parcialidades
 * y a nosotros nos paga completo, menos una comisión. No es un método de pago
 * nuevo, así que convive con `allow_redirects: "never"` —no hay redirección que
 * valga— y no hay que tocar nada del flujo. Stripe decide solo qué planes ofrece
 * según el banco y el monto; nosotros solo decimos que sí.
 *
 * ## 🔴 Lo que hay que saber antes de encenderlo
 *
 * 1. **Hay que activarlo en el panel de Stripe** (cuenta de México). Si no está,
 *    esta opción no hace nada y el pago sigue igual: no se rompe.
 * 2. **Cuesta dinero.** Stripe cobra un extra sobre el 3.6 % + $3 normal, que
 *    arranca en ~5 % a 3 meses y sube con el plazo. En un paquete de $12,000 a
 *    3 meses son unos $600. Por eso el tope son 9 meses y no 24.
 * 3. **No se ofrece sobre cualquier monto.** El carrito cobra el 30 % de
 *    anticipo —unos $870— y ningún banco da meses sobre eso: se vería la opción,
 *    se elegiría y fallaría. Por eso `MSI_DESDE`, y por eso el carrito ofrece
 *    «paga todo hoy» cuando el viaje pasa del umbral: sin ese botón, MSI solo
 *    existiría en paquetes.
 */

/**
 * Desde cuánto tiene sentido ofrecer meses. Es el importe QUE SE COBRA HOY, no
 * el total del viaje.
 *
 * $3,000 no es un límite de Stripe —los bancos arrancan mucho más abajo—: es
 * desde dónde partir en mensualidades le sirve de algo a alguien. Debajo de eso
 * la comisión se come el margen de un recorrido suelto sin cambiar la decisión
 * de compra.
 */
export const MSI_DESDE = 3000;

/** Los plazos que se ofrecen, de menos a más caros para nosotros. */
export const MSI_PLAZOS = [3, 6, 9] as const;

/** ¿Se le dice al cliente que puede pagar a meses con este importe? */
export function hayMsi(montoMxn: number): boolean {
  return Number.isFinite(montoMxn) && montoMxn >= MSI_DESDE;
}

/**
 * Lo que se le pasa a `paymentIntents.create` **y a `update`**. Se esparce sin
 * `if` en cada ruta:
 *
 *     ...opcionesMsi(cobrar)
 *
 * 🔴 Siempre dice `enabled: true` o `enabled: false`, nunca «nada». El carrito
 * REUTILIZA el PaymentIntent mientras siga en `requires_payment_method`
 * (`carrito-payment-intent`), así que el importe cambia bajo un mismo cobro: si
 * esto devolviera `{}` por debajo del umbral, un carrito que empieza chico y
 * crece se quedaría sin meses, y uno que empieza grande y se encoge los
 * seguiría ofreciendo sobre un importe en el que ningún banco los da.
 */
export function opcionesMsi(montoMxn: number): { payment_method_options: Stripe.PaymentIntentCreateParams.PaymentMethodOptions } {
  return {
    payment_method_options: {
      card: {
        // Stripe elige qué planes puede dar cada tarjeta; aquí solo se habilita.
        installments: { enabled: hayMsi(montoMxn) },
      },
    },
  };
}
