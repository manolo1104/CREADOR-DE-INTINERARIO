import { fmtHora12 } from "./tours";

/**
 * Lo que es CIERTO del hotel y del restaurante que son nuestros, en un solo
 * sitio. Lo dicen la ficha de tour (`BloqueCasaPropia`), el bloque «Reserva
 * directo», /nosotros y el correo de confirmación; escrito a mano en cada uno
 * acabaría diciendo distancias distintas, que es justo lo que ya pasa: el texto
 * viejo de /info-practica dice «a 50 metros» del jardín.
 *
 * Fuente: lo confirmado en el sitio del hotel y en el cerebro de su propio bot
 * (`hotelServicios` en `src/scripts/export-bot-data.ts`), más lo que Manolo
 * confirmó el 6 oct 2026 sobre quien llega en el autobús de la mañana.
 *
 * Tours Huasteca y el Hotel Paraíso Encantado son marcas distintas del mismo
 * grupo familiar: el sitio dice «el hotel es nuestro», pero NO se funden en el
 * JSON-LD (cada una tiene su ficha de Google y sus reseñas).
 *
 * 🔴 Fuera de aquí a propósito, para que nadie lo prometa tomándolo de aquí:
 *  - El precio de la noche. El de la Jungla se contradice entre fuentes:
 *    $1,900 en `hospedaje.ts` (viajes a la medida del bot) y $2,000 en
 *    `habitaciones.ts`, que es lo que cobra el checkout de paquetes.
 *  - Cuántos cuartos tiene (9 contra 15, sin resolver).
 *  - La recogida: pasamos gratis por CUALQUIER hospedaje de Xilitla o de Valles
 *    (`faqTours.ts`), así que no es ventaja del hotel.
 *  - El desayuno de los tours: es en El Taco Loco, camino al recorrido, no en
 *    el hotel ni en El Papán.
 */
export const HOTEL_PROPIO = {
  nombre: "Hotel Paraíso Encantado",
  /** Dónde está, dentro de Xilitla. */
  zona: "La Conchita",
  /** A pie hasta Las Pozas, el jardín de Edward James. */
  metrosALasPozas: 400,
  minutosCaminando: 5,
  restaurante: "El Papán Huasteco",
  /** Horario de El Papán, en reloj de 24 h: 8 = 8:00 AM, 20 = 8:00 PM. */
  restauranteAbre: 8,
  restauranteCierra: 20,
} as const;

/** «de 8:00 AM a 8:00 PM» · «8:00 AM to 8:00 PM». Las horas como en el resto del sitio. */
export function horarioRestaurante(en: boolean): string {
  const abre = fmtHora12(HOTEL_PROPIO.restauranteAbre);
  const cierra = fmtHora12(HOTEL_PROPIO.restauranteCierra);
  return en ? `${abre} to ${cierra}` : `de ${abre} a ${cierra}`;
}
