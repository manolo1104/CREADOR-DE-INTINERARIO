import { ORIGEN_ETIQUETA, type OrigenReserva } from "@/lib/origenReserva";
import type { EstadoFecha } from "@/lib/admin/crm";

export interface TourOpcion { slug: string; codigo: string; nombre: string }

export const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
/** "jue 21 nov" */
export const fechaCorta = (ymd: string | null) =>
  ymd ? new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "") : "";
export const canalCorto = (c: string) => (ORIGEN_ETIQUETA[c as OrigenReserva] ?? c).split(" (")[0];
export const COLOR_FECHA: Record<EstadoFecha, string> = {
  vencido: "text-[var(--panel-problema)]", hoy: "text-[var(--panel-atencion)]", proximo: "text-[var(--panel-tinta-media)]", "sin-fecha": "text-[var(--panel-tinta-suave)]",
};
export const inputCls = "w-full rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 py-2.5 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco";
export const etiquetaCls = "block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]";
export const botonPrimario = "panel-foco panel-pulsable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-50";
export const botonSecundario = "panel-foco panel-pulsable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-4 text-[13px] font-dm font-medium text-[var(--panel-tinta)] disabled:opacity-50";
