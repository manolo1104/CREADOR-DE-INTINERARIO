import { prisma } from "@/lib/prisma";
import CalendarioClient from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const bookings = await prisma.tourBooking.findMany({
    where: { status: { not: "cancelled" } },
    orderBy: { tourDate: "asc" },
  });
  return <CalendarioClient bookings={bookings} />;
}
