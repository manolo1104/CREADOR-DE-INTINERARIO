"use client";

import { useState, useMemo } from "react";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Trash2, Plus, Download, Pencil } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { ReservaModal, EMPTY_RESERVA_FORM, type ReservaFormState, type LineItem, type PackageItem, calcTourLine, calcPackageLine } from "@/components/admin/ReservaModal";

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

function calcLine(l: LineItem): number { return calcTourLine(l); }

export default function ReservasClient({ initialBookings }: { initialBookings: TourBooking[] }) {
  const [bookings,   setBookings]   = useState(initialBookings);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [sending,    setSending]    = useState<string | null>(null);
  const [msg,        setMsg]        = useState("");
  const [modal,      setModal]      = useState<"new" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<TourBooking | null>(null);
  const [form,       setForm]       = useState<ReservaFormState>(EMPTY_RESERVA_FORM);
  const [saving,     setSaving]     = useState(false);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 4000); }

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
    flash(r.ok ? "✅ Email enviado al cliente" : `❌ ${d.error || "Error"}`);
    setSending(null);
  }

  async function hardDelete(id: string) {
    if (!confirm("¿Eliminar completamente esta reserva? No se puede deshacer.")) return;
    await fetch(`/api/admin/reservas/${id}`, { method: "DELETE" });
    setBookings(b => b.filter(x => x.id !== id));
    flash("✅ Reserva eliminada");
  }

  function openEdit(b: TourBooking) {
    setEditTarget(b);
    const storedLines = (b as any).lineItems as any[] | null;
    const lines: LineItem[] = storedLines?.length
      ? storedLines.map(l => ({
          ...l,
          childrenMid:   l.childrenMid   ?? (l.children ?? 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];
    const storedPkgs = (b as any).packageItems as PackageItem[] | null;

    setForm({
      customerName:   b.customerName,
      customerEmail:  b.customerEmail,
      customerPhone:  b.customerPhone || "",
      notes:          b.notes || "",
      lines,
      packages:       storedPkgs ?? [],
      totalOverride:  "",
      depositoPagado: String((b as any).depositoPagado ?? 0),
    });
    setModal("edit");
  }

  function buildPayload(form: ReservaFormState) {
    const lineItems    = form.lines.map(l => ({ ...l, subtotal: calcLine(l) }));
    const packageItems = form.packages.map(p => ({ ...p, subtotal: calcPackageLine(p) }));
    const toursTotal   = lineItems.reduce((s, l) => s + l.subtotal, 0);
    const pkgsTotal    = packageItems.reduce((s, p) => s + p.subtotal, 0);
    const calcTotal    = toursTotal + pkgsTotal;
    const totalAmount  = form.totalOverride !== "" ? Number(form.totalOverride) || calcTotal : calcTotal;
    const primaryLine  = form.lines[0];
    const tourNames    = form.lines.map(l => l.tourName).filter(Boolean).join(" + ");
    return {
      tourId:         primaryLine.tourSlug,
      tourName:       tourNames || TOURS_DB.find(t => t.slug === primaryLine.tourSlug)?.nombre || "",
      tourSlug:       primaryLine.tourSlug,
      tourDate:       primaryLine.tourDate,
      adults:         form.lines.reduce((s, l) => s + l.adults, 0),
      children:       form.lines.reduce((s, l) => s + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0), 0),
      totalAmount,
      lineItems,
      packageItems,
      depositoPagado: Number(form.depositoPagado) || 0,
      customerName:   form.customerName,
      customerEmail:  form.customerEmail,
      customerPhone:  form.customerPhone,
      notes:          form.notes,
    };
  }

  async function saveNew() {
    if (!form.customerName || form.lines.some(l => !l.tourSlug || !l.tourDate)) return;
    setSaving(true);
    const confirmationNumber = "HP-M-" + Date.now().toString(36).toUpperCase();
    const r = await fetch("/api/admin/reservas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationNumber, status: "paid", ...buildPayload(form) }),
    });
    if (r.ok) { await refresh(); setModal(null); setForm(EMPTY_RESERVA_FORM); flash("✅ Reserva creada"); }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    const r = await fetch(`/api/admin/reservas/${editTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
    });
    if (r.ok) {
      await refresh();
      setModal(null); setEditTarget(null); flash("✅ Reserva actualizada");
    }
    setSaving(false);
  }

  function downloadPDF(b: TourBooking) {
    const win = window.open("", "_blank");
    if (!win) return;
    const storedLines = (b as any).lineItems as any[] | null;
    const lines: LineItem[] = storedLines?.length
      ? storedLines.map((l: any) => ({
          ...l,
          childrenMid:   l.childrenMid   ?? (l.children ?? 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];
    const pkgs: PackageItem[] = (b as any).packageItems ?? [];

    const deposito = (b as any).depositoPagado ?? 0;
    const pendiente = Math.max(0, b.totalAmount - deposito);

    const tourSections = lines.map(l => {
      const t = TOURS_DB.find(t => t.slug === l.tourSlug);
      const heroUrl = t?.imagen_hero?.startsWith("http") ? t.imagen_hero : t?.imagen_hero ? `https://www.huasteca-potosina.com${t.imagen_hero}` : "";
      const destinos = t?.destinos?.map(d => `<li>→ ${d}</li>`).join("") || "";
      return `
        <div style="margin-bottom:18px">
          ${heroUrl ? `<img src="${heroUrl}" alt="${l.tourName}" style="width:100%;height:140px;object-fit:cover;border-radius:2px;margin-bottom:8px"/>` : ""}
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px">${l.tourName}</div>
          <div style="font-family:Arial;font-size:12px;color:#3a3a2e">📅 ${fDateL(l.tourDate)} · ${l.adults} adulto${l.adults!==1?"s":""}${(l.childrenMid??0)>0?` · ${l.childrenMid} niño${l.childrenMid!==1?"s":""} (6-10)`:""}${(l.childrenSmall??0)>0?` · ${l.childrenSmall} niño${l.childrenSmall!==1?"s":""} (<6)`:""}</div>
          ${destinos ? `<ul style="list-style:none;font-family:Arial;font-size:12px;color:#3a3a2e;line-height:1.9;margin-top:6px">${destinos}</ul>` : ""}
        </div>`;
    }).join("<hr style='border:none;border-top:1px dashed #d4ccbc;margin:12px 0'/>");

    const pkgSection = pkgs.length > 0 ? `
      <hr style="border:none;border-top:1px dashed #d4ccbc;margin:16px 0"/>
      <div class="sl" style="margin-bottom:14px">Hospedaje incluido</div>
      ${pkgs.map(p => `
        <div style="margin-bottom:14px;padding:12px 14px;background:#faf7ee;border:1px solid #e0d8c4;border-radius:2px">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:6px">🏨 ${p.hotel}</div>
          <div style="font-family:Arial;font-size:13px;color:#1a2e1a;font-weight:600;margin-bottom:4px">${p.habitacion}</div>
          <div style="font-family:Arial;font-size:12px;color:#3a3a2e">
            ${p.checkin ? `Check-in: ${fDate(p.checkin)} · ` : ""}Check-out: ${p.checkout ? fDate(p.checkout) : "—"}
          </div>
          <div style="font-family:Arial;font-size:12px;color:#3a3a2e;margin-top:2px">
            ${p.noches} noche${p.noches !== 1 ? "s" : ""} · ${p.habitaciones} habitación${p.habitaciones !== 1 ? "es" : ""} · $${p.precioPorNoche.toLocaleString("es-MX")} MXN/noche
          </div>
          <div style="text-align:right;font-family:Arial;font-size:12px;color:#8a6f1e;font-weight:600;margin-top:4px">$${calcPackageLine(p).toLocaleString("es-MX")} MXN</div>
        </div>`).join("")}` : "";

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Confirmación ${b.confirmationNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1a2e1a;padding:40px;max-width:720px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2e1a;padding-bottom:20px;margin-bottom:24px}
.brand h1{font-size:20px;letter-spacing:4px;text-transform:uppercase;font-weight:400}.brand p{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#3a6b1a;margin-top:4px;font-family:Arial}
.conf-box{text-align:right}.conf-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}.conf-num{font-size:20px}.conf-status{font-size:11px;color:#3a6b1a;font-family:Arial;margin-top:3px;font-weight:600}
.sl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#d4ccbc;border:1px solid #d4ccbc;margin-bottom:20px}
.cell{background:#faf7ee;padding:12px 14px}.cl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7a5a;font-family:Arial;margin-bottom:4px}.cv{font-size:14px}
.total-row{background:#1a2e1a;color:#f4edd8;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.total-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a;font-family:Arial}.total-value{font-size:22px;font-weight:600}
.pago-row{display:flex;justify-content:space-between;padding:8px 20px;font-family:Arial;font-size:12px;margin-bottom:4px}
.includes{border-left:3px solid #3a6b1a;padding-left:14px;margin:16px 0}.includes p{font-family:Arial;font-size:12px;color:#3a3a2e;line-height:2.1}
.footer{border-top:1px solid #d4ccbc;padding-top:14px;font-family:Arial;font-size:11px;color:#9a8a6a;text-align:center;line-height:1.7}
@media print{body{padding:20px}@page{margin:1cm}}</style></head><body>
<div class="header">
  <div class="brand"><h1>Tours Huasteca Potosina</h1><p>Xilitla · San Luis Potosí · México</p></div>
  <div class="conf-box"><div class="conf-label">Confirmación de Reserva</div><div class="conf-num">${b.confirmationNumber}</div><div class="conf-status">✓ ${STATUS_LABEL[b.status] || b.status}</div></div>
</div>
<div class="sl">Datos del cliente</div>
<div class="grid" style="margin-bottom:20px">
  <div class="cell"><div class="cl">Nombre</div><div class="cv">${b.customerName}</div></div>
  <div class="cell"><div class="cl">Email</div><div class="cv" style="font-size:12px">${b.customerEmail || "—"}</div></div>
  <div class="cell"><div class="cl">Teléfono</div><div class="cv">${b.customerPhone || "—"}</div></div>
  <div class="cell"><div class="cl">Fecha de reserva</div><div class="cv" style="font-size:12px">${new Date(b.createdAt).toLocaleDateString("es-MX")}</div></div>
</div>
<div class="sl" style="margin-bottom:14px">Tours del recorrido</div>
${tourSections}
${pkgSection}
<div class="total-row"><span class="total-label">Total</span><span class="total-value">${fmx(b.totalAmount)}</span></div>
${deposito > 0 ? `<div class="pago-row" style="background:#f0fff4;border:1px solid #c6f6d5"><span style="color:#3a6b1a;font-weight:600">✓ Anticipo pagado</span><span style="color:#3a6b1a;font-weight:600">${fmx(deposito)}</span></div><div class="pago-row" style="background:#fffbeb;border:1px solid #fef3c7"><span style="color:#b45309">Pendiente el día del tour</span><span style="color:#b45309;font-weight:600">${fmx(pendiente)}</span></div>` : ""}
<div class="includes" style="margin-top:16px"><p>✓ Transporte desde tu hotel &nbsp; ✓ Desayuno típico &nbsp; ✓ Entradas &nbsp; ✓ Guía NOM-09 &nbsp; ✓ Equipo de seguridad &nbsp; ✓ Fotografías</p></div>
${b.notes ? `<p style="font-family:Arial;font-size:12px;color:#3a3a2e;margin:14px 0"><strong>Notas:</strong> ${b.notes}</p>` : ""}
<div class="footer">Tours Huasteca Potosina · +52 489 125 1458 · hola@huasteca-potosina.com · Guías NOM-09 SECTUR</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => !q || [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName].some(v => v?.toLowerCase().includes(q)));
  }, [bookings, search]);

  const totalIngresos = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.totalAmount, 0);

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
          <button onClick={() => { setForm(EMPTY_RESERVA_FORM); setModal("new"); }}
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
                {["Confirmación","Cliente","Tour","Fecha","Personas","Total","Anticipo","Estado","Acciones"].map(h => (
                  <th key={h} className="py-3 px-3 text-left font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-[#1a2e1a]/30 font-dm">Sin resultados</td></tr>}
              {filtered.map(b => {
                const deposito = (b as any).depositoPagado ?? 0;
                const pendiente = Math.max(0, b.totalAmount - deposito);
                return (
                  <tr key={b.id} className="border-b border-[#1a2e1a]/6 hover:bg-[#f4edd8]/50 transition-colors">
                    <td className="py-3 px-3 text-[#3a6b1a] font-mono text-xs font-medium">{b.confirmationNumber}</td>
                    <td className="py-3 px-3"><p className="text-[#1a2e1a] font-medium">{b.customerName}</p><p className="text-[#1a2e1a]/40 text-xs">{b.customerEmail}</p></td>
                    <td className="py-3 px-3 text-[#1a2e1a]/70 max-w-[140px] truncate text-xs">{b.tourName}</td>
                    <td className="py-3 px-3 text-[#1a2e1a]/70 whitespace-nowrap text-xs">{fDate(b.tourDate)}</td>
                    <td className="py-3 px-3 text-[#1a2e1a]/70 text-xs">{b.adults}A{b.children > 0 ? ` · ${b.children}N` : ""}</td>
                    <td className="py-3 px-3 text-[#c4882a] font-medium whitespace-nowrap text-xs">{fmx(b.totalAmount)}</td>
                    <td className="py-3 px-3 text-xs">
                      {deposito > 0 ? (
                        <div>
                          <p className="text-green-700 font-medium">{fmx(deposito)}</p>
                          {pendiente > 0 && <p className="text-orange-600 text-[10px]">Pend: {fmx(pendiente)}</p>}
                        </div>
                      ) : <span className="text-[#1a2e1a]/30">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => sendEmail(b.id)} disabled={sending === b.id} title="Enviar email"
                          className="text-[#1a2e1a]/40 hover:text-[#3a6b1a] transition-colors disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                        <button onClick={() => downloadPDF(b)} title="Descargar PDF"
                          className="text-[#1a2e1a]/40 hover:text-[#c4882a] transition-colors"><Download className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(b)} title="Editar"
                          className="text-[#1a2e1a]/40 hover:text-[#1a2e1a] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => hardDelete(b.id)} title="Eliminar"
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

      {modal === "new" && (
        <ReservaModal title="Nueva Reserva Manual" form={form} setForm={setForm}
          onSave={saveNew} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal === "edit" && (
        <ReservaModal title="Editar Reserva" form={form} setForm={setForm}
          onSave={saveEdit} onClose={() => { setModal(null); setEditTarget(null); }} saving={saving} />
      )}
    </div>
  );
}
