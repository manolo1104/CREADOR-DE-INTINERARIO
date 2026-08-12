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
  // Los paquetes conservan su pantalla propia.
  if (esCarritoDePaquete(tourId)) {
    return `${appUrl}/reservar-paquete/${tourSlug}?recuperar=${token}`;
  }
  // Los tours van al carrito, que es la única experiencia de reserva. Los links
  // ya enviados apuntan a `/reservar-tour/<slug>?recuperar=<token>` y siguen
  // funcionando: esa ruta redirige aquí conservando el token.
  return `${appUrl}/reservar/carrito?recuperar=${token}`;
}
