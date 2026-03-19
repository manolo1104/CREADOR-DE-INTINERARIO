import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY no configurada." },
      { status: 503 }
    );
  }

  try {
    const { monto, descripcion, email_cliente } = await req.json();

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: descripcion ?? "Itinerario Huasteca Potosina",
              description: "Itinerario personalizado — Huasteca IA",
            },
            unit_amount: Math.round(parseFloat(monto) * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: email_cliente ?? undefined,
      success_url: `${appUrl}/confirmacion-pago.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/confirmacion-pago.html?status=cancelled`,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
