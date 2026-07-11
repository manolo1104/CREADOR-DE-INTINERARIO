import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTourCharge } from "@/lib/tourPricing";
import { rateLimit } from "@/lib/rateLimit";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCartEmailHtml } from "@/lib/cartEmail";
import { actividad, mxn, nombreCorto } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = process.env.APP_URL ?? "https://www.huasteca-potosina.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/tours/guardar-carrito
// Guarda un carrito abandonado (el cliente eligió tour/fecha y dejó su correo,
// pero aún no paga) y le envía su cotización con un link para retomar la reserva.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "guardar-carrito", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      tourSlug, tourId, tourDate,
      adults, childrenMid, childrenSmall,
      promoCode, email, phone,
    } = body;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }
    if (!tourDate) {
      return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
    }

    // Total AUTORITATIVO del servidor (mismo cálculo que el cobro). Rechaza tours
    // por vehículo (RZR) y participantes inválidos.
    const charge = computeTourCharge({
      tourId, tourSlug,
      adults: Number(adults) || 1,
      childrenMid: Number(childrenMid) || 0,
      childrenSmall: Number(childrenSmall) || 0,
      promoCode,
    });
    if (!charge) {
      return NextResponse.json({ error: "Tour o participantes inválidos." }, { status: 400 });
    }

    const datos = {
      tourId:        charge.tour.id,
      tourSlug:      charge.tour.slug,
      tourName:      charge.tour.nombre,
      tourDate:      String(tourDate),
      adults:        Number(adults) || 1,
      childrenMid:   Number(childrenMid) || 0,
      childrenSmall: Number(childrenSmall) || 0,
      promoCode:     promoCode || null,
      promoDiscount: charge.promoDiscount,
      total:         charge.total,
      customerEmail: String(email).trim(),
      customerPhone: phone ? String(phone).trim() : null,
    };

    // Dedup: si ya hay un carrito ABIERTO para el mismo correo+tour+fecha, se
    // actualiza (sin reenviar la cotización); si no, se crea y se envía.
    const existente = await prisma.abandonedCart.findFirst({
      where: { customerEmail: datos.customerEmail, tourSlug: datos.tourSlug, tourDate: datos.tourDate, status: "open" },
    });

    let token: string;
    let esNuevo = false;
    if (existente) {
      await prisma.abandonedCart.update({ where: { id: existente.id }, data: datos });
      token = existente.token;
    } else {
      const creado = await prisma.abandonedCart.create({ data: datos });
      token = creado.token;
      esNuevo = true;
    }

    const restoreUrl = `${APP_URL}/reservar-tour/${datos.tourSlug}?recuperar=${token}`;

    // La cotización inmediata solo se envía al CREAR (no en cada actualización).
    if (esNuevo) {
      try {
        const { subject, html } = buildCartEmailHtml({
          tipo: "cotizacion",
          tourName: datos.tourName,
          tourDate: datos.tourDate,
          adults: datos.adults,
          children: datos.childrenMid + datos.childrenSmall,
          total: datos.total,
          restoreUrl,
        });
        await sendBrevoEmail({
          to: [{ email: datos.customerEmail }],
          subject,
          htmlContent: html,
        });
      } catch {
        // Si el correo falla, el carrito igual queda guardado para el cron de recuperación.
      }
    }

    actividad(
      "🛟  COTIZACIÓN GUARDADA",
      nombreCorto(datos.tourName),
      mxn(datos.total),
      datos.customerEmail,
      datos.tourDate,
      esNuevo ? "nueva" : "actualizada",
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
