import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { ErrorAgente } from "@/lib/admin/agente/claude";
import { prepararConfirmaciones } from "@/lib/admin/agente/prepararSalida";
import { esDeOficina } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

/** POST { clave } — deja lista la confirmación de 48 h de cada cliente de la salida. El guía no manda mensajes a clientes. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  // Lista blanca (lote 8, 10 nov 2026): solo la oficina; antes se frenaba solo al guía.
  if (!sesion || !esDeOficina(sesion.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: { clave?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    return NextResponse.json({ ok: true, ...(await prepararConfirmaciones(String(body.clave ?? ""), sesion.nombre)) });
  } catch (e) {
    if (e instanceof ErrorAgente) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("salidas-dia/confirmaciones:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudieron preparar." }, { status: 500 });
  }
}
