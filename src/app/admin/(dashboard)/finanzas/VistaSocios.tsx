"use client";

import { useEffect, useState } from "react";
import { Plus, Info } from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { fmx } from "./ui";
import type { Permisos } from "./FinanzasClient";
import { hoyMX } from "./useFinanzas";

interface Socio {
  id: string; nombre: string; porcentaje: number;
  fechaInicio: string; estado: string; nota: string | null;
}

/**
 * El reparto se calcula SOBRE la utilidad ya calculada, nunca sobre la venta, y
 * jamás se mezcla con lo que un socio cobra por trabajar, por rentar su
 * camioneta o por un gasto que pagó de su bolsa: eso ya bajó como costo.
 */
export default function VistaSocios({ datos, recargar, permisos }: {
  datos: Finanzas; recargar: () => void; permisos: Permisos;
}) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => hoyMX());
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const r = await fetch("/api/admin/socios");
    if (r.ok) setSocios(await r.json());
  }
  useEffect(() => { if (permisos.socios) cargar(); }, [permisos.socios]);

  async function agregar() {
    if (!nombre.trim()) return;
    setGuardando(true); setError("");
    const r = await fetch("/api/admin/socios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), porcentaje: Number(porcentaje) || 0, fechaInicio }),
    });
    setGuardando(false);
    if (r.ok) { setNombre(""); setPorcentaje(""); cargar(); recargar(); }
    else setError((await r.json()).error ?? "No se pudo guardar");
  }

  const sumaPct = socios.filter(s => s.estado === "activo").reduce((s, x) => s + x.porcentaje, 0);

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Reparto de la utilidad</h3>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-4">
          Sobre la utilidad operativa del periodo: {fmx(datos.er.utilidadOperativa)}
        </p>

        {datos.socios.length === 0 ? (
          <p className="text-[#1B4332]/35 font-dm text-xs">
            No hay socios configurados todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dm text-xs panel-tabla">
              <thead>
                <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                  <th className="text-left  py-2 pr-2">Socio</th>
                  <th className="text-center py-2 px-2">Participación</th>
                  <th className="text-right py-2 px-2">Le corresponde</th>
                  <th className="text-right py-2 px-2">Ya entregado</th>
                  <th className="text-right py-2 px-2">Pendiente</th>
                  <th className="text-right py-2 pl-2">Reembolsos</th>
                </tr>
              </thead>
              <tbody>
                {datos.socios.map(s => (
                  <tr key={s.id} className="border-b border-[#1B4332]/6">
                    <td className="py-2 pr-2 text-[#1B4332]">{s.nombre}</td>
                    <td className="py-2 px-2 text-center text-[#1B4332]/60">{s.porcentaje}%</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#1B4332]">{fmx(s.utilidadCorrespondiente)}</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#52B788]">{fmx(s.distribuido)}</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#1B4332] font-medium">{fmx(s.pendiente)}</td>
                    <td className="panel-cifra py-2 pl-2 text-right text-[#1B4332]/45">{fmx(s.reembolsos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 bg-[#1a4e8a]/6 border border-[#1a4e8a]/20 rounded-sm p-3">
          <Info className="w-4 h-4 text-[#1a4e8a] shrink-0 mt-0.5" />
          <p className="font-dm text-[11px] text-[#1B4332]/75 leading-relaxed">
            <strong>Lo que un socio cobra no es lo mismo que su utilidad.</strong> Si un socio guía un tour,
            eso es un costo de la salida. Si la empresa le paga $500 por usar su camioneta, es renta de
            vehículo, un costo. Si pagó de su bolsa una suscripción, es gasto de la empresa y un reembolso
            para él. Nada de eso es reparto: el reparto es lo de esta tabla, y sale de lo que queda
            <em> después</em> de todos esos costos.
          </p>
        </div>
      </div>

      {permisos.socios && (
        <div className="panel-card p-5">
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Socios configurados</h3>
          <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
            Suma actual de participaciones: {sumaPct}% {sumaPct > 100 && <span className="text-[#C9484A]">— pasa del 100%</span>}
          </p>

          {socios.length > 0 && (
            <div className="border border-[#1B4332]/10 rounded-sm overflow-hidden mb-3">
              {socios.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1B4332]/6 last:border-0 text-xs font-dm">
                  <span className="flex-1 text-[#1B4332]">{s.nombre}</span>
                  <span className="text-[#1B4332]/45">desde {s.fechaInicio}</span>
                  <span className="text-[#1B4332] font-medium">{s.porcentaje}%</span>
                  <span className={s.estado === "activo" ? "text-[#52B788]" : "text-[#1B4332]/30"}>{s.estado}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del socio"
              className="flex-1 min-w-[160px] border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <input type="number" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} placeholder="% de participación"
              className="w-32 border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30" />
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="border border-[#1B4332]/15 text-[#1B4332] text-xs font-dm px-2 py-2 rounded-sm focus:outline-none focus:border-[#1B4332]" />
            <button onClick={agregar} disabled={guardando || !nombre.trim()}
              className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-2 text-[10px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
              <Plus className="w-3 h-3" />Agregar socio
            </button>
          </div>
          {error && <p className="text-[#C9484A] font-dm text-xs mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
