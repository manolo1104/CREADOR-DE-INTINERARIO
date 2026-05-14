/**
 * manage-images.js
 * ─────────────────────────────────────────────────────────────
 * Herramienta interactiva para asignar imágenes a los artículos del blog.
 *
 * Uso:
 *   node manage-images.js --secret TU_SECRET_AQUI
 *
 * O con variable de entorno:
 *   BLOG_AGENT_SECRET=xxx node manage-images.js
 */

import fetch from "node-fetch";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Obtener secret ────────────────────────────────────────────
const secretIdx = process.argv.indexOf("--secret");
const SECRET = secretIdx !== -1
  ? process.argv[secretIdx + 1]
  : process.env.BLOG_AGENT_SECRET;

const SITE_URL = process.env.SITE_URL || "https://www.huasteca-potosina.com";

if (!SECRET) {
  console.error("❌ Necesitas el BLOG_AGENT_SECRET.");
  console.error("   Búscalo en Railway → tu proyecto → Variables.\n");
  console.error("   Luego ejecuta:");
  console.error("   node manage-images.js --secret TU_SECRET_AQUI\n");
  process.exit(1);
}

// ── Imágenes disponibles en /public/imagenes ─────────────────
function getPublicImages() {
  const base = path.join(__dirname, "../public/imagenes");
  const result = [];

  function walk(dir, prefix = "") {
    try {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const rel  = prefix ? `${prefix}/${entry}` : entry;
        if (fs.statSync(full).isDirectory()) {
          walk(full, rel);
        } else if (/\.(png|jpg|jpeg|webp|avif)$/i.test(entry)) {
          result.push(`/imagenes/${rel}`);
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }

  walk(base);
  return result;
}

// ── Sugerir imagen por keywords del slug ─────────────────────
function suggestImage(slug, allImages) {
  const terms = slug.replace(/-20\d\d$/, "").split("-").filter(w => w.length > 3);

  // Palabras clave → carpetas relevantes
  const mappings = {
    "tamul":       "cascada-de-tamul",
    "tampaon":     "rio-tampaon-rafting",
    "tampaón":     "rio-tampaon-rafting",
    "sotano":      "sotano-de-las-golondrinas",
    "sótano":      "sotano-de-las-golondrinas",
    "golondrina":  "sotano-de-las-golondrinas",
    "huahuas":     "sotano-de-las-huahuas",
    "edward":      "las-pozas-jardin-surrealista",
    "pozas":       "las-pozas-jardin-surrealista",
    "surrealista": "las-pozas-jardin-surrealista",
    "xilitla":     "xilitla-pueblo-magico",
    "meco":        "cascada-el-meco",
    "micos":       "cascadas-de-micos",
    "minas":       "cascadas-minas-viejas",
    "tamasopo":    "cascadas-de-tamasopo",
    "puente":      "puente-de-dios-tamasopo",
    "dios":        "puente-de-dios-tamasopo",
    "media":       "laguna-media-luna",
    "luna":        "laguna-media-luna",
    "laguna":      "laguna-media-luna",
    "huichihuayan":"nacimiento-huichihuayan",
    "nacimiento":  "nacimiento-huichihuayan",
    "balneario":   "balneario-taninul",
    "taninul":     "balneario-taninul",
    "rafting":     "rio-tampaon-rafting",
    "tamtoc":      "zona-arqueologica-tamtoc",
    "familia":     "familias-huasteca",
    "ninos":       "familias-huasteca",
    "niños":       "familias-huasteca",
    "gastronomia": "papan-huasteco",
    "zacahuil":    "papan-huasteco",
    "comida":      "papan-huasteco",
    "hotel":       "hotel-paraiso-encantado",
    "paraiso":     "hotel-paraiso-encantado",
    "presupuesto": "cascada-de-tamul",
    "costo":       "cascada-de-tamul",
    "itinerario":  "cascadas-de-tamasopo",
    "ruta":        "rio-tampaon-rafting",
    "cultural":    "zona-arqueologica-tamtoc",
    "cultura":     "xilitla-pueblo-magico",
    "cascada":     "cascada-de-tamul",
    "aguacate":    "cascada-el-aguacate",
  };

  let targetFolder = null;
  for (const term of terms) {
    const t = term.toLowerCase();
    for (const [key, folder] of Object.entries(mappings)) {
      if (t.includes(key) || key.includes(t)) {
        targetFolder = folder;
        break;
      }
    }
    if (targetFolder) break;
  }

  if (targetFolder) {
    // Preferir hero de esa carpeta
    const hero = allImages.find(img =>
      img.includes(targetFolder) && img.includes("hero")
    );
    if (hero) return hero;

    // Cualquier imagen de esa carpeta
    const any = allImages.find(img => img.includes(targetFolder));
    if (any) return any;
  }

  // Fallback: hero de tamul
  return allImages.find(img => img.includes("cascada-de-tamul") && img.includes("hero"))
    || allImages[0];
}

// ── Input helper ──────────────────────────────────────────────
function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  🖼️  Gestor de imágenes del blog — huasteca-potosina.com");
  console.log("═".repeat(60));
  console.log(`  Sitio: ${SITE_URL}\n`);

  // 1. Cargar lista de artículos
  console.log("📋 Cargando artículos...\n");
  const res = await fetch(`${SITE_URL}/api/blog/create?full=0`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`❌ Error ${res.status}: ${err.error || "verifica el secret"}`);
    process.exit(1);
  }

  const raw   = await res.json();
  const posts = Array.isArray(raw) ? raw : (raw.posts || []);
  const allImages = getPublicImages();

  // 2. Clasificar por estado de imagen
  const sinImagen  = posts.filter(p => !p.coverImageUrl);
  const conImagen  = posts.filter(p =>  p.coverImageUrl);

  console.log(`Total artículos: ${posts.length}`);
  console.log(`✅ Con imagen:    ${conImagen.length}`);
  console.log(`❌ Sin imagen:    ${sinImagen.length}\n`);

  if (sinImagen.length === 0) {
    console.log("🎉 Todos los artículos ya tienen imagen de portada.\n");
    process.exit(0);
  }

  // 3. Mostrar artículos sin imagen con sugerencias
  console.log("─".repeat(60));
  console.log("Artículos sin imagen de portada:\n");
  sinImagen.forEach((p, i) => {
    const suggestion = suggestImage(p.slug, allImages);
    const fullUrl = `${SITE_URL}${suggestion}`;
    console.log(`  ${String(i + 1).padStart(2)}. ${p.title}`);
    console.log(`      Slug:       ${p.slug}`);
    console.log(`      Sugerida:   ${fullUrl}\n`);
  });
  console.log("─".repeat(60));

  // 4. Preguntar qué hacer
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const mode = await prompt(rl,
    "\n¿Qué quieres hacer?\n" +
    "  [A] Asignar imagen sugerida a TODOS los artículos sin imagen\n" +
    "  [U] Asignar uno por uno (tú eliges la imagen de cada uno)\n" +
    "  [Q] Salir\n\n" +
    "Opción (A/U/Q): "
  );

  if (mode.trim().toUpperCase() === "Q") {
    console.log("\nSaliendo.\n");
    rl.close();
    process.exit(0);
  }

  if (mode.trim().toUpperCase() === "A") {
    // Asignar sugerida a todos
    console.log("\n🚀 Asignando imágenes sugeridas...\n");
    for (const p of sinImagen) {
      const suggestion = suggestImage(p.slug, allImages);
      const imageUrl = `${SITE_URL}${suggestion}`;
      const imageAlt = `${p.title} — Huasteca Potosina`;
      await assignImage(p.slug, imageUrl, imageAlt);
    }
    rl.close();
    return;
  }

  // Uno por uno
  for (const p of sinImagen) {
    const suggestion = suggestImage(p.slug, allImages);
    const fullUrl = `${SITE_URL}${suggestion}`;

    console.log(`\n─────────────────────────────────────────`);
    console.log(`Artículo: ${p.title}`);
    console.log(`Slug:     ${p.slug}`);
    console.log(`Sugerida: ${fullUrl}\n`);

    const input = await prompt(rl,
      "  [Enter] usar imagen sugerida\n" +
      "  [URL]   pega una URL distinta\n" +
      "  [S]     saltar este artículo\n\n" +
      "Tu elección: "
    );

    const val = input.trim();
    if (val.toUpperCase() === "S") {
      console.log("  ⏭️  Saltado.");
      continue;
    }

    const imageUrl = val === "" ? fullUrl : val;
    const imageAlt = `${p.title} — Huasteca Potosina`;
    await assignImage(p.slug, imageUrl, imageAlt);
  }

  rl.close();
  console.log("\n✅ Proceso completado.\n");
}

async function assignImage(slug, imageUrl, imageAlt) {
  process.stdout.write(`  Asignando a "${slug}"... `);
  try {
    const res = await fetch(`${SITE_URL}/api/blog/update-images`, {
      method: "PATCH",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SECRET}`,
      },
      body: JSON.stringify({ slug, coverImageUrl: imageUrl, coverImageAlt: imageAlt }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log("✅");
    } else {
      // Intenta con sufijo de año si el slug no se encuentra
      if (res.status === 404) {
        for (const year of ["2026", "2025", "2024"]) {
          const slugWithYear = `${slug}-${year}`;
          const r2 = await fetch(`${SITE_URL}/api/blog/update-images`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SECRET}` },
            body: JSON.stringify({ slug: slugWithYear, coverImageUrl: imageUrl, coverImageAlt: imageAlt }),
          });
          if (r2.ok) { console.log(`✅ (con slug ${slugWithYear})`); return; }
        }
      }
      console.log(`❌ ${data.error || res.status}`);
    }
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
