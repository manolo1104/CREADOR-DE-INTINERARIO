import { NextRequest, NextResponse } from "next/server";
import { opcionesMsi, MSI_DESDE } from "@/lib/stripeMsi";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { tarifarRecorridos } from "@/lib/tourPricing";
import { mensajeSinCupo, pedidosSinCupo } from "@/lib/cupoTour";
import { esIdApartado, renovarApartado } from "@/lib/apartadosAlmacen";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn } from "@/lib/logger";
import { trackServerEvent } from "@/lib/serverTrack";
import { MAX_ITEMS, ANTICIPO_PCT, pctACobrar } from "@/lib/carrito";
import { cotizarHabitaciones } from "@/lib/habitaciones";
import { getTraslado, tarifaTraslado } from "@/lib/traslados";

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
    const { customerEmail, customerName, items, sid, gaClientId, hospedaje, traslado, locale, paymentIntentIdPrevio, apartadoId, pagarTodo, guiaIngles } = await req.json();

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
    // La MISMA función que usa `guardar-carrito` para la cotización por correo:
    // si divergieran, el correo prometería un precio que el cobro no respeta.
    const tarifa = tarifarRecorridos(items);
    if (!tarifa.ok) {
      return NextResponse.json({ error: tarifa.error }, { status: 400 });
    }
    const lineItems = tarifa.lineItems;
    let total = tarifa.total;

    // ── Hospedaje opcional ────────────────────────────────────────────────
    // Igual que los tours: el cliente manda QUÉ quiere (habitación, noches,
    // huéspedes) y el precio lo pone `cotizarHospedaje` con las tarifas reales.
    // ── Hospedaje opcional ────────────────────────────────────────────────
    // El cliente manda QUÉ habitaciones quiere y cuánta gente duerme en cada
    // una; el precio lo pone `cotizarHabitaciones` con las tarifas reales del
    // hotel, que dependen de la habitación Y de la ocupación. También valida
    // el cupo: ninguna admite cinco personas.
    let hotel: { habitacion: string; noches: number; huespedes: number; total: number; ahorro: number; checkin: string; checkout: string } | null = null;
    if (Array.isArray(hospedaje?.habitaciones) && hospedaje.habitaciones.length > 0 && Number(hospedaje?.noches) > 0) {
      const q = cotizarHabitaciones(hospedaje.habitaciones, Number(hospedaje.noches));
      if (!q.ok || !q.total) {
        return NextResponse.json({ error: q.error || "No se pudo cotizar el hospedaje." }, { status: 400 });
      }
      hotel = {
        habitacion: (q.desglose ?? []).map((d) => `${d.habitacion} (${d.huespedes})`).join(" + "),
        noches:     Number(hospedaje.noches),
        huespedes:  (q.desglose ?? []).reduce((s, d) => s + d.huespedes, 0),
        total:      q.total,
        ahorro:     q.ahorro ?? 0,
        checkin:    typeof hospedaje.checkin  === "string" ? hospedaje.checkin  : "",
        checkout:   typeof hospedaje.checkout === "string" ? hospedaje.checkout : "",
      };
      total += q.total;
    }

    // ── Traslado desde la ciudad de origen ───────────────────────────────
    // El cliente manda de DÓNDE viene y cuántos van; la tarifa la pone el
    // catálogo. Nunca se acepta un importe del cliente.
    let viaje: { ciudad: string; personas: number; total: number } | null = null;
    if (traslado?.ciudad) {
      const ruta = getTraslado(String(traslado.ciudad));
      if (!ruta) {
        return NextResponse.json({ error: "Esa ciudad de traslado no existe." }, { status: 400 });
      }
      // La gente del traslado son los que van en el vehículo, no la suma de los
      // recorridos: en un carrito de tres días el mismo grupo viaja una vez.
      const personas = Math.max(
        1,
        Math.min(20, Number(traslado.personas) || Math.max(...lineItems.map((l) => l.adults + l.children), 1)),
      );
      const precio = tarifaTraslado(ruta, personas)?.precio;
      if (!precio) {
        return NextResponse.json({ error: "No hay tarifa de traslado para ese grupo." }, { status: 400 });
      }
      viaje = { ciudad: ruta.ciudad, personas, total: precio };
      total += precio;
    }

    // Dos recorridos el mismo día es imposible de operar: cada uno ocupa la
    // jornada entera. La UI ya lo impide, pero el carrito vive en el
    // localStorage del visitante y se puede editar.
    const fechas = lineItems.map((l) => l.tourDate);
    if (new Set(fechas).size !== fechas.length) {
      return NextResponse.json(
        { error: "Hay dos recorridos en la misma fecha. Cada uno ocupa el día completo." },
        { status: 400 },
      );
    }

    // 🔴 El cupo de cada día, antes de cobrar (`lib/cupoTour.ts`). El carrito
    // vive en el localStorage: una fecha que tenía lugar ayer pudo llenarse
    // hoy. El RZR va por vehículo y no lleva cupo por fecha.
    // Sin contar el apartado de ESTE carrito (`lib/apartadosAlmacen.ts`): esos
    // lugares ya son suyos, y contarlos lo dejaría sin lugar por su propio reloj.
    const apartado = esIdApartado(apartadoId) ? apartadoId : undefined;
    const pedidos = lineItems
      .filter((l) => !l.unidades)
      .map((l) => ({ slug: l.tourSlug, fecha: l.tourDate, personas: l.adults + l.children }));
    const sinLugar = await pedidosSinCupo(pedidos, { excluirApartado: apartado });
    if (sinLugar.length) {
      logger.warn("carrito_sin_cupo", { dias: sinLugar.map((s) => `${s.slug} ${s.fecha} (${s.personas}, ${s.estado})`).join("; ") });
      return NextResponse.json(
        { error: sinLugar.map((s) => mensajeSinCupo(s, locale === "en" ? "en" : "es")).join(" ") },
        { status: 409 },
      );
    }

    // Ya está en la pantalla de pago: su apartado corre 15 minutos más, con los
    // renglones que se van a cobrar (pudo cambiar algo un instante antes). Solo
    // si sigue vivo: uno vencido se vuelve a apartar desde el aviso del carrito.
    const apartadoVence = apartado ? await renovarApartado(apartado, pedidos) : null;

    // Un solo día de recorrido se cobra COMPLETO; con hospedaje o varios días,
    // el 30 % de siempre. Misma función que usa el carrito para pintarlo, para
    // que el importe de la pantalla y el de Stripe no puedan diferir.
    const diasCobro = new Set(lineItems.map((l) => l.tourDate)).size;
    const pctBase   = pctACobrar(diasCobro, !!hotel);
    /**
     * «Pagar el viaje completo hoy», que es lo que habilita los meses sin
     * intereses (ver `lib/stripeMsi.ts`).
     *
     * La bandera del cliente NO basta: se vuelve a comprobar aquí que el total
     * llegue al umbral, igual que se recalcula el precio. Lo peor que puede
     * hacer alguien manipulándola es pagar de MÁS, pero la regla de cuánto se
     * cobra hoy vive en el servidor como todas las demás.
     */
    const cobraTodo = pagarTodo === true && total >= MSI_DESDE && pctBase < 100;
    const pctHoy    = cobraTodo ? 100 : pctBase;
    const cobrar    = Math.round((total * pctHoy) / 100);
    const saldo     = total - cobrar;

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

    // Las actividades opcionales, aparte del renglón compacto: se cobraron y son
    // lo único que el equipo no puede deducir del catálogo. Si el cliente cierra
    // la pestaña, esto es lo que el webhook tiene para no perderlas.
    const addOnsCompacto = lineItems
      .flatMap((l) => (l.addOns ?? []).map((a) => `${l.tourSlug}:${a.nombre} x${a.cantidad}`))
      .join("; ")
      .slice(0, 480);

    const datosCobro = {
      amount:        Math.round(cobrar * 100),
      description:   `Tours Huasteca Potosina — ${resumenNombre} · ${customerName || ""}`,
      receipt_email: customerEmail || undefined,
      // 🔴 Los meses van AQUÍ y no solo en el `create` de abajo, porque este
      // objeto se usa también para ACTUALIZAR un PaymentIntent que ya existe:
      // el carrito lo reutiliza mientras no se haya pagado, y el importe cambia
      // debajo. Si se quedara en el create, un carrito que crece por encima del
      // umbral nunca ofrecería meses. Ver `lib/stripeMsi.ts`.
      ...opcionesMsi(cobrar),
      metadata: {
        customerEmail: customerEmail || "",
        customerName:  customerName  || "",
        carrito:       "1",
        tourId:        lineItems[0].tourId,
        // Con un solo recorrido va su nombre real: esta metadata es lo que lee
        // el webhook si el cliente cierra la pestaña, y guardar "1 recorridos"
        // dejaba la reserva sin nombre de tour en el panel y en el correo.
        tourName:      lineItems.length === 1 ? lineItems[0].tourName : resumenNombre,
        tourSlug:      lineItems[0].tourSlug,
        tourDate:      lineItems[0].tourDate,
        adults:        String(lineItems.reduce((s, l) => s + l.adults, 0)),
        children:      String(lineItems.reduce((s, l) => s + l.children, 0)),
        items:         compacto,
        addOns:        addOnsCompacto,
        // Recorridos donde va UNA persona con la tarifa de viajero solo: si el
        // cliente cierra la pestaña, el webhook necesita esto para avisarle al
        // equipo que hay que sumarlo a un grupo armado para esa fecha.
        viajeroSolo:   lineItems.filter((l) => l.viajeroSolo).map((l) => `${l.tourSlug} ${l.tourDate}`).join("; ").slice(0, 480),
        hospedaje:     hotel ? `${hotel.habitacion} · ${hotel.noches} noches · ${hotel.huespedes} huéspedes · $${hotel.total}` : "",
        traslado:      viaje ? `${viaje.ciudad} → Xilitla · ${viaje.personas} pax · $${viaje.total}` : "",
        // Las mismas dos cosas, en JSON, para que el webhook las pueda
        // RECONSTRUIR y no solo enseñarlas. Las de arriba son para leerlas en el
        // panel de Stripe; volver a parsear un texto con "·" es frágil.
        hospedajeData: hotel ? JSON.stringify(hotel).slice(0, 480) : "",
        trasladoData:  viaje ? JSON.stringify(viaje).slice(0, 480) : "",
        totalCompleto: String(total),
        pctPagado:     String(pctHoy),
        saldo:         String(saldo),
        locale:        locale === "en" ? "en" : "es",
        // 🔴 En qué idioma sale el GUÍA, que no es el idioma en que compró el
        // cliente: alguien puede reservar en español y pedirlo en inglés. Va a
        // `TourBooking.idiomaTour`, que el panel y el calendario ya pintan.
        idiomaTour:    guiaIngles === true ? "en" : "es",
        source:        "huasteca-potosina.com",
        // Identidad de Google Analytics y de nuestro propio embudo. El webhook
        // es el único que se entera de TODAS las compras (la pestaña cerrada,
        // el pago en `processing`, el bloqueador de anuncios) y no tiene
        // cookies: si no viajan aquí, la venta llega a GA4 sin saber de dónde
        // vino. Stripe admite 500 caracteres por valor; ambos son cortos.
        gaClientId:    typeof gaClientId === "string" ? gaClientId.slice(0, 60) : "",
        sid:           typeof sid === "string" ? sid.slice(0, 60) : "",
        // El apartado de 15 minutos de este carrito: quien cree la reserva
        // (`send-confirmation` o, con la pestaña cerrada, el webhook) lo suelta.
        apartadoId:    apartado ?? "",
      },
    };

    // Reusar el pago ya creado en vez de abrir otro en cada vuelta. Cambiar una
    // fecha o una persona invalida el cobro en pantalla, y cada «Continuar»
    // creaba un PaymentIntent nuevo: Stripe se llenaba de intentos huérfanos que
    // ensuciaban la cuenta de «quién llegó al pago». Solo se reusa si sigue sin
    // pagar, es de este carrito y de ESTA visita (`sid`).
    let paymentIntent: Stripe.PaymentIntent | null = null;
    if (typeof paymentIntentIdPrevio === "string" && paymentIntentIdPrevio.startsWith("pi_") && typeof sid === "string" && sid) {
      try {
        const previo = await stripe.paymentIntents.retrieve(paymentIntentIdPrevio);
        if (
          previo.status === "requires_payment_method" &&
          previo.metadata?.carrito === "1" &&
          previo.metadata?.sid === sid.slice(0, 60)
        ) {
          paymentIntent = await stripe.paymentIntents.update(previo.id, datosCobro);
        }
      } catch {
        // Si no se puede leer o actualizar, se crea uno nuevo: nunca se pierde la venta por esto.
      }
    }
    paymentIntent ??= await stripe.paymentIntents.create({
      ...datosCobro,
      currency: "mxn",
      // Igual que en el checkout de un tour: solo métodos que se resuelven sin
      // salir de la página, para que el pago embebido no pida redirección.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
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
      pct:             pctHoy,
      lineItems,
      hospedaje: hotel,
      traslado: viaje,
      // El reloj del carrito vuelve a empezar con la hora del servidor (`ahora`).
      apartadoVence,
      ahora: Date.now(),
    });
  } catch (err) {
    const e = err as Error;
    logger.error("carrito_payment_intent_error", { message: e.message });
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 500 });
  }
}
