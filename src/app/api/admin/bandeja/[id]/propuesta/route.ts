import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { ErrorAgente } from "@/lib/admin/agente/claude";
import { proponerRespuesta, rechazarPropuesta } from "@/lib/admin/agente/copiloto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST — que el agente proponga la respuesta al último mensaje del cliente (Fase 4). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  try {
    return NextResponse.json({ ok: true, propuesta: await proponerRespuesta(params.id, sesion.nombre) });
  } catch (e) {
    if (e instanceof ErrorAgente) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("bandeja/propuesta POST:", (e as Error)?.message);
    return NextResponse.json({ error: "El agente no pudo proponer una respuesta." }, { status: 500 });
  }
}

/** PATCH { propuestaId, motivo } — rechazar la propuesta con su motivo. */
export async function PATCH(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: { propuestaId?: unknown; motivo?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    await rechazarPropuesta(String(body.propuestaId ?? ""), body.motivo, sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "No se pudo guardar." }, { status: 400 });
  }
}
