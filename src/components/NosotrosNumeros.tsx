"use client";
import { useEffect, useRef, useState } from "react";

type NumeroItem = {
  target: number;
  decimals: number;
  format: (n: number) => string;
  label: string;
  /** solo los números grandes cuentan hacia arriba; rating e incidentes se muestran fijos */
  anima?: boolean;
};

const NUMEROS: NumeroItem[] = [
  {
    target: 10000,
    decimals: 0,
    format: (n) => `+${Math.floor(n).toLocaleString("es-MX")}`,
    label: "Viajeros guiados",
    anima: true,
  },
  {
    target: 15,
    decimals: 0,
    format: (n) => `${Math.floor(n)}+`,
    label: "Años de experiencia local",
    anima: true,
  },
  {
    target: 4.9,
    decimals: 1,
    format: (n) => `${n.toFixed(1)} ★`,
    label: "Calificación Google",
  },
  {
    target: 0,
    decimals: 0,
    format: (n) => `${Math.floor(n)}`,
    label: "Incidentes de seguridad",
  },
];

function CounterItem({ target, decimals, format, label, anima }: NumeroItem) {
  // Arranca en el valor final: sin JS (o antes de hidratar) siempre se ve el dato real,
  // nunca "0.0 ★" ni "+0 viajeros".
  const [val, setVal] = useState(target);
  const ref = useRef<HTMLDivElement>(null);
  const didRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !anima || target === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || didRun.current) return;
        didRun.current = true;
        observer.disconnect();
        const duration = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          const cur = parseFloat((ease * target).toFixed(decimals));
          setVal(cur);
          if (t < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, decimals, anima]);

  return (
    <div ref={ref} className="p-4">
      <div
        className="shimmer-gold font-cormorant font-light leading-none mb-2"
        style={{ fontSize: "clamp(36px,5vw,52px)" }}
      >
        {format(val)}
      </div>
      <div className="text-[10px] tracking-[2px] uppercase text-negro/65 font-dm">{label}</div>
    </div>
  );
}

export function NosotrosNumeros() {
  return (
    <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {NUMEROS.map((n) => (
        <CounterItem key={n.label} {...n} />
      ))}
    </div>
  );
}
