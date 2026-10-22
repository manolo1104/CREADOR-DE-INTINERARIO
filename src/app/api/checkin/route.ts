import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { hoyMX } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { ESTADOS_EXCLUIDOS } from "@/lib/encuestas/encuesta";
import {
  AVISO_VERSION, COMO_NOS_CONOCIO, MOTIVOS, TIPOS_GRUPO, esOpcion, fechaNacimientoValida, normalizarCiudad,
} from "@/lib/encuestas/opciones";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Las respuestas del check-in (`/checkin/<token>`). Se puede volver a mandar
 * para corregir: cada envío reemplaza al anterior.
 *
 * 🔒 Sin la casilla del aviso de privacidad no se guarda nada (LFPDPPP). Se
 * guarda la versión del aviso que aceptó y, aparte, si aceptó la finalidad
 * secundaria (cumpleaños y promociones).
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "checkin", limit: 10, windowMs: 60_000 });
  if (limitado) return limitado;

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  // Honeypot: un bot llena el campo invisible. Se le responde «ok» sin guardar.
  if (typeof b.sitio === "string" && b.sitio.trim() !== "") return NextResponse.json({ ok: true });

  const token = String(b.token ?? "").slice(0, 60);
  const ciudadOrigen = normalizarCiudad(String(b.ciudadOrigen ?? ""));
  const fechaNacimiento = b.fechaNacimiento ? String(b.fechaNacimiento) : null;
  const comoNosConocioOtro = String(b.comoNosConocioOtro ?? "").trim().replace(/\s+/g, " ").slice(0, 120) || null;

  if (b.aceptaAviso !== true) {
    return NextResponse.json({ error: "Para enviar, marca la casilla del aviso de privacidad." }, { status: 400 });
  }
  if (!ciudadOrigen) return NextResponse.json({ error: "Escribe de qué ciudad nos visitas." }, { status: 400 });
  if (!esOpcion(TIPOS_GRUPO, b.tipoGrupo)) return NextResponse.json({ error: "Elige con quién viajas." }, { status: 400 });
  if (!esOpcion(COMO_NOS_CONOCIO, b.comoNosConocio)) return NextResponse.json({ error: "Elige cómo nos conociste." }, { status: 400 });
  if (typeof b.primeraVez !== "boolean") return NextResponse.json({ error: "Dinos si es tu primera vez en la Huasteca." }, { status: 400 });
  if (!esOpcion(MOTIVOS, b.motivo)) return NextResponse.json({ error: "Elige el motivo de tu viaje." }, { status: 400 });
  if (fechaNacimiento && !fechaNacimientoValida(fechaNacimiento, hoyMX())) {
    return NextResponse.json({ error: "Revisa tu fecha de cumpleaños." }, { status: 400 });
  }

  try {
    const enc = await prisma.encuestaReserva.findUnique({
      where: { token },
      select: { id: true, booking: { select: { status: true } } },
    });
    if (!enc || ESTADOS_EXCLUIDOS.includes(enc.booking.status)) {
      return NextResponse.json({ error: "Este enlace ya no funciona. Escríbenos por WhatsApp y te mandamos otro." }, { status: 404 });
    }

    const como = b.comoNosConocio;
    await prisma.encuestaReserva.update({
      where: { id: enc.id },
      data: {
        checkinEn: new Date(),
        ciudadOrigen,
        fechaNacimiento,
        tipoGrupo: b.tipoGrupo,
        comoNosConocio: como,
        // Solo tiene sentido con «me lo recomendaron» u «otro».
        comoNosConocioOtro: como === "recomendacion" || como === "otro" ? comoNosConocioOtro : null,
        primeraVez: b.primeraVez,
        motivo: b.motivo,
        aceptaAviso: true,
        avisoVersion: AVISO_VERSION,
        aceptaPromos: b.aceptaPromos === true,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("checkin_guardar_fallo", { reason: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "No se pudo guardar. Intenta de nuevo en un momento." }, { status: 500 });
  }
}
