import type { MetadataRoute } from "next";
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { prisma } from "@/lib/prisma";
import { PAQUETES_DB } from "@/lib/paquetes";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";
import { CIUDADES_ORIGEN } from "@/lib/ciudadesOrigen";
import { CIUDADES_ORIGEN_EN } from "@/lib/ciudadesOrigenEn";

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

// SOBRE `lastModified`: solo lo llevan las URLs con una fecha REAL en la base
// (los artículos del blog, con su `updatedAt`). Las rutas estáticas lo tenían
// puesto a `new Date()`, y como el sitemap es `force-dynamic` eso significaba
// que 150 de las 190 URLs decían "modificada hace un segundo" en CADA petición.
// Un sitemap que afirma que todo cambió siempre no informa de nada: Google
// deja de creerle y acaba ignorando el campo en todo el archivo, incluidos los
// artículos donde la fecha sí era buena. La alternativa —una constante escrita
// a mano por sección— envejece mal en cuanto nadie la actualiza, así que se
// omite: `lastmod` es opcional y "sin dato" es mejor que "dato falso".
//
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
    // Sin fecha real no se escribe `lastModified`: ver la nota de arriba.
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
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
    // El catálogo del motor. Es de conversión, no un paso del checkout: tiene
    // canonical y metadata propios en los dos idiomas. El carrito y la
    // confirmación NO entran — son transaccionales.
    ...bilingual("/reservar",         { changeFrequency: "weekly",  priority: 0.9 }),
    ...bilingual("/paquetes",         { changeFrequency: "monthly", priority: 0.6 }),
    ...bilingual("/nosotros",         { changeFrequency: "monthly", priority: 0.6 }),
    ...bilingual("/info-practica",    { changeFrequency: "monthly", priority: 0.7 }),
    // Traducidas el 14 ago 2026: hasta entonces vivían en `esOnlyStatic`.
    ...bilingual("/preguntas-frecuentes", { changeFrequency: "monthly", priority: 0.7 }),
    ...bilingual("/experiencias",         { changeFrequency: "monthly", priority: 0.6 }),
    ...bilingual("/contacto",             { changeFrequency: "yearly",  priority: 0.6 }),
  ];

  // Páginas SOLO en inglés, sin equivalente español (ni previsto).
  // La sala de prensa se dirige a periodistas estadounidenses: un editor que
  // busca "huasteca potosina press" tiene que encontrarla, así que va indexada.
  const enOnlyStatic: MetadataRoute.Sitemap = [
    { url: `${BASE}/en/press`, changeFrequency: "monthly", priority: 0.5 },
    // Landings de origen para EE.UU. No tienen espejo español a propósito: un
    // lector mexicano no busca "cómo llegar desde Houston".
    ...CIUDADES_ORIGEN_EN.map((c) => ({
      url: `${BASE}/en/from/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  // Páginas solo en español (aún sin versión /en).
  // Regla: toda página pública e indexable debe estar aquí. Se excluyen a propósito
  // las transaccionales (/reservar-*, /guia/descarga, /confirmacion-tour), el panel
  // /admin y /planear (ya no bloqueada en robots.ts, pero marcada `noindex` en
  // su propia página mientras el generador de itinerarios siga devolviendo 503).
  const esOnlyStatic: MetadataRoute.Sitemap = [
    { url: `${BASE}/blog`,                  changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/creditos`,              changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/recomendar`,    changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/precios`,       changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guia`,          changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/sobre-la-huasteca-potosina`,        changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/sustentabilidad-y-conservacion`,    changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/que-hacer-en-la-huasteca-potosina`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tours-en-ciudad-valles`,            changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/grupos`,                            changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tours-en-xilitla`,                  changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/politica-de-cancelacion`, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/terminos`,                changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/aviso-de-privacidad`,     changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/xilitla-o-ciudad-valles`,           changeFrequency: "monthly", priority: 0.8 },
    ...CIUDADES_ORIGEN.map((c) => ({
      url: `${BASE}/desde/${c.slug}`,
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

  const paquetePages: MetadataRoute.Sitemap = PAQUETES_DB.flatMap((p) =>
    bilingual(`/paquetes/${p.slug}`, {
      changeFrequency: "monthly",
      priority: 0.7,
      images: p.imagen ? [absImg(p.imagen)] : undefined,
    }),
  );

  return [...bilingualStatic, ...enOnlyStatic, ...esOnlyStatic, ...tourPages, ...destinoPages, ...blogPages, ...paquetePages];
}
