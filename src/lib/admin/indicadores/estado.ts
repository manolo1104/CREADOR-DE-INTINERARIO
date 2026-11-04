// Cómo se pinta un valor y cómo se compara contra su meta (4 nov 2026). Puro.
//
// El chip dice «En meta / Cerca / Debajo» con color Y palabra (regla del panel:
// el color nunca va solo). Los conteos y montos solo se juzgan en el periodo de
// su meta: comparar las reservas de una semana contra la meta del mes pintaría
// rojo todas las semanas sin que nada esté mal.

import type { TonoEstado } from "@/components/admin/ui/ChipEstado";
import type { DefKpi, TipoPeriodo, Unidad, ValorKpi } from "./tipos";

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/** El número con su unidad: «2.2 %», «$7,239», «2.8», «12». */
export function formatear(unidad: Unidad, valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  switch (unidad) {
    case "pct": return `${valor < 10 && valor !== 0 && !Number.isInteger(valor) ? valor.toFixed(1) : Math.round(valor)} %`;
    case "pesos": return pesos(valor);
    case "dec": return valor.toFixed(1);
    case "porMil": return valor < 10 ? valor.toFixed(1) : String(Math.round(valor));
    default: return Math.round(valor).toLocaleString("es-MX");
  }
}

/** % con un decimal cuando es chico (2.2 %) y entero cuando no (35 %). */
export const pct = (num: number, den: number): number | null =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : null;

export interface EstadoKpi { tono: TonoEstado; texto: string }

const ETIQUETA_PERIODO: Record<TipoPeriodo, string> = { semana: "semana", mes: "mes", "28d": "28 días", "90d": "90 días" };

/** El chip contra la meta al 31 ene, o null si el KPI es informativo. */
export function estadoContraMeta(def: DefKpi, v: ValorKpi, periodo: TipoPeriodo): EstadoKpi | null {
  if (v.valor === null) return { tono: "neutro", texto: "Sin dato" };
  if (def.direccion === "info" || !def.meta) return null;
  if ((def.tipo === "conteo" || def.tipo === "monto") && def.periodoMeta && def.periodoMeta !== periodo) {
    return { tono: "neutro", texto: `Meta por ${ETIQUETA_PERIODO[def.periodoMeta]}` };
  }
  const meta = def.meta.valor;
  if (def.direccion === "subir") {
    if (v.valor >= meta) return { tono: "bien", texto: "En meta" };
    if (v.valor >= meta * 0.85) return { tono: "atencion", texto: "Cerca de meta" };
    return { tono: "problema", texto: "Debajo de meta" };
  }
  // bajar: menos es mejor (saldos vencidos, salidas bajo mínimo, peso de Google).
  if (v.valor <= meta) return { tono: "bien", texto: "En meta" };
  if (meta > 0 && v.valor <= meta * 1.15) return { tono: "atencion", texto: "Cerca de meta" };
  return { tono: "problema", texto: "Arriba de meta" };
}

/** «Meta 31 ene: 3.5 % · Semana Santa: 4 %». */
export function textoMetas(def: DefKpi): string {
  if (!def.meta) return def.direccion === "info" ? "Informativo" : "Sin meta";
  return `Meta 31 ene: ${def.meta.texto}${def.metaSS ? ` · Semana Santa: ${def.metaSS.texto}` : ""}`;
}

export const ETIQUETA_CALIDAD = { exacto: "Exacto", aproximado: "Aproximado", "sin-dato": "Sin dato" } as const;
