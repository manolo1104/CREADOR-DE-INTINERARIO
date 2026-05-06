"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatMXN(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString("es-MX")}`;
}

interface KPIs {
  semana:  { reservas: number; ingresos: number };
  mes:     { reservas: number; ingresos: number; delta: number };
  año:     { reservas: number; ingresos: number };
  total:   { reservas: number; ingresos: number };
  porMes:  { mes: string; ingresos: number; reservas: number }[];
  toursMasVendidos: { nombre: string; count: number; ingresos: number }[];
}

function KpiCard({ label, value, sub, delta }: {
  label: string; value: string; sub?: string; delta?: number;
}) {
  return (
    <div className="border border-white/10 bg-verde-profundo/20 p-5">
      <p className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm mb-2">{label}</p>
      <p className="font-cormorant text-dorado text-3xl font-light leading-none mb-1">{value}</p>
      {sub && <p className="text-crema/40 font-dm text-xs">{sub}</p>}
      {delta !== undefined && (
        <p className={`font-dm text-xs mt-1 ${delta >= 0 ? "text-verde-vivo" : "text-terracota"}`}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export default function IngresosClient({ kpis }: { kpis: KPIs }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-cormorant text-crema text-2xl mb-6">Ingresos & Métricas</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Esta semana"
          value={formatMXN(kpis.semana.ingresos)}
          sub={`${kpis.semana.reservas} reservas`}
        />
        <KpiCard
          label="Este mes"
          value={formatMXN(kpis.mes.ingresos)}
          sub={`${kpis.mes.reservas} reservas`}
          delta={kpis.mes.delta}
        />
        <KpiCard
          label="Este año"
          value={formatMXN(kpis.año.ingresos)}
          sub={`${kpis.año.reservas} reservas`}
        />
        <KpiCard
          label="Total acumulado"
          value={formatMXN(kpis.total.ingresos)}
          sub={`${kpis.total.reservas} reservas totales`}
        />
      </div>

      {/* Chart */}
      <div className="border border-white/10 bg-verde-profundo/20 p-5 mb-8">
        <p className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm mb-4">
          Ingresos · Últimos 12 meses
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={kpis.porMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="mes" tick={{ fill: "rgba(244,237,216,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatMXN(Number(v))} tick={{ fill: "rgba(244,237,216,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1a2e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }}
              labelStyle={{ color: "#f4edd8", fontSize: 11 }}
              formatter={(v) => [`$${Number(v ?? 0).toLocaleString("es-MX")} MXN`, "Ingresos"]}
            />
            <Bar dataKey="ingresos" fill="#c4882a" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tours más vendidos */}
      <div className="border border-white/10 bg-verde-profundo/20 p-5">
        <p className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm mb-4">Tours más vendidos</p>
        {kpis.toursMasVendidos.length === 0 ? (
          <p className="text-crema/30 font-dm text-sm">Sin datos aún</p>
        ) : (
          <table className="w-full font-dm text-sm">
            <thead>
              <tr className="border-b border-white/10 text-crema/40 text-[10px] uppercase tracking-[1px]">
                <th className="text-left py-2 pr-4">Tour</th>
                <th className="text-center py-2 pr-4">Reservas</th>
                <th className="text-right py-2">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {kpis.toursMasVendidos.map(t => (
                <tr key={t.nombre} className="border-b border-white/6">
                  <td className="py-2.5 pr-4 text-crema/80">{t.nombre}</td>
                  <td className="py-2.5 pr-4 text-center text-crema/60">{t.count}</td>
                  <td className="py-2.5 text-right text-dorado">${t.ingresos.toLocaleString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
