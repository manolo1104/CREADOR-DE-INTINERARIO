"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Datos REALES y verificables que rotan (sin contadores de "personas viendo" inventados).
const FACTS_ES = [
  "Salidas todos los días del año",
  "Cancelación gratuita hasta 48h antes",
  "+10,000 viajeros · 4.9★ en Google",
  "Transporte, desayuno y guía incluidos",
];
const FACTS_EN = [
  "Departures every day of the year",
  "Free cancellation up to 48h before",
  "+10,000 travelers · 4.9★ on Google",
  "Transport, breakfast & guide included",
];

export function UrgencyWidget() {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const FACTS = en ? FACTS_EN : FACTS_ES;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % FACTS.length), 3800);
    return () => clearInterval(id);
  }, [FACTS.length]);

  return (
    <div className="flex items-center gap-2 text-[11px] font-dm text-crema/85">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lima opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-lima" />
      </span>
      <span key={i} className="animate-fade-in">
        <span className="text-lima">✓</span> {FACTS[i]}
      </span>
    </div>
  );
}
