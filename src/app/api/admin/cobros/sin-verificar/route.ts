import { NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { esDeOficina, puedeHacer } from "@/lib/admin/usuarios";
import { transferenciasSinVerificar } from "@/lib/admin/cobros";

export const dynamic = "force-dynamic";

/** GET → transferencias y depósitos de los últimos 60 días sin verificar (pestaña Cobros). */
export async function GET() {
  try {
    const sesion = await sesionActual();
    if (!sesion || !esDeOficina(sesion.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    return NextResponse.json({
      lista: await transferenciasSinVerificar(60),
      puedeVerificar: puedeHacer(sesion.rol, "verificarCobro"),
      puedeVerificarAMano: puedeHacer(sesion.rol, "verificarCobroManual"),
    });
  } catch (e: any) {
    console.error("admin/cobros/sin-verificar:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
