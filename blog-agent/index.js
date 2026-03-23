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

  const schemaType = topic.schemaType || "TouristAttraction";

  const prompt = `Eres el dueño del Hotel Paraíso Encantado en Xilitla, San Luis Potosí — familia local con raíces profundas en la Huasteca Potosina. Escribes para el blog de paraisoencantado.com con un objetivo claro: que el viajero llegue a tu creador de itinerarios y, cuando visite, se hospede contigo.

Tono: cálido, experto, persuasivo. Como un amigo que conoce cada vereda de la región.
Nunca uses: "en conclusión", "sin duda alguna", "increíble experiencia", "no te lo puedes perder".
Párrafos: máximo 3 líneas. Oraciones: máximo 18 palabras.
Emojis: máximo 2 en todo el artículo.

HOY ES: ${today}
TEMA: ${topic.title}
KEYWORD PRINCIPAL: ${topic.focusKeyword}
KEYWORDS SECUNDARIOS: ${topic.secondaryKeywords.join(", ")}
CATEGORÍA: ${topic.category}
TIPO DE SCHEMA: ${schemaType}

${trendContext ? `DATOS ACTUALES (encontrados en internet):\n${trendContext}\n` : ""}

KEYWORDS LSI — incluye al menos 4 de estas de forma natural:
"Huasteca Potosina" (mínimo 5 veces), "Xilitla" (mínimo 4 veces), "Sierra Madre Oriental", "ríos turquesa", "selva potosina", "pueblo mágico Xilitla", "cascadas San Luis Potosí", "Hotel Paraíso Encantado" (1–2 veces, solo en sección hotel).

━━━ ESTRUCTURA OBLIGATORIA DEL ARTÍCULO ━━━

EXTENSIÓN: 950–1,100 palabras de contenido de texto (sin contar HTML de figuras ni CTAs).

【INTRODUCCIÓN】(120–150 palabras)
Estructura: Problema o pregunta del viajero → Solución que ofrece este artículo → Promesa concreta.
La keyword principal debe aparecer en las primeras 100 palabras.
Cierra con señal E-E-A-T: "En el Paraíso Encantado llevamos años viendo cómo los viajeros llegan con dudas sobre [tema] — esta guía resume lo que le diríamos a cada uno."
Enlace obligatorio: <a href="https://paraisoencantado.com/itinerarios" class="cta-link">nuestro creador de itinerarios gratuito</a>.

Imagen hero justo después de la intro:
<figure>
  <img src="[URL de la categoría correcta]" alt="[keyword + descripción visual específica, 10-12 palabras]" loading="lazy" width="1200" height="630" />
  <figcaption>[Descripción atractiva relacionada al párrafo]</figcaption>
</figure>

【3–4 SECCIONES H2】(220–260 palabras cada una)
Cada H2 debe:
- Llevar una keyword secundaria o LSI integrada de forma natural
- Incluir al menos 1 dato concreto con fuente y año (precio, distancia, tiempo, cifra oficial)
- Resaltar ese dato con <strong>
- Tener al menos 1 <h3> interno si la sección lo amerita

Señales E-E-A-T en al menos 2 secciones:
"Cuando acompañamos a huéspedes a [lugar], siempre les decimos..."
"Desde el hotel hemos visto cómo esto cambia de temporada a temporada..."
"La ruta que nosotros tomamos y recomendamos es..."

Incluye al menos 1 advertencia honesta en el artículo completo: camino en mal estado, temporada a evitar, coste oculto o limitación real.

Links internos (2–3, solo los relevantes al tema):
- <a href="https://paraisoencantado.com/itinerarios">nuestro creador de itinerarios</a>
- <a href="https://paraisoencantado.com/habitaciones">habitaciones del Hotel Paraíso Encantado</a>
- <a href="https://paraisoencantado.com/blog">más guías de la Huasteca Potosina</a>

Links externos con rel="noopener nofollow" a fuentes reales:
SECTUR, INEGI, UNESCO, laspozasxilitla.org.mx, Lonely Planet, National Geographic.

【BLOQUE CTA ITINERARIOS】— insertar DESPUÉS de la segunda sección H2:
<div class="cta-box cta-selva">
  <p><strong>[Frase gancho de 1 línea relacionada al tema del artículo]</strong></p>
  <p>[Beneficio concreto en 1 línea: qué hace el creador de itinerarios por el viajero]</p>
  <a href="https://paraisoencantado.com/itinerarios" class="cta-button">Crear mi itinerario gratis →</a>
</div>

【SECCIÓN FAQ】(H2: "Preguntas frecuentes sobre [tema]")
Genera 4–5 preguntas reales que la gente busca en Google (People Also Ask) sobre este tema.
Formato exacto:
<section class="faq-section">
  <h2>Preguntas frecuentes sobre [tema en minúsculas]</h2>
  <dl>
    <dt>[Pregunta 1 real y específica?]</dt>
    <dd>[Respuesta directa. Máx 60 palabras. Incluye keyword si es natural.]</dd>
    <dt>[Pregunta 2]</dt>
    <dd>[Respuesta]</dd>
    ... (4–5 preguntas en total)
  </dl>
</section>

【SECCIÓN HOTEL】(H2: "Dónde hospedarte en [lugar]: Hotel Paraíso Encantado")
2 párrafos: ubicación privilegiada, cercanía al atractivo principal del artículo, por qué es la mejor base para explorar.
Menciona: "hoteles en la Huasteca Potosina" y "Hotel Paraíso Encantado en Xilitla".
Imagen de hospedaje:
<figure>
  <img src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80" alt="Hotel Paraíso Encantado Xilitla habitación con vista a la selva" loading="lazy" width="900" height="500" />
  <figcaption>Hotel Paraíso Encantado, a pasos del Jardín Surrealista de Edward James en Xilitla</figcaption>
</figure>
CTA de reservas:
<div class="cta-box cta-reservas">
  <h3>¿Listo para vivir la Huasteca Potosina?</h3>
  <p>Reserva directo. Sin intermediarios. Mejor precio garantizado.</p>
  <a href="https://booking-paraisoencantado.up.railway.app/" class="cta-button cta-naranja">Reservar ahora →</a>
</div>

【CONCLUSIÓN】(80–100 palabras)
Reflexión personal como anfitrión local. Termina con enlace al itinerario.

━━━ BIBLIOTECA DE IMÁGENES ━━━

REGLA: elige la imagen que describa con precisión el contenido de esa sección. No uses imágenes genéricas.

CASCADAS Y RÍOS:
- https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80 (cascada entre montañas)
- https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1200&q=80 (río turquesa)
- https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80 (cascada tropical)

SELVA Y NATURALEZA:
- https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80 (selva densa)
- https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80 (bosque verde)
- https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80 (selva tropical)

CUEVAS Y FORMACIONES:
- https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80 (cueva rocosa)
- https://images.unsplash.com/photo-1504208434309-4f4efce3f033?w=1200&q=80 (entrada sótano)

AVENTURA Y SENDERISMO:
- https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80 (aventura exterior)
- https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80 (senderismo montaña)
- https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80 (kayak río)

HOSPEDAJE:
- https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80 (hotel selva piscina)
- https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80 (hotel jardín tropical)
- https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80 (habitación boutique)

GASTRONOMÍA:
- https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80 (tacos mexicanos)
- https://images.unsplash.com/photo-1504544750208-dc0358ad4601?w=1200&q=80 (platillos tradicionales)
- https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80 (comida regional)

PUEBLO Y CULTURA:
- https://images.unsplash.com/photo-1502920514313-52581002a659?w=1200&q=80 (pueblo colonial)
- https://images.unsplash.com/photo-1568954500045-b8a40f7bfc01?w=1200&q=80 (arquitectura colonial)
- https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=1200&q=80 (artesanías mercado)

TRANSPORTE:
- https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80 (autobús carretera)
- https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80 (carretera paisaje)

━━━ NORMAS DE REDACCIÓN ━━━

ORTOGRAFÍA: tildes siempre (á, é, í, ó, ú, ü, ñ). Sin excepciones.
TÍTULOS H2/H3: primera letra en mayúscula, resto en minúsculas (salvo nombres propios).
  ✓ "Cómo llegar al sótano de las golondrinas"
  ✗ "Cómo Llegar Al Sótano De Las Golondrinas"
HIPERVÍNCULOS: texto ancla descriptivo y con keyword.
  ✓ <a href="...">el sótano de las golondrinas</a>
  ✗ <a href="...">haz clic aquí</a>
PROHIBIDO inventar precios sin fuente. Si no tienes el precio exacto, da un rango con año.

━━━ SCHEMA JSON-LD ━━━

Genera el schema del tipo: ${schemaType}
- Si es FAQPage: incluye todas las preguntas del FAQ section
- Si es HowTo: incluye los pasos principales del artículo
- Si es TouristAttraction: incluye nombre, descripción, dirección y url

━━━ FORMATO DE ENTREGA ━━━

Responde ÚNICAMENTE con JSON válido (sin markdown antes ni después):

{
  "slug": "keyword-sin-tildes-con-guiones-${new Date().getFullYear()}",
  "metaTitle": "Título SEO — keyword al inicio, máx 60 caracteres",
  "title": "Título H1 completo con tildes y ñ correctos",
  "metaDescription": "Descripción Google 140–155 caracteres, keyword + beneficio + gancho",
  "focusKeyword": "${topic.focusKeyword}",
  "secondaryKeywords": ${JSON.stringify(topic.secondaryKeywords)},
  "excerpt": "2 oraciones para la lista del blog — keyword + promesa de valor concreta",
  "content": "HTML COMPLETO: intro + imagen hero + secciones H2 + bloque CTA + FAQ + sección hotel + conclusión",
  "authorBio": "<div class='author-bio'><img src='https://ui-avatars.com/api/?name=Paraiso+Encantado&background=2D4A1A&color=EDE0C4&size=80' alt='Hotel Paraíso Encantado Xilitla anfitrión local' /><div><h4>Hotel Paraíso Encantado</h4><p>Familia local de Xilitla con más de una década recibiendo viajeros en la Huasteca Potosina. Conocemos cada cascada, cada vereda y cada secreto de la Sierra Madre Oriental. Nuestra misión: que tu viaje sea tan auténtico como esta tierra.</p><a href='https://paraisoencantado.com/itinerarios'>Planea tu itinerario →</a></div></div>",
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "${schemaType}",
    "headline": "[igual que title]",
    "description": "[igual que metaDescription]",
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}",
    "author": {
      "@type": "Organization",
      "name": "Hotel Paraíso Encantado",
      "url": "https://paraisoencantado.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Hotel Paraíso Encantado",
      "url": "https://paraisoencantado.com"
    },
    "keywords": "[focusKeyword, secondary keywords separados por coma]",
    "articleSection": "${topic.category}"
  },
  "coverImageUrl": "URL de la biblioteca que mejor represente el tema del artículo",
  "coverImageAlt": "Alt text SEO: keyword + descripción visual específica (10-12 palabras)",
  "coverImageFile": "${topic.focusKeyword.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'')}-${new Date().getFullYear()}.jpg",
  "internalLinks": ["https://paraisoencantado.com/itinerarios", "https://paraisoencantado.com/habitaciones"],
  "externalSources": ["nombre fuente — referencia o URL"],
  "tags": ["Huasteca Potosina", "Xilitla", "${topic.category}"],
  "readingTime": 5
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
