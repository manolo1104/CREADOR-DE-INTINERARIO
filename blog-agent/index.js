/**
 * blog-agent/index.js
 * Genera un artículo de blog diario para Huasteca Potosina,
 * optimizado para SEO, y lo publica en el sitio vía API.
 *
 * Uso:
 *   node index.js              ← publica el post del día
 *   node index.js --dry-run    ← muestra el post sin publicar
 *   node index.js --topic "cascada de tamul guia" ← tema específico
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import { getDailyTopic, getUsedSlugs } from "./content-strategy.js";

const DRY_RUN = process.argv.includes("--dry-run");
const CUSTOM_TOPIC = process.argv.find((a, i) => process.argv[i - 1] === "--topic");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL = process.env.SITE_URL || "https://creador-de-intinerario-production.up.railway.app";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;

// ── Generar post con Claude ────────────────────────────────

async function generatePost(topic) {
  console.log(`\n🧠 Generando post: "${topic.title}"\n`);

  const prompt = `Eres un experto en turismo y SEO especializado en la Huasteca Potosina, México.

Escribe un artículo de blog completo y profundo con estas especificaciones:

TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}
TONO: Evocador, auténtico, local — no genérico. Como si lo escribiera alguien que conoce la región profundamente.

ESTRUCTURA OBLIGATORIA:
1. Intro impactante (2-3 párrafos) — engancha con una imagen sensorial de la Huasteca
2. Al menos 4 secciones H2 con contenido profundo
3. 1-2 secciones H3 dentro de las H2 más largas
4. Lista con tips prácticos (precios, horarios, consejos reales)
5. Sección "Cómo llegar" o "Info práctica"
6. CTA final hacia el creador de itinerario

CTAs QUE DEBES INCLUIR (exactamente así, en HTML):
- Al menos 2 veces: <a href="/planear" class="cta-link">Crea tu itinerario personalizado gratis con IA →</a>
- Una vez en la intro: menciona "el <a href='/planear'>creador de itinerario IA</a> de Huasteca Potosina"
- Links internos a destinos cuando sea relevante: <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas</a>, <a href="/destinos/cascada-de-tamul">Cascada de Tamul</a>, etc.

IMÁGENES — incluye al menos 2 con este formato exacto:
<figure>
  <img src="[URL_UNSPLASH_REAL]" alt="[descripción SEO con keyword]" loading="lazy" />
  <figcaption>[caption descriptivo]</figcaption>
</figure>

Usa imágenes de Unsplash con URLs reales como:
- https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80 (cascada/naturaleza)
- https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80 (selva verde)
- https://images.unsplash.com/photo-1543039625-14cbd3802e7d?w=1200&q=80 (montañas México)
- https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80 (río/agua azul)

REQUISITOS SEO:
- Usa el keyword principal en el primer párrafo, en un H2 y de forma natural en el texto
- Keywords secundarios deben aparecer al menos una vez cada uno
- Texto mínimo: 1,200 palabras
- Usa negritas en datos importantes (<strong>)

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto antes ni después):
{
  "slug": "url-amigable-con-guiones",
  "title": "Título SEO optimizado (máx 60 chars)",
  "metaDescription": "Descripción para Google (máx 155 chars, incluye keyword)",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "Resumen atractivo de 2-3 líneas para la lista del blog",
  "content": "HTML COMPLETO del artículo",
  "coverImageUrl": "URL de Unsplash para la imagen de portada",
  "coverImageAlt": "Alt text SEO de la portada",
  "tags": ["tag1", "tag2", "tag3"],
  "readingTime": 7
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  let raw = message.content[0].text.trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude no devolvió JSON válido");

  const post = JSON.parse(match[0]);
  console.log(`✅ Post generado: "${post.title}" (${post.readingTime} min, ${post.content.length} chars)`);
  return post;
}

// ── Publicar en el sitio ───────────────────────────────────

async function publishPost(post) {
  if (DRY_RUN) {
    console.log("\n🧪 DRY-RUN — Post NO publicado. Preview:\n");
    console.log(`Slug:     ${post.slug}`);
    console.log(`Título:   ${post.title}`);
    console.log(`Keyword:  ${post.focusKeyword}`);
    console.log(`Meta:     ${post.metaDescription}`);
    console.log(`Excerpt:  ${post.excerpt}`);
    console.log(`Tags:     ${post.tags.join(", ")}`);
    console.log(`\nContent preview (500 chars):\n${post.content.slice(0, 500)}...`);
    return;
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
  if (!res.ok) throw new Error(`API error: ${data.error}`);

  console.log(`\n🚀 Post publicado: ${SITE_URL}/blog/${data.post.slug}`);
  return data.post;
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log("\n📝 BLOG AGENT — Huasteca Potosina");
  console.log("═".repeat(50));
  console.log(`Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);

  // Obtener posts ya publicados para no repetir
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

  // Seleccionar tema del día
  const topicTitle = CUSTOM_TOPIC || null;
  const topic = getDailyTopic(usedSlugs, topicTitle);
  console.log(`\n📌 Tema: ${topic.title}`);
  console.log(`🔑 Keyword: ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría: ${topic.category}`);

  // Generar con Claude
  const post = await generatePost(topic);

  // Publicar
  await publishPost(post);

  console.log("\n" + "═".repeat(50));
  console.log("✅ Blog Agent completado.");
  console.log("═".repeat(50) + "\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
