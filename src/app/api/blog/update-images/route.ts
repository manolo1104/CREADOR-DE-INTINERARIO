import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH: actualizar solo las imágenes de un blog post existente
// Body: { slug, coverImageUrl, coverImageAlt }

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.BLOG_AGENT_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, coverImageUrl, coverImageAlt } = await req.json();

    if (!slug) {
      return NextResponse.json({ error: "slug es requerido" }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: `Post no encontrado: ${slug}` }, { status: 404 });
    }

    const updated = await prisma.blogPost.update({
      where: { slug },
      data: {
        ...(coverImageUrl && { coverImageUrl }),
        ...(coverImageAlt && { coverImageAlt }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, post: { slug: updated.slug, coverImageUrl: updated.coverImageUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("❌ Blog update-images error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
