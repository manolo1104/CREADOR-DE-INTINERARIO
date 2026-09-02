import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { logger, actividad } from "@/lib/logger";
import { PRECIOS, inscripcionesAbiertas, precioVigente } from "@/lib/curso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/curso/checkout — crea la sesión de pago del curso "Turismo con IA".
 *
 * El precio lo decide EL SERVIDOR con `precioVigente()` (fundador hasta el
 * 8 sep 23:59 CDMX o 15 pagados, lo que ocurra primero); el cliente no manda
 * ningún monto. El cupo también se comprueba aquí: con 25 pagados no se crean
 * más sesiones.
 *
 * Antes de redirigir a Stripe se marca `checkoutIniciadoAt` en el lead — de
 * ahí se alimenta la secuencia B (recuperación) del cron.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("curso_checkout_error", { reason: "STRIPE_SECRET_KEY missing" });
    return NextResponse.json({ error: "Pagos no disponibles temporalmente." }, { status: 503 });
  }

  const limited = rateLimit(req, { key: "curso-checkout", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const nombre = String(body.nombre ?? "").trim().slice(0, 120) || null;
    const whatsapp = String(body.whatsapp ?? "").trim().slice(0, 30) || null;

    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Revisa tu correo electrónico." }, { status: 400 });
    }

    const ahora = new Date();
    const pagados = await prisma.cursoLead.count({ where: { compro: true } });

    if (!inscripcionesAbiertas(ahora, pagados)) {
      return NextResponse.json(
        {
          error:
            pagados >= PRECIOS.cupoTotal
              ? "El cupo de la cohorte está lleno. Déjanos tu correo y te avisamos de la siguiente."
              : "Las inscripciones de esta cohorte ya cerraron. Déjanos tu correo y te avisamos de la siguiente.",
        },
        { status: 409 }
      );
    }

    const pv = precioVigente(ahora, pagados);

    // Registrar la intención ANTES de crear la sesión: si la persona abandona
    // el pago, la secuencia B la retoma a la hora.
    await prisma.cursoLead.upsert({
      where: { email },
      create: {
        email,
        nombre,
        whatsapp,
        origen: "checkout",
        checkoutIniciadoAt: ahora,
      },
      update: {
        ...(nombre ? { nombre } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        checkoutIniciadoAt: ahora,
        status: "activo",
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      locale: "es",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: "Curso Turismo con IA — Cohorte 1",
              description: pv.esFundador
                ? "Precio de fundador · 4 semanas · inicia 15 de septiembre de 2026"
                : "4 semanas · inicia 15 de septiembre de 2026",
            },
            unit_amount: pv.precio * 100,
          },
          quantity: 1,
        },
      ],
      // Meses sin intereses (México). Requiere MSI activado en el dashboard.
      payment_method_options: { card: { installments: { enabled: true } } },
      customer_email: email,
      allow_promotion_codes: true,
      metadata: {
        producto: "curso_ia",
        cohorte: "C1",
        precio_tipo: pv.esFundador ? "fundador" : "regular",
        ...(nombre ? { nombre } : {}),
        ...(whatsapp ? { whatsapp } : {}),
      },
      success_url: `${appUrl}/curso/bienvenido?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/curso#inversion`,
    });

    actividad("🎓  CHECKOUT CURSO", pv.esFundador ? "fundador" : "regular", email);
    logger.info("curso_checkout_created", { precio: pv.precio, fundador: pv.esFundador });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    logger.error("curso_checkout_error", { reason: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: "No pudimos iniciar el pago. Intenta de nuevo." }, { status: 500 });
  }
}
