// ¿El mismo pago dos veces? (revisión del lote 1 de la auditoría, 5 nov 2026)
//
// «Convertir a reserva» ya no hace dos reservas, pero el MISMO dinero todavía
// podía quedar registrado dos veces por «Registrar cobro»:
//  · dos personas convierten la misma cotización a la vez y dicen «ya pagó»:
//    a las dos se les abre el cobro con el anticipo y las dos lo registran;
//  · Erick convierte, se le abre el cobro y, mientras sube la captura, el
//    cliente paga la liga: Stripe lo registra solo y Erick lo vuelve a capturar.
// La reserva quedaba con el doble de lo que entró y el saldo que se le pide al
// cliente salía de menos.
//
// Regla: si en la última hora ya se registró en ESA reserva un cobro vivo del
// mismo monto, el panel pregunta antes de registrar otro. No bloquea: si de
// verdad es otro pago, se registra de todos modos. Es la misma idea que el
// `/confirma` del bot (`cobroRepetido` en cotizaciones/convertir.ts).
//
// Puro (sin base) para probarlo en vitest; la consulta vive en `cobros.ts`.

import { etiquetaMetodo } from "./metodosCobro";

/** Cuánto tiempo atrás se busca el cobro igual (minutos). */
export const VENTANA_COBRO_REPETIDO_MIN = 60;

/**
 * Así firma lo que se registra solo: la liga de pago pagada y el pago en la
 * web (`SISTEMA.nombre` en bitacora.ts; aquí sin importarlo para no traer la
 * base a las pruebas).
 */
const REGISTRO_AUTOMATICO = "Sitio web";

export interface CobroComparable {
  monto: number;
  createdAt: Date | string;
  creadoPor?: string | null;
  metodoPago?: string | null;
  anulado?: boolean | null;
}

/** El cobro vivo del mismo monto más reciente dentro de la ventana, o null. */
export function cobroIgualReciente<T extends CobroComparable>(
  cobros: T[],
  monto: number,
  ahora: Date,
  ventanaMin: number = VENTANA_COBRO_REPETIDO_MIN,
): T | null {
  const n = Math.round(Number(monto) || 0);
  if (n <= 0) return null;
  const desde = ahora.getTime() - ventanaMin * 60_000;
  let reciente: T | null = null;
  let cuando = -Infinity;
  for (const c of cobros) {
    if (c.anulado || Math.round(Number(c.monto) || 0) !== n) continue;
    const t = new Date(c.createdAt).getTime();
    if (!Number.isFinite(t) || t < desde) continue;
    if (t > cuando) { reciente = c; cuando = t; }
  }
  return reciente;
}

/** Lo que se le dice a quien está registrando el cobro. Español claro, sin jerga. */
export function avisoCobroRepetido(c: CobroComparable, ahora: Date): string {
  const minutos = Math.floor((ahora.getTime() - new Date(c.createdAt).getTime()) / 60_000);
  const hace = minutos < 1 ? "Hace un momento" : `Hace ${minutos} min`;
  const monto = `$${Math.round(Number(c.monto) || 0).toLocaleString("es-MX")}`;
  const automatico = c.metodoPago === "stripe" && (!c.creadoPor || c.creadoPor === REGISTRO_AUTOMATICO);
  const que = automatico
    ? `${hace} entró solo un pago de ${monto} por la liga de pago en esta reserva`
    : `${hace} se registró un cobro de ${monto} en esta reserva (${etiquetaMetodo(c.metodoPago).toLowerCase()}${c.creadoPor ? `, lo capturó ${c.creadoPor}` : ""})`;
  return `${que}. Si es el mismo pago, no lo registres otra vez; si de verdad es otro, regístralo de todos modos.`;
}
