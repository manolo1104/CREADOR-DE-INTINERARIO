import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import ReservasClient from "./ReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const [bookings, presetsExtras] = await Promise.all([
    prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } }),
    leerPreciosExtras(),
  ]);
  return <ReservasClient initialBookings={bookings} presetsExtras={presetsExtras} />;
}
