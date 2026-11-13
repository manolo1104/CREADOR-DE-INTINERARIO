import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { esDeOficina } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

/**
 * GET → los pagos con tarjeta de los últimos 30 días según STRIPE, cada uno con
 * la reserva o el viaje que le toca en el panel, y los depósitos al banco
 * (12 nov 2026: «que Erick verifique los pagos de Stripe»).
 *
 * Solo lectura. Los pagos de Stripe ya se registran solos (webhook + la
 * conciliación de cada hora); esto es para VERLO: si un pago sale «sin
 * registrar», el aviso no llegó y hay que revisarlo.
 */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion || !esDeOficina(sesion.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ sinLlave: true, pagos: [], depositos: [], saldo: null });
  }
  try {
    const { stripe } = await import("@/lib/stripe");
    const desde = Math.floor(Date.now() / 1000) - 30 * 86_400;
    const [pis, payouts, balance] = await Promise.all([
      stripe.paymentIntents.list({ created: { gte: desde }, limit: 100 }),
      stripe.payouts.list({ limit: 8 }),
      stripe.balance.retrieve(),
    ]);
    const pagados = pis.data.filter((p) => p.status === "succeeded");
    const ids = pagados.map((p) => p.id);

    // ¿Dónde quedó cada pago en el panel? Un pago puede vivir en el cobro
    // (stripeRef), en la reserva web, en una liga de pago o en el viaje CDMX.
    const [movs, reservas, ligas, apartados] = ids.length
      ? await Promise.all([
          prisma.movimiento.findMany({ where: { stripeRef: { in: ids } }, select: { stripeRef: true, reservaId: true, anulado: true } }),
          prisma.tourBooking.findMany({ where: { stripePaymentIntentId: { in: ids } }, select: { id: true, stripePaymentIntentId: true, confirmationNumber: true, customerName: true } }),
          prisma.linkPago.findMany({ where: { stripePaymentIntentId: { in: ids } }, select: { stripePaymentIntentId: true, reservaId: true, cliente: true } }),
          prisma.apartadoSalida.findMany({ where: { paymentIntentId: { in: ids } }, select: { paymentIntentId: true, nombre: true } }),
        ])
      : [[], [], [], []];
    const idsReserva = Array.from(new Set([...movs.map((m) => m.reservaId), ...ligas.map((l) => l.reservaId)].filter((x): x is string => !!x)));
    const reservasDeCobro = idsReserva.length
      ? await prisma.tourBooking.findMany({ where: { id: { in: idsReserva } }, select: { id: true, confirmationNumber: true, customerName: true } })
      : [];
    const porId = new Map([...reservas, ...reservasDeCobro].map((r) => [r.id, r]));

    const pagos = pagados.map((p) => {
      const mov = movs.find((m) => m.stripeRef === p.id);
      const res = reservas.find((r) => r.stripePaymentIntentId === p.id) ?? (mov?.reservaId ? porId.get(mov.reservaId) : undefined);
      const liga = ligas.find((l) => l.stripePaymentIntentId === p.id);
      const resLiga = liga?.reservaId ? porId.get(liga.reservaId) : undefined;
      const apartado = apartados.find((a) => a.paymentIntentId === p.id);
      const donde = res ?? resLiga
        ? { tipo: "reserva" as const, folio: (res ?? resLiga)!.confirmationNumber, cliente: (res ?? resLiga)!.customerName, id: (res ?? resLiga)!.id }
        : apartado
          ? { tipo: "viaje" as const, folio: "Viaje CDMX", cliente: apartado.nombre, id: null }
          : liga
            ? { tipo: "liga" as const, folio: "Liga de pago", cliente: liga.cliente ?? null, id: null }
            : null;
      return {
        id: p.id,
        fecha: new Date(p.created * 1000).toISOString(),
        monto: p.amount_received / 100,
        moneda: p.currency.toUpperCase(),
        descripcion: p.description ?? null,
        anulado: !!mov?.anulado,
        donde,
      };
    });

    const depositos = payouts.data.map((o) => ({
      id: o.id,
      monto: o.amount / 100,
      moneda: o.currency.toUpperCase(),
      llega: new Date(o.arrival_date * 1000).toISOString(),
      estado: o.status, // paid | pending | in_transit | canceled | failed
    }));
    const mxn = (l: { amount: number; currency: string }[]) => l.filter((x) => x.currency === "mxn").reduce((s, x) => s + x.amount, 0) / 100;
    return NextResponse.json({
      sinLlave: false,
      pagos,
      depositos,
      saldo: { disponible: mxn(balance.available), enCamino: mxn(balance.pending) },
    });
  } catch (e: any) {
    console.error("admin/stripe/resumen:", e?.message);
    return NextResponse.json({ error: "Stripe no respondió", pagos: [], depositos: [], saldo: null }, { status: 502 });
  }
}
