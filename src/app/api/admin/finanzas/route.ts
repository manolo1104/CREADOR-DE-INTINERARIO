import { NextRequest, NextResponse } from "next/server";
import { calcFinanzas, periodoDe, type BaseCorte, type Granularidad } from "@/lib/admin/finanzas";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El corte de un periodo. Se puede pedir de dos formas:
 *   · `?g=dia|semana|mes&fecha=…`  → el periodo que contiene esa fecha
 *   · `?desde=…&hasta=…`           → un rango a la medida
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const base: BaseCorte = searchParams.get("base") === "venta" ? "venta" : "tour";

    let desde = searchParams.get("desde") ?? "";
    let hasta = searchParams.get("hasta") ?? "";

    if (!ES_FECHA.test(desde) || !ES_FECHA.test(hasta)) {
      const g = searchParams.get("g");
      const granularidad: Granularidad = g === "semana" ? "semana" : g === "mes" ? "mes" : "dia";
      const fecha = ES_FECHA.test(searchParams.get("fecha") ?? "") ? searchParams.get("fecha")! : hoyMX();
      const p = periodoDe(fecha, granularidad);
      desde = p.desde; hasta = p.hasta;
    }
    if (desde > hasta) [desde, hasta] = [hasta, desde];

    return NextResponse.json(await calcFinanzas(desde, hasta, base));
  } catch (e: any) {
    console.error("admin/finanzas:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
