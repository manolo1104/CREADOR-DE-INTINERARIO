import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { hoyMX } from "@/lib/dates";
import { ErrorAgente } from "@/lib/admin/agente/claude";
import { decidirHallazgo, reporteOportunidades } from "@/lib/admin/agente/calidad";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { semana? } — generar el reporte de oportunidades (también sale solo los jueves a las 7:00). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (sesion?.rol !== "dueno") return NextResponse.json({ error: "Solo Manolo." }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { semana?: unknown };
  const semana = typeof body.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.semana) ? body.semana : hoyMX();
  try {
    return NextResponse.json({ ok: true, ...(await reporteOportunidades(semana, sesion.nombre)) });
  } catch (e) {
    if (e instanceof ErrorAgente) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("agente/reporte:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo armar el reporte." }, { status: 500 });
  }
}

/** PATCH { id, accion: aceptar | descartar } — un hallazgo se vuelve tarea o se descarta. */
export async function PATCH(req: NextRequest) {
  const sesion = await sesionActual();
  if (sesion?.rol !== "dueno") return NextResponse.json({ error: "Solo Manolo." }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { id?: unknown; accion?: unknown };
  try {
    await decidirHallazgo(String(body.id ?? ""), body.accion, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
