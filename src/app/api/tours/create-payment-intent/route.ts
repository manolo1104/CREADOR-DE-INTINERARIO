import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { amount, customerEmail, customerName, tourDetails } = await req.json();
    if (!amount) return NextResponse.json({ error: "amount es requerido" }, { status: 400 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(amount * 100), // MXN → centavos
      currency:      "mxn",
      description:   `Tour Huasteca Potosina — ${tourDetails?.tourName || ""} · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        tourId:        tourDetails?.tourId   || "",
        tourName:      tourDetails?.tourName || "",
        tourDate:      tourDetails?.tourDate || "",
        adults:        String(tourDetails?.adults   || 1),
        children:      String(tourDetails?.children || 0),
        source:        "huasteca-potosina.com",
      },
    });

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (e: any) {
    console.error("❌ create-payment-intent tour:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
