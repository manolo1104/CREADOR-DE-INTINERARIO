"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft, ChevronRight, Download, Plus, Trash2,
  AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import type { Corte, Granularidad, BaseCorte } from "@/lib/admin/corte";

const BarChart            = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar                 = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis               = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis               = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip             = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid       = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

const fmx  = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const fk   = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);
const hoyMX = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fDiaCorto = (ymd: string) =>
  ymd ? `${Number(ymd.slice(8, 10))} ${MESES[Number(ymd.slice(5, 7)) - 1].slice(0, 3)}` : "—";

function sumaDias(ymd: string, dias: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const GRANULARIDADES: { id: Granularidad; label: string }[] = [
  { id: "dia",    label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes" },
];

export default function CorteClient() {
  const [g,      setG]      = useState<Granularidad>("dia");
  const [fecha,  setFecha]  = useState(() => hoyMX());
  const [base,   setBase]   = useState<BaseCorte>("tour");
  const [datos,  setDatos]  = useState<Corte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error,  setError]  = useState("");

  // Captura de costos
  const [gConcepto, setGConcepto] = useState("");
  const [gMonto,    setGMonto]    = useState("");
  const [gFecha,    setGFecha]    = useState(() => hoyMX());
  const [gReserva,  setGReserva]  = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editando,     setEditando]     = useState<string | null>(null);
  const [costoTecleado, setCostoTecleado] = useState("");

  async function cargar() {
    setCargando(true); setError("");
    try {
      const r = await fetch(`/api/admin/corte?fecha=${fecha}&g=${g}&base=${base}`);
      if (!r.ok) throw new Error(r.status === 403 ? "Esta sección no es para tu cuenta" : "No se pudo calcular el corte");
      setDatos(await r.json());
    } catch (e: any) {
      setError(e.message); setDatos(null);
    } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fecha, g, base]);

  function mover(dir: -1 | 1) {
    if (g === "dia")    return setFecha(f => sumaDias(f, dir));
    if (g === "semana") return setFecha(f => sumaDias(f, 7 * dir));
    const [y, m] = fecha.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    setFecha(d.toISOString().slice(0, 10));
  }

  const etiqueta = useMemo(() => {
    if (!datos) return "";
    const [y, m, d] = datos.desde.split("-").map(Number);
    if (g === "mes")    return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} ${y}`;
    if (g === "semana") return `${d} ${MESES[m - 1].slice(0, 3)} — ${fDiaCorto(datos.hasta)}`;
    const dia = new Date(datos.desde + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    return dia[0].toUpperCase() + dia.slice(1);
  }, [datos, g]);

  const esFuturo = useMemo(() => datos ? datos.desde > hoyMX() : false, [datos]);

  async function agregarGasto() {
    if (!gConcepto.trim() || !(Number(gMonto) > 0)) return;
    setGuardando(true);
    const r = await fetch("/api/admin/gastos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: gConcepto.trim(), monto: Number(gMonto), fecha: gFecha,
        reservaId: gReserva || undefined,
      }),
    });
    setGuardando(false);
    if (r.ok) { setGConcepto(""); setGMonto(""); cargar(); }
  }

  async function borrarGasto(id: string) {
    await fetch(`/api/admin/gastos?id=${id}`, { method: "DELETE" });
    cargar();
  }

  async function guardarCosto(reservaId: string, fechaTour: string) {
    const monto = Math.round(Number(costoTecleado) || 0);
    if (monto <= 0) { setEditando(null); setCostoTecleado(""); return; }
    await fetch("/api/admin/gastos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: "Costo de la salida", monto, fecha: fechaTour || hoyMX(), reservaId }),
    });
    setEditando(null); setCostoTecleado(""); cargar();
  }

  function descargar() {
    if (!datos) return;
    const t = datos.total;
    const filas: (string | number)[][] = [
      [`Corte ${g}`, `${datos.desde} a ${datos.hasta}`, base === "tour" ? "por fecha de tour" : "por fecha de venta"],
      [],
      ["ESTADO DE RESULTADOS", "Periodo", "Periodo anterior"],
      ["Venta de tours",        t.ventasTours,      datos.anterior.ventasTours],
      ["Hospedaje",             t.ventasHospedaje,  datos.anterior.ventasHospedaje],
      ["Extras",                t.ventasExtras,     datos.anterior.ventasExtras],
      ["VENTAS TOTALES",        t.ventas,           datos.anterior.ventas],
      ["Costo de ventas",       -t.costoVentas,     -datos.anterior.costoVentas],
      ["Comisiones de pago",    -t.comision,        -datos.anterior.comision],
      ["UTILIDAD BRUTA",        t.utilidadBruta,    datos.anterior.utilidadBruta],
      ["Margen bruto %",        t.margenBruto,      datos.anterior.margenBruto],
      ["Gastos de operación",   -t.gastosOperacion, -datos.anterior.gastosOperacion],
      ["UTILIDAD NETA",         t.utilidadNeta,     datos.anterior.utilidadNeta],
      ["Margen neto %",         t.margenNeto,       datos.anterior.margenNeto],
      [],
      ["Cobrado", t.cobrado], ["Por cobrar", t.porCobrar],
      ["Reservas", t.reservas], ["Personas", t.personas], ["Ticket promedio", t.ticketPromedio],
      ["Costo esperado (Cotizador)", t.costoEsperado],
      ["Utilidad esperada",          t.utilidadEsperada],
      [],
      ["RENTABILIDAD POR TOUR"],
      ["Tour", "Salidas", "Personas", "Ventas", "Costo real", "Costo esperado", "Utilidad", "Margen %"],
      ...datos.porTour.map(x => [x.nombre, x.salidas, x.personas, x.ventas, x.costoReal, x.costoEsperado, x.utilidad, x.margen]),
      [],
      ["RESERVAS"],
      ["Folio", "Fecha tour", "Cliente", "Tour", "Personas", "Guía", "Venta", "Costo real", "Costo esperado", "Utilidad", "Margen %"],
      ...datos.reservas.map(r => [r.folio, r.fechaTour, r.cliente, r.tour, r.personas, r.guia, r.venta, r.costoReal, r.costoEsperado, r.utilidad, r.margen]),
      [],
      ["COSTOS Y GASTOS"],
      ["Fecha", "Concepto", "Monto", "De la reserva", "Capturado por"],
      ...datos.gastos.map(x => [x.fecha, x.concepto, x.monto, folioDe(x.reservaId, datos), x.creadoPor ?? ""]),
    ];
    const csv = filas.map(f => f.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `corte-${g}-${datos.desde}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* ── Barra de control ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded-sm overflow-hidden border border-[#1B4332]/15">
          {GRANULARIDADES.map(x => (
            <button key={x.id} onClick={() => setG(x.id)}
              className={`px-4 py-2 text-xs font-dm tracking-[1px] uppercase transition-colors ${
                g === x.id ? "bg-[#1B4332] text-white" : "text-[#1B4332]/60 hover:bg-[#1B4332]/5"
              }`}>
              {x.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => mover(-1)} title="Periodo anterior"
            className="p-2 border border-[#1B4332]/15 rounded-sm text-[#1B4332]/60 hover:bg-[#FAFAF8]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-dm text-sm text-[#1B4332] min-w-[190px] text-center">{etiqueta}</span>
          <button onClick={() => mover(1)} title="Periodo siguiente"
            className="p-2 border border-[#1B4332]/15 rounded-sm text-[#1B4332]/60 hover:bg-[#FAFAF8]">
            <ChevronRight className="w-4 h-4" />
          </button>
          {datos && datos.desde !== hoyMX() && (
            <button onClick={() => setFecha(hoyMX())}
              className="ml-1 text-[11px] font-dm text-[#52B788] hover:underline">hoy</button>
          )}
        </div>

        <select value={base} onChange={e => setBase(e.target.value as BaseCorte)}
          title="Con qué fecha entra cada reserva al corte"
          className="border border-[#1B4332]/15 text-[#1B4332]/70 text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]">
          <option value="tour">Por fecha de tour</option>
          <option value="venta">Por fecha de venta</option>
        </select>

        <button onClick={descargar} disabled={!datos}
          className="ml-auto flex items-center gap-2 border border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/40 px-3 py-2 text-[11px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />Excel
        </button>
      </div>

      {cargando && (
        <div className="py-16 flex items-center justify-center gap-2 text-[#1B4332]/40 font-dm text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Calculando el corte…
        </div>
      )}
      {error && <p className="py-10 text-center text-[#C9484A] font-dm text-sm">{error}</p>}

      {datos && !cargando && (
        <>
          {/* ── Los cuatro números ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Kpi titulo="Ventas"        valor={fmx(datos.total.ventas)}
                 antes={datos.anterior.ventas} ahora={datos.total.ventas} g={g} />
            <Kpi titulo="Utilidad neta" valor={fmx(datos.total.utilidadNeta)}
                 sub={`${datos.total.margenNeto}% de margen`}
                 antes={datos.anterior.utilidadNeta} ahora={datos.total.utilidadNeta} g={g}
                 acento={datos.total.utilidadNeta >= 0} />
            <Kpi titulo="Por cobrar"    valor={fmx(datos.total.porCobrar)}
                 sub={`${fmx(datos.total.cobrado)} ya cobrado`} />
            <Kpi titulo="Reservas"      valor={String(datos.total.reservas)}
                 sub={`${datos.total.personas} personas · ticket ${fmx(datos.total.ticketPromedio)}`}
                 antes={datos.anterior.reservas} ahora={datos.total.reservas} g={g} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            {/* ── Estado de resultados ─────────────────────────────────────── */}
            <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Estado de resultados</h3>
                <span className="text-[10px] font-dm text-[#1B4332]/35 uppercase tracking-[1px]">
                  vs {g === "dia" ? "día" : g === "semana" ? "semana" : "mes"} anterior
                </span>
              </div>

              <table className="w-full font-dm text-sm">
                <tbody>
                  <Linea etiqueta="Venta de tours" valor={datos.total.ventasTours} antes={datos.anterior.ventasTours} />
                  {(datos.total.ventasHospedaje > 0 || datos.anterior.ventasHospedaje > 0) &&
                    <Linea etiqueta="Hospedaje" valor={datos.total.ventasHospedaje} antes={datos.anterior.ventasHospedaje} />}
                  {(datos.total.ventasExtras > 0 || datos.anterior.ventasExtras > 0) &&
                    <Linea etiqueta="Extras" valor={datos.total.ventasExtras} antes={datos.anterior.ventasExtras} />}
                  <Linea etiqueta="Ventas totales" valor={datos.total.ventas} antes={datos.anterior.ventas} total />

                  <Linea etiqueta="Costo de las salidas" valor={-datos.total.costoVentas} antes={-datos.anterior.costoVentas} />
                  <Linea etiqueta="Comisiones de pago"   valor={-datos.total.comision}    antes={-datos.anterior.comision} />
                  <Linea etiqueta="Utilidad bruta" valor={datos.total.utilidadBruta} antes={datos.anterior.utilidadBruta}
                         total pct={datos.total.margenBruto} />

                  <Linea etiqueta="Gastos de operación" valor={-datos.total.gastosOperacion} antes={-datos.anterior.gastosOperacion} />
                  <Linea etiqueta="Utilidad neta" valor={datos.total.utilidadNeta} antes={datos.anterior.utilidadNeta}
                         total destacado pct={datos.total.margenNeto} />
                </tbody>
              </table>

              {/* Lo que el Cotizador dice que debería costar */}
              <div className="mt-4 pt-3 border-t border-dashed border-[#1B4332]/15">
                <div className="flex items-baseline justify-between font-dm text-xs">
                  <span className="text-[#1B4332]/45">Según los costos del Cotizador</span>
                  <span className="text-[#1B4332]/70">
                    costo {fmx(datos.total.costoEsperado)} · utilidad {fmx(datos.total.utilidadEsperada)} ({datos.total.margenEsperado}%)
                  </span>
                </div>
                <p className="text-[10px] font-dm text-[#1B4332]/35 mt-1">
                  {datos.captura.sinCostoEnCotizador > 0
                    ? `Referencia incompleta: ${datos.captura.sinCostoEnCotizador} reserva${datos.captura.sinCostoEnCotizador === 1 ? "" : "s"} con tours sin costos capturados en el Cotizador.`
                    : "Referencia, no resultado: lo de arriba es dinero que salió; esto es lo que debería costar."}
                </p>
              </div>
            </div>

            {/* ── Tendencia + salud del dato ───────────────────────────────── */}
            <div className="flex flex-col gap-5">
              <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 flex-1">
                <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">
                  {g === "dia" ? "Últimos 14 días" : g === "semana" ? "Últimas 12 semanas" : "Últimos 12 meses"}
                </h3>
                <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">Ventas y utilidad, con los costos capturados</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={datos.historico} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1B433212" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 9, fill: "#1B433280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={fk} tick={{ fontSize: 9, fill: "#1B433280" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any, n: any) => [fmx(Number(v) || 0), n === "ventas" ? "Ventas" : "Utilidad"]}
                      contentStyle={{ fontSize: 11, fontFamily: "inherit", borderRadius: 2, border: "1px solid #1B433222" }}
                    />
                    <Bar dataKey="ventas"   fill="#1B4332" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="utilidad" fill="#52B788" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`border rounded-sm p-4 ${
                datos.captura.sinCosto > 0 ? "bg-orange-50 border-orange-200" : "bg-[#52B788]/8 border-[#52B788]/30"
              }`}>
                <div className="flex items-start gap-2">
                  {datos.captura.sinCosto > 0
                    ? <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    : <TrendingUp className="w-4 h-4 text-[#52B788] shrink-0 mt-0.5" />}
                  <div className="font-dm text-xs">
                    <p className={datos.captura.sinCosto > 0 ? "text-orange-900" : "text-[#1B6B45]"}>
                      <strong>{datos.captura.cobertura}% de las ventas</strong> de este periodo ya tienen su costo capturado.
                    </p>
                    {datos.captura.sinCosto > 0 ? (
                      <p className="text-orange-800 mt-1">
                        Faltan {datos.captura.sinCosto} salida{datos.captura.sinCosto === 1 ? "" : "s"} ({fmx(datos.captura.ventaSinCosto)} de venta).
                        {esFuturo ? " Son tours que todavía no salen." : " Mientras falten, la utilidad de arriba es un techo, no el resultado."}
                      </p>
                    ) : (
                      <p className="text-[#1B6B45]/80 mt-1">El corte está completo: la utilidad de arriba es el resultado real.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Rentabilidad por tour ──────────────────────────────────────── */}
          {datos.porTour.length > 0 && (
            <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 mb-5">
              <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-3">Qué deja cada tour</h3>
              <div className="overflow-x-auto">
                <table className="w-full font-dm text-xs">
                  <thead>
                    <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                      <th className="text-left  py-2 pr-3">Tour</th>
                      <th className="text-center py-2 px-2">Salidas</th>
                      <th className="text-center py-2 px-2">Personas</th>
                      <th className="text-right py-2 px-2">Ventas</th>
                      <th className="text-right py-2 px-2">Costo real</th>
                      <th className="text-right py-2 px-2" title="Lo que debería costar según el Cotizador">Esperado</th>
                      <th className="text-right py-2 pl-2">Utilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.porTour.map(t => (
                      <tr key={t.slug} className="border-b border-[#1B4332]/6 last:border-0">
                        <td className="py-2 pr-3 text-[#1B4332] max-w-[220px] truncate">{t.nombre}</td>
                        <td className="py-2 px-2 text-center text-[#1B4332]/60">{t.salidas}</td>
                        <td className="py-2 px-2 text-center text-[#1B4332]/60">{t.personas}</td>
                        <td className="py-2 px-2 text-right text-[#1B4332]">{fmx(t.ventas)}</td>
                        <td className="py-2 px-2 text-right text-[#1B4332]/70">
                          {t.costoReal > 0 ? fmx(t.costoReal) : <span className="text-orange-600/70">sin capturar</span>}
                        </td>
                        <td className="py-2 px-2 text-right text-[#1B4332]/35">
                          {t.costoEsperado > 0 ? fmx(t.costoEsperado) : "—"}
                        </td>
                        <td className={`py-2 pl-2 text-right font-medium ${t.utilidad >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                          {t.costoReal > 0 ? `${fmx(t.utilidad)} · ${t.margen}%` : <span className="text-[#1B4332]/25">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Reservas, con su costo ─────────────────────────────────────── */}
          <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 mb-5">
            <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Salidas del periodo</h3>
            <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
              Escribe sobre la columna de costo para capturar lo que costó cada salida. Puedes capturar varias veces.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full font-dm text-xs">
                <thead>
                  <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                    <th className="text-left  py-2 pr-3">Folio</th>
                    <th className="text-left  py-2 px-2">Fecha</th>
                    <th className="text-left  py-2 px-2">Cliente</th>
                    <th className="text-left  py-2 px-2">Guía</th>
                    <th className="text-right py-2 px-2">Venta</th>
                    <th className="text-right py-2 px-2">Costo</th>
                    <th className="text-right py-2 px-2">Esperado</th>
                    <th className="text-right py-2 pl-2">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.reservas.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-[#1B4332]/30">Sin salidas en este periodo</td></tr>
                  )}
                  {datos.reservas.map(r => (
                    <tr key={r.id} className="border-b border-[#1B4332]/6 last:border-0">
                      <td className="py-2 pr-3 font-mono text-[10px] text-[#1B4332]">{r.folio}</td>
                      <td className="py-2 px-2 text-[#1B4332]/55 whitespace-nowrap">{fDiaCorto(base === "tour" ? r.fechaTour : r.fechaVenta)}</td>
                      <td className="py-2 px-2 text-[#1B4332]/80 max-w-[150px] truncate" title={r.tour}>{r.cliente}</td>
                      <td className="py-2 px-2 text-[#1B4332]/50">{r.guia || <span className="text-orange-600/60">sin guía</span>}</td>
                      <td className="py-2 px-2 text-right text-[#1B4332]">{fmx(r.venta)}</td>
                      <td className="py-2 px-2 text-right">
                        {editando === r.id ? (
                          <span className="inline-flex items-center gap-1">
                            <input autoFocus type="number" value={costoTecleado}
                              onChange={e => setCostoTecleado(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter")  guardarCosto(r.id, r.fechaTour);
                                if (e.key === "Escape") { setEditando(null); setCostoTecleado(""); }
                              }}
                              placeholder="$"
                              className="w-20 border border-[#1B4332]/30 px-1.5 py-0.5 text-right rounded-sm focus:outline-none focus:border-[#1B4332]" />
                            <button onClick={() => guardarCosto(r.id, r.fechaTour)}
                              className="text-[#52B788] hover:text-[#1B6B45] text-[10px] uppercase tracking-[1px]">ok</button>
                          </span>
                        ) : (
                          <button onClick={() => { setEditando(r.id); setCostoTecleado(""); }}
                            title="Agregar lo que costó esta salida"
                            className={`hover:underline ${r.costoCapturado ? "text-[#1B4332]/70" : "text-orange-600"}`}>
                            {r.costoCapturado ? `${fmx(r.costoReal)} +` : "capturar"}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-[#1B4332]/30"
                          title={r.esperadoCompleto ? "Según los costos del Cotizador" : "Faltan costos de este tour en el Cotizador"}>
                        {r.costoEsperado > 0 ? fmx(r.costoEsperado) : "—"}
                      </td>
                      <td className={`py-2 pl-2 text-right font-medium ${r.utilidad >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                        {r.costoCapturado ? `${fmx(r.utilidad)} · ${r.margen}%` : <span className="text-[#1B4332]/25">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Costos y gastos ────────────────────────────────────────────── */}
          <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
            <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Costos y gastos capturados</h3>
            <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
              Si el costo es de una salida, elígela y se resta a esa reserva. Si no, es gasto de operación del periodo.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input type="text" value={gConcepto} onChange={e => setGConcepto(e.target.value)}
                placeholder="Gasolina, sueldo, lanchero, publicidad…"
                className="flex-1 min-w-[170px] border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
              <input type="number" value={gMonto} onChange={e => setGMonto(e.target.value)} placeholder="$0"
                className="w-24 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
              <input type="date" value={gFecha} onChange={e => setGFecha(e.target.value)}
                className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
              <select value={gReserva} onChange={e => setGReserva(e.target.value)}
                className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] max-w-[210px]">
                <option value="">Gasto de operación</option>
                {datos.reservas.map(r => <option key={r.id} value={r.id}>{r.folio} · {r.cliente}</option>)}
              </select>
              <button onClick={agregarGasto} disabled={guardando || !gConcepto.trim() || !(Number(gMonto) > 0)}
                className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-2 text-[11px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" />Agregar
              </button>
            </div>

            {datos.gastos.length === 0 ? (
              <p className="text-[#1B4332]/30 font-dm text-xs py-1">Nada capturado en este periodo.</p>
            ) : (
              <div className="border border-[#1B4332]/10 rounded-sm overflow-hidden">
                {datos.gastos.map(x => (
                  <div key={x.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1B4332]/6 last:border-0 text-xs font-dm">
                    <span className="text-[#1B4332]/45 w-14 shrink-0">{fDiaCorto(x.fecha)}</span>
                    <span className="flex-1 text-[#1B4332] min-w-0 truncate">
                      {x.concepto}
                      {x.reservaId && <span className="text-[#1B4332]/40 ml-1.5">· {folioDe(x.reservaId, datos) || "otra salida"}</span>}
                    </span>
                    {x.creadoPor && <span className="text-[#1B4332]/35 hidden sm:inline">{x.creadoPor}</span>}
                    <span className="text-[#C9484A]">−{fmx(x.monto)}</span>
                    <button onClick={() => borrarGasto(x.id)} title="Borrar"
                      className="text-[#1B4332]/25 hover:text-[#C9484A] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function folioDe(reservaId: string | null, datos: Corte): string {
  if (!reservaId) return "";
  return datos.reservas.find(r => r.id === reservaId)?.folio ?? "";
}

/** Variación contra el periodo anterior, en el lenguaje del panel. */
function Variacion({ antes, ahora, g }: { antes: number; ahora: number; g: Granularidad }) {
  const nombre = g === "dia" ? "ayer" : g === "semana" ? "la semana pasada" : "el mes pasado";
  if (antes === 0 && ahora === 0) return null;
  if (antes === 0) return <span className="text-[#52B788] text-[10px] font-dm">nuevo vs {nombre}</span>;
  const pct = Math.round(((ahora - antes) / Math.abs(antes)) * 100);
  const Icono = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "text-[#52B788]" : pct < 0 ? "text-[#C9484A]" : "text-[#1B4332]/40";
  return (
    <span className={`flex items-center gap-1 text-[10px] font-dm ${color}`}>
      <Icono className="w-3 h-3" />{pct > 0 ? "+" : ""}{pct}% vs {nombre}
    </span>
  );
}

function Kpi({ titulo, valor, sub, antes, ahora, g, acento }: {
  titulo: string; valor: string; sub?: string;
  antes?: number; ahora?: number; g?: Granularidad; acento?: boolean;
}) {
  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
      <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">{titulo}</p>
      <p className={`font-cormorant text-3xl font-light leading-none mb-1 ${
        acento === false ? "text-[#C9484A]" : "text-[#52B788]"
      }`}>{valor}</p>
      {sub && <p className="text-[#1B4332]/40 font-dm text-xs">{sub}</p>}
      {antes !== undefined && ahora !== undefined && g && (
        <div className="mt-1"><Variacion antes={antes} ahora={ahora} g={g} /></div>
      )}
    </div>
  );
}

/** Un renglón del estado de resultados, con su comparación al lado. */
function Linea({ etiqueta, valor, antes, total, destacado, pct }: {
  etiqueta: string; valor: number; antes: number;
  total?: boolean; destacado?: boolean; pct?: number;
}) {
  const negativo = valor < 0;
  const texto = negativo ? `−${fmx(-valor)}` : fmx(valor);
  return (
    <tr className={total ? "border-t border-[#1B4332]/15" : ""}>
      <td className={`py-1.5 ${destacado ? "text-[#1B4332] font-medium" : total ? "text-[#1B4332]" : "text-[#1B4332]/55 pl-3"}`}>
        {etiqueta}
        {pct !== undefined && <span className="text-[#1B4332]/40 font-normal text-xs ml-1.5">{pct}%</span>}
      </td>
      <td className={`py-1.5 text-right tabular-nums ${
        destacado ? "text-[#1B4332] font-medium text-base"
          : negativo ? "text-[#C9484A]" : total ? "text-[#1B4332]" : "text-[#1B4332]/70"
      }`}>{texto}</td>
      <td className="py-1.5 text-right tabular-nums text-[#1B4332]/30 text-xs w-24 hidden sm:table-cell">
        {antes === 0 ? "—" : (antes < 0 ? `−${fmx(-antes)}` : fmx(antes))}
      </td>
    </tr>
  );
}
