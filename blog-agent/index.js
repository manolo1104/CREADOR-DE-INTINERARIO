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
import { getDailyTopic, inferCategoryByKeyword } from "./content-strategy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN      = process.argv.includes("--dry-run");
const TOPIC_IDX    = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL        = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET     = process.env.BLOG_AGENT_SECRET;

// ── Corrección 1: URL de imágenes desde GITHUB_REPO_NAME ────
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
        const wait = (i + 1) * 30000; // 30s, 60s
        console.log(`   ⏳ Rate limit — esperando ${wait / 1000}s...`);
        await sleep(wait);
      } else throw err;
    }
  }
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

// ── Corrección 1: Matching semántico para selección de imágenes ──

function computeSemanticScore(imageTema, articleTerms) {
  const temaWords = imageTema.toLowerCase().split(/\s+/);
  let matches = 0;
  for (const term of articleTerms) {
    if (temaWords.some(w => w.includes(term) || term.includes(w))) {
      matches++;
    }
  }
  return articleTerms.length > 0 ? matches / articleTerms.length : 0;
}

function selectImages(topic, imagesBank) {
  // Corrección 1: Abortar si no hay GITHUB_REPO_NAME
  if (!IMAGE_BASE_URL) {
    console.error("ERROR: GITHUB_REPO_NAME no definida — abortando publicación");
    process.exit(1);
  }

  const year = new Date().getFullYear();
  const articleTerms = [
    ...topic.focusKeyword.toLowerCase().split(/\s+/),
    ...(topic.secondaryKeywords || []).flatMap(k => k.toLowerCase().split(/\s+/)),
    ...topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

  // Filtrar imágenes hero vs gallery
  const heroImages = imagesBank.filter(img => img.filename.includes("hero"));
  const bodyImages = imagesBank.filter(img => !img.filename.includes("hero"));

  // Scoring semántico para hero
  let bestHero = null;
  let bestScore = 0;
  for (const img of heroImages) {
    const score = computeSemanticScore(img.tema, articleTerms);
    if (score > bestScore) {
      bestScore = score;
      bestHero = img;
    }
  }

  const heroMatchOk = bestScore >= 0.5;
  if (!heroMatchOk) {
    console.warn("WARN: imagen hero sin coincidencia temática — revisar banco de imágenes");
  }
  const hero = bestHero || heroImages[0] || imagesBank[0];

  // Body: mejor match que no sea del mismo folder que hero
  const heroFolder = hero.filename.split("/")[0];
  const bodyPool = bodyImages.filter(img => !img.filename.startsWith(heroFolder));
  let bestBody = null;
  let bestBodyScore = 0;
  for (const img of bodyPool.length > 0 ? bodyPool : bodyImages) {
    const score = computeSemanticScore(img.tema, articleTerms);
    if (score > bestBodyScore) {
      bestBodyScore = score;
      bestBody = img;
    }
  }
  const body = bestBody || bodyImages[0] || hero;

  const heroUrl = `${IMAGE_BASE_URL}${encodeURI(hero.filename)}`;
  const bodyUrl = `${IMAGE_BASE_URL}${encodeURI(body.filename)}`;

  // Corrección 1: Alt tag describe el tema del artículo cuando no hay coincidencia
  const heroAlt = heroMatchOk
    ? `${topic.focusKeyword} ${hero.descripcion} Huasteca Potosina ${year}`
    : `${topic.focusKeyword} Huasteca Potosina ${year}`;

  console.log(`\n🖼️  Imágenes seleccionadas:`);
  console.log(`   Hero: ${hero.filename} (score: ${(bestScore * 100).toFixed(0)}%)`);
  console.log(`   Body: ${body.filename} (score: ${(bestBodyScore * 100).toFixed(0)}%)`);

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

// ── PASO 1: Investigación (1 búsqueda compacta) ────────────

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

// ── Corrección 3: Validar links internos contra posts existentes ──

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
      return match; // OK — slug exists
    }
    // Corrección 3: Reemplazar slugs no verificados
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

// ── Corrección 4: Verificar keyword density ─────────────────

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

// ── PASOS 3 + 5–7: Redactar artículo + entregar JSON ───────

async function writeArticle(topic, researchContext, images, postsExistentes) {
  console.log(`\n✍️  Redactando artículo E-E-A-T (950–1,100 palabras)...`);

  const year  = new Date().getFullYear();
  const slug  = `${topic.focusKeyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${year}`;

  // Corrección 3: Slugs verificados para links internos
  const verifiedSlugs = postsExistentes.map(p => `/blog/${p.slug}`).join(", ") || "(ninguno aún)";

  // ── Corrección 6: CTAs con clases CSS — sin headings ──────

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
  <p class="cta-subtext">Tours con guías locales · Grupos reducidos · Sin estrés</p>
  <a href="${SITE_URL}/tours" class="cta-button cta-button--primary">Ver todos los tours →</a>
  <a href="${SITE_URL}/itinerarios" class="cta-button cta-button--secondary">Crear mi itinerario →</a>
</div>`;

  // ── Prompt con correcciones 4 + 5 (density + word count) ──

  const prompt = `Escribe un artículo HTML para huasteca-potosina.com. ESTRICTAMENTE 950–1100 palabras.

TEMA: ${topic.title}
KEYWORD: ${topic.focusKeyword} (usar entre 8 y 14 veces — NUNCA más de 14)
SECUNDARIAS: ${topic.secondaryKeywords.join(", ")}
URL: ${SITE_URL}
IMAGEN CUERPO: <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />

CONTEXTO:
${researchContext || "(Usa tu conocimiento)"}

LINKS INTERNOS VERIFICADOS (SOLO enlazar a estos): ${verifiedSlugs}
Si necesitas enlazar a un blog pero no existe slug verificado, usa ${SITE_URL}/tours (actividades) o ${SITE_URL}/itinerarios (planificación) o ${SITE_URL}/blog (general). NUNCA inventes un slug.

ESTRUCTURA (SIN <h1>, el sitio lo pone):
1. INTRO: 3 párrafos. P1=gancho con keyword. P2=solución. P3=incluir textual: "En huasteca-potosina.com trabajamos con guías y operadores locales de la región. Esta guía se actualiza con experiencias reales de quienes recorren la Huasteca Potosina cada semana." + <a href="${SITE_URL}/itinerarios">planea tu itinerario</a>
2. SECCIÓN 1: H2 + 2 H3s con datos concretos. Cada H3 termina con enlace verificado.
3. SECCIÓN 2: H2 + <figure> con la imagen cuerpo + 2 H3s
4. SECCIÓN 3: H2 consejos prácticos con 2-3 enlaces verificados.
5. FAQ: H2 "Preguntas frecuentes sobre ${topic.focusKeyword}" + 4 <details><summary><strong>pregunta</strong></summary><p>respuesta máx 60 palabras</p></details>

NO incluyas bloques CTA (los agrego yo después). NO uses <h1>. Usa <strong> en cada sección. "Huasteca Potosina" 5-9 veces. Incluye mín 2 enlaces a ${SITE_URL}/tours.
NUNCA uses: "increíble experiencia", "sin duda alguna", "joya escondida", "paraíso terrenal", "de ensueño", "clic aquí".
Enlaces externos solo: laspozasxilitla.org.mx, google.com/maps, inah.gob.mx con rel="noopener nofollow".

VERIFICACIÓN OBLIGATORIA ANTES DE ENTREGAR:
- Cuenta las palabras del HTML (sin tags): si supera 1100, recorta párrafos redundantes del cuerpo. NUNCA recortes intro, FAQ ni schema.
- Cuenta ocurrencias de "${topic.focusKeyword}": si supera 14, reemplaza excedentes con sinónimos del tema, pronombres contextuales o términos LSI. NUNCA elimines de H1, primeras 100 palabras ni alt tags.

Respuesta: JSON puro sin markdown.
{"slug":"${slug}","metaTitle":"máx 60 chars con keyword y ${year}","title":"H1 completo","metaDescription":"140-155 chars","focusKeyword":"${topic.focusKeyword}","secondaryKeywords":${JSON.stringify(topic.secondaryKeywords)},"excerpt":"2 líneas","content":"HTML completo","tags":["Huasteca Potosina","${topic.category}","tag3"],"readingTime":7}`;

  // Esperar 15s para no pegar el rate limit tras la búsqueda
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

  // ── Corrección 3: Validar links internos ──
  if (post.content) {
    const linkCheck = validateInternalLinks(post.content, postsExistentes, SITE_URL);
    post.content = linkCheck.content;
    post._linkValidation = linkCheck;
  }

  // ── Corrección 6: Inyectar CTAs con clases CSS ──
  if (post.content) {
    const lastH2 = post.content.lastIndexOf("<h2>");
    if (lastH2 > 0) {
      post.content = post.content.slice(0, lastH2)
        + CTA_TOURS + "\n" + CTA_ITINERARIO + "\n"
        + post.content.slice(lastH2);
    }
    post.content += "\n" + CTA_FINAL;
  }

  // ── Campos adicionales ──
  post.coverImageUrl   = images.hero.url;
  post.coverImageAlt   = images.hero.alt;
  post.coverImageFile  = `${slug}.jpg`;
  post.internalLinks   = post.internalLinks || [`${SITE_URL}/tours`, `${SITE_URL}/itinerarios`];
  post.externalSources = post.externalSources || [];
  post.schemaType      = "BlogPosting+FAQPage";

  // ── Corrección 7: Categoría por regla semántica ──
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

  // ── Corrección 2: Schema JSON-LD como objeto separado ──
  const schemaBase = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title || topic.title,
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Huasteca Potosina",
      "url": SITE_URL,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Huasteca Potosina",
      "url": SITE_URL,
    },
    "description": post.metaDescription || "",
    "image": images.hero.url,
    "keywords": [topic.focusKeyword, ...topic.secondaryKeywords].join(", "),
    "articleSection": inferredCategory,
  };

  // Extraer FAQ items del content para FAQPage schema
  const faqMatches = [...(post.content || "").matchAll(
    /<details>\s*<summary>\s*<strong>(.*?)<\/strong>\s*<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi
  )];
  const faqItems = faqMatches.map(m => ({
    "@type": "Question",
    "name": m[1].replace(/<[^>]+>/g, "").trim(),
    "acceptedAnswer": {
      "@type": "Answer",
      "text": m[2].replace(/<[^>]+>/g, "").trim(),
    },
  }));

  // schema_jsonld como OBJETO (no string) — Corrección 2
  let schemaJsonLd;
  if (faqItems.length > 0) {
    schemaJsonLd = [schemaBase, { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqItems }];
  } else {
    schemaJsonLd = schemaBase;
  }

  // Para el API (string) y para verificación/output (objeto)
  post.schemaMarkup  = JSON.stringify(schemaJsonLd);
  post._schemaJsonLd = schemaJsonLd;

  // ── Corrección 4 + 5: Métricas de calidad ──
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
    return { schemaVerified: true }; // DRY_RUN — skip verification
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

  // ── Corrección 2: Verificar schema JSON-LD en HTML publicado ──
  let schemaVerified = false;
  try {
    await sleep(3000); // esperar a que Next.js regenere
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

// ── Corrección 9: Log de métricas de calidad ────────────────

function printQualityLog(post, publishResult) {
  const m = post._metrics;
  const issues = [];

  console.log("\n" + "─".repeat(55));
  console.log("📊 MÉTRICAS DE CALIDAD");
  console.log("─".repeat(55));

  // Corrección 5: Word count
  const wcOk = m.wordCount >= 950 && m.wordCount <= 1100;
  console.log(`${wcOk ? "✅" : "❌"} Word count: ${m.wordCount} palabras (${wcOk ? "dentro de rango 950-1100" : "FUERA de rango 950-1100"})`);
  if (!wcOk) issues.push(`Word count ${m.wordCount}`);

  // Corrección 4: Keyword density
  const kdOk = m.keywordOccurrences >= 8 && m.keywordOccurrences <= 14;
  const kdStatus = m.keywordOccurrences > 14 ? "SOBREOPTIMIZADO" : m.keywordOccurrences < 8 ? "BAJO" : "ok";
  console.log(`${kdOk ? "✅" : "❌"} Keyword density: ${m.keywordOccurrences} ocurrencias / ${m.wordCount} palabras = ${m.keywordDensity.toFixed(1)}% (${kdStatus})`);
  if (!kdOk) issues.push(`Keyword density: ${m.keywordOccurrences} occ (${kdStatus})`);

  // Corrección 1: Imágenes
  const imgOk = post.coverImageUrl && !post.coverImageUrl.includes("[repo]") && IMAGE_BASE_URL;
  console.log(`${imgOk ? "✅" : "❌"} Imágenes: URL ${imgOk ? "válida sin [repo] placeholder" : "CONTIENE [repo] o URL inválida"}`);
  if (!imgOk) issues.push("URL de imagen con [repo] placeholder");

  // Corrección 1: Hero match
  console.log(`${m.heroMatchOk ? "✅" : "⚠️"} Hero match: score ${(m.heroMatchScore * 100).toFixed(0)}% (${m.heroMatchOk ? "coincidencia temática OK" : "sin coincidencia >50%"})`);

  // Corrección 3: Links internos
  const lv = m.linkValidation;
  const linksOk = lv.totalCount === 0 || lv.validCount === lv.totalCount;
  console.log(`${linksOk ? "✅" : "❌"} Links internos: ${lv.validCount} verificados / ${lv.totalCount} total`);
  if (!linksOk) issues.push(`Links: ${lv.totalCount - lv.validCount} no verificados (reemplazados)`);

  // Corrección 2: Schema
  const schemaOk = publishResult?.schemaVerified ?? false;
  console.log(`${schemaOk ? "✅" : "❌"} Schema JSON-LD: ${schemaOk ? "inyectado en HTML publicado" : "NO confirmado en HTML"}`);
  if (!schemaOk && !DRY_RUN) issues.push("Schema JSON-LD no confirmado");

  // Corrección 7: Categoría
  console.log(`✅ Categoría: ${post._category} (asignada por ${post._categorySource})`);

  // Corrección 6: CTAs
  const ctaClassOk = (post.content || "").includes('class="cta-block');
  const ctaHasHeading = /class="cta-block[^"]*">[\s\S]*?<h[23]/i.test(post.content || "");
  console.log(`${ctaClassOk && !ctaHasHeading ? "✅" : "❌"} CTAs: ${ctaClassOk ? "clases CSS aplicadas" : "SIN clases"} | ${ctaHasHeading ? "CONTIENE headings" : "sin headings"}`);
  if (!ctaClassOk || ctaHasHeading) issues.push("CTAs sin clases o con headings");

  // Resumen
  if (issues.length > 0) {
    console.log(`\n⚠️  REQUIERE REVISIÓN MANUAL: ${issues.join(" | ")}`);
  } else {
    console.log(`\n🎯 Todas las verificaciones pasaron correctamente`);
  }
  console.log("─".repeat(55));

  // Errores críticos que detienen pipeline
  const criticalErrors = [];
  if (!imgOk) criticalErrors.push("imagen rota");
  if (!schemaOk && !DRY_RUN) criticalErrors.push("schema no inyectado");
  if (!post.slug) criticalErrors.push("slug inválido");

  return { issues, criticalErrors };
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("\n📝  BLOG AGENT — huasteca-potosina.com");
  console.log(`    E-E-A-T · Plataforma Regional · 950–1,100 palabras`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

  // Corrección 1: Verificar GITHUB_REPO_NAME al inicio
  if (!GITHUB_REPO_NAME) {
    console.error("ERROR: GITHUB_REPO_NAME no definida — abortando publicación");
    process.exit(1);
  }
  console.log(`   🔗 Repo: ${GITHUB_REPO_NAME}`);
  console.log(`   🖼️  Image base: ${IMAGE_BASE_URL}`);

  // Cargar bancos de datos
  console.log("\n📂 Cargando bancos de datos...");
  loadDataBanks();
  const imagesBank = loadImagesBank();

  // Corrección 3: Cargar posts existentes para validar links
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

  // Corrección 7: Re-inferir categoría por regla semántica
  topic.category = inferCategoryByKeyword(
    topic.focusKeyword, topic.title, topic.secondaryKeywords || []
  );

  console.log(`\n📌 Tema:       ${topic.title}`);
  console.log(`🔑 Keyword:    ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría:  ${topic.category} (inferida por regla)`);

  // Paso 1: Investigación
  const researchContext = await doResearch(topic).catch(e => {
    console.warn(`⚠️  Búsqueda fallida: ${e.message}`);
    return "";
  });

  // Paso 2: Selección de imágenes (Corrección 1: semántico)
  const images = selectImages(topic, imagesBank);

  // Paso 3: Redactar y estructurar
  const post = await writeArticle(topic, researchContext, images, postsExistentes);

  // Publicar
  const publishResult = await publishPost(post);

  // Corrección 9: Log de métricas de calidad
  const { criticalErrors } = printQualityLog(post, publishResult);

  console.log("\n" + "═".repeat(55));
  if (criticalErrors.length > 0) {
    console.error(`❌ ERRORES CRÍTICOS: ${criticalErrors.join(", ")}`);
    console.error("   La publicación requiere intervención manual.");
  } else {
    console.log("✅  Blog Agent completado.");
  }
  console.log("═".repeat(55) + "\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
