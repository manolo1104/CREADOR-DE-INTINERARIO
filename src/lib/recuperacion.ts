/**
 * A dónde regresa el link de recuperación de un carrito abandonado.
 *
 * La tabla `AbandonedCart` se creó para tours sueltos y el link se armaba
 * siempre como `/reservar-tour/<slug>`. Al empezar a guardar también los
 * paquetes, ese link mandaba a una ruta que no existe: el correo de rescate
 * llevaba a un 404, que es peor que no mandarlo.
 *
 * Los carritos de paquete se marcan con `tourId = "paquete"`, así no hizo falta
 * migrar la base para distinguirlos.
 */

export const MARCA_PAQUETE = "paquete";

export function esCarritoDePaquete(tourId?: string | null): boolean {
  return tourId === MARCA_PAQUETE;
}

export function linkRecuperacion(
  appUrl: string,
  tourId: string | null | undefined,
  tourSlug: string,
  token: string,
): string {
  const ruta = esCarritoDePaquete(tourId) ? "reservar-paquete" : "reservar-tour";
  return `${appUrl}/${ruta}/${tourSlug}?recuperar=${token}`;
}
