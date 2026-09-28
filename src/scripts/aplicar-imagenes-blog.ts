/**
 * Aplica a la base de datos los cambios de imágenes que estaban SOLO como
 * vista previa en `src/lib/blogImageEdits.ts`.
 *
 * Toca tres cosas por post, porque cambiar solo la portada deja a Google
 * enseñando la foto vieja:
 *   1. coverImageUrl  ·  2. coverImageAlt
 *   3. content        (las imágenes dentro del texto)
 *   4. schemaMarkup   (la ficha JSON-LD que lee Google, con su propia copia
 *                      de la URL de la imagen)
 *
 * Ensayo por defecto. Escribe solo con --aplicar.
 *   npx tsx src/scripts/aplicar-imagenes-blog.ts [slug] [--aplicar]
 */
import { cargarEnv, describeBase } from "./_env";
cargarEnv();

import { PrismaClient } from "@prisma/client";
import { BLOG_IMAGE_EDITS } from "../lib/blogImageEdits";

const SITIO = "https://www.huasteca-potosina.com";
const prisma = new PrismaClient();

/** Las rutas relativas viven bien en el HTML, pero Google quiere absolutas. */
const absoluta = (u: string) => (u.startsWith("/") ? SITIO + u : u);

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes("--aplicar");
  const soloSlug = args.find((a) => !a.startsWith("--"));

  console.log(`Base: ${describeBase()}`);
  console.log(aplicar ? "Modo: APLICAR (escribe)\n" : "Modo: ensayo (no escribe)\n");

  const slugs = soloSlug ? [soloSlug] : Object.keys(BLOG_IMAGE_EDITS);

  for (const slug of slugs) {
    const edit = BLOG_IMAGE_EDITS[slug];
    if (!edit) {
      console.log(`✗ ${slug}: no está en blogImageEdits.ts`);
      continue;
    }
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post) {
      console.log(`✗ ${slug}: no existe en la base`);
      continue;
    }

    console.log(`── ${slug}`);
    const data: Record<string, string> = {};

    // Portada
    const portadaVieja = post.coverImageUrl ?? "";
    if (edit.coverImageUrl && edit.coverImageUrl !== portadaVieja) {
      data.coverImageUrl = edit.coverImageUrl;
      console.log(`   portada : ${portadaVieja || "(vacía)"}\n           → ${edit.coverImageUrl}`);
    }
    if (edit.coverImageAlt && edit.coverImageAlt !== post.coverImageAlt) {
      data.coverImageAlt = edit.coverImageAlt;
      console.log(`   alt     : cambia`);
    }

    // Contenido
    let contenido = post.content ?? "";
    for (const r of edit.contentReplace ?? []) {
      const veces = contenido.split(r.from).length - 1;
      console.log(`   texto   : "${r.from.slice(-40)}" aparece ${veces} vez/veces`);
      if (veces > 0) contenido = contenido.split(r.from).join(r.to);
    }
    if (contenido !== (post.content ?? "")) data.content = contenido;

    // Ficha de Google: la portada vieja y las imágenes del texto también
    // viven aquí, en absoluto.
    let ficha = post.schemaMarkup ?? "";
    if (ficha) {
      const antes = ficha;
      const pares: { from: string; to: string }[] = [];
      if (edit.coverImageUrl && portadaVieja) {
        pares.push({ from: absoluta(portadaVieja), to: absoluta(edit.coverImageUrl) });
        pares.push({ from: portadaVieja, to: edit.coverImageUrl });
      }
      for (const r of edit.contentReplace ?? []) {
        pares.push({ from: absoluta(r.from), to: absoluta(r.to) });
        pares.push({ from: r.from, to: r.to });
      }
      for (const p of pares) {
        if (p.from && p.from !== p.to) ficha = ficha.split(p.from).join(p.to);
      }
      if (ficha !== antes) {
        data.schemaMarkup = ficha;
        console.log(`   Google  : la ficha JSON-LD también apuntaba a la foto vieja → corregida`);
        // Que no quede JSON roto tras los reemplazos.
        try { JSON.parse(ficha); } catch {
          console.log(`   ⚠️  la ficha quedó con JSON inválido: NO se escribe`);
          delete data.schemaMarkup;
        }
      } else {
        console.log(`   Google  : la ficha no mencionaba la foto vieja (sin cambio)`);
      }
    } else {
      console.log(`   Google  : este post no tiene ficha JSON-LD`);
    }

    if (Object.keys(data).length === 0) {
      console.log(`   = ya estaba al día\n`);
      continue;
    }
    console.log(`   campos a escribir: ${Object.keys(data).join(", ")}`);
    if (aplicar) {
      await prisma.blogPost.update({ where: { slug }, data });
      console.log(`   ✔ escrito\n`);
    } else {
      console.log(`   (ensayo: no se escribió)\n`);
    }
  }
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
