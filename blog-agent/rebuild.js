/**
 * blog-agent/rebuild.js
 * ─────────────────────────────────────────────────────────────
 * Reescribe los posts EXISTENTES en el live site con la nueva
 * configuración E-E-A-T (H1 → Hero → H2×3 → CTAs → FAQ → CTA Final).
 *
 * Uso:
 *   node rebuild.js --dry-run          ← muestra sin publicar
 *   node rebuild.js --limit 3          ← reescribe solo los 3 más recientes
 *   node rebuild.js --slug cascada-de-tamul-2026  ← reescribe uno específico
 *   node rebuild.js                    ← reescribe todos (requiere créditos API)
 *
 * Ejecutar desde blog-agent/:
 *   GITHUB_REPO_NAME=manolo1104/CREADOR-DE-INTINERARIO node --env-file=../.env.local rebuild.js
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { inferCategoryByKeyword } from "./content-strategy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI flags ──────────────────────────────────────────────
const DRY_RUN    = process.argv.includes("--dry-run");
const LIMIT_IDX  = process.argv.indexOf("--limit");
const MAX_POSTS  = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;
const SLUG_IDX   = process.argv.indexOf("--slug");
const ONLY_SLUG  = SLUG_IDX !== -1 ? process.argv[SLUG_IDX + 1] : null;

// ── Config ──────────────────────────────────────────────────
const anthropic      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PUBLIC_DOMAIN  = "https://www.huasteca-potosina.com";
const SITE_URL       = PUBLIC_DOMAIN;
const API_BASE_URL   = process.env.SITE_URL || PUBLIC_DOMAIN;
const BLOG_SECRET    = process.env.BLOG_AGENT_SECRET;

const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const IMAGE_BASE_URL   = GITHUB_REPO_NAME
  ? `https://raw.githubusercontent.com/${GITHUB_REPO_NAME}/main/INTINERARIO%20HUASTECA/blog-agent/images/`
  : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Retry wrapper ───────────────────────────────────────────
async function callWithRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 429 && i < retries) {
        const wait = (i + 1) * 30000;
        console.log(`   ⏳ Rate limit — esperando ${wait / 1000}s...`);
        await sleep(wait);
      } else throw err;
    }
  }
}

// ── Slug normalizer ─────────────────────────────────────────
function normalizeStr(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Images bank ─────────────────────────────────────────────
function loadImagesBank() {
  const fp = path.join(__dirname, "images.json");
  try {
    const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
    console.log(`   ✅ images.json cargado (${data.length} imágenes)`);
    return data;
  } catch {
    console.warn("   ⚠️  images.json no encontrado");
    return [];
  }
}

function computeImageScore(image, articleTerms) {
  const tags = image.tags || [];
  let score = 0;
  for (const tag of tags) {
    const tagLow = tag.toLowerCase();
    if (articleTerms.some(t => t.includes(tagLow) || tagLow.includes(t))) score += 20;
  }
  const temaWords = (image.tema || "").toLowerCase().split(/\s+/);
  for (const term of articleTerms) {
    if (temaWords.some(w => w.includes(term) || term.includes(w))) score += 5;
  }
  return Math.min(score, 100);
}

function selectImages(topic, imagesBank) {
  if (!IMAGE_BASE_URL) {
    console.error("ERROR: GITHUB_REPO_NAME no definida — abortando");
    process.exit(1);
  }

  const year = new Date().getFullYear();
  const articleTerms = [
    ...topic.focusKeyword.toLowerCase().split(/\s+/),
    ...(topic.secondaryKeywords || []).flatMap(k => k.toLowerCase().split(/\s+/)),
    ...topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const heroImages = imagesBank.filter(img => img.filename.includes("hero"));
  const bodyImages = imagesBank.filter(img => !img.filename.includes("hero"));

  let bestHero = null, bestScore = 0;
  for (const img of heroImages) {
    const score = computeImageScore(img, articleTerms);
    if (score > bestScore) { bestScore = score; bestHero = img; }
  }

  const heroMatchOk = bestScore >= 40;
  let hero;
  if (heroMatchOk) {
    hero = bestHero;
  } else {
    console.warn(`WARN: imagen hero por fallback geográfico para "${topic.focusKeyword}"`);
    const geoFallback = heroImages.find(img =>
      (img.tags || []).some(t => ["xilitla", "huasteca", "sierra"].includes(t.toLowerCase()))
    );
    hero = geoFallback || bestHero || heroImages[0] || imagesBank[0];
  }

  const heroFolder = hero.filename.split("/")[0];
  const bodyPool = bodyImages.filter(img => !img.filename.startsWith(heroFolder));
  let bestBody = null, bestBodyScore = 0;
  for (const img of (bodyPool.length > 0 ? bodyPool : bodyImages)) {
    const score = computeImageScore(img, articleTerms);
    if (score > bestBodyScore) { bestBodyScore = score; bestBody = img; }
  }
  const body = bestBody || bodyImages[0] || hero;

  const heroUrl = `${IMAGE_BASE_URL}${encodeURI(hero.filename)}`;
  const bodyUrl = `${IMAGE_BASE_URL}${encodeURI(body.filename)}`;
  const heroAlt = heroMatchOk
    ? `${topic.focusKeyword} ${hero.descripcion} Huasteca Potosina ${year}`
    : `${topic.focusKeyword} en Xilitla, Huasteca Potosina ${year}`;

  console.log(`   🖼️  Hero: ${hero.filename} (score: ${bestScore}%) | Body: ${body.filename} (score: ${bestBodyScore}%)`);

  return {
    hero: { url: heroUrl, alt: heroAlt, filename: hero.filename, matchScore: bestScore },
    body: {
      url: bodyUrl,
      alt: `${topic.secondaryKeywords?.[0] || topic.focusKeyword} guía viaje Huasteca Potosina`,
      filename: body.filename,
    },
    heroMatchOk,
  };
}

// ── CTAs ─────────────────────────────────────────────────────
function buildCTAs(topic) {
  const CTA_TOURS = `<div class="cta-block cta-tours">
  <p class="cta-headline">¿Quieres vivir ${topic.focusKeyword} con guía experto?</p>
  <p class="cta-subtext">Tours desde la Huasteca Potosina. Grupos pequeños, guías locales y traslados incluidos.</p>
  <a href="${SITE_URL}/tours" class="cta-button cta-button--primary">Ver tours disponibles →</a>
</div>`;

  const CTA_ITINERARIO = `<div class="cta-block cta-itinerario">
  <p class="cta-headline">¿Ya tienes tu itinerario para la Huasteca?</p>
  <p class="cta-subtext">Nuestro planificador con IA arma tu recorrido en minutos, con tiempos reales y distancias.</p>
  <a href="${SITE_URL}/itinerarios" class="cta-button cta-button--secondary">Crear mi itinerario gratis →</a>
</div>`;

  const CTA_FINAL = `<div class="cta-block cta-final">
  <p class="cta-headline">Reserva tu experiencia en la Huasteca Potosina</p>
  <p class="cta-subtext-1">Tours con guías locales · Grupos reducidos · Sin estrés</p>
  <p class="cta-subtext-2">O planea tu propio recorrido con nuestro creador de itinerarios.</p>
  <div class="cta-buttons">
    <a href="${SITE_URL}/tours" class="cta-button cta-button--primary">Ver todos los tours →</a>
    <a href="${SITE_URL}/itinerarios" class="cta-button cta-button--secondary">Crear mi itinerario →</a>
  </div>
</div>`;

  return { CTA_TOURS, CTA_ITINERARIO, CTA_FINAL };
}

// ── Validar links internos ───────────────────────────────────
function validateInternalLinks(content, postsExistentes) {
  const escapedUrl = SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blogLinkRegex = new RegExp(`href=["']${escapedUrl}/blog/([a-z0-9-]+)["']`, "gi");
  const existingSlugs = new Set(postsExistentes.map(p => p.slug));
  let validCount = 0, totalCount = 0;

  const fixed = content.replace(blogLinkRegex, (match, slug) => {
    totalCount++;
    if (existingSlugs.has(slug)) { validCount++; return match; }
    console.warn(`   ⚠️  Slug no verificado: /blog/${slug} → redirigiendo`);
    if (/tour|guia|precio|reserva|actividad|cascada|rafting|aventura/.test(slug)) return `href="${SITE_URL}/tours"`;
    if (/itinerario|ruta|plan|dia/.test(slug)) return `href="${SITE_URL}/itinerarios"`;
    return `href="${SITE_URL}/blog"`;
  });

  return { content: fixed, validCount, totalCount };
}

// ── Keyword density check ────────────────────────────────────
function checkKeywordDensity(content, keyword) {
  const text = content.replace(/<[^>]+>/g, " ").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const kw = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const occurrences = (text.match(new RegExp(kw, "gi")) || []).length;
  return { occurrences, wordCount: words.length, density: words.length > 0 ? (occurrences / words.length) * 100 : 0 };
}

// ── Research (web_search) ────────────────────────────────────
async function doResearch(topic) {
  console.log(`\n   🔍 Investigando "${topic.focusKeyword}"...`);
  const year = new Date().getFullYear();

  const messages = [{ role: "user", content: `Busca "${topic.focusKeyword} huasteca potosina ${year}". Extrae en máximo 200 palabras:\n1. Precio/costo de entrada o tour\n2. Horario y días de apertura\n3. Cómo llegar y distancia desde Ciudad Valles\n4. 3 preguntas frecuentes de viajeros\n5. Un dato único que otros blogs no cubran\nSolo datos concretos, sin introducción.` }];
  let allText = [];

  for (let round = 0; round < 2; round++) {
    const response = await callWithRetry(() => anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    }));

    for (const block of response.content) {
      if (block.type === "text" && block.text) allText.push(block.text);
    }
    if (response.stop_reason === "end_turn") break;

    const toolUses = response.content.filter(b => b.type === "tool_use");
    if (toolUses.length === 0) break;
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolUses.map(t => ({ type: "tool_result", tool_use_id: t.id, content: [{ type: "text", text: "OK" }] })) });
  }

  const result = allText.join("\n\n");
  if (result) console.log(`   ✅ Investigación: ${result.length} chars`);
  return result;
}

// ── Redactar artículo ────────────────────────────────────────
async function writeArticle(topic, researchContext, images, allPosts) {
  const year = new Date().getFullYear();

  // Preserve existing slug — do NOT regenerate (post already lives at this URL)
  const slug = topic.existingSlug;

  const verifiedSlugs = allPosts.map(p => `/blog/${p.slug}`).join(", ") || "(ninguno)";
  const kwWordCount = topic.focusKeyword.split(/\s+/).length;
  const keywordTargetCount = kwWordCount >= 2 ? Math.round(2300 * 0.009) : Math.round(2300 * 0.010);
  const lsiList = (topic.secondaryKeywords || []).join(", ");

  const prompt = `Escribe un artículo HTML para huasteca-potosina.com. ESTRICTAMENTE 2100–2500 palabras (artículo largo y profundo).

TEMA: ${topic.title}
KEYWORD: ${topic.focusKeyword}
SECUNDARIAS: ${topic.secondaryKeywords.join(", ")}
URL: ${SITE_URL}
IMAGEN CUERPO: <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />

CONTEXTO:
${researchContext || "(Usa tu conocimiento)"}

LINKS INTERNOS VERIFICADOS (SOLO enlazar a estos): ${verifiedSlugs}
Si necesitas enlazar a un blog pero no existe slug verificado, usa ${SITE_URL}/tours (actividades) o ${SITE_URL}/itinerarios (planificación) o ${SITE_URL}/blog (general). NUNCA inventes un slug.

KEYWORD DENSITY:
La keyword principal es: "${topic.focusKeyword}"
Úsala exactamente ${keywordTargetCount} veces en el artículo.
Distribución: 1×H1, 2×intro (primeras 150 palabras), 1×alt hero, 1×H2, resto distribuido.
Variantes LSI: ${lsiList}
Antes de entregar, cuenta las ocurrencias. Si <8 o >14, ajusta.

WORD COUNT:
Antes de entregar, cuenta palabras sin tags HTML.
Si >2500: recorta párrafos redundantes. Si <2100: profundiza con datos concretos y ejemplos (no relleno).
NUNCA recortes: intro, FAQ, bloques class="cta-block".

ESTRUCTURA EXACTA — sigue este orden sin saltarte ningún bloque:

━━━ INTRO (3 párrafos) ━━━
<p>[P1 — Gancho: identifica el problema o duda real del viajero. Incluye la keyword en las primeras 2 oraciones. NO empieces con "Si estás buscando..." ni "Si quieres..."]</p>
<p>[P2 — Solución: qué va a encontrar en este artículo. Incluye una keyword secundaria. Añade un dato concreto del contexto investigado.]</p>
<p>[P3 — E-E-A-T obligatorio, copia textual: "En www.huasteca-potosina.com trabajamos con guías y operadores locales de la región. Esta guía se actualiza con experiencias reales de quienes recorren la Huasteca Potosina cada semana." Cierra con: <a href="${SITE_URL}/itinerarios">planea tu itinerario a ${topic.focusKeyword}</a>]</p>

━━━ SECCIÓN 1 ━━━
<h2>[Título descriptivo con keyword LSI — ej: "Destinos imprescindibles para [keyword]" o "[Destino]: qué ver y hacer" o "Los mejores [tema] en la Huasteca Potosina"]</h2>

<h3>[Subtema específico — extractable como featured snippet, máx 12 palabras. Ej: "Cascada de Tamul: el recorrido en lancha que no olvidarás"]</h3>
<p>[2-3 oraciones. Dato concreto obligatorio: precio, distancia o tiempo con año. Ej: "El acceso cuesta $100 pesos por persona en ${year}."]</p>
<p>[2-3 oraciones. Dato de experiencia real: "Los viajeros que coordinamos..." o "En cada visita que organizamos..."] <a href="${SITE_URL}/tours" title="tours ${topic.focusKeyword} Huasteca Potosina">reserva el tour a ${topic.focusKeyword}</a></p>

<h3>[Segundo subtema específico — extractable como featured snippet, máx 12 palabras]</h3>
<p>[2-3 oraciones. Consejo práctico accionable con horario o condición concreta.]</p>
<p>[2-3 oraciones. Link interno Tipo A a post relacionado del blog si existe slug verificado, o a ${SITE_URL}/tours si no.]</p>

━━━ SECCIÓN 2 ━━━
<h2>[Segundo título temático — diferente ángulo al H2 anterior. Ej: "Actividades y precios en [tema] ${year}" o "Qué esperar en [destino]" o "Todo sobre [subtema relacionado]"]</h2>

<figure>
  <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />
  <figcaption>[Caption con keyword principal + detalle visual específico + ubicación geográfica]</figcaption>
</figure>

<h3>[Subtema — experiencia del viajero]</h3>
<p>[2-3 oraciones. Señal E-E-A-T: anécdota o experiencia de viajeros reales que atendemos. "Los grupos que llevamos cada temporada..." o "Quienes visitan por primera vez..."]</p>
<p>[2-3 oraciones. Advertencia honesta sobre clima, acceso o temporada.] <a href="${SITE_URL}/tours" title="ver tours Huasteca Potosina">ver tours disponibles en la Huasteca Potosina</a></p>

<h3>[Subtema — logística o costos]</h3>
<p>[2-3 oraciones. Desglose de costos o logística con datos del contexto investigado. Incluye <strong> en cada cifra.]</p>
<p>[2-3 oraciones. Link interno Tipo A a otro post relacionado si existe, si no a ${SITE_URL}/itinerarios.]</p>

━━━ SECCIÓN 3 ━━━
<h2>[Tercer título — consejos prácticos. Formato: "Consejos antes de visitar [destino]" o "Qué llevar y cómo preparar tu viaje a [tema]"]</h2>
<p>[Párrafo introductorio de 2-3 oraciones.]</p>
<ul>
  <li><strong>[Consejo 1 en 3-5 palabras]:</strong> [explicación concreta con dato.]</li>
  <li><strong>[Consejo 2]:</strong> [explicación. Si existe slug verificado, enlaza aquí con Tipo A.]</li>
  <li><strong>[Consejo 3]:</strong> [explicación con link Tipo A a post relacionado si existe.]</li>
  <li><strong>[Consejo 4]:</strong> [equipamiento, ropa o seguridad.]</li>
</ul>

━━━ FAQ ━━━
<h2>Preguntas frecuentes sobre ${topic.focusKeyword}</h2>
<div class="faq">
<details><summary><strong>[Pregunta real de People Also Ask — específica, no genérica]</strong></summary><p>[Respuesta directa ≤60 palabras. Incluye dato concreto con año.]</p></details>
<details><summary><strong>[Pregunta sobre precio o costo]</strong></summary><p>[Respuesta con cifras reales del contexto investigado.]</p></details>
<details><summary><strong>[Pregunta sobre cómo llegar o temporada]</strong></summary><p>[Respuesta con distancia, tiempo o meses concretos.]</p></details>
<details><summary><strong>[Pregunta sobre seguridad o recomendaciones para familias/parejas]</strong></summary><p>[Respuesta con consejo accionable. Incluye keyword secundaria.]</p></details>
</div>

━━━ REGLAS FINALES ━━━
- NO incluyas bloques CTA (los inyecto yo después)
- NO uses <h1> en ninguna parte del content
- Usa <strong> en cada cifra, precio, horario y nombre de ruta
- "Huasteca Potosina" entre 5 y 9 veces en todo el artículo
- Mínimo 2 enlaces a ${SITE_URL}/tours en el cuerpo (no en CTAs)
- NUNCA uses: "increíble experiencia", "sin duda alguna", "joya escondida", "paraíso terrenal", "de ensueño", "clic aquí", "Si estás buscando..."
- Links externos permitidos solo: laspozasxilitla.org.mx, google.com/maps, inah.gob.mx — con rel="noopener nofollow", anchor = nombre oficial del lugar
- NO menciones hoteles ni hospedaje (hay una sección dedicada para eso)

Respuesta: JSON puro sin markdown.
{"slug":"${slug}","metaTitle":"máx 60 chars con keyword y ${year}","title":"H1 completo","metaDescription":"140-155 chars","focusKeyword":"${topic.focusKeyword}","secondaryKeywords":${JSON.stringify(topic.secondaryKeywords)},"excerpt":"2 líneas","content":"HTML completo sin CTAs","tags":["Huasteca Potosina","${topic.category}","tag3"],"readingTime":7}`;

  console.log(`   ⏳ Pausa de 15s antes de redactar...`);
  await sleep(15000);

  const response = await callWithRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 18000,
    messages: [{ role: "user", content: prompt }],
  }));

  let raw = (response.content[0]?.text || "").trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude no devolvió JSON válido");

  let post;
  try {
    post = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn("⚠️  JSON incompleto, reparando...");
    let partial = jsonMatch[0];
    let b = 0, br = 0;
    for (const ch of partial) {
      if (ch === "{") b++; else if (ch === "}") b--;
      if (ch === "[") br++; else if (ch === "]") br--;
    }
    post = JSON.parse(partial + "]".repeat(Math.max(0, br)) + "}".repeat(Math.max(0, b)));
    console.warn("✅ JSON reparado");
  }

  // Preserve the original slug — don't let Claude change it
  post.slug = slug;

  // Validate internal links
  if (post.content) {
    const linkCheck = validateInternalLinks(post.content, allPosts);
    post.content = linkCheck.content;
  }

  // Inject CTAs
  const { CTA_TOURS, CTA_ITINERARIO, CTA_FINAL } = buildCTAs(topic);
  if (post.content) {
    const lastH2 = post.content.lastIndexOf("<h2>");
    if (lastH2 > 0) {
      post.content = post.content.slice(0, lastH2)
        + CTA_TOURS + "\n" + CTA_ITINERARIO + "\n"
        + post.content.slice(lastH2);
    }
    post.content += "\n" + CTA_FINAL;
  }

  // Images
  post.coverImageUrl  = images.hero.url;
  post.coverImageAlt  = images.hero.alt;
  post.coverImageFile = `${slug}.jpg`;
  post.internalLinks  = [`${SITE_URL}/tours`, `${SITE_URL}/itinerarios`];
  post.externalSources = post.externalSources || [];

  // Category
  const inferredCategory = inferCategoryByKeyword(topic.focusKeyword, topic.title, topic.secondaryKeywords || []);
  post.tags = [
    "Huasteca Potosina",
    inferredCategory,
    ...(post.tags || []).filter(t => t !== "Huasteca Potosina" && t !== inferredCategory),
  ].slice(0, 5);

  // Schema JSON-LD
  const schemaBase = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title || topic.title,
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "author": { "@type": "Organization", "name": "Huasteca Potosina", "url": SITE_URL },
    "publisher": { "@type": "Organization", "name": "Huasteca Potosina", "url": SITE_URL },
    "description": post.metaDescription || "",
    "image": images.hero.url,
    "keywords": [topic.focusKeyword, ...(topic.secondaryKeywords || [])].join(", "),
    "articleSection": inferredCategory,
  };

  const faqMatches = [...(post.content || "").matchAll(
    /<details>\s*<summary>\s*<strong>(.*?)<\/strong>\s*<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi
  )];
  const faqItems = faqMatches.map(m => ({
    "@type": "Question",
    "name": m[1].replace(/<[^>]+>/g, "").trim(),
    "acceptedAnswer": { "@type": "Answer", "text": m[2].replace(/<[^>]+>/g, "").trim() },
  }));

  post.schemaMarkup = JSON.stringify(
    faqItems.length > 0
      ? [schemaBase, { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqItems }]
      : schemaBase
  );

  // Metrics
  const density = checkKeywordDensity(post.content || "", topic.focusKeyword);
  post._metrics = {
    wordCount: density.wordCount,
    keywordOccurrences: density.occurrences,
    keywordDensity: density.density,
    heroMatchScore: images.hero.matchScore,
    heroMatchOk: images.heroMatchOk,
    faqCount: faqItems.length,
    ctaCount: (post.content.match(/class="cta-block/g) || []).length,
  };

  return post;
}

// ── Publicar / upsert ────────────────────────────────────────
async function publishPost(post) {
  if (DRY_RUN) {
    const m = post._metrics;
    console.log(`\n   🧪 DRY-RUN — no publicado`);
    console.log(`   Title:    ${post.title}`);
    console.log(`   Slug:     ${post.slug}`);
    console.log(`   MetaDesc: ${post.metaDescription}`);
    console.log(`   Words:    ${m.wordCount} | KW: ${m.keywordOccurrences} occ (${m.keywordDensity.toFixed(1)}%)`);
    console.log(`   FAQs:     ${m.faqCount} | CTAs: ${m.ctaCount}`);
    console.log(`   Cover:    ${post.coverImageUrl}`);
    return { dryRun: true };
  }

  const res = await fetch(`${API_BASE_URL}/api/blog/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BLOG_SECRET}`,
    },
    body: JSON.stringify(post),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);

  console.log(`   🚀 Actualizado: ${PUBLIC_DOMAIN}/blog/${data.post.slug}`);

  // Verify schema in live HTML
  try {
    await sleep(2000);
    const htmlRes = await fetch(`${API_BASE_URL}/blog/${data.post.slug}`);
    const html = await htmlRes.text();
    const schemaOk = html.includes('type="application/ld+json"');
    console.log(`   ${schemaOk ? "✅" : "❌"} Schema JSON-LD: ${schemaOk ? "verificado" : "NO encontrado en HTML"}`);
  } catch (e) {
    console.warn(`   ⚠️  No se pudo verificar schema: ${e.message}`);
  }

  return data.post;
}

// ── Print quality log ─────────────────────────────────────────
function printQualityLog(post) {
  const m = post._metrics;
  const wcOk = m.wordCount >= 2100 && m.wordCount <= 2500;
  const kdOk = m.keywordOccurrences >= 8 && m.keywordOccurrences <= 14;
  const ctaOk = m.ctaCount >= 3;
  const faqOk = m.faqCount >= 4;
  const issues = [];

  console.log(`   ${wcOk ? "✅" : "❌"} Words: ${m.wordCount} (${wcOk ? "OK" : "FUERA de 2100-2500"})`);
  console.log(`   ${kdOk ? "✅" : "❌"} KW density: ${m.keywordOccurrences} occ (${kdOk ? "OK" : "FUERA de 8-14"})`);
  console.log(`   ${faqOk ? "✅" : "❌"} FAQ: ${m.faqCount} preguntas (${faqOk ? "OK" : "necesita ≥4"})`);
  console.log(`   ${ctaOk ? "✅" : "❌"} CTAs: ${m.ctaCount} bloques (${ctaOk ? "OK" : "necesita ≥3"})`);
  console.log(`   ${m.heroMatchOk ? "✅" : "⚠️"} Hero match: ${m.heroMatchScore}%`);

  if (!wcOk) issues.push(`words:${m.wordCount}`);
  if (!kdOk) issues.push(`kw:${m.keywordOccurrences}`);
  if (!faqOk) issues.push(`faq:${m.faqCount}`);
  if (!ctaOk) issues.push(`cta:${m.ctaCount}`);

  if (issues.length > 0) console.log(`   ⚠️  REVISIÓN: ${issues.join(" | ")}`);
  else console.log(`   🎯 Todas las verificaciones OK`);
}

// ── Fetch all existing posts from API ────────────────────────
async function fetchExistingPosts() {
  const res = await fetch(`${API_BASE_URL}/api/blog/create`, {
    headers: { "Authorization": `Bearer ${BLOG_SECRET}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET posts error ${res.status}: ${JSON.stringify(data)}`);
  return data.posts || [];
}

// ── Build topic object from existing post metadata ────────────
function buildTopicFromPost(post) {
  // focusKeyword comes from the API response
  const focusKeyword = post.focusKeyword || post.title.toLowerCase();

  // Derive secondary keywords from title words not in focusKeyword
  const titleWords = post.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const kwWords = new Set(focusKeyword.toLowerCase().split(/\s+/));
  const secondaryKeywords = [
    `${focusKeyword} huasteca potosina`,
    `${focusKeyword} como llegar`,
    `${focusKeyword} precio`,
    ...titleWords.filter(w => !kwWords.has(w) && w !== "huasteca" && w !== "potosina").slice(0, 2),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

  const category = inferCategoryByKeyword(focusKeyword, post.title, secondaryKeywords);

  return {
    title: post.title,
    focusKeyword,
    secondaryKeywords,
    category,
    existingSlug: post.slug,
  };
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log("\n🔄  REBUILD AGENT — huasteca-potosina.com");
  console.log(`    Reescribe posts existentes con estructura E-E-A-T`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN (no publica)" : "🚀 LIVE (actualiza en DB)"}`);
  console.log("═".repeat(55));

  // Verify required env
  if (!BLOG_SECRET) { console.error("ERROR: BLOG_AGENT_SECRET no definida"); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error("ERROR: ANTHROPIC_API_KEY no definida"); process.exit(1); }
  if (!IMAGE_BASE_URL) { console.error("ERROR: GITHUB_REPO_NAME no definida"); process.exit(1); }

  // Load images bank
  console.log("\n📦 Cargando banco de imágenes...");
  const imagesBank = loadImagesBank();
  if (imagesBank.length === 0) { console.error("ERROR: images.json vacío o no encontrado — abortando"); process.exit(1); }

  // Fetch existing posts
  console.log("\n📡 Obteniendo posts existentes del API...");
  let allPosts;
  try {
    allPosts = await fetchExistingPosts();
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
  console.log(`   ✅ ${allPosts.length} posts encontrados`);

  // Filter by --slug if specified
  let postsToRebuild = ONLY_SLUG
    ? allPosts.filter(p => p.slug === ONLY_SLUG)
    : allPosts;

  if (ONLY_SLUG && postsToRebuild.length === 0) {
    console.error(`ERROR: Post con slug "${ONLY_SLUG}" no encontrado`);
    console.log("Posts disponibles:", allPosts.map(p => p.slug).join(", "));
    process.exit(1);
  }

  // Apply --limit
  postsToRebuild = postsToRebuild.slice(0, MAX_POSTS);

  console.log(`\n📋 Posts a reescribir (${postsToRebuild.length}):`);
  postsToRebuild.forEach((p, i) => console.log(`   ${i + 1}. ${p.slug} — ${p.title}`));
  console.log("");

  // Process each post
  let rebuilt = 0, failed = 0;
  const results = [];

  for (let i = 0; i < postsToRebuild.length; i++) {
    const existingPost = postsToRebuild[i];
    const num = `[${i + 1}/${postsToRebuild.length}]`;
    console.log(`\n${"─".repeat(55)}`);
    console.log(`${num} Rebuilding: ${existingPost.slug}`);
    console.log(`    Título: ${existingPost.title}`);
    console.log(`    Keyword: ${existingPost.focusKeyword || "(no definida)"}`);

    try {
      // Build topic from existing post metadata
      const topic = buildTopicFromPost(existingPost);

      // Research
      const researchContext = await doResearch(topic).catch(e => {
        console.warn(`   ⚠️  Research falló: ${e.message}`);
        return "";
      });

      // Select images
      const images = selectImages(topic, imagesBank);

      // Write article
      const post = await writeArticle(topic, researchContext, images, allPosts);

      // Quality log
      console.log(`\n   📊 Métricas:`);
      printQualityLog(post);

      // Publish / upsert
      await publishPost(post);

      results.push({ slug: post.slug, status: "ok" });
      rebuilt++;

      // Pause between posts to respect API rate limits
      if (i < postsToRebuild.length - 1) {
        console.log(`\n   ⏳ Pausa de 20s antes del siguiente post...`);
        await sleep(20000);
      }
    } catch (err) {
      console.error(`\n   ❌ ERROR en ${existingPost.slug}: ${err.message}`);
      results.push({ slug: existingPost.slug, status: "error", error: err.message });
      failed++;

      // Continue with next post after brief pause
      if (i < postsToRebuild.length - 1) {
        console.log(`   ⏳ Pausa de 10s antes del siguiente...`);
        await sleep(10000);
      }
    }
  }

  // Summary
  console.log(`\n${"═".repeat(55)}`);
  console.log(`📊 RESUMEN FINAL`);
  console.log(`   ✅ Reconstruidos: ${rebuilt}`);
  console.log(`   ❌ Fallidos:      ${failed}`);
  console.log(`   Total:            ${postsToRebuild.length}`);
  console.log("");
  for (const r of results) {
    console.log(`   ${r.status === "ok" ? "✅" : "❌"} ${r.slug}${r.error ? ` — ${r.error}` : ""}`);
  }
  console.log("═".repeat(55));

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("\n💥 Fatal:", err.message);
  process.exit(1);
});
