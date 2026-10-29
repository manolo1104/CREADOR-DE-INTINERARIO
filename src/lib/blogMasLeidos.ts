import { prisma } from "@/lib/prisma";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";
import { aplicaBlogSeo } from "@/lib/blogSeo";
import { applyBlogImageEditsPreview } from "@/lib/blogImageEdits";

/**
 * Los artículos más leídos del blog, para el inicio.
 *
 * 🔴 Por qué existe (29 oct 2026, Manolo: «en /inicio agrega una sección de
 * blogs que se muestren los más visitados»)
 *
 * El sitio NO guardaba visitas por artículo: `BlogPost` no tiene contador y
 * `TrackEvent` solo registraba el embudo de los tours. Por eso hay dos fuentes,
 * y la regla de cuál manda está escrita aquí para que nadie la adivine:
 *
 *  1. **Las visitas reales**, desde que esto se subió: la página del artículo
 *     dispara `BLOG_VIEW` (ver `BlogViewTracker`) y aquí se cuentan las de los
 *     últimos `DIAS_VENTANA` días por `path`. Mandan en cuanto hay volumen
 *     (`MINIMO_VISTAS` en la ventana); antes, una sola visita de prueba
 *     pondría cualquier artículo encima del que trae mil clics al mes.
 *  2. **Search Console**, mientras tanto: `MAS_LEIDOS_SEARCH_CONSOLE` es el
 *     orden por clics del export del 10 sep 2026 (16 semanas, 66 URLs del blog).
 *     El primero trae 1,106 clics; el décimo, 38. Es la mejor foto que había de
 *     qué lee la gente, y es la que se enseña hasta que las visitas la releven.
 *
 * ⚠️ Los slugs van SIN sufijo de año (`normalizaSlugBlog`): 18 de los 40
 * artículos lo arrastran en la base y la URL pública no lo lleva.
 */

/** Orden por clics de Search Console (export del 10 sep 2026). */
export const MAS_LEIDOS_SEARCH_CONSOLE = [
  "mejor-epoca-para-visitar-la-huasteca-potosina",
  "cascada-de-tamul-la-guia-definitiva-para-visitarla",
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca",
  "cascadas-de-micos-guia-completa-para-tu-visita",
  "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta",
  "como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp",
  "itinerario-huasteca-potosina-3-dias-3-dias-en-la-huasteca-po",
  "mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par",
  "las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece",
  "cuanto-cuesta-huasteca-potosina",
  "sotano-de-las-golondrinas-la-cueva-mas-profunda-de-mexico",
  "equipaje-que-llevar-en-tu-maleta-para-la-selva-potosina-checklist",
];

/** Cuántos días hacia atrás se cuentan las visitas. */
export const DIAS_VENTANA = 30;
/** Con menos visitas que esto en la ventana, manda Search Console. */
export const MINIMO_VISTAS = 50;

export interface ArticuloLeido {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  readingTime: number;
  tags: string[];
  publishedAt: Date;
  /** Visitas en la ventana; 0 mientras manda Search Console. */
  vistas: number;
}

/** De `/blog/lo-que-sea-2026?x#y` al slug limpio. */
function slugDePath(path: string): string {
  const sinRuta = path.replace(/^\/blog\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  return normalizaSlugBlog(sinRuta);
}

/**
 * Cuenta las vistas por slug en la ventana. Si la base no contesta, devuelve
 * el mapa vacío y el inicio sale con el orden de Search Console: nunca rompe.
 */
async function vistasPorSlug(): Promise<Map<string, number>> {
  const porSlug = new Map<string, number>();
  try {
    const desde = new Date(Date.now() - DIAS_VENTANA * 86_400_000);
    const filas = await prisma.trackEvent.groupBy({
      by: ["path"],
      where: { event: "BLOG_VIEW", createdAt: { gte: desde }, path: { startsWith: "/blog/" } },
      _count: { _all: true },
    });
    for (const f of filas) {
      if (!f.path) continue;
      const s = slugDePath(f.path);
      porSlug.set(s, (porSlug.get(s) ?? 0) + f._count._all);
    }
  } catch {
    /* sin base: manda Search Console */
  }
  return porSlug;
}

/**
 * Los `n` artículos más leídos, publicados y con las mismas correcciones que
 * aplica la página del artículo (fotos y SEO), para que el inicio no enseñe
 * un resumen que la ficha ya reescribió.
 */
export async function articulosMasLeidos(n = 5): Promise<ArticuloLeido[]> {
  let posts: Omit<ArticuloLeido, "vistas">[] = [];
  try {
    const filas = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, readingTime: true, tags: true, publishedAt: true,
      },
    });
    posts = filas.map((p) => aplicaBlogSeo(applyBlogImageEditsPreview(p)));
  } catch {
    return [];
  }
  if (!posts.length) return [];

  const vistas = await vistasPorSlug();
  const totalVistas = Array.from(vistas.values()).reduce((a, b) => a + b, 0);
  const mandanLasVistas = totalVistas >= MINIMO_VISTAS;

  // Puesto en Search Console: 0 = el más leído; los que no están van al final.
  const puestoSC = (slug: string) => {
    const i = MAS_LEIDOS_SEARCH_CONSOLE.indexOf(normalizaSlugBlog(slug));
    return i < 0 ? MAS_LEIDOS_SEARCH_CONSOLE.length : i;
  };
  const vistasDe = (slug: string) => vistas.get(normalizaSlugBlog(slug)) ?? 0;

  return posts
    .map((p) => ({ ...p, vistas: vistasDe(p.slug) }))
    .sort((a, b) => {
      if (mandanLasVistas && a.vistas !== b.vistas) return b.vistas - a.vistas;
      const sc = puestoSC(a.slug) - puestoSC(b.slug);
      if (sc !== 0) return sc;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    })
    .slice(0, n);
}
