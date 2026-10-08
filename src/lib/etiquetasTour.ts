import { TOURS_DB } from "./tours";
import type { Locale } from "./i18n/config";

/**
 * Las etiquetas con las que se filtra el catálogo en el inicio.
 *
 * 🔴 Por qué existe este archivo (7 oct 2026)
 *
 * El inicio tenía seis píldoras de categoría —Cascadas, Aventura, Cultura,
 * Ecoturismo, Fotografía, Bienestar— que apuntaban a
 * `/experiencias?tipo=cascadas`. Pero `/experiencias` **no lee ningún
 * `searchParams`**: las seis llevaban a la misma página sin filtrar. Eran
 * adorno, y encima su taxonomía no existe en el catálogo.
 *
 * Lo que sí existe en `tours.ts` es `categoria` (`TOUR_CATEGORIAS`), que son
 * tres familias: ecoturismo (9), aventura (4) y extremo (2). Como filtro solo,
 * sirve de poco: una píldora con nueve de quince no filtra nada. Estas
 * etiquetas son la capa que falta — lo que la gente de verdad escribe en el
 * buscador: «cascadas», «sótano», «rafting», «Las Pozas».
 *
 * ⚠️ Van aquí y NO en `tours.ts` a propósito: ese archivo tenía hunks sin
 * commit de dos sesiones a la vez el día que esto se escribió, y meterle un
 * campo nuevo al tipo habría enredado los dos diffs. Si algún día las
 * etiquetas se vuelven parte del contrato del catálogo, su sitio es `Tour`.
 *
 * ⚠️ La tabla se valida contra `TOURS_DB` en `etiquetasDeTour()`: un slug mal
 * escrito aquí devuelve lista vacía en silencio, así que hay una prueba de
 * cordura al final del archivo que avisa en desarrollo.
 */
export type EtiquetaTour =
  | "populares"
  | "cascadas"
  | "cuevas"
  | "rio"
  | "arte"
  | "fotografia"
  | "medio-dia";

/** Las etiquetas en el orden en que se pintan las píldoras. */
export const ETIQUETAS: { id: EtiquetaTour; label: string; labelEn: string }[] = [
  // Primera a propósito: es la respuesta a «no sé cuál elegir», que es con lo
  // que llega casi todo el mundo. Los cuatro los eligió Manolo (8 oct 2026).
  { id: "populares",  label: "Los más populares",  labelEn: "Most popular" },
  { id: "cascadas",   label: "Cascadas y pozas",   labelEn: "Waterfalls & pools" },
  { id: "cuevas",     label: "Cuevas y sótanos",   labelEn: "Caves & sinkholes" },
  { id: "rio",        label: "Río y rápidos",      labelEn: "River & rapids" },
  { id: "arte",       label: "Arte y Xilitla",     labelEn: "Art & Xilitla" },
  { id: "fotografia", label: "Fotografía",         labelEn: "Photography" },
  { id: "medio-dia",  label: "Medio día",          labelEn: "Half day" },
];

/**
 * Qué etiquetas lleva cada recorrido.
 *
 * Criterios, para que nadie tenga que adivinarlos al añadir el recorrido 16:
 *  · `cascadas`   — el recorrido se mete al agua de una cascada o una poza.
 *  · `cuevas`     — entra a una gruta o asoma a un sótano.
 *  · `rio`        — navega el río (canoa, kayak, rafting) o baja rápidos.
 *  · `arte`       — Las Pozas de Edward James o el pueblo de Xilitla.
 *  · `fotografia` — el recorrido se vende por la foto, no por la actividad.
 *  · `medio-dia`  — `duracion_hrs` de 5 o menos (se calcula, no se escribe).
 *  · `populares`  — 🔴 NO es un criterio, es una DECISIÓN de Manolo: los cuatro
 *    que quiere enseñar primero a quien no sabe cuál elegir (8 oct 2026). No se
 *    deduce de ventas ni de visitas; si algún día sale de los datos, que lo diga
 *    aquí quien lo cambie.
 */
const TABLA: Record<string, Exclude<EtiquetaTour, "medio-dia">[]> = {
  "rzr-xilitla":                    ["arte", "fotografia"],
  "rappel-tamul":                   ["cascadas", "rio"],
  "rafting-rio-tampaon":            ["rio"],
  "expedicion-tamul":               ["populares", "cascadas", "rio"],
  "ruta-surrealista-edward-james":  ["populares", "arte", "cascadas", "fotografia"],
  "eden-en-el-jardin":              ["arte", "fotografia"],
  "cascadas-del-meco":              ["populares", "cascadas"],
  "paraiso-escalonado-minas-micos": ["populares", "cascadas", "rio"],
  "ruta-acuatica-puente-de-dios":   ["cascadas", "cuevas"],
  "buceo-media-luna":               ["cuevas"],
  "travesia-del-cafe":              ["cascadas"],
  "gruta-de-xilo":                  ["cuevas", "arte"],
  "amanecer-de-nubes":              ["fotografia"],
  "olla-de-la-luz":                 ["cascadas", "cuevas"],
  "huasteca-instagrameable":        ["fotografia", "cascadas", "arte"],
};

/** Hasta cuántas horas cuenta como «medio día». */
const HORAS_MEDIO_DIA = 5;

/**
 * Las etiquetas de un recorrido. `medio-dia` se deduce de la duración real del
 * catálogo para que no se quede vieja si alguien cambia `duracion_hrs`.
 */
export function etiquetasDeTour(t: { slug: string; duracion_hrs: number }): EtiquetaTour[] {
  const base = TABLA[t.slug] ?? [];
  return t.duracion_hrs <= HORAS_MEDIO_DIA ? [...base, "medio-dia"] : [...base];
}

/** «Cascadas y pozas» / «Waterfalls & pools». */
export function etiquetaLabel(id: EtiquetaTour, locale: Locale): string {
  const e = ETIQUETAS.find((x) => x.id === id);
  if (!e) return id;
  return locale === "en" ? e.labelEn : e.label;
}

// ── Prueba de cordura, solo en desarrollo ────────────────────────────────────
// Un slug mal escrito en TABLA no rompe nada: simplemente ese recorrido sale
// sin etiquetas y su píldora deja de encontrarlo. Como eso es invisible, se
// avisa al arrancar en desarrollo.
if (process.env.NODE_ENV !== "production") {
  const slugsReales = new Set(TOURS_DB.map((t) => t.slug));
  const sobran = Object.keys(TABLA).filter((s) => !slugsReales.has(s));
  const faltan = Array.from(slugsReales).filter((s) => !(s in TABLA));
  if (sobran.length) console.warn(`[etiquetasTour] slugs que ya no existen: ${sobran.join(", ")}`);
  if (faltan.length) console.warn(`[etiquetasTour] recorridos sin etiquetas: ${faltan.join(", ")}`);
}
