import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { renovarApartado, soltarPorCobro } from "@/lib/viajeCdmx/apartar";
import { respuestaDeError } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lo que el checkout pide sobre SU apartado. Hace falta el par apartado +
 * cobro (el cobro solo lo conoce quien lo creó), no basta con adivinar un id.
 *  - renovar: justo antes de pagar, unos minutos más. Si su lugar ya es de
 *    otro, lo sabe ANTES de pagar.
 *  - soltar:  cambió de fecha o de personas; el lugar vuelve en el acto.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-apartado", limit: 30, windowMs: 60_000 });
  if (limitado) return limitado;
  let b: { holdId?: string; paymentIntentId?: string; accion?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const holdId = String(b.holdId ?? "");
  const piId = String(b.paymentIntentId ?? "");

  try {
    if (b.accion === "renovar") {
      const a = await renovarApartado(holdId, piId);
      return NextResponse.json({ ok: true, expiraEl: a.expiraEl.toISOString(), estado: a.estado });
    }
    if (b.accion === "soltar") {
      const a = await prisma.apartadoSalida.findUnique({ where: { id: holdId } });
      if (!a || a.paymentIntentId !== piId || a.estado !== "activo" || a.metodo === "oxxo") return NextResponse.json({ ok: true });
      const pi = await stripe.paymentIntents.retrieve(piId);
      await soltarPorCobro(pi);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
  } catch (e) {
    return respuestaDeError(e, "apartado");
  }
}
