import { prisma } from "@/lib/prisma";
import { reservasParaLigaDeSaldo } from "@/lib/admin/linksPago";
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
  // el monto a mano (que es donde se cuelan los errores de un cero). TODAS las
  // que deben y con la regla de «cobrado» de Reservas (lote 3, 5 nov 2026):
  // antes eran las 60 más recientes y una vieja con saldo no aparecía.
  const reservas = await reservasParaLigaDeSaldo();

  const conSaldo = reservas
    .map(r => {
      return {
        id: r.id,
        folio: r.confirmationNumber,
        cliente: r.customerName,
        tour: r.tourName,
        // El slug, para pintar el código de color del recorrido igual que en el
        // resto del panel (`CodigoTour`). El nombre no sirve: cuando la reserva
        // lleva dos tours viene pegado con " + ".
        tourSlug: r.tourSlug,
        fecha: r.tourDate,
        personas: personasDe(r),
        // El total y lo ya cobrado viajan para poder calcular el anticipo aquí
        // mismo: sin ellos habría que teclear el monto a mano, que es donde se
        // cuela un cero de más.
        total: r.totalAmount,
        cobrado: r.cobrado,
        saldo: r.saldo,
      };
    });

  // Cotizaciones vivas: son las que pueden convertirse en venta con un
  // anticipo. Las aceptadas ya se cobraron y las expiradas no van a ningún lado.
  const cotizaciones = await prisma.tourQuote.findMany({
    where:   { status: { in: ["borrador", "enviada"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, quoteNumber: true, customerName: true,
      tourName: true, tourSlug: true, tourDate: true, totalAmount: true, status: true,
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
        tourSlug: c.tourSlug,
        fecha: c.tourDate,
        total: c.totalAmount,
        estado: c.status,
        personas: personasDe(c),
      }))}
    />
  );
}
