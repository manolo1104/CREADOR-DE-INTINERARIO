"use client";

import { useMemo, useState } from "react";
import {
  Download, AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus,
  ChevronRight, ChevronDown, Lock,
} from "lucide-react";
import type { Finanzas, ReservaFinanciera } from "@/lib/admin/finanzas";
import { useFinanzas, rangoDe, hoyMX, type Preset } from "./useFinanzas";
import VistaReservas   from "./VistaReservas";
import VistaMovimientos from "./VistaMovimientos";
import VistaCuentas    from "./VistaCuentas";
import VistaSocios     from "./VistaSocios";
import VistaCortes     from "./VistaCortes";
import VistaTours      from "./VistaTours";
import { fmx, pctTexto, Variacion } from "./ui";

export interface Permisos {
  gastoGeneral: boolean;
  anular: boolean;
  cerrarCorte: boolean;
  socios: boolean;
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "hoy",       label: "Hoy" },
  { id: "semana",    label: "Esta semana" },
  { id: "mes",       label: "Este mes" },
  { id: "mesPasado", label: "Mes pasado" },
  { id: "rango",     label: "Personalizado" },
];

type Vista = "resumen" | "reservas" | "tours" | "movimientos" | "cuentas" | "socios" | "cortes";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "resumen",     label: "Resumen" },
  { id: "reservas",    label: "Reservas" },
  { id: "tours",       label: "Por tour" },
  { id: "movimientos", label: "Costos y gastos" },
  { id: "cuentas",     label: "Cobrar y pagar" },
  { id: "socios",      label: "Socios" },
  { id: "cortes",      label: "Cortes" },
];

export default function FinanzasClient({ permisos }: { permisos: Permisos }) {
  const [preset, setPreset] = useState<Preset>("mes");
  const [rango,  setRango]  = useState(() => rangoDe("mes"));
  const [base,   setBase]   = useState<"tour" | "venta">("tour");
  const [vista,  setVista]  = useState<Vista>("resumen");
  const [drill,  setDrill]  = useState<string | null>(null);

  const { datos, cargando, error, recargar } = useFinanzas(rango.desde, rango.hasta, base);

  function elegirPreset(p: Preset) {
    setPreset(p);
    if (p !== "rango") setRango(rangoDe(p));
  }

  const etiquetaPeriodo = useMemo(() => {
    if (rango.desde === rango.hasta) return fDia(rango.desde);
    return `${fDia(rango.desde)} — ${fDia(rango.hasta)}`;
  }, [rango]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Finanzas</h1>
        <span className="font-dm text-xs text-[#1B4332]/45">{etiquetaPeriodo}</span>
      </div>
      <p className="text-[#1B4332]/50 font-dm text-sm mb-5">
        Qué se vendió, qué se cobró, qué costó y qué quedó.
      </p>

      {/* ── Periodo ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-sm overflow-hidden border border-[#1B4332]/15">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => elegirPreset(p.id)}
              className={`px-3 py-2 text-[11px] font-dm tracking-[1px] uppercase transition-colors ${
                preset === p.id ? "bg-[#1B4332] text-white" : "text-[#1B4332]/60 hover:bg-[#1B4332]/5"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {preset === "rango" && (
          <span className="flex items-center gap-1.5">
            <input type="date" value={rango.desde} max={rango.hasta}
              onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]" />
            <span className="text-[#1B4332]/35 text-xs">a</span>
            <input type="date" value={rango.hasta} min={rango.desde} max={hoyMX()}
              onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]" />
          </span>
        )}

        <select value={base} onChange={e => setBase(e.target.value as "tour" | "venta")}
          title="Con qué fecha entra cada reserva al corte"
          className="border border-[#1B4332]/15 text-[#1B4332]/70 text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]">
          <option value="tour">Por fecha de tour</option>
          <option value="venta">Por fecha de venta</option>
        </select>
      </div>

      {/* ── Secciones ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 overflow-x-auto border-b border-[#1B4332]/10">
        {VISTAS.filter(v => v.id !== "socios" || permisos.socios || true).map(v => (
          <button key={v.id} onClick={() => setVista(v.id)}
            className={`px-3 py-2 text-xs font-dm whitespace-nowrap transition-colors border-b-2 -mb-px ${
              vista === v.id
                ? "border-[#1B4332] text-[#1B4332] font-medium"
                : "border-transparent text-[#1B4332]/50 hover:text-[#1B4332]"
            }`}>
            {v.label}
          </button>
        ))}
      </div>

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
        <>
          {vista === "resumen"     && <Resumen datos={datos} drill={drill} setDrill={setDrill} irA={setVista} />}
          {vista === "reservas"    && <VistaReservas datos={datos} recargar={recargar} />}
          {vista === "tours"       && <VistaTours datos={datos} />}
          {vista === "movimientos" && <VistaMovimientos datos={datos} recargar={recargar} permisos={permisos} />}
          {vista === "cuentas"     && <VistaCuentas datos={datos} recargar={recargar} permisos={permisos} />}
          {vista === "socios"      && <VistaSocios datos={datos} recargar={recargar} permisos={permisos} />}
          {vista === "cortes"      && <VistaCortes datos={datos} permisos={permisos} desde={rango.desde} hasta={rango.hasta} />}
        </>
      )}
    </div>
  );
}

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fDia = (ymd: string) => ymd ? `${Number(ymd.slice(8,10))} ${MESES[Number(ymd.slice(5,7))-1]} ${ymd.slice(0,4)}` : "—";

// ── Resumen: los números y el estado de resultados ─────────────────────────

function Resumen({ datos, drill, setDrill, irA }: {
  datos: Finanzas; drill: string | null; setDrill: (s: string | null) => void;
  irA: (v: Vista) => void;
}) {
  const { er, erAnterior: ant } = datos;

  return (
    <>
      {/* Alertas primero: si algo está mal, se ve antes que nada */}
      {datos.alertas.length > 0 && (
        <div className="mb-5 border border-orange-200 bg-orange-50 rounded-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <p className="font-dm text-xs text-orange-900 font-medium">
              {datos.alertas.length} cosa{datos.alertas.length === 1 ? "" : "s"} que revisar
            </p>
          </div>
          <ul className="divide-y divide-orange-100">
            {datos.alertas.slice(0, 6).map((a, i) => (
              <li key={i} className="px-4 py-2 font-dm text-xs text-orange-900/85 flex items-start gap-2">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.nivel === "alta" ? "bg-[#C9484A]" : "bg-orange-400"}`} />
                {a.mensaje}
              </li>
            ))}
            {datos.alertas.length > 6 && (
              <li className="px-4 py-2 font-dm text-[11px] text-orange-800/60">
                y {datos.alertas.length - 6} más
              </li>
            )}
          </ul>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Kpi titulo="Ventas brutas" valor={fmx(er.ventasBrutas)} antes={ant.ventasBrutas} ahora={er.ventasBrutas}
             detalle={`Netas ${fmx(er.ventasNetas)} · sin comisiones`} onClick={() => irA("reservas")} />
        <Kpi titulo="Cobrado" valor={fmx(datos.cobrado)} antes={undefined} ahora={undefined}
             detalle={`${pctTexto(datos.cobrado, er.ventasBrutas)} de lo vendido`} onClick={() => irA("cuentas")} />
        <Kpi titulo="Por cobrar" valor={fmx(datos.porCobrar)} alerta={datos.porCobrar > 0}
             detalle={datos.porCobrar > 0 ? "Dinero que aún no entra" : "Todo cobrado"} onClick={() => irA("cuentas")} />
        <Kpi titulo="Utilidad operativa" valor={fmx(er.utilidadOperativa)}
             antes={ant.utilidadOperativa} ahora={er.utilidadOperativa}
             detalle={`${er.margenOperativo}% de margen`} onClick={() => setDrill(drill === "er" ? null : "er")} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi titulo="Costos directos" valor={fmx(er.costosDirectosTotal)} antes={ant.costosDirectosTotal} ahora={er.costosDirectosTotal}
             detalle={`${pctTexto(er.costosDirectosTotal, er.ventasBrutas)} de las ventas`} onClick={() => irA("movimientos")} invertir />
        <Kpi titulo="Gastos generales" valor={fmx(er.gastosGeneralesTotal)} antes={ant.gastosGeneralesTotal} ahora={er.gastosGeneralesTotal}
             detalle={`${pctTexto(er.gastosGeneralesTotal, er.ventasBrutas)} de las ventas`} onClick={() => irA("movimientos")} invertir />
        <Kpi titulo="Utilidad bruta" valor={fmx(er.utilidadBruta)} antes={ant.utilidadBruta} ahora={er.utilidadBruta}
             detalle={`${er.margenBruto}% de margen`} />
        <Kpi titulo="Flujo de efectivo" valor={fmx(datos.flujo.flujoNeto)}
             detalle="Cobrado menos pagado" alerta={datos.flujo.flujoNeto < 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Estado de resultados */}
        <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Estado de resultados</h3>
            <span className="text-[9px] font-dm text-[#1B4332]/35 uppercase tracking-[1px]">
              importe · % ventas · anterior
            </span>
          </div>

          <table className="w-full font-dm text-sm">
            <tbody>
              <Renglon etiqueta="Ventas de tours" monto={er.ventasTours} ventas={er.ventasBrutas} antes={ant.ventasTours} sangria />
              {er.ventasHospedaje > 0 && <Renglon etiqueta="Hospedaje" monto={er.ventasHospedaje} ventas={er.ventasBrutas} antes={ant.ventasHospedaje} sangria />}
              {er.ventasExtras > 0 && <Renglon etiqueta="Extras" monto={er.ventasExtras} ventas={er.ventasBrutas} antes={ant.ventasExtras} sangria />}
              <Renglon etiqueta="Total de ingresos" monto={er.ventasBrutas} ventas={er.ventasBrutas} antes={ant.ventasBrutas} total />

              {er.costosDirectos.map(c => (
                <Renglon key={c.id} etiqueta={c.label} monto={-c.monto} ventas={er.ventasBrutas}
                         antes={-(ant.costosDirectos.find(x => x.id === c.id)?.monto ?? 0)} sangria />
              ))}
              {er.comisiones > 0 && <Renglon etiqueta="Comisiones de pago" monto={-er.comisiones} ventas={er.ventasBrutas} antes={-ant.comisiones} sangria />}
              <Renglon etiqueta="Utilidad bruta" monto={er.utilidadBruta} ventas={er.ventasBrutas} antes={ant.utilidadBruta} total />

              {er.gastosGenerales.map(gg => (
                <Renglon key={gg.id} etiqueta={gg.label} monto={-gg.monto} ventas={er.ventasBrutas}
                         antes={-(ant.gastosGenerales.find(x => x.id === gg.id)?.monto ?? 0)} sangria />
              ))}
              {er.gastosGenerales.length === 0 && (
                <tr><td colSpan={4} className="py-1.5 pl-3 text-[#1B4332]/30 text-xs">Sin gastos generales en el periodo</td></tr>
              )}
              <Renglon etiqueta="Utilidad operativa" monto={er.utilidadOperativa} ventas={er.ventasBrutas}
                       antes={ant.utilidadOperativa} total destacado />
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-5">
          {/* Flujo de efectivo */}
          <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
            <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Flujo de efectivo</h3>
            <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
              Utilidad no es efectivo: una venta no es dinero hasta que se cobra.
            </p>
            <table className="w-full font-dm text-sm">
              <tbody>
                <Renglon etiqueta="Cobros de clientes"   monto={datos.flujo.cobros} ventas={0} antes={0} sangria sinPct sinAntes />
                <Renglon etiqueta="Pagos a proveedores"  monto={-datos.flujo.pagosProveedores} ventas={0} antes={0} sangria sinPct sinAntes />
                <Renglon etiqueta="Gastos pagados"       monto={-datos.flujo.gastosPagados} ventas={0} antes={0} sangria sinPct sinAntes />
                {datos.flujo.otrosMovimientos > 0 &&
                  <Renglon etiqueta="Reembolsos y repartos" monto={-datos.flujo.otrosMovimientos} ventas={0} antes={0} sangria sinPct sinAntes />}
                <Renglon etiqueta="Flujo neto" monto={datos.flujo.flujoNeto} ventas={0} antes={0} total destacado sinPct sinAntes />
              </tbody>
            </table>
            <div className="mt-3 pt-3 border-t border-dashed border-[#1B4332]/15 grid grid-cols-2 gap-3 font-dm text-xs">
              <div>
                <p className="text-[#1B4332]/45">Te deben</p>
                <p className="text-[#1B4332] text-base">{fmx(datos.porCobrar)}</p>
              </div>
              <div>
                <p className="text-[#1B4332]/45">Debes</p>
                <p className="text-[#C9484A] text-base">{fmx(datos.porPagarTotal)}</p>
              </div>
            </div>
          </div>

          {/* Salud del dato */}
          <div className={`border rounded-sm p-4 ${
            datos.captura.estimadas > 0 || datos.captura.sinDato > 0
              ? "bg-[#1a4e8a]/6 border-[#1a4e8a]/25" : "bg-[#52B788]/8 border-[#52B788]/30"
          }`}>
            <p className="font-dm text-xs text-[#1B4332]">
              <strong>{datos.captura.cobertura}% de las ventas</strong> tiene costos capturados de verdad.
            </p>
            {datos.captura.estimadas > 0 && (
              <p className="font-dm text-xs text-[#1B4332]/70 mt-1">
                {datos.captura.estimadas} reserva{datos.captura.estimadas === 1 ? " está calculada" : "s están calculadas"} con
                los costos del Cotizador. Cuentan en la utilidad, pero son lo que
                <em> debería</em> costar, no lo que costó.
              </p>
            )}
            {datos.captura.sinDato > 0 && (
              <p className="font-dm text-xs text-orange-800 mt-1">
                {datos.captura.sinDato} sin costo ni en captura ni en el Cotizador: esas salen con margen inflado.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ titulo, valor, detalle, antes, ahora, onClick, alerta, invertir }: {
  titulo: string; valor: string; detalle?: string;
  antes?: number; ahora?: number; onClick?: () => void; alerta?: boolean; invertir?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`text-left bg-white border rounded-sm p-4 transition-colors ${
        onClick ? "hover:border-[#1B4332]/30 cursor-pointer" : "cursor-default"
      } ${alerta ? "border-orange-300" : "border-[#1B4332]/10"}`}>
      <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-1.5 flex items-center gap-1">
        {titulo}{onClick && <ChevronRight className="w-3 h-3 text-[#1B4332]/25" />}
      </p>
      <p className={`font-cormorant text-2xl font-light leading-none mb-1 ${alerta ? "text-orange-600" : "text-[#52B788]"}`}>
        {valor}
      </p>
      {detalle && <p className="text-[#1B4332]/40 font-dm text-[11px]">{detalle}</p>}
      {antes !== undefined && ahora !== undefined && (
        <div className="mt-1"><Variacion antes={antes} ahora={ahora} invertir={invertir} /></div>
      )}
    </button>
  );
}

function Renglon({ etiqueta, monto, ventas, antes, sangria, total, destacado, sinPct, sinAntes }: {
  etiqueta: string; monto: number; ventas: number; antes: number;
  sangria?: boolean; total?: boolean; destacado?: boolean; sinPct?: boolean; sinAntes?: boolean;
}) {
  const neg = monto < 0;
  return (
    <tr className={total ? "border-t border-[#1B4332]/15" : ""}>
      <td className={`py-1.5 ${destacado ? "text-[#1B4332] font-medium" : total ? "text-[#1B4332]" : "text-[#1B4332]/55"} ${sangria ? "pl-3" : ""}`}>
        {etiqueta}
      </td>
      <td className={`py-1.5 text-right tabular-nums ${
        destacado ? "text-[#1B4332] font-medium text-base" : neg ? "text-[#C9484A]" : total ? "text-[#1B4332]" : "text-[#1B4332]/70"
      }`}>
        {neg ? `−${fmx(-monto)}` : fmx(monto)}
      </td>
      <td className="py-1.5 text-right tabular-nums text-[#1B4332]/35 text-[11px] w-12">
        {sinPct || ventas <= 0 ? "" : `${Math.round((Math.abs(monto) / ventas) * 100)}%`}
      </td>
      <td className="py-1.5 text-right tabular-nums text-[#1B4332]/25 text-[11px] w-20 hidden sm:table-cell">
        {sinAntes ? "" : antes === 0 ? "—" : (antes < 0 ? `−${fmx(-antes)}` : fmx(antes))}
      </td>
    </tr>
  );
}
