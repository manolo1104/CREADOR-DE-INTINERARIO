/**
 * migrate-images.js
 * Copia imágenes de /IMAGENES/ a /public/imagenes/ y actualiza los blogs.
 *
 * Uso: node migrate-images.js
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, "..");
const SRC_BASE   = path.join(ROOT, "IMAGENES");
const DEST_BASE  = path.join(ROOT, "public", "imagenes");
const SITE_URL   = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;

// ── Archivos a ignorar ────────────────────────────────────────
const SKIP_PATTERNS = [/^@/, /\.png$/i, /^rs=/, /^pre-/, /^hq720/];
const IMG_EXTS      = /\.(jpg|jpeg|webp|avif)$/i;

function isGoodImage(filename) {
  if (!IMG_EXTS.test(filename)) return false;
  return !SKIP_PATTERNS.some(p => p.test(filename));
}

function safeName(filename, index) {
  const ext = path.extname(filename).toLowerCase();
  return `gallery-${index}${ext}`;
}

function getExistingGalleryCount(destFolder) {
  if (!fs.existsSync(destFolder)) return 0;
  return fs.readdirSync(destFolder).filter(f => f.startsWith("gallery-")).length;
}

// ── Mapeo: carpeta fuente → carpeta destino ───────────────────
const FOLDER_MAP = [
  { src: "CASCADA DE TAMUL",                   dest: "cascada-de-tamul" },
  { src: "CASCADA EL AGUACATE",                dest: "cascada-el-aguacate" },
  { src: "CASCADA EL MECO",                    dest: "cascada-el-meco" },
  { src: "CASCADA EL SALTO",                   dest: "cascada-el-salto" },
  { src: "CASCADA MINAS VIEJAS",               dest: "cascadas-minas-viejas" },
  { src: "CASCADAS DE MICOS",                  dest: "cascadas-de-micos" },
  { src: "TAMASOPO",                            dest: "cascadas-de-tamasopo" },
  { src: "CUEVAS DE MANTETZULEL",              dest: "cuevas-de-mantetzulel" },
  { src: "LAGUNA MEDIA LUNA",                  dest: "laguna-media-luna" },
  { src: "JARDIN DE EDWARD JAMES",             dest: "las-pozas-jardin-surrealista" },
  { src: "NACIMIENTO DE HUICHIHUAYAN",         dest: "nacimiento-huichihuayan" },
  { src: "TAMBAQUE",                            dest: "nacimiento-tambaque" },
  { src: "PUENTE DE DIOS",                     dest: "puente-de-dios-tamasopo" },
  { src: "RIO TAMPAON ",                        dest: "rio-tampaon-rafting" },
  { src: "SOTANO DE LAS GOLONDRINAS",          dest: "sotano-de-las-golondrinas" },
  { src: "SOTANO DE LAS HUAHUAS",              dest: "sotano-de-las-huahuas" },
  { src: "VOLADORES DE TAMALETON",             dest: "voladores-tamaleton" },
  { src: "XILITLA",                             dest: "xilitla-pueblo-magico" },
  { src: "ZONA ARQUEOLOGICA TAMTOC",           dest: "zona-arqueologica-tamtoc" },
  { src: "HACIENDA LOS GOMEZ",                 dest: "hacienda-los-gomez" },
  { src: "CASTILLO DE LA SALUD",               dest: "castillo-de-la-salud" },
  // Carpetas nuevas
  { src: "FAMILIAS HUASTECA POTOSINA",         dest: "familias-huasteca" },
  { src: "CULTURA Y TRADICIONES HUASTECA POTOSINA ", dest: "cultura-huasteca" },
  { src: "ESTACIONES DEL AÑO HUASTECA POTOSINA ", dest: "estaciones-huasteca" },
  { src: "PAPAN HUASTECO ",                    dest: "papan-huasteco" },
  { src: "HOTEL PARAISO ENCANTADO",            dest: "hotel-paraiso-encantado" },
  { src: "BALNEARIO TANINUL",                  dest: "balneario-taninul" },
];

// ── Copiar imágenes ───────────────────────────────────────────
function migrateImages() {
  console.log("\n📂 Migrando imágenes de IMAGENES/ → public/imagenes/\n");
  const results = [];

  for (const { src, dest } of FOLDER_MAP) {
    const srcFolder  = path.join(SRC_BASE, src);
    const destFolder = path.join(DEST_BASE, dest);

    if (!fs.existsSync(srcFolder)) {
      console.log(`  ⏭️  ${src} — carpeta no encontrada, skip`);
      continue;
    }

    fs.mkdirSync(destFolder, { recursive: true });

    const files = fs.readdirSync(srcFolder).filter(isGoodImage);
    if (files.length === 0) {
      console.log(`  ⚠️  ${src} — sin imágenes válidas`);
      continue;
    }

    // Detectar si ya tiene hero
    const hasHero = fs.existsSync(path.join(destFolder, "hero.jpg")) ||
                    fs.existsSync(path.join(destFolder, "hero.webp")) ||
                    fs.existsSync(path.join(destFolder, "hero.avif"));

    let heroFile = null;
    let startGallery = getExistingGalleryCount(destFolder) + 1;
    let copied = 0;

    for (const file of files) {
      const srcPath  = path.join(srcFolder, file);
      const isHero   = /HERO|PORTADA/i.test(file);

      if (!hasHero && isHero && !heroFile) {
        // Usar como hero si no hay uno
        const ext      = path.extname(file).toLowerCase();
        const destPath = path.join(destFolder, `hero${ext}`);
        fs.copyFileSync(srcPath, destPath);
        heroFile = `hero${ext}`;
        copied++;
      } else {
        // Agregar como gallery
        const destName = safeName(file, startGallery++);
        const destPath = path.join(destFolder, destName);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        }
      }
    }

    // Leer resultado final
    const allImgs = fs.readdirSync(destFolder).filter(f => IMG_EXTS.test(f));
    results.push({ dest, files: allImgs });
    console.log(`  ✅ ${dest} — ${copied} nuevas (total: ${allImgs.length})`);
  }

  console.log(`\n✅ Migración completa\n`);
  return results;
}

// ── Actualizar blogs con mejor imagen ────────────────────────
const TOPIC_MAP = [
  { folder: "familias-huasteca",           keywords: ["ninos", "niños", "familia", "familiar", "ruta familiar", "children"] },
  { folder: "cultura-huasteca",            keywords: ["cultura", "tradicion", "tradición", "musica", "música", "xantolo", "danza", "festival"] },
  { folder: "estaciones-huasteca",         keywords: ["epoca", "época", "temporada", "cuando ir", "lluvia", "seca", "mejor mes", "mejor epoca"] },
  { folder: "papan-huasteco",              keywords: ["papan", "papán", "cena", "restaurante", "comida", "gastronomia", "platillos", "fogon"] },
  { folder: "hotel-paraiso-encantado",     keywords: ["hospedaje", "hotel", "alojamiento", "donde dormir", "paraiso", "encantado"] },
  { folder: "las-pozas-jardin-surrealista",keywords: ["pozas", "edward james", "las pozas", "surrealista", "jardin", "xilitla jardin"] },
  { folder: "cascadas-de-tamasopo",        keywords: ["tamasopo"] },
  { folder: "cascada-de-tamul",            keywords: ["tamul", "canon", "cañon", "cañón"] },
  { folder: "cascada-el-meco",             keywords: ["meco", "salto del meco"] },
  { folder: "cascada-el-salto",            keywords: ["el salto"] },
  { folder: "cascadas-de-micos",           keywords: ["micos", "tirolesa", "bici aerea"] },
  { folder: "laguna-media-luna",           keywords: ["media luna", "laguna", "bucear", "buceo", "snorkel"] },
  { folder: "rio-tampaon-rafting",         keywords: ["tampaon", "rafting", "kayak", "canoa"] },
  { folder: "sotano-de-las-golondrinas",   keywords: ["golondrinas", "sotano golondrinas"] },
  { folder: "sotano-de-las-huahuas",       keywords: ["huahuas"] },
  { folder: "voladores-tamaleton",         keywords: ["voladores", "tamaleton"] },
  { folder: "xilitla-pueblo-magico",       keywords: ["xilitla", "pueblo magico", "cafe", "café", "altura"] },
  { folder: "zona-arqueologica-tamtoc",    keywords: ["tamtoc", "arqueologica", "arqueología"] },
  { folder: "puente-de-dios-tamasopo",     keywords: ["puente de dios"] },
  { folder: "nacimiento-huichihuayan",     keywords: ["huichihuayan"] },
  { folder: "nacimiento-tambaque",         keywords: ["tambaque"] },
  { folder: "cuevas-de-mantetzulel",       keywords: ["mantetzulel", "cueva"] },
  { folder: "castillo-de-la-salud",        keywords: ["castillo de la salud"] },
  { folder: "hacienda-los-gomez",          keywords: ["hacienda"] },
  { folder: "balneario-taninul",           keywords: ["taninul", "balneario", "termal"] },
];

function normalize(str) {
  return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").trim();
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function findBestFolder(post) {
  const text = normalize([post.slug, post.title, post.focusKeyword].join(" "));
  for (const { folder, keywords } of TOPIC_MAP) {
    if (keywords.some(k => text.includes(normalize(k)))) return folder;
  }
  return pickRandom(TOPIC_MAP).folder;
}

function getBestHeroFromFolder(folder) {
  const dir = path.join(DEST_BASE, folder);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => IMG_EXTS.test(f));
  // Preferir hero, luego gallery-1, luego cualquiera
  return files.find(f => f.startsWith("hero")) ||
         files.find(f => f.startsWith("gallery-1")) ||
         files[0] || null;
}

async function updateBlogs() {
  if (!BLOG_SECRET) { console.log("⚠️  Sin BLOG_SECRET, saltando actualización de blogs"); return; }

  console.log("🖼️  Actualizando imágenes en blogs...\n");

  const res = await fetch(`${SITE_URL}/api/blog/create`, {
    headers: { Authorization: `Bearer ${BLOG_SECRET}` }
  });
  const { posts = [] } = await res.json();
  console.log(`📚 Posts: ${posts.length}\n`);

  for (const post of posts) {
    const folder = findBestFolder(post);
    const hero   = getBestHeroFromFolder(folder);
    if (!hero) { console.log(`  ⏭️  ${post.slug} — sin hero en ${folder}`); continue; }

    const coverImageUrl = `${SITE_URL}/imagenes/${folder}/${hero}`;
    const coverImageAlt = `${post.focusKeyword || post.title} — Huasteca Potosina ${new Date().getFullYear()}`;
    const matched = TOPIC_MAP.find(t => t.folder === folder)?.keywords.some(k => normalize([post.slug, post.title, post.focusKeyword].join(" ")).includes(normalize(k)));

    console.log(`📝 ${post.slug}`);
    console.log(`   📁 ${folder} ${matched ? "✅ match" : "🎲 random"}`);
    console.log(`   🖼️  ${coverImageUrl}`);

    const r = await fetch(`${SITE_URL}/api/blog/update-images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BLOG_SECRET}` },
      body: JSON.stringify({ slug: post.slug, coverImageUrl, coverImageAlt })
    });

    console.log(r.ok ? "   ✅ OK\n" : `   ❌ ${await r.text()}\n`);
    await new Promise(r => setTimeout(r, 300));
  }
}

async function main() {
  migrateImages();
  await updateBlogs();
  console.log("🎉 Todo listo. Haz git push para subir las imágenes al sitio.\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
