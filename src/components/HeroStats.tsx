"use client";
import { GRUPO_MAX } from "@/lib/tours";

import { useRef, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

function parseNum(str: string): { prefix: string; value: number; suffix: string } | null {
  const match = str.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], value: parseFloat(match[2]), suffix: match[3] };
}

function AnimatedStat({ num, label }: { num: string; label: string }) {
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
        const duration = 1000;
        const end = parsed.value;

        const step = (ts: number) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current =
            end % 1 === 0
              ? Math.round(eased * end)
              : parseFloat((eased * end).toFixed(1));
          setDisplayed(`${parsed.prefix}${current}${parsed.suffix}`);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [parsed]);

  return (
    <div ref={ref} className="text-center">
      <span
        className="shimmer-gold font-cormorant font-light block leading-none"
        style={{ fontSize: "clamp(28px,4vw,40px)" }}
      >
        {displayed}
      </span>
      <span className="text-[9px] tracking-[3px] uppercase text-crema/40 mt-2 block font-dm">
        {label}
      </span>
    </div>
  );
}

export function HeroStats({ destinosCount }: { destinosCount: number }) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const stats = en
    ? [
        { num: String(destinosCount), label: "Unique destinations" },
        { num: "Departures",          label: "Every day" },
        { num: `Max. ${GRUPO_MAX}`,     label: "People per group" },
        { num: "Guides",              label: "NOM-09 certified" },
      ]
    : [
        { num: String(destinosCount), label: "Destinos Únicos" },
        { num: "Salidas",             label: "Todos los días" },
        { num: `Máx. ${GRUPO_MAX}`,     label: "Personas por grupo" },
        { num: "Guías",               label: "Certificados NOM-09" },
      ];

  return (
    <div className="flex gap-10 md:gap-16 flex-wrap justify-center border-t border-white/10 pt-10">
      {stats.map((s) => (
        <AnimatedStat key={s.label} num={s.num} label={s.label} />
      ))}
    </div>
  );
}
