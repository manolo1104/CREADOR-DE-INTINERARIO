import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCartEmailHtml, type CartEmailTipo } from "@/lib/cartEmail";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL = process.env.APP_URL ?? "https://www.huasteca-potosina.com";

// POST /api/cron/recuperar-carritos
// Envía recordatorios a los carritos abandonados que no se han convertido.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub Actions.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cadencia 1 h → 24 h → 72 h. Se restan unos minutos a cada ventana para que
  // un cron que corre "en punto" no se salte el envío por unos segundos.
  const margen  = 5 * 60 * 1000;
  const ahora   = new Date();
  const hace1h  = new Date(ahora.getTime() -  1 * 60 * 60 * 1000 + margen);
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000 + margen);
  const hace72h = new Date(ahora.getTime() - 72 * 60 * 60 * 1000 + margen);
  const hace14d = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Expira carritos muy viejos (deja de escribirles). 14 días para que quepa
  // la secuencia completa de tres recordatorios.
  await prisma.abandonedCart.updateMany({
    where: { status: "open", createdAt: { lt: hace14d } },
    data:  { status: "expired" },
  });

  // Candidatos: abiertos, con menos de 3 recordatorios, creados hace más de 1 h.
  const abiertos = await prisma.abandonedCart.findMany({
    where:   { status: "open", emailsSent: { lt: 3 }, createdAt: { lt: hace1h } },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  let enviados = 0;
  let convertidos = 0;
  let fallidos = 0;

  for (const c of abiertos) {
    // Red de seguridad: si ya reservó (mismo correo+tour+fecha), no le escribimos.
    const yaReservo = await prisma.tourBooking.findFirst({
      where: { customerEmail: c.customerEmail, tourSlug: c.tourSlug, tourDate: c.tourDate },
    });
    if (yaReservo) {
      await prisma.abandonedCart.update({ where: { id: c.id }, data: { status: "converted" } });
      convertidos++;
      continue;
    }

    let tipo: CartEmailTipo | null = null;
    if      (c.emailsSent === 0) tipo = "recordatorio1";
    else if (c.emailsSent === 1 && (!c.lastEmailAt || c.lastEmailAt < hace24h)) tipo = "recordatorio2";
    else if (c.emailsSent === 2 && (!c.lastEmailAt || c.lastEmailAt < hace72h)) tipo = "recordatorio3";
    if (!tipo) continue;

    const restoreUrl = `${APP_URL}/reservar-tour/${c.tourSlug}?recuperar=${c.token}`;
    try {
      const { subject, html } = buildCartEmailHtml({
        tipo,
        tourName: c.tourName,
        tourDate: c.tourDate,
        adults:   c.adults,
        children: c.childrenMid + c.childrenSmall,
        total:    c.total,
        restoreUrl,
      });
      await sendBrevoEmail({ to: [{ email: c.customerEmail }], subject, htmlContent: html });
      await prisma.abandonedCart.update({
        where: { id: c.id },
        data:  { emailsSent: c.emailsSent + 1, lastEmailAt: ahora },
      });
      enviados++;
    } catch (e) {
      // Seguimos con los demás, pero SIN silencio: antes un fallo de Brevo
      // (llave caducada, cuota agotada) desaparecía sin dejar rastro y parecía
      // que el cron simplemente "no tenía nada que enviar".
      fallidos++;
      logger.error("cron_recordatorio_fallido", {
        cart_id: c.id,
        tipo,
        email:   c.customerEmail,
        reason:  e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    "🛟  CRON RECUPERACIÓN",
    `${enviados} recordatorio(s)`,
    `${convertidos} ya reservó`,
    `${abiertos.length} abiertos`,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );
  return NextResponse.json({ ok: true, enviados, convertidos, fallidos, revisados: abiertos.length });
}
