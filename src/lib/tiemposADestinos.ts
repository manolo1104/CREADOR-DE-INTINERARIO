import type { Destino } from "@/lib/destinos";

/**
 * Cuánto se hace de Ciudad Valles a un destino, LEÍDO de su ficha (10 nov 2026).
 *
 * No hay una tabla de tiempos por destino: `tiemposDeViaje.ts` solo tiene los
 * de ciudad a ciudad. El dato vive en el `como_llegar` de cada ficha de
 * `DESTINOS_DB` («105 min desde Valles · …», «~1h 45min desde Ciudad Valles…»)
 * y aquí solo se lee —mismo criterio que `minutosDesdeValles` de `blogSeo.ts`,
 * que no se exporta—. Las guías de cascadas y de hospedaje lo ponen en tabla.
 *
 * Si la ficha no lo dice en una de estas formas, devuelve `null` y la tabla
 * pone «—»: mejor una casilla vacía que una cifra inventada. Se lee SIEMPRE el
 * texto español de `DESTINOS_DB` (el inglés es traducción y podría redactarse
 * distinto); el resultado («1 h 45 min») se escribe igual en los dos idiomas.
 *
 * Sin dependencias de datos (solo el tipo) porque `ciudadesOrigen.ts`, que lo
 * usa, también lo carga el pie de página en el navegador.
 */

/** 105 → «1 h 45 min» · 20 → «20 min» · 60 → «1 h». */
export function duracionTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Minutos (y si la ficha los da como aproximados) de un `como_llegar`; `null` si no se puede leer. */
function leerValles(txt: string): { min: number; aprox: boolean } | null {
  // «105 min desde Valles» · «45 min desde Valles por autopista».
  const minutos = /^(~?)\s*(\d+)\s*min desde (?:Ciudad )?Valles/.exec(txt);
  if (minutos) return { min: Number(minutos[2]), aprox: !!minutos[1] };
  // «1h 45min desde Valles» · «~1h 45min desde Ciudad Valles» · «1h desde Valles» ·
  // «~1 h desde Ciudad Valles (~55 km al sur)» (Aquismón).
  const horas = /^(~?)\s*(\d+)\s*h\s*(?:(\d+)\s*min)?\s*desde (?:Ciudad )?Valles/.exec(txt);
  if (horas) return { min: Number(horas[2]) * 60 + Number(horas[3] ?? 0), aprox: !!horas[1] };
  // «… (~1 h de Ciudad Valles por la autopista…)» (Siete Cascadas, Los Gómez).
  const paren = /\((~?)\s*(\d+)\s*h de Ciudad Valles/.exec(txt);
  if (paren) return { min: Number(paren[2]) * 60, aprox: !!paren[1] };
  return null;
}

/** «~1 h–1h 15 desde Ciudad Valles» (El Trampolín): un rango que no se reduce a un número. */
const RANGO = /^(~?)\s*(\d+)\s*h\s*[–-]\s*(\d+)\s*h\s*(\d+)\s*(?:min\s*)?desde (?:Ciudad )?Valles/;

/** Minutos desde Ciudad Valles, para ordenar o sacar el rango de una zona. `null` si no hay una cifra. */
export function minutosDesdeValles(d: Pick<Destino, "como_llegar">): number | null {
  const txt = d.como_llegar.trim();
  if (RANGO.test(txt)) return null;
  return leerValles(txt)?.min ?? null;
}

/** «45 min» · «~1 h 45 min» · «~1 h–1 h 15 min», o `null` si la ficha no lo dice así. */
export function tiempoDesdeValles(d: Pick<Destino, "como_llegar">): string | null {
  const txt = d.como_llegar.trim();
  const rango = RANGO.exec(txt);
  if (rango) {
    const [, tilde, a, b, bm] = rango;
    return `${tilde}${duracionTexto(Number(a) * 60)}–${duracionTexto(Number(b) * 60 + Number(bm))}`;
  }
  const v = leerValles(txt);
  return v ? `${v.aprox ? "~" : ""}${duracionTexto(v.min)}` : null;
}
