"use client";

import { useState, useMemo } from "react";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Trash2, Plus, X, Download, Pencil } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { paid: "Pagada", pending: "Pendiente", cancelled: "Cancelada" };

const fmx   = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fDateL = (d: string) => {
  if (!d) return "—";
  const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return r.charAt(0).toUpperCase() + r.slice(1);
};

const EMPTY = { tourSlug: "", tourDate: "", adults: 2, children: 0, customerName: "", customerEmail: "", customerPhone: "", notes: "" };

export default function ReservasClient({ initialBookings }: { initialBookings: TourBooking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState<string | null>(null);
  const [msg,      setMsg]      = useState("");
  const [modal,    setModal]    = useState<"new" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<TourBooking | null>(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const tour   = TOURS_DB.find(t => t.slug === form.tourSlug);
  const pAdult = tour?.precio ?? 0;
  const pChild = Math.round(pAdult * 0.6);
  const total  = pAdult * form.adults + pChild * form.children;

  async function refresh() {
    setLoading(true);
    const r = await fetch("/api/admin/reservas");
    if (r.ok) setBookings(await r.json());
    setLoading(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/reservas/${id}/send-email`, { method: "POST" });
    const d = await r.json();
    setMsg(r.ok ? "✅ Email enviado al correo admin" : `❌ ${d.error || "Error"}`);
    setSending(null);
    setTimeout(() => setMsg(""), 4000);
  }

  async function hardDelete(id: string) {
    if (!confirm("¿Eliminar completamente esta reserva? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/admin/reservas/${id}`, { method: "DELETE" });
    setBookings(b => b.filter(x => x.id !== id));
    setMsg("✅ Reserva eliminada");
    setTimeout(() => setMsg(""), 3000);
  }

  function openEdit(b: TourBooking) {
    setEditTarget(b);
    setForm({
      tourSlug: b.tourSlug, tourDate: b.tourDate,
      adults: b.adults, children: b.children,
      customerName: b.customerName, customerEmail: b.customerEmail,
      customerPhone: b.customerPhone || "", notes: b.notes || "",
    });
    setModal("edit");
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
        adults: form.adults, children: form.children, totalAmount: total,
        customerName: form.customerName, customerEmail: form.customerEmail,
        customerPhone: form.customerPhone, notes: form.notes, status: "paid",
      }),
    });
    if (r.ok) { await refresh(); setModal(null); setForm(EMPTY); setMsg("✅ Reserva creada"); setTimeout(() => setMsg(""), 3000); }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    const r = await fetch(`/api/admin/reservas/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourSlug: form.tourSlug, tourDate: form.tourDate,
        tourName: TOURS_DB.find(t => t.slug === form.tourSlug)?.nombre || editTarget.tourName,
        adults: form.adults, children: form.children, totalAmount: total || editTarget.totalAmount,
        customerName: form.customerName, customerEmail: form.customerEmail,
        customerPhone: form.customerPhone, notes: form.notes,
      }),
    });
    if (r.ok) {
      setBookings(b => b.map(x => x.id === editTarget.id
        ? { ...x, ...form, tourName: TOURS_DB.find(t => t.slug === form.tourSlug)?.nombre || x.tourName, totalAmount: total || x.totalAmount }
        : x));
      setModal(null); setEditTarget(null); setMsg("✅ Reserva actualizada");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  function downloadPDF(b: TourBooking) {
    const win = window.open("", "_blank");
    if (!win) return;
    const heroUrl = (() => {
      const t = TOURS_DB.find(t => t.slug === b.tourSlug);
      if (!t?.imagen_hero) return "";
      return t.imagen_hero.startsWith("http") ? t.imagen_hero : `https://www.huasteca-potosina.com${t.imagen_hero}`;
    })();

    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Confirmación ${b.confirmationNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;color:#1a2e1a;background:#fff;padding:40px;max-width:720px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2e1a;padding-bottom:20px;margin-bottom:28px}
  .brand h1{font-size:20px;letter-spacing:4px;text-transform:uppercase;font-weight:400}
  .brand p{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3a6b1a;margin-top:4px;font-family:Arial}
  .conf-box{text-align:right}
  .conf-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}
  .conf-num{font-size:20px;color:#1a2e1a}
  .conf-status{font-size:11px;color:#3a6b1a;font-family:Arial;margin-top:3px;font-weight:600}
  .section-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:10px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#d4ccbc;border:1px solid #d4ccbc;margin-bottom:22px}
  .info-cell{background:#faf7ee;padding:12px 14px}
  .info-cl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}
  .info-cv{font-size:15px;color:#1a2e1a}
  .hero-img{width:100%;height:180px;object-fit:cover;margin-bottom:22px;border-radius:2px}
  .total-row{background:#1a2e1a;color:#f4edd8;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .total-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a;font-family:Arial}
  .total-value{font-size:24px;font-weight:600}
  .includes{border-left:3px solid #3a6b1a;padding-left:14px;margin-bottom:20px}
  .includes p{font-family:Arial;font-size:12px;color:#3a3a2e;line-height:2.1}
  .footer{border-top:1px solid #d4ccbc;padding-top:14px;font-family:Arial;font-size:11px;color:#9a8a6a;text-align:center;line-height:1.7}
  @media print{body{padding:20px}@page{margin:1cm}}
</style></head><body>
<div class="header">
  <div class="brand">
    <h1>Tours Huasteca Potosina</h1>
    <p>Xilitla · San Luis Potosí · México</p>
  </div>
  <div class="conf-box">
    <div class="conf-label">Confirmación de Reserva</div>
    <div class="conf-num">${b.confirmationNumber}</div>
    <div class="conf-status">✓ ${STATUS_LABEL[b.status] || b.status}</div>
  </div>
</div>

<div class="section-label">Datos del cliente</div>
<div class="info-grid">
  <div class="info-cell"><div class="info-cl">Nombre</div><div class="info-cv">${b.customerName}</div></div>
  <div class="info-cell"><div class="info-cl">Email</div><div class="info-cv" style="font-size:13px">${b.customerEmail}</div></div>
  <div class="info-cell"><div class="info-cl">Teléfono</div><div class="info-cv">${b.customerPhone || "—"}</div></div>
  <div class="info-cell"><div class="info-cl">Fecha de reserva</div><div class="info-cv" style="font-size:13px">${new Date(b.createdAt).toLocaleDateString("es-MX")}</div></div>
</div>

${heroUrl ? `<img src="${heroUrl}" alt="${b.tourName}" class="hero-img" />` : ""}

<div class="section-label">Detalles del tour</div>
<div class="info-grid">
  <div class="info-cell" style="grid-column:1/-1"><div class="info-cl">Tour</div><div class="info-cv" style="font-size:18px">${b.tourName}</div></div>
  <div class="info-cell"><div class="info-cl">Fecha del recorrido</div><div class="info-cv">${fDateL(b.tourDate)}</div></div>
  <div class="info-cell"><div class="info-cl">Participantes</div><div class="info-cv">${b.adults} adulto${b.adults !== 1 ? "s" : ""}${b.children > 0 ? ` · ${b.children} niño${b.children !== 1 ? "s" : ""}` : ""}</div></div>
</div>

<div class="total-row">
  <span class="total-label">Total Pagado</span>
  <span class="total-value">${fmx(b.totalAmount)}</span>
</div>

<div class="section-label">Todo incluido</div>
<div class="includes">
  <p>✓ Transporte desde tu hotel &nbsp;&nbsp; ✓ Desayuno con platillos típicos</p>
  <p>✓ Entradas a todos los parques &nbsp;&nbsp; ✓ Guía certificado NOM-09 SECTUR</p>
  <p>✓ Equipo de seguridad completo &nbsp;&nbsp; ✓ Fotografías del recorrido</p>
</div>

${b.notes ? `<p style="font-family:Arial;font-size:13px;color:#3a3a2e;margin-bottom:20px"><strong>Notas:</strong> ${b.notes}</p>` : ""}

<div class="footer">
  Tours Huasteca Potosina · +52 489 125 1458 · hola@huasteca-potosina.com<br>
  Guías certificados NOM-09 SECTUR · www.huasteca-potosina.com
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b =>
      !q || [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName].some(v => v?.toLowerCase().includes(q))
    );
  }, [bookings, search]);

  const totalIngresos = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.totalAmount, 0);

  const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

  function ModalForm({ onSave, onClose, title }: { onSave: () => void; onClose: () => void; title: string }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] shadow-xl rounded-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">{title}</h2>
            <button onClick={onClose} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            {[
              { l: "Cliente *", k: "customerName", t: "text", p: "Nombre completo" },
              { l: "Email *", k: "customerEmail", t: "email", p: "email@ejemplo.com" },
              { l: "Teléfono", k: "customerPhone", t: "tel", p: "+52 489 000 0000" },
            ].map(({ l, k, t, p }) => (
              <div key={k}>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{l}</label>
                <input type={t} value={(form as any)[k]} placeholder={p}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className={inputCls} />
              </div>
            ))}
            <div>
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
              <select value={form.tourSlug} onChange={e => setForm(f => ({ ...f, tourSlug: e.target.value }))} className={inputCls}>
                <option value="">Seleccionar tour...</option>
                {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre} — {fmx(t.precio)}/persona</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
              <input type="date" value={form.tourDate} onChange={e => setForm(f => ({ ...f, tourDate: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ l: "Adultos", k: "adults", min: 1 }, { l: "Niños (60%)", k: "children", min: 0 }].map(({ l, k, min }) => (
                <div key={k}>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{l}</label>
                  <input type="number" min={min} max={12} value={(form as any)[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className={inputCls} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
              <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={`${inputCls} resize-none`} />
            </div>
            {total > 0 && (
              <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 flex justify-between items-center rounded-sm">
                <span className="text-[#1a2e1a]/60 font-dm text-sm">Total</span>
                <span className="font-cormorant text-[#c4882a] text-xl">{fmx(total)}</span>
              </div>
            )}
            <button onClick={onSave}
              disabled={saving || !form.tourSlug || !form.tourDate || !form.customerName || !form.customerEmail}
              className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm mt-1">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1a2e1a] text-2xl font-light">Reservas de Tours</h1>
          <p className="text-[#1a2e1a]/50 font-dm text-sm mt-1">
            {bookings.filter(b => b.status !== "cancelled").length} activas ·{" "}
            <span className="text-[#3a6b1a] font-medium">{fmx(totalIngresos)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 border border-[#1a2e1a]/20 text-[#1a2e1a]/60 hover:text-[#1a2e1a] px-3 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors disabled:opacity-40 rounded-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Actualizar
          </button>
          <button onClick={() => { setForm(EMPTY); setModal("new"); }}
            className="flex items-center gap-2 bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <Plus className="w-4 h-4" />Nueva Reserva
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 text-sm font-dm px-4 py-2 rounded border ${msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a2e1a]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o confirmación..."
          className="w-full bg-white border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#3a6b1a] placeholder:text-[#1a2e1a]/30 rounded-sm"
        />
      </div>

      <div className="bg-white border border-[#1a2e1a]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#f4edd8]">
              <tr className="border-b border-[#1a2e1a]/10 text-[#1a2e1a]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Confirmación", "Cliente", "Tour", "Fecha", "Personas", "Total", "Estado", "Acciones"].map(h => (
                  <th key={h} className="py-3 px-4 text-left font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-[#1a2e1a]/30 font-dm">Sin resultados</td></tr>}
              {filtered.map(b => (
                <tr key={b.id} className="border-b border-[#1a2e1a]/6 hover:bg-[#f4edd8]/50 transition-colors">
                  <td className="py-3 px-4 text-[#3a6b1a] font-mono text-xs font-medium">{b.confirmationNumber}</td>
                  <td className="py-3 px-4">
                    <p className="text-[#1a2e1a] font-medium">{b.customerName}</p>
                    <p className="text-[#1a2e1a]/40 text-xs">{b.customerEmail}</p>
                  </td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70 max-w-[160px] truncate">{b.tourName}</td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70 whitespace-nowrap">{fDate(b.tourDate)}</td>
                  <td className="py-3 px-4 text-[#1a2e1a]/70">{b.adults}A{b.children > 0 ? ` · ${b.children}N` : ""}</td>
                  <td className="py-3 px-4 text-[#c4882a] font-medium whitespace-nowrap">{fmx(b.totalAmount)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => sendEmail(b.id)} disabled={sending === b.id}
                        title="Enviar email" className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors disabled:opacity-25">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadPDF(b)} title="Descargar PDF"
                        className="text-[#1a2e1a]/40 hover:text-[#c4882a] transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(b)} title="Editar"
                        className="text-[#1a2e1a]/40 hover:text-[#1a2e1a] transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => hardDelete(b.id)} title="Eliminar"
                        className="text-[#1a2e1a]/40 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "new" && <ModalForm title="Nueva Reserva Manual" onSave={saveNew} onClose={() => setModal(null)} />}
      {modal === "edit" && <ModalForm title="Editar Reserva" onSave={saveEdit} onClose={() => { setModal(null); setEditTarget(null); }} />}
    </div>
  );
}
