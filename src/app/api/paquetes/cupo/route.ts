import { NextRequest, NextResponse } from "next/server";
import { getPaquete, eventoALaVenta } from "@/lib/paquetes";
import { lugaresDePaquete } from "@/lib/cupoPaquete";

export const dynamic = "force-dynamic";

/**
 * Cuántos lugares quedan de un paquete de evento. Público: es lo mismo que
 * anuncia la página. No dice cuánto se vendió por cada puerta.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const paquete = getPaquete(slug);
  if (!paquete?.evento) return NextResponse.json({ error: "Paquete sin cupo." }, { status: 404 });
  try {
    const l = await lugaresDePaquete(paquete);
    return NextResponse.json({ cupo: l?.cupo ?? paquete.evento.cupo, libres: l?.libres ?? 0, aLaVenta: eventoALaVenta(paquete) });
  } catch {
    return NextResponse.json({ error: "No se pudo contar." }, { status: 503 });
  }
}
