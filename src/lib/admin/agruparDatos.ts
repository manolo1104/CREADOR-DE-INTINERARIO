// Solo servidor: las sugerencias de agrupar salidas con los datos del panel
// (Manolo, 4 nov 2026). Mira los próximos 45 días.
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { salidasEntre } from "./salidasDia";
import { resumirCostos } from "./costos";
import { sugerenciasDeAgrupar, type SugerenciaAgrupar } from "./agrupar";

export async function sugerenciasAgrupar(hoy: string = hoyMX(), dias = 45): Promise<SugerenciaAgrupar[]> {
  const salidas = await salidasEntre(hoy, addDaysYMD(hoy, dias));
  // Una reserva que aparece en varias salidas trae otros días (itinerario): se avisa.
  const veces = new Map<string, number>();
  for (const s of salidas) for (const f of s.folios) veces.set(f, (veces.get(f) ?? 0) + 1);
  const cupo = new Map(salidas.map(s => [s.slug, s.cupo]));
  const fijo = new Map(salidas.map(s => [s.slug, resumirCostos(s.conceptos).fijo]));
  return sugerenciasDeAgrupar(
    salidas.map(s => ({ clave: s.clave, fecha: s.fecha, slug: s.slug, tour: s.tourNombre, personas: s.personas, clientes: s.clientes, folios: s.folios, aMedida: s.aMedida, tipo: s.registro.tipo })),
    { hoy, cupoDe: slug => cupo.get(slug) ?? null, costoFijoDe: slug => (fijo.get(slug) ?? 0) > 0 ? (fijo.get(slug) as number) : null, foliosConOtrosDias: new Set(Array.from(veces).filter(([, n]) => n > 1).map(([f]) => f)) },
  );
}
