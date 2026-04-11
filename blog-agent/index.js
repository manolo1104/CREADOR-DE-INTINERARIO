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
import { getDailyTopic } from "./content-strategy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN      = process.argv.includes("--dry-run");
const TOPIC_IDX    = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL        = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET     = process.env.BLOG_AGENT_SECRET;
const GITHUB_RAW_BASE = process.env.GITHUB_RAW_BASE || "https://raw.githubusercontent.com/[repo]/main/IMAGENES";

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

// Solo imágenes locales desde /IMAGENES

// ── Mapa keyword → carpeta IMAGENES ────────────────────────

const IMAGE_FOLDER_MAP = {
  "cascada de tamul": "CASCADA DE TAMUL",
  "tamul": "CASCADA DE TAMUL",
  "rio tampaon": "RIO TAMPAON",
  "tampaon": "RIO TAMPAON",
  "rafting": "RIO TAMPAON",
  "cascadas de micos": "CASCADAS DE MICOS",
  "micos": "CASCADAS DE MICOS",
  "cascada minas viejas": "CASCADA MINAS VIEJAS",
  "minas viejas": "CASCADA MINAS VIEJAS",
  "rappel": "CASCADA MINAS VIEJAS",
  "cascada el meco": "CASCADA EL MECO",
  "el meco": "CASCADA EL MECO",
  "cascada el salto": "CASCADA EL SALTO",
  "el salto": "CASCADA EL SALTO",
  "puente de dios": "PUENTE DE DIOS",
  "tamasopo": "TAMASOPO",
  "cascadas de tamasopo": "TAMASOPO",
  "sotano de las golondrinas": "SOTANO DE LAS GOLONDRINAS",
  "golondrinas": "SOTANO DE LAS GOLONDRINAS",
  "sotano de las huahuas": "SOTANO DE LAS HUAHUAS",
  "huahuas": "SOTANO DE LAS HUAHUAS",
  "las pozas": "JARDIN DE EDWARD JAMES",
  "edward james": "JARDIN DE EDWARD JAMES",
  "xilitla": "JARDIN DE EDWARD JAMES",
  "jardin surrealista": "JARDIN DE EDWARD JAMES",
  "nacimiento de huichihuayan": "NACIMIENTO DE HUICHIHUAYAN",
  "huichihuayan": "NACIMIENTO DE HUICHIHUAYAN",
  "balneario taninul": "BALNEARIO TANINUL",
  "taninul": "BALNEARIO TANINUL",
  "laguna media luna": "LAGUNA MEDIA LUNA",
  "media luna": "LAGUNA MEDIA LUNA",
  "tamtoc": "ZONA ARQUEOLOGICA TAMTOC",
  "zona arqueologica tamtoc": "ZONA ARQUEOLOGICA TAMTOC",
  "cuevas de mantetzulel": "CUEVAS DE MANTETZULEL",
  "mantetzulel": "CUEVAS DE MANTETZULEL",
  "tambaque": "TAMBAQUE",
  "voladores": "VOLADORES DE TAMALETON",
};

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

// ── Imágenes desde banco local ──────────────────────────────

function getLocalImages(topic) {
  const IMAGENES_ROOT = path.join(__dirname, "..", "IMAGENES");

  // Intentar encontrar carpeta usando el mapa
  const searchTerms = [
    topic.focusKeyword.toLowerCase(),
    topic.title.toLowerCase(),
    ...(topic.secondaryKeywords || []).map(k => k.toLowerCase()),
  ];

  let folderName = null;
  for (const term of searchTerms) {
    // Buscar coincidencia directa
    if (IMAGE_FOLDER_MAP[term]) {
      folderName = IMAGE_FOLDER_MAP[term];
      break;
    }
    // Buscar coincidencia parcial
    for (const [key, val] of Object.entries(IMAGE_FOLDER_MAP)) {
      if (term.includes(key) || key.includes(term)) {
        folderName = val;
        break;
      }
    }
    if (folderName) break;
  }

  if (!folderName) return null;

  const folderPath = path.join(IMAGENES_ROOT, folderName);
  if (!fs.existsSync(folderPath)) return null;

  const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
  let files;
  try {
    files = fs.readdirSync(folderPath).filter(f =>
      IMAGE_EXTS.includes(path.extname(f).toLowerCase())
    );
  } catch {
    return null;
  }

  if (files.length === 0) return null;

  // Hero: preferir PORTADA.jpg (case-insensitive) o primer archivo
  const portadaFile = files.find(f => f.toUpperCase() === "PORTADA.JPG") || files[0];
  const heroFilename = portadaFile;

  // Body: un archivo diferente al hero (aleatorio del resto)
  const remaining = files.filter(f => f !== heroFilename);
  const bodyFilename = remaining.length > 0
    ? remaining[Math.floor(Math.random() * remaining.length)]
    : heroFilename;

  const makeUrl = (filename) =>
    `${GITHUB_RAW_BASE}/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`;

  return {
    hero: {
      url: makeUrl(heroFilename),
      alt: `${topic.focusKeyword} Huasteca Potosina ${new Date().getFullYear()}`,
      filename: heroFilename,
      folder: folderName,
    },
    body: {
      url: makeUrl(bodyFilename),
      alt: `${topic.secondaryKeywords?.[0] || topic.focusKeyword} guía viaje Huasteca Potosina`,
      filename: bodyFilename,
      folder: folderName,
    },
  };
}

function getAnyLocalImages(topic) {
  const IMAGENES_ROOT = path.join(__dirname, "..", "IMAGENES");
  if (!fs.existsSync(IMAGENES_ROOT)) return null;

  const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
  const folders = fs.readdirSync(IMAGENES_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.toLowerCase().startsWith("copia de"))
    .map(d => d.name);

  const all = [];
  for (const folderName of folders) {
    const folderPath = path.join(IMAGENES_ROOT, folderName);
    try {
      const files = fs.readdirSync(folderPath)
        .filter(f => IMAGE_EXTS.includes(path.extname(f).toLowerCase()));
      for (const filename of files) all.push({ folderName, filename });
    } catch {
      // continuar
    }
  }

  if (all.length === 0) return null;

  const heroPick = all[Math.floor(Math.random() * all.length)];
  const remaining = all.filter(x => !(x.folderName === heroPick.folderName && x.filename === heroPick.filename));
  const bodyPick = remaining.length > 0
    ? remaining[Math.floor(Math.random() * remaining.length)]
    : heroPick;

  const makeUrl = (folderName, filename) =>
    `${GITHUB_RAW_BASE}/${encodeURIComponent(folderName)}/${encodeURIComponent(filename)}`;

  return {
    hero: {
      url: makeUrl(heroPick.folderName, heroPick.filename),
      alt: `${topic.focusKeyword} Huasteca Potosina ${new Date().getFullYear()}`,
      filename: heroPick.filename,
      folder: heroPick.folderName,
    },
    body: {
      url: makeUrl(bodyPick.folderName, bodyPick.filename),
      alt: `${topic.secondaryKeywords?.[0] || topic.focusKeyword} guía viaje Huasteca Potosina`,
      filename: bodyPick.filename,
      folder: bodyPick.folderName,
    },
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

// ── Selección de imágenes: SOLO local ──

async function selectImages(topic) {
  console.log(`\n🖼️  Seleccionando imágenes para: "${topic.focusKeyword}"...`);

  const local = getLocalImages(topic);
  if (local) {
    console.log(`   Imágenes del banco local: ${local.hero.filename} / ${local.body.filename}`);
    return local;
  }

  console.log(`   Sin coincidencia por tema — usando fallback local de /IMAGENES...`);
  const anyLocal = getAnyLocalImages(topic);
  if (anyLocal) {
    console.log(`   Fallback local: ${anyLocal.hero.filename} / ${anyLocal.body.filename}`);
    return anyLocal;
  }

  throw new Error("No se encontraron imágenes en la carpeta IMAGENES");
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

// ── PASOS 3 + 5–7: Redactar artículo + entregar JSON ───────

async function writeArticle(topic, researchContext, images) {
  console.log(`\n✍️  Redactando artículo E-E-A-T (950–1,100 palabras)...`);

  const year  = new Date().getFullYear();
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const slug  = `${topic.focusKeyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${year}`;

  // Schema BlogPosting base (se completa tras parsear JSON de Claude)
  const schemaBase = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": topic.title,
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
    "description": "",
    "image": images.hero.url,
    "keywords": [topic.focusKeyword, ...topic.secondaryKeywords].join(", "),
    "articleSection": topic.category,
  };

  // CTAs se inyectan programáticamente después — no gastar tokens pidiéndolos a Claude
  const CTA_TOURS = `<div class="cta-tours" style="background:#00B4D8;padding:24px;border-radius:8px;margin:32px 0;text-align:center;"><p><strong>¿Quieres vivir ${topic.focusKeyword} con guía experto?</strong></p><p>Tours desde la Huasteca Potosina. Grupos pequeños, guías locales y traslados incluidos.</p><a href="${SITE_URL}/tours" style="background:#fff;color:#00B4D8;padding:12px 28px;border-radius:4px;font-weight:bold;text-decoration:none;">Ver tours disponibles →</a></div>`;

  const CTA_ITINERARIO = `<div class="cta-itinerario" style="background:#f0f9ff;padding:20px;border-radius:8px;margin:24px 0;text-align:center;"><p><strong>¿Ya tienes tu itinerario para la Huasteca?</strong></p><p>Nuestro planificador con IA arma tu recorrido en minutos.</p><a href="${SITE_URL}/itinerarios" style="background:#2D6A4F;color:#fff;padding:12px 28px;border-radius:4px;font-weight:bold;text-decoration:none;">Crear mi itinerario gratis →</a></div>`;

  const CTA_FINAL = `<div class="cta-final" style="background:#2D6A4F;color:#fff;padding:32px;border-radius:8px;margin:40px 0;text-align:center;"><h3 style="color:#fff;margin-bottom:8px;">Reserva tu experiencia en la Huasteca Potosina</h3><p>Tours con guías locales · Grupos reducidos · Sin estrés</p><div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:16px;"><a href="${SITE_URL}/tours" style="background:#00B4D8;color:#fff;padding:14px 32px;border-radius:4px;font-weight:bold;text-decoration:none;">Ver todos los tours →</a><a href="${SITE_URL}/itinerarios" style="background:transparent;color:#fff;padding:14px 32px;border-radius:4px;font-weight:bold;text-decoration:none;border:2px solid #fff;">Crear mi itinerario →</a></div></div>`;

  const prompt = `Escribe un artículo HTML para huasteca-potosina.com. 950–1100 palabras.

TEMA: ${topic.title}
KEYWORD: ${topic.focusKeyword} (usar 8–12 veces)
SECUNDARIAS: ${topic.secondaryKeywords.join(", ")}
URL: ${SITE_URL}
IMAGEN CUERPO: <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />

CONTEXTO:
${researchContext || "(Usa tu conocimiento)"}

ESTRUCTURA (SIN <h1>, el sitio lo pone):
1. INTRO: 3 párrafos. P1=gancho con keyword. P2=solución. P3=incluir textual: "En huasteca-potosina.com trabajamos con guías y operadores locales de la región. Esta guía se actualiza con experiencias reales de quienes recorren la Huasteca Potosina cada semana." + <a href="${SITE_URL}/itinerarios">planea tu itinerario</a>
2. SECCIÓN 1: H2 + 2 H3s con datos concretos. Cada H3 termina con enlace a ${SITE_URL}/tours o ${SITE_URL}/blog/[slug]
3. SECCIÓN 2: H2 + <figure> con la imagen cuerpo + 2 H3s
4. SECCIÓN 3: H2 consejos prácticos con 2-3 enlaces a ${SITE_URL}/blog/[otros-destinos]
5. FAQ: H2 "Preguntas frecuentes sobre ${topic.focusKeyword}" + 4 <details><summary><strong>pregunta</strong></summary><p>respuesta máx 60 palabras</p></details>

NO incluyas bloques CTA (los agrego yo después). NO uses <h1>. Usa <strong> en cada sección. "Huasteca Potosina" 5-9 veces. Incluye mín 2 enlaces a ${SITE_URL}/tours.
NUNCA uses: "increíble experiencia", "sin duda alguna", "joya escondida", "paraíso terrenal", "de ensueño", "clic aquí".
Enlaces externos solo: laspozasxilitla.org.mx, google.com/maps, inah.gob.mx con rel="noopener nofollow".

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

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude no devolvió JSON válido");

  let post;
  try {
    post = JSON.parse(match[0]);
  } catch {
    console.warn("⚠️  JSON incompleto, reparando...");
    let partial = match[0];
    let b = 0, br = 0;
    for (const ch of partial) {
      if (ch === "{") b++; else if (ch === "}") b--;
      if (ch === "[") br++; else if (ch === "]") br--;
    }
    post = JSON.parse(partial + "]".repeat(Math.max(0, br)) + "}".repeat(Math.max(0, b)));
    console.warn("✅ JSON reparado");
  }

  // ── Inyectar CTAs programáticamente ──
  if (post.content) {
    // Insertar CTAs antes del FAQ (antes del último <h2>)
    const lastH2 = post.content.lastIndexOf("<h2>");
    if (lastH2 > 0) {
      post.content = post.content.slice(0, lastH2) + CTA_TOURS + "\n" + CTA_ITINERARIO + "\n" + post.content.slice(lastH2);
    }
    // Agregar CTA final al cierre
    post.content += "\n" + CTA_FINAL;
  }

  // ── Campos adicionales generados programáticamente ──

  // Imágenes
  post.coverImageUrl  = images.hero.url;
  post.coverImageAlt  = images.hero.alt;
  post.coverImageFile = `${slug}.jpg`;
  post.internalLinks  = post.internalLinks || [`${SITE_URL}/tours`, `${SITE_URL}/itinerarios`];
  post.externalSources = post.externalSources || [];
  post.schemaType     = "BlogPosting+FAQPage";

  // Schema: BlogPosting base
  schemaBase.headline    = post.title || topic.title;
  schemaBase.description = post.metaDescription || "";

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

  if (faqItems.length > 0) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems,
    };
    post.schemaMarkup = JSON.stringify([schemaBase, faqSchema]);
  } else {
    post.schemaMarkup = JSON.stringify(schemaBase);
  }

  const wordCount = (post.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log(`✅ Artículo listo: "${post.title}"`);
  console.log(`   ~${wordCount} palabras | ${post.readingTime} min | keyword: ${post.focusKeyword}`);
  if (wordCount < 800)  console.warn(`⚠️  Artículo corto (${wordCount} palabras)`);
  if (wordCount > 1300) console.warn(`⚠️  Artículo muy largo (${wordCount} palabras)`);

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
    console.log(`\n--- CONTENT (900 chars) ---`);
    console.log(post.content?.slice(0, 900) + "...");
    console.log(`\n--- SCHEMA ---`);
    console.log(post.schemaMarkup?.slice(0, 300));
    return null;
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
  return data.post;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log("\n📝  BLOG AGENT — huasteca-potosina.com");
  console.log(`    E-E-A-T · Plataforma Regional · 950–1,100 palabras`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

  // Cargar bancos de datos locales
  console.log("\n📂 Cargando bancos de datos...");
  loadDataBanks();

  let usedSlugs = [];
  if (!DRY_RUN && BLOG_SECRET) {
    try {
      const res = await fetch(`${SITE_URL}/api/blog/create`, {
        headers: { "Authorization": `Bearer ${BLOG_SECRET}` },
      });
      const data = await res.json();
      usedSlugs = (data.posts || []).map(p => p.slug);
      console.log(`\n📚 Posts existentes: ${usedSlugs.length}`);
    } catch { /* continuar */ }
  }

  const topic = getDailyTopic(usedSlugs, CUSTOM_TOPIC);
  console.log(`\n📌 Tema:     ${topic.title}`);
  console.log(`🔑 Keyword:  ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría: ${topic.category}`);

  // Paso 1: Investigación (3 búsquedas)
  const researchContext = await doResearch(topic).catch(e => {
    console.warn(`⚠️  Búsqueda fallida: ${e.message}`);
    return "";
  });

  // Paso 2: Selección de imágenes (solo carpeta /IMAGENES)
  const images = await selectImages(topic);

  // Paso 3: Redactar y estructurar
  const post = await writeArticle(topic, researchContext, images);

  // Publicar
  await publishPost(post);

  console.log("\n" + "═".repeat(55));
  console.log("✅  Blog Agent completado.");
  console.log("═".repeat(55) + "\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
