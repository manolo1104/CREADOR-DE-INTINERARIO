"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import type { CobroVisible } from "@/lib/admin/cobros";

/**
 * «Verificar» de una transferencia o un depósito (12 nov 2026).
 *
 * Manolo: «que Erick verifique desde el panel los pagos de mi banco Inbursa».
 * Con la clave de rastreo y el banco del comprobante, el servidor le pregunta
 * al CEP de Banxico si el SPEI llegó a la cuenta. Va en cada cobro de la
 * reserva (CobroModal) y en la lista «Transferencias por verificar» de Cobros.
 *
 * «Lo vi en Inbursa» (sin Banxico) solo sale si `puedeAMano`: Manolo y Martín,
 * para lo que Banxico no cubre (Inbursa→Inbursa, ventanilla, OXXO).
 */

export interface DatosVerificar {
  id: string;
  monto: number;
  fecha: string;
  metodo: string;
  claveRastreo?: string | null;
  bancoEmisor?: string | null;
  verificacion?: { via: string; por: string | null; en: string } | null;
}

interface Banco { codigo: string; nombre: string }
interface Resultado { estado: string; mensaje: string; textoBanxico?: string; paginaCep?: string }

/** Los que más se usan van arriba (por nombre: los códigos de las fintech cambian). */
const COMUNES = [/^BBVA/, /^BANAMEX/, /^SANTANDER/, /^BANORTE/, /^HSBC/, /^SCOTIABANK/, /^AZTECA/, /^BANCOPPEL/, /NU MEXICO/, /MERCADO PAGO/, /SPIN/i, /^BANREGIO/, /^BAJIO/, /^HEY/i];
const INBURSA = "40036";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")}`;
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

export default function VerificarCobro({
  cobro, puedeAMano = false, onListo,
}: {
  cobro: DatosVerificar;
  puedeAMano?: boolean;
  /** Se llama al quedar verificado (con la lista nueva de cobros de la reserva, si viene). */
  onListo?: (cobros?: CobroVisible[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState(cobro.claveRastreo ?? "");
  const [banco, setBanco] = useState(cobro.bancoEmisor ?? "");
  const [fecha, setFecha] = useState(cobro.fecha);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [cargandoBancos, setCargandoBancos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [confirmarMano, setConfirmarMano] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setCargandoBancos(true);
    fetch(`/api/admin/banxico/bancos?fecha=${fecha}`)
      .then(r => r.json())
      .then(d => setBancos(Array.isArray(d?.bancos) ? d.bancos : []))
      .catch(() => setBancos([]))
      .finally(() => setCargandoBancos(false));
  }, [abierto, fecha]);

  const { comunes, resto } = useMemo(() => {
    const sinInbursa = bancos.filter(b => b.codigo !== INBURSA);
    const comunes = COMUNES.flatMap(re => sinInbursa.filter(b => re.test(b.nombre)).slice(0, 1));
    const resto = sinInbursa.filter(b => !comunes.includes(b)).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { comunes, resto };
  }, [bancos]);

  if (cobro.verificacion) {
    const v = cobro.verificacion;
    return (
      <span
        title={`${v.via === "banxico" ? "Banxico confirmó la transferencia" : "Vista en la cuenta"}${v.por ? ` · ${v.por}` : ""} · ${fechaCorta(v.en)}`}
        className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[11px] font-dm text-[#1B4332] shrink-0"
      >
        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
        {v.via === "banxico" ? "Banxico" : "Vista"}
      </span>
    );
  }

  async function enviar(manual = false) {
    setEnviando(true);
    setRes(null);
    try {
      const r = await fetch(`/api/admin/cobros/${cobro.id}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manual ? { manual: true } : { claveRastreo: clave, bancoEmisor: banco, fecha }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && !d?.estado) {
        setRes({ estado: "error", mensaje: d?.error || "No se pudo verificar" });
        return;
      }
      setRes(d);
      if (d?.estado === "verificado") onListo?.(d?.cobros);
    } catch {
      setRes({ estado: "error", mensaje: "Sin conexión. Inténtalo otra vez." });
    } finally {
      setEnviando(false);
      setConfirmarMano(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="panel-foco inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-dm text-amber-900 hover:bg-amber-100 shrink-0"
        title="Verificar contra el banco"
      >
        ⏳ Verificar
      </button>
    );
  }

  const color =
    res?.estado === "verificado" ? "border-[#52B788] bg-[#E8F5EE] text-[#1B4332]"
      : res?.estado === "no_encontrado" ? "border-red-300 bg-red-50 text-red-900"
      : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div className="w-full basis-full mt-2 rounded-sm border border-[#1B4332]/15 bg-[#FAFAF7] p-3 space-y-2.5 text-xs font-dm">
      <p className="text-[#1B4332]/70">
        Verificar {fmx(cobro.monto)} con Banxico. Copia los datos <strong>tal cual</strong> del comprobante del cliente.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 mb-1">Clave de rastreo</span>
          <input
            value={clave}
            onChange={e => setClave(e.target.value.toUpperCase())}
            placeholder="Ej. MBAN01002611100012345"
            maxLength={30}
            autoCapitalize="characters"
            className="panel-foco w-full min-h-[40px] border border-[#1B4332]/15 rounded-sm px-2 text-sm text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 mb-1">Banco que envía</span>
          <select
            value={banco}
            onChange={e => setBanco(e.target.value)}
            className="panel-foco w-full min-h-[40px] border border-[#1B4332]/15 rounded-sm px-2 text-sm text-[#1B4332] bg-white focus:outline-none focus:border-[#1B4332]"
          >
            <option value="">{cargandoBancos ? "Cargando bancos…" : "Elige el banco"}</option>
            {comunes.length > 0 && (
              <optgroup label="Los más comunes">
                {comunes.map(b => <option key={b.codigo} value={b.codigo}>{b.nombre}</option>)}
              </optgroup>
            )}
            {resto.length > 0 && (
              <optgroup label="Todos">
                {resto.map(b => <option key={b.codigo} value={b.codigo}>{b.nombre}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] tracking-[2px] uppercase text-[#1B4332]/45 mb-1">Fecha de la transferencia</span>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="panel-foco w-full min-h-[40px] border border-[#1B4332]/15 rounded-sm px-2 text-sm text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
          />
        </label>
      </div>
      <p className="text-[11px] text-[#1B4332]/50">
        ¿Le transfirieron de Inbursa a Inbursa, o depositó en ventanilla u OXXO? Eso no pasa por Banxico: lo verifica Manolo o Martín en la cuenta.
      </p>

      {res && (
        <div role="status" className={`rounded-sm border p-2.5 ${color}`}>
          <p>{res.estado === "verificado" ? "✅ " : res.estado === "no_encontrado" ? "❌ " : "⚠️ "}{res.mensaje}</p>
          {res.textoBanxico && res.estado !== "verificado" && (
            <details className="mt-1.5">
              <summary className="cursor-pointer opacity-70">Lo que contestó Banxico</summary>
              <p className="mt-1 opacity-80">{res.textoBanxico}</p>
            </details>
          )}
          {res.paginaCep && res.estado !== "verificado" && (
            <a href={res.paginaCep} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 underline">
              Verificar a mano en Banxico <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => enviar(false)}
          disabled={enviando || !clave.trim() || !banco}
          className="panel-foco panel-pulsable min-h-[40px] inline-flex items-center gap-1.5 bg-[#1B4332] text-white rounded-sm px-3 hover:bg-[#143728] disabled:opacity-40"
        >
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Preguntar a Banxico
        </button>
        {puedeAMano && !confirmarMano && (
          <button type="button" onClick={() => setConfirmarMano(true)} disabled={enviando}
            className="panel-foco min-h-[40px] px-3 rounded-sm border border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332]">
            Lo vi en Inbursa
          </button>
        )}
        {puedeAMano && confirmarMano && (
          <button type="button" onClick={() => enviar(true)} disabled={enviando}
            className="panel-foco min-h-[40px] px-3 rounded-sm border border-amber-400 bg-amber-50 text-amber-900">
            Sí, vi {fmx(cobro.monto)} en la cuenta
          </button>
        )}
        <button type="button" onClick={() => { setAbierto(false); setRes(null); }}
          className="panel-foco min-h-[40px] px-2 text-[#1B4332]/50 hover:text-[#1B4332]">
          Cerrar
        </button>
      </div>
    </div>
  );
}
