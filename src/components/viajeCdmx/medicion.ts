/**
 * La medición del viaje CDMX–Xilitla. Solo navegador.
 *
 * Cada paso sale a dos lados:
 *  - GA4 con los nombres que pidió Manolo (ver_fecha, seleccionar_fecha,
 *    iniciar_checkout, apartado_completado, click_whatsapp,
 *    unirse_lista_espera, formulario_lider)
 *  - el embudo propio (`/api/track` → TrackEvent) y Clarity, vía
 *    `trackTourEvent`, con nombres en MAYÚSCULAS como el resto del sitio
 *
 * El apartado completado manda además el `purchase` estándar con el MISMO folio
 * que manda el servidor (`enviarCompraGA4`): GA4 deduplica por `transaction_id`.
 */
import { trackTourEvent } from "@/lib/tourTracker";
import { VIAJE_SLUG } from "@/lib/viajeCdmx/config";

export type EventoViaje =
  | "ver_fecha" | "seleccionar_fecha" | "iniciar_checkout" | "apartado_completado"
  | "click_whatsapp" | "unirse_lista_espera" | "formulario_lider";

const PROPIO: Partial<Record<EventoViaje, string>> = {
  ver_fecha:           "VIAJE_VER_FECHAS",
  seleccionar_fecha:   "VIAJE_SELECCIONAR_FECHA",
  iniciar_checkout:    "VIAJE_INICIAR_CHECKOUT",
  apartado_completado: "VIAJE_APARTADO_COMPLETADO",
  // Lista de espera y líder ya los registra el servidor al guardarlos.
};

function gtag(...args: unknown[]) {
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") {
    try { g(...args); } catch { /* la medición nunca rompe la página */ }
  }
}

export function medir(evento: EventoViaje, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  gtag("event", evento, { viaje: VIAJE_SLUG, ...params });
  if (evento === "click_whatsapp") {
    // El contador global de WhatsApp ignora estos enlaces (`data-wa-manual`):
    // se cuentan aquí, una sola vez, con el botón que lo trajo.
    trackTourEvent("WHATSAPP_CLICK", { context: "viaje_cdmx", tourSlug: VIAJE_SLUG, ...params });
    return;
  }
  const propio = PROPIO[evento];
  if (propio) trackTourEvent(propio, { tourSlug: VIAJE_SLUG, ...params });
}

/** El `purchase` estándar de GA4, con el folio que también manda el servidor. */
export function medirCompra(p: { folio: string; anticipo: number; total: number; personas: number; nombre: string }): void {
  if (typeof window === "undefined") return;
  gtag("event", "purchase", {
    transaction_id: p.folio,
    currency: "MXN",
    value: p.anticipo,
    reserva_total: p.total,
    items: [{ item_id: VIAJE_SLUG, item_name: p.nombre, price: Math.round(p.total / Math.max(1, p.personas)), quantity: p.personas }],
  });
}
