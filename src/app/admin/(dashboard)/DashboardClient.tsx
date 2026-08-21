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
}

export default function DashboardClient({
  todayBookings, upcomingBookings, recentBookings, pendingQuotes,
  monthIngresos, monthReservas, pendingAmount, activeQuotes,
}: Props) {
  const today      = new Date();
  const dateStr    = today.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateDisplay = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Panel de Control</h1>
          <p className="text-[#1B4332]/40 font-dm text-sm mt-0.5">{dateDisplay}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reservas"
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <Plus className="w-3.5 h-3.5" />Nueva Reserva
          </Link>
          <Link href="/admin/cotizaciones"
            className="flex items-center gap-2 border border-[#1B4332]/20 text-[#1B4332]/60 hover:text-[#1B4332] px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <FileText className="w-3.5 h-3.5" />Nueva Cotización
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
          <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">Ingresos este mes</p>
          <p className="font-cormorant text-[#52B788] text-3xl font-light leading-none mb-1"><CountUp value={monthIngresos} format={fmx} /></p>
          <p className="text-[#1B4332]/40 font-dm text-xs">{monthReservas} reservas</p>
        </div>

        <div className={`border rounded-sm p-5 ${todayBookings.length > 0 ? "bg-[#1B4332] border-[#1B4332]" : "bg-white border-[#1B4332]/10"}`}>
          <p className={`text-[9px] tracking-[2px] uppercase font-dm mb-2 ${todayBookings.length > 0 ? "text-white/60" : "text-[#1B4332]/40"}`}>Tours hoy</p>
          <p className={`font-cormorant text-3xl font-light leading-none mb-1 ${todayBookings.length > 0 ? "text-white" : "text-[#1B4332]/30"}`}>
            <CountUp value={todayBookings.length} />
          </p>
          <p className={`font-dm text-xs ${todayBookings.length > 0 ? "text-white/70" : "text-[#1B4332]/30"}`}>
            {todayBookings.length > 0
              ? `${todayBookings.reduce((s, b) => s + grupoDe(b as any).total, 0)} personas`
              : "Sin tours"}
          </p>
        </div>

        <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
          <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">Pendiente de cobro</p>
          <p className={`font-cormorant text-3xl font-light leading-none mb-1 ${pendingAmount > 0 ? "text-[#52B788]" : "text-[#1B4332]/30"}`}>
            {pendingAmount > 0 ? <CountUp value={pendingAmount} format={fmx} /> : "—"}
          </p>
          <p className="text-[#1B4332]/40 font-dm text-xs">saldo por cobrar</p>
        </div>

        <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
          <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">Cotizaciones activas</p>
          <p className={`font-cormorant text-3xl font-light leading-none mb-1 ${activeQuotes > 0 ? "text-[#1B4332]" : "text-[#1B4332]/30"}`}>
            <CountUp value={activeQuotes} />
          </p>
          <p className="text-[#1B4332]/40 font-dm text-xs">borrador + enviada</p>
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Tours hoy */}
        <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
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
        <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
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
        <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
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
      <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden mb-5">
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
          { href: "/admin/ingresos",   icon: TrendingUp, label: "Ingresos",   color: "#52B788" },
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
