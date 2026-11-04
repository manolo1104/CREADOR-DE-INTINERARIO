import { NextRequest, NextResponse } from "next/server";
import { vueltaDeAvisos } from "@/lib/admin/recordatoriosTimer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/recordatorios — respaldo del reloj interno (3 nov 2026).
 * Crea los seguimientos de las reglas, manda el resumen de las 7:30 y los
 * recordatorios que ya tocan. Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    // Reglas automáticas + resumen de las 7:30 + recordatorios (Fase 3).
    return NextResponse.json({ ok: true, ...(await vueltaDeAvisos()) });
  } catch (e: any) {
    console.error("cron/recordatorios:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
