// Por qué se cancela una reserva. Obligatorio al cancelar (prompt del rediseño,
// 3 nov 2026): sin motivo, «0 canceladas» en el panel no decía nada y las
// reservas se borraban. Una reserva YA NO se borra: se cancela y queda el rastro.
//
// Puro: lo usan el formulario del panel, la API que valida y el scorecard.

export const MOTIVOS_CANCELACION = [
  { clave: "cliente",    etiqueta: "El cliente canceló" },
  { clave: "sin_pago",   etiqueta: "No pagó el anticipo" },
  { clave: "clima",      etiqueta: "Clima o nivel del río" },
  { clave: "cupo",       etiqueta: "No se juntó el mínimo o no hubo lugar" },
  { clave: "duplicada",  etiqueta: "Capturada dos veces o por error" },
  { clave: "otro",       etiqueta: "Otro (explícalo)" },
] as const;

export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number]["clave"];

export const esMotivoCancelacion = (v: unknown): v is MotivoCancelacion =>
  MOTIVOS_CANCELACION.some(m => m.clave === v);

/** «clima» → «Clima o nivel del río»; «otro: se enfermó» → «Otro: se enfermó». */
export function etiquetaMotivo(guardado: string | null | undefined): string {
  if (!guardado) return "";
  const [clave, ...resto] = guardado.split(":");
  const m = MOTIVOS_CANCELACION.find(x => x.clave === clave.trim());
  const detalle = resto.join(":").trim();
  if (!m) return guardado;
  return detalle ? `${m.etiqueta.replace(" (explícalo)", "")}: ${detalle}` : m.etiqueta.replace(" (explícalo)", "");
}

/**
 * Lo que se guarda en `TourBooking.motivoCancelacion`: la clave y, si hay,
 * el detalle. «otro» exige detalle. Devuelve null si no sirve.
 */
export function motivoParaGuardar(clave: unknown, detalle: unknown): string | null {
  if (!esMotivoCancelacion(clave)) return null;
  const d = String(detalle ?? "").trim().slice(0, 200);
  if (clave === "otro" && !d) return null;
  return d ? `${clave}: ${d}` : clave;
}
