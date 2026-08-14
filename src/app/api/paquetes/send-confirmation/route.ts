import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { getPaquete } from "@/lib/paquetes";
import { actividad, mxn } from "@/lib/logger";
import { getEmails, emailLocale } from "@/lib/i18n/emails";
import { localizePaquete } from "@/lib/i18n/paquetes.en";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "paquete-send-confirmation", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email, customerName, customerPhone, notes, paymentIntentId, slug, pct, personas, fecha, locale } = body;
    const L = emailLocale(locale);
    const T = getEmails(L).paquete;

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
      return NextResponse.json({ error: "El pago no está completado." }, { status: 402 });
    }

    const paquete = getPaquete(slug) || (pi.metadata?.tourSlug ? getPaquete(pi.metadata.tourSlug) : undefined);
    if (!paquete) {
      return NextResponse.json({ error: "Paquete no encontrado." }, { status: 400 });
    }

    // Montos AUTORITATIVOS: total = precio completo del paquete; cobrado = lo que confirmó Stripe.
    const cobrado    = Math.round((pi.amount_received || pi.amount) / 100);
    const totalFull  = paquete.precio;
    const pendiente  = Math.max(0, totalFull - cobrado);
    const pctNum     = Number(pct) || Number(pi.metadata?.paquetePct) || Math.round(cobrado / totalFull * 100);

    // Idempotencia
    const existing = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
    if (existing) {
      return NextResponse.json({ status: "ok", confirmationNumber: existing.confirmationNumber });
    }

    let confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();
    const notesFull = [
      `Paquete: ${paquete.nombre} (${paquete.duracion})`,
      personas ? `Personas: ${personas}` : null,
      `Pago inicial: ${pctNum}% (${fmx(cobrado)})`,
      pendiente > 0 ? `Saldo pendiente: ${fmx(pendiente)}` : "Pagado 100%",
      notes ? `Notas: ${notes}` : null,
    ].filter(Boolean).join(" | ");

    try {
      await prisma.tourBooking.create({
        data: {
          confirmationNumber,
          tourId:                paquete.slug,
          tourName:              `Paquete · ${paquete.nombre}`,
          tourSlug:              paquete.slug,
          tourDate:              fecha || "",
          adults:                Number(personas) || 2,
          children:              0,
          totalAmount:           totalFull,   // precio completo del paquete
          depositoPagado:        cobrado,     // lo cobrado ahora (10/50/100%)
          stripePaymentIntentId: paymentIntentId,
          customerName,
          customerEmail:         email,
          customerPhone:         customerPhone || null,
          notes:                 notesFull,
          status:                "paid",
        },
      });
      const anticipo = pctNum === 100 ? "pago completo" : `anticipo ${pctNum}%`;
      actividad(
        "✅  RESERVÓ PAQUETE",
        paquete.nombre,
        personas ? `${personas} personas` : "",
        anticipo,
        `${mxn(cobrado)} de ${mxn(totalFull)}`,
        pendiente > 0 ? `saldo ${mxn(pendiente)}` : "liquidado",
        customerName,
        email,
        customerPhone,
        fecha,
        confirmationNumber,
      );
    } catch (e: any) {
      if (e?.code === "P2002") {
        // Carrera con el webhook: ya existe la reserva de este pago. Reusamos su
        // número real; el @unique impidió el duplicado.
        const ya = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
        if (ya) confirmationNumber = ya.confirmationNumber;
      } else {
        console.error("❌ prisma paquete booking:", e.message);
      }
    }

    if (email?.includes("@")) {
      try {
        const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
        const paqueteLoc = localizePaquete(paquete, L);
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a2e1a">
            <h2 style="color:#1a2e1a">${T.titulo}</h2>
            <p>${T.saludo(customerName || "")}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#666">${T.confirmacion}</td><td style="text-align:right;font-weight:bold">${confirmationNumber}</td></tr>
              <tr><td style="padding:6px 0;color:#666">${T.paquete}</td><td style="text-align:right">${paqueteLoc.nombre} · ${paqueteLoc.duracion}</td></tr>
              ${fecha ? `<tr><td style="padding:6px 0;color:#666">${T.fechaTentativa}</td><td style="text-align:right">${fecha}</td></tr>` : ""}
              ${personas ? `<tr><td style="padding:6px 0;color:#666">${T.personas}</td><td style="text-align:right">${personas}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#666">${T.precio}</td><td style="text-align:right">${fmx(totalFull)}</td></tr>
              <tr><td style="padding:6px 0;color:#666">${T.pagoInicial(pctNum)}</td><td style="text-align:right;color:#3a6b1a;font-weight:bold">${fmx(cobrado)}</td></tr>
              ${pendiente > 0 ? `<tr><td style="padding:6px 0;color:#666">${T.saldoPendiente}</td><td style="text-align:right;color:#9a4a1e">${fmx(pendiente)}</td></tr>` : ""}
            </table>
            <p style="font-size:13px;color:#666">${pendiente > 0 ? T.notaSaldo : T.notaLiquidado}</p>
            <p style="font-size:13px">${T.dudas}</p>
          </div>`;
        await sendBrevoEmail({
          to:  [{ email, name: customerName }],
          bcc: [{ email: adminTo }],
          subject: T.subject(confirmationNumber),
          htmlContent: html,
        });
        actividad("📧  CORREO PAQUETE ENVIADO", paquete.nombre, email, confirmationNumber);
      } catch (e: any) {
        console.error("❌ Brevo paquete email:", e.message);
      }
    }

    return NextResponse.json({ status: "ok", confirmationNumber, cobrado, totalFull, pendiente });
  } catch (e: any) {
    console.error("❌ send-confirmation paquete crítico:", e.message);
    return NextResponse.json({ error: "No se pudo procesar la confirmación." }, { status: 500 });
  }
}
