"use client";

/**
 * «Qué pasa después de reservar»: tres pasos que quitan la última duda antes de
 * pagarle a una empresa que no conoces (¿me confirman?, ¿a qué hora pasan?,
 * ¿cuándo pago lo demás?). Todo lo que dice es lo que ya hace el equipo.
 */
export function QuePasaDespues({ titulo, pasos }: { titulo: string; pasos: string[] }) {
  return (
    <div className="mt-5 border-t border-negro/10 pt-4">
      <p className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-3">{titulo}</p>
      <ol className="space-y-2.5">
        {pasos.map((p, n) => (
          <li key={p} className="flex items-start gap-2.5 font-dm text-[12px] text-negro/65 leading-snug">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-verde-selva/10 text-verde-selva text-[11px] font-medium flex items-center justify-center" aria-hidden="true">
              {n + 1}
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
