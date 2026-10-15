"use client";

import { useEffect, useState } from "react";
import { pesos } from "@/lib/viajeCdmx/precio";

/**
 * El botón fijo del celular: precio real «desde» y «Apartar», que baja al
 * calendario. Se esconde mientras el calendario está en pantalla (ahí ya está
 * el botón de verdad) y mientras el botón del hero se ve: en un celular ese
 * botón queda debajo del pliegue, y sin la barra la primera pantalla no
 * tendría ningún «Apartar».
 */
export function BarraViaje({ desde, quedan }: { desde: number | null; quedan: number | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fechas = document.getElementById("fechas");
    const hero = document.querySelector("[data-cta-viaje]");
    let enFechas = false, enHero = true;
    const actualizar = () => setVisible(!enFechas && !enHero);
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === fechas) enFechas = e.isIntersecting;
        if (e.target === hero) enHero = e.isIntersecting;
      }
      actualizar();
    });
    if (fechas) io.observe(fechas);
    if (hero) io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-negro/95 backdrop-blur-sm transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          {desde ? (
            <>
              <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-crema/50">Desde</p>
              <p className="font-cormorant text-dorado text-2xl leading-none">{pesos(desde)} <span className="font-dm text-xs text-crema/55">por persona</span></p>
            </>
          ) : (
            <p className="text-sm font-dm text-crema/70">Nuevas fechas muy pronto</p>
          )}
          {quedan != null && quedan > 0 && <p className="text-[11px] font-dm text-crema/50 mt-0.5">Próxima salida: quedan {quedan}</p>}
        </div>
        <a
          href="#fechas"
          tabIndex={visible ? 0 : -1}
          className="shrink-0 min-h-[48px] inline-flex items-center px-6 bg-dorado text-negro text-[11px] tracking-[2px] uppercase font-dm"
        >
          {desde ? "Apartar" : "Avísame"}
        </a>
      </div>
    </div>
  );
}
