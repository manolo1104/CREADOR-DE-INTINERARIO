"use client";

import { useState } from "react";
import { Cake, History, Loader2, Lock, LockOpen, X } from "lucide-react";
import {
  montoDescuento, textoDescuento, mismoDescuento,
  type Descuento, type EventoDescuento, type TipoDescuento,
} from "@/lib/admin/descuento";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

function cuando(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" });
}

/**
 * El descuento de una cotización o una reserva, con candado (Manolo, 20 oct
 * 2026). Si ya hay uno guardado, sale cerrado: se ve cuánto es, quién lo puso
 * y cuándo, y para moverlo hay que abrir el candado. Cada cambio lo registra el
 * servidor al guardar (`sellarDescuento`); aquí solo se enseña el historial.
 */
export interface CumpleEditor {
  /** El código ya puesto (vacío si no hay). */
  codigo:    string;
  /** Los renglones de la reserva o cotización: el servidor calcula el 10 % sobre ellos. */
  lineas:    unknown[];
  /** Cuándo se marca como usado, para decirlo: «al guardar la reserva». */
  cuando:    string;
  folio?:    string;
  onAplicar: (codigo: string, monto: number) => void;
  onQuitar:  () => void;
}

export default function DescuentoEditor({ tipo, valor, onCambio, base, guardado, historial, inputCls, cumple }: {
  tipo:      TipoDescuento;
  valor:     string;
  onCambio:  (tipo: TipoDescuento, valor: string) => void;
  /** Sobre qué se calcula, para decir cuánto es en pesos. */
  base:      number;
  /** Lo que está guardado en el registro, con su sello. */
  guardado:  Descuento | null;
  historial: EventoDescuento[];
  inputCls:  string;
  /** El regalo de cumpleaños (21 oct 2026): 10 % solo de los tours sin RZR. */
  cumple?:   CumpleEditor;
}) {
  const [abierto, setAbierto]       = useState(!guardado);
  const [verRegistro, setVerRegistro] = useState(false);
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [codigoTxt, setCodigoTxt]   = useState("");
  const [validando, setValidando]   = useState(false);
  const [avisoCumple, setAvisoCumple] = useState("");

  async function validarCumple() {
    if (!cumple) return;
    setValidando(true); setAvisoCumple("");
    try {
      const r = await fetch("/api/admin/codigos-cumple/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoTxt, lineas: cumple.lineas, folio: cumple.folio }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAvisoCumple(`❌ ${j.error || "No se pudo validar."}`); return; }
      cumple.onAplicar(j.codigo, j.monto);
      setAbierto(true);
      setPidiendoCodigo(false);
      setCodigoTxt("");
      const fuera = (j.lineas as { nombre: string; fuera?: string }[]).filter(x => x.fuera).map(x => x.fuera);
      setAvisoCumple(`✅ ${j.nombre}: ${j.pct} % de ${fmx(j.base)} en tours = −${fmx(j.monto)}${fuera.length ? ` (${Array.from(new Set(fuera)).join("; ")})` : ""}. Vence el ${j.venceEl}.`);
    } catch {
      setAvisoCumple("❌ Sin conexión.");
    } finally {
      setValidando(false);
    }
  }
  const actual = Number(valor) > 0 ? { tipo, valor: Math.round(Number(valor)) } : null;
  const monto  = montoDescuento(actual, base);
  const cambio = !!guardado && !mismoDescuento(guardado, actual);

  return (
    <div className={`border px-4 py-3 rounded-sm ${guardado && !abierto ? "border-[#1B4332]/30 bg-[#1B4332]/[0.06]" : "border-[#1B4332]/20 bg-[#1B4332]/5"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="flex items-center gap-1.5 text-[9px] tracking-[2px] uppercase text-[#1B4332]/55 font-dm">
          {guardado && !abierto ? <Lock className="w-3.5 h-3.5 text-[#1B4332]" aria-hidden="true" /> : null}
          Descuento {guardado && !abierto ? "· asegurado" : "(opcional)"}
        </p>
        {guardado && !abierto && (
          <button type="button" onClick={() => setAbierto(true)}
            className="inline-flex items-center gap-1 text-[11px] font-dm text-[#1B4332]/70 hover:text-[#1B4332] underline underline-offset-2">
            <LockOpen className="w-3.5 h-3.5" aria-hidden="true" /> Cambiar descuento
          </button>
        )}
      </div>

      {guardado && !abierto ? (
        <div className="font-dm">
          <p className="text-sm text-[#1B4332]">
            {guardado.tipo === "fixed"
              ? <b className="font-medium">−{fmx(guardado.valor)}</b>
              : <><b className="font-medium">{textoDescuento(guardado)}</b>{monto > 0 && <> · −{fmx(monto)}</>}</>}
          </p>
          {guardado.por && (
            <p className="text-[11px] text-[#1B4332]/55">Lo puso {guardado.por}{guardado.en ? ` el ${cuando(guardado.en)}` : ""}</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 items-center">
            <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
              <button type="button" onClick={() => onCambio("percent", valor)}
                className={`px-3 py-2 text-xs font-dm transition-colors ${tipo === "percent" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>%</button>
              <button type="button" onClick={() => onCambio("fixed", valor)}
                className={`px-3 py-2 text-xs font-dm transition-colors ${tipo === "fixed" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>$</button>
            </div>
            <input type="number" min={0} value={valor}
              onChange={e => onCambio(tipo, e.target.value)}
              placeholder={tipo === "percent" ? "ej. 10" : "ej. 500"}
              className={`flex-1 ${inputCls}`} />
            {valor !== "" && (
              <button type="button" onClick={() => onCambio(tipo, "")} aria-label="Quitar descuento"
                className="text-[#1B4332]/30 hover:text-red-500"><X className="w-4 h-4" /></button>
            )}
          </div>
          {monto > 0 && (
            <p className="mt-2 text-xs font-dm text-[#1B4332]">
              Descuento: −{fmx(monto)}{tipo === "percent" && ` (${valor} %)`}
            </p>
          )}
          {guardado && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-dm text-[11px]">
              {cambio && (
                <span className="text-[#7a4b0e]">
                  Antes: {textoDescuento(guardado)}. Al guardar queda registrado quién lo cambió.
                </span>
              )}
              <button type="button"
                onClick={() => { onCambio(guardado.tipo, String(guardado.valor)); setAbierto(false); }}
                className="inline-flex items-center gap-1 text-[#1B4332]/60 hover:text-[#1B4332] underline underline-offset-2">
                <Lock className="w-3 h-3" aria-hidden="true" /> Dejarlo como estaba
              </button>
            </div>
          )}
        </>
      )}

      {cumple && (
        <div className="mt-2 border-t border-[#1B4332]/10 pt-2 font-dm text-[11px]">
          {cumple.codigo ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 text-[#1B4332]">
                <Cake className="w-3.5 h-3.5" aria-hidden="true" /> Código de cumpleaños <b className="font-mono font-medium">{cumple.codigo}</b>
              </span>
              <span className="text-[#1B4332]/55">Se marca como usado {cumple.cuando}.</span>
              <button type="button" onClick={() => { cumple.onQuitar(); setAvisoCumple(""); }}
                className="text-[#1B4332]/55 hover:text-red-600 underline underline-offset-2">Quitar código</button>
            </div>
          ) : pidiendoCodigo ? (
            <div className="flex gap-2 items-center">
              <input value={codigoTxt} onChange={e => setCodigoTxt(e.target.value.toUpperCase())} placeholder="CUMPLE-XXXXX"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); validarCumple(); } }}
                className={`flex-1 font-mono ${inputCls}`} autoFocus />
              <button type="button" onClick={validarCumple} disabled={validando || !codigoTxt.trim()}
                className="inline-flex items-center gap-1 bg-[#1B4332] text-white px-3 py-2 text-xs rounded-sm disabled:opacity-40">
                {validando && <Loader2 className="w-3 h-3 animate-spin" />} Validar
              </button>
              <button type="button" onClick={() => setPidiendoCodigo(false)} aria-label="Cancelar" className="text-[#1B4332]/30 hover:text-[#1B4332]"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setPidiendoCodigo(true)}
              className="inline-flex items-center gap-1 text-[#1B4332]/60 hover:text-[#1B4332] underline underline-offset-2">
              <Cake className="w-3.5 h-3.5" aria-hidden="true" /> ¿Trae código de cumpleaños?
            </button>
          )}
          {avisoCumple && <p className="mt-1 text-[#1B4332]">{avisoCumple}</p>}
        </div>
      )}

      {historial.length > 0 && (
        <div className="mt-2 border-t border-[#1B4332]/10 pt-2">
          <button type="button" onClick={() => setVerRegistro(v => !v)}
            className="inline-flex items-center gap-1 font-dm text-[11px] text-[#1B4332]/55 hover:text-[#1B4332]">
            <History className="w-3.5 h-3.5" aria-hidden="true" /> Registro del descuento ({historial.length})
          </button>
          {verRegistro && (
            <ul className="mt-1.5 space-y-0.5 font-dm text-[11px] text-[#1B4332]/65">
              {[...historial].reverse().map((e, i) => (
                <li key={i}>
                  <span className="text-[#1B4332]/45">{cuando(e.en)} · </span>
                  {e.por} {e.accion === "puso" ? `puso ${e.ahora}` : e.accion === "quitó" ? `quitó ${e.antes}` : `cambió ${e.antes} → ${e.ahora}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
