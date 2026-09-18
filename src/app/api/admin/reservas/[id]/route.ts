import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { origenValido } from "@/lib/origenReserva";
import {
  registrarEnBitacora, camposCambiados, ETIQUETAS_RESERVA, pesos,
} from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

const BOOKING_FIELDS = [
  "tourId", "tourName", "tourSlug", "tourDate", "adults", "children",
  "totalAmount", "depositoPagado", "promoCode", "promoDiscount",
  "customerName", "customerEmail", "customerPhone", "notes",
  "lineItems", "packageItems", "extraItems", "status",
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
    // El resto de la lista se copia tal cual; el origen no, porque alimenta el
    // desglose de ingresos y una cadena libre lo convertiría en otra columna
    // sin agrupar.
    if (body.origen !== undefined) data.origen = origenValido(body.origen);
    // Foto de cómo estaba ANTES, para poder contar qué cambió en la bitácora.
    const antes = await prisma.tourBooking.findUnique({ where: { id: params.id } });
    const updated = await prisma.tourBooking.update({
      where: { id: params.id },
      data,
    });

    const cambios = camposCambiados(antes as any, data, ETIQUETAS_RESERVA);
    if (cambios.length) {
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "reserva",
        referencia: updated.confirmationNumber,
        resumen:    `Reserva ${updated.confirmationNumber} — ${updated.customerName}: ${cambios.map(c => c.campo).join(", ")}`,
        detalle:    cambios,
      });
    }
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
    // Se lee antes de borrar: después ya no hay a quién nombrar en la bitácora.
    const antes = await prisma.tourBooking.findUnique({ where: { id: params.id } });
    await prisma.pagoProveedorEvidencia.deleteMany({ where: { bookingId: params.id } });
    await prisma.tourBooking.delete({ where: { id: params.id } });

    await registrarEnBitacora({
      accion:     "eliminó",
      entidad:    "reserva",
      referencia: antes?.confirmationNumber,
      resumen:    antes
        ? `Reserva ${antes.confirmationNumber} — ${antes.customerName}, ${antes.tourName || "sin tour"} el ${antes.tourDate || "sin fecha"}, ${pesos(antes.totalAmount)}`
        : `Reserva ${params.id} (ya no estaba en la base)`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/reservas/[id]:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
