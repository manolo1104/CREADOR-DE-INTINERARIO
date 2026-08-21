import { prisma } from "@/lib/prisma";
import { hoyMX, ymdMX, partsMX, addDaysYMD, weekdayYMD } from "@/lib/dates";
import type { TourBooking } from "@prisma/client";
import { TOURS_DB } from "@/lib/tours";

type CashFields = Pick<TourBooking, "depositoPagado" | "stripePaymentIntentId" | "totalAmount">;

/**
 * Dinero realmente cobrado de una reserva = el anticipo registrado, o el total si fue
 * un pago 100% por Stripe (puede no tener anticipo explícito guardado).
 *
 * ⚠️ Si una reserva se capturó a mano SIN anticipo, esto devuelve 0 aunque el
 * dinero sí haya entrado. No se adivina a partir de `status`: en esta base
 * TODAS las reservas están en "paid" (incluidas 8 con anticipo parcial), así
 * que `status` no distingue "pagada completa" de "capturada y ya". Esas
 * reservas se reportan aparte en `sinRegistroDePago` para poder corregirlas.
 */
export function montoCobrado(b: CashFields): number {
  const dep = b.depositoPagado ?? 0;
  if (dep > 0) return dep;
  return b.stripePaymentIntentId ? b.totalAmount : 0;
}

/** Saldo que falta por cobrar de una reserva (nunca negativo). */
export function saldoPendiente(b: CashFields): number {
  return Math.max(0, b.totalAmount - montoCobrado(b));
}

/** Una reserva marcada como cobrada pero sin ningún importe registrado. */
function sinImporteRegistrado(b: CashFields & { status: string }): boolean {
  return b.status !== "cancelled" && (b.depositoPagado ?? 0) === 0 && !b.stripePaymentIntentId;
}

// ── Tours reales de una reserva ──────────────────────────────────────────────
// `tourSlug`/`tourName` guardan SOLO el primer tour (y `tourName` llega a ser
// una concatenación con " + " de todos). Los tours de verdad están en
// `lineItems`. Contar por `tourSlug` subestima muchísimo: en la base actual
// Cascadas del Meco aparece en 18 reservas pero como `tourSlug` solo en 4.
interface LineaTour { tourSlug?: string; tourName?: string; subtotal?: number; _meta?: unknown }

/** Nombre del catálogo para un slug. Varias líneas comparten slug con nombres
 *  distintos (el RZR tiene una etiqueta por vehículo, la Ruta Acuática cambió
 *  de nombre); sin esto la fila agrupada se quedaba con la etiqueta de la
 *  primera variante y parecía que solo se vendió esa. */
function nombreDeCatalogo(slug?: string): string | undefined {
  if (!slug) return undefined;
  return TOURS_DB.find(t => t.slug === slug)?.nombre;
}

function lineasDe(b: TourBooking): LineaTour[] {
  const raw = (b as any).lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l: any) => l && !l._meta && (l.tourSlug || l.tourName));
}

export async function calcKPIs() {
  const all = await prisma.tourBooking.findMany({ orderBy: { createdAt: "desc" } });
  // Ingresos = dinero REALMENTE cobrado (anticipos + pagos completos) de reservas no canceladas.
  const paid = all.filter(b => b.status !== "cancelled");

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

  const sum      = (arr: TourBooking[]) => arr.reduce((s, b) => s + montoCobrado(b), 0);
  const sumVenta = (arr: TourBooking[]) => arr.reduce((s, b) => s + b.totalAmount, 0);

  const ingresosMes  = sum(thisMes);
  const ingresosPrev = sum(prevMes);
  const deltaIngresos = ingresosPrev > 0
    ? Math.round(((ingresosMes - ingresosPrev) / ingresosPrev) * 100)
    : 0;

  // ── Tours más vendidos, contando TODOS los tours de cada reserva ───────────
  // El dinero cobrado de la reserva se reparte entre sus tours en proporción a
  // cada subtotal: así ningún tour se lleva el crédito del viaje entero.
  const porTour: Record<string, { nombre: string; count: number; ingresos: number }> = {};
  paid.forEach(b => {
    const lineas = lineasDe(b);
    const cobrado = montoCobrado(b);
    if (lineas.length === 0) {
      // Reserva antigua sin `lineItems`: se queda con el tour principal.
      const key = b.tourSlug || b.tourName || "(sin tour)";
      porTour[key] ??= { nombre: nombreDeCatalogo(b.tourSlug) || b.tourName || "(sin tour)", count: 0, ingresos: 0 };
      porTour[key].count++;
      porTour[key].ingresos += cobrado;
      return;
    }
    const totalLineas = lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0);
    lineas.forEach(l => {
      const key = l.tourSlug || l.tourName || "(sin tour)";
      porTour[key] ??= { nombre: nombreDeCatalogo(l.tourSlug) || l.tourName || l.tourSlug || "(sin tour)", count: 0, ingresos: 0 };
      porTour[key].count++;
      porTour[key].ingresos += totalLineas > 0
        ? Math.round(cobrado * ((l.subtotal ?? 0) / totalLineas))
        : Math.round(cobrado / lineas.length);
    });
  });
  const toursMasVendidos = Object.values(porTour).sort((a, b) => b.count - a.count).slice(0, 8);

  // ── Series mensuales ───────────────────────────────────────────────────────
  const etiqueta = (yy: number, mm: number) =>
    new Date(yy, mm, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });

  // (a) Por VENTA: el mes en que se capturó la reserva. Últimos 12 meses.
  const porMesVenta: { mes: string; ingresos: number; reservas: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    let mm = mesN - i, yy = añoN;
    while (mm < 0) { mm += 12; yy -= 1; }
    const arr = paid.filter(b => { const p = partsMX(b.createdAt); return p.month === mm && p.year === yy; });
    porMesVenta.push({ mes: etiqueta(yy, mm), ingresos: sum(arr), reservas: arr.length });
  }

  // (b) Por TOUR: el mes en que se opera el viaje. Ventana de 9 meses atrás y 2
  // adelante, porque los tours ya vendidos para meses futuros son operación real
  // que quedaría invisible en una ventana que termina hoy.
  const porMesTour: { mes: string; ingresos: number; reservas: number }[] = [];
  for (let i = 9; i >= -2; i--) {
    let mm = mesN - i, yy = añoN;
    while (mm < 0)  { mm += 12; yy -= 1; }
    while (mm > 11) { mm -= 12; yy += 1; }
    const clave = `${yy}-${String(mm + 1).padStart(2, "0")}`;
    const arr = paid.filter(b => (b.tourDate || "").startsWith(clave));
    porMesTour.push({ mes: etiqueta(yy, mm), ingresos: sum(arr), reservas: arr.length });
  }

  // ── Reservas cuyo importe el panel no puede ver ────────────────────────────
  const huecos = paid.filter(sinImporteRegistrado);

  return {
    semana:  { reservas: thisSem.length,  ingresos: sum(thisSem), vendido: sumVenta(thisSem) },
    mes:     { reservas: thisMes.length,  ingresos: ingresosMes,  vendido: sumVenta(thisMes), delta: deltaIngresos },
    año:     { reservas: thisAño.length,  ingresos: sum(thisAño), vendido: sumVenta(thisAño) },
    total:   { reservas: paid.length,     ingresos: sum(paid),    vendido: sumVenta(paid) },
    porCobrar: paid.reduce((s, b) => s + saldoPendiente(b), 0),
    sinRegistroDePago: {
      cuantas: huecos.length,
      monto:   huecos.reduce((s, b) => s + b.totalAmount, 0),
      folios:  huecos.map(b => b.confirmationNumber),
    },
    porMesVenta,
    porMesTour,
    toursMasVendidos,
  };
}
