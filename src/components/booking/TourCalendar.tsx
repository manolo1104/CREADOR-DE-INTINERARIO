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
            >
              <button
                onClick={() => onSelect(ymd)}
                aria-label={`Seleccionar ${ymd}`}
                className={`w-8 h-8 flex items-center justify-center text-[12px] font-dm rounded-full transition-colors duration-150
                  ${isSelected
                    ? "bg-verde-selva text-white font-semibold animate-date-pop"
                    : "text-negro/80 hover:bg-verde-selva/15 hover:text-verde-selva"
                  }`}
              >
                {date.getDate()}
              </button>
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
