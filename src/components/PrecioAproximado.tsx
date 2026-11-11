import { aproximado, pesosPorMoneda } from "@/lib/divisas";

/**
 * El precio de la ficha en dólares y euros, APROXIMADO (`lib/divisas.ts`).
 * Solo para la versión en inglés: quien lee en español piensa en pesos.
 * Componente de servidor: el tipo de cambio se pide aquí y no en el navegador.
 */
export async function PrecioAproximado({
  mxn,
  className,
  conNota = false,
}: {
  mxn: number;
  className?: string;
  /** Añade «· charged in MXN»: donde el precio va solo, sin la unidad al lado. */
  conNota?: boolean;
}) {
  const tc = await pesosPorMoneda();
  return (
    <span className={className}>
      {aproximado(mxn, tc)}
      {conNota && " · charged in MXN"}
    </span>
  );
}
