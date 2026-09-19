"use client";

import { useState } from "react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { fmx, descargarCSV, BotonExportar } from "./ui";

/** Comparar todos los tours: cuál llena, cuál deja y cuál solo da trabajo. */
export default function VistaTours({ datos }: { datos: Finanzas }) {
  const [orden, setOrden] = useState<"ventas" | "utilidad" | "margen" | "pasajeros">("ventas");

  const filas = [...datos.porTour].sort((a, b) => {
    if (orden === "utilidad")  return b.utilidad - a.utilidad;
    if (orden === "margen")    return b.margen - a.margen;
    if (orden === "pasajeros") return b.pasajeros - a.pasajeros;
    return b.ventas - a.ventas;
  });

  const total = filas.reduce((s, t) => ({
    reservas: s.reservas + t.reservas, pasajeros: s.pasajeros + t.pasajeros,
    ventas: s.ventas + t.ventas, costo: s.costo + t.costoTotal, utilidad: s.utilidad + t.utilidad,
  }), { reservas: 0, pasajeros: 0, ventas: 0, costo: 0, utilidad: 0 });

  return (
    <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Rentabilidad por tour</h3>
          <p className="text-[10px] font-dm text-[#1B4332]/35">
            En reservas con varios tours, el costo se reparte según lo que aporta cada uno
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={orden} onChange={e => setOrden(e.target.value as any)}
            className="border border-[#1B4332]/15 text-[#1B4332]/70 text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]">
            <option value="ventas">Más ventas</option>
            <option value="utilidad">Más utilidad</option>
            <option value="margen">Mejor margen</option>
            <option value="pasajeros">Más pasajeros</option>
          </select>
          <BotonExportar onClick={() => descargarCSV(`rentabilidad-tours-${datos.desde}`, [
            ["Tour","Reservas","Pasajeros","Ventas","Costo total","Costo x pasajero","Utilidad","Margen %","Ticket promedio"],
            ...filas.map(t => [t.nombre, t.reservas, t.pasajeros, t.ventas, t.costoTotal, t.costoPorPasajero, t.utilidad, t.margen, t.ticketPromedio]),
          ])} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full font-dm text-xs">
          <thead>
            <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
              <th className="text-left  py-2 pr-3">Tour</th>
              <th className="text-center py-2 px-2">Reservas</th>
              <th className="text-center py-2 px-2">Pax</th>
              <th className="text-right py-2 px-2">Ventas</th>
              <th className="text-right py-2 px-2">Ticket</th>
              <th className="text-right py-2 px-2">Costo</th>
              <th className="text-right py-2 px-2">Costo/pax</th>
              <th className="text-right py-2 pl-2">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-[#1B4332]/30">Sin ventas en este periodo</td></tr>
            )}
            {filas.map(t => (
              <tr key={t.slug} className="border-b border-[#1B4332]/6">
                <td className="py-2 pr-3 text-[#1B4332] max-w-[230px] truncate" title={t.nombre}>{t.nombre}</td>
                <td className="py-2 px-2 text-center text-[#1B4332]/55">{t.reservas}</td>
                <td className="py-2 px-2 text-center text-[#1B4332]/55">{t.pasajeros}</td>
                <td className="py-2 px-2 text-right text-[#1B4332]">{fmx(t.ventas)}</td>
                <td className="py-2 px-2 text-right text-[#1B4332]/55">{fmx(t.ticketPromedio)}</td>
                <td className="py-2 px-2 text-right text-[#C9484A]/80">{fmx(t.costoTotal)}</td>
                <td className="py-2 px-2 text-right text-[#1B4332]/45">{fmx(t.costoPorPasajero)}</td>
                <td className={`py-2 pl-2 text-right font-medium ${t.margen >= 25 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                  {fmx(t.utilidad)} · {t.margen}%
                </td>
              </tr>
            ))}
            {filas.length > 0 && (
              <tr className="border-t-2 border-[#1B4332]/15 font-medium">
                <td className="py-2 pr-3 text-[#1B4332]">Total</td>
                <td className="py-2 px-2 text-center text-[#1B4332]/70">{total.reservas}</td>
                <td className="py-2 px-2 text-center text-[#1B4332]/70">{total.pasajeros}</td>
                <td className="py-2 px-2 text-right text-[#1B4332]">{fmx(total.ventas)}</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right text-[#C9484A]/80">{fmx(total.costo)}</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 pl-2 text-right text-[#52B788]">
                  {fmx(total.utilidad)} · {total.ventas > 0 ? Math.round((total.utilidad / total.ventas) * 100) : 0}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
