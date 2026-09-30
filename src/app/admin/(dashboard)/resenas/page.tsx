import { prisma } from "@/lib/prisma";
import { hoyMX, addDaysYMD } from "@/lib/dates";
import {
  DIAS_MAXIMOS, ESTADO_ELEGIBLE, localeDeReserva, mensajeResenaWhatsapp,
  reviewPedidaEn, reviewWhatsappEn, telefonoWhatsapp,
} from "@/lib/reviewRequest";
import ResenasClient, { type FilaResena } from "./ResenasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reseñas — Admin" };

/**
 * A quién pedirle la reseña de Google por WhatsApp: los que ya viajaron (del
 * día anterior hacia atrás) y pagaron, dentro de la misma ventana que el correo
 * automático. Arriba los que aún no tienen WhatsApp; el correo automático se
 * enseña como dato, porque por correo casi nadie reseña.
 */
export default async function ResenasPage() {
  const hoy   = hoyMX();
  const hasta = addDaysYMD(hoy, -1);
  const desde = addDaysYMD(hoy, -DIAS_MAXIMOS);

  const reservas = await prisma.tourBooking.findMany({
    where:   { status: ESTADO_ELEGIBLE, tourDate: { gte: desde, lte: hasta } },
    select:  {
      id: true, confirmationNumber: true, customerName: true, customerPhone: true,
      tourName: true, tourDate: true, lineItems: true,
    },
    orderBy: { tourDate: "desc" },
    take:    200,
  });

  const filas: FilaResena[] = reservas.map((r) => {
    const tour = (r.tourName || "").split("—")[0].trim();
    const tel  = telefonoWhatsapp(r.customerPhone);
    return {
      id:        r.id,
      folio:     r.confirmationNumber,
      nombre:    r.customerName,
      tour,
      fecha:     r.tourDate,
      waUrl:     tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensajeResenaWhatsapp(r.customerName, tour, localeDeReserva(r.lineItems)))}` : null,
      waAt:      reviewWhatsappEn(r.lineItems) ?? null,
      correoAt:  reviewPedidaEn(r.lineItems) ?? null,
    };
  });

  return <ResenasClient filas={filas} />;
}
