import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildLeadSequenceEmail, ESPERA_HORAS, type LeadEmailPaso } from "@/lib/leadSequenceEmail";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/secuencia-leads
//
// Manda los pasos 2, 3 y 4 de la secuencia a quien dejó su correo en el
// recomendador (el paso 1 sale al instante desde /api/recomendar-tour).
// Cadencia desde la captura: +24 h, +72 h, +7 días.
//
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub Actions.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ahora  = new Date();
  const margen = 5 * 60 * 1000; // holgura para que un cron "en punto" no se salte un envío

  // Candidatos: secuencia viva y sin terminar.
  //
  // Incluye deliberadamente a los de emailsSent = 0. El paso 1 lo manda
  // /api/recomendar-tour al instante, pero sube el contador DESPUÉS de que
  // Brevo acepta el envío: si Brevo falla (cuota, llave caducada), el lead se
  // queda vivo en 0 y con el filtro anterior (`gte: 1`) el cron no lo tomaba
  // NUNCA. Es la misma clase de trampa que tuvo un carrito atrapado en
  // "recovered" 5 días sin un solo recordatorio (ago 2026): un registro vivo en
  // un estado del que ningún proceso lo saca. Como ESPERA_HORAS[1] = 0, el paso
  // 1 sale en la siguiente corrida sin lógica especial.
  const leads = await prisma.lead.findMany({
    where:   { status: "activo", emailsSent: { lt: 4 } },
    orderBy: { createdAt: "asc" },
    take:    100,
  });

  let enviados = 0;
  let convertidos = 0;
  let fallidos = 0;

  for (const lead of leads) {
    // Si ya reservó, se le deja de escribir: nada peor que perseguir a un cliente.
    const yaReservo = await prisma.tourBooking.findFirst({
      where:  { customerEmail: lead.email },
      select: { id: true },
    });
    if (yaReservo) {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "convertido" } });
      convertidos++;
      continue;
    }

    const paso = (lead.emailsSent + 1) as LeadEmailPaso;
    const esperaMs = ESPERA_HORAS[paso] * 60 * 60 * 1000;
    // La espera se cuenta desde la captura, no desde el último envío: así la
    // secuencia mantiene su ritmo aunque un cron se haya saltado una corrida.
    if (ahora.getTime() - lead.createdAt.getTime() + margen < esperaMs) continue;

    const contenido = buildLeadSequenceEmail({
      paso,
      grupo:          lead.grupo,
      dias:           lead.dias,
      origen:         lead.origen,
      tourPrincipal:  lead.tourPrincipal,
      tourSecundario: lead.tourSecundario,
    });

    // Sin tour recomendado no hay nada personalizado que decir: se cierra la
    // secuencia en vez de mandar un correo genérico.
    if (!contenido) {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "terminado" } });
      continue;
    }

    try {
      await sendBrevoEmail({
        to: [{ email: lead.email }],
        subject: contenido.subject,
        htmlContent: contenido.html,
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          emailsSent:  paso,
          lastEmailAt: ahora,
          status:      paso === 4 ? "terminado" : "activo",
        },
      });
      enviados++;
      actividad(`📧  SECUENCIA ${paso}/4`, lead.email, lead.tourPrincipal ?? "");
    } catch (e) {
      fallidos++;
      logger.error("secuencia_lead_failed", {
        lead_id: lead.id,
        paso,
        reason: e instanceof Error ? e.message : "desconocido",
      });
    }
  }

  actividad(
    "✉️  CRON SECUENCIA",
    `${enviados} enviado(s)`,
    `${convertidos} ya reservó`,
    `${leads.length} activos`,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );
  return NextResponse.json({ ok: true, enviados, convertidos, fallidos, revisados: leads.length });
}
