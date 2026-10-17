import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { trackServerEvent } from "@/lib/serverTrack";
import { salidasPublicas } from "@/lib/viajeCdmx/salidas";
import { correoInfoViaje } from "@/lib/viajeCdmx/correos";
import { EMAIL_RE, respuestaDeError } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * El popup del viaje CDMX–Xilitla (17 oct 2026): deja su correo y le llega AL
 * MOMENTO la información (fechas abiertas, lugares, precio por cuarto, qué
 * incluye y el botón a la página).
 *
 * Se guarda en `ListaEspera` como «la siguiente que abra» (`salidaId` vacío) y
 * NO en `Lead`: ahí le caerían las secuencias de correo de los tours, que
 * venden otra cosa. Queda como `avisado` porque ya recibió las fechas de hoy:
 * así el aviso automático de cada hora no le manda otro correo con lo mismo.
 * Si se vuelve a anotar, no se duplica (`@@unique([salidaId, email])`).
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-info", limit: 5, windowMs: 60_000 });
  if (limitado) return limitado;
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  const locale = b.locale === "en" ? "en" : "es";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: locale === "en" ? "Check your email." : "Revisa tu correo.", codigo: "email" }, { status: 400 });
  }

  try {
    const ahora = new Date();
    await prisma.listaEspera.upsert({
      where: { salidaId_email: { salidaId: "", email } },
      update: { estado: "avisado", avisadoEl: ahora },
      create: { salidaId: "", nombre: "", email, estado: "avisado", avisadoEl: ahora },
    });
    const salidas = await salidasPublicas(ahora).catch(() => []);
    const enviado = await correoInfoViaje(email, locale, salidas).catch((e: unknown) => {
      logger.error("viaje_cdmx_correo_info_fallo", { reason: e instanceof Error ? e.message : String(e) });
      return false;
    });
    trackServerEvent("VIAJE_CDMX_POPUP_CORREO", {
      tourSlug: "viaje-cdmx-xilitla",
      sid: typeof b.sid === "string" ? b.sid : null,
      data: { locale, enviado, desde: typeof b.origen === "string" ? b.origen.slice(0, 120) : null },
    });
    return NextResponse.json({ ok: true, enviado });
  } catch (err) {
    return respuestaDeError(err, "info");
  }
}
