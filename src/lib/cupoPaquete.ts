// Solo servidor: lee la base.
import { prisma } from "./prisma";
import type { Paquete } from "./paquetes";
import { leerManual, resumirLugares, type LugaresPaquete, type ManualCupo, type UnidadCupo } from "./cupoEvento";

export type { LugaresPaquete } from "./cupoEvento";

/**
 * Los lugares de un evento: el paquete Xantolo con hotel (4 cuartos) y las dos
 * noches de Xantolo sin hotel (12 personas cada una).
 *
 * Se cuentan de DOS fuentes, porque se vende por dos puertas:
 *  - en línea: las reservas del sitio quedan en `TourBooking` con el slug del
 *    evento; se cuentan solas (todas menos las canceladas).
 *  - por WhatsApp: el panel no guarda el evento con su slug, así que el equipo
 *    anota a mano lo que vendió por fuera (control en el tablero).
 *
 * Lo que se anuncia («quedan 3 de 4 cuartos») y lo que deja pagar salen de
 * aquí. Es escasez real: si el número se queda viejo, se vende de más. La
 * cuenta en sí vive en `cupoEvento.ts`, que no toca la base.
 */

/** La clave de `Config` donde vive lo vendido por fuera del sitio. */
export function claveCupoManual(slug: string): string {
  return `cupo-manual:${slug}`;
}

/** Lo vendido por fuera del sitio (lo que anota el equipo). */
export async function vendidosManual(slug: string, unidad: UnidadCupo): Promise<ManualCupo> {
  const fila = await prisma.config.findUnique({ where: { key: claveCupoManual(slug) } });
  return leerManual(fila?.value, unidad);
}

/** Reservas del sitio con el slug del evento, sin canceladas. */
async function reservasEnLinea(slug: string) {
  return prisma.tourBooking.findMany({
    where:  { tourSlug: slug, status: { not: "cancelled" } },
    select: { adults: true, children: true },
  });
}

/** El estado del cupo. `null` si el paquete no tiene cupo (no es de evento). */
export async function lugaresDePaquete(p: Pick<Paquete, "slug" | "evento">): Promise<LugaresPaquete | null> {
  if (!p.evento) return null;
  const [reservas, manual] = await Promise.all([reservasEnLinea(p.slug), vendidosManual(p.slug, p.evento.unidad)]);
  return resumirLugares(p.evento, reservas, manual);
}

/**
 * Lo mismo, pero sin tumbar la página si la base no contesta: la landing y el
 * artículo se siguen viendo y solo dejan de anunciar cuántos quedan. El pago
 * NO usa esta: si no se puede contar, no se cobra.
 */
export async function lugaresDePaqueteSeguro(p: Pick<Paquete, "slug" | "evento">): Promise<LugaresPaquete | null> {
  try {
    return await lugaresDePaquete(p);
  } catch {
    return null;
  }
}
