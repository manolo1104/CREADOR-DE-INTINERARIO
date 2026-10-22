import { NextRequest, NextResponse } from "next/server";
import { hoyMX } from "@/lib/dates";
import { baseCumple, validarCodigoCumple, PCT_CUMPLE } from "@/lib/encuestas/cumple";

export const dynamic = "force-dynamic";

/**
 * ¿Sirve este código de cumpleaños y cuánto descuenta? (21 oct 2026)
 * `{ codigo, lineas, folio? }` → el 10 % de los tours que aplican (sin RZR,
 * hotel, extras, traslado de Valles ni viaje CDMX), calculado aquí con el
 * catálogo. No lo marca como usado: eso pasa al GUARDAR la reserva.
 */
export async function POST(req: NextRequest) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* vacío */ }
  const v = await validarCodigoCumple(b.codigo, hoyMX(), typeof b.folio === "string" ? b.folio : undefined);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { base, monto, lineas } = baseCumple(b.lineas);
  if (monto <= 0) {
    return NextResponse.json({ error: "Esta reserva no tiene tours a los que aplique (el RZR, el hotel y los extras no entran)." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, codigo: v.codigo, nombre: v.nombre, venceEl: v.venceEl, pct: PCT_CUMPLE, base, monto, lineas });
}
