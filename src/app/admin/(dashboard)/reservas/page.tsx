import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import { sesionActual } from "@/lib/admin/sesion";
import ReservasClient from "./ReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const [bookings, presetsExtras, sesion] = await Promise.all([
    prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } }),
    leerPreciosExtras(),
    sesionActual(),
  ]);
  // El nombre de quien entró se usa para prellenar "lo recibió" en el cobro:
  // en la práctica, quien captura es quien tiene el dinero en la mano.
  return (
    <ReservasClient
      initialBookings={bookings}
      presetsExtras={presetsExtras}
      quien={sesion?.nombre ?? "Admin"}
    />
  );
}
