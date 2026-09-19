"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { Finanzas, ReservaFinanciera } from "@/lib/admin/finanzas";
import { CATEGORIAS_DIRECTAS } from "@/lib/admin/categorias";
import { fmx, fDiaCorto, Etiqueta, TONO_PAGO, descargarCSV, BotonExportar } from "./ui";

/**
 * Cada reserva es una unidad financiera: se abre y se ve EXACTAMENTE de dónde
 * sale su utilidad, peso por peso.
 */
export default function VistaReservas({ datos, recargar }: { datos: Finanzas; recargar: () => void }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [orden,   setOrden]   = useState<"fecha" | "utilidad" | "margen" | "saldo">("fecha");

  const filas = [...datos.reservas].sort((a, b) => {
    if (orden === "utilidad") return b.utilidad - a.utilidad;
    if (orden === "margen")   return a.margen - b.margen;      // lo peor arriba
    if (orden === "saldo")    return b.saldo - a.saldo;
    return a.fechaTour < b.fechaTour ? -1 : 1;
  });

  function exportar() {
    descargarCSV(`reservas-${datos.desde}_a_${datos.hasta}`, [
      ["Folio","Fecha reserva","Fecha tour","Cliente","Tour","Pasajeros","Precio x persona",
       "Venta","Cobrado","Saldo","Estado","Costo directo","Estimado","Comisión","Utilidad","Margen %","Guía"],
      ...filas.map(r => [
        r.folio, r.fechaReserva, r.fechaTour, r.cliente, r.tour, r.pasajeros, r.precioPorPersona,
        r.venta, r.cobrado, r.saldo, r.estadoPago, r.costoDirecto, r.costoEstimado ? "sí" : "no",
        r.comision, r.utilidad, r.margen, r.guia,
      ]),
    ]);
  }

  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Reservas del periodo</h3>
          <p className="text-[10px] font-dm text-[#1B4332]/35">
            Abre una para ver cómo se calculó su utilidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={orden} onChange={e => setOrden(e.target.value as any)}
            className="border border-[#1B4332]/15 text-[#1B4332]/70 text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]">
            <option value="fecha">Por fecha</option>
            <option value="margen">Peor margen primero</option>
            <option value="utilidad">Más utilidad primero</option>
            <option value="saldo">Mayor saldo primero</option>
          </select>
          <BotonExportar onClick={exportar} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-dm text-xs">
          <thead>
            <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
              <th className="w-6"></th>
              <th className="text-left  py-2 pr-2">Folio</th>
              <th className="text-left  py-2 px-2">Tour</th>
              <th className="text-left  py-2 px-2">Cliente</th>
              <th className="text-center py-2 px-2">Pax</th>
              <th className="text-right py-2 px-2">Venta</th>
              <th className="text-right py-2 px-2">Cobrado</th>
              <th className="text-right py-2 px-2">Saldo</th>
              <th className="text-right py-2 px-2">Costo</th>
              <th className="text-right py-2 pl-2">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={10} className="py-8 text-center text-[#1B4332]/30">Sin reservas en este periodo</td></tr>
            )}
            {filas.map(r => (
              <FilaReserva key={r.id} r={r} abierta={abierta === r.id}
                onToggle={() => setAbierta(abierta === r.id ? null : r.id)} recargar={recargar} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilaReserva({ r, abierta, onToggle, recargar }: {
  r: ReservaFinanciera; abierta: boolean; onToggle: () => void; recargar: () => void;
}) {
  const [concepto,  setConcepto]  = useState("");
  const [monto,     setMonto]     = useState("");
  const [categoria, setCategoria] = useState("guia");
  const [proveedor, setProveedor] = useState("");
  const [pagado,    setPagado]    = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState("");

  async function agregarCosto() {
    if (!concepto.trim() || !(Number(monto) > 0)) return;
    setGuardando(true); setError("");
    const res = await fetch("/api/admin/movimientos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "costo", categoria, concepto: concepto.trim(), monto: Number(monto),
        fecha: r.fechaTour || r.fechaReserva, reservaId: r.id,
        proveedor: proveedor.trim() || undefined, pagado,
      }),
    });
    setGuardando(false);
    if (res.ok) { setConcepto(""); setMonto(""); setProveedor(""); recargar(); }
    else setError((await res.json()).error ?? "No se pudo guardar");
  }

  return (
    <>
      <tr onClick={onToggle} className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8] cursor-pointer">
        <td className="py-2 text-[#1B4332]/25">
          {abierta ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </td>
        <td className="py-2 pr-2 font-mono text-[10px] text-[#1B4332]">{r.folio}</td>
        <td className="py-2 px-2 text-[#1B4332]/65 max-w-[150px] truncate" title={r.tour}>{r.tour}</td>
        <td className="py-2 px-2 text-[#1B4332]/80 max-w-[130px] truncate">{r.cliente}</td>
        <td className="py-2 px-2 text-center text-[#1B4332]/55">{r.pasajeros}</td>
        <td className="py-2 px-2 text-right text-[#1B4332]">{fmx(r.venta)}</td>
        <td className="py-2 px-2 text-right text-[#52B788]">{fmx(r.cobrado)}</td>
        <td className="py-2 px-2 text-right">
          {r.saldo > 0
            ? <span className="inline-flex items-center gap-1">
                {fmx(r.saldo)}<Etiqueta texto={r.estadoPago} tono={TONO_PAGO[r.estadoPago] ?? "gris"} />
              </span>
            : <Etiqueta texto="pagado" tono="verde" />}
        </td>
        <td className="py-2 px-2 text-right text-[#1B4332]/70">
          {fmx(r.costoDirecto)}
          {r.costoEstimado && <span className="ml-1 text-[#1a4e8a]/70 text-[9px]">est.</span>}
        </td>
        <td className={`py-2 pl-2 text-right font-medium ${r.margenBajo ? "text-[#C9484A]" : "text-[#52B788]"}`}>
          {fmx(r.utilidad)} · {r.margen}%
        </td>
      </tr>

      {abierta && (
        <tr className="bg-[#FAFAF8]">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Cómo se calculó */}
              <div>
                <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40 mb-2">Cómo sale esta utilidad</p>
                <table className="w-full text-xs">
                  <tbody>
                    <tr><td className="py-1 text-[#1B4332]/55">Venta ({r.pasajeros} pax × {fmx(r.precioPorPersona)})</td>
                        <td className="py-1 text-right text-[#1B4332]">{fmx(r.venta)}</td></tr>

                    {r.costoRegistrado > 0 ? (
                      r.movimientos.map(m => (
                        <tr key={m.id}>
                          <td className="py-1 pl-3 text-[#1B4332]/55">
                            {m.concepto}{m.proveedor ? ` · ${m.proveedor}` : ""}
                            {!m.pagado && <span className="ml-1 text-orange-600 text-[9px]">por pagar</span>}
                          </td>
                          <td className="py-1 text-right text-[#C9484A]">−{fmx(m.monto)}</td>
                        </tr>
                      ))
                    ) : r.desgloseCatalogo.length > 0 ? (
                      <>
                        {r.desgloseCatalogo.map((l, i) => (
                          <tr key={i}>
                            <td className="py-1 pl-3 text-[#1B4332]/45">
                              {l.concepto} <span className="text-[#1a4e8a]/60">({l.tipo === "persona" ? `${fmx(l.monto)} × ${r.pasajeros}` : "por salida"})</span>
                            </td>
                            <td className="py-1 text-right text-[#C9484A]/70">−{fmx(l.total)}</td>
                          </tr>
                        ))}
                        <tr><td colSpan={2} className="pt-1 pb-2 text-[10px] text-[#1a4e8a]/70">
                          Estos costos salen del Cotizador porque nadie ha capturado los reales.
                          {!r.catalogoCompleto && " Ojo: falta capturar en el Cotizador el costo de algún tour de esta reserva."}
                        </td></tr>
                      </>
                    ) : (
                      <tr><td colSpan={2} className="py-2 text-orange-700 text-[11px]">
                        Sin costos capturados y sin costos de este tour en el Cotizador: el margen de arriba está inflado.
                      </td></tr>
                    )}

                    {r.comision > 0 && (
                      <tr><td className="py-1 pl-3 text-[#1B4332]/55">Comisión de pago en línea</td>
                          <td className="py-1 text-right text-[#C9484A]">−{fmx(r.comision)}</td></tr>
                    )}
                    <tr className="border-t border-[#1B4332]/15">
                      <td className="py-1.5 text-[#1B4332] font-medium">Utilidad</td>
                      <td className={`py-1.5 text-right font-medium ${r.margenBajo ? "text-[#C9484A]" : "text-[#52B788]"}`}>
                        {fmx(r.utilidad)} · {r.margen}%
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#1B4332]/55">
                  <p>Reservada el {fDiaCorto(r.fechaReserva)}</p>
                  <p>Tour el {fDiaCorto(r.fechaTour)}</p>
                  <p>Guía: {r.guia || "sin asignar"}</p>
                  <p>Idioma: {r.idiomaTour === "en" ? "inglés" : "español"}</p>
                  {r.email && <p className="col-span-2 truncate">{r.email}</p>}
                </div>
              </div>

              {/* Capturar el costo real */}
              <div>
                <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40 mb-2">Agregar un costo de esta salida</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select value={categoria} onChange={e => setCategoria(e.target.value)}
                      className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]">
                      {CATEGORIAS_DIRECTAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto"
                      className="flex-1 min-w-0 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
                  </div>
                  <div className="flex gap-2">
                    <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="A quién se le paga"
                      className="flex-1 min-w-0 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
                    <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="$0"
                      className="w-24 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
                  </div>
                  <label className="flex items-center gap-2 text-[11px] font-dm text-[#1B4332]/60">
                    <input type="checkbox" checked={pagado} onChange={e => setPagado(e.target.checked)} />
                    Ya se pagó {!pagado && <span className="text-orange-600">— quedará en cuentas por pagar</span>}
                  </label>
                  {error && <p className="text-[#C9484A] text-[11px]">{error}</p>}
                  <button onClick={agregarCosto} disabled={guardando || !concepto.trim() || !(Number(monto) > 0)}
                    className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-1.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
                    <Plus className="w-3 h-3" />Agregar costo
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
