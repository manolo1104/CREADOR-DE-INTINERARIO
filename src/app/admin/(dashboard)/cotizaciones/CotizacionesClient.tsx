"use client";

import { useState, useMemo } from "react";
import type { TourQuote } from "@prisma/client";
import { Plus, Mail, Download, Trash2, Search, MessageCircle, X } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const STATUS: Record<string, { label: string; cls: string }> = {
  borrador: { label:"Borrador",  cls:"bg-gray-100 text-gray-600" },
  enviada:  { label:"Enviada",   cls:"bg-yellow-100 text-yellow-800" },
  aceptada: { label:"Aceptada",  cls:"bg-green-100 text-green-800" },
  expirada: { label:"Expirada",  cls:"bg-red-100 text-red-700" },
};

const fmx  = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fDateLong = (d: string) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : "—";
const EMPTY = { tourSlug:"",tourDate:"",adults:2,children:0,customerName:"",customerEmail:"",customerPhone:"",notes:"" };

export default function CotizacionesClient({ initialQuotes }: { initialQuotes: TourQuote[] }) {
  const [quotes,  setQuotes]  = useState(initialQuotes);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [sending, setSending] = useState<string|null>(null);
  const [msg,     setMsg]     = useState("");

  const selTour  = TOURS_DB.find(t => t.slug === form.tourSlug);
  const pAdult   = selTour?.precio ?? 0;
  const pChild   = Math.round(pAdult * 0.6);
  const totalAmt = pAdult * form.adults + pChild * form.children;

  async function saveQuote() {
    if (!form.tourSlug||!form.tourDate||!form.customerName||!form.customerEmail) return;
    setSaving(true);
    const r = await fetch("/api/admin/cotizaciones",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ tourName:selTour?.nombre||"", tourSlug:form.tourSlug,
        tourDate:form.tourDate, adults:form.adults, children:form.children, totalAmount:totalAmt,
        customerName:form.customerName, customerEmail:form.customerEmail,
        customerPhone:form.customerPhone, notes:form.notes }),
    });
    if (r.ok) {
      const refreshed = await fetch("/api/admin/cotizaciones");
      setQuotes(await refreshed.json());
      setModal(false); setForm(EMPTY);
      setMsg("✅ Cotización creada"); setTimeout(()=>setMsg(""),3000);
    }
    setSaving(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/cotizaciones/${id}/send-email`,{method:"POST"});
    const data = await r.json();
    if (r.ok) {
      setQuotes(q => q.map(x => x.id===id?{...x,status:"enviada"}:x));
      setMsg("✅ Email enviado");
    } else setMsg(`❌ ${data.error||"Error al enviar"}`);
    setSending(null); setTimeout(()=>setMsg(""),4000);
  }

  async function deleteQ(id: string) {
    if (!confirm("¿Marcar como expirada?")) return;
    await fetch(`/api/admin/cotizaciones/${id}`,{method:"DELETE"});
    setQuotes(q => q.map(x => x.id===id?{...x,status:"expirada"}:x));
  }

  function downloadPDF(q: TourQuote) {
    const win = window.open("","_blank");
    if (!win) return;
    const cap = (s: string) => s.charAt(0).toUpperCase()+s.slice(1);
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Cotización ${q.quoteNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;color:#1a2e1a;background:#fff;padding:40px;max-width:720px;margin:0 auto;font-size:14px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2e1a;padding-bottom:20px;margin-bottom:28px}
  .brand h1{font-size:22px;letter-spacing:4px;text-transform:uppercase;font-weight:400}
  .brand p{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3a6b1a;margin-top:3px;font-family:Arial}
  .cot-num{text-align:right}
  .cot-num .label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}
  .cot-num .value{font-size:22px;color:#1a2e1a}
  .cot-num .valid{font-size:11px;color:#9a8a6a;font-family:Arial;margin-top:3px}
  .section-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:12px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#d4ccbc;border:1px solid #d4ccbc;margin-bottom:20px}
  .cell{background:#faf7ee;padding:14px 16px}
  .cell .cl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}
  .cell .cv{font-size:16px;color:#1a2e1a}
  .total-row{background:#1a2e1a;color:#f4edd8;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .total-row .tl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a;font-family:Arial}
  .total-row .tv{font-size:26px;font-weight:500}
  .includes{border-left:3px solid #c4882a;padding-left:16px;margin-bottom:20px}
  .includes p{font-family:Arial;font-size:12px;color:#3a3a2e;line-height:2.2}
  .notes{background:#f4edd8;border:1px solid #d4ccbc;padding:14px 16px;margin-bottom:20px;font-family:Arial;font-size:13px;color:#3a3a2e}
  .footer{border-top:1px solid #d4ccbc;padding-top:16px;font-family:Arial;font-size:11px;color:#9a8a6a;text-align:center;line-height:1.8}
  @media print{body{padding:20px}@page{margin:1cm}}
</style></head><body>

<div class="header">
  <div class="brand">
    <h1>Tours Huasteca Potosina</h1>
    <p>Xilitla · San Luis Potosí · México</p>
  </div>
  <div class="cot-num">
    <div class="label">Cotización</div>
    <div class="value">${q.quoteNumber}</div>
    <div class="valid">Válida por 7 días · ${new Date().toLocaleDateString("es-MX")}</div>
  </div>
</div>

<div class="section-title">Datos del cliente</div>
<div class="grid-2" style="margin-bottom:20px">
  <div class="cell"><div class="cl">Nombre</div><div class="cv">${q.customerName}</div></div>
  <div class="cell"><div class="cl">Email</div><div class="cv" style="font-size:13px">${q.customerEmail}</div></div>
  ${q.customerPhone ? `<div class="cell"><div class="cl">Teléfono</div><div class="cv">${q.customerPhone}</div></div>` : ""}
</div>

<div class="section-title">Detalles del tour</div>
<div class="grid-2">
  <div class="cell" style="grid-column:1/-1"><div class="cl">Tour</div><div class="cv" style="font-size:18px">${q.tourName}</div></div>
  <div class="cell"><div class="cl">Fecha Solicitada</div><div class="cv">${cap(fDateLong(q.tourDate))}</div></div>
  <div class="cell"><div class="cl">Participantes</div><div class="cv">${q.adults} adulto${q.adults!==1?"s":""}${q.children>0?" · "+q.children+" niño"+(q.children!==1?"s":""):""}</div></div>
</div>

<div class="total-row">
  <span class="tl">Total Cotizado</span>
  <span class="tv">${fmx(q.totalAmount)}</span>
</div>

<div class="section-title">Todo incluido en el precio</div>
<div class="includes">
  <p>✓ Transporte desde tu hotel &nbsp;&nbsp;&nbsp; ✓ Desayuno con platillos típicos</p>
  <p>✓ Entradas a todos los parques &nbsp;&nbsp;&nbsp; ✓ Guía certificado NOM-09 SECTUR</p>
  <p>✓ Equipo de seguridad completo &nbsp;&nbsp;&nbsp; ✓ Fotografías del recorrido</p>
</div>

${q.notes ? `<div class="notes"><strong>Notas:</strong> ${q.notes}</div>` : ""}

<div class="footer">
  Tours Huasteca Potosina · +52 489 125 1458 · hola@huasteca-potosina.com<br>
  Guías certificados NOM-09 SECTUR · www.huasteca-potosina.com<br>
  <em>Cotización válida por 7 días. Precios en pesos mexicanos (MXN).</em>
</div>

</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  function waMsg(q: TourQuote) {
    const ph = (q.customerPhone||"524891251458").replace(/\D/g,"");
    return `https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${q.customerName}, adjuntamos tu cotización *${q.quoteNumber}* para el tour *${q.tourName}* el ${fDate(q.tourDate)}.\n\nTotal: *${fmx(q.totalAmount)}*\n\nIncluyendo: Transporte, guía certificado, entradas y desayuno.\n\n¿Tienes alguna duda? Estamos para ayudarte 🌿`)}`;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter(c => !q || [c.customerName,c.customerEmail,c.quoteNumber,c.tourName].some(v => v?.toLowerCase().includes(q)));
  }, [quotes, search]);

  const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1a2e1a] text-2xl font-light">Cotizaciones</h1>
          <p className="text-[#1a2e1a]/50 font-dm text-sm mt-1">{quotes.length} cotizaciones · {quotes.filter(q=>q.status==="aceptada").length} aceptadas</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-4 py-2.5 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
          <Plus className="w-4 h-4" />Nueva Cotización
        </button>
      </div>

      {msg && <div className={`mb-4 text-sm font-dm px-4 py-2 rounded border ${msg.startsWith("✅")?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}

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
                {["Número","Cliente","Tour","Fecha","Total","Estado","Acciones"].map(h => (
                  <th key={h} className={`py-3 px-4 text-left font-dm ${h==="Total"?"text-right":""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={7} className="py-12 text-center text-[#1a2e1a]/30 font-dm">Sin cotizaciones</td></tr>}
              {filtered.map(q => {
                const s = STATUS[q.status] || { label:q.status, cls:"bg-gray-100 text-gray-600" };
                return (
                  <tr key={q.id} className="border-b border-[#1a2e1a]/6 hover:bg-[#f4edd8]/50 transition-colors">
                    <td className="py-3 px-4 text-[#3a6b1a] font-mono text-xs font-medium">{q.quoteNumber}</td>
                    <td className="py-3 px-4"><p className="text-[#1a2e1a] font-medium">{q.customerName}</p><p className="text-[#1a2e1a]/40 text-xs">{q.customerEmail}</p></td>
                    <td className="py-3 px-4 text-[#1a2e1a]/70 max-w-[140px] truncate">{q.tourName}</td>
                    <td className="py-3 px-4 text-[#1a2e1a]/60 whitespace-nowrap">{fDate(q.tourDate)}</td>
                    <td className="py-3 px-4 text-right text-[#c4882a] font-medium whitespace-nowrap">{fmx(q.totalAmount)}</td>
                    <td className="py-3 px-4"><span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${s.cls}`}>{s.label}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => sendEmail(q.id)} disabled={sending===q.id} title="Enviar email"
                          className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors disabled:opacity-25">
                          <Mail className="w-4 h-4" />
                        </button>
                        <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          className="text-[#1a2e1a]/40 hover:text-[#25D366] transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <button onClick={() => downloadPDF(q)} title="Descargar PDF"
                          className="text-[#1a2e1a]/40 hover:text-[#c4882a] transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQ(q.id)} title="Expirar"
                          className="text-[#1a2e1a]/40 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setModal(false)} />
          <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] shadow-xl rounded-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">Nueva Cotización</h2>
              <button onClick={() => setModal(false)} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[{l:"Cliente *",k:"customerName",t:"text",p:"Nombre completo"},{l:"Email *",k:"customerEmail",t:"email",p:"email@ejemplo.com"},{l:"Teléfono",k:"customerPhone",t:"tel",p:"+52 489 000 0000"}].map(({l,k,t,p}) => (
                <div key={k}>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{l}</label>
                  <input type={t} value={(form as any)[k]} placeholder={p} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
                <select value={form.tourSlug} onChange={e => setForm(f => ({...f,tourSlug:e.target.value}))}
                  className={inputCls}>
                  <option value="">Seleccionar tour...</option>
                  {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre} — {fmx(t.precio)}/persona</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha del tour *</label>
                <input type="date" value={form.tourDate} onChange={e => setForm(f => ({...f,tourDate:e.target.value}))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{l:"Adultos",k:"adults",min:1},{l:"Niños (60%)",k:"children",min:0}].map(({l,k,min}) => (
                  <div key={k}>
                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">{l}</label>
                    <input type="number" min={min} max={12} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:Number(e.target.value)}))} className={inputCls} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
                <textarea value={form.notes} rows={2} onChange={e => setForm(f => ({...f,notes:e.target.value}))} className={`${inputCls} resize-none`} />
              </div>
              {totalAmt > 0 && (
                <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 flex justify-between items-center rounded-sm">
                  <span className="text-[#1a2e1a]/60 font-dm text-sm">Total cotizado</span>
                  <span className="font-cormorant text-[#c4882a] text-xl">{fmx(totalAmt)}</span>
                </div>
              )}
              <button onClick={saveQuote} disabled={saving||!form.tourSlug||!form.tourDate||!form.customerName||!form.customerEmail}
                className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm mt-1">
                {saving?"Guardando...":"Guardar Cotización"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
