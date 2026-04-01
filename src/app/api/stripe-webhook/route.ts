import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Disable body parsing — Stripe requires the raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("stripe_webhook_error", { reason: "STRIPE_WEBHOOK_SECRET not configured" });
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    logger.error("stripe_webhook_signature_error", { reason: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    logger.info("stripe_webhook_payment_succeeded", {
      session_id: session.id,
      payment_status: session.payment_status,
      email: session.customer_email
        ? session.customer_email.replace(/(.{2}).+(@.+)/, "$1***$2")
        : null,
    });
    // The client handles post-payment flow by detecting ?paid=1&session_id= in the redirect URL
    // and verifying via /api/verify-session before calling /api/generate
  }

  return NextResponse.json({ received: true });
}
