import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session_id");
  const producto = searchParams.get("producto");

  if (!sessionId) {
    return NextResponse.json({ valid: false, error: "session_id requerido" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid";

    if (paid) {
      logger.info("pdf_access_granted", {
        session_id: sessionId,
        producto: producto ?? "guia_pdf",
        email: session.customer_email
          ? session.customer_email.replace(/(.{2}).+(@.+)/, "$1***$2")
          : null,
      });
    } else {
      logger.warn("pdf_access_denied", {
        session_id: sessionId,
        payment_status: session.payment_status,
      });
    }

    return NextResponse.json({ valid: paid, payment_status: session.payment_status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    logger.error("pdf_verify_error", { reason: msg });
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}
