"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

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

// ── Category mapping (from tags) ──────────────────────────────────────────────
const CATEGORIES = [
  { label: "Todos",             value: "all" },
  { label: "Destinos",          value: "destinos" },
  { label: "Tours & Rutas",     value: "tours" },
  { label: "Cultura & Arte",    value: "cultura" },
  { label: "Gastronomía",       value: "gastronomia" },
  { label: "Presupuesto",       value: "presupuesto" },
  { label: "Familia",           value: "familia" },
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

// Detect promotional content (own hotel/restaurant)
function isPromocional(tags: string[], title: string): boolean {
  const text = (tags.join(" ") + " " + title).toLowerCase();
  return /paraíso encantado|papan huasteco|reseña.*hotel|nuestros huéspedes|opiniones.*hotel/.test(text);
}

interface Props {
  posts: Post[];
  featuredPost: Post | null;
}

export function BlogFilters({ posts, featuredPost }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery]                   = useState("");

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesCat = activeCategory === "all" || inferCategory(p.tags, p.title) === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [posts, activeCategory, query]);

  // Detect duplicate cover images
  const imageCounts: Record<string, number> = {};
  for (const p of posts) {
    if (p.coverImageUrl) imageCounts[p.coverImageUrl] = (imageCounts[p.coverImageUrl] ?? 0) + 1;
  }

  const showFeatured = !query && activeCategory === "all" && featuredPost;
  const gridPosts = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div>
      {/* Search + Category filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crema/30 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artículos…"
            className="w-full bg-negro/40 border border-white/15 focus:border-lima/40 text-crema placeholder:text-crema/30 font-dm text-sm pl-9 pr-9 py-2.5 outline-none transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-crema/40 hover:text-crema transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`text-[9px] tracking-[2px] uppercase font-dm px-3 py-2 border transition-all ${
                activeCategory === cat.value
                  ? "border-lima bg-lima/10 text-lima"
                  : "border-white/15 text-crema/50 hover:border-crema/30 hover:text-crema"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(query || activeCategory !== "all") && (
        <p className="text-[10px] tracking-[2px] uppercase font-dm text-crema/30 mb-6">
          {filtered.length} artículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "all" && <span className="ml-2 text-lima/50">· {CATEGORIES.find((c) => c.value === activeCategory)?.label}</span>}
        </p>
      )}

      {/* Featured post (only when no filters active) */}
      {showFeatured && (
        <Link href={`/blog/${featuredPost!.slug}`} className="group block mb-12">
          <article className="grid md:grid-cols-2 gap-0 bg-verde-profundo/30 border border-white/8 overflow-hidden hover:border-lima/30 transition-colors">
            {featuredPost!.coverImageUrl && (
              <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                <img src={featuredPost!.coverImageUrl} alt={featuredPost!.coverImageAlt || featuredPost!.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            )}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm">✦ Artículo Destacado</span>
                {isPromocional(featuredPost!.tags, featuredPost!.title) && (
                  <span className="text-[8px] tracking-[1px] uppercase font-dm text-dorado/70 border border-dorado/25 px-2 py-0.5">✦ Contenido propio</span>
                )}
              </div>
              <h2 className="font-cormorant text-crema text-3xl mb-4 leading-tight group-hover:text-lima transition-colors">{featuredPost!.title}</h2>
              <p className="text-crema/50 font-dm font-light text-sm leading-relaxed mb-6">{featuredPost!.excerpt}</p>
              <div className="flex items-center gap-4 text-[10px] tracking-[2px] uppercase font-dm text-crema/30">
                <span>{featuredPost!.readingTime} min lectura</span>
                <span>·</span>
                <span>{new Date(featuredPost!.publishedAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </article>
        </Link>
      )}

      {/* Grid */}
      {gridPosts.length === 0 ? (
        <p className="text-center text-crema/40 font-dm py-16">No hay artículos en esta categoría todavía.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridPosts.map((post) => {
            const isDuplicate = imageCounts[post.coverImageUrl ?? ""] > 1;
            const isPromo     = isPromocional(post.tags, post.title);
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-verde-profundo/30 border border-white/8 overflow-hidden hover:border-lima/30 transition-colors h-full flex flex-col relative">
                  {isPromo && (
                    <div className="absolute top-2 right-2 z-10 text-[8px] tracking-[1px] uppercase font-dm text-dorado/80 border border-dorado/30 bg-negro/60 backdrop-blur-sm px-2 py-0.5">
                      ✦ Contenido propio
                    </div>
                  )}
                  {post.coverImageUrl && (
                    <div className="aspect-video overflow-hidden relative">
                      <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      {isDuplicate && (
                        <div className="absolute bottom-1.5 left-1.5 text-[8px] font-dm text-white/60 bg-negro/70 px-1.5 py-0.5 rounded">
                          Sin imagen única
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    {post.tags[0] && (
                      <span className="text-[9px] tracking-[3px] uppercase text-lima/60 font-dm mb-3">{post.tags[0]}</span>
                    )}
                    <h3 className="font-cormorant text-crema text-xl mb-3 leading-snug group-hover:text-lima transition-colors flex-1">{post.title}</h3>
                    <p className="text-crema/40 font-dm font-light text-xs leading-relaxed mb-4">{post.excerpt.slice(0, 120)}…</p>
                    <div className="flex items-center gap-3 text-[9px] tracking-[2px] uppercase font-dm text-crema/45 mt-auto">
                      <span>{post.readingTime} min</span>
                      <span>·</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
