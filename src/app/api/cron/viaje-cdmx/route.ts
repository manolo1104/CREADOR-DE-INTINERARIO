import { NextRequest, NextResponse } from "next/server";
import { correrTareas } from "@/lib/viajeCdmx/tareas";
import { actividad } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/cron/viaje-cdmx — cada hora, desde GitHub Actions.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>, como los demás crons.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await correrTareas();
  actividad("🚐  CRON VIAJE CDMX", JSON.stringify(r));
  return NextResponse.json(r);
}
