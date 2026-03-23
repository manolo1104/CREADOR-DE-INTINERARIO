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

  const SEARCH_TIMEOUT_MS = 30_000;

  const searchPromise = anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Busca en internet información actualizada sobre: "${topic.focusKeyword}" en el contexto de turismo en Huasteca Potosina, México. Necesito: 1) datos o cifras recientes, 2) tendencias de búsqueda, 3) información práctica actualizada para ${new Date().getFullYear()}. Dame un resumen de los hallazgos más relevantes.`
    }]
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout web_search (${SEARCH_TIMEOUT_MS / 1000}s)`)), SEARCH_TIMEOUT_MS)
  );

  const searchResponse = await Promise.race([searchPromise, timeoutPromise]);

  // Extraer texto de la respuesta
  const textBlock = searchResponse.content.find(b => b.type === "text");
  return textBlock?.text || "";
}

// ── 2. Generar artículo con EEAT ──────────────────────────

async function generatePost(topic, trendContext = "") {
  console.log(`\n✍️  Redactando artículo EEAT: "${topic.title}"\n`);

  const today = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const prompt = `Eres Manolo Covarrubias, promotor turístico de la Huasteca Potosina con más de 10 años explorando la región. Escribes para el blog de HuastecaPotosina.mx — la plataforma de itinerarios con IA más completa de la región.

HOY ES: ${today}
TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}

${trendContext ? `CONTEXTO ACTUAL (datos reales encontrados en internet):\n${trendContext}\n` : ""}

━━━ NORMAS DE REDACCIÓN ━━━

IDIOMA Y ORTOGRAFÍA:
- Escribe SIEMPRE en español correcto: usa tildes (á, é, í, ó, ú, ü, ñ) en todas las palabras que las llevan.
- Títulos y subtítulos: primera letra en mayúscula, el resto en minúsculas (salvo nombres propios).
  Correcto: "Dónde hospedarse cerca de las cascadas"
  Incorrecto: "Dónde Hospedarse Cerca De Las Cascadas"
- Hipervínculos: el texto del enlace debe ser descriptivo, nunca "haz clic aquí" o "ver más".
  Correcto: <a href="/destinos/cascada-de-tamul">la Cascada de Tamul</a>
  Incorrecto: <a href="/destinos/cascada-de-tamul">clic aquí</a>

EXTENSIÓN: 1,100–1,200 palabras de contenido (sin contar el HTML de figuras, CTAs ni bio).

━━━ ESTRUCTURA DEL ARTÍCULO ━━━

**INTRODUCCIÓN** (150–180 palabras)
Abre con una imagen sensorial y vivida. En el segundo párrafo, anécdota personal de Manolo que establezca credibilidad. Incluye el enlace al creador de itinerario:
<a href="/planear" class="cta-link">planea tu ruta personalizada con nuestra herramienta de itinerarios con IA</a>.

**4–5 SECCIONES H2** (200–250 palabras cada una)
Cada H2 debe:
- Contener una keyword secundaria integrada de forma natural en el texto (no forzada)
- Incluir al menos 1 dato con fuente y año ("Según la Secretaría de Turismo de SLP, ${new Date().getFullYear()}...")
- Resaltar con <strong> un dato o cifra clave

**SEÑALES EEAT OBLIGATORIAS:**
🔹 EXPERIENCIA — Al menos 2 secciones con frases como:
"En mis recorridos por la Huasteca, he comprobado que...", "La primera vez que llegué a [lugar]...", "Después de visitar esta ruta decenas de veces..."

🔹 EXPERTISE — Usa datos precisos: nombres de comunidades indígenas, tiempos de traslado reales, precios actuales ${new Date().getFullYear()}, flora y fauna endémica (nombres comunes y científicos si aplica).

🔹 AUTORIDAD — Cita tu experiencia local cuando sea pertinente: "Como promotor turístico de la región durante más de una década..."

🔹 CONFIANZA — Incluye al menos 1 advertencia honesta: un riesgo real, camino en malas condiciones, temporada a evitar, o limitación práctica.

**ALIADOS LOCALES (integra solo si el tema lo permite, de forma orgánica):**
- Gastronomía/restaurantes → <a href="https://paraisoencantadoxilitla.lat" rel="noopener">El Papán Huasteco en Xilitla</a>: "la cocina de fogón auténtica que todo viajero merece probar al menos una vez."
- Hospedaje/hoteles → <a href="https://paraisoencantadoxilitla.lat" rel="noopener">Hotel Paraíso Encantado en Xilitla</a>: "despertar entre la selva a pasos del Jardín de Edward James, una experiencia que recomiendo sin reservas."

━━━ IMÁGENES (2 obligatorias, 1 portada) ━━━

REGLA CRÍTICA: elige la imagen que mejor describa el contenido ESPECÍFICO de esa sección, no una imagen genérica. Si el texto habla de cascadas, usa foto de cascada. Si habla de hospedaje, usa foto de hotel/cabaña. Si habla de gastronomía, usa foto de comida.

Formato exacto:
<figure>
  <img src="[URL]" alt="[keyword principal + descripción específica de lo que muestra la imagen, 10-12 palabras]" loading="lazy" width="1200" height="800" />
  <figcaption>[Descripción natural y atractiva de lo que muestra la imagen, en relación al tema del párrafo]</figcaption>
</figure>

Biblioteca de imágenes por categoría — elige la más pertinente:

CASCADAS Y RÍOS:
- https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80 (cascada entre montañas verdes)
- https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80 (río de agua turquesa)
- https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80 (cascada tropical selva)

SELVA Y NATURALEZA:
- https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80 (selva tropical densa)
- https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80 (bosque verde exuberante)
- https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80 (naturaleza selvática)

CUEVAS Y FORMACIONES:
- https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80 (cueva formaciones rocosas)
- https://images.unsplash.com/photo-1504208434309-4f4efce3f033?w=1200&q=80 (entrada cueva sótano)

AVENTURA Y SENDERISMO:
- https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80 (aventura naturaleza)
- https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80 (senderismo montaña)
- https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80 (kayak río)

HOSPEDAJE Y CABAÑAS:
- https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80 (resort selva piscina)
- https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80 (hotel jardín tropical)
- https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80 (habitación hotel boutique)

GASTRONOMÍA MEXICANA:
- https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80 (tacos comida mexicana)
- https://images.unsplash.com/photo-1504544750208-dc0358ad4601?w=1200&q=80 (platillos tradicionales)
- https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80 (mesa comida regional)

PUEBLO Y CULTURA:
- https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80 (pueblo colonial mexico)
- https://images.unsplash.com/photo-1568954500045-b8a40f7bfc01?w=1200&q=80 (arquitectura colonial)
- https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=1200&q=80 (artesanías mercado)

TRANSPORTE Y VIAJE:
- https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80 (autobús carretera)
- https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80 (carretera paisaje)

**LINKS INTERNOS (2–3, solo los relevantes al tema del artículo):**
- <a href="/destinos/cascada-de-tamul">la Cascada de Tamul</a>
- <a href="/destinos/las-pozas-jardin-surrealista">Las Pozas de Xilitla</a>
- <a href="/destinos/sotano-de-las-golondrinas">el Sótano de las Golondrinas</a>
- <a href="/destinos/cascadas-de-micos">las Cascadas de Micos</a>
- <a href="/destinos/puente-de-dios-tamasopo">el Puente de Dios en Tamasopo</a>
- <a href="/planear">el creador de itinerarios con IA</a>

**FUENTES EXTERNAS (1–2):**
Cita fuentes reconocidas: SECTUR, INEGI, UNESCO, Lonely Planet, National Geographic, Travesías. Ejemplo: "De acuerdo con la Secretaría de Turismo de San Luis Potosí (${new Date().getFullYear()})..."

**CONCLUSIÓN + CTA** (100–120 palabras):
Reflexión personal de Manolo. Termina con:
<div class="cta-box">
  <p>¿Listo para vivir la Huasteca Potosina? <strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios actualizados para ${new Date().getFullYear()}.</p>
  <a href="/planear" class="cta-button">Crear mi itinerario gratis →</a>
</div>

━━━ FORMATO DE ENTREGA ━━━

Responde ÚNICAMENTE con JSON válido (sin markdown antes ni después):

{
  "slug": "keyword-principal-con-guiones-${new Date().getFullYear()}",
  "metaTitle": "Título SEO (máx 60 caracteres, con keyword y año si cabe)",
  "title": "Título H1 completo del artículo con tildes y ñ correctos",
  "metaDescription": "Descripción para Google de 140–155 caracteres, con keyword y gancho claro",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "Resumen atractivo de 2 oraciones para la lista del blog — incluye keyword y promesa de valor",
  "content": "HTML COMPLETO del artículo",
  "authorBio": "<div class='author-bio'><img src='https://ui-avatars.com/api/?name=Manolo+Covarrubias&background=2D4A1A&color=EDE0C4&size=80' alt='Manolo Covarrubias promotor turístico Huasteca Potosina' /><div><h4>Manolo Covarrubias</h4><p>Promotor turístico y experto en la Huasteca Potosina con más de 10 años recorriendo la región. Fundador de la plataforma de itinerarios huastecapotosina.mx y anfitrión del Hotel Paraíso Encantado en Xilitla, San Luis Potosí. Ha guiado a cientos de viajeros por las cascadas, cañones y selvas de esta región extraordinaria.</p><a href='/planear'>Ver itinerarios →</a></div></div>",
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
  "coverImageUrl": "URL de Unsplash de la categoría más relevante al tema del artículo",
  "coverImageAlt": "Alt text SEO: keyword principal + descripción de lo que muestra la imagen (10-12 palabras)",
  "coverImageFile": "${topic.focusKeyword.toLowerCase().replace(/\\s+/g, '-')}-${new Date().getFullYear()}.jpg",
  "internalLinks": ["/planear", "/destinos/cascada-de-tamul"],
  "externalSources": ["nombre de fuente — referencia o URL"],
  "tags": ["Huasteca Potosina", "${topic.category}", "tercer tag específico al tema"],
  "readingTime": 6
}`;

  // Reintentar hasta 3 veces si hay rate limit (429)
  let message;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        messages: [{ role: "user", content: prompt }],
      });
      break;
    } catch (err) {
      if (err?.status === 429 && attempt < 3) {
        const wait = attempt * 60_000; // 60s, 120s
        console.warn(`⏳ Rate limit — esperando ${wait / 1000}s antes de reintentar (${attempt}/3)...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }

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
