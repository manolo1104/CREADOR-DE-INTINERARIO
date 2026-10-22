import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { avisarClienteInconforme } from "@/lib/encuestas/avisoInconforme";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * La encuesta de satisfacción (`/opina/<token>`): estrellas 1-5 (obligatorio),
 * recomendación 0-10 y comentario (opcionales). Se puede volver a mandar.
 * Con 3 estrellas o menos se avisa al equipo para que le escriba hoy.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "opina", limit: 10, windowMs: 60_000 });
  if (limitado) return limitado;

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (typeof b.sitio === "string" && b.sitio.trim() !== "") return NextResponse.json({ ok: true });

  const token = String(b.token ?? "").slice(0, 60);
  const calificacion = Math.round(Number(b.calificacion));
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    return NextResponse.json({ error: "Toca una estrella para calificar." }, { status: 400 });
  }
  const r = b.recomendaria === null || b.recomendaria === undefined ? null : Math.round(Number(b.recomendaria));
  const recomendaria = r !== null && Number.isInteger(r) && r >= 0 && r <= 10 ? r : null;
  const comentario = String(b.comentario ?? "").trim().slice(0, 1500) || null;

  try {
    const antes = await prisma.encuestaReserva.findUnique({ where: { token }, select: { id: true, calificacion: true } });
    if (!antes) return NextResponse.json({ error: "Este enlace ya no funciona." }, { status: 404 });

    const enc = await prisma.encuestaReserva.update({
      where: { id: antes.id },
      data:  { calificacion, recomendaria, comentario, satisfaccionEn: new Date() },
      include: { booking: true },
    });

    // Un aviso por mala experiencia, no uno por cada vez que corrija.
    const yaEraMala = antes.calificacion !== null && antes.calificacion <= 3;
    if (calificacion <= 3 && !yaEraMala) {
      avisarClienteInconforme(enc.booking, { calificacion, recomendaria, comentario }).catch((err: unknown) =>
        logger.error("opina_aviso_fallo", { reason: err instanceof Error ? err.message : String(err) }));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("opina_guardar_fallo", { reason: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
