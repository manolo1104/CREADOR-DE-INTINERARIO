import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { buildTourEmailHtml } from "@/lib/tourEmail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  try {
    const body = await req.json();
    const {
      email, customerName, customerPhone, notes,
      totalAmount, paymentIntentId,
      tourId, tourName, tourSlug, tourDate,
      adults, children,
      promoCode, promoDiscount,
    } = body;

    // 1. Número de confirmación
    const confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

    // 2. Guardar en base de datos
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

    // 3. Email de confirmación
    if (!resend) {
      console.warn("⚠️ RESEND_API_KEY no configurada — email omitido");
    } else {
      try {
        if (!email?.includes("@")) throw new Error("Email inválido");

        const html = buildTourEmailHtml({
          customerName,
          confirmationNumber,
          paymentIntentId,
          tourName,
          tourDate,
          tourSlug,
          adults:       Number(adults)   || 1,
          children:     Number(children) || 0,
          totalAmount:  Math.round(Number(totalAmount) || 0),
          promoCode,
          promoDiscount: Number(promoDiscount) || 0,
        });

        const from    = process.env.RESEND_FROM_TOURS || "tours@huasteca-potosina.com";
        const adminTo = process.env.ADMIN_EMAIL_TOURS  || "hola@huasteca-potosina.com";
        const bcc     = Array.from(new Set([adminTo]));

        const { data, error: resendError } = await resend.emails.send({
          from,
          to:      [email],
          bcc,
          subject: `Tu tour está confirmado — ${confirmationNumber}`,
          html,
        });

        if (resendError) {
          console.error(`❌ Resend: ${resendError.message} | to=${email}`);
        } else {
          console.log(`✅ Email enviado | id=${data?.id} | to=${email} | cn=${confirmationNumber}`);
        }
      } catch (e: any) {
        console.error("❌ Email exception:", e.message);
      }
    }

    return NextResponse.json({ status: "ok", confirmationNumber });
  } catch (e: any) {
    console.error("❌ send-confirmation tour crítico:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
