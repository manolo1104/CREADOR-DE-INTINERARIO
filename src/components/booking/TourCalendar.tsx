"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, TriangleAlert, X } from "lucide-react";
import { minBookingDate } from "@/lib/tourBooking";
import { bloquearScroll } from "@/lib/scrollLock";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import type { Locale } from "@/lib/i18n/config";
// Solo el TIPO: `cupoTour.ts` lee la base y no puede viajar al navegador.
import type { EstadoDia } from "@/lib/cupoTour";
import { useApartadoId } from "@/components/carrito/useApartado";

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

/** Hoy en México: la víspera del primer día reservable. */
function hoyMexico(): string {
  const p = primerDiaReservable();
  return formatYMD(new Date(p.getFullYear(), p.getMonth(), p.getDate() - 1));
}

// ── Lugares por día ─────────────────────────────────────────────────────────
// Cada recorrido tiene un tope de personas por fecha (`lib/cupoTour.ts`). El
// calendario le pregunta a `/api/tours/disponibilidad` y pinta cada día. Si la
// consulta falla o el recorrido no lleva cupo (el RZR va por vehículo), no se
// pinta nada y todo se elige como siempre: el cobro vuelve a contar de todos
// modos, así que un calendario viejo nunca vende un lugar que no existe.

/** Los estados que se eligen. Los demás (sin cupo, no cabe el grupo, cerrada) salen grises. */
const SE_ELIGE: ReadonlySet<EstadoDia> = new Set<EstadoDia>(["libre", "con-reservas", "casi-lleno"]);

interface TextosCupo {
  libre:       string;
  conReservas: string;
  casiLleno:   string;
  sinCupo:     string;
  cerrada:     string;
  noCabe:      (personas: number) => string;
  revisando:   string;
  /** La fecha que YA estaba elegida se quedó sin lugar: cambió el grupo o se llenó. */
  yaNoHayLugar: (estado: EstadoDia, personas: number) => string;
}

/**
 * Los textos del cupo viven aquí, junto a los estados que nombran: solo los
 * usa este calendario. Si algún día salen de él, se mudan a `i18n/booking.ts`.
 */
const TEXTOS_CUPO: Record<Locale, TextosCupo> = {
  es: {
    libre:       "Libre",
    conReservas: "Con reservas",
    casiLleno:   "Casi lleno",
    sinCupo:     "Sin cupo",
    cerrada:     "Fecha cerrada",
    noCabe:      (n) => (n === 1 ? "No cabe 1 persona ese día" : `No caben ${n} personas ese día`),
    revisando:   "Revisando los lugares de cada día…",
    yaNoHayLugar: (e, n) =>
      e === "cerrada"
        ? "Ese día no hay salida. Elige otra fecha."
        : `Ese día ya no hay lugar${n > 0 ? ` para ${n} ${n === 1 ? "persona" : "personas"}` : ""}. Elige otra fecha.`,
  },
  en: {
    libre:       "Open",
    conReservas: "Some booked",
    casiLleno:   "Almost full",
    sinCupo:     "Full",
    cerrada:     "Closed",
    noCabe:      (n) => (n === 1 ? "No room for 1 person that day" : `No room for ${n} people that day`),
    revisando:   "Checking each day's availability…",
    yaNoHayLugar: (e, n) =>
      e === "cerrada"
        ? "There's no departure that day. Please choose another date."
        : `That day is full${n > 0 ? ` for ${n} ${n === 1 ? "person" : "people"}` : ""}. Please choose another date.`,
  },
};

/** Lo que se dice de un día: en el lector de pantalla, en el tooltip y al tocar uno gris. */
function etiquetaEstado(e: EstadoDia, personas: number, tc: TextosCupo): string {
  if (e === "no-cabe") return tc.noCabe(personas);
  const fijas: Record<Exclude<EstadoDia, "no-cabe">, string> = {
    libre: tc.libre, "con-reservas": tc.conReservas, "casi-lleno": tc.casiLleno, "sin-cupo": tc.sinCupo, cerrada: tc.cerrada,
  };
  return fijas[e];
}

/**
 * La marca de cada día: forma Y color, no solo color. Uno de cada doce hombres
 * no distingue el verde del rojo, y para él un punto verde y uno rojo serían el
 * mismo punto. Punto lleno = libre; medio punto = ya hay gente; triángulo =
 * quedan pocos. Los tres pasan 3:1 sobre la crema de la hoja: con menos, un
 * punto de 8 px se pierde.
 */
function Marca({ estado, cargando = false }: { estado?: EstadoDia; cargando?: boolean }) {
  if (cargando) {
    return <span aria-hidden="true" className="block w-1.5 h-1.5 my-px rounded-full bg-negro/15 motion-safe:animate-pulse" />;
  }
  if (estado === "libre") {
    return (
      <svg aria-hidden="true" viewBox="0 0 8 8" className="block w-2 h-2">
        <circle cx="4" cy="4" r="3.5" fill="#4a8a21" />
      </svg>
    );
  }
  if (estado === "con-reservas") {
    return (
      <svg aria-hidden="true" viewBox="0 0 8 8" className="block w-2 h-2">
        <path d="M4 .9a3.1 3.1 0 0 0 0 6.2z" fill="#e0ad12" />
        <circle cx="4" cy="4" r="3.1" fill="none" stroke="#9a7300" strokeWidth="1.2" />
      </svg>
    );
  }
  if (estado === "casi-lleno") {
    return (
      <svg aria-hidden="true" viewBox="0 0 8 8" className="block w-2 h-2">
        <path d="M4 .4 7.7 7.4H.3z" fill="#c8372d" />
      </svg>
    );
  }
  // Sin marca (día gris o sin datos), pero con su alto: que las filas no brinquen.
  return <span aria-hidden="true" className="block w-2 h-2" />;
}

function Leyenda({ tc }: { tc: TextosCupo }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-dm text-[11px] text-[rgb(var(--cal-fg)/0.6)]">
      <li className="flex items-center gap-1.5"><Marca estado="libre" />{tc.libre}</li>
      <li className="flex items-center gap-1.5"><Marca estado="con-reservas" />{tc.conReservas}</li>
      <li className="flex items-center gap-1.5"><Marca estado="casi-lleno" />{tc.casiLleno}</li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="leading-none text-[color:var(--cal-tenue)] line-through tabular-nums">12</span>
        {tc.sinCupo}
      </li>
    </ul>
  );
}

/** Lo ya consultado: reabrir la hoja, o el mismo tour en otro renglón del carrito, no vuelve a preguntar. */
const CONSULTADOS = new Map<string, { dias: Record<string, EstadoDia>; en: number }>();
/** Lo mismo que guarda la ruta en caché: más, y un día recién lleno seguiría verde. */
const VIGENCIA_MS = 60_000;

/**
 * Los estados de los días que se pueden reservar (de mañana a seis meses) para
 * un recorrido y un grupo. Se pide todo el rango de una vez —son unos 5 KB— y
 * no mes por mes: así pasar de mes no vuelve a enseñar el esqueleto. `{}` si
 * no aplica o si falló; entonces no se pinta nada.
 */
function useDisponibilidad(slug: string | undefined, personas: number, activo: boolean) {
  // Los lugares que ESTE carrito tiene apartados no le cuentan a él
  // (`useApartado`): sin esto, la fecha recién apartada se le pintaría «no
  // caben» a su propio grupo. Va en la clave: con otro apartado es otra cuenta.
  const apartado = useApartadoId();
  const clave = slug ? `${slug}|${personas}|${apartado}` : "";
  const [dias, setDias] = useState<Record<string, EstadoDia> | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!slug || !activo) return;
    const guardado = CONSULTADOS.get(clave);
    if (guardado && Date.now() - guardado.en < VIGENCIA_MS) {
      setDias(guardado.dias);
      setCargando(false);
      return;
    }
    let vigente = true;
    const ctrl = new AbortController();
    setCargando(true);
    // Un respiro antes de preguntar: subir de 2 a 6 personas con el «+» son
    // cuatro grupos distintos, y solo importa el último.
    const espera = setTimeout(async () => {
      const tope = setTimeout(() => ctrl.abort(), 8000);
      let nuevos: Record<string, EstadoDia> = {};
      try {
        const qs = new URLSearchParams({
          slug,
          personas: String(personas),
          desde: formatYMD(primerDiaReservable()),
          hasta: formatYMD(ultimoDiaReservable()),
        });
        if (apartado) qs.set("apartado", apartado);
        const r = await fetch(`/api/tours/disponibilidad?${qs}`, { signal: ctrl.signal });
        const d = r.ok ? await r.json() : null;
        if (d?.dias && typeof d.dias === "object") {
          nuevos = d.dias;
          CONSULTADOS.set(clave, { dias: nuevos, en: Date.now() });
        }
      } catch {
        // Sin respuesta no se pinta nada: se elige como siempre y el cobro cuenta.
      } finally {
        clearTimeout(tope);
      }
      if (!vigente) return;
      setDias(nuevos);
      setCargando(false);
    }, 200);
    return () => {
      vigente = false;
      clearTimeout(espera);
      ctrl.abort();
    };
  }, [slug, personas, apartado, clave, activo]);

  return { dias, cargando };
}

// ── MonthGrid ─────────────────────────────────────────────────────────────────

/** Lo que necesita un mes para pintar sus días. */
interface DiaProps {
  selected:   string;
  bloqueadas: Set<string>;
  motivoBloqueo?: (ymd: string) => string;
  onSelect:   (ymd: string) => void;
  /** Tocar un día gris: no se elige, pero se dice por qué. En un teléfono no hay tooltip. */
  onGris:     (aviso: string) => void;
  locale:     Locale;
  dias:       Record<string, EstadoDia> | null;
  cargando:   boolean;
  personas:   number;
}

/**
 * Cómo está un día para elegirlo. Mientras se consulta no se usa lo de antes:
 * con otro tamaño de grupo, un día viejo «libre» podía ya no serlo.
 */
function estadoDeDia(ymd: string, p: DiaProps): { estado?: EstadoDia; gris: boolean; motivo?: string; delCarrito: boolean } {
  // Día que ya ocupa otro recorrido del carrito: no es «imposible», es «ya lo
  // tienes tomado», y el motivo dice con qué.
  if (p.bloqueadas.has(ymd)) return { gris: true, motivo: p.motivoBloqueo?.(ymd), delCarrito: true };
  const estado = p.cargando ? undefined : p.dias?.[ymd];
  if (!estado) return { gris: false, delCarrito: false };
  return {
    estado,
    gris: !SE_ELIGE.has(estado),
    motivo: etiquetaEstado(estado, p.personas, TEXTOS_CUPO[p.locale]),
    delCarrito: false,
  };
}

function MonthGrid({ year, month, ...p }: { year: number; month: number } & DiaProps) {
  const grid = buildGrid(year, month);
  const t = getBooking(p.locale).calendario;
  const hoy = hoyMexico();

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7 mb-1">
        {t.dias.map((d) => (
          <span key={d} className="text-center text-[10px] tracking-[1px] uppercase text-[color:var(--cal-tenue)] font-dm py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;

          const ymd = formatYMD(date);

          // Antes de mañana o a más de seis meses: ni se elige ni se cuenta.
          // Hoy lleva su anillo: es la referencia con la que se lee el mes.
          if (fueraDeRango(date)) {
            const esHoy = ymd === hoy;
            return (
              <span
                key={ymd}
                aria-label={esHoy ? `${t.hoy}: ${formatDisplay(ymd, p.locale)}` : undefined}
                className="flex flex-col items-center justify-center gap-[3px] h-11 sm:h-10 select-none"
              >
                <span className={`w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[13px] sm:text-[12px] font-dm tabular-nums ${
                  esHoy ? "ring-1 ring-inset ring-negro/25 text-[rgb(var(--cal-fg)/0.6)] font-medium" : "text-[color:var(--cal-apagado)]"
                }`}>
                  {date.getDate()}
                </span>
                {esHoy ? (
                  <span aria-hidden="true" className="block h-2 font-dm text-[8px] leading-[8px] uppercase tracking-[0.5px] text-[color:var(--cal-tenue)]">
                    {t.hoy}
                  </span>
                ) : (
                  <span aria-hidden="true" className="block h-2" />
                )}
              </span>
            );
          }

          const { estado, gris, motivo, delCarrito } = estadoDeDia(ymd, p);
          const isSelected = ymd === p.selected;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => (gris ? p.onGris(`${formatDisplay(ymd, p.locale)}: ${motivo ?? ""}`) : p.onSelect(ymd))}
              aria-pressed={isSelected}
              aria-disabled={gris || undefined}
              aria-label={`${formatDisplay(ymd, p.locale)}${motivo ? `. ${motivo}` : ""}`}
              title={gris ? motivo : undefined}
              className={`group flex flex-col items-center justify-center gap-[3px] h-11 sm:h-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-verde-selva/40 transition-transform duration-150 ease-out ${
                gris ? "cursor-not-allowed" : "active:scale-[0.94]"
              }`}
            >
              <span className={`w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[13px] sm:text-[12px] font-dm tabular-nums transition-colors duration-150 ${
                isSelected
                  ? "bg-verde-selva text-crema font-semibold animate-date-pop"
                  : gris
                    ? delCarrito
                      ? "text-[color:var(--cal-apagado)] line-through decoration-terracota/60"
                      : "text-[color:var(--cal-apagado)] line-through decoration-negro/35"
                    : "text-[rgb(var(--cal-fg)/0.85)] [@media(hover:hover)]:group-hover:bg-verde-selva/10 [@media(hover:hover)]:group-hover:text-verde-selva"
              }`}>
                {date.getDate()}
              </span>
              <Marca estado={gris ? undefined : estado} cargando={p.cargando && !delCarrito} />
            </button>
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
  dias, cargando, personas, conProximosDias = true,
}: {
  conProximosDias?: boolean;
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
  dias: Record<string, EstadoDia> | null;
  cargando: boolean;
  personas: number;
}) {
  const month2Start = addMonths(monthStart, 1);
  const t = getBooking(locale).calendario;
  const tc = TEXTOS_CUPO[locale];
  // Por qué no se pudo elegir el último día gris que se tocó.
  const [aviso, setAviso] = useState("");
  const conCupo = !cargando && !!dias && Object.keys(dias).length > 0;

  const diaProps: DiaProps = {
    selected: value, bloqueadas, motivoBloqueo, locale, dias, cargando, personas,
    onSelect: (ymd) => { setAviso(""); onSelect(ymd); },
    onGris: setAviso,
  };

  // Las flechas: 44 px en el teléfono, que es donde se pagina con el pulgar.
  const botonMes =
    "w-11 h-11 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center rounded-full border border-[rgb(var(--cal-fg)/0.1)] text-[rgb(var(--cal-fg)/0.6)] " +
    "transition-[transform,background-color,color,border-color] duration-150 ease-out active:scale-[0.94] " +
    "[@media(hover:hover)]:hover:bg-verde-selva/10 [@media(hover:hover)]:hover:text-verde-selva [@media(hover:hover)]:hover:border-verde-selva/30 " +
    "disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100";

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
      {conProximosDias && (
      <div>
        <p className="text-[10px] tracking-[2px] uppercase text-[color:var(--cal-tenue)] font-dm mb-2">
          {t.proximosDias}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {proximosDias.map((d) => {
            const activo = d.ymd === value;
            const { estado, gris, motivo, delCarrito } = estadoDeDia(d.ymd, diaProps);
            return (
              <button
                key={d.ymd}
                type="button"
                onClick={() => (gris ? setAviso(`${formatDisplay(d.ymd, locale)}: ${motivo ?? ""}`) : diaProps.onSelect(d.ymd))}
                aria-pressed={activo}
                aria-disabled={gris || undefined}
                aria-label={`${formatDisplay(d.ymd, locale)}${motivo ? `. ${motivo}` : ""}`}
                title={gris ? motivo : undefined}
                className={`flex-shrink-0 w-12 flex flex-col items-center pt-1.5 pb-1 border text-center transition-[transform,border-color,background-color] duration-150 ease-out ${
                  activo
                    ? "border-verde-selva bg-verde-selva text-crema"
                    : gris
                      ? "border-[rgb(var(--cal-fg)/0.1)] text-[color:var(--cal-apagado)] cursor-not-allowed"
                      : "border-[rgb(var(--cal-fg)/0.15)] text-[rgb(var(--cal-fg))] active:scale-[0.96] [@media(hover:hover)]:hover:border-verde-selva/50"
                }`}
              >
                <span className={`block text-[9px] font-dm uppercase tracking-[1px] ${activo ? "text-crema/70" : "text-[color:var(--cal-tenue)]"}`}>
                  {d.dia}
                </span>
                <span className={`block text-sm font-dm leading-tight tabular-nums ${gris && !activo ? "line-through" : ""}`}>{d.num}</span>
                <span className={`block text-[9px] font-dm ${activo ? "text-crema/70" : "text-[color:var(--cal-tenue)]"}`}>
                  {d.mes}
                </span>
                {/* Sobre el verde de la elegida la marca no se leería: ahí el
                    estado ya lo dice la fecha misma. */}
                <span className="mt-1">
                  {activo
                    ? <span aria-hidden="true" className="block w-2 h-2" />
                    : <Marca estado={gris ? undefined : estado} cargando={cargando && !delCarrito} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Sin la tira de atajo, este bloque es el calendario entero: ni el borde
          de arriba ni el «o elige otra fecha» tienen de qué separarlo. */}
      <div className={conProximosDias ? "border-t border-[rgb(var(--cal-fg)/0.1)] pt-3" : ""}>
        {conProximosDias && (
          <p className="text-[10px] tracking-[2px] uppercase text-[color:var(--cal-tenue)] font-dm mb-2">
            {t.oEligeOtraFecha}
          </p>
        )}
        {/* Las flechas van con el nombre del mes, como en cualquier calendario:
            antes vivían sueltas en una fila aparte, lejos de lo que mueven. En
            escritorio se ven dos meses y avanzar va en el segundo. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <button
                type="button"
                onClick={() => { setAviso(""); onPrev(); }}
                disabled={!puedeRetroceder}
                aria-label={t.mesAnterior}
                className={botonMes}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <p aria-live="polite" className="font-cormorant text-[rgb(var(--cal-titulo))] text-lg leading-none">
                {nombreMes(monthStart.getMonth(), locale)} {monthStart.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => { setAviso(""); onNext(); }}
                disabled={!puedeAvanzar}
                aria-label={t.mesSiguiente}
                className={`${botonMes} sm:invisible`}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <MonthGrid year={monthStart.getFullYear()} month={monthStart.getMonth()} {...diaProps} />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span aria-hidden="true" className="w-9 h-9 flex-shrink-0" />
              <p className="font-cormorant text-[rgb(var(--cal-titulo))] text-lg leading-none">
                {nombreMes(month2Start.getMonth(), locale)} {month2Start.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => { setAviso(""); onNext(); }}
                disabled={!puedeAvanzar}
                aria-label={t.mesSiguiente}
                className={botonMes}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <MonthGrid year={month2Start.getFullYear()} month={month2Start.getMonth()} {...diaProps} />
          </div>
        </div>

        {/* Vacío no ocupa lugar, pero tiene que existir antes de hablar: un
            lector de pantalla solo anuncia regiones que ya estaban ahí. */}
        <p role="status" aria-live="polite" className="mt-3 empty:mt-0 font-dm text-[11px] leading-snug text-[rgb(var(--cal-aviso))]">
          {aviso}
        </p>
        {cargando ? (
          <p className="mt-3 font-dm text-[11px] text-[color:var(--cal-tenue)]">{tc.revisando}</p>
        ) : conCupo ? (
          <div className="mt-3">
            <Leyenda tc={tc} />
          </div>
        ) : null}
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
  /**
   * Color del BOTÓN que abre la hoja. El carrito vive sobre fondo claro y la
   * ficha de tour sobre fondo oscuro; con un solo tema, el botón salía
   * invisible en una de las dos. La hoja siempre es clara: es un modal.
   */
  tema?: "claro" | "oscuro";
  /**
   * La hora de salida de ESTE recorrido, en corto: lo que da `salidaCorta()`
   * ("7:00 PM", "3:00–4:00 AM"). Se pinta junto a la fecha elegida, también en
   * modo compacto.
   *
   * 🔴 Sin ella no se dice ninguna hora. El calendario escribía "Salida entre
   * 8:00 y 9:00 AM" para todos, y la Gruta de Xilo sale a las 7 de la NOCHE:
   * justo al confirmar la fecha, mandaba al cliente a esperar de mañana.
   */
  salida?: string | null;
  /**
   * En lugar de `salida`, cuando el horario lo pone el lugar y no es la hora a
   * la que pasamos por ti (`recogida.horaTexto`, el Edén). Se pinta "Horario:";
   * con "Salida:" el calendario contradecía al resumen, que dice "pasamos por
   * ti a tiempo para su horario fijo".
   */
  horario?: string | null;
  /**
   * El recorrido, para pintar los lugares de cada día (`lib/cupoTour.ts`).
   * Sin él —el RZR, que se cobra por vehículo— no se consulta nada y todos los
   * días se eligen, como siempre.
   */
  slug?: string;
  /**
   * Cuántos van. Un día donde ya no cabe ESTE grupo sale gris aunque le queden
   * lugares: «No caben 4 personas ese día» se dice al elegir, no al pagar.
   */
  personas?: number;
  /**
   * El color de la HOJA (el modal), no el del botón —ése es `tema`—.
   *
   * 🔴 Añadida el 8 oct 2026 para el buscador del inicio: ahí el hero es negro
   * y una hoja color crema era un fogonazo blanco en mitad de la pantalla.
   * Por omisión «clara», que es lo de siempre: el carrito y la ficha no
   * cambian. En oscuro se redefinen `--cal-fg`, `--cal-titulo` y `--cal-aviso`
   * (ver globals.css) y con eso cambia TODO el cuerpo, porque son heredadas.
   */
  hojaTema?: "clara" | "oscura";
  /**
   * Dónde se abre la hoja en el teléfono: pegada abajo (lo de siempre) o
   * centrada. En pantallas ≥sm siempre ha ido centrada.
   */
  hojaPosicion?: "abajo" | "centro";
  /**
   * El botón SIN caja: sin borde, sin fondo y sin relleno propio.
   *
   * 🔴 Añadida el 8 oct 2026 para el buscador del inicio, que pasó a ser una
   * sola lámina de vidrio. Ahí el borde y el fondo del botón dibujaban un
   * rectángulo dentro del rectángulo de la fila y rompían el efecto. En el
   * carrito y en la ficha el botón sigue con su caja, que es lo que lo hace
   * visible sobre su fondo.
   */
  disparadorSinCaja?: boolean;
  /**
   * La tira de atajo de los próximos 14 días. Por omisión sí.
   * En el inicio se quita: ahí el calendario es para declarar una intención, no
   * para cerrar la reserva, y con la tira la hoja no cabía centrada sin recorte.
   */
  proximosDias?: boolean;
  /**
   * La hoja en vidrio esmerilado, con la receta del sitio: UNA superficie
   * translúcida con `backdrop-blur`, no una caja opaca.
   *
   * 🔴 Añadida el 8 oct 2026 para la ficha del tour, que es oscura y donde la
   * hoja color crema entraba como un ladrillo. Por omisión NO: el carrito, el
   * RZR y el buscador del inicio siguen exactamente igual.
   *
   * Lleva sus dos respaldos obligatorios, que no son adorno: sin
   * `backdrop-filter` (Firefox con la bandera apagada) y con
   * `prefers-reduced-transparency`, el fondo vuelve a ser opaco. Sin ellos el
   * calendario no queda «menos bonito»: queda ilegible sobre la foto del hero.
   */
  hojaVidrio?: boolean;
}

export function TourCalendar({
  value, onChange,
  modo = "inline",
  fechasBloqueadas,
  motivoBloqueo,
  placeholder,
  titulo,
  permitirLimpiar = false,
  tema = "claro",
  salida,
  horario,
  slug,
  personas = 0,
  hojaTema = "clara",
  hojaPosicion = "abajo",
  proximosDias = true,
  disparadorSinCaja = false,
  hojaVidrio = false,
}: Props) {
  const { locale } = useLocale();
  const t = getBooking(locale).calendario;
  const tc = TEXTOS_CUPO[locale];
  const lineaHora = salida ? t.salida(salida) : horario ? t.horario(horario) : null;
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

  // Se pregunta cuando hace falta: al abrir la hoja, o si ya hay fecha (para
  // avisar si dejó de caber). Así la ficha de un tour no consulta la base en
  // cada visita, solo cuando alguien va a elegir.
  const { dias, cargando } = useDisponibilidad(slug, personas, !!slug && (abierto || modo === "inline" || !!value));
  const estadoElegido = value && !cargando ? dias?.[value] : undefined;
  const elegidaSinLugar = !!estadoElegido && !SE_ELIGE.has(estadoElegido);

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
    const estado = cargando ? undefined : dias?.[ymd];
    if (estado && !SE_ELIGE.has(estado)) return;
    onChange(ymd);
    setAbierto(false);
  }

  const inner = (
    <CalendarInner
      conProximosDias={proximosDias}
      value={value} monthStart={monthStart}
      bloqueadas={bloqueadas} motivoBloqueo={motivoBloqueo}
      puedeRetroceder={puedeRetroceder} puedeAvanzar={puedeAvanzar}
      onPrev={prev} onNext={next} onSelect={handleSelect} locale={locale}
      dias={dias} cargando={cargando} personas={personas}
    />
  );

  // La fecha ya elegida se quedó sin lugar: subieron de 2 a 6 personas, o
  // alguien más pagó ese día mientras el carrito esperaba. Se dice aquí, junto
  // a la fecha, y no hasta que el cobro la rechace.
  const avisoElegida = elegidaSinLugar ? (
    <p role="alert" className={`mt-1.5 flex items-start gap-1.5 font-dm text-[11px] leading-snug ${
      tema === "oscuro" ? "text-dorado" : "text-terracota"
    }`}>
      <TriangleAlert className="w-3 h-3 flex-shrink-0 mt-px" aria-hidden="true" />
      <span>{tc.yaNoHayLugar(estadoElegido!, personas)}</span>
    </p>
  ) : null;

  /**
   * El vidrio es de crema: solo tiene sentido con la hoja clara. Si algún día
   * alguien pide las dos, manda la oscura (que ya es su propio material) en vez
   * de pintar crema translúcido sobre negro, que no se lee.
   */
  const vidrio = hojaVidrio && hojaTema !== "oscura";

  const disparador = (
    <button
      ref={disparadorRef}
      type="button"
      onClick={() => setAbierto(true)}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      className={
        disparadorSinCaja
          // Sin caja: hereda el tamaño y el color del hueco donde va, para que
          // se lea igual que los campos de al lado.
          ? `w-full min-h-[34px] flex items-center justify-between gap-2 bg-transparent font-dm text-base transition-colors ${
              value ? "text-crema" : "text-crema/70 hover:text-crema"
            }`
          : `w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2.5 border font-dm text-sm transition-colors ${
              // Con la hoja de vidrio, el botón es del mismo material: blanco
              // translúcido sobre la ficha oscura, como los campos del buscador
              // del inicio. Sin desenfoque propio a propósito — detrás solo hay
              // un color plano y el blur no se vería, pero sí costaría pintarlo.
              vidrio && tema === "oscuro"
                ? value
                  ? "border-verde-vivo/50 bg-verde-vivo/15 text-crema"
                  : "border-white/25 bg-white/[0.07] text-crema/70 hover:border-white/40 hover:bg-white/[0.12]"
                : tema === "oscuro"
                ? value
                  ? "border-verde-vivo/60 bg-verde-vivo/10 text-crema"
                  : "border-crema/20 bg-negro/40 text-crema/70 hover:border-crema/40"
                : value
                  ? "border-verde-selva bg-verde-selva/5 text-negro/80"
                  : "border-terracota/60 bg-crema text-terracota"
            }`
      }
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
  const oscura = hojaTema === "oscura";
  /**
   * El color del cuerpo del calendario. Son las mismas variables que define
   * `globals.css`; redefinirlas aquí recolorea la rejilla, los días, la leyenda
   * y el aviso de una vez, porque se heredan.
   *
   * 🔴 En oscuro el gris de «sin cupo» y el terracota del aviso NO sirven: a
   * 0.25 de opacidad sobre negro no se lee nada. Por eso el primer plano sube a
   * crema (que da más de 14:1 sobre #0e1710) y el aviso pasa a un terracota
   * aclarado; el rojo original da 2.5:1 sobre negro y se perdía.
   */
  const colores = oscura
    ? ({
        "--cal-fg": "244 237 216",
        "--cal-titulo": "244 237 216",
        "--cal-aviso": "224 138 90",
        // Crema al 40 % sobre #0e1710 da 4.3:1 y al 60 %, 7:1. Con los 0.25 y
        // 0.45 del tema claro se quedaban en 2.6:1 y no se leía «sin cupo».
        "--cal-apagado": "rgb(244 237 216 / 0.4)",
        "--cal-tenue": "rgb(244 237 216 / 0.6)",
      } as React.CSSProperties)
    : undefined;

  // Centrada en todos los tamaños, o pegada abajo en el teléfono (lo de siempre).
  const sitio = hojaPosicion === "centro"
    /* `animate-centrado` y NO `animate-fade-in`: el keyframe de aquél escribe
       `translateY(4px)` y, mientras dura, pisa el centrado de Tailwind — la
       hoja salía disparada desde abajo a la derecha. Ver globals.css. */
    ? "left-1/2 top-1/2 w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl animate-centrado"
    : "bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up sm:max-w-xl sm:mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl";

  const hoja = abierto && montado
    ? createPortal(
        <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
          <div
            className={`absolute inset-0 bg-negro/70 ${vidrio ? "cal-velo-vidrio" : "backdrop-blur-sm"}`}
            onClick={() => setAbierto(false)}
          />
          <div
            style={colores}
            className={`absolute p-6 pb-8 max-h-[88vh] overflow-y-auto ${sitio} ${
              vidrio
                ? "cal-hoja-vidrio"
                : `shadow-2xl ${oscura ? "bg-negro border border-crema/15" : "bg-crema"}`
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-cormorant text-[rgb(var(--cal-titulo))] text-lg pr-4">{textoTitulo}</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t.cerrar}
                className="w-11 h-11 -mr-2 flex-shrink-0 flex items-center justify-center rounded-full text-[rgb(var(--cal-fg)/0.5)] hover:text-[rgb(var(--cal-fg))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {inner}
            {permitirLimpiar && value && (
              <button
                type="button"
                onClick={() => { onChange(""); setAbierto(false); }}
                className="mt-5 w-full min-h-[44px] border border-[rgb(var(--cal-fg)/0.2)] py-2.5 font-dm text-[12px] text-[rgb(var(--cal-fg)/0.6)] hover:border-[rgb(var(--cal-aviso))] hover:text-[rgb(var(--cal-aviso))] transition-colors"
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
  // La hora va debajo del botón y solo con fecha: el botón ya dice el día, y en
  // un carrito que junta la Gruta (de noche) con un recorrido de mañana es lo
  // que distingue un renglón del otro.
  if (modo === "compact") {
    return (
      <>
        {disparador}
        {avisoElegida}
        {value && lineaHora && (
          <p className={`mt-1.5 flex items-start gap-1.5 font-dm text-[11px] leading-snug ${
            tema === "oscuro" ? "text-crema/55" : "text-negro/50"
          }`}>
            <Clock className="w-3 h-3 flex-shrink-0 mt-px" aria-hidden="true" />
            <span>{lineaHora}</span>
          </p>
        )}
        {hoja}
      </>
    );
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
              esto, así que el motor metía una incógnita logística justo en el
              instante de decidir. La hora es la del recorrido (`salida`); la
              exacta de recogida se confirma después, y eso se dice aparte.
            */}
            {t.fechaSeleccionada} <strong>{formatDisplay(value, locale)}</strong>
            {lineaHora ? ` · ${lineaHora}` : ""}
          </span>
        </div>
      )}
      {avisoElegida}
    </div>
  );
}
