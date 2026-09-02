import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { correoPorId, REMITENTE_CURSO, type ContextoCorreo } from "@/lib/cursoEmail";
import { rateLimit } from "@/lib/rateLimit";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/curso/lead — captura de lead del curso "Turismo con IA".
 *
 * Sirve para el formulario de la landing (origen "landing") y para el
 * registro al taller gratuito (origen "webinar", con `webinar: true`).
 *
 * El primer correo (A1 o W1) sale AQUÍ MISMO, no en la siguiente corrida del
 * cron: la condición es "no se le ha mandado", reclamada de forma atómica —
 * la misma regla que arregló la propuesta del recomendador que llegaba una
 * hora tarde.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "curso-lead", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();

    // Honeypot: los bots llenan el campo invisible "sitio".
    if (typeof body.sitio === "string" && body.sitio.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Revisa tu correo electrónico." }, { status: 400 });
    }

    const limpio = (v: unknown, max: number) => {
      const s = String(v ?? "").trim();
      return s ? s.slice(0, max) : null;
    };

    const nombre = limpio(body.nombre, 120);
    const whatsapp = limpio(body.whatsapp, 30);
    const tipoNegocio = limpio(body.tipo_negocio, 40);
    const ciudad = limpio(body.ciudad, 80);
    const esWebinar = body.webinar === true;
    const origen = esWebinar ? "webinar" : "landing";

    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Necesitamos tu autorización para enviarte la información." },
        { status: 400 }
      );
    }

    const lead = await prisma.cursoLead.upsert({
      where: { email },
      create: { email, nombre, whatsapp, tipoNegocio, ciudad, origen, webinar: esWebinar },
      update: {
        // No se pisa un dato existente con vacío, y registrarse al taller
        // no borra el origen original.
        ...(nombre ? { nombre } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        ...(tipoNegocio ? { tipoNegocio } : {}),
        ...(ciudad ? { ciudad } : {}),
        ...(esWebinar ? { webinar: true } : {}),
        status: "activo",
      },
    });

    actividad("🎓  LEAD CURSO", origen, email);

    // Primer correo al instante: W0 si vino por el taller, A1 si no.
    //
    // W0 es la confirmación corta de texto plano; W1 (el de las 3 tareas) sale
    // 20 minutos después, en la siguiente corrida del cron. Separarlos es lo
    // que hace que la primera vez que este remitente toca una bandeja fría lo
    // haga con un correo que parece escrito a mano, y no con una campaña.
    const idCorreo = esWebinar ? "W0" : "A1";
    const claim = await prisma.cursoLead.updateMany({
      where: { id: lead.id, NOT: { correosEnviados: { has: idCorreo } } },
      data: { correosEnviados: { push: idCorreo } },
    });

    if (claim.count === 1) {
      try {
        const pagados = await prisma.cursoLead.count({ where: { compro: true } });
        const cx: ContextoCorreo = {
          lead: { ...lead, webinar: esWebinar || lead.webinar },
          ahora: new Date(),
          pagados,
        };
        const correo = correoPorId(idCorreo)!;
        const { subject, html, texto } = correo.build(cx);
        await sendBrevoEmail({
          to: [{ email, name: nombre ?? undefined }],
          subject,
          htmlContent: html,
          ...(texto ? { textContent: texto } : {}),
          senderName: REMITENTE_CURSO,
        });
      } catch (e) {
        // El cron lo repesca en la siguiente corrida.
        logger.error("curso_lead_email_failed", {
          reason: e instanceof Error ? e.message : "unknown",
        });
        await prisma.cursoLead.update({
          where: { id: lead.id },
          data: { correosEnviados: { set: lead.correosEnviados.filter((c) => c !== idCorreo) } },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("curso_lead_error", { reason: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: "No pudimos registrarte. Intenta de nuevo." }, { status: 500 });
  }
}
