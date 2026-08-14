"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { getNosotros } from "@/lib/i18n/nosotros.en";

type HitoItem = {
  año: string;
  hito: string;
  cta: { label: string; href: string } | null;
};

/**
 * La línea del tiempo se arma con el diccionario.
 *
 * Antes la lista vivía aquí, duplicada de `nosotros/page.tsx`. Al traducir había
 * que acordarse de las dos copias, y la que se enseña de verdad es esta.
 * Año y destino del enlace no dependen del idioma; el texto sí.
 */
const HISTORIA_BASE: { año: string; href: string | null }[] = [
  { año: "2010", href: null },
  { año: "2012", href: null },
  { año: "2014", href: "/tours/expedicion-tamul" },
  { año: "2015", href: "/tours/ruta-surrealista-edward-james" },
  { año: "2016", href: null },
  { año: "2017", href: null },
  { año: "2018", href: "/tours/expedicion-tamul" },
  { año: "2019", href: null },
  { año: "2020", href: null },
  { año: "2021", href: "/tours/expedicion-tamul" },
  { año: "2022", href: "/sustentabilidad-y-conservacion" },
  { año: "2023", href: null },
  { año: "2024", href: "/sustentabilidad-y-conservacion" },
  { año: "2025", href: "/recomendar" },
];

export function NosotrosTimeline() {
  const { locale, en, lp } = useLocale();
  const t = getNosotros(locale);
  // `/recomendar` y `/sustentabilidad-y-conservacion` siguen siendo solo-ES: en
  // inglés el hito se queda sin enlace en vez de cruzar de idioma.
  const HISTORIA: HitoItem[] = HISTORIA_BASE.map((h, i) => ({
    año: h.año,
    hito: t.historia[i].hito,
    cta: h.href && t.historia[i].ctaLabel && !(en && /recomendar|sustentabilidad/.test(h.href))
      ? { label: t.historia[i].ctaLabel!, href: lp(h.href) }
      : null,
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);
  const [lineH, setLineH] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        HISTORIA.forEach((_, i) => {
          setTimeout(() => setRevealed(i + 1), i * 90);
        });
        // Grow the vertical line over the full duration
        setTimeout(() => setLineH(100), HISTORIA.length * 90 + 200);
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative pl-8">
      {/* Vertical line — grows as items reveal */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-verde-selva/15" />
      <div
        className="absolute left-0 top-0 w-px bg-verde-selva/60 transition-all duration-[2s] ease-out"
        style={{ height: `${lineH}%` }}
      />

      <div className="space-y-6">
        {HISTORIA.map((h, i) => (
          <div
            key={h.año}
            className="relative"
            style={{
              opacity: i < revealed ? 1 : 0,
              transform: i < revealed ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 0.45s ease ${i * 30}ms, transform 0.45s cubic-bezier(0.23,1,0.32,1) ${i * 30}ms`,
            }}
          >
            {/* Dot */}
            <div
              className="absolute -left-10 w-3 h-3 rounded-full bg-verde-selva top-1"
              style={{
                transform: i < revealed ? "scale(1)" : "scale(0)",
                transition: `transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 90 + 60}ms`,
              }}
            />
            <span className="font-cormorant text-dorado text-base font-light block mb-1">{h.año}</span>
            <p className="text-negro/60 font-dm text-sm leading-relaxed mb-1.5">{h.hito}</p>
            {h.cta && (
              <Link
                href={h.cta.href}
                className="inline-flex items-center gap-1 text-[10px] font-dm text-verde-selva hover:text-verde-vivo underline underline-offset-2 transition-colors"
              >
                <span className="text-verde-vivo">→</span> {h.cta.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
