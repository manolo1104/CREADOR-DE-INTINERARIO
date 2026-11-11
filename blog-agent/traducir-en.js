/**
 * Traduce un artículo del blog al inglés y lo guarda como archivo del repo
 * (`src/content/blog-en/posts/<slug-es>.json` + `pares.json`). Ver
 * `src/lib/blogEn.ts` para el porqué de los archivos.
 *
 * Lo usan:
 *  · el robot, justo después de publicar en español (`index.js`), y
 *  · la tanda inicial a mano: `node traducir-en.js <slug-es> [<slug-es> …]`
 *    (`--dry-run` extrae y valida sin llamar a la IA ni escribir nada).
 *
 * 🔴 Fuente = la página EN VIVO (`SITE_URL/blog/<slug>`), no la base: ahí el
 * texto ya pasó por `blogSeo.ts` y por los arreglos de la plantilla (precios del
 * catálogo, enlaces a `/itinerarios` que no existen, dominio viejo del hotel…).
 * Traducir el crudo de la base revivía todo eso en inglés.
 *
 * Los enlaces NO los toca la IA: se le pide dejarlos idénticos y luego este
 * script los pasa a /en solo donde hay página en inglés (`RUTAS_CON_EN`, y los
 * artículos ya traducidos de `pares.json`).
 *
 * Costo (Claude Opus 5.5, $4 / $20 por millón): ~US$0.20 por artículo.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, "..");
const DIR_EN = path.join(RAIZ, "src", "content", "blog-en");
const DIR_POSTS = path.join(DIR_EN, "posts");
const ARCHIVO_PARES = path.join(DIR_EN, "pares.json");
const SITE = (process.env.SITE_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");
const MODELO = "claude-opus-5-5";

/**
 * Rutas que SÍ tienen versión en inglés (prefijos). Todo enlace interno que
 * empiece así se pasa a /en. Mantener en sintonía con `ES_CON_EN` de
 * `src/components/nav/Navbar.tsx` y `bilingualStatic` de `src/app/sitemap.ts`.
 */
const RUTAS_CON_EN = [
  "/tours", "/destinos", "/paquetes", "/precios", "/reservar", "/comparar",
  "/info-practica", "/preguntas-frecuentes", "/experiencias", "/contacto", "/nosotros",
  "/que-hacer-en-la-huasteca-potosina", "/sobre-la-huasteca-potosina", "/tours-en-xilitla",
  "/tours-en-ciudad-valles", "/xilitla-o-ciudad-valles", "/grupos", "/sustentabilidad-y-conservacion",
  "/politica-de-cancelacion", "/terminos", "/aviso-de-privacidad",
];
// Fichas de Xantolo: solo existen en español (se venden por temporada).
const SOLO_ES = [/^\/paquetes\/(xantolo-2026|noche-de-xantolo)/];

// ── Extraer de la página publicada ──────────────────────────────────────────

/** El `<div …>` que empieza en `inicio`, completo (cuenta divs anidados). */
function divCompleto(html, inicio) {
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = inicio;
  let nivel = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    nivel += m[0][1] === "/" ? -1 : 1;
    if (nivel === 0) return html.slice(inicio, m.index + m[0].length);
  }
  throw new Error("div sin cerrar");
}

/** Lo de DENTRO de un div completo. */
const interior = (div) => div.slice(div.indexOf(">") + 1, div.lastIndexOf("</div>"));

const decodifica = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const meta = (html, re) => {
  const m = html.match(re);
  return m ? decodifica(m[1]) : "";
};

export async function extraerArticulo(slugEs) {
  const url = `${SITE}/blog/${slugEs}`;
  const r = await fetch(url, { headers: { "User-Agent": "HuastecaBlogTraductor/1.0" }, redirect: "follow" });
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
  const html = await r.text();

  // El cuerpo vive en los dos bloques `prose` de la plantilla (va partido a la
  // mitad para meter la tarjeta del tour en el teléfono).
  const cuerpos = [];
  const reProse = /<div class="prose prose-lg/g;
  let m;
  while ((m = reProse.exec(html)) !== null) cuerpos.push(interior(divCompleto(html, m.index)));
  if (cuerpos.length === 0) throw new Error(`${url}: no encontré el cuerpo del artículo`);

  // JSON-LD del artículo (fechas, sección, palabras clave).
  let posting = null;
  for (const s of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(s[1]);
      if (j["@type"] === "BlogPosting") posting = j;
    } catch { /* otro bloque */ }
  }
  if (!posting) throw new Error(`${url}: sin BlogPosting`);

  // Los tours que ofrece la tarjeta (mismos enlaces al carrito que la plantilla).
  const tours = [...new Set([...html.matchAll(/\/reservar\/carrito\?agregar=([a-z0-9-]+)/g)].map((x) => x[1]))];

  const portada = meta(html, /<meta property="og:image" content="([^"]+)"/);
  const altPortada = meta(html, /<meta property="og:image:alt" content="([^"]+)"/);

  return {
    slugEs,
    url,
    titulo: decodifica(posting.headline || ""),
    metaTitulo: meta(html, /<title>([^<]+)<\/title>/),
    metaDescripcion: meta(html, /<meta name="description" content="([^"]+)"/),
    contenido: cuerpos.join("\n"),
    portada: portada || null,
    altPortada,
    seccion: posting.articleSection || "",
    keywords: String(posting.keywords || "").split(",").map((k) => k.trim()).filter(Boolean),
    datePublished: posting.datePublished,
    dateModified: posting.dateModified,
    tours,
  };
}

// ── Traducir ────────────────────────────────────────────────────────────────

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["slug", "title", "metaTitle", "metaDescription", "excerpt", "coverImageAlt", "seccion", "keywords", "contentHtml"],
  properties: {
    slug: { type: "string", description: "English URL slug, lowercase kebab-case, keyword first, max 70 chars, no year" },
    title: { type: "string", description: "Article headline (H1) in English" },
    metaTitle: { type: "string", description: "SEO title, max 60 characters" },
    metaDescription: { type: "string", description: "Meta description, 120-160 characters" },
    excerpt: { type: "string", description: "One or two sentences for cards, max 220 characters" },
    coverImageAlt: { type: "string", description: "Alt text of the cover image in English" },
    seccion: { type: "string", description: "Short English section name, e.g. Waterfalls, Planning, Culture, Xilitla, Adventure" },
    keywords: { type: "array", items: { type: "string" }, description: "3 to 8 English search keywords" },
    contentHtml: { type: "string", description: "The full translated HTML body" },
  },
};

const INSTRUCCIONES = `You translate travel articles from a Mexican tour operator's website (Huasteca Potosina, San Luis Potosí, Mexico) from Spanish into natural, fluent American English for travelers from the US and Canada.

Rules:
- Translate faithfully. Do not add facts, prices, schedules, distances, reviews or claims that are not in the Spanish text, and do not drop any. Keep every number exactly.
- Money: every peso amount must read like "$1,550 MXN" (add "MXN" when the Spanish omits the currency). Never convert to dollars.
- Place names stay in Spanish (Cascada de Tamul, Las Pozas, Sótano de las Golondrinas, Puente de Dios, Xilitla, Ciudad Valles). The first time a place appears you may add a short English gloss, e.g. "Tamul Waterfall (Cascada de Tamul)". "Huasteca Potosina" is never translated.
- HTML: return the SAME structure. Keep every tag, attribute, id, class and href exactly as given — do not change, add or remove links (they are rewritten by code later). Translate only human-readable text, including alt and title attributes and the text inside <summary> and FAQ blocks.
- Write like a knowledgeable local guide: clear, warm, practical. Short sentences. No marketing fluff, no emojis that are not in the original.
- "metaTitle" ≤ 60 characters and "metaDescription" 120–160 characters, both in English and aimed at what an English speaker would search (e.g. "best time to visit Huasteca Potosina", "Tamul Waterfall").
- "slug": English, lowercase, hyphens, keyword first, ≤ 70 characters, no year.`;

/** Pasa a /en los enlaces internos que tienen versión en inglés. */
export function enlacesAIngles(html, pares) {
  return html.replace(/href="(?:https?:\/\/(?:www\.)?huasteca-potosina\.com)?(\/[^"#?]*)?([?#][^"]*)?"/g, (todo, ruta, resto = "") => {
    // Sin ruta = ancla de la misma página (`#seccion`): se queda igual.
    if (!ruta || ruta === "/en" || ruta.startsWith("/en/")) return todo;
    if (ruta === "/") return `href="/en${resto}"`;
    const blog = ruta.match(/^\/blog\/([a-z0-9-]+)\/?$/);
    if (blog) {
      const en = pares[blog[1]];
      return en ? `href="/en/blog/${en}${resto}"` : `${todo} hreflang="es"`;
    }
    if (ruta === "/blog") return `href="/en/blog${resto}"`;
    if (SOLO_ES.some((re) => re.test(ruta))) return `href="/en/paquetes${resto}"`;
    return RUTAS_CON_EN.some((p) => ruta === p || ruta.startsWith(`${p}/`)) ? `href="/en${ruta}${resto}"` : todo;
  });
}

function leerPares() {
  try { return JSON.parse(fs.readFileSync(ARCHIVO_PARES, "utf-8")); } catch { return {}; }
}

function guardarPares(pares) {
  const ordenados = Object.fromEntries(Object.keys(pares).sort().map((k) => [k, pares[k]]));
  fs.writeFileSync(ARCHIVO_PARES, `${JSON.stringify(ordenados, null, 2)}\n`, "utf-8");
}

/** Revisiones que, si fallan, impiden guardar (mejor sin inglés que un inglés roto). */
function validar(fuente, t) {
  const errores = [];
  const cuenta = (html, re) => (html.match(re) || []).length;
  if (cuenta(t.contentHtml, /<h2\b/g) !== cuenta(fuente.contenido, /<h2\b/g)) errores.push("cambió el número de <h2>");
  if (Math.abs(cuenta(t.contentHtml, /<a\s/g) - cuenta(fuente.contenido, /<a\s/g)) > 1) errores.push("cambió el número de enlaces");
  if (cuenta(t.contentHtml, /<details\b/g) !== cuenta(fuente.contenido, /<details\b/g)) errores.push("cambió el número de preguntas (<details>)");
  const texto = t.contentHtml.replace(/<[^>]+>/g, " ");
  const espanol = cuenta(texto, /\b(?:para|también|porque|está|puedes|nuestro|nuestros|además)\b/gi);
  if (espanol > 6) errores.push(`quedan ${espanol} palabras en español`);
  if (t.metaTitle.length > 60) errores.push(`metaTitle de ${t.metaTitle.length} caracteres`);
  if (t.metaDescription.length < 110 || t.metaDescription.length > 165) errores.push(`metaDescription de ${t.metaDescription.length} caracteres`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug) || t.slug.length > 70) errores.push(`slug inválido: ${t.slug}`);
  return errores;
}

/**
 * Traduce y guarda un artículo. Devuelve el slug en inglés.
 * `opciones.dryRun`: solo extrae y muestra lo que mandaría.
 */
export async function traducirArticulo(slugCrudo, opciones = {}) {
  // Mismo criterio que `normalizaSlugBlog` (src/lib/blogDestinoMap.ts): sin
  // sufijo de año. Es la llave de `pares.json` y el nombre del archivo.
  const slugEs = slugCrudo.replace(/-20\d{2}$/, "");
  const fuente = await extraerArticulo(slugEs);
  const palabras = fuente.contenido.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (opciones.dryRun) {
    console.log(`[dry-run] ${slugEs}: ${palabras} palabras, ${fuente.tours.length} tours (${fuente.tours.join(", ")}), sección «${fuente.seccion}», publicado ${fuente.datePublished}`);
    return null;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const pares = leerPares();
  const stream = anthropic.messages.stream(
    {
      model: MODELO,
      max_tokens: 32000,
      // Traducir no necesita pensar mucho: esfuerzo bajo = menos tokens.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: ESQUEMA },
      },
      // Si la IA declina por un filtro de seguridad, el servidor reintenta solo
      // con otro modelo (no debería pasar con un artículo de viajes).
      fallbacks: "default",
      system: INSTRUCCIONES,
      messages: [{
        role: "user",
        content:
          `Spanish article.\nTitle: ${fuente.titulo}\nSEO title: ${fuente.metaTitulo}\nMeta description: ${fuente.metaDescripcion}\n` +
          `Cover image alt: ${fuente.altPortada}\nSection: ${fuente.seccion}\nKeywords: ${fuente.keywords.join(", ")}\n\n` +
          `HTML body:\n${fuente.contenido}`,
      }],
    },
    { headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } },
  );
  const respuesta = await stream.finalMessage();

  if (respuesta.stop_reason === "refusal") throw new Error(`${slugEs}: la IA declinó traducirlo`);
  if (respuesta.stop_reason === "max_tokens") throw new Error(`${slugEs}: la traducción se cortó (max_tokens)`);
  const texto = respuesta.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const t = JSON.parse(texto);

  const errores = validar(fuente, t);
  if (errores.length) throw new Error(`${slugEs}: no se guardó — ${errores.join("; ")}`);
  const ocupado = Object.entries(pares).find(([es, en]) => en === t.slug && es !== slugEs);
  if (ocupado) t.slug = `${t.slug}-${slugEs.split("-")[0]}`;

  const post = {
    slugEs,
    slug: t.slug,
    title: t.title,
    metaTitle: t.metaTitle,
    metaDescription: t.metaDescription,
    excerpt: t.excerpt,
    contentHtml: enlacesAIngles(t.contentHtml, { ...pares, [slugEs]: t.slug }),
    coverImageUrl: fuente.portada,
    coverImageAlt: t.coverImageAlt,
    seccion: t.seccion,
    keywords: t.keywords,
    tours: fuente.tours,
    datePublished: fuente.datePublished,
    dateModified: fuente.dateModified,
    readingTime: Math.max(1, Math.round(palabras / 220)),
    traducidoEl: new Date().toISOString(),
    fuenteModificada: fuente.dateModified,
  };

  fs.mkdirSync(DIR_POSTS, { recursive: true });
  fs.writeFileSync(path.join(DIR_POSTS, `${slugEs}.json`), `${JSON.stringify(post, null, 2)}\n`, "utf-8");
  guardarPares({ ...pares, [slugEs]: t.slug });

  const u = respuesta.usage;
  const usd = (u.input_tokens * 4 + u.output_tokens * 20) / 1e6;
  console.log(`   🇺🇸 ${slugEs} → /en/blog/${t.slug} (${u.input_tokens} entrada / ${u.output_tokens} salida ≈ US$${usd.toFixed(2)})`);
  return t.slug;
}

// ── Uso a mano ──────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes("--dry-run");
  const slugs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (slugs.length === 0) {
    console.error("Uso: node traducir-en.js <slug-es> [<slug-es> …] [--dry-run]");
    process.exit(1);
  }
  let fallos = 0;
  for (const s of slugs) {
    try { await traducirArticulo(s, { dryRun }); }
    catch (e) { fallos++; console.error(`   ❌ ${e.message}`); }
  }
  process.exit(fallos ? 1 : 0);
}
