import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { ErrorAgente } from "@/lib/admin/agente/claude";
import { preguntarAlPanel } from "@/lib/admin/agente/preguntar";
import { esDeOficina } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { pregunta, historial? } — «Pregúntale al panel» (solo lectura). La sección Agente es de Manolo. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  // Lista blanca (lote 8, 10 nov 2026): solo la oficina; antes se frenaba solo al guía.
  if (!sesion || !esDeOficina(sesion.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { pregunta?: unknown; historial?: unknown };
  const historial = Array.isArray(body.historial)
    ? (body.historial as { rol?: unknown; texto?: unknown }[]).filter(h => (h.rol === "user" || h.rol === "assistant") && typeof h.texto === "string").map(h => ({ rol: h.rol as "user" | "assistant", texto: h.texto as string }))
    : [];
  try {
    return NextResponse.json({ ok: true, ...(await preguntarAlPanel(String(body.pregunta ?? ""), historial)) });
  } catch (e) {
    if (e instanceof ErrorAgente) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("agente/preguntar:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo contestar." }, { status: 500 });
  }
}
