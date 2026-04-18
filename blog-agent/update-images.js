/**
 * update-images.js
 * Actualiza imágenes de todos los blogs con matching inteligente por tema.
 * También corrige links de /planear a la URL correcta.
 *
 * Uso: node update-images.js
 */

import "dotenv/config";
import fetch from "node-fetch";

const SITE_URL    = process.env.SITE_URL || "https://www.huasteca-potosina.com";
const BLOG_SECRET = process.env.BLOG_AGENT_SECRET;
const PLANEAR_URL = "https://www.huasteca-potosina.com/planear";

if (!BLOG_SECRET) {
  console.error("❌ Falta BLOG_AGENT_SECRET en .env");
  process.exit(1);
}

// Carpetas disponibles con sus imágenes y palabras clave para matching
const IMAGE_FOLDERS = [
  {
    folder: "balneario-taninul",
    hero: "hero.webp", gallery: ["hero.webp"],
    keywords: ["taninul", "balneario", "aguas termales", "termal", "piscinas"]
  },
  {
    folder: "cascada-de-tamul",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.webp"],
    keywords: ["tamul", "canon tamul", "cañon tamul", "tamul kayak", "rio tampaon tamul"]
  },
  {
    folder: "cascada-el-aguacate",
    hero: "hero.jpg", gallery: ["gallery-1.webp", "gallery-2.jpg"],
    keywords: ["aguacate", "el aguacate"]
  },
  {
    folder: "cascada-el-meco",
    hero: "hero.avif", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["meco", "el meco", "salto del meco"]
  },
  {
    folder: "cascada-el-salto",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["el salto", "cascada salto", "salto waterfall"]
  },
  {
    folder: "cascadas-de-micos",
    hero: "hero.jpg", gallery: ["gallery-1.webp", "gallery-2.jpg"],
    keywords: ["micos", "tirolesa", "bici aerea", "bici aérea", "circuito", "saltos micos"]
  },
  {
    folder: "cascadas-de-tamasopo",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.webp"],
    keywords: ["tamasopo", "cascadas tamasopo", "parque tamasopo"]
  },
  {
    folder: "cascadas-minas-viejas",
    hero: "hero.jpg", gallery: ["gallery-1.webp", "gallery-2.jpg"],
    keywords: ["minas viejas", "minas", "cascada minas"]
  },
  {
    folder: "cuevas-de-mantetzulel",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["mantetzulel", "cueva", "cuevas", "grutas"]
  },
  {
    folder: "laguna-media-luna",
    hero: "hero.jpg", gallery: ["gallery-1.avif", "gallery-2.webp"],
    keywords: ["media luna", "laguna", "bucear", "buceo", "snorkel", "rioverde"]
  },
  {
    folder: "las-pozas-jardin-surrealista",
    hero: "hero.webp", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["pozas", "edward james", "las pozas", "surrealista", "jardin xilitla", "jardin edward"]
  },
  {
    folder: "nacimiento-huichihuayan",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["huichihuayan", "nacimiento huichihuayan"]
  },
  {
    folder: "nacimiento-tambaque",
    hero: "hero.webp", gallery: ["gallery-1.webp", "gallery-2.webp"],
    keywords: ["tambaque", "nacimiento tambaque"]
  },
  {
    folder: "puente-de-dios-tamasopo",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["puente de dios", "puente dios", "puente tamasopo"]
  },
  {
    folder: "rio-tampaon-rafting",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["tampaon", "rafting", "rio tampaon", "kayak", "canoa"]
  },
  {
    folder: "sotano-de-las-golondrinas",
    hero: "hero.jpg", gallery: ["gallery-1.avif", "gallery-2.avif"],
    keywords: ["golondrinas", "sotano golondrinas", "sótano golondrinas", "abismo"]
  },
  {
    folder: "sotano-de-las-huahuas",
    hero: "hero.jpg", gallery: ["gallery-1.jpg"],
    keywords: ["huahuas", "sotano huahuas", "sótano huahuas"]
  },
  {
    folder: "voladores-tamaleton",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["voladores", "tamaleton", "danza voladores", "ritual"]
  },
  {
    folder: "xilitla-pueblo-magico",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["xilitla", "pueblo magico", "pueblo mágico", "san luis xilitla"]
  },
  {
    folder: "zona-arqueologica-tamtoc",
    hero: "hero.jpg", gallery: ["gallery-1.jpg", "gallery-2.jpg"],
    keywords: ["tamtoc", "zona arqueologica", "arqueologia", "prehispanico", "huasteca antigua"]
  },
];

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findBestFolder(post) {
  const searchText = normalize(
    [post.slug, post.title, post.focusKeyword].join(" ")
  );

  // 1. Buscar match exacto por keywords
  for (const f of IMAGE_FOLDERS) {
    for (const kw of f.keywords) {
      if (searchText.includes(normalize(kw))) return f;
    }
  }

  // 2. Fallback: carpeta random
  return pickRandom(IMAGE_FOLDERS);
}

function buildImageUrl(folder, file) {
  return `${SITE_URL}/imagenes/${folder}/${file}`;
}

function fixPlanearLinks(content) {
  if (!content) return content;
  return content
    // Railway URL + /planear
    .replace(/https?:\/\/creador-de-intinerario[^"'\s]*/gi, (match) => {
      if (match.includes("planear")) return PLANEAR_URL;
      return "https://www.huasteca-potosina.com";
    })
    // href relativo /planear o /planear/ sin dominio
    .replace(/href="\/planear[^"]*"/gi, `href="${PLANEAR_URL}"`)
    // href con dominio incorrecto apuntando a /planear
    .replace(/href="https?:\/\/(?!www\.huasteca-potosina\.com)[^"]*\/planear[^"]*"/gi, `href="${PLANEAR_URL}"`);
}

async function main() {
  console.log("\n🖼️  Actualizando imágenes y links de blogs...");
  console.log(`   Site: ${SITE_URL}\n`);

  // 1. Obtener todos los posts
  const res = await fetch(`${SITE_URL}/api/blog/create`, {
    headers: { Authorization: `Bearer ${BLOG_SECRET}` },
  });

  if (!res.ok) {
    console.error(`❌ Error obteniendo posts (${res.status}):`, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const posts = data.posts || [];

  if (posts.length === 0) {
    console.log("⚠️  No hay posts publicados.");
    return;
  }

  console.log(`📚 Posts encontrados: ${posts.length}\n`);

  let updated = 0;
  let errors = 0;

  for (const post of posts) {
    const best = findBestFolder(post);
    const coverImageUrl = buildImageUrl(best.folder, best.hero);
    const coverImageAlt = `${post.focusKeyword || post.slug} — Huasteca Potosina ${new Date().getFullYear()}`;
    const matched = best.keywords?.some(k => normalize([post.slug, post.title, post.focusKeyword].join(" ")).includes(normalize(k)));

    console.log(`📝 ${post.slug}`);
    console.log(`   📁 Carpeta: ${best.folder} ${matched ? "✅ match" : "🎲 random"}`);
    console.log(`   🖼️  Hero:    ${coverImageUrl}`);

    const updateRes = await fetch(`${SITE_URL}/api/blog/update-images`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BLOG_SECRET}`,
      },
      body: JSON.stringify({ slug: post.slug, coverImageUrl, coverImageAlt }),
    });

    if (updateRes.ok) {
      console.log(`   ✅ Imagen actualizada\n`);
      updated++;
    } else {
      const err = await updateRes.text();
      console.log(`   ❌ Error: ${err}\n`);
      errors++;
    }

    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 300));
  }

  console.log("═".repeat(50));
  console.log(`✅ Completado: ${updated} actualizados, ${errors} errores`);
  console.log(`🔗 Links de /planear corregidos en render (page.tsx)`);
  console.log("═".repeat(50) + "\n");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
