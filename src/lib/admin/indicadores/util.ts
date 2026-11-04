// Piezas comunes de los cálculos (4 nov 2026). Puro.
import type { Calidad, Periodo, PuntoSerie, ValorKpi } from "./tipos";
import { pct } from "./estado";

/**
 * Los estados de reserva que NO cuentan (cancelada y borrador). Es la misma
 * regla que `NO_CUENTAN` de `lib/cupoTour.ts`; vive aquí copiada para que los
 * cálculos puros no arrastren Prisma. Si cambia allá, cambia aquí.
 */
export const NO_CUENTAN = ["cancelled", "borrador"];
export const cuenta = (status: string) => !NO_CUENTAN.includes(status);

/** Una tasa con su numerador y denominador, o «sin dato» si no hay denominador. */
export function tasa(clave: string, num: number, den: number, o: { unidadDetalle?: string; calidad?: Calidad; nota?: string; preliminar?: boolean; sinDatoNota?: string } = {}): ValorKpi {
  if (den <= 0) return { clave, valor: null, calidad: "sin-dato", nota: o.sinDatoNota ?? "No hubo casos en el periodo." };
  return {
    clave, valor: pct(num, den),
    detalle: `${num.toLocaleString("es-MX")} de ${den.toLocaleString("es-MX")}${o.unidadDetalle ? ` ${o.unidadDetalle}` : ""}`,
    calidad: o.calidad ?? "exacto", nota: o.nota, preliminar: o.preliminar,
  };
}

export const sinDato = (clave: string, nota: string): ValorKpi => ({ clave, valor: null, calidad: "sin-dato", nota });

/** Está la fecha (YYYY-MM-DD) dentro del periodo. */
export const enPeriodo = (ymd: string | null | undefined, p: Pick<Periodo, "desde" | "hasta">) => !!ymd && ymd >= p.desde && ymd <= p.hasta;

/** Arma la serie de un KPI a partir de los valores de cada periodo. */
export const serie = (periodos: Periodo[], valor: (p: Periodo, i: number) => number | null): PuntoSerie[] =>
  periodos.map((p, i) => ({ corta: p.corta, valor: valor(p, i) }));

/** Personas de un renglón de tour: el mismo conteo del Calendario y del cupo (`children` ya trae los dos tramos). */
export const personasDeLinea = (l: { adults?: number; children?: number; childrenMid?: number; childrenSmall?: number }) =>
  (Number(l.adults) || 0) + Math.max(Number(l.children) || 0, (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0));

/** Redondeo a 1 decimal. */
export const r1 = (n: number) => Math.round(n * 10) / 10;
