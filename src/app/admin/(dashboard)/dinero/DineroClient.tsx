"use client";

/**
 * Una sola pantalla para el dinero.
 *
 * Antes eran tres: `/admin/finanzas` con SIETE pestañas internas,
 * `/admin/ingresos` (que en el menú se llamaba "Ventas") y las tarjetas del
 * Inicio. "Cobrado" y "Por cobrar" se calculaban en motores distintos con
 * filtros de fecha propios, así que podían no coincidir entre pantallas.
 *
 * Manolo dijo qué mira de verdad: cuánto entró y cuánto quedó, quién le debe y
 * a quién debe, y el reparto con Martín. Ese es el orden de esta pantalla. Lo
 * demás no se borró: vive plegado en "Ver más".
 *
 * 🔴 Las cifras NO se recalculan aquí. Todo sale del mismo `calcFinanzas()` de
 * siempre: esto es sólo el orden en que se leen.
 */

import { useMemo, useState } from "react";
import {
  Loader2, Lock, ChevronRight, ChevronDown, HandCoins, FileWarning,
  AlertTriangle, Banknote,
} from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { useFinanzas, rangoDe, type Preset } from "./useFinanzas";
import type { Permisos } from "./permisos";
import { fmx, fDiaCorto } from "./ui";
import VistaReservas    from "./VistaReservas";
import VistaMovimientos from "./VistaMovimientos";
import VistaCuentas     from "./VistaCuentas";
import VistaSocios      from "./VistaSocios";
import VistaCortes      from "./VistaCortes";
import VistaTours       from "./VistaTours";
import BloqueMarketing  from "./BloqueMarketing";
import type { DatosMarketing } from "./BloqueMarketing";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "hoy",       label: "Hoy" },
  { id: "semana",    label: "Semana" },
  { id: "mes",       label: "Mes" },
  { id: "mesPasado", label: "Mes pasado" },
  { id: "rango",     label: "Otras fechas" },
];

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fDia = (ymd: string) => ymd ? `${Number(ymd.slice(8,10))} ${MESES[Number(ymd.slice(5,7))-1]} ${ymd.slice(0,4)}` : "—";

export default function DineroClient({ permisos, marketing }: {
  permisos: Permisos;
  marketing: DatosMarketing;
}) {
  const [preset, setPreset] = useState<Preset>("mes");
  const [rango,  setRango]  = useState(() => rangoDe("mes"));
  const [base,   setBase]   = useState<"tour" | "venta">("tour");

  const { datos, cargando, error, recargar } = useFinanzas(rango.desde, rango.hasta, base);

  const etiquetaPeriodo = useMemo(
    () => rango.desde === rango.hasta ? fDia(rango.desde) : `${fDia(rango.desde)} — ${fDia(rango.hasta)}`,
    [rango],
  );

  function elegirPreset(p: Preset) {
    setPreset(p);
    if (p !== "rango") setRango(rangoDe(p));
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto panel-seguro">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Dinero</h1>
        <span className="font-dm text-xs text-[#1B4332]/45">{etiquetaPeriodo}</span>
      </div>

      {/* Una sola fila de periodo. El "por fecha de tour / de venta" es una
          precisión contable, no una decisión de cada visita: va al pie. */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => elegirPreset(p.id)}
            className={`panel-foco panel-pulsable min-h-[44px] px-3.5 rounded-sm text-xs font-dm transition-colors ${
              preset === p.id
                ? "bg-[#1B4332] text-white"
                : "border border-[#1B4332]/15 text-[#1B4332]/70 hover:border-[#1B4332]/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "rango" && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input type="date" value={rango.desde} onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
            className="panel-foco min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332]" />
          <span className="font-dm text-xs text-[#1B4332]/40">a</span>
          <input type="date" value={rango.hasta} onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
            className="panel-foco min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332]" />
        </div>
      )}

      <button
        onClick={() => setBase(b => (b === "tour" ? "venta" : "tour"))}
        className="panel-foco inline-flex items-center min-h-[44px] -my-2 mb-3 text-[11px] font-dm text-[#1B4332]/45 hover:text-[#1B4332] underline decoration-dotted underline-offset-2"
        title="Con qué fecha entra cada reserva en el periodo"
      >
        contando por fecha {base === "tour" ? "del tour" : "de venta"} · cambiar
      </button>

      {cargando && (
        <div className="py-16 flex items-center justify-center gap-2 text-[#1B4332]/40 font-dm text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Calculando…
        </div>
      )}
      {error && (
        <div className="py-12 text-center">
          <Lock className="w-5 h-5 text-[#1B4332]/25 mx-auto mb-2" />
          <p className="text-[#C9484A] font-dm text-sm">{error}</p>
        </div>
      )}

      {datos && !cargando && (
        <div className="space-y-4">
          <Entro datos={datos} />
          <Pendientes datos={datos} permisos={permisos} recargar={recargar} />
          <Resultado datos={datos} permisos={permisos} desde={rango.desde} hasta={rango.hasta} />
          <Deudas datos={datos} permisos={permisos} recargar={recargar} />
          {datos.socios.length > 0 && (
            <Plegable titulo="El reparto con los socios" resumen={fmx(datos.socios.reduce((s, x) => s + x.pendiente, 0)) + " pendiente"}>
              <VistaSocios datos={datos} recargar={recargar} permisos={permisos} />
            </Plegable>
          )}

          <VerMas datos={datos} permisos={permisos} recargar={recargar}
            desde={rango.desde} hasta={rango.hasta} marketing={marketing} />
        </div>
      )}
    </div>
  );
}

// ── 1. Lo que entró ─────────────────────────────────────────────────────────
// Va primero porque es lo único que cambia cada día.

function Entro({ datos }: { datos: Finanzas }) {
  const g = datos.desgloseCobros;
  return (
    <section className="panel-card-alta p-5">
      <p className="panel-eyebrow mb-1">Entró en este periodo</p>
      <p className="panel-cifra font-cormorant text-[#52B788] text-4xl sm:text-5xl font-light leading-none">
        {fmx(datos.cobrado)}
      </p>
      {g.lineas.length > 0 ? (
        <p className="font-dm text-xs text-[#1B4332]/55 mt-2 leading-relaxed">
          {g.lineas.map(l => `${l.label.toLowerCase()} ${fmx(l.monto)}`).join(" · ")}
          {g.sinDesglose > 0 && (
            <span className="text-amber-700"> · sin decir cómo {fmx(g.sinDesglose)}</span>
          )}
        </p>
      ) : (
        <p className="font-dm text-xs text-[#1B4332]/35 mt-2">
          {datos.cobrado > 0 ? "Ningún cobro dice cómo entró." : "No entró dinero en este periodo."}
        </p>
      )}
    </section>
  );
}

// ── 2. Lo que alguien tiene que resolver ────────────────────────────────────
// Sustituye al bloque "N cosas que revisar", que mezclaba avisos de margen
// (información) con avisos de captura (trabajo pendiente). Aquí sólo va lo que
// alguien puede RESOLVER hoy, y desaparece cuando no hay nada.

function Pendientes({ datos, permisos, recargar }: {
  datos: Finanzas; permisos: Permisos; recargar: () => void;
}) {
  const [entregando, setEntregando] = useState<string | null>(null);
  const bolsas = datos.efectivoEnManos;
  const sinDesglose = datos.desgloseCobros.reservasSinDesglose;
  const vencidas = datos.reservas.filter(r => r.estadoPago === "vencido");

  async function entregar(persona: string, monto: number) {
    if (!confirm(`¿Confirmas que recibiste ${fmx(monto)} en efectivo de ${persona}?`)) return;
    setEntregando(persona);
    const r = await fetch("/api/admin/cobros", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    }).catch(() => null);
    setEntregando(null);
    if (r?.ok) recargar();
  }

  if (bolsas.length === 0 && sinDesglose === 0 && vencidas.length === 0 && datos.porPagarTotal === 0) {
    return null;
  }

  return (
    <section className="panel-card p-5">
      <p className="panel-eyebrow mb-3">Pendientes</p>
      <ul className="space-y-3">
        {bolsas.map(b => (
          <li key={b.persona} className="flex items-center gap-3">
            <HandCoins className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="flex-1 min-w-0 font-dm text-sm text-[#1B4332]">
              <span className="font-medium">{b.persona}</span> trae{" "}
              <span className="panel-cifra">{fmx(b.monto)}</span> en efectivo
              <span className="block text-[11px] text-[#1B4332]/40">
                desde el {fDiaCorto(b.desde)} · {b.cobros} cobro{b.cobros === 1 ? "" : "s"}
              </span>
            </span>
            {permisos.entregaEfectivo && (
              <button
                onClick={() => entregar(b.persona, b.monto)}
                disabled={entregando === b.persona}
                className="panel-foco panel-pulsable min-h-[44px] px-3 border border-[#1B4332]/20 rounded-sm text-[10px] font-dm uppercase tracking-[1px] text-[#1B4332]/70 hover:border-[#1B4332]/50 disabled:opacity-40 shrink-0"
              >
                {entregando === b.persona ? "…" : "Ya lo recibí"}
              </button>
            )}
          </li>
        ))}

        {sinDesglose > 0 && (
          <li className="flex items-start gap-3">
            <FileWarning className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-dm text-sm text-[#1B4332]">
              {sinDesglose} reserva{sinDesglose === 1 ? "" : "s"} con dinero cobrado que no dice cómo entró
              <span className="block text-[11px] text-[#1B4332]/40">
                Se arregla desde Reservas, con el botón de cobro
              </span>
            </span>
          </li>
        )}

        {vencidas.length > 0 && (
          <li className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[#C9484A] shrink-0 mt-0.5" />
            <span className="font-dm text-sm text-[#1B4332]">
              {vencidas.length} reserva{vencidas.length === 1 ? "" : "s"} con el tour pasado y saldo sin cobrar
              <span className="block text-[11px] text-[#1B4332]/40">
                {vencidas.slice(0, 3).map(r => `${r.cliente} ${fmx(r.saldo)}`).join(" · ")}
                {vencidas.length > 3 ? ` y ${vencidas.length - 3} más` : ""}
              </span>
            </span>
          </li>
        )}

        {datos.porPagarTotal > 0 && (
          <li className="flex items-start gap-3">
            <Banknote className="w-4 h-4 text-[#1B4332]/45 shrink-0 mt-0.5" />
            <span className="font-dm text-sm text-[#1B4332]">
              Debes {fmx(datos.porPagarTotal)} a proveedores
              <span className="block text-[11px] text-[#1B4332]/40">
                {datos.porPagar.length} cuenta{datos.porPagar.length === 1 ? "" : "s"} sin pagar
              </span>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

// ── 3. El periodo en cinco renglones ────────────────────────────────────────
// Sustituye a las 8 tarjetas de KPI: sus cifras son exactamente estas.

function Resultado({ datos, permisos, desde, hasta }: {
  datos: Finanzas; permisos: Permisos; desde: string; hasta: string;
}) {
  const { er } = datos;
  const [cerrando, setCerrando] = useState(false);
  const [msg, setMsg] = useState("");

  async function cerrar(tipo: "diario" | "semanal" | "mensual") {
    setCerrando(true); setMsg("");
    const r = await fetch("/api/admin/cortes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, fecha: desde }),
    }).catch(() => null);
    setCerrando(false);
    setMsg(r?.ok ? "Corte guardado" : "No se pudo guardar el corte");
  }

  return (
    <section className="panel-card-alta p-5">
      <p className="panel-eyebrow mb-3">Cómo va el periodo</p>
      <table className="w-full font-dm text-sm">
        <tbody>
          <Renglon label="Vendido" valor={er.ventasBrutas} />
          <Renglon label="Cobrado" valor={datos.cobrado} suave />
          <Renglon label="Costos de las salidas" valor={-er.costosDirectosTotal} />
          <Renglon label="Gastos de la empresa"  valor={-er.gastosGeneralesTotal} />
          {er.comisiones > 0 && <Renglon label="Comisiones de pago" valor={-er.comisiones} />}
          <tr className="border-t border-[#1B4332]/15">
            <td className="pt-3 font-dm text-sm text-[#1B4332] font-medium">Quedó</td>
            <td className="pt-3 text-right">
              <span className={`panel-cifra font-cormorant text-2xl font-light ${er.utilidadOperativa >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                {fmx(er.utilidadOperativa)}
              </span>
              <span className="font-dm text-xs text-[#1B4332]/45 ml-2">{er.margenOperativo}%</span>
            </td>
          </tr>
        </tbody>
      </table>

      {datos.captura.estimadas > 0 && (
        <p className="font-dm text-[11px] text-amber-700 mt-3">
          Ojo: {datos.captura.estimadas} salida{datos.captura.estimadas === 1 ? "" : "s"} usa
          {datos.captura.estimadas === 1 ? "" : "n"} el costo del Cotizador, no uno capturado.
        </p>
      )}

      {permisos.cerrarCorte && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#1B4332]/10">
          {(["diario", "semanal", "mensual"] as const).map(t => (
            <button key={t} onClick={() => cerrar(t)} disabled={cerrando}
              className="panel-foco panel-pulsable min-h-[44px] px-3 border border-[#1B4332]/20 rounded-sm text-[10px] font-dm uppercase tracking-[1px] text-[#1B4332]/70 hover:border-[#1B4332]/50 disabled:opacity-40">
              Cerrar corte {t}
            </button>
          ))}
          {msg && <span className="font-dm text-xs text-[#52B788]">{msg}</span>}
        </div>
      )}
    </section>
  );
}

function Renglon({ label, valor, suave }: { label: string; valor: number; suave?: boolean }) {
  if (valor === 0 && suave !== true) return null;
  return (
    <tr>
      <td className={`py-1.5 font-dm text-sm ${suave ? "text-[#1B4332]/50" : "text-[#1B4332]/75"}`}>{label}</td>
      <td className={`py-1.5 text-right panel-cifra font-dm text-sm ${
        valor < 0 ? "text-[#C9484A]" : suave ? "text-[#1B4332]/50" : "text-[#1B4332]"
      }`}>
        {valor < 0 ? `−${fmx(-valor)}` : fmx(valor)}
      </td>
    </tr>
  );
}

// ── 4. Te deben / Debes ─────────────────────────────────────────────────────

function Deudas({ datos, permisos, recargar }: {
  datos: Finanzas; permisos: Permisos; recargar: () => void;
}) {
  if (datos.porCobrar === 0 && datos.porPagarTotal === 0) return null;
  return (
    <Plegable
      titulo="Te deben y debes"
      resumen={`te deben ${fmx(datos.porCobrar)} · debes ${fmx(datos.porPagarTotal)}`}
    >
      <VistaCuentas datos={datos} recargar={recargar} permisos={permisos} />
    </Plegable>
  );
}

// ── 5. Ver más ──────────────────────────────────────────────────────────────
// Nada se borró: lo que no se mira a diario vive aquí, cerrado.

function VerMas({ datos, permisos, recargar, desde, hasta, marketing }: {
  datos: Finanzas; permisos: Permisos; recargar: () => void;
  desde: string; hasta: string; marketing: DatosMarketing;
}) {
  return (
    <div className="space-y-4">
      <Plegable titulo="Costos y gastos" resumen="capturar y revisar">
        <VistaMovimientos datos={datos} recargar={recargar} permisos={permisos} />
      </Plegable>
      <Plegable titulo="Reserva por reserva" resumen={`${datos.reservas.length} reserva${datos.reservas.length === 1 ? "" : "s"}`}>
        <VistaReservas datos={datos} recargar={recargar} />
      </Plegable>
      <Plegable titulo="Qué deja cada tour" resumen={`${datos.porTour.length} recorrido${datos.porTour.length === 1 ? "" : "s"}`}>
        <VistaTours datos={datos} />
      </Plegable>
      <Plegable titulo="Cortes cerrados" resumen="el histórico">
        <VistaCortes datos={datos} permisos={permisos} desde={desde} hasta={hasta} />
      </Plegable>
      <Plegable titulo="De dónde viene la venta" resumen="tours, origen y WhatsApp">
        <BloqueMarketing datos={marketing} />
      </Plegable>
    </div>
  );
}

// ── El plegable ─────────────────────────────────────────────────────────────

function Plegable({ titulo, resumen, children }: {
  titulo: string; resumen?: string; children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <section className="panel-card overflow-hidden">
      <button
        onClick={() => setAbierto(a => !a)}
        className="panel-foco w-full flex items-center gap-2 px-5 min-h-[56px] text-left hover:bg-[#1B4332]/[0.02] transition-colors"
      >
        {abierto ? <ChevronDown className="w-4 h-4 text-[#1B4332]/40 shrink-0" />
                 : <ChevronRight className="w-4 h-4 text-[#1B4332]/40 shrink-0" />}
        <span className="font-dm text-sm text-[#1B4332] flex-1">{titulo}</span>
        {resumen && <span className="font-dm text-[11px] text-[#1B4332]/40 text-right">{resumen}</span>}
      </button>
      {abierto && <div className="border-t border-[#1B4332]/8">{children}</div>}
    </section>
  );
}
