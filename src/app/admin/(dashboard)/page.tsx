import { prisma } from "@/lib/prisma";
import { hoyMX, addDaysYMD, partsMX, mxMonthStart } from "@/lib/dates";
import { montoCobrado, saldoPendiente } from "@/lib/admin/kpis";
import { sesionActual } from "@/lib/admin/sesion";
import { puedeVer } from "@/lib/admin/usuarios";
import { permisosDeTodos } from "@/lib/admin/permisos";
import DashboardClient from "./DashboardClient";
import { datosScorecard, type DatosScorecard } from "@/lib/admin/scorecardDatos";
import { lunesDe } from "@/lib/admin/corteSemanal";
import { MARGEN_DIAS, NO_CUENTAN } from "@/lib/cupoTour";
import { primerDiaVivoEntre } from "@/lib/admin/salidas";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: { searchParams: { semana?: string } }) {
  const sesion     = await sesionActual();
  // El scorecard semanal (rediseño, 3 nov 2026): la semana pedida o la actual.
  const pedida = searchParams?.semana ?? "";
  const lunes = lunesDe(/^\d{4}-\d{2}-\d{2}$/.test(pedida) && addDaysYMD(pedida, 0) === pedida ? pedida : hoyMX());
  let scorecard: DatosScorecard | null = null;
  try { scorecard = await datosScorecard(lunes); } catch (e) { console.error("scorecard:", (e as Error)?.message); }
  const verDinero  = puedeVer(sesion?.rol ?? "operacion", "ingresos");
  const todayStr   = hoyMX();
  const nextWeek   = addDaysYMD(todayStr, 7);
  const { year, month } = partsMX(new Date());
  const monthStart = mxMonthStart(year, month);

  // 🔴 Sin los «borrador» del bot viejo: eran cotizaciones sin pago y salían
  // como reservas de hoy, ventas del mes y «pendiente de cobro». Mismo criterio
  // que el corte (`NO_CUENTAN`, lote 6, 10 nov 2026).
  // 🔴 «Tours de hoy» y «Próximos 7 días» por los días de tour de cada reserva,
  // no por `tourDate` (solo el primer tour del carrito), y sin los de una
  // salida marcada «Cancelada» (revisión del lote 6, 10 nov 2026). Mismo
  // margen que Salidas del día y el cupo.
  const [cercanas, canceladas, recentBookings, pendingQuotes, monthBookings, allPending, activeQuotesCount] = await Promise.all([
    prisma.tourBooking.findMany({
      where: {
        status: { notIn: NO_CUENTAN },
        OR: [{ tourDate: { gte: addDaysYMD(todayStr, -MARGEN_DIAS), lte: addDaysYMD(nextWeek, MARGEN_DIAS) } }, { tourDate: "" }],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salida.findMany({ where: { estado: "cancelada", fecha: { gte: todayStr, lte: nextWeek } }, select: { clave: true } }).catch(() => []),
    prisma.tourBooking.findMany({ where: { status: { not: "borrador" } }, orderBy: { createdAt: "desc" }, take: 6 }),
    // Activas = enviadas (incluye las «por vencer»). Los borradores NO: 106
    // borradores, 101 de antes de octubre, inflaban el número (3 nov 2026).
    prisma.tourQuote.findMany({
      where: { status: "enviada" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // "Ingresos del mes": dinero realmente cobrado de reservas no canceladas creadas este mes
    prisma.tourBooking.findMany({
      where: { status: { notIn: NO_CUENTAN }, createdAt: { gte: monthStart } },
    }),
    // "Pendiente de cobro": saldo que falta de TODAS las reservas no canceladas
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN } } }),
    // El total real de cotizaciones activas. La lista de arriba lleva `take: 5`
    // porque solo se pintan 5 en el panel; contar esa lista hacía que el KPI
    // dijera siempre "5" aunque hubiera decenas abiertas.
    prisma.tourQuote.count({ where: { status: "enviada" } }),
  ]);
  const sinCanceladas = new Set(canceladas.map(c => c.clave));
  const todayBookings = cercanas.filter(b => primerDiaVivoEntre(b, todayStr, todayStr, sinCanceladas) !== null);
  // La fecha del recuadro es la de SU próximo tour en la semana (puede ser el 2.º del carrito).
  const upcomingBookings = cercanas
    .map(b => ({ b, dia: primerDiaVivoEntre(b, addDaysYMD(todayStr, 1), nextWeek, sinCanceladas) }))
    .filter((x): x is { b: (typeof cercanas)[number]; dia: string } => x.dia !== null)
    .sort((x, y) => x.dia.localeCompare(y.dia))
    .map(x => ({ ...x.b, tourDate: x.dia }));
  // Inicio es solo de Manolo: desde aquí decide qué pestañas ve cada quien.
  const personas = sesion?.rol === "dueno" ? (await permisosDeTodos()).filter(p => p.rol !== "dueno") : [];

  const monthIngresos = monthBookings.reduce((s, b) => s + montoCobrado(b), 0);
  const pendingAmount = allPending.reduce((s, b) => s + saldoPendiente(b), 0);

  return (
    <DashboardClient
      todayBookings={todayBookings}
      upcomingBookings={upcomingBookings}
      recentBookings={recentBookings}
      pendingQuotes={pendingQuotes}
      // Sin permiso de ver dinero, las cifras NO viajan al navegador: antes se
      // escondían en pantalla pero iban dentro de la página.
      monthIngresos={verDinero ? monthIngresos : 0}
      monthReservas={monthBookings.length}
      verDinero={verDinero}
      pendingAmount={verDinero ? pendingAmount : 0}
      activeQuotes={activeQuotesCount}
      personas={personas}
      scorecard={scorecard}
    />
  );
}
