/**
 * blog-agent/index.js
 * ─────────────────────────────────────────────────────────
 * Agente de contenido diario para Huasteca Potosina.
 * Framework: E-E-A-T · Plataforma Regional · 950–1,100 palabras
 *
 * Uso:
 *   node index.js                          ← publica el post del día
 *   node index.js --dry-run                ← muestra sin publicar
 *   node index.js --topic "tamul guia"     ← tema específico
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { getDailyTopic, inferCategoryByKeyword } from "./content-strategy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN      = process.argv.includes("--dry-run");
const TOPIC_IDX    = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL        = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET     = process.env.BLOG_AGENT_SECRET;

// ── URL de imágenes desde GITHUB_REPO_NAME ──────────────────
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const IMAGE_BASE_URL   = GITHUB_REPO_NAME
  ? `https://raw.githubusercontent.com/${GITHUB_REPO_NAME}/main/INTINERARIO%20HUASTECA/blog-agent/images/`
  : null;

// ── Utilidades ──────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

// ── Corrección 2: Slug — generación y validación ────────────

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

function generateSlug(title, primaryKeyword, year) {
  const keywordSlug = normalizeStr(primaryKeyword);
  const titleSlug   = normalizeStr(title);
  const yearStr     = String(year);

  let finalSlug = titleSlug.includes(keywordSlug)
    ? titleSlug
    : `${keywordSlug}-${titleSlug.replace(keywordSlug, "").replace(/^-|-$/g, "")}`;

  if (!finalSlug.endsWith(yearStr)) {
    finalSlug = `${finalSlug}-${yearStr}`;
  }

  const withoutYear = finalSlug.replace(`-${yearStr}`, "");
  if (withoutYear.length > 60) {
    finalSlug = `${withoutYear.slice(0, 60).replace(/-$/, "")}-${yearStr}`;
  }

  return finalSlug;
}

function validateSlug(slug, primaryKeyword) {
  const normalizedSlug = slug.split("-").join(" ");
  const normalizedKw = primaryKeyword
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalizedSlug.includes(normalizedKw)) {
    throw new Error(
      `SLUG INVÁLIDO: "${slug}" no contiene la keyword "${primaryKeyword}". Abortando publicación.`
    );
  }
  return true;
}

// ── Banco de imágenes desde images.json ─────────────────────

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

// ── Cargar bancos de datos locales ──────────────────────────

function loadDataBanks() {
  const files = ["keywords.json", "topics.json", "best-practices.json"];
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      console.log(`   ✅ ${file} cargado (${Object.keys(data).length} entradas)`);
    } catch {
      console.log(`   ⚠️  ${file} no encontrado — continuando sin él`);
    }
  }
}

// ── Corrección 4: Scoring por tags + tema ───────────────────

function computeImageScore(image, articleTerms) {
  const tags = image.tags || [];
  let score = 0;
  for (const tag of tags) {
    const tagLow = tag.toLowerCase();
    if (articleTerms.some(t => t.includes(tagLow) || tagLow.includes(t))) {
      score += 20;
    }
  }
  // Bonus: tema match (legacy compat)
  const temaWords = (image.tema || "").toLowerCase().split(/\s+/);
  for (const term of articleTerms) {
    if (temaWords.some(w => w.includes(term) || term.includes(w))) {
      score += 5;
    }
  }
  return Math.min(score, 100);
}

function selectImages(topic, imagesBank) {
  if (!IMAGE_BASE_URL) {
    console.error("ERROR: GITHUB_REPO_NAME no definida — abortando publicación");
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

  // Scoring para hero
  let bestHero = null;
  let bestScore = 0;
  for (const img of heroImages) {
    const score = computeImageScore(img, articleTerms);
    if (score > bestScore) {
      bestScore = score;
      bestHero = img;
    }
  }

  // Corrección 4: Fallback geográfico si <40%
  let heroMatchOk = bestScore >= 40;
  let hero;
  if (heroMatchOk) {
    hero = bestHero;
  } else {
    console.warn(`WARN: imagen hero por fallback geográfico — añadir imágenes de "${topic.focusKeyword}" al banco`);
    const geoFallback = heroImages.find(img =>
      (img.tags || []).some(t => ["xilitla", "huasteca", "sierra"].includes(t.toLowerCase()))
    );
    hero = geoFallback || bestHero || heroImages[0] || imagesBank[0];
    heroMatchOk = false;
  }

  // Body: mejor match fuera del folder del hero
  const heroFolder = hero.filename.split("/")[0];
  const bodyPool = bodyImages.filter(img => !img.filename.startsWith(heroFolder));
  let bestBody = null;
  let bestBodyScore = 0;
  for (const img of bodyPool.length > 0 ? bodyPool : bodyImages) {
    const score = computeImageScore(img, articleTerms);
    if (score > bestBodyScore) {
      bestBodyScore = score;
      bestBody = img;
    }
  }
  const body = bestBody || bodyImages[0] || hero;

  const heroUrl = `${IMAGE_BASE_URL}${encodeURI(hero.filename)}`;
  const bodyUrl = `${IMAGE_BASE_URL}${encodeURI(body.filename)}`;

  // Corrección 4: Alt describe artículo si no hay coincidencia
  const heroAlt = heroMatchOk
    ? `${topic.focusKeyword} ${hero.descripcion} Huasteca Potosina ${year}`
    : `${topic.focusKeyword} en Xilitla, Huasteca Potosina ${year}`;

  console.log(`\n🖼️  Imágenes seleccionadas:`);
  console.log(`   Hero: ${hero.filename} (score: ${bestScore}%)`);
  console.log(`   Body: ${body.filename} (score: ${bestBodyScore}%)`);

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

// ── Ejecuta llamada con web_search manejando el tool loop ──

async function callWithSearch(prompt, maxTokens = 400) {
  const messages = [{ role: "user", content: prompt }];
  let allText = [];

  for (let round = 0; round < 2; round++) {
    const response = await callWithRetry(() => anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
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
    messages.push({
      role: "user",
      content: toolUses.map(t => ({
        type: "tool_result",
        tool_use_id: t.id,
        content: [{ type: "text", text: "OK" }],
      })),
    });
  }

  return allText.join("\n\n");
}

// ── PASO 1: Investigación ───────────────────────────────────

async function doResearch(topic) {
  console.log(`\n🔍 Investigando: "${topic.focusKeyword}"...`);
  const year = new Date().getFullYear();

  const prompt = `Busca "${topic.focusKeyword} huasteca potosina ${year}". Extrae en máximo 200 palabras:
1. Precio/costo de entrada o tour
2. Horario y días de apertura
3. Cómo llegar y distancia desde Ciudad Valles
4. 3 preguntas frecuentes de viajeros
5. Un dato único que otros blogs no cubran
Solo datos concretos, sin introducción.`;

  const result = await callWithSearch(prompt, 500).catch(() => "");
  if (result) console.log(`   ✅ Investigación completa (${result.length} chars)`);
  return result;
}

// ── Validar links internos contra posts existentes ──────────

function validateInternalLinks(content, postsExistentes, siteUrl) {
  const escapedUrl = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blogLinkRegex = new RegExp(
    `href=["']${escapedUrl}/blog/([a-z0-9-]+)["']`, "gi"
  );
  const existingSlugs = new Set(postsExistentes.map(p => p.slug));
  let validCount = 0;
  let totalCount = 0;

  const fixed = content.replace(blogLinkRegex, (match, slug) => {
    totalCount++;
    if (existingSlugs.has(slug)) {
      validCount++;
      return match;
    }
    console.warn(`   ⚠️  Slug no verificado: /blog/${slug}`);
    if (/tour|guia|precio|reserva|actividad|cascada|rafting|aventura/.test(slug)) {
      return `href="${siteUrl}/tours"`;
    }
    if (/itinerario|ruta|plan|dia/.test(slug)) {
      return `href="${siteUrl}/itinerarios"`;
    }
    return `href="${siteUrl}/blog"`;
  });

  return { content: fixed, validCount, totalCount };
}

// ── Corrección 1: Verificar keyword density ─────────────────

function checkKeywordDensity(content, keyword) {
  const text = content.replace(/<[^>]+>/g, " ").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const kw = keyword.toLowerCase();
  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const occurrences = (text.match(new RegExp(escapedKw, "gi")) || []).length;
  const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0;

  return { occurrences, wordCount, density };
}

// ── Corrección 5: Validar word count ANTES de publicar ──────

function validateWordCount(contentHtml) {
  const text = contentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*`\[\]]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 0);
  const wordCount = text.length;

  if (wordCount > 1100) {
    return { valid: false, wordCount, excess: wordCount - 1100, action: "trim_required" };
  }
  if (wordCount < 950) {
    return { valid: false, wordCount, deficit: 950 - wordCount, action: "expand_required" };
  }
  return { valid: true, wordCount };
}

// ── Corrección 5: Corregir word count con segunda llamada LLM ──

async function correctWordCount(contentHtml, validation, topic) {
  const { action, wordCount } = validation;

  let instruction;
  if (action === "trim_required") {
    instruction = `El artículo tiene ${wordCount} palabras. Necesito que lo recortes a máximo 1,100 palabras. Elimina texto en este orden de prioridad:
1. Frases adjetivas no esenciales en el cuerpo
2. Párrafos que repitan información ya dicha en otra sección
3. Detalles secundarios dentro de H3
Nunca elimines: los primeros 3 párrafos del intro, secciones FAQ, bloques con class="cta-block".
Devuelve SOLO el HTML corregido, sin explicaciones ni markdown fences.`;
  } else {
    instruction = `El artículo tiene ${wordCount} palabras. Necesito expandirlo a mínimo 950 palabras añadiendo contenido útil. Añade en este orden:
1. Un dato concreto adicional (precio, horario o distancia) en la sección más corta
2. Una frase de contexto local en el intro
3. Una pregunta adicional en el FAQ con formato <details><summary><strong>pregunta</strong></summary><p>respuesta</p></details>
Devuelve SOLO el HTML corregido, sin explicaciones ni markdown fences.`;
  }

  console.log(`   ⏳ Pausa de 10s antes de corrección word count...`);
  await sleep(10000);

  const response = await callWithRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 5000,
    messages: [{
      role: "user",
      content: `${instruction}\n\n---\n\n${contentHtml}`,
    }],
  }));

  let corrected = (response.content[0]?.text || "").trim();
  corrected = corrected.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();
  return corrected;
}

// ── Corrección 3: CTAs como HTML directo ────────────────────

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

// ── Redactar artículo ───────────────────────────────────────

async function writeArticle(topic, researchContext, images, postsExistentes) {
  console.log(`\n✍️  Redactando artículo E-E-A-T (950–1,100 palabras)...`);

  const year = new Date().getFullYear();
  const slug = generateSlug(topic.title, topic.focusKeyword, year);

  // Corrección 2: Validar slug
  validateSlug(slug, topic.focusKeyword);
  console.log(`   🔗 Slug generado: ${slug}`);

  // Slugs verificados para links internos
  const verifiedSlugs = postsExistentes.map(p => `/blog/${p.slug}`).join(", ") || "(ninguno aún)";

  // Corrección 1: Calcular keyword target count
  const kwWordCount = topic.focusKeyword.split(/\s+/).length;
  const keywordTargetCount = kwWordCount >= 2
    ? Math.round(1000 * 0.012)  // 12 para multi-word
    : Math.round(1000 * 0.014); // 14 para single-word
  const lsiList = (topic.secondaryKeywords || []).join(", ");

  const prompt = `Escribe un artículo HTML para huasteca-potosina.com. ESTRICTAMENTE 950–1100 palabras.

TEMA: ${topic.title}
KEYWORD: ${topic.focusKeyword}
SECUNDARIAS: ${topic.secondaryKeywords.join(", ")}
URL: ${SITE_URL}
IMAGEN CUERPO: <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />

CONTEXTO:
${researchContext || "(Usa tu conocimiento)"}

LINKS INTERNOS VERIFICADOS (SOLO enlazar a estos): ${verifiedSlugs}
Si necesitas enlazar a un blog pero no existe slug verificado, usa ${SITE_URL}/tours (actividades) o ${SITE_URL}/itinerarios (planificación) o ${SITE_URL}/blog (general). NUNCA inventes un slug.

KEYWORD DENSITY — INSTRUCCIÓN DURANTE REDACCIÓN:

La keyword principal de este artículo es: "${topic.focusKeyword}"
Debes usarla exactamente ${keywordTargetCount} veces en el artículo.

Distribución obligatoria:
- 1 vez en el H1
- 2 veces en los primeros 150 palabras del intro
- 1 vez en el alt tag de la imagen hero
- 1 vez en al menos un H2
- El resto distribuido naturalmente en el cuerpo

Para las demás apariciones, usa estas variantes y sinónimos:
${lsiList}

Antes de terminar, cuenta las ocurrencias de "${topic.focusKeyword}".
Si el conteo es menor a 8 o mayor a 14, ajusta el texto antes de entregar.

WORD COUNT — INSTRUCCIÓN DURANTE REDACCIÓN:
Antes de entregar el artículo, cuenta las palabras del HTML (sin tags).
Si supera 1100, recorta párrafos redundantes del cuerpo. NUNCA recortes intro, FAQ ni schema.
Si es menor a 950, añade un dato concreto en la sección más corta.

ESTRUCTURA (SIN <h1>, el sitio lo pone):
1. INTRO: 3 párrafos. P1=gancho con keyword. P2=solución. P3=incluir textual: "En huasteca-potosina.com trabajamos con guías y operadores locales de la región. Esta guía se actualiza con experiencias reales de quienes recorren la Huasteca Potosina cada semana." + <a href="${SITE_URL}/itinerarios">planea tu itinerario</a>
2. SECCIÓN 1: H2 + 2 H3s con datos concretos. Cada H3 termina con enlace verificado.
3. SECCIÓN 2: H2 + <figure> con la imagen cuerpo + 2 H3s
4. SECCIÓN 3: H2 consejos prácticos con 2-3 enlaces verificados.
5. FAQ: H2 "Preguntas frecuentes sobre ${topic.focusKeyword}" + 4 <details><summary><strong>pregunta</strong></summary><p>respuesta máx 60 palabras</p></details>

NO incluyas bloques CTA (los agrego yo después). NO uses <h1>. Usa <strong> en cada sección. "Huasteca Potosina" 5-9 veces. Incluye mín 2 enlaces a ${SITE_URL}/tours.
NUNCA uses: "increíble experiencia", "sin duda alguna", "joya escondida", "paraíso terrenal", "de ensueño", "clic aquí".
Enlaces externos solo: laspozasxilitla.org.mx, google.com/maps, inah.gob.mx con rel="noopener nofollow".

Respuesta: JSON puro sin markdown.
{"slug":"${slug}","metaTitle":"máx 60 chars con keyword y ${year}","title":"H1 completo","metaDescription":"140-155 chars","focusKeyword":"${topic.focusKeyword}","secondaryKeywords":${JSON.stringify(topic.secondaryKeywords)},"excerpt":"2 líneas","content":"HTML completo sin CTAs","tags":["Huasteca Potosina","${topic.category}","tag3"],"readingTime":7}`;

  console.log(`   ⏳ Pausa de 15s antes de redactar...`);
  await sleep(15000);

  const response = await callWithRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 5000,
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

  // Corrección 2: Forzar slug generado
  post.slug = slug;

  // Validar links internos
  if (post.content) {
    const linkCheck = validateInternalLinks(post.content, postsExistentes, SITE_URL);
    post.content = linkCheck.content;
    post._linkValidation = linkCheck;
  }

  // Corrección 3: Inyectar CTAs como HTML directo (segmentos)
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

  // Campos adicionales
  post.coverImageUrl   = images.hero.url;
  post.coverImageAlt   = images.hero.alt;
  post.coverImageFile  = `${slug}.jpg`;
  post.internalLinks   = post.internalLinks || [`${SITE_URL}/tours`, `${SITE_URL}/itinerarios`];
  post.externalSources = post.externalSources || [];
  post.schemaType      = "BlogPosting+FAQPage";

  // Categoría por regla semántica
  const inferredCategory = inferCategoryByKeyword(
    topic.focusKeyword, topic.title, topic.secondaryKeywords || []
  );
  post.tags = [
    "Huasteca Potosina",
    inferredCategory,
    ...(post.tags || []).filter(t => t !== "Huasteca Potosina" && t !== inferredCategory),
  ].slice(0, 5);
  post._category = inferredCategory;
  post._categorySource = "regla semántica";

  // Schema JSON-LD como objeto
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
    "keywords": [topic.focusKeyword, ...topic.secondaryKeywords].join(", "),
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

  let schemaJsonLd;
  if (faqItems.length > 0) {
    schemaJsonLd = [schemaBase, { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqItems }];
  } else {
    schemaJsonLd = schemaBase;
  }

  post.schemaMarkup  = JSON.stringify(schemaJsonLd);
  post._schemaJsonLd = schemaJsonLd;

  // Métricas
  const densityCheck = checkKeywordDensity(post.content || "", topic.focusKeyword);
  post._metrics = {
    wordCount: densityCheck.wordCount,
    keywordOccurrences: densityCheck.occurrences,
    keywordDensity: densityCheck.density,
    heroMatchScore: images.hero.matchScore,
    heroMatchOk: images.heroMatchOk,
    linkValidation: post._linkValidation || { validCount: 0, totalCount: 0 },
  };

  return post;
}

// ── Corrección 6: Marcar topic como usado en topics.json ────

function markTopicAsPublished(topicId, slug) {
  const topicsPath = path.join(__dirname, "topics.json");
  try {
    const raw = fs.readFileSync(topicsPath, "utf-8");
    const data = JSON.parse(raw);
    const calendario = data.calendario_editorial || {};

    let found = false;
    for (const [, mesData] of Object.entries(calendario)) {
      const articles = mesData?.articulos || [];
      for (const article of articles) {
        if (article.id === topicId) {
          article.estado = "publicado";
          article.slug_publicado = slug;
          article.fecha_publicacion = new Date().toISOString();
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      fs.writeFileSync(topicsPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`   ✅ Topic ${topicId} marcado como publicado en topics.json`);

      // Commit topics.json
      try {
        execSync(`git add topics.json && git commit -m "chore: marcar topic ${topicId} como publicado"`, {
          cwd: __dirname,
          stdio: "pipe",
        });
        console.log(`   ✅ Commit de topics.json realizado`);
      } catch {
        console.warn(`   ⚠️  No se pudo commitear topics.json (no fatal)`);
      }
    }
  } catch (e) {
    console.warn(`   ⚠️  No se pudo actualizar topics.json: ${e.message}`);
  }
}

function revertTopicState(topicId) {
  const topicsPath = path.join(__dirname, "topics.json");
  try {
    const raw = fs.readFileSync(topicsPath, "utf-8");
    const data = JSON.parse(raw);
    const calendario = data.calendario_editorial || {};

    for (const [, mesData] of Object.entries(calendario)) {
      for (const article of mesData?.articulos || []) {
        if (article.id === topicId) {
          article.estado = "pendiente";
          article.slug_publicado = null;
          article.fecha_publicacion = null;
          break;
        }
      }
    }

    fs.writeFileSync(topicsPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`   ↩️  Topic ${topicId} revertido a pendiente`);
  } catch {
    console.warn(`   ⚠️  No se pudo revertir topic ${topicId}`);
  }
}

// ── Publicar ────────────────────────────────────────────────

async function publishPost(post) {
  if (DRY_RUN) {
    console.log("\n🧪 DRY-RUN — Artículo NO publicado. Preview:\n");
    console.log(`Meta Título:  ${post.metaTitle}`);
    console.log(`H1:           ${post.title}`);
    console.log(`Slug:         ${post.slug}`);
    console.log(`Keyword:      ${post.focusKeyword}`);
    console.log(`Meta desc:    ${post.metaDescription}`);
    console.log(`Cover:        ${post.coverImageUrl}`);
    console.log(`Categoría:    ${post._category} (${post._categorySource})`);
    console.log(`\n--- CONTENT (900 chars) ---`);
    console.log(post.content?.slice(0, 900) + "...");
    console.log(`\n--- SCHEMA JSON-LD ---`);
    console.log(JSON.stringify(post._schemaJsonLd, null, 2).slice(0, 500));
    return { schemaVerified: true };
  }

  const res = await fetch(`${SITE_URL}/api/blog/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BLOG_SECRET}`,
    },
    body: JSON.stringify(post),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);

  console.log(`\n🚀 Publicado: ${SITE_URL}/blog/${data.post.slug}`);

  // Verificar schema JSON-LD en HTML publicado
  let schemaVerified = false;
  try {
    await sleep(3000);
    const htmlRes = await fetch(`${SITE_URL}/blog/${data.post.slug}`);
    const html = await htmlRes.text();
    schemaVerified = html.includes('type="application/ld+json"');
    if (!schemaVerified) {
      console.error("ERROR: schema JSON-LD no inyectado — publicación incompleta");
    }
  } catch (e) {
    console.warn(`   ⚠️  No se pudo verificar schema: ${e.message}`);
  }

  return { ...data.post, schemaVerified };
}

// ── Corrección 7: Log de métricas ───────────────────────────

function printQualityLog(post, publishResult) {
  const m = post._metrics;
  const issues = [];

  console.log("\n" + "─".repeat(55));
  console.log("📊 MÉTRICAS DE CALIDAD");
  console.log("─".repeat(55));

  const wcOk = m.wordCount >= 950 && m.wordCount <= 1100;
  console.log(`${wcOk ? "✅" : "❌"} Word count: ${m.wordCount} palabras (${wcOk ? "dentro de rango 950-1100" : "FUERA de rango 950-1100"})`);
  if (!wcOk) issues.push(`Word count ${m.wordCount}`);

  const kdOk = m.keywordOccurrences >= 8 && m.keywordOccurrences <= 14;
  const kdStatus = m.keywordOccurrences > 14 ? "SOBREOPTIMIZADO" : m.keywordOccurrences < 8 ? "BAJO" : "ok";
  console.log(`${kdOk ? "✅" : "❌"} Keyword density: ${m.keywordOccurrences} ocurrencias / ${m.wordCount} palabras = ${m.keywordDensity.toFixed(1)}% (${kdStatus})`);
  if (!kdOk) issues.push(`Keyword density: ${m.keywordOccurrences} occ (${kdStatus})`);

  const imgOk = post.coverImageUrl && !post.coverImageUrl.includes("[repo]") && IMAGE_BASE_URL;
  console.log(`${imgOk ? "✅" : "❌"} Imágenes: URL ${imgOk ? "válida sin [repo] placeholder" : "CONTIENE [repo] o URL inválida"}`);
  if (!imgOk) issues.push("URL de imagen inválida");

  console.log(`${m.heroMatchOk ? "✅" : "⚠️"} Hero match: score ${m.heroMatchScore}% (${m.heroMatchOk ? "coincidencia temática OK" : "fallback geográfico"})`);

  const lv = m.linkValidation;
  const linksOk = lv.totalCount === 0 || lv.validCount === lv.totalCount;
  console.log(`${linksOk ? "✅" : "❌"} Links internos: ${lv.validCount} verificados / ${lv.totalCount} total`);
  if (!linksOk) issues.push(`Links: ${lv.totalCount - lv.validCount} no verificados (reemplazados)`);

  const schemaOk = publishResult?.schemaVerified ?? false;
  console.log(`${schemaOk ? "✅" : "❌"} Schema JSON-LD: ${schemaOk ? "inyectado en HTML publicado" : "NO confirmado en HTML"}`);
  if (!schemaOk && !DRY_RUN) issues.push("Schema JSON-LD no confirmado");

  console.log(`✅ Categoría: ${post._category} (asignada por ${post._categorySource})`);

  const ctaClassOk = (post.content || "").includes('class="cta-block');
  const ctaHasHeading = /class="cta-block[^"]*">[\s\S]*?<h[23]/i.test(post.content || "");
  console.log(`${ctaClassOk && !ctaHasHeading ? "✅" : "❌"} CTAs: ${ctaClassOk ? "clases CSS aplicadas" : "SIN clases"} | ${ctaHasHeading ? "CONTIENE headings" : "sin headings"}`);
  if (!ctaClassOk || ctaHasHeading) issues.push("CTAs sin clases o con headings");

  console.log(`✅ Slug: ${post.slug} (validado con keyword)`);

  if (issues.length > 0) {
    console.log(`\n⚠️  REQUIERE REVISIÓN MANUAL: ${issues.join(" | ")}`);
  } else {
    console.log(`\n🎯 Todas las verificaciones pasaron correctamente`);
  }
  console.log("─".repeat(55));

  return { issues };
}

// ── Main — Corrección 7: Pipeline reordenado ────────────────

async function main() {
  console.log("\n📝  BLOG AGENT — huasteca-potosina.com");
  console.log(`    E-E-A-T · Plataforma Regional · 950–1,100 palabras`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

  // Paso 0: Verificar GITHUB_REPO_NAME
  if (!GITHUB_REPO_NAME) {
    console.error("ERROR: GITHUB_REPO_NAME no definida — abortando publicación");
    process.exit(1);
  }
  console.log(`   🔗 Repo: ${GITHUB_REPO_NAME}`);
  console.log(`   🖼️  Image base: ${IMAGE_BASE_URL}`);

  // Paso 1: Cargar bancos de datos
  console.log("\n📂 Cargando bancos de datos...");
  loadDataBanks();
  const imagesBank = loadImagesBank();

  // Paso 2: Cargar posts existentes para links y slug dedup
  let postsExistentes = [];
  if (BLOG_SECRET) {
    try {
      const res = await fetch(`${SITE_URL}/api/blog/create`, {
        headers: { "Authorization": `Bearer ${BLOG_SECRET}` },
      });
      const data = await res.json();
      postsExistentes = data.posts || [];
      console.log(`\n📚 Posts existentes: ${postsExistentes.length}`);
      if (postsExistentes.length > 0) {
        console.log(`   Slugs: ${postsExistentes.map(p => p.slug).join(", ")}`);
      }
    } catch { /* continuar */ }
  }

  const usedSlugs = postsExistentes.map(p => p.slug);
  const topic = getDailyTopic(usedSlugs, CUSTOM_TOPIC);

  // Re-inferir categoría por regla semántica
  topic.category = inferCategoryByKeyword(
    topic.focusKeyword, topic.title, topic.secondaryKeywords || []
  );

  console.log(`\n📌 Tema:       ${topic.title}`);
  console.log(`🔑 Keyword:    ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría:  ${topic.category} (inferida por regla)`);

  // Paso 3: Investigación
  const researchContext = await doResearch(topic).catch(e => {
    console.warn(`⚠️  Búsqueda fallida: ${e.message}`);
    return "";
  });

  // Paso 4: Selección de imágenes
  const images = selectImages(topic, imagesBank);

  // Paso 5: Redactar artículo
  const post = await writeArticle(topic, researchContext, images, postsExistentes);

  // ── VALIDACIONES PRE-PUBLICACIÓN (Corrección 7: pasos 6-9) ──

  console.log("\n🔍 Validaciones pre-publicación...");

  // Paso 6: Validar word count → corregir si necesario (Corrección 5)
  let wcCheck = validateWordCount(post.content || "");
  if (!wcCheck.valid) {
    console.log(`   ⚠️  Word count ${wcCheck.wordCount} — ${wcCheck.action}`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`   🔄 Intento de corrección ${attempt}/2...`);
      const corrected = await correctWordCount(post.content, wcCheck, topic);
      if (corrected && corrected.length > 200) {
        post.content = corrected;
        wcCheck = validateWordCount(post.content);
        if (wcCheck.valid) {
          console.log(`   ✅ Word count corregido: ${wcCheck.wordCount}`);
          break;
        }
      }
      if (attempt === 2 && !wcCheck.valid) {
        console.warn(`   ⚠️  Word count fuera de rango tras 2 intentos (${wcCheck.wordCount})`);
      }
    }
  } else {
    console.log(`   ✅ Word count: ${wcCheck.wordCount} (OK)`);
  }
  // Actualizar métricas con word count final
  const finalDensity = checkKeywordDensity(post.content || "", topic.focusKeyword);
  post._metrics.wordCount = finalDensity.wordCount;
  post._metrics.keywordOccurrences = finalDensity.occurrences;
  post._metrics.keywordDensity = finalDensity.density;

  // Paso 7: Validar keyword density → loggear
  const kdOk = finalDensity.occurrences >= 8 && finalDensity.occurrences <= 14;
  console.log(`   ${kdOk ? "✅" : "⚠️"} Keyword density: ${finalDensity.occurrences} occ / ${finalDensity.wordCount} words = ${finalDensity.density.toFixed(1)}%`);

  // Paso 8: Validar slug (ya validado en writeArticle, pero doble check)
  try {
    validateSlug(post.slug, topic.focusKeyword);
    console.log(`   ✅ Slug: "${post.slug}" (keyword incluida)`);
  } catch (e) {
    console.error(`   ❌ ${e.message}`);
    process.exit(1);
  }

  // Paso 9: Validar que no hay [repo] en URLs
  if (post.coverImageUrl?.includes("[repo]") || (post.content || "").includes("[repo]")) {
    console.error("   ❌ URL contiene [repo] placeholder — abortando publicación");
    process.exit(1);
  }
  console.log(`   ✅ URLs: sin [repo] placeholder`);

  // ── Paso 10: Marcar topic como publicado (Corrección 6) ──
  const topicId = topic.id;
  if (topicId && !DRY_RUN) {
    markTopicAsPublished(topicId, post.slug);
  }

  // ── Paso 11: Publicar en CMS ──
  let publishResult;
  try {
    publishResult = await publishPost(post);
  } catch (e) {
    // Corrección 6: Revertir topic si publicación falla
    if (topicId && !DRY_RUN) {
      revertTopicState(topicId);
    }
    throw e;
  }

  // ── Paso 12: Verificar schema (ya ocurre dentro de publishPost) ──
  // ── Paso 13: Log de métricas finales (Corrección 7) ──
  printQualityLog(post, publishResult);

  console.log("\n" + "═".repeat(55));
  console.log("✅  Blog Agent completado.");
  console.log("═".repeat(55) + "\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
