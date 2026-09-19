import { NextRequest, NextResponse } from "next/server";
import { calcCorte, type BaseCorte, type Granularidad } from "@/lib/admin/corte";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha") || hoyMX();
    if (!ES_FECHA.test(fecha)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const g = searchParams.get("g");
    const granularidad: Granularidad =
      g === "semana" ? "semana" : g === "mes" ? "mes" : "dia";
    const base: BaseCorte = searchParams.get("base") === "venta" ? "venta" : "tour";

    return NextResponse.json(await calcCorte(fecha, granularidad, base));
  } catch (e: any) {
    console.error("admin/corte:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
