import { sendBrevoEmail } from "@/lib/brevo";
import { actividad, logger } from "@/lib/logger";
import { formatMXN } from "@/lib/tourBooking";
import {
  C, bajoBoton, boton, filaDato, nota, shellCorreo, tabla,
} from "./emailLayout";

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

export interface Aviso {
  total:         number;
  customerEmail: string;
  customerPhone?: string | null;
  tourName:      string;
  tourDate:      string;
  restoreUrl:    string;
}

/**
 * El aviso, armado aparte del envío.
 *
 * Antes solo existía dentro del `try` que lo manda, así que la única forma de
 * verlo era provocar un carrito de más de $10,000 en producción. Es el correo
 * que decide si Manolo llama o no a una venta de cinco cifras: conviene poder
 * mirarlo.
 */
/** "2026-11-14" → "sáb 14 de noviembre". En crudo se lee a base de datos. */
function fechaLegible(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || "sin fecha";
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "long",
  });
}

export function buildAvisoCarritoGrandeHtml(a: Aviso): { subject: string; html: string } {
  // El teléfono es opcional en el formulario; sin él, al menos queda el correo.
  const tel = (a.customerPhone ?? "").replace(/\D/g, "");
  const waCliente = tel
    ? `https://wa.me/${tel.length === 10 ? `52${tel}` : tel}?text=${encodeURIComponent(
        `Hola, soy de Tours Huasteca Potosina. Vi que armaste tu viaje en nuestra página (${a.tourName}). ¿Te ayudo a cerrarlo?`,
      )}`
    : null;

  // Este correo es OPERATIVO, no comercial: lo lee Manolo en el celular para
  // decidir si llama. Lleva la marca puesta, pero el dato manda sobre el
  // adorno — el importe y el botón de WhatsApp van arriba de todo.
  const html = shellCorreo({
    locale: "es",
    preheader: "Aviso interno · Tours Huasteca Potosina",
    eyebrow: "Vale la pena una llamada",
    h1a: `${formatMXN(a.total)} MXN`,
    h1b: "sin pagar",
    entradilla: `${a.tourName} · primera fecha: ${fechaLegible(a.tourDate)}`,
    cuerpo: [
      waCliente
        ? boton(waCliente, "Escribirle por WhatsApp", "whatsapp")
        : nota("No dejó teléfono — solo se le puede escribir por correo.", C.terracota, "0"),
      waCliente ? bajoBoton("El mensaje ya va escrito. Solo dale enviar.") : "",
      tabla([
        filaDato("Correo", a.customerEmail, true),
        filaDato("Teléfono", tel || "no lo dejó"),
        filaDato("Viaje", a.tourName),
        filaDato("Primera fecha", fechaLegible(a.tourDate)),
      ].join("")),
      nota(`Su carrito, tal como lo dejó:<br><a href="${a.restoreUrl}" style="color:${C.verde};font-weight:500;word-break:break-all;">${a.restoreUrl}</a>`),
    ].join(""),
    pie: `Te llega este aviso porque el carrito pasa de ${formatMXN(UMBRAL_AVISO_MXN)}. Los correos automáticos de recuperación salen igual, a la hora y a las 24 y 72 horas.`,
  });

  return { subject: `🔔 Carrito de ${formatMXN(a.total)} sin pagar — ${a.customerEmail}`, html };
}

export async function avisarCarritoGrande(a: Aviso): Promise<void> {
  if (a.total < UMBRAL_AVISO_MXN) return;

  const destino = process.env.ADMIN_EMAIL_TOURS;
  if (!destino) {
    logger.error("aviso_carrito_sin_destino", { total: a.total });
    return;
  }

  actividad("🔔  CARRITO GRANDE SIN PAGAR", a.customerEmail, formatMXN(a.total), a.tourName, a.tourDate);

  const { subject, html } = buildAvisoCarritoGrandeHtml(a);

  try {
    await sendBrevoEmail({ to: [{ email: destino }], subject, htmlContent: html });
  } catch (err) {
    // Que falle el aviso no puede tumbar el guardado del carrito del cliente.
    logger.error("aviso_carrito_grande_failed", {
      total: a.total,
      reason: err instanceof Error ? err.message : "desconocido",
    });
  }
}

// ── Aviso de pago sin confirmación ─────────────────────────────────────────

export interface AvisoPagoIncompleto {
  confirmationNumber: string;
  tourName:      string;
  tourDate:      string;
  totalAmount:   number;
  paymentIntent: string;
  receiptEmail:  string;
}

/**
 * El aviso de "entró un pago y no pudimos confirmarle al cliente".
 *
 * Vivía dentro del webhook de Stripe, o sea que solo se podía ver provocando un
 * pago con un correo inválido. Es la red de seguridad del sistema: si esto se
 * ve mal o llega incompleto, un cliente que YA PAGÓ se queda sin noticias.
 */
export function buildAvisoPagoIncompletoHtml(a: AvisoPagoIncompleto): { subject: string; html: string } {
  return {
    subject: `⚠️ Pago recibido sin confirmación completa — ${a.confirmationNumber}`,
    html: shellCorreo({
      locale: "es",
      preheader: "Aviso interno · Tours Huasteca Potosina",
      eyebrow: "Requiere tu atención",
      h1a: "Pago recibido,",
      h1b: "cliente sin avisar",
      entradilla: "Entró el dinero pero el cliente no completó la pantalla de confirmación, así que NO recibió su correo. Hay que contactarlo a mano.",
      cuerpo: [
        tabla([
          filaDato("Confirmación", a.confirmationNumber, true),
          filaDato("Tour", a.tourName || "—"),
          filaDato("Fecha", a.tourDate ? fechaLegible(a.tourDate) : "—"),
          filaDato("Monto cobrado", `$${a.totalAmount.toLocaleString("es-MX")} MXN`),
          filaDato("PaymentIntent", a.paymentIntent),
          filaDato("Email del recibo", a.receiptEmail || "—"),
        ].join("")),
        nota("Revisa Stripe y contacta al cliente para coordinar el tour.", C.terracota),
      ].join(""),
    }),
  };
}
