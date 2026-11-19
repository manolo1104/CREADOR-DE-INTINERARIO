/**
 * Por dónde entró una reserva.
 *
 * En 28 días GA4 registró 4 compras mientras el panel mostraba once reservas.
 * Esa diferencia admite dos explicaciones opuestas —la medición está rota, o
 * la mayoría de las ventas se cierran por WhatsApp— y llevan a decisiones
 * contrarias: arreglar el `purchase` o invertir en el chat. Sin este campo no
 * hay forma de distinguirlas, y todo lo que se decida encima es opinión.
 *
 * Vive en su propio módulo porque lo usan tres sitios que no deberían
 * copiarse la lista: la API que valida, el formulario del panel que la pinta y
 * el desglose de ingresos que agrupa por ella.
 */

export const ORIGENES = ["web", "whatsapp", "whatsapp_sitio", "telefono", "walkin", "ota", "por_confirmar"] as const;

/**
 * «Por confirmar»: no se sabe por dónde llegó. Ventas decía Web 90 / WhatsApp 7
 * porque muchas reservas hechas a mano heredaron «web» sin que nadie lo
 * eligiera: el default de la columna, y el botón viejo «Convertir a reserva»
 * de Cotizaciones, que no mandaba canal hasta el 18 nov 2026. La migración
 * `corregir-canal-historico.ts` las deja aquí para que el renglón de Web
 * vuelva a ser verdad. No se ofrece en el formulario: es un estado del dato,
 * no un canal.
 */
export const ORIGEN_POR_CONFIRMAR = "por_confirmar" as const;
/**
 * Los canales que sí se pueden elegir al capturar. Una sola opción de WhatsApp
 * (Manolo, 3 nov 2026): «WhatsApp (escribió desde un botón del sitio)» ya no
 * se ofrece; las reservas viejas que lo traen lo conservan y se leen igual.
 */
export const ORIGENES_ELEGIBLES = ORIGENES.filter(o => o !== ORIGEN_POR_CONFIRMAR && o !== "whatsapp_sitio");
/**
 * Los canales de una RESERVA capturada o convertida en el panel: sin «Web».
 * Una reserva es «web» solo si nació de una compra en el sitio (folio HP del
 * checkout, la misma que GA4 cuenta como `purchase`); lo que se captura a
 * mano o sale de una cotización lo cerró el equipo, aunque se pagara con
 * tarjeta o liga (eso es el método de pago, no el canal). Los LEADS sí usan
 * «Web» (llegó por el sitio): ellos siguen con ORIGENES_ELEGIBLES (19 nov 2026).
 */
export const ORIGENES_CAPTURA = ORIGENES_ELEGIBLES.filter(o => o !== "web");
/** Para filtrar: «WhatsApp» también trae las viejas de «WhatsApp desde el sitio». */
export const mismoCanal = (guardado: string, elegido: string) =>
  guardado === elegido || (elegido === "whatsapp" && guardado === "whatsapp_sitio");

export type OrigenReserva = (typeof ORIGENES)[number];

export const ORIGEN_POR_DEFECTO: OrigenReserva = "web";

/** Etiquetas para el panel. En español porque el admin solo existe en español. */
export const ORIGEN_ETIQUETA: Record<OrigenReserva, string> = {
  web:      "Web (compró en el sitio)",
  whatsapp: "WhatsApp",
  whatsapp_sitio: "WhatsApp (escribió desde un botón del sitio)",
  telefono: "Teléfono",
  walkin:   "Llegó al hotel",
  ota:      "OTA (Viator, GetYourGuide u otra plataforma)",
  por_confirmar: "Por confirmar (no se sabe por dónde llegó)",
};

/**
 * Normaliza lo que llegue del cliente o de una reserva vieja. Nunca lanza: un
 * origen desconocido no puede impedir que se guarde una venta.
 */
export function origenValido(v: unknown, porDefecto: OrigenReserva = ORIGEN_POR_DEFECTO): OrigenReserva {
  const s = String(v ?? "").trim().toLowerCase();
  return (ORIGENES as readonly string[]).includes(s) ? (s as OrigenReserva) : porDefecto;
}

/**
 * El canal de una reserva que se crea en el panel (a mano o al convertir una
 * cotización, también la conversión automática de una liga pagada): lo que
 * llegue, pero nunca «web» (ver ORIGENES_CAPTURA), y sin dato → «por confirmar».
 */
export function origenDeCaptura(v: unknown): OrigenReserva {
  const o = origenValido(v, ORIGEN_POR_CONFIRMAR);
  return o === "web" ? ORIGEN_POR_CONFIRMAR : o;
}
