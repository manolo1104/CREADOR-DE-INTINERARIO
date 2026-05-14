/**
 * assign-image.js
 * ─────────────────────────────────────────────────────────────
 * Asigna (o actualiza) la imagen de portada de un artículo del blog.
 *
 * Uso:
 *   node assign-image.js <slug> <imageUrl> [imageAlt]
 *
 * Ejemplos:
 *   node assign-image.js cuanto-cuesta-huasteca-potosina \
 *     "https://www.huasteca-potosina.com/imagenes/tours/tamul/hero.png" \
 *     "Cascada de Tamul — presupuesto para la Huasteca Potosina"
 *
 *   node assign-image.js mejores-cascadas \
 *     "https://www.huasteca-potosina.com/imagenes/cascada-el-meco/hero.avif"
 *
 * Variables de entorno necesarias (en .env.local del proyecto):
 *   BLOG_AGENT_SECRET  — el mismo secret que usa el blog agent
 *   SITE_URL           — opcional, default https://www.huasteca-potosina.com
 *
 * Ejecutar desde blog-agent/:
 *   BLOG_AGENT_SECRET=xxx node --env-file=../.env.local assign-image.js [slug] [url] [alt]
 */

import "dotenv/config";
import fetch from "node-fetch";

const [,, slug, imageUrl, imageAlt] = process.argv;

if (!slug || !imageUrl) {
  console.error("❌ Uso: node assign-image.js <slug> <imageUrl> [imageAlt]");
  console.error("\nEjemplo:");
  console.error('  node assign-image.js cuanto-cuesta-huasteca-potosina "https://..." "Alt text"');
  process.exit(1);
}

const SECRET   = process.env.BLOG_AGENT_SECRET;
const SITE_URL = process.env.SITE_URL || "https://www.huasteca-potosina.com";

if (!SECRET) {
  console.error("❌ BLOG_AGENT_SECRET no configurado.");
  console.error("   Ejecuta con: BLOG_AGENT_SECRET=xxx node --env-file=../.env.local assign-image.js ...");
  process.exit(1);
}

// Auto-generate alt if not provided
const finalAlt = imageAlt || `${slug.replace(/-/g, " ")} — Huasteca Potosina`;

async function main() {
  console.log(`\n🖼️  Asignando imagen al artículo "${slug}"...`);
  console.log(`   URL:  ${imageUrl}`);
  console.log(`   Alt:  ${finalAlt}\n`);

  const res = await fetch(`${SITE_URL}/api/blog/update-images`, {
    method:  "PATCH",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${SECRET}`,
    },
    body: JSON.stringify({
      slug,
      coverImageUrl: imageUrl,
      coverImageAlt: finalAlt,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`❌ Error ${res.status}:`, data.error || "desconocido");
    console.error("\nVerifica que:");
    console.error("  · El slug exista en la BD (puede tener sufijo -2026)");
    console.error("  · BLOG_AGENT_SECRET sea correcto");
    process.exit(1);
  }

  console.log(`✅ Imagen asignada correctamente`);
  console.log(`   Artículo: ${SITE_URL}/blog/${slug}`);
  console.log(`   Cover:    ${data.post?.coverImageUrl || imageUrl}`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
