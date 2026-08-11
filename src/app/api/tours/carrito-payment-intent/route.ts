import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  computeTourCharge,
  computeVehiculoCharge,
  vehiculoBookingName,
  fechaTourValida,
} from "@/lib/tourPricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn } from "@/lib/logger";
import { trackServerEvent } from "@/lib/serverTrack";
import { MAX_ITEMS, ANTICIPO_PCT } from "@/lib/carrito";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cobra VARIOS recorridos en un solo pago.
 *
 * Regla que no se rompe: el importe es autoritativo del servidor. Lo que manda
 * el cliente son referencias (qué tour, qué día, cuánta gente) y nada más; cada
 * renglón se vuelve a tarifar aquí con las mismas funciones que usa el checkout
 * de un solo tour. El `total` que viaja en el localStorage jamás se cobra.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "carrito-payment-intent", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { customerEmail, customerName, items, sid } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_ITEMS} recorridos por reserva. Para grupos grandes escríbenos por WhatsApp.` },
        { status: 400 },
      );
    }

    // ── Tarificación renglón por renglón, siempre en el servidor ──────────
    const lineItems: {
      tourId: string; tourSlug: string; tourName: string; tourDate: string;
      adults: number; children: number; subtotal: number;
      ruta?: string; vehiculo?: string; unidades?: number;
    }[] = [];
    let total = 0;

    for (const raw of items) {
      if (!fechaTourValida(raw?.tourDate)) {
        return NextResponse.json(
          { error: "Una de las fechas no es válida. Revisa tu carrito." },
          { status: 400 },
        );
      }

      // Tours por vehículo (RZR, café): el precio sale de la matriz ruta×unidad.
      if (raw?.ruta && raw?.vehiculo) {
        // `pct: 100` porque aquí se pide el PRECIO COMPLETO del renglón; el
        // anticipo se aplica una sola vez sobre la suma, al final.
        const veh = computeVehiculoCharge({
          tourId:   raw?.tourId,
          tourSlug: raw?.tourSlug,
          ruta:     raw?.ruta,
          vehiculo: raw?.vehiculo,
          unidades: raw?.unidades,
          pct:      100,
        });
        if (!veh) {
          return NextResponse.json({ error: "Ruta o vehículo inválido en el carrito." }, { status: 400 });
        }
        lineItems.push({
          tourId:   veh.tour.id,
          tourSlug: veh.tour.slug,
          tourName: vehiculoBookingName(veh.tour, veh.ruta.nombre, veh.vehiculo.nombre, veh.unidades),
          tourDate: raw.tourDate,
          adults:   veh.unidades,
          children: 0,
          ruta:     veh.ruta.nombre,
          vehiculo: veh.vehiculo.nombre,
          unidades: veh.unidades,
          subtotal: veh.total,
        });
        total += veh.total;
        continue;
      }

      const charge = computeTourCharge({
        tourId:        raw?.tourId,
        tourSlug:      raw?.tourSlug,
        adults:        raw?.adults,
        childrenMid:   raw?.childrenMid,
        childrenSmall: raw?.childrenSmall,
        promoCode:     raw?.promoCode,
        pct:           100,
      });
      if (!charge) {
        return NextResponse.json(
          { error: "Uno de los recorridos del carrito ya no está disponible con esos datos." },
          { status: 400 },
        );
      }
      const children = (Number(raw?.childrenMid) || 0) + (Number(raw?.childrenSmall) || 0);
      lineItems.push({
        tourId:   charge.tour.id,
        tourSlug: charge.tour.slug,
        tourName: charge.tour.nombre,
        tourDate: raw.tourDate,
        adults:   Number(raw?.adults) || 1,
        children,
        subtotal: charge.total,
      });
      total += charge.total;
    }

    const cobrar = Math.round((total * ANTICIPO_PCT) / 100);
    const saldo  = total - cobrar;

    if (cobrar < 10) {
      return NextResponse.json({ error: "El importe del carrito no es válido." }, { status: 400 });
    }

    const dias = new Set(lineItems.map((l) => l.tourDate)).size;
    const resumenNombre = `${lineItems.length} recorridos · ${dias} ${dias === 1 ? "día" : "días"}`;

    // La metadata de Stripe admite 500 caracteres por valor, así que los
    // renglones van compactos (slug|fecha|adultos|niños|subtotal). Es lo que
    // lee el webhook si el cliente cierra la pestaña antes de confirmar.
    const compacto = lineItems
      .map((l) => `${l.tourSlug}|${l.tourDate}|${l.adults}|${l.children}|${l.subtotal}`)
      .join(";")
      .slice(0, 480);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(cobrar * 100),
      currency:      "mxn",
      description:   `Tours Huasteca Potosina — ${resumenNombre} · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      // Igual que en el checkout de un tour: solo métodos que se resuelven sin
      // salir de la página, para que el pago embebido no pida redirección.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        carrito:       "1",
        tourId:        lineItems[0].tourId,
        tourName:      resumenNombre,
        tourSlug:      lineItems[0].tourSlug,
        tourDate:      lineItems[0].tourDate,
        adults:        String(lineItems.reduce((s, l) => s + l.adults, 0)),
        children:      String(lineItems.reduce((s, l) => s + l.children, 0)),
        items:         compacto,
        totalCompleto: String(total),
        pctPagado:     String(ANTICIPO_PCT),
        saldo:         String(saldo),
        source:        "huasteca-potosina.com",
      },
    });

    await trackServerEvent("PAYMENT_INITIATED", {
      sid,
      tourSlug: lineItems[0].tourSlug,
      amount:   cobrar,
      data: { carrito: true, recorridos: lineItems.length, total, paymentIntentId: paymentIntent.id },
    });

    actividad(
      "🛒 CARRITO EN PAGO",
      resumenNombre,
      `${mxn(cobrar)} de ${mxn(total)}`,
      customerName,
      customerEmail,
      lineItems[0].tourDate,
      paymentIntent.id,
    );

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount:          cobrar,
      total,
      saldo,
      pct:             ANTICIPO_PCT,
      lineItems,
    });
  } catch (err) {
    const e = err as Error;
    logger.error("carrito_payment_intent_error", { message: e.message });
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 500 });
  }
}
