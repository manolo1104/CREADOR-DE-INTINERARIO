import { prisma } from "@/lib/prisma";
import ReservasClient from "./ReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  // Las evidencias se traen SIN la columna `datos`: son los bytes del PDF o la
  // captura y cargarlos aquí haría pesadísimo el listado.
  const [bookings, evidencias] = await Promise.all([
    prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.pagoProveedorEvidencia.findMany({
      select: { id: true, bookingId: true, nombreArchivo: true, tipoMime: true, tamanoBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return <ReservasClient initialBookings={bookings} initialEvidencias={evidencias} />;
}
