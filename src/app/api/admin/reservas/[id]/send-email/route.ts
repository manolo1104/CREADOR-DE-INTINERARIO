import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { buildTourEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });

  try {
    const b = await prisma.tourBooking.findUniqueOrThrow({ where: { id: params.id } });

    // Misma plantilla que cuando el cliente reserva desde la web
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
    });

    const from    = process.env.RESEND_FROM_TOURS || "onboarding@resend.dev";
    const adminTo = process.env.ADMIN_EMAIL_TOURS  || "daftpunkmanolo@gmail.com";

    const { error } = await resend.emails.send({
      from,
      to:      [b.customerEmail],
      bcc:     [adminTo],
      subject: `Tu tour está confirmado — ${b.confirmationNumber}`,
      html,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
