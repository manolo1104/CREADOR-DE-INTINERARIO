import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { esDeOficina } from "@/lib/admin/usuarios";
import { bancosSpei } from "@/lib/admin/banxicoCep";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** GET ?fecha=YYYY-MM-DD → los bancos que podían mandar SPEI ese día (catálogo de Banxico). */
export async function GET(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || !esDeOficina(sesion.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const f = req.nextUrl.searchParams.get("fecha") ?? "";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : hoyMX();
  try {
    return NextResponse.json({ bancos: await bancosSpei(fecha) });
  } catch (e: any) {
    console.error("admin/banxico/bancos:", e?.message);
    return NextResponse.json({ error: "Banxico no respondió con la lista de bancos", bancos: [] }, { status: 502 });
  }
}
