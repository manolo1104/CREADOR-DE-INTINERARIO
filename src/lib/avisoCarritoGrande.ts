import { sendBrevoEmail } from "@/lib/brevo";
import { actividad, logger } from "@/lib/logger";
import { formatMXN } from "@/lib/tourBooking";

/**
 * Aviso a Manolo cuando alguien deja armado un carrito grande.
 *
 * Por qué existe: los links de pago que él atiende en persona cierran al 25 %;
 * la página cierra al 2.5 %. Es diez veces mejor vendedor que su propio sitio —
 * y al 18 de agosto había tres carritos vivos por $47,690 MXN que nadie había
 * tocado a mano, sencillamente porque nada le avisó de ellos.
 *
 * Un correo automático es lo correcto para un carrito de $3,000. Para uno de
 * $17,750 lo correcto es que le llegue el aviso mientras la persona sigue
 * decidiendo.
 *
 * El aviso trae el link de WhatsApp ya escrito: la diferencia entre que lo
 * atienda o no suele ser el trabajo de copiar un teléfono.
 */

/** A partir de este importe el carrito deja de ser cosa del automatismo. */
export const UMBRAL_AVISO_MXN = 10_000;

interface Aviso {
  total:         number;
  customerEmail: string;
  customerPhone?: string | null;
  tourName:      string;
  tourDate:      string;
  restoreUrl:    string;
}

export async function avisarCarritoGrande(a: Aviso): Promise<void> {
  if (a.total < UMBRAL_AVISO_MXN) return;

  const destino = process.env.ADMIN_EMAIL_TOURS;
  if (!destino) {
    logger.error("aviso_carrito_sin_destino", { total: a.total });
    return;
  }

  // El teléfono es opcional en el formulario; sin él, al menos queda el correo.
  const tel = (a.customerPhone ?? "").replace(/\D/g, "");
  const waCliente = tel
    ? `https://wa.me/${tel.length === 10 ? `52${tel}` : tel}?text=${encodeURIComponent(
        `Hola, soy de Tours Huasteca Potosina. Vi que armaste tu viaje en nuestra página (${a.tourName}). ¿Te ayudo a cerrarlo?`,
      )}`
    : null;

  actividad("🔔  CARRITO GRANDE SIN PAGAR", a.customerEmail, formatMXN(a.total), a.tourName, a.tourDate);

  try {
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `🔔 Carrito de ${formatMXN(a.total)} sin pagar — ${a.customerEmail}`,
      htmlContent: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Vale la pena una llamada</p>
          <h1 style="margin:0 0 18px;font-size:24px;color:#1a2e1a">${formatMXN(a.total)} MXN sin pagar</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
            <tr><td style="padding:6px 0;color:#888">Viaje</td><td style="padding:6px 0"><strong>${a.tourName}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#888">Primera fecha</td><td style="padding:6px 0">${a.tourDate}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Correo</td><td style="padding:6px 0">${a.customerEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#888">Teléfono</td><td style="padding:6px 0">${tel || "no lo dejó"}</td></tr>
          </table>
          <div style="margin:22px 0">
            ${waCliente
              ? `<a href="${waCliente}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:13px 26px;font-size:13px;letter-spacing:1px;text-transform:uppercase">Escribirle por WhatsApp</a>`
              : `<p style="margin:0;font-size:13px;color:#a8452c">No dejó teléfono — solo se le puede escribir por correo.</p>`}
          </div>
          <p style="margin:0;font-size:13px;color:#666">
            Su carrito, tal como lo dejó:<br>
            <a href="${a.restoreUrl}" style="color:#2c6e71">${a.restoreUrl}</a>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:14px">
            Te llega este aviso porque el carrito pasa de ${formatMXN(UMBRAL_AVISO_MXN)}.
            Los correos automáticos de recuperación salen igual, a la hora y a las 24 y 72 horas.
          </p>
        </div>`,
    });
  } catch (err) {
    // Que falle el aviso no puede tumbar el guardado del carrito del cliente.
    logger.error("aviso_carrito_grande_failed", {
      total: a.total,
      reason: err instanceof Error ? err.message : "desconocido",
    });
  }
}
