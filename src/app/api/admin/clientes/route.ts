import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bookings = await prisma.tourBooking.findMany({
      where: { status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    });

    const map: Record<string, {
      email: string; nombre: string; telefono: string;
      totalReservas: number; totalGastado: number;
      ultimaFecha: string; tours: string[];
    }> = {};

    for (const b of bookings) {
      const key = b.customerEmail.toLowerCase();
      if (!map[key]) {
        map[key] = {
          email: b.customerEmail, nombre: b.customerName,
          telefono: b.customerPhone || "", totalReservas: 0,
          totalGastado: 0, ultimaFecha: b.tourDate, tours: [],
        };
      }
      const c = map[key];
      c.totalReservas++;
      c.totalGastado += b.totalAmount;
      if (b.tourDate > c.ultimaFecha) c.ultimaFecha = b.tourDate;
      if (!c.tours.includes(b.tourName)) c.tours.push(b.tourName);
    }

    return NextResponse.json(Object.values(map));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
