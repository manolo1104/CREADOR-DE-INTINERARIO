import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { marcarLinkPagado } from "@/lib/admin/linksPago";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildGuiaEmailHtml } from "@/lib/guiaEmail";
import { logger, actividad, mxn, nombreCorto } from "@/lib/logger";
import { recuperarPago, esPagoDeTours, ESPERA_WEBHOOK_MS } from "@/lib/recuperarPago";
import { esPagoDelViaje } from "@/lib/viajeCdmx/confirmar";
import { manejarEventoViaje } from "@/lib/viajeCdmx/webhook";
import type Stripe from "stripe";

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

  // ── Viaje mensual CDMX–Xilitla ────────────────────────────────────────────
  // Va PRIMERO y se espera: si algo falla, 500 y Stripe reintenta. Sin los 90 s
  // de espera de los tours: su reserva se arma con el apartado que guardó el
  // servidor, la pantalla no le añade nada. Ver `lib/viajeCdmx/webhook.ts`.
  if (event.type.startsWith("payment_intent.")) {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (esPagoDelViaje(pi)) {
      try {
        await manejarEventoViaje(event.type, pi);
      } catch (e: unknown) {
        logger.error("viaje_cdmx_webhook_fallo", { tipo: event.type, payment_intent: pi.id, reason: e instanceof Error ? e.message : String(e) });
        return NextResponse.json({ error: "viaje-cdmx" }, { status: 500 });
      }
      return NextResponse.json({ received: true });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    logger.info("stripe_webhook_payment_succeeded", {
      session_id: session.id,
      payment_status: session.payment_status,
    });

    // ── Cobro por liga creada desde el panel ──────────────────────────────
    // La liga vive en Stripe; aquí se marca como pagada para que el panel lo
    // diga sin tener que preguntarle a Stripe. Si el cobro era el saldo de una
    // reserva, se le abona a ESA reserva y su saldo pendiente baja solo.
    if (session.payment_link && session.payment_status === "paid") {
      try {
        await marcarLinkPagado(
          String(session.payment_link),
          session.id,
          Math.round((session.amount_total ?? 0) / 100),
          session.customer_details?.email || session.customer_email || null,
        );
      } catch (e) {
        // Un fallo aquí no puede tumbar el webhook: Stripe reintentaría y el
        // resto de los avisos (correos, reservas) se mandarían dos veces.
        logger.error("link_pago_webhook_failed", {
          reason: e instanceof Error ? e.message : "desconocido",
          payment_link: String(session.payment_link),
        });
      }
    }

    // ── Entrega de la "Guía Definitiva" (infoproducto) por correo ──────────────
    // El webhook es la fuente de verdad: el correo llega aunque el cliente cierre
    // la pestaña tras pagar. El link sigue protegido por verificación de pago.
    const meta = session.metadata ?? {};
    if (meta.producto === "guia_pdf" && session.payment_status === "paid") {
      const email = session.customer_details?.email || session.customer_email || undefined;
      actividad("💰  GUÍA PDF PAGADA", mxn((session.amount_total ?? 0) / 100), email);

      if (email) {
        try {
          const { subject, html } = buildGuiaEmailHtml({
            sessionId: session.id,
            appUrl: process.env.APP_URL,
          });
          await sendBrevoEmail({
            to: [{ email }],
            bcc: process.env.ADMIN_EMAIL_TOURS ? [{ email: process.env.ADMIN_EMAIL_TOURS }] : undefined,
            subject,
            htmlContent: html,
          });
          logger.info("guia_email_sent", { session_id: session.id });
        } catch (e) {
          logger.error("guia_email_failed", { reason: e instanceof Error ? e.message : "unknown" });
        }
      } else {
        logger.warn("guia_email_no_address", { session_id: session.id });
      }
    }

    // ── Inscripción al curso "Turismo con IA" ─────────────────────────────────
    // El webhook es la fuente de verdad de la compra: marca el lead como alumno
    // y manda la bienvenida (C1) con el calendario adjunto. La condición del
    // correo no es "acabo de marcar la compra" sino "no se le ha mandado C1",
    // reclamada de forma atómica: el cron mira exactamente lo mismo y sin esa
    // guarda la bienvenida podría salir dos veces.
    if (meta.producto === "curso_ia" && session.payment_status === "paid") {
      const email = (session.customer_details?.email || session.customer_email || "")
        .trim().toLowerCase();
      actividad("🎓  INSCRIPCIÓN CURSO", mxn((session.amount_total ?? 0) / 100), email);

      if (email) {
        try {
          const alumno = await prisma.cursoLead.upsert({
            where: { email },
            create: {
              email,
              nombre: meta.nombre || session.customer_details?.name || null,
              whatsapp: meta.whatsapp || null,
              origen: "checkout",
              compro: true,
              comproAt: new Date(),
              montoMxn: Math.round((session.amount_total ?? 0) / 100),
              stripeSessionId: session.id,
            },
            update: {
              compro: true,
              comproAt: new Date(),
              montoMxn: Math.round((session.amount_total ?? 0) / 100),
              stripeSessionId: session.id,
              status: "activo",
              ...(meta.nombre ? { nombre: meta.nombre } : {}),
              ...(meta.whatsapp ? { whatsapp: meta.whatsapp } : {}),
            },
          });

          const claim = await prisma.cursoLead.updateMany({
            where: { id: alumno.id, NOT: { correosEnviados: { has: "C1" } } },
            data: { correosEnviados: { push: "C1" } },
          });

          if (claim.count === 1) {
            try {
              const { correoPorId, REMITENTE_CURSO } = await import("@/lib/cursoEmail");
              const { buildCalendarioIcs } = await import("@/lib/curso");
              const pagados = await prisma.cursoLead.count({ where: { compro: true } });
              const { subject, html } = correoPorId("C1")!.build({
                lead: alumno, ahora: new Date(), pagados,
              });
              await sendBrevoEmail({
                to: [{ email, name: alumno.nombre ?? undefined }],
                bcc: process.env.ADMIN_EMAIL_TOURS ? [{ email: process.env.ADMIN_EMAIL_TOURS }] : undefined,
                subject,
                htmlContent: html,
                senderName: REMITENTE_CURSO,
                attachments: [{
                  name: "curso-turismo-con-ia.ics",
                  content: Buffer.from(buildCalendarioIcs()).toString("base64"),
                }],
              });
              logger.info("curso_bienvenida_sent", { session_id: session.id });
            } catch (e) {
              // Despojar el C1 reclamado: así el cron sí lo repesca.
              await prisma.cursoLead.update({
                where: { id: alumno.id },
                data: { correosEnviados: { set: alumno.correosEnviados.filter((c) => c !== "C1") } },
              }).catch(() => {});
              throw e;
            }
          }
        } catch (e) {
          // El cron repesca C1 en su siguiente corrida (due: siempre).
          logger.error("curso_bienvenida_failed", {
            reason: e instanceof Error ? e.message : "unknown",
          });
        }
      } else {
        logger.warn("curso_sin_email", { session_id: session.id });
      }
    }
  }

  // ── Red de seguridad para reservas de tour ────────────────────────────────
  // Si el cliente paga pero no llega a la pantalla de confirmación, la reserva
  // se arma en `lib/recuperarPago.ts`. 🔴 Se espera `ESPERA_WEBHOOK_MS` antes:
  // el webhook llegaba a la vez que la pantalla, le ganaba la carrera y guardaba
  // una reserva pobre (un paquete como tour suelto) con correo doble. El
  // servidor es un proceso largo (Railway), así que el temporizador sobrevive a
  // la respuesta; si un reinicio lo corta, la conciliación (`/api/cron/
  // conciliar-pagos`) recoge ese pago en su siguiente corrida.
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    if (esPagoDeTours(pi)) {
      setTimeout(() => {
        recuperarPago(pi, "webhook").catch((e: unknown) =>
          logger.error("stripe_webhook_booking_recovery_failed", { payment_intent: pi.id, reason: e instanceof Error ? e.message : "unknown" }));
      }, ESPERA_WEBHOOK_MS);
    }
  }

  // ── Pagos que SÍ se intentaron y fallaron ─────────────────────────────────
  // Antes esto no existía: si al cliente le rechazaban la tarjeta, el motivo
  // moría en su pantalla y aquí nunca nos enterábamos. Este log es la única
  // forma de distinguir "no quiso pagar" de "no pudo pagar".
  // Solo los de este sitio: la cuenta de Stripe se comparte con Kora y sus
  // pagos fallidos salían aquí como «❌ PAGO FALLIDO» de un tour.
  if (event.type === "payment_intent.payment_failed" && esPagoDeTours(event.data.object)) {
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
