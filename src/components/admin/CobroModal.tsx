"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Banknote, ArrowLeftRight, Building2, CreditCard, MoreHorizontal, Check } from "lucide-react";
import { METODOS_COBRO, type MetodoCobro } from "@/lib/admin/metodosCobro";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import Comprobantes, { type ArchivoComprobante } from "./Comprobantes";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")}`;
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const ICONO: Record<string, typeof Banknote> = {
  efectivo: Banknote, transferencia: ArrowLeftRight, deposito: Building2,
  stripe: CreditCard, otro: MoreHorizontal,
};

export interface CobroFila {
  id: string;
  fecha: string;
  monto: number;
  metodo: string;
  metodoLabel: string;
  recibidoPor: string | null;
  entregadoA: string | null;
  entregadoAt: string | null;
  nota: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  creadoPor: string | null;
  comprobantes: { id: string; nombreArchivo: string; tipoMime: string }[];
}

export interface ReservaCobrable {
  id: string;
  confirmationNumber: string;
  customerName: string;
  totalAmount: number;
  depositoPagado: number;
  stripePaymentIntentId: string | null;
}

/**
 * Registrar el dinero que entra por una reserva.
 *
 * Pensado para usarse desde el teléfono con una mano mientras el cliente está
 * enfrente: el método son botones grandes (no un desplegable), el monto llega
 * prellenado con lo que falta, y quien recibe es quien entró al panel.
 */
export default function CobroModal({
  reserva, quien, onClose, onGuardado,
}: {
  reserva: ReservaCobrable;
  quien: string;
  onClose: () => void;
  onGuardado: (cobrado: number) => void;
}) {
  const yaCobrado = reserva.depositoPagado > 0
    ? reserva.depositoPagado
    : (reserva.stripePaymentIntentId ? reserva.totalAmount : 0);
  const saldo = Math.max(0, reserva.totalAmount - yaCobrado);

  const [cobros,   setCobros]   = useState<CobroFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");
  /** El servidor dijo que se pasa del saldo, pero deja confirmarlo. */
  const [puedeForzar, setPuedeForzar] = useState(false);

  /**
   * 🔴 Dinero que ya figura cobrado pero sin un solo renglón que diga cómo
   * entró: las reservas anteriores a este módulo y las que nacen de una
   * cotización con anticipo acordado. Aquí no se cobra nada nuevo — se
   * DESGLOSA lo que ya está contado. Sin esto el panel contestaba "esta
   * reserva solo debe $0" y no dejaba registrar nada.
   */
  const sinDesglose = !cargando && yaCobrado > 0 && cobros.length === 0;

  const [monto,       setMonto]       = useState(saldo > 0 ? String(saldo) : "");
  const [montoTocado, setMontoTocado] = useState(false);
  const [metodo,      setMetodo]      = useState<MetodoCobro | "">("");
  const [fecha,       setFecha]       = useState(hoy());
  const [recibidoPor, setRecibidoPor] = useState(quien);
  const [folio,       setFolio]       = useState("");
  const [nota,        setNota]        = useState("");
  const [archivos,    setArchivos]    = useState<ArchivoComprobante[]>([]);

  const exigeComprobante = useMemo(
    () => METODOS_COBRO.find(m => m.id === metodo)?.comprobante ?? false,
    [metodo],
  );

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/admin/reservas/${reserva.id}/cobros`)
      .then(r => r.json())
      .then(d => setCobros(Array.isArray(d) ? d : []))
      .catch(() => setCobros([]))
      .finally(() => setCargando(false));
  }, [reserva.id]);

  // En modo desglose el monto por omisión es lo que ya figura cobrado, no el
  // saldo: es ese dinero el que hay que explicar.
  useEffect(() => {
    if (sinDesglose && !montoTocado) setMonto(String(yaCobrado));
  }, [sinDesglose, montoTocado, yaCobrado]);

  async function guardar(forzar = false) {
    const n = Math.round(Number(monto.replace(/[^\d.]/g, "")) || 0);
    if (n <= 0)   { playError(); flash("❌ Escribe cuánto entró"); return; }
    if (!metodo)  { playError(); flash("❌ Falta decir cómo entró el dinero"); return; }
    if (exigeComprobante && archivos.length === 0) {
      playError(); flash("❌ Ese método necesita comprobante: sube la captura o el PDF"); return;
    }

    setGuardando(true);
    const r = await fetch(`/api/admin/reservas/${reserva.id}/cobros`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        monto: n, metodo, fecha, recibidoPor, folio, nota,
        evidenciaIds: archivos.map(a => a.id),
        desglosar: sinDesglose,
        forzar,
      }),
    }).catch(() => null);
    setGuardando(false);

    const d = await r?.json().catch(() => null);
    if (!r?.ok) {
      playError();
      setPuedeForzar(!!d?.sePuedeForzar);
      flash(`❌ ${d?.error || "No se pudo registrar el cobro"}`);
      return;
    }
    setPuedeForzar(false);

    playSuccess();
    setCobros(d.cobros ?? []);
    onGuardado(d.cobrado ?? 0);
    onClose();
  }

  async function anular(c: CobroFila) {
    const motivo = prompt(`¿Por qué se anula el cobro de ${fmx(c.monto)}?`)?.trim();
    if (!motivo) return;
    const r = await fetch(`/api/admin/reservas/${reserva.id}/cobros`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ accion: "anular", cobroId: c.id, motivo }),
    }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); flash(`❌ ${d?.error || "No se pudo anular"}`); return; }
    setCobros(d.cobros ?? []);
    onGuardado(d.cobrado ?? 0);
    flash("✅ Cobro anulado");
  }

  const vivos = cobros.filter(c => !c.anulado);
  const sumaVivos = vivos.reduce((s, c) => s + c.monto, 0);

  const contenido = (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 overflow-y-auto panel-seguro">
      <div className="fixed inset-0 bg-black/45" onClick={onClose} />
      <div className="panel-glass relative w-full max-w-lg my-6 rounded-sm border border-[#1B4332]/12 bg-white shadow-2xl">

        <div className="flex items-start justify-between gap-3 p-4 border-b border-[#1B4332]/10">
          <div>
            <p className="panel-eyebrow">Registrar cobro</p>
            <p className="font-cormorant text-2xl font-light text-[#1B4332] leading-tight">{reserva.customerName}</p>
            <p className="text-xs font-dm text-[#1B4332]/50 font-mono">{reserva.confirmationNumber}</p>
          </div>
          <button onClick={onClose} title="Cerrar (Esc)"
            className="panel-foco w-11 h-11 grid place-items-center text-[#1B4332]/40 hover:text-[#1B4332] shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dónde va la reserva */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-[#FAFAF8] border-b border-[#1B4332]/8 text-center">
          <div>
            <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40 font-dm">Total</p>
            <p className="panel-cifra text-sm font-dm text-[#1B4332]">{fmx(reserva.totalAmount)}</p>
          </div>
          <div>
            <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40 font-dm">Cobrado</p>
            <p className="panel-cifra text-sm font-dm text-green-700">{fmx(yaCobrado)}</p>
          </div>
          <div>
            <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40 font-dm">Falta</p>
            <p className={`panel-cifra text-sm font-dm ${saldo > 0 ? "text-orange-600" : "text-[#1B4332]/40"}`}>
              {saldo > 0 ? fmx(saldo) : "Liquidado"}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {sinDesglose && (
            <div className="border border-amber-300/70 bg-amber-50 rounded-sm px-3 py-2.5">
              <p className="text-xs font-dm text-amber-900 leading-snug">
                Esta reserva ya figura con <span className="font-medium">{fmx(yaCobrado)}</span> cobrados,
                pero no dice cómo entró ese dinero.
              </p>
              <p className="text-[11px] font-dm text-amber-800/80 mt-1 leading-snug">
                Lo que registres aquí <span className="font-medium">no suma de nuevo</span>: explica el dinero
                que ya estaba contado.
              </p>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">
              {sinDesglose ? "¿Cuánto de eso fue con este método?" : "¿Cuánto entró?"}
            </label>
            <div className="flex items-center gap-2">
              <span className="font-cormorant text-2xl text-[#1B4332]/50">$</span>
              <input
                value={monto}
                onChange={e => { setMonto(e.target.value); setMontoTocado(true); }}
                inputMode="numeric"
                placeholder="0"
                className="panel-foco flex-1 min-h-[44px] border border-[#1B4332]/15 rounded-sm px-3 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
              />
              {(saldo > 0 || sinDesglose) && (
                <button type="button" onClick={() => { playClick(); setMonto(String(sinDesglose ? yaCobrado : saldo)); setMontoTocado(true); }}
                  className="panel-foco panel-pulsable min-h-[44px] px-3 text-xs font-dm text-[#1B4332]/70 border border-[#1B4332]/15 rounded-sm hover:border-[#1B4332]/40">
                  Todo
                </button>
              )}
            </div>
          </div>

          {/* Método */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">
              ¿Cómo entró?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_COBRO.map(m => {
                const Icono = ICONO[m.id] ?? MoreHorizontal;
                const activo = metodo === m.id;
                return (
                  <button
                    key={m.id} type="button"
                    onClick={() => { playClick(); setMetodo(m.id); }}
                    className={`panel-foco panel-pulsable flex items-center gap-2 min-h-[44px] px-3 rounded-sm border text-left transition-colors ${
                      activo
                        ? "border-[#1B4332] bg-[#1B4332] text-white"
                        : "border-[#1B4332]/15 text-[#1B4332]/75 hover:border-[#1B4332]/45"
                    }`}
                  >
                    <Icono className="w-4 h-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-dm leading-tight truncate">{m.label}</span>
                      {m.detalle && (
                        <span className={`block text-[10px] leading-tight truncate ${activo ? "text-white/60" : "text-[#1B4332]/40"}`}>
                          {m.detalle}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comprobante */}
          <div>
            <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">
              Comprobante {exigeComprobante
                ? <span className="text-orange-600 normal-case tracking-normal">· obligatorio con este método</span>
                : <span className="text-[#1B4332]/30 normal-case tracking-normal">· opcional</span>}
            </label>
            <Comprobantes
              reservaId={reserva.id}
              archivos={archivos}
              onCambio={setArchivos}
              flash={flash}
            />
          </div>

          {/* Detalles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">Lo recibió</label>
              <input value={recibidoPor} onChange={e => setRecibidoPor(e.target.value)}
                className="panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">Referencia</label>
              <input value={folio} onChange={e => setFolio(e.target.value)} placeholder="Folio, últimos 4…"
                className="panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 font-dm mb-1.5">Nota</label>
              <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional"
                className="panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]" />
            </div>
          </div>

          {/* Cobros ya registrados */}
          <div className="border-t border-[#1B4332]/10 pt-3">
            <p className="panel-eyebrow mb-2">
              Cobros de esta reserva {vivos.length > 0 && <span className="text-[#1B4332]/40">· {fmx(sumaVivos)}</span>}
            </p>
            {cargando && <p className="text-xs font-dm text-[#1B4332]/35">Cargando…</p>}
            {!cargando && cobros.length === 0 && (
              <p className="text-xs font-dm text-[#1B4332]/35">Todavía no hay ninguno.</p>
            )}
            <ul className="space-y-1.5">
              {cobros.map(c => (
                <li key={c.id}
                  className={`flex items-center gap-2 text-xs font-dm ${c.anulado ? "opacity-45 line-through" : ""}`}>
                  <span className="panel-cifra text-[#1B4332] font-medium w-20 shrink-0">{fmx(c.monto)}</span>
                  <span className="text-[#1B4332]/60 truncate flex-1">
                    {c.metodoLabel} · {c.fecha}
                    {c.recibidoPor ? ` · ${c.recibidoPor}` : ""}
                    {c.entregadoAt ? " · entregado" : ""}
                  </span>
                  {c.comprobantes.map(a => (
                    <a key={a.id} href={`/api/admin/evidencia/${a.id}`} target="_blank" rel="noopener noreferrer"
                       title={a.nombreArchivo}
                       className="text-[#52B788] hover:underline shrink-0">📎</a>
                  ))}
                  {!c.anulado && (
                    <button type="button" onClick={() => anular(c)} title="Anular"
                      className="panel-foco text-[#1B4332]/30 hover:text-red-600 shrink-0 w-11 h-11 -my-3 grid place-items-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {msg && <p className="text-xs font-dm text-[#1B4332]">{msg}</p>}
          {puedeForzar && (
            <button
              type="button"
              onClick={() => guardar(true)}
              className="panel-foco panel-pulsable w-full min-h-[44px] border border-amber-400 text-amber-800 bg-amber-50 rounded-sm text-xs font-dm hover:bg-amber-100"
            >
              Registrarlo de todos modos (cobré de más)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-[#1B4332]/10 sticky bottom-0 bg-white rounded-b-sm">
          <button onClick={onClose}
            className="panel-foco panel-pulsable min-h-[44px] px-4 text-sm font-dm text-[#1B4332]/60 hover:text-[#1B4332]">
            Cancelar
          </button>
          <button
            onClick={() => guardar()} disabled={guardando}
            className="panel-foco panel-pulsable flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-[#1B4332] text-white text-sm font-dm rounded-sm hover:bg-[#143728] disabled:opacity-50"
          >
            {guardando
              ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
              : <><Check className="w-4 h-4" />{sinDesglose ? "Registrar cómo entró" : "Registrar cobro"}</>}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(contenido, document.body);
}
