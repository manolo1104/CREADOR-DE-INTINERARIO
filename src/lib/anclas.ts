/**
 * Anclas de página que usan a la vez el servidor y el cliente.
 *
 * 🔴 Viven aquí, en un módulo SIN "use client", a propósito. Todo lo que
 * exporta un archivo "use client" le llega a un Server Component como una
 * referencia de cliente —un objeto—, no como su valor. Cuando esta constante
 * vivía en `ReservaFichaTour.tsx`, la ficha del tour (que es de servidor) la
 * interpolaba y el HTML salía con `href="#[object Object]"`: el botón «Ver
 * fechas disponibles» del hero no hacía nada en los 13 recorridos, en español
 * y en inglés (28 sep – 1 oct 2026). Ni `tsc` ni el build lo detectan, porque
 * el tipo sigue siendo `string`. Clarity lo vio como «clic fallido».
 */

/** El módulo de fecha y personas de la ficha de un tour. */
export const ID_MODULO_RESERVA = "reservar-este-tour";
