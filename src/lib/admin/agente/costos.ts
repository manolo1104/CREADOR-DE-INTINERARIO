// Lo que cuesta cada llamada a Claude y el tope del mes (Fase 4, 4 nov 2026).
// Puro: lo usan el agente, el panel y las pruebas.
//
// Precios oficiales por millón de tokens (USD), tabla de la guía de la API al
// 6 oct 2026. Los tokens de razonamiento se cobran como salida (ya vienen en
// `output_tokens`). Caché: leer = 0.1× la entrada, escribir = 1.25×.

/** Extraer datos del chat: el modelo económico. */
export const MODELO_EXTRAER = "claude-haiku-5-5";
/** Redactar respuestas al cliente: el modelo más capaz. */
export const MODELO_RESPONDER = "claude-opus-5-5";

/** Tope por omisión (decisión de Manolo, 4 nov 2026). Se cambia en /admin/agente. */
export const TOPE_USD_POR_OMISION = 10;

const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  "claude-haiku-5-5": { entrada: 0.10, salida: 0.50 },
  "claude-opus-5-5": { entrada: 4.00, salida: 20.00 },
  // Un rechazo de Opus 5.5 puede atenderlo otro modelo («fallbacks»): se cobra a su precio.
  "claude-opus-4-8": { entrada: 5.00, salida: 25.00 },
  "claude-opus-5": { entrada: 5.00, salida: 25.00 },
  "claude-sonnet-5-5": { entrada: 2.00, salida: 10.00 },
};
/** Un modelo que no está en la tabla se cuenta al precio más alto: mejor pasarse del cálculo que del tope. */
const MAS_CARO = { entrada: 10.00, salida: 50.00 };

export interface Uso { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }

/** Costo en USD de una respuesta, por el modelo que la atendió. */
export function costoDe(modelo: string, u: Uso): number {
  const p = PRECIOS[modelo] ?? Object.entries(PRECIOS).find(([k]) => modelo.startsWith(k))?.[1] ?? MAS_CARO;
  const millon = 1_000_000;
  return ((u.input_tokens ?? 0) * p.entrada
    + (u.cache_read_input_tokens ?? 0) * p.entrada * 0.1
    + (u.cache_creation_input_tokens ?? 0) * p.entrada * 1.25
    + (u.output_tokens ?? 0) * p.salida) / millon;
}

/** Lo que se aparta ANTES de llamar (si no cabe, no se llama). Holgado a propósito. */
export type TareaAgente = "extraer" | "responder" | "calidad" | "reporte" | "preguntar";
export const RESERVA_USD: Record<TareaAgente, number> = { extraer: 0.005, responder: 0.08, calidad: 0.006, reporte: 0.5, preguntar: 0.1 };

/** ¿Cabe otra llamada este mes? */
export function cabeEnTope(gastadoUsd: number, topeUsd: number, tarea: TareaAgente): boolean {
  return topeUsd > 0 && gastadoUsd + RESERVA_USD[tarea] <= topeUsd;
}

/** El mes de México (YYYY-MM) de un instante: el tope se reinicia el día 1. */
export function mesMX(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).slice(0, 7);
}

export const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)} USD`;
