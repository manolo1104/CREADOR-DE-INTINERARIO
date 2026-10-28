/**
 * Un toque de persona, para que el carrito aparte lugares solo cuando hay
 * alguien del otro lado.
 *
 * El 11 oct 2026 se midió que 6 de los 12 apartados de 15 minutos los crearon
 * robots: los escáneres de los correos abren el enlace del carrito y el
 * carrito apartaba al cargar, sin que nadie tocara nada. Esos apartados
 * descuentan lugares REALES del cupo de los demás durante 15 minutos.
 *
 * Quien llega al carrito desde un botón del sitio ya tocó: la ficha lo deja
 * anotado aquí y el carrito no le hace esperar al primer toque.
 */
const CLAVE = "hp_toque";

export function marcarToqueHumano() {
  try { sessionStorage.setItem(CLAVE, "1"); } catch { /* sin almacenamiento: el carrito espera al toque */ }
}

export function huboToqueHumano(): boolean {
  try { return sessionStorage.getItem(CLAVE) === "1"; } catch { return false; }
}
