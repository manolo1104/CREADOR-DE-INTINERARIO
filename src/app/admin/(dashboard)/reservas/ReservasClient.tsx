"use client";

import { useState, useMemo } from "react";
import type { TourBooking } from "@prisma/client";
import { Search, RefreshCw, Mail, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-verde-selva/20 text-verde-vivo",
  pending:   "bg-dorado/20 text-dorado",
  cancelled: "bg-terracota/20 text-terracota",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Pagada", pending: "Pendiente", cancelled: "Cancelada",
};

function formatMXN(n: number) { return `$${n.toLocaleString("es-MX")}`; }
function formatDate(d: string) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function ReservasClient({ initialBookings }: { initialBookings: TourBooking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState<string | null>(null);
  const [msg,      setMsg]      = useState("");

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/admin/reservas");
    if (res.ok) setBookings(await res.json());
    setLoading(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const res = await fetch(`/api/admin/reservas/${id}/send-email`, { method: "POST" });
    setMsg(res.ok ? "✅ Email enviado" : "❌ Error al enviar");
    setSending(null);
    setTimeout(() => setMsg(""), 3000);
  }

  async function cancelBooking(id: string) {
    if (!confirm("¿Cancelar esta reserva?")) return;
    await fetch(`/api/admin/reservas/${id}`, { method: "DELETE" });
    setBookings(b => b.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b =>
      !q || [b.customerName, b.customerEmail, b.confirmationNumber, b.tourName]
        .some(v => v?.toLowerCase().includes(q))
    );
  }, [bookings, search]);

  const totalIngresos = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-crema text-2xl">Reservas de Tours</h1>
          <p className="text-crema/50 font-dm text-sm mt-1">
            {bookings.filter(b => b.status !== "cancelled").length} activas ·{" "}
            <span className="text-verde-vivo">{formatMXN(totalIngresos)} MXN totales</span>
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 border border-white/20 text-crema/60 hover:text-crema px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {msg && <div className="mb-4 text-sm font-dm text-verde-vivo bg-verde-selva/10 border border-verde-selva/20 px-4 py-2">{msg}</div>}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crema/30" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o confirmación..."
          className="w-full bg-negro/50 border border-white/10 text-crema font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-verde-vivo transition-colors placeholder:text-crema/25"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-white/10 text-crema/40 text-[10px] tracking-[1.5px] uppercase">
              <th className="text-left py-3 pr-4">Confirmación</th>
              <th className="text-left py-3 pr-4">Cliente</th>
              <th className="text-left py-3 pr-4">Tour</th>
              <th className="text-left py-3 pr-4">Fecha Tour</th>
              <th className="text-left py-3 pr-4">Personas</th>
              <th className="text-right py-3 pr-4">Total</th>
              <th className="text-left py-3 pr-4">Estado</th>
              <th className="text-center py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-crema/30 font-dm">Sin resultados</td></tr>
            )}
            {filtered.map(b => (
              <tr key={b.id} className="border-b border-white/6 hover:bg-white/3 transition-colors">
                <td className="py-3 pr-4 text-verde-vivo font-mono text-xs">{b.confirmationNumber}</td>
                <td className="py-3 pr-4">
                  <p className="text-crema font-medium">{b.customerName}</p>
                  <p className="text-crema/40 text-xs">{b.customerEmail}</p>
                </td>
                <td className="py-3 pr-4 text-crema/70 max-w-[160px] truncate">{b.tourName}</td>
                <td className="py-3 pr-4 text-crema/70">{formatDate(b.tourDate)}</td>
                <td className="py-3 pr-4 text-crema/70">{b.adults}A {b.children > 0 ? `· ${b.children}N` : ""}</td>
                <td className="py-3 pr-4 text-right text-dorado font-medium">{formatMXN(b.totalAmount)}</td>
                <td className="py-3 pr-4">
                  <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 font-dm ${STATUS_STYLE[b.status] || "bg-white/10 text-crema/50"}`}>
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => sendEmail(b.id)}
                      disabled={sending === b.id || b.status === "cancelled"}
                      title="Enviar email de confirmación"
                      className="text-crema/40 hover:text-verde-vivo transition-colors disabled:opacity-25"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    {b.status !== "cancelled" && (
                      <button
                        onClick={() => cancelBooking(b.id)}
                        title="Cancelar reserva"
                        className="text-crema/40 hover:text-terracota transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
