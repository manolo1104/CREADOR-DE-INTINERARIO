import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/admin/migrate-images
// Actualiza todos los blog posts que usan .png → .jpg en coverImageUrl y content
export async function POST() {
  try {
    const posts = await prisma.blogPost.findMany({
      select: { id: true, slug: true, coverImageUrl: true, content: true },
    });

    const toUpdate = posts.filter(
      p => p.coverImageUrl?.includes(".png") || p.content?.includes(".png")
    );

    let updated = 0;
    for (const post of toUpdate) {
      const newCover = post.coverImageUrl?.replace(/\/imagenes\/(tours|blog)\/([^"]*?)\.png/g, "/imagenes/$1/$2.jpg") ?? post.coverImageUrl;
      const newContent = post.content?.replace(/\/imagenes\/(tours|blog)\/([^"]*?)\.png/g, "/imagenes/$1/$2.jpg") ?? post.content;

      if (newCover !== post.coverImageUrl || newContent !== post.content) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { coverImageUrl: newCover ?? undefined, content: newContent ?? undefined },
        });
        updated++;
        console.log(`✓ ${post.slug}: .png → .jpg`);
      }
    }

    return NextResponse.json({ ok: true, checked: posts.length, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
