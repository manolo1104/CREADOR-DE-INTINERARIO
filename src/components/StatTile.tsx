"use client";

import { useRef, useEffect, useState, useMemo } from "react";

/**
 * Una cifra de la región con su rótulo, para la fila de datos del inicio.
 *
 * 🔴 29 oct 2026: ya no es una tarjeta. Eran cuatro cajas iguales con borde y
 * un número que brillaba (`shimmer-gold`) —cuatro recuadros idénticos en
 * fila son la señal más reconocible de una página hecha con plantilla—. Ahora
 * cada dato es un número grande y un rótulo, separados por una sola línea a
 * la izquierda, y el dorado es fijo: el brillo animado estaba en todos los
 * titulares del inicio y aquí era uno más.
 *
 * El conteo desde cero al entrar en pantalla se conserva: es lo que hace que
 * el ojo se pare en la cifra, que es justo lo que la fila quiere.
 */

/** Separa «105m» en prefijo, número y sufijo para animar sólo el número. */
function parseNum(str: string): { prefix: string; value: number; suffix: string } | null {
  const match = str.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], value: parseFloat(match[2]), suffix: match[3] };
}

export function StatTile({ num, label }: { num: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = useState(num);
  const parsed = useMemo(() => parseNum(num), [num]);

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;
    // A quien pidió menos movimiento se le enseña la cifra final de entrada.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start: number | null = null;
        const duration = 1200;
        const end = parsed.value;
        const step = (ts: number) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * end);
          setDisplayed(`${parsed.prefix}${current}${parsed.suffix}`);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed]);

  return (
    <div ref={ref} className="border-l border-negro/15 pl-5 sm:pl-6">
      <div
        className="font-cormorant font-light leading-none text-dorado tabular-nums"
        style={{ fontSize: "clamp(34px,3.4vw,48px)" }}
      >
        {displayed}
      </div>
      <div className="mt-2 font-dm text-[13px] leading-snug text-negro/55">
        {label}
      </div>
    </div>
  );
}
