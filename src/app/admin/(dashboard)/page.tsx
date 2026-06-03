import { prisma } from "@/lib/prisma";
import { hoyMX, addDaysYMD, partsMX, mxMonthStart } from "@/lib/dates";
import { montoCobrado, saldoPendiente } from "@/lib/admin/kpis";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const todayStr   = hoyMX();
  const nextWeek   = addDaysYMD(todayStr, 7);
  const { year, month } = partsMX(new Date());
  const monthStart = mxMonthStart(year, month);

  const [todayBookings, upcomingBookings, recentBookings, pendingQuotes, monthBookings, allPending] = await Promise.all([
    prisma.tourBooking.findMany({
      where: { tourDate: todayStr, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tourBooking.findMany({
      where: { tourDate: { gt: todayStr, lte: nextWeek }, status: { not: "cancelled" } },
      orderBy: { tourDate: "asc" },
    }),
    prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.tourQuote.findMany({
      where: { status: { in: ["borrador", "enviada"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // "Ingresos del mes": dinero realmente cobrado de reservas no canceladas creadas este mes
    prisma.tourBooking.findMany({
      where: { status: { not: "cancelled" }, createdAt: { gte: monthStart } },
    }),
    // "Pendiente de cobro": saldo que falta de TODAS las reservas no canceladas
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" } } }),
  ]);

  const monthIngresos = monthBookings.reduce((s, b) => s + montoCobrado(b), 0);
  const pendingAmount = allPending.reduce((s, b) => s + saldoPendiente(b), 0);

  return (
    <DashboardClient
      todayBookings={todayBookings}
      upcomingBookings={upcomingBookings}
      recentBookings={recentBookings}
      pendingQuotes={pendingQuotes}
      monthIngresos={monthIngresos}
      monthReservas={monthBookings.length}
      pendingAmount={pendingAmount}
      activeQuotes={pendingQuotes.length}
    />
  );
}
