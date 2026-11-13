// Solo servidor: los costos REALES de cada salida, los que se capturan en el
// corte semanal (pedido de Manolo, 4 nov 2026: «la info de los cortes con los
// costos de cada salida es la que vas a tomar en cuenta para calcular
// utilidades y lo demás»). Se reparten exactamente como en el corte
// (`costosPorTarjeta`), reserva por reserva. Las semanas sin corte guardado no
// aparecen aquí: ahí se sigue estimando con el Cotizador.
import { prisma } from "@/lib/prisma";
import { addDaysYMD } from "@/lib/dates";
import { armarTarjetasDelCorte, costosRealesPorTarjeta, limpiarCaptura, limpiarTarjetas } from "./corteSemanal";
import { salidasDeLaSemana } from "./corteSalidas";

export interface CostoDelCorte {
  costos: number;
  incluida: boolean;
  semana: string;
  estado: string;
  /** Lo que se le cobró de extras en esta tarjeta: va al ingreso si sus costos los traen (lote 7). */
  ventaExtras: number;
}

/**
 * Los costos del corte de las tarjetas entre dos fechas, por la MISMA clave de
 * tarjeta que usa el corte (`claveDeTarjeta`, lote 7, 10 nov 2026). Solo las
 * capturadas: en un borrador, las que nadie ha tocado no están (su salida se
 * estima con el Cotizador). Un corte hecho, con lo que había al hacerlo.
 */
export async function costosDelCorte(desde: string, hasta: string): Promise<Map<string, CostoDelCorte>> {
  const out = new Map<string, CostoDelCorte>();
  const cortes = await prisma.corteSemanal.findMany({
    where: { semana: { gte: addDaysYMD(desde, -6), lte: hasta } },
    select: { semana: true, hasta: true, captura: true, estado: true, tarjetas: true },
  }).catch(() => []);
  for (const c of cortes) {
    const estado = c.estado === "borrador" ? "borrador" : "cerrado";
    const { salidas: vivas } = await salidasDeLaSemana(c.semana, c.hasta);
    const { salidas } = armarTarjetasDelCorte(vivas, limpiarTarjetas(c.tarjetas), estado);
    const por = costosRealesPorTarjeta(salidas, limpiarCaptura(c.captura));
    for (const [clave, t] of Object.entries(por)) {
      out.set(clave, { costos: t.incluida ? t.costos : 0, incluida: t.incluida, ventaExtras: t.ventaExtras, semana: c.semana, estado: c.estado });
    }
  }
  return out;
}
