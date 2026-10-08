import { NextRequest, NextResponse } from "next/server";
import { apartar } from "@/lib/apartados";
import { APARTADO_MINUTOS, esIdApartado, liberarApartado } from "@/lib/apartadosAlmacen";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cada respuesta es de UN carrito y de este instante: nada se guarda en caché. */
const SIN_CACHE = { "Cache-Control": "no-store" };

/**
 * POST /api/tours/apartar   { id?, lineas: [{ slug, fecha: "AAAA-MM-DD", personas }], locale }
 *   200 { ok: true, id, vence, minutos, ahora }       apartado (o reemplazado) por 15 minutos
 *   409 { ok: false, sinCupo, mensajes, ahora }       algo ya no cabe: no queda NADA apartado
 *   4xx/5xx { ok: false, error, ahora }               sin apartado (y sin reloj en la pantalla)
 *
 * DELETE /api/tours/apartar?id=   suelta el apartado (el carrito se quedó sin recorridos).
 *
 * Lo usa el carrito (`useApartado`). La lógica vive en `lib/apartados.ts`.
 * `ahora` es la hora del servidor: con ella el navegador corrige su reloj y la
 * cuenta regresiva no miente si el teléfono va adelantado o atrasado.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "apartar", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido.", ahora: Date.now() }, { status: 400, headers: SIN_CACHE });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Pedido inválido.", ahora: Date.now() }, { status: 400, headers: SIN_CACHE });
  }
  const { id, lineas, locale } = body as Record<string, unknown>;
  // El id lo inventa el servidor: si llega uno, tiene que tener su forma.
  if (id !== undefined && id !== null && !esIdApartado(id)) {
    return NextResponse.json({ ok: false, error: "Apartado desconocido.", ahora: Date.now() }, { status: 400, headers: SIN_CACHE });
  }

  const r = await apartar({
    id:     esIdApartado(id) ? id : undefined,
    lineas,
    ip:     clientIp(req),
    locale: locale === "en" ? "en" : "es",
  });
  const ahora = Date.now();
  if (r.ok) {
    return NextResponse.json({ ok: true, id: r.id, vence: r.vence, minutos: APARTADO_MINUTOS, ahora }, { headers: SIN_CACHE });
  }
  if ("sinCupo" in r) {
    return NextResponse.json({ ok: false, sinCupo: r.sinCupo, mensajes: r.mensajes, ahora }, { status: 409, headers: SIN_CACHE });
  }
  return NextResponse.json({ ok: false, error: r.error, ahora }, { status: r.status, headers: SIN_CACHE });
}

export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { key: "apartar", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const id = req.nextUrl.searchParams.get("id");
  if (!esIdApartado(id)) {
    return NextResponse.json({ ok: false, error: "Apartado desconocido." }, { status: 400, headers: SIN_CACHE });
  }
  await liberarApartado(id);
  return NextResponse.json({ ok: true }, { headers: SIN_CACHE });
}
