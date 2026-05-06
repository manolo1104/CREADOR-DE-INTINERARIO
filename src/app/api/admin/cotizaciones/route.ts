import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(quotes);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quoteNumber = "COT-" + Date.now().toString(36).toUpperCase();
    const quote = await prisma.tourQuote.create({
      data: { quoteNumber, ...body, status: "borrador" },
    });
    return NextResponse.json({ ok: true, id: quote.id, quoteNumber });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
