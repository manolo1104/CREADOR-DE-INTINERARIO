"use client";

import { useState, useMemo } from "react";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Trash2, Plus, Download, Pencil, Sun, SlidersHorizontal, ChevronDown, ChevronUp, BedDouble, Eye } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { ReservaModal, EMPTY_RESERVA_FORM, type ReservaFormState, type LineItem, type PackageItem, calcTourLine, calcPackageLine, addOnsDeTour, cantidadAddOn } from "@/components/admin/ReservaModal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import PagoProveedorCell, { type Evidencia } from "@/components/admin/PagoProveedorCell";
import { grupoDe, grupoCorto, grupoLargo, grupoParaGuardar, lineasDe, metaDe } from "@/lib/admin/reserva";
import { extrasDe, totalExtras, calcExtraLine, normalizarExtra, EXTRAS_PRESET, type PresetExtra } from "@/lib/admin/extras";
import ReservaDetalle from "@/components/admin/ReservaDetalle";

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

// Resumen corto del hospedaje para la lista (cada packageItem es una habitación
// que llega desde la cotización al convertirla a reserva).
function hospedajeSummary(b: TourBooking): string | null {
  const pkgs = (b as any).packageItems as PackageItem[] | null;
  if (!Array.isArray(pkgs) || pkgs.length === 0) return null;
  const noche = (n: number) => `${n} noche${n !== 1 ? "s" : ""}`;
  if (pkgs.length === 1) {
    const p = pkgs[0];
    const hab = (p.habitaciones ?? 1) > 1 ? ` · ${p.habitaciones} hab` : "";
    return `${p.habitacion} · ${noche(p.noches)}${hab}`;
  }
  const totalHab  = pkgs.reduce((s, p) => s + (p.habitaciones ?? 1), 0);
  const maxNoches = Math.max(...pkgs.map(p => p.noches ?? 0));
  return `${totalHab} habitaciones · ${noche(maxNoches)}`;
}

// ── Estado operativo por fecha de tour (zona horaria de México) ──────────────
const todayMX = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
function daysToTour(tourDate: string, today: string): number {
  if (!tourDate) return 9999;
  return Math.round((new Date(tourDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
}
function DaysChip({ d }: { d: number }) {
  const base = "inline-block text-[10px] font-dm font-medium px-2 py-0.5 rounded-full whitespace-nowrap";
  if (d === 9999) return <span className={`${base} bg-[#1B4332]/5 text-[#1B4332]/40`}>—</span>;
  if (d < 0)      return <span className={`${base} bg-gray-100 text-gray-400`}>Pasado</span>;
  if (d === 0)    return <span className={`${base} bg-[#52B788]/20 text-[#1B4332] font-bold`}>Hoy</span>;
  if (d === 1)    return <span className={`${base} bg-amber-100 text-amber-800 font-bold`}>Mañana</span>;
  if (d <= 3)     return <span className={`${base} bg-amber-50 text-amber-700`}>{d}d</span>;
  if (d <= 7)     return <span className={`${base} bg-[#52B788]/12 text-[#2D5A45]`}>{d}d</span>;
  return <span className={`${base} bg-[#1B4332]/5 text-[#1B4332]/50`}>{d}d</span>;
}

export default function ReservasClient(
  { initialBookings, initialEvidencias = [], presetsExtras = EXTRAS_PRESET }:
  { initialBookings: TourBooking[]; initialEvidencias?: Evidencia[]; presetsExtras?: PresetExtra[] },
) {
  const [bookings,      setBookings]      = useState(initialBookings);
  const [evidencias,    setEvidencias]    = useState<Evidencia[]>(initialEvidencias);
  const [detalle,       setDetalle]       = useState<TourBooking | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "paid" | "pending" | "cancelled">("all");
  const [loading,       setLoading]       = useState(false);
  const [sending,       setSending]       = useState<string | null>(null);
  const [statusEditing, setStatusEditing] = useState<string | null>(null);
  const [msg,           setMsg]           = useState("");
  const [modal,         setModal]         = useState<"new" | "edit" | null>(null);
  const [editTarget,    setEditTarget]    = useState<TourBooking | null>(null);
  const [form,          setForm]          = useState<ReservaFormState>(EMPTY_RESERVA_FORM);
  const [saving,        setSaving]        = useState(false);
  const [sortBy,        setSortBy]        = useState<"reciente" | "porLlegar" | "tourDate">("reciente");
  const [vistaHoy,      setVistaHoy]      = useState(false);
  const [showFilters,   setShowFilters]   = useState(false);
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const today = useMemo(() => todayMX(), []);

  // Las evidencias llegan en una sola lista (metadatos, sin los bytes) y se
  // agrupan aquí para no hacer un filter por fila en cada render.
  const evidenciasPorReserva = useMemo(() => {
    const m: Record<string, Evidencia[]> = {};
    for (const e of evidencias) (m[e.bookingId] ||= []).push(e);
    return m;
  }, [evidencias]);

  function patchProveedor(id: string, patch: Record<string, unknown>) {
    setBookings(bs => bs.map(x => x.id === id ? { ...x, ...patch } as TourBooking : x));
  }

  function setEvidenciasDe(bookingId: string, lista: Evidencia[]) {
    setEvidencias(prev => [...prev.filter(e => e.bookingId !== bookingId), ...lista]);
  }

  function flash(m: string) {
    setMsg(m);
    if (m.startsWith("✅")) playSuccess();
    else if (m.startsWith("❌")) playError();
    setTimeout(() => setMsg(""), 4000);
  }

  async function refresh() {
    setLoading(true);
    const r = await fetch("/api/admin/reservas");
    if (r.ok) setBookings(await r.json());
    // Las evidencias viven en otra tabla: se recargan aparte para que el
    // contador de adjuntos no quede desfasado tras refrescar.
    const e = await fetch("/api/admin/evidencia").catch(() => null);
    if (e?.ok) setEvidencias(await e.json());
    setLoading(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/reservas/${id}/send-email`, { method: "POST" });
    const d = await r.json();
    flash(r.ok ? "✅ Email enviado al cliente" : `❌ ${d.error || "Error"}`);
    setSending(null);
  }

  async function changeStatus(id: string, newStatus: string) {
    const r = await fetch(`/api/admin/reservas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => null);
    if (r?.ok) {
      setBookings(b => b.map(x => x.id === id ? { ...x, status: newStatus } : x));
      flash("✅ Estado actualizado");
    } else {
      flash("❌ No se pudo actualizar el estado");
    }
    setStatusEditing(null);
  }

  async function hardDelete(id: string) {
    if (!confirm("¿Eliminar completamente esta reserva? No se puede deshacer.")) return;
    const r = await fetch(`/api/admin/reservas/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      setBookings(b => b.filter(x => x.id !== id));
      flash("✅ Reserva eliminada");
    } else {
      flash("❌ No se pudo eliminar la reserva");
    }
  }

  function openEdit(b: TourBooking) {
    setEditTarget(b);
    const rawLines   = (b as any).lineItems as any[] | null;
    const meta       = rawLines?.find((l: any) => l._meta) || {};
    const cleanLines = rawLines?.filter((l: any) => !l._meta);
    const lines: LineItem[] = cleanLines?.length
      ? cleanLines.map((l: any) => ({
          ...l,
          childrenMid:   l.childrenMid   ?? (l.children ?? 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];
    const storedPkgs = (b as any).packageItems as PackageItem[] | null;

    // Preservar el total editado a mano: si el total guardado difiere del
    // calculado (precio ajustado, descuento de una cotización convertida, etc.)
    // lo cargamos como total editado para no perderlo al reabrir/guardar.
    const calcTotal = lines.reduce((s, l) => s + calcLine(l), 0)
                    + (storedPkgs ?? []).reduce((s, p) => s + calcPackageLine(p), 0)
                    + totalExtras(extrasDe((b as any).extraItems));

    setForm({
      customerName:   b.customerName,
      customerEmail:  b.customerEmail,
      customerPhone:  b.customerPhone || "",
      notes:          b.notes || "",
      lines,
      packages:       storedPkgs ?? [],
      extras:         extrasDe((b as any).extraItems),
      totalOverride:  b.totalAmount !== calcTotal ? String(b.totalAmount) : "",
      depositoPagado: String((b as any).depositoPagado ?? 0),
      metodoPago:     meta.metodoPago  || "Transferencia",
      folioPago:      meta.folioPago   || "",
      pickupLugar:    meta.pickupLugar || "Lobby de tu hotel en Xilitla",
      numPersonas:    meta.numPersonas ? String(meta.numPersonas) : "",
    });
    setModal("edit");
  }

  function buildPayload(form: ReservaFormState) {
    const lineItems = [
      { _meta: true, metodoPago: form.metodoPago, folioPago: form.folioPago, pickupLugar: form.pickupLugar, numPersonas: Number(form.numPersonas) || 0 },
      ...form.lines.map(l => ({ ...l, subtotal: calcLine(l) })),
    ];
    const packageItems = form.packages.map(p => ({ ...p, subtotal: calcPackageLine(p) }));
    const extraItems   = (form.extras ?? []).filter(e => e.concepto.trim()).map(normalizarExtra);
    const toursTotal   = lineItems.reduce((s, l) => s + ((l as any).subtotal ?? 0), 0);
    const pkgsTotal    = packageItems.reduce((s, p) => s + p.subtotal, 0);
    const extrasTotal  = totalExtras(extraItems);
    const calcTotal    = toursTotal + pkgsTotal + extrasTotal;
    const totalAmount  = form.totalOverride !== "" ? Number(form.totalOverride) || calcTotal : calcTotal;
    const primaryLine  = form.lines[0];
    const tourNames    = form.lines.map(l => l.tourName).filter(Boolean).join(" + ");
    return {
      tourId:         primaryLine.tourSlug,
      tourName:       tourNames || TOURS_DB.find(t => t.slug === primaryLine.tourSlug)?.nombre || "",
      tourSlug:       primaryLine.tourSlug,
      tourDate:       primaryLine.tourDate,
      // El mismo grupo va a TODOS los tours: se guarda el grupo, no la suma por
      // tour (sumar hacía que 2 personas con 5 tours quedaran como 10 adultos).
      ...grupoParaGuardar(form.lines, form.numPersonas),
      totalAmount,
      lineItems,
      packageItems,
      extraItems,
      depositoPagado: Number(form.depositoPagado) || 0,
      customerName:   form.customerName,
      customerEmail:  form.customerEmail,
      customerPhone:  form.customerPhone,
      notes:          form.notes,
    };
  }

  async function saveNew() {
    if (!form.customerName.trim()) { flash("❌ El nombre del cliente es obligatorio"); return; }
    if (form.lines.some(l => !l.tourSlug || !l.tourDate)) { flash("❌ Completa el tour y la fecha en cada línea"); return; }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) { flash("❌ El correo no tiene un formato válido"); return; }
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
    if (!win) { flash("❌ Permite las ventanas emergentes en tu navegador para descargar el PDF"); return; }

    const rawLines   = (b as any).lineItems as any[] | null;
    const meta       = rawLines?.find((l: any) => l._meta) || {};
    const cleanLines = rawLines?.filter((l: any) => !l._meta);
    const lines: LineItem[] = cleanLines?.length
      ? cleanLines.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.children ?? 0), childrenSmall: l.childrenSmall ?? 0 }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];

    const pkgs: PackageItem[] = (b as any).packageItems ?? [];
    const rawDeposito = (b as any).depositoPagado ?? 0;
    // Pago online por Stripe = liquidado al 100% aunque no tenga anticipo registrado.
    const deposito   = rawDeposito > 0 ? rawDeposito : (b.stripePaymentIntentId ? b.totalAmount : 0);
    const pendiente  = Math.max(0, b.totalAmount - deposito);
    const metodoPago = meta.metodoPago  || "—";
    const folioPago  = meta.folioPago   || "—";
    const pickupLugar = meta.pickupLugar || "Lobby de tu hotel en Xilitla";

    const tourDates  = lines.map(l => l.tourDate).filter(Boolean).sort();
    const checkouts  = pkgs.map(p => p.checkout).filter(Boolean).sort();
    const fechaInicio = tourDates[0] || b.tourDate;
    const fechaFin   = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || b.tourDate;
    // Tamaño REAL del grupo, desglosado en adultos y niños (ver lib/admin/reserva).
    const grupo       = grupoDe(b as any);
    const numPersonas = Number(meta.numPersonas) > 0 ? Number(meta.numPersonas) : grupo.total;
    const desglose    = grupoLargo(grupo);
    // Resumen de arriba: NO repetir los nombres (el itinerario de abajo ya los lista).
    // Con varios tours mostramos el conteo; con uno solo, su nombre.
    const tourResumen = lines.length > 1 ? `${lines.length} tours` : (lines[0]?.tourName || b.tourName);
    const confirmDate = new Date(b.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    const DIFIC: Record<string, string> = { baja: "Fácil", media: "Moderada", alta: "Difícil" };

    const dayRows = lines.map((l, i) => {
      const t    = TOURS_DB.find(t => t.slug === l.tourSlug);
      const dur  = t ? `${t.duracion_hrs} h` : "—";
      const dif  = t ? (DIFIC[t.dificultad] || t.dificultad) : "—";
      const fd   = l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }) : "—";
      const num  = String(i + 1).padStart(2, "0");
      const opcionales = addOnsDeTour(l.tourSlug)
        .map(a => ({ a, n: cantidadAddOn(l, a.id) }))
        .filter(x => x.n > 0)
        .map(({ a, n }) => `<span><span class="k">Incluye</span> ${a.nombre} · ${n} ${n === 1 ? "persona" : "personas"}</span>`)
        .join("");
      return `<div class="day">
        <div class="num">${num}</div>
        <div>
          <h4 class="name">${l.tourName}</h4>
          <div class="meta">
            <span><span class="k">Fecha</span> ${fd}</span>
            <span><span class="k">Dur.</span> ${dur}</span>
            <span><span class="k">Dif.</span> ${dif}</span>
            ${opcionales}
          </div>
        </div>
        <div class="pickup">
          <div class="k">Recogida</div>
          <div class="v">09:00</div>
          <div class="where">${pickupLugar}</div>
        </div>
      </div>`;
    }).join("");

    // Hospedaje: se ve claramente si la reserva lo incluye (habitación/es, hotel,
    // noches y fechas) o si es solo de tours. Los packageItems vienen de la cotización.
    const noche = (n: number) => `${n} noche${n !== 1 ? "s" : ""}`;
    const BED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`;
    const lodgingRows = pkgs.length
      ? pkgs.map(p => {
          const ci = p.checkin  ? fDate(p.checkin)  : "";
          const co = p.checkout ? fDate(p.checkout) : "";
          const fechas = ci && co ? `${ci} → ${co}` : (ci || co || "");
          const nHab   = p.habitaciones ?? 1;
          const habTxt = `${nHab} ${nHab === 1 ? "habitación" : "habitaciones"}`;
          return `<div class="stay">
            <div class="stay-ico">${BED_SVG}</div>
            <div>
              <h4 class="name">${p.habitacion}</h4>
              <div class="meta">
                ${p.hotel ? `<span><span class="k">Hotel</span> ${p.hotel}</span>` : ""}
                <span><span class="k">Habitaciones</span> ${habTxt}</span>
                <span><span class="k">Noches</span> ${noche(p.noches)}</span>
                ${fechas ? `<span><span class="k">Estancia</span> ${fechas}</span>` : ""}
              </div>
            </div>
          </div>`;
        }).join("")
      : `<div class="stay-none">Sin hospedaje — esta reserva es solo de tours.</div>`;
    const lodgingBlock = `<div class="lodging"><h3>Hospedaje</h3>${lodgingRows}</div>`;

    // Extras contratados (comida, transporte, guía privado). El cliente ve el
    // concepto y su importe; lo que a nosotros nos costó NO sale del panel.
    const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;
    const extras   = extrasDe((b as any).extraItems);
    const extrasBlock = extras.length
      ? `<div class="lodging"><h3>Incluye además</h3>${extras.map(ex => {
          const cobro = calcExtraLine(ex);
          const cant  = ex.cantidad > 1 ? `<span><span class="k">Cantidad</span> ${ex.cantidad}</span>` : "";
          const monto = ex.incluido || cobro === 0
            ? `<span><span class="k">Costo</span> Incluido</span>`
            : `<span><span class="k">Importe</span> $${cobro.toLocaleString("es-MX")}</span>`;
          return `<div class="stay">
            <div class="stay-ico">${PLUS_SVG}</div>
            <div>
              <h4 class="name">${ex.concepto}</h4>
              <div class="meta">
                ${ex.detalle ? `<span>${ex.detalle}</span>` : ""}
                ${cant}
                ${monto}
              </div>
            </div>
          </div>`;
        }).join("")}</div>`
      : "";

    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Confirmación ${b.confirmationNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@200;300;400;500;700&display=swap" rel="stylesheet">
<style>
:root{--negro:#0e1710;--verde-profundo:#1a2e1a;--verde-selva:#3a6b1a;--verde-vivo:#5a9e2a;--lima:#8fbe3a;--crema:#f4edd8;--arena:#e6d4b0;--dorado:#c4882a;--terracota:#9a4a1e;--display:'Cormorant Garamond',Georgia,serif;--dm:'DM Sans',system-ui,sans-serif;}
@page{size:A4 portrait;margin:0;}*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#2a2a2a;font-family:var(--dm);color:var(--negro);}
/* 🔴 Antes: height fijo + overflow:hidden. Con varios recorridos y hospedaje el
   itinerario empujaba hacia abajo las condiciones (cancelación, saldo, el día
   del tour) y la firma, y el voucher salía sin ellas. Ahora la hoja crece, se
   aprieta sola hasta caber, y si aun así no cabe sigue en otra página. */
.page{width:210mm;min-height:296mm;background:var(--crema);position:relative;margin:24px auto;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:visible;display:flex;flex-direction:column;}
.page.fluida{display:block;}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  html,body{background:var(--crema);}
  .page{margin:0;box-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
  .day,.stay,.keyinfo,.practical,.terms-strip,.terms-strip div,.foot,.summary{break-inside:avoid;page-break-inside:avoid;}
}

/* ── Compactado automático, dos niveles ────────────────────────────────── */
.compacta .hero{padding:7mm 12mm 5mm;}
.compacta .hero h1{font-size:25pt;}
.compacta .summary{padding:4mm 12mm;}
.compacta .body{padding:4mm 12mm;gap:5mm;}
.compacta .itin h3,.compacta .practical h3,.compacta .keyinfo h3{font-size:11.5pt;margin-bottom:2mm;}
.compacta .day{padding:1.7mm 0;}
.compacta .day .name,.compacta .stay .name{font-size:10pt;}
.compacta .day .meta,.compacta .stay .meta{font-size:6.8pt;}
.compacta .day .num{font-size:15pt;}
.compacta .stay{padding:1.7mm 0;}
.compacta .keyinfo{padding:3mm 4mm;}
.compacta .keyinfo .row{font-size:7.8pt;padding:.6mm 0;}
.compacta .practical{padding:3mm 4mm;}
.compacta .practical li{font-size:6.8pt;line-height:1.25;}
.compacta .terms-strip{padding:4mm 12mm 3mm;}
.compacta .terms-strip p{font-size:6.8pt;line-height:1.35;}
.compacta .terms-strip h3{font-size:10pt;}

.compacta2 .hero{padding:5.5mm 11mm 4mm;}
.compacta2 .hero h1{font-size:21pt;}
.compacta2 .summary{padding:3mm 11mm;}
.compacta2 .body{padding:3mm 11mm;gap:4mm;}
.compacta2 .day{padding:1.2mm 0;}
.compacta2 .day .name,.compacta2 .stay .name{font-size:9pt;}
.compacta2 .day .meta,.compacta2 .stay .meta{font-size:6.3pt;}
.compacta2 .day .num{font-size:13pt;}
.compacta2 .stay{padding:1.2mm 0;}
.compacta2 .keyinfo .row{font-size:7.2pt;}
.compacta2 .practical li{font-size:6.3pt;line-height:1.2;}
.compacta2 .terms-strip p{font-size:6.3pt;line-height:1.3;}
.hero{background:var(--negro);color:var(--crema);padding:9mm 14mm 7mm;position:relative;}
.hero::after{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(135deg,rgba(244,237,216,.04) 0 2px,transparent 2px 14px);pointer-events:none;}
.hero>*{position:relative;z-index:1;}
.hero .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm;}
.brand{display:flex;align-items:baseline;gap:4mm;}.wordmark{font-family:var(--display);font-size:14pt;letter-spacing:5px;text-transform:uppercase;color:var(--crema);line-height:1;}
.stamp{width:16mm;height:16mm;border-radius:50%;border:1px solid rgba(244,237,216,.4);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;}
.h{font-family:var(--display);font-style:italic;font-size:15pt;color:var(--dorado);}
.hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:7mm;align-items:end;}
.hero h1{font-family:var(--display);font-weight:300;font-size:30pt;line-height:.95;color:var(--crema);margin:2mm 0 0;letter-spacing:-.01em;}
.hero h1 em{font-style:italic;color:var(--dorado);}
.conf-badge{display:inline-flex;align-items:center;gap:2mm;background:var(--verde-selva);color:white;padding:1.5mm 3mm;font-size:7.5pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;}
.salute{font-family:var(--display);font-style:italic;font-size:10pt;color:rgba(244,237,216,.8);margin:0;line-height:1.4;}
.summary{background:var(--arena);padding:5mm 14mm;display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;}
.summary .item .k{font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;color:var(--verde-selva);margin-bottom:1.5mm;}
.summary .item .v{font-family:var(--display);font-size:12pt;line-height:1.1;color:var(--negro);}
.summary .item .sub{font-size:7pt;color:rgba(14,23,16,.5);margin-top:1mm;line-height:1.2;}
.summary .item .v.italic{font-style:italic;color:var(--dorado);}
.summary .item .v.mono{font-family:ui-monospace,monospace;font-size:9pt;font-style:normal;}
.body{padding:6mm 14mm;flex:1;display:grid;grid-template-columns:1.5fr 1fr;gap:7mm;min-height:0;}
.itin h3,.practical h3,.keyinfo h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 3mm;line-height:1;}
.day{display:grid;grid-template-columns:10mm 1fr auto;gap:3mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.12);align-items:start;}
.day:last-child{border-bottom:none;}
.day .num{font-family:var(--display);font-style:italic;font-size:18pt;color:var(--dorado);line-height:.9;}
.day .name{font-family:var(--display);font-size:11pt;line-height:1.15;margin:0;}
.day .meta{font-size:7.5pt;color:rgba(14,23,16,.62);margin-top:.8mm;display:flex;gap:3mm;flex-wrap:wrap;}
.day .meta .k{color:rgba(14,23,16,.4);text-transform:uppercase;letter-spacing:1px;font-size:6.5pt;}
.pickup{background:var(--negro);color:var(--crema);padding:2mm 3.5mm;text-align:right;min-width:24mm;}
.pickup .k{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;color:var(--lima);line-height:1;}
.pickup .v{font-family:var(--display);font-style:italic;font-size:12pt;color:var(--dorado);margin-top:.5mm;line-height:1;}
.pickup .where{font-size:6.5pt;opacity:.7;margin-top:.5mm;line-height:1.2;}
.lodging{margin-top:4mm;}
.lodging h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 2mm;line-height:1;}
.stay{display:grid;grid-template-columns:10mm 1fr;gap:3mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.12);align-items:start;}
.stay:last-child{border-bottom:none;}
.stay-ico{color:var(--dorado);display:flex;justify-content:center;padding-top:.8mm;}
.stay-ico svg{width:7mm;height:7mm;}
.stay .name{font-family:var(--display);font-size:11pt;line-height:1.15;margin:0;}
.stay .meta{font-size:7.5pt;color:rgba(14,23,16,.62);margin-top:.8mm;display:flex;gap:3mm;flex-wrap:wrap;}
.stay .meta .k{color:rgba(14,23,16,.4);text-transform:uppercase;letter-spacing:1px;font-size:6.5pt;}
.stay-none{font-style:italic;font-size:8.5pt;color:rgba(14,23,16,.55);padding:1.5mm 0;}
.right-col{display:flex;flex-direction:column;gap:5mm;}
.keyinfo{background:var(--arena);padding:4mm 5mm;}
.keyinfo .row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dashed rgba(14,23,16,.2);font-size:8.5pt;line-height:1.3;}
.keyinfo .row:last-child{border-bottom:none;}
.keyinfo .k{color:rgba(14,23,16,.55);letter-spacing:1.2px;text-transform:uppercase;font-size:7pt;}
.keyinfo .v{font-family:ui-monospace,monospace;font-size:8.5pt;}
.practical{border:1px solid rgba(14,23,16,.15);padding:4mm 5mm;background:#fffaf0;}
.practical ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;}
.practical li{display:grid;grid-template-columns:auto 1fr;gap:1.5mm;font-size:7.5pt;line-height:1.35;}
.practical li::before{content:'→';color:var(--verde-selva);}
.terms-strip{padding:5mm 14mm 4mm;background:var(--negro);color:var(--crema);}
.terms-strip .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;}
.terms-strip h3{font-family:var(--display);font-weight:300;font-size:11pt;margin:0 0 2mm;line-height:1;color:var(--crema);}
.terms-strip p{font-size:7.5pt;line-height:1.45;margin:0;color:rgba(244,237,216,.75);}
.terms-strip p strong{color:var(--dorado);font-weight:500;}
.foot{background:var(--verde-profundo);color:var(--crema);padding:5mm 14mm;display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:center;}
.foot .text{font-family:var(--display);font-style:italic;font-size:10pt;line-height:1.3;margin:0;max-width:115mm;}
.foot .text strong{color:var(--dorado);font-style:normal;font-weight:500;}
.wa{background:#25D366;color:white;padding:3mm 5mm;display:flex;align-items:center;gap:3mm;text-decoration:none;}
.wa .num{font-family:var(--display);font-style:italic;font-size:12pt;font-weight:500;line-height:1;white-space:nowrap;}
.wa .lbl{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;opacity:.9;}
.wa .dot{font-size:11pt;line-height:1;}
</style></head><body>
<section class="page">
  <div class="hero">
    <div class="top">
      <div class="brand"><span class="wordmark">HUASTECA POTOSINA TOURS</span></div>
      <div class="stamp">
        <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(244,237,216,0.4)" stroke-width="0.8"/>
          <defs><path id="arcCv" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none"/></defs>
          <text font-family="DM Sans" font-size="6" letter-spacing="2.2" fill="rgba(244,237,216,0.75)"><textPath href="#arcCv" startOffset="0%">★ HUASTECA · POTOSINA · TOURS ·</textPath></text>
        </svg>
        <div class="h">H</div>
      </div>
    </div>
    <div class="hero-grid">
      <div>
        <div class="conf-badge">✓ Reserva confirmada</div>
        <h1>Reserva <em>№ ${b.confirmationNumber}</em></h1>
      </div>
      <p class="salute">Hola <strong style="color:var(--crema)">${b.customerName}</strong>, gracias por confiar en nosotros. Tu reserva quedó confirmada el ${confirmDate}.</p>
    </div>
  </div>

  <div class="summary">
    <div class="item"><div class="k">${lines.length > 1 ? "Tours" : "Tour"}</div><div class="v italic">${tourResumen}</div></div>
    <div class="item"><div class="k">Fechas</div><div class="v mono">${fDate(fechaInicio)} al ${fDate(fechaFin)}</div></div>
    <div class="item"><div class="k">Personas</div><div class="v">${numPersonas}</div><div class="sub">${desglose}</div></div>
    <div class="item">
      <div class="k">Total · saldo</div>
      <div class="v italic">$${b.totalAmount.toLocaleString("es-MX")}</div>
      ${pendiente > 0 ? `<div class="v mono" style="color:var(--terracota);margin-top:1mm">saldo $${pendiente.toLocaleString("es-MX")}</div>` : `<div class="v mono" style="color:#3a6b1a;margin-top:1mm">pagado ✓</div>`}
    </div>
  </div>

  <div class="body">
    <div class="itin">
      <h3>Itinerario <em style="font-style:italic;color:var(--dorado)">día por día</em></h3>
      ${dayRows}
      ${lodgingBlock}
      ${extrasBlock}
    </div>
    <div class="right-col">
      <div class="keyinfo">
        <h3>Pago</h3>
        <div class="row"><span class="k">Anticipo pagado</span><span class="v">$${deposito > 0 ? deposito.toLocaleString("es-MX") : "—"}</span></div>
        <div class="row"><span class="k">Saldo pendiente</span><span class="v">$${pendiente > 0 ? pendiente.toLocaleString("es-MX") : "0"}</span></div>
        <div class="row"><span class="k">Método</span><span class="v">${metodoPago}</span></div>
        <div class="row"><span class="k">Folio</span><span class="v">${folioPago}</span></div>
      </div>
      <div class="practical">
        <h3>Qué empacar</h3>
        <ul>
          <li>Traje de baño (2)</li><li>Sandalias acuáticas</li>
          <li>Tenis ligeros</li><li>Bloqueador biodegradable</li>
          <li>Repelente</li><li>Toalla microfibra</li>
          <li>Bolsa seca</li><li>Identificación</li>
          <li>Efectivo</li><li>Gorra o sombrero</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="terms-strip">
    <div class="row">
      <div><h3>Cancelación</h3><p><strong>Gratis</strong> hasta 48 h antes del primer tour. Después aplica cargo del 50%. Fuerza mayor: reagendamos sin costo.</p></div>
      <div><h3>Saldo</h3><p>El <strong>saldo de $${pendiente.toLocaleString("es-MX")} MXN</strong> se paga el primer día del tour. Efectivo, transferencia o tarjeta (3% comisión).</p></div>
      <div><h3>El día del tour</h3><p>Tu guía coordinará por <strong>WhatsApp</strong> la hora exacta de recogida en tu hotel. Lleva esta confirmación impresa o en pantalla.</p></div>
    </div>
  </div>

  <div class="foot">
    <p class="text"><strong>Manolo Covarrubias</strong>, fundador & guía local · Xilitla, SLP — gracias por elegir vivir la Huasteca con nosotros.</p>
    <a class="wa" href="https://wa.me/524891251458"><span class="dot">●</span><span><span class="lbl">WhatsApp soporte</span><div class="num">+52 489 125 1458</div></span></a>
  </div>
</section>
<script>
/* El voucher se mide contra una A4 real y se aprieta solo hasta caber. */
(function () {
  var page = document.querySelector('.page');
  var sonda = document.createElement('div');
  sonda.style.cssText = 'position:absolute;visibility:hidden;height:296mm;top:0;';
  document.body.appendChild(sonda);
  var A4 = sonda.offsetHeight;
  sonda.remove();
  var alto = function () { return page.getBoundingClientRect().height; };
  if (alto() > A4 + 2) page.classList.add('compacta');
  if (alto() > A4 + 2) page.classList.add('compacta2');
  if (alto() > A4 + 2) page.classList.add('fluida');
})();
</script>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = bookings.filter(b => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (vistaHoy) {
        const dd = daysToTour(b.tourDate, today);
        if (b.status === "cancelled" || !(dd === 0 || dd === 1)) return false;
      }
      if (dateFrom && b.tourDate < dateFrom) return false;
      if (dateTo && b.tourDate > dateTo) return false;
      return !q || [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName].some(v => v?.toLowerCase().includes(q));
    });
    return [...list].sort((a, b) => {
      if (sortBy === "reciente") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "tourDate") return (b.tourDate || "").localeCompare(a.tourDate || "");
      // "porLlegar": próximos primero (futuros ascendente), pasados al final
      const da = daysToTour(a.tourDate, today), db = daysToTour(b.tourDate, today);
      const fa = da < 0 ? 1 : 0, fb = db < 0 ? 1 : 0;
      return fa !== fb ? fa - fb : da - db;
    });
  }, [bookings, search, statusFilter, vistaHoy, dateFrom, dateTo, sortBy, today]);

  const hoyCount = useMemo(
    () => bookings.filter(b => b.status !== "cancelled" && [0, 1].includes(daysToTour(b.tourDate, today))).length,
    [bookings, today]
  );
  const hasDateFilter = !!(dateFrom || dateTo);
  const totalIngresos = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Reservas de Tours</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">
            {bookings.filter(b => b.status !== "cancelled").length} activas ·{" "}
            <span className="text-[#1B4332] font-medium">{fmx(totalIngresos)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { playClick(); setVistaHoy(v => !v); }}
            title="Tours de hoy y mañana"
            className={`flex items-center gap-2 px-3 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm border ${
              vistaHoy ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/40"
            }`}>
            <Sun className="w-3.5 h-3.5" />Hoy
            {hoyCount > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${vistaHoy ? "bg-white/20 text-white" : "bg-[#52B788]/20 text-[#1B4332] font-bold"}`}>{hoyCount}</span>
            )}
          </button>
          <select value={sortBy} onChange={e => { playClick(); setSortBy(e.target.value as any); }}
            className="bg-white border border-[#1B4332]/20 text-[#1B4332]/70 text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] cursor-pointer">
            <option value="reciente">Más recientes</option>
            <option value="porLlegar">Por llegar</option>
            <option value="tourDate">Fecha de tour</option>
          </select>
          <button onClick={() => { playClick(); setShowFilters(s => !s); }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm border ${
              showFilters || hasDateFilter ? "bg-[#1B4332]/8 border-[#1B4332]/40 text-[#1B4332]" : "border-[#1B4332]/20 text-[#1B4332]/60 hover:text-[#1B4332]"
            }`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />Filtros
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { playClick(); refresh(); }} disabled={loading}
            className="flex items-center gap-2 border border-[#1B4332]/20 text-[#1B4332]/60 hover:text-[#1B4332] px-3 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors disabled:opacity-40 rounded-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Actualizar
          </button>
          <button onClick={() => { playClick(); setForm(EMPTY_RESERVA_FORM); setModal("new"); }}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <Plus className="w-4 h-4" />Nueva Reserva
          </button>
        </div>
      </div>

      {msg && (
        <div className={`animate-slide-up mb-4 text-sm font-dm px-4 py-2 rounded border ${msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([
          { key: "all",       label: "Todas"      },
          { key: "paid",      label: "Pagadas"    },
          { key: "pending",   label: "Pendientes" },
          { key: "cancelled", label: "Canceladas" },
        ] as const).map(tab => {
          const count = tab.key === "all" ? bookings.length : bookings.filter(b => b.status === tab.key).length;
          return (
            <button key={tab.key} onClick={() => { playClick(); setStatusFilter(tab.key); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm whitespace-nowrap rounded-sm transition-colors ${
                statusFilter === tab.key
                  ? "bg-[#1B4332] text-white"
                  : "border border-[#1B4332]/15 text-[#1B4332]/60 hover:text-[#1B4332] hover:border-[#1B4332]/30"
              }`}>
              {tab.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-[#1B4332]/8 text-[#1B4332]/50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panel de filtros (rango de fechas) */}
      {showFilters && (
        <div className="animate-slide-up bg-white border border-[#1B4332]/12 rounded-sm p-4 mb-3 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-[10px] tracking-[1px] uppercase text-[#1B4332]/50 font-dm">
            Fecha de tour desde
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
          </label>
          <label className="flex flex-col gap-1 text-[10px] tracking-[1px] uppercase text-[#1B4332]/50 font-dm">
            Hasta
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
          </label>
          {hasDateFilter && (
            <button onClick={() => { playClick(); setDateFrom(""); setDateTo(""); }}
              className="text-xs font-dm text-[#1B4332]/60 hover:text-[#C9484A] underline underline-offset-2 transition-colors pb-2">
              Limpiar fechas
            </button>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o confirmación..."
          className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30 rounded-sm"
        />
      </div>

      {/* ── Tarjetas (móvil) ── */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 && <p className="py-10 text-center text-[#1B4332]/30 font-dm text-sm">Sin resultados</p>}
        {filtered.map(b => {
          const rawDeposito = (b as any).depositoPagado ?? 0;
          const deposito = rawDeposito > 0 ? rawDeposito : (b.stripePaymentIntentId ? b.totalAmount : 0);
          const pendiente = Math.max(0, b.totalAmount - deposito);
          const hosp = hospedajeSummary(b);
          return (
            <div key={b.id} onClick={() => { playClick(); setDetalle(b); }}
              className="bg-white border border-[#1B4332]/10 rounded-md p-4 cursor-pointer active:bg-[#FAFAF8]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[#1B4332] font-mono text-xs font-medium">{b.confirmationNumber}</span>
                <div className="flex items-center gap-2">
                  <DaysChip d={daysToTour(b.tourDate, today)} />
                  <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>{STATUS_LABEL[b.status] || b.status}</span>
                </div>
              </div>
              <p className="text-[#1B4332] font-medium">{b.customerName}</p>
              <p className="text-[#1B4332]/40 text-xs">{b.customerEmail}</p>
              <p className="text-[#1B4332]/70 text-sm mt-1">{b.tourName}</p>
              {hosp && (
                <p className="flex items-center gap-1 text-[#52B788] text-xs mt-0.5">
                  <BedDouble className="w-3 h-3 shrink-0" />{hosp}
                </p>
              )}
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-[#1B4332]/60">{fDate(b.tourDate)} · {grupoCorto(grupoDe(b as any))}</span>
                <span className="text-[#52B788] font-medium">{fmx(b.totalAmount)}</span>
              </div>
              {pendiente > 0 && <p className="text-orange-600 text-[10px] mt-1">Saldo pendiente: {fmx(pendiente)}</p>}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1B4332]/8" onClick={e => e.stopPropagation()}>
                <button onClick={() => { playClick(); sendEmail(b.id); }} disabled={sending === b.id} className="text-[#1B4332]/50 hover:text-[#1B4332] disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); downloadPDF(b); }} className="text-[#1B4332]/50 hover:text-[#52B788]"><Download className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); openEdit(b); }} className="text-[#1B4332]/50 hover:text-[#1B4332]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); hardDelete(b.id); }} className="text-[#1B4332]/50 hover:text-red-600 ml-auto"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 pt-3 border-t border-[#1B4332]/8" onClick={e => e.stopPropagation()}>
                <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-1.5">Pago al proveedor</p>
                <PagoProveedorCell
                  reserva={b as any}
                  evidencias={evidenciasPorReserva[b.id] ?? []}
                  onChange={patchProveedor}
                  onEvidencias={setEvidenciasDe}
                  flash={flash}
                  compacto
                />
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
                {["Confirmación","Cliente","Tour","Fecha","Llega","Personas","Total","Anticipo","Estado","Acciones","Proveedor"].map(h => (
                  <th key={h} className={`py-3 px-3 text-left font-dm ${h === "Proveedor" ? "sticky right-0 z-20 bg-[#FAFAF8] border-l border-[#1B4332]/10 w-[150px] min-w-[150px]" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={11} className="py-12 text-center text-[#1B4332]/30 font-dm">Sin resultados</td></tr>}
              {filtered.map(b => {
                const rawDeposito = (b as any).depositoPagado ?? 0;
                const deposito = rawDeposito > 0 ? rawDeposito : (b.stripePaymentIntentId ? b.totalAmount : 0);
                const pendiente = Math.max(0, b.totalAmount - deposito);
                const hosp = hospedajeSummary(b);
                return (
                  <tr key={b.id} onClick={() => { playClick(); setDetalle(b); }}
                    title="Ver todos los detalles"
                    className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/50 transition-colors cursor-pointer">
                    <td className="py-3 px-3 text-[#1B4332] font-mono text-xs font-medium">{b.confirmationNumber}</td>
                    <td className="py-3 px-3"><p className="text-[#1B4332] font-medium">{b.customerName}</p><p className="text-[#1B4332]/40 text-xs">{b.customerEmail}</p></td>
                    <td className="py-3 px-3 max-w-[170px]">
                      <p className="text-[#1B4332]/70 truncate text-xs">{b.tourName}</p>
                      {hosp && (
                        <p className="flex items-center gap-1 text-[#52B788] text-[10px] mt-0.5" title={hosp}>
                          <BedDouble className="w-3 h-3 shrink-0" /><span className="truncate">{hosp}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#1B4332]/70 whitespace-nowrap text-xs">{fDate(b.tourDate)}</td>
                    <td className="py-3 px-3">{b.status !== "cancelled" ? <DaysChip d={daysToTour(b.tourDate, today)} /> : <span className="text-[#1B4332]/20 text-xs">—</span>}</td>
                    <td className="py-3 px-3 text-[#1B4332]/70 text-xs" title={grupoLargo(grupoDe(b as any))}>{grupoCorto(grupoDe(b as any))}</td>
                    <td className="py-3 px-3 text-[#52B788] font-medium whitespace-nowrap text-xs">{fmx(b.totalAmount)}</td>
                    <td className="py-3 px-3 text-xs">
                      {deposito > 0 ? (
                        <div>
                          <p className="text-green-700 font-medium">{fmx(deposito)}</p>
                          {pendiente > 0 && <p className="text-orange-600 text-[10px]">Pend: {fmx(pendiente)}</p>}
                        </div>
                      ) : <span className="text-[#1B4332]/30">—</span>}
                    </td>
                    <td className="py-3 px-3 relative" onClick={e => e.stopPropagation()}>
                      {statusEditing === b.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setStatusEditing(null)} />
                          <div className="absolute left-0 top-8 z-20 bg-white border border-[#1B4332]/15 shadow-lg rounded-sm overflow-hidden min-w-[120px]">
                            {(["paid", "pending", "cancelled"] as const).map(s => (
                              <button key={s} onClick={() => { playClick(); changeStatus(b.id, s); }}
                                className={`w-full text-left px-3 py-2 text-[10px] font-dm tracking-[1px] uppercase hover:bg-[#FAFAF8] transition-colors flex items-center gap-2 ${b.status === s ? "text-[#1B4332] font-semibold" : "text-[#1B4332]/60"}`}>
                                {b.status === s && <span className="text-[#1B4332]">✓</span>}
                                {STATUS_LABEL[s]}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <button onClick={() => { playClick(); setStatusEditing(statusEditing === b.id ? null : b.id); }}
                        title="Cambiar estado"
                        className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm cursor-pointer hover:opacity-75 transition-opacity ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </button>
                    </td>
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { playClick(); setDetalle(b); }} title="Ver detalles"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); sendEmail(b.id); }} disabled={sending === b.id} title="Enviar email"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors disabled:opacity-25"><Mail className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); downloadPDF(b); }} title="Descargar PDF"
                          className="text-[#1B4332]/40 hover:text-[#52B788] transition-colors"><Download className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); openEdit(b); }} title="Editar"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); hardDelete(b.id); }} title="Eliminar"
                          className="text-[#1B4332]/40 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="py-3 px-3 w-[150px] min-w-[150px] whitespace-nowrap sticky right-0 z-10 bg-white border-l border-[#1B4332]/10"
                        onClick={e => e.stopPropagation()}>
                      <PagoProveedorCell
                        reserva={b as any}
                        evidencias={evidenciasPorReserva[b.id] ?? []}
                        onChange={patchProveedor}
                        onEvidencias={setEvidenciasDe}
                        flash={flash}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <ReservaDetalle
          reserva={detalle}
          evidencias={evidenciasPorReserva[detalle.id] ?? []}
          onClose={() => setDetalle(null)}
        />
      )}

      {modal === "new" && (
        <ReservaModal title="Nueva Reserva Manual" form={form} setForm={setForm} presetsExtras={presetsExtras}
          onSave={saveNew} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal === "edit" && (
        <ReservaModal title="Editar Reserva" form={form} setForm={setForm} presetsExtras={presetsExtras}
          onSave={saveEdit} onClose={() => { setModal(null); setEditTarget(null); }} saving={saving} />
      )}
    </div>
  );
}
