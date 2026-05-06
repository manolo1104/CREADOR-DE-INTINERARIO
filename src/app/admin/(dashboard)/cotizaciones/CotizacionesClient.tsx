"use client";

import { useState, useMemo } from "react";
import type { TourQuote } from "@prisma/client";
import { Plus, Mail, Download, Trash2, Search, MessageCircle, X } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const STATUS_STYLE: Record<string, string> = {
  borrador:  "bg-white/10 text-crema/50",
  enviada:   "bg-dorado/20 text-dorado",
  aceptada:  "bg-verde-selva/20 text-verde-vivo",
  expirada:  "bg-terracota/20 text-terracota",
};

function formatMXN(n: number) { return `$${n.toLocaleString("es-MX")}`; }
function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_FORM = {
  tourSlug: "", tourDate: "", adults: 2, children: 0,
  customerName: "", customerEmail: "", customerPhone: "", notes: "",
};

export default function CotizacionesClient({ initialQuotes }: { initialQuotes: TourQuote[] }) {
  const [quotes,  setQuotes]  = useState(initialQuotes);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [msg,     setMsg]     = useState("");

  const selectedTour = TOURS_DB.find(t => t.slug === form.tourSlug);
  const priceAdult   = selectedTour?.precio ?? 0;
  const priceChild   = Math.round(priceAdult * 0.6);
  const totalAmount  = priceAdult * form.adults + priceChild * form.children;

  async function saveQuote() {
    if (!form.tourSlug || !form.tourDate || !form.customerName || !form.customerEmail) return;
    setSaving(true);
    const res = await fetch("/api/admin/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourName: selectedTour?.nombre || "", tourSlug: form.tourSlug,
        tourDate: form.tourDate, adults: form.adults, children: form.children,
        totalAmount, customerName: form.customerName,
        customerEmail: form.customerEmail, customerPhone: form.customerPhone,
        notes: form.notes,
      }),
    });
    if (res.ok) {
      const refreshed = await fetch("/api/admin/cotizaciones");
      setQuotes(await refreshed.json());
      setModal(false);
      setForm(EMPTY_FORM);
      setMsg("✅ Cotización creada");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const res = await fetch(`/api/admin/cotizaciones/${id}/send-email`, { method: "POST" });
    if (res.ok) {
      setQuotes(q => q.map(x => x.id === id ? { ...x, status: "enviada" } : x));
      setMsg("✅ Email de cotización enviado");
    } else setMsg("❌ Error al enviar");
    setSending(null);
    setTimeout(() => setMsg(""), 3000);
  }

  async function deleteQuote(id: string) {
    if (!confirm("¿Marcar como expirada?")) return;
    await fetch(`/api/admin/cotizaciones/${id}`, { method: "DELETE" });
    setQuotes(q => q.map(x => x.id === id ? { ...x, status: "expirada" } : x));
  }

  function downloadPDF(q: TourQuote) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Cotización ${q.quoteNumber}</title>
<style>
  body{font-family:Georgia,serif;margin:40px;color:#1a2e1a;max-width:680px}
  h1{font-size:28px;font-weight:300;margin:0 0 4px}
  .sub{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;margin-bottom:32px}
  .num{border:1px solid #c4882a;padding:18px 24px;margin-bottom:24px}
  .num-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;margin-bottom:4px;font-family:Arial}
  .num-val{font-size:24px;color:#1a2e1a}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .cell{border:1px solid #d4ccbc;padding:14px}
  .cell-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;margin-bottom:4px;font-family:Arial}
  .cell-val{font-size:17px;color:#1a2e1a}
  .total{background:#1a2e1a;color:#f4edd8;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
  .inc{border-left:2px solid #c4882a;padding-left:16px;margin-bottom:24px;font-family:Arial;font-size:13px;color:#3a3a2e;line-height:2}
  .footer{margin-top:40px;text-align:center;font-family:Arial;font-size:11px;color:#9a8a6a;border-top:1px solid #d4ccbc;padding-top:20px}
  @media print{body{margin:20px}}
</style></head><body>
<h1>Cotización de Tour</h1>
<p class="sub">Tours Huasteca Potosina · ${new Date().toLocaleDateString("es-MX")}</p>
<div class="num">
  <div class="num-label">Número de Cotización</div>
  <div class="num-val">${q.quoteNumber}</div>
  <div style="font-family:Arial;font-size:11px;color:#9a8a6a;margin-top:4px">Válida por 7 días</div>
</div>
<div class="grid">
  <div class="cell"><div class="cell-label">Cliente</div><div class="cell-val">${q.customerName}</div></div>
  <div class="cell"><div class="cell-label">Email</div><div class="cell-val" style="font-size:13px">${q.customerEmail}</div></div>
  <div class="cell"><div class="cell-label">Tour</div><div class="cell-val" style="font-size:14px">${q.tourName}</div></div>
  <div class="cell"><div class="cell-label">Fecha</div><div class="cell-val">${formatDate(q.tourDate)}</div></div>
  <div class="cell"><div class="cell-label">Participantes</div><div class="cell-val">${q.adults} adulto${q.adults!==1?"s":""} ${q.children>0?`· ${q.children} niño${q.children!==1?"s":""}`:""}` +
  `</div></div>
  ${q.customerPhone ? `<div class="cell"><div class="cell-label">Teléfono</div><div class="cell-val">${q.customerPhone}</div></div>` : ""}
</div>
<div class="total">
  <span style="font-family:Arial;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Total Cotizado</span>
  <span style="font-size:26px;font-weight:500">$${q.totalAmount.toLocaleString("es-MX")} MXN</span>
</div>
<div class="inc">
  ✓ Transporte desde tu hotel &nbsp;&nbsp; ✓ Desayuno con platillos típicos<br>
  ✓ Entradas a todos los parques &nbsp;&nbsp; ✓ Guía certificado NOM-09 SECTUR<br>
  ✓ Equipo de seguridad &nbsp;&nbsp; ✓ Fotografías del recorrido
</div>
${q.notes ? `<p style="font-family:Arial;font-size:13px;color:#3a3a2e"><strong>Notas:</strong> ${q.notes}</p>` : ""}
<div class="footer">Tours Huasteca Potosina · Xilitla, San Luis Potosí · +52 489 125 1458<br>
Guías certificados NOM-09 SECTUR · huasteca-potosina.com</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  const waMsg = (q: TourQuote) =>
    `https://wa.me/${(q.customerPhone || "524891251458").replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${q.customerName}, te compartimos tu cotización ${q.quoteNumber} para el tour "${q.tourName}" el ${formatDate(q.tourDate)} — Total: $${q.totalAmount.toLocaleString("es-MX")} MXN. ¿Tienes alguna duda?`)}`;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter(c =>
      !q || [c.customerName, c.customerEmail, c.quoteNumber, c.tourName]
        .some(v => v?.toLowerCase().includes(q))
    );
  }, [quotes, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-crema text-2xl">Cotizaciones</h1>
          <p className="text-crema/50 font-dm text-sm mt-1">{quotes.length} cotizaciones · {quotes.filter(q => q.status === "aceptada").length} aceptadas</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-dorado hover:bg-terracota text-negro px-4 py-2.5 text-xs font-dm uppercase tracking-[1px] transition-colors font-medium">
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </button>
      </div>

      {msg && <div className="mb-4 text-sm font-dm text-verde-vivo bg-verde-selva/10 border border-verde-selva/20 px-4 py-2">{msg}</div>}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crema/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, tour o número..."
          className="w-full bg-negro/50 border border-white/10 text-crema font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-verde-vivo placeholder:text-crema/25"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-white/10 text-crema/40 text-[10px] tracking-[1.5px] uppercase">
              <th className="text-left py-3 pr-4">Número</th>
              <th className="text-left py-3 pr-4">Cliente</th>
              <th className="text-left py-3 pr-4">Tour</th>
              <th className="text-left py-3 pr-4">Fecha</th>
              <th className="text-right py-3 pr-4">Total</th>
              <th className="text-left py-3 pr-4">Estado</th>
              <th className="text-center py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-crema/30 font-dm">Sin cotizaciones</td></tr>
            )}
            {filtered.map(q => (
              <tr key={q.id} className="border-b border-white/6 hover:bg-white/3 transition-colors">
                <td className="py-3 pr-4 text-verde-vivo font-mono text-xs">{q.quoteNumber}</td>
                <td className="py-3 pr-4">
                  <p className="text-crema">{q.customerName}</p>
                  <p className="text-crema/40 text-xs">{q.customerEmail}</p>
                </td>
                <td className="py-3 pr-4 text-crema/70 max-w-[140px] truncate">{q.tourName}</td>
                <td className="py-3 pr-4 text-crema/60">{formatDate(q.tourDate)}</td>
                <td className="py-3 pr-4 text-right text-dorado font-medium">{formatMXN(q.totalAmount)}</td>
                <td className="py-3 pr-4">
                  <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 ${STATUS_STYLE[q.status] || "bg-white/10 text-crema/50"}`}>
                    {q.status}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => sendEmail(q.id)} disabled={sending === q.id}
                      title="Enviar email" className="text-crema/40 hover:text-verde-vivo transition-colors disabled:opacity-25">
                      <Mail className="w-4 h-4" />
                    </button>
                    <a href={waMsg(q)} target="_blank" rel="noopener noreferrer"
                      title="WhatsApp" className="text-crema/40 hover:text-[#25D366] transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <button onClick={() => downloadPDF(q)} title="Descargar PDF"
                      className="text-crema/40 hover:text-dorado transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteQuote(q.id)} title="Marcar expirada"
                      className="text-crema/40 hover:text-terracota transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nueva cotización */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-negro/80" onClick={() => setModal(false)} />
          <div className="relative bg-negro border border-white/15 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-crema text-xl">Nueva Cotización</h2>
              <button onClick={() => setModal(false)} className="text-crema/40 hover:text-crema">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Cliente *", key: "customerName", type: "text", placeholder: "Nombre completo" },
                { label: "Email *", key: "customerEmail", type: "email", placeholder: "email@ejemplo.com" },
                { label: "Teléfono", key: "customerPhone", type: "tel", placeholder: "+52 489 000 0000" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-verde-vivo placeholder:text-crema/20"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">Tour *</label>
                <select value={form.tourSlug} onChange={e => setForm(f => ({ ...f, tourSlug: e.target.value }))}
                  className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-verde-vivo">
                  <option value="">Seleccionar tour...</option>
                  {TOURS_DB.map(t => (
                    <option key={t.slug} value={t.slug}>{t.nombre} — {formatMXN(t.precio)}/persona</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">Fecha del tour *</label>
                <input type="date" value={form.tourDate} onChange={e => setForm(f => ({ ...f, tourDate: e.target.value }))}
                  className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-verde-vivo [color-scheme:dark]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">Adultos</label>
                  <input type="number" min={1} max={12} value={form.adults}
                    onChange={e => setForm(f => ({ ...f, adults: Number(e.target.value) }))}
                    className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-verde-vivo"
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">Niños (60%)</label>
                  <input type="number" min={0} max={12} value={form.children}
                    onChange={e => setForm(f => ({ ...f, children: Number(e.target.value) }))}
                    className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-verde-vivo"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-1">Notas</label>
                <textarea value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-negro/60 border border-white/10 text-crema font-dm text-sm px-3 py-2 focus:outline-none focus:border-verde-vivo resize-none"
                />
              </div>

              {totalAmount > 0 && (
                <div className="border border-dorado/30 bg-dorado/8 px-4 py-3 flex justify-between items-center">
                  <span className="text-crema/60 font-dm text-sm">Total cotizado</span>
                  <span className="font-cormorant text-dorado text-xl">{formatMXN(totalAmount)} MXN</span>
                </div>
              )}

              <button onClick={saveQuote} disabled={saving || !form.tourSlug || !form.tourDate || !form.customerName || !form.customerEmail}
                className="w-full bg-verde-selva hover:bg-verde-vivo text-crema py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 mt-2">
                {saving ? "Guardando..." : "Guardar Cotización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
