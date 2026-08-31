"use client";

import { useState } from "react";
import { X, Plus, Check, BedDouble, ChevronRight, ChevronLeft, Pencil } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import ExtrasEditor from "@/components/admin/ExtrasEditor";
import { type ExtraItem, type PresetExtra, EXTRAS_PRESET, totalExtras } from "@/lib/admin/extras";
import { grupoParaGuardar } from "@/lib/admin/reserva";
import { addDaysYMD, diffDiasYMD } from "@/lib/dates";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export interface LineItem {
  tourSlug:      string;
  tourName:      string;
  tourDate:      string;
  adults:        number;
  childrenMid:   number;
  childrenSmall: number;
  subtotal:      number;
  /** Solo tours cobrados POR VEHÍCULO (ej. RZR): ruta elegida, modelo y cuántas unidades. */
  ruta?:         string;
  vehiculo?:     string;
  unidades?:     number;
  /**
   * Actividades opcionales del recorrido (ej. el Salto de las 7 Cascadas en el
   * Paraíso Escalonado). El precio se relee SIEMPRE del catálogo al cobrar: lo
   * que se guarda aquí es un registro de lo que se contrató, no la tarifa.
   */
  addOns?:       LineaAddOn[];
}

export interface LineaAddOn {
  id:       string;
  nombre:   string;
  /** A cuántas personas del grupo se les suma. */
  cantidad: number;
  precio:   number;
  subtotal: number;
}

/** Las actividades opcionales que ofrece ese recorrido, según el catálogo. */
export function addOnsDeTour(slug: string) {
  return TOURS_DB.find(t => t.slug === slug)?.addOns ?? [];
}

/** Cuánta gente lleva contratada esa actividad en esta línea. */
export function cantidadAddOn(l: Pick<LineItem, "addOns">, id: string): number {
  return Math.max(0, l.addOns?.find(a => a.id === id)?.cantidad ?? 0);
}

/**
 * Lo que suman las actividades opcionales de una línea.
 *
 * El precio se toma del CATÁLOGO, nunca del objeto guardado: si mañana el
 * Salto sube a $400, una cotización nueva lo cobra a $400 aunque el formulario
 * traiga el número viejo pegado.
 */
export function calcAddOnsLinea(l: LineItem): number {
  const cat = addOnsDeTour(l.tourSlug);
  if (!cat.length) return 0;
  return (l.addOns ?? []).reduce((s, a) => {
    const def = cat.find(x => x.id === a.id);
    return def ? s + def.precio * Math.max(0, a.cantidad || 0) : s;
  }, 0);
}

/** Pone (o quita) una actividad opcional en la línea, ya con su precio y subtotal. */
export function conAddOn(l: LineItem, id: string, cantidad: number): LineItem {
  const def = addOnsDeTour(l.tourSlug).find(a => a.id === id);
  if (!def) return l;
  const resto = (l.addOns ?? []).filter(a => a.id !== id);
  const n = Math.max(0, Math.round(cantidad) || 0);
  const addOns = n > 0
    ? [...resto, { id: def.id, nombre: def.nombre, cantidad: n, precio: def.precio, subtotal: def.precio * n }]
    : resto;
  return { ...l, addOns: addOns.length ? addOns : undefined };
}

/** Tour cobrado por vehículo (RZR): precio = matriz flota×ruta, NO por persona. */
export function esTourVehiculo(slug: string) {
  const t = TOURS_DB.find(t => t.slug === slug);
  return !!(t && t.precioUnidad === "vehiculo" && t.rutas && t.flota);
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
  /** Comida, transporte, guía privado… lo que va aparte del recorrido y del hotel. */
  extras:         ExtraItem[];
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
  lines: [{ ...EMPTY_LINE }], packages: [], extras: [], totalOverride: "", depositoPagado: "",
  metodoPago: "Transferencia", folioPago: "", pickupLugar: "Lobby de tu hotel en Xilitla",
  numPersonas: "",
};

export function calcTourLine(l: LineItem): number {
  const t = TOURS_DB.find(t => t.slug === l.tourSlug);
  if (!t) return 0;
  // Tours por vehículo (RZR): la matriz flota×ruta manda; los niños no cambian el precio.
  const base = (t.precioUnidad === "vehiculo" && t.rutas && t.flota)
    ? (() => {
        const rutaIdx  = Math.max(0, t.rutas!.findIndex(r => r.nombre === l.ruta));
        const veh      = t.flota!.find(v => v.nombre === l.vehiculo) ?? t.flota![0];
        const unidades = Math.max(1, l.unidades ?? 1);
        return (veh?.precios[rutaIdx] ?? t.precio) * unidades;
      })()
    : (
        t.precio * l.adults +
        Math.round(t.precio * 0.7) * (l.childrenMid   ?? 0) +
        Math.round(t.precio * 0.5) * (l.childrenSmall ?? 0)
      );
  return base + calcAddOnsLinea(l);
}

/** Nombre descriptivo de una línea por vehículo, para reservas/correo: "RZR — Ruta X · Vehículo ×2". */
export function vehiculoLineName(l: LineItem): string {
  const t = TOURS_DB.find(t => t.slug === l.tourSlug);
  if (!t) return l.tourName;
  const base = t.nombre.split(" — ")[0];
  const un   = Math.max(1, l.unidades ?? 1);
  return `${base} — ${l.ruta ?? t.rutas?.[0]?.nombre ?? ""} · ${l.vehiculo ?? t.flota?.[0]?.nombre ?? ""}${un > 1 ? ` ×${un}` : ""}`;
}

export function calcPackageLine(p: PackageItem): number {
  return p.precioPorNoche * p.noches * p.habitaciones;
}

/**
 * Mantiene coherentes check-in, noches y check-out.
 *
 * Antes eran tres campos sueltos: se podía cobrar 2 noches con fechas de 4, y
 * el cliente recibía una cotización que se contradecía a sí misma. Ahora dos
 * mandan y el tercero se calcula:
 *   · cambias la entrada o las noches  → se recalcula la salida
 *   · cambias la salida                → se recalculan las noches
 */
export function sincronizarNoches(p: PackageItem, campo: "checkin" | "checkout" | "noches"): PackageItem {
  const up = { ...p };
  if (campo === "checkout" && up.checkin && up.checkout) {
    const n = diffDiasYMD(up.checkin, up.checkout);
    // Una salida anterior a la entrada no es una estancia: se deja 1 noche.
    up.noches = Math.max(1, n);
  } else if (up.checkin) {
    up.noches   = Math.max(1, Math.round(Number(up.noches)) || 1);
    up.checkout = addDaysYMD(up.checkin, up.noches);
  } else {
    up.noches = Math.max(1, Math.round(Number(up.noches)) || 1);
  }
  up.subtotal = calcPackageLine(up);
  return up;
}

/**
 * Selector de actividades opcionales de un recorrido. Solo aparece cuando el
 * catálogo del tour trae alguna (hoy: el Salto de las 7 Cascadas en el Paraíso
 * Escalonado). El precio es del catálogo y no se puede teclear: lo único que se
 * elige es a cuánta gente se le suma.
 */
export function AddOnsLinea({ line, personas, onChange }: {
  line:     LineItem;
  personas: number;
  onChange: (linea: LineItem) => void;
}) {
  const cat = addOnsDeTour(line.tourSlug);
  if (!cat.length) return null;
  const tope = Math.max(1, personas || 1);

  return (
    <div className="border border-[#C4882A]/30 bg-[#C4882A]/5 rounded-sm p-2.5 space-y-2">
      <p className="text-[9px] tracking-[2px] uppercase text-[#C4882A]/90 font-dm">Actividad opcional</p>
      {cat.map(a => {
        const n = cantidadAddOn(line, a.id);
        return (
          <div key={a.id} className="space-y-1">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[#1B4332] font-dm text-xs font-medium">{a.nombre}</p>
                <p className="text-[#1B4332]/45 font-dm text-[10px]">{fmx(a.precio)} por persona</p>
              </div>
              <div className="w-24 shrink-0">
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Personas</label>
                <input type="number" min={0} max={tope} value={n}
                  onChange={e => onChange(conAddOn(line, a.id, Math.min(tope, Math.max(0, Number(e.target.value) || 0))))}
                  className="w-full border border-[#C4882A]/40 text-[#1B4332] font-dm text-sm px-2 py-2 focus:outline-none focus:border-[#C4882A] rounded-sm bg-white" />
              </div>
            </div>
            {n > 0 && (
              <p className="text-right text-[11px] font-dm text-[#C4882A]">
                {n} × {fmx(a.precio)} = <span className="font-medium">{fmx(a.precio * n)}</span>
              </p>
            )}
          </div>
        );
      })}
      <p className="text-[10px] font-dm text-[#1B4332]/40">
        Va dentro del subtotal del recorrido y se nombra en el PDF y en el correo.
      </p>
    </div>
  );
}

interface Props {
  title:   string;
  /** Los conceptos con sus precios, tal como Manolo los dejó en el Cotizador. */
  presetsExtras?: PresetExtra[];
  form:    ReservaFormState;
  setForm: (f: ReservaFormState | ((p: ReservaFormState) => ReservaFormState)) => void;
  onSave:  () => void;
  onClose: () => void;
  saving:  boolean;
}

export function ReservaModal({ title, form, setForm, onSave, onClose, saving, presetsExtras = EXTRAS_PRESET }: Props) {
  const [step,         setStep]         = useState<1 | 2 | 3>(1);
  const [editingTotal, setEditingTotal] = useState(false);

  const inputCls = "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

  const toursTotal    = form.lines.reduce((s, l) => s + calcTourLine(l), 0);
  const packagesTotal = form.packages.reduce((s, p) => s + calcPackageLine(p), 0);
  const extrasTotal   = totalExtras(form.extras ?? []);
  // El grupo real (máximo por tour, no la suma), para llenar la cantidad de los
  // extras que se cobran por persona.
  const grupoActual   = grupoParaGuardar(form.lines, form.numPersonas);
  const personasGrupo = Number(form.numPersonas) || (grupoActual.adults + grupoActual.children);
  const calcTotal     = toursTotal + packagesTotal + extrasTotal;
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
          if (t?.precioUnidad === "vehiculo" && t.rutas && t.flota) {
            // Al elegir un tour por vehículo: defaults de ruta/vehículo y participantes fuera del precio.
            up.ruta          = t.rutas[0].nombre;
            up.vehiculo      = t.flota[0].nombre;
            up.unidades      = 1;
            up.adults        = 0;
            up.childrenMid   = 0;
            up.childrenSmall = 0;
          } else {
            delete up.ruta; delete up.vehiculo; delete up.unidades;
            up.adults = Math.max(1, up.adults || 2);
          }
        }
        // Evitar valores 0/NaN en participantes (solo tours por persona)
        if (field === "adults")        up.adults        = Math.max(1, Number(val) || 1);
        if (field === "childrenMid")   up.childrenMid   = Math.max(0, Number(val) || 0);
        if (field === "childrenSmall") up.childrenSmall = Math.max(0, Number(val) || 0);
        if (field === "unidades")      up.unidades      = Math.max(1, Number(val) || 1);
        // El nombre de línea de un tour por vehículo lleva ruta/vehículo (así lo ven reservas y el correo).
        if (esTourVehiculo(up.tourSlug)) up.tourName = vehiculoLineName(up);
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
        if (field === "checkin" || field === "checkout" || field === "noches") {
          return sincronizarNoches(up, field);
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
      <div className="relative bg-white border border-[#1B4332]/10 w-full max-w-xl shadow-xl rounded-sm flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="font-cormorant text-[#1B4332] text-xl font-light">{title}</h2>
          <button onClick={onClose} className="text-[#1B4332]/40 hover:text-[#1B4332]"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 mt-4 border-b border-[#1B4332]/10">
          {TABS.map(tab => {
            const done   = tab.n < step;
            const active = step === tab.n;
            return (
              <button key={tab.n} onClick={() => goToTab(tab.n)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] tracking-[1.5px] uppercase font-dm border-b-2 transition-colors -mb-px ${
                  active ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-[#1B4332]/40 hover:text-[#1B4332]/70"
                }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  done || active ? "bg-[#1B4332] text-white" : "bg-[#1B4332]/12 text-[#1B4332]/50"
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
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Nombre *</label>
                <input type="text" value={form.customerName} placeholder="Nombre completo" autoFocus
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Email</label>
                  <input type="email" value={form.customerEmail} placeholder="email@ejemplo.com"
                    onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Teléfono</label>
                  <input type="tel" value={form.customerPhone} placeholder="+52 489 000 0000"
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Notas</label>
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
              <div className="bg-[#FAFAF8]/60 border border-[#1B4332]/10 rounded-sm p-3">
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                  Número de personas del grupo
                </label>
                <input type="number" min={1} max={40} value={form.numPersonas}
                  placeholder="Ej. 2"
                  onChange={e => setForm(f => ({ ...f, numPersonas: e.target.value }))}
                  className={`${inputCls} max-w-[140px]`} />
                <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1.5">
                  Cuántas personas son en total (el mismo grupo que va a todos los tours). Así el correo de
                  confirmación muestra el número correcto y no suma las personas de cada tour.
                </p>
              </div>

              {/* Tours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Tours</p>
                  <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))}
                    className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                    <Plus className="w-3 h-3" />Agregar tour
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, i) => (
                    <div key={i} className="border border-[#1B4332]/10 p-3 rounded-sm bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Tour {i + 1}</span>
                        {form.lines.length > 1 && (
                          <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))}
                            className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <select value={line.tourSlug} onChange={e => updateLine(i, "tourSlug", e.target.value)} className={inputCls}>
                          <option value="">Seleccionar tour...</option>
                          {TOURS_DB.map(t => <option key={t.slug} value={t.slug}>{t.nombre}{t.precioUnidad === "vehiculo" ? " (por vehículo)" : ""}</option>)}
                        </select>
                        {esTourVehiculo(line.tourSlug) ? (
                          (() => {
                            const t = TOURS_DB.find(t => t.slug === line.tourSlug)!;
                            const rutaIdx = Math.max(0, t.rutas!.findIndex(r => r.nombre === line.ruta));
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Fecha *</label>
                                    <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Ruta</label>
                                    <select value={line.ruta} onChange={e => updateLine(i, "ruta", e.target.value)} className={inputCls}>
                                      {t.rutas!.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre} · {r.duracion_hrs}h</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Vehículo</label>
                                    <select value={line.vehiculo} onChange={e => updateLine(i, "vehiculo", e.target.value)} className={inputCls}>
                                      {t.flota!.map(v => (
                                        <option key={v.nombre} value={v.nombre}>
                                          {v.nombre} ({v.capacidad}) — {fmx(v.precios[rutaIdx])}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1" title="Cuántos vehículos de este modelo">Unidades</label>
                                    <input type="number" min={1} max={10} value={line.unidades ?? 1}
                                      onChange={e => updateLine(i, "unidades", Number(e.target.value))} className={inputCls} />
                                  </div>
                                </div>
                                <p className="text-[10px] font-dm text-[#1B4332]/40">
                                  Precio por vehículo (incluye gasolina, equipo y guía) — los ocupantes no cambian el precio.
                                  ¿Otro modelo además? Agrega otra línea del mismo tour.
                                </p>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Fecha *</label>
                                <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Adultos</label>
                                <input type="number" min={1} max={20} value={line.adults}
                                  onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="6-10 años — 30% descuento">Niños 6–10 años</label>
                                <input type="number" min={0} max={12} value={line.childrenMid}
                                  onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="Menores de 6 — 50% descuento">Niños &lt;6 años</label>
                                <input type="number" min={0} max={12} value={line.childrenSmall}
                                  onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                              </div>
                            </div>
                          </>
                        )}
                        {line.tourSlug && (
                          <AddOnsLinea
                            line={line}
                            personas={Number(form.numPersonas) || (line.adults + (line.childrenMid ?? 0) + (line.childrenSmall ?? 0))}
                            onChange={nueva => setForm(f => ({
                              ...f,
                              lines: f.lines.map((x, idx) => idx === i ? { ...nueva, subtotal: calcTourLine(nueva) } : x),
                              totalOverride: "",
                            }))}
                          />
                        )}
                        {line.tourSlug && (
                          <p className="text-right text-xs font-dm text-[#52B788]">Subtotal: {fmx(calcTourLine(line))}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospedaje */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm flex items-center gap-1.5">
                    <BedDouble className="w-3 h-3" />Hospedaje (opcional)
                  </p>
                  <button onClick={() => setForm(f => ({ ...f, packages: [...f.packages, { ...EMPTY_PACKAGE }], totalOverride: "" }))}
                    className="flex items-center gap-1 text-xs font-dm text-[#40916C] border border-[#40916C]/30 px-2 py-1 hover:bg-[#40916C]/8 transition-colors rounded-sm">
                    <Plus className="w-3 h-3" />Agregar habitación
                  </button>
                </div>
                {form.packages.length === 0 && (
                  <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
                    Sin hospedaje — solo tours
                  </p>
                )}
                <div className="space-y-2">
                  {form.packages.map((pkg, i) => (
                    <div key={i} className="border border-[#40916C]/25 p-3 rounded-sm bg-[#FFFFFF]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#40916C]/70 font-dm flex items-center gap-1">
                          <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                        </span>
                        <button onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, idx) => idx !== i), totalOverride: "" }))}
                          className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hotel</label>
                          <input type="text" value={pkg.hotel} className={inputCls}
                            onChange={e => updatePackage(i, "hotel", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Tipo de habitación</label>
                          <div className="flex gap-1.5 flex-wrap mb-1.5">
                            {HABITACIONES_PRESET.map(h => (
                              <button key={h.label} type="button" onClick={() => updatePackage(i, "habitacion", h.label)}
                                className={`text-[10px] font-dm px-2 py-1 rounded border transition-colors ${
                                  pkg.habitacion === h.label
                                    ? "bg-[#40916C] text-white border-[#40916C]"
                                    : "border-[#40916C]/30 text-[#40916C] hover:bg-[#40916C]/10"
                                }`}>{h.label}</button>
                            ))}
                          </div>
                          <input type="text" value={pkg.habitacion} placeholder="Personalizar descripción..."
                            onChange={e => updatePackage(i, "habitacion", e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Noches</label>
                            <input type="number" min={1} max={30} value={pkg.noches}
                              onChange={e => updatePackage(i, "noches", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hab.</label>
                            <input type="number" min={1} max={10} value={pkg.habitaciones}
                              onChange={e => updatePackage(i, "habitaciones", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">$/noche</label>
                            <input type="number" min={0} value={pkg.precioPorNoche}
                              onChange={e => updatePackage(i, "precioPorNoche", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-in</label>
                            <input type="date" value={pkg.checkin}
                              onChange={e => updatePackage(i, "checkin", e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-out</label>
                            <input type="date" value={pkg.checkout}
                              onChange={e => updatePackage(i, "checkout", e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <p className="text-right text-xs font-dm text-[#40916C] font-medium">
                          Subtotal: {fmx(calcPackageLine(pkg))}
                          <span className="text-[#1B4332]/35 font-normal ml-1">
                            ({pkg.noches}n × {pkg.habitaciones}hab × {fmx(pkg.precioPorNoche)})
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extras: comida, transporte, guía privado… */}
              <ExtrasEditor
                extras={form.extras ?? []}
                personas={personasGrupo}
                presets={presetsExtras}
                onChange={extras => setForm(f => ({ ...f, extras, totalOverride: "" }))}
              />

              {/* Resumen running */}
              {calcTotal > 0 && (
                <div className="bg-[#FAFAF8]/70 border border-[#52B788]/20 rounded-sm px-4 py-3">
                  {(packagesTotal > 0 || extrasTotal > 0) && (
                    <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]/50">
                        <span>Tours</span><span>{fmx(toursTotal)}</span>
                      </div>
                      {packagesTotal > 0 && (
                        <div className="flex justify-between text-xs font-dm text-[#40916C]">
                          <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                        </div>
                      )}
                      {extrasTotal > 0 && (
                        <div className="flex justify-between text-xs font-dm text-[#C4882A]">
                          <span>Extras</span><span>{fmx(extrasTotal)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Total estimado</span>
                    <span className="font-cormorant text-[#52B788] text-xl">{fmx(calcTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Pago ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Total editable */}
              <div className="border border-[#52B788]/30 bg-[#52B788]/6 px-4 py-3 rounded-sm">
                {(packagesTotal > 0 || extrasTotal > 0) && (
                  <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                    <div className="flex justify-between text-xs font-dm text-[#1B4332]/50">
                      <span>Tours</span><span>{fmx(toursTotal)}</span>
                    </div>
                    {packagesTotal > 0 && (
                      <div className="flex justify-between text-xs font-dm text-[#40916C]">
                        <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                      </div>
                    )}
                    {extrasTotal > 0 && (
                      <div className="flex justify-between text-xs font-dm text-[#C4882A]">
                        <span>Extras</span><span>{fmx(extrasTotal)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                      Total {form.totalOverride !== "" && <span className="text-[#52B788]">(editado)</span>}
                    </p>
                    {editingTotal ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                        <input type="number" min={0} value={form.totalOverride}
                          onChange={e => setForm(f => ({ ...f, totalOverride: e.target.value }))}
                          placeholder={String(calcTotal)}
                          className="flex-1 border border-[#52B788]/50 bg-white text-[#52B788] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                          autoFocus />
                        <span className="text-[#1B4332]/40 font-dm text-sm">MXN</span>
                      </div>
                    ) : (
                      <p className="font-cormorant text-[#52B788] text-2xl">{fmx(finalTotal)}</p>
                    )}
                    {form.totalOverride !== "" && (
                      <button onClick={() => { setForm(f => ({ ...f, totalOverride: "" })); setEditingTotal(false); }}
                        className="text-[10px] font-dm text-[#1B4332]/40 hover:text-[#1B4332] mt-1 underline">
                        Restaurar automático ({fmx(calcTotal)})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { if (editingTotal) setEditingTotal(false); else { setEditingTotal(true); if (form.totalOverride === "") setForm(f => ({ ...f, totalOverride: String(calcTotal) })); } }}
                    className="flex items-center gap-1 border border-[#52B788]/40 text-[#52B788] px-2.5 py-1.5 text-xs font-dm hover:bg-[#52B788]/10 transition-colors rounded-sm">
                    {editingTotal ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    {editingTotal ? "OK" : "Editar"}
                  </button>
                </div>
              </div>

              {/* Anticipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Anticipo recibido</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                    <input type="number" min={0} value={form.depositoPagado}
                      onChange={e => setForm(f => ({ ...f, depositoPagado: e.target.value }))}
                      placeholder="0" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Saldo pendiente</label>
                  <p className={`font-cormorant text-xl pt-2.5 ${pendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {fmx(pendiente)}
                  </p>
                </div>
              </div>

              {/* Método y folio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Método de pago</label>
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
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Folio / referencia</label>
                  <input type="text" value={form.folioPago} placeholder="TXN-00000 / —"
                    onChange={e => setForm(f => ({ ...f, folioPago: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Pickup */}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Lugar de recogida</label>
                <input type="text" value={form.pickupLugar} placeholder="Lobby de tu hotel en Xilitla"
                  onChange={e => setForm(f => ({ ...f, pickupLugar: e.target.value }))} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-5 pt-3 border-t border-[#1B4332]/8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1 text-xs font-dm text-[#1B4332]/50 hover:text-[#1B4332] px-3 py-2 border border-[#1B4332]/15 rounded-sm transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />Atrás
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-5 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onSave} disabled={!canSave}
              className="bg-[#1B4332] hover:bg-[#2D5A45] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
              {saving ? "Guardando..." : "Guardar reserva"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
