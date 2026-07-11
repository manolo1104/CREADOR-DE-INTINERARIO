import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildCartEmailHtml, type CartEmailTipo } from "@/lib/cartEmail";
import { actividad } from "@/lib/logger";

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

  const ahora   = new Date();
  const hace1h  = new Date(ahora.getTime() -  1 * 60 * 60 * 1000);
  const hace20h = new Date(ahora.getTime() - 20 * 60 * 60 * 1000);
  const hace7d  = new Date(ahora.getTime() -  7 * 24 * 60 * 60 * 1000);

  // Expira carritos muy viejos (deja de escribirles).
  await prisma.abandonedCart.updateMany({
    where: { status: "open", createdAt: { lt: hace7d } },
    data:  { status: "expired" },
  });

  // Candidatos: abiertos, con menos de 2 recordatorios, creados hace más de 1 h.
  const abiertos = await prisma.abandonedCart.findMany({
    where:   { status: "open", emailsSent: { lt: 2 }, createdAt: { lt: hace1h } },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  let enviados = 0;
  let convertidos = 0;

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
    if (c.emailsSent === 0) tipo = "recordatorio1";
    else if (c.emailsSent === 1 && (!c.lastEmailAt || c.lastEmailAt < hace20h)) tipo = "recordatorio2";
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
    } catch {
      // si un correo falla, seguimos con los demás
    }
  }

  actividad("🛟  CRON RECUPERACIÓN", `${enviados} recordatorio(s)`, `${convertidos} ya reservó`, `${abiertos.length} abiertos`);
  return NextResponse.json({ ok: true, enviados, convertidos, revisados: abiertos.length });
}
