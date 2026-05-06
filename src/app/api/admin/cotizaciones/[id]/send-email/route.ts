import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { buildTourEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });

  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });

    // Misma plantilla que la confirmación de reserva desde la web
    const html = buildTourEmailHtml({
      customerName:       q.customerName,
      confirmationNumber: q.quoteNumber,
      tourName:           q.tourName,
      tourDate:           q.tourDate,
      tourSlug:           q.tourSlug,
      adults:             q.adults,
      children:           q.children,
      totalAmount:        q.totalAmount,
      promoCode:          undefined,
      promoDiscount:      0,
    });

    const from    = process.env.RESEND_FROM_TOURS || "onboarding@resend.dev";
    const adminTo = process.env.ADMIN_EMAIL_TOURS  || "daftpunkmanolo@gmail.com";

    const { error } = await resend.emails.send({
      from,
      to:      [q.customerEmail],
      bcc:     [adminTo],
      subject: `Tu cotización de tour — ${q.quoteNumber}`,
      html,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "enviada" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
