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
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const booking = await prisma.tourBooking.create({ data: body });
    return NextResponse.json({ ok: true, id: booking.id });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
