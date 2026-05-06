import { prisma } from "@/lib/prisma";

export async function calcKPIs() {
  const all = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
  const active = all.filter(b => b.status !== "cancelled");

  const now   = new Date();
  const mesN  = now.getMonth();
  const añoN  = now.getFullYear();
  const semStart = new Date(now); semStart.setDate(now.getDate() - now.getDay());

  const thisMes   = active.filter(b => {
    const d = new Date(b.createdAt);
    return d.getMonth() === mesN && d.getFullYear() === añoN;
  });
  const prevMes   = active.filter(b => {
    const d = new Date(b.createdAt);
    const pm = mesN === 0 ? 11 : mesN - 1;
    const pa = mesN === 0 ? añoN - 1 : añoN;
    return d.getMonth() === pm && d.getFullYear() === pa;
  });
  const thisSem   = active.filter(b => new Date(b.createdAt) >= semStart);
  const thisAño   = active.filter(b => new Date(b.createdAt).getFullYear() === añoN);

  const sum = (arr: typeof active) => arr.reduce((s, b) => s + b.totalAmount, 0);

  const ingresosMes  = sum(thisMes);
  const ingresosPrev = sum(prevMes);
  const deltaIngresos = ingresosPrev > 0
    ? Math.round(((ingresosMes - ingresosPrev) / ingresosPrev) * 100)
    : 0;

  // Tour más vendido
  const porTour: Record<string, { nombre: string; count: number; ingresos: number }> = {};
  active.forEach(b => {
    if (!porTour[b.tourSlug]) porTour[b.tourSlug] = { nombre: b.tourName, count: 0, ingresos: 0 };
    porTour[b.tourSlug].count++;
    porTour[b.tourSlug].ingresos += b.totalAmount;
  });
  const toursMasVendidos = Object.values(porTour).sort((a, b) => b.count - a.count).slice(0, 5);

  // Ingresos por mes (últimos 12)
  const porMes: { mes: string; ingresos: number; reservas: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(añoN, mesN - i, 1);
    const mes = d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    const m   = d.getMonth();
    const a   = d.getFullYear();
    const arr = active.filter(b => {
      const bd = new Date(b.createdAt);
      return bd.getMonth() === m && bd.getFullYear() === a;
    });
    porMes.push({ mes, ingresos: sum(arr), reservas: arr.length });
  }

  return {
    semana:  { reservas: thisSem.length,  ingresos: sum(thisSem)  },
    mes:     { reservas: thisMes.length,  ingresos: ingresosMes, delta: deltaIngresos },
    año:     { reservas: thisAño.length,  ingresos: sum(thisAño)  },
    total:   { reservas: active.length,   ingresos: sum(active)   },
    porMes,
    toursMasVendidos,
  };
}
