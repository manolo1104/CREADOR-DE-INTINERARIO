"use client";

import { useState } from "react";
import type { TourBooking } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TOUR_COLORS: Record<string, string> = {
  "expedicion-tamul":                 "#3a6b1a",
  "ruta-surrealista-edward-james":    "#c4882a",
  "cascadas-del-meco":                "#1a4e8a",
  "paraiso-escalonado-minas-micos":   "#7a3a6a",
  "ruta-acuatica-puente-de-dios":     "#2a7a6a",
};
function tourColor(slug: string) { return TOUR_COLORS[slug] || "#5a5a5a"; }

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function CalendarioClient({ bookings }: { bookings: TourBooking[] }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel,   setSel]   = useState<TourBooking[]>([]);

  function prevMonth() { if (month===0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function nextMonth() { if (month===11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month+1, 0).getDate();
  const todayStr  = today.toISOString().split("T")[0];

  // Index bookings by tourDate
  const byDay: Record<string, TourBooking[]> = {};
  bookings.forEach(b => {
    if (!byDay[b.tourDate]) byDay[b.tourDate] = [];
    byDay[b.tourDate].push(b);
  });

  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const thisMonthBookings = bookings.filter(b => {
    const d = new Date(b.tourDate+"T12:00:00");
    return d.getFullYear()===year && d.getMonth()===month;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cormorant text-[#1a2e1a] text-2xl font-light">Calendario de Reservas</h1>
          <p className="text-[#1a2e1a]/50 font-dm text-sm mt-1">{thisMonthBookings.length} reservas en {MESES[month]} {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 border border-[#1a2e1a]/15 hover:bg-[#f4edd8] transition-colors rounded-sm">
            <ChevronLeft className="w-4 h-4 text-[#1a2e1a]" />
          </button>
          <span className="font-cormorant text-[#1a2e1a] text-lg min-w-[140px] text-center">{MESES[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 border border-[#1a2e1a]/15 hover:bg-[#f4edd8] transition-colors rounded-sm">
            <ChevronRight className="w-4 h-4 text-[#1a2e1a]" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#1a2e1a]/10 rounded-sm overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-[#1a2e1a]/10">
          {DIAS.map(d => (
            <div key={d} className="py-3 text-center text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/40 font-dm bg-[#f4edd8]">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[90px] border-b border-r border-[#1a2e1a]/6 bg-[#f4edd8]/30" />;
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dayBookings = byDay[dateStr] || [];
            const isToday = dateStr === todayStr;
            const hasBk = dayBookings.length > 0;
            return (
              <div key={i}
                onClick={() => hasBk && setSel(dayBookings)}
                className={`min-h-[90px] border-b border-r border-[#1a2e1a]/6 p-2 transition-colors ${hasBk?"cursor-pointer hover:bg-[#f4edd8]/70":""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-dm mb-1 ${isToday?"bg-[#3a6b1a] text-white":"text-[#1a2e1a]/70"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0,3).map(b => (
                    <div key={b.id}
                      style={{ background: tourColor(b.tourSlug)+"22", borderLeft:`2px solid ${tourColor(b.tourSlug)}` }}
                      className="text-[9px] font-dm px-1 py-0.5 truncate rounded-sm"
                      style={{ background: tourColor(b.tourSlug)+"18", borderLeft:`2px solid ${tourColor(b.tourSlug)}`, color: tourColor(b.tourSlug) }}
                    >
                      {b.customerName.split(" ")[0]} · {b.adults+b.children}p
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-[9px] font-dm text-[#1a2e1a]/40">+{dayBookings.length-3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda tours */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(TOUR_COLORS).map(([slug, color]) => (
          <div key={slug} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{background:color}} />
            <span className="text-[10px] font-dm text-[#1a2e1a]/50 capitalize">{slug.replace(/-/g," ")}</span>
          </div>
        ))}
      </div>

      {/* Sidebar de día seleccionado */}
      {sel.length > 0 && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSel([])} />
          <aside className="relative w-full max-w-xs bg-white border-l border-[#1a2e1a]/10 p-5 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-cormorant text-[#1a2e1a] text-lg font-light">
                {new Date(sel[0].tourDate+"T12:00:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})}
              </p>
              <button onClick={() => setSel([])} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]">✕</button>
            </div>
            <div className="space-y-3">
              {sel.map(b => (
                <div key={b.id} className="border border-[#1a2e1a]/10 p-3 rounded-sm"
                  style={{borderLeft:`3px solid ${tourColor(b.tourSlug)}`}}>
                  <p className="font-dm text-sm font-medium text-[#1a2e1a]">{b.customerName}</p>
                  <p className="font-dm text-xs text-[#1a2e1a]/50 mb-1">{b.tourName}</p>
                  <div className="flex gap-3 text-[10px] font-dm text-[#1a2e1a]/50">
                    <span>{b.adults}A{b.children>0?` · ${b.children}N`:""}</span>
                    <span className="text-[#c4882a]">${b.totalAmount.toLocaleString("es-MX")}</span>
                  </div>
                  <p className="font-mono text-[9px] text-[#3a6b1a] mt-1">{b.confirmationNumber}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
