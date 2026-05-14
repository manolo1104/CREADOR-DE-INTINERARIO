import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${process.env.BLOG_AGENT_SECRET}`;
}

/** Strips trailing -YYYY (e.g. -2026, -2025) from a slug */
function stripYear(slug: string): string {
  return slug.replace(/-20\d{2}$/, "");
}

/**
 * POST /api/blog/migrate-slugs
 * Updates all blog post slugs that end in -20XX to remove the year suffix.
 * Requires Bearer auth.
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const posts = await prisma.blogPost.findMany({
      select: { id: true, slug: true },
    });

    const toMigrate = posts.filter((p) => /-20\d{2}$/.test(p.slug));

    const results: { old: string; new: string; status: string }[] = [];

    for (const post of toMigrate) {
      const newSlug = stripYear(post.slug);

      // Check if new slug already exists
      const existing = await prisma.blogPost.findUnique({ where: { slug: newSlug } });
      if (existing) {
        results.push({ old: post.slug, new: newSlug, status: "skipped (target exists)" });
        continue;
      }

      await prisma.blogPost.update({
        where: { id: post.id },
        data:  { slug: newSlug },
      });
      results.push({ old: post.slug, new: newSlug, status: "migrated" });
    }

    return NextResponse.json({ ok: true, migrated: results.filter((r) => r.status === "migrated").length, results });
  } catch (err) {
    console.error("[migrate-slugs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET /api/blog/migrate-slugs — preview which slugs would change */
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await prisma.blogPost.findMany({ select: { slug: true } });
  const toMigrate = posts
    .filter((p) => /-20\d{2}$/.test(p.slug))
    .map((p) => ({ old: p.slug, new: stripYear(p.slug) }));

  return NextResponse.json({ total: toMigrate.length, preview: toMigrate });
}
