// ¿Se puede ELIMINAR esta reserva? (20 nov 2026)
//
// Desde el 3 nov las reservas no se borraban: se cancelaban con motivo, para que
// el dinero y las métricas no se perdieran. Manolo (20 nov): «habilita la
// eliminación de reservas» (pruebas, duplicados, errores) y «que cotizaciones y
// reservas hechas por el bot también se puedan eliminar».
//
// La regla:
//  - NUNCA se elimina la que tiene dinero real en Stripe (pagada en el sitio con
//    tarjeta, o con una liga pagada): hay que reembolsar allá y cancelarla con
//    motivo. Tampoco la que ya entró en un corte semanal CERRADO: el corte la
//    nombra y sus cifras quedaron congeladas.
//  - La que tiene cobros ANOTADOS (los registra el panel a mano o el bot con
//    /confirma) sí se elimina, pero se pregunta otra vez diciendo cuánto: esos
//    cobros se borran con ella y dejan de contar en Cobros.
//  - Sin nada de eso, se elimina directo (tras la confirmación de siempre).
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
  /** La semana (lunes YYYY-MM-DD) de un corte semanal cerrado que la incluye, o null. */
  enCorteCerrado: string | null;
}

export type DecisionBorrado =
  | { tipo: "si" }
  | { tipo: "confirmar"; aviso: string }
  | { tipo: "no"; motivo: string };

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

export function decidirBorrado(h: HechosBorrado): DecisionBorrado {
  if (h.pagoStripe) {
    return { tipo: "no", motivo: "Se pagó con tarjeta en el sitio (Stripe): no se elimina. Cancélala con su motivo y, si aplica, reembolsa en Stripe." };
  }
  if (h.ligasPagadas > 0) {
    return { tipo: "no", motivo: "Tiene una liga de pago ya pagada (dinero en Stripe): no se elimina. Cancélala con su motivo." };
  }
  if (h.enCorteCerrado) {
    return { tipo: "no", motivo: `Ya entró en el corte cerrado de la semana del ${h.enCorteCerrado}: no se elimina. Cancélala con su motivo.` };
  }
  if (h.movimientosVivos > 0 || Number(h.cobrado) > 0) {
    const cuanto = Number(h.cobrado) > 0 ? `${fmx(h.cobrado)} anotados como cobrados` : "cobros o gastos anotados";
    return { tipo: "confirmar", aviso: `Tiene ${cuanto}. Si la eliminas, esos movimientos se borran con ella y dejan de contar en Cobros. Úsalo solo si ese dinero no entró de verdad (una prueba o un error).` };
  }
  return { tipo: "si" };
}
