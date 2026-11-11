/**
 * El blog en inglés (10 nov 2026).
 *
 * Por qué vive en ARCHIVOS del repo y no en la base:
 *  · `npm start` corre `prisma db push --accept-data-loss` en cada arranque:
 *    cualquier columna o tabla nueva se aplica sola a producción. Los archivos
 *    no tocan la base.
 *  · La traducción se revisa en `git diff`, como las correcciones de
 *    `blogSeo.ts`, y el robot (`blog-agent/`) la escribe y la commitea junto con
 *    `topics.json`.
 *  · Se traduce el texto YA CORREGIDO que sirve producción (después de
 *    `aplicaBlogSeo` y de los arreglos de la plantilla), no el crudo de la base:
 *    si no, volverían los precios viejos y los enlaces a `/itinerarios`.
 *
 * Archivos:
 *  · `src/content/blog-en/posts/<slug-en-español>.json` — un artículo (`PostEn`).
 *  · `src/content/blog-en/pares.json` — `{ "<slug ES>": "<slug EN>" }`. Lo lee
 *    también el menú (componente de cliente) para el cambio de idioma, por eso
 *    va aparte y es pequeño.
 *
 * Solo servidor: usa `fs`. El cliente importa únicamente `pares.json`.
 */

import fs from "node:fs";
import path from "node:path";
import PARES_JSON from "@/content/blog-en/pares.json";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";

export interface PostEn {
  /** Slug del artículo en español (normalizado, sin año). Es el nombre del archivo. */
  slugEs: string;
  /** Slug en inglés: `/en/blog/<slug>`. */
  slug: string;
  title: string;
  /** ≤ 60 caracteres. */
  metaTitle: string;
  /** 120–160 caracteres. */
  metaDescription: string;
  excerpt: string;
  /** HTML traducido, con los enlaces internos ya pasados a /en donde hay versión en inglés. */
  contentHtml: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  /** Sección para la miga de pan y `articleSection` («Waterfalls», «Planning»…). */
  seccion: string;
  keywords: string[];
  /** Slugs de tours que se ofrecen en la tarjeta (los mismos que el artículo en español). */
  tours: string[];
  /** Las fechas del artículo en español: la traducción no es un artículo nuevo. */
  datePublished: string;
  dateModified: string;
  readingTime: number;
  /** Cuándo se tradujo y qué `dateModified` tenía el español entonces (para saber si quedó vieja). */
  traducidoEl: string;
  fuenteModificada: string;
}

const PARES: Record<string, string> = PARES_JSON as Record<string, string>;
const DIR_POSTS = path.join(process.cwd(), "src", "content", "blog-en", "posts");

/** Slug EN del artículo español, si ya está traducido. */
export function slugEnDe(slugEs: string): string | undefined {
  return PARES[normalizaSlugBlog(slugEs)];
}

/** Slug ES de un artículo en inglés. */
export function slugEsDe(slugEn: string): string | undefined {
  return Object.keys(PARES).find((es) => PARES[es] === slugEn);
}

export const urlBlogEn = (slugEn: string) => `/en/blog/${slugEn}`;

function leer(slugEs: string): PostEn | null {
  try {
    const crudo = fs.readFileSync(path.join(DIR_POSTS, `${slugEs}.json`), "utf-8");
    return JSON.parse(crudo) as PostEn;
  } catch {
    return null;
  }
}

/** El artículo en inglés por su slug EN. */
export function getPostEn(slugEn: string): PostEn | null {
  const es = slugEsDe(slugEn);
  return es ? leer(es) : null;
}

/** Todos los artículos en inglés, el más nuevo primero. Solo los que están en `pares.json`. */
export function listPostsEn(): PostEn[] {
  return Object.keys(PARES)
    .map(leer)
    .filter((p): p is PostEn => p !== null)
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

/** ¿La traducción quedó vieja? (el español cambió después de traducirlo). */
export function traduccionVieja(p: PostEn, dateModifiedEs: Date): boolean {
  return dateModifiedEs.getTime() - new Date(p.fuenteModificada).getTime() > 24 * 60 * 60 * 1000;
}
