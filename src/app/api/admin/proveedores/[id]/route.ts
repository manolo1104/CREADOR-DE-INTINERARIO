import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { limpiarProveedor } from "@/lib/admin/rutas";

export const dynamic = "force-dynamic";

/** PATCH — editar un proveedor (o darlo de baja con activo: false; no se borra: las rutas lo citan). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const antes = await prisma.proveedor.findUnique({ where: { id: params.id } });
  if (!antes) return NextResponse.json({ error: "Ese proveedor no existe." }, { status: 404 });
  try {
    const p = limpiarProveedor(body, TOURS_LISTA.map(t => t.slug));
    await prisma.proveedor.update({ where: { id: params.id }, data: { ...p, precios: p.precios as object[] } });
    await registrarEnBitacora({ accion: "modificó", entidad: "proveedor", referencia: p.nombre, resumen: `Proveedor ${p.nombre}${antes.activo && !p.activo ? " dado de baja" : " editado"}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
