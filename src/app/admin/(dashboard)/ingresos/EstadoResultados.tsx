"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { EstadoResultados as Datos, BaseCorte } from "@/lib/admin/estadoResultados";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

const fDia = (ymd: string) =>
  ymd ? new Date(ymd + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";

// ── Periodos ────────────────────────────────────────────────────────────────
// Se calculan en el navegador con la fecha de México para que "hoy" sea hoy
// aquí, no en el servidor.
function hoyMX(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}
function sumaDias(ymd: string, dias: number): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
/** Lunes de la semana a la que pertenece la fecha (la semana laboral arranca en lunes). */
function lunesDe(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  return sumaDias(ymd, -dow);
}

type Preset = "hoy" | "ayer" | "semana" | "semanaPasada" | "mes" | "mesPasado" | "rango";

function rangoDe(p: Preset): { desde: string; hasta: string } {
  const hoy = hoyMX();
  switch (p) {
    case "hoy":          return { desde: hoy, hasta: hoy };
    case "ayer":         return { desde: sumaDias(hoy, -1), hasta: sumaDias(hoy, -1) };
    case "semana":       return { desde: lunesDe(hoy), hasta: hoy };
    case "semanaPasada": {
      const lunPasado = sumaDias(lunesDe(hoy), -7);
      return { desde: lunPasado, hasta: sumaDias(lunPasado, 6) };
    }
    case "mes":          return { desde: hoy.slice(0, 8) + "01", hasta: hoy };
    case "mesPasado": {
      const primero = hoy.slice(0, 8) + "01";
      const finAnterior = sumaDias(primero, -1);
      return { desde: finAnterior.slice(0, 8) + "01", hasta: finAnterior };
    }
    default:             return { desde: hoy, hasta: hoy };
  }
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "hoy",          label: "Hoy" },
  { id: "ayer",         label: "Ayer" },
  { id: "semana",       label: "Esta semana" },
  { id: "semanaPasada", label: "Semana pasada" },
  { id: "mes",          label: "Este mes" },
  { id: "mesPasado",    label: "Mes pasado" },
  { id: "rango",        label: "Otras fechas" },
];

export default function EstadoResultados() {
  const [preset, setPreset] = useState<Preset>("semana");
  const [rango,  setRango]  = useState(() => rangoDe("semana"));
  const [base,   setBase]   = useState<BaseCorte>("tour");
  const [datos,  setDatos]  = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error,  setError]  = useState("");

  // Alta de gasto
  const [gConcepto, setGConcepto] = useState("");
  const [gMonto,    setGMonto]    = useState("");
  const [gFecha,    setGFecha]    = useState(() => hoyMX());
  const [gReserva,  setGReserva]  = useState("");   // "" = gasto general del periodo
  const [guardando, setGuardando] = useState(false);

  // Captura rápida del costo de una salida, sin salir del corte
  const [editando, setEditando] = useState<string | null>(null);
  const [costoTecleado, setCostoTecleado] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/estado-resultados?desde=${rango.desde}&hasta=${rango.hasta}&base=${base}`);
      if (!r.ok) throw new Error(r.status === 403 ? "Sin permiso" : "No se pudo calcular el corte");
      setDatos(await r.json());
    } catch (e: any) {
      setError(e.message || "No se pudo calcular el corte");
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rango.desde, rango.hasta, base]);

  function elegirPreset(p: Preset) {
    setPreset(p);
    if (p !== "rango") setRango(rangoDe(p));
  }

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

  // El costo de una salida es un renglón de costo ligado a su reserva: así se
  // puede capturar varias veces (lancha, comida, gasolina) sin pisar el anterior.
  async function guardarCosto(reservaId: string, fecha: string) {
    const monto = Math.round(Number(costoTecleado) || 0);
    if (monto <= 0) { setEditando(null); setCostoTecleado(""); return; }
    await fetch("/api/admin/gastos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: "Costo de la salida",
        monto,
        fecha: fecha || hoyMX(),
        reservaId,
      }),
    });
    setEditando(null);
    setCostoTecleado("");
    cargar();
  }

  function descargar() {
    if (!datos) return;
    const filas: (string | number)[][] = [
      ["Corte", `${datos.desde} a ${datos.hasta}`, base === "tour" ? "por fecha de tour" : "por fecha de venta"],
      [],
      ["RESULTADO"],
      ["Ventas", datos.ventas],
      ["Costos de las salidas", -datos.costoSalidas],
      ["Costo de extras", -datos.costoExtras],
      ["Comisión de pago en línea", -datos.comision],
      ["Gastos generales", -datos.gastosGenerales],
      ["Utilidad", datos.utilidad],
      ["Margen %", datos.margen],
      [],
      ["RESERVAS"],
      ["Folio", "Fecha tour", "Cliente", "Tour", "Personas", "Guía", "Venta", "Costo", "Utilidad", "Margen %"],
      ...datos.reservas.map(r => [
        r.folio, r.fechaTour, r.cliente, r.tour, r.personas, r.guia,
        r.venta, r.costoTotal, r.utilidad, r.margen,
      ]),
      [],
      ["COSTOS Y GASTOS CAPTURADOS"],
      ["Fecha", "Concepto", "Monto", "De la reserva", "Quién lo capturó"],
      ...datos.gastos.map(g => [
        g.fecha, g.concepto, g.monto,
        folioDe(g.reservaId, datos), g.creadoPor ?? "",
      ]),
    ];
    const csv = filas.map(f => f.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `corte-${datos.desde}_a_${datos.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const etiquetaPeriodo = useMemo(() => {
    if (rango.desde === rango.hasta) return fDia(rango.desde);
    return `${fDia(rango.desde)} — ${fDia(rango.hasta)}`;
  }, [rango]);

  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-cormorant text-[#1B4332] text-xl font-light">Estado de resultados</h2>
          <p className="text-[#1B4332]/50 font-dm text-xs mt-0.5">
            Corte del {etiquetaPeriodo} · {base === "tour" ? "por fecha de tour" : "por fecha de venta"}
          </p>
        </div>
        <button onClick={descargar} disabled={!datos}
          className="flex items-center gap-2 border border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/40 px-3 py-2 text-[11px] font-dm uppercase tracking-[1px] transition-colors rounded-sm disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />Descargar
        </button>
      </div>

      {/* Periodo */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => elegirPreset(p.id)}
            className={`px-3 py-1.5 text-[11px] font-dm rounded-sm border transition-colors ${
              preset === p.id
                ? "bg-[#1B4332] text-white border-[#1B4332]"
                : "border-[#1B4332]/15 text-[#1B4332]/60 hover:border-[#1B4332]/35"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {preset === "rango" && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input type="date" value={rango.desde} onChange={e => setRango(r => ({ ...r, desde: e.target.value }))}
            className="border border-[#1B4332]/15 text-[#1B4332] font-dm text-xs px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]" />
          <span className="text-[#1B4332]/40 text-xs font-dm">a</span>
          <input type="date" value={rango.hasta} onChange={e => setRango(r => ({ ...r, hasta: e.target.value }))}
            className="border border-[#1B4332]/15 text-[#1B4332] font-dm text-xs px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]" />
        </div>
      )}

      {/* Base del corte */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] tracking-[1.5px] uppercase text-[#1B4332]/40 font-dm">Contar por</span>
        {([["tour", "Fecha del tour"], ["venta", "Fecha de venta"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setBase(id)}
            className={`px-2.5 py-1 text-[11px] font-dm rounded-sm border transition-colors ${
              base === id
                ? "bg-[#1B4332]/10 text-[#1B4332] border-[#1B4332]/30"
                : "border-[#1B4332]/12 text-[#1B4332]/50 hover:border-[#1B4332]/30"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {cargando && (
        <div className="py-10 flex items-center justify-center gap-2 text-[#1B4332]/40 font-dm text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Calculando el corte...
        </div>
      )}
      {error && <p className="py-6 text-center text-[#C9484A] font-dm text-sm">{error}</p>}

      {datos && !cargando && (
        <>
          {/* ── El resultado ─────────────────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="font-dm text-sm">
              <Renglon etiqueta="Ventas" valor={datos.ventas} fuerte />
              <div className="pl-3 border-l-2 border-[#1B4332]/8 my-2">
                <Renglon etiqueta="Costos de las salidas"       valor={-datos.costoSalidas} />
                <Renglon etiqueta="Costo de extras"             valor={-datos.costoExtras} />
                <Renglon etiqueta="Comisión de pago en línea"   valor={-datos.comision} />
                <Renglon etiqueta="Gastos generales"            valor={-datos.gastosGenerales} />
              </div>
              <Renglon etiqueta="Total de costos" valor={-datos.costoTotal} />
              <div className="border-t border-[#1B4332]/15 mt-2 pt-2">
                <Renglon etiqueta="Utilidad" valor={datos.utilidad} fuerte
                  extra={`${datos.margen}% de margen`} />
              </div>
            </div>

            <div className="font-dm text-sm">
              <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 mb-2">Dinero</p>
              <Renglon etiqueta="Cobrado"     valor={datos.cobrado} />
              <Renglon etiqueta="Por cobrar"  valor={datos.porCobrar} />
              <p className="text-[#1B4332]/40 text-xs mt-2">
                {datos.reservas.length} reserva{datos.reservas.length === 1 ? "" : "s"} en el periodo
              </p>

              {datos.sinCosto.cuantas > 0 && (
                <div className="mt-3 flex gap-2 bg-orange-50 border border-orange-200 rounded-sm p-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800">
                    <strong>{datos.sinCosto.cuantas} reserva{datos.sinCosto.cuantas === 1 ? "" : "s"} sin costo capturado</strong>
                    {" "}({fmx(datos.sinCosto.venta)} de venta). La utilidad de arriba es un techo:
                    la de verdad es menor. Captúralos abajo y el corte se corrige solo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Reserva por reserva, con el costo editable ────────────────── */}
          <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mt-6 mb-2">
            Reservas del corte
          </p>
          <div className="overflow-x-auto border border-[#1B4332]/10 rounded-sm">
            <table className="w-full text-xs font-dm">
              <thead className="bg-[#FAFAF8]">
                <tr className="text-[#1B4332]/50 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                  <th className="text-left  py-2 px-3">Folio</th>
                  <th className="text-left  py-2 px-3">Fecha</th>
                  <th className="text-left  py-2 px-3">Cliente</th>
                  <th className="text-left  py-2 px-3">Guía</th>
                  <th className="text-right py-2 px-3">Venta</th>
                  <th className="text-right py-2 px-3">Costo</th>
                  <th className="text-right py-2 px-3">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {datos.reservas.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-[#1B4332]/30">Sin reservas en este periodo</td></tr>
                )}
                {datos.reservas.map(r => (
                  <tr key={r.id} className="border-b border-[#1B4332]/6 last:border-0">
                    <td className="py-2 px-3 font-mono text-[10px] text-[#1B4332]">{r.folio}</td>
                    <td className="py-2 px-3 text-[#1B4332]/60 whitespace-nowrap">
                      {fDia(base === "tour" ? r.fechaTour : r.fechaVenta)}
                    </td>
                    <td className="py-2 px-3 text-[#1B4332]/80 max-w-[160px] truncate" title={r.tour}>{r.cliente}</td>
                    <td className="py-2 px-3 text-[#1B4332]/50">{r.guia || "—"}</td>
                    <td className="py-2 px-3 text-right text-[#1B4332]">{fmx(r.venta)}</td>
                    <td className="py-2 px-3 text-right">
                      {editando === r.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input autoFocus type="number" value={costoTecleado}
                            onChange={e => setCostoTecleado(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") guardarCosto(r.id, r.fechaTour);
                              if (e.key === "Escape") { setEditando(null); setCostoTecleado(""); }
                            }}
                            className="w-24 border border-[#1B4332]/30 px-1.5 py-0.5 text-right rounded-sm focus:outline-none focus:border-[#1B4332]" />
                          <button onClick={() => guardarCosto(r.id, r.fechaTour)}
                            className="text-[#52B788] hover:text-[#1B6B45] text-[10px] uppercase tracking-[1px]">OK</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setEditando(r.id); setCostoTecleado(""); }}
                          title="Agregar lo que costó esta salida"
                          className={`hover:underline ${r.costoRegistrado ? "text-[#1B4332]/70" : "text-orange-600"}`}>
                          {r.costoRegistrado ? `${fmx(r.costoTotal)} +` : "capturar"}
                        </button>
                      )}
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${r.utilidad >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                      {r.costoRegistrado ? `${fmx(r.utilidad)} · ${r.margen}%` : <span className="text-[#1B4332]/25">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Gastos a mano ────────────────────────────────────────────── */}
          <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mt-6 mb-2">
            Costos y gastos capturados
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input type="text" value={gConcepto} onChange={e => setGConcepto(e.target.value)}
              placeholder="Gasolina, sueldo, publicidad..."
              className="flex-1 min-w-[180px] border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <input type="number" value={gMonto} onChange={e => setGMonto(e.target.value)} placeholder="$0"
              className="w-28 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <input type="date" value={gFecha} onChange={e => setGFecha(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
            <select value={gReserva} onChange={e => setGReserva(e.target.value)}
              title="Si el costo es de una salida en concreto, elígela y se resta a esa reserva"
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] max-w-[220px]">
              <option value="">Gasto general del periodo</option>
              {datos.reservas.map(r => (
                <option key={r.id} value={r.id}>{r.folio} · {r.cliente}</option>
              ))}
            </select>
            <button onClick={agregarGasto} disabled={guardando || !gConcepto.trim() || !(Number(gMonto) > 0)}
              className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-2 text-[11px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" />Agregar
            </button>
          </div>

          {datos.gastos.length === 0 ? (
            <p className="text-[#1B4332]/30 font-dm text-xs py-2">
              Sin costos capturados en este periodo.
            </p>
          ) : (
            <div className="border border-[#1B4332]/10 rounded-sm overflow-hidden">
              {datos.gastos.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1B4332]/6 last:border-0 text-xs font-dm">
                  <span className="text-[#1B4332]/45 w-14 flex-shrink-0">{fDia(g.fecha)}</span>
                  <span className="flex-1 text-[#1B4332] min-w-0 truncate">
                    {g.concepto}
                    {g.reservaId && (
                      <span className="text-[#1B4332]/40 ml-1.5">· {folioDe(g.reservaId, datos) || "otra salida"}</span>
                    )}
                  </span>
                  {g.creadoPor && <span className="text-[#1B4332]/35 hidden sm:inline">{g.creadoPor}</span>}
                  <span className="text-[#C9484A]">−{fmx(g.monto)}</span>
                  <button onClick={() => borrarGasto(g.id)} title="Borrar este gasto"
                    className="text-[#1B4332]/25 hover:text-[#C9484A] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** El folio de la reserva a la que se ligó un costo, si está en este corte. */
function folioDe(reservaId: string | null, datos: Datos): string {
  if (!reservaId) return "";
  return datos.reservas.find(r => r.id === reservaId)?.folio ?? "";
}

function Renglon({ etiqueta, valor, fuerte, extra }: {
  etiqueta: string; valor: number; fuerte?: boolean; extra?: string;
}) {
  const negativo = valor < 0;
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className={fuerte ? "text-[#1B4332] font-medium" : "text-[#1B4332]/55"}>{etiqueta}</span>
      <span className="text-right">
        <span className={`tabular-nums ${
          fuerte ? "text-[#1B4332] font-medium text-base" : negativo ? "text-[#C9484A]" : "text-[#1B4332]/70"
        }`}>
          {negativo ? `−${fmx(-valor)}` : fmx(valor)}
        </span>
        {extra && <span className="block text-[10px] text-[#1B4332]/40">{extra}</span>}
      </span>
    </div>
  );
}
