"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const fmx = (n: number) => `$${Math.round(n ?? 0).toLocaleString("es-MX")}`;
export const pctTexto = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : "—";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
export const fDiaCorto = (ymd: string) =>
  ymd ? `${Number(ymd.slice(8, 10))} ${MESES[Number(ymd.slice(5, 7)) - 1]}` : "—";

/**
 * Variación contra el periodo anterior.
 * `invertir` para los costos: gastar más no es una buena noticia.
 */
export function Variacion({ antes, ahora, invertir }: { antes: number; ahora: number; invertir?: boolean }) {
  if (antes === 0 && ahora === 0) return null;
  if (antes === 0) return <span className="text-[#1B4332]/35 text-[10px] font-dm">sin comparación</span>;
  const pct = Math.round(((ahora - antes) / Math.abs(antes)) * 100);
  const bueno = invertir ? pct < 0 : pct > 0;
  const Icono = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct === 0 ? "text-[#1B4332]/40" : bueno ? "text-[#52B788]" : "text-[#C9484A]";
  return (
    <span className={`flex items-center gap-1 text-[10px] font-dm ${color}`}>
      <Icono className="w-3 h-3" />{pct > 0 ? "+" : ""}{pct}% vs periodo anterior
    </span>
  );
}

/** Descarga cualquier tabla como CSV que Excel abre sin pelear (con BOM). */
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = filas.map(f => f.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${nombre}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function BotonExportar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 border border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/40 px-3 py-1.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm transition-colors">
      Excel
    </button>
  );
}

export function Etiqueta({ texto, tono }: { texto: string; tono: "verde" | "naranja" | "rojo" | "gris" | "azul" }) {
  const tonos = {
    verde:   "bg-[#52B788]/12 text-[#1B6B45]",
    naranja: "bg-orange-100 text-orange-800",
    rojo:    "bg-[#C9484A]/12 text-[#A33638]",
    gris:    "bg-[#1B4332]/8 text-[#1B4332]/60",
    azul:    "bg-[#1a4e8a]/10 text-[#1a4e8a]",
  };
  return <span className={`text-[9px] font-dm px-1.5 py-0.5 rounded-sm whitespace-nowrap ${tonos[tono]}`}>{texto}</span>;
}

export const TONO_PAGO: Record<string, "verde" | "naranja" | "rojo" | "gris"> = {
  pagado: "verde", parcial: "naranja", pendiente: "gris", vencido: "rojo",
};
