import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { registrarReservaPaquete } from "@/lib/reservaPaquete";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "paquete-send-confirmation", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email, customerName, customerPhone, notes, paymentIntentId, slug, pct, personas, fecha, locale } = body;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "El pago no está completado." }, { status: 402 });
    }

    // El armado de la reserva vive en `lib/reservaPaquete.ts`: lo comparte con
    // el webhook, que la recupera cuando el cliente cierra la pestaña.
    const r = await registrarReservaPaquete(
      pi,
      { email, customerName, customerPhone, notes, slug, pct, personas, fecha, locale },
      "pantalla",
    );
    if (r.estado === "error") {
      // El dinero entró pero la fila no: no se le inventa un folio. El webhook
      // o la conciliación la crean y le mandan su correo.
      return NextResponse.json(
        { error: "Tu pago entró. Estamos registrando tu reserva y te llega el correo con tu folio en unos minutos.", pagoRecibido: true },
        { status: 503 },
      );
    }
    const { confirmationNumber, cobrado, totalFull, pendiente } = r;

    return NextResponse.json({ status: "ok", confirmationNumber, cobrado, totalFull, pendiente });
  } catch (e: any) {
    console.error("❌ send-confirmation paquete crítico:", e.message);
    return NextResponse.json({ error: "No se pudo procesar la confirmación." }, { status: 500 });
  }
}
