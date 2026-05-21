"use client";

import { useState, useMemo } from "react";
import type { TourQuote } from "@prisma/client";
import { Plus, Mail, Download, Trash2, Search, MessageCircle, X, Pencil, Check, BedDouble } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { type PackageItem, calcPackageLine } from "@/components/admin/ReservaModal";

const STATUS: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador",  cls: "bg-gray-100 text-gray-600"     },
  enviada:  { label: "Enviada",   cls: "bg-yellow-100 text-yellow-800" },
  aceptada: { label: "Aceptada",  cls: "bg-green-100 text-green-800"   },
  expirada: { label: "Expirada",  cls: "bg-red-100 text-red-700"       },
};

interface LineItem { tourSlug: string; tourName: string; tourDate: string; adults: number; childrenMid: number; childrenSmall: number; subtotal: number; }

const HABITACIONES_PRESET = [
  { label: "Vista Montañas",           precio: 1800 },
  { label: "Vista Jardines / Piscina", precio: 1500 },
];
const EMPTY_PACKAGE: PackageItem = {
  habitacion: "Vista Montañas", hotel: "Hotel Paraíso Encantado, Xilitla",
  noches: 2, habitaciones: 1, precioPorNoche: 1800, checkin: "", checkout: "", subtotal: 3600,
};

const fmx    = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate  = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fDateL = (d: string) => { if (!d) return "—"; const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return r.charAt(0).toUpperCase() + r.slice(1); };

const EMPTY_LINE: LineItem = { tourSlug: "", tourName: "", tourDate: "", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 0 };
const EMPTY_FORM = { customerName: "", customerEmail: "", customerPhone: "", notes: "" };

function calcLine(item: LineItem): number {
  const t = TOURS_DB.find(t => t.slug === item.tourSlug);
  if (!t) return 0;
  return (
    t.precio * item.adults +
    Math.round(t.precio * 0.7) * (item.childrenMid   ?? 0) +
    Math.round(t.precio * 0.5) * (item.childrenSmall ?? 0)
  );
}

const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

export default function CotizacionesClient({ initialQuotes }: { initialQuotes: TourQuote[] }) {
  const [quotes,         setQuotes]         = useState(initialQuotes);
  const [search,         setSearch]         = useState("");
  const [modal,          setModal]          = useState<"new" | "edit" | null>(null);
  const [editTarget,     setEditTarget]     = useState<TourQuote | null>(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [lines,          setLines]          = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [packages,       setPackages]       = useState<PackageItem[]>([]);
  const [priceOverride,  setPriceOverride]  = useState<string>("");
  const [editingPrice,   setEditingPrice]   = useState(false);
  // Descuento
  const [discountType,   setDiscountType]   = useState<"percent" | "fixed">("percent");
  const [discountValue,  setDiscountValue]  = useState<string>("");
  const [saving,         setSaving]         = useState(false);
  const [sending,        setSending]        = useState<string | null>(null);
  const [msg,            setMsg]            = useState("");

  const toursTotal = lines.reduce((s, l) => s + calcLine(l), 0);
  const pkgsTotal  = packages.reduce((s, p) => s + calcPackageLine(p), 0);
  const calcTotal  = toursTotal + pkgsTotal;
  const baseTotal  = priceOverride !== "" ? Number(priceOverride) || 0 : calcTotal;
  const discountAmt = discountValue !== ""
    ? discountType === "percent"
      ? Math.round(baseTotal * (Number(discountValue) / 100))
      : Number(discountValue) || 0
    : 0;
  const finalTotal = Math.max(0, baseTotal - discountAmt);

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      const up = { ...l, [field]: val };
      if (field === "tourSlug") { const t = TOURS_DB.find(t => t.slug === val); up.tourName = t?.nombre || ""; }
      up.subtotal = calcLine(up);
      return up;
    }));
    if (priceOverride !== "") setPriceOverride("");
  }

  function addLine()         { setLines(ls => [...ls, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { if (lines.length > 1) setLines(ls => ls.filter((_, idx) => idx !== i)); }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 5000); }

  function openNew() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setLines([{ ...EMPTY_LINE }]);
    setPackages([]);
    setPriceOverride(""); setDiscountValue(""); setDiscountType("percent");
    setModal("new");
  }

  function openEdit(q: TourQuote) {
    setEditTarget(q);
    setForm({ customerName: q.customerName, customerEmail: q.customerEmail || "", customerPhone: q.customerPhone || "", notes: q.notes || "" });
    const storedLines = (q as any).lineItems as any[] | null;
    setLines(storedLines?.length
      ? storedLines.map(l => ({
          ...l,
          childrenMid:   l.childrenMid   ?? (l.children ?? 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }]
    );
    setPackages((q as any).packageItems ?? []);
    setPriceOverride(""); setDiscountValue(""); setDiscountType("percent");
    setModal("edit");
  }

  function closeModal() { setModal(null); setEditTarget(null); }

  async function saveQuote() {
    if (!form.customerName || lines.some(l => !l.tourSlug || !l.tourDate)) return;
    setSaving(true);
    const lineItems    = lines.map(l => ({ ...l, subtotal: calcLine(l) }));
    const packageItems = packages.map(p => ({ ...p, subtotal: calcPackageLine(p) }));
    const payload = {
      tourName: lines.map(l => l.tourName).join(" + "), tourSlug: lines[0].tourSlug,
      tourDate: lines[0].tourDate,
      adults: lines.reduce((s, l) => s + l.adults, 0),
      children: lines.reduce((s, l) => s + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0), 0),
      totalAmount: finalTotal, lineItems, packageItems,
      customerName: form.customerName, customerEmail: form.customerEmail,
      customerPhone: form.customerPhone, notes: form.notes,
    };

    let r: Response;
    if (modal === "edit" && editTarget) {
      r = await fetch(`/api/admin/cotizaciones/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      r = await fetch("/api/admin/cotizaciones", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    }

    if (r.ok) {
      const ref = await fetch("/api/admin/cotizaciones");
      setQuotes(await ref.json());
      closeModal();
      flash(modal === "edit" ? "✅ Cotización actualizada" : "✅ Cotización creada");
    } else {
      const d = await r.json().catch(() => ({}));
      const msg = d.error || `Error ${r.status}`;
      flash(`❌ Error al guardar: ${msg}`);
      alert(`❌ Error al guardar cotización:\n${msg}`);
    }
    setSaving(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/cotizaciones/${id}/send-email`, { method: "POST" });
    const d = await r.json();
    flash(r.ok ? "✅ Email enviado al cliente" : `❌ ${d.error || "Error al enviar"}`);
    if (r.ok) setQuotes(q => q.map(x => x.id === id ? { ...x, status: "enviada" } : x));
    setSending(null);
  }

  async function expireQ(id: string) {
    if (!confirm("¿Marcar como expirada?")) return;
    await fetch(`/api/admin/cotizaciones/${id}`, { method: "DELETE" });
    setQuotes(q => q.map(x => x.id === id ? { ...x, status: "expirada" } : x));
  }

  async function hardDeleteQ(id: string) {
    if (!confirm("¿Eliminar completamente esta cotización?")) return;
    await fetch(`/api/admin/cotizaciones/${id}?hard=1`, { method: "DELETE" });
    setQuotes(q => q.filter(x => x.id !== id));
    flash("✅ Cotización eliminada");
  }

  function downloadPDF(q: TourQuote) {
    const win = window.open("", "_blank");
    if (!win) return;
    const items: LineItem[] = Array.isArray((q as any).lineItems)
      ? (q as any).lineItems
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, children: q.children, subtotal: q.totalAmount }];
    const pkgs: PackageItem[] = (q as any).packageItems ?? [];

    const heroSections = items.map(it => {
      const t = TOURS_DB.find(t => t.slug === it.tourSlug);
      const heroUrl = t?.imagen_hero?.startsWith("http") ? t.imagen_hero : t?.imagen_hero ? `https://www.huasteca-potosina.com${t.imagen_hero}` : "";
      const destinos = t?.destinos?.map(d => `<li>→ ${d}</li>`).join("") || "";
      return `<div style="margin-bottom:22px">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:8px">${it.tourName}</div>
        ${heroUrl ? `<img src="${heroUrl}" alt="${it.tourName}" style="width:100%;height:150px;object-fit:cover;border-radius:2px;margin-bottom:10px"/>` : ""}
        <div style="font-family:Arial;font-size:12px;color:#3a3a2e;margin-bottom:6px">📅 ${fDateL(it.tourDate)} · ${it.adults} adulto${it.adults!==1?"s":""}${(it.childrenMid??0)>0?` · ${it.childrenMid} niño${it.childrenMid!==1?"s":""} (6-10)`:""} ${(it.childrenSmall??0)>0?` · ${it.childrenSmall} niño${it.childrenSmall!==1?"s":""} (&lt;6)`:""}</div>
        ${destinos ? `<ul style="list-style:none;font-family:Arial;font-size:12px;color:#3a3a2e;line-height:1.9">${destinos}</ul>` : ""}
        <div style="text-align:right;font-family:Arial;font-size:12px;color:#c4882a;margin-top:6px;font-weight:600">Subtotal: $${calcLine(it).toLocaleString("es-MX")} MXN</div>
      </div>`;
    }).join("<hr style='border:none;border-top:1px solid #e8e0d0;margin:14px 0'/>");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cotización ${q.quoteNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1a2e1a;background:#fff;padding:40px;max-width:720px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2e1a;padding-bottom:18px;margin-bottom:24px}
.brand h1{font-size:20px;letter-spacing:4px;text-transform:uppercase;font-weight:400}.brand p{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3a6b1a;margin-top:4px;font-family:Arial}
.cot-box{text-align:right}.cl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial}
.sl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#d4ccbc;border:1px solid #d4ccbc;margin-bottom:22px}
.cell{background:#faf7ee;padding:12px 14px}
.total-row{background:#1a2e1a;color:#f4edd8;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.total-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a;font-family:Arial}.total-value{font-size:24px;font-weight:600}
.includes{border-left:3px solid #3a6b1a;padding-left:14px;margin-bottom:18px}.includes p{font-family:Arial;font-size:12px;color:#3a3a2e;line-height:2.1}
.footer{border-top:1px solid #d4ccbc;padding-top:14px;font-family:Arial;font-size:11px;color:#9a8a6a;text-align:center;line-height:1.7}
@media print{body{padding:20px}@page{margin:1cm}}</style></head><body>
<div class="header">
  <div class="brand"><h1>Tours Huasteca Potosina</h1><p>Xilitla · San Luis Potosí · México</p></div>
  <div class="cot-box"><div class="cl" style="margin-bottom:4px">Cotización</div><div style="font-size:20px">${q.quoteNumber}</div><div style="font-size:11px;color:#9a8a6a;font-family:Arial;margin-top:3px">Válida 48 horas · ${new Date().toLocaleDateString("es-MX")}</div></div>
</div>
<div class="sl">Datos del cliente</div>
<div class="grid">
  <div class="cell"><div class="cl">Nombre</div><div style="font-size:14px">${q.customerName}</div></div>
  <div class="cell"><div class="cl">Email</div><div style="font-size:12px">${q.customerEmail || "—"}</div></div>
  <div class="cell"><div class="cl">Teléfono</div><div style="font-size:14px">${q.customerPhone || "—"}</div></div>
  <div class="cell"><div class="cl">Fecha</div><div style="font-size:12px">${new Date().toLocaleDateString("es-MX")}</div></div>
</div>
<div class="sl" style="margin-bottom:16px">Tours del paquete</div>
${heroSections}
${pkgs.length > 0 ? `
  <hr style="border:none;border-top:1px solid #e8e0d0;margin:16px 0"/>
  <div class="sl" style="margin-bottom:12px">Hospedaje incluido</div>
  ${pkgs.map(p => `
    <div style="margin-bottom:12px;padding:12px 14px;background:#faf7ee;border:1px solid #e0d8c4;border-radius:2px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:6px">🏨 ${p.hotel}</div>
      <div style="font-family:Arial;font-size:13px;color:#1a2e1a;font-weight:600;margin-bottom:4px">${p.habitacion}</div>
      <div style="font-family:Arial;font-size:12px;color:#3a3a2e">
        ${p.checkin ? `Check-in: ${fDate(p.checkin)} · ` : ""}${p.checkout ? `Check-out: ${fDate(p.checkout)}` : ""}
      </div>
      <div style="font-family:Arial;font-size:12px;color:#3a3a2e;margin-top:2px">
        ${p.noches} noche${p.noches !== 1 ? "s" : ""} · ${p.habitaciones} habitación${p.habitaciones !== 1 ? "es" : ""} · $${p.precioPorNoche.toLocaleString("es-MX")} MXN/noche
      </div>
      <div style="text-align:right;font-family:Arial;font-size:12px;color:#8a6f1e;font-weight:600;margin-top:4px">$${calcPackageLine(p).toLocaleString("es-MX")} MXN</div>
    </div>`).join("")}` : ""}
<div class="total-row"><span class="total-label">Total Cotizado</span><span class="total-value">${fmx(q.totalAmount)}</span></div>
<div class="includes"><p>✓ Transporte desde tu hotel &nbsp; ✓ Desayuno típico &nbsp; ✓ Entradas a todos los parques<br>✓ Guía certificado NOM-09 SECTUR &nbsp; ✓ Equipo de seguridad &nbsp; ✓ Fotografías del recorrido</p></div>
${q.notes ? `<p style="font-family:Arial;font-size:13px;color:#3a3a2e;margin-bottom:18px"><strong>Notas:</strong> ${q.notes}</p>` : ""}
<div class="footer">Tours Huasteca Potosina · +52 489 125 1458 · hola@huasteca-potosina.com<br>Guías certificados NOM-09 SECTUR · www.huasteca-potosina.com<br><em>Cotización válida por 48 horas. Precios en pesos mexicanos (MXN).</em></div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  function waMsg(q: TourQuote) {
    const ph = (q.customerPhone || "524891251458").replace(/\D/g, "");
    return `https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${q.customerName}, tu cotización *${q.quoteNumber}*:\n\n*${q.tourName}*\nTotal: *${fmx(q.totalAmount)}*\nVálida 48 horas.\n\n¿Confirmamos?`)}`;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter(c => !q || [c.customerName, c.customerEmail, c.quoteNumber, c.tourName].some(v => v?.toLowerCase().includes(q)));
  }, [quotes, search]);

  const isEditMode = modal === "edit";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1a2e1a] text-2xl font-light">Cotizaciones</h1>
          <p className="text-[#1a2e1a]/50 font-dm text-sm mt-1">{quotes.length} cotizaciones · {quotes.filter(q => q.status === "aceptada").length} aceptadas</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-4 py-2.5 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
          <Plus className="w-4 h-4" />Nueva Cotización
        </button>
      </div>

      {msg && (
        <div className={`mb-4 text-sm font-dm px-4 py-2 rounded border ${msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a2e1a]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, tour o número..."
          className="w-full bg-white border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#3a6b1a] placeholder:text-[#1a2e1a]/30 rounded-sm"
        />
      </div>

      <div className="bg-white border border-[#1a2e1a]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#f4edd8]">
              <tr className="border-b border-[#1a2e1a]/10 text-[#1a2e1a]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Número","Cliente","Tour(s)","Total","Estado","Acciones"].map(h => (
                  <th key={h} className="py-3 px-4 text-left font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-[#1a2e1a]/30 font-dm">Sin cotizaciones</td></tr>}
              {filtered.map(q => {
                const s = STATUS[q.status] || { label: q.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={q.id} className="border-b border-[#1a2e1a]/6 hover:bg-[#f4edd8]/50 transition-colors">
                    <td className="py-3 px-4 text-[#3a6b1a] font-mono text-xs font-medium">{q.quoteNumber}</td>
                    <td className="py-3 px-4"><p className="text-[#1a2e1a] font-medium">{q.customerName}</p><p className="text-[#1a2e1a]/40 text-xs">{q.customerEmail || "—"}</p></td>
                    <td className="py-3 px-4 text-[#1a2e1a]/70 max-w-[200px]"><p className="truncate text-xs">{q.tourName}</p><p className="text-xs text-[#1a2e1a]/40">{fDate(q.tourDate)}</p></td>
                    <td className="py-3 px-4 text-[#c4882a] font-medium whitespace-nowrap">{fmx(q.totalAmount)}</td>
                    <td className="py-3 px-4"><span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${s.cls}`}>{s.label}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(q)} title="Editar"
                          className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => sendEmail(q.id)} disabled={sending === q.id} title="Enviar email"
                          className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                        <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="text-[#1a2e1a]/40 hover:text-[#25D366] transition-colors"><MessageCircle className="w-4 h-4" /></a>
                        <button onClick={() => downloadPDF(q)} title="PDF"
                          className="text-[#1a2e1a]/40 hover:text-[#c4882a] transition-colors"><Download className="w-4 h-4" /></button>
                        <button onClick={() => expireQ(q.id)} title="Marcar expirada"
                          className="text-[#1a2e1a]/40 hover:text-orange-500 transition-colors"><X className="w-4 h-4" /></button>
                        <button onClick={() => hardDeleteQ(q.id)} title="Eliminar"
                          className="text-[#1a2e1a]/40 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva/editar cotización */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
          <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-2xl p-6 overflow-y-auto max-h-[95vh] shadow-xl rounded-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">
                {isEditMode ? "Editar Cotización" : "Nueva Cotización"}
                {isEditMode && editTarget && <span className="text-[#3a6b1a] text-sm font-dm ml-2">{editTarget.quoteNumber}</span>}
              </h2>
              <button onClick={closeModal} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
            </div>

            {/* Datos del cliente */}
            <div className="bg-[#f4edd8]/50 border border-[#1a2e1a]/8 p-4 rounded-sm mb-4">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-3">Datos del cliente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Nombre *</label>
                  <input type="text" value={form.customerName} placeholder="Nombre completo"
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Email</label>
                  <input type="email" value={form.customerEmail} placeholder="email@ejemplo.com"
                    onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Teléfono</label>
                  <input type="tel" value={form.customerPhone} placeholder="+52 489 000 0000"
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Tours */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm">Tours del paquete</p>
                <button onClick={addLine}
                  className="flex items-center gap-1 text-xs font-dm text-[#3a6b1a] border border-[#3a6b1a]/30 px-2 py-1 hover:bg-[#3a6b1a]/8 transition-colors rounded-sm">
                  <Plus className="w-3 h-3" />Agregar tour
                </button>
              </div>
              <div className="space-y-3">
                {lines.map((line, i) => {
                  const t = TOURS_DB.find(t => t.slug === line.tourSlug);
                  return (
                    <div key={i} className="border border-[#1a2e1a]/10 p-3 rounded-sm bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/40 font-dm">Tour {i + 1}</span>
                        {lines.length > 1 && <button onClick={() => removeLine(i)} className="text-[#1a2e1a]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
                          <select value={line.tourSlug} onChange={e => updateLine(i, "tourSlug", e.target.value)} className={inputCls}>
                            <option value="">Seleccionar...</option>
                            {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
                          <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1" title=">10 años — precio completo">Adultos</label>
                            <input type="number" min={1} max={12} value={line.adults} onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1" title="6-10 años — 30% descuento">Niños 6-10</label>
                            <input type="number" min={0} max={12} value={line.childrenMid} onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1" title="Menores de 6 años — 50% descuento">Niños &lt;6</label>
                            <input type="number" min={0} max={12} value={line.childrenSmall} onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        {t && <div className="sm:col-span-2 text-right text-xs font-dm text-[#c4882a]">Subtotal: {fmx(calcLine(line))}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hospedaje */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm flex items-center gap-1.5">
                  <BedDouble className="w-3 h-3" />Hospedaje (opcional)
                </p>
                <button type="button"
                  onClick={() => setPackages(ps => [...ps, { ...EMPTY_PACKAGE }])}
                  className="flex items-center gap-1 text-xs font-dm text-[#8a6f1e] border border-[#8a6f1e]/30 px-2 py-1 hover:bg-[#8a6f1e]/8 transition-colors rounded-sm">
                  <Plus className="w-3 h-3" />Agregar habitación
                </button>
              </div>
              {packages.length === 0 && (
                <p className="text-[10px] font-dm text-[#1a2e1a]/30 border border-dashed border-[#1a2e1a]/15 rounded-sm py-3 text-center">
                  Sin hospedaje en el paquete
                </p>
              )}
              <div className="space-y-3">
                {packages.map((pkg, i) => (
                  <div key={i} className="border border-[#8a6f1e]/25 p-3 rounded-sm bg-[#faf7ee]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] tracking-[2px] uppercase text-[#8a6f1e]/70 font-dm flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                      </span>
                      <button type="button" onClick={() => setPackages(ps => ps.filter((_, idx) => idx !== i))}
                        className="text-[#1a2e1a]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Hotel</label>
                        <input type="text" value={pkg.hotel} className={inputCls}
                          onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, hotel: e.target.value } : p))} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tipo de habitación</label>
                        <div className="flex gap-2 flex-wrap mb-1.5">
                          {HABITACIONES_PRESET.map(h => (
                            <button key={h.label} type="button"
                              onClick={() => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, habitacion: h.label, precioPorNoche: h.precio, subtotal: calcPackageLine({ ...p, habitacion: h.label, precioPorNoche: h.precio }) } : p))}
                              className={`text-[10px] font-dm px-2.5 py-1 rounded border transition-colors ${pkg.habitacion === h.label ? "bg-[#8a6f1e] text-white border-[#8a6f1e]" : "border-[#8a6f1e]/30 text-[#8a6f1e] hover:bg-[#8a6f1e]/10"}`}>
                              {h.label}
                            </button>
                          ))}
                        </div>
                        <input type="text" value={pkg.habitacion} placeholder="Personalizar..." className={inputCls}
                          onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, habitacion: e.target.value } : p))} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Noches</label>
                          <input type="number" min={1} max={30} value={pkg.noches} className={inputCls}
                            onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, noches: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Habitaciones</label>
                          <input type="number" min={1} max={10} value={pkg.habitaciones} className={inputCls}
                            onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, habitaciones: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">$/noche</label>
                          <input type="number" min={0} value={pkg.precioPorNoche} className={inputCls}
                            onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, precioPorNoche: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Check-in</label>
                          <input type="date" value={pkg.checkin} className={inputCls}
                            onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, checkin: e.target.value } : p))} />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Check-out</label>
                          <input type="date" value={pkg.checkout} className={inputCls}
                            onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, checkout: e.target.value } : p))} />
                        </div>
                      </div>
                      <p className="text-right text-xs font-dm text-[#8a6f1e] font-medium">
                        Subtotal: {fmx(calcPackageLine(pkg))}
                        <span className="text-[#1a2e1a]/35 font-normal ml-1">
                          ({pkg.noches}n × {pkg.habitaciones}hab × {fmx(pkg.precioPorNoche)})
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
              <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>

            {/* Precio editable */}
            <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 rounded-sm mb-3">
              {pkgsTotal > 0 && (
                <div className="flex justify-between text-xs font-dm text-[#1a2e1a]/50 mb-1">
                  <span>Tours</span><span>{fmx(toursTotal)}</span>
                </div>
              )}
              {pkgsTotal > 0 && (
                <div className="flex justify-between text-xs font-dm text-[#8a6f1e] mb-2 pb-2 border-b border-[#c4882a]/20">
                  <span>Hospedaje</span><span>{fmx(pkgsTotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">
                    Subtotal {priceOverride !== "" ? <span className="text-[#c4882a]">(editado)</span> : "(calculado)"}
                  </p>
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[#1a2e1a]/50 font-dm text-sm">$</span>
                      <input type="number" min={0} value={priceOverride}
                        onChange={e => setPriceOverride(e.target.value)}
                        placeholder={String(calcTotal)}
                        className="flex-1 border border-[#c4882a]/50 bg-white text-[#c4882a] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                        autoFocus />
                      <span className="text-[#1a2e1a]/50 font-dm text-sm">MXN</span>
                    </div>
                  ) : (
                    <p className="font-cormorant text-[#c4882a] text-2xl">{fmx(baseTotal)}</p>
                  )}
                  {priceOverride !== "" && (
                    <button onClick={() => { setPriceOverride(""); setEditingPrice(false); }}
                      className="text-[10px] font-dm text-[#1a2e1a]/40 hover:text-[#1a2e1a] mt-1 underline">
                      Restaurar ({fmx(calcTotal)})
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { if (editingPrice) setEditingPrice(false); else { setEditingPrice(true); if (priceOverride === "") setPriceOverride(String(calcTotal)); } }}
                  className="flex items-center gap-1 border border-[#c4882a]/40 text-[#c4882a] px-2.5 py-1.5 text-xs font-dm hover:bg-[#c4882a]/10 transition-colors rounded-sm">
                  {editingPrice ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  {editingPrice ? "OK" : "Editar"}
                </button>
              </div>
            </div>

            {/* Descuento */}
            <div className="border border-[#3a6b1a]/20 bg-[#3a6b1a]/5 px-4 py-3 rounded-sm mb-3">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-3">Descuento (opcional)</p>
              <div className="flex gap-2 items-center">
                {/* Tipo */}
                <div className="flex border border-[#1a2e1a]/15 rounded-sm overflow-hidden">
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${discountType === "percent" ? "bg-[#3a6b1a] text-white" : "bg-white text-[#1a2e1a]/60 hover:bg-[#f4edd8]"}`}>
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType("fixed")}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${discountType === "fixed" ? "bg-[#3a6b1a] text-white" : "bg-white text-[#1a2e1a]/60 hover:bg-[#f4edd8]"}`}>
                    $
                  </button>
                </div>
                {/* Valor */}
                <input
                  type="number" min={0} value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "ej. 10" : "ej. 500"}
                  className={`flex-1 ${inputCls}`}
                />
                {discountValue !== "" && <button onClick={() => setDiscountValue("")} className="text-[#1a2e1a]/30 hover:text-red-500"><X className="w-4 h-4" /></button>}
              </div>
              {discountAmt > 0 && (
                <p className="mt-2 text-xs font-dm text-[#3a6b1a]">
                  Descuento: −{fmx(discountAmt)}
                  {discountType === "percent" && ` (${discountValue}%)`}
                </p>
              )}
            </div>

            {/* Total final */}
            {(discountAmt > 0 || baseTotal > 0) && (
              <div className="border border-[#1a2e1a]/15 bg-[#1a2e1a] px-4 py-3 rounded-sm mb-3 flex justify-between items-center">
                <span className="text-[9px] tracking-[2px] uppercase text-white/50 font-dm">Total final</span>
                <span className="font-cormorant text-[#c4882a] text-2xl">{fmx(finalTotal)}</span>
              </div>
            )}

            <button onClick={saveQuote}
              disabled={saving || !form.customerName || lines.some(l => !l.tourSlug || !l.tourDate)}
              className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
              {saving ? "Guardando..." : isEditMode ? "Actualizar Cotización" : "Guardar Cotización"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
