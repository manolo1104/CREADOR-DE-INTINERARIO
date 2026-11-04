// Solo servidor: los costos REALES de cada salida, los que se capturan en el
// corte semanal (pedido de Manolo, 4 nov 2026: «la info de los cortes con los
// costos de cada salida es la que vas a tomar en cuenta para calcular
// utilidades y lo demás»). Se reparten exactamente como en el corte
// (`costosPorTarjeta`), reserva por reserva. Las semanas sin corte guardado no
// aparecen aquí: ahí se sigue estimando con el Cotizador.
import { prisma } from "@/lib/prisma";
import { addDaysYMD } from "@/lib/dates";
import { costosPorTarjeta, limpiarCaptura } from "./corteSemanal";
import { salidasDeLaSemana } from "./corteSalidas";

export interface CostoDelCorte { costos: number; incluida: boolean; semana: string; estado: string }

/** Clave de una tarjeta del corte: el día, el tour y la reserva. */
export const claveTarjeta = (fecha: string, slug: string, reservaId: string) => `${fecha}|${slug}|${reservaId}`;

/** Los costos del corte de las tarjetas entre dos fechas (incluidas las que no entraron, con 0). */
export async function costosDelCorte(desde: string, hasta: string): Promise<Map<string, CostoDelCorte>> {
  const out = new Map<string, CostoDelCorte>();
  const cortes = await prisma.corteSemanal.findMany({
    where: { semana: { gte: addDaysYMD(desde, -6), lte: hasta } },
    select: { semana: true, hasta: true, captura: true, estado: true },
  }).catch(() => []);
  for (const c of cortes) {
    const { salidas } = await salidasDeLaSemana(c.semana, c.hasta);
    const por = costosPorTarjeta(salidas, limpiarCaptura(c.captura));
    for (const s of salidas) {
      const t = por[s.clave];
      if (!t) continue;
      const k = claveTarjeta(s.fecha, s.slug, s.reserva.id);
      const previo = out.get(k);
      // Una reserva puede tener dos tarjetas el mismo día y tour (dos renglones): se suman.
      out.set(k, { costos: (previo?.costos ?? 0) + (t.incluida ? t.costos : 0), incluida: (previo?.incluida ?? false) || t.incluida, semana: c.semana, estado: c.estado });
    }
  }
  return out;
}
