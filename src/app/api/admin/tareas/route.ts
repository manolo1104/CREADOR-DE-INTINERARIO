import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { prisma } from "@/lib/prisma";
import { crearTarea, ErrorCrm } from "@/lib/admin/crmDatos";
import { ahoraMX } from "@/lib/admin/crm";

export const dynamic = "force-dynamic";

/**
 * GET — mis seguimientos que ya tocan (vencidos, de hoy sin hora o cuya hora
 * llegó). Lo consulta el aviso del panel cada minuto.
 */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ tareas: [] });
  const { hoy, hhmm } = ahoraMX();
  const ts = await prisma.tarea.findMany({
    where: { estado: "pendiente", responsable: sesion.nombre, vence: { lte: hoy } },
    include: { oportunidad: { include: { contacto: { select: { nombre: true } } } } },
    orderBy: [{ vence: "asc" }, { hora: "asc" }], take: 50,
  }).catch(() => []);
  const tocan = ts.filter(t => t.vence < hoy || !t.hora || t.hora <= hhmm);
  return NextResponse.json({ tareas: tocan.map(t => ({ id: t.id, titulo: t.titulo, vence: t.vence, hora: t.hora, oportunidadId: t.oportunidadId, cliente: t.oportunidad?.contacto.nombre ?? null })) });
}

/** POST { titulo, responsable?, vence?, hora?, oportunidadId?, salidaClave? } — un seguimiento con dueño y fecha. */
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
