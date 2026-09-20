"use client";

import { useState } from "react";
import { Plus, Ban } from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { CATEGORIAS_GENERALES, METODOS_PAGO, PERIODICIDADES } from "@/lib/admin/categorias";
import { fmx, fDiaCorto, Etiqueta, descargarCSV, BotonExportar } from "./ui";
import type { Permisos } from "./FinanzasClient";
import { hoyMX } from "./useFinanzas";

/**
 * Los gastos de la empresa. Nunca se cuelgan de una reserva: el hosting no lo
 * paga el cliente que reservó ese día.
 */
export default function VistaMovimientos({ datos, recargar, permisos }: {
  datos: Finanzas; recargar: () => void; permisos: Permisos;
}) {
  const [concepto,   setConcepto]   = useState("");
  const [monto,      setMonto]      = useState("");
  const [categoria,  setCategoria]  = useState("marketing");
  const [fecha,      setFecha]      = useState(() => hoyMX());
  const [proveedor,  setProveedor]  = useState("");
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [pagado,     setPagado]     = useState(true);
  const [recurrente, setRecurrente] = useState(false);
  const [periodicidad, setPeriodicidad] = useState("mensual");
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState("");

  async function agregar() {
    if (!concepto.trim() || !(Number(monto) > 0)) return;
    setGuardando(true); setError("");
    const r = await fetch("/api/admin/movimientos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "gasto", categoria, concepto: concepto.trim(), monto: Number(monto), fecha,
        proveedor: proveedor.trim() || undefined, metodoPago, pagado,
        recurrente, periodicidad: recurrente ? periodicidad : undefined,
      }),
    });
    setGuardando(false);
    if (r.ok) { setConcepto(""); setMonto(""); setProveedor(""); recargar(); }
    else setError((await r.json()).error ?? "No se pudo guardar");
  }

  async function anular(id: string) {
    const motivo = window.prompt("¿Por qué se anula este movimiento? (queda registrado)");
    if (!motivo) return;
    await fetch("/api/admin/movimientos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion: "anular", motivo }),
    });
    recargar();
  }

  const costosDeSalidas = datos.reservas.flatMap(r =>
    r.movimientos.map(m => ({ ...m, folio: r.folio, cliente: r.cliente })),
  );

  return (
    <div className="space-y-5">
      {/* Alta de gasto general */}
      <div className="panel-card p-5">
        <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Gastos de la empresa</h3>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          Lo que cuesta tener el negocio abierto. No pertenece a ninguna reserva y por eso
          baja la utilidad operativa, no la de un cliente.
        </p>

        {permisos.gastoGeneral ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]">
              {CATEGORIAS_GENERALES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción"
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Proveedor"
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <div className="flex gap-2">
              <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="$0"
                className="w-24 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="flex-1 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
            </div>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]">
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="flex items-center gap-2 text-[11px] font-dm text-[#1B4332]/60 px-1">
              <input type="checkbox" checked={pagado} onChange={e => setPagado(e.target.checked)} />
              Ya se pagó
            </label>
            <label className="flex items-center gap-2 text-[11px] font-dm text-[#1B4332]/60 px-1">
              <input type="checkbox" checked={recurrente} onChange={e => setRecurrente(e.target.checked)} />
              Se repite
              {recurrente && (
                <select value={periodicidad} onChange={e => setPeriodicidad(e.target.value)}
                  className="border border-[#1B4332]/15 text-[10px] px-1 py-0.5 rounded-sm">
                  {PERIODICIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </label>
            <button onClick={agregar} disabled={guardando || !concepto.trim() || !(Number(monto) > 0)}
              className="flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-2 text-[10px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
              <Plus className="w-3 h-3" />Agregar gasto
            </button>
          </div>
        ) : (
          <p className="text-[#1B4332]/35 font-dm text-xs mb-3">
            Tu cuenta puede ver estos gastos, pero no registrarlos.
          </p>
        )}
        {error && <p className="text-[#C9484A] font-dm text-xs mb-2">{error}</p>}

        <Tabla
          filas={datos.gastos.map(g => ({
            id: g.id, fecha: g.fecha, concepto: g.concepto,
            extra: [g.proveedor, g.creadoPor].filter(Boolean).join(" · "),
            monto: g.monto, pagado: g.pagado, recurrente: g.recurrente,
          }))}
          vacio="Sin gastos generales capturados en este periodo"
          onAnular={permisos.anular ? anular : undefined}
        />
        <div className="mt-2 text-right font-dm text-xs text-[#1B4332]/60">
          Total: <strong className="text-[#C9484A]">{fmx(datos.er.gastosGeneralesTotal)}</strong>
        </div>
      </div>

      {/* Costos de salidas */}
      <div className="panel-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Costos de las salidas</h3>
          <BotonExportar onClick={() => descargarCSV(`costos-${datos.desde}`, [
            ["Fecha","Folio","Cliente","Concepto","Proveedor","Monto","Pagado"],
            ...costosDeSalidas.map(m => [m.fecha, m.folio, m.cliente, m.concepto, m.proveedor ?? "", m.monto, m.pagado ? "sí" : "no"]),
          ])} />
        </div>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          Se capturan desde cada reserva, en la pestaña Reservas
        </p>
        <Tabla
          filas={costosDeSalidas.map(m => ({
            id: m.id, fecha: m.fecha, concepto: m.concepto,
            extra: [m.folio, m.proveedor].filter(Boolean).join(" · "),
            monto: m.monto, pagado: m.pagado, recurrente: false,
          }))}
          vacio="Todavía no se captura ningún costo de salida en este periodo"
          onAnular={permisos.anular ? anular : undefined}
        />
        <div className="mt-2 text-right font-dm text-xs text-[#1B4332]/60">
          Total: <strong className="text-[#C9484A]">{fmx(datos.er.costosDirectosTotal)}</strong>
          {datos.captura.estimadas > 0 && (
            <span className="text-[#1a4e8a]/70 ml-2">
              (incluye {datos.captura.estimadas} reserva{datos.captura.estimadas === 1 ? "" : "s"} calculada{datos.captura.estimadas === 1 ? "" : "s"} con el Cotizador)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Tabla({ filas, vacio, onAnular }: {
  filas: { id: string; fecha: string; concepto: string; extra: string; monto: number; pagado: boolean; recurrente: boolean }[];
  vacio: string;
  onAnular?: (id: string) => void;
}) {
  if (filas.length === 0) return <p className="text-[#1B4332]/30 font-dm text-xs py-2">{vacio}</p>;
  return (
    <div className="border border-[#1B4332]/10 rounded-sm overflow-hidden">
      {filas.map(f => (
        <div key={f.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1B4332]/6 last:border-0 text-xs font-dm">
          <span className="text-[#1B4332]/45 w-12 shrink-0">{fDiaCorto(f.fecha)}</span>
          <span className="flex-1 min-w-0">
            <span className="text-[#1B4332]">{f.concepto}</span>
            {f.extra && <span className="text-[#1B4332]/35 ml-1.5">· {f.extra}</span>}
          </span>
          {f.recurrente && <Etiqueta texto="se repite" tono="azul" />}
          {!f.pagado && <Etiqueta texto="por pagar" tono="naranja" />}
          <span className="text-[#C9484A] tabular-nums">−{fmx(f.monto)}</span>
          {onAnular && (
            <button onClick={() => onAnular(f.id)} title="Anular (queda registrado)"
              className="text-[#1B4332]/25 hover:text-[#C9484A] transition-colors">
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
