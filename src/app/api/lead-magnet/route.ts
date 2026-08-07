import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { guardarLead, esEmailValido, normalizarFuente } from "@/lib/leads";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildItinerarioEmailHtml } from "@/lib/itinerarioEmail";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lead magnet: "Itinerario de 3 días en la Huasteca".
//
// Este endpoint estuvo devolviendo 410 a propósito, para no regalar la guía que
// se vende en /guia por $49. El problema es que el formulario del blog nunca se
// quitó: seguía vivo en cada artículo prometiendo un PDF gratis y fallando el
// 100 % de las veces (2 correos capturados en 8 días con ~1,300 sesiones).
//
// Lo que se regala ahora es distinto del producto pagado: el itinerario resuelve
// "qué hago en 3 días" y termina ofreciendo la Guía Definitiva, que resuelve
// "cómo lo hago yo solo" (presupuestos, rutas desde cada ciudad, 5 y 7 días).
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "lead-magnet", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, fuente } = await req.json();

    if (!esEmailValido(email)) {
      return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
    }

    const fuenteTxt = normalizarFuente(fuente, "Itinerario 3 días");

    // Se guarda el lead primero, pero un fallo de Sheets no debe impedir que la
    // persona reciba lo que pidió.
    await guardarLead(email, fuenteTxt);

    const { subject, html } = buildItinerarioEmailHtml();
    await sendBrevoEmail({ to: [{ email }], subject, htmlContent: html });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("lead_magnet_failed", {
      reason: err instanceof Error ? err.message : "desconocido",
    });
    return NextResponse.json(
      { error: "No pudimos enviarlo. Intenta de nuevo o escríbenos por WhatsApp." },
      { status: 500 },
    );
  }
}
