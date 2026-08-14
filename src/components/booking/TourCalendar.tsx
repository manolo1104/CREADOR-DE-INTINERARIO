"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { minBookingDate } from "@/lib/tourBooking";
import { bloquearScroll } from "@/lib/scrollLock";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import type { Locale } from "@/lib/i18n/config";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Nombre del mes en el idioma del visitante, con mayúscula inicial. */
function nombreMes(month: number, locale: Locale): string {
  const f = new Date(2020, month, 1).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX", { month: "long" },
  );
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function formatYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Primer día reservable, anclado a la hora de México y NO a la del dispositivo.
 * Un viajero en España veía habilitado un día que aquí ya pasó.
 */
function primerDiaReservable(): Date {
  const [y, m, d] = minBookingDate().split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Último día reservable. Sin tope, la gente paginaba hacia adelante y acababa
 * eligiendo fechas a 10 meses vista (en el log había dos de 2027) — eso no es
 * una reserva, es alguien peleándose con el calendario.
 */
const MESES_MAX = 6;

function ultimoDiaReservable(): Date {
  const min = primerDiaReservable();
  return new Date(min.getFullYear(), min.getMonth() + MESES_MAX, min.getDate());
}

function fueraDeRango(d: Date): boolean {
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd < primerDiaReservable() || dd > ultimoDiaReservable();
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

function formatDisplay(ymd: string, locale: Locale): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const f = date.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

// ── MonthGrid ─────────────────────────────────────────────────────────────────

function MonthGrid({
  year, month, selected, bloqueadas, motivoBloqueo, onSelect, locale,
}: {
  year:     number;
  month:    number;
  selected: string;
  bloqueadas: Set<string>;
  motivoBloqueo?: (ymd: string) => string;
  onSelect: (ymd: string) => void;
  locale:   Locale;
}) {
  const grid = buildGrid(year, month);
  const dias = getBooking(locale).calendario.dias;

  return (
    <div className="min-w-0">
      <p className="text-center font-cormorant text-verde-profundo text-base mb-3 leading-none">
        {nombreMes(month, locale)} {year}
      </p>

      <div className="grid grid-cols-7 mb-1">
        {dias.map((d) => (
          <span key={d} className="text-center text-[10px] tracking-[1px] uppercase text-negro/35 font-dm py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;

          const ymd        = formatYMD(date);
          const past       = fueraDeRango(date);
          const ocupado    = bloqueadas.has(ymd);
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

          // Día que ya ocupa otro recorrido del carrito. Se distingue del día
          // fuera de rango (tachado, no gris muerto) porque no es "imposible",
          // es "ya lo tienes tomado", y el tooltip dice con qué.
          if (ocupado) {
            return (
              <div key={ymd} className="flex flex-col items-center py-1">
                <span
                  title={motivoBloqueo?.(ymd)}
                  aria-label={motivoBloqueo?.(ymd)}
                  className="w-8 h-8 flex items-center justify-center text-[12px] font-dm text-negro/30 line-through decoration-terracota/60 cursor-not-allowed select-none"
                >
                  {date.getDate()}
                </span>
              </div>
            );
          }

          return (
            <div key={ymd} className="relative flex flex-col items-center py-1">
              <button
                type="button"
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

// ── Contenido del calendario ────────────────────────────────────────────────
// Vive FUERA del componente principal a propósito: estaba definido dentro y se
// recreaba en cada render, lo que remontaba todo el subárbol y tiraba el foco y
// el scroll de la fila de días. Con un calendario suelto apenas se notaba; con
// uno por renglón del carrito, sí.

function CalendarInner({
  value, monthStart, bloqueadas, motivoBloqueo,
  puedeRetroceder, puedeAvanzar, onPrev, onNext, onSelect, locale,
}: {
  value: string;
  monthStart: Date;
  bloqueadas: Set<string>;
  motivoBloqueo?: (ymd: string) => string;
  puedeRetroceder: boolean;
  puedeAvanzar: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (ymd: string) => void;
  locale: Locale;
}) {
  const month2Start = addMonths(monthStart, 1);
  const t = getBooking(locale).calendario;

  // Atajo de los próximos 14 días: elegir fecha en un clic en lugar de navegar
  // una cuadrícula. La mayoría reserva para los días inmediatos.
  const proximosDias = (() => {
    const inicio = primerDiaReservable();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      return {
        ymd: formatYMD(d),
        dia: t.dias[(d.getDay() + 6) % 7],
        num: d.getDate(),
        mes: nombreMes(d.getMonth(), locale).slice(0, 3),
      };
    });
  })();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm mb-2">
          {t.proximosDias}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {proximosDias.map((d) => {
            const activo  = d.ymd === value;
            const ocupado = bloqueadas.has(d.ymd);
            return (
              <button
                key={d.ymd}
                type="button"
                disabled={ocupado}
                title={ocupado ? motivoBloqueo?.(d.ymd) : undefined}
                onClick={() => onSelect(d.ymd)}
                aria-pressed={activo}
                aria-label={d.ymd}
                className={`flex-shrink-0 w-12 py-1.5 border text-center transition-colors ${
                  activo
                    ? "border-verde-selva bg-verde-selva text-crema"
                    : ocupado
                      ? "border-negro/10 text-negro/25 line-through cursor-not-allowed"
                      : "border-negro/15 hover:border-verde-selva/50 text-negro"
                }`}
              >
                <span className={`block text-[9px] font-dm uppercase tracking-[1px] ${activo ? "text-crema/70" : "text-negro/40"}`}>
                  {d.dia}
                </span>
                <span className="block text-sm font-dm leading-tight">{d.num}</span>
                <span className={`block text-[9px] font-dm ${activo ? "text-crema/70" : "text-negro/40"}`}>
                  {d.mes}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-negro/8 pt-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!puedeRetroceder}
          aria-label={t.mesAnterior}
          className="w-8 h-8 flex items-center justify-center text-negro/50 hover:text-verde-selva hover:bg-verde-selva/10 transition-colors rounded-full disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] tracking-[2px] uppercase text-negro/40 font-dm">
          {t.oEligeOtraFecha}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!puedeAvanzar}
          aria-label={t.mesSiguiente}
          className="w-8 h-8 flex items-center justify-center text-negro/50 hover:text-verde-selva hover:bg-verde-selva/10 transition-colors rounded-full disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MonthGrid
          year={monthStart.getFullYear()} month={monthStart.getMonth()}
          selected={value} bloqueadas={bloqueadas} motivoBloqueo={motivoBloqueo} onSelect={onSelect} locale={locale}
        />
        <div className="hidden sm:block">
          <MonthGrid
            year={month2Start.getFullYear()} month={month2Start.getMonth()}
            selected={value} bloqueadas={bloqueadas} motivoBloqueo={motivoBloqueo} onSelect={onSelect} locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

// ── TourCalendar ────────────────────────────────────────────────────────────

interface Props {
  value:    string; // YYYY-MM-DD
  onChange: (ymd: string) => void;
  /**
   * `inline` (por defecto) = como siempre: en pantallas ≥sm el calendario se ve
   * abierto, y en móvil es un botón que abre una hoja.
   * `compact` = botón + hoja en TODOS los tamaños. Es lo que necesita el
   * carrito: el calendario abierto mide ~500 px y con cuatro recorridos la
   * lista dejaba de ser una lista.
   */
  modo?: "inline" | "compact";
  /** Días que ya ocupa otro recorrido del carrito. */
  fechasBloqueadas?: readonly string[];
  /** Qué decir de un día bloqueado (sale como tooltip). */
  motivoBloqueo?: (ymd: string) => string;
  /** Texto del botón cuando aún no hay fecha. */
  placeholder?: string;
  /** Encabezado de la hoja. Con varios calendarios hace falta decir de cuál es. */
  titulo?: string;
  /** Ofrece "Quitar fecha" dentro de la hoja. */
  permitirLimpiar?: boolean;
}

export function TourCalendar({
  value, onChange,
  modo = "inline",
  fechasBloqueadas,
  motivoBloqueo,
  placeholder,
  titulo,
  permitirLimpiar = false,
}: Props) {
  const { locale } = useLocale();
  const t = getBooking(locale).calendario;
  const textoPlaceholder = placeholder ?? t.placeholder;
  const textoTitulo      = titulo ?? t.titulo;
  const today = new Date();
  const [monthStart, setMonthStart] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const disparadorRef = useRef<HTMLButtonElement | null>(null);

  const bloqueadas = new Set(fechasBloqueadas ?? []);

  useEffect(() => setMontado(true), []);

  // Los topes evitan que se pueda paginar al pasado o a un año vista.
  const minMes = new Date(primerDiaReservable().getFullYear(), primerDiaReservable().getMonth(), 1);
  const maxMes = new Date(ultimoDiaReservable().getFullYear(), ultimoDiaReservable().getMonth(), 1);
  const puedeRetroceder = monthStart > minMes;
  const puedeAvanzar    = addMonths(monthStart, 1) <= maxMes;

  const prev = useCallback(
    () => setMonthStart((m) => (m > minMes ? addMonths(m, -1) : m)),
    [minMes],
  );
  const next = useCallback(
    () => setMonthStart((m) => (addMonths(m, 1) <= maxMes ? addMonths(m, 1) : m)),
    [maxMes],
  );

  // Al abrir, aterrizar en el mes de la fecha ya elegida. Sin esto, un recorrido
  // fechado en diciembre reabría en el mes actual y había que paginar cuatro
  // veces para ver la fecha que uno mismo puso. No va en el `useState` inicial
  // porque el componente NO se desmonta entre aperturas.
  useEffect(() => {
    if (!abierto) return;
    const base = value ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1) : null;
    const destino = base && base >= minMes && base <= maxMes ? base : minMes;
    setMonthStart(destino);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Un solo bloqueo de scroll para todos los calendarios de la página.
  useEffect(() => {
    if (!abierto) return;
    return bloquearScroll();
  }, [abierto]);

  // Escape cierra y devuelve el foco al botón, como cualquier diálogo.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAbierto(false); disparadorRef.current?.focus(); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  function handleSelect(ymd: string) {
    if (bloqueadas.has(ymd)) return;
    onChange(ymd);
    setAbierto(false);
  }

  const inner = (
    <CalendarInner
      value={value} monthStart={monthStart}
      bloqueadas={bloqueadas} motivoBloqueo={motivoBloqueo}
      puedeRetroceder={puedeRetroceder} puedeAvanzar={puedeAvanzar}
      onPrev={prev} onNext={next} onSelect={handleSelect} locale={locale}
    />
  );

  const disparador = (
    <button
      ref={disparadorRef}
      type="button"
      onClick={() => setAbierto(true)}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border font-dm text-sm transition-colors ${
        value
          ? "border-verde-selva bg-verde-selva/5 text-negro/80"
          : "border-terracota/60 bg-crema text-terracota"
      }`}
    >
      <span className="truncate text-left">{value ? formatDisplay(value, locale) : textoPlaceholder}</span>
      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-40" />
    </button>
  );

  /**
   * La hoja se pinta en un portal a `document.body`.
   * Es `fixed inset-0`, y `position: fixed` deja de referirse a la ventana en
   * cuanto un ancestro tiene `transform`, `filter` o `contain` — y aquí el
   * calendario va dentro de un renglón del carrito, con tarjetas animadas
   * alrededor. Sin el portal, el modal se rompe según dónde se monte.
   */
  const hoja = abierto && montado
    ? createPortal(
        <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-negro/60 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-crema rounded-t-2xl shadow-2xl p-6 pb-8 animate-slide-up max-h-[88vh] overflow-y-auto sm:max-w-xl sm:mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cormorant text-verde-profundo text-lg pr-4">{textoTitulo}</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t.cerrar}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-negro/40 hover:text-negro transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {inner}
            {permitirLimpiar && value && (
              <button
                type="button"
                onClick={() => { onChange(""); setAbierto(false); }}
                className="mt-5 w-full border border-negro/15 py-2.5 font-dm text-[12px] text-negro/55 hover:border-terracota hover:text-terracota transition-colors"
              >
                {t.quitarLaFecha}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  // ── Compacto: botón + hoja en todos los tamaños ──
  if (modo === "compact") {
    return <>{disparador}{hoja}</>;
  }

  // ── Inline: abierto en escritorio, hoja en móvil ──
  return (
    <div>
      <div className="hidden sm:block">{inner}</div>
      <div className="sm:hidden">{disparador}</div>
      {hoja}

      {value && (
        <div className="mt-3 flex items-center gap-2 text-verde-selva text-xs font-dm animate-fade-in">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>
            {/*
              Antes decía "Salida: por acordar". La ficha del tour ya responde
              esto ("salimos entre 8:00 y 9:00 AM"), así que el motor metía una
              incógnita logística justo en el instante de decidir. La hora
              exacta de recogida sí se confirma después, y eso se dice aparte.
            */}
            {t.fechaSeleccionada} <strong>{formatDisplay(value, locale)}</strong>{t.salidaEntre}
          </span>
        </div>
      )}
    </div>
  );
}
