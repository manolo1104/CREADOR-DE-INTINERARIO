import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkRecuperacion } from "@/lib/recuperacion";
import { computeTourCharge, fechaTourValida } from "@/lib/tourPricing";
import { tarifarRecorridos } from "@/lib/tourPricing";
import { rateLimit } from "@/lib/rateLimit";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCartEmailHtml } from "@/lib/cartEmail";
import { actividad, mxn, nombreCorto } from "@/lib/logger";
import { ESTADOS_VIVOS } from "@/lib/cartFollowUp";

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
      // Carrito completo. Cuando viene, manda sobre los campos sueltos de
      // arriba: es el camino del carrito de varios recorridos.
      items,
    } = body;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }
    // ── Carrito de VARIOS recorridos ─────────────────────────────────────
    // Hasta ahora este endpoint solo sabía guardar UN tour, así que el carrito
    // —el flujo de más ticket— no capturaba ningún correo: quien se iba sin
    // pagar se perdía para siempre.
    const esCarrito = Array.isArray(items) && items.length > 0;
    if (esCarrito) {
      return await guardarCarritoCompleto(items, String(email).trim(), phone);
    }

    if (!tourDate) {
      return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
    }
    // Sin esto se guardaban cotizaciones con fechas imposibles y el cron
    // perseguía durante días a alguien con un tour ya pasado.
    if (!fechaTourValida(tourDate)) {
      return NextResponse.json({ error: "La fecha del tour no es válida." }, { status: 400 });
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

    // Dedup: si ya hay un carrito VIVO para el mismo correo+tour+fecha, se
    // actualiza (sin reenviar la cotización); si no, se crea y se envía.
    // Incluye "recovered": si solo mirara "open", un cliente con un carrito
    // atrapado en ese estado generaría un duplicado en vez de actualizarlo.
    const existente = await prisma.abandonedCart.findFirst({
      where: {
        customerEmail: datos.customerEmail,
        tourSlug:      datos.tourSlug,
        tourDate:      datos.tourDate,
        status:        { in: [...ESTADOS_VIVOS] },
      },
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

    const restoreUrl = linkRecuperacion(APP_URL, datos.tourId, datos.tourSlug, token);

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

/**
 * Guarda un carrito de varios recorridos y manda su cotización.
 *
 * Las columnas planas de `AbandonedCart` se llenan con el PRIMER recorrido
 * fechado: son el ancla del cron de recuperación y del correo, que siguen
 * funcionando igual. El carrito entero va en `carritoJson`.
 *
 * ⚠️ Se exige al menos un recorrido con fecha. El cron marca vencido todo lo
 * que tenga `tourDate` anterior a hoy, y una cadena vacía es "menor" que
 * cualquier fecha: un carrito sin fechas nacería expirado y no recibiría ni un
 * recordatorio.
 */
async function guardarCarritoCompleto(items: unknown[], email: string, phone: unknown) {
  const tarifa = tarifarRecorridos(items);
  if (!tarifa.ok) {
    return NextResponse.json({ error: tarifa.error }, { status: 400 });
  }

  const conFecha = tarifa.lineItems.filter((l) => l.tourDate);
  if (conFecha.length === 0) {
    return NextResponse.json(
      { error: "Ponle fecha al menos a un recorrido para poder guardártelo." },
      { status: 400 },
    );
  }
  const ancla = [...conFecha].sort((a, b) => a.tourDate.localeCompare(b.tourDate))[0];

  const datos = {
    tourId:        ancla.tourId,
    tourSlug:      ancla.tourSlug,
    tourName:      tarifa.lineItems.length > 1
      ? `${ancla.tourName} y ${tarifa.lineItems.length - 1} recorrido${tarifa.lineItems.length > 2 ? "s" : ""} más`
      : ancla.tourName,
    tourDate:      ancla.tourDate,
    adults:        tarifa.lineItems.reduce((s, l) => s + l.adults, 0),
    childrenMid:   tarifa.lineItems.reduce((s, l) => s + l.children, 0),
    childrenSmall: 0,
    promoCode:     null,
    promoDiscount: 0,
    total:         tarifa.total,
    customerEmail: email,
    customerPhone: phone ? String(phone).trim() : null,
    carritoJson:   JSON.stringify(items),
  };

  const existente = await prisma.abandonedCart.findFirst({
    where: {
      customerEmail: datos.customerEmail,
      tourSlug:      datos.tourSlug,
      tourDate:      datos.tourDate,
      status:        { in: [...ESTADOS_VIVOS] },
    },
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

  const restoreUrl = linkRecuperacion(APP_URL, datos.tourId, datos.tourSlug, token);

  if (esNuevo) {
    try {
      const { subject, html } = buildCartEmailHtml({
        tipo: "cotizacion",
        tourName: datos.tourName,
        tourDate: datos.tourDate,
        adults: datos.adults,
        children: datos.childrenMid,
        total: datos.total,
        restoreUrl,
      });
      await sendBrevoEmail({ to: [{ email: datos.customerEmail }], subject, htmlContent: html });
    } catch {
      // Si el correo falla, el carrito igual queda guardado para el cron.
    }
  }

  actividad(
    "🛟  COTIZACIÓN GUARDADA",
    `${tarifa.lineItems.length} recorrido(s)`,
    mxn(datos.total),
    datos.customerEmail,
    datos.tourDate,
    esNuevo ? "nueva" : "actualizada",
  );

  return NextResponse.json({ ok: true });
}
