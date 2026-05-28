import { prisma } from "@/lib/prisma";
import { hoyMX, ymdMX, partsMX, addDaysYMD, weekdayYMD } from "@/lib/dates";

export async function calcKPIs() {
  const all = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
  // Ingresos = solo reservas pagadas (no contar pendientes como dinero cobrado).
  const paid = all.filter(b => b.status === "paid");

  // Cortes calculados en horario de México (no UTC).
  const hoy        = hoyMX();
  const { year: añoN, month: mesN } = partsMX(new Date());
  const semStart   = addDaysYMD(hoy, -weekdayYMD(hoy)); // domingo de esta semana

  const thisMes = paid.filter(b => { const p = partsMX(b.createdAt); return p.month === mesN && p.year === añoN; });
  const prevMes = paid.filter(b => {
    const p  = partsMX(b.createdAt);
    const pm = mesN === 0 ? 11 : mesN - 1;
    const pa = mesN === 0 ? añoN - 1 : añoN;
    return p.month === pm && p.year === pa;
  });
  const thisSem = paid.filter(b => ymdMX(b.createdAt) >= semStart);
  const thisAño = paid.filter(b => partsMX(b.createdAt).year === añoN);

  const sum = (arr: typeof paid) => arr.reduce((s, b) => s + b.totalAmount, 0);

  const ingresosMes  = sum(thisMes);
  const ingresosPrev = sum(prevMes);
  const deltaIngresos = ingresosPrev > 0
    ? Math.round(((ingresosMes - ingresosPrev) / ingresosPrev) * 100)
    : 0;

  // Tour más vendido (solo pagadas)
  const porTour: Record<string, { nombre: string; count: number; ingresos: number }> = {};
  paid.forEach(b => {
    if (!porTour[b.tourSlug]) porTour[b.tourSlug] = { nombre: b.tourName, count: 0, ingresos: 0 };
    porTour[b.tourSlug].count++;
    porTour[b.tourSlug].ingresos += b.totalAmount;
  });
  const toursMasVendidos = Object.values(porTour).sort((a, b) => b.count - a.count).slice(0, 5);

  // Ingresos por mes (últimos 12), agrupando por mes en horario de México
  const porMes: { mes: string; ingresos: number; reservas: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    let mm = mesN - i, yy = añoN;
    while (mm < 0) { mm += 12; yy -= 1; }
    const mes = new Date(yy, mm, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    const arr = paid.filter(b => { const p = partsMX(b.createdAt); return p.month === mm && p.year === yy; });
    porMes.push({ mes, ingresos: sum(arr), reservas: arr.length });
  }

  return {
    semana:  { reservas: thisSem.length,  ingresos: sum(thisSem)  },
    mes:     { reservas: thisMes.length,  ingresos: ingresosMes, delta: deltaIngresos },
    año:     { reservas: thisAño.length,  ingresos: sum(thisAño)  },
    total:   { reservas: paid.length,     ingresos: sum(paid)     },
    porMes,
    toursMasVendidos,
  };
}
