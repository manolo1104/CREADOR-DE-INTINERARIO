import { colorDeTour, codigoDeTour } from "@/lib/admin/coloresTour";

/**
 * El código de tres letras de un recorrido, en su color: TAM, SUR, MIN…
 *
 * Es la etiqueta estándar del panel. Se pinta igual en el calendario, en las
 * reservas, en las cotizaciones y en los cobros, para que un recorrido se
 * reconozca de un vistazo en cualquier pantalla sin leer el nombre completo.
 *
 * 🔴 El código NO es decoración: con quince recorridos no existen quince
 * colores que cualquiera distinga —el máximo calculado es ΔE 13.5 contra un
 * piso de 15—, así que el color por sí solo no alcanza y las tres letras son
 * la señal que de verdad identifica. Por eso el código va SIEMPRE que vaya el
 * color, y nunca el color solo. (Ver `coloresTour.ts`.)
 *
 * Sin `use client`: es una función pura que no usa hooks, así que sirve igual
 * en un Server Component que dentro de uno de cliente.
 */
export function CodigoTour({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <span
      className={`font-dm font-bold tracking-[0.5px] ${className}`}
      style={{ color: colorDeTour(slug) }}
      title={slug}
    >
      {codigoDeTour(slug)}
    </span>
  );
}

/**
 * El mismo código, pero como píldora con el tinte y la barra del recorrido:
 * para renglones de lista, donde el bloque de color ayuda a agrupar con la
 * vista. El texto que la acompaña va SIEMPRE en tinta, nunca en el color del
 * recorrido: 9-11 px en magenta sobre su propio tinte no se lee.
 */
export function PildoraTour({ slug, children, className = "" }: { slug: string; children?: React.ReactNode; className?: string }) {
  const color = colorDeTour(slug);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm text-[10px] font-dm text-[#1B4332]/80 ${className}`}
      style={{ background: `${color}1f`, borderLeft: `3px solid ${color}` }}
    >
      <span className="font-bold" style={{ color }}>{codigoDeTour(slug)}</span>
      {children}
    </span>
  );
}
