import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPaquete, eventoALaVenta } from "@/lib/paquetes";
import { lugaresDePaquete } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { habitacionesDePaquete } from "@/lib/paquetes";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE, pctPaqueteValido, parseEleccion } from "@/lib/paquetePricing";
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

    // Paquete de evento (Xantolo con hotel y las noches sin hotel): la fecha la
    // pone el servidor y se vende solo hasta la víspera. Los lugares se
    // revisan más abajo, cuando ya se sabe cuántas personas son.
    const evento = paquete.evento;
    if (evento && !eventoALaVenta(paquete)) {
      return NextResponse.json({ error: "Este paquete ya no está a la venta." }, { status: 410 });
    }

    // Sin hotel, el equipo pasa por el cliente: sin saber dónde se hospeda no
    // se puede operar la salida.
    const recogida = String(paqueteDetails?.recogida ?? "").trim().slice(0, 200);
    if (evento?.sinHotel && recogida.length < 3) {
      return NextResponse.json({ error: "Dinos dónde te hospedas en Xilitla para pasar por ti." }, { status: 400 });
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

    // Los recorridos elegidos, validados contra la lista que ESE paquete
    // ofrece. Importan para el dinero: en el paquete a la carta los boletos de
    // cada persona extra son los de los recorridos elegidos, así que aceptar
    // una lista corta o un slug de fuera saldría del bolsillo de Manolo.
    const eleccion = paquete.eleccionTour;
    const elegidos = Array.from(new Set(parseEleccion(paqueteDetails?.tourElegido)))
      .filter((slug) => eleccion?.opciones.some((o) => o.slug === slug));
    if (eleccion && elegidos.length !== (eleccion.cuantos ?? 1)) {
      return NextResponse.json(
        { error: `Elige ${eleccion.cuantos ?? 1} recorrido${(eleccion.cuantos ?? 1) > 1 ? "s" : ""} de la lista para continuar.` },
        { status: 400 },
      );
    }

    // La habitación concreta que eligió el cliente, validada contra el catálogo
    // del hotel y contra las que este paquete ofrece.
    // Contra las que ofrece ESTE paquete, no contra la lista general: la Luna
    // de Miel sólo da la Jungla y su reemplazo, y aceptar cualquier otra
    // cobraría el precio de un paquete por una habitación que no vende.
    const habsDelPaquete = habitacionesDePaquete(paquete);
    // En un paquete de evento la habitación la asigna el hotel: no se elige.
    const habitacionElegida = evento ? undefined : HABITACIONES_HOTEL.find(
      (h) => h.id === paqueteDetails?.habitacionId && habsDelPaquete.some((x) => x.id === h.id),
    );

    const cobro = computePaqueteCharge({
      slug:          paqueteDetails?.slug,
      personas:      paqueteDetails?.personas,
      childrenMid:   paqueteDetails?.childrenMid,
      childrenSmall: paqueteDetails?.childrenSmall,
      // La vista sale de la habitación que eligió, no de una casilla suelta:
      // el cliente elige "Jungla" y el precio TIENE que ser el de Jungla.
      vistaMontana:  evento ? false : (habitacionElegida ? habitacionElegida.vistaMontana : paqueteDetails?.vistaMontana),
      // Cómo eligió dormir el cliente. El servidor lo valida dentro
      // (`costoHotelPorNoche`): si el reparto no cuadra con la gente, se ignora
      // y se usa el automático. El importe nunca sale del navegador.
      reparto:       paqueteDetails?.reparto,
      // Llegar la víspera: suma una noche de hotel al total.
      nocheExtra:    paqueteDetails?.nocheExtra,
      // Ya saneados arriba: el motor cobra los boletos extra de ESTOS tours.
      tourElegido:   elegidos.join(","),
      pct,
    });
    if (!cobro) {
      return NextResponse.json(
        {
          error: evento
            ? `Número de personas inválido. Para más de ${evento.maxPorReserva} personas escríbenos por WhatsApp y lo armamos.`
            : `Número de personas inválido. Para grupos de más de ${MAX_PERSONAS_PAQUETE} escríbenos por WhatsApp y lo cotizamos.`,
        },
        { status: 400 },
      );
    }
    const charge = cobro.charge;
    if (charge <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    // Los lugares, ya con el tamaño del grupo. Contar es obligatorio: si la
    // base no contesta, no se cobra (vender un cuarto o un asiento que no
    // existe es peor que perder una venta).
    if (evento) {
      let lugares;
      try {
        lugares = await lugaresDePaquete(paquete);
      } catch {
        return NextResponse.json({ error: "No pudimos confirmar los lugares. Intenta de nuevo en un momento." }, { status: 503 });
      }
      if (!lugares || !cabeEnCupo(lugares, cobro.personas)) {
        const quedan = lugares
          ? (evento.unidad === "persona" ? lugares.libres : Math.min(lugares.personasLibres, lugares.libres > 0 ? evento.maxPorReserva : 0))
          : 0;
        return NextResponse.json(
          {
            error: quedan > 0
              ? `Ya no caben ${cobro.personas} personas: quedan lugares para ${quedan}. Escríbenos por WhatsApp y lo vemos.`
              : "Se acabaron los lugares. Escríbenos por WhatsApp por si se libera uno.",
          },
          { status: 409 },
        );
      }
    }

    const personas = String(cobro.personas);
    // La fecha de un evento NO viene del navegador.
    const fecha    = evento ? evento.fecha : String(paqueteDetails?.fecha || "");

    const paymentIntent = await stripe.paymentIntents.create({
      amount:        Math.round(charge * 100), // MXN → centavos
      currency:      "mxn",
      description:   evento?.sinHotel
        ? `${paquete.nombre} — ${evento.fechaTexto} (${pct}%) · ${customerName || ""}`
        : `Paquete Huasteca Potosina — ${paquete.nombre} (${pct}%) · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        // Se guarda como reserva usando los mismos campos de TourBooking (tourId/tourName…)
        tourId:        paquete.slug,
        tourName:      evento?.sinHotel ? `${paquete.nombre} · ${evento.fechaTexto}` : `Paquete · ${paquete.nombre}`,
        tourSlug:      paquete.slug,
        tourDate:      fecha,
        adults:        String(cobro.adultos),
        children:      String(cobro.childrenMid + cobro.childrenSmall),
        // Los tramos por separado. Sin esto la confirmación no podía decir
        // cuántos menores van ni de qué edad, y el equipo prepara el equipo de
        // seguridad a ciegas.
        childrenMid:   String(cobro.childrenMid),
        childrenSmall: String(cobro.childrenSmall),
        habitacion:    evento ? (evento.habitacionTexto ?? "") : habitacionElegida?.nombre ?? (cobro.vistaMontana ? "Jungla (vista a la montaña)" : "Vista a la selva"),
        // Sin esto el equipo recibe un paquete con un día "a elegir" sin saber
        // qué eligió el cliente, y el reparto de habitaciones se perdía.
        tourElegido:   elegidos.join(","),
        repartoHab:    Array.isArray(paqueteDetails?.reparto) ? paqueteDetails.reparto.join("+") : "",
        nocheExtra:    cobro.nocheExtra ? "sí — entra la víspera, check-in 3 PM" : "no",
        nochesHotel:   String(cobro.nochesTotales),
        producto:      "paquete",
        paquetePct:    String(pct),
        totalCompleto: String(cobro.total),
        habitaciones:  String(cobro.habitaciones),
        extraHotel:    String(cobro.extraHotel),
        extraTours:    String(cobro.extraTours),
        extraEvento:   String(cobro.extraEvento),
        // Lo que el equipo opera esa noche y, sin hotel, dónde recoger. Si la
        // pantalla de confirmación no llega, el webhook arma la reserva con esto.
        notaEquipo:    evento ? evento.notaEquipo.slice(0, 490) : "",
        recogida,
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
