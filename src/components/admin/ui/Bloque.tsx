/**
 * Un bloque de detalle bajo los indicadores: título serif, una línea que dice
 * para qué sirve y su contenido (casi siempre una tabla con scroll lateral en
 * el celular).
 */
export function Bloque({ titulo, descripcion, children, className = "" }: {
  titulo: string;
  descripcion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel-card mt-5 overflow-hidden ${className}`}>
      <div className="px-4 pt-4">
        <h2 className="font-cormorant text-[22px] leading-tight text-[var(--panel-tinta)]">{titulo}</h2>
        {descripcion && <p className="mt-0.5 max-w-prose text-[12.5px] font-dm leading-snug text-[var(--panel-tinta-media)]">{descripcion}</p>}
      </div>
      <div className="mt-2 overflow-x-auto">{children}</div>
    </section>
  );
}

/** Aviso de que una fuente no contestó: qué falta y cómo se arregla. Nunca un hueco en blanco. */
export function AvisoFuente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="panel-card mb-5 border-l-4 border-l-[var(--panel-problema)] px-4 py-3">
      <p className="text-[13px] font-dm font-semibold text-[var(--panel-problema)]">{titulo}</p>
      <p className="mt-0.5 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{texto}</p>
    </div>
  );
}

export const th = "px-3 py-2 text-left";
export const thR = "px-3 py-2 text-right";
export const td = "px-3 py-2";
export const tdR = "panel-cifra px-3 py-2 text-right";
