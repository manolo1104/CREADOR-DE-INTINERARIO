/**
 * El comparador de recorridos y paquetes (/comparar), la parte PURA: lo que
 * también corre en el navegador.
 *
 * Aquí vive todo lo que el visitante cambia sin recargar —cuántos viajan, el
 * total de cada recorrido para ese grupo— y la forma de las URL. Lo que arma
 * la tabla con el catálogo completo vive en `comparadorDatos.ts`, que es solo
 * de servidor: así el catálogo no viaja entero al teléfono.
 *
 * 🔴 Ni una clase de Tailwind en este archivo: Tailwind no lee `src/lib` y una
 * clase escrita aquí no llegaría nunca a la hoja de estilos.
 */
import { totalRecorrido, minimoPersonas, esViajeroSolo } from "./tourBooking";
import type { Tour } from "./tours";
import { localePath, type Locale } from "./i18n/config";

export type TipoComparacion = "recorridos" | "paquetes";

/** Quién viaja. Los mismos tres tramos que el carrito y el checkout. */
export interface Grupo {
  adultos:    number;
  /** De 6 a 10 años: pagan el 70 %. */
  ninosMid:   number;
  /** Menores de 6: pagan el 50 %. */
  ninosSmall: number;
}

/** El grupo con el que abre la página: dos adultos, como la ficha y el carrito. */
export const GRUPO_INICIAL: Grupo = { adultos: 2, ninosMid: 0, ninosSmall: 0 };

/** Columnas como máximo: tres recorridos; los cuatro paquetes caben juntos. */
export const MAX_COLUMNAS: Record<TipoComparacion, number> = { recorridos: 3, paquetes: 4 };

/** Con menos de dos no hay nada que comparar: el botón de quitar se esconde. */
export const MIN_COLUMNAS = 2;

/** Hasta dónde llega el contador de gente en cada pestaña. */
export interface LimitesGrupo {
  minAdultos:  number;
  maxPersonas: number;
}

export const personasDe = (g: Grupo) => g.adultos + g.ninosMid + g.ninosSmall;

export const esGrupoInicial = (g: Grupo) =>
  g.adultos === GRUPO_INICIAL.adultos && g.ninosMid === 0 && g.ninosSmall === 0;

/**
 * Los slugs de la URL (`?r=a,b,c`), sin vacíos ni repetidos. No los valida
 * contra el catálogo: eso lo hace el servidor, que es quien lo tiene.
 */
export function parseLista(valor: string | string[] | undefined): string[] {
  const crudo = Array.isArray(valor) ? valor.join(",") : valor ?? "";
  const vistos = new Set<string>();
  for (const s of crudo.split(",")) {
    const slug = s.trim().toLowerCase();
    if (slug && !vistos.has(slug)) vistos.add(slug);
  }
  return Array.from(vistos);
}

const entero = (v: unknown): number => {
  const n = Math.floor(Number(Array.isArray(v) ? v[0] : v));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * El grupo de la URL, recortado a los límites de la pestaña. Un `adultos=999`
 * pegado a mano no debe pintar un total que nadie va a poder pagar.
 */
export function parseGrupo(
  sp: { adultos?: unknown; ninosMid?: unknown; ninosSmall?: unknown },
  lim: LimitesGrupo,
): Grupo {
  const a = entero(sp.adultos);
  const m = entero(sp.ninosMid);
  const s = entero(sp.ninosSmall);
  const g: Grupo = {
    adultos:    Number.isNaN(a) ? GRUPO_INICIAL.adultos : Math.max(lim.minAdultos, a),
    ninosMid:   Number.isNaN(m) ? 0 : Math.max(0, m),
    ninosSmall: Number.isNaN(s) ? 0 : Math.max(0, s),
  };
  // Se recorta primero a los menores: el adulto es el que no puede faltar.
  while (personasDe(g) > lim.maxPersonas && g.ninosSmall > 0) g.ninosSmall--;
  while (personasDe(g) > lim.maxPersonas && g.ninosMid > 0) g.ninosMid--;
  if (personasDe(g) > lim.maxPersonas) g.adultos = lim.maxPersonas;
  return g;
}

/**
 * La URL de una comparación. Las comas van sin codificar a propósito: la liga
 * se comparte por WhatsApp y `r=tamul,meco` se lee; `r=tamul%2Cmeco`, no.
 * `origen` solo sirve para medir de dónde llegan; la liga de compartir no lo
 * lleva.
 */
export function urlComparar(
  tipo: TipoComparacion,
  slugs: readonly string[],
  opciones: { grupo?: Grupo; locale?: Locale; origen?: string } = {},
): string {
  const { grupo, locale = "es", origen } = opciones;
  const partes = [`${tipo === "paquetes" ? "p" : "r"}=${slugs.map(encodeURIComponent).join(",")}`];
  if (grupo && !esGrupoInicial(grupo)) {
    partes.push(`adultos=${grupo.adultos}`);
    if (grupo.ninosMid) partes.push(`ninosMid=${grupo.ninosMid}`);
    if (grupo.ninosSmall) partes.push(`ninosSmall=${grupo.ninosSmall}`);
  }
  if (origen) partes.push(`o=${encodeURIComponent(origen)}`);
  return `${localePath("/comparar", locale)}?${partes.join("&")}`;
}

// ── Total de un recorrido para el grupo ──────────────────────────────────────

/**
 * Lo mínimo de un recorrido que hace falta para cotizarlo en el navegador.
 * Se arma en el servidor (`comparadorDatos.ts`) y viaja así de chico.
 */
export type TarifaTour = Pick<
  Tour,
  "slug" | "precio" | "precioUnidad" | "tarifaGrupo" | "groupMin" | "groupMax" | "soloAdultos"
> & {
  /** De `TOUR_REQUISITOS`. Informativa: la reserva no la bloquea (Manolo, 2 oct 2026). */
  edadMinima?: number;
};

export type TotalTour =
  | { ok: true; total: number; viajeroSolo: boolean; porGrupo: boolean }
  /** RZR: se cobra por vehículo y la ruta; con gente no se puede cotizar. */
  | { ok: false; motivo: "vehiculo"; desde: number }
  /** Buceo con niños: es solo para mayores de 10. */
  | { ok: false; motivo: "soloAdultos" }
  /** Menores de 6 en un recorrido con edad mínima de 6 o más. */
  | { ok: false; motivo: "edadMinima"; edad: number }
  | { ok: false; motivo: "maximo"; maximo: number }
  | { ok: false; motivo: "minimo"; minimo: number };

/**
 * Lo que cuesta este recorrido para este grupo, o por qué no se puede decir.
 *
 * El número sale de `totalRecorrido`, la MISMA función que pinta la ficha y el
 * carrito y que usa el servidor al cobrar (`computeTourCharge`): el
 * comparador no puede enseñar un total y el checkout cobrar otro.
 *
 * ⚠️ Es más estricto que el servidor en dos casos, a propósito:
 * - más gente que `groupMax`: el servidor recorta en silencio (pides 9, cobra
 *   8); aquí se dice el máximo en vez de pintar un total que no es el de ellos.
 * - menores de 6 en un recorrido "desde 8 años": la reserva los deja pasar
 *   (Manolo eligió solo informarlo), pero el comparador no le pone precio a
 *   algo que no se va a operar. Los de 6 a 10 van en un solo tramo y no se
 *   pueden separar: ahí manda la línea de edad.
 */
export function totalTourParaGrupo(t: TarifaTour, g: Grupo): TotalTour {
  if (t.precioUnidad === "vehiculo") return { ok: false, motivo: "vehiculo", desde: t.precio };
  if (t.soloAdultos && g.ninosMid + g.ninosSmall > 0) return { ok: false, motivo: "soloAdultos" };
  if ((t.edadMinima ?? 0) >= 6 && g.ninosSmall > 0) {
    return { ok: false, motivo: "edadMinima", edad: t.edadMinima! };
  }
  const personas = personasDe(g);
  if (personas > t.groupMax) return { ok: false, motivo: "maximo", maximo: t.groupMax };
  const minimo = minimoPersonas(t);
  if (personas < minimo) return { ok: false, motivo: "minimo", minimo };
  return {
    ok: true,
    total: totalRecorrido(t, g.adultos, g.ninosMid, g.ninosSmall),
    viajeroSolo: esViajeroSolo(t, g.adultos, g.ninosMid, g.ninosSmall),
    porGrupo: !!t.tarifaGrupo?.length,
  };
}

/**
 * A dónde lleva "Reservar": al carrito con el grupo ya puesto. El carrito solo
 * lee `adultos/ninosMid/ninosSmall` cuando llega UN recorrido, que es el caso.
 * El RZR va sin gente: ahí se eligen ruta y vehículo, no personas.
 */
export function hrefReservarTour(t: Pick<TarifaTour, "slug" | "precioUnidad">, g: Grupo, locale: Locale): string {
  const base = `/reservar/carrito?agregar=${encodeURIComponent(t.slug)}`;
  if (t.precioUnidad === "vehiculo") return localePath(base, locale);
  return localePath(`${base}&adultos=${g.adultos}&ninosMid=${g.ninosMid}&ninosSmall=${g.ninosSmall}`, locale);
}

/** "$1,450", con el agrupado que usa todo el sitio. */
export const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Quita los guiones largos de un texto del catálogo antes de pintarlo.
 *
 * El catálogo los usa como separador ("Una muda de cambio — vas a salir con
 * barro") y algunos helpers los ponen en los rangos ("8–10h", "Wed–Mon"). En
 * esta página no va ninguno (regla de Manolo para todo lo nuevo), pero un
 * rango tiene que seguir leyéndose como rango: con espacios alrededor es un
 * separador y pasa a coma; pegado a las palabras es un rango y pasa a guion.
 */
export function sinRaya(s: string): string {
  return s.replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");
}
