import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });

    const html = buildTourQuoteEmailHtml({
      customerName: q.customerName,
      quoteNumber:  q.quoteNumber,
      tourName:     q.tourName,
      tourDate:     q.tourDate,
      tourSlug:     q.tourSlug,
      adults:       q.adults,
      children:     q.children,
      totalAmount:  q.totalAmount,
      notes:        q.notes || undefined,
      lineItems:    Array.isArray((q as any).lineItems) ? (q as any).lineItems : undefined,
    });

    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
    const to      = q.customerEmail || adminTo;

    await sendBrevoEmail({
      to:      [{ email: to, name: q.customerName }],
      bcc:     to !== adminTo ? [{ email: adminTo }] : [],
      subject: `Tu cotización de tour está lista — ${q.quoteNumber}`,
      htmlContent: html,
    });

    await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "enviada" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
