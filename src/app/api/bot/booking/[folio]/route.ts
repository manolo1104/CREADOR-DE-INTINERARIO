import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/bot/booking/[folio]
 * Consulta una reserva por folio. Lo usa el bot para /confirma y para
 * responder dudas del cliente sobre su reserva.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const folio = String(params.folio || "").trim().toUpperCase();
  if (!folio) {
    return NextResponse.json({ error: "Falta el folio." }, { status: 400 });
  }

  const b = await prisma.tourBooking.findUnique({
    where: { confirmationNumber: folio },
  });

  if (!b) {
    return NextResponse.json({ error: `No existe la reserva ${folio}.` }, { status: 404 });
  }

  return NextResponse.json({
    folio: b.confirmationNumber,
    tourName: b.tourName,
    tourSlug: b.tourSlug,
    tourDate: b.tourDate,
    adults: b.adults,
    children: b.children,
    totalAmount: b.totalAmount,
    status: b.status, // pending | paid | cancelled
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    createdAt: b.createdAt,
  });
}
