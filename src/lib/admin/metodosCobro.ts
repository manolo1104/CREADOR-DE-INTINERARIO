// Las formas en que puede entrar el dinero.
//
// Viven en un archivo propio, sin tocar la base, porque el modal de cobro es un
// componente de cliente: si importara `cobros.ts` se llevaría el cliente de
// Prisma al navegador y el build se cae. Misma razón por la que `categorias.ts`
// está separado del motor de Finanzas.

export const METODOS_COBRO = [
  { id: "efectivo",      label: "Efectivo",      detalle: "En mano",           comprobante: false },
  { id: "transferencia", label: "Transferencia", detalle: "SPEI",              comprobante: true  },
  { id: "deposito",      label: "Depósito",      detalle: "Oxxo o ventanilla", comprobante: true  },
  { id: "stripe",        label: "Liga de pago",  detalle: "Tarjeta",           comprobante: true  },
  { id: "otro",          label: "Otro",          detalle: "",                  comprobante: false },
] as const;

export type MetodoCobro = (typeof METODOS_COBRO)[number]["id"];

const POR_ID: Record<string, (typeof METODOS_COBRO)[number]> =
  Object.fromEntries(METODOS_COBRO.map(m => [m.id, m]));

export function metodoValido(id: unknown): id is MetodoCobro {
  return typeof id === "string" && id in POR_ID;
}

export function etiquetaMetodo(id: string | null | undefined): string {
  return POR_ID[id ?? ""]?.label ?? "Sin método";
}

/**
 * Qué métodos exigen comprobante. Lo pidió Manolo: en efectivo no hay nada que
 * fotografiar, pero una transferencia, un depósito o una liga cobrada sin
 * evidencia es la palabra de alguien contra el estado de cuenta.
 *
 * Sólo aplica a lo que se captura A MANO en el panel: los cobros que registra
 * Stripe solo traen su propio rastro en la pasarela.
 */
export function requiereComprobante(metodo: string): boolean {
  return POR_ID[metodo]?.comprobante ?? false;
}
