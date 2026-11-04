import { NextRequest, NextResponse } from "next/server";
import { enviarRecordatorios } from "@/lib/admin/recordatorios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/recordatorios — respaldo del reloj interno (3 nov 2026).
 * Manda por correo los seguimientos que ya tocan. Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await enviarRecordatorios()) });
  } catch (e: any) {
    console.error("cron/recordatorios:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
