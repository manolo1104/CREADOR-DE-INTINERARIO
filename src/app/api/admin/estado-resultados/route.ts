import { NextRequest, NextResponse } from "next/server";
import { calcEstadoResultados, type BaseCorte } from "@/lib/admin/estadoResultados";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hoy   = hoyMX();
    const desde = searchParams.get("desde") || hoy;
    const hasta = searchParams.get("hasta") || hoy;
    if (!ES_FECHA.test(desde) || !ES_FECHA.test(hasta)) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }
    const base: BaseCorte = searchParams.get("base") === "venta" ? "venta" : "tour";

    const datos = await calcEstadoResultados(
      desde <= hasta ? desde : hasta,
      desde <= hasta ? hasta : desde,
      base,
    );
    return NextResponse.json(datos);
  } catch (e: any) {
    console.error("admin/estado-resultados:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
