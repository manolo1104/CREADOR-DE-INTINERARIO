"use client";

import { useEffect, useState } from "react";

// Indicador de visitantes en vivo REALES. Se muestra SOLO cuando hay actividad
// real (2+ personas navegando a la vez, incluyéndote). Si no, no aparece —
// nunca inventa un número.
export function VisitantesEnVivo({ en = false }: { en?: boolean }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const traer = () => {
      fetch("/api/activos")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && typeof d.activos === "number") setN(d.activos); })
        .catch(() => {});
    };
    traer();
    const id = setInterval(traer, 30_000);
    return () => clearInterval(id);
  }, []);

  // El hueco se reserva SIEMPRE, haya o no píldora. Antes esto era
  // `return null` hasta que el fetch respondía: la píldora aparecía de la nada
  // y empujaba hacia abajo lo que tuviera debajo —en el inicio, los dos botones
  // de reserva— justo cuando el dedo iba a tocarlos. El alto fijo es el de la
  // píldora (texto de 12 px + py-2 + borde).
  return (
    <div className="mb-4 h-[34px] flex items-center justify-center" aria-live="polite">
      {n >= 2 && (
        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-verde-vivo opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-verde-vivo" />
          </span>
          <span className="font-dm text-crema/85 text-xs">
            {en
              ? `${n} people exploring the Huasteca right now`
              : `${n} personas explorando la Huasteca ahora`}
          </span>
        </span>
      )}
    </div>
  );
}
