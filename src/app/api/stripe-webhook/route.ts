import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
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
    });
  }

  // ── Red de seguridad para reservas de tour ────────────────────────────────
  // Si el cliente paga pero cierra la pestaña antes de llamar a send-confirmation,
  // el pago igual queda registrado aquí (el webhook es la fuente de verdad).
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const meta = pi.metadata ?? {};

    // Solo reservas de tour creadas por /api/tours/create-payment-intent
    if (meta.source === "huasteca-potosina.com" && meta.tourId) {
      try {
        const existing = await prisma.tourBooking.findFirst({
          where: { stripePaymentIntentId: pi.id },
        });

        if (!existing) {
          const totalAmount = Math.round((pi.amount_received || pi.amount) / 100);
          const confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

          await prisma.tourBooking.create({
            data: {
              confirmationNumber,
              tourId:                meta.tourId,
              tourName:              meta.tourName || "Tour Huasteca",
              tourSlug:              meta.tourSlug || "",
              tourDate:              meta.tourDate || "",
              adults:                Number(meta.adults) || 1,
              children:              Number(meta.children) || 0,
              totalAmount,
              depositoPagado:        totalAmount, // pago 100% online = liquidado
              stripePaymentIntentId: pi.id,
              customerName:          meta.customerName || "Pendiente (vía webhook)",
              customerEmail:         meta.customerEmail || pi.receipt_email || "pendiente@desconocido",
              customerPhone:         null,
              notes:                 "Reserva registrada automáticamente por webhook — el cliente no completó la pantalla de confirmación.",
              status:                "paid",
            },
          });

          logger.info("stripe_webhook_booking_recovered", {
            payment_intent: pi.id,
            confirmation: confirmationNumber,
          });

          // Aviso al administrador para que dé seguimiento manual.
          const adminTo = process.env.ADMIN_EMAIL_TOURS;
          if (adminTo) {
            try {
              await sendBrevoEmail({
                to: [{ email: adminTo }],
                subject: `⚠️ Pago recibido sin confirmación completa — ${confirmationNumber}`,
                htmlContent: `
                  <p>Se recibió un pago de tour pero el cliente no completó la pantalla de confirmación.</p>
                  <ul>
                    <li><strong>Tour:</strong> ${meta.tourName || meta.tourId}</li>
                    <li><strong>Fecha:</strong> ${meta.tourDate || "—"}</li>
                    <li><strong>Monto cobrado:</strong> $${totalAmount.toLocaleString("es-MX")} MXN</li>
                    <li><strong>PaymentIntent:</strong> ${pi.id}</li>
                    <li><strong>Email recibo:</strong> ${pi.receipt_email || "—"}</li>
                  </ul>
                  <p>Revisa Stripe y contacta al cliente para coordinar el tour.</p>`,
              });
            } catch (e) {
              logger.error("stripe_webhook_admin_alert_failed", {
                reason: e instanceof Error ? e.message : "unknown",
              });
            }
          }
        }
      } catch (e) {
        logger.error("stripe_webhook_booking_recovery_failed", {
          reason: e instanceof Error ? e.message : "unknown",
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
