// Solo servidor: lee la base.
import { prisma } from "./prisma";
import type { Paquete } from "./paquetes";

/**
 * Los lugares de un paquete de evento (Xantolo 2026: 8 lugares, 4 parejas).
 *
 * Se cuentan de DOS fuentes, porque se vende por dos puertas:
 *  - en línea: las reservas del sitio quedan en `TourBooking` con el slug del
 *    paquete; se cuentan solas (todas menos las canceladas).
 *  - por WhatsApp: el panel no guarda un paquete con su slug, así que el equipo
 *    anota a mano cuántas PERSONAS vendió por fuera (control en el tablero).
 *
 * Lo que se anuncia («quedan 6 lugares») y lo que deja pagar salen de aquí. Es
 * escasez real: si el número se queda viejo, se vende de más.
 */

export interface LugaresPaquete {
  cupo:     number;
  enLinea:  number;
  manual:   number;
  vendidos: number;
  libres:   number;
}

/** La clave de `Config` donde vive lo vendido por fuera del sitio. */
export function claveCupoManual(slug: string): string {
  return `cupo-manual:${slug}`;
}

/** Personas vendidas por fuera del sitio (lo que anota el equipo). */
export async function vendidosManual(slug: string): Promise<number> {
  const fila = await prisma.config.findUnique({ where: { key: claveCupoManual(slug) } });
  const n = Math.floor(Number(fila?.value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Personas vendidas en el sitio: reservas con el slug del paquete, sin canceladas. */
export async function vendidosEnLinea(slug: string): Promise<number> {
  const filas = await prisma.tourBooking.findMany({
    where:  { tourSlug: slug, status: { not: "cancelled" } },
    select: { adults: true, children: true },
  });
  return filas.reduce((s, f) => s + (f.adults || 0) + (f.children || 0), 0);
}

/** El estado del cupo. `null` si el paquete no tiene cupo (no es de evento). */
export async function lugaresDePaquete(p: Pick<Paquete, "slug" | "evento">): Promise<LugaresPaquete | null> {
  if (!p.evento) return null;
  const [enLinea, manual] = await Promise.all([vendidosEnLinea(p.slug), vendidosManual(p.slug)]);
  const vendidos = enLinea + manual;
  return { cupo: p.evento.cupo, enLinea, manual, vendidos, libres: Math.max(0, p.evento.cupo - vendidos) };
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
