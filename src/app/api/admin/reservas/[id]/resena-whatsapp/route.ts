import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marcarReviewWhatsapp } from "@/lib/reviewRequest";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

/**
 * Anota que alguien del equipo le pidió la reseña por WhatsApp a esta reserva.
 * El WhatsApp lo abre el propio navegador (wa.me); aquí solo se deja la marca
 * para que la lista de Reseñas sepa a quién ya se le escribió.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await prisma.tourBooking.findUniqueOrThrow({
      where:  { id: params.id },
      select: { id: true, lineItems: true, confirmationNumber: true, customerName: true },
    });
    await prisma.tourBooking.update({
      where: { id: b.id },
      data:  { lineItems: marcarReviewWhatsapp(b.lineItems) as never },
    });
    await registrarEnBitacora({
      accion:     "envió",
      entidad:    "reserva",
      referencia: b.confirmationNumber,
      resumen:    `Pidió reseña de Google por WhatsApp a ${b.customerName} (${b.confirmationNumber})`,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("admin/reservas resena-whatsapp:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo anotar" }, { status: 500 });
  }
}
