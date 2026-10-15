import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { confirmarPasaje, esPagoDelViaje } from "@/lib/viajeCdmx/confirmar";
import { registrarFichaOxxo } from "@/lib/viajeCdmx/apartar";
import { correoFichaOxxo } from "@/lib/viajeCdmx/correos";
import { respuestaDeError } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * La pantalla avisa que terminó de pagar. Del navegador solo se acepta el id
 * del cobro: el estado se le pregunta a Stripe y la reserva se arma con lo que
 * guardó el servidor. El webhook hace lo mismo por su lado; el que llegue
 * segundo encuentra la reserva hecha.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-confirmar", limit: 20, windowMs: 60_000 });
  if (limitado) return limitado;
  let b: { paymentIntentId?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const id = String(b.paymentIntentId ?? "");
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ error: "Pago inválido." }, { status: 400 });

  try {
    const pi = await stripe.paymentIntents.retrieve(id);
    if (!esPagoDelViaje(pi)) return NextResponse.json({ error: "Pago inválido." }, { status: 400 });

    if (pi.status === "succeeded") {
      const r = await confirmarPasaje(pi, "pantalla");
      if (r.estado !== "creada" && r.estado !== "ya-existia") return NextResponse.json({ estado: "procesando" });
      const saldo = Math.max(0, r.reserva.totalAmount - Math.round((pi.amount_received || pi.amount) / 100));
      return NextResponse.json({
        estado: "pagado",
        folio: r.reserva.confirmationNumber,
        personas: r.reserva.adults,
        total: r.reserva.totalAmount,
        anticipo: Math.round((pi.amount_received || pi.amount) / 100),
        saldo,
      });
    }
    if (pi.status === "requires_action" && pi.next_action?.oxxo_display_details) {
      const f = await registrarFichaOxxo(pi);
      if (f.estado === "sin-lugar") return NextResponse.json({ estado: "sin-lugar", error: "Mientras se generaba tu ficha alguien más tomó el último lugar. La ficha se canceló: no la pagues." }, { status: 409 });
      if (f.estado === "ficha") {
        if (f.primeraVez) {
          correoFichaOxxo(f.apartado, f.voucherUrl, f.vence).catch((e: unknown) =>
            logger.error("viaje_cdmx_correo_oxxo_fallo", { pi: pi.id, reason: e instanceof Error ? e.message : String(e) }));
        }
        return NextResponse.json({ estado: "oxxo", voucherUrl: f.voucherUrl, vence: f.vence.toISOString(), anticipo: f.apartado.anticipo });
      }
    }
    if (pi.status === "processing") return NextResponse.json({ estado: "procesando" });
    return NextResponse.json({ estado: "sin-pago", status: pi.status });
  } catch (e) {
    return respuestaDeError(e, "confirmar");
  }
}
