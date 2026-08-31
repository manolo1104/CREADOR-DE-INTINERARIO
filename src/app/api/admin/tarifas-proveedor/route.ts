import { NextRequest, NextResponse } from "next/server";
import { guardarTarifasProveedor } from "@/lib/admin/tarifasProveedor";
import type { TarifaProveedor } from "@/lib/admin/proveedor";

export const dynamic = "force-dynamic";

/** Guarda la lista COMPLETA de tarifas del proveedor (reemplaza la anterior). */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body?.tarifas)) {
      return NextResponse.json({ error: "Falta la lista de tarifas" }, { status: 400 });
    }
    const guardadas = await guardarTarifasProveedor(body.tarifas as TarifaProveedor[]);
    return NextResponse.json({ ok: true, tarifas: guardadas });
  } catch (e: any) {
    console.error("admin/tarifas-proveedor PUT:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
