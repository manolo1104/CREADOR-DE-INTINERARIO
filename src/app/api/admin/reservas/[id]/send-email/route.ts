import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await prisma.tourBooking.findUniqueOrThrow({ where: { id: params.id } });

    // No enviar a direcciones inválidas (p. ej. reservas recuperadas por webhook).
    if (!b.customerEmail || !b.customerEmail.includes("@") || b.customerEmail.endsWith("@desconocido")) {
      return NextResponse.json({ error: "Esta reserva no tiene un email válido del cliente." }, { status: 400 });
    }

    // Extraer meta (_meta) de lineItems donde se guardan metodoPago, folioPago, pickupLugar
    const rawLines: any[] = Array.isArray((b as any).lineItems) ? (b as any).lineItems : [];
    const meta = rawLines.find((l: any) => l._meta) ?? {};

    // Pago online por Stripe = liquidado al 100% aunque no tenga anticipo registrado.
    const rawDeposito = b.depositoPagado ?? 0;
    const depositoEfectivo = rawDeposito > 0 ? rawDeposito : (b.stripePaymentIntentId ? b.totalAmount : 0);

    const html = buildTourEmailHtml({
      customerName:       b.customerName,
      confirmationNumber: b.confirmationNumber,
      paymentIntentId:    b.stripePaymentIntentId || undefined,
      tourName:           b.tourName,
      tourDate:           b.tourDate,
      tourSlug:           b.tourSlug,
      adults:             b.adults,
      children:           b.children,
      totalAmount:        b.totalAmount,
      promoCode:          b.promoCode || undefined,
      promoDiscount:      b.promoDiscount,
      depositoPagado:     depositoEfectivo,
      metodoPago:         meta.metodoPago || undefined,
      pickupLugar:        meta.pickupLugar || undefined,
    });

    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";

    await sendBrevoEmail({
      to:      [{ email: b.customerEmail, name: b.customerName }],
      bcc:     [{ email: adminTo }],
      subject: `Tu tour está confirmado — ${b.confirmationNumber}`,
      htmlContent: html,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/reservas send-email:", e?.message);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
}
