"use client";

import { useState } from "react";
import type { TourBooking } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { hoyMX } from "@/lib/dates";

// Paleta asignada a cada tour del catálogo (cubre tours nuevos automáticamente).
const PALETTE = ["#1B4332", "#52B788", "#1a4e8a", "#7a3a6a", "#2a7a6a", "#C9484A", "#5a7a2a", "#40916C", "#3a6b6b", "#6a4a8a"];
const COLOR_BY_SLUG: Record<string, string> = {};
TOURS_DB.forEach((t, i) => { COLOR_BY_SLUG[t.slug] = PALETTE[i % PALETTE.length]; });
function tourColor(slug: string) { return COLOR_BY_SLUG[slug] || "#5a5a5a"; }
function tourLabel(slug: string) { return TOURS_DB.find(t => t.slug === slug)?.nombre || slug.replace(/-/g, " "); }

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
}

export default function CalendarioClient({ bookings }: { bookings: TourBooking[] }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel,   setSel]   = useState<Salida[]>([]);

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
        tourSlug:     l.tourSlug || b.tourSlug,
        tourName:     l.tourName || b.tourName,
        customerName: b.customerName,
        personas:     (Number(l.adults) || 0) + (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0) + (Number(l.children) || 0),
        monto:        l.subtotal != null ? Number(l.subtotal) : b.totalAmount,
        confirmationNumber: b.confirmationNumber,
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
    }];
  });

  // Index salidas por fecha
  const byDay: Record<string, typeof salidas> = {};
  salidas.forEach(s => {
    if (!byDay[s.date]) byDay[s.date] = [];
    byDay[s.date].push(s);
  });

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

      <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
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
            const hasBk = dayBookings.length > 0;
            return (
              <div key={i}
                onClick={() => hasBk && setSel(dayBookings)}
                className={`min-h-[90px] border-b border-r border-[#1B4332]/6 p-2 transition-colors ${hasBk?"cursor-pointer hover:bg-[#FAFAF8]/70":""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-dm mb-1 ${isToday?"bg-[#1B4332] text-white":"text-[#1B4332]/70"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0,3).map(s => (
                    <div key={s.key}
                      style={{ background: tourColor(s.tourSlug)+"18", borderLeft:`2px solid ${tourColor(s.tourSlug)}`, color: tourColor(s.tourSlug) }}
                      className="text-[9px] font-dm px-1 py-0.5 truncate rounded-sm"
                    >
                      {s.customerName.split(" ")[0]} · {s.personas}p
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
        {Array.from(new Set(salidas.map(s => s.tourSlug))).map(slug => (
          <div key={slug} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{background:tourColor(slug)}} />
            <span className="text-[10px] font-dm text-[#1B4332]/50">{tourLabel(slug)}</span>
          </div>
        ))}
      </div>

      {/* Sidebar de día seleccionado */}
      {sel.length > 0 && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSel([])} />
          <aside className="relative w-full max-w-xs bg-white border-l border-[#1B4332]/10 p-5 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-cormorant text-[#1B4332] text-lg font-light">
                {new Date(sel[0].date+"T12:00:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
              </p>
              <button onClick={() => setSel([])} className="text-[#1B4332]/40 hover:text-[#1B4332]">✕</button>
            </div>
            <div className="space-y-3">
              {sel.map(s => (
                <div key={s.key} className="border border-[#1B4332]/10 p-3 rounded-sm"
                  style={{borderLeft:`3px solid ${tourColor(s.tourSlug)}`}}>
                  <p className="font-dm text-sm font-medium text-[#1B4332]">{s.customerName}</p>
                  <p className="font-dm text-xs text-[#1B4332]/50 mb-1">{s.tourName}</p>
                  <div className="flex gap-3 text-[10px] font-dm text-[#1B4332]/50">
                    <span>{s.personas} persona{s.personas !== 1 ? "s" : ""}</span>
                    <span className="text-[#52B788]">${s.monto.toLocaleString("es-MX")}</span>
                  </div>
                  <p className="font-mono text-[9px] text-[#1B4332] mt-1">{s.confirmationNumber}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
