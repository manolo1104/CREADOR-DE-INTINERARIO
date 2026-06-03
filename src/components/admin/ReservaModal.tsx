"use client";

import { useState } from "react";
import { X, Plus, Check, BedDouble, ChevronRight, ChevronLeft, Pencil } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export interface LineItem {
  tourSlug:      string;
  tourName:      string;
  tourDate:      string;
  adults:        number;
  childrenMid:   number;
  childrenSmall: number;
  subtotal:      number;
}

export interface PackageItem {
  habitacion:     string;
  hotel:          string;
  noches:         number;
  habitaciones:   number;
  precioPorNoche: number;
  checkin:        string;
  checkout:       string;
  subtotal:       number;
}

export interface ReservaFormState {
  customerName:   string;
  customerEmail:  string;
  customerPhone:  string;
  notes:          string;
  lines:          LineItem[];
  packages:       PackageItem[];
  totalOverride:  string;
  depositoPagado: string;
  metodoPago:     string;
  folioPago:      string;
  pickupLugar:    string;
  numPersonas:    string;  // tamaño real del grupo (para el email; evita sumar por tour)
}

const HABITACIONES_PRESET = [
  { label: "Suite Flor de Liz",    precio: 1900 },
  { label: "Suite LindaVista",     precio: 1990 },
  { label: "Suite Lajas",          precio: 1900 },
  { label: "Suite Jungla",         precio: 1990 },
  { label: "Lirios",               precio: 1500 },
  { label: "Orquídeas King",       precio: 1500 },
  { label: "Orquídeas Doble",      precio: 1500 },
  { label: "Bromelias",            precio: 1500 },
  { label: "Helechos",             precio: 1900 },
];

const EMPTY_PACKAGE: PackageItem = {
  habitacion: "Suite Flor de Liz", hotel: "Hotel Paraíso Encantado, Xilitla",
  noches: 2, habitaciones: 1, precioPorNoche: 1900, checkin: "", checkout: "", subtotal: 3800,
};

export const EMPTY_LINE: LineItem = { tourSlug: "", tourName: "", tourDate: "", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 0 };
export const EMPTY_RESERVA_FORM: ReservaFormState = {
  customerName: "", customerEmail: "", customerPhone: "", notes: "",
  lines: [{ ...EMPTY_LINE }], packages: [], totalOverride: "", depositoPagado: "",
  metodoPago: "Transferencia", folioPago: "", pickupLugar: "Lobby de tu hotel en Xilitla",
  numPersonas: "",
};

export function calcTourLine(l: LineItem): number {
  const t = TOURS_DB.find(t => t.slug === l.tourSlug);
  if (!t) return 0;
  return (
    t.precio * l.adults +
    Math.round(t.precio * 0.7) * (l.childrenMid   ?? 0) +
    Math.round(t.precio * 0.5) * (l.childrenSmall ?? 0)
  );
}

export function calcPackageLine(p: PackageItem): number {
  return p.precioPorNoche * p.noches * p.habitaciones;
}

interface Props {
  title:   string;
  form:    ReservaFormState;
  setForm: (f: ReservaFormState | ((p: ReservaFormState) => ReservaFormState)) => void;
  onSave:  () => void;
  onClose: () => void;
  saving:  boolean;
}

export function ReservaModal({ title, form, setForm, onSave, onClose, saving }: Props) {
  const [step,         setStep]         = useState<1 | 2 | 3>(1);
  const [editingTotal, setEditingTotal] = useState(false);

  const inputCls = "w-full border border-[#1a2e1a]/15 text-[#1a2e1a] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#3a6b1a] rounded-sm placeholder:text-[#1a2e1a]/25 bg-white";

  const toursTotal    = form.lines.reduce((s, l) => s + calcTourLine(l), 0);
  const packagesTotal = form.packages.reduce((s, p) => s + calcPackageLine(p), 0);
  const calcTotal     = toursTotal + packagesTotal;
  const finalTotal    = form.totalOverride !== "" ? Number(form.totalOverride) || 0 : calcTotal;
  const deposito      = Number(form.depositoPagado) || 0;
  const pendiente     = Math.max(0, finalTotal - deposito);

  const step1Valid = !!form.customerName.trim();
  const step2Valid = form.lines.every(l => !!l.tourSlug && !!l.tourDate);
  const canSave    = !saving && step1Valid && step2Valid;

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
        // Evitar valores 0/NaN en participantes
        if (field === "adults")        up.adults        = Math.max(1, Number(val) || 1);
        if (field === "childrenMid")   up.childrenMid   = Math.max(0, Number(val) || 0);
        if (field === "childrenSmall") up.childrenSmall = Math.max(0, Number(val) || 0);
        up.subtotal = calcTourLine(up);
        return up;
      }),
      totalOverride: "",
    }));
  }

  function updatePackage(i: number, field: keyof PackageItem, val: string | number) {
    setForm(f => ({
      ...f,
      packages: f.packages.map((p, idx) => {
        if (idx !== i) return p;
        const up = { ...p, [field]: val };
        if (field === "habitacion") {
          const preset = HABITACIONES_PRESET.find(h => h.label === val);
          if (preset) up.precioPorNoche = preset.precio;
        }
        up.subtotal = calcPackageLine(up);
        return up;
      }),
      totalOverride: "",
    }));
  }

  const TABS = [
    { n: 1 as const, label: "Cliente" },
    { n: 2 as const, label: "Tours" },
    { n: 3 as const, label: "Pago" },
  ];

  function goToTab(n: 1 | 2 | 3) {
    if (n <= step) { setStep(n); return; }
    if (n === 2 && step1Valid) setStep(2);
    if (n === 3 && step1Valid && step2Valid) setStep(3);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-[#1a2e1a]/10 w-full max-w-xl shadow-xl rounded-sm flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="font-cormorant text-[#1a2e1a] text-xl font-light">{title}</h2>
          <button onClick={onClose} className="text-[#1a2e1a]/40 hover:text-[#1a2e1a]"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 mt-4 border-b border-[#1a2e1a]/10">
          {TABS.map(tab => {
            const done   = tab.n < step;
            const active = step === tab.n;
            return (
              <button key={tab.n} onClick={() => goToTab(tab.n)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] tracking-[1.5px] uppercase font-dm border-b-2 transition-colors -mb-px ${
                  active ? "border-[#3a6b1a] text-[#3a6b1a]" : "border-transparent text-[#1a2e1a]/40 hover:text-[#1a2e1a]/70"
                }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  done || active ? "bg-[#3a6b1a] text-white" : "bg-[#1a2e1a]/12 text-[#1a2e1a]/50"
                }`}>
                  {done ? <Check className="w-2.5 h-2.5" /> : tab.n}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Step 1: Cliente ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Nombre *</label>
                <input type="text" value={form.customerName} placeholder="Nombre completo" autoFocus
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Notas</label>
                <textarea value={form.notes} rows={3}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferencias, alergias, requerimientos especiales..."
                  className={`${inputCls} resize-none`} />
              </div>
            </div>
          )}

          {/* ── Step 2: Tours + Hospedaje ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Número de personas del grupo (para el email — evita sumar por tour) */}
              <div className="bg-[#f4edd8]/60 border border-[#1a2e1a]/10 rounded-sm p-3">
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">
                  Número de personas del grupo
                </label>
                <input type="number" min={1} max={40} value={form.numPersonas}
                  placeholder="Ej. 2"
                  onChange={e => setForm(f => ({ ...f, numPersonas: e.target.value }))}
                  className={`${inputCls} max-w-[140px]`} />
                <p className="text-[10px] font-dm text-[#1a2e1a]/40 mt-1.5">
                  Cuántas personas son en total (el mismo grupo que va a todos los tours). Así el correo de
                  confirmación muestra el número correcto y no suma las personas de cada tour.
                </p>
              </div>

              {/* Tours */}
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
                        <select value={line.tourSlug} onChange={e => updateLine(i, "tourSlug", e.target.value)} className={inputCls}>
                          <option value="">Seleccionar tour...</option>
                          {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Fecha *</label>
                            <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Adultos</label>
                            <input type="number" min={1} max={20} value={line.adults}
                              onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1 truncate" title="6-10 años — 30% descuento">Niños 6–10 años</label>
                            <input type="number" min={0} max={12} value={line.childrenMid}
                              onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1 truncate" title="Menores de 6 — 50% descuento">Niños &lt;6 años</label>
                            <input type="number" min={0} max={12} value={line.childrenSmall}
                              onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        {line.tourSlug && (
                          <p className="text-right text-xs font-dm text-[#c4882a]">Subtotal: {fmx(calcTourLine(line))}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospedaje */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm flex items-center gap-1.5">
                    <BedDouble className="w-3 h-3" />Hospedaje (opcional)
                  </p>
                  <button onClick={() => setForm(f => ({ ...f, packages: [...f.packages, { ...EMPTY_PACKAGE }], totalOverride: "" }))}
                    className="flex items-center gap-1 text-xs font-dm text-[#8a6f1e] border border-[#8a6f1e]/30 px-2 py-1 hover:bg-[#8a6f1e]/8 transition-colors rounded-sm">
                    <Plus className="w-3 h-3" />Agregar habitación
                  </button>
                </div>
                {form.packages.length === 0 && (
                  <p className="text-[10px] font-dm text-[#1a2e1a]/30 border border-dashed border-[#1a2e1a]/15 rounded-sm py-4 text-center">
                    Sin hospedaje — solo tours
                  </p>
                )}
                <div className="space-y-2">
                  {form.packages.map((pkg, i) => (
                    <div key={i} className="border border-[#8a6f1e]/25 p-3 rounded-sm bg-[#faf7ee]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#8a6f1e]/70 font-dm flex items-center gap-1">
                          <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                        </span>
                        <button onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, idx) => idx !== i), totalOverride: "" }))}
                          className="text-[#1a2e1a]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Hotel</label>
                          <input type="text" value={pkg.hotel} className={inputCls}
                            onChange={e => updatePackage(i, "hotel", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Tipo de habitación</label>
                          <div className="flex gap-1.5 flex-wrap mb-1.5">
                            {HABITACIONES_PRESET.map(h => (
                              <button key={h.label} type="button" onClick={() => updatePackage(i, "habitacion", h.label)}
                                className={`text-[10px] font-dm px-2 py-1 rounded border transition-colors ${
                                  pkg.habitacion === h.label
                                    ? "bg-[#8a6f1e] text-white border-[#8a6f1e]"
                                    : "border-[#8a6f1e]/30 text-[#8a6f1e] hover:bg-[#8a6f1e]/10"
                                }`}>{h.label}</button>
                            ))}
                          </div>
                          <input type="text" value={pkg.habitacion} placeholder="Personalizar descripción..."
                            onChange={e => updatePackage(i, "habitacion", e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Noches</label>
                            <input type="number" min={1} max={30} value={pkg.noches}
                              onChange={e => updatePackage(i, "noches", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Hab.</label>
                            <input type="number" min={1} max={10} value={pkg.habitaciones}
                              onChange={e => updatePackage(i, "habitaciones", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">$/noche</label>
                            <input type="number" min={0} value={pkg.precioPorNoche}
                              onChange={e => updatePackage(i, "precioPorNoche", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Check-in</label>
                            <input type="date" value={pkg.checkin}
                              onChange={e => updatePackage(i, "checkin", e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Check-out</label>
                            <input type="date" value={pkg.checkout}
                              onChange={e => updatePackage(i, "checkout", e.target.value)} className={inputCls} />
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

              {/* Resumen running */}
              {calcTotal > 0 && (
                <div className="bg-[#f4edd8]/70 border border-[#c4882a]/20 rounded-sm px-4 py-3">
                  {packagesTotal > 0 && (
                    <>
                      <div className="flex justify-between text-xs font-dm text-[#1a2e1a]/50 mb-1">
                        <span>Tours</span><span>{fmx(toursTotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-dm text-[#8a6f1e] mb-2 pb-2 border-b border-[#c4882a]/15">
                        <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm">Total estimado</span>
                    <span className="font-cormorant text-[#c4882a] text-xl">{fmx(calcTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Pago ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Total editable */}
              <div className="border border-[#c4882a]/30 bg-[#c4882a]/6 px-4 py-3 rounded-sm">
                {packagesTotal > 0 && (
                  <>
                    <div className="flex justify-between text-xs font-dm text-[#1a2e1a]/50 mb-1">
                      <span>Tours</span><span>{fmx(toursTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-dm text-[#8a6f1e] mb-2 pb-2 border-b border-[#c4882a]/15">
                      <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">
                      Total {form.totalOverride !== "" && <span className="text-[#c4882a]">(editado)</span>}
                    </p>
                    {editingTotal ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#1a2e1a]/40 font-dm text-sm">$</span>
                        <input type="number" min={0} value={form.totalOverride}
                          onChange={e => setForm(f => ({ ...f, totalOverride: e.target.value }))}
                          placeholder={String(calcTotal)}
                          className="flex-1 border border-[#c4882a]/50 bg-white text-[#c4882a] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                          autoFocus />
                        <span className="text-[#1a2e1a]/40 font-dm text-sm">MXN</span>
                      </div>
                    ) : (
                      <p className="font-cormorant text-[#c4882a] text-2xl">{fmx(finalTotal)}</p>
                    )}
                    {form.totalOverride !== "" && (
                      <button onClick={() => { setForm(f => ({ ...f, totalOverride: "" })); setEditingTotal(false); }}
                        className="text-[10px] font-dm text-[#1a2e1a]/40 hover:text-[#1a2e1a] mt-1 underline">
                        Restaurar automático ({fmx(calcTotal)})
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

              {/* Anticipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Anticipo recibido</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[#1a2e1a]/40 font-dm text-sm">$</span>
                    <input type="number" min={0} value={form.depositoPagado}
                      onChange={e => setForm(f => ({ ...f, depositoPagado: e.target.value }))}
                      placeholder="0" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Saldo pendiente</label>
                  <p className={`font-cormorant text-xl pt-2.5 ${pendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {fmx(pendiente)}
                  </p>
                </div>
              </div>

              {/* Método y folio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Método de pago</label>
                  <select value={form.metodoPago}
                    onChange={e => setForm(f => ({ ...f, metodoPago: e.target.value }))}
                    className={inputCls}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Tarjeta">Tarjeta (presencial)</option>
                    <option value="PayPal">PayPal</option>
                    <option value="—">—</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Folio / referencia</label>
                  <input type="text" value={form.folioPago} placeholder="TXN-00000 / —"
                    onChange={e => setForm(f => ({ ...f, folioPago: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Pickup */}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1a2e1a]/50 font-dm mb-1">Lugar de recogida</label>
                <input type="text" value={form.pickupLugar} placeholder="Lobby de tu hotel en Xilitla"
                  onChange={e => setForm(f => ({ ...f, pickupLugar: e.target.value }))} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-5 pt-3 border-t border-[#1a2e1a]/8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1 text-xs font-dm text-[#1a2e1a]/50 hover:text-[#1a2e1a] px-3 py-2 border border-[#1a2e1a]/15 rounded-sm transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />Atrás
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex items-center gap-1.5 bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-5 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onSave} disabled={!canSave}
              className="bg-[#3a6b1a] hover:bg-[#5a9e2a] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
              {saving ? "Guardando..." : "Guardar reserva"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
