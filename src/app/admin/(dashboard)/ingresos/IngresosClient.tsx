"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

const BarChart      = dynamic(() => import("recharts").then(m => m.BarChart),      { ssr: false });
const Bar           = dynamic(() => import("recharts").then(m => m.Bar),            { ssr: false });
const XAxis         = dynamic(() => import("recharts").then(m => m.XAxis),          { ssr: false });
const YAxis         = dynamic(() => import("recharts").then(m => m.YAxis),          { ssr: false });
const Tooltip       = dynamic(() => import("recharts").then(m => m.Tooltip),        { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid),  { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

function fmx(n: number) { return n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toLocaleString("es-MX")}`; }
const fFull = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

interface Periodo { reservas: number; ingresos: number; vendido: number }
interface Serie { mes: string; ingresos: number; reservas: number }

interface KPIs {
  semana: Periodo;
  mes:    Periodo & { delta: number };
  año:    Periodo;
  total:  Periodo;
  porCobrar: number;
  sinRegistroDePago: { cuantas: number; monto: number; folios: string[] };
  porMesVenta: Serie[];
  porMesTour:  Serie[];
  toursMasVendidos: { nombre: string; count: number; ingresos: number }[];
}

function KpiCard({ label, value, sub, extra, delta }: {
  label: string; value: string; sub?: string; extra?: string; delta?: number;
}) {
  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
      <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">{label}</p>
      <p className="font-cormorant text-[#52B788] text-3xl font-light leading-none mb-1">{value}</p>
      {sub && <p className="text-[#1B4332]/40 font-dm text-xs">{sub}</p>}
      {extra && <p className="text-[#1B4332]/55 font-dm text-xs mt-1">{extra}</p>}
      {delta !== undefined && (
        <p className={`font-dm text-xs mt-1 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export default function IngresosClient({ kpis }: { kpis: KPIs }) {
  const [vista, setVista] = useState<"venta" | "tour">("venta");
  const serie = vista === "venta" ? kpis.porMesVenta : kpis.porMesTour;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-cormorant text-[#1B4332] text-2xl font-light mb-2">Ingresos &amp; Métricas</h1>
      <p className="text-[#1B4332]/50 font-dm text-sm mb-6">
        <strong className="font-medium text-[#1B4332]/70">Cobrado</strong> es el dinero que ya entró (anticipos y pagos completos).{" "}
        <strong className="font-medium text-[#1B4332]/70">Vendido</strong> es el valor total de las reservas, cobrado o no.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Esta semana"     value={fmx(kpis.semana.ingresos)} sub={`${kpis.semana.reservas} reservas`} extra={`Vendido: ${fmx(kpis.semana.vendido)}`} />
        <KpiCard label="Este mes"        value={fmx(kpis.mes.ingresos)}    sub={`${kpis.mes.reservas} reservas`}    extra={`Vendido: ${fmx(kpis.mes.vendido)}`} delta={kpis.mes.delta} />
        <KpiCard label="Este año"        value={fmx(kpis.año.ingresos)}    sub={`${kpis.año.reservas} reservas`}    extra={`Vendido: ${fmx(kpis.año.vendido)}`} />
        <KpiCard label="Total acumulado" value={fmx(kpis.total.ingresos)}  sub={`${kpis.total.reservas} reservas`}  extra={`Vendido: ${fmx(kpis.total.vendido)}`} />
      </div>

      {/* Saldo por cobrar: la diferencia entre lo vendido y lo cobrado */}
      {kpis.porCobrar > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-sm p-4 mb-4">
          <p className="text-[10px] tracking-[2px] uppercase text-orange-700/60 font-dm mb-1">Falta por cobrar</p>
          <p className="font-cormorant text-orange-700 text-2xl font-light leading-none">{fFull(kpis.porCobrar)}</p>
          <p className="text-orange-700/60 font-dm text-xs mt-1">
            Suma de los saldos de todas las reservas no canceladas: {fFull(kpis.total.vendido)} vendido − {fFull(kpis.total.ingresos)} cobrado.
          </p>
        </div>
      )}

      {/* Reservas cuyo importe el panel no puede contar */}
      {kpis.sinRegistroDePago.cuantas > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-sm p-4 mb-8">
          <p className="flex items-center gap-2 text-amber-800 font-dm text-sm font-medium mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {kpis.sinRegistroDePago.cuantas} reserva{kpis.sinRegistroDePago.cuantas !== 1 ? "s" : ""} sin importe registrado
          </p>
          <p className="text-amber-800/75 font-dm text-xs">
            Valen {fFull(kpis.sinRegistroDePago.monto)} pero se capturaron sin anticipo y sin pago por Stripe, así que
            cuentan como <strong>cero</strong> en “cobrado”. Si ese dinero sí entró, abre la reserva y escribe el
            anticipo real. Folios: <span className="font-mono">{kpis.sinRegistroDePago.folios.join(", ")}</span>
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">
            Cobrado · {vista === "venta" ? "por mes de venta" : "por mes del tour"}
          </p>
          <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
            {([["venta","Por venta"],["tour","Por tour"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-1 text-[10px] tracking-[1px] uppercase font-dm transition-colors ${
                  vista === v ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/50 hover:bg-[#FAFAF8]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[#1B4332]/40 font-dm text-xs mb-3">
          {vista === "venta"
            ? "El dinero cae en el mes en que capturaste la reserva. Mide tu ritmo de ventas."
            : "El dinero cae en el mes en que se hace el tour. Mide la operación, e incluye los meses que ya vendiste por delante."}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={serie} margin={{ top:4, right:8, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,46,26,0.06)" />
            <XAxis dataKey="mes" tick={{ fill:"#1B4332", opacity:0.4, fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmx(Number(v))} tick={{ fill:"#1B4332", opacity:0.4, fontSize:10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background:"#fff", border:"1px solid rgba(26,46,26,0.1)", borderRadius:2 }}
              labelStyle={{ color:"#1B4332", fontSize:11 }}
              formatter={(v: any) => [fFull(Number(v)), "Cobrado"]}
            />
            <Bar dataKey="ingresos" fill="#52B788" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top tours */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
        <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-1">Tours más vendidos</p>
        <p className="text-[#1B4332]/40 font-dm text-xs mb-4">
          Cuenta TODOS los recorridos de cada reserva, no solo el primero. El dinero de un viaje de varios tours
          se reparte entre ellos según lo que costó cada uno.
        </p>
        {kpis.toursMasVendidos.length === 0
          ? <p className="text-[#1B4332]/30 font-dm text-sm">Sin datos aún</p>
          : <table className="w-full font-dm text-sm">
              <thead>
                <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/40 text-[10px] uppercase tracking-[1px]">
                  <th className="text-left py-2 pr-4">Tour</th>
                  <th className="text-center py-2 pr-4">Reservas</th>
                  <th className="text-right py-2">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {kpis.toursMasVendidos.map(t => (
                  <tr key={t.nombre} className="border-b border-[#1B4332]/6">
                    <td className="py-2.5 pr-4 text-[#1B4332]/80">{t.nombre}</td>
                    <td className="py-2.5 pr-4 text-center text-[#1B4332]/60">{t.count}</td>
                    <td className="py-2.5 text-right text-[#52B788] font-medium">${t.ingresos.toLocaleString("es-MX")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}
