import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BOOKING_FIELDS = [
  "tourId", "tourName", "tourSlug", "tourDate", "adults", "children",
  "totalAmount", "depositoPagado", "promoCode", "promoDiscount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "status",
  "pagoProveedor", "pagoProveedorMonto", "pagoProveedorFecha", "pagoProveedorNota",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    // Solo actualizar campos permitidos que vengan en el body (update parcial).
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of BOOKING_FIELDS) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const updated = await prisma.tourBooking.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Eliminación completa de la base de datos. La evidencia del pago al
    // proveedor vive en otra tabla sin llave foránea, así que se borra a mano:
    // si no, quedarían bytes huérfanos ocupando espacio para siempre.
    await prisma.pagoProveedorEvidencia.deleteMany({ where: { bookingId: params.id } });
    await prisma.tourBooking.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
