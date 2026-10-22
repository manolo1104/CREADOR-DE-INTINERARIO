/**
 * La red de seguridad de las ventas en línea (11 oct 2026).
 *
 * Cuando el cliente paga pero no llega a la pantalla de confirmación (cerró la
 * pestaña, se le fue la señal, el servidor falló al guardar), la reserva se
 * arma aquí con la metadata que escribió el servidor al crear el cobro.
 *
 * 🔴 Por qué ya no vive dentro del webhook: el webhook llegaba a la vez que la
 * pantalla y le ganaba la carrera. Entonces el paquete se guardaba como tour
 * suelto (sin recorridos, cuarto ni fechas), el cliente recibía dos correos o
 * el de tour en vez del de paquete, y la nota decía que «no completó la
 * pantalla» aunque sí lo hizo. Ahora:
 *   1. el webhook espera `ESPERA_WEBHOOK_MS` antes de llamar aquí, así que en
 *      una compra normal la pantalla ya creó la reserva y esto no hace nada;
 *   2. la conciliación (`/api/cron/conciliar-pagos`) llama aquí con los pagos
 *      de los últimos días que sigan sin reserva: cubre un reinicio del
 *      servidor en esos 90 s y un error de la base en cualquiera de los dos.
 *
 * Solo quien CREA la fila manda el correo, así que nadie lo recibe dos veces.
 */
import type Stripe from "stripe";
import { CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { registrarCobroSilencioso } from "@/lib/admin/cobros";
import { registrarEnBitacora, SISTEMA, pesos } from "@/lib/admin/bitacora";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildAvisoPagoIncompletoHtml } from "@/lib/avisoCarritoGrande";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { logger, actividad, mxn, nombreCorto } from "@/lib/logger";
import { leerJson, reconstruirLineas } from "@/lib/webhookRecuperacion";
import { enviarCompraGA4 } from "@/lib/ga4Server";
import { esIdApartado, liberarApartado } from "@/lib/apartadosAlmacen";
import { TOURS_DB } from "@/lib/tours";
import { cerrarCarritosDe } from "@/lib/cerrarCarrito";
import { registrarReservaPaquete } from "@/lib/reservaPaquete";
import { revisarSobrecupo } from "@/lib/sobrecupo";

/**
 * Cuánto espera el webhook antes de actuar. La pantalla de confirmación tarda
 * unos segundos (lee el pago, escribe en Sheets y en la base); 90 s le dan
 * margen de sobra incluso con mala señal, y quien cerró la pestaña recibe su
 * correo minuto y medio después de pagar.
 */
export const ESPERA_WEBHOOK_MS = 90_000;

/** ¿Es un cobro de este sitio? La cuenta de Stripe se comparte con Kora. */
export function esPagoDeTours(pi: Stripe.PaymentIntent): boolean {
  const meta = pi.metadata ?? {};
  return meta.source === "huasteca-potosina.com" && !!meta.tourId;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El paquete, con el armado de la pantalla. Devuelve el folio, o null si falló. */
async function recuperarPaquete(pi: Stripe.PaymentIntent, origen: "webhook" | "conciliacion"): Promise<string | null> {
  const meta = pi.metadata ?? {};
  let email = meta.customerEmail || pi.receipt_email || "";
  if (!email && pi.latest_charge) {
    try {
      const chId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const charge = await stripe.charges.retrieve(chId);
      email = charge.billing_details?.email || charge.receipt_email || "";
    } catch { /* sin correo: se avisa al equipo abajo */ }
  }
  const emailValido = EMAIL_RE.test(email);

  const r = await registrarReservaPaquete(
    pi,
    {
      email:        emailValido ? email : "",
      customerName: meta.customerName || "Pendiente (vía webhook)",
      locale:       meta.locale,
      slug:         meta.tourSlug,
      pct:          meta.paquetePct,
      personas:     meta.adults,
      fecha:        meta.tourDate,
    },
    "webhook",
  );
  if (r.estado === "error") {
    logger.error("recuperar_pago_paquete_failed", { payment_intent: pi.id, reason: r.motivo, origen });
    return null;
  }
  if (r.estado === "ya-existia") return r.confirmationNumber;

  await registrarEnBitacora({
    accion:     "creó",
    entidad:    "reserva",
    referencia: r.confirmationNumber,
    resumen:    `Reserva ${r.confirmationNumber} — ${meta.customerName || "cliente sin nombre"}, ${meta.tourName || "paquete"}, ${pesos(r.totalFull)} (pago en línea, recuperada ${origen === "conciliacion" ? "por la conciliación" : "por el webhook"})`,
    actor:      SISTEMA,
  });
  actividad("⚠️  RESERVÓ PAQUETE (recuperada)", nombreCorto(meta.tourName || meta.tourId), mxn(r.totalFull), meta.customerName, emailValido ? email : undefined, r.confirmationNumber, "el cliente no completó la pantalla");

  // Sin correo del cliente nadie le avisó: que lo haga el equipo a mano.
  const adminTo = process.env.ADMIN_EMAIL_TOURS;
  if (adminTo && !emailValido) {
    try {
      const aviso = buildAvisoPagoIncompletoHtml({
        confirmationNumber: r.confirmationNumber,
        tourName:      meta.tourName || meta.tourId || "",
        tourDate:      meta.tourDate || "",
        totalAmount:   r.totalFull,
        paymentIntent: pi.id,
        receiptEmail:  pi.receipt_email || "",
      });
      await sendBrevoEmail({ to: [{ email: adminTo }], subject: aviso.subject, htmlContent: aviso.html });
    } catch (e) {
      logger.error("stripe_webhook_admin_alert_failed", { reason: e instanceof Error ? e.message : "unknown" });
    }
  }
  return r.confirmationNumber;
}

export type ResultadoRecuperacion = "no-es-de-tours" | "ya-existia" | "creada" | "error";

/**
 * Crea la reserva de un pago exitoso si todavía no existe. Idempotente: el
 * `@unique` de `stripePaymentIntentId` impide la doble fila aunque la pantalla,
 * el webhook y la conciliación coincidan.
 */
export async function recuperarPago(
  pi: Stripe.PaymentIntent,
  origen: "webhook" | "conciliacion",
): Promise<ResultadoRecuperacion> {
  if (!esPagoDeTours(pi) || pi.status !== "succeeded") return "no-es-de-tours";
  const meta = pi.metadata ?? {};
  // El viaje CDMX–Xilitla arma su reserva desde su apartado (`viajeCdmx/confirmar.ts`).
  if (meta.producto === "viaje-cdmx") {
    const { confirmarPasaje } = await import("@/lib/viajeCdmx/confirmar");
    try {
      const r = await confirmarPasaje(pi, origen);
      return r.estado === "creada" ? "creada" : r.estado === "ya-existia" ? "ya-existia" : "error";
    } catch (e) {
      logger.error("viaje_cdmx_recuperar_fallo", { payment_intent: pi.id, reason: e instanceof Error ? e.message : String(e) });
      return "error";
    }
  }
  try {
    const existing = await prisma.tourBooking.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });

    // El folio con el que esta venta se contará en Google Analytics. Se
    // decide ANTES de la rama de recuperación porque el `purchase` se manda
    // en los dos casos —la reserva ya existía o la acabamos de crear— y
    // tiene que ser el MISMO número que manda el navegador, o GA4 no puede
    // deduplicar y la venta se cuenta dos veces.
    let folioParaGA4 = existing?.confirmationNumber ?? "";

    if (!existing && meta.producto === "paquete") {
      // Un paquete se arma con lo mismo que la pantalla de confirmación
      // (`lib/reservaPaquete.ts`): recorridos, cuarto, fechas de hotel y su
      // correo de paquete. Antes caía en la rama de abajo y se guardaba como
      // un tour suelto.
      const folio = await recuperarPaquete(pi, origen);
      if (!folio) return "error";
      folioParaGA4 = folio;
    } else if (!existing) {
      const cobrado = Math.round((pi.amount_received || pi.amount) / 100);
      // El precio completo llega en metadata. Con anticipo (30 %) es mayor
      // que lo cobrado; con pago completo coinciden.
      const totalAmount = Number(meta.totalCompleto) > 0 ? Number(meta.totalCompleto) : cobrado;
      const confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

      // Recupera el correo del cliente: metadata → receipt_email → billing_details
      // del cargo (el cliente lo escribió al confirmar el pago aunque no
      // completara la pantalla). Así podemos enviarle su confirmación.
      let clienteEmail = meta.customerEmail || pi.receipt_email || "";
      if (!clienteEmail && pi.latest_charge) {
        try {
          const chId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
          const charge = await stripe.charges.retrieve(chId);
          clienteEmail = charge.billing_details?.email || charge.receipt_email || "";
        } catch { /* si no se puede leer el cargo, seguimos sin correo */ }
      }
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail);
      const locale = meta.locale === "en" ? "en" : "es";

      // ── Reconstrucción del pedido ────────────────────────────────────
      // 🔴 El bug que esto arregla: aquí solo se copiaban los campos planos.
      // Un carrito de tres recorridos con hotel y traslado quedaba en el
      // panel como UN tour suelto, sin itinerario, sin hospedaje y sin el
      // traslado que el equipo tiene que operar — aunque el cobro sí había
      // incluido todo eso. El comentario de `carrito-payment-intent` decía
      // que el webhook leía `meta.items`; no lo leía.
      const lineas = reconstruirLineas(meta);
      const hotel  = leerJson<{ habitacion?: string; noches?: number; huespedes?: number; total?: number; checkin?: string; checkout?: string }>(meta.hospedajeData);
      const viaje  = leerJson<{ ciudad?: string; personas?: number; total?: number }>(meta.trasladoData);

      if (viaje?.ciudad) {
        lineas.push({
          tourName: `Traslado ${viaje.ciudad} → Xilitla (ida y vuelta)`,
          tourDate: meta.tourDate || "",
          adults:   Number(viaje.personas) || 1,
          children: 0,
          subtotal: Number(viaje.total) || 0,
        });
      }

      // ¿Cabía? Ya pagó: entra igual, marcada (`lib/sobrecupo.ts`).
      const avisoCupo = await revisarSobrecupo(
        lineas.length ? lineas : [{ tourSlug: meta.tourSlug, tourDate: meta.tourDate, adults: Number(meta.adults) || 1, children: Number(meta.children) || 0 }],
        { folio: confirmationNumber, cliente: meta.customerName || "cliente sin nombre", excluirApartado: esIdApartado(meta.apartadoId) ? meta.apartadoId : undefined },
      );

      const notas = [
        avisoCupo,
        `${origen === "conciliacion" ? "Reserva registrada por la conciliación de pagos" : "Reserva registrada automáticamente por webhook"} — el cliente no completó la pantalla de confirmación.`,
        locale === "en" ? "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio." : "",
        // Lo PIDIÓ, que no es lo mismo que haber comprado desde /en.
        meta.idiomaTour === "en" ? "🗣️ PIDIÓ GUÍA EN INGLÉS (sin costo): asignar guía bilingüe o avisarle antes por WhatsApp." : "",
        meta.addOns    ? `ACTIVIDAD EXTRA CONTRATADA: ${meta.addOns}` : "",
        meta.viajeroSolo ? `BAJO EL MÍNIMO (${meta.viajeroSolo}): pagó tarifa normal. Sumarlo a una salida compartida y confirmarle ${CONFIRMA_SALIDA_DIAS} días antes; si no se junta, REEMBOLSO del 100 %.` : "",
        meta.hospedaje ? `Hospedaje: ${meta.hospedaje}` : "",
        meta.traslado  ? `TRASLADO: ${meta.traslado}. Falta acordar hora y domicilio de recogida.` : "",
        // Ruta Surrealista desde Ciudad Valles (+$400 por reserva): ya va dentro
        // del subtotal del renglón; aquí, para que el equipo sepa ir por él allá.
        Number(meta.cargoValles) > 0 ? `🚐 SE HOSPEDA EN CIUDAD VALLES: traslado cobrado +$${Number(meta.cargoValles).toLocaleString("es-MX")}.` : "",
        // Eventos de Xantolo (4 oct 2026): lo que se opera esa noche y, en la
        // noche sin hotel, dónde pasar por el cliente.
        meta.recogida   ? `RECOGER EN: ${meta.recogida}` : "",
        meta.notaEquipo ? meta.notaEquipo : "",
      ].filter(Boolean).join(" | ");

      const creada = await prisma.tourBooking.create({
        data: {
          confirmationNumber,
          tourId:                meta.tourId,
          tourName:              meta.tourName || "Tour Huasteca",
          tourSlug:              meta.tourSlug || "",
          tourDate:              meta.tourDate || "",
          adults:                Number(meta.adults) || 1,
          children:              Number(meta.children) || 0,
          totalAmount,
          depositoPagado:        cobrado, // lo realmente cobrado (100% en tours, parcial en paquetes)
          stripePaymentIntentId: pi.id,
          customerName:          meta.customerName || "Pendiente (vía webhook)",
          customerEmail:         emailValido ? clienteEmail : "pendiente@desconocido",
          customerPhone:         meta.customerPhone || null,
          notes:                 notas,
          lineItems:             [...lineas, { _meta: true, locale, ...(meta.zonaHospedaje ? { zonaHospedaje: meta.zonaHospedaje } : {}) }],
          packageItems:          hotel?.habitacion
            ? [{
                hotel:        "Hotel Paraíso Encantado",
                habitacion:   hotel.habitacion,
                noches:       Number(hotel.noches) || 0,
                habitaciones: String(hotel.habitacion).split(" + ").length,
                checkin:      hotel.checkin  || "",
                checkout:     hotel.checkout || "",
                subtotal:     Number(hotel.total) || 0,
              }]
            : undefined,
          // El idioma del GUÍA, de la metadata que escribió el servidor al
          // crear el cobro. Mismo valor que escribe `send-confirmation`: si
          // solo uno de los dos lo pusiera, la mitad de las reservas —las de
          // la pestaña cerrada— perderían el dato.
          idiomaTour:            meta.idiomaTour === "en" ? "en" : "es",
          // Con saldo es «pending», como en el panel: un anticipo marcado
          // «paid» salía de la lista de pendientes.
          status:                cobrado >= totalAmount ? "paid" : "pending",
        },
      });

      folioParaGA4 = confirmationNumber;

      // Ya pagó: que el cron de carritos deje de escribirle «olvidaste tu…».
      if (emailValido) {
        await cerrarCarritosDe(clienteEmail, lineas.length ? lineas : [{ tourSlug: meta.tourSlug, tourDate: meta.tourDate }]);
      }

      // Renglón de cobro para el desglose del corte (ver `cobros.ts`).
      if (cobrado > 0) {
        await registrarCobroSilencioso({
          reservaId: creada.id, monto: cobrado, metodo: "stripe",
          nota: "Pago en línea recuperado por el webhook", sinRescate: true,
        });
      }

      await registrarEnBitacora({
        accion:     "creó",
        entidad:    "reserva",
        referencia: confirmationNumber,
        resumen:    `Reserva ${confirmationNumber} — ${meta.customerName || "cliente sin nombre"}, ${meta.tourName || "Tour Huasteca"} el ${meta.tourDate || "sin fecha"}, ${pesos(totalAmount)} (pago en línea, recuperada ${origen === "conciliacion" ? "por la conciliación" : "por el webhook"})`,
        actor:      SISTEMA,
      });

      logger.info("stripe_webhook_booking_recovered", {
        payment_intent: pi.id,
        confirmation: confirmationNumber,
      });

      const quienes = [
        `${Number(meta.adults) || 1} adulto${(Number(meta.adults) || 1) > 1 ? "s" : ""}`,
        Number(meta.children) ? `${Number(meta.children)} niño${Number(meta.children) > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      actividad(
        "⚠️  RESERVÓ (recuperada por webhook)",
        nombreCorto(meta.tourName || meta.tourId),
        quienes,
        mxn(totalAmount),
        meta.customerName,
        emailValido ? clienteEmail : undefined,
        meta.tourDate,
        confirmationNumber,
        "el cliente no completó la pantalla",
      );

      // El cliente cerró la pestaña tras pagar: le enviamos IGUAL su
      // confirmación (antes solo se avisaba al admin y el cliente se quedaba
      // sin correo ni número de reserva).
      if (emailValido) {
        try {
          const html = buildTourEmailHtml({
            customerName:  meta.customerName || "",
            confirmationNumber,
            paymentIntentId: pi.id,
            tourName:      meta.tourName || "Tour Huasteca",
            tourDate:      meta.tourDate || "",
            // Con carrito, `tourSlug` es solo el del PRIMER recorrido: se
            // deja vacío para que el correo lea el itinerario de `lineItems`
            // y no titule el viaje entero con un solo tour.
            tourSlug:      lineas.length > 1 ? "" : (meta.tourSlug || ""),
            adults:        Number(meta.adults) || 1,
            children:      Number(meta.children) || 0,
            totalAmount,
            depositoPagado: cobrado, // muestra saldo pendiente si fue anticipo
            promoDiscount: 0,
            // El itinerario completo y el hotel, para que el cliente que
            // cerró la pestaña reciba la misma confirmación que los demás.
            lineItems:     lineas.length ? lineas : undefined,
            packageItems:  hotel?.habitacion
              ? [{
                  hotel:        "Hotel Paraíso Encantado",
                  habitacion:   hotel.habitacion,
                  noches:       Number(hotel.noches) || 0,
                  habitaciones: String(hotel.habitacion).split(" + ").length,
                  checkin:      hotel.checkin  || "",
                  checkout:     hotel.checkout || "",
                  subtotal:     Number(hotel.total) || 0,
                }]
              : undefined,
            locale,
            // Lo mismo que se acaba de guardar en la reserva.
            idiomaTour:    meta.idiomaTour === "en" ? "en" : "es",
          });
          await sendBrevoEmail({
            to:  [{ email: clienteEmail, name: meta.customerName || undefined }],
            bcc: process.env.ADMIN_EMAIL_TOURS ? [{ email: process.env.ADMIN_EMAIL_TOURS }] : undefined,
            subject: `Tu tour está confirmado — ${confirmationNumber}`,
            htmlContent: html,
          });
          actividad("📧  CORREO ENVIADO (recuperado)", nombreCorto(meta.tourName || ""), clienteEmail, confirmationNumber);
        } catch (e) {
          logger.error("stripe_webhook_customer_email_failed", { reason: e instanceof Error ? e.message : "unknown" });
        }
      }

      // Solo si NO pudimos enviarle al cliente su confirmación, avisamos al
      // admin para seguimiento manual (si sí se envió, el admin ya va en BCC).
      const adminTo = process.env.ADMIN_EMAIL_TOURS;
      if (adminTo && !emailValido) {
        try {
          const aviso = buildAvisoPagoIncompletoHtml({
            confirmationNumber,
            tourName:      meta.tourName || meta.tourId || "",
            tourDate:      meta.tourDate || "",
            totalAmount,
            paymentIntent: pi.id,
            receiptEmail:  pi.receipt_email || "",
          });
          await sendBrevoEmail({
            to: [{ email: adminTo }],
            subject: aviso.subject,
            htmlContent: aviso.html,
          });
        } catch (e) {
          logger.error("stripe_webhook_admin_alert_failed", {
            reason: e instanceof Error ? e.message : "unknown",
          });
        }
      }
    }

    // La reserva ya existe (la de aquí o la de `send-confirmation`): se
    // suelta el apartado de 15 minutos del carrito (`lib/apartadosAlmacen.ts`).
    // Si se cerró la pestaña, nadie más lo haría y estorbaría hasta vencer.
    if (esIdApartado(meta.apartadoId)) await liberarApartado(meta.apartadoId);

    // ── La venta, contada desde el servidor ─────────────────────────────
    // Va FUERA del `if (!existing)`: ahí dentro solo están las reservas que
    // hubo que recuperar porque el cliente cerró la pestaña —la minoría—, y
    // lo que falta medir es el total. Aquí llegan las dos ramas.
    //
    // Con la reserva ya creada por el navegador, éste manda el mismo
    // `transaction_id` y GA4 se queda con una sola: es deduplicación, no
    // doble conteo.
    const lineasGA4 = reconstruirLineas(meta);
    // En cada artículo `price` es el de UNA persona y `quantity` cuántas:
    // GA4 saca el ingreso del recorrido multiplicando los dos. Con el
    // subtotal entero en `price`, una reserva de $3,000 para 4 salía como
    // $12,000 de ese tour. A centavos, igual que el navegador.
    const porPersona = (total: number, personas: number) => Math.round((total / personas) * 100) / 100;
    const personasSuelto = (Number(meta.adults) || 1) + (Number(meta.children) || 0);
    // El `item_id` tiene que ser el MISMO en todo el embudo: `view_item` y
    // `add_to_cart` mandan el id del tour (`tour-tamul`), no su slug. Con el
    // slug aquí, GA4 veía dos productos distintos y el embudo por recorrido
    // no cuadraba.
    const idGA4 = (slug?: string, respaldo?: string) =>
      (slug && TOURS_DB.find((t) => t.slug === slug)?.id) || respaldo || slug || "tour";
    await enviarCompraGA4({
      transactionId: folioParaGA4 || pi.id,
      clientId:      meta.gaClientId || null,
      value:         Math.round((pi.amount_received || pi.amount) / 100),
      paymentPlan:   Number(meta.pctPagado) || undefined,
      hasHotel:      !!meta.hospedaje,
      hasTransfer:   !!meta.traslado,
      reservaTotal:  Number(meta.totalCompleto) || undefined,
      items: lineasGA4.length
        ? lineasGA4.map((l) => {
            const personas = (l.adults ?? 0) + (l.children ?? 0) || 1;
            return {
              item_id:   idGA4(l.tourSlug || meta.tourSlug, meta.tourId),
              item_name: l.tourName,
              price:     porPersona(l.subtotal ?? 0, personas),
              quantity:  personas,
            };
          })
        // Tour suelto: la metadata no trae `items`, los datos van planos.
        : [{
            item_id:   idGA4(meta.tourSlug, meta.tourId),
            item_name: meta.tourName || "Tour Huasteca",
            price:     porPersona(Number(meta.totalCompleto) || Math.round((pi.amount_received || pi.amount) / 100), personasSuelto),
            quantity:  personasSuelto,
          }],
    });
    return existing ? "ya-existia" : "creada";
  } catch (e) {
    // P2002 = la pantalla registró la reserva en el mismo instante (carrera
    // normal): el @unique impidió la doble fila y quien la creó mandó el correo.
    if ((e as { code?: string })?.code === "P2002") return "ya-existia";
    // Cualquier otro error deja el pago SIN reserva: la conciliación lo vuelve
    // a intentar en su siguiente corrida.
    logger.error("stripe_webhook_booking_recovery_failed", {
      payment_intent: pi.id,
      origen,
      reason: e instanceof Error ? e.message : "unknown",
    });
    return "error";
  }
}
