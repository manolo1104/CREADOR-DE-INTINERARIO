import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await prisma.tourBooking.findUniqueOrThrow({ where: { id: params.id } });

    // Extraer meta (_meta) de lineItems donde se guardan metodoPago, folioPago, pickupLugar
    const rawLines: any[] = Array.isArray((b as any).lineItems) ? (b as any).lineItems : [];
    const meta = rawLines.find((l: any) => l._meta) ?? {};

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
      depositoPagado:     b.depositoPagado ?? 0,
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
