import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPaquete } from "@/lib/paquetes";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { HABITACIONES } from "@/lib/paquetes";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE, pctPaqueteValido } from "@/lib/paquetePricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    // La lista de porcentajes vive en `paquetePricing` y NO se copia aquí: esta
    // ruta tenía su propia versión congelada en [10, 50, 100] y rechazaba el
    // 30 %, que es justo la opción que la pantalla trae marcada por defecto.
    const pct = pctPaqueteValido(paqueteDetails?.pct);
    if (pct === null) {
      return NextResponse.json({ error: "Porcentaje de pago inválido." }, { status: 400 });
    }

    // La habitación concreta que eligió el cliente, validada contra el catálogo
    // del hotel y contra las que este paquete ofrece.
    const habitacionElegida = HABITACIONES_HOTEL.find(
      (h) => h.id === paqueteDetails?.habitacionId && HABITACIONES.some((x) => x.id === h.id),
    );

    const cobro = computePaqueteCharge({
      slug:          paqueteDetails?.slug,
      personas:      paqueteDetails?.personas,
      childrenMid:   paqueteDetails?.childrenMid,
      childrenSmall: paqueteDetails?.childrenSmall,
      // La vista sale de la habitación que eligió, no de una casilla suelta:
      // el cliente elige "Jungla" y el precio TIENE que ser el de Jungla.
      vistaMontana:  habitacionElegida ? habitacionElegida.vistaMontana : paqueteDetails?.vistaMontana,
      // Cómo eligió dormir el cliente. El servidor lo valida dentro
      // (`costoHotelPorNoche`): si el reparto no cuadra con la gente, se ignora
      // y se usa el automático. El importe nunca sale del navegador.
      reparto:       paqueteDetails?.reparto,
      // Llegar la víspera: suma una noche de hotel al total.
      nocheExtra:    paqueteDetails?.nocheExtra,
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
        // Los tramos por separado. Sin esto la confirmación no podía decir
        // cuántos menores van ni de qué edad, y el equipo prepara el equipo de
        // seguridad a ciegas.
        childrenMid:   String(cobro.childrenMid),
        childrenSmall: String(cobro.childrenSmall),
        habitacion:    habitacionElegida?.nombre ?? (cobro.vistaMontana ? "Jungla (vista a la montaña)" : "Vista a la selva"),
        // Sin esto el equipo recibe un paquete con un día "a elegir" sin saber
        // qué eligió el cliente, y el reparto de habitaciones se perdía.
        tourElegido:   String(paqueteDetails?.tourElegido || ""),
        repartoHab:    Array.isArray(paqueteDetails?.reparto) ? paqueteDetails.reparto.join("+") : "",
        nocheExtra:    cobro.nocheExtra ? "sí — entra la víspera, check-in 3 PM" : "no",
        nochesHotel:   String(cobro.nochesTotales),
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
      // El total REAL del viaje, no el precio de folleto: "13,823 de 16,500"
      // se leía como una reserva casi liquidada cuando faltaban $32,252.
      `${mxn(charge)} de ${mxn(cobro.total)}`,
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
