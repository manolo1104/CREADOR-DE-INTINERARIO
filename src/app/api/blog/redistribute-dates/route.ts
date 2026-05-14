import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${process.env.BLOG_AGENT_SECRET}`;
}

/**
 * POST /api/blog/redistribute-dates
 * Redistributes publishedAt dates so posts appear published 1-2/week
 * starting from a given start date, going backwards in time.
 *
 * Body: { startDate?: "YYYY-MM-DD", intervalDays?: 4, dryRun?: boolean }
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const startDate   = body.startDate   ? new Date(body.startDate)   : new Date();
  const intervalDays = body.intervalDays ?? 4;
  const dryRun       = body.dryRun ?? false;

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "asc" },
    select:  { id: true, slug: true, title: true, publishedAt: true, createdAt: true },
  });

  const results: { slug: string; oldDate: string; newDate: string }[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    // Spread backwards: most recent post gets startDate, older posts go back intervalDays each
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() - i * intervalDays);
    // Add some hour variation to avoid all posts at midnight
    newDate.setHours(9 + (i % 3) * 2, 0, 0, 0);

    results.push({
      slug:    post.slug,
      oldDate: post.publishedAt.toISOString().slice(0, 10),
      newDate: newDate.toISOString().slice(0, 10),
    });

    if (!dryRun) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data:  { publishedAt: newDate },
      });
    }
  }

  return NextResponse.json({ ok: true, dryRun, totalPosts: posts.length, results });
}
