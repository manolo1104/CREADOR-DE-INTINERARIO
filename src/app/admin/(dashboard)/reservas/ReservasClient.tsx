"use client";

import { descargarArchivo } from "@/lib/admin/descargarArchivo";
import { cobradoDe } from "@/lib/admin/dinero";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Plus, Download, Pencil, Sun, SlidersHorizontal, ChevronDown, ChevronUp, BedDouble, Eye, Banknote, Trash2 } from "lucide-react";
import { CodigoTour } from "@/components/admin/CodigoTour";
import { TOURS_LISTA } from "@/lib/tours";
import { descuentoDeMeta, historialDeMeta, montoDescuento } from "@/lib/admin/descuento";
import { ajusteDeTotal, avisoCambioDeTotal, totalConAjuste } from "@/lib/admin/precioPactado";
import { habitacionesParaEditar, lineaParaGuardar } from "@/lib/admin/reservaEdicion";
import { ReservaModal, EMPTY_RESERVA_FORM, ZONA_TEXTO, zonaDeTexto, type ReservaFormState, type LineItem, type PackageItem, calcTourLine, calcPackageLine, lineaCompleta } from "@/components/admin/ReservaModal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import { grupoDe, grupoCorto, grupoLargo, grupoParaGuardar, lineasDe, metaDe } from "@/lib/admin/reserva";
import { extrasDe, totalExtras, normalizarExtra, EXTRAS_PRESET, type PresetExtra } from "@/lib/admin/extras";
import ReservaDetalle from "@/components/admin/ReservaDetalle";
import { pickupParaFormulario } from "@/lib/admin/hospedaje";
import CobroModal from "@/components/admin/CobroModal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { avisoDeCobro } from "@/lib/admin/metodosCobro";
import { origenValido } from "@/lib/origenReserva";
import { MOTIVOS_CANCELACION, motivoParaGuardar, type MotivoCancelacion } from "@/lib/admin/cancelacion";
import { CheckinBoton } from "@/components/admin/Checkin";
import type { EstadoCheckin } from "@/lib/encuestas/opciones";

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
  { initialBookings, presetsExtras = EXTRAS_PRESET, verCostos = true, quien = "Admin", checkins: checkinsIniciales = {}, abrir = null }:
  { initialBookings: TourBooking[]; presetsExtras?: PresetExtra[]; verCostos?: boolean; quien?: string; checkins?: Record<string, EstadoCheckin>;
    /** Desde la ficha de un lead: la reserva a abrir (y si es para cobrar). */
    abrir?: { folio: string; cobrar: boolean } | null },
) {
  const router = useRouter();
  const [bookings,      setBookings]      = useState(initialBookings);
  // El estado del check-in de cada reserva (21 oct 2026). Vive aparte de la
  // reserva: lo actualizan el botón de la fila y la ficha.
  const [checkins,      setCheckins]      = useState(checkinsIniciales);
  const ponCheckin = (id: string) => (e: EstadoCheckin) => setCheckins(c => ({ ...c, [id]: e }));
  const [detalle,       setDetalle]       = useState<TourBooking | null>(null);
  const [cobrando,      setCobrando]      = useState<TourBooking | null>(null);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<"all" | "paid" | "pending" | "cancelled">("all");
  const [loading,       setLoading]       = useState(false);
  const [sending,       setSending]       = useState<string | null>(null);
  const [statusEditing, setStatusEditing] = useState<string | null>(null);
  // Cancelar pide el motivo (3 nov 2026): la reserva que se está cancelando y lo elegido.
  const [cancelando,    setCancelando]    = useState<TourBooking | null>(null);
  const [motivo,        setMotivo]        = useState<MotivoCancelacion | "">("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  // Eliminar (20 nov 2026): solo la que no tiene dinero; el servidor decide y dice por qué no.
  const [eliminando,    setEliminando]    = useState(false);
  const [aviso,         setAviso]         = useState<{ texto: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const reloj = setTimeout(() => setAviso(null), aviso.error ? 15000 : 10000);
    return () => clearTimeout(reloj);
  }, [aviso]);
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

  // `?folio=HP-…` (y `&cobrar=1`) desde la ficha del lead: se busca esa reserva
  // y se abre su detalle o su cobro, una sola vez.
  const reservaPedida = abrir ? initialBookings.find(b => b.confirmationNumber === abrir.folio) ?? null : null;
  useEffect(() => {
    if (!abrir || !reservaPedida) return;
    setSearch(abrir.folio);
    if (abrir.cobrar) setCobrando(reservaPedida); else setDetalle(reservaPedida);
    // Una sola vez: recargar o Atrás/Adelante ya no vuelve a abrir el cobro.
    router.replace("/admin/reservas", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los guías que ya se han asignado alguna vez. Salen de las propias
  // reservas: no hace falta darlos de alta en ningún lado, y el nombre se
  // ofrece al escribir para que "Beto" no acabe guardado de cuatro maneras.
  const guiasConocidos = useMemo(() => {
    const vistos = new Set<string>();
    for (const b of bookings) {
      const g = ((b as any).guia || "").trim();
      if (g) vistos.add(g);
    }
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, "es"));
  }, [bookings]);

  function flash(m: string) {
    setMsg(m);
    if (m.startsWith("✅")) playSuccess();
    else if (m.startsWith("❌")) playError();
    setTimeout(() => setMsg(""), 4000);
  }

  async function refresh(): Promise<TourBooking[] | null> {
    setLoading(true);
    const r = await fetch("/api/admin/reservas");
    const lista = r.ok ? await r.json() : null;
    if (lista) setBookings(lista);
    setLoading(false);
    return lista;
  }

  async function sendEmail(id: string) {
    setSending(id);
    // Dice a qué correo salió (19 nov 2026); sin red o con un error que no es
    // JSON, el botón ya no se queda trabado.
    const r = await fetch(`/api/admin/reservas/${id}/send-email`, { method: "POST" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    flash(r?.ok ? `✅ Confirmación enviada ${d.destinatario ? `a ${d.destinatario}` : "al cliente"}` : `❌ ${d.error || "No se pudo enviar el email"}`);
    setSending(null);
  }

  async function changeStatus(id: string, newStatus: string, motivoCancelacion?: string, forzarCupo = false) {
    const r = await fetch(`/api/admin/reservas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(motivoCancelacion ? { status: newStatus, motivoCancelacion } : { status: newStatus, ...(forzarCupo ? { forzarCupo: true } : {}) }),
    }).catch(() => null);
    // Reactivar una salida llena: el servidor pregunta antes de sobrevender.
    if (r?.status === 409) {
      const d = await r.json().catch(() => null);
      if (d?.sePuedeForzar && window.confirm(d.error)) return changeStatus(id, newStatus, motivoCancelacion, true);
      flash(`❌ ${d?.error || "No se reactivó"}`); setStatusEditing(null); return;
    }
    if (r?.ok) {
      // El estado que quedó de verdad: con cobros, «pagada» o «pendiente» lo decide el dinero.
      const d = await r.json().catch(() => null);
      const final = typeof d?.updated?.status === "string" ? d.updated.status : newStatus;
      setBookings(b => b.map(x => x.id === id
        ? { ...x, status: final, depositoPagado: d?.updated?.depositoPagado ?? x.depositoPagado, motivoCancelacion: newStatus === "cancelled" ? (motivoCancelacion ?? null) : null }
        : x));
      // Al cancelar, sus ligas sin pagar se apagan solas (lote 3, 5 nov 2026): que se note.
      const ligas = d?.ligasApagadas > 0 ? ` · ${d.ligasApagadas === 1 ? "su liga de pago ya no se puede pagar" : `sus ${d.ligasApagadas} ligas de pago ya no se pueden pagar`}` : "";
      flash((final !== newStatus ? `✅ Estado actualizado: queda «${final === "paid" ? "pagada" : "pendiente"}» por lo que ya se cobró` : "✅ Estado actualizado") + ligas);
      router.refresh(); // su lead pudo cambiar de etapa (cancelar / reactivar)
    } else {
      const d = await r?.json().catch(() => null);
      flash(`❌ ${d?.error || "No se pudo actualizar el estado"}`);
    }
    setStatusEditing(null);
  }

  // El bote sale en todas menos las pagadas en el sitio con tarjeta (dinero en
  // Stripe); el servidor decide lo demás (ligas pagadas, corte cerrado) y, si
  // tiene cobros anotados (a mano o por el bot), pregunta otra vez con el monto.
  const sePuedeIntentarEliminar = (b: TourBooking) => !b.stripePaymentIntentId;

  async function eliminarReserva(b: TourBooking) {
    if (!window.confirm(`¿Eliminar la reserva ${b.confirmationNumber} de ${b.customerName}? Se borra por completo y no se puede deshacer.\n\nÚsalo para pruebas, duplicados o errores. Si el cliente canceló, mejor cancélala con su motivo: así cuenta en los números.`)) return;
    playClick(); setEliminando(true);
    try {
      const url = `/api/admin/reservas/${encodeURIComponent(b.id)}`;
      let r = await fetch(url, { method: "DELETE" });
      let d = await r.json().catch(() => null);
      // Con cobros anotados: el servidor pide una segunda confirmación con el monto.
      if (r.status === 409 && d?.confirmar) {
        if (!window.confirm(`${d.confirmar}\n\n¿Eliminar ${b.confirmationNumber} de todos modos?`)) return;
        r = await fetch(`${url}?conCobros=1`, { method: "DELETE" });
        d = await r.json().catch(() => null);
      }
      if (r.ok || r.status === 404) {
        playSuccess();
        setBookings(bs => bs.filter(x => x.id !== b.id));
        setCancelando(null);
        setAviso({ texto: r.ok ? `Reserva ${b.confirmationNumber} eliminada.` : (d?.error || "Esa reserva ya no existía.") });
        router.refresh();
      } else {
        playError();
        setAviso({ texto: d?.error || "No se pudo eliminar la reserva", error: true });
      }
    } catch {
      playError(); setAviso({ texto: "No se pudo eliminar: revisa tu conexión e intenta de nuevo", error: true });
    } finally { setEliminando(false); }
  }

  // Cancelar pasa por el cuadro del motivo; los demás estados cambian directo.
  function pedirEstado(b: TourBooking, s: string) {
    if (s === "cancelled" && b.status !== "cancelled") {
      setStatusEditing(null); setMotivo(""); setMotivoDetalle(""); setCancelando(b);
      return;
    }
    changeStatus(b.id, s);
  }

  async function confirmarCancelacion() {
    if (!cancelando) return;
    const texto = motivoParaGuardar(motivo, motivoDetalle);
    if (!texto) { flash("❌ Elige el motivo (y explícalo si es «Otro»)"); return; }
    await changeStatus(cancelando.id, "cancelled", texto);
    setCancelando(null);
  }

  function openEdit(b: TourBooking) {
    setEditTarget(b);
    const rawLines   = (b as any).lineItems as any[] | null;
    const meta       = rawLines?.find((l: any) => l._meta) || {};
    const cleanLines = rawLines?.filter((l: any) => !l._meta);
    const lines: LineItem[] = cleanLines?.length
      ? cleanLines.map((l: any) => ({
          ...l,
          // Sin desglose (renglón viejo): los menores son el tramo de antes.
          childrenMid:   l.childrenMid   ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];
    // Con su precio por noche aunque la web no lo guarde (sale de su importe):
    // antes el hotel valía NaN y se guardaba sin importe (lote 5, 5 nov 2026).
    const storedPkgs = habitacionesParaEditar((b as any).packageItems as PackageItem[] | null);

    // Preservar el precio pactado: si el total guardado difiere del calculado
    // (precio fijado en la cotización, lo que cobró la web, un trato), la
    // diferencia se carga como AJUSTE sobre la lista (lote 4, 5 nov 2026). 🔴
    // Antes iba como «total editado» y se borraba al tocar cualquier renglón,
    // aunque fuera solo la fecha: el total brincaba al de lista y el saldo con él.
    // El descuento guardado (o el de la cotización de origen) se vuelve a poner
    // como descuento, con su candado: ya no se esconde dentro del total.
    const descuento = descuentoDeMeta(meta);
    const calcTotal = lines.reduce((s, l) => s + calcLine(l), 0)
                    + (storedPkgs ?? []).reduce((s, p) => s + calcPackageLine(p), 0)
                    + totalExtras(extrasDe((b as any).extraItems));
    const conDescuento = calcTotal - montoDescuento(descuento, calcTotal);

    setForm({
      customerName:   b.customerName,
      customerEmail:  b.customerEmail,
      customerPhone:  b.customerPhone || "",
      notes:          b.notes || "",
      lines,
      packages:       storedPkgs ?? [],
      extras:         extrasDe((b as any).extraItems),
      ajustePrecio:   ajusteDeTotal(b.totalAmount, conDescuento),
      descuentoTipo:      descuento?.tipo ?? "percent",
      descuentoValor:     descuento ? String(descuento.valor) : "",
      descuentoGuardado:  descuento,
      descuentoHistorial: historialDeMeta(meta),
      codigoCumple: typeof meta.codigoCumple === "string" ? meta.codigoCumple : "",
      depositoPagado: String((b as any).depositoPagado ?? 0),
      metodoPago:     meta.metodoPago  || "Transferencia",
      folioPago:      meta.folioPago   || "",
      // 🔴 Vacío salvo que alguien lo haya anotado (5 nov 2026): proponer el
      // «Lobby de tu hotel en Xilitla» hacía que editar la reserva solo para
      // asignar el guía lo dejara escrito, y el correo lo imprimía como punto de
      // salida (al del RZR, al del buceo, al que duerme en Valles). Vacío, el
      // correo usa el punto de encuentro de cada recorrido.
      pickupLugar:    pickupParaFormulario(meta.pickupLugar),
      // Solo lo que se ELIGIÓ (botones, web o bot): adivinarla del hotel la
      // escribiría al guardar como si alguien la hubiera elegido.
      zona:           zonaDeTexto(meta.zonaHospedaje),
      numPersonas:    meta.numPersonas ? String(meta.numPersonas) : "",
      // Al EDITAR se respeta lo guardado (las reservas viejas traen el "web"
      // del default). Al CREAR manda `EMPTY_RESERVA_FORM`, que arranca en
      // WhatsApp porque es de donde vienen las capturas a mano.
      origen:         origenValido((b as any).origen),
      guia:           (b as any).guia || "",
      idiomaTour:     (b as any).idiomaTour === "en" ? "en" : "es",
      notasInternas:  meta.notasInternas || "",
    });
    setModal("edit");
  }

  /**
   * `metaPrevio`: el `_meta` de la reserva que se edita. Va PRIMERO y lo del
   * formulario encima: el formulario no captura `cotizacionOrigen`,
   * `anticipoAcordado`, `locale`, `waChatId`, `zonaHospedaje`… y sin esto
   * guardar los borraba. Sin `cotizacionOrigen` un /confirma de la cotización
   * original creaba OTRA reserva con su cobro; sin `locale` la confirmación
   * salía en español a quien compró en inglés.
   */
  function buildPayload(form: ReservaFormState, metaPrevio: Record<string, any> = {}) {
    const lineItems = [
      {
        ...metaPrevio,
        _meta: true, metodoPago: form.metodoPago, folioPago: form.folioPago,
        pickupLugar: form.pickupLugar, numPersonas: Number(form.numPersonas) || 0,
        // El descuento va dicho siempre (también «sin descuento»): el servidor
        // compara con lo guardado y sella quién lo cambió (ver `descuento.ts`).
        descuento: Number(form.descuentoValor) > 0
          ? { tipo: form.descuentoTipo, valor: Math.round(Number(form.descuentoValor)) }
          : null,
        // Sin elegir se queda lo que ya traía (lo que entendió el bot, la web).
        ...(form.zona ? { zonaHospedaje: ZONA_TEXTO[form.zona] } : {}),
        // El código de cumpleaños que respalda el descuento: el servidor lo
        // canjea al guardar (o lo libera si se quitó). Va siempre dicho.
        codigoCumple: form.codigoCumple || null,
        // Viaja en el `_meta` y NO en la columna `notes`: `notes` se imprime en
        // el correo y en el comprobante del cliente, y esto no puede salir de
        // aquí. Ver `notasInternas` en ReservaModal.
        notasInternas: form.notasInternas.trim(),
        // El precio pactado, guardado como ajuste sobre la lista (lote 4, 5 nov
        // 2026): dice POR QUÉ el total no es la suma de los renglones.
        ajustePrecio: form.ajustePrecio !== 0 ? form.ajustePrecio : null,
      },
      // `children` al día con los dos tramos (lote 5): quitar a los niños ya
      // no los deja ocupando cupo ni lugar en la salida.
      ...form.lines.map(l => lineaParaGuardar({ ...l, subtotal: calcLine(l) })),
    ];
    const packageItems = form.packages.map(p => ({ ...p, subtotal: calcPackageLine(p) }));
    const extraItems   = (form.extras ?? []).filter(e => e.concepto.trim()).map(normalizarExtra);
    const toursTotal   = lineItems.reduce((s, l) => s + ((l as any).subtotal ?? 0), 0);
    const pkgsTotal    = packageItems.reduce((s, p) => s + p.subtotal, 0);
    const extrasTotal  = totalExtras(extraItems);
    const sinDescuento = toursTotal + pkgsTotal + extrasTotal;
    const calcTotal    = sinDescuento - montoDescuento(
      Number(form.descuentoValor) > 0 ? { tipo: form.descuentoTipo, valor: Math.round(Number(form.descuentoValor)) } : null,
      sinDescuento,
    );
    // El precio pactado va encima de la lista como ajuste: no se pierde al editar.
    const totalAmount  = totalConAjuste(calcTotal, form.ajustePrecio);
    const primaryLine  = form.lines[0];
    const tourNames    = form.lines.map(l => l.tourName).filter(Boolean).join(" + ");
    return {
      tourId:         primaryLine.tourSlug,
      tourName:       tourNames || TOURS_LISTA.find(t => t.slug === primaryLine.tourSlug)?.nombre || "",
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
      // Columna de verdad, no `_meta`: el desglose de ingresos agrupa por ella
      // y lo que vive dentro de `lineItems` no se puede agrupar.
      origen:         form.origen,
      guia:           form.guia.trim(),
      idiomaTour:     form.idiomaTour === "en" ? "en" : "es",
    };
  }

  async function saveNew() {
    if (!form.customerName.trim()) { flash("❌ El nombre del cliente es obligatorio"); return; }
    if (!form.lines.every(lineaCompleta)) { flash("❌ Completa el concepto y la fecha en cada línea"); return; }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) { flash("❌ El correo no tiene un formato válido"); return; }
    setSaving(true);
    const confirmationNumber = "HP-M-" + Date.now().toString(36).toUpperCase();
    const datos = buildPayload(form);
    // 🔴 Revisión del 4 nov 2026: el anticipo ya NO se guarda como número suelto
    // (quedaba sin método ni quién lo recibió, y no salía en el efectivo de cada
    // quien). La reserva nace pendiente y se abre el cobro con ese monto puesto.
    const anticipo = datos.depositoPagado;
    const r = await fetch("/api/admin/reservas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationNumber, ...datos, status: "pending", depositoPagado: 0 }),
    });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      const lista = await refresh(); setModal(null); setForm(EMPTY_RESERVA_FORM);
      const nueva = anticipo > 0 ? lista?.find(b => b.id === j?.id) : null;
      if (nueva) {
        const lineas = Array.isArray((nueva as any).lineItems) ? (nueva as any).lineItems : [];
        setCobrando({ ...nueva, lineItems: [{ _meta: true, anticipoAcordado: anticipo }, ...lineas.filter((l: any) => !l?._meta)] } as TourBooking);
        flash(`✅ Reserva creada. Ahora registra cómo entró el anticipo de $${anticipo.toLocaleString("es-MX")}`);
      } else flash(j?.avisoCupo ? `✅ Reserva creada. ${j.avisoCupo}` : "✅ Reserva creada");
    }
    // Antes un error no decía nada: el botón dejaba de girar y ya.
    else { const j = await r.json().catch(() => ({})); flash(`❌ ${j.error || "No se pudo guardar la reserva"}`); }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editTarget) return;
    // 🔴 Al editar NO se manda `depositoPagado`: ese número es el espejo de los
    // cobros registrados. Mandarlo desde un formulario abierto hace un rato
    // pisaría un cobro que se capturó mientras tanto.
    const { depositoPagado: _ignorado, ...payload } = buildPayload(form, metaDe(editTarget));
    // Si el total se mueve, se pregunta antes, diciendo de cuánto a cuánto
    // (lote 4, 5 nov 2026): el saldo que cobra el guía sale de aquí.
    const aviso = avisoCambioDeTotal(editTarget.totalAmount, payload.totalAmount);
    if (aviso && !window.confirm(aviso)) return;
    setSaving(true);
    let r = await fetch(`/api/admin/reservas/${editTarget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Cambió la fecha o la gente y ya no cabe (lote 5, 5 nov 2026): se pregunta
    // antes de sobrevender; a veces se suma una unidad y se guarda igual.
    if (r.status === 409) {
      const d = await r.clone().json().catch(() => null);
      if (d?.sePuedeForzar) {
        if (!window.confirm(d.error)) {
          setSaving(false);
          flash("Sin cambios: la reserva se quedó como estaba.");
          return;
        }
        r = await fetch(`/api/admin/reservas/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, forzarCupo: true }),
        });
      }
    }
    if (r.ok) {
      await refresh();
      setModal(null); setEditTarget(null); flash("✅ Reserva actualizada");
    } else {
      const j = await r.json().catch(() => ({}));
      flash(`❌ ${j.error || "No se pudo guardar la reserva"}`);
    }
    setSaving(false);
  }

  function downloadPDF(b: TourBooking) {
    // El comprobante dice «✓ Reserva confirmada»: una cancelada no lo lleva (lote 5).
    if (b.status === "cancelled") { flash("❌ Esta reserva está cancelada: no lleva comprobante."); return; }
    // 27 nov 2026: un PDF de verdad, armado en el servidor. Antes se abría el
    // HTML y se imprimía: desde el celular salía con márgenes, la URL y la
    // fecha al pie, y el itinerario aplastado.
    descargarArchivo(`/api/admin/documento/${encodeURIComponent(b.confirmationNumber)}`, `Confirmación ${b.confirmationNumber}.pdf`);
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

      {reservaPedida && (reservaPedida as any).oportunidadId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#1B4332]/15 bg-[#F3F8F5] px-4 py-2.5 text-sm font-dm text-[#1B4332]">
          <span>Reserva <span className="font-mono">{reservaPedida.confirmationNumber}</span> de <strong>{reservaPedida.customerName}</strong>.</span>
          <Link href={`/admin/leads/${(reservaPedida as any).oportunidadId}`} className="panel-foco font-semibold hover:underline">← Volver a su ficha</Link>
        </div>
      )}
      {msg && (
        // Con el formulario abierto el aviso flota encima (si no, queda tapado
        // por el modal y un error al guardar no se ve). Sin translate: la
        // animación escribe `transform` y descentraría el aviso.
        <div className={`animate-slide-up mb-4 text-sm font-dm px-4 py-2 rounded border ${modal ? "fixed top-4 inset-x-4 md:left-auto md:right-6 md:max-w-md z-[90] shadow-lg" : ""} ${msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
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
          const deposito = rawDeposito > 0 ? rawDeposito : cobradoDe(b as any);
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
              <p className="text-[#1B4332]/70 text-sm mt-1 flex items-center gap-1.5">
                <CodigoTour slug={b.tourSlug} className="text-[11px]" />
                <span className="truncate">{b.tourName}</span>
              </p>
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
                {/* Cancelada: ni «Tu tour está confirmado», ni comprobante, ni check-in (lote 5). */}
                {b.status !== "cancelled" && <button onClick={() => { playClick(); sendEmail(b.id); }} disabled={sending === b.id} className="text-[#1B4332]/50 hover:text-[#1B4332] disabled:opacity-25"><Mail className="w-4 h-4" /></button>}
                {b.status !== "cancelled" && <button onClick={() => { playClick(); downloadPDF(b); }} className="text-[#1B4332]/50 hover:text-[#52B788]"><Download className="w-4 h-4" /></button>}
                <button onClick={() => { playClick(); openEdit(b); }} className="text-[#1B4332]/50 hover:text-[#1B4332]"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { playClick(); setCobrando(b); }} title="Registrar cobro"
                  className={pendiente > 0 ? "text-[#52B788]" : "text-[#1B4332]/50 hover:text-[#52B788]"}><Banknote className="w-4 h-4" /></button>
                {b.status !== "cancelled" && <CheckinBoton r={b} estado={checkins[b.id]} onEstado={ponCheckin(b.id)} />}
                {sePuedeIntentarEliminar(b) && <button onClick={() => void eliminarReserva(b)} disabled={eliminando} title="Eliminar reserva" aria-label="Eliminar reserva"
                  className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[#b8413f]/60 hover:text-[#b8413f] disabled:opacity-25"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabla (escritorio) ── */}
      <div className="hidden md:block panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Confirmación","Cliente","Tour","Fecha","Llega","Personas","Guía","Total","Anticipo","Estado","Acciones"].map(h => (
                  <th key={h} className="py-3 px-3 text-left font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={11} className="py-12 text-center text-[#1B4332]/30 font-dm">Sin resultados</td></tr>}
              {filtered.map(b => {
                const rawDeposito = (b as any).depositoPagado ?? 0;
                const deposito = rawDeposito > 0 ? rawDeposito : cobradoDe(b as any);
                const pendiente = Math.max(0, b.totalAmount - deposito);
                const hosp = hospedajeSummary(b);
                return (
                  <tr key={b.id} onClick={() => { playClick(); setDetalle(b); }}
                    title="Ver todos los detalles"
                    className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/50 transition-colors cursor-pointer">
                    <td className="py-3 px-3 text-[#1B4332] font-mono text-xs font-medium">{b.confirmationNumber}</td>
                    <td className="py-3 px-3"><p className="text-[#1B4332] font-medium">{b.customerName}</p><p className="text-[#1B4332]/40 text-xs">{b.customerEmail}</p></td>
                    <td className="py-3 px-3 max-w-[170px]">
                      {/* El nombre viene cortado en esta columna ("ista — Edwar…"):
                          el código de tres letras es lo que de verdad identifica. */}
                      <p className="text-[#1B4332]/70 text-xs flex items-center gap-1.5">
                        <CodigoTour slug={b.tourSlug} className="text-[10px] flex-shrink-0" />
                        <span className="truncate">{b.tourName}</span>
                      </p>
                      {hosp && (
                        <p className="flex items-center gap-1 text-[#52B788] text-[10px] mt-0.5" title={hosp}>
                          <BedDouble className="w-3 h-3 shrink-0" /><span className="truncate">{hosp}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#1B4332]/70 whitespace-nowrap text-xs">{fDate(b.tourDate)}</td>
                    <td className="py-3 px-3">{b.status !== "cancelled" ? <DaysChip d={daysToTour(b.tourDate, today)} /> : <span className="text-[#1B4332]/20 text-xs">—</span>}</td>
                    <td className="py-3 px-3 text-[#1B4332]/70 text-xs" title={grupoLargo(grupoDe(b as any))}>{grupoCorto(grupoDe(b as any))}</td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      {(b as any).guia
                        ? <span className="text-[#1B4332]/75">{(b as any).guia}</span>
                        : <span className="text-orange-600/70" title="Nadie asignado todavía">Sin asignar</span>}
                      {(b as any).idiomaTour === "en" && (
                        <span className="ml-1 text-[9px] tracking-[1px] uppercase bg-[#1a4e8a]/10 text-[#1a4e8a] px-1.5 py-0.5 rounded-sm" title="El tour sale en inglés">EN</span>
                      )}
                    </td>
                    <td className="panel-cifra py-3 px-3 text-[#2b845c] font-medium whitespace-nowrap text-xs">{fmx(b.totalAmount)}</td>
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
                              <button key={s} onClick={() => { playClick(); pedirEstado(b, s); }}
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
                        {/* Cancelada: ni «Tu tour está confirmado», ni comprobante, ni check-in (lote 5). */}
                        {b.status !== "cancelled" && <button onClick={() => { playClick(); sendEmail(b.id); }} disabled={sending === b.id} title="Enviar email"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors disabled:opacity-25"><Mail className="w-4 h-4" /></button>}
                        {b.status !== "cancelled" && <button onClick={() => { playClick(); downloadPDF(b); }} title="Descargar PDF"
                          className="text-[#1B4332]/40 hover:text-[#52B788] transition-colors"><Download className="w-4 h-4" /></button>}
                        <button onClick={() => { playClick(); openEdit(b); }} title="Editar"
                          className="text-[#1B4332]/40 hover:text-[#1B4332] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { playClick(); setCobrando(b); }} title="Registrar cobro"
                          className="text-[#1B4332]/40 hover:text-[#52B788] transition-colors"><Banknote className="w-4 h-4" /></button>
                        {b.status !== "cancelled" && <CheckinBoton r={b} estado={checkins[b.id]} onEstado={ponCheckin(b.id)} />}
                        {sePuedeIntentarEliminar(b) && <button onClick={() => void eliminarReserva(b)} disabled={eliminando} title="Eliminar reserva" aria-label="Eliminar reserva"
                          className="text-[#b8413f]/50 hover:text-[#b8413f] transition-colors disabled:opacity-25"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setCancelando(null)} />
          <div role="dialog" aria-labelledby="cancelar-titulo" className="relative bg-white rounded-sm shadow-2xl w-full max-w-md border border-[#1B4332]/10 p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Cancelar reserva</p>
            <h3 id="cancelar-titulo" className="font-cormorant text-[#1B4332] text-2xl font-light mt-1">{cancelando.customerName}</h3>
            <p className="font-mono text-xs text-[#1B4332]/60 mb-4">{cancelando.confirmationNumber}</p>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">¿Por qué se cancela? *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value as MotivoCancelacion | "")}
              className="w-full border border-[#1B4332]/20 rounded-sm px-3 py-2.5 text-[16px] font-dm mb-3 panel-foco" aria-invalid={!motivo}>
              <option value="">— Elige el motivo —</option>
              {MOTIVOS_CANCELACION.map(m => <option key={m.clave} value={m.clave}>{m.etiqueta}</option>)}
            </select>
            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Detalle {motivo === "otro" ? "*" : "(opcional)"}</label>
            <input value={motivoDetalle} onChange={e => setMotivoDetalle(e.target.value)} maxLength={200}
              placeholder="Por ejemplo: avisó por WhatsApp el martes"
              className="w-full border border-[#1B4332]/20 rounded-sm px-3 py-2.5 text-[16px] font-dm mb-4 panel-foco" />
            <p className="text-[11px] font-dm text-[#1B4332]/55 mb-4">Queda como cancelada con este motivo y en la bitácora. Sus ligas de pago sin pagar se apagan solas. Si tiene cobros, regístralos o anúlalos desde Cobros.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelando(null)} className="px-4 py-2.5 text-xs font-dm text-[#1B4332]/70 hover:text-[#1B4332] panel-foco">Dejarla como está</button>
              <button onClick={() => { playClick(); confirmarCancelacion(); }} disabled={!motivo}
                className="px-4 py-2.5 text-xs font-dm bg-[#b8413f] text-white rounded-sm disabled:opacity-40 panel-pulsable panel-foco">Cancelar la reserva</button>
            </div>
            {/* ¿Prueba, duplicado o error? Se elimina por completo (20 nov 2026). */}
            <div className="mt-4 border-t border-[#1B4332]/10 pt-3">
              <p className="text-[11px] font-dm text-[#1B4332]/55 mb-2">¿Es una prueba, un duplicado o un error de captura? Elimínala por completo. Si tiene cobros anotados te pregunta antes; si se pagó con tarjeta o con liga, no se puede.</p>
              <button type="button" onClick={() => void eliminarReserva(cancelando)} disabled={eliminando}
                className="inline-flex min-h-[44px] items-center px-4 text-xs font-dm text-[#b8413f] border border-[#b8413f]/40 rounded-sm hover:bg-[#b8413f]/5 disabled:opacity-40 panel-foco">
                {eliminando ? "Eliminando…" : "Eliminar la reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
      {aviso && <AvisoFlotante texto={aviso.texto} tono={aviso.error ? "error" : "bien"} onCerrar={() => setAviso(null)} />}
      {detalle && (
        <ReservaDetalle reserva={detalle} onClose={() => setDetalle(null)} onCheckin={ponCheckin(detalle.id)} />
      )}

      {cobrando && (
        <CobroModal
          reserva={cobrando}
          quien={quien}
          onClose={() => setCobrando(null)}
          onGuardado={(cobrado, que) => {
            // Sin recargar la lista entera: se actualiza la fila que cambió.
            setBookings(bs => bs.map(b => (b.id === cobrando.id ? { ...b, depositoPagado: cobrado } : b)));
            setCobrando(c => (c ? { ...c, depositoPagado: cobrado } : c));
            flash(avisoDeCobro(que));
            // La ficha del lead lee lo cobrado: que no se quede con lo de antes.
            router.refresh();
          }}
        />
      )}

      {modal === "new" && (
        <ReservaModal title="Nueva Reserva Manual" form={form} setForm={setForm} presetsExtras={presetsExtras} verCostos={verCostos} guiasConocidos={guiasConocidos}
          onSave={saveNew} onClose={() => setModal(null)} saving={saving} />
      )}
      {modal === "edit" && (
        <ReservaModal soloLecturaCobro title="Editar Reserva" form={form} setForm={setForm} presetsExtras={presetsExtras} verCostos={verCostos} guiasConocidos={guiasConocidos}
          folio={editTarget?.confirmationNumber}
          onSave={saveEdit} onClose={() => { setModal(null); setEditTarget(null); }} saving={saving} />
      )}
    </div>
  );
}
