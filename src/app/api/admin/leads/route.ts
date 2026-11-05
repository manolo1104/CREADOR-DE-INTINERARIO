import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { crearOportunidad, ErrorCrm } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";

/**
 * POST — captura un lead (Fase 2). Si la persona ya tiene uno abierto, lo
 * capturado se junta en ese y se dice qué se agregó (5 nov 2026).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const sesion = await sesionActual();
  try {
    const r = await crearOportunidad(body, sesion?.nombre ?? "Desconocido");
    return NextResponse.json({ ok: true, id: r.oportunidad.id, existente: r.existente, etapa: r.oportunidad.etapa, agregado: r.agregado });
  } catch (e) {
    if (e instanceof ErrorCrm) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("admin/leads POST:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
