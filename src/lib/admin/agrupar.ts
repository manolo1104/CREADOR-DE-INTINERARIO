// Agrupar salidas para optimizar la logística (Manolo, 4 nov 2026: «¿cuándo
// entra el agente a hacer las recomendaciones de agrupar salidas? Ya hay dos
// salidas a Ruta Surrealista en fechas similares y no me aparece nada»).
//
// Puro: lo usan la regla automática, Agente, Rentabilidad y las pruebas. NO es
// vender salidas fijas (eso se descartó el 3 nov): es proponerle a UN grupo
// moverse a la fecha de otro del mismo tour para hacer una sola salida —
// un guía, una camioneta, un costo fijo menos.

export interface SalidaParaAgrupar {
  clave: string;
  fecha: string;
  slug: string;
  tour: string;
  personas: number;
  clientes: string[];
  folios: string[];
  aMedida: boolean;
  /** «privada»: el cliente pagó ir solo; no se le propone juntarse. */
  tipo?: string | null;
}

export interface SugerenciaAgrupar {
  slug: string;
  tour: string;
  /** La salida que se movería (el grupo más chico; si empatan, la más tardía). */
  mover: { clave: string; fecha: string; personas: number; clientes: string[]; folios: string[] };
  /** La salida a la que se junta. */
  hacia: { clave: string; fecha: string; personas: number; clientes: string[] };
  juntas: number;
  dias: number;
  /** Lo que se ahorra: un costo fijo de salida (guía, camioneta…); null si el tour no tiene costos capturados. */
  ahorro: number | null;
  /** Avisos para quien lo propone (p. ej. su reserva trae otros días). */
  avisos: string[];
}

export const AGRUPAR = {
  /** Hasta cuántos días de diferencia se propone moverse. */
  maxDias: 3,
  /** Por debajo de esto una salida es «bajo mínimo» (`MINIMO_RENTABLE`). */
  minimo: 3,
  /** Con menos anticipación ya no da tiempo de proponérselo al cliente. */
  anticipacionDias: 2,
} as const;

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

/**
 * Pares de salidas del mismo tour, a ≤ 3 días, donde al menos una va bajo el
 * mínimo y juntas caben en el cupo. Cada salida se usa una sola vez (primero
 * los pares más cercanos y que más gente juntan).
 */
export function sugerenciasDeAgrupar(
  salidas: SalidaParaAgrupar[],
  o: { hoy: string; cupoDe: (slug: string) => number | null; costoFijoDe: (slug: string) => number | null; foliosConOtrosDias?: Set<string> },
): SugerenciaAgrupar[] {
  const elegibles = salidas.filter(s => !s.aMedida && s.tipo !== "privada" && s.personas > 0 && diasEntre(o.hoy, s.fecha) >= AGRUPAR.anticipacionDias);
  const pares: { a: SalidaParaAgrupar; b: SalidaParaAgrupar; dias: number; juntas: number }[] = [];
  for (let i = 0; i < elegibles.length; i++) {
    for (let j = i + 1; j < elegibles.length; j++) {
      const a = elegibles[i], b = elegibles[j];
      if (a.slug !== b.slug || a.fecha === b.fecha) continue;
      const dias = Math.abs(diasEntre(a.fecha, b.fecha));
      const juntas = a.personas + b.personas;
      const cupo = o.cupoDe(a.slug);
      if (dias > AGRUPAR.maxDias || Math.min(a.personas, b.personas) >= AGRUPAR.minimo || (cupo !== null && juntas > cupo)) continue;
      pares.push({ a, b, dias, juntas });
    }
  }
  pares.sort((x, y) => x.dias - y.dias || y.juntas - x.juntas || x.a.fecha.localeCompare(y.a.fecha));
  const usadas = new Set<string>();
  const out: SugerenciaAgrupar[] = [];
  for (const { a, b, dias, juntas } of pares) {
    if (usadas.has(a.clave) || usadas.has(b.clave)) continue;
    usadas.add(a.clave); usadas.add(b.clave);
    // Se mueve el grupo más chico; si empatan, el de la fecha más tardía (se adelanta).
    const [mover, hacia] = a.personas < b.personas ? [a, b] : b.personas < a.personas ? [b, a] : a.fecha > b.fecha ? [a, b] : [b, a];
    const avisos: string[] = [];
    if (mover.folios.some(f => o.foliosConOtrosDias?.has(f))) avisos.push("Su reserva trae otros días: revisa que el cambio no le choque con el resto del itinerario.");
    out.push({
      slug: a.slug, tour: a.tour, dias, juntas,
      mover: { clave: mover.clave, fecha: mover.fecha, personas: mover.personas, clientes: mover.clientes, folios: mover.folios },
      hacia: { clave: hacia.clave, fecha: hacia.fecha, personas: hacia.personas, clientes: hacia.clientes },
      ahorro: o.costoFijoDe(a.slug), avisos,
    });
  }
  return out.sort((x, y) => x.mover.fecha.localeCompare(y.mover.fecha));
}

const diaCorto = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(/\./g, "");

/** El seguimiento que se le deja a Operación para proponerlo al cliente. */
export function tituloAgrupar(s: SugerenciaAgrupar): string {
  return `Juntar salidas: proponer a ${s.mover.clientes.join(", ")} (${s.mover.personas} pax) pasar su ${s.tour.split(" — ")[0]} del ${diaCorto(s.mover.fecha)} al ${diaCorto(s.hacia.fecha)}, con ${s.hacia.clientes.join(", ")}: ${s.juntas} pax en una sola salida${s.ahorro ? ` (ahorro ~$${s.ahorro.toLocaleString("es-MX")})` : ""}`;
}
