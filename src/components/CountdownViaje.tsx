"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Fecha objetivo en ISO (con zona horaria). Ej: "2026-09-16T07:00:00-06:00" */
  target: string;
  en?: boolean;
  /** "hero" = grande sobre la imagen; "inline" = compacto en la sección de precio */
  variant?: "hero" | "inline";
}

type Left = { d: number; h: number; m: number; s: number };

export function CountdownViaje({ target, en = false, variant = "hero" }: Props) {
  // null hasta que monta en el cliente → mismo render en server y primer paint (sin hydration mismatch)
  const [left, setLeft] = useState<Left | null>(null);

  useEffect(() => {
    const targetMs = new Date(target).getTime();
    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      setLeft({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff / 3_600_000) % 24),
        m: Math.floor((diff / 60_000) % 60),
        s: Math.floor((diff / 1_000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const L = en
    ? { d: "days", h: "hrs", m: "min", s: "sec", title: "Departure in" }
    : { d: "días", h: "hrs", m: "min", s: "seg", title: "Faltan para la salida" };

  const cells: { v: number | null; l: string }[] = [
    { v: left?.d ?? null, l: L.d },
    { v: left?.h ?? null, l: L.h },
    { v: left?.m ?? null, l: L.m },
    { v: left?.s ?? null, l: L.s },
  ];

  const numClass =
    variant === "hero"
      ? "font-cormorant text-dorado leading-none text-3xl sm:text-4xl"
      : "font-cormorant text-dorado leading-none text-2xl";
  const cellClass =
    variant === "hero"
      ? "min-w-[58px] sm:min-w-[68px] border border-white/15 bg-negro/50 backdrop-blur-sm px-2 py-2.5"
      : "min-w-[54px] border border-white/12 bg-negro/40 px-2 py-2";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <p className="text-[9px] tracking-[3px] uppercase text-crema/50 font-dm">{L.title}</p>
      <div className="flex gap-2 sm:gap-3">
        {cells.map((c) => (
          <div key={c.l} className={`text-center ${cellClass}`}>
            <span className={numClass}>
              {c.v === null ? "--" : String(c.v).padStart(2, "0")}
            </span>
            <span className="block text-[8px] tracking-[2px] uppercase text-crema/40 font-dm mt-1">
              {c.l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
