import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { htmlCotizacion } from "@/lib/documentos/htmlCotizacion";
import { htmlConfirmacion } from "@/lib/documentos/htmlConfirmacion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORIGEN = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");

/**
 * GET /api/bot/documento/[folio] — el HTML del PDF que descarga el panel, para
 * que el bot lo pase a PDF con su Chromium y lo mande por WhatsApp (16 nov
 * 2026, «Estructura de oro»: la cotización en PDF es el punto de quiebre).
 *
 *  · COT-… → la cotización (`htmlCotizacion`).
 *  · HP-M-… / HP… → la confirmación de la reserva (`htmlConfirmacion`). Una
 *    cancelada no lleva comprobante: 409.
 *
 * 200 text/html · 404 sin folio · 409 reserva cancelada.
 */
export async function GET(req: NextRequest, { params }: { params: { folio: string } }) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const folio = String(params.folio || "").trim().toUpperCase();
  if (!folio) return NextResponse.json({ error: "Falta el folio." }, { status: 400 });

  try {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
    if (q) return html(htmlCotizacion(q, ORIGEN));

    const b = await prisma.tourBooking.findUnique({ where: { confirmationNumber: folio } });
    if (!b) return NextResponse.json({ error: `No existe ${folio}.` }, { status: 404 });
    if (b.status === "cancelled") {
      return NextResponse.json({ error: `La reserva ${folio} está cancelada: no lleva comprobante.` }, { status: 409 });
    }
    return html(htmlConfirmacion(b, ORIGEN));
  } catch (e: unknown) {
    console.error("❌ bot/documento:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo armar el documento." }, { status: 500 });
  }
}

function html(cuerpo: string) {
  return new NextResponse(cuerpo, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
