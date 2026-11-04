import Link from "next/link";
import type { Periodo } from "@/lib/admin/indicadores/tipos";
import { TIPOS_PERIODO, hrefPeriodo } from "@/lib/admin/indicadores/periodo";

/**
 * Semana · Mes · 28 días · 90 días, con flechas para ir al periodo anterior y
 * al siguiente. Son ligas (no estado): el periodo vive en la URL y se puede
 * compartir o volver atrás con el navegador.
 */
export function SelectorPeriodo({ pagina, periodo }: { pagina: string; periodo: Periodo }) {
  const flecha = "panel-foco panel-pulsable inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2 text-[14px] text-[var(--panel-tinta)]";
  return (
    <nav aria-label="Periodo" className="mb-5 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white p-0.5">
        {TIPOS_PERIODO.map(t => {
          const activo = t.tipo === periodo.tipo;
          return (
            <Link key={t.tipo} href={`${pagina}?p=${t.tipo}`} aria-current={activo ? "page" : undefined}
              className={`panel-foco rounded-[6px] px-3 py-1.5 text-[12.5px] font-dm ${activo ? "bg-[var(--panel-acento)] font-semibold text-white" : "text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]"}`}>
              {t.etiqueta}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        {periodo.anterior
          ? <Link href={hrefPeriodo(pagina, periodo.tipo, periodo.anterior)} className={flecha} aria-label="Periodo anterior">←</Link>
          : <span className={`${flecha} opacity-40`} aria-hidden>←</span>}
        <span className="px-1.5 text-[13px] font-dm font-medium text-[var(--panel-tinta)]">
          {periodo.etiqueta}{periodo.enCurso && <span className="ml-1.5 text-[11.5px] font-normal text-[var(--panel-tinta-suave)]">(en curso)</span>}
        </span>
        {periodo.siguiente
          ? <Link href={hrefPeriodo(pagina, periodo.tipo, periodo.siguiente)} className={flecha} aria-label="Periodo siguiente">→</Link>
          : <span className={`${flecha} opacity-40`} aria-hidden>→</span>}
      </div>
    </nav>
  );
}
