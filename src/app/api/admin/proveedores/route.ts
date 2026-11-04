import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { limpiarProveedor } from "@/lib/admin/rutas";

export const dynamic = "force-dynamic";

/** POST — un proveedor nuevo (Fase 1). La sección «Proveedores» la cierra el middleware. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const p = limpiarProveedor(body, TOURS_LISTA.map(t => t.slug));
    const creado = await prisma.proveedor.create({ data: { ...p, precios: p.precios as object[] } });
    await registrarEnBitacora({ accion: "creó", entidad: "proveedor", referencia: p.nombre, resumen: `Proveedor nuevo: ${p.nombre}` });
    return NextResponse.json({ ok: true, id: creado.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
