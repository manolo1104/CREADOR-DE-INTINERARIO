import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const QUOTE_FIELDS = [
  "tourName", "tourSlug", "tourDate", "adults", "children", "totalAmount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = {};
    for (const k of QUOTE_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    await prisma.tourQuote.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/cotizaciones PATCH:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("hard") === "1") {
      await prisma.tourQuote.delete({ where: { id: params.id } });
    } else {
      await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "expirada" } });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/cotizaciones DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
