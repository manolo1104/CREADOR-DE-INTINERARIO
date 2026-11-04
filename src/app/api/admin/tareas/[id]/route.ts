import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { cambiarTarea, ErrorCrm } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";

/** PATCH { accion: "hecha" | "reabrir" | "posponer", dias? } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const t = await cambiarTarea(params.id, body.accion, body.dias, sesion.nombre);
    return NextResponse.json({ ok: true, vence: t.vence, estado: t.estado });
  } catch (e) {
    if (e instanceof ErrorCrm) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("admin/tareas PATCH:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
