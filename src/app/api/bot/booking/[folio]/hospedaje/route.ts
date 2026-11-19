import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { metaDe, conMeta } from "@/lib/admin/reserva";
import { metaDeCotizacion } from "@/lib/cotizaciones/armar";
import { pickupConDato } from "@/lib/admin/hospedaje";
import { registrarEnBitacora, BOT } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/booking/[folio]/hospedaje  { hotel }
 *
 * El hotel donde pasamos por el cliente. Se pide DESPUÉS del pago (Manolo,
 * 18 nov 2026): antes de pagar solo se pregunta la zona (Xilitla, Ciudad
 * Valles…), que es lo que cambia el precio y la recogida.
 *
 * Se anota en el «Lugar de recogida» de la reserva (`_meta.pickupLugar`), el
 * mismo campo que el equipo llenaba a mano: lo ven la ficha de la reserva, la
 * salida del día, el calendario y el PDF de confirmación (`lib/admin/hospedaje.ts`).
 *
 * Folio: el HP-M-… de la reserva, o el COT-… que ya se volvió reserva. Una
 * cotización SIN pago contesta 409: el hotel todavía no se anota.
 */
export async function POST(req: NextRequest, { params }: { params: { folio: string } }) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const folio = String(params.folio || "").trim().toUpperCase();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const hotel = String(body?.hotel ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!folio || !hotel) {
    return NextResponse.json({ error: "Falta el folio o el nombre del hotel." }, { status: 400 });
  }
  // «Xilitla», «por definir», el lobby genérico: eso no es un hotel.
  if (!pickupConDato(hotel) || /^(xilitla|ciudad valles|cd\.? valles|valles)$/i.test(hotel)) {
    return NextResponse.json({ error: "Eso no es un hotel concreto: pregúntale el nombre del hotel o la dirección donde se queda." }, { status: 400 });
  }

  try {
    let confirmacion = folio;
    if (!/^HP/.test(folio)) {
      const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
      if (!q) return NextResponse.json({ error: `No existe el folio ${folio}.` }, { status: 404 });
      const rf = metaDeCotizacion(q.packageItems).reservaFolio;
      if (typeof rf !== "string" || !rf) {
        return NextResponse.json({
          error: "Esta cotización todavía no es reserva (no hay pago validado). El hotel se pide DESPUÉS del pago: no lo anotes ahora; si te lo dio, agradécele y sigue con el pago.",
        }, { status: 409 });
      }
      confirmacion = rf;
    }

    const b = await prisma.tourBooking.findUnique({ where: { confirmationNumber: confirmacion } });
    if (!b) return NextResponse.json({ error: `No existe la reserva ${confirmacion}.` }, { status: 404 });
    if (b.status === "cancelled") {
      return NextResponse.json({ error: "La reserva está cancelada: no anotes nada y pásalo al equipo." }, { status: 409 });
    }

    const antes = metaDe(b).pickupLugar ?? null;
    if (antes !== hotel) {
      await prisma.tourBooking.update({
        where: { id: b.id },
        data:  { lineItems: conMeta(b.lineItems, { pickupLugar: hotel }) as never },
      });
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "reserva",
        referencia: b.confirmationNumber,
        resumen:    `Hotel para la recogida: ${hotel} (lo dio el cliente por WhatsApp)`,
        detalle:    [{ campo: "Lugar de recogida", antes, despues: hotel }],
        actor:      BOT,
      });
    }

    return NextResponse.json({
      ok:       true,
      folio:    b.confirmationNumber,
      hotel,
      tourName: b.tourName,
      tourDate: b.tourDate,
    });
  } catch (e: unknown) {
    console.error("❌ bot/booking/hospedaje:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo guardar el hotel." }, { status: 500 });
  }
}
