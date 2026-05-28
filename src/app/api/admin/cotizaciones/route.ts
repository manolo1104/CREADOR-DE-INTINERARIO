import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(quotes);
  } catch (e: any) {
    console.error("admin/cotizaciones GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.customerName || !body?.tourSlug) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    const quoteNumber = "COT-" + Date.now().toString(36).toUpperCase();
    // Whitelist de campos permitidos.
    const quote = await prisma.tourQuote.create({
      data: {
        quoteNumber,
        tourName:      body.tourName  ?? "",
        tourSlug:      body.tourSlug  ?? "",
        tourDate:      body.tourDate  ?? "",
        adults:        Number(body.adults)   || 1,
        children:      Number(body.children) || 0,
        totalAmount:   Math.round(Number(body.totalAmount) || 0),
        customerName:  String(body.customerName),
        customerEmail: body.customerEmail || "",
        customerPhone: body.customerPhone || null,
        notes:         body.notes || null,
        lineItems:     body.lineItems    ?? undefined,
        packageItems:  body.packageItems ?? undefined,
        status:        "borrador",
      },
    });
    return NextResponse.json({ ok: true, id: quote.id, quoteNumber });
  } catch (e: any) {
    console.error("admin/cotizaciones POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
