import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPaquete } from "@/lib/paquetes";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Porcentajes de pago permitidos para paquetes (el cliente elige).
const PCTS = new Set([10, 50, 100]);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "paquete-payment-intent", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { customerEmail, customerName, paqueteDetails } = await req.json();

    const paquete = getPaquete(paqueteDetails?.slug);
    if (!paquete) {
      return NextResponse.json({ error: "Paquete inválido." }, { status: 400 });
    }

    // El monto es AUTORITATIVO desde el servidor. Antes era
    // `paquete.precio × pct` a secas: el precio publicado es POR PAREJA, así que
    // un grupo de cinco pagaba exactamente lo mismo que uno de dos. Ahora
    // `computePaqueteCharge` suma el hotel que de verdad se ocupa y los boletos
    // de tour de cada persona extra.
    const pct = Number(paqueteDetails?.pct);
    if (!PCTS.has(pct)) {
      return NextResponse.json({ error: "Porcentaje de pago inválido." }, { status: 400 });
    }

    const cobro = computePaqueteCharge({
      slug:          paqueteDetails?.slug,
      personas:      paqueteDetails?.personas,
      childrenMid:   paqueteDetails?.childrenMid,
      childrenSmall: paqueteDetails?.childrenSmall,
      vistaMontana:  paqueteDetails?.vistaMontana,
      pct,
    });
    if (!cobro) {
      return NextResponse.json(
        { error: `Número de personas inválido. Para grupos de más de ${MAX_PERSONAS_PAQUETE} escríbenos por WhatsApp y lo cotizamos.` },
        { status: 400 },
      );
    }
    const charge = cobro.charge;
    if (charge <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    const personas = String(cobro.personas);
    const fecha    = String(paqueteDetails?.fecha || "");

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(charge * 100), // MXN → centavos
      currency:      "mxn",
      description:   `Paquete Huasteca Potosina — ${paquete.nombre} (${pct}%) · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        // Se guarda como reserva usando los mismos campos de TourBooking (tourId/tourName…)
        tourId:        paquete.slug,
        tourName:      `Paquete · ${paquete.nombre}`,
        tourSlug:      paquete.slug,
        tourDate:      fecha,
        adults:        String(cobro.adultos),
        children:      String(cobro.childrenMid + cobro.childrenSmall),
        habitacion:    cobro.vistaMontana ? "Jungla (vista a la montaña)" : "Vista a la selva",
        producto:      "paquete",
        paquetePct:    String(pct),
        totalCompleto: String(cobro.total),
        habitaciones:  String(cobro.habitaciones),
        extraHotel:    String(cobro.extraHotel),
        extraTours:    String(cobro.extraTours),
        personas,
        source:        "huasteca-potosina.com",
      },
    });

    const anticipo = pct === 100 ? "pago completo" : `anticipo ${pct}%`;
    actividad(
      "💳  LLEGÓ AL PAGO (PAQUETE)",
      paquete.nombre,
      anticipo,
      `${mxn(charge)} de ${mxn(paquete.precio)}`,
      personas ? `${personas} personas` : "",
      customerName,
      customerEmail,
      fecha,
      paymentIntent.id,
    );

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount:          charge,
      total:           paquete.precio,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    logger.error("paquete_payment_intent_error", { reason: msg });
    return NextResponse.json({ error: "No se pudo iniciar el pago." }, { status: 500 });
  }
}
