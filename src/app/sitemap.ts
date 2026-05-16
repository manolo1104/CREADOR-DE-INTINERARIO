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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPosts = await getBlogPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,              lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/tours`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/destinos`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/blog`,          lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/nosotros`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/info-practica`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/recomendar`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/experiencias`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const tourPages: MetadataRoute.Sitemap = TOURS_DB.map((t) => ({
    url: `${BASE}/tours/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
    images: t.imagen_hero ? [absImg(t.imagen_hero)] : undefined,
  }));

  const destinoPages: MetadataRoute.Sitemap = DESTINOS_DB.map((d) => ({
    url: `${BASE}/destinos/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
    images: d.imagen_hero ? [absImg(d.imagen_hero)] : undefined,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
    images: p.coverImageUrl ? [absImg(p.coverImageUrl)] : undefined,
  }));

  return [...staticPages, ...tourPages, ...destinoPages, ...blogPages];
}
