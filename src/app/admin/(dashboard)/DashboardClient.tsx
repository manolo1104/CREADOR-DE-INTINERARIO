"use client";

import Link from "next/link";
import { BookOpen, Calendar, FileText, TrendingUp, Users, Plus, ArrowRight } from "lucide-react";
import type { TourBooking, TourQuote } from "@prisma/client";
import CountUp from "@/components/admin/CountUp";
import { grupoDe, grupoCorto } from "@/lib/admin/reserva";

const fmx   = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";

const STATUS_STYLE: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { paid: "Pagada", pending: "Pendiente", cancelled: "Cancelada" };

interface Props {
  todayBookings:    TourBooking[];
  upcomingBookings: TourBooking[];
  recentBookings:   TourBooking[];
  pendingQuotes:    TourQuote[];
  monthIngresos:    number;
  monthReservas:    number;
  pendingAmount:    number;
  activeQuotes:     number;
  /** Ingresos del mes: solo para quien puede ver los números del negocio. */
  verDinero?:       boolean;
}

export default function DashboardClient({
  todayBookings, upcomingBookings, recentBookings, pendingQuotes,
  monthIngresos, monthReservas, pendingAmount, activeQuotes, verDinero = true,
}: Props) {
  const today      = new Date();
  const dateStr    = today.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateDisplay = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="px-5 sm:px-7 py-6 max-w-[1400px] mx-auto">
      {/* ── Encabezado ──────────────────────────────────────────────────────
          Un solo botón primario. Cuando todo pesa igual, nada pesa. */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="panel-eyebrow mb-1.5">{dateDisplay}</p>
          <h1 className="font-cormorant text-[#16362a] text-[30px] leading-none font-light">
            {todayBookings.length > 0
              ? `${todayBookings.length} ${todayBookings.length === 1 ? "salida" : "salidas"} hoy`
              : "Sin salidas hoy"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reservas"
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#16362a] text-white px-3.5 py-2 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco shadow-[0_1px_2px_rgba(22,54,42,0.12)]">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />Nueva reserva
          </Link>
          <Link href="/admin/cotizaciones"
            className="flex items-center gap-2 panel-card px-3.5 py-2 text-[12px] font-dm text-[rgba(22,54,42,0.66)] hover:text-[#16362a] panel-pulsable panel-foco">
            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />Nueva cotización
          </Link>
        </div>
      </div>

      {/* ── Las cifras del día ──────────────────────────────────────────────
          Un tamaño para todas y la unidad en gris: así se comparan de un
          vistazo en vez de competir entre ellas. */}
      <div className={`grid grid-cols-2 gap-3 mb-6 ${verDinero ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {verDinero ? (
          <Cifra etiqueta="Ingresos este mes" tono="positivo"
                 valor={<CountUp value={monthIngresos} format={fmx} />}
                 pie={`${monthReservas} ${monthReservas === 1 ? "reserva" : "reservas"}`} />
        ) : (
          <Cifra etiqueta="Reservas este mes" tono="positivo"
                 valor={<CountUp value={monthReservas} />} pie="creadas este mes" />
        )}

        <Cifra etiqueta="Personas hoy" tono={todayBookings.length > 0 ? "acento" : "apagado"}
               valor={<CountUp value={todayBookings.reduce((s, b) => s + grupoDe(b as any).total, 0)} />}
               pie={todayBookings.length > 0
                 ? `en ${todayBookings.length} ${todayBookings.length === 1 ? "salida" : "salidas"}`
                 : "sin salidas"} />

        <Cifra etiqueta="Pendiente de cobro" tono={pendingAmount > 0 ? "alerta" : "apagado"}
               valor={pendingAmount > 0 ? <CountUp value={pendingAmount} format={fmx} /> : "—"}
               pie="saldo por cobrar" />

        <Cifra etiqueta="Cotizaciones activas" tono={activeQuotes > 0 ? "neutro" : "apagado"}
               valor={<CountUp value={activeQuotes} />} pie="borrador y enviadas" />
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Tours hoy */}
        <div className="panel-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1B4332]/8 flex items-center justify-between">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Tours de hoy</p>
            <Link href="/admin/calendario" className="text-[#1B4332] hover:text-[#2D5A45] transition-colors">
              <Calendar className="w-3.5 h-3.5" />
            </Link>
          </div>
          {todayBookings.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#1B4332]/25 font-dm text-sm">Sin tours hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1B4332]/6">
              {todayBookings.map(b => (
                <div key={b.id} className="px-5 py-3">
                  <p className="font-dm text-sm font-medium text-[#1B4332]">{b.customerName}</p>
                  <p className="font-dm text-xs text-[#1B4332]/50 truncate">{b.tourName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-dm text-[10px] text-[#1B4332]/40">{grupoCorto(grupoDe(b as any))}</span>
                    <span className="font-dm text-xs text-[#52B788] font-medium">{fmx(b.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos 7 días */}
        <div className="panel-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1B4332]/8 flex items-center justify-between">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Próximos 7 días</p>
            <Link href="/admin/reservas" className="text-[#1B4332] hover:text-[#2D5A45] transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#1B4332]/25 font-dm text-sm">Sin tours próximos</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1B4332]/6">
              {upcomingBookings.slice(0, 5).map(b => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="text-center min-w-[40px] bg-[#FAFAF8] rounded-sm py-1.5 px-2 flex-shrink-0">
                    <p className="font-dm text-[9px] text-[#1B4332]/50 uppercase">
                      {new Date(b.tourDate + "T12:00:00").toLocaleDateString("es-MX", { month: "short" })}
                    </p>
                    <p className="font-cormorant text-[#1B4332] text-lg leading-none">
                      {new Date(b.tourDate + "T12:00:00").getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm text-sm font-medium text-[#1B4332] truncate">{b.customerName}</p>
                    <p className="font-dm text-xs text-[#1B4332]/50 truncate">{b.tourName}</p>
                  </div>
                  <span className="font-dm text-[10px] text-[#1B4332]/40 whitespace-nowrap">{grupoCorto(grupoDe(b as any))}</span>
                </div>
              ))}
              {upcomingBookings.length > 5 && (
                <div className="px-5 py-3">
                  <Link href="/admin/reservas" className="font-dm text-xs text-[#1B4332] hover:underline">
                    +{upcomingBookings.length - 5} más →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cotizaciones pendientes */}
        <div className="panel-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1B4332]/8 flex items-center justify-between">
            <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Cotizaciones pendientes</p>
            <Link href="/admin/cotizaciones" className="text-[#1B4332] hover:text-[#2D5A45] transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {pendingQuotes.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#1B4332]/25 font-dm text-sm">Sin cotizaciones activas</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1B4332]/6">
              {pendingQuotes.map(q => (
                <div key={q.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-dm text-sm font-medium text-[#1B4332] truncate">{q.customerName}</p>
                      <p className="font-dm text-xs text-[#1B4332]/50 truncate">{q.tourName}</p>
                    </div>
                    <span className={`text-[9px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm whitespace-nowrap flex-shrink-0 ${q.status === "enviada" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>
                      {q.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-[9px] text-[#1B4332]">{q.quoteNumber}</span>
                    <span className="font-dm text-xs text-[#52B788] font-medium">{fmx(q.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimas reservas */}
      <div className="panel-card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#1B4332]/8 flex items-center justify-between">
          <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Últimas reservas</p>
          <Link href="/admin/reservas" className="text-[9px] tracking-[1px] uppercase font-dm text-[#1B4332] hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[#1B4332]/25 font-dm text-sm">Sin reservas aún</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1B4332]/6">
            {recentBookings.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-dm text-sm font-medium text-[#1B4332]">{b.customerName}</p>
                    <span className={`text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 rounded font-dm ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </div>
                  <p className="font-dm text-xs text-[#1B4332]/50 truncate">{b.tourName} · {fDate(b.tourDate)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-dm text-sm text-[#52B788] font-medium">{fmx(b.totalAmount)}</p>
                  <p className="font-mono text-[9px] text-[#1B4332]">{b.confirmationNumber}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/reservas",   icon: BookOpen,   label: "Reservas",   color: "#1B4332" },
          { href: "/admin/calendario", icon: Calendar,   label: "Calendario", color: "#1a4e8a" },
          // El atajo a Ingresos solo para quien puede ver los números del negocio.
          ...(verDinero
            ? [{ href: "/admin/ingresos", icon: TrendingUp, label: "Ingresos", color: "#52B788" }]
            : [{ href: "/admin/cotizaciones", icon: FileText, label: "Cotizaciones", color: "#52B788" }]),
          { href: "/admin/clientes",   icon: Users,      label: "Clientes",   color: "#7a3a6a" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 bg-white border border-[#1B4332]/10 hover:border-[#1B4332]/25 px-4 py-3.5 rounded-sm transition-colors group">
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <span className="font-dm text-sm text-[#1B4332]/70 group-hover:text-[#1B4332] transition-colors">{label}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#1B4332]/20 group-hover:text-[#1B4332]/40 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}


/**
 * Una cifra del panel.
 *
 * Todas comparten tamaño y peso: la diferencia la marca el color, y solo
 * cuando significa algo (verde = entró dinero, ámbar = falta cobrarlo). Antes
 * cada tarjeta elegía su tamaño y la que estaba en verde parecía la
 * importante aunque no lo fuera.
 */
function Cifra({ etiqueta, valor, pie, tono }: {
  etiqueta: string;
  valor: React.ReactNode;
  pie: string;
  tono: "positivo" | "acento" | "alerta" | "neutro" | "apagado";
}) {
  const color = {
    positivo: "text-[#2b845c]",
    acento:   "text-[#1B4332]",
    alerta:   "text-[#a86814]",
    neutro:   "text-[#16362a]",
    apagado:  "text-[rgba(22,54,42,0.28)]",
  }[tono];

  return (
    <div className="panel-card panel-card-alta px-4 py-3.5">
      <p className="panel-eyebrow mb-2">{etiqueta}</p>
      <p className={`panel-cifra font-cormorant text-[28px] leading-none font-light mb-1 ${color}`}>
        {valor}
      </p>
      <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)]">{pie}</p>
    </div>
  );
}
