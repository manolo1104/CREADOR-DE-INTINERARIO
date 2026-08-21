import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { logger, actividad, mxn, nombreCorto } from "@/lib/logger";
import { leerJson, reconstruirLineas } from "@/lib/webhookRecuperacion";

export const runtime = "nodejs";

// Disable body parsing — Stripe requires the raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("stripe_webhook_error", { reason: "STRIPE_WEBHOOK_SECRET not configured" });
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    logger.error("stripe_webhook_signature_error", { reason: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    logger.info("stripe_webhook_payment_succeeded", {
      session_id: session.id,
      payment_status: session.payment_status,
    });

    // ── Entrega de la "Guía Definitiva" (infoproducto) por correo ──────────────
    // El webhook es la fuente de verdad: el correo llega aunque el cliente cierre
    // la pestaña tras pagar. El link sigue protegido por verificación de pago.
    const meta = session.metadata ?? {};
    if (meta.producto === "guia_pdf" && session.payment_status === "paid") {
      const email = session.customer_details?.email || session.customer_email || undefined;
      const appUrl = process.env.APP_URL ?? "https://www.huasteca-potosina.com";
      const downloadUrl = `${appUrl}/guia/descarga?session_id=${session.id}`;
      const tripUrl = `${appUrl}/viaje-septiembre`;
      const toursUrl = `${appUrl}/tours`;

      actividad("💰  GUÍA PDF PAGADA", mxn((session.amount_total ?? 0) / 100), email);

      if (email) {
        try {
          await sendBrevoEmail({
            to: [{ email }],
            bcc: process.env.ADMIN_EMAIL_TOURS ? [{ email: process.env.ADMIN_EMAIL_TOURS }] : undefined,
            subject: "Tu Guía Definitiva de la Huasteca Potosina 🌿 — descárgala aquí",
            htmlContent: `
              <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
                <h1 style="font-size:22px;margin:0 0 8px">¡Gracias por tu compra! 🎉</h1>
                <p style="font-size:15px;line-height:1.6;color:#444">
                  Tu <strong>Guía Definitiva de la Huasteca Potosina 2026</strong> está lista.
                  Descárgala con el botón de abajo (guarda este correo para volver a descargarla cuando quieras):
                </p>
                <p style="text-align:center;margin:28px 0">
                  <a href="${downloadUrl}" style="background:#c4882a;color:#0e1710;text-decoration:none;padding:14px 32px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
                    ↓ Descargar mi guía
                  </a>
                </p>
                <p style="font-size:13px;line-height:1.6;color:#666">
                  Tip: ábrela en tu celular o computadora. Para guardarla como PDF usa
                  <strong>Ctrl/Cmd + P → Guardar como PDF</strong>.
                </p>
                <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0">
                <p style="font-size:15px;line-height:1.6;color:#444;margin-bottom:6px">
                  <strong>¿Y si lo dejas en nuestras manos?</strong>
                </p>
                <p style="font-size:14px;line-height:1.6;color:#555;margin-top:0">
                  Tenemos un <strong>viaje programado de CDMX a la Huasteca (16–19 sep 2026)</strong>: transporte redondo,
                  hospedaje y 3 recorridos guiados, todo incluido, desde $7,900/persona.
                </p>
                <p style="margin:14px 0 4px">
                  <a href="${tripUrl}" style="color:#3a6b1a;font-weight:bold;text-decoration:none">→ Ver el viaje de septiembre</a>
                </p>
                <p style="margin:4px 0 0">
                  <a href="${toursUrl}" style="color:#3a6b1a;font-weight:bold;text-decoration:none">→ Ver todos los tours guiados</a>
                </p>
                <p style="font-size:12px;color:#999;margin-top:28px">
                  Tours Huasteca Potosina · Si tienes cualquier duda, responde a este correo.
                </p>
              </div>`,
          });
          logger.info("guia_email_sent", { session_id: session.id });
        } catch (e) {
          logger.error("guia_email_failed", { reason: e instanceof Error ? e.message : "unknown" });
        }
      } else {
        logger.warn("guia_email_no_address", { session_id: session.id });
      }
    }
  }

  // ── Red de seguridad para reservas de tour ────────────────────────────────
  // Si el cliente paga pero cierra la pestaña antes de llamar a send-confirmation,
  // el pago igual queda registrado aquí (el webhook es la fuente de verdad).
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const meta = pi.metadata ?? {};

    // Solo reservas de tour creadas por /api/tours/create-payment-intent
    if (meta.source === "huasteca-potosina.com" && meta.tourId) {
      try {
        const existing = await prisma.tourBooking.findFirst({
          where: { stripePaymentIntentId: pi.id },
        });

        if (!existing) {
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

          const notas = [
            "Reserva registrada automáticamente por webhook — el cliente no completó la pantalla de confirmación.",
            locale === "en" ? "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio." : "",
            meta.addOns    ? `ACTIVIDAD EXTRA CONTRATADA: ${meta.addOns}` : "",
            meta.hospedaje ? `Hospedaje: ${meta.hospedaje}` : "",
            meta.traslado  ? `TRASLADO: ${meta.traslado}. Falta acordar hora y domicilio de recogida.` : "",
          ].filter(Boolean).join(" | ");

          await prisma.tourBooking.create({
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
              customerPhone:         null,
              notes:                 notas,
              lineItems:             [...lineas, { _meta: true, locale }],
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
              status:                "paid",
            },
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
              await sendBrevoEmail({
                to: [{ email: adminTo }],
                subject: `⚠️ Pago recibido sin confirmación completa — ${confirmationNumber}`,
                htmlContent: `
                  <p>Se recibió un pago de tour pero el cliente no completó la pantalla de confirmación.</p>
                  <ul>
                    <li><strong>Tour:</strong> ${meta.tourName || meta.tourId}</li>
                    <li><strong>Fecha:</strong> ${meta.tourDate || "—"}</li>
                    <li><strong>Monto cobrado:</strong> $${totalAmount.toLocaleString("es-MX")} MXN</li>
                    <li><strong>PaymentIntent:</strong> ${pi.id}</li>
                    <li><strong>Email recibo:</strong> ${pi.receipt_email || "—"}</li>
                  </ul>
                  <p>Revisa Stripe y contacta al cliente para coordinar el tour.</p>`,
              });
            } catch (e) {
              logger.error("stripe_webhook_admin_alert_failed", {
                reason: e instanceof Error ? e.message : "unknown",
              });
            }
          }
        }
      } catch (e) {
        // P2002 = el cliente ya registró la reserva (carrera normal, no es fallo):
        // el @unique en stripePaymentIntentId impidió la doble reserva.
        if ((e as { code?: string })?.code !== "P2002") {
          logger.error("stripe_webhook_booking_recovery_failed", {
            reason: e instanceof Error ? e.message : "unknown",
          });
        }
      }
    }
  }

  // ── Pagos que SÍ se intentaron y fallaron ─────────────────────────────────
  // Antes esto no existía: si al cliente le rechazaban la tarjeta, el motivo
  // moría en su pantalla y aquí nunca nos enterábamos. Este log es la única
  // forma de distinguir "no quiso pagar" de "no pudo pagar".
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const meta = pi.metadata ?? {};
    const err = pi.last_payment_error;
    const motivo = err?.decline_code || err?.code || err?.type || "desconocido";

    actividad(
      "❌  PAGO FALLIDO",
      nombreCorto(meta.tourName || meta.tourId || "tour"),
      mxn(Math.round(pi.amount / 100)),
      motivo,
      err?.message,
      err?.payment_method?.type,
      meta.customerName,
      meta.customerEmail || pi.receipt_email || undefined,
      meta.tourDate,
      pi.id,
    );

    logger.warn("stripe_payment_failed", {
      payment_intent: pi.id,
      tour_slug:      meta.tourSlug || null,
      amount:         Math.round(pi.amount / 100),
      decline_code:   err?.decline_code || null,
      code:           err?.code || null,
      error_type:     err?.type || null,
      pm_type:        err?.payment_method?.type || null,
    });
  }

  return NextResponse.json({ received: true });
}
