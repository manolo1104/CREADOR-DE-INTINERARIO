"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { urlBlog } from "@/lib/blogDestinoMap";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  tags: string[];
  readingTime: number;
  publishedAt: Date;
  focusKeyword: string;
};

// ── Categorías (se infieren de las etiquetas y el título) ────────────────────
const CATEGORIES = [
  { label: "Todos",          value: "all" },
  { label: "Destinos",       value: "destinos" },
  { label: "Tours y rutas",  value: "tours" },
  { label: "Cultura y arte", value: "cultura" },
  { label: "Gastronomía",    value: "gastronomia" },
  { label: "Presupuesto",    value: "presupuesto" },
  { label: "Familia",        value: "familia" },
];

function inferCategory(tags: string[], title: string): string {
  const text = (tags.join(" ") + " " + title).toLowerCase();
  if (/gastronomía|zacahuil|comida|restaurante|platillo|bocoles/.test(text)) return "gastronomia";
  if (/familia|niños|ninos|kids/.test(text))                                  return "familia";
  if (/presupuesto|precio|costo|económico|barato/.test(text))                 return "presupuesto";
  if (/cultura|arte|edward james|historia|tradicion|leyenda/.test(text))      return "cultura";
  if (/tour|ruta|itinerario|días|excursion/.test(text))                       return "tours";
  if (/cascada|sótano|pozas|puente|rio|laguna|destino/.test(text))            return "destinos";
  return "destinos";
}

// Contenido sobre el hotel o el restaurante propios: se marca como tal.
function isPromocional(tags: string[], title: string): boolean {
  const text = (tags.join(" ") + " " + title).toLowerCase();
  return /paraíso encantado|papan huasteco|reseña.*hotel|nuestros huéspedes|opiniones.*hotel/.test(text);
}

const fechaCorta = (d: Date) =>
  new Date(d).toLocaleDateString("es-MX", { month: "short", year: "numeric", timeZone: "America/Mexico_City" }).replace(".", "");

const fechaLarga = (d: Date) =>
  new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

const TITULO_TARJETA =
  "font-cormorant font-normal leading-[1.15] text-verde-profundo transition-colors group-hover:text-verde-selva";
const META = "font-dm text-[13px] text-negro/45";
const SELLO_PROPIO =
  "inline-flex items-center rounded-full border border-dorado/40 bg-white/90 px-2.5 py-0.5 font-dm text-[11px] font-medium text-dorado";

interface Props {
  posts: Post[];
  featuredPost: Post | null;
  initialQuery?: string;
}

/**
 * Buscador, categorías y la rejilla con TODOS los artículos publicados.
 * Mismo lenguaje que el inicio: fondo crema, sin cajas, botones y chips en
 * píldora, títulos en Cormorant. El destacado es el más reciente y solo se
 * enseña cuando no hay filtro ni búsqueda.
 */
export function BlogFilters({ posts, featuredPost, initialQuery = "" }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery]                   = useState(initialQuery);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesCat = activeCategory === "all" || inferCategory(p.tags, p.title) === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [posts, activeCategory, query]);

  // Cuántos artículos caen en cada categoría, para que el chip lo diga.
  const conteo = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    for (const p of posts) {
      const k = inferCategory(p.tags, p.title);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [posts]);

  const showFeatured = !query && activeCategory === "all" && featuredPost;
  const gridPosts = showFeatured ? filtered.slice(1) : filtered;
  const hayFiltro = Boolean(query) || activeCategory !== "all";
  const etiquetaCategoria = CATEGORIES.find((c) => c.value === activeCategory)?.label;

  return (
    <div>
      {/* Buscador + categorías */}
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative flex w-full items-center gap-2.5 rounded-full border border-negro/15 bg-white px-5 py-3 transition-colors focus-within:border-verde-selva lg:max-w-sm">
          <Search className="h-4 w-4 shrink-0 text-negro/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un artículo"
            aria-label="Buscar un artículo"
            className="min-w-0 flex-1 bg-transparent font-dm text-[15px] text-negro outline-none placeholder:text-negro/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar la búsqueda"
              className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-negro/50 transition-colors hover:bg-negro/5 hover:text-negro"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const activo = activeCategory === cat.value;
              const n = conteo[cat.value] ?? 0;
              if (cat.value !== "all" && n === 0) return null;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setActiveCategory(cat.value)}
                  aria-pressed={activo}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-dm text-[13px] font-medium transition-colors duration-200 ${
                    activo
                      ? "border-verde-profundo bg-verde-profundo text-crema"
                      : "border-negro/15 bg-white text-negro/70 hover:border-verde-selva hover:text-verde-profundo"
                  }`}
                >
                  {cat.label}
                  <span className={`tabular-nums ${activo ? "text-crema/60" : "text-negro/40"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cuántos salieron */}
      {hayFiltro && (
        <p className="mb-6 font-dm text-sm text-negro/55" aria-live="polite">
          {filtered.length === 0
            ? "Ningún artículo coincide."
            : `${filtered.length} ${filtered.length === 1 ? "artículo" : "artículos"}`}
          {activeCategory !== "all" && etiquetaCategoria ? ` en ${etiquetaCategoria}` : ""}
          {query ? ` para «${query.trim()}»` : ""}
        </p>
      )}

      {/* Destacado: el más reciente, solo sin filtros */}
      {showFeatured && (
        <Link href={urlBlog(featuredPost!.slug)} prefetch={false} className="group mb-14 block">
          <article className="grid gap-6 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-12">
            {featuredPost!.coverImageUrl && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-negro/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredPost!.coverImageUrl}
                  alt={featuredPost!.coverImageAlt || featuredPost!.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.03]"
                />
              </div>
            )}
            <div>
              <p className="mb-3 flex flex-wrap items-center gap-2 font-dm text-[13px] text-dorado">
                <span>Lo más nuevo</span>
                {isPromocional(featuredPost!.tags, featuredPost!.title) && <span className={SELLO_PROPIO}>Contenido propio</span>}
              </p>
              <h2
                className="font-cormorant font-light leading-[1.08] text-verde-profundo transition-colors group-hover:text-verde-selva"
                style={{ fontSize: "clamp(30px,3.4vw,44px)" }}
              >
                {featuredPost!.title}
              </h2>
              <p className="mt-4 line-clamp-3 max-w-[55ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
                {featuredPost!.excerpt}
              </p>
              <p className={`mt-4 ${META}`}>
                {featuredPost!.readingTime} min de lectura · {fechaLarga(featuredPost!.publishedAt)}
              </p>
              <span className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde-selva px-5 font-dm text-sm font-medium text-verde-selva transition-colors group-hover:bg-verde-selva/10">
                Leer la guía
              </span>
            </div>
          </article>
        </Link>
      )}

      {/* Todos los demás */}
      {gridPosts.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-14 text-center">
          <p className="font-cormorant text-2xl text-verde-profundo">No hay artículos con esa búsqueda.</p>
          <p className="mt-2 font-dm text-sm text-negro/55">Prueba con otra palabra o quita el filtro.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory("all"); }}
            className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-verde-selva px-5 font-dm text-sm font-medium text-verde-selva transition-colors hover:bg-verde-selva/10"
          >
            Ver todos los artículos
          </button>
        </div>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post) => {
            const isPromo = isPromocional(post.tags, post.title);
            return (
              <li key={post.slug}>
                <Link href={urlBlog(post.slug)} prefetch={false} className="group flex h-full flex-col">
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-negro/5">
                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.03]"
                      />
                    )}
                    {isPromo && <span className={`absolute left-3 top-3 ${SELLO_PROPIO}`}>Contenido propio</span>}
                  </div>
                  <h3 className={`${TITULO_TARJETA} text-[22px] sm:text-2xl`}>{post.title}</h3>
                  <p className="mt-2 line-clamp-2 font-dm text-[14px] leading-relaxed text-negro/55">{post.excerpt}</p>
                  <p className={`mt-3 ${META}`}>
                    {post.readingTime} min de lectura · {fechaCorta(post.publishedAt)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
