"use client";

import { usePathname } from "next/navigation";
import { localePath, type Locale } from "./config";

/**
 * El locale visto desde un componente CLIENTE.
 *
 * En servidor el locale llega por el header `x-locale` que pone el middleware,
 * pero un componente cliente no ve headers: lo deduce de la ruta, que es la
 * misma fuente (español en la raíz, inglés bajo `/en`). Media docena de
 * componentes repetían esta línea a mano; tenerla en un solo sitio evita que
 * uno se quede sin el prefijo y mande al cliente inglés al flujo en español.
 */
export function useLocale(): { locale: Locale; en: boolean; lp: (path: string) => string } {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const locale: Locale = en ? "en" : "es";
  return { locale, en, lp: (path: string) => localePath(path, locale) };
}
