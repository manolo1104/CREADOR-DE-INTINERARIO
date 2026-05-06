"use client";

import { X } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

interface FormState {
  tourSlug: string; tourDate: string; adults: number; children: number;
  customerName: string; customerEmail: string; customerPhone: string; notes: string;
}

interface Props {
  title: string;
  form: FormState;
  setForm: (f: FormState | ((prev: FormState) => FormState)) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export function ReservaModal({ title, form, setForm, onSave, onClose, saving }: Props) {
  const tour   = TOURS_DB.find(t => t.slug === form.tourSlug);
  const pAdult = tour?.precio ?? 0;
  const pChild = Math.round(pAdult * 0.6);
  const total  = pAdult * form.adults + pChild * form.children;

  const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

  const canSave = !saving && !!form.tourSlug && !!form.tourDate && !!form.customerName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] shadow-xl rounded-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">{title}</h2>
          <button onClick={onClose} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Cliente *</label>
            <input
              type="text" value={form.customerName} placeholder="Nombre completo"
              onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Email</label>
            <input
              type="email" value={form.customerEmail} placeholder="email@ejemplo.com"
              onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Teléfono</label>
            <input
              type="tel" value={form.customerPhone} placeholder="+52 489 000 0000"
              onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tour *</label>
            <select
              value={form.tourSlug}
              onChange={e => setForm(f => ({ ...f, tourSlug: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar tour...</option>
              {TOURS_DB.map(t => (
                <option key={t.slug} value={t.slug}>{t.nombre} — {fmx(t.precio)}/persona</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
            <input
              type="date" value={form.tourDate}
              onChange={e => setForm(f => ({ ...f, tourDate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Adultos</label>
              <input
                type="number" min={1} max={12} value={form.adults}
                onChange={e => setForm(f => ({ ...f, adults: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Niños (60%)</label>
              <input
                type="number" min={0} max={12} value={form.children}
                onChange={e => setForm(f => ({ ...f, children: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
            <textarea
              value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className={`${inputCls} resize-none`}
            />
          </div>
          {total > 0 && (
            <div className="border border-[#c4882a]/30 bg-[#c4882a]/8 px-4 py-3 flex justify-between items-center rounded-sm">
              <span className="text-[#1a2e1a]/60 font-dm text-sm">Total estimado</span>
              <span className="font-cormorant text-[#c4882a] text-xl">{fmx(total)}</span>
            </div>
          )}
          <button
            onClick={onSave} disabled={!canSave}
            className="w-full bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm mt-1"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
