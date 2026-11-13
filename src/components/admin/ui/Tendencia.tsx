import type { PuntoSerie, Unidad } from "@/lib/admin/indicadores/tipos";
import { formatear } from "@/lib/admin/indicadores/estado";

/**
 * La tendencia de un KPI: 8 barras, del periodo más viejo al actual (el último
 * va en el color fuerte). Barras en CSS, como en Rentabilidad: sin librería de
 * gráficas. Un periodo sin dato deja el hueco marcado, no una barra en cero:
 * «sin dato» y «cero» no son lo mismo.
 */
export function Tendencia({ serie, unidad, className = "" }: { serie: PuntoSerie[]; unidad: Unidad; className?: string }) {
  if (serie.length < 2) return null;
  const vals = serie.map(p => p.valor).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  const max = Math.max(...vals.map(Math.abs), 0.0001);
  const texto = serie.map(p => `${p.corta}: ${formatear(unidad, p.valor)}`).join(" · ");
  return (
    <div className={`flex h-9 items-end gap-[3px] ${className}`} role="img" aria-label={`Tendencia: ${texto}`} title={texto}>
      {serie.map((p, i) => {
        const ultimo = i === serie.length - 1;
        if (p.valor === null) {
          return <span key={i} className="h-[3px] w-[7px] rounded-full border border-dashed border-[var(--panel-borde-fuerte)]" />;
        }
        const alto = Math.max(3, Math.round((Math.abs(p.valor) / max) * 36));
        return (
          <span key={i} className={`w-[7px] rounded-[2px] ${ultimo ? "bg-[var(--panel-acento)]" : "bg-[rgba(31,59,45,0.22)]"}`}
            style={{ height: `${alto}px` }} />
        );
      })}
    </div>
  );
}
