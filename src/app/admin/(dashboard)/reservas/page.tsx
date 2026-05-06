import { prisma } from "@/lib/prisma";
import ReservasClient from "./ReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const bookings = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
  return <ReservasClient initialBookings={bookings} />;
}
