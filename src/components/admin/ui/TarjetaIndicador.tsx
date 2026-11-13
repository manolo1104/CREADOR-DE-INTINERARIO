import type { DefKpi, PuntoSerie, TipoPeriodo, ValorKpi } from "@/lib/admin/indicadores/tipos";
import { ETIQUETA_CALIDAD, estadoContraMeta, formatear, textoMetas } from "@/lib/admin/indicadores/estado";
import { ChipEstado } from "./ChipEstado";
import { Tendencia } from "./Tendencia";

/**
 * Un indicador del documento As Is / To Be (4 nov 2026): valor, de dónde sale,
 * contra qué se compara y qué tan confiable es. La fórmula va plegada: Manolo
 * la quiere a mano, pero no estorbando la lectura del número.
 */
export function TarjetaIndicador({ def, v, serie, periodo }: {
  def: DefKpi;
  v: ValorKpi | undefined;
  serie?: PuntoSerie[];
  periodo: TipoPeriodo;
}) {
  const valor: ValorKpi = v ?? { clave: def.clave, valor: null, calidad: "sin-dato", nota: "Sin calcular." };
  const estado = estadoContraMeta(def, valor, periodo);
  return (
    <article className="panel-card flex min-w-0 flex-col gap-2 p-4">
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-[12.5px] font-dm font-medium leading-snug text-[var(--panel-tinta-media)]">{def.nombre}</h3>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-dm font-semibold uppercase tracking-[0.06em] text-[var(--panel-tinta-suave)] bg-[var(--panel-fondo-velo)]">{def.fuente}</span>
      </header>
      <div className="flex items-end justify-between gap-3">
        <p className="panel-cifra text-[30px] font-dm font-semibold leading-none tracking-[-0.5px] text-[var(--panel-tinta)]">
          {formatear(def.unidad, valor.valor)}
        </p>
        {serie && <Tendencia serie={serie} unidad={def.unidad} />}
      </div>
      {valor.detalle && <p className="text-[12.5px] font-dm leading-snug text-[var(--panel-tinta-media)]">{valor.detalle}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {estado && <ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado>}
        {valor.calidad === "aproximado" && <ChipEstado tono="atencion">{ETIQUETA_CALIDAD.aproximado}</ChipEstado>}
        {valor.preliminar && <ChipEstado tono="neutro">Preliminar</ChipEstado>}
      </div>
      {valor.nota && <p className="text-[12px] font-dm leading-snug text-[var(--panel-tinta-media)]">{valor.nota}</p>}
      <p className="text-[11.5px] font-dm leading-snug text-[var(--panel-tinta-suave)]">
        Base: {def.base.texto} · {textoMetas(def)}
      </p>
      <details className="group text-[11.5px] font-dm text-[var(--panel-tinta-media)]">
        <summary className="panel-foco cursor-pointer select-none list-none text-[var(--panel-tinta-suave)] hover:text-[var(--panel-tinta)]">
          <span className="inline-block transition-transform group-open:rotate-90">›</span> Cómo se calcula
        </summary>
        <p className="mt-1 leading-snug">{def.formula} <span className="text-[var(--panel-tinta-suave)]">Frecuencia: {def.frecuencia}.</span></p>
      </details>
    </article>
  );
}

/** Varias tarjetas en rejilla, en el orden del catálogo. */
export function RejillaIndicadores({ defs, valores, series, periodo }: {
  defs: DefKpi[];
  valores: ValorKpi[];
  series: Record<string, PuntoSerie[]>;
  periodo: TipoPeriodo;
}) {
  const por = new Map(valores.map(v => [v.clave, v]));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {defs.map(d => <TarjetaIndicador key={d.clave} def={d} v={por.get(d.clave)} serie={series[d.clave]} periodo={periodo} />)}
    </div>
  );
}
