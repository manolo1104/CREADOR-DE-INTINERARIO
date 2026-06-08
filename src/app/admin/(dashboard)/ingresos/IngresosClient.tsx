"use client";

import dynamic from "next/dynamic";

const BarChart      = dynamic(() => import("recharts").then(m => m.BarChart),      { ssr: false });
const Bar           = dynamic(() => import("recharts").then(m => m.Bar),            { ssr: false });
const XAxis         = dynamic(() => import("recharts").then(m => m.XAxis),          { ssr: false });
const YAxis         = dynamic(() => import("recharts").then(m => m.YAxis),          { ssr: false });
const Tooltip       = dynamic(() => import("recharts").then(m => m.Tooltip),        { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid),  { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

function fmx(n: number) { return n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toLocaleString("es-MX")}`; }

interface KPIs {
  semana: { reservas: number; ingresos: number };
  mes:    { reservas: number; ingresos: number; delta: number };
  año:    { reservas: number; ingresos: number };
  total:  { reservas: number; ingresos: number };
  porMes: { mes: string; ingresos: number; reservas: number }[];
  toursMasVendidos: { nombre: string; count: number; ingresos: number }[];
}

function KpiCard({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number }) {
  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
      <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">{label}</p>
      <p className="font-cormorant text-[#52B788] text-3xl font-light leading-none mb-1">{value}</p>
      {sub && <p className="text-[#1B4332]/40 font-dm text-xs">{sub}</p>}
      {delta !== undefined && (
        <p className={`font-dm text-xs mt-1 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export default function IngresosClient({ kpis }: { kpis: KPIs }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-cormorant text-[#1B4332] text-2xl font-light mb-6">Ingresos & Métricas</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Esta semana" value={fmx(kpis.semana.ingresos)} sub={`${kpis.semana.reservas} reservas`} />
        <KpiCard label="Este mes" value={fmx(kpis.mes.ingresos)} sub={`${kpis.mes.reservas} reservas`} delta={kpis.mes.delta} />
        <KpiCard label="Este año" value={fmx(kpis.año.ingresos)} sub={`${kpis.año.reservas} reservas`} />
        <KpiCard label="Total acumulado" value={fmx(kpis.total.ingresos)} sub={`${kpis.total.reservas} reservas`} />
      </div>

      {/* Chart */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 mb-8">
        <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-4">Ingresos · Últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={kpis.porMes} margin={{ top:4, right:8, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,46,26,0.06)" />
            <XAxis dataKey="mes" tick={{ fill:"#1B4332", opacity:0.4, fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmx(Number(v))} tick={{ fill:"#1B4332", opacity:0.4, fontSize:10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background:"#fff", border:"1px solid rgba(26,46,26,0.1)", borderRadius:2 }}
              labelStyle={{ color:"#1B4332", fontSize:11 }}
              formatter={(v: any) => [`$${Number(v).toLocaleString("es-MX")} MXN`, "Ingresos"]}
            />
            <Bar dataKey="ingresos" fill="#52B788" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top tours */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
        <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-4">Tours más vendidos</p>
        {kpis.toursMasVendidos.length === 0
          ? <p className="text-[#1B4332]/30 font-dm text-sm">Sin datos aún</p>
          : <table className="w-full font-dm text-sm">
              <thead>
                <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/40 text-[10px] uppercase tracking-[1px]">
                  <th className="text-left py-2 pr-4">Tour</th>
                  <th className="text-center py-2 pr-4">Reservas</th>
                  <th className="text-right py-2">Ingresos</th>
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
