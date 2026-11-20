// ¿Se puede ELIMINAR esta reserva? (20 nov 2026)
//
// Desde el 3 nov las reservas no se borraban: se cancelaban con motivo, para que
// el dinero y las métricas no se perdieran. Manolo (20 nov): «habilita la
// eliminación de reservas», para quitar pruebas, duplicados y errores de captura.
//
// La regla: se elimina la que NO tiene dinero vivo. Con cobros o gastos
// registrados (sin anular), con lo cobrado > 0, con una liga pagada o pagada en
// el sitio con tarjeta (Stripe), se pide anular primero o cancelarla con motivo:
// así un borrado nunca descuadra Cobros ni el corte. Los cobros ya ANULADOS se
// van con la reserva (no movían dinero).
//
// Puro (sin Prisma): se prueba en `__tests__/borrarReserva.test.ts`.

export interface HechosBorrado {
  /** `montoCobrado` de la reserva. */
  cobrado: number;
  /** Cobros y gastos de la reserva que NO están anulados. */
  movimientosVivos: number;
  /** Ligas de pago de la reserva ya pagadas. */
  ligasPagadas: number;
  /** La pagaron en el sitio con tarjeta (trae PaymentIntent de Stripe). */
  pagoStripe: boolean;
}

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/** Por qué NO se puede eliminar, en palabras para el panel; null = sí se puede. */
export function motivoNoSeElimina(h: HechosBorrado): string | null {
  if (h.pagoStripe) {
    return "Se pagó con tarjeta en el sitio (Stripe): no se elimina. Cancélala con su motivo y, si aplica, reembolsa en Stripe.";
  }
  if (h.ligasPagadas > 0) {
    return "Tiene una liga de pago ya pagada: no se elimina. Cancélala con su motivo.";
  }
  if (h.movimientosVivos > 0 || Number(h.cobrado) > 0) {
    const cuanto = Number(h.cobrado) > 0 ? ` (${fmx(h.cobrado)} cobrados)` : "";
    return `Tiene cobros o gastos registrados${cuanto}: anúlalos primero en Cobros, o cancela la reserva con su motivo.`;
  }
  return null;
}
