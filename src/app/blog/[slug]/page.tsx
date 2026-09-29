import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { BlogNewsletterInline } from "@/components/BlogNewsletterInline";
import { GuiaDelLugar } from "@/components/blog/GuiaDelLugar";
import { TOURS_DB, etiquetaUnidad, tourDurTexto } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { applyBlogImageEditsPreview } from "@/lib/blogImageEdits";
import { urlBlog, ofertasDeBlog, destinoDeBlog, normalizaSlugBlog } from "@/lib/blogDestinoMap";
import { aplicaBlogSeo, seoDeBlog, fechaActualizado } from "@/lib/blogSeo";
import { horaEnLista } from "@/lib/recogidaTexto";
import { resenasTexto } from "@/lib/resenas";
import { ANTICIPO_PCT } from "@/lib/carrito";

export const dynamic = "force-dynamic";

const SITE = "https://www.huasteca-potosina.com";
const RAILWAY_REGEX = /https:\/\/creador-de-intinerario-production\.up\.railway\.app/gi;

/**
 * `/itinerarios` NUNCA existió: da 404. El contenido guardado en la base la
 * enlaza más de 110 veces desde 37 de los 40 artículos, y encima promete un
 * planificador con IA que está apagado (`/planear` carga, pero su generador,
 * `/api/generate`, devuelve 503). Como el HTML
 * vive en la base y no en el repo, se corrige al vuelo al renderizar: el enlace
 * va a lo que sí se puede comprar y el ancla deja de prometer un itinerario.
 *
 * 🔴 `/planear` entra en la misma regla (28 sep 2026). Se reescribían solo los
 * enlaces a `/itinerarios`; los que iban a `/planear` seguían vendiendo
 * "nuestra herramienta de itinerarios IA" y "Crear mi itinerario gratis" hacia
 * una página que no puede generar nada y que está en `noindex`.
 */
const ANCLA_ITINERARIOS = /<a\s+href="[^"]*\/(?:itinerarios|planear)\/?(?:\?[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/gi;

/**
 * Enlaces del cuerpo a `/blog/<slug>-2026`. El agente los escribió con el slug
 * tal como vive en la base, y `next.config.mjs` los redirige (308) a la versión
 * sin año: cada uno era un salto de más para el lector y para Google. Se
 * reescriben a la URL canónica con `urlBlog()`, conservando el dominio si lo
 * traían y el `#ancla` si la había.
 */
const ENLACE_BLOG_CON_ANIO = /href="((?:https?:\/\/(?:www\.)?huasteca-potosina\.com)?)\/blog\/([a-z0-9-]+-20\d{2})\/?(#[^"]*)?"/gi;

/**
 * Etiquetas que llevan casi todos los artículos y no dicen de qué trata
 * ninguno. "Huasteca Potosina" la llevan los 44 artículos: con ella,
 * "relacionados" eran siempre los tres más nuevos y la miga de pan decía
 * "Huasteca Potosina" en todos. Se comparan normalizadas (`claveTag`).
 */
const TAGS_GENERICOS = new Set(
  [
    "Huasteca Potosina", "San Luis Potosí", "Turismo San Luis Potosí", "Viaje San Luis Potosí",
    "Guías de viaje", "Tours", "Turismo", "Viaje 2026", "Naturaleza", "Turismo de naturaleza",
    "Turismo Naturaleza", "Consejos de Viaje", "Tips de Viaje", "Info Práctica",
  ].map(claveTag),
);

function claveTag(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const tagsEspecificos = (tags: string[]) => tags.filter((t) => !TAGS_GENERICOS.has(claveTag(t)));

/** Dominio dado de baja: el hotel vive en paraisoencantado.com. */
const DOMINIO_MUERTO = /https?:\/\/(?:www\.)?paraisoencantadoxilitla\.lat/gi;

function mayusculaInicial(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 🔴 El CTA final sale en los 44 artículos y prometía "cancelas gratis hasta
 * 48 h antes" sin excepción. Los recorridos con `cancelacion` propia no la
 * cumplen (El Edén en el Jardín no tiene reembolso), así que se nombran desde
 * el catálogo: si mañana se suma otro, la frase lo recoge sola.
 */
const SALVO_POLITICA_PROPIA = (() => {
  const nombres = TOURS_DB.filter((t) => t.cancelacion).map((t) =>
    t.articulo ? `${t.articulo} ${t.nombreCorto}` : t.nombreCorto,
  );
  if (!nombres.length) return "";
  const enLista =
    nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return `, salvo en ${enLista}, que ${nombres.length === 1 ? "tiene" : "tienen"} su propia política`;
})();

function reescribeEnlacesItinerarios(html: string): string {
  return html.replace(ANCLA_ITINERARIOS, (_todo, attrs: string, interior: string, pos: number, completo: string) => {
    const texto = interior.replace(/<[^>]+>/g, "").trim();
    const plano = texto.toLowerCase();
    // Un enlace traía `title="Planea tu itinerario en Xilitla"`: el texto visible
    // quedaba corregido y el tooltip seguía prometiendo el planificador.
    const attrsLimpios = attrs.replace(/\s+title="[^"]*itinerario[^"]*"/gi, "");

    // Botón de caja CTA ("Crear mi itinerario gratis →", "Ver itinerarios →"):
    // el que más se ve y el que más miente. Va al catálogo de paquetes, que es
    // lo que de verdad resuelve "quiero que me armen el viaje".
    if (/crear mi itinerario|ver itinerarios/.test(plano)) {
      const flecha = interior.includes("→") ? " →" : "";
      return `<a href="/paquetes"${attrsLimpios}>Paquetes todo incluido con hotel en Xilitla${flecha}</a>`;
    }

    // Enlaces dentro del texto. Se respeta la forma verbal de la frase que los
    // rodea para no dejar un "puedes reserva…": infinitivo si venía en
    // infinitivo, imperativo si venía en imperativo, sustantivo si no hay verbo.
    let ancla: string;
    if (/^planear\b/.test(plano))      ancla = "reservar tu tour guiado en la Huasteca Potosina";
    else if (/^planea\b/.test(plano))  ancla = "reserva tu tour guiado en la Huasteca Potosina";
    // "Consulta nuestra sección de <a>…</a>": con el ancla posesiva salía
    // "nuestra sección de nuestro catálogo". Si la frase ya trae el posesivo,
    // se usa la variante sin él.
    else if (/nuestr[oa]s?\b[^.<>]{0,40}$/i.test(completo.slice(Math.max(0, pos - 60), pos)))
                                       ancla = "tours guiados por la Huasteca Potosina";
    else                               ancla = "nuestro catálogo de tours guiados";
    if (/^[A-ZÁÉÍÓÚÑ]/.test(texto)) ancla = mayusculaInicial(ancla);
    return `<a href="/tours"${attrsLimpios}>${ancla}</a>`;
  });
}

/**
 * Los dos párrafos de las cajas CTA que venden el planificador apagado. Se
 * aplican ANTES de reescribir los enlaces, porque en 3 artículos la frase lleva
 * el `<a>` dentro (de ahí el `[\s\S]{0,160}?`) y hay que sustituirla entera.
 * Si la base cambia el texto, el `replace` no encuentra nada y no rompe nada.
 */
const PROMESAS_FALSAS: [RegExp, string][] = [
  [
    /Nuestro planificador con IA arma tu recorrido en minutos, con tiempos reales y distancias\./gi,
    "Nosotros armamos el recorrido: hotel en Xilitla, tours y traslados en un solo paquete, con fechas y precio en firme.",
  ],
  [
    /O planea tu propio recorrido con[\s\S]{0,200}?creador de itinerarios[^.]{0,40}?\./gi,
    "O deja que te armemos el viaje completo de varios días.",
  ],
  // 🔴 Estos NO los ve `reescribeEnlacesItinerarios`: su `href` ya era /tours,
  // así que el enlace funciona y lo que miente es el TEXTO. Son cinco en el
  // artículo nº1 (1.106 clics) y prometen un creador de itinerarios que no
  // existe: quien hace clic esperando un planificador aterriza en un catálogo.
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*Crear mi itinerario gratis\s*→?\s*<\/a>/gi,
    '<a$1>Ver los tours guiados de la Huasteca Potosina →</a>',
  ],
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*nuestro creador de itinerarios(?: gratuito)?\s*<\/a>/gi,
    '<a$1>nuestro catálogo de tours guiados</a>',
  ],
  [
    /<a([^>]*href="\/tours"[^>]*)>\s*el creador de itinerarios(?: gratuito)?\s*<\/a>/gi,
    '<a$1>el catálogo de tours guiados</a>',
  ],
  // Variante propia del artículo nº1 (1.106 clics), el que más tráfico recibe.
  [
    /Nuestro creador de itinerarios te arma una ruta personalizada según la temporada que elijas y los días que tengas disponibles\./gi,
    "Te armamos la ruta según la temporada que elijas y los días que tengas: hotel, tours y traslados en un solo paquete.",
  ],
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSeoTitle(raw: string): string {
  const suffix = " | Huasteca Potosina";
  if (raw.length + suffix.length <= 60) return raw + suffix;
  if (raw.length <= 60) return raw;
  return raw.slice(0, 57) + "…";
}

/** Palabras que no pueden cerrar una meta cortada: "…actualizada con" no se lee. */
const CONECTORES = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "e", "u", "con", "en", "a", "al", "para", "por", "que", "un", "una", "su", "sus", "sin", "como"]);

/**
 * La meta description en ≤155 caracteres, cortada en límite de palabra.
 *
 * 🔴 Era un `slice(0, 155)` a pelo: "…actualizada por Manolo Co" y "…Actualizada
 * con datos" salían tal cual en Google. Prefiere acabar en un punto si eso
 * conserva al menos el 60 % del texto; si no, corta en el último espacio, quita
 * la puntuación y los conectores colgando y NO añade "…".
 */
function recortaMeta(texto: string, max = 155): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const trozo = t.slice(0, max + 1);
  const finFrase = Math.max(trozo.lastIndexOf(". "), trozo.lastIndexOf("? "), trozo.lastIndexOf("! "));
  if (finFrase >= max * 0.6) return trozo.slice(0, finFrase + 1);
  const palabras = trozo.slice(0, trozo.lastIndexOf(" ")).split(" ");
  while (palabras.length > 1 && CONECTORES.has(palabras[palabras.length - 1].toLowerCase().replace(/[^a-záéíóúüñ]/g, ""))) {
    palabras.pop();
  }
  return palabras.join(" ").replace(/[\s,;:—–-]+$/, "");
}

/** Las entidades que el editor del agente deja en los títulos de sección. */
function decodificaEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** "¿Cuánto cuesta visitar Tamul?" → "cuanto-cuesta-visitar-tamul". */
function slugAncla(texto: string): string {
  const s = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || "seccion";
}

/**
 * Pone `id` a cada `<h2>` (respeta el que ya traiga) y devuelve el índice.
 *
 * Se salta el `<h2>` que repite el título: muchos artículos abren con un `<h1>`
 * igual al título, que la plantilla degrada a `<h2>`, y el índice empezaba con
 * el nombre del propio artículo.
 */
function anclaSecciones(html: string, titulo: string): { html: string; indice: { id: string; texto: string }[] } {
  const usados = new Set<string>();
  const indice: { id: string; texto: string }[] = [];
  const claveTitulo = slugAncla(titulo);
  const conIds = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (todo, attrs: string, interior: string) => {
    const texto = decodificaEntidades(interior.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!texto) return todo;
    const propio = /\bid="([^"]+)"/i.exec(attrs)?.[1];
    let id = propio ?? slugAncla(texto);
    if (!propio) {
      const base = id;
      for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
    }
    usados.add(id);
    if (slugAncla(texto) !== claveTitulo) indice.push({ id, texto });
    return propio ? todo : `<h2${attrs} id="${id}">${interior}</h2>`;
  });
  return { html: conIds, indice };
}

/** Fecha larga en horario de México: el servidor corre en UTC. */
function fechaLarga(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
}

/**
 * La fecha de última modificación que se declara: la de la fila o la de la
 * corrección hecha por código (`blogSeo.ts`), la que sea más reciente.
 */
function fechaModificado(updatedAt: Date, slug: string): Date {
  const override = fechaActualizado(seoDeBlog(slug));
  return override && override > updatedAt ? override : updatedAt;
}

/**
 * La sección del artículo, para la miga de pan, `articleSection` y
 * `og:section`: el destino del que trata (si está en el mapa) o su primera
 * etiqueta con contenido. Antes era `tags[0]`, que era "Huasteca Potosina" en
 * los 44.
 */
function seccionDe(post: { slug: string; tags: string[] }): string {
  const d = destinoDeBlog(post.slug);
  const nombre = d && !d.comparativa ? DESTINOS_DB.find((x) => x.slug === d.destino)?.nombre : undefined;
  return nombre ?? tagsEspecificos(post.tags)[0] ?? "Guías de viaje";
}

/**
 * El `@type` que declara el JSON-LD guardado en la fila, o null si no hay, no
 * parsea o no declara ninguno. Sirve para decidir si ese bloque escrito a mano
 * aporta algo que la plantilla no sepa producir; si solo repite Article o
 * BlogPosting, gana la plantilla, que es más completa.
 */
function tipoDeSchema(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  try {
    const d = JSON.parse(crudo);
    const t = Array.isArray(d) ? d[0]?.["@type"] : d?.["@type"];
    return typeof t === "string" ? t : Array.isArray(t) ? (t[0] ?? null) : null;
  } catch {
    return null;
  }
}

function extractFAQs(html: string): { question: string; answer: string }[] {
  const re = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  const results: { question: string; answer: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const question = m[1].replace(/<[^>]+>/g, "").trim();
    const answer   = m[2].replace(/<[^>]+>/g, "").trim();
    if (question && answer) results.push({ question, answer });
  }
  return results;
}

/** Split HTML at approximately the midpoint on a clean tag boundary */
function splitAtMidpoint(html: string): [string, string] {
  const mid = Math.floor(html.length / 2);
  for (const marker of ["</p>", "</h2>", "</h3>", "</ul>", "</ol>"]) {
    const idx = html.indexOf(marker, mid);
    if (idx !== -1) return [html.slice(0, idx + marker.length), html.slice(idx + marker.length)];
  }
  return [html, ""];
}

/** Infer the most relevant tour from tags/keyword */
function inferTour(tags: string[], keyword: string) {
  const text = (tags.join(" ") + " " + keyword).toLowerCase();
  const porSlug = (slug: string) => TOURS_DB.find((t) => t.slug === slug);
  if (/rafting|r[aá]pidos/.test(text))                        return TOURS_DB.find((t) => t.id === "tour-rafting-tampaon");
  if (/rzr|off.?road|todoterreno|nanacatli/.test(text))       return TOURS_DB.find((t) => t.id === "tour-rzr-xilitla");
  if (/tamul|tampaon|tampa[oó]n|s[oó]tano.*huah/.test(text)) return TOURS_DB.find((t) => t.id === "tour-tamul");
  // Los recorridos de Xilitla con nombre propio van ANTES de la regla genérica
  // /xilitla/: si no, un artículo del bosque de niebla o del café salía con la
  // Ruta Surrealista. "Hoya" y "Grutas" son como la gente los escribe.
  if (/gruta|\bxilo\b/.test(text))                            return porSlug("gruta-de-xilo");
  if (/amanecer|mar de nubes|pil[oó]n|trinidad/.test(text))   return porSlug("amanecer-de-nubes");
  if (/olla de la luz|hoya de la luz/.test(text))             return porSlug("olla-de-la-luz");
  if (/caf[eé]/.test(text))                                   return porSlug("travesia-del-cafe");
  // Xantolo se vive en los pueblos: la Ruta Surrealista es la que recorre la
  // sierra de Xilitla. Caía en Tamul por el "default" de abajo.
  if (/xantolo/.test(text))                                   return porSlug("ruta-surrealista-edward-james");
  if (/edward|pozas|xilitla|surrealista/.test(text))          return TOURS_DB.find((t) => t.id === "tour-edward-james");
  if (/meco|turquesa/.test(text))                             return TOURS_DB.find((t) => t.id === "tour-meco");
  if (/puente de dios|tamasopo/.test(text))                   return TOURS_DB.find((t) => t.id === "tour-puente-dios");
  if (/minas.*viejas|micos/.test(text))                       return TOURS_DB.find((t) => t.id === "tour-minas-micos");
  return TOURS_DB.find((t) => t.id === "tour-tamul") ?? TOURS_DB[0];
}

function isPromocional(tags: string[], title: string) {
  const text = (tags.join(" ") + " " + title).toLowerCase();
  return /para[íi]so encantado|papan huasteco|nuestros hu[eé]spedes|rese[ñn]a.*hotel|opini.*hotel/.test(text);
}

// ── Data fetching ─────────────────────────────────────────────────────────────

/**
 * Las dos capas de corrección, en este orden: la vista previa de imágenes
 * (solo en desarrollo) y las correcciones de `blogSeo.ts` (también en
 * producción), que buscan el texto ya con las imágenes cambiadas.
 */
const corrige = <T extends Parameters<typeof aplicaBlogSeo>[0] & { coverImageUrl?: string | null }>(p: T): T =>
  aplicaBlogSeo(applyBlogImageEditsPreview(p));

async function getPost(slug: string) {
  try {
    // 1. Exact match (clean slug, after migration)
    const exact = await prisma.blogPost.findUnique({ where: { slug, published: true } });
    if (exact) return corrige(exact);

    // 2. Fallback: try slug + year suffix (slugs generated before migration)
    for (const year of ["2026", "2025", "2024", "2027"]) {
      const withYear = await prisma.blogPost.findUnique({
        where: { slug: `${slug}-${year}`, published: true },
      });
      if (withYear) return corrige(withYear);
    }

    return null;
  } catch {
    return null;
  }
}

const SELECT_RELACIONADO = {
  slug: true, title: true, excerpt: true, coverImageUrl: true, readingTime: true, tags: true, publishedAt: true,
} as const;

/** Las formas en que puede vivir un slug en la base: sin año y con él. */
const conAnios = (s: string) => [s, ...["2026", "2025", "2024", "2027"].map((y) => `${s}-${y}`)];

/**
 * Tres artículos hermanos.
 *
 * 🔴 Antes eran `tags: { hasSome: tags }` ordenados por fecha: como TODOS
 * llevan "Huasteca Potosina", salían siempre los tres más nuevos, trataran de
 * lo que trataran. Ahora, por orden de preferencia:
 *   1. los que `blogSeo.ts` fija a mano para ese artículo;
 *   2. los que el propio artículo enlaza (`internalLinks`), si son 2 o más;
 *   3. hasta 20 candidatos que compartan alguna etiqueta que SÍ diga algo,
 *      ordenados por etiquetas en común (+2 si tratan el mismo destino);
 *   4. y si no llegan a tres, se rellena con los más nuevos.
 */
async function getRelatedPosts(slug: string, tags: string[], internalLinks: string[]) {
  const propio = normalizaSlugBlog(slug);
  const distinto = (s: string) => normalizaSlugBlog(s) !== propio;
  try {
    const fijados = seoDeBlog(slug)?.relacionados ?? [];
    if (fijados.length) {
      const filas = await prisma.blogPost.findMany({
        where:  { published: true, slug: { in: fijados.flatMap(conAnios) } },
        select: SELECT_RELACIONADO,
      });
      const orden = (s: string) => fijados.indexOf(normalizaSlugBlog(s));
      const elegidos = filas.filter((r) => distinto(r.slug)).sort((a, b) => orden(a.slug) - orden(b.slug));
      if (elegidos.length >= 2) return elegidos.slice(0, 3).map(corrige);
    }

    if (internalLinks.length >= 2) {
      const curated = await prisma.blogPost.findMany({
        where:  { published: true, slug: { in: internalLinks } },
        take:   3,
        select: SELECT_RELACIONADO,
      });
      if (curated.length >= 2) return curated.map(corrige);
    }

    const utiles = tagsEspecificos(tags);
    const destinoPropio = destinoDeBlog(slug)?.destino;
    const candidatos = utiles.length
      ? await prisma.blogPost.findMany({
          where:   { published: true, slug: { not: slug }, tags: { hasSome: utiles } },
          orderBy: { publishedAt: "desc" },
          take:    20,
          select:  SELECT_RELACIONADO,
        })
      : [];
    const clavesUtiles = new Set(utiles.map(claveTag));
    const puntos = (r: { slug: string; tags: string[] }) =>
      r.tags.filter((t) => clavesUtiles.has(claveTag(t))).length +
      (destinoPropio && destinoDeBlog(r.slug)?.destino === destinoPropio ? 2 : 0);
    // `sort` es estable: a igualdad de puntos queda el más nuevo primero.
    const elegidos = candidatos.filter((r) => distinto(r.slug) && puntos(r) > 0).sort((a, b) => puntos(b) - puntos(a)).slice(0, 3);

    if (elegidos.length < 3) {
      const ya = new Set(elegidos.map((r) => r.slug));
      const nuevos = await prisma.blogPost.findMany({
        where:   { published: true, slug: { notIn: [slug, ...Array.from(ya)] } },
        orderBy: { publishedAt: "desc" },
        take:    3 - elegidos.length + 1,
        select:  SELECT_RELACIONADO,
      });
      elegidos.push(...nuevos.filter((r) => distinto(r.slug)).slice(0, 3 - elegidos.length));
    }
    return elegidos.map(corrige);
  } catch {
    return [];
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Artículo no encontrado" };

  const title       = formatSeoTitle(post.metaTitle || post.title);
  const description = recortaMeta(post.metaDescription || post.excerpt || "");
  const imageUrl    = post.coverImageUrl || "";
  const canonical   = `${SITE}${urlBlog(post.slug)}`;

  return {
    title,
    description,
    keywords: [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    openGraph: {
      title,
      description,
      // Sin estas tres, WhatsApp y Facebook armaban la vista previa sin URL
      // canónica (compartían la variante con "-2026") ni nombre del sitio.
      url:           canonical,
      siteName:      "Tours Huasteca Potosina",
      locale:        "es_MX",
      type:          "article",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime:  fechaModificado(post.updatedAt, post.slug).toISOString(),
      authors:       ["Manolo Covarrubias"],
      section:       seccionDe(post),
      tags:          [post.focusKeyword, ...post.tags].filter(Boolean),
      images:        imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: post.coverImageAlt || title }] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: imageUrl ? [imageUrl] : [] },
    // `urlBlog` y no `post.slug`: 18 slugs arrastran sufijo de año y el
    // canonical apuntaba a una URL que responde 308.
    alternates: { canonical },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const related    = await getRelatedPosts(post.slug, post.tags, post.internalLinks ?? []);
  // Los recorridos que `blogSeo.ts` fija para el artículo mandan sobre la
  // heurística por palabras: el primero va en la tarjeta y todos en el
  // recuadro "Recorridos relacionados".
  const toursFijados = (seoDeBlog(post.slug)?.tours ?? [])
    .map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is (typeof TOURS_DB)[number] => Boolean(t));
  const relevantTour = toursFijados[0] ?? inferTour(post.tags, post.focusKeyword);
  const promoPost  = isPromocional(post.tags, post.title);
  const ofertas    = ofertasDeBlog(post.slug);
  const seccion    = seccionDe(post);
  const modificado = fechaModificado(post.updatedAt, post.slug);
  // "Actualizado el…" solo si de verdad cambió después de publicarse: el
  // mismo día no aporta nada y confunde.
  const mostrarActualizado = modificado.getTime() - post.publishedAt.getTime() > 24 * 60 * 60 * 1000;
  // La URL canónica del artículo, una sola vez: canonical, JSON-LD y migas.
  const urlCanonica = `${SITE}${urlBlog(post.slug)}`;

  // ── Schema: BlogPosting (Article) ────────────────────────────────────────
  //
  // 🔴 El `schemaMarkup` guardado en la fila ya NO sustituye a este bloque: se
  // publica ADEMÁS, y solo si aporta un tipo que la plantilla no produce.
  //
  // Antes sustituía siempre, y tres artículos —los tres de intención
  // comercial— salían peor que los otros 38 (medido el 12 sep 2026 contra las
  // 41 fichas en producción): «cuánto cuesta» y «hospedaje cerca de cascadas»
  // publicaban un `Article` escrito a mano SIN imagen, keywords,
  // articleSection ni mainEntityOfPage; y «mejor época» guardaba un `FAQPage`,
  // que al ocupar esta ranura dejaba al artículo **sin ningún tipo de
  // artículo**: Google no sabía que era un artículo.
  const wordCount = Math.round((post.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).length);
  const tipoGuardado = tipoDeSchema(post.schemaMarkup);
  const blogPostingSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type":    "BlogPosting",
    headline:   post.title,
    datePublished: post.publishedAt.toISOString(),
    dateModified:  modificado.toISOString(),
    inLanguage:    "es-MX",
    wordCount,
    author: {
      "@type": "Person",
      name:    "Manolo Covarrubias",
      url:     `${SITE}/nosotros`,
      image:   `${SITE}/imagenes/guias/manolo-covarrubias.jpg`,
    },
    publisher: {
      "@type": "Organization",
      name:    "Tours Huasteca Potosina",
      url:     SITE,
      logo:    { "@type": "ImageObject", url: `${SITE}/logos/huasteca-logo.png`, width: 600, height: 600 },
    },
    description:    post.metaDescription || post.excerpt || "",
    image: post.coverImageUrl ? {
      "@type": "ImageObject",
      url:     post.coverImageUrl,
      description: post.coverImageAlt || post.title,
    } : undefined,
    url:            urlCanonica,
    keywords:       [post.focusKeyword, ...post.secondaryKeywords].join(", "),
    articleSection: seccion,
    mainEntityOfPage: { "@type": "WebPage", "@id": urlCanonica },
  });

  // ── Schema: BreadcrumbList + FAQPage ────────────────────────────────────
  const faqs = extractFAQs(post.content || "");
  const graphNodes: object[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog",   item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: seccion, item: urlCanonica },
      ],
    },
  ];
  if (faqs.length > 0) {
    graphNodes.push({
      "@type":    "FAQPage",
      mainEntity: faqs.map(({ question, answer }) => ({
        "@type":        "Question",
        name:           question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    });
  }
  const enhancedSchema = JSON.stringify({ "@context": "https://schema.org", "@graph": graphNodes });

  // El bloque guardado a mano se publica solo si aporta un tipo que esta
  // plantilla no emite ya. Así un HowTo o un VideoObject escrito para un
  // artículo concreto sigue saliendo, pero un Article, un BlogPosting o un
  // FAQPage repetido no duplica lo que la plantilla acaba de declarar.
  const yaDeclarados = new Set(
    ["Article", "BlogPosting", "BreadcrumbList", ...(faqs.length > 0 ? ["FAQPage"] : [])],
  );
  const schemaGuardadoExtra =
    post.schemaMarkup && tipoGuardado && !yaDeclarados.has(tipoGuardado) ? post.schemaMarkup : null;

  // ── Content processing ───────────────────────────────────────────────────
  const contenidoBase = (post.content || "")
    .replace(RAILWAY_REGEX, SITE)
    .replace(DOMINIO_MUERTO, "https://paraisoencantado.com")
    .replace(/href="\/planear[^"]*"/gi, `href="${SITE}/planear"`)
    .replace(ENLACE_BLOG_CON_ANIO, (_todo, dominio: string, slug: string, ancla?: string) =>
      `href="${dominio ? SITE : ""}${urlBlog(slug)}${ancla ?? ""}"`)
    .replace(/<h1[^>]*>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>");

  const contenidoCorregido = reescribeEnlacesItinerarios(
    PROMESAS_FALSAS.reduce((html, [busca, pon]) => html.replace(busca, pon), contenidoBase),
  );

  // Las anclas del índice se ponen DESPUÉS de degradar los `<h1>` (si no, el
  // `<h1>` convertido se quedaba sin `id`) y ANTES de partir el artículo en
  // dos: `splitAtMidpoint` corta por `</h2>` y el índice tiene que ver los dos
  // lados. Con menos de tres secciones un índice estorba más de lo que guía.
  const { html: fullContent, indice } = anclaSecciones(contenidoCorregido, post.title);
  const mostrarIndice = indice.length >= 3;

  const [contentFirst, contentSecond] = splitAtMidpoint(fullContent);
  const safeSchema = blogPostingSchema.replace(RAILWAY_REGEX, SITE);
  const clusterTag = tagsEspecificos(post.tags)[0] || "la Huasteca Potosina";

  // Prose styles shared by both content halves
  const proseClass = `prose prose-invert prose-lg max-w-none
    prose-headings:font-display prose-headings:text-crema prose-headings:font-normal
    prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:scroll-mt-28
    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-lima
    prose-p:text-crema/70 prose-p:font-dm prose-p:font-light prose-p:leading-relaxed
    prose-a:text-lima prose-a:no-underline hover:prose-a:underline
    prose-strong:text-crema prose-strong:font-medium
    prose-ul:text-crema/70 prose-li:font-dm prose-li:font-light
    prose-blockquote:border-lima/40 prose-blockquote:text-crema/60
    prose-img:rounded-none prose-img:w-full
    prose-figure:my-8
    prose-figcaption:text-crema/40 prose-figcaption:text-xs prose-figcaption:text-center prose-figcaption:mt-2
    [&_.cta-box]:my-10 [&_.cta-box]:p-8 [&_.cta-box]:bg-forest [&_.cta-box]:border [&_.cta-box]:border-lima/20 [&_.cta-box]:text-center
    [&_.cta-block]:my-10 [&_.cta-block]:p-8 [&_.cta-block]:border [&_.cta-block]:border-lima/20 [&_.cta-block]:text-center [&_.cta-block]:rounded-lg
    [&_.cta-tours]:bg-[#00B4D8]/10 [&_.cta-tours]:border-[#00B4D8]/30
    [&_.cta-itinerario]:bg-[#f0f9ff]/5 [&_.cta-itinerario]:border-[#2D6A4F]/30
    [&_.cta-final]:bg-verde-selva [&_.cta-final]:text-crema
    [&_.cta-headline]:font-display [&_.cta-headline]:text-xl [&_.cta-headline]:text-crema [&_.cta-headline]:mb-2 [&_.cta-headline]:font-normal
    [&_.cta-subtext]:text-crema/60 [&_.cta-subtext]:font-dm [&_.cta-subtext]:text-sm [&_.cta-subtext]:mb-4 [&_.cta-subtext]:font-light
    [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:gap-2 [&_.cta-button]:px-8 [&_.cta-button]:py-3 [&_.cta-button]:text-xs [&_.cta-button]:tracking-widest [&_.cta-button]:uppercase [&_.cta-button]:font-dm [&_.cta-button]:no-underline [&_.cta-button]:rounded [&_.cta-button]:mx-2 [&_.cta-button]:mt-2
    [&_.cta-button--primary]:bg-[#00B4D8] [&_.cta-button--primary]:text-white [&_.cta-button--primary]:hover:bg-[#0096B7]
    [&_.cta-button--secondary]:bg-transparent [&_.cta-button--secondary]:text-crema [&_.cta-button--secondary]:border [&_.cta-button--secondary]:border-crema/40 [&_.cta-button--secondary]:hover:border-lima/60
    [&_.cta-link]:text-lima [&_.cta-link]:underline
    [&_.tour-cta]:my-8 [&_.tour-cta]:p-5 [&_.tour-cta]:border [&_.tour-cta]:border-verde-selva/30 [&_.tour-cta]:bg-verde-selva/8 [&_.tour-cta]:not-prose
    [&_details]:my-3 [&_details]:border [&_details]:border-white/10 [&_details]:rounded-lg [&_details]:overflow-hidden [&_details]:bg-forest
    [&_details[open]]:border-lima/20
    [&_summary]:cursor-pointer [&_summary]:px-5 [&_summary]:py-4 [&_summary]:text-crema [&_summary]:font-dm [&_summary]:font-medium [&_summary]:text-base [&_summary]:list-none [&_summary]:select-none
    [&_summary::-webkit-details-marker]:hidden [&_summary::marker]:hidden [&_summary]:hover:bg-white/5
    [&_details>p]:px-5 [&_details>p]:pb-4 [&_details>p]:pt-0 [&_details>p]:text-crema/60 [&_details>p]:text-sm [&_details>p]:font-light [&_details>p]:leading-relaxed
    [&_details_strong]:text-crema [&_details_strong]:font-medium`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: enhancedSchema }} />
      {schemaGuardadoExtra && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaGuardadoExtra.replace(RAILWAY_REGEX, SITE) }}
        />
      )}

      <main className="min-h-screen bg-jungle pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

            {/* ── ARTÍCULO PRINCIPAL ── */}
            <article>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
                <Link href="/" className="hover:text-crema/60 transition-colors">Inicio</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-crema/60 transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-lima/60">{seccion}</span>
              </nav>

              {/* Tags + Editorial badge */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {post.tags.map(tag => (
                  <span key={tag} className="text-[9px] tracking-[2px] uppercase font-dm text-lima/70 border border-lima/20 px-3 py-1">
                    {tag}
                  </span>
                ))}
                {promoPost && (
                  <span className="text-[9px] tracking-[1.5px] uppercase font-dm text-dorado/70 border border-dorado/30 bg-dorado/5 px-3 py-1 ml-auto">
                    ✦ Contenido propio
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl md:text-5xl text-crema leading-tight mb-6">{post.title}</h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] tracking-[2px] uppercase font-dm text-crema/30 mb-10 pb-8 border-b border-white/8">
                {/* Author */}
                <Link href="/nosotros" className="flex items-center gap-2 hover:text-crema/60 transition-colors group">
                  <img
                    src="/imagenes/guias/manolo-covarrubias.jpg"
                    alt="Manolo Covarrubias"
                    className="w-7 h-7 rounded-full object-cover object-top border border-white/15 group-hover:border-lima/40 transition-colors flex-shrink-0"
                  />
                  <span className="text-crema/50 group-hover:text-crema/80 transition-colors">Manolo Covarrubias</span>
                </Link>
                <span className="text-crema/15">·</span>
                <time dateTime={post.publishedAt.toISOString()}>{fechaLarga(post.publishedAt)}</time>
                {/* Visible y no solo en el JSON-LD: Google compara el
                    `dateModified` con lo que ve el lector. */}
                {mostrarActualizado && (
                  <>
                    <span className="text-crema/15">·</span>
                    <span>
                      Actualizado el <time dateTime={modificado.toISOString()}>{fechaLarga(modificado)}</time>
                    </span>
                  </>
                )}
                <span className="text-crema/15">·</span>
                <span>{post.readingTime} min de lectura</span>
                <span className="text-crema/15 hidden sm:inline">·</span>
                <span className="text-lima/50 hidden sm:inline">{post.focusKeyword}</span>
              </div>

              {/* Hero image */}
              {post.coverImageUrl && (
                <div className="aspect-video overflow-hidden mb-10">
                  <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="w-full h-full object-cover" loading="eager" />
                </div>
              )}

              {/* Índice. Los artículos pasan de 2,000 palabras y el 88 % se
                  lee en el teléfono: sin esto, quien buscaba "cuánto cuesta"
                  tenía que bajar seis pantallas para encontrarlo. */}
              {mostrarIndice && (
                <nav aria-label="Índice del artículo" className="mb-10 border border-white/10 bg-negro/20 p-5 sm:p-6">
                  <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">En este artículo</p>
                  <ol className="space-y-2 list-decimal list-inside marker:text-crema/30">
                    {indice.map((s) => (
                      <li key={s.id} className="font-dm text-sm text-crema/65 leading-snug">
                        <a href={`#${s.id}`} className="hover:text-lima transition-colors">{s.texto}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Content first half */}
              <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentFirst }} />

              {/* El MISMO tour de la barra lateral, dentro del artículo. La
                  barra está oculta por CSS bajo 1024 px y el 88 % del tráfico
                  es móvil: ahí el único enlace a una ficha de tour no existía.
                  `lg:hidden` evita que en escritorio salga dos veces. */}
              {relevantTour && <TarjetaTour tour={relevantTour} className="lg:hidden my-10" />}

              {/* Ficha del lugar + tours que lo visitan. Va a mitad del
                  artículo: es donde el lector ya decidió que quiere ir. */}
              <GuiaDelLugar blogSlug={post.slug} />

              {/* Newsletter inline (a mitad del artículo) */}
              <BlogNewsletterInline />

              {/* Content second half */}
              {contentSecond && (
                <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentSecond }} />
              )}

              {/* Los recorridos que `blogSeo.ts` fija para este artículo, con
                  enlace a su ficha. Es la salida a la venta de quien terminó
                  de leer. */}
              {toursFijados.length > 0 && (
                <section aria-labelledby="recorridos-relacionados" className="mt-12 border border-verde-selva/25 bg-verde-selva/8 p-6">
                  <h2 id="recorridos-relacionados" className="text-[9px] tracking-[2px] uppercase font-dm text-verde-vivo mb-4">
                    Recorridos relacionados
                  </h2>
                  <ul className="flex flex-col">
                    {toursFijados.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/tours/${t.slug}`}
                          className="group flex items-baseline justify-between gap-4 border-b border-white/8 py-3 hover:border-lima/40 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block font-dm text-sm text-crema/85 group-hover:text-crema transition-colors">{t.nombreCorto}</span>
                            <span className="block font-dm font-light text-xs text-crema/40 mt-0.5">{t.tagline}</span>
                          </span>
                          <span className="font-dm text-sm text-lima whitespace-nowrap">
                            {precioTarjeta(t)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Author card — siempre visible */}
              <div className="mt-12 pt-8 border-t border-white/8">
                <div className="flex items-start gap-5">
                  <Link href="/nosotros" className="flex-shrink-0">
                    <img
                      src="/imagenes/guias/manolo-covarrubias.jpg"
                      alt="Manolo Covarrubias — guía local y fundador"
                      className="w-16 h-16 rounded-full object-cover object-top border-2 border-verde-selva/40 hover:border-lima/60 transition-colors"
                    />
                  </Link>
                  <div>
                    <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-1">Escrito por</p>
                    <Link href="/nosotros" className="font-cormorant text-crema text-xl font-light hover:text-lima transition-colors">
                      Manolo Covarrubias
                    </Link>
                    <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-crema/35 mb-2">
                      Guía local · Fundador · Certificado NOM-09
                    </p>
                    <p className="text-crema/45 font-dm font-light text-sm leading-relaxed max-w-md">
                      Nacido en la Huasteca Potosina. Lleva más de 6 años llevando viajeros a los rincones que ningún autobús turístico alcanza.
                      {/* La cifra sale de `resenas.ts`: aquí decía 4.9 y Google dice otra cosa.
                          🔴 El «Premio Arival 2023» se quitó el 28 sep (igual que del JSON-LD
                          y del bot): no hay fuente que lo respalde. */}
                      {" "}{resenasTexto()}.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA final. Cuando el artículo tiene un destino comercial en
                  `ofertasDeBlog` se enlaza ESO y no el catálogo genérico: el
                  lector de Tamul sale al tour de Tamul, no a "ver recorridos". */}
              <div className="my-12 p-8 bg-forest border border-lima/20 text-center">
                <p className="text-[9px] tracking-[3px] uppercase text-lima/70 font-dm mb-3">✦ Salidas todos los días</p>
                <h3 className="font-display text-2xl text-crema mb-3">
                  {ofertas.length ? "De la guía al viaje" : "Reserva tu tour en la Huasteca Potosina"}
                </h3>
                <p className="text-crema/50 font-dm font-light text-sm mb-6">
                  {/* Decía "Todo incluido … y comida": la Expedición Tamul, que es
                      la tarjeta que más sale en el blog, NO incluye la comida
                      del día, y no todos los recorridos pasan por ti. */}
                  {/* La regla de pago es la de `pctACobrar` (carrito.ts), con su
                      mismo número: el recuadro de GuiaDelLugar de esta misma
                      página dice exactamente lo mismo. */}
                  Guía certificado, entradas y, en casi todos los recorridos, traslado desde tu hospedaje.
                  Apartas con el {ANTICIPO_PCT} % y liquidas el resto el día del tour. Cancelas gratis hasta 48 h antes{SALVO_POLITICA_PROPIA}.
                </p>
                {ofertas.length > 0 ? (
                  <div className="flex flex-col gap-3 max-w-md mx-auto">
                    {ofertas.map((o) => (
                      <Link
                        key={o.href}
                        href={o.href}
                        className="block border border-dorado/40 hover:border-dorado bg-dorado/5 hover:bg-dorado/10 px-6 py-4 transition-colors text-left"
                      >
                        <span className="block font-dm text-sm text-crema leading-snug">{o.ancla} →</span>
                        <span className="block font-dm font-light text-xs text-crema/45 mt-1">{o.nota}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link href="/reservar" className="inline-flex items-center gap-2 bg-dorado text-negro px-8 py-3 text-[10px] tracking-[2.5px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium">
                    Ver recorridos y reservar →
                  </Link>
                )}
              </div>
            </article>

            {/* ── SIDEBAR STICKY ── */}
            <aside className="lg:sticky lg:top-24 space-y-5 hidden lg:block">

              {/* Tour relevante (escritorio; en móvil va dentro del artículo) */}
              {relevantTour && <TarjetaTour tour={relevantTour} />}

              {/* AI recommender */}
              <div className="border border-white/10 bg-negro/30 p-5 text-center">
                <p className="text-[8px] tracking-[2px] uppercase font-dm text-lima/60 mb-2">✦ IA · 2 min · Gratis</p>
                <p className="font-cormorant text-crema text-base mb-2 leading-snug">¿Cuántos días tienes?</p>
                <p className="text-crema/40 font-dm text-xs mb-4 leading-relaxed">La IA elige el tour perfecto según tu grupo e intereses.</p>
                <Link href="/recomendar" className="block text-center bg-negro/50 border border-lima/25 hover:border-lima/50 text-lima text-[9px] tracking-[2px] uppercase font-dm py-2.5 transition-colors">
                  Recomendador IA →
                </Link>
              </div>

              {/* Related articles */}
              {related.length > 0 && (
                <div className="border border-white/8 bg-negro/20 p-5">
                  <p className="text-[8px] tracking-[2px] uppercase font-dm text-crema/35 mb-4">Artículos relacionados</p>
                  <div className="space-y-4">
                    {related.slice(0, 3).map((r) => (
                      <Link key={r.slug} href={urlBlog(r.slug)} className="group flex gap-3 items-start">
                        {r.coverImageUrl && (
                          <div className="w-14 h-14 overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.coverImageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-dm text-crema/70 group-hover:text-crema leading-snug line-clamp-2 transition-colors">{r.title}</p>
                          <p className="text-[9px] font-dm text-crema/30 mt-1">{r.readingTime} min</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back to blog */}
              <Link href="/blog" className="block text-center text-[9px] tracking-[2px] uppercase font-dm text-crema/35 hover:text-crema/60 transition-colors py-2">
                ← Ver todos los artículos
              </Link>
            </aside>
          </div>

          {/* Related articles (mobile — below article) */}
          {related.length > 0 && (
            <section className="mt-16 pt-12 border-t border-white/8 lg:hidden">
              <div className="text-center mb-8">
                <p className="text-[9px] tracking-[3px] uppercase text-lima/50 font-dm mb-2">Clúster de contenido</p>
                <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm">
                  Más guías sobre <span className="text-lima/60">{clusterTag}</span>
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map(p => (
                  <Link key={p.slug} href={urlBlog(p.slug)} className="group">
                    <article className="bg-forest border border-white/8 hover:border-lima/30 transition-colors overflow-hidden h-full flex flex-col">
                      {p.coverImageUrl && (
                        <div className="aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        {p.tags[0] && <span className="text-[9px] tracking-[2px] uppercase text-lima/50 font-dm mb-2">{p.tags[0]}</span>}
                        <h4 className="font-display text-lg text-crema group-hover:text-lima transition-colors leading-snug mb-2 flex-1">{p.title}</h4>
                        <p className="text-crema/40 font-dm font-light text-xs">{p.readingTime} min lectura</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Volver al blog (mobile) */}
          <section className="max-w-2xl mx-auto text-center mt-16 pt-12 border-t border-white/8 lg:hidden">
            <Link href="/blog" className="text-[10px] tracking-[3px] uppercase font-dm text-crema/40 hover:text-crema/70 transition-colors">
              ← Ver todos los artículos
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}

/**
 * El precio de un recorrido es "desde" cuando depende de algo más que la gente:
 * la ruta y el vehículo en el RZR, el tamaño del grupo en el Edén.
 */
function tieneDesde(t: (typeof TOURS_DB)[number]): boolean {
  return t.precioUnidad === "grupo" || (t.rutas?.length ?? 0) > 0;
}

/**
 * "Salida 7:00 PM" · "Horario según el día" (el Edén: la hora la pone el
 * jardín) · "" cuando no hay hora pública (el buceo: se llega a la laguna).
 */
function salidaTarjeta(t: (typeof TOURS_DB)[number]): string {
  const hora = horaEnLista(t, false);
  if (!hora) return "";
  return /^\d/.test(hora) ? `Salida ${hora}` : hora.charAt(0).toUpperCase() + hora.slice(1);
}

/** "$1,550 MXN por persona" · "desde $1,600 MXN por vehículo". */
function precioTarjeta(t: (typeof TOURS_DB)[number]): string {
  return `${tieneDesde(t) ? "desde " : ""}$${t.precio.toLocaleString("es-MX")} MXN ${etiquetaUnidad(t)}`;
}

/**
 * La tarjeta del tour relacionado. Vivía suelta dentro de la barra lateral, que
 * es `hidden lg:block`: el único enlace del artículo a una ficha de tour no se
 * veía en móvil, o sea para el 88 % del tráfico. Ahora es un componente y se
 * pinta en los dos sitios, cada uno con su `className` de visibilidad.
 */
function TarjetaTour({
  tour,
  className = "",
}: {
  tour: (typeof TOURS_DB)[number];
  className?: string;
}) {
  return (
    <div className={`border border-verde-selva/25 bg-verde-selva/8 p-5 ${className}`}>
      <p className="text-[8px] tracking-[2px] uppercase font-dm text-verde-vivo mb-3">📍 Tour relacionado</p>
      {tour.imagen_hero && (
        <div className="relative aspect-video overflow-hidden mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tour.imagen_hero} alt={tour.nombre} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="font-cormorant text-crema text-base leading-snug mb-1">{tour.nombre}</p>
      {/* Aquí iba "★ 4.9 · Todo incluido" fijo en TODOS los tours: las
          reseñas son del negocio, no de cada recorrido (`resenas.ts`), y no
          todos incluyen lo mismo. Se dice lo que el catálogo sabe de este. */}
      <p className="text-[9px] font-dm text-crema/40 mb-3">
        {[tourDurTexto(tour, " h"), salidaTarjeta(tour)].filter(Boolean).join(" · ")}
      </p>
      <p className="font-cormorant text-dorado text-lg leading-none mb-3">
        {tieneDesde(tour) && <span className="font-dm text-[10px] text-crema/40 mr-1">desde</span>}
        ${tour.precio.toLocaleString("es-MX")}
        <span className="font-dm text-[10px] text-crema/40 ml-1">MXN {etiquetaUnidad(tour)}</span>
      </p>
      <div className="space-y-2">
        <Link
          href={`/reservar/carrito?agregar=${tour.slug}`}
          className="block text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[9px] tracking-[2px] uppercase font-dm py-2.5 transition-colors">
          Reservar →
        </Link>
        <Link href={`/tours/${tour.slug}`} className="block text-center border border-white/15 hover:border-verde-selva/40 text-crema/50 hover:text-crema text-[9px] tracking-[2px] uppercase font-dm py-2 transition-colors">
          Ver tour completo
        </Link>
      </div>
    </div>
  );
}
