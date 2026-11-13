import { ChipEstado, type TonoEstado } from "./ChipEstado";

/**
 * Una tarjeta de KPI del scorecard: etiqueta, valor, contexto y un chip de
 * estado contra su meta. Todas iguales de tamaño: la jerarquía la da el chip,
 * no el tamaño de la cifra (ver `Cifra.tsx`, su antecesora).
 */
export function TarjetaKpi({ etiqueta, area, valor, contexto, estado }: {
  etiqueta: string;
  /** De qué parte del negocio es: Embudo, Operación, Dinero, Calidad. */
  area?: string;
  valor: React.ReactNode;
  contexto: string;
  estado?: { tono: TonoEstado; texto: string };
}) {
  return (
    <div className="panel-card flex min-w-0 flex-col gap-2 p-4">
      <div className="flex justify-between gap-2 text-[12px] font-dm font-medium text-[var(--panel-tinta-media)]">
        <span>{etiqueta}</span>
        {area && <span className="text-[var(--panel-tinta-suave)]">{area}</span>}
      </div>
      <p className="panel-cifra text-[30px] font-dm font-semibold leading-none tracking-[-0.5px] text-[var(--panel-tinta)]">{valor}</p>
      <p className="text-[12.5px] font-dm leading-snug text-[var(--panel-tinta-media)]">{contexto}</p>
      {estado && <div className="mt-0.5"><ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado></div>}
    </div>
  );
}
