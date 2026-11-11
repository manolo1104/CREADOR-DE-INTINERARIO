/**
 * Una corrección de HECHO en un artículo del blog (11 nov 2026).
 *
 * `to` admite marcas que se resuelven con el catálogo al pintar la página, para
 * que un precio corregido no vuelva a envejecer escrito a mano:
 *   {{tour:<slug>}}        → «$1,550 MXN» (precio del recorrido en `TOURS_DB`)
 *   {{entrada:<destino>}}  → la entrada del destino (`precio_entrada` de `DESTINOS_DB`)
 *   {{vallesXilitla}}      → «hora y media» (`MINUTOS_VALLES_XILITLA`, el número de Manolo)
 *   {{auto:<ciudad>}}      → horas en auto a Xilitla desde esa ciudad (`tiemposDeViaje.ts`)
 *   {{autoValles:<ciudad>}}→ horas en auto a Ciudad Valles desde esa ciudad
 */
export interface Errata {
  /** Dónde: el cuerpo (por omisión) o el texto alternativo de la portada. */
  campo?: "content" | "coverImageAlt" | "excerpt";
  /** Texto LITERAL tal como sale después de `aplicaBlogSeo` (sin las marcas de la plantilla). */
  from: string;
  to: string;
  /** Por qué estaba mal y de dónde sale el dato correcto (fuente en el código o confirmado por Manolo). */
  porque: string;
}

/** Slug del artículo (sin año) → sus correcciones. */
export type ErratasPorArticulo = Record<string, Errata[]>;
