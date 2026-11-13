import Link from "next/link";

/**
 * Lo que se ve cuando no hay nada que mostrar: qué es esto, por qué está
 * vacío y a dónde ir. Nunca un hueco en blanco.
 */
export function EstadoVacio({ titulo, texto, accion }: {
  titulo: string;
  texto: string;
  accion?: { href: string; etiqueta: string };
}) {
  return (
    <div className="panel-card flex flex-col items-start gap-3 px-6 py-8 sm:px-8">
      <p className="font-cormorant text-2xl text-[var(--panel-tinta)]">{titulo}</p>
      <p className="max-w-prose text-[13.5px] font-dm leading-relaxed text-[var(--panel-tinta-media)]">{texto}</p>
      {accion && (
        <Link href={accion.href}
          className="panel-foco panel-pulsable inline-flex min-h-[44px] items-center rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white">
          {accion.etiqueta}
        </Link>
      )}
    </div>
  );
}
