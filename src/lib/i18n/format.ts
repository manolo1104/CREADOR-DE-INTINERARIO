import type { Locale } from "./config";

// Formato de moneda y fecha por locale. Se mantiene SIEMPRE la etiqueta "MXN"
// (decisión: no convertir a USD). Solo cambia el agrupado de miles según el idioma.

const NUM_LOCALE: Record<Locale, string> = { es: "es-MX", en: "en-US" };

/** "$1,600 MXN" con separadores de miles según el idioma. */
export function fmtMoney(n: number, locale: Locale): string {
  return `$${n.toLocaleString(NUM_LOCALE[locale])} MXN`;
}

/** Solo el número con separadores (sin símbolo ni etiqueta). */
export function fmtNumber(n: number, locale: Locale): string {
  return n.toLocaleString(NUM_LOCALE[locale]);
}

/** Fecha legible localizada. */
export function fmtDate(
  d: Date | string,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(NUM_LOCALE[locale], opts);
}
