import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";
import { ligasPorPersona } from "@/lib/admin/linksPago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/cotizaciones/[folio]/ligas { partes, base? } — una liga de
 * Stripe por persona (16 nov 2026, «Estructura de oro»: si viajan varios y
 * cada quien paga lo suyo, Erick manda una liga por persona).
 *
 * `partes`: entre 2 y 12. `base`: "anticipo" (por omisión, el acordado en la
 * cotización) o "total". Reparte el monto en pesos enteros que suman exacto.
 * Apaga la liga del anticipo completo para que nadie la pague encima.
 *
 * 200 { folio, ligas: [{ parte, de, url, monto, pagada }] } · 400 si no se
 * puede (ya entró un pago, está vencida o reemplazada, partes fuera de rango)
 * · 404 sin cotización.
 */
export async function POST(req: NextRequest, { params }: { params: { folio: string } }) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  const folio = String(params.folio || "").trim().toUpperCase();
  let body: { partes?: unknown; base?: unknown } = {};
  try { body = await req.json(); } catch { /* sin cuerpo */ }
  const partes = Number(body.partes);
  const base = body.base === "total" ? "total" : "anticipo";
  if (!Number.isInteger(partes) || partes < 2 || partes > 12) {
    return NextResponse.json({ error: "`partes` va de 2 a 12." }, { status: 400 });
  }

  const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio }, select: { id: true, quoteNumber: true } });
  if (!q) return NextResponse.json({ error: `No existe la cotización ${folio}.` }, { status: 404 });

  const r = await ligasPorPersona(q.id, partes, base);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ folio: q.quoteNumber, base, ligas: r.ligas });
}
