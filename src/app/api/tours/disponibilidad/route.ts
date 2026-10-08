import { NextRequest, NextResponse } from "next/server";
import { disponibilidadDeTour, CUPO_DIARIO, RANGO_MAX_DIAS } from "@/lib/cupoTour";
import { TOURS_DB } from "@/lib/tours";
import { addDaysYMD, diffDiasYMD, hoyMX } from "@/lib/dates";
import { rateLimit } from "@/lib/rateLimit";
import { esIdApartado } from "@/lib/apartadosAlmacen";

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
 * GET /api/tours/disponibilidad?slug=&desde=&hasta=&personas=&apartado=
 *   → { dias: { "AAAA-MM-DD": "libre" | "con-reservas" | "casi-lleno" | "sin-cupo" | "no-cabe" | "cerrada" } }
 *
 * El color de cada día para el calendario del sitio (ver `lib/cupoTour.ts`).
 * Público, así que devuelve SOLO estados, nunca cuántas personas van: la
 * ocupación de cada día es el volumen de ventas del negocio.
 *
 * Nada de lo que conteste aquí aparta lugar ni deja pagar: el cobro vuelve a
 * contar con la base en ese momento. Por eso, si la base falla, contesta 200
 * con `dias` vacío y el calendario se porta como antes (todo elegible).
 * Los días pasados no se cuentan: `desde` nunca es antes de hoy en México.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { key: "disponibilidad", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const q = req.nextUrl.searchParams;
  const slug = (q.get("slug") ?? "").trim();
  if (!slug || !TOURS_DB.some((t) => t.slug === slug)) {
    return NextResponse.json({ error: "Recorrido desconocido." }, { status: 404 });
  }

  const hoy = hoyMX();
  const desdePedido = q.get("desde");
  const hastaPedido = q.get("hasta");
  if ((desdePedido && !fechaReal(desdePedido)) || (hastaPedido && !fechaReal(hastaPedido))) {
    return NextResponse.json({ error: "Fechas en formato AAAA-MM-DD." }, { status: 400 });
  }
  const desde = fechaReal(desdePedido) && desdePedido > hoy ? desdePedido : hoy;
  const hasta = fechaReal(hastaPedido) ? hastaPedido : addDaysYMD(desde, RANGO_MAX_DIAS);
  if (diffDiasYMD(desde, hasta) > RANGO_MAX_DIAS) {
    return NextResponse.json({ error: `Máximo ${RANGO_MAX_DIAS} días por consulta.` }, { status: 400 });
  }

  // El grupo que se quiere meter. Arriba del cupo no cabe en ningún día, que
  // es justo lo que hay que pintar; más allá de eso el número ya no cambia nada.
  const personas = Math.min(CUPO_DIARIO + 1, Math.max(0, Math.floor(Number(q.get("personas")) || 0)));

  // Los apartados de otros carritos cuentan como reservas; el de quien
  // pregunta no (`useApartado` lo manda): si no, la fecha que él mismo tiene
  // apartada se le pintaría «no caben» a su propio grupo.
  const apartado = q.get("apartado");

  if (hasta < desde) return NextResponse.json({ dias: {} });

  try {
    const dias = await disponibilidadDeTour(slug, desde, hasta, personas, esIdApartado(apartado) ? apartado : undefined);
    return NextResponse.json(
      { dias },
      // Corto a propósito: un minuto viejo no le cambia la vida a nadie y el
      // cobro vuelve a contar; más, y un día recién lleno seguiría verde.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } },
    );
  } catch (e: unknown) {
    console.error("❌ tours/disponibilidad:", e instanceof Error ? e.message : e);
    return NextResponse.json({ dias: {} }, { headers: { "Cache-Control": "no-store" } });
  }
}
