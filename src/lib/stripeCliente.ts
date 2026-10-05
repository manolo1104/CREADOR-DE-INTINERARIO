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
 */
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51SuFNKPRwYk9rOzoUc56CjtGJ2VdnUkHvRNlP6N6EXX2PHdemLg0oHcOhXTUyv1jl1XHKvxcMfoIJErQSBBp4ojT00UPdWzcaR"
);
