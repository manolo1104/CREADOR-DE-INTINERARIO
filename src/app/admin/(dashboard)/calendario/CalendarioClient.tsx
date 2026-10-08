"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
// Solo los TIPOS: `cupoTour.ts` lee la base; las cuentas llegan hechas de `page.tsx`.
import type { CupoDeTourEnDia, EstadoDia, ResumenCupoPanel } from "@/lib/cupoTour";
import type { TourBooking } from "@prisma/client";
import { ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { hoyMX } from "@/lib/dates";
import { hospedajeDeReserva } from "@/lib/admin/hospedaje";
import { colorDeTour, codigoDeTour, nombreDeTour } from "@/lib/admin/coloresTour";

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

interface Salida {
  key: string;
  date: string;
  tourSlug: string;
  tourName: string;
  customerName: string;
  personas: number;
  monto: number;
  confirmationNumber: string;
  /** Quién sale ese día, y en qué idioma. Se planea con esto a la vista. */
  guia: string;
  idiomaTour: string;
  /** Para llamarle la víspera y para pasar por él. Lo que el chofer necesita. */
  telefono: string;
  hospedaje: string | null;
}

/** Un apartado de 15 minutos del carrito del sitio en un recorrido y un día (lo arma `page.tsx`). */
export interface ApartadoDelDia {
  slug:     string;
  personas: number;
  /** Cuándo se suelta solo, en ms. */
  vence:    number;
}

export default function CalendarioClient({ bookings, cupo, apartados = {} }: {
  bookings: TourBooking[];
  cupo: ResumenCupoPanel;
  apartados?: Record<string, ApartadoDelDia[]>;
}) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // El día abierto en el panel lateral. Antes se guardaban sus salidas y solo
  // se abría si tenía reservas; ahora se abre cualquiera, para poder cerrarlo.
  const [selFecha, setSelFecha] = useState<string | null>(null);
  // El cupo de cada día: cambia en su lugar al cerrar o abrir una fecha.
  const [cupoDias, setCupoDias] = useState(cupo.dias);
  const [guardandoCupo, setGuardandoCupo] = useState<string | null>(null);
  const [msjCupo, setMsjCupo] = useState<string | null>(null);

  function prevMonth() { if (month===0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function nextMonth() { if (month===11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month+1, 0).getDate();
  const todayStr  = hoyMX();

  // Cada reserva puede incluir varios tours (lineItems), cada uno con su propia fecha.
  // Expandimos en "salidas": una por tour para que aparezcan en TODOS sus días, no solo
  // en la fecha del tour principal.
  const salidas = bookings.flatMap(b => {
    const lines = Array.isArray((b as any).lineItems)
      ? (b as any).lineItems.filter((l: any) => l && !l._meta && l.tourDate)
      : [];
    if (lines.length > 0) {
      return lines.map((l: any, i: number) => ({
        key:          `${b.id}-${i}`,
        date:         l.tourDate as string,
        // Un renglón sin tour en un carrito de varios renglones es un concepto
        // (el traslado desde San Luis, algo cobrado a mano): no hereda el tour
        // de la reserva. Antes el traslado salía pintado como la Ruta
        // Surrealista ese día, con su color y su código; ahora va en gris con
        // su propio nombre. Si la reserva tiene un solo renglón, sí lo hereda:
        // son reservas viejas que no guardaban el slug en el renglón.
        tourSlug:     l.tourSlug || (lines.length === 1 ? b.tourSlug : ""),
        tourName:     l.tourName || b.tourName,
        customerName: b.customerName,
        // 🔴 El carrito guarda `children` (los dos tramos juntos) ADEMÁS de
        // `childrenMid` y `childrenSmall`: sumar los tres contaba dos veces a
        // cada niño. La misma cuenta que el cupo (`lib/cupoTour.ts`).
        personas:     (Number(l.adults) || 0) + Math.max(Number(l.children) || 0, (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0)),
        monto:        l.subtotal != null ? Number(l.subtotal) : b.totalAmount,
        confirmationNumber: b.confirmationNumber,
        guia:         ((b as any).guia || "") as string,
        idiomaTour:   ((b as any).idiomaTour || "es") as string,
        telefono:     b.customerPhone || "",
        hospedaje:    hospedajeDeReserva(b),
      }));
    }
    return [{
      key:          b.id,
      date:         b.tourDate,
      tourSlug:     b.tourSlug,
      tourName:     b.tourName,
      customerName: b.customerName,
      personas:     b.adults + b.children,
      monto:        b.totalAmount,
      confirmationNumber: b.confirmationNumber,
      guia:         ((b as any).guia || "") as string,
      idiomaTour:   ((b as any).idiomaTour || "es") as string,
      telefono:     b.customerPhone || "",
      hospedaje:    hospedajeDeReserva(b),
    }];
  });

  // Index salidas por fecha
  const byDay: Record<string, typeof salidas> = {};
  salidas.forEach(s => {
    if (!byDay[s.date]) byDay[s.date] = [];
    byDay[s.date].push(s);
  });
  const sel = selFecha ? byDay[selFecha] || [] : [];

  // Todos los recorridos con cupo, con cómo están el día abierto: primero los
  // que tienen gente o están cerrados, luego los demás en el orden del catálogo.
  const toursDelDia = selFecha
    ? cupo.tours
        .map((t) => ({
          t,
          c: cupoDias[selFecha]?.find((x) => x.slug === t.slug)
            ?? { slug: t.slug, personas: 0, cupo: t.cupo, estado: "libre" as EstadoDia, cerrada: false },
        }))
        .sort((a, b) => Number(b.c.personas > 0 || b.c.cerrada) - Number(a.c.personas > 0 || a.c.cerrada))
    : [];
  const esFutura = !!selFecha && selFecha >= todayStr;

  // Los apartados vivos del día abierto, juntos por recorrido. Se cuentan al
  // abrir el día (no al cargar la página): uno que ya venció no se enseña.
  const apartadosDelDia = (() => {
    if (!selFecha) return [];
    const ahora = Date.now();
    const porTour = new Map<string, { slug: string; n: number; personas: number; min: number; max: number }>();
    for (const a of apartados[selFecha] ?? []) {
      const faltan = Math.ceil((a.vence - ahora) / 60_000);
      if (faltan <= 0) continue;
      const r = porTour.get(a.slug);
      porTour.set(a.slug, {
        slug: a.slug,
        n: (r?.n ?? 0) + 1,
        personas: (r?.personas ?? 0) + a.personas,
        min: Math.min(r?.min ?? faltan, faltan),
        max: Math.max(r?.max ?? faltan, faltan),
      });
    }
    return Array.from(porTour.values());
  })();

  /**
   * Cierra o abre una fecha de un recorrido (río crecido, sin guía): cerrada,
   * el sitio la pinta gris y no deja pagarla, y el bot no la cotiza.
   */
  async function cambiarCierre(slug: string, fecha: string, cerrar: boolean, personas: number) {
    // Cerrar no cancela a nadie, solo frena las ventas nuevas. Si ya hay gente,
    // que quien cierra sepa que a ellos hay que avisarles aparte.
    if (cerrar && personas > 0 && !window.confirm(
      `Ese día ya van ${personas} persona${personas !== 1 ? "s" : ""}. Cerrar solo frena las ventas nuevas: a ellas hay que avisarles aparte. ¿Cerrar la fecha?`,
    )) return;
    setGuardandoCupo(slug);
    setMsjCupo(null);
    try {
      const r = await fetch("/api/admin/fechas-cerradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, fecha, cerrada: cerrar }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.dia) {
        setMsjCupo(d?.error || "No se pudo guardar");
        return;
      }
      const nuevo = d.dia as CupoDeTourEnDia;
      setCupoDias((prev) => {
        const otros = (prev[fecha] ?? []).filter((c) => c.slug !== slug);
        return { ...prev, [fecha]: nuevo.personas > 0 || nuevo.cerrada ? [...otros, nuevo] : otros };
      });
      setMsjCupo(cerrar ? "Cerrada: el sitio y el bot ya no la venden." : "Abierta otra vez.");
    } catch {
      setMsjCupo("No se pudo guardar");
    } finally {
      setGuardandoCupo(null);
    }
  }

  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const thisMonthSalidas = salidas.filter(s => {
    const d = new Date(s.date+"T12:00:00");
    return d.getFullYear()===year && d.getMonth()===month;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Calendario de Reservas</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">{thisMonthSalidas.length} salida{thisMonthSalidas.length !== 1 ? "s" : ""} en {MESES[month]} {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 border border-[#1B4332]/15 hover:bg-[#FAFAF8] transition-colors rounded-sm">
            <ChevronLeft className="w-4 h-4 text-[#1B4332]" />
          </button>
          <span className="font-cormorant text-[#1B4332] text-lg min-w-[140px] text-center">{MESES[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 border border-[#1B4332]/15 hover:bg-[#FAFAF8] transition-colors rounded-sm">
            <ChevronRight className="w-4 h-4 text-[#1B4332]" />
          </button>
        </div>
      </div>

      <div className="panel-card overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-[#1B4332]/10">
          {DIAS.map(d => (
            <div key={d} className="py-3 text-center text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm bg-[#FAFAF8]">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[90px] border-b border-r border-[#1B4332]/6 bg-[#FAFAF8]/30" />;
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dayBookings = byDay[dateStr] || [];
            const isToday = dateStr === todayStr;
            return (
              <div key={i}
                onClick={() => { setSelFecha(dateStr); setMsjCupo(null); }}
                className="min-h-[90px] border-b border-r border-[#1B4332]/6 p-2 transition-colors cursor-pointer hover:bg-[#FAFAF8]/70"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-dm ${isToday?"bg-[#1B4332] text-white":"text-[#1B4332]/70"}`}>
                    {day}
                  </div>
                  <CupoDelDia dia={cupoDias[dateStr]} />
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0,3).map(s => (
                    <div key={s.key}
                      style={{ background: colorDeTour(s.tourSlug)+"1f", borderLeft:`3px solid ${colorDeTour(s.tourSlug)}` }}
                      className="text-[9px] font-dm px-1 py-0.5 truncate rounded-sm text-[#1B4332]/80"
                    >
                      {/* El código va primero y en el color del recorrido: es la señal
                          que se lee aunque dos colores se parezcan, y la única que
                          funciona impresa en blanco y negro. El resto del renglón va en
                          tinta, no en el color del tour: un texto de 9 px en magenta
                          sobre su propio tinte no se lee. */}
                      <span className="font-bold" style={{ color: colorDeTour(s.tourSlug) }}>{codigoDeTour(s.tourSlug)}</span>
                      {" "}{s.customerName.split(" ")[0]} · {s.personas}p
                      {s.guia && <> · {s.guia.split(" ")[0]}</>}
                      {s.idiomaTour === "en" && " · EN"}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[9px] font-dm text-[#1B4332]/40">+{dayBookings.length-3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda tours — solo los que aparecen en reservas */}
      <div className="mt-4 flex flex-wrap gap-3">
        {/* Sin los conceptos (traslado y demás): ya llevan su nombre en el día. */}
        {Array.from(new Set(salidas.map(s => s.tourSlug).filter(Boolean))).map(slug => (
          <div key={slug} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{background:colorDeTour(slug)}} />
            <span className="text-[10px] font-dm font-bold" style={{color:colorDeTour(slug)}}>{codigoDeTour(slug)}</span>
            <span className="text-[10px] font-dm text-[#1B4332]/50">{nombreDeTour(slug)}</span>
          </div>
        ))}
      </div>

      {/* Lo que dice la cifra de cada día, con el mismo código de colores que
          el calendario del sitio. Abre un día para ver todos sus recorridos. */}
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-dm text-[#1B4332]/50">
        <span>Junto al día, el recorrido más lleno (personas / cupo):</span>
        <span className={`px-1 rounded-sm font-bold ${CLASE_CUPO["con-reservas"]}`}>con reservas</span>
        <span className={`px-1 rounded-sm font-bold ${CLASE_CUPO["casi-lleno"]}`}>quedan 3 o menos</span>
        <span className={`px-1 rounded-sm font-bold ${CLASE_CUPO["sin-cupo"]}`}>lleno</span>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" aria-hidden="true" />fecha cerrada</span>
      </p>

      {/* Sidebar de día seleccionado */}
      {selFecha && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelFecha(null)} />
          <aside className="relative w-full max-w-xs bg-white border-l border-[#1B4332]/10 p-5 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-cormorant text-[#1B4332] text-lg font-light">
                {new Date(selFecha+"T12:00:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
              </p>
              <button onClick={() => setSelFecha(null)} aria-label="Cerrar" className="text-[#1B4332]/40 hover:text-[#1B4332]">✕</button>
            </div>
            {sel.length === 0 && (
              <p className="font-dm text-[11px] text-[#1B4332]/50 mb-3">Sin salidas este día.</p>
            )}
            <div className="space-y-3">
              {sel.map(s => (
                <div key={s.key} className="border border-[#1B4332]/10 p-3 rounded-sm"
                  style={{borderLeft:`3px solid ${colorDeTour(s.tourSlug)}`}}>
                  <p className="font-dm text-sm font-medium text-[#1B4332]">{s.customerName}</p>
                  <p className="font-dm text-xs text-[#1B4332]/50 mb-1">
                    <span className="font-bold" style={{color:colorDeTour(s.tourSlug)}}>{codigoDeTour(s.tourSlug)}</span>{" "}{s.tourName}
                  </p>
                  <div className="flex gap-3 text-[10px] font-dm text-[#1B4332]/50">
                    <span>{s.personas} persona{s.personas !== 1 ? "s" : ""}</span>
                    <span className="text-[#52B788]">${s.monto.toLocaleString("es-MX")}</span>
                  </div>
                  <p className="text-[10px] font-dm mt-1">
                    {s.guia
                      ? <span className="text-[#1B4332]/70">Guía: {s.guia}</span>
                      : <span className="text-orange-600/80">Sin guía asignado</span>}
                    {s.idiomaTour === "en" && <span className="ml-1 text-[#1a4e8a]">· en inglés</span>}
                  </p>

                  {/* Lo que hace falta para operar el día: a qué número llamarle la
                      víspera y dónde pasar por él. Estaba en la ficha de la reserva,
                      a dos clics y en otra pantalla, justo cuando se arma la ruta. */}
                  <div className="mt-2 pt-2 border-t border-[#1B4332]/8 space-y-1">
                    <p className="flex items-start gap-1.5 text-[10px] font-dm">
                      <Phone className="w-3 h-3 mt-[1px] shrink-0 text-[#1B4332]/35" aria-hidden="true" />
                      {s.telefono
                        ? <a href={`https://wa.me/${s.telefono.replace(/\D/g, "")}`}
                             target="_blank" rel="noopener noreferrer"
                             onClick={(e) => e.stopPropagation()}
                             className="text-[#25D366] hover:underline">{s.telefono}</a>
                        : <span className="text-orange-600/80">Sin teléfono</span>}
                    </p>
                    <p className="flex items-start gap-1.5 text-[10px] font-dm">
                      <MapPin className="w-3 h-3 mt-[1px] shrink-0 text-[#1B4332]/35" aria-hidden="true" />
                      {s.hospedaje
                        ? <span className="text-[#1B4332]/70 leading-snug">{s.hospedaje}</span>
                        : <span className="text-orange-600/80">Sin hospedaje anotado</span>}
                    </p>
                  </div>

                  <p className="font-mono text-[9px] text-[#1B4332] mt-1">{s.confirmationNumber}</p>
                </div>
              ))}
            </div>

            {/* Los lugares de cada recorrido ese día, con la misma cuenta con que
                el sitio pinta su calendario (`lib/cupoTour.ts`). Aquí sí van
                números: el equipo necesita saber cuántos van, no solo el color. */}
            <div className="mt-5 pt-4 border-t border-[#1B4332]/10">
              <p className="panel-eyebrow mb-1">Lugares de este día</p>
              <p className="font-dm text-[10px] text-[#1B4332]/50 mb-3 leading-snug">
                En línea se vende hasta el cupo de cada recorrido. Cerrar una fecha la saca del sitio y del bot;
                lo que ya está reservado se queda.
              </p>
              <ul className="space-y-1.5">
                {toursDelDia.map(({ t, c }) => (
                  <li key={t.slug} className="flex items-center justify-between gap-2 font-dm text-[11px]">
                    <span className="min-w-0 truncate text-[#1B4332]/80">
                      <span className="font-bold" style={{ color: colorDeTour(t.slug) }}>{codigoDeTour(t.slug)}</span>{" "}{t.nombre}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold tabular-nums ${CLASE_CUPO[c.cerrada ? "cerrada" : c.estado]}`}>
                        {c.cerrada ? "Cerrada" : `${c.personas}/${t.cupo}`}
                      </span>
                      {esFutura && (
                        <button
                          type="button"
                          disabled={guardandoCupo !== null}
                          onClick={() => cambiarCierre(t.slug, selFecha, !c.cerrada, c.personas)}
                          className="px-2 py-1 border border-[#1B4332]/20 rounded-sm text-[10px] text-[#1B4332]/70 hover:border-[#1B4332] hover:text-[#1B4332] disabled:opacity-40"
                        >
                          {guardandoCupo === t.slug ? "…" : c.cerrada ? "Abrir" : "Cerrar"}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {/* Lugares que alguien tiene apartados mientras paga en el sitio
                  (`lib/apartadosAlmacen.ts`). No suman en la cifra de arriba —en
                  15 minutos son reserva o se sueltan solos—, pero mientras corren
                  el sitio y el bot ya no los venden. */}
              {apartadosDelDia.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {apartadosDelDia.map((r) => (
                    <li key={r.slug} className="font-dm text-[10px] text-[#1B4332]/60 tabular-nums">
                      ⏱ <span className="font-bold" style={{ color: colorDeTour(r.slug) }}>{codigoDeTour(r.slug)}</span>{" "}
                      {r.n} apartado{r.n !== 1 ? "s" : ""} · {r.personas} persona{r.personas !== 1 ? "s" : ""}{" "}
                      ({r.n === 1 ? "vence" : "vencen"} en {r.min === r.max ? r.min : `${r.min}–${r.max}`} min)
                    </li>
                  ))}
                </ul>
              )}
              {msjCupo && <p className="mt-2 font-dm text-[10px] text-[#1B4332]/60">{msjCupo}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Cupo por día ────────────────────────────────────────────────────────────

/** El mismo código de colores que el calendario del sitio: amarillo, rojo, lleno. */
const CLASE_CUPO: Record<EstadoDia, string> = {
  libre:          "bg-[#4a8a21]/10 text-[#3a6b1a]",
  "con-reservas": "bg-[#e0ad12]/20 text-[#7a5c00]",
  "casi-lleno":   "bg-[#c8372d]/10 text-[#b02f26]",
  "no-cabe":      "bg-[#c8372d]/10 text-[#b02f26]",
  "sin-cupo":     "bg-[#1B4332] text-white",
  cerrada:        "bg-[#1B4332]/10 text-[#1B4332]/60",
};

const PESO_CUPO: Record<EstadoDia, number> = {
  libre: 0, cerrada: 0, "con-reservas": 1, "casi-lleno": 2, "no-cabe": 2, "sin-cupo": 3,
};

/**
 * Junto al número del día: el recorrido más lleno y un candado si hay alguno
 * cerrado. Lo que se ve sin abrir nada; el detalle va en el panel lateral.
 */
function CupoDelDia({ dia }: { dia?: CupoDeTourEnDia[] }) {
  if (!dia?.length) return null;
  const peor = dia
    .filter((c) => !c.cerrada && c.personas > 0)
    .sort((a, b) => PESO_CUPO[b.estado] - PESO_CUPO[a.estado] || b.personas / b.cupo - a.personas / a.cupo)[0];
  const hayCerrada = dia.some((c) => c.cerrada);
  return (
    <span
      className="flex items-center gap-1 min-w-0"
      title={dia.map((c) => `${codigoDeTour(c.slug)} ${c.cerrada ? "cerrada" : `${c.personas}/${c.cupo}`}`).join(" · ")}
    >
      {hayCerrada && <Lock className="w-3 h-3 flex-shrink-0 text-[#1B4332]/50" aria-label="Hay un recorrido cerrado" />}
      {peor && (
        <span className={`px-1 rounded-sm text-[9px] font-dm font-bold tabular-nums whitespace-nowrap ${CLASE_CUPO[peor.estado]}`}>
          <span className="hidden sm:inline">{codigoDeTour(peor.slug)} </span>{peor.personas}/{peor.cupo}
        </span>
      )}
    </span>
  );
}
