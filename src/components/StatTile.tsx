"use client";

import { useRef, useEffect, useState, useMemo } from "react";

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
    <div
      ref={ref}
      className="border border-negro/10 bg-crema p-6 text-center hover:border-dorado/40 transition-colors"
    >
      <div
        className="shimmer-gold font-cormorant font-light leading-none mb-2"
        style={{ fontSize: "clamp(32px,4vw,48px)" }}
      >
        {displayed}
      </div>
      <div className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm">
        {label}
      </div>
    </div>
  );
}
