"use client";

import { useEffect, useRef, useState } from "react";

// Número que cuenta de 0 al valor con easing (easeOutCubic). Solo presentación.
export default function CountUp({
  value,
  format,
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Respeta a quien prefiere menos movimiento.
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, durationMs]);

  return <span className={className}>{format ? format(n) : n.toLocaleString("es-MX")}</span>;
}
