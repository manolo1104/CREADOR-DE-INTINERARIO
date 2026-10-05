/**
 * Fecha del último cambio VISIBLE del catálogo: precios, unidades, horarios,
 * recogida, textos o fotos de una ficha, un tour o un paquete nuevo.
 *
 * Es el `<lastmod>` que el sitemap pone a las páginas que pintan el catálogo
 * (fichas de tour, destinos, paquetes y sus landings, en español e inglés), y
 * la que usa `src/scripts/indexnow.ts` para saber qué URLs avisar a Bing.
 *
 * 🔴 CUÁNDO SUBIRLA: en el MISMO commit que cambie `TOURS_DB` (tours.ts),
 * `PAQUETES_DB` (paquetes.ts), `DESTINOS_DB` (destinos.ts), sus traducciones
 * de `src/lib/i18n/` o las plantillas de ficha (`src/app/tours/[slug]`,
 * `destinos/[slug]`, `paquetes/[slug]` y sus espejos `/en`). Formato AAAA-MM-DD,
 * el día del despliegue. Si se olvida, el sitemap sigue diciendo la fecha vieja
 * y Google tarda más en ver el cambio; el script de IndexNow se niega a enviar
 * cuando ve commits del catálogo posteriores a esta fecha.
 *
 * Por qué una constante y no `new Date()`: el sitemap es `force-dynamic`, así
 * que `new Date()` diría "cambió hace un segundo" en CADA petición y en cada
 * build. Google aprende que ese lastmod no significa nada y lo ignora en todo
 * el archivo, incluidos los blogs, cuya fecha sí es real. Una fecha que solo se
 * mueve cuando el catálogo cambia de verdad es la única que le sirve.
 */
export const CATALOGO_ACTUALIZADO = "2026-10-04";

/**
 * Archivos cuyo último commit no puede ser posterior a `CATALOGO_ACTUALIZADO`.
 * Los revisa `src/scripts/indexnow.ts` (con `git log`) antes de enviar: es la
 * guarda que avisa sola cuando alguien tocó el catálogo y no subió la fecha.
 */
export const ARCHIVOS_DEL_CATALOGO = [
  "src/lib/tours.ts",
  "src/lib/paquetes.ts",
  "src/lib/destinos.ts",
  "src/lib/i18n/tours.en.ts",
  "src/lib/i18n/paquetes.en.ts",
  "src/lib/i18n/destinos.en.ts",
  "src/app/tours/[slug]/page.tsx",
  "src/app/destinos/[slug]/page.tsx",
  "src/app/paquetes/[slug]/page.tsx",
] as const;
