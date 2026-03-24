/**
 * blog-agent/index.js
 * ─────────────────────────────────────────────────────────
 * Agente de contenido diario para Huasteca Potosina.
 * Framework: EEAT · Autor: Manolo Covarrubias
 * 750–900 palabras · Máx 2 búsquedas web
 *
 * Uso:
 *   node index.js                          ← publica el post del día
 *   node index.js --dry-run                ← muestra sin publicar
 *   node index.js --topic "tamul guia"     ← tema específico
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import { getDailyTopic } from "./content-strategy.js";

const DRY_RUN      = process.argv.includes("--dry-run");
const TOPIC_IDX    = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL     = process.env.SITE_URL || "https://creador-de-intinerario-production.up.railway.app";
const BLOG_SECRET  = process.env.BLOG_AGENT_SECRET;

const AUTHOR_PHOTO = "/authors/manolo-covarrubias.jpg"; // foto local en /public

// Banco de imágenes de respaldo (Unsplash, libres de derechos)
const FALLBACK_IMAGES = [
  { url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80", theme: "selva verde densa" },
  { url: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80", theme: "río turquesa cascada" },
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", theme: "cascada montaña" },
  { url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80", theme: "bosque tropical" },
  { url: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80", theme: "cueva roca aventura" },
  { url: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80", theme: "naturaleza aventura" },
  { url: "https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80", theme: "pueblo mexicano" },
];

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

// ── PASO 1: Investigación (1 búsqueda) ─────────────────────

async function doResearch(topic) {
  console.log(`\n🔍 Investigando: "${topic.focusKeyword}"...`);

  const prompt = `Busca datos actualizados sobre: "${topic.focusKeyword}" turismo Huasteca Potosina México ${new Date().getFullYear()}.

Lee solo los primeros 3 resultados. Extrae exactamente:
1. UN dato estadístico con cifra (visitantes, crecimiento, precio promedio)
2. UNA tendencia actual del viajero
3. UN detalle práctico específico (horario, precio de entrada, acceso)

Responde en máximo 150 palabras con los hallazgos concretos.`;

  const context = await callWithSearch(prompt, 800);
  if (context) console.log(`   ✅ Contexto obtenido (${context.length} chars)`);
  return context;
}

// ── PASO 4: Dos imágenes diferentes (1 búsqueda) ───────────

async function findImages(topic) {
  console.log(`\n🖼️  Buscando 2 imágenes distintas para: "${topic.focusKeyword}"...`);

  const prompt = `Busca en Unsplash, Pexels o Wikimedia Commons DOS imágenes DIFERENTES sobre "${topic.focusKeyword}" Huasteca Potosina.

IMAGEN HERO (portada): debe mostrar el tema principal. Si es sobre hospedaje → hotel o cabaña en selva. Si es sobre cascadas → la cascada específica. Si es sobre gastronomía → el platillo o restaurante. NUNCA una imagen genérica de agua si el tema es otra cosa.

IMAGEN CUERPO: debe ilustrar un aspecto secundario del mismo artículo. URL OBLIGATORIAMENTE DIFERENTE a la del hero.

Responde SOLO con este formato:
HERO_URL: [url exacta libre de derechos]
HERO_ALT: [alt descriptivo con keyword, 10-15 palabras]
BODY_URL: [url DIFERENTE libre de derechos]
BODY_ALT: [alt descriptivo con keyword secundaria, 10-15 palabras]`;

  const result = await callWithSearch(prompt, 600);

  const heroUrl  = result.match(/HERO_URL:\s*(https?:\/\/\S+)/i)?.[1]?.trim();
  const heroAlt  = result.match(/HERO_ALT:\s*(.+)/i)?.[1]?.trim();
  const bodyUrl  = result.match(/BODY_URL:\s*(https?:\/\/\S+)/i)?.[1]?.trim();
  const bodyAlt  = result.match(/BODY_ALT:\s*(.+)/i)?.[1]?.trim();

  // Asegurar URLs distintas con fallback
  const hero = {
    url: heroUrl || FALLBACK_IMAGES[0].url,
    alt: heroAlt || `${topic.focusKeyword} Huasteca Potosina ${new Date().getFullYear()}`,
  };
  const usedUrl = hero.url;
  const bodyFallback = FALLBACK_IMAGES.find(i => i.url !== usedUrl) || FALLBACK_IMAGES[1];
  const body = {
    url: (bodyUrl && bodyUrl !== usedUrl) ? bodyUrl : bodyFallback.url,
    alt: bodyAlt || `${topic.secondaryKeywords[0] || topic.focusKeyword} guía viaje Huasteca`,
  };

  console.log(`   Hero: ${hero.url.substring(0, 60)}...`);
  console.log(`   Body: ${body.url.substring(0, 60)}...`);
  return { hero, body };
}

// ── PASOS 3 + 5–7: Redactar artículo + entregar JSON ───────

async function writeArticle(topic, researchContext, images) {
  console.log(`\n✍️  Redactando artículo EEAT (750–900 palabras)...`);

  const year  = new Date().getFullYear();
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const slug  = `${topic.focusKeyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${year}`;

  const needsFood  = /gastronom|comida|restaurante|comer|platillo/i.test(topic.title + topic.category);
  const needsHotel = /hospedaje|hotel|dormir|alojamiento|hostal/i.test(topic.title + topic.category);

  const aliadoHtml = needsFood
    ? `<p>En mi última visita, elegí <a href="https://paraisoencantadoxilitla.lat" rel="noopener">El Papán Huasteco</a> en Xilitla: cocina de fogón auténtica, <strong>zacahuil y bocoles recién hechos</strong> que reconfortan después de un día de senderismo. La experiencia gastronómica que todo viajero merece probar al menos una vez en la Huasteca.</p>`
    : needsHotel
    ? `<p>Para quien busca despertar entre la selva a pasos del Jardín de Edward James, el <a href="https://paraisoencantadoxilitla.lat" rel="noopener">Hotel Paraíso Encantado</a> en Xilitla es la elección que hago sin reservas — lo he vivido. <strong>Habitaciones con vista a la selva</strong>, silencio real y atención que hace sentir al viajero como en casa.</p>`
    : "";

  // Schema markup generado programáticamente (fuera del prompt de Claude)
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": topic.title,
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": "Manolo Covarrubias",
      "url": `${SITE_URL}/sobre-nosotros`,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Huasteca Potosina",
      "url": SITE_URL,
    },
    "description": "",      // se sobreescribe tras parsear el JSON de Claude
    "image": images.hero.url,
    "keywords": [topic.focusKeyword, ...topic.secondaryKeywords].join(", "),
    "articleSection": topic.category,
  };

  const prompt = `Eres Manolo Covarrubias, promotor turístico y experto en la Huasteca Potosina. Escribe un artículo de blog EEAT.

━━━ DATOS ━━━
HOY: ${today} | TEMA: ${topic.title} | KEYWORD: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}

━━━ CONTEXTO INVESTIGADO ━━━
${researchContext || "(Usa conocimiento del modelo)"}

━━━ ESTRUCTURA HTML DEL CAMPO "content" ━━━
IMPORTANTE: El <h1> lo renderiza el sitio web por separado. El content debe empezar directamente con los párrafos de introducción, sin <h1>.

<p>[INTRO párrafo 1: Gancho sensorial. Keyword principal en este párrafo.]</p>
<p>[INTRO párrafo 2: Contexto + por qué importa este tema]</p>
<p>[INTRO párrafo 3: Promesa del artículo + enlace natural a <a href="/planear">planear tu ruta con IA</a>]</p>

<h2>[Primera sección — subtítulo con keyword secundaria]</h2>
<p>[3–4 oraciones. Al menos 1 <strong>dato con cifra, fuente y año</strong> del contexto investigado.]</p>

<h2>[Segunda sección — subtítulo descriptivo]</h2>
<p>[3–4 oraciones. Señal EEAT de experiencia personal: "La primera vez que llegué a..." o "En mis visitas he comprobado que..."]</p>

<figure>
  <img src="${images.body.url}" alt="${images.body.alt}" loading="lazy" />
  <figcaption>[Caption descriptivo con keyword]</figcaption>
</figure>

<h2>[Tercera sección]</h2>
${aliadoHtml || `<p>[3–4 oraciones. Consejo práctico + advertencia honesta sobre dificultades reales: clima, caminos, temporadas.]</p>`}

<h2>[Cuarta sección — solo si el tema lo requiere]</h2>
<p>[3–4 oraciones. Incluye 2–3 links internos naturales de: <a href="/destinos/cascada-de-tamul">Cascada de Tamul</a>, <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas</a>, <a href="/destinos/sotano-de-las-golondrinas">Sótano de las Golondrinas</a>, <a href="/destinos/cascadas-de-micos">Cascadas de Micos</a>]</p>

<p>[CONCLUSIÓN: Reflexión personal de Manolo + resumen]</p>

<div class="cta-box">
  <p>¿Listo para vivir la Huasteca Potosina? <strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios ${year}.</p>
  <a href="/planear" class="cta-button">Crear mi Itinerario Gratis →</a>
</div>

━━━ REGLAS ━━━
- 750–900 palabras en el body (sin contar el cta-box). Cuenta antes de entregar.
- 1 <strong> por sección como mínimo
- NUNCA uses <h1> dentro del content
- NO repitas la imagen hero en el content (ya está asignada al campo coverImageUrl)

━━━ ENTREGA: JSON VÁLIDO SIN MARKDOWN ━━━
{
  "slug": "${slug}",
  "metaTitle": "Título SEO máx 60 chars con keyword y ${year}",
  "title": "Título H1 completo del artículo",
  "metaDescription": "140–155 chars — keyword + año + propuesta de valor",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "2 líneas evocadoras con keyword para la lista del blog",
  "content": "HTML COMPLETO — solo párrafos, H2s, figure, strong, links, cta-box. SIN H1.",
  "internalLinks": ["/planear", "/destinos/cascada-de-tamul"],
  "externalSources": ["SECTUR San Luis Potosí — turismo.slp.gob.mx", "segunda fuente"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag"],
  "readingTime": 6
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
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

  // ── Campos adicionales generados programáticamente (no por Claude) ──

  // Imágenes
  post.coverImageUrl  = images.hero.url;
  post.coverImageAlt  = images.hero.alt;
  post.coverImageFile = `${slug}.jpg`;

  // Schema BlogPosting con metaDescription real
  schemaObj.headline    = post.title || topic.title;
  schemaObj.description = post.metaDescription || "";
  post.schemaMarkup = JSON.stringify(schemaObj);

  // Author bio con foto local
  post.authorBio = `<div class="author-bio">
  <img src="${AUTHOR_PHOTO}" alt="Manolo Covarrubias experto en turismo de la Huasteca Potosina" width="80" height="80" />
  <div>
    <h4>Manolo Covarrubias</h4>
    <p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región. Fundador de la plataforma de itinerarios huastecapotosina.mx y anfitrión del Hotel Paraíso Encantado en Xilitla, San Luis Potosí. Ha guiado a cientos de viajeros por las cascadas, cañones y selvas de esta región extraordinaria.</p>
    <a href="/planear">Ver itinerarios →</a>
  </div>
</div>`;

  const wordCount = (post.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log(`✅ Artículo listo: "${post.title}"`);
  console.log(`   ~${wordCount} palabras | ${post.readingTime} min | keyword: ${post.focusKeyword}`);
  if (wordCount < 700) console.warn(`⚠️  Artículo corto (${wordCount} palabras)`);
  if (wordCount > 950) console.warn(`⚠️  Artículo largo (${wordCount} palabras)`);

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
  console.log("\n📝  BLOG AGENT — Huasteca Potosina");
  console.log(`    EEAT · Manolo Covarrubias · 750–900 palabras`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

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

  // Paso 1: Investigación
  const researchContext = await doResearch(topic).catch(e => {
    console.warn(`⚠️  Búsqueda fallida: ${e.message}`);
    return "";
  });

  // Paso 4: Dos imágenes distintas
  const images = await findImages(topic).catch(() => ({
    hero: { url: FALLBACK_IMAGES[0].url, alt: `${topic.focusKeyword} Huasteca Potosina ${new Date().getFullYear()}` },
    body: { url: FALLBACK_IMAGES[1].url, alt: `${topic.secondaryKeywords[0] || topic.focusKeyword} guía viaje` },
  }));

  // Pasos 3 + 5–7: Redactar y estructurar
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
