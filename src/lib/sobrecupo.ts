/**
 * ¿Esta reserva, que YA se pagó, cabe en sus salidas? (11 oct 2026)
 *
 * El cupo se revisa al ABRIR el pago (`create-payment-intent`), pero un pago se
 * puede completar minutos después: dos familias abren el pago del último lugar
 * al mismo tiempo, las dos pasan la revisión y las dos pagan. Rechazar aquí no
 * sirve —el dinero ya entró—, así que se registra igual y se AVISA: la nota de
 * la reserva lo dice en mayúsculas y al equipo le llega un correo para mover a
 * alguien de fecha o sumar una camioneta.
 *
 * Se llama ANTES de crear la fila: la reserva todavía no cuenta, así que la
 * pregunta es exactamente «¿cabe este grupo?». Si la base no contesta,
 * `pedidosSinCupo` deja pasar (y lo anota en el log).
 */
import { pedidosSinCupo, type PedidoDeCupo } from "@/lib/cupoTour";
import { sendBrevoEmail } from "@/lib/brevo";
import { escapeHtml } from "@/lib/escapeHtml";
import { logger } from "@/lib/logger";

export interface LineaParaCupo {
  tourSlug?:      string | null;
  tourDate?:      string | null;
  adults?:        number | null;
  children?:      number | null;
  childrenMid?:   number | null;
  childrenSmall?: number | null;
}

function personasDe(l: LineaParaCupo): number {
  const ninos = l.children != null ? Number(l.children) : Number(l.childrenMid || 0) + Number(l.childrenSmall || 0);
  return Math.max(0, Number(l.adults || 0) + (ninos || 0));
}

/**
 * Devuelve la frase para las notas («⚠️ SOBRECUPO: …») o null si todo cabe. Si
 * no cabe, avisa también al equipo por correo (sin bloquear: nunca lanza).
 */
export async function revisarSobrecupo(
  lineas: LineaParaCupo[],
  ctx: { folio: string; cliente: string; excluirApartado?: string },
): Promise<string | null> {
  const pedidos: PedidoDeCupo[] = lineas
    .filter((l) => l?.tourSlug && l?.tourDate)
    .map((l) => ({ slug: String(l.tourSlug), fecha: String(l.tourDate), personas: personasDe(l) }));
  if (!pedidos.length) return null;

  try {
    const sinLugar = await pedidosSinCupo(pedidos, { excluirApartado: ctx.excluirApartado });
    if (!sinLugar.length) return null;

    const detalle = sinLugar
      .map((s) => `${s.slug} el ${s.fecha} (${s.personas} pers., ${s.estado === "cerrada" ? "fecha CERRADA" : "ya no cabían"})`)
      .join("; ");
    const nota = `⚠️ SOBRECUPO: se pagó cuando ya no había lugar — ${detalle}. Mover de fecha o sumar unidad.`;

    const adminTo = process.env.ADMIN_EMAIL_TOURS;
    if (adminTo) {
      await sendBrevoEmail({
        to: [{ email: adminTo }],
        subject: `⚠️ Sobrecupo en ${ctx.folio}`,
        htmlContent:
          `<p>La reserva <strong>${escapeHtml(ctx.folio)}</strong> (${escapeHtml(ctx.cliente)}) se pagó cuando la salida ya estaba llena:</p>` +
          `<p>${escapeHtml(detalle)}</p>` +
          `<p>El pago entró y la reserva quedó registrada. Hay que moverla de fecha o sumar una unidad.</p>`,
      }).catch((e) => logger.error("sobrecupo_aviso_failed", { reason: e instanceof Error ? e.message : "unknown" }));
    }
    logger.warn("reserva_sobrecupo", { folio: ctx.folio, detalle });
    return nota;
  } catch (e) {
    logger.error("sobrecupo_check_failed", { reason: e instanceof Error ? e.message : "unknown" });
    return null;
  }
}
