import { toursQueIncluyen } from "./tourMapping";

/**
 * Quién manda en la parte de abajo de la pantalla.
 *
 * Había tres barras fijas puestas por separado —la del tour, la del carrito y
 * los botones flotantes— y cada una decidía sola si aparecía. Cuando coincidían
 * se tapaban entre ellas: en una ficha de tour con algo en el carrito, "Ver
 * carrito" quedaba encima de "Reservar", los dos a `bottom-0`. Aquí vive la
 * única respuesta a "¿ya hay una barra abajo?", y todas preguntan lo mismo.
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
  return p.startsWith("/reservar/carrito")
      || /^\/(?:en\/)?reservar-(tour|paquete)\//.test(p)
      || /\/checkout$/.test(p);
}
