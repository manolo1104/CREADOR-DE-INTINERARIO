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
 * «Por confirmar»: las reservas capturadas a mano ANTES de que el formulario
 * obligara a elegir el canal (28 oct 2026) heredaron «web» del default y
 * Ventas decía Web 90 / WhatsApp 7. La migración `corregir-canal-historico.ts`
 * las deja aquí para que el renglón de Web vuelva a ser verdad. No se ofrece
 * en el formulario: es un estado del dato, no un canal.
 */
export const ORIGEN_POR_CONFIRMAR = "por_confirmar" as const;
/** Los canales que sí se pueden elegir al capturar. */
export const ORIGENES_ELEGIBLES = ORIGENES.filter(o => o !== ORIGEN_POR_CONFIRMAR);

export type OrigenReserva = (typeof ORIGENES)[number];

export const ORIGEN_POR_DEFECTO: OrigenReserva = "web";

/** Etiquetas para el panel. En español porque el admin solo existe en español. */
export const ORIGEN_ETIQUETA: Record<OrigenReserva, string> = {
  web:      "Web (pagó en línea)",
  whatsapp: "WhatsApp",
  whatsapp_sitio: "WhatsApp (escribió desde un botón del sitio)",
  telefono: "Teléfono",
  walkin:   "Llegó al hotel",
  ota:      "OTA (Viator, GetYourGuide u otra plataforma)",
  por_confirmar: "Por confirmar (capturada antes del 28 oct 2026)",
};

/**
 * Normaliza lo que llegue del cliente o de una reserva vieja. Nunca lanza: un
 * origen desconocido no puede impedir que se guarde una venta.
 */
export function origenValido(v: unknown, porDefecto: OrigenReserva = ORIGEN_POR_DEFECTO): OrigenReserva {
  const s = String(v ?? "").trim().toLowerCase();
  return (ORIGENES as readonly string[]).includes(s) ? (s as OrigenReserva) : porDefecto;
}
