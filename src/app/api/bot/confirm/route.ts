import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { sendBrevoEmail } from "@/lib/brevo";
import { formatTourDate } from "@/lib/tourBooking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/confirm  { folio }
 * Marca una reserva pendiente como "paid" (el dueño recibió el comprobante)
 * y dispara el correo de confirmación. Lo usa el comando /confirma del bot.
 */
export async function POST(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const folio = String(body?.folio || "").trim().toUpperCase();
  if (!folio) {
    return NextResponse.json({ error: "Falta el folio." }, { status: 400 });
  }

  const booking = await prisma.tourBooking.findUnique({
    where: { confirmationNumber: folio },
  });

  if (!booking) {
    return NextResponse.json({ error: `No existe la reserva ${folio}.` }, { status: 404 });
  }

  const yaConfirmada = booking.status === "paid";

  if (!yaConfirmada) {
    try {
      await prisma.tourBooking.update({
        where: { confirmationNumber: folio },
        data: { status: "paid", depositoPagado: booking.totalAmount },
      });
    } catch (e: any) {
      console.error("❌ bot/confirm update:", e?.message);
      return NextResponse.json({ error: "No se pudo confirmar." }, { status: 500 });
    }

    // Correo de confirmación (best-effort; no bloquea la respuesta)
    if (booking.customerEmail && booking.customerEmail.includes("@")) {
      try {
        await sendBrevoEmail({
          to: [{ email: booking.customerEmail, name: booking.customerName }],
          bcc: process.env.ADMIN_EMAIL_TOURS ? [{ email: process.env.ADMIN_EMAIL_TOURS }] : undefined,
          subject: `Tu tour está confirmado — ${folio}`,
          htmlContent: buildConfirmEmail(booking),
        });
      } catch (e: any) {
        console.error("⚠️ bot/confirm Brevo:", e?.message);
      }
    }
  }

  return NextResponse.json({
    folio,
    yaConfirmada,
    status: "paid",
    tourName: booking.tourName,
    tourSlug: booking.tourSlug,
    tourDate: booking.tourDate,
    adults: booking.adults,
    children: booking.children,
    totalAmount: booking.totalAmount,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
  });
}

function buildConfirmEmail(b: {
  customerName: string;
  confirmationNumber: string;
  tourName: string;
  tourDate: string;
  adults: number;
  children: number;
  totalAmount: number;
}): string {
  const fecha = formatTourDate(b.tourDate) || b.tourDate;
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a;">
    <h2 style="color:#1f5132;">¡Tu tour está confirmado! 🎉</h2>
    <p>Hola <strong>${b.customerName}</strong>, recibimos tu pago y tu lugar está apartado.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#777;">Folio</td><td style="padding:6px 0;text-align:right;"><strong>${b.confirmationNumber}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#777;">Tour</td><td style="padding:6px 0;text-align:right;">${b.tourName}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">Fecha</td><td style="padding:6px 0;text-align:right;">${fecha}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">Personas</td><td style="padding:6px 0;text-align:right;">${b.adults} adulto(s)${b.children ? ` + ${b.children} niño(s)` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">Total</td><td style="padding:6px 0;text-align:right;"><strong>$${b.totalAmount.toLocaleString("es-MX")} MXN</strong></td></tr>
    </table>
    <p style="font-size:13px;color:#555;">La salida es entre las <strong>8:30 y 9:00 AM</strong>. Te enviaremos el punto de encuentro exacto un día antes. Lleva ropa cómoda, calzado cerrado y protector solar.</p>
    <p style="font-size:13px;color:#555;">¡Nos vemos pronto en la Huasteca Potosina! 🌿</p>
  </div>`;
}
