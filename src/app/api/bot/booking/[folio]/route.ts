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

  // ⚠️ Qué se pagó y qué falta.
  // Esto NO se devolvía: el bot solo veía `totalAmount` y `status: "paid"`, así
  // que a quien reservó EN LÍNEA —donde se cobra el anticipo del 30 %— Camila
  // le decía que su reserva estaba pagada por el total. El cliente se enteraba
  // del saldo el día del tour.
  //
  // `status: "paid"` significa RESERVA CONFIRMADA, no liquidada: el anticipo ya
  // aparta el lugar. Lo que dice cuánto entró es `depositoPagado`.
  // Hay 2 reservas viejas (jul 2026) sin este dato. Ahí NO se adivina: decir
  // "liquidado" sin saberlo es regalarle el saldo a alguien que quizá lo debe.
  const conDato   = b.depositoPagado != null && b.depositoPagado > 0;
  const pagado    = conDato ? b.depositoPagado! : null;
  const saldo     = conDato ? Math.max(0, b.totalAmount - pagado!) : null;
  const liquidado = conDato ? saldo === 0 : null;

  return NextResponse.json({
    folio: b.confirmationNumber,
    tourName: b.tourName,
    tourSlug: b.tourSlug,
    tourDate: b.tourDate,
    adults: b.adults,
    children: b.children,
    totalAmount: b.totalAmount,
    status: b.status, // pending | paid | cancelled
    pagado,
    saldo,
    liquidado,
    pctPagado: conDato ? Math.round((pagado! / Math.max(1, b.totalAmount)) * 100) : null,
    // Redactado para que el bot no tenga que interpretar los números.
    resumenPago: !conDato
      ? `No tengo registrado cuánto se pagó de esta reserva (total $${b.totalAmount.toLocaleString("es-MX")} MXN). `
        + `NO le digas al cliente que está liquidada ni que debe algo: dile que el equipo se lo confirma en un momento.`
      : liquidado
        ? `Liquidado: pagó los $${b.totalAmount.toLocaleString("es-MX")} MXN completos. No debe nada.`
        : `Pagó un anticipo de $${pagado!.toLocaleString("es-MX")} MXN de un total de $${b.totalAmount.toLocaleString("es-MX")} MXN. `
          + `LE FALTA PAGAR $${saldo!.toLocaleString("es-MX")} MXN, que se liquidan el día del tour en efectivo o con tarjeta.`,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    createdAt: b.createdAt,
  });
}
