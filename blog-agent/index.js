/**
 * blog-agent/index.js
 * ─────────────────────────────────────────────────────────
 * Agente de contenido diario para Huasteca Potosina.
 * Framework: EEAT (Experiencia, Expertise, Autoridad, Confianza)
 * Autor: Manolo Covarrubias
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

const DRY_RUN  = process.argv.includes("--dry-run");
const TOPIC_IDX = process.argv.indexOf("--topic");
const CUSTOM_TOPIC = TOPIC_IDX !== -1 ? process.argv[TOPIC_IDX + 1] : null;

const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SITE_URL   = process.env.SITE_URL || "https://creador-de-intinerario-production.up.railway.app";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;

// ── 1. Buscar tendencias actuales ─────────────────────────

async function searchTrends(topic) {
  // Usa la herramienta web_search de Claude para encontrar tendencias reales
  console.log(`\n🔍 Buscando tendencias: "${topic.focusKeyword}"...`);

  const searchResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Busca en internet información actualizada sobre: "${topic.focusKeyword}" en el contexto de turismo en Huasteca Potosina, México. Necesito: 1) datos o cifras recientes, 2) tendencias de búsqueda, 3) información práctica actualizada para ${new Date().getFullYear()}. Dame un resumen de los hallazgos más relevantes.`
    }]
  });

  // Extraer texto de la respuesta
  const textBlock = searchResponse.content.find(b => b.type === "text");
  return textBlock?.text || "";
}

// ── 2. Generar artículo con EEAT ──────────────────────────

async function generatePost(topic, trendContext = "") {
  console.log(`\n✍️  Redactando artículo EEAT: "${topic.title}"\n`);

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const prompt = `Eres Manolo Covarrubias, experto en turismo de la Huasteca Potosina con más de 10 años explorando la región. Escribes contenido para el blog de HuastecaPotosina.mx — la plataforma de itinerarios de viaje con IA más completa de la región.

HOY ES: ${today}
TEMA DEL ARTÍCULO: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}

${trendContext ? `CONTEXTO ACTUAL (tendencias y datos encontrados en internet):\n${trendContext}\n` : ""}

━━━ INSTRUCCIONES DE REDACCIÓN ━━━

Escribe un artículo de 900–1,100 palabras siguiendo el framework EEAT con esta estructura:

**INTRODUCCIÓN** (150 palabras)
Abre con una imagen sensorial y vivida de la Huasteca Potosina. En el segundo párrafo, incluye una anécdota o experiencia personal de Manolo Covarrubias que establezca credibilidad inmediata. Menciona el creador de itinerario con IA: <a href="/planear" class="cta-link">planea tu ruta con nuestra herramienta de itinerarios IA</a>.

**3–5 SECCIONES H2** (200–250 palabras cada una)
Cada H2 debe:
- Incluir una keyword secundaria en el texto de manera natural
- Contener al menos 1 dato con fuente y año (ej: "Según SECTUR 2025...")
- Tener al menos 1 etiqueta <strong> en un dato clave

**SEÑALES EEAT OBLIGATORIAS:**

🔹 EXPERIENCIA — En al menos 2 secciones incluye frases como:
"En mis visitas a la Huasteca, he comprobado que...", "La primera vez que llegué a [lugar]...", "Después de recorrer esta ruta decenas de veces..."

🔹 EXPERTISE — Usa vocabulario técnico real: nombres exactos de comunidades, tiempos de traslado reales, precios actualizados ${new Date().getFullYear()}, flora/fauna específica.

🔹 AUTORIDAD — Menciona cuando sea natural: "Como guía y promotor turístico de la Huasteca Potosina..." o referencias a conocimiento local profundo.

🔹 CONFIANZA — Al menos 1 advertencia o consejo honesto sobre dificultades reales (clima, caminos, temporadas), no solo lo positivo.

**RECOMENDACIONES DE ALIADOS (si aplica el contexto):**
- Si el artículo menciona gastronomía, restaurantes o comida: incluye → "En mi visita más reciente, Manolo Covarrubias eligió <a href="https://paraisoencantadoxilitla.lat">El Papán Huasteco</a> en Xilitla — la cocina de fogón auténtica que todo viajero merece probar al menos una vez."
- Si el artículo menciona hospedaje, hoteles o dónde dormir: incluye → "Para quien busca despertar entre la selva a pasos del Jardín de Edward James, el <a href="https://paraisoencantadoxilitla.lat">Hotel Paraíso Encantado</a> en Xilitla es la elección que Manolo Covarrubias recomienda sin reservas — lo he vivido."

**IMÁGENES (2 obligatorias):**
Incluye en el HTML exactamente así:
<figure>
  <img src="URL_UNSPLASH" alt="[keyword + descripción SEO]" loading="lazy" />
  <figcaption>[Caption descriptivo y natural]</figcaption>
</figure>

URLs de Unsplash disponibles (elige las más apropiadas al tema):
- https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80 (selva verde densa)
- https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80 (río turquesa)
- https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80 (cascada montaña)
- https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80 (bosque tropical)
- https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80 (cueva roca)
- https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80 (aventura naturaleza)
- https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80 (pueblo mexicano)

**LINKS INTERNOS (2–3):**
Enlaza a destinos relevantes del sitio:
- <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas (Jardín Surrealista)</a>
- <a href="/destinos/cascada-de-tamul">Cascada de Tamul</a>
- <a href="/destinos/sotano-de-las-golondrinas">Sótano de las Golondrinas</a>
- <a href="/destinos/cascadas-de-micos">Cascadas de Micos</a>
- <a href="/destinos/puente-de-dios-tamasopo">Puente de Dios</a>
- <a href="/planear">Creador de Itinerario IA</a>

**FUENTES EXTERNAS (1–2):**
Cita fuentes reales reconocidas como SECTUR, INEGI, UNESCO, o medios como National Geographic, Travesías, etc. Ejemplo: "Según datos de la Secretaría de Turismo de San Luis Potosí (${new Date().getFullYear()})..."

**CONCLUSIÓN + CTA:**
Cierra con una reflexión personal de Manolo Covarrubias y termina con:
<div class="cta-box">
  <p>¿Listo para vivir la Huasteca Potosina? <strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios ${new Date().getFullYear()}.</p>
  <a href="/planear" class="cta-button">Crear mi Itinerario Gratis →</a>
</div>

━━━ FORMATO DE ENTREGA ━━━

Responde ÚNICAMENTE con JSON válido (sin markdown antes ni después):

{
  "slug": "keyword-principal-con-guiones-${new Date().getFullYear()}",
  "metaTitle": "Título SEO exacto (máx 60 caracteres)",
  "title": "Título H1 completo del artículo",
  "metaDescription": "Descripción Google 140–155 chars con keyword y año",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "Resumen de 2 líneas para la lista del blog — evocador, incluye keyword",
  "content": "HTML COMPLETO del artículo con todas las secciones",
  "authorBio": "<div class='author-bio'><img src='https://ui-avatars.com/api/?name=Manolo+Covarrubias&background=2D4A1A&color=EDE0C4&size=80' alt='Manolo Covarrubias autor Huasteca Potosina' /><div><h4>Manolo Covarrubias</h4><p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región. Fundador de la plataforma de itinerarios huastecapotosina.mx y anfitrión del Hotel Paraíso Encantado en Xilitla, San Luis Potosí. Ha guiado a cientos de viajeros por las cascadas, cañones y selvas de esta región extraordinaria.</p><a href='/planear'>Ver itinerarios →</a></div></div>",
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "[igual que title]",
    "description": "[igual que metaDescription]",
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    "author": {
      "@type": "Person",
      "name": "Manolo Covarrubias",
      "url": "https://creador-de-intinerario-production.up.railway.app/planear",
      "jobTitle": "Promotor Turístico y Experto en Huasteca Potosina",
      "knowsAbout": ["Huasteca Potosina", "Turismo México", "Xilitla", "Cascadas Mexico"]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Huasteca Potosina",
      "url": "https://creador-de-intinerario-production.up.railway.app"
    },
    "keywords": "[focusKeyword + secondaryKeywords separados por coma]",
    "articleSection": "${topic.category}"
  },
  "coverImageUrl": "URL de Unsplash elegida para portada",
  "coverImageAlt": "Alt text SEO con keyword + descripción (10-15 palabras)",
  "coverImageFile": "${topic.focusKeyword.toLowerCase().replace(/\\s+/g, '-')}-${new Date().getFullYear()}.jpg",
  "internalLinks": ["/planear", "/destinos/las-pozas-jardin-surrealista"],
  "externalSources": ["nombre de fuente 1 — url o referencia", "nombre de fuente 2"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag relevante"],
  "readingTime": 6
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

  // Parsear con reparación automática si está incompleto
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
  console.log(`   Keyword: ${post.focusKeyword} | ${post.readingTime} min | ${post.content?.length || 0} chars`);
  return post;
}

// ── 3. Publicar en el sitio ────────────────────────────────

async function publishPost(post) {
  if (DRY_RUN) {
    console.log("\n🧪 DRY-RUN — Artículo NO publicado. Preview:\n");
    console.log(`Meta Título:    ${post.metaTitle}`);
    console.log(`H1 Título:      ${post.title}`);
    console.log(`Slug:           ${post.slug}`);
    console.log(`Keyword:        ${post.focusKeyword}`);
    console.log(`Meta desc:      ${post.metaDescription}`);
    console.log(`Excerpt:        ${post.excerpt}`);
    console.log(`Tags:           ${post.tags?.join(", ")}`);
    console.log(`Fuentes:        ${post.externalSources?.join(" | ")}`);
    console.log(`Cover:          ${post.coverImageUrl}`);
    console.log(`\n--- CONTENT PREVIEW (600 chars) ---`);
    console.log(post.content?.slice(0, 600) + "...");
    console.log(`\n--- AUTHOR BIO ---`);
    console.log(post.authorBio?.replace(/<[^>]+>/g, "").trim());
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
  if (!res.ok) throw new Error(`API error ${res.status}: ${data.error}`);

  console.log(`\n🚀 Publicado: ${SITE_URL}/blog/${data.post.slug}`);
  return data.post;
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log("\n📝  BLOG AGENT — Huasteca Potosina");
  console.log(`    Framework: EEAT · Autor: Manolo Covarrubias`);
  console.log(`    Modo: ${DRY_RUN ? "🧪 DRY-RUN" : "🚀 LIVE"}`);
  console.log("═".repeat(55));

  // Obtener posts ya publicados para no repetir keywords
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
  console.log(`\n📌 Tema: ${topic.title}`);
  console.log(`🔑 Keyword principal: ${topic.focusKeyword}`);
  console.log(`🏷️  Categoría: ${topic.category}`);

  // Buscar tendencias actuales
  let trendContext = "";
  try {
    trendContext = await searchTrends(topic);
    if (trendContext) console.log(`🌐 Contexto web obtenido (${trendContext.length} chars)`);
  } catch (e) {
    console.warn(`⚠️  Web search no disponible: ${e.message} — usando conocimiento del modelo`);
  }

  // Generar artículo con EEAT
  const post = await generatePost(topic, trendContext);

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
