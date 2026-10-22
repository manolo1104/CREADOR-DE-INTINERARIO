import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailDeToken } from "@/lib/baja";
import { mismoCorreo, FUENTE_BAJA } from "@/lib/estaDeBaja";
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
    const [leads, carritos, cotizaciones, curso, , cumple] = await prisma.$transaction([
      prisma.lead.updateMany({
        // Sin distinguir mayúsculas: el token lleva el correo en minúsculas y
        // los formularios lo guardan como se escribió («Ana.Lopez@Gmail.com»).
        // Con la búsqueda exacta la baja respondía «listo» y no cambiaba nada.
        where: { email: mismoCorreo(email), status: { not: "baja" } },
        data:  { status: "baja" },
      }),
      // "baja" no está en `ESTADOS_VIVOS` de `cartFollowUp`, así que el cron
      // deja de verlos por construcción, sin un `if` que alguien pueda olvidar.
      prisma.abandonedCart.updateMany({
        where: { customerEmail: mismoCorreo(email), status: { in: [...ESTADOS_VIVOS] } },
        data:  { status: "baja" },
      }),
      prisma.tourQuote.updateMany({
        where: { customerEmail: mismoCorreo(email), status: "enviada" },
        data:  { status: "expirada" },
      }),
      // Curso "Turismo con IA": solo prospectos. A un ALUMNO no se le apagan
      // sus recordatorios de sesión por un enlace viejo de marketing — sus
      // correos de la secuencia C no son publicidad (y por eso no llevan baja).
      prisma.cursoLead.updateMany({
        where: { email: mismoCorreo(email), compro: false, status: { not: "baja" } },
        data:  { status: "baja" },
      }),
      // La marca que la hace DURAR: una fila de lista con fuente «Baja». Quien
      // se daba de baja desde una cotización no tenía ninguna fila «baja» que
      // consultar, y el siguiente formulario lo volvía a inscribir. Ahora
      // `estaDeBaja()` la encuentra siempre.
      prisma.lead.upsert({
        where:  { email_fuente: { email: email.toLowerCase(), fuente: FUENTE_BAJA } },
        create: { email: email.toLowerCase(), fuente: FUENTE_BAJA, status: "baja" },
        update: { status: "baja" },
      }),
      // El regalo de cumpleaños del check-in (21 oct 2026) también es
      // promoción: se apaga la casilla que lo autorizaba. El cron además
      // consulta `estaDeBaja()`, pero el consentimiento tiene que quedar dicho.
      prisma.encuestaReserva.updateMany({
        where: { aceptaPromos: true, booking: { customerEmail: mismoCorreo(email) } },
        data:  { aceptaPromos: false },
      }),
    ]);

    actividad(
      "🚪  BAJA", email,
      `${leads.count} lista`,
      `${carritos.count} carrito(s)`,
      `${cotizaciones.count} cotización(es)`,
      `${curso.count} curso`,
      `${cumple.count} cumpleaños`,
    );
    // Los contadores pueden venir en 0 si ya estaba dado de baja: para la
    // persona el resultado es el mismo y no tiene por qué ver un error.
    return NextResponse.json({ ok: true, email });
  } catch (e) {
    logger.error("baja_failed", { reason: e instanceof Error ? e.message : "desconocido" });
    return NextResponse.json({ error: "No se pudo procesar. Intenta de nuevo." }, { status: 500 });
  }
}
