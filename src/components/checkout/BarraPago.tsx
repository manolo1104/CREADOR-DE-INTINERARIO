"use client";

/**
 * La barra fija de abajo en el celular: lo que se paga HOY, el total del viaje
 * y el botón del paso en el que va. Siempre a la vista, también en el pago
 * (la de antes desaparecía ahí y el botón de pagar quedaba fuera de pantalla).
 */
export function BarraPago({
  etiquetaHoy,
  hoy,
  total,
  boton,
  onBoton,
  ocupado,
}: {
  etiquetaHoy: string;
  hoy: string;
  total: string;
  boton: string;
  onBoton: () => void;
  ocupado?: boolean;
}) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-negro/10 bg-crema/95 backdrop-blur-sm px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-3">
      <div className="min-w-0">
        <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/45 leading-none">{etiquetaHoy}</p>
        <p className="font-cormorant text-dorado text-[22px] leading-tight">{hoy} <span className="font-dm text-[11px] text-negro/40">MXN</span></p>
        <p className="font-dm text-[10px] text-negro/50 leading-none">{total}</p>
      </div>
      <button
        type="button"
        onClick={onBoton}
        disabled={ocupado}
        className="ml-auto flex-shrink-0 bg-verde-selva text-crema px-5 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors disabled:opacity-50"
      >
        {boton}
      </button>
    </div>
  );
}
