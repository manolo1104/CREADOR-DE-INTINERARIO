import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("payment_error", { reason: "STRIPE_SECRET_KEY missing" });
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY no configurada." },
      { status: 503 }
    );
  }

  try {
    const {
      monto,
      descripcion,
      email_cliente,
      producto,
      codigoDescuento,
      metadata,
    }: {
      monto: string | number;
      descripcion?: string;
      email_cliente?: string;
      producto?: string;
      codigoDescuento?: string;
      metadata?: Record<string, string>;
    } = await req.json();

    const CODIGOS_DESCUENTO: Record<string, number> = {
      HUASTECA2026: 1,
    };
    const pctDescuento =
      typeof codigoDescuento === "string" && CODIGOS_DESCUENTO[codigoDescuento.trim().toUpperCase()]
        ? CODIGOS_DESCUENTO[codigoDescuento.trim().toUpperCase()]
        : 0;
    const montoFinal = parseFloat(String(monto)) * (1 - pctDescuento);

    if (!monto || parseFloat(String(monto)) <= 0) {
      logger.warn("payment_invalid_amount", { monto });
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    logger.info("payment_session_creating", {
      monto_mxn: montoFinal,
      descuento_pct: pctDescuento,
      email: email_cliente ? email_cliente.replace(/(.{2}).+(@.+)/, "$1***$2") : null,
    });

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
            unit_amount: Math.round(montoFinal * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: email_cliente ?? undefined,
      metadata: metadata ?? undefined,
      success_url: producto === "guia_pdf"
        ? `${appUrl}/guia/descarga?session_id={CHECKOUT_SESSION_ID}`
        : producto === "itinerario"
        ? `${appUrl}/planear?paid=1&session_id={CHECKOUT_SESSION_ID}`
        : producto === "tour_booking"
        ? `${appUrl}/confirmacion-tour?status=success&session_id={CHECKOUT_SESSION_ID}`
        : `${appUrl}/confirmacion-pago.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: producto === "guia_pdf"
        ? `${appUrl}/guia?cancelled=1`
        : producto === "itinerario"
        ? `${appUrl}/planear`
        : producto === "tour_booking"
        ? `${appUrl}/confirmacion-tour?status=cancelled`
        : `${appUrl}/confirmacion-pago.html?status=cancelled`,
    });

    logger.info("payment_session_created", {
      session_id: session.id,
      monto_mxn: montoFinal,
      codigo_descuento: pctDescuento > 0 ? codigoDescuento : null,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    logger.error("payment_exception", { reason: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
