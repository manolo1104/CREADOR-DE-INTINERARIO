/**
 * Un estado con color Y texto: «En meta», «Bajo mínimo», «Vencido». El color
 * nunca va solo (prompt del rediseño, 3 nov 2026): quien no distingue colores,
 * y el celular al sol, leen la palabra.
 */
export type TonoEstado = "bien" | "atencion" | "problema" | "neutro";

const TONO: Record<TonoEstado, string> = {
  bien:     "text-[var(--panel-bien)] bg-[var(--panel-bien-fondo)]",
  atencion: "text-[var(--panel-atencion)] bg-[var(--panel-atencion-fondo)]",
  problema: "text-[var(--panel-problema)] bg-[var(--panel-problema-fondo)]",
  neutro:   "text-[var(--panel-tinta)] bg-[var(--panel-fondo-velo)]",
};

export function ChipEstado({ tono, children, className = "" }: { tono: TonoEstado; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-dm font-semibold leading-5 whitespace-nowrap ${TONO[tono]} ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
