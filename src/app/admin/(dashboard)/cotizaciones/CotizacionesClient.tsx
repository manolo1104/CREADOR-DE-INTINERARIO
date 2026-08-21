"use client";

import { useState, useMemo } from "react";
import type { TourQuote } from "@prisma/client";
import { Plus, Mail, Download, Trash2, Search, MessageCircle, X, Pencil, Check, BedDouble, BookCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { type PackageItem, type LineItem, calcPackageLine, calcTourLine, esTourVehiculo, vehiculoLineName } from "@/components/admin/ReservaModal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import { grupoDe, grupoParaGuardar, grupoLargo } from "@/lib/admin/reserva";

const STATUS: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador",  cls: "bg-gray-100 text-gray-600"     },
  enviada:  { label: "Enviada",   cls: "bg-yellow-100 text-yellow-800" },
  aceptada: { label: "Aceptada",  cls: "bg-green-100 text-green-800"   },
  expirada: { label: "Expirada",  cls: "bg-red-100 text-red-700"       },
};

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

function getMeta(pkgs: any[]): { anticipo?: number; vigencia?: string; numPersonas?: number | null; priceOverride?: number | null; discountType?: "percent" | "fixed"; discountValue?: number | null } {
  return pkgs.find((p: any) => p._meta) || {};
}
function cleanPackages(pkgs: any[]): PackageItem[] {
  return pkgs.filter((p: any) => !p._meta);
}

// Mismo cálculo que las reservas (incluye tours por vehículo como el RZR).
const calcLine = calcTourLine;

const inputCls = "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

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
  const [anticipo,       setAnticipo]       = useState<string>("");
  const [vigencia,       setVigencia]       = useState<string>("7dias");
  const [numPersonas,    setNumPersonas]    = useState<string>("");
  const [saving,         setSaving]         = useState(false);
  const [sending,        setSending]        = useState<string | null>(null);
  const [msg,            setMsg]            = useState("");
  const [step,           setStep]           = useState<1 | 2 | 3>(1);
  const [statusFilter,   setStatusFilter]   = useState<"all" | "borrador" | "enviada" | "aceptada" | "expirada">("all");
  const [sortBy,         setSortBy]         = useState<"reciente" | "tourDate" | "monto">("reciente");

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
      if (field === "tourSlug") {
        const t = TOURS_DB.find(t => t.slug === val);
        up.tourName = t?.nombre || "";
        if (t?.precioUnidad === "vehiculo" && t.rutas && t.flota) {
          up.ruta = t.rutas[0].nombre; up.vehiculo = t.flota[0].nombre; up.unidades = 1;
          up.adults = 0; up.childrenMid = 0; up.childrenSmall = 0;
        } else {
          delete up.ruta; delete up.vehiculo; delete up.unidades;
          up.adults = Math.max(1, up.adults || 2);
        }
      }
      if (field === "adults")        up.adults        = Math.max(1, Number(val) || 1);
      if (field === "childrenMid")   up.childrenMid   = Math.max(0, Number(val) || 0);
      if (field === "childrenSmall") up.childrenSmall = Math.max(0, Number(val) || 0);
      if (field === "unidades")      up.unidades      = Math.max(1, Number(val) || 1);
      if (esTourVehiculo(up.tourSlug)) up.tourName = vehiculoLineName(up);
      up.subtotal = calcLine(up);
      return up;
    }));
    if (priceOverride !== "") setPriceOverride("");
  }

  function addLine()         { setLines(ls => [...ls, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { if (lines.length > 1) setLines(ls => ls.filter((_, idx) => idx !== i)); }

  function flash(m: string) {
    setMsg(m);
    if (m.startsWith("✅")) playSuccess();
    else if (m.startsWith("❌")) playError();
    setTimeout(() => setMsg(""), 5000);
  }

  function openNew() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setLines([{ ...EMPTY_LINE }]);
    setPackages([]);
    setPriceOverride(""); setDiscountValue(""); setDiscountType("percent");
    setAnticipo(""); setVigencia("7dias"); setNumPersonas("");
    setStep(1);
    setModal("new");
  }

  function openEdit(q: TourQuote) {
    setEditTarget(q);
    setForm({ customerName: q.customerName, customerEmail: q.customerEmail || "", customerPhone: q.customerPhone || "", notes: q.notes || "" });
    const storedLines = (q as any).lineItems as any[] | null;
    const editLines: LineItem[] = storedLines?.length
      ? storedLines.map(l => ({
          ...l,
          childrenMid:   l.childrenMid   ?? (l.children ?? 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }];
    setLines(editLines);
    const rawPkgs = (q as any).packageItems ?? [];
    const meta = getMeta(rawPkgs);
    const editPkgs = cleanPackages(rawPkgs);
    setPackages(editPkgs);
    setAnticipo(meta.anticipo != null ? String(meta.anticipo) : "");
    setVigencia(meta.vigencia || "7dias");
    setNumPersonas(meta.numPersonas ? String(meta.numPersonas) : "");

    // Restaurar precio editado y descuento.
    const calc = editLines.reduce((s, l) => s + calcLine(l), 0)
               + editPkgs.reduce((s, p) => s + calcPackageLine(p), 0);
    if (meta.priceOverride != null || meta.discountValue != null) {
      // Formato nuevo: descuento y precio editado guardados explícitamente.
      setPriceOverride(meta.priceOverride != null ? String(meta.priceOverride) : "");
      setDiscountType(meta.discountType === "fixed" ? "fixed" : "percent");
      setDiscountValue(meta.discountValue != null ? String(meta.discountValue) : "");
    } else {
      // Cotizaciones viejas (sin descuento guardado): preservar el total como precio editado.
      setPriceOverride(q.totalAmount !== calc ? String(q.totalAmount) : "");
      setDiscountValue(""); setDiscountType("percent");
    }
    setStep(1);
    setModal("edit");
  }

  function closeModal() { setModal(null); setEditTarget(null); }

  async function saveQuote() {
    if (!form.customerName.trim()) { flash("❌ El nombre del cliente es obligatorio"); return; }
    if (lines.some(l => !l.tourSlug || !l.tourDate)) { flash("❌ Completa el tour y la fecha en cada línea"); return; }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) { flash("❌ El correo no tiene un formato válido"); return; }
    setSaving(true);
    const lineItems    = lines.map(l => ({ ...l, subtotal: calcLine(l) }));
    const anticipoNum  = anticipo !== "" ? Number(anticipo) : Math.round(finalTotal * 0.5);
    const packageItems = [
      {
        _meta: true, anticipo: anticipoNum, vigencia,
        // Tamaño real del grupo (el mismo grupo va a todos los tours; no se suma por tour).
        numPersonas: numPersonas !== "" ? Number(numPersonas) : null,
        // Guardar el precio editado y el descuento para restaurarlos al reabrir.
        priceOverride: priceOverride !== "" ? Number(priceOverride) : null,
        discountType,
        discountValue: discountValue !== "" ? Number(discountValue) : null,
      },
      ...packages.map(p => ({ ...p, subtotal: calcPackageLine(p) })),
    ];
    const payload = {
      tourName: lines.map(l => l.tourName).join(" + "), tourSlug: lines[0].tourSlug,
      tourDate: lines[0].tourDate,
      // El grupo, NO la suma por tour (ver src/lib/admin/reserva.ts).
      ...grupoParaGuardar(lines, numPersonas),
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
    const r = await fetch(`/api/admin/cotizaciones/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      setQuotes(q => q.map(x => x.id === id ? { ...x, status: "expirada" } : x));
      flash("✅ Cotización marcada como expirada");
    } else {
      flash("❌ No se pudo actualizar la cotización");
    }
  }

  async function convertToReserva(q: TourQuote) {
    if (!confirm(`¿Convertir la cotización ${q.quoteNumber} a una reserva pagada?`)) return;
    const confirmationNumber = "HP-M-" + Date.now().toString(36).toUpperCase();
    const rawPkgs      = (q as any).packageItems ?? [];
    const meta         = getMeta(rawPkgs);
    const anticipo     = meta.anticipo != null ? Number(meta.anticipo) : 0;
    const packageItems = cleanPackages(rawPkgs);
    // Conservar el _meta de la reserva (método de pago / pickup) en lineItems.
    // Las líneas de tour de la cotización pasan tal cual: ahí viven las fechas,
    // el grupo por tour y los subtotales.
    const tourLines    = Array.isArray((q as any).lineItems)
      ? (q as any).lineItems.filter((l: any) => l && !l._meta)
      : [];
    // El grupo real: si la cotización no traía `numPersonas` capturado, se
    // deduce de las líneas en vez de guardar 0 y perder el dato.
    const grupo        = grupoDe(q as any);
    const personas     = Number(meta.numPersonas) || grupo.total || 0;
    const lineItems    = [
      {
        _meta: true,
        metodoPago: "Transferencia",
        folioPago: "",
        pickupLugar: "Lobby de tu hotel en Xilitla",
        numPersonas: personas,
        // Rastro de la cotización de origen y del descuento que se le aplicó:
        // sin esto se perdía POR QUÉ el total no cuadra con la suma de líneas.
        cotizacionOrigen: q.quoteNumber,
        priceOverride:    meta.priceOverride ?? null,
        discountType:     meta.discountType ?? null,
        discountValue:    meta.discountValue ?? null,
      },
      ...tourLines,
    ];

    const r = await fetch("/api/admin/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmationNumber,
        status:         "paid",
        tourId:         q.tourSlug,
        tourName:       q.tourName,
        tourSlug:       q.tourSlug,
        tourDate:       q.tourDate,
        // El grupo, no la suma por tour: la cotización pudo guardarse con el
        // formato viejo que sumaba, y ese error no debe heredarse a la reserva.
        adults:         grupo.adultos || 1,
        children:       grupo.ninos,
        totalAmount:    q.totalAmount,
        depositoPagado: anticipo, // anticipo acordado en la cotización
        lineItems,
        packageItems,
        customerName:   q.customerName,
        customerEmail:  q.customerEmail,
        customerPhone:  q.customerPhone,
        notes:          q.notes,
      }),
    });

    if (r.ok) {
      await fetch(`/api/admin/cotizaciones/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aceptada" }),
      });
      setQuotes(qs => qs.map(x => x.id === q.id ? { ...x, status: "aceptada" } : x));
      flash(`✅ Reserva creada · ${confirmationNumber}`);
    } else {
      const d = await r.json().catch(() => ({}));
      flash(`❌ Error: ${d.error || "No se pudo crear la reserva"}`);
    }
  }

  async function hardDeleteQ(id: string) {
    if (!confirm("¿Eliminar completamente esta cotización?")) return;
    const r = await fetch(`/api/admin/cotizaciones/${id}?hard=1`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      setQuotes(q => q.filter(x => x.id !== id));
      flash("✅ Cotización eliminada");
    } else {
      flash("❌ No se pudo eliminar la cotización");
    }
  }

  function downloadPDF(q: TourQuote) {
    const win = window.open("", "_blank");
    if (!win) { flash("❌ Permite las ventanas emergentes en tu navegador para descargar el PDF"); return; }

    const rawPkgs  = (q as any).packageItems ?? [];
    const meta     = getMeta(rawPkgs);
    const pkgs: PackageItem[] = cleanPackages(rawPkgs);
    const items: LineItem[] = Array.isArray((q as any).lineItems) && (q as any).lineItems.length
      ? (q as any).lineItems.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.children ?? 0), childrenSmall: l.childrenSmall ?? 0 }))
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }];

    const today    = new Date();
    const vigDays  = meta.vigencia === "48h" ? 2 : meta.vigencia === "15dias" ? 15 : meta.vigencia === "30dias" ? 30 : 7;
    const vigDate  = new Date(today.getTime() + vigDays * 24 * 60 * 60 * 1000);
    const vigLabel = meta.vigencia === "48h" ? "48 horas" : meta.vigencia === "15dias" ? "15 días" : meta.vigencia === "30dias" ? "30 días" : "7 días";
    const fmt      = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    const anticipoNum = meta.anticipo != null ? meta.anticipo : Math.round(q.totalAmount * 0.5);
    const saldo       = Math.max(0, q.totalAmount - anticipoNum);
    const toursTotal  = items.reduce((s, l) => s + calcLine(l), 0);
    const pkgsTotal   = pkgs.reduce((s, p) => s + calcPackageLine(p), 0);
    const descuento   = Math.max(0, toursTotal + pkgsTotal - q.totalAmount);

    const tourDates    = items.map(l => l.tourDate).filter(Boolean).sort();
    const checkouts    = pkgs.map(p => p.checkout).filter(Boolean).sort();
    const fechaInicio  = tourDates[0] || q.tourDate;
    const fechaFin     = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || q.tourDate;
    const d1 = new Date(fechaInicio + "T12:00:00");
    const d2 = new Date(fechaFin + "T12:00:00");
    const duracion     = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
    // Tamaño REAL del grupo (no sumar por tour: es el mismo grupo en todos los tours).
    // Prioridad: el número capturado en la cotización → máximo por tour → total guardado.
    const perTourMax   = items.length ? Math.max(...items.map(l => l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0))) : 0;
    const grupoQ       = grupoDe(q as any);
    const desgloseQ     = grupoLargo(grupoQ);
    const numPersonas  = Number(meta.numPersonas) > 0
      ? Number(meta.numPersonas)
      : (perTourMax > 0 ? perTourMax : q.adults + (q.children ?? 0));
    const hospNombre   = pkgs.length ? pkgs[0].hotel : "No incluye";

    const tourRows = items.map(l => {
      const esVeh = !!l.vehiculo; // línea por vehículo (RZR): sin conteo de personas
      const un    = Math.max(1, Number(l.unidades) || 1);
      const total = l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0);
      const sub   = esVeh
        ? "Precio por vehículo · gasolina, equipo y guía incluidos"
        : [
            l.adults > 0 ? `${l.adults} adulto${l.adults !== 1 ? "s" : ""}` : "",
            (l.childrenMid ?? 0) > 0 ? `${l.childrenMid} niño${l.childrenMid !== 1 ? "s" : ""} (6-10)` : "",
            (l.childrenSmall ?? 0) > 0 ? `${l.childrenSmall} niño${l.childrenSmall !== 1 ? "s" : ""} (<6)` : "",
          ].filter(Boolean).join(" · ");
      const fd = l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";
      return `<div class="row"><div><div class="tour-name">${l.tourName}</div><div class="tour-sub">${sub}</div></div><div class="num">${fd}</div><div class="num right">${esVeh ? `${un} veh.` : total}</div><div class="amt right">$${calcLine(l).toLocaleString("es-MX")}</div></div>`;
    }).join("");

    const hospRows = pkgs.map(p => {
      const fechas = [p.checkin ? fDate(p.checkin) : "", p.checkout ? fDate(p.checkout) : ""].filter(Boolean).join(" → ");
      return `<div class="row"><div><div class="tour-name">Hospedaje · ${p.noches} noche${p.noches !== 1 ? "s" : ""}</div><div class="tour-sub">${p.hotel} — ${p.habitacion}</div></div><div class="num">${fechas}</div><div class="num right">${p.habitaciones} hab.</div><div class="amt right">$${calcPackageLine(p).toLocaleString("es-MX")}</div></div>`;
    }).join("");

    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Cotización ${q.quoteNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@200;300;400;500;700&display=swap" rel="stylesheet">
<style>
:root{--negro:#0e1710;--verde-selva:#3a6b1a;--lima:#8fbe3a;--crema:#f4edd8;--dorado:#c4882a;--terracota:#9a4a1e;--display:'Cormorant Garamond',Georgia,serif;--dm:'DM Sans',system-ui,sans-serif;}
@page{size:A4 portrait;margin:0;}*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#2a2a2a;font-family:var(--dm);color:var(--negro);}
.page{width:210mm;height:296mm;background:var(--crema);overflow:hidden;position:relative;margin:24px auto;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:10mm 14mm 10mm;display:flex;flex-direction:column;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}html,body{background:white;}.page{margin:0;box-shadow:none;}}
.head{display:grid;grid-template-columns:1fr auto;align-items:flex-start;padding-bottom:4mm;border-bottom:1px solid rgba(14,23,16,.18);}
.brand{display:flex;align-items:baseline;gap:5mm;}.wordmark{font-family:var(--display);font-size:15pt;letter-spacing:4px;text-transform:uppercase;line-height:1;color:var(--negro);}
.contact{font-size:7.5pt;line-height:1.5;color:rgba(14,23,16,.65);margin-top:2mm;font-family:ui-monospace,monospace;}
.stamp{width:18mm;height:18mm;border-radius:50%;border:1px solid rgba(14,23,16,.4);display:flex;align-items:center;justify-content:center;position:relative;}
.h{font-family:var(--display);font-style:italic;font-size:16pt;color:var(--dorado);}
.title-block{margin-top:3mm;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:end;}
.title-block h1{font-family:var(--display);font-weight:300;font-size:28pt;margin:0;line-height:.95;}
.ital{font-style:italic;color:var(--dorado);}
.meta{text-align:right;font-size:8.5pt;line-height:1.5;}.meta .row{display:flex;justify-content:flex-end;gap:6mm;}
.meta .k{color:rgba(14,23,16,.55);letter-spacing:1.5px;text-transform:uppercase;font-size:8pt;}.meta .v{font-family:ui-monospace,monospace;color:var(--negro);}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:4mm;}
.card{border:1px solid rgba(14,23,16,.15);padding:4mm 5mm;}.card.dark{background:var(--negro);color:var(--crema);border-color:var(--negro);}
.card h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 2.5mm;line-height:1;}.card.dark h3{color:var(--crema);}
.card .field{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 5mm;}
.card .field .k{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;color:rgba(14,23,16,.55);}.card.dark .field .k{color:rgba(244,237,216,.55);}
.card .field .v{font-size:9pt;line-height:1.3;margin-top:.5mm;}
.tour-table{margin-top:4mm;}
.head-row{display:grid;grid-template-columns:1fr 28mm 18mm 28mm;padding:2mm 0;border-bottom:2px solid var(--negro);font-size:7.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:500;}
.row{display:grid;grid-template-columns:1fr 28mm 18mm 28mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.15);align-items:start;}
.tour-name{font-family:var(--display);font-size:11pt;line-height:1.15;font-weight:400;}
.tour-sub{font-size:7.5pt;color:rgba(14,23,16,.65);line-height:1.35;margin-top:.5mm;}
.num{font-family:ui-monospace,monospace;font-size:8.5pt;}.right{text-align:right;}
.amt{font-family:var(--display);font-style:italic;font-size:12pt;color:var(--terracota);}
.totals{margin-top:4mm;display:grid;grid-template-columns:1fr 65mm;align-items:start;gap:6mm;}
.note{font-size:7.5pt;line-height:1.5;color:rgba(14,23,16,.65);}.note strong{color:var(--negro);}
.calc{display:flex;flex-direction:column;gap:1mm;}
.line{display:flex;justify-content:space-between;font-size:8.5pt;padding:.8mm 0;}
.line.sub-line{border-bottom:1px solid rgba(14,23,16,.15);}
.line.grand{background:var(--negro);color:var(--crema);padding:3mm 4mm;margin-top:2mm;align-items:baseline;}
.line.grand .k{font-family:var(--dm);font-size:8pt;letter-spacing:2.5px;text-transform:uppercase;}
.line.grand .v{font-family:var(--display);font-style:italic;font-size:18pt;color:var(--dorado);line-height:1;}
.line.deposit{color:var(--terracota);font-weight:500;}
.checks{margin-top:4mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm;}
.checks h4{font-family:var(--display);font-size:11pt;font-weight:400;margin:0 0 2mm;}
.checks ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;}
.checks li{display:grid;grid-template-columns:auto 1fr;gap:1.5mm;font-size:7.5pt;line-height:1.3;}
.yes li::before{content:'✓';color:var(--verde-selva);font-weight:600;}
.no li::before{content:'×';color:var(--terracota);font-weight:600;}
.no li{color:rgba(14,23,16,.65);}
.foot{margin-top:auto;padding-top:4mm;border-top:1px solid rgba(14,23,16,.18);display:grid;grid-template-columns:1fr auto;gap:6mm;align-items:center;}
.terms{font-size:7.5pt;line-height:1.45;color:rgba(14,23,16,.65);}.terms strong{color:var(--negro);}
.cta{background:var(--negro);color:var(--crema);padding:3mm 6mm;text-decoration:none;text-align:center;}
.cta .lbl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;color:var(--lima);}
.cta .num{font-family:var(--display);font-style:italic;color:var(--dorado);font-size:13pt;margin-top:1mm;line-height:1;}
.pageno{position:absolute;bottom:10mm;right:18mm;font-size:8pt;letter-spacing:2px;color:rgba(14,23,16,.4);}
.runfoot{position:absolute;bottom:10mm;left:18mm;font-size:8pt;letter-spacing:2px;color:rgba(14,23,16,.4);text-transform:uppercase;}
</style></head><body>
<section class="page">
  <header class="head">
    <div>
      <div class="brand"><span class="wordmark">HUASTECA POTOSINA TOURS</span></div>
      <div class="contact">Manolo Covarrubias · guía local&#10;hola@huasteca-potosina.com · WhatsApp +52 489 125 1458&#10;Xilitla, San Luis Potosí, México · Operador SECTUR</div>
    </div>
    <div class="stamp">
      <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(14,23,16,0.35)" stroke-width="0.8"/>
        <defs><path id="arcC" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none"/></defs>
        <text font-family="DM Sans" font-size="6" letter-spacing="2.2" fill="rgba(14,23,16,0.55)"><textPath href="#arcC" startOffset="0%">★ HUASTECA · POTOSINA · TOURS ·</textPath></text>
      </svg>
      <div class="h">H</div>
    </div>
  </header>

  <div class="title-block">
    <div><h1>Cotización<br/><em class="ital">№ ${q.quoteNumber}</em></h1></div>
    <div class="meta">
      <div class="row"><span class="k">Emitida</span><span class="v">${fmt(today)}</span></div>
      <div class="row"><span class="k">Vigencia</span><span class="v">${fmt(vigDate)}</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3>Cliente</h3>
      <div class="field">
        <div><div class="k">Nombre</div><div class="v">${q.customerName}</div></div>
        <div><div class="k">Personas</div><div class="v">${numPersonas}</div><div class="v" style="font-size:7pt;color:rgba(14,23,16,.5)">${desgloseQ}</div></div>
        <div><div class="k">WhatsApp</div><div class="v">${q.customerPhone || "—"}</div></div>
        <div><div class="k">Email</div><div class="v" style="font-size:7.5pt">${q.customerEmail || "—"}</div></div>
        ${q.notes ? `<div style="grid-column:1/-1"><div class="k">Notas</div><div class="v" style="font-size:7.5pt">${q.notes}</div></div>` : ""}
      </div>
    </div>
    <div class="card dark">
      <h3>Detalles del viaje</h3>
      <div class="field">
        <div><div class="k">Fecha inicio</div><div class="v">${fDate(fechaInicio)}</div></div>
        <div><div class="k">Fecha fin</div><div class="v">${fDate(fechaFin)}</div></div>
        <div><div class="k">Duración</div><div class="v">${duracion} día${duracion !== 1 ? "s" : ""}</div></div>
        <div><div class="k">Hospedaje</div><div class="v" style="font-size:8pt">${hospNombre}</div></div>
        <div style="grid-column:1/-1"><div class="k">Recogida</div><div class="v">Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles</div></div>
      </div>
    </div>
  </div>

  <div class="tour-table">
    <div class="head-row"><span>Concepto</span><span>Fecha</span><span class="right">Pers.</span><span class="right">Subtotal MXN</span></div>
    ${tourRows}${hospRows}
  </div>

  <div class="totals">
    <div class="note"><strong>Sobre los precios:</strong> Todos los importes están en <strong>pesos mexicanos (MXN)</strong>. Vigencia: <strong>${vigLabel}</strong> desde la emisión. Tarifas sujetas a disponibilidad al confirmar.</div>
    <div class="calc">
      <div class="line"><span>Subtotal tours</span><span class="num">$${toursTotal.toLocaleString("es-MX")}</span></div>
      ${pkgsTotal > 0 ? `<div class="line"><span>Subtotal hospedaje</span><span class="num">$${pkgsTotal.toLocaleString("es-MX")}</span></div>` : ""}
      ${descuento > 0 ? `<div class="line sub-line"><span>Descuento aplicado</span><span class="num">−$${descuento.toLocaleString("es-MX")}</span></div>` : ""}
      <div class="line grand"><span class="k">Total</span><span class="v">$${q.totalAmount.toLocaleString("es-MX")}</span></div>
      <div class="line deposit"><span>Anticipo para reservar</span><span class="num">$${anticipoNum.toLocaleString("es-MX")}</span></div>
      <div class="line"><span>Saldo al inicio del tour</span><span class="num">$${saldo.toLocaleString("es-MX")}</span></div>
    </div>
  </div>

  <div class="checks">
    <div><h4>Sí incluye</h4>
      <ul class="yes">
        <li>Transporte desde y hacia tu hotel</li><li>Desayuno típico</li>
        <li>Entradas a todos los parques</li><li>Guía certificado NOM-09 SECTUR</li>
        <li>Equipo de seguridad</li><li>Seguro de viajero</li><li>Fotografías del recorrido</li>
      </ul>
    </div>
    <div><h4>No incluye</h4>
      <ul class="no">
        <li>Vuelos o transporte a Xilitla</li><li>Comidas y cenas</li>
        <li>Actividades opcionales</li><li>Propinas</li>
        <li>Bebidas alcohólicas</li><li>Gastos personales</li>
      </ul>
    </div>
  </div>

  <div class="foot">
    <div class="terms">Para apartar tu lugar realiza el pago del anticipo a la cuenta indicada o por transferencia. Recibirás confirmación por WhatsApp. Cancelación gratuita hasta 48 h antes del primer tour; posteriores aplican cargo del 50%. El saldo se paga el día del tour en efectivo, transferencia o tarjeta (3% comisión).</div>
    <a class="cta" href="https://wa.me/524891251458"><div class="lbl">Confirmar por WhatsApp</div><div class="num">+52 489 125 1458</div></a>
  </div>

  <span class="runfoot">Cotización № ${q.quoteNumber}</span>
  <span class="pageno">Página 1 de 1</span>
</section>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  }

  function waMsg(q: TourQuote) {
    const ph = (q.customerPhone || "524891251458").replace(/\D/g, "");
    return `https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${q.customerName}, tu cotización *${q.quoteNumber}*:\n\n*${q.tourName}*\nTotal: *${fmx(q.totalAmount)}*\nVálida 48 horas.\n\n¿Confirmamos?`)}`;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = quotes.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return !q || [c.customerName, c.customerEmail, c.quoteNumber, c.tourName].some(v => v?.toLowerCase().includes(q));
    });
    return [...list].sort((a, b) => {
      if (sortBy === "monto") return b.totalAmount - a.totalAmount;
      if (sortBy === "tourDate") return (b.tourDate || "").localeCompare(a.tourDate || "");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // más recientes
    });
  }, [quotes, search, statusFilter, sortBy]);

  const isEditMode = modal === "edit";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Cotizaciones</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">{quotes.length} cotizaciones · {quotes.filter(q => q.status === "aceptada").length} aceptadas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={sortBy} onChange={e => { playClick(); setSortBy(e.target.value as any); }}
            className="bg-white border border-[#1B4332]/20 text-[#1B4332]/70 text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] cursor-pointer">
            <option value="reciente">Más recientes</option>
            <option value="tourDate">Fecha de tour</option>
            <option value="monto">Mayor monto</option>
          </select>
          <button onClick={() => { playClick(); openNew(); }}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2.5 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <Plus className="w-4 h-4" />Nueva Cotización
          </button>
        </div>
      </div>

      {msg && (
        <div className={`animate-slide-up mb-4 text-sm font-dm px-4 py-2 rounded border ${msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>
      )}

      {/* Tabs de estado */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([
          { key: "all",      label: "Todas"     },
          { key: "borrador", label: "Borrador"  },
          { key: "enviada",  label: "Enviadas"  },
          { key: "aceptada", label: "Aceptadas" },
          { key: "expirada", label: "Expiradas" },
        ] as const).map(tab => {
          const count = tab.key === "all" ? quotes.length : quotes.filter(q => q.status === tab.key).length;
          return (
            <button key={tab.key} onClick={() => { playClick(); setStatusFilter(tab.key); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm whitespace-nowrap rounded-sm transition-colors ${
                statusFilter === tab.key ? "bg-[#1B4332] text-white" : "border border-[#1B4332]/15 text-[#1B4332]/60 hover:text-[#1B4332] hover:border-[#1B4332]/30"
              }`}>
              {tab.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-[#1B4332]/8 text-[#1B4332]/50"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, tour o número..."
          className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30 rounded-sm"
        />
      </div>

      {/* ── Tarjetas (móvil) ── */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 && <p className="py-10 text-center text-[#1B4332]/30 font-dm text-sm">Sin cotizaciones</p>}
        {filtered.map(q => {
          const s = STATUS[q.status] || { label: q.status, cls: "bg-gray-100 text-gray-600" };
          const sinEnviar = q.status === "borrador" && !!q.customerEmail;
          return (
            <div key={q.id} className="bg-white border border-[#1B4332]/10 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[#1B4332] font-mono text-xs font-medium">{q.quoteNumber}</span>
                <div className="flex items-center gap-1.5">
                  {sinEnviar && <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded font-dm bg-[#C9484A]/12 text-[#C9484A] font-bold">Sin enviar</span>}
                  <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm ${s.cls}`}>{s.label}</span>
                </div>
              </div>
              <p className="text-[#1B4332] font-medium">{q.customerName}</p>
              <p className="text-[#1B4332]/40 text-xs">{q.customerEmail || "—"}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[#1B4332]/70 text-sm truncate max-w-[60%]">{q.tourName}</p>
                <span className="text-[#52B788] font-medium text-sm">{fmx(q.totalAmount)}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1B4332]/8">
                {q.status !== "aceptada" && q.status !== "expirada" && (
                  <button onClick={() => { playClick(); convertToReserva(q); }} title="Convertir a reserva" className="text-[#1B4332]/50 hover:text-[#1B4332]"><BookCheck className="w-4 h-4" /></button>
                )}
                <button onClick={() => { playClick(); openEdit(q); }} className="text-[#1B4332]/50 hover:text-[#1B4332]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); sendEmail(q.id); }} disabled={sending === q.id} className="text-[#1B4332]/50 hover:text-[#1B4332] disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" onClick={() => playClick()} className="text-[#1B4332]/50 hover:text-[#25D366]"><MessageCircle className="w-4 h-4" /></a>
                <button onClick={() => { playClick(); downloadPDF(q); }} className="text-[#1B4332]/50 hover:text-[#52B788]"><Download className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); hardDeleteQ(q.id); }} className="text-[#1B4332]/50 hover:text-red-600 ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabla (escritorio) ── */}
      <div className="hidden md:block bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Número","Cliente","Tour(s)","Total","Estado","Acciones"].map(h => (
                  <th key={h} className="py-3 px-4 text-left font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-[#1B4332]/30 font-dm">Sin cotizaciones</td></tr>}
              {filtered.map(q => {
                const s = STATUS[q.status] || { label: q.status, cls: "bg-gray-100 text-gray-600" };
                const sinEnviar = q.status === "borrador" && !!q.customerEmail;
                return (
                  <tr key={q.id} className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/50 transition-colors">
                    <td className="py-3 px-4 text-[#1B4332] font-mono text-xs font-medium">{q.quoteNumber}</td>
                    <td className="py-3 px-4"><p className="text-[#1B4332] font-medium">{q.customerName}</p><p className="text-[#1B4332]/40 text-xs">{q.customerEmail || "—"}</p></td>
                    <td className="py-3 px-4 text-[#1B4332]/70 max-w-[200px]"><p className="truncate text-xs">{q.tourName}</p><p className="text-xs text-[#1B4332]/40">{fDate(q.tourDate)}</p></td>
                    <td className="py-3 px-4 text-[#52B788] font-medium whitespace-nowrap">{fmx(q.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${s.cls}`}>{s.label}</span>
                        {sinEnviar && <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded font-dm bg-[#C9484A]/12 text-[#C9484A] font-bold">Sin enviar</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {q.status !== "aceptada" && q.status !== "expirada" && (
                          <button onClick={() => { playClick(); convertToReserva(q); }} title="Convertir a reserva"
                            className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors"><BookCheck className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { playClick(); openEdit(q); }} title="Editar"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); sendEmail(q.id); }} disabled={sending === q.id} title="Enviar email"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                        <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" onClick={() => playClick()} title="WhatsApp"
                          className="text-[#1B4332]/40 hover:text-[#25D366] transition-colors"><MessageCircle className="w-4 h-4" /></a>
                        <button onClick={() => { playClick(); downloadPDF(q); }} title="PDF"
                          className="text-[#1B4332]/40 hover:text-[#52B788] transition-colors"><Download className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); expireQ(q.id); }} title="Marcar expirada"
                          className="text-[#1B4332]/40 hover:text-orange-500 transition-colors"><X className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); hardDeleteQ(q.id); }} title="Eliminar"
                          className="text-[#1B4332]/40 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
      {modal && (() => {
        const step1Valid = !!form.customerName.trim();
        const step2Valid = lines.every(l => !!l.tourSlug && !!l.tourDate);
        const TABS = [
          { n: 1 as const, label: "Cliente" },
          { n: 2 as const, label: "Tours" },
          { n: 3 as const, label: "Condiciones" },
        ];
        function goToTab(n: 1 | 2 | 3) {
          if (n <= step) { setStep(n); return; }
          if (n === 2 && step1Valid) setStep(2);
          if (n === 3 && step1Valid && step2Valid) setStep(3);
        }
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
          <div className="relative bg-white border border-[#1B4332]/10 w-full max-w-xl shadow-xl rounded-sm flex flex-col max-h-[95vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h2 className="font-cormorant text-[#1B4332] text-xl font-light">
                {isEditMode ? "Editar Cotización" : "Nueva Cotización"}
                {isEditMode && editTarget && <span className="text-[#1B4332] text-sm font-dm ml-2">{editTarget.quoteNumber}</span>}
              </h2>
              <button onClick={closeModal} className="text-[#1B4332]/40 hover:text-[#1B4332]"><X className="w-5 h-5" /></button>
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
                  <textarea value={form.notes} rows={3} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Preferencias, alergias, requerimientos especiales..."
                    className={`${inputCls} resize-none`} />
                </div>
              </div>
            )}

            {/* ── Step 2: Tours + Hospedaje ── */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Número de personas del grupo (para el PDF y el email — evita sumar por tour) */}
                <div className="bg-[#FAFAF8]/60 border border-[#1B4332]/10 rounded-sm p-3">
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                    Número de personas del grupo
                  </label>
                  <input type="number" min={1} max={40} value={numPersonas}
                    placeholder="Ej. 2"
                    onChange={e => setNumPersonas(e.target.value)}
                    className={`${inputCls} max-w-[140px]`} />
                  <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1.5">
                    Cuántas personas son en total (el mismo grupo que va a todos los tours). Así la
                    cotización en PDF muestra el número correcto y no suma las personas de cada tour.
                  </p>
                </div>

                {/* Tours */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Tours del paquete</p>
                    <button onClick={addLine}
                      className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                      <Plus className="w-3 h-3" />Agregar tour
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((line, i) => (
                      <div key={i} className="border border-[#1B4332]/10 p-3 rounded-sm bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Tour {i + 1}</span>
                          {lines.length > 1 && <button onClick={() => removeLine(i)} className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
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
                                          <option key={v.nombre} value={v.nombre}>{v.nombre} ({v.capacidad}) — {fmx(v.precios[rutaIdx])}</option>
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
                                    Precio por vehículo — los ocupantes no cambian el precio. ¿Otro modelo? Agrega otra línea.
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
                                  <input type="number" min={1} max={20} value={line.adults} onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="6-10 años — 30% descuento">Niños 6–10 años</label>
                                  <input type="number" min={0} max={12} value={line.childrenMid} onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                                </div>
                                <div>
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="Menores de 6 — 50% descuento">Niños &lt;6 años</label>
                                  <input type="number" min={0} max={12} value={line.childrenSmall} onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                                </div>
                              </div>
                            </>
                          )}
                          {line.tourSlug && <p className="text-right text-xs font-dm text-[#52B788]">Subtotal: {fmx(calcLine(line))}</p>}
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
                    <button type="button" onClick={() => setPackages(ps => [...ps, { ...EMPTY_PACKAGE }])}
                      className="flex items-center gap-1 text-xs font-dm text-[#40916C] border border-[#40916C]/30 px-2 py-1 hover:bg-[#40916C]/8 transition-colors rounded-sm">
                      <Plus className="w-3 h-3" />Agregar habitación
                    </button>
                  </div>
                  {packages.length === 0 && (
                    <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
                      Sin hospedaje — solo tours
                    </p>
                  )}
                  <div className="space-y-2">
                    {packages.map((pkg, i) => (
                      <div key={i} className="border border-[#40916C]/25 p-3 rounded-sm bg-[#FFFFFF]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] tracking-[2px] uppercase text-[#40916C]/70 font-dm flex items-center gap-1">
                            <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                          </span>
                          <button type="button" onClick={() => setPackages(ps => ps.filter((_, idx) => idx !== i))}
                            className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hotel</label>
                            <input type="text" value={pkg.hotel} className={inputCls}
                              onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, hotel: e.target.value } : p))} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Tipo de habitación</label>
                            <div className="flex gap-1.5 flex-wrap mb-1.5">
                              {HABITACIONES_PRESET.map(h => (
                                <button key={h.label} type="button"
                                  onClick={() => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, habitacion: h.label, precioPorNoche: h.precio, subtotal: calcPackageLine({ ...p, habitacion: h.label, precioPorNoche: h.precio }) } : p))}
                                  className={`text-[10px] font-dm px-2 py-1 rounded border transition-colors ${pkg.habitacion === h.label ? "bg-[#40916C] text-white border-[#40916C]" : "border-[#40916C]/30 text-[#40916C] hover:bg-[#40916C]/10"}`}>
                                  {h.label}
                                </button>
                              ))}
                            </div>
                            <input type="text" value={pkg.habitacion} placeholder="Personalizar..." className={inputCls}
                              onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, habitacion: e.target.value } : p))} />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Noches</label>
                              <input type="number" min={1} max={30} value={pkg.noches} className={inputCls}
                                onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, noches: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hab.</label>
                              <input type="number" min={1} max={10} value={pkg.habitaciones} className={inputCls}
                                onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, habitaciones: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">$/noche</label>
                              <input type="number" min={0} value={pkg.precioPorNoche} className={inputCls}
                                onChange={e => setPackages(ps => ps.map((p, idx) => { if (idx !== i) return p; const u = { ...p, precioPorNoche: Number(e.target.value) }; return { ...u, subtotal: calcPackageLine(u) }; }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-in</label>
                              <input type="date" value={pkg.checkin} className={inputCls}
                                onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, checkin: e.target.value } : p))} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-out</label>
                              <input type="date" value={pkg.checkout} className={inputCls}
                                onChange={e => setPackages(ps => ps.map((p, idx) => idx === i ? { ...p, checkout: e.target.value } : p))} />
                            </div>
                          </div>
                          <p className="text-right text-xs font-dm text-[#40916C] font-medium">
                            Subtotal: {fmx(calcPackageLine(pkg))}
                            <span className="text-[#1B4332]/35 font-normal ml-1">({pkg.noches}n × {pkg.habitaciones}hab × {fmx(pkg.precioPorNoche)})</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Running total */}
                {calcTotal > 0 && (
                  <div className="bg-[#FAFAF8]/70 border border-[#52B788]/20 rounded-sm px-4 py-3">
                    {pkgsTotal > 0 && (
                      <>
                        <div className="flex justify-between text-xs font-dm text-[#1B4332]/50 mb-1"><span>Tours</span><span>{fmx(toursTotal)}</span></div>
                        <div className="flex justify-between text-xs font-dm text-[#40916C] mb-2 pb-2 border-b border-[#52B788]/15"><span>Hospedaje</span><span>{fmx(pkgsTotal)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Total estimado</span>
                      <span className="font-cormorant text-[#52B788] text-xl">{fmx(calcTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Condiciones ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Vigencia */}
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Vigencia de la cotización</label>
                  <select value={vigencia} onChange={e => setVigencia(e.target.value)} className={inputCls}>
                    <option value="48h">48 horas</option>
                    <option value="7dias">7 días</option>
                    <option value="15dias">15 días</option>
                    <option value="30dias">30 días</option>
                  </select>
                </div>

                {/* Precio editable */}
                <div className="border border-[#52B788]/30 bg-[#52B788]/6 px-4 py-3 rounded-sm">
                  {pkgsTotal > 0 && (
                    <>
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]/50 mb-1"><span>Tours</span><span>{fmx(toursTotal)}</span></div>
                      <div className="flex justify-between text-xs font-dm text-[#40916C] mb-2 pb-2 border-b border-[#52B788]/15"><span>Hospedaje</span><span>{fmx(pkgsTotal)}</span></div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                        Subtotal {priceOverride !== "" ? <span className="text-[#52B788]">(editado)</span> : "(calculado)"}
                      </p>
                      {editingPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                          <input type="number" min={0} value={priceOverride}
                            onChange={e => setPriceOverride(e.target.value)}
                            placeholder={String(calcTotal)}
                            className="flex-1 border border-[#52B788]/50 bg-white text-[#52B788] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                            autoFocus />
                          <span className="text-[#1B4332]/40 font-dm text-sm">MXN</span>
                        </div>
                      ) : (
                        <p className="font-cormorant text-[#52B788] text-2xl">{fmx(baseTotal)}</p>
                      )}
                      {priceOverride !== "" && (
                        <button onClick={() => { setPriceOverride(""); setEditingPrice(false); }}
                          className="text-[10px] font-dm text-[#1B4332]/40 hover:text-[#1B4332] mt-1 underline">
                          Restaurar ({fmx(calcTotal)})
                        </button>
                      )}
                    </div>
                    <button onClick={() => { if (editingPrice) setEditingPrice(false); else { setEditingPrice(true); if (priceOverride === "") setPriceOverride(String(calcTotal)); } }}
                      className="flex items-center gap-1 border border-[#52B788]/40 text-[#52B788] px-2.5 py-1.5 text-xs font-dm hover:bg-[#52B788]/10 transition-colors rounded-sm">
                      {editingPrice ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      {editingPrice ? "OK" : "Editar"}
                    </button>
                  </div>
                </div>

                {/* Descuento */}
                <div className="border border-[#1B4332]/20 bg-[#1B4332]/5 px-4 py-3 rounded-sm">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-3">Descuento (opcional)</p>
                  <div className="flex gap-2 items-center">
                    <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
                      <button onClick={() => setDiscountType("percent")}
                        className={`px-3 py-2 text-xs font-dm transition-colors ${discountType === "percent" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>%</button>
                      <button onClick={() => setDiscountType("fixed")}
                        className={`px-3 py-2 text-xs font-dm transition-colors ${discountType === "fixed" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>$</button>
                    </div>
                    <input type="number" min={0} value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      placeholder={discountType === "percent" ? "ej. 10" : "ej. 500"}
                      className={`flex-1 ${inputCls}`} />
                    {discountValue !== "" && <button onClick={() => setDiscountValue("")} className="text-[#1B4332]/30 hover:text-red-500"><X className="w-4 h-4" /></button>}
                  </div>
                  {discountAmt > 0 && (
                    <p className="mt-2 text-xs font-dm text-[#1B4332]">
                      Descuento: −{fmx(discountAmt)}{discountType === "percent" && ` (${discountValue}%)`}
                    </p>
                  )}
                </div>

                {/* Total final */}
                {(discountAmt > 0 || baseTotal > 0) && (
                  <div className="border border-[#1B4332]/15 bg-[#1B4332] px-4 py-3 rounded-sm flex justify-between items-center">
                    <span className="text-[9px] tracking-[2px] uppercase text-white/50 font-dm">Total final</span>
                    <span className="font-cormorant text-[#52B788] text-2xl">{fmx(finalTotal)}</span>
                  </div>
                )}

                {/* Anticipo */}
                <div className="border border-[#C9484A]/20 bg-[#C9484A]/5 px-4 py-3 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Anticipo para reservar</p>
                    <button type="button" onClick={() => setAnticipo(String(Math.round(finalTotal * 0.5)))}
                      className="text-[9px] font-dm text-[#C9484A] border border-[#C9484A]/30 px-2 py-1 rounded-sm hover:bg-[#C9484A]/10 transition-colors">
                      50% = {fmx(Math.round(finalTotal * 0.5))}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#1B4332]/50 font-dm text-sm">$</span>
                    <input type="number" min={0} value={anticipo}
                      onChange={e => setAnticipo(e.target.value)}
                      placeholder={String(Math.round(finalTotal * 0.5))}
                      className={inputCls} />
                    <span className="text-[#1B4332]/50 font-dm text-sm">MXN</span>
                  </div>
                  {finalTotal > 0 && (
                    <p className="mt-1.5 text-[10px] font-dm text-[#1B4332]/50">
                      Saldo al tour: {fmx(Math.max(0, finalTotal - (anticipo !== "" ? Number(anticipo) : Math.round(finalTotal * 0.5))))}
                    </p>
                  )}
                </div>
              </div>
            )}

            </div>{/* end scrollable */}

            {/* Footer navigation */}
            <div className="px-6 pb-5 pt-3 border-t border-[#1B4332]/8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
                  className="flex items-center gap-1 text-xs font-dm text-[#1B4332]/50 hover:text-[#1B4332] px-3 py-2 border border-[#1B4332]/15 rounded-sm transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />Atrás
                </button>
              ) : <div />}

              {step < 3 ? (
                <button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 ? !step1Valid : !step2Valid}
                  className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-5 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={saveQuote}
                  disabled={saving || !form.customerName || lines.some(l => !l.tourSlug || !l.tourDate)}
                  className="bg-[#1B4332] hover:bg-[#2D5A45] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
                  {saving ? "Guardando..." : isEditMode ? "Actualizar cotización" : "Guardar cotización"}
                </button>
              )}
            </div>

          </div>
        </div>
        );
      })()}
    </div>
  );
}
