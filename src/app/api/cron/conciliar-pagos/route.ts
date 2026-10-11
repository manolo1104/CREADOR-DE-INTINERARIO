import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { actividad, logger } from "@/lib/logger";
import { esPagoDeTours, recuperarPago } from "@/lib/recuperarPago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Hasta dónde mira hacia atrás. Tres días cubren un fin de semana sin cron. */
const HORAS_ATRAS = 72;
/**
 * Un pago más reciente que esto se deja en paz: la pantalla de confirmación y
 * el webhook (que espera 90 s) todavía pueden estar creando su reserva.
 */
const MINUTOS_DE_GRACIA = 10;

// POST /api/cron/conciliar-pagos  (11 oct 2026)
// Busca en Stripe los cobros de este sitio que se pagaron y que NO tienen
// reserva, y la crea (`lib/recuperarPago.ts`). Es la red de seguridad del
// webhook: si el servidor se reinicia en los 90 s que espera, o si la base
// falla al guardar, el dinero entró y nadie lo ve en el panel. Con `?dry=1`
// solo cuenta, sin crear nada.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub
// Actions, ANTES de los recordatorios de carrito: así quien ya pagó no recibe
// un «olvidaste tu reserva».
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const ahora = Math.floor(Date.now() / 1000);
  const desde = ahora - HORAS_ATRAS * 3600;
  const hasta = ahora - MINUTOS_DE_GRACIA * 60;

  // `created` del PaymentIntent es cuando se ABRIÓ el pago, no cuando se pagó:
  // la gracia se mide con el cargo, que trae la hora real del cobro.
  const candidatos: Stripe.PaymentIntent[] = [];
  try {
    for await (const pi of stripe.paymentIntents.list({ created: { gte: desde }, limit: 100, expand: ["data.latest_charge"] })) {
      if (pi.status !== "succeeded" || !esPagoDeTours(pi)) continue;
      const cargo = typeof pi.latest_charge === "object" && pi.latest_charge ? pi.latest_charge : null;
      if ((cargo?.created ?? pi.created) > hasta) continue;
      candidatos.push(pi);
      if (candidatos.length >= 200) break;
    }
  } catch (e) {
    logger.error("conciliar_pagos_stripe_failed", { reason: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: "No se pudo leer Stripe" }, { status: 502 });
  }

  const conReserva = new Set(
    (await prisma.tourBooking.findMany({
      where:  { stripePaymentIntentId: { in: candidatos.map((p) => p.id) } },
      select: { stripePaymentIntentId: true },
    })).map((r) => r.stripePaymentIntentId),
  );
  const faltan = candidatos.filter((p) => !conReserva.has(p.id));

  let creadas = 0;
  let errores = 0;
  if (!dry) {
    // Una por una: son pocas y cada una manda su correo.
    for (const pi of faltan) {
      const r = await recuperarPago(pi, "conciliacion");
      if (r === "creada") creadas++;
      if (r === "error") errores++;
    }
  }

  if (faltan.length) {
    actividad(
      "🧾  CONCILIACIÓN DE PAGOS",
      `${candidatos.length} pagos revisados`,
      `${faltan.length} sin reserva`,
      dry ? "solo conteo" : `${creadas} creada(s)`,
      errores ? `${errores} con error` : undefined,
    );
  }

  // Sin correos ni nombres en la respuesta: solo lo necesario para auditar.
  return NextResponse.json({
    revisados: candidatos.length,
    sinReserva: faltan.map((p) => ({ id: p.id, monto: Math.round((p.amount_received || p.amount) / 100) })),
    creadas,
    errores,
    dry,
  });
}
