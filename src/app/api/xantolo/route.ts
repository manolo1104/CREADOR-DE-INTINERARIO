import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { guardarLead, registrarLead, esEmailValido, normalizarFuente } from "@/lib/leads";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildXantoloEmailHtml } from "@/lib/xantoloEmail";
import { buildXantoloPromoEmail } from "@/lib/xantoloPromoEmail";
import { nochesXantoloALaVenta } from "@/lib/paquetes";
import { lugaresDePaqueteSeguro } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * El correo del popup de Xantolo.
 *
 * Es el mismo patrón que `/api/lead-magnet` —guardar, meter en la secuencia y
 * mandar en el momento—, no `/api/guardar-email`: ése solo escribe la fila y
 * deja el envío al cron, que en la práctica corre cada 4 horas. Quien deja su
 * correo para leer una guía la quiere AHORA, no pasado mañana.
 *
 * Arranca la secuencia en el paso 1 porque la guía de Xantolo ES el paso 1: sin
 * eso recibirían después un "Tu recomendación: …" que nadie pidió.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "xantolo", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, fuente } = await req.json();

    if (!esEmailValido(email)) {
      return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
    }

    const fuenteTxt = normalizarFuente(fuente, "Popup Xantolo");

    // Un fallo de Sheets no debe impedir que la persona reciba lo que pidió.
    await guardarLead(email, fuenteTxt);

    await registrarLead(
      email,
      fuenteTxt,
      // Quien viene por Xantolo viaja en temporada alta y de noche está en la
      // fiesta: el recorrido que mejor le cuadra de día es el más reservado.
      { tourPrincipal: "expedicion-tamul" },
      1,
    );

    const { subject, html } = buildXantoloEmailHtml(email);
    await sendBrevoEmail({ to: [{ email }], subject, htmlContent: html });

    await enviarPromoPaquete(email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("xantolo_lead_failed", {
      reason: err instanceof Error ? err.message : "desconocido",
    });
    return NextResponse.json(
      { error: "No pudimos enviarlo. Intenta de nuevo o léela aquí mismo." },
      { status: 500 },
    );
  }
}

/**
 * La promo de la Noche de Xantolo (pedido de Manolo, 2 oct 2026: «ese correo se
 * lo tienes que mandar a cada persona que se registre en el popup»).
 *
 * Misma regla que el bloque del artículo: mientras quede alguna noche a la
 * venta con lugar para UNA persona; si la base no contesta se manda igual,
 * porque el pago sí cierra en falso. Va DESPUÉS de la guía y con su propio
 * `try`: lo que la persona pidió es la guía, y un fallo de la promo no debe
 * convertir su registro en un error.
 *
 * 🔴 10 oct 2026: antes miraba el paquete CON HOTEL. Se retiró (el hotel se
 * llenó) y mirarlo dejaba este correo sin mandarse nunca, en silencio.
 */
async function enviarPromoPaquete(email: string): Promise<void> {
  try {
    const noches = nochesXantoloALaVenta();
    if (!noches.length) return;
    const lugares = await Promise.all(noches.map((n) => lugaresDePaqueteSeguro(n)));
    // Que quepa alguien en alguna noche. Si no se pudo contar (null), se manda:
    // el candado de verdad está en el pago.
    const hayLugar = noches.some((_, i) => !lugares[i] || cabeEnCupo(lugares[i]!, 1));
    if (!hayLugar) return;

    const { subject, html, text } = buildXantoloPromoEmail(email);
    await sendBrevoEmail({ to: [{ email }], subject, htmlContent: html, textContent: text });
  } catch (err) {
    logger.error("xantolo_promo_failed", {
      reason: err instanceof Error ? err.message : "desconocido",
    });
  }
}
