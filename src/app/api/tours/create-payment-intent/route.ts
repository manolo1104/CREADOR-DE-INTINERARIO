import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { computeTourCharge, computeVehiculoCharge, vehiculoBookingName, fechaTourValida } from "@/lib/tourPricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn, nombreCorto } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "create-payment-intent", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { customerEmail, customerName, tourDetails } = await req.json();

    // La fecha nunca se validaba en el servidor: se podía cobrar una reserva
    // para ayer o para dentro de dos años tocando el sessionStorage.
    if (!fechaTourValida(tourDetails?.tourDate)) {
      logger.warn("payment_intent_fecha_invalida", { tourDate: tourDetails?.tourDate, tourSlug: tourDetails?.tourSlug });
      return NextResponse.json(
        { error: "La fecha del tour no es válida. Elige otra fecha." },
        { status: 400 },
      );
    }

    // ── Tours cobrados POR VEHÍCULO (RZR): precio desde la matriz flota×ruta ──
    if (tourDetails?.ruta && tourDetails?.vehiculo) {
      const veh = computeVehiculoCharge({
        tourId:   tourDetails?.tourId,
        tourSlug: tourDetails?.tourSlug,
        ruta:     tourDetails?.ruta,
        vehiculo: tourDetails?.vehiculo,
        unidades: tourDetails?.unidades,
        pct:      tourDetails?.pct,
      });
      if (!veh) {
        logger.warn("payment_intent_vehiculo_invalid", { tourSlug: tourDetails?.tourSlug, ruta: tourDetails?.ruta, vehiculo: tourDetails?.vehiculo });
        return NextResponse.json({ error: "Ruta o vehículo inválido." }, { status: 400 });
      }
      const bookingName = vehiculoBookingName(veh.tour, veh.ruta.nombre, veh.vehiculo.nombre, veh.unidades);
      const paymentIntent = await stripe.paymentIntents.create({
        amount:        Math.round(veh.charge * 100),
        currency:      "mxn",
        description:   `Tour Huasteca Potosina — ${bookingName} · ${customerName || ""}`,
        receipt_email: customerEmail || undefined,
        // Solo métodos que se resuelven sin salir de la página. Si algún día se
        // habilita OXXO o SPEI en el panel de Stripe, el checkout embebido los
        // ofrecería y fallaría al pedir redirección: esto lo impide.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: {
          customerEmail: customerEmail || "",
          customerName:  customerName  || "",
          tourId:        veh.tour.id,
          tourName:      bookingName,
          tourSlug:      veh.tour.slug,
          tourDate:      tourDetails?.tourDate || "",
          adults:        String(tourDetails?.adults || veh.unidades),
          children:      "0",
          ruta:          veh.ruta.nombre,
          vehiculo:      veh.vehiculo.nombre,
          unidades:      String(veh.unidades),
          totalCompleto: String(veh.total),
          pctPagado:     String(veh.pct),
          saldo:         String(veh.saldo),
          source:        "huasteca-potosina.com",
        },
      });
      actividad(
        "💳  ABRIÓ EL PAGO (RZR)",
        bookingName,
        veh.pct === 100 ? mxn(veh.charge) : `${mxn(veh.charge)} (anticipo ${veh.pct}% de ${mxn(veh.total)})`,
        customerName,
        customerEmail,
        tourDetails?.tourDate,
        paymentIntent.id,
      );
      return NextResponse.json({
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount:          veh.charge,
        total:           veh.total,
        saldo:           veh.saldo,
        pct:             veh.pct,
      });
    }

    // El monto es AUTORITATIVO desde el servidor: se ignora cualquier amount del cliente.
    const charge = computeTourCharge({
      tourId:        tourDetails?.tourId,
      tourSlug:      tourDetails?.tourSlug,
      adults:        tourDetails?.adults,
      childrenMid:   tourDetails?.childrenMid,
      childrenSmall: tourDetails?.childrenSmall,
      promoCode:     tourDetails?.promoCode,
      pct:           tourDetails?.pct,
    });

    if (!charge) {
      logger.warn("payment_intent_invalid", { tourId: tourDetails?.tourId, tourSlug: tourDetails?.tourSlug });
      return NextResponse.json({ error: "Tour o número de participantes inválido." }, { status: 400 });
    }

    const childrenTotal =
      (Number(tourDetails?.childrenMid) || 0) + (Number(tourDetails?.childrenSmall) || 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(charge.charge * 100), // MXN → centavos (calculado en el servidor)
      currency:      "mxn",
      description:   `Tour Huasteca Potosina — ${charge.tour.nombre} · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      // Solo métodos que se resuelven sin salir de la página (ver nota arriba).
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        tourId:        charge.tour.id,
        tourName:      charge.tour.nombre,
        tourSlug:      charge.tour.slug,
        tourDate:      tourDetails?.tourDate || "",
        adults:        String(tourDetails?.adults || 1),
        children:      String(childrenTotal),
        totalCompleto: String(charge.total),
        pctPagado:     String(charge.pct),
        saldo:         String(charge.saldo),
        source:        "huasteca-potosina.com",
      },
    });

    const quienes = [
      `${Number(tourDetails?.adults || 1)} adulto${Number(tourDetails?.adults || 1) > 1 ? "s" : ""}`,
      childrenTotal ? `${childrenTotal} niño${childrenTotal > 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    // OJO: esto se dispara al ABRIR /checkout, no al pagar. El PaymentIntent se
    // crea cuando la página monta, así que este log mide "llegó al formulario",
    // no "intentó cobrar". El cobro real se ve en ✅ RESERVÓ / ❌ PAGO FALLIDO.
    actividad(
      "💳  ABRIÓ EL PAGO",
      nombreCorto(charge.tour.nombre),
      quienes,
      charge.pct === 100 ? mxn(charge.charge) : `${mxn(charge.charge)} (anticipo ${charge.pct}% de ${mxn(charge.total)})`,
      customerName,
      customerEmail,
      tourDetails?.tourDate,
      paymentIntent.id,
    );

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount:          charge.charge, // monto real cobrado (para que la UI lo refleje)
      total:           charge.total,
      saldo:           charge.saldo,
      pct:             charge.pct,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    logger.error("create_payment_intent_error", { reason: msg });
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
