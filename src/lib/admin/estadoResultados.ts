// El corte del negocio: qué se vendió, qué costó y qué quedó.
//
// Regla que se acordó y que cambia cómo se lee todo: **solo cuenta como costo
// lo que de verdad se capturó**. Nada se estima. Si a una salida no se le
// capturó el costo, va en cero y la reserva se reporta aparte, en `sinCosto`,
// para que nadie confunda "no lo he capturado" con "no me costó". La utilidad
// de un corte con reservas sin capturar es un techo, no un resultado.
//
// Los costos se capturan a mano (`GastoCorte`) y son de dos clases:
//   · Ligados a una reserva (`reservaId`) → se restan a ESA salida.
//   · Sin ligar                           → gasto general del periodo.
//
// El "pago al proveedor" de cada reserva ya NO cuenta como costo: Manolo se
// asoció con quien era el proveedor, así que ese dinero dejó de ser una salida
// del negocio. La columna sigue en la base con su historial, pero fuera del corte.

import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { montoCobrado, saldoPendiente } from "./kpis";
import { costoExtraLine, type ExtraItem } from "./extras";
import type { TourBooking, GastoCorte } from "@prisma/client";

/** Stripe México: 3.6% + IVA sobre lo cobrado con tarjeta. */
export const COMISION_STRIPE = 0.036 * 1.16;

/** Sobre qué fecha se corta. */
export type BaseCorte = "tour" | "venta";

export interface FilaReserva {
  id:         string;
  folio:      string;
  fechaTour:  string;
  fechaVenta: string;
  cliente:    string;
  tour:       string;
  personas:   number;
  guia:       string;
  venta:      number;
  cobrado:    number;
  porCobrar:  number;
  /** Costos capturados a mano y ligados a esta reserva. */
  costoCapturado: number;
  costoExtras:    number;
  comision:       number;
  costoTotal:     number;
  utilidad:       number;
  margen:         number;  // % sobre la venta
  /** false = a esta salida nadie le ha capturado el costo todavía. */
  costoRegistrado: boolean;
}

export interface EstadoResultados {
  desde: string;
  hasta: string;
  base:  BaseCorte;

  ventas:    number;
  cobrado:   number;
  porCobrar: number;

  /** Costos capturados y ligados a las salidas del periodo. */
  costoSalidas:   number;
  costoExtras:    number;
  comision:       number;
  /** Gastos del periodo que no cuelgan de ninguna reserva. */
  gastosGenerales: number;
  costoTotal:     number;

  utilidad: number;
  margen:   number;

  reservas: FilaReserva[];
  gastos:   GastoCorte[];

  /** Las reservas del periodo a las que todavía no se les capturó el costo. */
  sinCosto: { cuantas: number; venta: number };
}

const entero = (v: unknown) => Math.round(Number(v) || 0);

function extrasDe(b: TourBooking): ExtraItem[] {
  const raw = (b as any).extraItems;
  return Array.isArray(raw) ? (raw as ExtraItem[]) : [];
}

/** Personas del grupo, sin sumar por tour (2 personas con 5 tours son 2). */
function personasDe(b: TourBooking): number {
  const raw = (b as any).lineItems;
  const meta = Array.isArray(raw) ? raw.find((l: any) => l?._meta) : null;
  const delMeta = Number(meta?.numPersonas) || 0;
  return delMeta > 0 ? delMeta : (b.adults || 0) + (b.children || 0);
}

/** La fecha con la que esta reserva entra (o no) al corte. */
export function fechaDeCorte(b: TourBooking, base: BaseCorte): string {
  return base === "tour" ? (b.tourDate || ymdMX(b.createdAt)) : ymdMX(b.createdAt);
}

export function filaDeReserva(b: TourBooking, costoCapturado = 0): FilaReserva {
  const venta   = entero(b.totalAmount);
  const cobrado = montoCobrado(b);

  const costoExtras = extrasDe(b).reduce((s, e) => s + costoExtraLine(e), 0);
  // La comisión se paga sobre lo que de verdad se cobró por Stripe, no sobre
  // la venta: una reserva con anticipo en efectivo no paga comisión por el resto.
  const comision = b.stripePaymentIntentId ? Math.round(cobrado * COMISION_STRIPE) : 0;

  const costoTotal = costoCapturado + costoExtras + comision;
  const utilidad   = venta - costoTotal;

  return {
    id:         b.id,
    folio:      b.confirmationNumber,
    fechaTour:  b.tourDate || "",
    fechaVenta: ymdMX(b.createdAt),
    cliente:    b.customerName,
    tour:       b.tourName,
    personas:   personasDe(b),
    guia:       ((b as any).guia || "") as string,
    venta,
    cobrado,
    porCobrar:  saldoPendiente(b),
    costoCapturado,
    costoExtras,
    comision,
    costoTotal,
    utilidad,
    margen:     venta > 0 ? Math.round((utilidad / venta) * 100) : 0,
    // La comisión no cuenta como "costo capturado": se calcula sola. Lo que se
    // pregunta aquí es si alguien escribió lo que costó operar esta salida.
    costoRegistrado: costoCapturado > 0 || costoExtras > 0,
  };
}

export async function calcEstadoResultados(
  desde: string, hasta: string, base: BaseCorte = "tour",
): Promise<EstadoResultados> {
  const todas = await prisma.tourBooking.findMany({
    where:   { status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });

  // El filtro va en memoria porque la fecha del tour es texto YYYY-MM-DD y la
  // de venta es un timestamp que hay que pasar a hora de México antes de comparar.
  const delPeriodo = todas.filter(b => {
    const f = fechaDeCorte(b, base);
    return f >= desde && f <= hasta;
  });
  const idsDelPeriodo = delPeriodo.map(b => b.id);

  // Dos consultas a propósito:
  //   · Los costos LIGADOS a las salidas del periodo entran aunque se hayan
  //     capturado otro día (el lanchero se le paga el lunes al tour del sábado).
  //   · Los gastos generales entran por su fecha.
  // Así la suma de las utilidades por reserva cuadra con la utilidad total.
  const [ligados, generales] = await Promise.all([
    idsDelPeriodo.length
      ? prisma.gastoCorte.findMany({
          where:   { reservaId: { in: idsDelPeriodo } },
          orderBy: { fecha: "asc" },
        })
      : Promise.resolve([]),
    prisma.gastoCorte.findMany({
      where:   { reservaId: null, fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const capturadoPorReserva: Record<string, number> = {};
  for (const g of ligados) {
    if (!g.reservaId) continue;
    capturadoPorReserva[g.reservaId] = (capturadoPorReserva[g.reservaId] ?? 0) + entero(g.monto);
  }

  const reservas = delPeriodo
    .map(b => filaDeReserva(b, capturadoPorReserva[b.id] ?? 0))
    .sort((a, b) => (a.fechaTour < b.fechaTour ? -1 : 1));

  const gastos = [...ligados, ...generales].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  const suma = (f: (r: FilaReserva) => number) => reservas.reduce((s, r) => s + f(r), 0);

  const ventas          = suma(r => r.venta);
  const costoSalidas    = suma(r => r.costoCapturado);
  const costoExtras     = suma(r => r.costoExtras);
  const comision        = suma(r => r.comision);
  const gastosGenerales = generales.reduce((s, g) => s + entero(g.monto), 0);
  const costoTotal      = costoSalidas + costoExtras + comision + gastosGenerales;
  const utilidad        = ventas - costoTotal;

  const pendientes = reservas.filter(r => !r.costoRegistrado);

  return {
    desde, hasta, base,
    ventas,
    cobrado:   suma(r => r.cobrado),
    porCobrar: suma(r => r.porCobrar),
    costoSalidas, costoExtras, comision, gastosGenerales, costoTotal,
    utilidad,
    margen: ventas > 0 ? Math.round((utilidad / ventas) * 100) : 0,
    reservas,
    gastos,
    sinCosto: {
      cuantas: pendientes.length,
      venta:   pendientes.reduce((s, r) => s + r.venta, 0),
    },
  };
}
