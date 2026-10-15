"use client";

import { useEffect, useRef, useState } from "react";

/**
 * «3 d 4 h 12 min» hasta una fecha REAL (el fin de la preventa, el corte).
 * Al llegar a cero llama `onFin` una vez —la página vuelve a pedir el precio—
 * y deja de pintarse: un contador en cero que sigue en pantalla es urgencia
 * falsa.
 */
export function FaltaPara({ hasta, onFin, className = "" }: { hasta: string; onFin?: () => void; className?: string }) {
  const [resta, setResta] = useState<number | null>(null);
  const avisado = useRef(false);

  useEffect(() => {
    avisado.current = false;
    const fin = new Date(hasta).getTime();
    const tick = () => {
      const ms = fin - Date.now();
      setResta(ms);
      if (ms <= 0 && !avisado.current) {
        avisado.current = true;
        onFin?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // `onFin` cambia en cada render del padre; solo importa la fecha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasta]);

  // Mismo HTML en el servidor y en el primer pintado: nada hasta montar.
  if (resta === null || resta <= 0) return null;
  const d = Math.floor(resta / 86_400_000);
  const h = Math.floor((resta / 3_600_000) % 24);
  const m = Math.floor((resta / 60_000) % 60);
  const s = Math.floor((resta / 1000) % 60);
  const texto = d > 0 ? `${d} d ${h} h ${m} min` : h > 0 ? `${h} h ${m} min` : `${m} min ${String(s).padStart(2, "0")} s`;
  return <span className={`tabular-nums ${className}`}>{texto}</span>;
}
