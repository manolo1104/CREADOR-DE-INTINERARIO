import type { MetadataRoute } from "next";
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { prisma } from "@/lib/prisma";

const BASE = "https://www.huasteca-potosina.com";

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
    ...bilingual("/",         { changeFrequency: "weekly",  priority: 1.0 }),
    ...bilingual("/tours",    { changeFrequency: "weekly",  priority: 0.9 }),
    ...bilingual("/destinos", { changeFrequency: "monthly", priority: 0.8 }),
  ];

  // Páginas solo en español (aún sin versión /en)
  const esOnlyStatic: MetadataRoute.Sitemap = [
    { url: `${BASE}/blog`,          lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/nosotros`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/info-practica`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/recomendar`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/experiencias`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/paquetes`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
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

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
    images: p.coverImageUrl ? [absImg(p.coverImageUrl)] : undefined,
  }));

  return [...bilingualStatic, ...esOnlyStatic, ...tourPages, ...destinoPages, ...blogPages];
}
