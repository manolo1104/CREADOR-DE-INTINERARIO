import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Precios fijos por producto (MXN). El cliente NO decide el monto.
const PRECIOS_FIJOS: Record<string, number> = {
  guia_pdf: 49,
};

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("payment_error", { reason: "STRIPE_SECRET_KEY missing" });
    return NextResponse.json(
      { error: "Pagos no disponibles temporalmente." },
      { status: 503 }
    );
  }

  const limited = rateLimit(req, { key: "cobrar", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const {
      monto,
      descripcion,
      email_cliente,
      producto,
      metadata,
    }: {
      monto?: string | number;
      descripcion?: string;
      email_cliente?: string;
      producto?: string;
      metadata?: Record<string, string>;
    } = await req.json();

    // Si el producto tiene precio fijo en el servidor, se usa ese (ignora monto del cliente).
    const precioFijo = producto ? PRECIOS_FIJOS[producto] : undefined;
    const montoSolicitado = parseFloat(String(monto ?? ""));
    const montoFinal = precioFijo ?? montoSolicitado;

    if (!montoFinal || montoFinal <= 0) {
      logger.warn("payment_invalid_amount", { producto });
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    logger.info("payment_session_creating", {
      monto_mxn: montoFinal,
      producto: producto ?? null,
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
      // Incluimos `producto` en metadata para que el webhook identifique la compra
      // (p. ej. guia_pdf) y dispare el correo de entrega.
      metadata: { ...(metadata ?? {}), ...(producto ? { producto } : {}) },
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
      producto: producto ?? null,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    logger.error("payment_exception", { reason: msg });
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
