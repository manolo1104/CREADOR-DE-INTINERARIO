"use client";

import { useState } from "react";
import { X, Plus, Check, Pencil } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export interface LineItem {
  tourSlug: string;
  tourName: string;
  tourDate: string;
  adults:   number;
  children: number;
  subtotal: number;
}

export interface ReservaFormState {
  customerName:  string;
  customerEmail: string;
  customerPhone: string;
  notes:         string;
  lines:         LineItem[];
  totalOverride: string;   // "" = usa calculado
  depositoPagado: string;
}

export const EMPTY_LINE: LineItem = { tourSlug: "", tourName: "", tourDate: "", adults: 2, children: 0, subtotal: 0 };
export const EMPTY_RESERVA_FORM: ReservaFormState = {
  customerName: "", customerEmail: "", customerPhone: "", notes: "",
  lines: [{ ...EMPTY_LINE }], totalOverride: "", depositoPagado: "",
};

function calcLine(l: LineItem): number {
  const t = TOURS_DB.find(t => t.slug === l.tourSlug);
  if (!t) return 0;
  return t.precio * l.adults + Math.round(t.precio * 0.6) * l.children;
}

interface Props {
  title:    string;
  form:     ReservaFormState;
  setForm:  (f: ReservaFormState | ((p: ReservaFormState) => ReservaFormState)) => void;
  onSave:   () => void;
  onClose:  () => void;
  saving:   boolean;
}

export function ReservaModal({ title, form, setForm, onSave, onClose, saving }: Props) {
  const [editingTotal, setEditingTotal] = useState(false);

  const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

  const calcTotal  = form.lines.reduce((s, l) => s + calcLine(l), 0);
  const finalTotal = form.totalOverride !== "" ? Number(form.totalOverride) || 0 : calcTotal;
  const deposito   = Number(form.depositoPagado) || 0;
  const pendiente  = Math.max(0, finalTotal - deposito);

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, idx) => {
        if (idx !== i) return l;
        const up = { ...l, [field]: val };
        if (field === "tourSlug") {
          const t = TOURS_DB.find(t => t.slug === val);
          up.tourName = t?.nombre || "";
        }
        up.subtotal = calcLine(up);
        return up;
      }),
      // reset override when lines change
      totalOverride: "",
    }));
  }

  const canSave = !saving && !!form.customerName && form.lines.every(l => !!l.tourSlug && !!l.tourDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-xl p-6 overflow-y-auto max-h-[95vh] shadow-xl rounded-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">{title}</h2>
          <button onClick={onClose} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {/* Cliente */}
          <div className="bg-[#f4edd8]/50 border border-[#1a2e1a]/8 p-4 rounded-sm">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-3">Datos del cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
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

          {/* Tours (multi-línea) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm">Tours</p>
              <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))}
                className="flex items-center gap-1 text-xs font-dm text-[#3a6b1a] border border-[#3a6b1a]/30 px-2 py-1 hover:bg-[#3a6b1a]/8 transition-colors rounded-sm">
                <Plus className="w-3 h-3" />Agregar tour
              </button>
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="border border-[#1a2e1a]/10 p-3 rounded-sm bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/40 font-dm">Tour {i + 1}</span>
                    {form.lines.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))}
                        className="text-[#1a2e1a]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
                      <select value={line.tourSlug} onChange={e => updateLine(i, "tourSlug", e.target.value)} className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
                        <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Adultos</label>
                        <input type="number" min={1} max={12} value={line.adults}
                          onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Niños</label>
                        <input type="number" min={0} max={12} value={line.children}
                          onChange={e => updateLine(i, "children", Number(e.target.value))} className={inputCls} />
                      </div>
                    </div>
                    {line.tourSlug && (
                      <p className="text-right text-xs font-dm text-[#c4882a]">Subtotal: {fmx(calcLine(line))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
            <textarea value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Total editable */}
          <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 rounded-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">
                  Total estimado {form.totalOverride !== "" && <span className="text-[#c4882a]">(editado)</span>}
                </p>
                {editingTotal ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[#1a2e1a]/50 font-dm text-sm">$</span>
                    <input type="number" min={0} value={form.totalOverride}
                      onChange={e => setForm(f => ({ ...f, totalOverride: e.target.value }))}
                      placeholder={String(calcTotal)}
                      className="flex-1 border border-[#c4882a]/50 bg-white text-[#c4882a] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                      autoFocus />
                    <span className="text-[#1a2e1a]/50 font-dm text-sm">MXN</span>
                  </div>
                ) : (
                  <p className="font-cormorant text-[#c4882a] text-2xl">{fmx(finalTotal)}</p>
                )}
                {form.totalOverride !== "" && (
                  <button onClick={() => { setForm(f => ({ ...f, totalOverride: "" })); setEditingTotal(false); }}
                    className="text-[10px] font-dm text-[#1a2e1a]/40 hover:text-[#1a2e1a] mt-1 underline">
                    Restaurar cálculo automático ({fmx(calcTotal)})
                  </button>
                )}
              </div>
              <button
                onClick={() => { if (editingTotal) setEditingTotal(false); else { setEditingTotal(true); if (form.totalOverride === "") setForm(f => ({ ...f, totalOverride: String(calcTotal) })); } }}
                className="flex items-center gap-1 border border-[#c4882a]/40 text-[#c4882a] px-2.5 py-1.5 text-xs font-dm hover:bg-[#c4882a]/10 transition-colors rounded-sm">
                {editingTotal ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                {editingTotal ? "OK" : "Editar"}
              </button>
            </div>
          </div>

          {/* Anticipo / Pendiente */}
          <div className="border border-[#1a2e1a]/10 bg-[#f4edd8]/40 px-4 py-3 rounded-sm">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-3">Pago</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Anticipo recibido</label>
                <div className="flex items-center gap-1">
                  <span className="text-[#1a2e1a]/40 font-dm text-sm">$</span>
                  <input type="number" min={0} value={form.depositoPagado}
                    onChange={e => setForm(f => ({ ...f, depositoPagado: e.target.value }))}
                    placeholder="0"
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Pendiente día del tour</label>
                <p className={`font-cormorant text-xl pt-2 ${pendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                  {fmx(pendiente)}
                </p>
              </div>
            </div>
          </div>

          <button onClick={onSave} disabled={!canSave}
            className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm mt-1">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
