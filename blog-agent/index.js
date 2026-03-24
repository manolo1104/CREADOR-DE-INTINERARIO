/**
 * blog-agent/index.js
 * ─────────────────────────────────────────────────────────
 * Agente de contenido diario para Huasteca Potosina.
 * Framework: EEAT · Autor: Manolo Covarrubias
 * 750–900 palabras exactas · Máx 3 búsquedas web
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

const DRY_RUN     = process.argv.includes("--dry-run");
const TOPIC_IDX   = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL    = process.env.SITE_URL || "https://creador-de-intinerario-production.up.railway.app";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;

// ── Generar artículo completo (búsquedas + redacción en un solo paso) ──

async function generatePost(topic) {
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const year  = new Date().getFullYear();

  console.log(`\n✍️  Iniciando generación EEAT: "${topic.title}"\n`);

  const systemPrompt = `Eres Manolo Covarrubias, promotor turístico y experto en la Huasteca Potosina con más de 10 años explorando la región. Escribes contenido para el blog de HuastecaPotosina.mx. Eres conciso, auténtico y siempre aportas valor práctico desde la experiencia directa.`;

  const userPrompt = `HOY ES: ${today}
TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}

Sigue este flujo EN ORDEN, usando la herramienta web_search cuando se indique:

━━━ PASO 1 — Investigación (1 búsqueda) ━━━
Haz UNA búsqueda sobre tendencias y datos actualizados del tema "${topic.focusKeyword}" en Huasteca Potosina ${year}. Lee solo los primeros 3 resultados. Extrae: 1 dato con cifra, 1 tendencia actual, 1 detalle práctico específico.

━━━ PASO 2 — SEO (sin búsqueda) ━━━
Con lo ya investigado, confirma la keyword principal y las secundarias. Define la intención de búsqueda del artículo.

━━━ PASO 3 — Redacción (750–900 palabras EXACTAS) ━━━
Escribe el artículo completo con esta estructura exacta:

[H1] Título con keyword principal — máx 60 caracteres

[INTRO] 2–3 párrafos cortos. Gancho sensorial + contexto + promesa.
Incluye la keyword principal en el primer párrafo.

[H2] Primera sección — subtítulo con keyword secundaria
3–4 oraciones. Señal EEAT: dato o cifra con fuente y año encontrado en la búsqueda.

[H2] Segunda sección — subtítulo descriptivo
3–4 oraciones. Señal EEAT: experiencia o perspectiva personal de Manolo Covarrubias ("La primera vez que llegué a...", "En mis visitas he comprobado que...").

[H2] Tercera sección — subtítulo descriptivo
3–4 oraciones. Si el tema involucra comida → recomienda El Papán Huasteco. Si involucra hospedaje → recomienda Hotel Paraíso Encantado. Preséntalo como recomendación personal: "En mi última visita, elegí el Papán Huasteco porque..."

[H2] Cuarta sección — solo si el tema lo requiere
3–4 oraciones.

[CONCLUSIÓN] 1–2 párrafos. Resumen + CTA con este HTML exacto:
<div class="cta-box">
  <p>¿Listo para vivir la Huasteca Potosina? <strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios ${year}.</p>
  <a href="/planear" class="cta-button">Crear mi Itinerario Gratis →</a>
</div>

[BIO DEL AUTOR]
<div class="author-bio">
  <img src="https://ui-avatars.com/api/?name=Manolo+Covarrubias&background=2D4A1A&color=EDE0C4&size=80" alt="Manolo Covarrubias autor Huasteca Potosina" />
  <div>
    <h4>Manolo Covarrubias</h4>
    <p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región. Fundador de la plataforma de itinerarios huastecapotosina.mx y anfitrión del Hotel Paraíso Encantado en Xilitla, San Luis Potosí. Ha guiado a cientos de viajeros por las cascadas, cañones y selvas de esta región extraordinaria.</p>
    <a href="/planear">Ver itinerarios →</a>
  </div>
</div>

REGLAS DE ESCRITURA:
- 750–900 palabras en el cuerpo del artículo (sin contar bio ni CTA). Cuenta las palabras. Si excedes 900, recorta. Si no llegas a 750, expande.
- Incluye al menos 1 etiqueta <strong> en un dato clave por sección
- Links internos: <a href="/destinos/cascada-de-tamul">Cascada de Tamul</a>, <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas</a>, <a href="/destinos/sotano-de-las-golondrinas">Sótano de las Golondrinas</a>, <a href="/destinos/cascadas-de-micos">Cascadas de Micos</a>, <a href="/planear">Creador de Itinerario IA</a> — usa 2–3 donde fluyan natural

━━━ PASO 4 — Imagen (1 búsqueda) ━━━
Haz UNA búsqueda para encontrar la imagen más específica del tema en Unsplash, Wikimedia o Pexels. Busca la imagen real del lugar (ej: "cascada tamul unsplash" o "cascada tamul wikimedia"). Si no encuentras imagen real específica del lugar, usa la URL de Unsplash más relevante de esta lista:
- Selva verde: https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80
- Río turquesa: https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80
- Cascada: https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80
- Cueva/aventura: https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80
- Pueblo mexicano: https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80

━━━ PASO 5–7 — Entrega final (sin búsqueda adicional) ━━━
Responde ÚNICAMENTE con JSON válido (sin markdown antes ni después):

{
  "slug": "keyword-con-guiones-${year}",
  "metaTitle": "Título SEO exacto (máx 60 caracteres)",
  "title": "Título H1 completo",
  "metaDescription": "Descripción Google 140–155 chars con keyword y año",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "2 líneas evocadoras con keyword para la lista del blog",
  "content": "HTML COMPLETO del artículo — H2s, párrafos, strong, links, CTA box, author-bio",
  "authorBio": "<div class='author-bio'>...</div>",
  "schemaMarkup": "{JSON-LD Article+Person como string escapado}",
  "coverImageUrl": "URL de la imagen encontrada",
  "coverImageAlt": "Alt text SEO con keyword (10–15 palabras)",
  "coverImageFile": "${topic.focusKeyword.toLowerCase().replace(/\\s+/g, '-')}-${year}.jpg",
  "internalLinks": ["/planear", "/destinos/cascada-de-tamul"],
  "externalSources": ["SECTUR — https://...", "Fuente 2"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag"],
  "readingTime": 6
}`;

  // Llamada agentica: Claude usa web_search y luego entrega JSON
  const messages = [{ role: "user", content: userPrompt }];
  let finalText = "";

  // Loop agentico para manejar tool_use
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    });

    // Acumular bloques de texto
    const textBlock = response.content.find(b => b.type === "text");
    if (textBlock) finalText = textBlock.text;

    // Si terminó (end_turn o no hay tool_use), salir
    if (response.stop_reason === "end_turn") break;

    // Si hay tool_use, procesar y continuar
    const toolUses = response.content.filter(b => b.type === "tool_use");
    if (toolUses.length === 0) break;

    console.log(`  🌐 Búsqueda: ${toolUses.map(t => t.input?.query || "").join(" | ")}`);

    // Añadir respuesta del asistente al historial
    messages.push({ role: "assistant", content: response.content });

    // Añadir resultados de tools (Claude maneja web_search internamente — solo confirmamos)
    messages.push({
      role: "user",
      content: toolUses.map(t => ({
        type: "tool_result",
        tool_use_id: t.id,
        content: "Resultados obtenidos. Continúa con el siguiente paso.",
      })),
    });
  }

  // Extraer JSON del texto final
  const raw = finalText.trim()
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

  // Serializar schemaMarkup como string si viene como objeto
  if (post.schemaMarkup && typeof post.schemaMarkup === "object") {
    post.schemaMarkup = JSON.stringify(post.schemaMarkup);
  }

  console.log(`✅ Artículo generado: "${post.title}"`);
  console.log(`   Keyword: ${post.focusKeyword} | ${post.readingTime} min | ~${post.content?.split(/\s+/).length} palabras`);
  return post;
}

// ── Publicar en el sitio ────────────────────────────────

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
    console.log(`\n--- CONTENT PREVIEW (800 chars) ---`);
    console.log(post.content?.slice(0, 800) + "...");
    console.log(`\n--- AUTHOR BIO ---`);
    console.log(post.authorBio?.replace(/<[^>]+>/g, "").trim());
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

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log("\n📝  BLOG AGENT — Huasteca Potosina");
  console.log(`    Framework: EEAT · Autor: Manolo Covarrubias`);
  console.log(`    750–900 palabras · Máx 3 búsquedas`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

  // Posts ya publicados (para evitar repetir keywords)
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
  console.log(`\n📌 Tema:    ${topic.title}`);
  console.log(`🔑 Keyword: ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría: ${topic.category}`);

  // Generar (investigación + redacción en una sola llamada agentica)
  const post = await generatePost(topic);

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
