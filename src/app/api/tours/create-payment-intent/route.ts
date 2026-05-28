import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { computeTourCharge } from "@/lib/tourPricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "create-payment-intent", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { customerEmail, customerName, tourDetails } = await req.json();

    // El monto es AUTORITATIVO desde el servidor: se ignora cualquier amount del cliente.
    const charge = computeTourCharge({
      tourId:        tourDetails?.tourId,
      tourSlug:      tourDetails?.tourSlug,
      adults:        tourDetails?.adults,
      childrenMid:   tourDetails?.childrenMid,
      childrenSmall: tourDetails?.childrenSmall,
      promoCode:     tourDetails?.promoCode,
    });

    if (!charge) {
      logger.warn("payment_intent_invalid", { tourId: tourDetails?.tourId, tourSlug: tourDetails?.tourSlug });
      return NextResponse.json({ error: "Tour o número de participantes inválido." }, { status: 400 });
    }

    const childrenTotal =
      (Number(tourDetails?.childrenMid) || 0) + (Number(tourDetails?.childrenSmall) || 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(charge.charge * 100), // MXN → centavos (calculado en el servidor)
      currency:      "mxn",
      description:   `Tour Huasteca Potosina — ${charge.tour.nombre} · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        tourId:        charge.tour.id,
        tourName:      charge.tour.nombre,
        tourSlug:      charge.tour.slug,
        tourDate:      tourDetails?.tourDate || "",
        adults:        String(tourDetails?.adults || 1),
        children:      String(childrenTotal),
        totalCompleto: String(charge.total),
        source:        "huasteca-potosina.com",
      },
    });

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount:          charge.charge, // monto real cobrado (para que la UI lo refleje)
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    logger.error("create_payment_intent_error", { reason: msg });
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
