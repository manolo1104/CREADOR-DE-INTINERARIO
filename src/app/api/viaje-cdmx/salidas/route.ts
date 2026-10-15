import { NextResponse } from "next/server";
import { salidasPublicas } from "@/lib/viajeCdmx/salidas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Las próximas salidas con sus lugares y su precio de ESTE momento. Sin caché:
 * lo que dice aquí es lo que cobra el servidor un segundo después.
 */
export async function GET() {
  try {
    const ahora = new Date();
    const salidas = await salidasPublicas(ahora);
    return NextResponse.json({ ahora: ahora.toISOString(), salidas }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    logger.error("viaje_cdmx_salidas_fallo", { reason: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "No pudimos leer las fechas. Intenta de nuevo." }, { status: 503 });
  }
}
