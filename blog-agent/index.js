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

async function callWithSearch(prompt, maxTokens = 1500) {
  const messages = [{ role: "user", content: prompt }];
  let allText = [];

  for (let round = 0; round < 6; round++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

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
        content: [{ type: "text", text: "Resultados de búsqueda procesados. Continúa." }],
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

// ── PASO 1: Investigación (3 búsquedas) ────────────────────

async function doResearch(topic) {
  console.log(`\n🔍 Investigando: "${topic.focusKeyword}" (3 búsquedas)...`);
  const year = new Date().getFullYear();
  const results = [];

  // Búsqueda 1: datos prácticos actualizados
  console.log(`   Búsqueda 1/3: datos prácticos...`);
  const prompt1 = `Busca información actualizada sobre: "${topic.focusKeyword} huasteca potosina ${year}".

Lee los primeros 3 resultados y extrae exactamente:
1. UN dato de precio o costo de entrada/tour
2. UN dato de horario o días de apertura
3. UNA condición de acceso (camino, temporada, requisito)
4. UNA distancia desde Ciudad Valles o desde Xilitla

Responde en máximo 120 palabras con los hallazgos concretos.`;

  const r1 = await callWithSearch(prompt1, 700).catch(() => "");
  if (r1) results.push(r1);

  // Búsqueda 2: preguntas de viajeros reales
  console.log(`   Búsqueda 2/3: preguntas de viajeros...`);
  const prompt2 = `Busca reseñas y preguntas reales de viajeros sobre: "${topic.focusKeyword} site:reddit.com OR site:tripadvisor.com".

Extrae exactamente:
- 5 preguntas o dudas reales que los viajeros hacen frecuentemente
- Problemas o inconvenientes comunes que mencionan

Responde en máximo 150 palabras, con las preguntas y problemas concretos encontrados.`;

  const r2 = await callWithSearch(prompt2, 700).catch(() => "");
  if (r2) results.push(r2);

  // Búsqueda 3: ángulo de contenido no cubierto
  console.log(`   Búsqueda 3/3: análisis competitivo...`);
  const prompt3 = `Busca los 3 primeros resultados para: "${topic.focusKeyword} guia ${year}".

Analiza brevemente qué ángulo o información importante NO está cubierta en esos 3 resultados principales (oportunidad de contenido único).

Responde en máximo 80 palabras con el análisis concreto.`;

  const r3 = await callWithSearch(prompt3, 500).catch(() => "");
  if (r3) results.push(r3);

  const combined = results.join("\n\n---\n\n");
  if (combined) console.log(`   ✅ Investigación completa (${combined.length} chars)`);
  return combined;
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

  const prompt = `Eres un equipo de expertos locales de huasteca-potosina.com, plataforma de turismo regional de la Huasteca Potosina. NO eres un hotel ni un blogger personal. Escribe un artículo de blog con E-E-A-T real.

━━━ DATOS ━━━
HOY: ${today} | TEMA: ${topic.title} | KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
SITE_URL: ${SITE_URL}

━━━ CONTEXTO INVESTIGADO ━━━
${researchContext || "(Usa conocimiento del modelo)"}

━━━ IDENTIDAD E-E-A-T ━━━
Frase obligatoria que debes incluir en el INTRO (párrafo 3):
"En huasteca-potosina.com trabajamos con guías y operadores locales de la región. Esta guía se actualiza con experiencias reales de quienes recorren la Huasteca Potosina cada semana."

━━━ ESTRUCTURA HTML (950–1,100 palabras en el content) ━━━
El <h1> lo renderiza el sitio por separado. El content empieza directamente con los párrafos de introducción, SIN <h1>.

[POSICIÓN 1 — INTRO: 3 párrafos]
<p>[P1: Gancho — problema o duda del viajero. Keyword "${topic.focusKeyword}" en las primeras 2 oraciones. NO empieces con "Si estás..."]</p>
<p>[P2: Solución. Incluye keyword secundaria.]</p>
<p>[P3: Frase E-E-A-T obligatoria + enlace Tipo B: <a href="${SITE_URL}/itinerarios">planea tu itinerario a ${topic.focusKeyword}</a>]</p>

[POSICIÓN 2 — SECCIÓN 1: H2 + 2-3 H3s]
<h2>[Subtítulo con keyword secundaria]</h2>
<h3>[Sub-subtítulo]</h3>
<p>[3–4 oraciones con dato concreto del contexto investigado. Al final: <a href="${SITE_URL}/blog/[slug-relacionado]">texto descriptivo relacionado</a> (Tipo A)]</p>
<p>[Al final del H3: <a href="${SITE_URL}/tours">reserva el tour a ${topic.focusKeyword}</a> (Tipo C)]</p>
<h3>[Sub-subtítulo]</h3>
<p>[3–4 oraciones. Al final: enlace Tipo A a otro artículo del blog + enlace Tipo C a /tours]</p>

[POSICIÓN 3 — SECCIÓN 2: H2 + 2-3 H3s + imagen cuerpo]
<h2>[Subtítulo descriptivo]</h2>
<figure>
  <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" width="900" height="500" />
  <figcaption>[Caption descriptivo con keyword ${topic.focusKeyword}]</figcaption>
</figure>
<h3>[Sub-subtítulo]</h3>
<p>[3–4 oraciones. Al final: enlace Tipo C a /tours]</p>
<h3>[Sub-subtítulo]</h3>
<p>[3–4 oraciones. Al final: enlace Tipo C a /tours]</p>

[POSICIÓN 4 — CTA TOURS]
<div class="cta-tours" style="background:#00B4D8;padding:24px;border-radius:8px;margin:32px 0;text-align:center;">
  <p><strong>¿Quieres vivir ${topic.focusKeyword} con guía experto?</strong></p>
  <p>Tours desde la Huasteca Potosina. Grupos pequeños, guías locales y traslados incluidos.</p>
  <a href="${SITE_URL}/tours" class="cta-button" style="background:#fff;color:#00B4D8;padding:12px 28px;border-radius:4px;font-weight:bold;text-decoration:none;">Ver tours disponibles →</a>
</div>

[POSICIÓN 5 — CTA ITINERARIO]
<div class="cta-itinerario" style="background:#f0f9ff;padding:20px;border-radius:8px;margin:24px 0;text-align:center;">
  <p><strong>¿Ya tienes tu itinerario para la Huasteca?</strong></p>
  <p>Nuestro planificador con IA arma tu recorrido en minutos, con tiempos reales, distancias y qué no perderte.</p>
  <a href="${SITE_URL}/itinerarios" class="cta-button-secondary" style="background:#2D6A4F;color:#fff;padding:12px 28px;border-radius:4px;font-weight:bold;text-decoration:none;">Crear mi itinerario gratis →</a>
</div>

[POSICIÓN 6 — SECCIÓN 3 (si aplica): H2 + consejos prácticos]
<h2>[Subtítulo consejos prácticos]</h2>
<p>[3–4 oraciones. Incluye 2–3 enlaces Tipo A a artículos del blog: <a href="${SITE_URL}/blog/cascada-de-tamul-${year}">Cascada de Tamul</a>, <a href="${SITE_URL}/blog/las-pozas-xilitla-${year}">Las Pozas de Xilitla</a>, <a href="${SITE_URL}/blog/sotano-de-las-golondrinas-${year}">Sótano de las Golondrinas</a>]</p>

[POSICIÓN 7 — FAQ]
<h2>Preguntas frecuentes sobre ${topic.focusKeyword}</h2>
<div class="faq">
  <details><summary><strong>[Pregunta 1 basada en dudas reales de viajeros]</strong></summary><p>[Respuesta máx 60 palabras]</p></details>
  <details><summary><strong>[Pregunta 2]</strong></summary><p>[Respuesta máx 60 palabras]</p></details>
  <details><summary><strong>[Pregunta 3]</strong></summary><p>[Respuesta máx 60 palabras]</p></details>
  <details><summary><strong>[Pregunta 4]</strong></summary><p>[Respuesta máx 60 palabras]</p></details>
</div>

[POSICIÓN 8 — CTA FINAL]
<div class="cta-final" style="background:#2D6A4F;color:#fff;padding:32px;border-radius:8px;margin:40px 0;text-align:center;">
  <h3 style="color:#fff;margin-bottom:8px;">Reserva tu experiencia en la Huasteca Potosina</h3>
  <p>Tours con guías locales · Grupos reducidos · Sin estrés</p>
  <p>O planea tu propio recorrido con nuestro creador de itinerarios.</p>
  <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:16px;">
    <a href="${SITE_URL}/tours" style="background:#00B4D8;color:#fff;padding:14px 32px;border-radius:4px;font-weight:bold;text-decoration:none;">Ver todos los tours →</a>
    <a href="${SITE_URL}/itinerarios" style="background:transparent;color:#fff;padding:14px 32px;border-radius:4px;font-weight:bold;text-decoration:none;border:2px solid #fff;">Crear mi itinerario →</a>
  </div>
</div>

━━━ REGLAS DE KEYWORDS ━━━
- "Huasteca Potosina": 5–9 veces en el artículo
- "tours en la Huasteca Potosina": 2–4 veces
- "itinerario Huasteca Potosina": 1–3 veces
- "${topic.focusKeyword}": 8–12 veces

━━━ PALABRAS PROHIBIDAS ━━━
NUNCA uses: "increíble experiencia", "sin duda alguna", "en conclusión", "es importante mencionar", "cabe destacar", "no te puedes perder", "lugar mágico", "joya escondida", "paraíso terrenal", "de ensueño"

━━━ ENLACES EXTERNOS PERMITIDOS ━━━
Solo estos dominios con rel="noopener nofollow": laspozasxilitla.org.mx, google.com/maps, inah.gob.mx, gob.mx

━━━ TIPOS DE ENLACES INTERNOS ━━━
- Tipo A: informacionales al blog (${SITE_URL}/blog/[slug-relacionado]) — mínimo 1 por H3
- Tipo B: a itinerarios (${SITE_URL}/itinerarios) — mínimo 1
- Tipo C: a tours (${SITE_URL}/tours) — mínimo 2 en todo el artículo
NUNCA uses "clic aquí" como texto de enlace.

━━━ OTRAS REGLAS ━━━
- 950–1,100 palabras en el body (sin contar los CTAs). Cuenta antes de entregar.
- NUNCA uses <h1> dentro del content
- NO repitas la imagen hero en el content (ya está asignada al campo coverImageUrl)
- Mínimo 1 <strong> por sección

━━━ ENTREGA: JSON VÁLIDO SIN MARKDOWN ━━━
{
  "slug": "${slug}",
  "metaTitle": "Título SEO máx 60 chars con keyword y ${year}",
  "title": "Título H1 completo del artículo",
  "metaDescription": "140–155 chars — keyword + año + propuesta de valor",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "2 líneas evocadoras con keyword para la lista del blog",
  "content": "HTML COMPLETO — párrafos, H2s, H3s, figure, strong, links, CTAs. SIN H1.",
  "internalLinks": ["${SITE_URL}/tours", "${SITE_URL}/itinerarios"],
  "externalSources": ["fuente 1", "fuente 2"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag"],
  "readingTime": 7,
  "schemaType": "BlogPosting+FAQPage"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 10000,
    messages: [{ role: "user", content: prompt }],
  });

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

  // ── Campos adicionales generados programáticamente ──

  // Imágenes
  post.coverImageUrl  = images.hero.url;
  post.coverImageAlt  = images.hero.alt;
  post.coverImageFile = `${slug}.jpg`;

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
