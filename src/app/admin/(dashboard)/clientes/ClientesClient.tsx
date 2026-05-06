"use client";

import { useState, useMemo } from "react";
import { Search, MessageCircle, ChevronRight, X } from "lucide-react";

interface Cliente {
  email: string; nombre: string; telefono: string;
  totalReservas: number; totalGastado: number;
  ultimaFecha: string; tours: string[];
}

function formatMXN(n: number) { return `$${n.toLocaleString("es-MX")}`; }
function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter(c =>
      !q || [c.nombre, c.email, c.telefono].some(v => v?.toLowerCase().includes(q))
    );
  }, [clientes, search]);

  const waUrl = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(selected?.nombre || "")}%2C%20te%20escribimos%20de%20Tours%20Huasteca%20Potosina.`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cormorant text-crema text-2xl">Clientes · CRM</h1>
          <p className="text-crema/50 font-dm text-sm mt-1">{clientes.length} clientes únicos</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crema/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full bg-negro/50 border border-white/10 text-crema font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-verde-vivo placeholder:text-crema/25"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-white/10 text-crema/40 text-[10px] tracking-[1.5px] uppercase">
              <th className="text-left py-3 pr-4">Cliente</th>
              <th className="text-center py-3 pr-4">Reservas</th>
              <th className="text-right py-3 pr-4">Total gastado</th>
              <th className="text-left py-3 pr-4">Último tour</th>
              <th className="text-center py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.email}
                onClick={() => setSelected(c)}
                className="border-b border-white/6 hover:bg-white/3 cursor-pointer transition-colors">
                <td className="py-3 pr-4">
                  <p className="text-crema font-medium">{c.nombre}</p>
                  <p className="text-crema/40 text-xs">{c.email}</p>
                </td>
                <td className="py-3 pr-4 text-center text-crema/70">{c.totalReservas}</td>
                <td className="py-3 pr-4 text-right text-dorado font-medium">{formatMXN(c.totalGastado)}</td>
                <td className="py-3 pr-4 text-crema/50 text-xs">{formatDate(c.ultimaFecha)}</td>
                <td className="py-3 text-center">
                  <ChevronRight className="w-4 h-4 text-crema/30 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-negro/60" onClick={() => setSelected(null)} />
          <aside className="relative w-full max-w-sm bg-negro border-l border-white/10 flex flex-col overflow-y-auto">
            <div className="flex items-start justify-between p-5 border-b border-white/10">
              <div>
                <p className="font-cormorant text-crema text-xl">{selected.nombre}</p>
                <p className="text-crema/40 font-dm text-xs">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-crema/40 hover:text-crema mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Reservas", value: String(selected.totalReservas) },
                  { label: "Total gastado", value: formatMXN(selected.totalGastado) },
                  { label: "Último tour", value: formatDate(selected.ultimaFecha) },
                  { label: "Teléfono", value: selected.telefono || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-white/10 p-3">
                    <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{label}</p>
                    <p className="text-crema/80 font-dm text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Tours */}
              <div>
                <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2">Tours realizados</p>
                <ul className="space-y-1">
                  {selected.tours.map(t => (
                    <li key={t} className="text-crema/65 font-dm text-xs flex items-center gap-2">
                      <span className="text-verde-vivo">✓</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* WhatsApp */}
            {selected.telefono && (
              <div className="p-5 border-t border-white/10">
                <a
                  href={waUrl(selected.telefono)}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar por WhatsApp
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
