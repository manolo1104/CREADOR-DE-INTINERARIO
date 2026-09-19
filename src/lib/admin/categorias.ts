// Las categorías con las que se clasifica cada peso que sale.
//
// Viven en código y no en la base a propósito: son el idioma del negocio, no
// datos del negocio. Cambiarlas es una decisión, no una captura.

export type TipoMovimiento = "costo" | "gasto" | "cobro" | "reembolso" | "distribucion";

export const TIPO_ETIQUETA: Record<TipoMovimiento, string> = {
  costo:        "Costo del tour",
  gasto:        "Gasto general",
  cobro:        "Cobro a cliente",
  reembolso:    "Reembolso a socio",
  distribucion: "Reparto de utilidad",
};

export interface Categoria {
  id: string;
  label: string;
  /** En qué parte del estado de resultados cae. */
  grupo: "directo" | "general";
}

/** Costos que pertenecen a una salida concreta. Van arriba de la utilidad bruta. */
export const CATEGORIAS_DIRECTAS: Categoria[] = [
  { id: "guia",       label: "Guía",                  grupo: "directo" },
  { id: "vehiculo",   label: "Renta de vehículo",     grupo: "directo" },
  { id: "gasolina",   label: "Gasolina y casetas",    grupo: "directo" },
  { id: "entrada",    label: "Entradas y accesos",    grupo: "directo" },
  { id: "actividad",  label: "Actividades",           grupo: "directo" },
  { id: "alimentos",  label: "Alimentos",             grupo: "directo" },
  { id: "comision",   label: "Comisiones",            grupo: "directo" },
  { id: "otroDirecto",label: "Otro costo del tour",   grupo: "directo" },
];

/** Gastos de la empresa. Van debajo de la utilidad bruta y NUNCA se cuelgan de una reserva. */
export const CATEGORIAS_GENERALES: Categoria[] = [
  { id: "marketing",      label: "Marketing y publicidad", grupo: "general" },
  { id: "software",       label: "Software y suscripciones", grupo: "general" },
  { id: "hosting",        label: "Hosting y dominios",     grupo: "general" },
  { id: "administracion", label: "Administración",         grupo: "general" },
  { id: "contabilidad",   label: "Contabilidad",           grupo: "general" },
  { id: "telefonia",      label: "Telefonía e internet",   grupo: "general" },
  { id: "otroGeneral",    label: "Otro gasto general",     grupo: "general" },
];

export const CATEGORIAS = [...CATEGORIAS_DIRECTAS, ...CATEGORIAS_GENERALES];

const POR_ID: Record<string, Categoria> = {};
for (const c of CATEGORIAS) POR_ID[c.id] = c;

export function categoriaDe(id: string | null | undefined): Categoria {
  return POR_ID[id ?? ""] ?? { id: "otro", label: "Sin clasificar", grupo: "general" };
}

/** Una categoría directa mal usada en un gasto general (o al revés) descuadra el reporte. */
export function esDirecta(id: string | null | undefined): boolean {
  return categoriaDe(id).grupo === "directo";
}

export const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "stripe", "otro"] as const;
export const PERIODICIDADES = ["mensual", "trimestral", "anual"] as const;

/**
 * A qué categoría pertenece un concepto del Cotizador.
 *
 * Los costos capturados en el Cotizador son texto libre ("Lanchero", "Camioneta",
 * "Desayuno") y no traen categoría. Sin esto, todo el costo estimado cae en una
 * bolsa llamada "otro" y el estado de resultados deja de decir en qué se va el
 * dinero, que es justo para lo que se hizo.
 */
export function categoriaPorNombre(concepto: string): string {
  const t = concepto.toLowerCase();
  if (/gu[íi]a|guide/.test(t))                               return "guia";
  if (/veh[íi]culo|camioneta|transporte|traslado|van/.test(t)) return "vehiculo";
  if (/gasolina|caseta|combustible|diesel|peaje/.test(t))     return "gasolina";
  if (/entrada|acceso|parque|embarcadero|estacionamiento/.test(t)) return "entrada";
  if (/comida|desayuno|aliment|lunch|refrig/.test(t))         return "alimentos";
  if (/lancha|canoa|rappel|tirolesa|equipo|actividad|seguro/.test(t)) return "actividad";
  if (/comisi[óo]n/.test(t))                                  return "comision";
  return "otroDirecto";
}
