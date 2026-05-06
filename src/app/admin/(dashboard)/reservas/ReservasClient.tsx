"use client";

import { useState, useMemo } from "react";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Trash2, Plus, X } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { paid:"Pagada", pending:"Pendiente", cancelled:"Cancelada" };

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const EMPTY = { tourSlug:"", tourDate:"", adults:2, children:0, customerName:"", customerEmail:"", customerPhone:"", notes:"" };

export default function ReservasClient({ initialBookings }: { initialBookings: TourBooking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState<string|null>(null);
  const [msg,      setMsg]      = useState("");
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const tour      = TOURS_DB.find(t => t.slug === form.tourSlug);
  const pAdult    = tour?.precio ?? 0;
  const pChild    = Math.round(pAdult * 0.6);
  const totalAmt  = pAdult * form.adults + pChild * form.children;

  async function refresh() {
    setLoading(true);
    const r = await fetch("/api/admin/reservas");
    if (r.ok) setBookings(await r.json());
    setLoading(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/reservas/${id}/send-email`, { method:"POST" });
    setMsg(r.ok ? "✅ Email enviado" : "❌ Error al enviar");
    setSending(null);
    setTimeout(() => setMsg(""), 3000);
  }

  async function cancel(id: string) {
    if (!confirm("¿Cancelar esta reserva?")) return;
    await fetch(`/api/admin/reservas/${id}`, { method:"DELETE" });
    setBookings(b => b.map(x => x.id===id ? {...x, status:"cancelled"} : x));
  }

  async function saveNew() {
    if (!form.tourSlug || !form.tourDate || !form.customerName || !form.customerEmail) return;
    setSaving(true);
    const confirmationNumber = "HP-M-" + Date.now().toString(36).toUpperCase();
    const r = await fetch("/api/admin/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmationNumber, tourId: form.tourSlug, tourName: tour?.nombre || "",
        tourSlug: form.tourSlug, tourDate: form.tourDate,
        adults: form.adults, children: form.children, totalAmount: totalAmt,
        customerName: form.customerName, customerEmail: form.customerEmail,
        customerPhone: form.customerPhone, notes: form.notes, status: "paid",
      }),
    });
    if (r.ok) { await refresh(); setModal(false); setForm(EMPTY); setMsg("✅ Reserva creada"); setTimeout(() => setMsg(""), 3000); }
    setSaving(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => !q || [b.customerName,b.customerEmail,b.confirmationNumber,b.tourName].some(v => v?.toLowerCase().includes(q)));
  }, [bookings, search]);

  const total = bookings.filter(b => b.status!=="cancelled").reduce((s,b) => s+b.totalAmount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1a2e1a] text-2xl font-light">Reservas de Tours</h1>
          <p className="text-[#1a2e1a]/50 font-dm text-sm mt-1">
            {bookings.filter(b=>b.status!=="cancelled").length} activas · <span className="text-[#3a6b1a] font-medium">{fmx(total)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 border border-[#1a2e1a]/20 text-[#1a2e1a]/60 hover:text-[#1a2e1a] px-3 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} />Actualizar
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors">
            <Plus className="w-4 h-4" />Nueva Reserva
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 text-sm font-dm px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded">{msg}</div>}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a2e1a]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o confirmación..."
          className="w-full bg-white border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#3a6b1a] transition-colors placeholder:text-[#1a2e1a]/30 rounded-sm"
        />
      </div>

      <div className="bg-white border border-[#1a2e1a]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#f4edd8]">
              <tr className="border-b border-[#1a2e1a]/10 text-[#1a2e1a]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Confirmación","Cliente","Tour","Fecha Tour","Personas","Total","Estado","Acciones"].map(h => (
                  <th key={h} className={`py-3 px-4 ${h==="Total"||h==="Acciones"?"text-right":"text-left"} font-dm`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={8} className="py-12 text-center text-[#1a2e1a]/30 font-dm">Sin resultados</td></tr>}
              {filtered.map(b => (
                <tr key={b.id} className="border-b border-[#1a2e1a]/6 hover:bg-[#f4edd8]/50 transition-colors">
                  <td className="py-3 px-4 text-[#3a6b1a] font-mono text-xs font-medium">{b.confirmationNumber}</td>
                  <td className="py-3 px-4"><p className="text-[#1a2e1a] font-medium">{b.customerName}</p><p className="text-[#1a2e1a]/40 text-xs">{b.customerEmail}</p></td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70 max-w-[160px] truncate">{b.tourName}</td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70">{fDate(b.tourDate)}</td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70">{b.adults}A{b.children>0?` · ${b.children}N`:""}</td>
                  <td className="py-3 px-4 text-right text-[#c4882a] font-medium">{fmx(b.totalAmount)}</td>
                  <td className="py-3 px-4"><span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${STATUS_STYLE[b.status]||"bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[b.status]||b.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => sendEmail(b.id)} disabled={sending===b.id||b.status==="cancelled"} title="Enviar email"
                        className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors disabled:opacity-25">
                        <Mail className="w-4 h-4" />
                      </button>
                      {b.status!=="cancelled" && (
                        <button onClick={() => cancel(b.id)} title="Cancelar"
                          className="text-[#1a2e1a]/40 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva reserva */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModal(false)} />
          <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] shadow-xl rounded-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">Nueva Reserva Manual</h2>
              <button onClick={() => setModal(false)} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                {label:"Cliente *",key:"customerName",type:"text",ph:"Nombre completo"},
                {label:"Email *",key:"customerEmail",type:"email",ph:"email@ejemplo.com"},
                {label:"Teléfono",key:"customerPhone",type:"tel",ph:"+52 489 000 0000"},
              ].map(({label,key,type,ph}) => (
                <div key={key}>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} placeholder={ph}
                    onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                    className="w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] placeholder:text-[#1a2e1a]/25 rounded-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
                <select value={form.tourSlug} onChange={e => setForm(f => ({...f,tourSlug:e.target.value}))}
                  className="w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm bg-white">
                  <option value="">Seleccionar tour...</option>
                  {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre} — {fmx(t.precio)}/persona</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
                <input type="date" value={form.tourDate} onChange={e => setForm(f => ({...f,tourDate:e.target.value}))}
                  className="w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{label:"Adultos",key:"adults",min:1},{label:"Niños (60%)",key:"children",min:0}].map(({label,key,min}) => (
                  <div key={key}>
                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{label}</label>
                    <input type="number" min={min} max={12} value={(form as any)[key]}
                      onChange={e => setForm(f => ({...f,[key]:Number(e.target.value)}))}
                      className="w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
                <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({...f,notes:e.target.value}))}
                  className="w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2 focus:outline-none focus:border-[#3a6b1a] resize-none rounded-sm"
                />
              </div>
              {totalAmt > 0 && (
                <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 flex justify-between items-center rounded-sm">
                  <span className="text-[#1a2e1a]/60 font-dm text-sm">Total</span>
                  <span className="font-cormorant text-[#c4882a] text-xl">{fmx(totalAmt)}</span>
                </div>
              )}
              <button onClick={saveNew} disabled={saving||!form.tourSlug||!form.tourDate||!form.customerName||!form.customerEmail}
                className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm mt-1">
                {saving?"Guardando...":"Crear Reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
