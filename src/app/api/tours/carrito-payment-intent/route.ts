import { NextRequest, NextResponse } from "next/server";
import { opcionesMsi, MSI_DESDE } from "@/lib/stripeMsi";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { tarifarRecorridos, zonaValida, nombreZona, carritoPideZona } from "@/lib/tourPricing";
import { mensajeSinCupo, pedidosSinCupo, toursDePaquete } from "@/lib/cupoTour";
import { metadataPaquete, validarPedidoPaquete } from "@/lib/cobroPaquete";
import { esIdApartado, renovarApartado } from "@/lib/apartadosAlmacen";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad, mxn, nombreParaLog } from "@/lib/logger";
import { peticionDelEquipo, trackServerEvent } from "@/lib/serverTrack";
import { MAX_ITEMS, ANTICIPO_PCT, pctACobrar } from "@/lib/carrito";
import { cotizarHabitaciones } from "@/lib/habitaciones";
import { getTraslado, tarifaTraslado } from "@/lib/traslados";
import { metadataDeRenglones } from "@/lib/webhookRecuperacion";
import { metadataDelEquipo } from "@/lib/equipoInterno";

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
    const cuerpo = await req.json();
    const { customerEmail, customerName, items, sid, gaClientId, hospedaje, traslado, locale, paymentIntentIdPrevio, apartadoId, pagarTodo, guiaIngles, customerPhone, recogida, zona: zonaPedida } = cuerpo;

    // ── Un PAQUETE, por el mismo checkout (13 nov 2026) ──────────────────
    if (cuerpo?.paquete && typeof cuerpo.paquete === "object") {
      return await cobrarPaquete(cuerpo);
    }

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
    // ── ¿Xilitla o Ciudad Valles? ─────────────────────────────────────────
    // Solo importa si algún recorrido cobra distinto desde Valles (la Ruta
    // Surrealista, +$400 por reserva). Ahí es OBLIGATORIA: sin ella no se sabe
    // cuánto cobrar, y adivinar «Xilitla» le regalaría el traslado a quien
    // viene de Valles. Del cliente solo se acepta CUÁL zona; el monto lo pone
    // el catálogo.
    const zona = zonaValida(zonaPedida);
    const slugs = items.map((i: unknown) => String((i as Record<string, unknown>)?.tourSlug ?? ""));
    if (carritoPideZona(slugs) && !zona) {
      return NextResponse.json(
        { error: locale === "en" ? "Tell us whether you're staying in Xilitla or in Ciudad Valles." : "Dinos si te hospedas en Xilitla o en Ciudad Valles." },
        { status: 400 },
      );
    }

    // La MISMA función que usa `guardar-carrito` para la cotización por correo:
    // si divergieran, el correo prometería un precio que el cobro no respeta.
    const tarifa = tarifarRecorridos(items, { zona });
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
        // Pago de alguien del equipo: su compra no va a GA4 desde el servidor (lote 8, 10 nov 2026).
        ...metadataDelEquipo(peticionDelEquipo()),
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
        // Para la reserva que arma el webhook si se cierra la pestaña
        // (`lib/recuperarPago.ts`): sin ellos quedaba sin teléfono ni recogida.
        customerPhone: typeof customerPhone === "string" ? customerPhone.trim().slice(0, 40) : "",
        recogida:      typeof recogida === "string" ? recogida.trim().slice(0, 300) : "",
        // Lo que eligió en «¿Xilitla o Ciudad Valles?», con el texto que lee el
        // panel (`zonaDeReserva`). Lo escriben en `_meta.zonaHospedaje` tanto
        // `send-confirmation` como el webhook.
        zonaHospedaje: zona ? nombreZona(zona) : "",
        cargoValles:   String(lineItems.reduce((s, l) => s + (l.cargoValles ?? 0), 0)),
        // 🔴 Lo que el compacto no lleva de cada recorrido (elección, actividades,
        // menores por tramo, Valles, RZR), en `linea1`…`linea8` (lote 5, 5 nov
        // 2026). La pantalla y el webhook arman la reserva con ESTO, no con lo
        // que mande el navegador (`lib/reservaWeb.ts`).
        ...metadataDeRenglones(lineItems),
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
      nombreParaLog(customerName),
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

/**
 * El cobro de un paquete del catálogo desde el checkout del carrito (13 nov
 * 2026): misma pantalla, mismo Stripe y misma regla de anticipo que los tours
 * (30 % o todo). La validación, el importe y la metadata viven en
 * `lib/cobroPaquete.ts`; la reserva la arma `registrarReservaPaquete` (la
 * pantalla vía `send-confirmation` y, si cierra la pestaña, el webhook).
 */
async function cobrarPaquete(cuerpo: Record<string, unknown>) {
  const { customerEmail, customerName, sid, gaClientId, locale, paymentIntentIdPrevio, pagarTodo, customerPhone, notas } = cuerpo as Record<string, string | undefined> & { pagarTodo?: unknown };
  const v = validarPedidoPaquete(cuerpo.paquete as Record<string, unknown>, pagarTodo);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

  // Sus recorridos ocupan su salida de cada día igual que comprados sueltos.
  const sinLugar = await pedidosSinCupo(toursDePaquete(v.paquete, v.fecha, v.elegidos).map((r) => ({ ...r, personas: v.cobro.personas })));
  if (sinLugar.length) {
    logger.warn("paquete_sin_cupo", { slug: v.paquete.slug, dias: sinLugar.map((x) => `${x.slug} ${x.fecha}`).join("; ") });
    return NextResponse.json({ error: sinLugar.map((x) => mensajeSinCupo(x, locale === "en" ? "en" : "es")).join(" ") }, { status: 409 });
  }

  const sidCorto = typeof sid === "string" ? sid.slice(0, 60) : "";
  const metadata = metadataPaquete(v, {
    customerEmail: typeof customerEmail === "string" ? customerEmail : "",
    customerName:  typeof customerName === "string" ? customerName : "",
    customerPhone: typeof customerPhone === "string" ? customerPhone.trim() : "",
    notas:         typeof notas === "string" ? notas.trim() : "",
    locale:        locale === "en" ? "en" : "es",
    gaClientId:    typeof gaClientId === "string" ? gaClientId : "",
    sid:           sidCorto,
    equipo:        metadataDelEquipo(peticionDelEquipo()),
  });
  const datosCobro = {
    amount:        Math.round(v.cobrar * 100),
    description:   `Paquete Huasteca Potosina — ${v.paquete.nombre} (${v.pct}%) · ${customerName || ""}`,
    receipt_email: (typeof customerEmail === "string" && customerEmail) || undefined,
    ...opcionesMsi(v.cobrar),
    metadata,
  };

  // Se reusa el cobro previo solo si es de un PAQUETE de esta visita y sigue sin pagar.
  let paymentIntent: Stripe.PaymentIntent | null = null;
  if (typeof paymentIntentIdPrevio === "string" && paymentIntentIdPrevio.startsWith("pi_") && sidCorto) {
    try {
      const previo = await stripe.paymentIntents.retrieve(paymentIntentIdPrevio);
      if (previo.status === "requires_payment_method" && previo.metadata?.carrito === "paquete" && previo.metadata?.sid === sidCorto) {
        paymentIntent = await stripe.paymentIntents.update(previo.id, datosCobro);
      }
    } catch { /* se crea uno nuevo */ }
  }
  paymentIntent ??= await stripe.paymentIntents.create({
    ...datosCobro,
    currency: "mxn",
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  await trackServerEvent("PAYMENT_INITIATED", {
    sid: sidCorto || null, tourSlug: v.paquete.slug, amount: v.cobrar,
    data: { paquete: true, carrito: true, pct: v.pct, total: v.cobro.total, personas: v.cobro.personas, paymentIntentId: paymentIntent.id },
  });
  actividad("💳  LLEGÓ AL PAGO (PAQUETE, CARRITO)", v.paquete.nombre, v.pct === 100 ? "pago completo" : `anticipo ${v.pct}%`,
    `${mxn(v.cobrar)} de ${mxn(v.cobro.total)}`, `${v.cobro.personas} personas`, nombreParaLog(String(customerName ?? "")), customerEmail, v.fecha, paymentIntent.id);

  // La misma forma que el cobro de tours (`Cobro`): un renglón con el paquete
  // entero. El hotel va DENTRO del paquete: `hospedaje` va vacío para no
  // pintarlo dos veces.
  return NextResponse.json({
    clientSecret:    paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount:          v.cobrar,
    total:           v.cobro.total,
    saldo:           v.saldo,
    pct:             v.pct,
    lineItems: [{
      tourSlug: v.paquete.slug, tourName: `Paquete · ${v.paquete.nombre}`, tourDate: v.fecha,
      adults: v.cobro.adultos, children: v.cobro.childrenMid + v.cobro.childrenSmall,
      childrenMid: v.cobro.childrenMid, childrenSmall: v.cobro.childrenSmall, subtotal: v.cobro.total,
    }],
    hospedaje: null,
    traslado:  null,
    paquete: { slug: v.paquete.slug, habitacion: v.habitacionNombre, noches: v.cobro.nochesTotales },
  });
}
