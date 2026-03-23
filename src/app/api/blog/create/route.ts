import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Endpoint protegido para que el blog-agent pueda publicar posts
// Requiere header: Authorization: Bearer BLOG_AGENT_SECRET

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.BLOG_AGENT_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      slug, title, metaTitle, metaDescription, focusKeyword, secondaryKeywords = [],
      excerpt, content, authorBio, schemaMarkup,
      coverImageUrl, coverImageAlt, coverImageFile,
      internalLinks = [], externalSources = [],
      tags = [], readingTime = 5,
    } = body;

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "slug, title y content son requeridos" }, { status: 400 });
    }

    // Serializar schemaMarkup como string si viene como objeto
    const schemaMarkupStr = schemaMarkup && typeof schemaMarkup === "object"
      ? JSON.stringify(schemaMarkup)
      : schemaMarkup;

    // Upsert: crear o actualizar si ya existe el slug
    const post = await prisma.blogPost.upsert({
      where: { slug },
      create: {
        slug, title, metaTitle, metaDescription, focusKeyword, secondaryKeywords,
        excerpt, content, authorBio, schemaMarkup: schemaMarkupStr,
        coverImageUrl, coverImageAlt, coverImageFile,
        internalLinks, externalSources,
        tags, readingTime,
        published: true, publishedAt: new Date(),
      },
      update: {
        title, metaTitle, metaDescription, focusKeyword, secondaryKeywords,
        excerpt, content, authorBio, schemaMarkup: schemaMarkupStr,
        coverImageUrl, coverImageAlt, coverImageFile,
        internalLinks, externalSources,
        tags, readingTime,
        updatedAt: new Date(),
      },
    });

    // Limpiar caché de ISR para que el post aparezca de inmediato
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    return NextResponse.json({ success: true, post: { id: post.id, slug: post.slug, title: post.title } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("❌ Blog API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.BLOG_AGENT_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, publishedAt: true, focusKeyword: true },
    });
    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
