/**
 * Las clases que comparten los dos checkouts (tours y paquetes), 13 nov 2026.
 *
 * Antes cada botón, campo y tarjeta escribía las suyas y los dos checkouts se
 * veían parecidos pero no iguales (cajas cuadradas en uno, botones distintos
 * en el otro). La regla de formas del checkout:
 *   - tarjetas grandes (pasos, resumen, confianza): `rounded-2xl`;
 *   - bloques dentro de una tarjeta (renglones, opciones, campos, avisos) y el
 *     botón principal: `rounded-xl`;
 *   - contadores y etiquetas chicas: `rounded-full`.
 *
 * 🔴 El verde de hover es MÁS OSCURO que el del botón, no más claro: con
 * `verde-vivo` el texto crema bajaba a 2.8:1 justo al pasar el ratón.
 */

/** El botón de cada paso (Continuar, Ir al pago, Pagar). */
export const BOTON_PRINCIPAL =
  "group flex w-full items-center justify-center gap-2 rounded-xl bg-verde-selva px-5 py-4 " +
  "font-dm text-[12px] font-medium uppercase tracking-[2px] text-crema " +
  "shadow-[0_10px_24px_-14px_rgba(58,107,26,0.9)] transition-[background-color,transform] duration-150 " +
  "hover:bg-[#2e5714] active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100";

/** Un paso o una tarjeta del resumen. */
export const TARJETA = "rounded-2xl border border-negro/[0.08] bg-white";

/** La sombra de lo que está activo: teñida de verde oscuro, no negra. */
export const SOMBRA_ACTIVA = "shadow-[0_1px_2px_rgba(14,23,16,0.04),0_14px_34px_-18px_rgba(14,23,16,0.22)]";

/** Un campo de texto. Con error, el borde y el halo pasan a terracota. */
export function claseCampo(conError = false): string {
  return (
    "w-full rounded-xl border bg-white px-3.5 py-3 font-dm text-[15px] text-negro placeholder:text-negro/35 " +
    "outline-none transition-[border-color,box-shadow] duration-150 focus:ring-4 " +
    (conError ? "border-terracota focus:border-terracota focus:ring-terracota/10" : "border-negro/15 focus:border-verde-selva focus:ring-verde-selva/10")
  );
}

/** Los botones − y + de los contadores: 40 px en el teléfono, 36 en escritorio. */
export const BOTON_CONTADOR =
  "grid h-10 w-10 place-items-center rounded-full border border-negro/15 bg-white font-dm text-base leading-none text-negro/70 " +
  "transition-[border-color,background-color,transform] duration-150 hover:border-verde-selva hover:text-verde-selva " +
  "active:scale-[0.94] disabled:opacity-30 disabled:hover:border-negro/15 disabled:hover:text-negro/70 sm:h-9 sm:w-9";

/**
 * Los mismos − y + en los módulos OSCUROS de reserva de las fichas de tour
 * (ReservaFichaTour, RzrBookingForm), 20 nov 2026: antes medían 28 px y no
 * hacían juego (el − cuadrado y el + redondo). 44 px en el teléfono, lo mínimo
 * para el dedo; 36 en la columna de escritorio, como el checkout, para que las
 * etiquetas largas («niños de 4 a 7 · 50 %») no se partan.
 */
export const BOTON_CONTADOR_OSCURO =
  "grid h-11 w-11 place-items-center rounded-full border border-crema/20 font-dm text-base leading-none text-crema/70 " +
  "transition-[border-color,transform] duration-150 hover:border-verde-vivo active:scale-[0.94] " +
  "disabled:opacity-25 disabled:hover:border-crema/20 lg:h-9 lg:w-9";

/** La etiqueta chica arriba de un grupo («¿Cuántos van?», «Tu habitación»). */
export const ETIQUETA_GRUPO = "font-dm text-[11px] font-medium tracking-[1.5px] uppercase text-negro/50";
