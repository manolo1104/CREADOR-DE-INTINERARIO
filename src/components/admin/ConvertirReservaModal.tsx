"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Banknote, Clock, Loader2 } from "lucide-react";
import { ORIGENES_ELEGIBLES, ORIGEN_ETIQUETA, type OrigenReserva } from "@/lib/origenReserva";
import { playClick, playError } from "@/lib/admin/sfx";

/**
 * Lo que una reserva necesita y una cotización no trae (3 nov 2026, pedido de
 * Manolo). Sale de comparar «Nueva reserva manual» con la cotización:
 * - ¿Por dónde entró? (canal, obligatorio: sin él la reserva queda «por confirmar»
 *   y Ventas no sabe qué canal vende).
 * - Idioma del tour, guía y lugar de recogida (los usa la operación del día).
 * - El pago: si ya pagó, al crear la reserva se abre «Registrar cobro» con el
 *   anticipo acordado (ahí se elige cómo entró, quién lo recibió y el comprobante).
 * - Correo y teléfono: sin correo no le llega la confirmación.
 */
export interface DatosConversion {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  origen: OrigenReserva;
  idiomaTour: "es" | "en";
  guia: string;
  pickupLugar: string;
  yaPago: boolean;
}

export interface CotizacionAConvertir {
  quoteNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  tourName: string;
  tourDate: string;
  personas: number;
  total: number;
  anticipo: number;
  /** "Xilitla" | "Ciudad Valles" | "" (lo que se dijo al cotizar). */
  zona: string;
  pickupSugerido: string;
}

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const etiqueta = "block text-[10px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1.5";
const input = "panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-3 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332] bg-white";

export default function ConvertirReservaModal({ q, canalSugerido, idiomaSugerido, guiasConocidos = [], onCancelar, onConvertir }: {
  q: CotizacionAConvertir;
  /** El canal que dice su lead, si tiene: se sugiere, no se elige solo. */
  canalSugerido?: string | null;
  idiomaSugerido?: string | null;
  guiasConocidos?: string[];
  onCancelar: () => void;
  onConvertir: (d: DatosConversion) => Promise<boolean>;
}) {
  const [d, setD] = useState({
    customerName: q.customerName, customerEmail: q.customerEmail ?? "", customerPhone: q.customerPhone ?? "",
    origen: "" as OrigenReserva | "", idiomaTour: (idiomaSugerido === "en" ? "en" : "es") as "es" | "en",
    guia: "", pickupLugar: q.pickupSugerido, yaPago: null as boolean | null,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const correoMalo = !!d.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.customerEmail);
  const falta = [!d.customerName.trim() && "el nombre", !d.origen && "por dónde entró", d.yaPago === null && "si ya pagó", correoMalo && "un correo válido"].filter(Boolean) as string[];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCancelar(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onCancelar, guardando]);

  async function crear() {
    if (falta.length) { playError(); setError(`Falta: ${falta.join(", ")}.`); return; }
    setGuardando(true); setError("");
    const ok = await onConvertir({ ...d, origen: d.origen as OrigenReserva, yaPago: !!d.yaPago, customerName: d.customerName.trim(), customerEmail: d.customerEmail.trim(), customerPhone: d.customerPhone.trim(), guia: d.guia.trim(), pickupLugar: d.pickupLugar.trim() });
    setGuardando(false);
    if (!ok) setError("No se pudo crear la reserva. Revisa el mensaje de arriba e intenta de nuevo.");
  }

  const chip = (activo: boolean) => `panel-foco panel-pulsable min-h-[44px] rounded-sm border px-3 text-left text-sm font-dm transition-colors ${activo ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-[#1B4332]/15 text-[#1B4332]/80 hover:border-[#1B4332]/45"}`;

  const contenido = (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-3 panel-seguro">
      <div className="fixed inset-0 bg-black/45" onClick={() => !guardando && onCancelar()} />
      <div role="dialog" aria-modal="true" aria-labelledby="conv-titulo" className="relative my-6 w-full max-w-xl rounded-sm border border-[#1B4332]/12 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#1B4332]/10 p-4">
          <div>
            <p className="panel-eyebrow">Convertir a reserva · {q.quoteNumber}</p>
            <p id="conv-titulo" className="font-cormorant text-2xl font-light leading-tight text-[#1B4332]">{q.customerName}</p>
            <p className="mt-0.5 text-xs font-dm text-[#1B4332]/60">{q.tourName} · {q.tourDate ? new Date(`${q.tourDate}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "") : "sin fecha"} · {q.personas} persona{q.personas === 1 ? "" : "s"}{q.zona ? ` · sale de ${q.zona}` : ""}</p>
          </div>
          <button onClick={onCancelar} title="Cerrar (Esc)" className="panel-foco grid h-11 w-11 shrink-0 place-items-center text-[#1B4332]/40 hover:text-[#1B4332]"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-[#1B4332]/8 bg-[#FAFAF8] px-4 py-3 text-center">
          <div><p className="text-[9px] font-dm uppercase tracking-[1.5px] text-[#1B4332]/40">Total</p><p className="panel-cifra text-sm font-dm text-[#1B4332]">{fmx(q.total)}</p></div>
          <div><p className="text-[9px] font-dm uppercase tracking-[1.5px] text-[#1B4332]/40">Anticipo acordado</p><p className="panel-cifra text-sm font-dm text-[#1B4332]">{q.anticipo > 0 ? fmx(q.anticipo) : "—"}</p></div>
        </div>

        <div className="space-y-5 p-4">
          <p className="text-[12.5px] font-dm text-[#1B4332]/70">Los tours, la fecha, las personas y el precio ya vienen de la cotización. Solo falta esto:</p>

          {/* 1. Por dónde entró */}
          <fieldset>
            <legend className={etiqueta}>1. ¿Por dónde entró? <span className="normal-case tracking-normal text-orange-700">· obligatorio</span></legend>
            <div className="grid grid-cols-2 gap-2">
              {ORIGENES_ELEGIBLES.map(o => (
                <button key={o} type="button" aria-pressed={d.origen === o} onClick={() => { playClick(); setD(x => ({ ...x, origen: o })); }} className={chip(d.origen === o)}>
                  {o === "whatsapp_sitio" ? "WhatsApp del sitio" : ORIGEN_ETIQUETA[o].split(" (")[0]}
                  {canalSugerido === o && <span className={`block text-[10px] ${d.origen === o ? "text-white/70" : "text-[#1B4332]/45"}`}>lo dice su lead</span>}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 2. El pago */}
          <fieldset>
            <legend className={etiqueta}>2. ¿Ya pagó? <span className="normal-case tracking-normal text-orange-700">· obligatorio</span></legend>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={d.yaPago === true} onClick={() => { playClick(); setD(x => ({ ...x, yaPago: true })); }} className={`${chip(d.yaPago === true)} flex items-center gap-2`}>
                <Banknote className="h-4 w-4 shrink-0" />Sí, registrar el pago
              </button>
              <button type="button" aria-pressed={d.yaPago === false} onClick={() => { playClick(); setD(x => ({ ...x, yaPago: false })); }} className={`${chip(d.yaPago === false)} flex items-center gap-2`}>
                <Clock className="h-4 w-4 shrink-0" />Todavía no
              </button>
            </div>
            {d.yaPago === true && <p className="mt-1.5 text-[11.5px] font-dm text-[#1B4332]/60">Al crear la reserva se abre «Registrar cobro»{q.anticipo > 0 ? ` con el anticipo de ${fmx(q.anticipo)}` : ""}: eliges cómo entró, quién lo recibió y subes el comprobante. El lead pasa a Anticipo pagado.</p>}
            {d.yaPago === false && <p className="mt-1.5 text-[11.5px] font-dm text-[#1B4332]/60">La reserva queda pendiente de pago y el lead en En seguimiento. El cobro se registra después en Reservas o desde la ficha del lead.</p>}
          </fieldset>

          {/* 3. Cliente */}
          <fieldset className="space-y-2">
            <legend className={etiqueta}>3. Cliente</legend>
            <input aria-label="Nombre" value={d.customerName} onChange={e => setD(x => ({ ...x, customerName: e.target.value }))} placeholder="Nombre" className={input} />
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Teléfono" type="tel" value={d.customerPhone} onChange={e => setD(x => ({ ...x, customerPhone: e.target.value }))} placeholder="Teléfono" className={input} />
              <input aria-label="Correo" type="email" value={d.customerEmail} onChange={e => setD(x => ({ ...x, customerEmail: e.target.value }))} placeholder="Correo" className={`${input} ${correoMalo ? "border-orange-500" : ""}`} />
            </div>
            {!d.customerEmail.trim() && <p className="text-[11.5px] font-dm text-orange-700">Sin correo no le llega la confirmación de la reserva.</p>}
          </fieldset>

          {/* 4. Operación del día */}
          <fieldset className="space-y-2">
            <legend className={etiqueta}>4. Para el día del tour</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-dm text-[#1B4332]/60">Idioma del tour
                <select value={d.idiomaTour} onChange={e => setD(x => ({ ...x, idiomaTour: e.target.value === "en" ? "en" : "es" }))} className={`${input} mt-1`}>
                  <option value="es">Español</option><option value="en">Inglés</option>
                </select>
              </label>
              <label className="text-[11px] font-dm text-[#1B4332]/60">Guía (opcional)
                <input list="conv-guias" value={d.guia} onChange={e => setD(x => ({ ...x, guia: e.target.value }))} placeholder="Sin asignar" className={`${input} mt-1`} />
                <datalist id="conv-guias">{guiasConocidos.map(g => <option key={g} value={g} />)}</datalist>
              </label>
            </div>
            <label className="block text-[11px] font-dm text-[#1B4332]/60">Lugar de recogida
              <input value={d.pickupLugar} onChange={e => setD(x => ({ ...x, pickupLugar: e.target.value }))} placeholder={q.zona === "Ciudad Valles" ? "Su hotel en Ciudad Valles" : "Lobby de tu hotel en Xilitla"} className={`${input} mt-1`} />
            </label>
          </fieldset>

          {error && <p role="alert" className="text-sm font-dm text-red-700">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 rounded-b-sm border-t border-[#1B4332]/10 bg-white p-4">
          <button onClick={onCancelar} disabled={guardando} className="panel-foco panel-pulsable min-h-[44px] px-4 text-sm font-dm text-[#1B4332]/60 hover:text-[#1B4332]">Cancelar</button>
          <button onClick={crear} disabled={guardando}
            className="panel-foco panel-pulsable flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-sm bg-[#1B4332] text-sm font-dm text-white hover:bg-[#143728] disabled:opacity-50">
            {guardando ? <><Loader2 className="h-4 w-4 animate-spin" />Creando…</> : <><Check className="h-4 w-4" />{d.yaPago ? "Crear reserva y registrar el pago" : "Crear reserva"}</>}
          </button>
        </div>
        {falta.length > 0 && !error && <p className="-mt-2 px-4 pb-3 text-[11.5px] font-dm text-[#1B4332]/50">Falta: {falta.join(", ")}.</p>}
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(contenido, document.body);
}
