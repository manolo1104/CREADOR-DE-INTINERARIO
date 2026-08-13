import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { sendBrevoEmail } from "@/lib/brevo";
import { formatTourDate } from "@/lib/tourBooking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/confirm  { folio, montoPagado? }
 * Marca una reserva pendiente como confirmada (el dueño recibió el comprobante)
 * y dispara el correo. Lo usa el comando /confirma del bot.
 *
 * ⚠️ `montoPagado` es LO QUE DE VERDAD LLEGÓ. Antes esto escribía
 * `depositoPagado: totalAmount` siempre, así que confirmar una reserva de la que
 * solo entró el anticipo del 30 % la dejaba registrada como liquidada: el
 * cliente recibía un correo que decía "recibimos tu pago" sin mencionar el
 * saldo, y en el panel no quedaba rastro de lo que faltaba por cobrar.
 *
 * Sin `montoPagado` se asume el ANTICIPO estándar, no el total: si nadie dijo
 * cuánto entró, lo prudente es dar por cobrado lo mínimo, no lo máximo.
 */
const PCT_ANTICIPO = 30;
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

  // Lo que entró: lo que dijo el dueño, o el anticipo estándar si no lo dijo.
  const anticipoEstandar = Math.round((booking.totalAmount * PCT_ANTICIPO) / 100);
  const bruto  = Number(body?.montoPagado);
  const pagado = Number.isFinite(bruto) && bruto > 0
    ? Math.min(Math.round(bruto), booking.totalAmount)
    : (booking.depositoPagado && booking.depositoPagado > 0 ? booking.depositoPagado : anticipoEstandar);
  const saldo     = Math.max(0, booking.totalAmount - pagado);
  const liquidado = saldo === 0;

  if (!yaConfirmada) {
    try {
      await prisma.tourBooking.update({
        where: { confirmationNumber: folio },
        data: { status: "paid", depositoPagado: pagado },
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
          htmlContent: buildConfirmEmail({ ...booking, pagado, saldo, liquidado }),
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
    // Lo que el bot tiene que DECIRLE al cliente. Sin esto, el mensaje solo
    // enseñaba el total y el cliente entendía que ya no debía nada.
    pagado,
    saldo,
    liquidado,
    pctPagado: Math.round((pagado / Math.max(1, booking.totalAmount)) * 100),
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
  pagado: number;
  saldo: number;
  liquidado: boolean;
}): string {
  const fecha = formatTourDate(b.tourDate) || b.tourDate;
  const mx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

  // El saldo va SIEMPRE que exista, y en su propio bloque. Antes el correo
  // decía "recibimos tu pago" y solo enseñaba el total, así que quien había
  // dado el 30 % entendía que ya no debía nada — y se enteraba el día del tour.
  const bloqueSaldo = b.liquidado
    ? `<p style="margin:14px 0;padding:12px 14px;background:#eaf3e5;border:1px solid #b9d6a8;font-size:13px;color:#1f5132;">
         ✓ <strong>Liquidado.</strong> No queda nada por pagar.
       </p>`
    : `<p style="margin:14px 0;padding:12px 14px;background:#fdf6e6;border:1px solid #e2c98a;font-size:13px;color:#5c4a1f;">
         Queda un <strong>saldo de ${mx(b.saldo)}</strong>, que se liquida el día del tour —en efectivo o con tarjeta— al pasar por ti.
       </p>`;

  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a;">
    <h2 style="color:#1f5132;">¡Tu tour está confirmado! 🎉</h2>
    <p>Hola <strong>${b.customerName}</strong>, recibimos tu ${b.liquidado ? "pago" : "anticipo"} y tu lugar está apartado.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#777;">Folio</td><td style="padding:6px 0;text-align:right;"><strong>${b.confirmationNumber}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#777;">Tour</td><td style="padding:6px 0;text-align:right;">${b.tourName}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">Fecha</td><td style="padding:6px 0;text-align:right;">${fecha}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">Personas</td><td style="padding:6px 0;text-align:right;">${b.adults} adulto(s)${b.children ? ` + ${b.children} niño(s)` : ""}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #e3ddc9;color:#777;">Total del viaje</td><td style="padding:8px 0;border-top:1px solid #e3ddc9;text-align:right;">${mx(b.totalAmount)}</td></tr>
      <tr><td style="padding:6px 0;color:#777;">${b.liquidado ? "Pagado" : "Anticipo pagado"}</td><td style="padding:6px 0;text-align:right;color:#3a6b1a;"><strong>${mx(b.pagado)}</strong></td></tr>
      ${b.saldo > 0 ? `<tr><td style="padding:6px 0;color:#777;">Saldo pendiente</td><td style="padding:6px 0;text-align:right;color:#a8631f;"><strong>${mx(b.saldo)}</strong></td></tr>` : ""}
    </table>
    ${bloqueSaldo}
    <p style="font-size:13px;color:#555;">La salida es entre las <strong>8:30 y 9:00 AM</strong>. Te enviaremos el punto de encuentro exacto un día antes. Lleva ropa cómoda, calzado cerrado y protector solar.</p>
    <p style="font-size:13px;color:#555;">¡Nos vemos pronto en la Huasteca Potosina! 🌿</p>
  </div>`;
}
