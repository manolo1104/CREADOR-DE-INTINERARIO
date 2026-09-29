/**
 * Lo que las páginas de LISTADO (inicio, /tours, /precios, la landing de
 * Ciudad Valles, llms.txt) dicen del catálogo entero en una frase: cuántos
 * llevan desayuno, cuáles recogen también en Ciudad Valles y el rango de
 * precio por persona.
 *
 * 🔴 Existe porque esas páginas decían, escrito a mano, "transporte, desayuno y
 * guía certificado incluidos, desde $900". Los dos recorridos de $900 (Gruta
 * de Xilo y Travesía del Café) no llevan desayuno, y de catorce solo cinco lo
 * llevan. Aquí se CUENTA desde el catálogo: un recorrido nuevo entra solo en la
 * cuenta que le toca.
 *
 * Solo depende de `tours.ts` (no de `localize.ts`) para poder usarse también
 * desde componentes de cliente sin arrastrar las traducciones.
 */
import { TOURS_DB, esPorPersona, recogidaDeTour, type Tour } from "@/lib/tours";

/**
 * ¿Su `incluye` trae desayuno?
 *
 * Se mira SIEMPRE la lista española de `TOURS_DB`, aunque llegue un tour ya
 * localizado: la inglesa es traducción ("Buffet breakfast", "Breakfast with
 * typical regional dishes") y con otra regex por idioma los dos conteos
 * podrían dejar de coincidir. Se exige que la línea EMPIECE por "Desayuno"
 * para no contar un "…no lleva desayuno".
 */
export function incluyeDesayuno(t: Pick<Tour, "id" | "incluye">): boolean {
  const base = TOURS_DB.find((x) => x.id === t.id) ?? t;
  return base.incluye.some((i) => /^desayuno/i.test(i.trim()));
}

/**
 * Los recorridos que pasan por ti a tu hospedaje en Xilitla O en Ciudad Valles
 * sin costo extra. Los de "solo Xilitla" (Gruta, Amanecer, Olla, Edén,
 * Travesía), el RZR (base en Xilitla) y el buceo (en la laguna) no entran.
 */
export function recogenEnValles<T extends Pick<Tour, "recogida">>(tours: T[]): T[] {
  return tours.filter((t) => recogidaDeTour(t).tipo === "hospedaje");
}

/**
 * Mínimo y máximo de lo que se cobra POR CABEZA. Filtra con `esPorPersona` y no
 * con `!== "vehiculo"`: la tarifa del Edén es del grupo entero y metida aquí
 * anunciaba $2,990 "por persona" como techo del rango.
 */
export function rangoPorPersona(tours: Pick<Tour, "precio" | "precioUnidad">[] = TOURS_DB): { min: number; max: number } {
  const precios = tours.filter(esPorPersona).map((t) => t.precio);
  return { min: Math.min(...precios), max: Math.max(...precios) };
}

/** Escalón más bajo y más alto de una tarifa por grupo (o el precio suelto si no la hay). */
export function rangoGrupo(t: Pick<Tour, "precio" | "tarifaGrupo">): { min: number; max: number } {
  const tabla = t.tarifaGrupo?.length ? t.tarifaGrupo : [t.precio];
  return { min: Math.min(...tabla), max: Math.max(...tabla) };
}
