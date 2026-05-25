import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const todayStr   = new Date().toISOString().split("T")[0];
  const nextWeek   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

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
    prisma.tourBooking.findMany({
      where: { status: { not: "cancelled" }, createdAt: { gte: monthStart } },
    }),
    prisma.tourBooking.findMany({ where: { status: "pending" } }),
  ]);

  const monthIngresos = monthBookings.reduce((s, b) => s + b.totalAmount, 0);
  const pendingAmount = allPending.reduce((s, b) => s + b.totalAmount, 0);

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
