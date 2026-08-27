import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailDeToken } from "@/lib/baja";
import { ESTADOS_VIVOS } from "@/lib/cartFollowUp";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/baja  ·  { t: "<token>" }
 *
 * Da de baja TODAS las suscripciones de ese correo, no solo la fuente por la
 * que llegó: quien pide dejar de recibir correos no está distinguiendo entre el
 * recomendador y el blog, y volver a escribirle desde otra fuente es
 * exactamente lo que hace que marquen spam.
 *
 * No toca las reservas ni las cotizaciones: una confirmación de compra no es
 * marketing y se sigue mandando.
 */
export async function POST(req: NextRequest) {
  let token = "";
  try {
    token = String((await req.json())?.t ?? "");
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const email = emailDeToken(token);
  if (!email) {
    return NextResponse.json({ error: "Este enlace no es válido." }, { status: 400 });
  }

  try {
    /**
     * La baja apaga las TRES fuentes de correo automático, no solo la lista.
     *
     * ⚠️ Con solo `Lead` la baja era mentira: los recordatorios de carrito
     * salen de `AbandonedCart` y el seguimiento de cotizaciones de `TourQuote`,
     * cada uno con su propio cron. La persona pulsaba "darme de baja", veía
     * "listo" y al día siguiente le llegaba otro correo — que es peor que no
     * haber puesto el enlace.
     *
     * Lo que NO se toca: las reservas. Una confirmación de compra no es
     * publicidad y se sigue mandando.
     */
    const [leads, carritos, cotizaciones] = await prisma.$transaction([
      prisma.lead.updateMany({
        where: { email, status: { not: "baja" } },
        data:  { status: "baja" },
      }),
      // "baja" no está en `ESTADOS_VIVOS` de `cartFollowUp`, así que el cron
      // deja de verlos por construcción, sin un `if` que alguien pueda olvidar.
      prisma.abandonedCart.updateMany({
        where: { customerEmail: email, status: { in: [...ESTADOS_VIVOS] } },
        data:  { status: "baja" },
      }),
      prisma.tourQuote.updateMany({
        where: { customerEmail: email, status: "enviada" },
        data:  { status: "expirada" },
      }),
    ]);

    actividad(
      "🚪  BAJA", email,
      `${leads.count} lista`,
      `${carritos.count} carrito(s)`,
      `${cotizaciones.count} cotización(es)`,
    );
    // Los contadores pueden venir en 0 si ya estaba dado de baja: para la
    // persona el resultado es el mismo y no tiene por qué ver un error.
    return NextResponse.json({ ok: true, email });
  } catch (e) {
    logger.error("baja_failed", { reason: e instanceof Error ? e.message : "desconocido" });
    return NextResponse.json({ error: "No se pudo procesar. Intenta de nuevo." }, { status: 500 });
  }
}
