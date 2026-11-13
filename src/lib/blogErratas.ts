/**
 * Fe de erratas del blog (11 nov 2026).
 *
 * Al traducir los 44 artículos al inglés salieron ~50 errores de HECHO en el
 * español: carreteras equivocadas, el tramo Valles–Xilitla dado como 57, 88,
 * 110 o 130 km, el mismo tour con dos precios, fotos de otro lugar y frases
 * rotas de plantilla («¿Quieres vivir equipaje con guía experto?»). Manolo:
 * «corrige los errores del blog».
 *
 * Por qué un archivo aparte y no `blogSeo.ts`: aquí solo van correcciones de
 * hecho, cada una con su `porque` y su fuente; `blogSeo.ts` es SEO (títulos,
 * resúmenes, dueños por búsqueda). Se aplican AL FINAL de `aplicaBlogSeo`, así
 * que `from` es el texto tal como queda después de los overrides.
 *
 * La base no se toca (ver `blogSeo.ts`). La versión en inglés de cada artículo
 * se corrige en su archivo (`src/content/blog-en/posts`).
 */
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { MINUTOS_VALLES_XILITLA, horasEnPalabras, enAuto, distancia } from "@/lib/tiemposDeViaje";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";
import type { Errata, ErratasPorArticulo } from "@/lib/erratas/tipos";
import { ERRATAS_GRUPO_A } from "@/lib/erratas/grupo-a";
import { ERRATAS_GRUPO_B } from "@/lib/erratas/grupo-b";
import { ERRATAS_GRUPO_C } from "@/lib/erratas/grupo-c";

const TODAS: ErratasPorArticulo = { ...ERRATAS_GRUPO_A, ...ERRATAS_GRUPO_B, ...ERRATAS_GRUPO_C };

/** Resuelve las marcas {{…}} con el catálogo. Una marca que no existe revienta en desarrollo. */
export function resuelveMarcas(texto: string): string {
  return texto.replace(/\{\{(\w+)(?::([a-z0-9-]+))?\}\}/g, (todo, tipo: string, arg?: string) => {
    let v: string | undefined;
    if (tipo === "tour") {
      const t = TOURS_DB.find((x) => x.slug === arg);
      v = t ? `$${t.precio.toLocaleString("es-MX")} MXN` : undefined;
    } else if (tipo === "entrada") {
      v = DESTINOS_DB.find((d) => d.slug === arg)?.precio_entrada;
    } else if (tipo === "vallesXilitla") {
      v = horasEnPalabras(MINUTOS_VALLES_XILITLA);
    } else if (tipo === "auto" && arg) {
      v = enAuto(arg, "xilitla") || undefined;
    } else if (tipo === "autoValles" && arg) {
      v = enAuto(arg, "valles") || undefined;
    } else if (tipo === "km" && arg) {
      v = distancia(arg, "xilitla") || undefined;
    }
    if (v === undefined) {
      if (process.env.NODE_ENV !== "production") throw new Error(`[blogErratas] marca desconocida: ${todo}`);
      console.error(`[blogErratas] marca desconocida: ${todo}`);
      return todo;
    }
    return v;
  });
}

export function erratasDe(slug: string): Errata[] {
  return TODAS[normalizaSlugBlog(slug)] ?? [];
}

/** Aplica la fe de erratas a un post (sobre una copia). Avisa en desarrollo si un `from` ya no aparece. */
export function aplicaErratas<T extends { slug: string; content?: string | null; coverImageAlt?: string | null; excerpt?: string | null }>(post: T): T {
  const lista = erratasDe(post.slug);
  if (!lista.length) return post;
  const next: T = { ...post };
  for (const e of lista) {
    const campo = e.campo ?? "content";
    const actual = next[campo];
    if (typeof actual !== "string") continue;
    if (!actual.includes(e.from)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[blogErratas] "${normalizaSlugBlog(post.slug)}" (${campo}): no aparece → ${e.from.slice(0, 90)}`);
      }
      continue;
    }
    (next as Record<string, unknown>)[campo] = actual.split(e.from).join(resuelveMarcas(e.to));
  }
  return next;
}
