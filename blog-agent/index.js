/**
 * blog-agent/index.js
 * ─────────────────────────────────────────────────────────
 * Agente de contenido diario para Huasteca Potosina.
 * Framework: EEAT · Autor: Manolo Covarrubias
 * 750–900 palabras exactas · Máx 2 búsquedas web
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

// ── Ejecuta llamada con web_search manejando el tool loop ──

async function callWithSearch(prompt, maxTokens = 2000) {
  const messages = [{ role: "user", content: prompt }];
  let allText = [];

  for (let round = 0; round < 6; round++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

    // Recopilar texto de esta respuesta
    for (const block of response.content) {
      if (block.type === "text" && block.text) allText.push(block.text);
    }

    if (response.stop_reason === "end_turn") break;

    // Si hay tool_use, agregar la respuesta del asistente y continuar
    const toolUses = response.content.filter(b => b.type === "tool_use");
    if (toolUses.length === 0) break;

    messages.push({ role: "assistant", content: response.content });
    // Para web_search_20250305 server-side, no necesitamos enviar resultados manualmente:
    // el modelo los tiene internamente. Solo continuamos el loop.
    // Enviamos mensaje vacío de continuación.
    messages.push({
      role: "user",
      content: toolUses.map(t => ({
        type: "tool_result",
        tool_use_id: t.id,
        content: [{ type: "text", text: "Resultados de búsqueda obtenidos por el servidor." }],
      })),
    });
  }

  return allText.join("\n\n");
}

// ── PASO 1: Investigación (1 búsqueda) ─────────────────────

async function doResearch(topic) {
  console.log(`\n🔍 Investigando: "${topic.focusKeyword}"...`);

  const prompt = `Busca en internet datos actualizados sobre: "${topic.focusKeyword}" en el contexto de turismo en la Huasteca Potosina, México ${new Date().getFullYear()}.

Necesito específicamente:
1. UN dato estadístico reciente (visitantes, crecimiento, cifra oficial)
2. UNA tendencia de búsqueda o interés del viajero actual
3. UN detalle práctico actualizado (precio, horario, acceso)

Lee solo los primeros 3 resultados. Responde en 150 palabras máximo con los hallazgos concretos.`;

  const context = await callWithSearch(prompt, 800);
  if (context) console.log(`   ✅ Contexto obtenido (${context.length} chars)`);
  return context;
}

// ── PASO 4: Imagen (1 búsqueda) ────────────────────────────

async function findImage(topic) {
  console.log(`\n🖼️  Buscando imagen real de: "${topic.focusKeyword}"...`);

  const prompt = `Busca en Unsplash o Wikimedia Commons la imagen más específica y real de: "${topic.focusKeyword}" en la Huasteca Potosina, México.

Si no encuentras imagen específica del lugar, elige la más apropiada de esta lista:
- Selva verde: https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80
- Río turquesa: https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80
- Cascada montaña: https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80
- Cueva/aventura: https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80
- Pueblo mexicano: https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80

Responde SOLO con:
URL: [url exacta]
ALT: [texto alt con keyword, 10-15 palabras]`;

  const result = await callWithSearch(prompt, 400);

  // Extraer URL del resultado
  const urlMatch = result.match(/URL:\s*(https?:\/\/\S+)/i);
  const altMatch = result.match(/ALT:\s*(.+)/i);

  return {
    url: urlMatch?.[1]?.trim() || "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    alt: altMatch?.[1]?.trim() || `${topic.focusKeyword} Huasteca Potosina guía de viaje ${new Date().getFullYear()}`,
  };
}

// ── PASO 3 + 5–7: Redactar artículo completo en JSON ───────

async function writeArticle(topic, researchContext, imageData) {
  console.log(`\n✍️  Redactando artículo EEAT (750–900 palabras)...`);

  const year  = new Date().getFullYear();
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const slug  = `${topic.focusKeyword.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${year}`;

  const needsFood    = /gastronom|comida|restaurante|comer|platillo/i.test(topic.title + topic.category);
  const needsHotel   = /hospedaje|hotel|dormir|alojamiento|hostal/i.test(topic.title + topic.category);

  const aliadoHtml = needsFood
    ? `<p>En mi última visita, Manolo Covarrubias eligió <a href="https://paraisoencantadoxilitla.lat" rel="noopener">El Papán Huasteco</a> en Xilitla por su cocina de fogón auténtica: zacahuil, bocoles recién hechos y un caldo de res que reconforta después de un día de senderismo. Es la experiencia gastronómica que todo viajero merece probar al menos una vez en la Huasteca.</p>`
    : needsHotel
    ? `<p>Para quien busca despertar entre la selva a pasos del Jardín de Edward James, el <a href="https://paraisoencantadoxilitla.lat" rel="noopener">Hotel Paraíso Encantado</a> en Xilitla es la elección que Manolo Covarrubias recomienda sin reservas — lo he vivido. Habitaciones con vista a la selva, silencio real y una atención que hace sentir al viajero como en casa.</p>`
    : "";

  const prompt = `Eres Manolo Covarrubias, promotor turístico y experto en la Huasteca Potosina. Escribe un artículo de blog EEAT de exactamente 750–900 palabras.

━━━ DATOS DEL ARTÍCULO ━━━
HOY: ${today}
TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}

━━━ CONTEXTO DE INVESTIGACIÓN ━━━
${researchContext || "(Usa conocimiento del modelo — no se obtuvo contexto web)"}

━━━ ESTRUCTURA EXACTA DEL ARTÍCULO ━━━

Usa este HTML para el campo "content" del JSON final:

<h1>[Título con keyword principal — máx 60 caracteres]</h1>

<p>[INTRO párrafo 1: Gancho sensorial. Keyword principal en este párrafo.]</p>
<p>[INTRO párrafo 2: Contexto + por qué importa este tema]</p>
<p>[INTRO párrafo 3: Promesa del artículo + link interno a /planear]</p>

<h2>[Primera sección — subtítulo con keyword secundaria]</h2>
<p>[3–4 oraciones. Dato con cifra, fuente y año del contexto investigado. Al menos 1 <strong>dato clave</strong>.]</p>

<h2>[Segunda sección — subtítulo descriptivo]</h2>
<p>[3–4 oraciones. Señal EEAT de experiencia personal: "La primera vez que llegué a..." o "En mis visitas he comprobado que..."]</p>

<figure>
  <img src="${imageData.url}" alt="${imageData.alt}" loading="lazy" />
  <figcaption>[Caption descriptivo y natural con keyword]</figcaption>
</figure>

<h2>[Tercera sección — subtítulo descriptivo]</h2>
${aliadoHtml || "<p>[3–4 oraciones con consejo práctico y honesto — incluye advertencia real sobre dificultades: clima, caminos, temporadas.]</p>"}

<h2>[Cuarta sección — solo si el tema lo requiere]</h2>
<p>[3–4 oraciones. Links internos naturales a: <a href="/destinos/cascada-de-tamul">Cascada de Tamul</a>, <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas</a>, <a href="/destinos/sotano-de-las-golondrinas">Sótano de las Golondrinas</a>, <a href="/destinos/cascadas-de-micos">Cascadas de Micos</a>]</p>

<p>[CONCLUSIÓN párrafo 1: Resumen + reflexión personal de Manolo]</p>

<div class="cta-box">
  <p>¿Listo para vivir la Huasteca Potosina? <strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios ${year}.</p>
  <a href="/planear" class="cta-button">Crear mi Itinerario Gratis →</a>
</div>

━━━ REGLAS OBLIGATORIAS ━━━
- CUENTA LAS PALABRAS del body del artículo (sin contar bio ni cta-box). Si excedes 900, recorta. Si no llegas a 750, expande.
- Al menos 1 <strong> por sección H2
- 2–3 links internos de la lista disponible, donde fluyan natural
- Nunca repitas el mismo dato dos veces

━━━ ENTREGA ━━━
Responde ÚNICAMENTE con este JSON válido (sin markdown, sin texto extra):

{
  "slug": "${slug}",
  "metaTitle": "Título SEO (máx 60 caracteres con keyword y año)",
  "title": "Título H1 completo del artículo",
  "metaDescription": "Descripción Google 140–155 chars — keyword + año + propuesta de valor",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "2 líneas evocadoras con keyword para la lista del blog",
  "content": "HTML COMPLETO del artículo",
  "authorBio": "<div class='author-bio'><img src='https://ui-avatars.com/api/?name=Manolo+Covarrubias&background=2D4A1A&color=EDE0C4&size=80' alt='Manolo Covarrubias experto Huasteca Potosina' /><div><h4>Manolo Covarrubias</h4><p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región. Fundador de la plataforma de itinerarios huastecapotosina.mx y anfitrión del Hotel Paraíso Encantado en Xilitla, San Luis Potosí.</p><a href='/planear'>Ver itinerarios →</a></div></div>",
  "schemaMarkup": "{\\\"@context\\\":\\\"https://schema.org\\\",\\\"@type\\\":\\\"Article\\\",\\\"headline\\\":\\\"[title]\\\",\\\"description\\\":\\\"[metaDescription]\\\",\\\"datePublished\\\":\\\"${new Date().toISOString()}\\\",\\\"author\\\":{\\\"@type\\\":\\\"Person\\\",\\\"name\\\":\\\"Manolo Covarrubias\\\",\\\"jobTitle\\\":\\\"Promotor Turístico Huasteca Potosina\\\"},\\\"publisher\\\":{\\\"@type\\\":\\\"Organization\\\",\\\"name\\\":\\\"Huasteca Potosina\\\"}}",
  "coverImageUrl": "${imageData.url}",
  "coverImageAlt": "${imageData.alt}",
  "coverImageFile": "${slug}.jpg",
  "internalLinks": ["/planear", "/destinos/cascada-de-tamul"],
  "externalSources": ["SECTUR San Luis Potosí — turismo.slp.gob.mx", "segunda fuente citada en el artículo"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag relevante"],
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

  // Normalizar schemaMarkup como string
  if (post.schemaMarkup && typeof post.schemaMarkup === "object") {
    post.schemaMarkup = JSON.stringify(post.schemaMarkup);
  }

  const wordCount = (post.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log(`✅ Artículo generado: "${post.title}"`);
  console.log(`   ~${wordCount} palabras | ${post.readingTime} min | keyword: ${post.focusKeyword}`);

  if (wordCount < 700) console.warn(`⚠️  Artículo corto (${wordCount} palabras) — puede requerir revisión`);
  if (wordCount > 950) console.warn(`⚠️  Artículo largo (${wordCount} palabras) — puede requerir recorte`);

  return post;
}

// ── Publicar en el sitio ────────────────────────────────────

async function publishPost(post) {
  if (DRY_RUN) {
    console.log("\n🧪 DRY-RUN — Artículo NO publicado. Preview:\n");
    console.log(`Meta Título:  ${post.metaTitle}`);
    console.log(`H1:           ${post.title}`);
    console.log(`Slug:         ${post.slug}`);
    console.log(`Keyword:      ${post.focusKeyword}`);
    console.log(`Meta desc:    ${post.metaDescription}`);
    console.log(`Excerpt:      ${post.excerpt}`);
    console.log(`Tags:         ${post.tags?.join(", ")}`);
    console.log(`Fuentes:      ${post.externalSources?.join(" | ")}`);
    console.log(`Cover:        ${post.coverImageUrl}`);
    console.log(`\n--- CONTENT PREVIEW (900 chars) ---`);
    console.log(post.content?.slice(0, 900) + "...");
    console.log(`\n--- AUTHOR BIO ---`);
    console.log(post.authorBio?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
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

  // Posts ya publicados
  let usedSlugs = [];
  if (!DRY_RUN && BLOG_SECRET) {
    try {
      const res = await fetch(`${SITE_URL}/api/blog/create`, {
        headers: { "Authorization": `Bearer ${BLOG_SECRET}` },
      });
      const data = await res.json();
      usedSlugs = (data.posts || []).map(p => p.slug);
      console.log(`\n📚 Posts existentes: ${usedSlugs.length}`);
    } catch { /* continuar sin historial */ }
  }

  // Seleccionar tema
  const topic = getDailyTopic(usedSlugs, CUSTOM_TOPIC);
  console.log(`\n📌 Tema:     ${topic.title}`);
  console.log(`🔑 Keyword:  ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría: ${topic.category}`);

  // Paso 1: Investigación
  const researchContext = await doResearch(topic).catch(e => {
    console.warn(`⚠️  Búsqueda fallida: ${e.message} — usando conocimiento del modelo`);
    return "";
  });

  // Paso 4: Imagen
  const imageData = await findImage(topic).catch(() => ({
    url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    alt: `${topic.focusKeyword} Huasteca Potosina ${new Date().getFullYear()}`,
  }));

  // Pasos 3 + 5–7: Redactar y estructurar en JSON
  const post = await writeArticle(topic, researchContext, imageData);

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
