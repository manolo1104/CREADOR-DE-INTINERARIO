import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildLeadSequenceEmail, ESPERA_HORAS, PASOS_SECUENCIA, type LeadEmailPaso } from "@/lib/leadSequenceEmail";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/secuencia-leads
//
// Manda los pasos 2 al 7 de la secuencia a quien dejó su correo en el sitio.
// Cadencia desde la captura: +24 h, +72 h, +7 d, +21 d, +35 d y +60 d.
//
// Terminaba a los 21 días, que es cuando mucha gente todavía no tiene fechas.
// Ahora llega a los dos meses, y al acabar el lead queda en "terminado", que es
// justo de donde toma el boletín mensual (`/api/cron/boletin`) sus
// destinatarios: la secuencia deja de ser un callejón sin salida.
//
// El paso 1 sale al instante desde el propio formulario: /api/recomendar-tour
// manda su recomendación y /api/lead-magnet manda el itinerario de 3 días (ese
// arranca ya en `emailsSent = 1`, porque su itinerario ES el primer correo).
//
// Hasta el 18 ago 2026 el ÚNICO que alimentaba esta secuencia era el
// recomendador —cuatro personas en catorce días—. El formulario del itinerario,
// que vive en el home, en cada blog y en cada destino, solo escribía en la hoja
// de Google: la persona recibía su PDF y después silencio para siempre.
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
    where:   { status: "activo", emailsSent: { lt: PASOS_SECUENCIA } },
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
      // Firma su enlace de baja de un clic en el pie.
      email:          lead.email,
      grupo:          lead.grupo,
      dias:           lead.dias,
      origen:         lead.origen,
      // Se guardaban desde el primer día y no los leía nadie: el correo
      // ignoraba la pregunta "¿qué te emociona?" del propio formulario.
      intereses:      lead.intereses,
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
          status:      paso >= PASOS_SECUENCIA ? "terminado" : "activo",
        },
      });
      enviados++;
      actividad(`📧  SECUENCIA ${paso}/${PASOS_SECUENCIA}`, lead.email, lead.tourPrincipal ?? "");
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
