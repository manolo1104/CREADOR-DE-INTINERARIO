import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { guardarRegistroSalida } from "@/lib/admin/registroSalidaDatos";
import { addDaysYMD } from "@/lib/dates";

export const dynamic = "force-dynamic";

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * PATCH { clave, guia?, vehiculo?, estado?, tipo?, notas?, marcar?, agregar?, checklist?, incidencia?, quitarIncidencia? }
 * Guarda lo operativo de una salida (`Salida`); se crea al primer toque.
 * La sección es «Salidas del día» (también la ve el guía). Lo marcado en el
 * checklist queda con quién y cuándo. La regla vive en `registroSalidaDatos.ts`
 * (lote 6, 10 nov 2026): sin pisarse, el guía también en sus reservas y la
 * cancelada con reservas deja un seguimiento.
 */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const clave = texto(body.clave, 200);
  const fecha = clave.slice(0, 10);
  const partes = clave.split("|");
  if (partes.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || addDaysYMD(fecha, 0) !== fecha || !partes[1]) {
    return NextResponse.json({ error: "Esa salida no existe." }, { status: 400 });
  }
  const sesion = await sesionActual();
  try {
    const r = await guardarRegistroSalida(clave, body, sesion ? { nombre: sesion.nombre, rol: sesion.rol } : null);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json(r);
  } catch (e: any) {
    console.error("admin/salidas-dia PATCH:", e?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
