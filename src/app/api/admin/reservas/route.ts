import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const tourSlug = searchParams.get("tour") || "";

    const bookings = await prisma.tourBooking.findMany({
      orderBy: { createdAt: "desc" },
    });

    const filtered = bookings.filter(b => {
      const matchSearch = !search || [b.customerName, b.customerEmail, b.confirmationNumber]
        .some(v => v?.toLowerCase().includes(search));
      const matchTour = !tourSlug || b.tourSlug === tourSlug;
      return matchSearch && matchTour;
    });

    return NextResponse.json(filtered);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
