import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { PAQUETES_DB } from "@/lib/paquetes";
import { prisma } from "@/lib/prisma";

/**
 * Sitemap de imágenes (extensión image:image de sitemaps.org).
 *
 * Existe porque Next 14 IGNORA el campo `images` de `MetadataRoute.Sitemap`
 * (verificado en producción: el sitemap.xml salía sin una sola etiqueta de
 * imagen). Sin esto, Google no descubre por sitemap las ~200 fotos de tours,
 * destinos y paquetes, que son el activo visual del sitio.
 *
 * Se declara en robots.ts junto al sitemap principal.
 */

export const dynamic = "force-dynamic";

const BASE = "https://www.huasteca-potosina.com";

function abs(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BASE}${path}`;
}

// XML no admite &, <, > ni comillas sueltas dentro de los valores.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface Entrada {
  loc: string;
  imagenes: { url: string; titulo: string }[];
}

async function blogEntradas(): Promise<Entrada[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, title: true, coverImageUrl: true },
    });
    return posts
      .filter((p) => !!p.coverImageUrl)
      .map((p) => ({
        loc: `${BASE}/blog/${p.slug}`,
        imagenes: [{ url: abs(p.coverImageUrl!), titulo: p.title }],
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  // La galería de tours ya trae `alt` descriptivo escrito a mano: se aprovecha
  // como título de la imagen en vez de inventar uno genérico.
  const tours: Entrada[] = TOURS_DB.map((t) => {
    const vistos = new Set<string>();
    const imagenes: { url: string; titulo: string }[] = [];
    if (t.imagen_hero) {
      vistos.add(t.imagen_hero);
      imagenes.push({ url: abs(t.imagen_hero), titulo: t.nombre });
    }
    for (const g of t.gallery ?? []) {
      if (!g.src || vistos.has(g.src)) continue;
      vistos.add(g.src);
      imagenes.push({ url: abs(g.src), titulo: g.alt || t.nombre });
    }
    return { loc: `${BASE}/tours/${t.slug}`, imagenes };
  });

  const destinos: Entrada[] = DESTINOS_DB.map((d) => ({
    loc: `${BASE}/destinos/${d.slug}`,
    imagenes: [d.imagen_hero, ...(d.imagen_galeria ?? [])]
      .filter(Boolean)
      .map((src, i) => ({
        url: abs(src),
        titulo: i === 0 ? `${d.nombre}, ${d.zona} — Huasteca Potosina` : `${d.nombre} — foto ${i + 1}`,
      })),
  }));

  const paquetes: Entrada[] = PAQUETES_DB.map((p) => ({
    loc: `${BASE}/paquetes/${p.slug}`,
    imagenes: p.imagen ? [{ url: abs(p.imagen), titulo: p.nombre }] : [],
  }));

  const entradas = [...tours, ...destinos, ...paquetes, ...(await blogEntradas())].filter(
    (e) => e.imagenes.length > 0,
  );

  const urls = entradas
    .map(
      (e) => `  <url>
    <loc>${esc(e.loc)}</loc>
${e.imagenes
  .map(
    (img) => `    <image:image>
      <image:loc>${esc(img.url)}</image:loc>
      <image:title>${esc(img.titulo)}</image:title>
    </image:image>`,
  )
  .join("\n")}
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
