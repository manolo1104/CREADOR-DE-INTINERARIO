import { NextRequest, NextResponse } from "next/server";
import { guardarPreciosExtras } from "@/lib/admin/preciosExtras";
import type { PresetExtra } from "@/lib/admin/extras";

export const dynamic = "force-dynamic";

/** Guarda la lista COMPLETA de conceptos con sus precios (reemplaza la anterior). */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body?.precios)) {
      return NextResponse.json({ error: "Falta la lista de precios" }, { status: 400 });
    }
    const guardados = await guardarPreciosExtras(body.precios as PresetExtra[]);
    return NextResponse.json({ ok: true, precios: guardados });
  } catch (e: any) {
    console.error("admin/precios-extras PUT:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
