import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora, type Actor } from "@/lib/admin/bitacora";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Un borrador que nadie mandó en 30 días ya no es una cotización activa. */
const DIAS_BORRADOR = 30;
const CRON: Actor = { usuario: "cron", nombre: "Cron", rol: "sistema" };

/**
 * POST /api/cron/archivar-borradores  (3 nov 2026)
 *
 * Línea base: 106 borradores, 101 de antes de octubre, inflaban «Cotizaciones
 * activas: 120» en Inicio. Los borradores de más de `DIAS_BORRADOR` días pasan
 * a `archivada`: siguen en la base y en la pestaña «Archivadas», y se pueden
 * desarchivar. «Activas» = enviadas (incluye las por vencer).
 *
 * Con `?dry=1` solo cuenta. Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>;
 * lo dispara GitHub Actions una vez al día (`resumen-cotizaciones.yml`).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const limite = new Date(Date.now() - DIAS_BORRADOR * 86400000);
  try {
    const where = { status: "borrador", createdAt: { lt: limite } };
    const candidatos = await prisma.tourQuote.count({ where });
    if (dry || candidatos === 0) {
      return NextResponse.json({ ok: true, dry, candidatos, archivadas: 0 });
    }
    const r = await prisma.tourQuote.updateMany({ where, data: { status: "archivada" } });
    await registrarEnBitacora({
      accion:  "modificó",
      entidad: "cotización",
      actor:   CRON,
      resumen: `Se archivaron ${r.count} borradores de más de ${DIAS_BORRADOR} días`,
    });
    logger.info(`🗂️  Borradores archivados: ${r.count}`);
    return NextResponse.json({ ok: true, dry, candidatos, archivadas: r.count });
  } catch (e: any) {
    logger.error("cron/archivar-borradores:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
