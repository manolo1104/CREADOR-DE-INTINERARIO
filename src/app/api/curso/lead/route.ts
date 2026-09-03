import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { correoPorId, REMITENTE_CURSO, type ContextoCorreo } from "@/lib/cursoEmail";
import { rateLimit } from "@/lib/rateLimit";
import { actividad, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A dónde llega el aviso de cada registro. El buzón que Manolo sí mira. */
const AVISO_A = process.env.CURSO_AVISO_EMAIL || "daftpunkmanolo@gmail.com";

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

    // El WhatsApp es obligatorio SOLO para el taller: por ahí van la liga de
    // cada noche y el aviso de "empezamos en 30 minutos". El `required` del
    // formulario es una cortesía para quien lo llena; la regla vive aquí,
    // porque el navegador se puede saltar.
    //
    // Se piden 10 dígitos como mínimo (México sin lada de país) y se guarda tal
    // cual lo escribió la persona: normalizarlo a E.164 aquí rompería los
    // números que ya están en la tabla.
    if (esWebinar) {
      const digitos = String(body.whatsapp ?? "").replace(/\D/g, "");
      if (digitos.length < 10) {
        return NextResponse.json(
          { error: "Necesito tu WhatsApp: por ahí te mando la liga de cada noche." },
          { status: 400 }
        );
      }
    }

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

    // ── El aviso a Manolo ────────────────────────────────────────────────
    //
    // Sin esto, un registro sólo dejaba rastro en `console.log`, o sea en los
    // logs de Railway. Nadie mira los logs de Railway durante una campaña.
    //
    // Va DESPUÉS de responderle a la persona en el orden de importancia, y con
    // su propio try/catch: si el aviso falla, el registro sigue siendo válido.
    // Nunca al revés.
    try {
      const cuando = new Date().toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        weekday: "long", day: "numeric", month: "long",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      const total = await prisma.cursoLead.count({
        where: esWebinar ? { webinar: true, status: "activo" } : { status: "activo" },
      });
      const fila = (k: string, v: string | null) =>
        v ? `<tr><td style="padding:3px 14px 3px 0;color:#777">${k}</td><td style="padding:3px 0"><strong>${v}</strong></td></tr>` : "";
      await sendBrevoEmail({
        to: [{ email: AVISO_A }],
        subject: esWebinar
          ? `🎓 ${nombre ?? email} se registró al taller (${total})`
          : `📄 ${nombre ?? email} pidió el programa`,
        htmlContent:
          `<div style="font-family:system-ui,-apple-system,Arial,sans-serif;font-size:15px;color:#111">` +
          `<p style="margin:0 0 12px"><strong>${esWebinar ? "Registro al taller" : "Pidió el programa"}</strong> · ${cuando}</p>` +
          `<table style="border-collapse:collapse;font-size:14px">` +
          fila("Nombre", nombre) + fila("Correo", email) + fila("WhatsApp", whatsapp) +
          fila("Negocio", tipoNegocio) + fila("Ciudad", ciudad) +
          `</table>` +
          (whatsapp
            ? `<p style="margin:14px 0 0"><a href="https://wa.me/${whatsapp.replace(/\D/g, "")}" style="color:#0F56E0">Escribirle por WhatsApp</a></p>`
            : "") +
          `<p style="margin:16px 0 0;color:#777;font-size:13px">Van ${total} ${esWebinar ? "registrados al taller" : "leads"}. Lista completa en /admin/curso.</p>` +
          `</div>`,
        senderName: "Aviso · Turismo con IA",
      });
    } catch (e) {
      logger.error("curso_lead_aviso_failed", {
        reason: e instanceof Error ? e.message : "unknown",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("curso_lead_error", { reason: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json({ error: "No pudimos registrarte. Intenta de nuevo." }, { status: 500 });
  }
}
