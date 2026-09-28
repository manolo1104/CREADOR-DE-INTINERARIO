/**
 * arreglar-datos-blog.ts — corregir en los artículos los tres datos que el
 * sitio ya dejó de publicar mal (28 sep 2026).
 *
 * El código se arregló editando archivos, pero **el blog no vive en el código**:
 * vive en Postgres (`prisma.blogPost`, leído por `src/app/blog/[slug]/page.tsx`).
 * Los `BLOGS/*.html` del repo son copias congeladas del momento de publicación
 * y editarlas no cambia nada en el sitio.
 *
 * Qué corrige:
 *
 *   1. La Cascada de Tamul es la más alta de **San Luis Potosí**, no de México
 *      (la más alta del país es Basaseachi, en Chihuahua, con 246 m).
 *   2. El Sótano de las **Huahuas** tiene **478 m**. Los 512 m son del Sótano
 *      de las **Golondrinas**, que ni siquiera operamos. Un artículo llega a
 *      decir "aprox. 200 m", que no es ninguno de los dos.
 *   3. Las aves de las Huahuas se nombran como "aves" (loros y vencejos), en
 *      lugar de "pericos" a secas.
 *
 * ⚠️ Toca la base de PRODUCCIÓN. Córrelo tú, no lo corre Claude:
 *
 *   npx tsx src/scripts/arreglar-datos-blog.ts             (en seco: solo enseña)
 *   npx tsx src/scripts/arreglar-datos-blog.ts --aplicar   (escribe en la base)
 *
 * En seco sale con código 1 si encuentra algo por arreglar, para poder colgarlo
 * de una comprobación automática.
 */

import { cargarEnv } from "./_env";
cargarEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * El orden importa: lo más específico primero. "512 metros de profundidad"
 * tiene que mirarse junto a Huahuas ANTES de que una regla general toque el
 * número, porque en los artículos de Golondrinas 512 es correcto y no se toca.
 */
const REEMPLAZOS: { de: RegExp; a: string; porque: string }[] = [
  // ── 1. Tamul ──────────────────────────────────────────────────────────────
  {
    de: /la\s+(?:cascada|caída(?:\s+de\s+agua)?)\s+más\s+alta\s+de\s+México/gi,
    a: "la cascada más alta de San Luis Potosí",
    porque: "Tamul es la más alta del estado; la de México es Basaseachi",
  },
  {
    de: /(?:la\s+)?más\s+alta\s+de\s+México/gi,
    a: "la más alta de San Luis Potosí",
    porque: "Misma corrección, redacción corta",
  },
  {
    de: /cascada\s+más\s+alta\s+del\s+país/gi,
    a: "cascada más alta del estado",
    porque: "Misma corrección, redacción con «país»",
  },

  // ── 2. Profundidad del Sótano de las Huahuas ──────────────────────────────
  // Solo cuando la frase nombra a Huahuas: en Golondrinas 512 m es correcto.
  // ⚠️ Estas dos NO pueden usar `[^.]` para medir la distancia: en las tablas
  // comparativas el texto real es `Huahuas</td><td>Aprox. 200 m`, y el punto de
  // "Aprox." cortaba la búsqueda antes de llegar al número. Se mide con
  // `[\s\S]` y se frena en el fin de fila o de párrafo, para no saltar a la
  // fila de las Golondrinas —donde 512 m SÍ es correcto— y cambiarla.
  {
    de: /(Huahuas(?:(?!<\/tr>|<\/p>|<\/li>)[\s\S]){0,160}?)\b512\s*(m\b|metros)/gi,
    a: "$1478 $2",
    porque: "512 m es la profundidad de las Golondrinas, no de las Huahuas",
  },
  {
    de: /(Huahuas(?:(?!<\/tr>|<\/p>|<\/li>)[\s\S]){0,160}?)(?:aprox(?:\.|imadamente)?\s*)?\b200\s*(m\b|metros)/gi,
    a: "$1478 $2",
    porque: "Un artículo le atribuye 200 m, que no es ninguno de los dos sótanos",
  },

  // ── 3. Las aves ───────────────────────────────────────────────────────────
  {
    de: /miles\s+de\s+pericos/gi,
    a: "miles de aves —loros y vencejos—",
    porque: "Se nombran como aves, explicando las especies",
  },
  {
    de: /\blos\s+pericos\b/gi,
    a: "las aves",
    porque: "Misma corrección",
  },
  {
    de: /\bpericos\b/gi,
    a: "aves",
    porque: "Misma corrección, casos sueltos",
  },
];

/** Los campos de texto del artículo que pueden contener las frases. */
const CAMPOS = [
  "title",
  "metaTitle",
  "metaDescription",
  "excerpt",
  "content",
  "coverImageAlt",
] as const;
type Campo = (typeof CAMPOS)[number];

async function main() {
  const aplicar = process.argv.includes("--aplicar");

  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, ...Object.fromEntries(CAMPOS.map((c) => [c, true])) },
  });
  console.log(`Revisando ${posts.length} artículos…\n`);

  let conCambios = 0;
  let totalCambios = 0;

  for (const post of posts) {
    const parche: Record<string, string> = {};
    const notas: string[] = [];

    for (const campo of CAMPOS) {
      const original = (post as unknown as Record<Campo, string | null>)[campo];
      if (typeof original !== "string" || !original) continue;

      let texto = original;
      for (const { de, a, porque } of REEMPLAZOS) {
        const antes = texto;
        texto = texto.replace(de, a);
        if (texto !== antes) {
          const n = (antes.match(de) ?? []).length;
          notas.push(`    · ${campo}: ${n}× — ${porque}`);
          totalCambios += n;
        }
      }
      if (texto !== original) parche[campo] = texto;
    }

    if (Object.keys(parche).length === 0) continue;
    conCambios++;
    console.log(`  ${post.slug}`);
    notas.forEach((n) => console.log(n));

    if (aplicar) {
      await prisma.blogPost.update({ where: { id: post.id }, data: parche });
      console.log("    ✅ guardado");
    }
    console.log("");
  }

  if (conCambios === 0) {
    console.log("✅ Nada que corregir: los artículos ya están bien.");
    await prisma.$disconnect();
    return;
  }

  console.log(`${conCambios} artículo(s), ${totalCambios} corrección(es).`);
  if (!aplicar) {
    console.log("\nEsto fue en seco. Para escribir en la base:");
    console.log("  npx tsx src/scripts/arreglar-datos-blog.ts --aplicar");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\n✅ Listo. Revisa un par de artículos en el sitio.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
