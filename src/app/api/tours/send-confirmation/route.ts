import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { addTourToSheet } from "@/lib/sheetsHuasteca";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "send-confirmation", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      email, customerName, customerPhone, notes,
      paymentIntentId,
      tourId, tourName, tourSlug, tourDate,
      adults, children,
      promoCode, promoDiscount,
      lineItems, packageItems,
    } = body;

    // ── Verificación del pago con Stripe (fuente de verdad del monto) ─────────
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }

    if (pi.status !== "succeeded") {
      console.warn(`⚠️ PaymentIntent ${paymentIntentId} estado=${pi.status} — no confirmado`);
      return NextResponse.json({ error: "El pago no está completado." }, { status: 402 });
    }

    // Monto AUTORITATIVO desde Stripe (centavos → MXN), no el que envía el cliente.
    const totalAmount = Math.round((pi.amount_received || pi.amount) / 100);

    // ── Idempotencia: si ya existe una reserva para este pago, devolverla ─────
    const existing = await prisma.tourBooking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (existing) {
      console.log(`↩️ Reserva ya existente para ${paymentIntentId} — ${existing.confirmationNumber}`);
      return NextResponse.json({ status: "ok", confirmationNumber: existing.confirmationNumber });
    }

    const confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

    try {
      await addTourToSheet({
        confirmationNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: email,
        tourName,
        tourDate,
        adults:        Number(adults)   || 1,
        children:      Number(children) || 0,
        totalAmount:   Math.round(Number(totalAmount) || 0),
        promoCode:     promoCode  || null,
        promoDiscount: Number(promoDiscount) || 0,
        stripePaymentIntentId: paymentIntentId || null,
        notes:         notes || null,
      });
    } catch (e: any) {
      console.error("❌ Sheets tour:", e.message);
    }

    try {
      await prisma.tourBooking.create({
        data: {
          confirmationNumber,
          tourId:    tourId    || "unknown",
          tourName:  tourName  || "Tour Huasteca",
          tourSlug:  tourSlug  || "",
          tourDate:  tourDate  || "",
          adults:    Number(adults)   || 1,
          children:  Number(children) || 0,
          totalAmount:           Math.round(Number(totalAmount) || 0),
          depositoPagado:        Math.round(Number(totalAmount) || 0), // pago 100% online = liquidado
          promoCode:             promoCode  || null,
          promoDiscount:         Number(promoDiscount) || 0,
          stripePaymentIntentId: paymentIntentId || null,
          customerName,
          customerEmail:  email,
          customerPhone:  customerPhone || null,
          notes:          notes         || null,
          status:         "paid",
        },
      });
      console.log(`✅ TourBooking guardado — ${confirmationNumber}`);
    } catch (e: any) {
      console.error("❌ prisma.tourBooking.create:", e.message);
    }

    if (!email?.includes("@")) {
      console.warn("⚠️ Email inválido — confirmación omitida");
    } else {
      try {
        // Extraer pickup de notes: "Recogida: Hotel X | otras notas"
        const pickupMatch = (notes || "").match(/Recogida:\s*([^|]+)/);
        const pickupLugar = pickupMatch ? pickupMatch[1].trim() : undefined;

        const html = buildTourEmailHtml({
          customerName,
          confirmationNumber,
          paymentIntentId,
          tourName,
          tourDate,
          tourSlug,
          adults:        Number(adults)      || 1,
          children:      Number(children)    || 0,
          totalAmount:   Math.round(Number(totalAmount) || 0),
          promoCode,
          promoDiscount: Number(promoDiscount) || 0,
          pickupLugar,
          lineItems:     Array.isArray(lineItems) ? lineItems.filter((l: any) => l && !l._meta) : undefined,
          packageItems:  Array.isArray(packageItems) ? packageItems : undefined,
        });

        const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";

        let pdfAttachment: { name: string; content: string }[] = [];
        try {
          const pdfPath = path.join(process.cwd(), "public", "guia-huasteca-potosina.pdf");
          const pdfBase64 = fs.readFileSync(pdfPath).toString("base64");
          pdfAttachment = [{ name: "Guia-Huasteca-Potosina.pdf", content: pdfBase64 }];
        } catch {
          // Si el PDF no está disponible, el correo igual se envía
        }

        await sendBrevoEmail({
          to:      [{ email, name: customerName }],
          bcc:     [{ email: adminTo }],
          subject: `Tu tour está confirmado — ${confirmationNumber}`,
          htmlContent: html,
          attachments: pdfAttachment,
        });

        console.log(`✅ Email Brevo enviado | to=${email} | cn=${confirmationNumber}`);
      } catch (e: any) {
        console.error("❌ Brevo email exception:", e.message);
      }
    }

    return NextResponse.json({ status: "ok", confirmationNumber });
  } catch (e: any) {
    console.error("❌ send-confirmation tour crítico:", e.message);
    return NextResponse.json({ error: "No se pudo procesar la confirmación." }, { status: 500 });
  }
}
