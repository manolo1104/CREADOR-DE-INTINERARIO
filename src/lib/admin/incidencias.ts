// La bitácora de incidencias de una salida (4 nov 2026). Puro.
//
// Plan As Is / To Be, Operación: «Incidencias: no se registran → bitácora de
// incidencias por salida, con causa y acción». Alimenta el KPI «Salidas con
// incidencia» (meta: menos de 5 %). El guía también puede anotar: es quien está
// ahí cuando pasa. Se guarda en `Salida.incidencias` (Json), como el checklist.

export const TIPOS_INCIDENCIA = [
  { clave: "recogida", etiqueta: "Recogida tarde o fallida" },
  { clave: "guia", etiqueta: "Guía (retraso, no avisó, cambio)" },
  { clave: "proveedor", etiqueta: "Proveedor (lancha, comida, entrada)" },
  { clave: "vehiculo", etiqueta: "Vehículo" },
  { clave: "clima", etiqueta: "Clima o nivel del río" },
  { clave: "cliente", etiqueta: "Cliente (tarde, no llegó, queja)" },
  { clave: "seguridad", etiqueta: "Lesión o seguridad" },
  { clave: "otro", etiqueta: "Otro" },
] as const;

export const GRAVEDADES = [
  { clave: "leve", etiqueta: "Leve" },
  { clave: "media", etiqueta: "Media" },
  { clave: "grave", etiqueta: "Grave" },
] as const;

export type TipoIncidencia = (typeof TIPOS_INCIDENCIA)[number]["clave"];
export type Gravedad = (typeof GRAVEDADES)[number]["clave"];

export interface Incidencia {
  id: string;
  tipo: TipoIncidencia;
  gravedad: Gravedad;
  /** Qué pasó y por qué. */
  causa: string;
  /** Qué se hizo para resolverlo o para que no se repita. */
  accion: string;
  por: string;
  /** ISO */
  en: string;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const esTipo = (v: unknown): v is TipoIncidencia => TIPOS_INCIDENCIA.some(t => t.clave === v);
const esGravedad = (v: unknown): v is Gravedad => GRAVEDADES.some(g => g.clave === v);

/** Lo guardado, limpio: lo que no tenga forma de incidencia se descarta. */
export function limpiarIncidencias(raw: unknown): Incidencia[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x: any) => (x && typeof x === "object" && typeof x.id === "string" && esTipo(x.tipo) && texto(x.causa, 600))
    ? [{ id: x.id, tipo: x.tipo, gravedad: esGravedad(x.gravedad) ? x.gravedad : "leve", causa: texto(x.causa, 600), accion: texto(x.accion, 600), por: texto(x.por, 60) || "—", en: texto(x.en, 40) }]
    : []);
}

/** Valida lo que manda la pantalla y le pone quién y cuándo. */
export function nuevaIncidencia(body: unknown, por: string, ahora: Date, id: string): Incidencia | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!esTipo(b.tipo)) return { error: "Elige el tipo de incidencia." };
  const causa = texto(b.causa, 600);
  if (causa.length < 3) return { error: "Escribe qué pasó." };
  return { id, tipo: b.tipo, gravedad: esGravedad(b.gravedad) ? b.gravedad : "leve", causa, accion: texto(b.accion, 600), por, en: ahora.toISOString() };
}

export const etiquetaTipo = (t: string) => TIPOS_INCIDENCIA.find(x => x.clave === t)?.etiqueta ?? t;
export const etiquetaGravedad = (g: string) => GRAVEDADES.find(x => x.clave === g)?.etiqueta ?? g;
