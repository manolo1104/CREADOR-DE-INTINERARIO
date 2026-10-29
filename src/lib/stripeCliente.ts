import { loadStripe } from "@stripe/stripe-js";

/**
 * Stripe se carga UNA vez para todo el sitio. Antes cada checkout (carrito,
 * paquetes y el del RZR) tenía su propia copia de esta línea con la llave
 * escrita a mano: cambiar la llave era acordarse de tres archivos.
 *
 * ⚠️ El respaldo NO es decorativo: en Railway no existe
 * `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (comprobado el 4 oct 2026), así que en
 * producción la llave publicable sale de aquí. Es la PUBLICABLE (pk_live), la
 * que por diseño viaja al navegador; la secreta nunca pasa por este archivo.
 *
 * 🔴 Cuenta NUEVA de Stripe (29 oct 2026, Manolo: «cambia las claves de
 * Stripe»): la publicable es de la cuenta `51UV52SA…`; la anterior era de
 * `51SuFNKP…`. Una publicable solo cobra con la SECRETA de SU MISMA cuenta:
 * `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en Railway deben ser de la
 * cuenta nueva ANTES de que este cambio llegue a producción, o ningún pago
 * pasará (Stripe.js rechaza el PaymentIntent de otra cuenta).
 */
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51UV52SAaj6hZowZJfZJqcsTvxlPrUvU2xLcrzGSSV0SYTNmlw3JeXENzQpGbuqwP3af2aut0thqA80hc5LMPXD4Z00q699Epr4"
);

/**
 * El aspecto del formulario de Stripe, para que no entre como una caja de otro
 * sitio justo en el paso de pagar.
 *
 * 🔴 El CARRITO era el único de los tres cobros que montaba `<Elements>` SIN
 * `appearance`: el checkout del RZR y el de paquetes sí lo tenían. Resultado:
 * el flujo por el que pasa casi toda la venta era el que peor se veía.
 *
 * Los valores son los del sitio (`tailwind.config.ts`): verde-selva, crema,
 * verde-profundo y DM Sans, con esquinas rectas como todo lo demás.
 */
export const APARIENCIA_STRIPE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary:    "#3a6b1a",
    colorBackground: "#f4edd8",
    colorText:       "#1a2e1a",
    fontFamily:      "DM Sans, sans-serif",
    borderRadius:    "0px",
  },
};
