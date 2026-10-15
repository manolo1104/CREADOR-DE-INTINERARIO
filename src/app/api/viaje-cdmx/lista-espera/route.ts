import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { trackServerEvent } from "@/lib/serverTrack";
import { correoNuevoEnEspera } from "@/lib/viajeCdmx/correos";
import { EMAIL_RE, respuestaDeError, telefonoValido } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Anotarse en la lista de espera de una fecha agotada, o de «la siguiente que
 * abra» (`salidaId` vacío). Si ya estaba, se actualiza sin duplicar.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-espera", limit: 5, windowMs: 60_000 });
  if (limitado) return limitado;
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  const nombre = String(b.nombre ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp ?? "").trim().slice(0, 40);
  const personas = Math.max(1, Math.min(14, Math.floor(Number(b.personas) || 1)));
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  if (whatsapp && !telefonoValido(whatsapp)) return NextResponse.json({ error: "Revisa tu WhatsApp (10 dígitos)." }, { status: 400 });

  try {
    let salidaId = String(b.salidaId ?? "");
    const salida = salidaId ? await prisma.salidaGrupal.findUnique({ where: { id: salidaId } }) : null;
    if (salidaId && !salida) salidaId = "";

    const e = await prisma.listaEspera.upsert({
      where: { salidaId_email: { salidaId, email } },
      update: { nombre, whatsapp: whatsapp || null, personas, estado: "esperando" },
      create: { salidaId, nombre, email, whatsapp: whatsapp || null, personas },
    });
    trackServerEvent("VIAJE_CDMX_LISTA_ESPERA", { tourSlug: "viaje-cdmx-xilitla", sid: typeof b.sid === "string" ? b.sid : null, data: { salida: salida?.fechaSalida ?? "siguiente", personas } });
    correoNuevoEnEspera(e, salida).catch((err: unknown) =>
      logger.error("viaje_cdmx_correo_espera_fallo", { reason: err instanceof Error ? err.message : String(err) }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return respuestaDeError(err, "lista_espera");
  }
}
