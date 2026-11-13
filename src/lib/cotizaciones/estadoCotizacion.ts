// Lo que el cron de seguimiento, «Enviar por correo» y el PATCH del panel le
// preguntan a la base sobre las reservas de una cotización (lote 4 de la
// auditoría, 5 nov 2026). Las reglas viven en `reglasEnvio.ts` (puras, con
// sus pruebas); aquí solo las consultas.

import type { Prisma, TourQuote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mismoCorreo } from "@/lib/estaDeBaja";
import { ESTADOS_RESERVA_MUERTA, reservaPosterior, type ReservaCandidata } from "./reglasEnvio";

const vivas: Prisma.TourBookingWhereInput = { status: { notIn: [...ESTADOS_RESERVA_MUERTA] } };

/** El folio de reserva que la conversión dejó en el `_meta` de `packageItems`. */
function folioEnMeta(packageItems: unknown): string | null {
  if (!Array.isArray(packageItems)) return null;
  const m = packageItems.find((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true) as { reservaFolio?: unknown } | undefined;
  return typeof m?.reservaFolio === "string" && m.reservaFolio ? m.reservaFolio : null;
}

/** Las reservas que salieron de ESTA cotización: por `cotizacionId` o, en las de antes, por `cotizacionOrigen`. */
const deLaCotizacion = (q: Pick<TourQuote, "id" | "quoteNumber">): Prisma.TourBookingWhereInput[] => [
  { cotizacionId: q.id },
  { lineItems: { array_contains: [{ cotizacionOrigen: q.quoteNumber }] } },
];

/**
 * La reserva VIVA (ni cancelada ni borrador) que salió de esta cotización, o
 * null: la de su folio en el `_meta`, la que guarda su `cotizacionId` o la que
 * guarda su `cotizacionOrigen`.
 */
export async function reservaVivaDeCotizacion(
  q: Pick<TourQuote, "id" | "quoteNumber" | "packageItems">,
): Promise<{ id: string; confirmationNumber: string } | null> {
  const folio = folioEnMeta(q.packageItems);
  return prisma.tourBooking.findFirst({
    where:   { ...vivas, OR: [...(folio ? [{ confirmationNumber: folio }] : []), ...deLaCotizacion(q)] },
    orderBy: { createdAt: "asc" },
    select:  { id: true, confirmationNumber: true },
  });
}

/**
 * La liga de pago viva de la cotización (la más reciente), si tiene. Los
 * correos la ofrecen cuando el carrito no cobraría lo cotizado (`cobraComoLaWeb`).
 */
export async function ligaVivaDeCotizacion(quoteId: string): Promise<{ url: string; monto: number } | null> {
  return prisma.linkPago.findFirst({
    where:   { cotizacionId: quoteId, estado: "activo" },
    orderBy: { createdAt: "desc" },
    select:  { url: true, monto: true },
  });
}

const CAMPOS = { cotizacionId: true, lineItems: true, status: true, customerEmail: true, createdAt: true } as const;

/**
 * Qué hace el cron con esta cotización «enviada»: "aceptar" (su reserva),
 * "pausar" (otra reserva del mismo correo hecha después de `desde`) o null.
 * La regla es `reservaPosterior`; aquí solo se buscan las dos candidatas.
 */
export async function revisarReservaPosterior(
  q: Pick<TourQuote, "id" | "quoteNumber" | "customerEmail">,
  desde: Date,
): Promise<"aceptar" | "pausar" | null> {
  const candidatas: ReservaCandidata[] = [];
  const propia = await prisma.tourBooking.findFirst({ where: { ...vivas, OR: deLaCotizacion(q) }, select: CAMPOS });
  if (propia) candidatas.push(propia);
  else if (q.customerEmail) {
    const otra = await prisma.tourBooking.findFirst({
      where:  { ...vivas, customerEmail: mismoCorreo(q.customerEmail), createdAt: { gte: desde } },
      select: CAMPOS,
    });
    if (otra) candidatas.push(otra);
  }
  return reservaPosterior(q, desde, candidatas);
}
