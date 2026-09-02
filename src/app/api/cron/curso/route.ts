import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import {
  CORREOS_ALUMNO, CORREOS_PROSPECTO, REMITENTE_CURSO, type ContextoCorreo,
} from "@/lib/cursoEmail";
import { buildCalendarioIcs, buildTallerIcs } from "@/lib/curso";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/curso
//
// Manda las secuencias del curso "Turismo con IA": A (nurture), B (checkout a
// medias), W (taller gratuito), D (cierre de cohorte) y C (alumnos). Cada
// correo declara su propia condición en src/lib/cursoEmail.ts; aquí solo se
// recorre el registro y se respetan dos reglas:
//
// 1. A LO SUMO UN correo por persona por corrida. Un lead que entra tarde
//    tiene varios correos "vencidos" a la vez; sin este tope recibiría tres
//    en la misma hora y marcaría spam.
// 2. El envío se RECLAMA de forma atómica (updateMany con la condición "aún
//    no tiene este ID") ANTES de llamar a Brevo: la misma lección del correo
//    de bienvenida del recomendador — preguntar y luego escribir deja una
//    ventana para mandarlo dos veces si el cron y la ruta corren a la par.
//    Si Brevo falla después de reclamar, se despoja el ID para reintentar.
//
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>. Lo dispara GitHub
// Actions cada hora (mismo workflow que carritos y leads).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ahora = new Date();

  const [leads, pagados] = await Promise.all([
    prisma.cursoLead.findMany({
      where: { status: "activo" },
      orderBy: { createdAt: "asc" },
      take: 300,
    }),
    prisma.cursoLead.count({ where: { compro: true } }),
  ]);

  let enviados = 0;
  let fallidos = 0;

  for (const lead of leads) {
    const registro = lead.compro ? CORREOS_ALUMNO : CORREOS_PROSPECTO;
    const cx: ContextoCorreo = { lead, ahora, pagados };

    for (const correo of registro) {
      if (lead.correosEnviados.includes(correo.id)) continue;

      let due = false;
      try {
        due = correo.due(cx);
      } catch (e) {
        logger.error("curso_cron_due_error", {
          correo: correo.id,
          reason: e instanceof Error ? e.message : "unknown",
        });
      }
      if (!due) continue;

      // Reclamar el envío de forma atómica: si otra corrida (o la ruta) ya lo
      // reclamó, `count` es 0 y no se manda nada.
      const claim = await prisma.cursoLead.updateMany({
        where: {
          id: lead.id,
          status: "activo",
          NOT: { correosEnviados: { has: correo.id } },
        },
        data: { correosEnviados: { push: correo.id } },
      });
      if (claim.count === 0) break;

      try {
        const { subject, html, texto, adjunto } = correo.build(cx);
        // Cuál .ics va adjunto lo declara el propio correo (`adjunto`), no un
        // `if` por ID aquí: así un correo nuevo no obliga a tocar el cron.
        // C1 (bienvenida del alumno) sigue llevando el calendario del curso.
        const ics = adjunto ?? (correo.id === "C1" ? "curso" : undefined);
        await sendBrevoEmail({
          to: [{ email: lead.email, name: lead.nombre ?? undefined }],
          subject,
          htmlContent: html,
          ...(texto ? { textContent: texto } : {}),
          senderName: REMITENTE_CURSO,
          ...(ics
            ? {
                attachments: [
                  ics === "taller"
                    ? {
                        name: "taller-turismo-con-ia.ics",
                        content: Buffer.from(buildTallerIcs()).toString("base64"),
                      }
                    : {
                        name: "curso-turismo-con-ia.ics",
                        content: Buffer.from(buildCalendarioIcs()).toString("base64"),
                      },
                ],
              }
            : {}),
        });
        enviados++;
        actividad("🎓  CORREO CURSO", correo.id, lead.email);
      } catch (e) {
        fallidos++;
        logger.error("curso_cron_send_failed", {
          correo: correo.id,
          reason: e instanceof Error ? e.message : "unknown",
        });
        // Despojar el ID reclamado para que la siguiente corrida reintente.
        await prisma.cursoLead.update({
          where: { id: lead.id },
          data: {
            correosEnviados: {
              set: lead.correosEnviados.filter((c) => c !== correo.id),
            },
          },
        }).catch(() => {});
      }

      break; // máximo un correo por persona por corrida
    }
  }

  logger.info("curso_cron_done", { candidatos: leads.length, enviados, fallidos });
  return NextResponse.json({ candidatos: leads.length, enviados, fallidos });
}
