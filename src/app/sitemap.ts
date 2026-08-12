import type { MetadataRoute } from "next";
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { prisma } from "@/lib/prisma";
import { PAQUETES_DB } from "@/lib/paquetes";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";
import { CIUDADES_ORIGEN } from "@/lib/ciudadesOrigen";

// El sitemap consulta los artículos del blog (BD) en cada request. Si fuera
// estático, el build lo "congela" sin posts (justo lo que pasaba: 0 artículos
// en el sitemap de producción). Dinámico garantiza que SIEMPRE incluya todos
// los artículos publicados.
export const dynamic = "force-dynamic";

const BASE = "https://www.huasteca-potosina.com";

// OJO: el campo `images` de MetadataRoute.Sitemap NO lo emite Next 14 (se ignora
// en silencio; verificado en producción: 0 etiquetas <image:image>). Las imágenes
// se publican en un sitemap aparte: /sitemap-imagenes.xml (ver esa ruta y robots.ts).
function absImg(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BASE}${path}`;
}

async function getBlogPosts(): Promise<{ slug: string; updatedAt: Date; coverImageUrl: string | null; title: string }[]> {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, coverImageUrl: true, title: true },
    });
  } catch {
    return [];
  }
}

// Rutas bilingües (es en raíz, en bajo /en): genera 2 entradas (es + en) con
// hreflang recíprocos (es-MX, en, x-default) en cada una.
function bilingual(
  path: string,
  opts: { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number; lastModified?: Date; images?: string[] },
): MetadataRoute.Sitemap {
  const esUrl = path === "/" ? `${BASE}/` : `${BASE}${path}`;
  const enUrl = path === "/" ? `${BASE}/en` : `${BASE}/en${path}`;
  const languages = { "es-MX": esUrl, en: enUrl, "x-default": esUrl };
  const common = {
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    images: opts.images,
  };
  return [
    { url: esUrl, ...common, alternates: { languages } },
    { url: enUrl, ...common, alternates: { languages } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getBlogPosts();

  // Páginas bilingües (tienen versión /en)
  const bilingualStatic: MetadataRoute.Sitemap = [
    ...bilingual("/",                 { changeFrequency: "weekly",  priority: 1.0 }),
    ...bilingual("/tours",            { changeFrequency: "weekly",  priority: 0.9 }),
    ...bilingual("/viaje-septiembre", { changeFrequency: "weekly",  priority: 0.9 }),
    ...bilingual("/destinos",         { changeFrequency: "monthly", priority: 0.8 }),
  ];

  // Páginas solo en español (aún sin versión /en).
  // Regla: toda página pública e indexable debe estar aquí. Se excluyen a propósito
  // las transaccionales (/reservar-*, /guia/descarga, /confirmacion-tour), el panel
  // /admin y /planear (bloqueada en robots.ts).
  const esOnlyStatic: MetadataRoute.Sitemap = [
    { url: `${BASE}/blog`,                  lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/preguntas-frecuentes`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/creditos`,              lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/nosotros`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/info-practica`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/recomendar`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/experiencias`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/paquetes`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/precios`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guia`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/sobre-la-huasteca-potosina`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/sustentabilidad-y-conservacion`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/que-hacer-en-la-huasteca-potosina`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tours-en-ciudad-valles`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // /reservar es el catálogo de conversión, no un paso del checkout: es
    // indexable (tiene canonical y metadata propia) y se había quedado fuera
    // por la regla que excluye "/reservar-*".
    { url: `${BASE}/reservar`,                lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/contacto`,                lastModified: new Date(), changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/politica-de-cancelacion`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/terminos`,                lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/aviso-de-privacidad`,     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/xilitla-o-ciudad-valles`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ...CIUDADES_ORIGEN.map((c) => ({
      url: `${BASE}/desde/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  const tourPages: MetadataRoute.Sitemap = TOURS_DB.flatMap((t) =>
    bilingual(`/tours/${t.slug}`, {
      changeFrequency: "monthly",
      priority: 0.9,
      images: t.imagen_hero ? [absImg(t.imagen_hero)] : undefined,
    }),
  );

  const destinoPages: MetadataRoute.Sitemap = DESTINOS_DB.flatMap((d) =>
    bilingual(`/destinos/${d.slug}`, {
      changeFrequency: "monthly",
      priority: 0.7,
      images: d.imagen_hero ? [absImg(d.imagen_hero)] : undefined,
    }),
  );

  // 17 slugs de la base todavía arrastran el sufijo de año y `next.config.mjs`
  // los redirige (308) a la versión sin año. Publicarlos tal cual mandaba a
  // Google a rastrear URLs que redirigen; se listan ya normalizados.
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE}/blog/${normalizaSlugBlog(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
    images: p.coverImageUrl ? [absImg(p.coverImageUrl)] : undefined,
  }));

  const paquetePages: MetadataRoute.Sitemap = PAQUETES_DB.map((p) => ({
    url: `${BASE}/paquetes/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
    images: p.imagen ? [absImg(p.imagen)] : undefined,
  }));

  return [...bilingualStatic, ...esOnlyStatic, ...tourPages, ...destinoPages, ...blogPages, ...paquetePages];
}
