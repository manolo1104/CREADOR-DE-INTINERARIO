// Los candados del dinero que también valen en la API, no solo en la pantalla
// (lote 3 de la auditoría, 5 nov 2026). Puro: se prueba en
// `__tests__/ligas.test.ts` y lo usan las rutas de Reservas, Cobros y
// Comprobantes.
//
// El panel ya escondía estos atajos, pero con la sesión de Operación se podían
// pedir directo a la API: crear una reserva «pagada» sin cobro, dar por bueno
// un comprobante inventado, quitar el comprobante de un cobro ya registrado o
// anular un cobro viejo cambiándole antes la fecha a hoy.

import { ymdMX } from "@/lib/dates";

/**
 * ¿Puede esta persona anular este cobro? Quien tiene el permiso, siempre; y
 * quien lo capturó, el MISMO día en que lo capturó. 🔴 Cuenta el día en que se
 * registró (`createdAt`), no la fecha del cobro: esa se puede editar y se
 * podía mover a hoy para anular uno viejo.
 */
export function puedeAnularCobro(p: { puedeAnular: boolean; quien: string; creadoPor: string | null; creadoEn: Date; hoy: string }): boolean {
  if (p.puedeAnular) return true;
  return !!p.creadoPor && p.creadoPor === p.quien && ymdMX(p.creadoEn) === p.hoy;
}

/**
 * De los comprobantes que manda la pantalla, los que de verdad sirven: que
 * existan, que sean de ESTA reserva y que no estén ya colgados de otro cobro.
 * Sin esto bastaba mandar cualquier id para pasar el «comprobante
 * obligatorio», o se podía mover el comprobante de otro cobro.
 */
export function evidenciasUsables(
  pedidas: unknown,
  encontradas: { id: string; bookingId: string; movimientoId: string | null }[],
  reservaId: string,
): string[] {
  const ids = Array.isArray(pedidas) ? pedidas.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  const libres = new Set(encontradas.filter((e) => e.bookingId === reservaId && !e.movimientoId).map((e) => e.id));
  return Array.from(new Set(ids.filter((id) => libres.has(id))));
}

/** Un comprobante ya colgado de un cobro solo lo quita quien puede anular cobros. */
export function puedeQuitarComprobante(p: { movimientoId: string | null; puedeAnular: boolean }): boolean {
  return !p.movimientoId || p.puedeAnular;
}

/**
 * El dinero con el que nace una reserva capturada en el panel. Lo cobrado sale
 * de los renglones de cobro: quien no es socio no puede crearla con depósito ni
 * «pagada» (el panel ya manda 0 y «pending»; la API lo aceptaba de cualquiera).
 */
export function dineroAlCrearReserva(
  body: { depositoPagado?: unknown; status?: unknown; totalAmount?: unknown },
  puedeCorregirDinero: boolean,
): { depositoPagado: number; status: string } {
  const total = Math.round(Number(body.totalAmount) || 0);
  const deposito = puedeCorregirDinero ? Math.round(Number(body.depositoPagado) || 0) : 0;
  const porDinero = deposito >= total && total > 0 ? "paid" : "pending";
  const pedido = typeof body.status === "string" && body.status ? body.status : null;
  return { depositoPagado: deposito, status: puedeCorregirDinero ? (pedido ?? porDinero) : porDinero };
}

// ── La referencia de un cobro (folio, últimos 4, sesión de Stripe) ───────────

/** La referencia de un cobro viejo, que solo vivía dentro del concepto («Cobro transferencia · 1234»). */
export function referenciaDeConcepto(concepto: string | null | undefined): string | null {
  const s = String(concepto ?? "");
  const i = s.indexOf(" · ");
  if (!s.startsWith("Cobro ") || i < 0) return null;
  return s.slice(i + 3).trim() || null;
}

/**
 * La referencia al corregir un cobro. 🔴 Vacía o sin mandar, se conserva la
 * que tenía: corregir quién lo recibió borraba el folio del SPEI o la sesión
 * de Stripe, que era lo único para cruzarlo con el banco (5 nov 2026).
 */
export function referenciaAlEditar(anterior: string | null, nueva: unknown): string | null {
  const t = typeof nueva === "string" ? nueva.trim() : "";
  return t ? t.slice(0, 100) : anterior;
}
