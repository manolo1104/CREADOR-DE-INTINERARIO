import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { buildCheckinEmailHtml, mensajeCheckinWhatsapp } from "@/lib/checkinEmail";
import { localeDeReserva, telefonoWhatsapp } from "@/lib/reviewRequest";
import { nombreTour } from "@/lib/reviewEmail";
import {
  asegurarEncuesta, correoUtil, estadoDeEncuesta, fechaDelTour, linkCheckin,
} from "@/lib/encuestas/encuesta";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true, confirmationNumber: true, customerName: true, customerEmail: true, customerPhone: true,
  tourName: true, tourSlug: true, tourDate: true, lineItems: true, adults: true, children: true, totalAmount: true,
} as const;

/** El estado del check-in de esta reserva (para la ficha). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const enc = await prisma.encuestaReserva.findUnique({ where: { bookingId: params.id } });
  return NextResponse.json({ estado: estadoDeEncuesta(enc) });
}

/**
 * Manda el check-in desde el panel (21 oct 2026).
 * `{ via: "correo" }` lo envía por correo (aunque ya se hubiera mandado).
 * `{ via: "whatsapp" }` devuelve la liga de wa.me con el mensaje armado; el
 *   navegador la abre y aquí solo se deja la marca, como «Pedir reseña».
 * `{ via: "liga" }` solo devuelve la liga para copiarla; no marca nada.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let via = "";
  try { via = String((await req.json())?.via ?? ""); } catch { /* cuerpo vacío */ }
  if (!["correo", "whatsapp", "liga"].includes(via)) {
    return NextResponse.json({ error: "¿Por dónde lo mando?" }, { status: 400 });
  }

  try {
    const b = await prisma.tourBooking.findUnique({ where: { id: params.id }, select: SELECT });
    if (!b) return NextResponse.json({ error: "No encontré la reserva." }, { status: 404 });

    const enc = await asegurarEncuesta(b.id);
    const link = linkCheckin(enc.token);
    const locale = localeDeReserva(b.lineItems);
    const fecha = fechaDelTour(b);

    if (via === "liga") return NextResponse.json({ link, estado: estadoDeEncuesta(enc) });

    if (via === "correo") {
      if (!correoUtil(b.customerEmail)) {
        return NextResponse.json({ error: "Esta reserva no tiene un correo válido. Mándalo por WhatsApp." }, { status: 400 });
      }
      const { subject, html } = buildCheckinEmailHtml({
        customerName: b.customerName, tourName: b.tourName, tourSlug: b.tourSlug, fecha, link, locale,
      });
      await sendBrevoEmail({ to: [{ email: b.customerEmail, name: b.customerName }], subject, htmlContent: html });
      const nueva = await prisma.encuestaReserva.update({
        where: { id: enc.id },
        // Si ya salió por WhatsApp, se queda esa fecha y se anota el correo.
        data:  { checkinEnviadoEn: enc.checkinEnviadoEn ?? new Date(), checkinEnviadoPor: enc.checkinEnviadoPor?.includes("whatsapp") ? "correo+whatsapp" : "correo" },
      });
      await registrarEnBitacora({
        accion: "envió", entidad: "reserva", referencia: b.confirmationNumber,
        resumen: `Mandó el check-in por correo a ${b.customerName} (${b.confirmationNumber})`,
      });
      return NextResponse.json({ ok: true, link, estado: estadoDeEncuesta(nueva) });
    }

    // WhatsApp
    const tel = telefonoWhatsapp(b.customerPhone);
    if (!tel) {
      return NextResponse.json({ error: "Esta reserva no tiene un WhatsApp válido. Copia la liga y mándala tú.", link }, { status: 400 });
    }
    const tour = nombreTour(b.tourName, b.tourSlug, locale).split("—")[0].trim();
    const waUrl = `https://wa.me/${tel}?text=${encodeURIComponent(mensajeCheckinWhatsapp(b.customerName, tour, fecha, link, locale))}`;
    const nueva = await prisma.encuestaReserva.update({
      where: { id: enc.id },
      // Si ya salió por correo, se queda la fecha del correo y se anota el WhatsApp.
      data:  { checkinEnviadoEn: enc.checkinEnviadoEn ?? new Date(), checkinEnviadoPor: enc.checkinEnviadoPor?.includes("correo") ? "correo+whatsapp" : "whatsapp" },
    });
    await registrarEnBitacora({
      accion: "envió", entidad: "reserva", referencia: b.confirmationNumber,
      resumen: `Mandó el check-in por WhatsApp a ${b.customerName} (${b.confirmationNumber})`,
    });
    return NextResponse.json({ ok: true, link, waUrl, estado: estadoDeEncuesta(nueva) });
  } catch (e: unknown) {
    console.error("admin/reservas checkin:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo mandar el check-in." }, { status: 500 });
  }
}
