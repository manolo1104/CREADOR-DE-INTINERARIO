import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { TOURS_DB } from "@/lib/tours";
import { calcTourTotal, validatePromoCode, minBookingDate } from "@/lib/tourBooking";
import { DATOS_BANCO } from "@/lib/bot/bankData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/quote
 * Crea una reserva "pendiente de pago" (TourBooking status="pending") con folio,
 * para el flujo de cotización + transferencia del bot de WhatsApp.
 *
 * El PRECIO lo calcula el servidor desde TOURS_DB (fuente de verdad). El bot
 * nunca decide el monto — solo manda slug, personas y datos del cliente.
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

  const {
    tourSlug,
    tourDate,
    adults,
    childrenMid = 0,
    childrenSmall = 0,
    customerName,
    customerPhone,
    customerEmail,
    promoCode,
    notes,
  } = body ?? {};

  // ── Validaciones ───────────────────────────────────────────────
  const tour = TOURS_DB.find((t) => t.slug === tourSlug);
  if (!tour) {
    return NextResponse.json({ error: `Tour no encontrado: ${tourSlug}` }, { status: 400 });
  }
  if (tour.precioUnidad === "vehiculo") {
    return NextResponse.json(
      { error: "Este tour se cobra por vehículo (según ruta y unidad) y se cotiza por WhatsApp, no por persona." },
      { status: 400 }
    );
  }

  const nAdults = Math.max(0, parseInt(String(adults), 10) || 0);
  const nMid    = Math.max(0, parseInt(String(childrenMid), 10) || 0);
  const nSmall  = Math.max(0, parseInt(String(childrenSmall), 10) || 0);
  const totalPersonas = nAdults + nMid + nSmall;

  if (nAdults < 1) {
    return NextResponse.json({ error: "Se requiere al menos 1 adulto." }, { status: 400 });
  }
  if (totalPersonas < tour.groupMin) {
    return NextResponse.json(
      { error: `Este tour requiere mínimo ${tour.groupMin} personas.` },
      { status: 400 }
    );
  }
  if (!customerName || String(customerName).trim().length < 2) {
    return NextResponse.json({ error: "Falta el nombre del cliente." }, { status: 400 });
  }
  if (!tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(tourDate))) {
    return NextResponse.json({ error: "Fecha inválida (formato YYYY-MM-DD)." }, { status: 400 });
  }
  if (String(tourDate) < minBookingDate()) {
    return NextResponse.json(
      { error: "La fecha debe ser a partir de mañana." },
      { status: 400 }
    );
  }

  // ── Promo + precio (servidor) ──────────────────────────────────
  let promoDiscount = 0;
  let promoApplied: string | null = null;
  if (promoCode) {
    const v = validatePromoCode(String(promoCode));
    if (v.valid) {
      promoDiscount = v.discount;
      promoApplied = String(promoCode).trim().toUpperCase();
    }
  }

  const { total, subtotal } = calcTourTotal(tour.precio, nAdults, nMid, nSmall, promoDiscount);

  // ── Folio + persistencia ───────────────────────────────────────
  const folio = "HP" + Date.now().toString(36).toUpperCase();
  const appUrl = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");

  try {
    await prisma.tourBooking.create({
      data: {
        confirmationNumber: folio,
        tourId:   tour.id,
        tourName: tour.nombre,
        tourSlug: tour.slug,
        tourDate: String(tourDate),
        adults:   nAdults,
        children: nMid + nSmall,
        totalAmount:   total,
        depositoPagado: 0,
        promoCode:     promoApplied,
        promoDiscount,
        customerName:  String(customerName).trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : "",
        customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, "") : null,
        notes:         notes ? String(notes) : null,
        lineItems: [
          {
            tourSlug: tour.slug,
            tourName: tour.nombre,
            tourDate: String(tourDate),
            adults: nAdults,
            childrenMid: nMid,
            childrenSmall: nSmall,
            subtotal,
          },
        ],
        status: "pending",
      },
    });
  } catch (e: any) {
    console.error("❌ bot/quote prisma:", e?.message);
    return NextResponse.json({ error: "No se pudo crear la cotización." }, { status: 500 });
  }

  return NextResponse.json({
    folio,
    total,
    moneda: "MXN",
    personas: totalPersonas,
    tourName: tour.nombre,
    tourDate,
    datosBanco: DATOS_BANCO,
    linkPago: `${appUrl}/reservar-tour/${tour.slug}`,
  });
}
