import { prisma } from "@/lib/prisma";
import { resumenCupoPanel, todasLasFechasCerradas } from "@/lib/cupoTour";
import { apartadosVigentes } from "@/lib/apartadosAlmacen";
import CalendarioClient, { type ApartadoDelDia } from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const [bookings, cerradas, apartados] = await Promise.all([
    prisma.tourBooking.findMany({
      where: { status: { not: "cancelled" } },
      orderBy: { tourDate: "asc" },
    }),
    todasLasFechasCerradas(),
    apartadosVigentes(),
  ]);
  // Los apartados de 15 minutos del carrito (`lib/apartadosAlmacen.ts`), por
  // día. No entran en la cuenta del panel —en 15 minutos son reserva o no son
  // nada—, pero el día los enseña aparte. Sin id ni huella de IP: al equipo le
  // sirve cuántos lugares y hasta cuándo.
  const apartadosPorDia: Record<string, ApartadoDelDia[]> = {};
  for (const a of apartados) {
    for (const l of a.lineas) (apartadosPorDia[l.fecha] ??= []).push({ slug: l.slug, personas: l.personas, vence: a.vence });
  }
  // El cupo de cada recorrido por día sale de estas mismas reservas y con la
  // MISMA cuenta con que el sitio pinta su calendario y deja pagar
  // (`lib/cupoTour.ts`): si el panel contara a su modo, enseñaría libre un día
  // que el sitio ya no vende. Se cuenta aquí porque esa cuenta lee la base y
  // no puede viajar al navegador.
  return <CalendarioClient bookings={bookings} cupo={resumenCupoPanel(bookings, cerradas)} apartados={apartadosPorDia} />;
}
