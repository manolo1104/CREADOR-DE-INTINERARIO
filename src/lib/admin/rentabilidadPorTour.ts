// Puro (sin Prisma): la tabla «por tour» de Rentabilidad, para poderla probar.

export interface FilaTour {
  slug: string; codigo: string; nombre: string; salidas: number; personas: number; paxPorSalida: number;
  ingreso: number; margen: number | null; margenPct: number | null; conCostos: boolean; aMedida: boolean;
}

/** Lo que hace falta de cada salida para su fila. */
export interface SalidaParaTour {
  slug: string; codigo: string; tourNombre: string; aMedida: boolean; personas: number;
  numeros: { ingreso: number; margen: number; conCostos: boolean };
}

/**
 * Una fila por tour. El margen en pesos es la suma de los márgenes de sus
 * salidas si TODAS tienen costos; si a una le faltan, no hay margen (sería un
 * techo, no un resultado). 🔴 Antes dependía del orden (lote 7, 10 nov 2026):
 * si la salida sin costos venía primero, las siguientes volvían a sumar y el
 * tour salía con un margen parcial aunque dijera «faltan costos».
 */
export function filasPorTour(salidas: SalidaParaTour[]): FilaTour[] {
  const porSlug = new Map<string, FilaTour>();
  for (const s of salidas) {
    const f = porSlug.get(s.slug) ?? {
      slug: s.slug, codigo: s.codigo, nombre: s.aMedida ? "Salidas a medida" : s.tourNombre,
      salidas: 0, personas: 0, paxPorSalida: 0, ingreso: 0, margen: 0, margenPct: null, conCostos: true, aMedida: s.aMedida,
    };
    f.salidas++; f.personas += s.personas; f.ingreso += s.numeros.ingreso;
    if (!s.numeros.conCostos) f.conCostos = false;
    f.margen = (f.margen ?? 0) + s.numeros.margen;
    porSlug.set(s.slug, f);
  }
  return Array.from(porSlug.values()).map(f => ({
    ...f,
    margen: f.conCostos ? f.margen : null,
    paxPorSalida: Math.round((f.personas / f.salidas) * 10) / 10,
    margenPct: f.conCostos && f.margen !== null && f.ingreso > 0 ? Math.round((f.margen / f.ingreso) * 100) : null,
  })).sort((a, b) => b.ingreso - a.ingreso);
}
