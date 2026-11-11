import { logger } from "@/lib/logger";

/**
 * Pesos por dólar y por euro para enseñar el precio APROXIMADO en las fichas
 * en inglés (10 nov 2026). Se COBRA siempre en pesos (`i18n/format.ts`: «no
 * convertir»): esto solo orienta a quien piensa en otra moneda, y la ficha
 * dice que se cobra en MXN.
 *
 * Por qué: en Clarity (29 oct–10 nov) 2 de las 4 compras en línea fueron de
 * extranjeros que pagan en euros (Austria y Alemania), y la ficha solo
 * enseñaba «$1,350 MXN».
 *
 * Mismo patrón que `viajeCdmx/usd.ts` (que se queda como está para no mover
 * el viaje): Frankfurter (tipos del Banco Central Europeo, sin llave), en
 * memoria 12 h; si no contesta en 1.5 s, el último que hubo o, sin ninguno,
 * `RESPALDO` (10 nov 2026, redondeado).
 */
export interface PesosPorMoneda {
  usd: number;
  eur: number;
}

const RESPALDO: PesosPorMoneda = { usd: 18.5, eur: 21.5 };
const VIGENCIA_S = 12 * 3600;
let guardado: { valor: PesosPorMoneda; el: number } | null = null;

/** Un tipo fuera de este rango es un error de la fuente, no el mercado. */
const razonable = (v: number, min: number, max: number) => Number.isFinite(v) && v > min && v < max;

export async function pesosPorMoneda(): Promise<PesosPorMoneda> {
  if (guardado && Date.now() - guardado.el < VIGENCIA_S * 1000) return guardado.valor;
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=MXN&to=USD,EUR", {
      signal: AbortSignal.timeout(1500),
      // Caché de datos de Next: la ficha no vuelve a preguntar en 12 h.
      next: { revalidate: VIGENCIA_S },
    });
    const j = (await r.json()) as { rates?: { USD?: number; EUR?: number } };
    const usd = 1 / Number(j.rates?.USD);
    const eur = 1 / Number(j.rates?.EUR);
    if (!razonable(usd, 10, 40) || !razonable(eur, 12, 45)) throw new Error(`tipo de cambio raro: ${usd} / ${eur}`);
    guardado = { valor: { usd, eur }, el: Date.now() };
    return guardado.valor;
  } catch (e) {
    logger.warn("tipo_cambio_ficha", { reason: e instanceof Error ? e.message : String(e) });
    return guardado?.valor ?? RESPALDO;
  }
}

/** «≈ US$73 · €63» para un precio en pesos. */
export function aproximado(mxn: number, tc: PesosPorMoneda): string {
  const n = (v: number) => Math.round(v).toLocaleString("en-US");
  return `≈ US$${n(mxn / tc.usd)} · €${n(mxn / tc.eur)}`;
}
