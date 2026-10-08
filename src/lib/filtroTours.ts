import { TOUR_CATEGORIAS, type Tour } from "./tours";
import { ETIQUETAS, etiquetasDeTour } from "./etiquetasTour";
import type { IntencionInicio } from "./intencionInicio";

/**
 * El filtro de recorridos, en un solo sitio.
 *
 * 🔴 Por qué existe (8 oct 2026)
 *
 * El inicio ya filtraba el catálogo con píldoras (`ToursGridFiltrable`), y
 * Manolo pidió el mismo filtro en `/reservar`, que es donde lo manda ahora el
 * buscador del hero. Copiar la lógica habría dejado dos tablas de píldoras que
 * se desincronizan en cuanto alguien añada una etiqueta: el conteo de una
 * diría nueve y el de la otra ocho.
 *
 * Esto es solo el cálculo. Cada página pinta sus propias píldoras, porque una
 * va sobre arena clara y la otra sobre verde oscuro.
 */

/** Marca de «este recorrido y ninguno más» dentro del id de píldora. */
export const PREFIJO_TOUR = "tour:";

export interface ChipTour {
  id: string;
  label: string;
  /** Cuántos recorridos caen en esta píldora. Una píldora con cero no se pinta. */
  n: number;
  test: (t: Tour) => boolean;
}

/**
 * Las píldoras: las tres familias del catálogo (`TOUR_CATEGORIAS`) y las
 * etiquetas (`etiquetasTour.ts`), con su conteo ya hecho.
 */
export function chipsDeTours(tours: Tour[], en: boolean): ChipTour[] {
  const etiquetas = ETIQUETAS.map((e) => ({
    id: e.id as string,
    label: en ? e.labelEn : e.label,
    test: (t: Tour) => etiquetasDeTour(t).includes(e.id),
  }));
  /* 🔴 «Los más populares» va PRIMERA, antes que las tres familias del
     catálogo (8 oct 2026). El orden no es cosmético: la primera píldora es la
     respuesta a «no sé cuál elegir», que es con lo que llega casi todo el
     mundo. «Ecoturismo» no le dice eso a nadie. */
  const populares = etiquetas.filter((e) => e.id === "populares");
  const resto     = etiquetas.filter((e) => e.id !== "populares");
  const crudos: Omit<ChipTour, "n">[] = [
    ...populares,
    ...TOUR_CATEGORIAS.map((c) => ({
      id: c.id as string,
      label: en ? c.labelEn : c.label,
      test: (t: Tour) => t.categoria === c.id,
    })),
    ...resto,
  ];
  return crudos
    .map((c) => ({ ...c, n: tours.filter(c.test).length }))
    .filter((c) => c.n > 0);
}

/** Lo que cumple la píldora y el texto, SIN mirar el tamaño del grupo. */
export function porChipYTexto(tours: Tour[], chips: ChipTour[], chip: string, texto: string): Tour[] {
  // Un recorrido concreto elegido en el buscador: se enseña ese y nada más.
  const soloEste = chip.startsWith(PREFIJO_TOUR) ? chip.slice(PREFIJO_TOUR.length) : null;
  const activo = chips.find((c) => c.id === chip);
  const q = texto.trim().toLowerCase();
  return tours.filter((t) => {
    if (soloEste) return t.slug === soloEste;
    if (activo && !activo.test(t)) return false;
    if (!q) return true;
    const heno = [t.nombre, t.nombreCorto, t.tipo, t.tagline, ...t.destinos].join(" ").toLowerCase();
    return heno.includes(q);
  });
}

/**
 * Y ahora sí el tamaño del grupo, que es un filtro REAL: `groupMin` y
 * `groupMax` están en el catálogo y son el cupo con el que sale cada recorrido.
 *
 * Va aparte de `porChipYTexto` a propósito: es lo que permite distinguir «no
 * hay nada de eso» de «sí hay, pero no para dos personas», que son dos
 * callejones muy distintos. Con el grupo por omisión del buscador —dos—, la
 * píldora «Actividades extremas» devuelve CERO, porque el rafting sale desde 5
 * y el rappel desde 4.
 */
export function porGrupo(tours: Tour[], personas: number): Tour[] {
  if (!personas) return tours;
  return tours.filter((t) => personas >= t.groupMin && personas <= t.groupMax);
}

/** El mínimo de personas que piden los que se quedaron fuera por el grupo. */
export function minimoQuePiden(tours: Tour[], personas: number): number {
  const mayores = tours.filter((t) => t.groupMin > personas).map((t) => t.groupMin);
  return mayores.length ? Math.min(...mayores) : 0;
}

/** La píldora que corresponde a lo que se eligió en el buscador del hero. */
export function chipDeIntencion(i: IntencionInicio): string {
  if (i.que.tipo === "todos") return "todos";
  // Un recorrido concreto no es una píldora del catálogo: viaja con prefijo
  // para que `porChipYTexto` lo reconozca sin confundirlo con una etiqueta.
  if (i.que.tipo === "tour") return `${PREFIJO_TOUR}${i.que.slug}`;
  return i.que.id;
}
