import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { cambiarConversacion, encolarRespuesta, reintentar } from "@/lib/admin/bandejaDatos";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

/** POST { texto } — contestar desde el panel (queda en cola y el puente lo manda). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: { texto?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const m = await encolarRespuesta(params.id, body.texto, sesion.nombre);
    return NextResponse.json({ ok: true, id: m.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "No se pudo mandar." }, { status: 400 });
  }
}

/** PATCH { accion: leida | archivar | desarchivar | no-es-cliente | es-cliente | reintentar, mensajeId? } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: { accion?: unknown; mensajeId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    if (body.accion === "reintentar") {
      await reintentar(String(body.mensajeId ?? ""));
      await registrarEnBitacora({ accion: "modificó", entidad: "whatsapp", referencia: params.id, resumen: `${sesion.nombre} reintentó un mensaje que no salió` });
    } else await cambiarConversacion(params.id, String(body.accion ?? ""), sesion.nombre);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error)?.message || "No se pudo guardar." }, { status: 400 });
  }
}
