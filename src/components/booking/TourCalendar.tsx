"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_ES = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function formatYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPast(d: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd < tomorrow;
}

// High demand: Fri (5), Sat (6), Sun (0)
function isHighDemand(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 5 || dow === 6;
}

// Pseudo-deterministic cupos — todos los días muestran disponibilidad
// Fines de semana (Vie/Sáb/Dom): 4-7  |  Entre semana: 8-12
function cuposRestantes(d: Date): number {
  // Semilla determinista basada en año+mes+día para que no cambie al re-render
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const pseudo = ((seed * 2654435761) >>> 0) % 1000; // hash simple
  const dow = d.getDay();
  const hiDemand = dow === 0 || dow === 5 || dow === 6;
  if (hiDemand) {
    return (pseudo % 4) + 4; // 4-7
  }
  return (pseudo % 5) + 8;   // 8-12
}

// Build Mon-first calendar grid for a given month
function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const grid: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }
  return grid;
}

// ── MonthGrid ─────────────────────────────────────────────────────────────────

function MonthGrid({
  year, month, selected, onSelect,
}: {
  year:     number;
  month:    number;
  selected: string;
  onSelect: (ymd: string) => void;
}) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const grid = buildGrid(year, month);

  return (
    <div className="min-w-0">
      {/* Month label */}
      <p className="text-center font-cormorant text-verde-profundo text-base mb-3 leading-none">
        {MONTHS_ES[month]} {year}
      </p>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES.map((d) => (
          <span key={d} className="text-center text-[10px] tracking-[1px] uppercase text-negro/35 font-dm py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;

          const ymd        = formatYMD(date);
          const past       = isPast(date);
          const hiDemand   = !past && isHighDemand(date);
          const cupos      = past ? 0 : cuposRestantes(date);
          const isSelected = ymd === selected;

          if (past) {
            return (
              <div key={ymd} className="flex flex-col items-center py-1">
                <span className="w-8 h-8 flex items-center justify-center text-[12px] font-dm text-negro/20 cursor-not-allowed select-none">
                  {date.getDate()}
                </span>
              </div>
            );
          }

          return (
            <div
              key={ymd}
              className="relative flex flex-col items-center py-1"
              onMouseEnter={() => setTooltip(ymd)}
              onMouseLeave={() => setTooltip(null)}
            >
              <button
                onClick={() => onSelect(ymd)}
                aria-label={`Seleccionar ${ymd}`}
                className={`relative w-8 h-8 flex items-center justify-center text-[12px] font-dm rounded-full transition-all duration-150
                  ${isSelected
                    ? "bg-verde-selva text-white font-semibold"
                    : "text-negro/80 hover:bg-verde-selva/15 hover:text-verde-selva"
                  }`}
              >
                {date.getDate()}
                {/* Badge de cupos en todos los días disponibles */}
                {!isSelected && (
                  <span className={`absolute -top-1.5 -right-2 text-negro text-[7px] font-dm font-bold leading-none px-1 py-0.5 rounded-full whitespace-nowrap ${
                    hiDemand ? "bg-amber-400" : "bg-verde-vivo/80 text-white"
                  }`}>
                    {cupos}
                  </span>
                )}
              </button>

              {/* Tooltip desktop */}
              {tooltip === ymd && !isSelected && (
                <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                  <div className="bg-negro/90 text-crema text-[10px] font-dm whitespace-nowrap px-2.5 py-1.5 rounded shadow-lg">
                    {hiDemand
                      ? `Alta demanda · Solo ${cupos} lugares`
                      : `Disponible · ${cupos} cupos restantes`}
                  </div>
                  <div className="w-2 h-2 bg-negro/90 rotate-45 mx-auto -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TourCalendar ─────────────────────────────────────────────────────────

interface Props {
  value:    string; // YYYY-MM-DD
  onChange: (ymd: string) => void;
}

export function TourCalendar({ value, onChange }: Props) {
  const today = new Date();
  const [monthStart, setMonthStart] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const prev = useCallback(() => setMonthStart((m) => addMonths(m, -1)), []);
  const next = useCallback(() => setMonthStart((m) => addMonths(m, 1)), []);

  const month2Start = addMonths(monthStart, 1);

  function handleSelect(ymd: string) {
    onChange(ymd);
    setMobileOpen(false);
  }

  function formatDisplay(ymd: string) {
    if (!ymd) return "";
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = date.toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const CalendarInner = () => (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          aria-label="Mes anterior"
          className="w-8 h-8 flex items-center justify-center text-negro/50 hover:text-verde-selva hover:bg-verde-selva/10 transition-colors rounded-full"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm">
          Selecciona tu fecha
        </span>
        <button
          onClick={next}
          aria-label="Mes siguiente"
          className="w-8 h-8 flex items-center justify-center text-negro/50 hover:text-verde-selva hover:bg-verde-selva/10 transition-colors rounded-full"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Months grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MonthGrid
          year={monthStart.getFullYear()}
          month={monthStart.getMonth()}
          selected={value}
          onSelect={handleSelect}
        />
        <div className="hidden sm:block">
          <MonthGrid
            year={month2Start.getFullYear()}
            month={month2Start.getMonth()}
            selected={value}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-negro/8">
        <div className="flex items-center gap-1.5">
          <span className="bg-verde-vivo/80 text-white text-[7px] font-dm font-bold px-1.5 py-0.5 rounded-full">9</span>
          <span className="text-[9px] text-negro/40 font-dm">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-amber-400 text-negro text-[7px] font-dm font-bold px-1.5 py-0.5 rounded-full">5</span>
          <span className="text-[9px] text-negro/40 font-dm">Alta demanda (fin de semana)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-negro/20 font-dm">14</span>
          <span className="text-[9px] text-negro/40 font-dm">No disponible</span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* ── Desktop: calendar always visible ── */}
      <div className="hidden sm:block">
        <CalendarInner />
      </div>

      {/* ── Mobile: trigger + bottom sheet ── */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`w-full flex items-center justify-between px-4 py-3 border font-dm text-sm transition-colors ${
            value
              ? "border-verde-selva bg-verde-selva/5 text-negro/80"
              : "border-negro/20 bg-crema text-negro/40"
          }`}
        >
          <span>{value ? formatDisplay(value) : "Toca para seleccionar fecha"}</span>
          <ChevronRight className="w-4 h-4 text-negro/30" />
        </button>

        {/* Bottom sheet overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-negro/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-crema rounded-t-2xl shadow-2xl p-6 pb-8 animate-slide-up">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-cormorant text-verde-profundo text-lg">Selecciona la fecha</h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar"
                  className="w-8 h-8 flex items-center justify-center text-negro/40 hover:text-negro transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CalendarInner />
            </div>
          </div>
        )}
      </div>

      {/* Selection confirmation (both mobile & desktop) */}
      {value && (
        <div className="mt-3 flex items-center gap-2 text-verde-selva text-xs font-dm animate-fade-in">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>
            Fecha seleccionada: <strong>{formatDisplay(value)}</strong> · Salida: por acordar
          </span>
        </div>
      )}
    </div>
  );
}
