/**
 * fix-content-images.js
 * Reemplaza TODAS las imágenes dentro del contenido de cada blog
 * con imágenes locales del tema correcto.
 *
 * Uso: node fix-content-images.js
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const ROOT        = path.resolve(__dirname, "..");
const PUBLIC_IMG  = path.join(ROOT, "public", "imagenes");
const SITE_URL    = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;
const IMG_EXTS    = /\.(jpg|jpeg|webp|avif)$/i;

// ── Mismo mapeo de temas que migrate-images ───────────────────
const TOPIC_MAP = [
  { folder: "familias-huasteca",            keywords: ["ninos", "niños", "familia", "familiar", "children"] },
  { folder: "cultura-huasteca",             keywords: ["cultura", "tradicion", "tradición", "musica", "música", "xantolo", "danza", "festival"] },
  { folder: "estaciones-huasteca",          keywords: ["epoca", "época", "temporada", "cuando ir", "lluvia", "seca", "mejor mes", "mejor epoca"] },
  { folder: "papan-huasteco",               keywords: ["papan", "papán", "cena", "restaurante", "comida", "gastronomia", "platillos", "vinos"] },
  { folder: "hotel-paraiso-encantado",      keywords: ["hospedaje", "hotel", "alojamiento", "donde dormir", "paraiso", "encantado"] },
  { folder: "las-pozas-jardin-surrealista", keywords: ["pozas", "edward james", "las pozas", "surrealista", "jardin"] },
  { folder: "cascadas-de-tamasopo",         keywords: ["tamasopo"] },
  { folder: "cascada-de-tamul",             keywords: ["tamul", "canon", "cañon", "cañón"] },
  { folder: "cascada-el-meco",              keywords: ["meco", "salto del meco"] },
  { folder: "cascada-el-salto",             keywords: ["el salto"] },
  { folder: "cascadas-de-micos",            keywords: ["micos", "tirolesa", "bici aerea"] },
  { folder: "laguna-media-luna",            keywords: ["media luna", "laguna", "bucear", "buceo", "snorkel"] },
  { folder: "rio-tampaon-rafting",          keywords: ["tampaon", "rafting", "kayak", "canoa"] },
  { folder: "sotano-de-las-golondrinas",    keywords: ["golondrinas", "sotano golondrinas"] },
  { folder: "sotano-de-las-huahuas",        keywords: ["huahuas"] },
  { folder: "voladores-tamaleton",          keywords: ["voladores", "tamaleton"] },
  { folder: "xilitla-pueblo-magico",        keywords: ["xilitla", "pueblo magico", "cafe", "café", "altura"] },
  { folder: "zona-arqueologica-tamtoc",     keywords: ["tamtoc", "arqueologica"] },
  { folder: "puente-de-dios-tamasopo",      keywords: ["puente de dios", "puente dios"] },
  { folder: "nacimiento-huichihuayan",      keywords: ["huichihuayan"] },
  { folder: "nacimiento-tambaque",          keywords: ["tambaque"] },
  { folder: "cuevas-de-mantetzulel",        keywords: ["mantetzulel", "cueva"] },
  { folder: "castillo-de-la-salud",         keywords: ["castillo de la salud"] },
  { folder: "hacienda-los-gomez",           keywords: ["hacienda"] },
  { folder: "balneario-taninul",            keywords: ["taninul", "balneario", "termal"] },
  { folder: "cascadas-minas-viejas",        keywords: ["minas viejas"] },
];

function normalize(str) {
  return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").trim();
}

function findBestFolder(post) {
  const text = normalize([post.slug, post.title, post.focusKeyword, ...(post.tags || [])].join(" "));
  for (const { folder, keywords } of TOPIC_MAP) {
    if (keywords.some(k => text.includes(normalize(k)))) return folder;
  }
  // Fallback: cascadas generales
  return "cascadas-de-tamasopo";
}

function getImagesFromFolder(folder) {
  const dir = path.join(PUBLIC_IMG, folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMG_EXTS.test(f))
    .map(f => `${SITE_URL}/imagenes/${folder}/${f}`);
}

function pickSequential(images, index) {
  return images[index % images.length];
}

function replaceContentImages(content, folder) {
  const images = getImagesFromFolder(folder);
  if (images.length === 0) return content;

  let imgIndex = 0;

  // Reemplazar src de cualquier <img ...> (incluyendo Unsplash sin extensión)
  return content.replace(/<img([^>]*?)src="([^"]+)"([^>]*?)>/gi, (match, pre, src, post) => {
    const replacement = pickSequential(images, imgIndex++);
    return `<img${pre}src="${replacement}"${post}>`;
  });
}

async function main() {
  console.log("\n🖼️  Corrigiendo imágenes dentro del contenido de los blogs...\n");

  const res = await fetch(`${SITE_URL}/api/blog/create?full=1`, {
    headers: { Authorization: `Bearer ${BLOG_SECRET}` }
  });
  const { posts = [] } = await res.json();
  console.log(`📚 Posts: ${posts.length}\n`);

  let updated = 0;

  for (const post of posts) {
    const folder  = findBestFolder(post);
    const images  = getImagesFromFolder(folder);
    const matched = TOPIC_MAP.find(t => t.folder === folder)?.keywords
      .some(k => normalize([post.slug, post.title, post.focusKeyword].join(" ")).includes(normalize(k)));

    // Contar imágenes actuales
    const currentImgs = (post.content || "").match(/<img[^>]+src="[^"]+"/gi) || [];

    console.log(`📝 ${post.slug}`);
    console.log(`   📁 ${folder} ${matched ? "✅ match" : "🎲 fallback"} | ${images.length} imágenes disponibles`);
    console.log(`   🔄 ${currentImgs.length} imagen(es) en contenido a reemplazar`);

    if (currentImgs.length === 0) {
      console.log("   ⏭️  Sin imágenes en contenido, skip\n");
      continue;
    }

    const newContent = replaceContentImages(post.content, folder);

    // Verificar que algo cambió
    if (newContent === post.content) {
      console.log("   ✅ Ya están correctas\n");
      continue;
    }

    // También actualizar cover con primera imagen del folder
    const coverImageUrl = images[0];
    const coverImageAlt = `${post.focusKeyword || post.title} — Huasteca Potosina ${new Date().getFullYear()}`;

    const r = await fetch(`${SITE_URL}/api/blog/update-images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BLOG_SECRET}` },
      body: JSON.stringify({ slug: post.slug, coverImageUrl, coverImageAlt, content: newContent })
    });

    if (r.ok) {
      console.log(`   ✅ Contenido e imágenes actualizados\n`);
      updated++;
    } else {
      console.log(`   ❌ Error: ${await r.text()}\n`);
    }

    await new Promise(r => setTimeout(r, 400));
  }

  console.log("═".repeat(50));
  console.log(`✅ ${updated} blogs actualizados con imágenes del tema correcto`);
  console.log("═".repeat(50) + "\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
