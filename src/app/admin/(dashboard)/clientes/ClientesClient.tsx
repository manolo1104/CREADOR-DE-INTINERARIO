"use client";

import { useState, useMemo } from "react";
import { Search, MessageCircle, ChevronRight, X } from "lucide-react";

import type { Cliente } from "@/lib/admin/clientes";

const fmx  = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}) : "—";

export default function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Cliente|null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter(c => !q || [c.nombre, c.email, c.telefono, ...c.tours].some(v => v?.toLowerCase().includes(q)));
  }, [clientes, search]);

  const waUrl = (c: Cliente) =>
    `https://wa.me/${c.telefono.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribimos de Tours Huasteca Potosina 🌿`)}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Clientes · CRM</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">
            {clientes.length} clientes únicos · ordenados por lo que han comprado
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30 rounded-sm"
        />
      </div>

      <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/50 text-[10px] tracking-[1.5px] uppercase">
                <th className="text-left py-3 px-4 font-dm">Cliente</th>
                <th className="text-center py-3 px-4 font-dm">Reservas</th>
                <th className="text-right py-3 px-4 font-dm">Vendido</th>
                <th className="text-right py-3 px-4 font-dm">Cobrado</th>
                <th className="text-right py-3 px-4 font-dm">Por cobrar</th>
                <th className="text-left py-3 px-4 font-dm">Último tour</th>
                <th className="text-center py-3 px-4 font-dm"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={7} className="py-12 text-center text-[#1B4332]/30 font-dm">Sin clientes</td></tr>}
              {filtered.map(c => (
                <tr key={c.clave} onClick={() => setSelected(c)}
                  className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/50 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-[#1B4332] font-medium">{c.nombre}</p>
                    <p className="text-[#1B4332]/40 text-xs">{c.email || c.telefono || "Sin correo ni teléfono"}</p>
                  </td>
                  <td className="py-3 px-4 text-center text-[#1B4332]/70">{c.totalReservas}</td>
                  <td className="py-3 px-4 text-right text-[#1B4332] font-medium">{fmx(c.totalVendido)}</td>
                  <td className="py-3 px-4 text-right text-[#52B788]">{fmx(c.totalGastado)}</td>
                  <td className="py-3 px-4 text-right text-xs">
                    {c.saldo > 0
                      ? <span className="text-orange-600 font-medium">{fmx(c.saldo)}</span>
                      : <span className="text-[#1B4332]/25">—</span>}
                  </td>
                  <td className="py-3 px-4 text-[#1B4332]/50 text-xs">{fDate(c.ultimaFecha)}</td>
                  <td className="py-3 px-4 text-center"><ChevronRight className="w-4 h-4 text-[#1B4332]/25 mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <aside className="relative w-full max-w-sm bg-white border-l border-[#1B4332]/10 flex flex-col overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-[#1B4332]/10">
              <div>
                <p className="font-cormorant text-[#1B4332] text-xl font-light">{selected.nombre}</p>
                <p className="text-[#1B4332]/40 font-dm text-xs">{selected.email || selected.telefono || "Sin datos de contacto"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#1B4332]/40 hover:text-[#1B4332] mt-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"Reservas",value:String(selected.totalReservas)},
                  {label:"Cobrado",value:fmx(selected.totalGastado)},
                  {label:"Vendido",value:fmx(selected.totalVendido)},
                  {label:"Por cobrar",value:selected.saldo>0?fmx(selected.saldo):"—"},
                  {label:"Último tour",value:fDate(selected.ultimaFecha)},
                  {label:"Teléfono",value:selected.telefono||"—"},
                ].map(({label,value}) => (
                  <div key={label} className="border border-[#1B4332]/10 bg-[#FAFAF8]/50 p-3 rounded-sm">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-1">{label}</p>
                    <p className="text-[#1B4332]/80 font-dm text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">Tours realizados</p>
                <ul className="space-y-1">
                  {selected.tours.map(t => (
                    <li key={t} className="text-[#1B4332]/65 font-dm text-xs flex items-center gap-2">
                      <span className="text-[#1B4332]">✓</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {selected.telefono && (
              <div className="p-5 border-t border-[#1B4332]/10">
                <a href={waUrl(selected)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors rounded-sm">
                  <MessageCircle className="w-4 h-4" />Contactar por WhatsApp
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
