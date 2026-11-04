import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { ErrorAgente } from "@/lib/admin/agente/claude";
import { puntuarSemana } from "@/lib/admin/agente/calidad";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** POST { semana } — el agente revisa los chats de la semana y propone la captura del Score (no la guarda). */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || (sesion.rol !== "dueno" && sesion.rol !== "socio")) return NextResponse.json({ error: "La revisión la hacen Manolo o Martín." }, { status: 403 });
  let body: { semana?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const semana = String(body.semana ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return NextResponse.json({ error: "Semana no válida." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await puntuarSemana(semana)) });
  } catch (e) {
    if (e instanceof ErrorAgente) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("score/agente:", (e as Error)?.message);
    return NextResponse.json({ error: "El agente no pudo revisar la semana." }, { status: 500 });
  }
}
