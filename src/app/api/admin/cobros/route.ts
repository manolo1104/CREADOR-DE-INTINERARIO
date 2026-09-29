import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { efectivoEnManos, entregarTodoDe } from "@/lib/admin/cobros";

export const dynamic = "force-dynamic";

// GET → cuánto efectivo cobrado sigue sin entregar, y en manos de quién.
//
// A propósito NO se filtra por periodo: el efectivo que alguien trae desde hace
// dos semanas sigue siendo efectivo que trae. Mismo criterio que las cuentas
// por pagar.
export async function GET() {
  try {
    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "marcarEntregaEfectivo")) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    return NextResponse.json(await efectivoEnManos());
  } catch (e: any) {
    console.error("admin/cobros GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH → dar por recibido TODO el efectivo que trae una persona.
export async function PATCH(req: NextRequest) {
  try {
    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "marcarEntregaEfectivo")) {
      return NextResponse.json({ error: "Solo un socio da por recibido el efectivo" }, { status: 403 });
    }
    const b = await req.json();
    const persona = String(b?.persona ?? "").trim();
    if (!persona) return NextResponse.json({ error: "Falta de quién es el efectivo" }, { status: 400 });

    const total = await entregarTodoDe(persona, sesion.nombre);
    return NextResponse.json({ ok: true, total, enManos: await efectivoEnManos() });
  } catch (e: any) {
    console.error("admin/cobros PATCH:", e?.message);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
