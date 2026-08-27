import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildQuoteSequenceEmail, type QuotePaso } from "@/lib/quoteSequenceEmail";
import {
  ESTADOS_VIVOS,
  PASOS_COTIZACION,
  conMeta,
  localeDeCotizacion,
  metaCotizacion,
  siguientePaso,
} from "@/lib/quoteFollowUp";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/secuencia-cotizaciones
 *
 * Da seguimiento a las cotizaciones enviadas —las del panel a mano y las del
 * bot—, que hasta ahora no tenían ninguno: se mandaban y ahí morían.
 *
 * Cadencia desde el envío: +1 hora, +24 horas y +72 horas. La misma del carrito
 * abandonado, y por la misma razón: quien acaba de pedir una cotización está
 * decidiendo AHORA. La versión anterior esperaba 2, 5 y 10 días y llegaba tarde
 * a su propia conversación.
 *
 * Si el cliente CONFIRMA la reserva, la secuencia se pausa en el acto.
 *
 * La secuencia se CANCELA si no cabe completa antes de la fecha del tour. Es
 * deliberado: tres correos que se cortan a la mitad, justo cuando la persona
 * iba a decidir, hacen más daño que no escribir.
 *
 * `?dry=1` enseña a quién le tocaría, sin enviar ni marcar nada.
 * Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const ahora = new Date();

  const cotizaciones = await prisma.tourQuote.findMany({
    where:   { status: { in: [...ESTADOS_VIVOS] }, customerEmail: { not: "" } },
    orderBy: { createdAt: "asc" },
    take:    200,
  });

  let enviados = 0;
  let fallidos = 0;
  let convertidas = 0;
  let sinTiempo = 0;
  let terminadas = 0;
  const destinatarios: { folio: string; email: string; paso: number }[] = [];

  for (const q of cotizaciones) {
    const meta = metaCotizacion(q.lineItems);

    /**
     * Si CONFIRMÓ la reserva, la secuencia se pausa. Nada peor que seguir
     * persiguiendo a alguien que ya te pagó.
     *
     * Se mira solo la reserva hecha DESPUÉS de mandar esta cotización. Con el
     * filtro por correo a secas, un cliente que ya había viajado con nosotros
     * el año pasado quedaba fuera del seguimiento de su cotización NUEVA: su
     * reserva vieja la mataba antes de empezar.
     */
    const desdeCuando = meta.seqDesde ? new Date(meta.seqDesde) : q.createdAt;
    const yaReservo = await prisma.tourBooking.findFirst({
      where:  {
        customerEmail: q.customerEmail,
        createdAt:     { gte: Number.isNaN(desdeCuando.getTime()) ? q.createdAt : desdeCuando },
      },
      select: { id: true },
    });
    if (yaReservo) {
      if (!dry) {
        await prisma.tourQuote.update({
          where: { id: q.id },
          data:  {
            status:    "aceptada",
            // "pausada" y no "terminado": deja dicho en el panel POR QUÉ dejó
            // de recibir correos, que es distinto de haberse agotado sola.
            lineItems: conMeta(q.lineItems, { seqEstado: "pausada" }) as never,
          },
        });
      }
      convertidas++;
      continue;
    }
    const paso = siguientePaso(meta, q.tourDate, ahora);
    if (!paso) continue;

    if ("corte" in paso) {
      // El corte se ESCRIBE, no se deja implícito: así el panel puede decir por
      // qué esa cotización no recibe seguimiento en vez de callar.
      if (paso.corte === "sin-tiempo" || paso.corte === "fecha-pasada") sinTiempo++;
      else terminadas++;
      if (!dry) {
        await prisma.tourQuote.update({
          where: { id: q.id },
          data:  { lineItems: conMeta(q.lineItems, { seqEstado: paso.corte === "terminado" ? "terminado" : "sin-tiempo" }) as never },
        });
      }
      continue;
    }

    destinatarios.push({ folio: q.quoteNumber, email: q.customerEmail, paso: paso.paso });
    if (dry) continue;

    try {
      const { subject, html } = buildQuoteSequenceEmail({
        paso:         paso.paso as QuotePaso,
        locale:       localeDeCotizacion(q.lineItems),
        customerName: q.customerName,
        email:        q.customerEmail,
        quoteNumber:  q.quoteNumber,
        tourName:     q.tourName,
        tourDate:     q.tourDate,
        totalAmount:  q.totalAmount,
        lineItems:    q.lineItems,
      });
      await sendBrevoEmail({ to: [{ email: q.customerEmail, name: q.customerName }], subject, htmlContent: html });

      // Se marca DESPUÉS de enviar: si Brevo falla, el paso se reintenta en la
      // siguiente corrida en vez de perderse en silencio.
      await prisma.tourQuote.update({
        where: { id: q.id },
        data:  {
          lineItems: conMeta(q.lineItems, {
            seqPaso:     paso.paso,
            seqUltimoAt: new Date().toISOString(),
            seqEstado:   paso.paso >= PASOS_COTIZACION ? "terminado" : "activo",
          }) as never,
        },
      });
      enviados++;
      actividad(`📧  COTIZACIÓN ${paso.paso}/${PASOS_COTIZACION}`, q.quoteNumber, q.customerEmail);
    } catch (e) {
      fallidos++;
      logger.error("secuencia_cotizacion_failed", {
        quote_id: q.id,
        paso:     paso.paso,
        reason:   e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    dry ? "📄  CRON COTIZACIONES (prueba)" : "📄  CRON COTIZACIONES",
    dry ? `${destinatarios.length} recibirían` : `${enviados} enviado(s)`,
    `${cotizaciones.length} vivas`,
    convertidas ? `${convertidas} ya reservó` : undefined,
    sinTiempo   ? `${sinTiempo} sin tiempo antes del tour` : undefined,
    fallidos    ? `⚠️ ${fallidos} fallaron` : undefined,
  );

  return NextResponse.json({
    ok: true, dry, enviados, fallidos, convertidas, sinTiempo, terminadas,
    revisadas: cotizaciones.length,
    ...(dry ? { recibirian: destinatarios } : {}),
  });
}
