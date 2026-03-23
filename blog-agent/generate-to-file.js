/**
 * generate-to-file.js
 * Genera el post del día y lo guarda en pending-post.json
 * (sin necesidad de que el servidor esté accesible)
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { getDailyTopic } from "./content-strategy.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CUSTOM_TOPIC = process.argv[3] || null;

async function searchTrends(topic) {
  try {
    console.log(`\n🔍 Buscando tendencias: "${topic.focusKeyword}"...`);
    const SEARCH_TIMEOUT_MS = 30_000;
    const searchPromise = anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Busca información actualizada sobre: "${topic.focusKeyword}" en turismo Huasteca Potosina, México. Dame datos recientes y tendencias.`
      }]
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout web_search (${SEARCH_TIMEOUT_MS / 1000}s)`)), SEARCH_TIMEOUT_MS)
    );
    const searchResponse = await Promise.race([searchPromise, timeoutPromise]);
    const textBlock = searchResponse.content.find(b => b.type === "text");
    return textBlock?.text || "";
  } catch (e) {
    console.warn(`⚠️  Web search no disponible: ${e.message}`);
    return "";
  }
}

async function generatePost(topic, trendContext = "") {
  console.log(`\n✍️  Redactando artículo: "${topic.title}"\n`);
  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const prompt = `Eres Manolo Covarrubias, experto en turismo de la Huasteca Potosina con más de 10 años explorando la región.

HOY ES: ${today}
TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}

${trendContext ? `CONTEXTO WEB:\n${trendContext}\n` : ""}

Escribe un artículo de 900–1,100 palabras con framework EEAT. Incluye:
- Introducción con anécdota personal
- 3–5 secciones H2 con datos y fuentes
- 2 imágenes Unsplash con <figure>
- Links internos a /planear y /destinos/...
- CTA final con <div class="cta-box">
- Señales EEAT: experiencia personal, expertise técnico, autoridad, confianza

URLs Unsplash disponibles:
- https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80 (selva)
- https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80 (río)
- https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80 (cascada)
- https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80 (pueblo)

Responde SOLO con JSON válido:
{
  "slug": "keyword-con-guiones-${new Date().getFullYear()}",
  "metaTitle": "Título SEO máx 60 chars",
  "title": "Título H1 completo",
  "metaDescription": "Descripción 140-155 chars con keyword",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "Resumen 2 líneas evocador con keyword",
  "content": "HTML completo del artículo",
  "authorBio": "<div class='author-bio'><img src='https://ui-avatars.com/api/?name=Manolo+Covarrubias&background=2D4A1A&color=EDE0C4&size=80' alt='Manolo Covarrubias' /><div><h4>Manolo Covarrubias</h4><p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región.</p><a href='/planear'>Ver itinerarios →</a></div></div>",
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "igual que title",
    "description": "igual que metaDescription",
    "datePublished": "${new Date().toISOString()}",
    "author": {"@type": "Person", "name": "Manolo Covarrubias"},
    "publisher": {"@type": "Organization", "name": "Huasteca Potosina"},
    "keywords": "${topic.focusKeyword}",
    "articleSection": "${topic.category}"
  },
  "coverImageUrl": "URL Unsplash elegida",
  "coverImageAlt": "Alt text SEO con keyword",
  "coverImageFile": "${topic.focusKeyword.toLowerCase().replace(/\s+/g, '-')}-${new Date().getFullYear()}.jpg",
  "internalLinks": ["/planear"],
  "externalSources": ["SECTUR - fuente"],
  "tags": ["Huasteca Potosina", "${topic.category}"],
  "readingTime": 6
}`;

  // Usar streaming para evitar timeouts de proxy con respuestas largas
  let fullText = "";
  process.stdout.write("   Generando");
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
      fullText += chunk.delta.text;
      process.stdout.write(".");
    }
  }
  console.log(" listo!");
  const message = { content: [{ text: fullText }] };

  let raw = message.content[0].text.trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON válido en respuesta");

  let post;
  try {
    post = JSON.parse(match[0]);
  } catch {
    let partial = match[0];
    let b = 0, br = 0;
    for (const ch of partial) {
      if (ch === "{") b++; else if (ch === "}") b--;
      if (ch === "[") br++; else if (ch === "]") br--;
    }
    post = JSON.parse(partial + "]".repeat(Math.max(0, br)) + "}".repeat(Math.max(0, b)));
  }

  if (post.schemaMarkup && typeof post.schemaMarkup === "object") {
    post.schemaMarkup = JSON.stringify(post.schemaMarkup);
  }

  return post;
}

async function main() {
  console.log("\n📝  GENERADOR DE POST — Huasteca Potosina");
  console.log("═".repeat(50));

  const topic = getDailyTopic([], CUSTOM_TOPIC);
  console.log(`\n📌 Tema: ${topic.title}`);

  const trendContext = await searchTrends(topic);
  const post = await generatePost(topic, trendContext);

  const outputPath = new URL("./pending-post.json", import.meta.url).pathname;
  writeFileSync(outputPath, JSON.stringify(post, null, 2), "utf8");

  console.log(`\n✅ Post guardado en: pending-post.json`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Título: ${post.title}`);
  console.log(`   Chars contenido: ${post.content?.length || 0}`);
  console.log("\n▶  Siguiente paso: node publish-from-file.js\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
