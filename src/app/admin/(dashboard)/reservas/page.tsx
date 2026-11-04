import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import { sesionActual } from "@/lib/admin/sesion";
import { estadosDe } from "@/lib/encuestas/encuesta";
import ReservasClient from "./ReservasClient";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  // Desde la ficha de un lead: «Ver reserva» (?folio=) o «Registrar cobro» (&cobrar=1).
  const folio = typeof searchParams.folio === "string" ? searchParams.folio.slice(0, 40) : null;
  const [bookings, presetsExtras, sesion] = await Promise.all([
    prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } }),
    leerPreciosExtras(),
    sesionActual(),
  ]);
  const checkins = await estadosDe(bookings.map(b => b.id));
  // El nombre de quien entró se usa para prellenar "lo recibió" en el cobro:
  // en la práctica, quien captura es quien tiene el dinero en la mano.
  return (
    <ReservasClient
      initialBookings={bookings}
      presetsExtras={presetsExtras}
      quien={sesion?.nombre ?? "Admin"}
      checkins={checkins}
      abrir={folio ? { folio, cobrar: searchParams.cobrar === "1" } : null}
    />
  );
}
