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
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { registrarCobroSilencioso } from "@/lib/admin/cobros";
import { registrarEnBitacora, SISTEMA, pesos } from "@/lib/admin/bitacora";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildAvisoPagoIncompletoHtml } from "@/lib/avisoCarritoGrande";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { logger, actividad, mxn, nombreCorto, nombreParaLog } from "@/lib/logger";
import { reconstruirLineas } from "@/lib/webhookRecuperacion";
import { armarReservaWeb } from "@/lib/reservaWeb";
import { enviarCompraGA4 } from "@/lib/ga4Server";
import { pagoDelEquipo } from "@/lib/equipoInterno";
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

/**
 * Quién pagó, con lo que trae la metadata y, si falta algo, con lo que el
 * cliente escribió en la tarjeta (`billing_details` del cargo). 🔴 Antes solo
 * se miraba el cargo para el correo: una reserva recuperada quedaba sin
 * nombre ni teléfono aunque Stripe los tuviera (lote 5, 5 nov 2026). Sin
 * teléfono, la Bandeja no la enlaza con su chat y le abre otro lead.
 */
async function quienPago(pi: Stripe.PaymentIntent, telefonoMeta: string | null) {
  const meta = pi.metadata ?? {};
  let email = meta.customerEmail || pi.receipt_email || "";
  let nombre = meta.customerName || "";
  let telefono = telefonoMeta;
  if ((!email || !nombre || !telefono) && pi.latest_charge) {
    try {
      const charge = typeof pi.latest_charge === "string" ? await stripe.charges.retrieve(pi.latest_charge) : pi.latest_charge;
      if (!email) email = charge.billing_details?.email || charge.receipt_email || "";
      if (!nombre) nombre = charge.billing_details?.name || "";
      if (!telefono) telefono = charge.billing_details?.phone || null;
    } catch { /* si no se puede leer el cargo, se sigue con lo que hay */ }
  }
  return { email, emailValido: EMAIL_RE.test(email), nombre, telefono };
}

/** El paquete, con el armado de la pantalla. Devuelve el folio, o null si falló. */
async function recuperarPaquete(pi: Stripe.PaymentIntent, origen: "webhook" | "conciliacion"): Promise<string | null> {
  const meta = pi.metadata ?? {};
  const { email, emailValido, nombre, telefono } = await quienPago(pi, (meta.customerPhone || "").trim() || null);

  const r = await registrarReservaPaquete(
    pi,
    {
      email:        emailValido ? email : "",
      customerName: nombre || "Pendiente (vía webhook)",
      customerPhone: telefono,
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
    resumen:    `Reserva ${r.confirmationNumber} — ${nombre || "cliente sin nombre"}, ${meta.tourName || "paquete"}, ${pesos(r.totalFull)} (pago en línea, recuperada ${origen === "conciliacion" ? "por la conciliación" : "por el webhook"})`,
    actor:      SISTEMA,
  });
  actividad("⚠️  RESERVÓ PAQUETE (recuperada)", nombreCorto(meta.tourName || meta.tourId), mxn(r.totalFull), nombreParaLog(nombre), emailValido ? email : undefined, r.confirmationNumber, "el cliente no completó la pantalla");

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
      const confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

      // ── Reconstrucción del pedido ────────────────────────────────────
      // 🔴 Con la MISMA función que la pantalla de confirmación (lote 5, 5 nov
      // 2026): recorridos con su elección, actividades y Valles, el grupo (no
      // la suma por recorrido), el traslado y el hotel con su importe. Antes
      // la misma compra quedaba distinta según quién creara la reserva.
      const r = armarReservaWeb(meta, cobrado);
      const totalAmount = r.totalAmount;
      const locale = r.locale;

      // Quién es: metadata → `billing_details` del cargo (el cliente lo
      // escribió al confirmar el pago aunque no completara la pantalla). Así
      // podemos enviarle su confirmación.
      const { email: clienteEmail, emailValido, nombre, telefono } = await quienPago(pi, r.telefono);

      // ¿Cabía? Ya pagó: entra igual, marcada (`lib/sobrecupo.ts`).
      const avisoCupo = await revisarSobrecupo(
        r.lineas.length ? r.lineas : [{ tourSlug: r.tourSlug, tourDate: r.tourDate, adults: r.adults, children: r.children }],
        { folio: confirmationNumber, cliente: nombre || "cliente sin nombre", excluirApartado: esIdApartado(meta.apartadoId) ? meta.apartadoId : undefined },
      );

      const notas = [
        avisoCupo,
        `${origen === "conciliacion" ? "Reserva registrada por la conciliación de pagos" : "Reserva registrada automáticamente por webhook"} — el cliente no completó la pantalla de confirmación.`,
        ...r.notasEquipo,
      ].filter(Boolean).join(" | ");

      const creada = await prisma.tourBooking.create({
        data: {
          confirmationNumber,
          tourId:                r.tourId,
          tourName:              r.tourName,
          tourSlug:              r.tourSlug,
          tourDate:              r.tourDate,
          adults:                r.adults,
          children:              r.children,
          totalAmount,
          depositoPagado:        cobrado, // lo realmente cobrado (100% en tours, parcial en paquetes)
          promoCode:             r.promoCode,
          promoDiscount:         r.promoDiscount,
          stripePaymentIntentId: pi.id,
          customerName:          nombre || "Pendiente (vía webhook)",
          customerEmail:         emailValido ? clienteEmail : "pendiente@desconocido",
          customerPhone:         telefono,
          notes:                 notas,
          lineItems:             [...r.lineas, r.meta] as never,
          packageItems:          (r.packageItems ?? undefined) as never,
          // El idioma del GUÍA, de la metadata que escribió el servidor al
          // crear el cobro. Mismo valor que escribe `send-confirmation`: si
          // solo uno de los dos lo pusiera, la mitad de las reservas —las de
          // la pestaña cerrada— perderían el dato.
          idiomaTour:            r.idiomaTour,
          // Con saldo es «pending», como en el panel: un anticipo marcado
          // «paid» salía de la lista de pendientes.
          status:                cobrado >= totalAmount ? "paid" : "pending",
        },
      });

      folioParaGA4 = confirmationNumber;

      // Ya pagó: que el cron de carritos deje de escribirle «olvidaste tu…».
      if (emailValido) {
        await cerrarCarritosDe(clienteEmail, r.lineas.length ? r.lineas : [{ tourSlug: r.tourSlug, tourDate: r.tourDate }]);
      }

      // Renglón de cobro para el desglose del corte (ver `cobros.ts`).
      if (cobrado > 0) {
        await registrarCobroSilencioso({
          reservaId: creada.id, monto: cobrado, metodo: "stripe",
          nota: "Pago en línea recuperado por el webhook", sinRescate: true,
        });
        // Al CRM (revisión del 4 nov 2026): la reserva de la web también es un lead, enlazado al de esa persona o uno nuevo. No lanza.
        await import("@/lib/admin/crmDatos").then(m => m.leadParaReservaSinLead(creada.id, "Web")).catch(() => {});
      }

      await registrarEnBitacora({
        accion:     "creó",
        entidad:    "reserva",
        referencia: confirmationNumber,
        resumen:    `Reserva ${confirmationNumber} — ${nombre || "cliente sin nombre"}, ${r.tourName} el ${r.tourDate || "sin fecha"}, ${pesos(totalAmount)} (pago en línea, recuperada ${origen === "conciliacion" ? "por la conciliación" : "por el webhook"})`,
        actor:      SISTEMA,
      });

      logger.info("stripe_webhook_booking_recovered", {
        payment_intent: pi.id,
        confirmation: confirmationNumber,
      });

      const quienes = [
        `${r.adults} adulto${r.adults > 1 ? "s" : ""}`,
        r.children ? `${r.children} niño${r.children > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      actividad(
        "⚠️  RESERVÓ (recuperada por webhook)",
        nombreCorto(meta.tourName || meta.tourId),
        quienes,
        mxn(totalAmount),
        nombreParaLog(nombre),
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
            customerName:  nombre,
            confirmationNumber,
            paymentIntentId: pi.id,
            tourName:      r.tourName,
            tourDate:      r.tourDate,
            // Con carrito, `tourSlug` es solo el del PRIMER recorrido: se
            // deja vacío para que el correo lea el itinerario de `lineItems`
            // y no titule el viaje entero con un solo tour.
            tourSlug:      r.lineas.length > 1 ? "" : r.tourSlug,
            adults:        r.adults,
            children:      r.children,
            totalAmount,
            depositoPagado: cobrado, // muestra saldo pendiente si fue anticipo
            promoCode:     r.promoCode ?? undefined,
            promoDiscount: r.promoDiscount,
            // Dónde pasar por él, como en el correo de la pantalla.
            pickupLugar:   r.recogida || undefined,
            // El itinerario completo y el hotel, para que el cliente que
            // cerró la pestaña reciba la misma confirmación que los demás.
            lineItems:     r.lineas.length ? r.lineas : undefined,
            packageItems:  r.packageItems,
            locale,
            // Lo mismo que se acaba de guardar en la reserva.
            idiomaTour:    r.idiomaTour,
          });
          await sendBrevoEmail({
            to:  [{ email: clienteEmail, name: nombre || undefined }],
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
      interno:       pagoDelEquipo(meta),
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
