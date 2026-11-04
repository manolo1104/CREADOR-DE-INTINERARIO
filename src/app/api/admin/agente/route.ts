import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { guardarConfigAgente } from "@/lib/admin/agente/claude";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

/** PUT { encendido?, topeUsd? } — encender o apagar el agente y su tope mensual. Solo el dueño. */
export async function PUT(req: NextRequest) {
  const sesion = await sesionActual();
  if (sesion?.rol !== "dueno") return NextResponse.json({ error: "Solo Manolo cambia el agente." }, { status: 403 });
  let body: { encendido?: unknown; topeUsd?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const cfg = await guardarConfigAgente({
    encendido: typeof body.encendido === "boolean" ? body.encendido : undefined,
    topeUsd: body.topeUsd !== undefined ? Number(body.topeUsd) : undefined,
  });
  await registrarEnBitacora({ accion: "modificó", entidad: "panel", referencia: "Agente", resumen: `Agente ${cfg.encendido ? "encendido" : "apagado"}, tope ${cfg.topeUsd} USD al mes` });
  return NextResponse.json({ ok: true, config: cfg });
}
