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

/** Dentro del motor de reservas no se pinta ninguna barra global. */
export function enMotorDeReservas(pathname: string | null | undefined): boolean {
  return /^\/(?:en\/)?reservar(-tour|-paquete)?(\/|$)/.test(pathname ?? "");
}
