import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { BlogNewsletterInline } from "@/components/BlogNewsletterInline";
import { GuiaDelLugar } from "@/components/blog/GuiaDelLugar";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { TarjetaViajeCdmx, tarjetaViajeEnBlog } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import { XantoloPlanDeViaje, XantoloDiasYNoches, esArticuloXantolo, xantoloVigente } from "@/components/blog/CtaXantolo";
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

/**
 * El hotel vive en www.paraisoencantado.com. En la base sobreviven dos formas
 * viejas de enlazarlo y las dos se llevan a la canónica, con www y barra: el
 * dominio dado de baja (`paraisoencantadoxilitla.lat`) y el dominio a secas,
 * que redirige (301) a www.
 *
 * 🔴 Hasta el 19 oct 2026 el dominio muerto se cambiaba por el dominio A
 * SECAS: los tres enlaces del blog al hotel pasaban por una redirección
 * (SEO-10). Ese dominio a secas lo escribía esta plantilla, no la base, así
 * que un `contentReplace` de `blogSeo.ts` no lo habría encontrado.
 */
const DOMINIO_MUERTO =
  /https?:\/\/(?:www\.)?paraisoencantadoxilitla\.lat(?![\w.-])\/?|https?:\/\/paraisoencantado\.com(?![\w.-])\/?/gi;
const HOTEL_WWW = "https://www.paraisoencantado.com/";

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

/**
 * 🔴 Enlaces internos hacia las páginas que compiten en Google. Los artículos
 * se llevan casi todo el tráfico del sitio y casi ninguno enlazaba al inicio,
 * que es la página que pelea «huasteca potosina». Se enlaza la PRIMERA mención
 * en un párrafo, fuera de otro enlace, y solo si el artículo no enlaza ya ahí.
 * El orden importa: cada regla ve los enlaces que pusieron las anteriores.
 */
const GUIA_TAMUL = "cascada-de-tamul-la-guia-definitiva-para-visitarla";
const AUTOENLACES: { patron: RegExp; href: string }[] = [
  // «Tours Huasteca Potosina» es la marca, no la región: esa no se enlaza.
  { patron: /(?<!Tours )\bHuasteca Potosina\b/i, href: "/" },
  { patron: /\bCascada de Tamul\b/i, href: urlBlog(GUIA_TAMUL) },
  { patron: /\btours? guiados?\b/i, href: "/tours" },
];

const escapaRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function yaEnlazaA(html: string, href: string): boolean {
  const ruta = href === "/" ? "/?" : escapaRegex(href);
  return new RegExp(`href="(?:${escapaRegex(SITE)})?${ruta}(?:[?#][^"]*)?"`, "i").test(html);
}

function enlazaPrimeraMencion(html: string, patron: RegExp, href: string): string {
  const trozos = html.split(/(<[^>]+>)/);
  let enParrafo = 0;
  let enEnlace = 0;
  for (let i = 0; i < trozos.length; i++) {
    const t = trozos[i];
    if (t.startsWith("<")) {
      if (/^<p[\s>]/i.test(t)) enParrafo++;
      else if (/^<\/p>/i.test(t)) enParrafo = Math.max(0, enParrafo - 1);
      else if (/^<a[\s>]/i.test(t)) enEnlace++;
      else if (/^<\/a>/i.test(t)) enEnlace = Math.max(0, enEnlace - 1);
      continue;
    }
    if (!enParrafo || enEnlace) continue;
    const m = patron.exec(t);
    if (!m) continue;
    trozos[i] = `${t.slice(0, m.index)}<a href="${href}">${m[0]}</a>${t.slice(m.index + m[0].length)}`;
    return trozos.join("");
  }
  return html;
}

function autoenlaza(html: string, slugPropio: string): string {
  const propio = urlBlog(slugPropio);
  return AUTOENLACES.reduce(
    (h, { patron, href }) =>
      href === propio || yaEnlazaA(h, href) ? h : enlazaPrimeraMencion(h, patron, href),
    html,
  );
}

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
  // (Aquí iba la regla de intención FOTOGRÁFICA → Huasteca Instagrameable; ese
  // recorrido se retiró el 29 oct 2026 y los artículos de fotos caen en la
  // regla del lugar que mencionan.)
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
  const tarjetaViaje = tarjetaViajeEnBlog(post.slug, post.content);
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
    .replace(DOMINIO_MUERTO, HOTEL_WWW)
    .replace(/href="\/planear[^"]*"/gi, `href="${SITE}/planear"`)
    .replace(ENLACE_BLOG_CON_ANIO, (_todo, dominio: string, slug: string, ancla?: string) =>
      `href="${dominio ? SITE : ""}${urlBlog(slug)}${ancla ?? ""}"`)
    .replace(/<h1[^>]*>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>");

  const contenidoCorregido = autoenlaza(
    reescribeEnlacesItinerarios(
      PROMESAS_FALSAS.reduce((html, [busca, pon]) => html.replace(busca, pon), contenidoBase),
    ),
    post.slug,
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

  /* ══════════════════════════════════════════════════════════════════════
     🔴 REDISEÑO DE LA PÁGINA DE ARTÍCULO (29 oct 2026). Manolo: «dale un mejor
     diseño a los artículos sin quitarle protagonismo a la conversión y ctas».
      · Fondo CLARO (crema) y columna de lectura de 68 caracteres: un artículo
        de 2,000 palabras en crema al 70 % sobre verde oscuro cansaba a las tres
        pantallas, y el 88 % lo lee en el teléfono.
      · Fuera los rótulos de 8-9 px en mayúsculas (había catorce en una sola
        página), los «✦», el azul #00B4D8 de los botones del contenido y la
        palabra clave pintada bajo el título. Un solo acento: el dorado para
        reservar, el verde para enlaces.
      · TODAS las salidas a la venta siguen en el mismo sitio y con los mismos
        enlaces: tarjeta del tour (barra lateral en escritorio, dentro del
        artículo en el teléfono), ficha del lugar con sus tours, itinerario por
        correo, recorridos relacionados y el cierre, que ahora es el único
        bloque oscuro de la página para que destaque más, no menos.
     La versión anterior es `git show 96ca2c3:src/app/blog/[slug]/page.tsx`.
     ══════════════════════════════════════════════════════════════════════ */

  // Prose styles shared by both content halves
  const proseClass = `prose prose-lg max-w-none
    prose-headings:font-cormorant prose-headings:font-normal prose-headings:text-verde-profundo
    prose-h2:text-[2rem] prose-h2:leading-[1.15] prose-h2:mt-12 prose-h2:mb-5 prose-h2:scroll-mt-28
    prose-h3:text-[1.35rem] prose-h3:leading-snug prose-h3:mt-9 prose-h3:mb-3
    prose-p:font-dm prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-negro/75
    prose-a:text-verde-selva prose-a:underline prose-a:decoration-verde-selva/30 prose-a:underline-offset-4 hover:prose-a:text-terracota
    prose-strong:text-negro prose-strong:font-medium
    prose-ul:font-dm prose-ul:text-negro/75 prose-ol:font-dm prose-ol:text-negro/75 prose-li:leading-relaxed prose-li:marker:text-verde-selva
    prose-blockquote:border-l-2 prose-blockquote:border-dorado prose-blockquote:font-cormorant prose-blockquote:text-2xl prose-blockquote:not-italic prose-blockquote:text-verde-profundo prose-blockquote:font-light
    prose-img:rounded-2xl prose-img:w-full
    prose-figure:my-8
    prose-figcaption:font-dm prose-figcaption:text-negro/45 prose-figcaption:text-[13px] prose-figcaption:text-center prose-figcaption:mt-2
    prose-hr:border-negro/10
    prose-table:font-dm prose-table:text-[15px] prose-th:text-verde-profundo prose-td:text-negro/75
    [&_.cta-box]:my-10 [&_.cta-box]:rounded-2xl [&_.cta-box]:border [&_.cta-box]:border-negro/10 [&_.cta-box]:bg-white [&_.cta-box]:p-7 [&_.cta-box]:text-center
    [&_.cta-block]:my-10 [&_.cta-block]:rounded-2xl [&_.cta-block]:border [&_.cta-block]:border-negro/10 [&_.cta-block]:bg-white [&_.cta-block]:p-7 [&_.cta-block]:text-center
    [&_.cta-final]:bg-verde-profundo [&_.cta-final]:border-verde-profundo
    [&_.cta-headline]:font-cormorant [&_.cta-headline]:text-2xl [&_.cta-headline]:leading-snug [&_.cta-headline]:text-verde-profundo [&_.cta-headline]:mb-2 [&_.cta-headline]:font-normal
    [&_.cta-final_.cta-headline]:text-crema
    [&_.cta-subtext]:font-dm [&_.cta-subtext]:text-negro/60 [&_.cta-subtext]:text-[15px] [&_.cta-subtext]:leading-relaxed [&_.cta-subtext]:mb-5
    [&_.cta-final_.cta-subtext]:text-crema/70
    [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:justify-center [&_.cta-button]:gap-2 [&_.cta-button]:min-h-[48px] [&_.cta-button]:rounded-full [&_.cta-button]:px-7 [&_.cta-button]:py-2.5 [&_.cta-button]:font-dm [&_.cta-button]:text-[15px] [&_.cta-button]:font-medium [&_.cta-button]:no-underline [&_.cta-button]:mx-1.5 [&_.cta-button]:mt-2
    [&_.cta-button--primary]:bg-dorado [&_.cta-button--primary]:text-negro [&_.cta-button--primary]:hover:bg-lima
    [&_.cta-button--secondary]:bg-transparent [&_.cta-button--secondary]:text-verde-profundo [&_.cta-button--secondary]:border [&_.cta-button--secondary]:border-negro/20 [&_.cta-button--secondary]:hover:border-verde-selva
    [&_.cta-final_.cta-button--secondary]:text-crema [&_.cta-final_.cta-button--secondary]:border-crema/40
    [&_.cta-link]:text-verde-selva [&_.cta-link]:underline
    [&_.tour-cta]:my-8 [&_.tour-cta]:rounded-2xl [&_.tour-cta]:border [&_.tour-cta]:border-negro/10 [&_.tour-cta]:bg-white [&_.tour-cta]:p-5 [&_.tour-cta]:not-prose
    [&_details]:my-3 [&_details]:rounded-2xl [&_details]:border [&_details]:border-negro/10 [&_details]:bg-white [&_details]:overflow-hidden
    [&_details[open]]:border-verde-selva/40
    [&_summary]:cursor-pointer [&_summary]:px-5 [&_summary]:py-4 [&_summary]:text-verde-profundo [&_summary]:font-dm [&_summary]:font-medium [&_summary]:text-base [&_summary]:list-none [&_summary]:select-none
    [&_summary::-webkit-details-marker]:hidden [&_summary::marker]:hidden [&_summary]:hover:bg-crema/60
    [&_details>p]:px-5 [&_details>p]:pb-4 [&_details>p]:pt-0 [&_details>p]:text-negro/65 [&_details>p]:text-[15px] [&_details>p]:leading-relaxed
    [&_details_strong]:text-negro [&_details_strong]:font-medium`;

  /* Clases compartidas por los recuadros de la página (un solo sistema de
     esquinas: superficies `rounded-2xl`, botones y píldoras redondos). */
  const CAJA = "rounded-2xl border border-negro/10 bg-white";
  const BOTON_DORADO =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-dorado px-7 font-dm text-[15px] font-medium text-negro " +
    "transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]";
  const ENLACE = "font-dm text-sm text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota";
  const temas = tagsEspecificos(post.tags).slice(0, 5);

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
      <main className="min-h-screen bg-crema pb-20 pt-[calc(var(--navbar-alto,64px)+20px)] sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        {/* Cuenta la lectura para «Lo más leído» del inicio. */}
        <BlogViewTracker slug={post.slug} />

        <div className="mx-auto max-w-6xl px-6">
          {/* ── CABECERA ── */}
          <header className="mb-10 sm:mb-12">
            <nav aria-label="Migas" className="mb-6 flex flex-wrap items-center gap-x-2 font-dm text-[13px] text-negro/50">
              <Link href="/" className="transition-colors hover:text-verde-selva">Inicio</Link>
              <span aria-hidden="true">/</span>
              <Link href="/blog" className="transition-colors hover:text-verde-selva">Blog</Link>
              <span aria-hidden="true">/</span>
              <span className="text-verde-selva">{seccion}</span>
            </nav>

            <div className="max-w-3xl">
              <h1
                className="font-cormorant font-light leading-[1.05] text-verde-profundo"
                style={{ fontSize: "clamp(34px,5vw,60px)" }}
              >
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="mt-5 max-w-[60ch] font-dm text-[17px] leading-relaxed text-negro/60">
                  {post.excerpt}
                </p>
              )}

              {/* Autor, fecha y lectura, en minúsculas normales y sin puntos
                  medios: era una tira de 10 px en mayúsculas con cinco datos. */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-dm text-[13px] text-negro/55">
                <Link href="/nosotros" className="group flex items-center gap-2.5 transition-colors hover:text-verde-selva">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/imagenes/guias/manolo-covarrubias.jpg"
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded-full border border-negro/10 object-cover object-top"
                  />
                  <span className="font-medium text-negro/75 transition-colors group-hover:text-verde-selva">Manolo Covarrubias</span>
                </Link>
                <time dateTime={post.publishedAt.toISOString()}>{fechaLarga(post.publishedAt)}</time>
                {/* Visible y no solo en el JSON-LD: Google compara el
                    `dateModified` con lo que ve el lector. */}
                {mostrarActualizado && (
                  <span>
                    Actualizado el <time dateTime={modificado.toISOString()}>{fechaLarga(modificado)}</time>
                  </span>
                )}
                <span>{post.readingTime} min de lectura</span>
                {promoPost && <span className="text-dorado">Contenido propio</span>}
              </div>
            </div>

            {/* Portada */}
            {post.coverImageUrl && (
              <div className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-negro/5 sm:mt-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="h-full w-full object-cover" loading="eager" />
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
            {/* ── ARTÍCULO PRINCIPAL ── */}
            <article className="min-w-0 max-w-[68ch]">
              {/* Índice. Los artículos pasan de 2,000 palabras y el 88 % se
                  lee en el teléfono: sin esto, quien buscaba "cuánto cuesta"
                  tenía que bajar seis pantallas para encontrarlo. */}
              {mostrarIndice && (
                <nav aria-label="Índice del artículo" className={`mb-10 p-5 sm:p-6 ${CAJA}`}>
                  <p className="mb-3 font-dm text-sm font-medium text-verde-profundo">En este artículo</p>
                  <ol className="list-inside list-decimal space-y-2 marker:text-negro/35">
                    {indice.map((s) => (
                      <li key={s.id} className="font-dm text-[15px] leading-snug text-negro/70">
                        <a href={`#${s.id}`} className="transition-colors hover:text-verde-selva">{s.texto}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Xantolo: la página más visitada del sitio. La salida a la venta
                  va ARRIBA porque la mitad de los lectores en celular no pasa
                  del 40 % del artículo (Clarity, 1 oct 2026). */}
              {esArticuloXantolo(post.slug) && <XantoloPlanDeViaje />}
              {tarjetaViaje === "arriba" && <TarjetaViajeCdmx origen={`blog-${post.slug}`} className="mb-10" />}

              {/* Content first half */}
              <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentFirst }} />

              {/* El MISMO tour de la barra lateral, dentro del artículo. La
                  barra está oculta por CSS bajo 1024 px y el 88 % del tráfico
                  es móvil: ahí el único enlace a una ficha de tour no existía.
                  `lg:hidden` evita que en escritorio salga dos veces. */}
              {/* En Xantolo, en lugar de UN tour: cuáles caben en un día de
                  fiesta y cuáles conviene dejar para antes o después. */}
              {esArticuloXantolo(post.slug) && xantoloVigente()
                ? <XantoloDiasYNoches />
                : relevantTour && <TarjetaTour tour={relevantTour} className="my-10 lg:hidden" />}

              {/* Ficha del lugar + tours que lo visitan. Va a mitad del
                  artículo: es donde el lector ya decidió que quiere ir. */}
              <GuiaDelLugar blogSlug={post.slug} />
              {tarjetaViaje === "medio" && <TarjetaViajeCdmx origen={`blog-${post.slug}`} className="my-10" />}

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
                <section aria-labelledby="recorridos-relacionados" className={`mt-12 p-6 ${CAJA}`}>
                  <h2 id="recorridos-relacionados" className="mb-2 font-cormorant text-2xl font-normal text-verde-profundo">
                    Recorridos relacionados
                  </h2>
                  <ul className="flex flex-col">
                    {toursFijados.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/tours/${t.slug}`}
                          className="group flex items-baseline justify-between gap-4 border-t border-negro/10 py-3.5 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block font-dm text-[15px] font-medium text-verde-profundo transition-colors group-hover:text-verde-selva">{t.nombreCorto}</span>
                            <span className="mt-0.5 block font-dm text-[13px] text-negro/50">{t.tagline}</span>
                          </span>
                          <span className="whitespace-nowrap font-dm text-sm font-medium text-dorado">
                            {precioTarjeta(t)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Temas del artículo, al final y en texto: arriba eran píldoras
                  en mayúsculas antes del título. */}
              {temas.length > 0 && (
                <p className="mt-10 font-dm text-[13px] text-negro/50">
                  Temas: {temas.join(", ")}
                </p>
              )}

              {/* Author card, siempre visible */}
              <div className="mt-10 border-t border-negro/10 pt-8">
                <div className="flex items-start gap-5">
                  <Link href="/nosotros" className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/imagenes/guias/manolo-covarrubias.jpg"
                      alt="Manolo Covarrubias, guía local y fundador"
                      className="h-16 w-16 rounded-full border border-negro/10 object-cover object-top"
                    />
                  </Link>
                  <div>
                    <p className="font-dm text-[13px] text-negro/50">Escrito por</p>
                    <Link href="/nosotros" className="font-cormorant text-2xl font-light text-verde-profundo transition-colors hover:text-verde-selva">
                      Manolo Covarrubias
                    </Link>
                    <p className="mb-2 font-dm text-[13px] text-negro/50">
                      Guía local, fundador, certificado NOM-09
                    </p>
                    <p className="max-w-md font-dm text-[15px] leading-relaxed text-negro/65">
                      Nacido en la Huasteca Potosina. Lleva más de 6 años llevando viajeros a los rincones que ningún autobús turístico alcanza.
                      {/* La cifra sale de `resenas.ts`: aquí decía 4.9 y Google dice otra cosa.
                          🔴 El «Premio Arival 2023» se quitó el 28 sep (igual que del JSON-LD
                          y del bot): no hay fuente que lo respalde. */}
                      {" "}{resenasTexto()}.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA final: el único bloque oscuro de la página, para que sea lo
                  que más pesa. Cuando el artículo tiene un destino comercial en
                  `ofertasDeBlog` se enlaza ESO y no el catálogo genérico: el
                  lector de Tamul sale al tour de Tamul, no a "ver recorridos". */}
              <div className="my-12 rounded-2xl bg-verde-profundo p-7 text-center sm:p-10">
                <h3 className="font-cormorant text-3xl font-light leading-tight text-crema">
                  {ofertas.length ? "De la guía al viaje" : "Reserva tu tour en la Huasteca Potosina"}
                </h3>
                <p className="mx-auto mt-3 mb-6 max-w-md font-dm text-[15px] leading-relaxed text-crema/70">
                  {/* La Expedición Tamul, que es la tarjeta que más sale en el
                      blog, NO incluye la comida del día, y no todos los recorridos
                      pasan por ti. La regla de pago es la de `pctACobrar`. */}
                  Guía certificado, entradas y, en casi todos los recorridos, traslado desde tu hospedaje.
                  Apartas con el {ANTICIPO_PCT} % y liquidas el resto el día del tour. Cancelas gratis hasta 48 h antes{SALVO_POLITICA_PROPIA}.
                </p>
                {ofertas.length > 0 ? (
                  <div className="mx-auto flex max-w-md flex-col gap-3">
                    {ofertas.map((o) => (
                      <Link
                        key={o.href}
                        href={o.href}
                        className="block rounded-2xl border border-crema/25 bg-crema/5 px-6 py-4 text-left transition-colors hover:border-dorado hover:bg-crema/10"
                      >
                        <span className="block font-dm text-[15px] font-medium leading-snug text-crema">{o.ancla}</span>
                        <span className="mt-1 block font-dm text-[13px] text-crema/60">{o.nota}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link href="/reservar" className={BOTON_DORADO}>
                    Ver recorridos y reservar
                  </Link>
                )}
              </div>
            </article>

            {/* ── SIDEBAR STICKY ── */}
            <aside className="hidden space-y-5 lg:sticky lg:top-24 lg:block">
              {/* Tour relevante (escritorio; en móvil va dentro del artículo) */}
              {relevantTour && <TarjetaTour tour={relevantTour} />}

              {/* Recomendador */}
              <div className={`p-5 ${CAJA}`}>
                <p className="font-cormorant text-xl leading-snug text-verde-profundo">¿Cuántos días tienes?</p>
                <p className="mt-1.5 mb-4 font-dm text-[13px] leading-relaxed text-negro/60">En 2 minutos te decimos qué tour te queda según tu grupo y lo que te emociona. Gratis.</p>
                <Link href="/recomendar" className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-negro/20 px-5 font-dm text-sm font-medium text-verde-profundo transition-colors hover:border-verde-selva hover:text-verde-selva">
                  Recomendar mi tour
                </Link>
              </div>

              {/* Related articles */}
              {related.length > 0 && (
                <div className={`p-5 ${CAJA}`}>
                  <p className="mb-3 font-dm text-sm font-medium text-verde-profundo">Artículos relacionados</p>
                  <div className="flex flex-col">
                    {related.slice(0, 3).map((r) => (
                      <Link key={r.slug} href={urlBlog(r.slug)} className="group flex items-start gap-3 border-t border-negro/10 py-3 first:border-t-0 first:pt-0">
                        {r.coverImageUrl && (
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-negro/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-dm text-[13px] leading-snug text-negro/75 transition-colors group-hover:text-verde-selva">{r.title}</p>
                          <p className="mt-1 font-dm text-[12px] text-negro/45">{r.readingTime} min</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center">
                <Link href="/blog" className={ENLACE}>Ver todos los artículos</Link>
              </p>
            </aside>
          </div>

          {/* Related articles (mobile, below article) */}
          {related.length > 0 && (
            <section className="mt-16 border-t border-negro/10 pt-12 lg:hidden">
              <h2 className="mb-6 font-cormorant text-3xl font-light text-verde-profundo">
                Más guías sobre <em className="text-dorado">{clusterTag}</em>
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {related.map((p) => (
                  <Link key={p.slug} href={urlBlog(p.slug)} className="group block">
                    {p.coverImageUrl && (
                      <div className="mb-3 aspect-video overflow-hidden rounded-2xl bg-negro/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      </div>
                    )}
                    <h3 className="font-cormorant text-xl leading-snug text-verde-profundo transition-colors group-hover:text-verde-selva">{p.title}</h3>
                    <p className="mt-1.5 font-dm text-[13px] text-negro/50">{p.readingTime} min de lectura</p>
                  </Link>
                ))}
              </div>
              <p className="mt-8 text-center">
                <Link href="/blog" className={ENLACE}>Ver todos los artículos</Link>
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function tieneDesde(t: (typeof TOURS_DB)[number]): boolean {
  return t.precioUnidad === "grupo" || (t.rutas?.length ?? 0) > 0;
}

function salidaTarjeta(t: (typeof TOURS_DB)[number]): string {
  const hora = horaEnLista(t, false);
  if (!hora) return "";
  return /^\d/.test(hora) ? `Salida ${hora}` : hora.charAt(0).toUpperCase() + hora.slice(1);
}

function precioTarjeta(t: (typeof TOURS_DB)[number]): string {
  return `${tieneDesde(t) ? "desde " : ""}$${t.precio.toLocaleString("es-MX")} MXN ${etiquetaUnidad(t)}`;
}

/**
 * La tarjeta del tour relacionado: la salida a la venta más directa del
 * artículo. Mismos dos enlaces de siempre (al carrito con el tour agregado y a
 * la ficha); lo que cambió es la piel: clara, con el botón dorado de reservar.
 */
function TarjetaTour({
  tour,
  className = "",
}: {
  tour: (typeof TOURS_DB)[number];
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-negro/10 bg-white p-5 ${className}`}>
      <p className="mb-3 font-dm text-[13px] font-medium text-verde-selva">Tour relacionado</p>
      {tour.imagen_hero && (
        <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-negro/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tour.imagen_hero} alt={tour.nombre} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <p className="font-cormorant text-xl leading-snug text-verde-profundo">{tour.nombre}</p>
      {/* Las reseñas son del negocio, no de cada recorrido (`resenas.ts`), y
          no todos incluyen lo mismo: se dice lo que el catálogo sabe de este. */}
      <p className="mt-1 mb-3 font-dm text-[13px] text-negro/50">
        {[tourDurTexto(tour, " h"), salidaTarjeta(tour)].filter(Boolean).join(", ")}
      </p>
      <p className="mb-4 font-cormorant text-2xl leading-none text-dorado">
        {tieneDesde(tour) && <span className="mr-1 font-dm text-[12px] text-negro/50">desde</span>}
        ${tour.precio.toLocaleString("es-MX")}
        <span className="ml-1 font-dm text-[12px] text-negro/50">MXN {etiquetaUnidad(tour)}</span>
      </p>
      <div className="flex flex-col gap-2.5">
        <Link
          href={`/reservar/carrito?agregar=${tour.slug}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-dorado px-5 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 hover:bg-lima active:scale-[0.98]"
        >
          Reservar
        </Link>
        <Link
          href={`/tours/${tour.slug}`}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-negro/20 px-5 font-dm text-sm font-medium text-verde-profundo transition-colors hover:border-verde-selva hover:text-verde-selva"
        >
          Ver tour completo
        </Link>
      </div>
    </div>
  );
}
