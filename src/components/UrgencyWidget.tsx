"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GOOGLE_RATING } from "@/lib/resenas";

// Datos REALES y verificables que rotan (sin contadores de "personas viendo" inventados).
// La calificación sale de resenas.ts (constante pura: no mete el catálogo al
// bundle del cliente).
// 🔴 28 sep 2026: el cuarto decía «Transporte, desayuno y guía incluidos», y
// solo 5 de los 14 recorridos llevan desayuno (el RZR y el buceo, ni traslado).
// Queda lo que sí trae TODO recorrido: guía NOM-09 y seguro de viaje.
// 🔴 La cancelación gratis NO es de todo recorrido: el Edén no reembolsa. Los
// nombres llegan por prop (`sinReembolso`, calculado del catálogo en el
// servidor) para no meter TOURS_DB al bundle del cliente.
function facts(en: boolean, sinReembolso: string[]): string[] {
  const salvo = sinReembolso.length
    ? (en ? ` (except ${sinReembolso.join(", ")})` : ` (salvo ${sinReembolso.join(", ")})`)
    : "";
  return en
    ? [
        "Departures every day of the year",
        `Free cancellation up to 48h before${salvo}`,
        `+10,000 travelers · ${GOOGLE_RATING}★ on Google`,
        "NOM-09 guide & travel insurance included",
      ]
    : [
        "Salidas todos los días del año",
        `Cancelación gratuita hasta 48h antes${salvo}`,
        `+10,000 viajeros · ${GOOGLE_RATING}★ en Google`,
        "Guía NOM-09 y seguro de viaje incluidos",
      ];
}

export function UrgencyWidget({ sinReembolso = [] }: { sinReembolso?: string[] }) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const FACTS = facts(en, sinReembolso);
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
