import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { addTourToSheet } from "@/lib/sheetsHuasteca";
import { actividad, mxn, nombreCorto } from "@/lib/logger";
import { cerrarCarritosDe } from "@/lib/cerrarCarrito";
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
      // Idioma en que el cliente reservó, para que la confirmación salga igual.
      locale,
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

    // Montos AUTORITATIVOS desde Stripe (centavos → MXN), no los que envía el
    // cliente. `cobrado` es lo que de verdad entró; `totalAmount` es el precio
    // completo de la reserva, que con anticipo NO coincide con lo cobrado.
    const cobrado     = Math.round((pi.amount_received || pi.amount) / 100);
    const totalCompleto = Math.round(Number(pi.metadata?.totalCompleto) || 0);
    const totalAmount = totalCompleto > 0 ? totalCompleto : cobrado;
    const saldo       = Math.max(0, totalAmount - cobrado);

    // ── Idempotencia: si ya existe una reserva para este pago, devolverla ─────
    const existing = await prisma.tourBooking.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (existing) {
      console.log(`↩️ Reserva ya existente para ${paymentIntentId} — ${existing.confirmationNumber}`);
      return NextResponse.json({ status: "ok", confirmationNumber: existing.confirmationNumber });
    }

    let confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

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
          depositoPagado:        cobrado, // lo realmente cobrado: si hubo anticipo, queda saldo
          promoCode:             promoCode  || null,
          promoDiscount:         Number(promoDiscount) || 0,
          stripePaymentIntentId: paymentIntentId || null,
          customerName,
          customerEmail:  email,
          customerPhone:  customerPhone || null,
          notes:          notes         || null,
          // Tours por vehículo (RZR): guarda la línea con ruta/vehículo/unidades
          // para que /reservas, el PDF y el modal del admin la reconstruyan.
          // El idioma va en el objeto `_meta` (patrón del proyecto): sin él,
          // reenviar la confirmación desde el panel la mandaría en español a un
          // cliente que compró en inglés.
          lineItems:      Array.isArray(lineItems) && lineItems.length
            ? [...lineItems, { _meta: true, locale: locale === "en" ? "en" : "es" }]
            : [{ _meta: true, locale: locale === "en" ? "en" : "es" }],
          status:         "paid",
        },
      });
      const quienes = [
        `${Number(adults) || 1} adulto${(Number(adults) || 1) > 1 ? "s" : ""}`,
        Number(children) ? `${Number(children)} niño${Number(children) > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      actividad(
        "✅  RESERVÓ",
        nombreCorto(tourName),
        quienes,
        saldo > 0 ? `${mxn(cobrado)} de ${mxn(totalAmount)} · saldo ${mxn(saldo)}` : mxn(totalAmount),
        customerName,
        email,
        customerPhone,
        tourDate,
        confirmationNumber,
      );
    } catch (e: any) {
      if (e?.code === "P2002") {
        // Carrera con el webhook: ya existe una reserva para este pago. El @unique
        // impidió el duplicado; reusamos su número real para que el correo coincida.
        const ya = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
        if (ya) confirmationNumber = ya.confirmationNumber;
      } else {
        console.error("❌ prisma.tourBooking.create:", e.message);
      }
    }

    // El cliente pagó: marca su carrito abandonado como convertido para que el
    // cron de recuperación deje de mandarle recordatorios. Misma función que
    // usa el panel de admin, para que la regla no viva en dos sitios.
    await cerrarCarritosDe(email, [{ tourSlug, tourDate }]);

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
          // Con anticipo, el correo muestra "Anticipo pagado" + "Saldo pendiente".
          // Si se pagó todo, deposito == total y sale como "✓ Liquidado".
          depositoPagado: cobrado,
          promoCode,
          promoDiscount: Number(promoDiscount) || 0,
          pickupLugar,
          lineItems:     Array.isArray(lineItems) ? lineItems.filter((l: any) => l && !l._meta) : undefined,
          packageItems:  Array.isArray(packageItems) ? packageItems : undefined,
          locale,
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

        actividad("📧  CORREO ENVIADO", nombreCorto(tourName), email, confirmationNumber);
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
