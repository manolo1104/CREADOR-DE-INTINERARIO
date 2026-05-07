import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });

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

    const from    = process.env.RESEND_FROM_TOURS || "onboarding@resend.dev";
    const adminTo = process.env.ADMIN_EMAIL_TOURS  || "daftpunkmanolo@gmail.com";
    const to      = q.customerEmail || adminTo;

    const { error } = await resend.emails.send({
      from,
      to:      [to],
      bcc:     to !== adminTo ? [adminTo] : [],
      subject: `Tu cotización de tour está lista — ${q.quoteNumber}`,
      html,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "enviada" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
