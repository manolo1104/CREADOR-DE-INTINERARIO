/**
 * update-images.js
 * Script único para actualizar las imágenes de los blogs ya publicados
 * usando imágenes random de public/imagenes/
 *
 * Uso: node update-images.js
 */

import "dotenv/config";
import fetch from "node-fetch";

const SITE_URL    = process.env.SITE_URL || "https://creador-de-intinerario-production.up.railway.app";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;

if (!BLOG_SECRET) {
  console.error("❌ Falta BLOG_AGENT_SECRET en .env");
  process.exit(1);
}

// Todas las carpetas de imágenes públicas con sus archivos
const PUBLIC_IMAGES = [
  { folder: "balneario-taninul",         hero: "hero.webp",  gallery: ["hero.webp"] },
  { folder: "cascada-de-tamul",          hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.webp"] },
  { folder: "cascada-el-aguacate",       hero: "hero.jpg",   gallery: ["gallery-1.webp", "gallery-2.jpg"] },
  { folder: "cascada-el-meco",           hero: "hero.avif",  gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "cascada-el-salto",          hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "cascadas-de-micos",         hero: "hero.jpg",   gallery: ["gallery-1.webp", "gallery-2.jpg"] },
  { folder: "cascadas-de-tamasopo",      hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.webp"] },
  { folder: "cascadas-minas-viejas",     hero: "hero.jpg",   gallery: ["gallery-1.webp", "gallery-2.jpg"] },
  { folder: "cuevas-de-mantetzulel",     hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "laguna-media-luna",         hero: "hero.jpg",   gallery: ["gallery-1.avif", "gallery-2.webp"] },
  { folder: "las-pozas-jardin-surrealista", hero: "hero.webp", gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "nacimiento-huichihuayan",   hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "nacimiento-tambaque",       hero: "hero.webp",  gallery: ["gallery-1.webp", "gallery-2.webp"] },
  { folder: "puente-de-dios-tamasopo",   hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "rio-tampaon-rafting",       hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "sotano-de-las-golondrinas", hero: "hero.jpg",   gallery: ["gallery-1.avif", "gallery-2.avif"] },
  { folder: "sotano-de-las-huahuas",     hero: "hero.jpg",   gallery: ["gallery-1.jpg"] },
  { folder: "voladores-tamaleton",       hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "xilitla-pueblo-magico",     hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
  { folder: "zona-arqueologica-tamtoc",  hero: "hero.jpg",   gallery: ["gallery-1.jpg", "gallery-2.jpg"] },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomImages(keyword) {
  const pick1 = pickRandom(PUBLIC_IMAGES);
  let pick2 = pickRandom(PUBLIC_IMAGES);
  // Intentar que sean de carpetas diferentes
  for (let i = 0; i < 5 && pick2.folder === pick1.folder; i++) {
    pick2 = pickRandom(PUBLIC_IMAGES);
  }

  const heroUrl = `${SITE_URL}/imagenes/${pick1.folder}/${pick1.hero}`;
  const bodyFile = pickRandom(pick2.gallery);
  const bodyUrl = `${SITE_URL}/imagenes/${pick2.folder}/${bodyFile}`;

  return {
    coverImageUrl: heroUrl,
    coverImageAlt: `${keyword} Huasteca Potosina ${new Date().getFullYear()}`,
    bodyImageUrl: bodyUrl,
    bodyImageAlt: `${keyword} guía viaje Huasteca Potosina`,
  };
}

async function main() {
  console.log("\n🖼️  Actualizando imágenes de blogs existentes...");
  console.log(`   Site: ${SITE_URL}\n`);

  // 1. Obtener posts existentes
  const res = await fetch(`${SITE_URL}/api/blog/create`, {
    headers: { "Authorization": `Bearer ${BLOG_SECRET}` },
  });
  const data = await res.json();
  const posts = data.posts || [];

  if (posts.length === 0) {
    console.log("⚠️  No hay posts publicados.");
    return;
  }

  console.log(`📚 Posts encontrados: ${posts.length}\n`);

  // 2. Para cada post, asignar imágenes random y actualizar
  for (const post of posts) {
    const imgs = getRandomImages(post.focusKeyword || post.slug);

    console.log(`   📝 ${post.slug}`);
    console.log(`      Hero:  ${imgs.coverImageUrl}`);
    console.log(`      Body:  ${imgs.bodyImageUrl}`);

    const updateRes = await fetch(`${SITE_URL}/api/blog/update-images`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BLOG_SECRET}`,
      },
      body: JSON.stringify({
        slug: post.slug,
        coverImageUrl: imgs.coverImageUrl,
        coverImageAlt: imgs.coverImageAlt,
      }),
    });

    if (updateRes.ok) {
      const result = await updateRes.json();
      console.log(`      ✅ Actualizado: ${result.post?.slug}`);
    } else {
      const err = await updateRes.text();
      console.log(`      ❌ Error: ${err}`);
    }
  }

  console.log("\n✅ Imágenes actualizadas.\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
