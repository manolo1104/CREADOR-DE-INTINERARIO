import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { addTourToSheet } from "@/lib/sheetsHuasteca";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email, customerName, customerPhone, notes,
      totalAmount, paymentIntentId,
      tourId, tourName, tourSlug, tourDate,
      adults, children,
      promoCode, promoDiscount,
    } = body;

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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
