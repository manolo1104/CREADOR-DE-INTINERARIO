// Configuración base de internacionalización (Fase 1: es + en).
// El español vive en la raíz (sin prefijo) y el inglés en /en.

export type Locale = "es" | "en";

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

export const SITE = "https://www.huasteca-potosina.com";

/** Normaliza cualquier string a un Locale válido (fallback al default). */
export function asLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "es";
}

/**
 * Prefija una ruta interna con el locale.
 * - es → ruta tal cual ("/tours")
 * - en → "/en/tours"
 * Acepta rutas absolutas internas que empiezan con "/".
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === "es") return path;
  if (path === "/") return "/en";
  return `/en${path.startsWith("/") ? "" : "/"}${path}`;
}

/** URL absoluta canónica para una ruta + locale (sin barra final salvo home). */
export function localeUrl(path: string, locale: Locale): string {
  const p = localePath(path, locale);
  return `${SITE}${p === "/" ? "" : p}`;
}

/**
 * Construye el objeto `alternates` (canonical + hreflang) de Next.js metadata
 * para una ruta dada, recíproco y con x-default apuntando a español.
 * `path` es la ruta SIN prefijo de locale (ej. "/tours/expedicion-tamul").
 */
export function buildAlternates(path: string, locale: Locale) {
  return {
    canonical: localeUrl(path, locale),
    languages: {
      "es-MX": localeUrl(path, "es"),
      en: localeUrl(path, "en"),
      "x-default": localeUrl(path, "es"),
    },
  };
}
