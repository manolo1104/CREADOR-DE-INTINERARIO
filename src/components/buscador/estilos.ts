/**
 * El vidrio del buscador, en un solo sitio.
 *
 * 🔴 Por qué existe (9 oct 2026, «mejora el selector de fechas y personas, que
 * se vea como el del hero»)
 *
 * El buscador del inicio y el filtro de `/reservar` hacen lo mismo —qué,
 * cuándo, cuántos— y se veían distintos: el del hero es UNA superficie de
 * vidrio con los campos separados por una línea de un píxel; el de `/reservar`
 * eran tres cajas sueltas con su propio borde, apiladas. Tres rectángulos
 * donde debería haber uno.
 *
 * Copiar las clases de un archivo al otro habría durado hasta el primer ajuste.
 * Viven aquí y los dos las importan, así que no pueden separarse.
 *
 * El `backdrop-blur` va UNA vez, en la fila: apilado en cada campo se nota al
 * pintar cada cuadro, y en una pantalla de 120 Hz se ve.
 */

/** La superficie: una sola fila de vidrio con los campos dentro. */
export const FILA_BUSCADOR =
  "flex flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/[0.07] " +
  "shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 " +
  "sm:flex-row sm:items-stretch";

/** Cada campo. Sin borde ni fondo propios: se enciende al pasar o al enfocar. */
export const CELDA_BUSCADOR =
  "relative flex-1 min-w-0 px-5 py-3.5 transition-colors duration-200 " +
  "hover:bg-white/[0.06] focus-within:bg-white/[0.08]";

/** El rótulo de cada campo («¿Cuándo?»). */
export const ETIQUETA_BUSCADOR =
  "mb-0.5 block font-dm text-[10px] uppercase tracking-[2px] text-crema/55";

/** La línea de un píxel entre campos: horizontal en móvil, vertical en fila. */
export const SEPARADOR_BUSCADOR = "h-px bg-white/15 sm:h-auto sm:w-px";
