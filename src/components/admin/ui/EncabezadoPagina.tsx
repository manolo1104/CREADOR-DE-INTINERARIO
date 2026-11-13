/** El título de una pantalla del panel: serif, con su subtítulo y, si aplica, la marca «Nuevo». */
export function EncabezadoPagina({ titulo, subtitulo, nueva, acciones }: {
  titulo: string;
  subtitulo?: string;
  nueva?: boolean;
  acciones?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2.5 font-cormorant text-[34px] font-medium leading-[1.1] text-[var(--panel-tinta)]">
          {titulo}
          {nueva && <MarcaNuevo />}
        </h1>
        {subtitulo && <p className="mt-1 text-sm font-dm text-[var(--panel-tinta-media)]">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

/** «NUEVO»: una sección del rediseño, las primeras semanas. */
export function MarcaNuevo({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-dm font-semibold uppercase tracking-[0.06em] text-[var(--panel-bien)] bg-[var(--panel-bien-fondo)] ${className}`}>
      Nuevo
    </span>
  );
}
