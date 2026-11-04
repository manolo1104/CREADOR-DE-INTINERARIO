import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { crearTarea, ErrorCrm } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";

/** POST { titulo, responsable?, vence?, oportunidadId?, salidaClave? } — un seguimiento con dueño y fecha. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  // Seguimientos y Leads usan esta ruta; el guía no ve ninguna de las dos.
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const t = await crearTarea(body, sesion.nombre);
    return NextResponse.json({ ok: true, id: t.id });
  } catch (e) {
    if (e instanceof ErrorCrm) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("admin/tareas POST:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
