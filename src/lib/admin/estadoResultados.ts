// El corte del negocio: qué se vendió, qué costó y qué quedó.
//
// Regla que se acordó y que cambia cómo se lee todo: **solo cuenta como costo
// lo que de verdad se registró**. Nada se estima. Si a una reserva no se le
// capturó el pago al proveedor, su costo va en cero y la reserva se reporta
// aparte, en `sinCosto`, para que nadie confunda "no lo he capturado" con
// "no me costó". La utilidad de un corte con reservas sin capturar es un techo,
// no un resultado.

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
  costoProveedor: number;
  costoExtras:    number;
  comision:       number;
  costoTotal:     number;
  utilidad:       number;
  margen:         number;  // % sobre la venta
  /** false = a esta reserva nadie le ha capturado el costo todavía. */
  costoRegistrado: boolean;
}

export interface EstadoResultados {
  desde: string;
  hasta: string;
  base:  BaseCorte;

  ventas:    number;
  cobrado:   number;
  porCobrar: number;

  costoProveedor: number;
  costoExtras:    number;
  comision:       number;
  gastosManuales: number;
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

export function filaDeReserva(b: TourBooking): FilaReserva {
  const venta   = entero(b.totalAmount);
  const cobrado = montoCobrado(b);

  const costoProveedor = entero((b as any).pagoProveedorMonto);
  const costoExtras    = extrasDe(b).reduce((s, e) => s + costoExtraLine(e), 0);
  // La comisión se paga sobre lo que de verdad se cobró por Stripe, no sobre
  // la venta: una reserva con anticipo en efectivo no paga comisión por el resto.
  const comision = b.stripePaymentIntentId ? Math.round(cobrado * COMISION_STRIPE) : 0;

  const costoTotal = costoProveedor + costoExtras + comision;
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
    costoProveedor,
    costoExtras,
    comision,
    costoTotal,
    utilidad,
    margen:     venta > 0 ? Math.round((utilidad / venta) * 100) : 0,
    // La comisión no cuenta como "costo capturado": sale sola. Lo que se
    // pregunta aquí es si alguien registró lo que se le pagó al proveedor.
    costoRegistrado: costoProveedor > 0 || costoExtras > 0,
  };
}

export async function calcEstadoResultados(
  desde: string, hasta: string, base: BaseCorte = "tour",
): Promise<EstadoResultados> {
  const [todas, gastos] = await Promise.all([
    prisma.tourBooking.findMany({
      where:   { status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gastoCorte.findMany({
      where:   { fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  // El filtro va en memoria porque la fecha del tour es texto YYYY-MM-DD y la
  // de venta es un timestamp que hay que pasar a hora de México antes de comparar.
  const reservas = todas
    .filter(b => {
      const f = fechaDeCorte(b, base);
      return f >= desde && f <= hasta;
    })
    .map(filaDeReserva)
    .sort((a, b) => (a.fechaTour < b.fechaTour ? -1 : 1));

  const suma = (f: (r: FilaReserva) => number) => reservas.reduce((s, r) => s + f(r), 0);

  const ventas         = suma(r => r.venta);
  const costoProveedor = suma(r => r.costoProveedor);
  const costoExtras    = suma(r => r.costoExtras);
  const comision       = suma(r => r.comision);
  const gastosManuales = gastos.reduce((s, g) => s + entero(g.monto), 0);
  const costoTotal     = costoProveedor + costoExtras + comision + gastosManuales;
  const utilidad       = ventas - costoTotal;

  const pendientes = reservas.filter(r => !r.costoRegistrado);

  return {
    desde, hasta, base,
    ventas,
    cobrado:   suma(r => r.cobrado),
    porCobrar: suma(r => r.porCobrar),
    costoProveedor, costoExtras, comision, gastosManuales, costoTotal,
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
