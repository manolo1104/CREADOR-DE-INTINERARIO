import { logger } from "@/lib/logger";

/**
 * Pesos por dólar para enseñar el precio aproximado en la página en inglés
 * (16 oct 2026). Se COBRA siempre en pesos: esto solo orienta a quien piensa en
 * dólares, y la página dice que es aproximado.
 *
 * Sale de Frankfurter (tipos del Banco Central Europeo, sin llave), guardado
 * en memoria 12 h. Si no contesta en 1.5 s, el último que hubo o, sin ninguno,
 * `RESPALDO` (el del 15 oct 2026: 18.52).
 */
const RESPALDO = 18.5;
const VIGENCIA_MS = 12 * 3600_000;
let guardado: { valor: number; el: number } | null = null;

export async function pesosPorDolar(): Promise<number> {
  if (guardado && Date.now() - guardado.el < VIGENCIA_MS) return guardado.valor;
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=MXN", {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    const j = (await r.json()) as { rates?: { MXN?: number } };
    const v = Number(j.rates?.MXN);
    if (!(v > 10 && v < 40)) throw new Error(`tipo de cambio raro: ${v}`);
    guardado = { valor: v, el: Date.now() };
    return v;
  } catch (e) {
    logger.warn("viaje_cdmx_tipo_cambio", { reason: e instanceof Error ? e.message : String(e) });
    return guardado?.valor ?? RESPALDO;
  }
}
