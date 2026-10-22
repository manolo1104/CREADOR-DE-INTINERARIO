import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { guardarSeccionesDe, permisosDeTodos } from "@/lib/admin/permisos";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { PESTANAS } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

/**
 * PUT { user, secciones } → qué pestañas ve esa persona (Manolo, 20 oct 2026).
 * Solo el dueño: el middleware ya cierra esta ruta a quien no ve Inicio, y aquí
 * se vuelve a revisar el rol por si alguien llegara con una sesión vieja.
 */
export async function PUT(req: NextRequest) {
  const sesion = await sesionActual();
  if (sesion?.rol !== "dueno") {
    return NextResponse.json({ error: "Solo Manolo decide qué ve cada quien" }, { status: 403 });
  }
  let b: any;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const user = String(b?.user ?? "");
  try {
    const antes = (await permisosDeTodos()).find(p => p.user === user);
    const secciones = await guardarSeccionesDe(user, b?.secciones);
    const nombre = (s: string) => PESTANAS.find(p => p.seccion === s)?.etiqueta ?? s;
    const dio    = secciones.filter(s => !antes?.secciones.includes(s)).map(nombre);
    const quito  = (antes?.secciones ?? []).filter(s => !secciones.includes(s)).map(nombre);
    await registrarEnBitacora({
      accion: "modificó",
      entidad: "permisos",
      referencia: user,
      resumen: `Pestañas de ${antes?.nombre ?? user}: ${[
        dio.length ? `ahora ve ${dio.join(", ")}` : "",
        quito.length ? `ya no ve ${quito.join(", ")}` : "",
      ].filter(Boolean).join("; ") || "sin cambios"}`,
    });
    return NextResponse.json({ ok: true, personas: await permisosDeTodos() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo guardar" }, { status: 400 });
  }
}
