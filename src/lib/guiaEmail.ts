/**
 * Correo de entrega de la Guía Definitiva ($49), tras el pago.
 *
 * Estaba pegado dentro del webhook de Stripe, o sea que la única forma de
 * verlo era comprar la guía. Aquí afuera se renderiza sin cobrar nada.
 *
 * El HTML es EL MISMO, movido tal cual: no se cambió ni un texto ni un enlace.
 */

import {
  BASE, C, WA, bajoBoton, barra, boton, parrafo, shellCorreo, tabla, titulo,
} from "./emailLayout";

const BASE_POR_DEFECTO = BASE;

export interface GuiaEmailInput {
  /** Sesión de Stripe: es lo que autoriza la descarga. */
  sessionId: string;
  /** `APP_URL` en producción; se deja inyectable para poder previsualizar. */
  appUrl?: string;
}

export function buildGuiaEmailHtml(d: GuiaEmailInput): { subject: string; html: string } {
  const appUrl      = d.appUrl ?? BASE_POR_DEFECTO;
  const downloadUrl = `${appUrl}/guia/descarga?session_id=${d.sessionId}`;
  const tripUrl     = `${appUrl}/viaje-septiembre`;
  const toursUrl    = `${appUrl}/tours`;

  const html = shellCorreo({
    locale: "es",
    preheader: "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: "Tu compra",
    h1a: "¡Gracias por",
    h1b: "tu compra!",
    entradilla: "Tu Guía Definitiva de la Huasteca Potosina 2026 está lista. Guarda este correo: el botón sirve para volver a descargarla cuando quieras.",
    cuerpo: [
      boton(downloadUrl, "↓ Descargar mi guía", "dorado"),
      bajoBoton("Ábrela en tu celular o computadora. Para guardarla como PDF: <strong>Ctrl/Cmd + P → Guardar como PDF</strong>."),
      barra("¿Y si lo dejas en nuestras manos?"),
      tabla(`
        <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:22px;">
          ${titulo("El viaje de septiembre, todo incluido", "0 0 10px 0")}
          ${parrafo("Salimos de CDMX del <strong>16 al 19 de septiembre de 2026</strong>: transporte redondo, hospedaje y 3 recorridos guiados. Desde $7,900 por persona.", "0")}
        </td></tr>`),
      boton(tripUrl, "Ver el viaje de septiembre"),
      bajoBoton(`¿Prefieres armarlo tú? <a href="${toursUrl}" style="color:${C.verde};font-weight:500;">Mira los tours sueltos</a>.`),
    ].join(""),
    pie: `¿Alguna duda? Responde a este correo o escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a>.`,
  });

  return { subject: "Tu Guía Definitiva de la Huasteca Potosina 🌿 — descárgala aquí", html };
}
