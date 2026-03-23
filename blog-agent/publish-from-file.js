/**
 * publish-from-file.js
 * Lee pending-post.json y lo inserta directo en la BD vía Prisma.
 * Ejecutar con DATABASE_URL configurado:
 *   DATABASE_URL=xxx node publish-from-file.js
 */

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const postPath = new URL("./pending-post.json", import.meta.url).pathname;
  const post = JSON.parse(readFileSync(postPath, "utf8"));

  console.log(`\n📤 Publicando: "${post.title}"`);
  console.log(`   Slug: ${post.slug}`);

  const result = await prisma.blogPost.upsert({
    where: { slug: post.slug },
    create: {
      slug: post.slug,
      title: post.title,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      focusKeyword: post.focusKeyword,
      secondaryKeywords: post.secondaryKeywords || [],
      excerpt: post.excerpt,
      content: post.content,
      authorBio: post.authorBio,
      schemaMarkup: post.schemaMarkup,
      coverImageUrl: post.coverImageUrl,
      coverImageAlt: post.coverImageAlt,
      coverImageFile: post.coverImageFile,
      internalLinks: post.internalLinks || [],
      externalSources: post.externalSources || [],
      tags: post.tags || [],
      readingTime: post.readingTime || 6,
      published: true,
      publishedAt: new Date(),
    },
    update: {
      title: post.title,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      content: post.content,
      authorBio: post.authorBio,
      schemaMarkup: post.schemaMarkup,
      coverImageUrl: post.coverImageUrl,
      updatedAt: new Date(),
    },
  });

  console.log(`\n✅ Publicado! ID: ${result.id}`);
  console.log(`   URL: /blog/${result.slug}\n`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Error:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
