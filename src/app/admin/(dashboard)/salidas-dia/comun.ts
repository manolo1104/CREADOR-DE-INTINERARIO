import type { EstadoSalida } from "@/lib/admin/salidas";
import type { TonoEstado } from "@/components/admin/ui/ChipEstado";

export const TONO_ESTADO_SALIDA: Record<EstadoSalida, TonoEstado> = {
  "en-meta": "bien", "bajo-minimo": "atencion", lleno: "neutro", "a-medida": "neutro",
};

/** "jueves 5 de noviembre de 2026" */
export function fechaLarga(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
