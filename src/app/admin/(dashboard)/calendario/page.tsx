import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { sugerenciasAgrupar } from "@/lib/admin/agruparDatos";
import { NO_CUENTAN, resumenCupoPanel, todasLasFechasCerradas } from "@/lib/cupoTour";
import { apartadosVigentes } from "@/lib/apartadosAlmacen";
import { estadosDe } from "@/lib/encuestas/encuesta";
import { esDeOficina } from "@/lib/admin/usuarios";
import { sesionVeCostos } from "@/lib/admin/permisos";
import { sinCostosDeExtras } from "@/lib/admin/extras";
import CalendarioClient, { type ApartadoDelDia } from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({ searchParams }: { searchParams?: { dia?: string } }) {
  // 🔴 El guía no: esta página manda al navegador todas las reservas con su
  // dinero y sus cobros (revisión del 4 nov 2026). Lo suyo es Salidas del día.
  // Lista blanca (lote 8, 10 nov 2026): solo la oficina.
  const sesion = await sesionActual();
  if (!sesion || !esDeOficina(sesion.rol)) redirect("/admin/salidas-dia");
  const [bookings, cerradas, apartados, canceladas] = await Promise.all([
    // Sin los «borrador» del bot viejo (cotizaciones sin pago), como el corte (lote 6, 10 nov 2026).
    prisma.tourBooking.findMany({
      where: { status: { notIn: NO_CUENTAN } },
      orderBy: { tourDate: "asc" },
    }),
    todasLasFechasCerradas(),
    apartadosVigentes(),
    // Las salidas marcadas «Cancelada»: se ven tachadas y no cuentan en el mes (revisión del lote 6, 10 nov 2026).
    prisma.salida.findMany({ where: { estado: "cancelada" }, select: { clave: true } }).catch(() => []),
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
  const checkins = await estadosDe(bookings.map(b => b.id));
  const dia = typeof searchParams?.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.dia) ? searchParams.dia : null;
  const porJuntar = (await sugerenciasAgrupar().catch(() => [])).length;
  // Lo que nos cuestan los extras (la ficha de la reserva), solo a quien ve costos (lote 8).
  const verCostos = await sesionVeCostos(sesion);
  return <CalendarioClient porJuntar={porJuntar} diaInicial={dia} bookings={verCostos ? bookings : bookings.map(sinCostosDeExtras)} cupo={resumenCupoPanel(bookings, cerradas)} apartados={apartadosPorDia} checkins={checkins} canceladas={canceladas.map(c => c.clave)} />;
}
