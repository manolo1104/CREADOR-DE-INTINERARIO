import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const bookings = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
    const filtered = bookings.filter(b => !search ||
      [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName]
        .some(v => v?.toLowerCase().includes(search))
    );
    return NextResponse.json(filtered);
  } catch (e: any) { console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.confirmationNumber || !body?.customerName) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    // Whitelist de campos permitidos (evita asignación masiva de columnas inesperadas).
    const booking = await prisma.tourBooking.create({
      data: {
        confirmationNumber:    String(body.confirmationNumber),
        tourId:                body.tourId    ?? "",
        tourName:              body.tourName  ?? "",
        tourSlug:              body.tourSlug  ?? "",
        tourDate:              body.tourDate  ?? "",
        adults:                Number(body.adults)   || 1,
        children:              Number(body.children) || 0,
        totalAmount:           Math.round(Number(body.totalAmount) || 0),
        depositoPagado:        Math.round(Number(body.depositoPagado) || 0),
        promoCode:             body.promoCode || null,
        promoDiscount:         Number(body.promoDiscount) || 0,
        stripePaymentIntentId: body.stripePaymentIntentId || null,
        customerName:          String(body.customerName),
        customerEmail:         body.customerEmail || "",
        customerPhone:         body.customerPhone || null,
        notes:                 body.notes || null,
        lineItems:             body.lineItems    ?? undefined,
        packageItems:          body.packageItems ?? undefined,
        status:                body.status || "paid",
      },
    });
    return NextResponse.json({ ok: true, id: booking.id });
  } catch (e: any) { console.error("admin/reservas:", e?.message); return NextResponse.json({ error: "Error interno" }, { status: 500 }); }
}
