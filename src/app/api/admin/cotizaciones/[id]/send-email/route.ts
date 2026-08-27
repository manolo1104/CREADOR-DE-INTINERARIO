import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";
import { metaAlEnviar, conMeta } from "@/lib/quoteFollowUp";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });

    // El _meta de la cotización (anticipo, vigencia, numPersonas) vive en packageItems.
    const rawPkgs = Array.isArray((q as any).packageItems) ? (q as any).packageItems : [];
    const meta    = rawPkgs.find((p: any) => p && p._meta) || {};

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
      partySize:    Number(meta.numPersonas) || undefined,
      lineItems:    Array.isArray((q as any).lineItems) ? (q as any).lineItems : undefined,
      packageItems: Array.isArray((q as any).packageItems) ? (q as any).packageItems : undefined,
      // Idioma del cliente, guardado en el `_meta` de la cotización.
      locale:       meta.locale,
    });

    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
    const to      = q.customerEmail || adminTo;

    await sendBrevoEmail({
      to:      [{ email: to, name: q.customerName }],
      bcc:     to !== adminTo ? [{ email: adminTo }] : [],
      subject: meta.locale === "en"
        ? `Your tour quote is ready — ${q.quoteNumber}`
        : `Tu cotización de tour está lista — ${q.quoteNumber}`,
      htmlContent: html,
    });

    // Mandarla a mano ARRANCA el seguimiento. Antes, la cotización que Manolo
    // atendía en persona —la que cierra al 25 %— se quedaba sin un solo correo
    // después, mientras que el carrito automático sí tenía tres.
    //
    // La marca se escribe AQUÍ y no en el cron: si el viaje ya está encima y
    // no caben los tres pasos antes de la fecha, nace en "sin-tiempo" y queda
    // dicho por qué esa cotización no va a recibir seguimiento.
    const seq = metaAlEnviar(q.tourDate, meta.locale === "en" ? "en" : "es");
    await prisma.tourQuote.update({
      where: { id: params.id },
      data:  {
        status:    "enviada",
        lineItems: conMeta(q.lineItems, seq) as never,
      },
    });
    return NextResponse.json({ ok: true, seguimiento: seq.seqEstado });
  } catch (e: any) {
    console.error("admin/cotizaciones send-email:", e?.message);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }
}
