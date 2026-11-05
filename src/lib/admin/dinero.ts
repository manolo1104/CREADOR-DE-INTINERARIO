// Cuánto se ha cobrado de una reserva y cuánto falta. Es la ÚNICA regla:
// Inicio, Ventas, Cobros, el corte y los correos la leen de aquí para que
// «cobrado» signifique lo mismo en todas partes.
//
// Puro (sin Prisma) a propósito: se prueba con la línea base del 3 nov 2026
// (`__tests__/dinero.test.ts`) y la usa el script de conciliación.

import type { TourBooking } from "@prisma/client";

export type CashFields = Pick<TourBooking, "depositoPagado" | "stripePaymentIntentId" | "totalAmount"> & { createdAt?: Date };

/**
 * Desde aquí toda reserva pagada en línea nace con su `depositoPagado` y su
 * renglón de cobro (`cobros.ts`, 29 sep 2026). El respaldo «Stripe sin depósito
 * = pagada completa» es SOLO para las de antes.
 */
export const DESDE_DEPOSITO_SIEMPRE = new Date("2026-09-29T00:00:00-06:00");

/**
 * Dinero realmente cobrado de una reserva = el anticipo registrado, o el total si fue
 * un pago 100% por Stripe (puede no tener anticipo explícito guardado).
 *
 * ⚠️ Si una reserva se capturó a mano SIN anticipo, esto devuelve 0 aunque el
 * dinero sí haya entrado. No se adivina a partir de `status`: en esta base
 * TODAS las reservas están en "paid" (incluidas 8 con anticipo parcial), así
 * que `status` no distingue "pagada completa" de "capturada y ya". Esas
 * reservas se reportan aparte en `sinRegistroDePago` para poder corregirlas.
 */
export function montoCobrado(b: CashFields): number {
  const dep = b.depositoPagado ?? 0;
  if (dep > 0) return dep;
  // 🔴 Con una reserva nueva, depósito en 0 quiere decir que se ANULÓ su cobro
  // (un reembolso): antes salía como cobrada al 100 % y el panel no dejaba
  // registrar otro pago («ya está liquidada»).
  if (b.createdAt && b.createdAt >= DESDE_DEPOSITO_SIEMPRE) return 0;
  return b.stripePaymentIntentId ? b.totalAmount : 0;
}

/**
 * `montoCobrado` para pantallas (revisión del 4 nov 2026): en el navegador la
 * fecha de creación llega como texto y la regla de «depósito siempre» se perdía,
 * así que una reserva de Stripe reembolsada salía «liquidada».
 */
export function cobradoDe(b: { depositoPagado?: number | null; stripePaymentIntentId?: string | null; totalAmount: number; createdAt?: Date | string | null }): number {
  return montoCobrado({ depositoPagado: b.depositoPagado ?? 0, stripePaymentIntentId: b.stripePaymentIntentId ?? null, totalAmount: b.totalAmount, createdAt: b.createdAt ? new Date(b.createdAt) : undefined });
}

/** Saldo que falta por cobrar de una reserva (nunca negativo). */
export function saldoPendiente(b: CashFields): number {
  return Math.max(0, b.totalAmount - montoCobrado(b));
}

/**
 * Lo cobrado que hay que dejar fijo en un renglón ANTES de cambiarle el total a
 * una reserva sin renglones de cobro, o 0 si no hace falta (lote 3, 5 nov
 * 2026). Una reserva vieja pagada por Stripe con depósito 0 cuenta como
 * «pagada al 100 %» del total VIGENTE: subirle el total la dejaba «pagada» sin
 * cobrar lo nuevo, y el siguiente cobro rescataba el total nuevo como si ya
 * hubiera entrado. Con el renglón fijado con el total de antes, eso no pasa.
 */
export function cobradoAFijarAntesDeEditar(antes: CashFields, totalNuevo: number, renglonesDeCobro: number): number {
  if (renglonesDeCobro > 0 || Math.round(totalNuevo) === antes.totalAmount) return 0;
  return montoCobrado(antes);
}
