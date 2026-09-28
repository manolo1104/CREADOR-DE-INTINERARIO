import { prisma } from "@/lib/prisma";
import CobrosClient from "./CobrosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cobros — Admin" };

/**
 * Cuántas personas van.
 *
 * El grupo real vive en el `_meta` de `lineItems` cuando lo hay: sumar los
 * adultos de cada tour cuenta dos personas con cinco tours como diez.
 */
function personasDe(r: { adults: number; children: number; lineItems: unknown }): number {
  const raw = r.lineItems;
  const meta = Array.isArray(raw) ? (raw as any[]).find(l => l?._meta) : null;
  const delMeta = Number(meta?.numPersonas) || 0;
  return delMeta > 0 ? delMeta : (r.adults || 0) + (r.children || 0);
}

export default async function CobrosPage() {
  // Las reservas con saldo, para poder cobrar justo lo que falta sin teclear
  // el monto a mano (que es donde se cuelan los errores de un cero).
  const reservas = await prisma.tourBooking.findMany({
    where:   { status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true, confirmationNumber: true, customerName: true,
      totalAmount: true, depositoPagado: true, stripePaymentIntentId: true,
      tourName: true, tourDate: true, adults: true, children: true, lineItems: true,
    },
  });

  const conSaldo = reservas
    .map(r => {
      const cobrado = (r.depositoPagado ?? 0) > 0
        ? r.depositoPagado
        : (r.stripePaymentIntentId ? r.totalAmount : 0);
      return {
        id: r.id,
        folio: r.confirmationNumber,
        cliente: r.customerName,
        tour: r.tourName,
        fecha: r.tourDate,
        personas: personasDe(r),
        // El total y lo ya cobrado viajan para poder calcular el anticipo aquí
        // mismo: sin ellos habría que teclear el monto a mano, que es donde se
        // cuela un cero de más.
        total: r.totalAmount,
        cobrado,
        saldo: Math.max(0, r.totalAmount - cobrado),
      };
    })
    .filter(r => r.saldo > 0);

  // Cotizaciones vivas: son las que pueden convertirse en venta con un
  // anticipo. Las aceptadas ya se cobraron y las expiradas no van a ningún lado.
  const cotizaciones = await prisma.tourQuote.findMany({
    where:   { status: { in: ["borrador", "enviada"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, quoteNumber: true, customerName: true,
      tourName: true, tourDate: true, totalAmount: true, status: true,
      adults: true, children: true, lineItems: true,
    },
  });

  return (
    <CobrosClient
      reservasConSaldo={conSaldo}
      cotizaciones={cotizaciones.map(c => ({
        id: c.id,
        folio: c.quoteNumber,
        cliente: c.customerName,
        tour: c.tourName,
        fecha: c.tourDate,
        total: c.totalAmount,
        estado: c.status,
        personas: personasDe(c),
      }))}
    />
  );
}
