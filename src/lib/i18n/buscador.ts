import type { Locale } from "./config";

/**
 * Los textos del buscador del hero y de la rejilla filtrable del inicio.
 *
 * El patrón es el de `comparador.ts`: `type X = typeof ES` y `const EN: X`, para
 * que una traducción que falte rompa el build en vez de salir en blanco en
 * producción (`/en/page.tsx` reexporta la MISMA página del inicio, así que todo
 * lo que se añada aquí se ve en los dos idiomas o en ninguno).
 *
 * Las frases con número dentro son funciones, no plantillas partidas en trozos:
 * el inglés no ordena las palabras como el español.
 */
const ES = {
  // ── Buscador del hero ──
  queVer:        "¿Qué quieres ver?",
  queVerTodos:   "Todos los recorridos",
  cuando:        "¿Cuándo?",
  cuandoSinFecha: "Cualquier día",
  cuantos:       "¿Cuántos?",
  personas:      (n: number) => (n === 1 ? "1 persona" : `${n} personas`),
  menos:         "Una persona menos",
  mas:           "Una persona más",
  verTours:      "Ver tours",
  irAlTour:      "Ver este tour",

  // ── Rejilla filtrable ──
  tituloRejilla: "Los recorridos",
  buscar:        "Buscar: Tamul, Las Pozas, rafting…",
  buscarLabel:   "Buscar un recorrido por nombre o lugar",
  todos:         "Todos",
  resultados:    (n: number) => (n === 1 ? "1 recorrido" : `${n} recorridos`),
  paraGrupo:     (n: number) => (n === 1 ? "para 1 persona" : `para ${n} personas`),
  paraFecha:     (f: string) => `para el ${f}`,
  vacio:         "Ningún recorrido cumple eso.",
  vacioAyuda:    "Quita un filtro o escríbenos por WhatsApp y lo armamos a tu medida.",
  // Cuando lo ÚNICO que sobra es el tamaño del grupo. Decir «no hay nada» ahí
  // sería mentir: lo que pasa es que el rafting sale desde 5 y el rappel desde 4.
  vacioPorGrupo: (n: number) => (n === 1 ? "Eso no sale para una sola persona." : `Eso no sale para ${n} personas.`),
  vacioPorGrupoAyuda: (min: number, n: number) =>
    `Los que quedan necesitan al menos ${min} personas para salir. Puedes verlos de todos modos y escribirnos: con menos gente los armamos como privado.`,
  verlosIgual:   (n: number) => (n === 1 ? "Ver el recorrido igual" : `Ver los ${n} igual`),
  limpiar:       "Quitar los filtros",

  // ── Botón de disponibilidad real (9 oct 2026) ──
  verDisponibilidad: "Ver disponibilidad",
  comprobando:       "Consultando lugares…",
  // Sin fecha no hay nada que consultar: el botón abre el calendario.
  eligeFechaPrimero: "Elige una fecha",
  conLugar:          (n: number, f: string) =>
    n === 1
      ? `1 recorrido con lugar el ${f}`
      : `${n} recorridos con lugar el ${f}`,
  sinLugarNinguno:   (f: string) => `Ningún recorrido tiene lugar el ${f} para ese grupo.`,
  sinLugarAlgunos:   (n: number) => (n === 1 ? "1 ya no tiene lugar ese día" : `${n} ya no tienen lugar ese día`),
  verTodosIgual:     "Ver todos los recorridos",
  verCatalogo:   "Ver la página de todos los recorridos →",
  anterior:      "Recorridos anteriores",
  siguiente:     "Más recorridos",
  desliza:       "Desliza para ver más →",
  cerrar:        "Cerrar",
  listo:         "Listo",
};

type BuscadorUI = typeof ES;

const EN: BuscadorUI = {
  queVer:        "What do you want to see?",
  queVerTodos:   "All tours",
  cuando:        "When?",
  cuandoSinFecha: "Any day",
  cuantos:       "How many?",
  personas:      (n) => (n === 1 ? "1 person" : `${n} people`),
  menos:         "One person fewer",
  mas:           "One person more",
  verTours:      "See tours",
  irAlTour:      "See this tour",

  tituloRejilla: "The tours",
  buscar:        "Search: Tamul, Las Pozas, rafting…",
  buscarLabel:   "Search a tour by name or place",
  todos:         "All",
  resultados:    (n) => (n === 1 ? "1 tour" : `${n} tours`),
  paraGrupo:     (n) => (n === 1 ? "for 1 person" : `for ${n} people`),
  paraFecha:     (f) => `for ${f}`,
  vacio:         "No tour matches that.",
  vacioAyuda:    "Drop a filter, or message us on WhatsApp and we'll build it for you.",
  vacioPorGrupo: (n) => (n === 1 ? "That one doesn't run for a single traveler." : `That one doesn't run for ${n} people.`),
  vacioPorGrupoAyuda: (min, n) =>
    `The remaining ones need at least ${min} people to go out. You can still see them and write to us: with fewer, we run them as a private tour.`,
  verlosIgual:   (n) => (n === 1 ? "See it anyway" : `See all ${n} anyway`),
  limpiar:       "Clear the filters",

  verDisponibilidad: "Check availability",
  comprobando:       "Checking spots…",
  eligeFechaPrimero: "Pick a date first",
  conLugar:          (n, f) =>
    n === 1 ? `1 tour with room on ${f}` : `${n} tours with room on ${f}`,
  sinLugarNinguno:   (f) => `No tour has room on ${f} for that group.`,
  sinLugarAlgunos:   (n) => (n === 1 ? "1 is already full that day" : `${n} are already full that day`),
  verTodosIgual:     "Show every tour",
  verCatalogo:   "See the full tour catalog →",
  anterior:      "Previous tours",
  siguiente:     "More tours",
  desliza:       "Swipe to see more →",
  cerrar:        "Close",
  listo:         "Done",
};

export function buscadorUI(locale: Locale): BuscadorUI {
  return locale === "en" ? EN : ES;
}
