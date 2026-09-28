/**
 * diagnostico-datos-blog.ts — ver qué dicen de verdad los artículos sobre los
 * dos sótanos y sobre Tamul, SIN escribir nada.
 *
 * Para qué: `arreglar-datos-blog.ts` detecta 2 artículos, pero la copia local
 * `BLOGS/sotano-de-las-golondrinas-vs-sotano-de-las-huahuas-*.html` le atribuye
 * al Sótano de las Huahuas «Aprox. 200 m». Hay tres explicaciones posibles y
 * este script las distingue:
 *
 *   1. Ese artículo no está en Postgres (la copia local es de uno borrado).
 *   2. Está, pero su texto en la base es distinto al de la copia.
 *   3. Está igual y el patrón del corrector no lo alcanza (sería un fallo mío).
 *
 *   npx tsx src/scripts/diagnostico-datos-blog.ts
 *
 * Solo LEE. No modifica nada.
 */

import { cargarEnv } from "./_env";
cargarEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Quita etiquetas para poder leer el contexto de un vistazo. */
const plano = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { slug: true, title: true, metaDescription: true, content: true },
  });
  console.log(`${posts.length} artículos en la base.\n`);

  // ── 1. ¿Existe el artículo de la comparación? ─────────────────────────────
  const comparativa = posts.filter((p) => /golondrinas.*huahuas|huahuas.*golondrinas/i.test(p.slug));
  console.log("── Artículos que comparan los dos sótanos ──");
  if (comparativa.length === 0) {
    console.log("  Ninguno. La copia de BLOGS/ es de un artículo que ya no está publicado.\n");
  } else {
    comparativa.forEach((p) => console.log(`  ${p.slug}`));
    console.log("");
  }

  // ── 2. Toda profundidad que se le atribuya a las Huahuas ──────────────────
  console.log("── Profundidades atribuidas al Sótano de las HUAHUAS ──");
  let hallazgos = 0;
  for (const p of posts) {
    const texto = `${p.title ?? ""} ${p.metaDescription ?? ""} ${p.content ?? ""}`;
    // Ventana amplia a propósito: aquí interesa VER, no corregir.
    // `exec` en bucle y no `matchAll`: el target de TS de este repo no deja
    // iterar el resultado de `matchAll` sin `downlevelIteration`.
    const reHuahuas = /Huahuas[\s\S]{0,220}?\b(\d{2,3})\s*(?:m\b|metros)/gi;
    let m: RegExpExecArray | null;
    while ((m = reHuahuas.exec(texto)) !== null) {
      const cifra = Number(m[1]);
      const marca = cifra === 478 ? "✅" : "🔴";
      console.log(`  ${marca} ${p.slug} → ${cifra} m`);
      console.log(`      «…${plano(m[0]).slice(-150)}»`);
      hallazgos++;
    }
  }
  if (hallazgos === 0) console.log("  Ninguna: ningún artículo le pone metros a las Huahuas.");
  console.log("");

  // ── 3. Cifras sueltas que podrían ser de las Huahuas ──────────────────────
  console.log("── Menciones de 200 m o 512 m en cualquier artículo ──");
  let sueltas = 0;
  for (const p of posts) {
    const texto = `${p.title ?? ""} ${p.metaDescription ?? ""} ${p.content ?? ""}`;
    const reCifra = /\b(200|512)\s*(?:m\b|metros)/gi;
    let m: RegExpExecArray | null;
    while ((m = reCifra.exec(texto)) !== null) {
      const i = Math.max(0, m.index - 170);
      const contexto = plano(texto.slice(i, m.index + 60));
      // Si en el contexto cercano aparece Golondrinas, 512 es correcto.
      const deGolondrinas = /golondrinas/i.test(contexto);
      const marca = m[1] === "512" && deGolondrinas ? "✅" : "⚠️ ";
      console.log(`  ${marca} ${p.slug} → ${m[1]} m`);
      console.log(`      «…${contexto.slice(-150)}»`);
      sueltas++;
    }
  }
  if (sueltas === 0) console.log("  Ninguna.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
