import { NextRequest, NextResponse } from "next/server";
import { disponibilidadDelDia, seElige, CUPO_DIARIO } from "@/lib/cupoTour";
import { hoyMX } from "@/lib/dates";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** ¿AAAA-MM-DD de un día que existe? (2026-02-30 no). */
function fechaReal(f: string | null): f is string {
  if (!f || !FECHA.test(f)) return false;
  const [y, m, d] = f.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * GET /api/tours/disponibilidad-del-dia?fecha=AAAA-MM-DD&personas=4
 *   → { conLugar: string[], sinLugar: string[] }
 *
 * Qué recorridos admiten a ESE grupo en ESA fecha. Es lo que contesta el botón
 * «Ver disponibilidad» del motor: en vez de filtrar por lo que el catálogo dice
 * que cabe, pregunta a la base por lo que de verdad queda.
 *
 * 🔴 Devuelve LISTAS DE SLUGS, nunca cuántas personas van cada día. Es la misma
 * frontera que guarda `/api/tours/disponibilidad`: la ocupación de una fecha es
 * el volumen de ventas del negocio y no se publica. «Hay lugar» o «no hay» es
 * todo lo que el visitante necesita y todo lo que se dice.
 *
 * Si la base falla contesta 200 con las dos listas vacías y el motor se porta
 * como antes (enseña todo): con doce lugares por día y casi todos libres,
 * perder la venta por un tropiezo de la base cuesta más que el riesgo. Es la
 * misma decisión que toma `pedidosSinCupo`, y el cobro vuelve a contar de
 * todos modos antes de aceptar un peso.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { key: "disponibilidad-dia", limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const q = req.nextUrl.searchParams;
  const fecha = q.get("fecha");
  if (!fechaReal(fecha)) {
    return NextResponse.json({ error: "Fecha en formato AAAA-MM-DD." }, { status: 400 });
  }
  // Un día que ya pasó no tiene nada que ofrecer.
  if (fecha < hoyMX()) {
    return NextResponse.json({ conLugar: [], sinLugar: [] });
  }

  // Arriba del cupo no cabe en ningún lado, que es justo lo que hay que decir;
  // más allá de eso el número ya no cambia nada.
  const personas = Math.min(CUPO_DIARIO + 1, Math.max(0, Math.floor(Number(q.get("personas")) || 0)));

  try {
    const dias = await disponibilidadDelDia(fecha, personas);
    const conLugar: string[] = [];
    const sinLugar: string[] = [];
    for (const [slug, estado] of Object.entries(dias)) {
      (seElige(estado) ? conLugar : sinLugar).push(slug);
    }
    return NextResponse.json({ conLugar, sinLugar }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[disponibilidad-del-dia] la base no contestó:", e);
    return NextResponse.json({ conLugar: [], sinLugar: [] });
  }
}
