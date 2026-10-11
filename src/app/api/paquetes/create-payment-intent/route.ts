import { NextRequest, NextResponse } from "next/server";
import { opcionesMsi } from "@/lib/stripeMsi";
import { stripe } from "@/lib/stripe";
import { getPaquete, eventoALaVenta } from "@/lib/paquetes";
import { NOCHE_XANTOLO, haciaLa } from "@/lib/nocheXantolo";
import { lugaresDePaquete } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { mensajeSinCupo, pedidosSinCupo, toursDePaquete } from "@/lib/cupoTour";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { habitacionesDePaquete } from "@/lib/paquetes";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE, pctPaqueteValido, parseEleccion } from "@/lib/paquetePricing";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn } from "@/lib/logger";
import { fechaTourValida } from "@/lib/tourPricing";
import { trackServerEvent } from "@/lib/serverTrack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "paquete-payment-intent", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { customerEmail, customerName, paqueteDetails, sid, gaClientId, locale } = await req.json();

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

    // Sin fecha no hay viaje que operar: el equipo recibía un paquete pagado
    // sin saber cuándo llegaba el cliente. `fechaTourValida` acepta la fecha
    // vacía (los tours por WhatsApp la coordinan después), así que aquí se
    // exige aparte. Los eventos traen su fecha fija y no la mandan.
    if (!evento && (!paqueteDetails?.fecha || !fechaTourValida(paqueteDetails.fecha, { desdeManana: true }))) {
      return NextResponse.json({ error: "Elige la fecha de inicio de tu viaje para continuar." }, { status: 400 });
    }

    // Sin hotel, el equipo pasa por el cliente: hace falta saber DÓNDE lo
    // recoge. Desde el 10 oct 2026 vale también «punto de encuentro en el
    // centro de Xilitla» (el cliente llega por su cuenta y se acuerda por
    // WhatsApp): exigir el nombre de un hotel dejaba fuera a quien apenas está
    // planeando el viaje, que es casi todo el tráfico de estas páginas.
    //
    // Desde el 11 oct la pantalla manda el MODO aparte del hotel y la frase la
    // arma el servidor: el cargo de Ciudad Valles no puede depender de que el
    // navegador escriba «Ciudad Valles» al principio. Una pestaña abierta con
    // la versión anterior manda solo `recogida` ya armada y se respeta.
    const textoLibre = String(paqueteDetails?.recogida ?? "").trim().slice(0, 200);
    const modoRecogida = (["xilitla", "valles", "punto"] as const).find((m) => m === paqueteDetails?.modoRecogida);
    if (evento?.sinHotel && modoRecogida === "valles" && !evento.desdeValles) {
      return NextResponse.json({ error: "Esta salida no recoge en Ciudad Valles. Escríbenos por WhatsApp y lo vemos." }, { status: 400 });
    }
    // Ciudad Valles: transporte aparte, con cargo por grupo (decisión de Manolo, 11 oct 2026).
    const desdeValles = !!evento?.sinHotel && !!evento.desdeValles
      && (modoRecogida ? modoRecogida === "valles" : /^Ciudad Valles/i.test(textoLibre));
    let recogida = textoLibre;
    if (evento?.sinHotel && modoRecogida) {
      if (modoRecogida === "punto") {
        recogida = "PUNTO DE ENCUENTRO en el centro de Xilitla (llega por su cuenta) — confirmarle el punto por WhatsApp";
      } else if (textoLibre.length >= 3) {
        recogida = desdeValles
          ? `Ciudad Valles (traslado +${mxn(evento.desdeValles!.cargoPorGrupo)} por grupo): ${textoLibre}`
          : `Xilitla: ${textoLibre}`;
      } else {
        recogida = "";
      }
    }
    if (evento?.sinHotel && recogida.length < 3) {
      return NextResponse.json({ error: "Dinos dónde pasamos por ti para operar la salida." }, { status: 400 });
    }
    // Lo mismo, dicho al CLIENTE para su correo: `recogida` es la frase del
    // equipo («confirmarle el punto por WhatsApp» no se le escribe a él).
    const conTourPedido = paqueteDetails?.conTour === true && !!evento?.tourOpcional;
    const saleA = conTourPedido ? evento!.tourOpcional!.horaRecogida : `a las ${NOCHE_XANTOLO.horaRecogida}`;
    const recogidaCliente = !evento?.sinHotel || !modoRecogida ? recogida
      : modoRecogida === "punto"
        ? `En el centro de Xilitla, ${saleA}. Te confirmamos el punto exacto por WhatsApp.`
        : desdeValles
          ? `${textoLibre}, en Ciudad Valles, ${conTourPedido ? "por la mañana (te confirmamos la hora por WhatsApp)" : haciaLa(evento.desdeValles!.recogidaNoche)}. Te regresamos ${haciaLa(evento.desdeValles!.regreso)}. El traslado desde Valles (${mxn(evento.desdeValles!.cargoPorGrupo)} por grupo) ya va en tu total.`
          : `${textoLibre}, en Xilitla, ${saleA}.`;

    // El día completo que se agrega a la noche (la Ruta Surrealista). Solo
    // existe si ESTE evento lo ofrece: el precio lo pone `paquetePricing` con
    // el número del catálogo, nunca el navegador.
    const conTour = paqueteDetails?.conTour === true && !!evento?.tourOpcional;

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
      // La promo de temporada baja va con los viajes que empiezan hasta el 29 oct.
      fecha:         paqueteDetails?.fecha,
      // El día completo, ya saneado contra lo que ofrece este evento.
      conTour,
      // El traslado desde Valles, ya saneado arriba.
      desdeValles,
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

    // La Ruta del día completo sale en SU salida de ese día (la de la noche es
    // otra): ocupa los mismos 12 lugares que comprada suelta. El cupo de la
    // noche, revisado arriba, no la cuidaba: con 10 en la Ruta del 31 vendida
    // por el carrito, una familia de 6 con el combo la dejaba en 16.
    if (evento && cobro.conTour && evento.tourOpcional) {
      const sinLugar = await pedidosSinCupo([{ slug: evento.tourOpcional.tourSlug, fecha: evento.fecha, personas: cobro.personas }]);
      if (sinLugar.length) {
        logger.warn("paquete_sin_cupo", { slug: paquete.slug, dias: sinLugar.map((s) => `${s.slug} ${s.fecha}`).join("; ") });
        return NextResponse.json(
          { error: sinLugar.map((s) => mensajeSinCupo(s, locale === "en" ? "en" : "es")).join(" ") },
          { status: 409 },
        );
      }
    }

    // Los recorridos del paquete ocupan su salida de cada día igual que
    // comprados sueltos (`lib/cupoTour.ts`): sin esto, un paquete podía meter
    // a cuatro personas en una Expedición Tamul ya llena. Los de evento se
    // quedan con su propio cupo (arriba), que ya decide cuánta gente sale.
    if (!evento) {
      const sinLugar = await pedidosSinCupo(
        toursDePaquete(paquete, String(paqueteDetails.fecha), elegidos)
          .map((r) => ({ ...r, personas: cobro.personas })),
      );
      if (sinLugar.length) {
        logger.warn("paquete_sin_cupo", { slug: paquete.slug, dias: sinLugar.map((s) => `${s.slug} ${s.fecha}`).join("; ") });
        return NextResponse.json(
          { error: sinLugar.map((s) => mensajeSinCupo(s, locale === "en" ? "en" : "es")).join(" ") },
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
      // Igual que el carrito de tours: solo métodos que se resuelven sin salir
      // de la página. Sin esto Stripe podía ofrecer uno con redirección y
      // `confirmPayment` (sin `return_url`) fallaba al pulsar Pagar.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      // Meses sin intereses. Donde más se nota: un paquete son $8,000-$16,000.
      ...opcionesMsi(charge),
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        // Se guarda como reserva usando los mismos campos de TourBooking (tourId/tourName…)
        tourId:        paquete.slug,
        tourName:      evento?.sinHotel
          ? `${paquete.nombre}${cobro.conTour ? ` + ${evento.tourOpcional!.nombre}` : ""} · ${evento.fechaTexto}`
          : `Paquete · ${paquete.nombre}`,
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
        extraTraslado: String(cobro.extraTraslado),
        // Lo que el equipo opera esa noche y, sin hotel, dónde recoger. Si la
        // pantalla de confirmación no llega, el webhook arma la reserva con esto.
        // Con el día completo, la operación cambia: se avisa al principio para
        // que no se pierda en el recorte a 490 caracteres de la metadata.
        notaEquipo:    evento
          ? (cobro.conTour
              ? `CON ${evento.tourOpcional!.nombre.toUpperCase()} ESE DÍA (sale ${evento.tourOpcional!.horaRecogida}). ${evento.notaEquipo}`.slice(0, 490)
              : evento.notaEquipo.slice(0, 490))
          : "",
        // Para la confirmación y el panel: si la reserva trae el día completo.
        conTour:       cobro.conTour ? "sí" : "no",
        recogida,
        recogidaCliente: recogidaCliente.slice(0, 490),
        personas,
        source:        "huasteca-potosina.com",
        // El idioma y la identidad de medición, como en el carrito de tours: si
        // el cliente cierra la pestaña, el webhook es el único que se entera de
        // la compra y sin esto no sabe en qué idioma escribirle ni de dónde vino.
        locale:        locale === "en" ? "en" : "es",
        gaClientId:    typeof gaClientId === "string" ? gaClientId.slice(0, 60) : "",
        sid:           typeof sid === "string" ? sid.slice(0, 60) : "",
      },
    });

    // El paso «llegó al pago» del embudo, contado en el servidor como en el
    // carrito: hasta hoy el checkout de paquetes no dejaba NINGÚN rastro.
    await trackServerEvent("PAYMENT_INITIATED", {
      sid:      typeof sid === "string" ? sid : null,
      tourSlug: paquete.slug,
      amount:   charge,
      data:     { paquete: true, pct, total: cobro.total, personas: cobro.personas, paymentIntentId: paymentIntent.id },
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
