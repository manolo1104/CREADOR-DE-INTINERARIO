import { toursQueIncluyen } from "./tourMapping";

/**
 * Quién manda en la parte de abajo de la pantalla.
 *
 * Había tres barras fijas puestas por separado —la del tour, la del carrito y
 * los botones flotantes— y cada una decidía sola si aparecía. Cuando coincidían
 * se tapaban entre ellas: en una ficha de tour con algo en el carrito, "Ver
 * carrito" quedaba encima de "Reservar", los dos a `bottom-0`. Aquí vive la
 * única respuesta a "¿ya hay una barra abajo?", y todas preguntan lo mismo.
 *
 * Desde el 7 oct 2026 ya no hay tres: los flotantes y la barra del carrito se
 * fundieron en `BarraInferiorMovil`, que vale en TODOS los tamaños.
 * `FloatingReservarButton` y `carrito/CarritoBar` se borraron.
 *
 * Qué significa cada regla hoy:
 *  · `enPantallaDePago` → no hay barra, en ningún tamaño.
 *  · `hayBarraDeTour`   → en el celular manda `MobileBookingBar`; en escritorio
 *    la barra sale, pero solo con WhatsApp (la ficha ya trae su módulo de
 *    reserva fijo en la barra lateral).
 *  · `sinFlotantes` / `conReservarPropio` → igual que antes.
 */

/** Alto real de una barra inferior, para levantar lo que flote encima. */
export const ALTO_BARRA = 72;

/**
 * ¿Esta ruta monta la barra del tour (`MobileBookingBar`)?
 *
 * Es en fichas de tour, y en destinos que sí tienen un tour que los visita —el
 * destino sin tour no la monta, así que ahí la del carrito sí puede salir.
 */
export function hayBarraDeTour(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (/^\/(?:en\/)?tours\/[^/]+$/.test(pathname)) return true;
  const destino = pathname.match(/^\/(?:en\/)?destinos\/([^/]+)$/);
  return destino ? toursQueIncluyen(destino[1]).length > 0 : false;
}

/**
 * ¿Es una PANTALLA DE PAGO? Ahí no se pinta la barra del carrito: repite lo que
 * ya está en pantalla y, en el checkout de un paquete, invita a irse a otra
 * compra justo antes de pagar.
 *
 * ⚠️ `/reservar` a secas NO entra: es el CATÁLOGO, y es justo donde más falta
 * hace la barra —quien está eligiendo su segundo recorrido necesita ver que
 * lleva algo—. Al unificar la regla se coló y la barra desapareció de ahí.
 */
export function enPantallaDePago(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  // El `/en/` del carrito NO es opcional por gusto: esta regla se escribió
  // cuando el carrito solo existía en español, así que `/en/reservar/carrito`
  // no casaba y la barra "Ver carrito" salía flotando ENCIMA del botón de pagar
  // en la versión en inglés — justo lo que el resto del archivo evita.
  return /^\/(?:en\/)?reservar\/carrito/.test(p)
      || /^\/(?:en\/)?reservar-(tour|paquete)\//.test(p)
      || /\/checkout$/.test(p);
}

/**
 * ¿Ruta SIN botón fijo de reservar ni de WhatsApp? El planificador y el
 * recomendador (llevan su propio flujo) y todo /reservar…: el catálogo y
 * cualquier reserva en curso. Dentro de una reserva el «Reservar tour» fijo
 * hacía daño: en el celular era el ÚNICO control fijo y llevaba a /reservar, o
 * sea, abandonaba la reserva a medias y devolvía al catálogo.
 *
 * ⚠️ La barra del carrito NO sigue esta regla, sigue `enPantallaDePago`: en el
 * catálogo y en el recomendador sí recuerda lo que llevas.
 */
export function sinFlotantes(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p === "/planear" || p === "/recomendar" || /^\/(?:en\/)?reservar(-tour|-paquete)?(\/|$)/.test(p);
}

/**
 * ¿La página ya trae su propio «Reservar»? Entonces abajo solo cabe WhatsApp.
 *
 * - Landings del paquete Xantolo: su botón reserva el paquete con fecha fija.
 *   Uno fijo que lleva al catálogo de tours sería un segundo «reservar» que no
 *   reserva lo mismo.
 * - El comparador (2 oct 2026): cada columna trae su «Reservar» con el grupo
 *   puesto; el genérico no reservaría nada de lo que se está comparando.
 */
export function conReservarPropio(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p === "/paquetes/xantolo-2026"
      || p === "/paquetes/noche-de-xantolo"
      || /^\/(?:en\/)?comparar$/.test(p);
}
