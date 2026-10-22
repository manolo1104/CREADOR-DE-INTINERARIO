/**
 * Tipos y constantes de la pestaña Análisis que también usa la PANTALLA
 * (21 oct 2026). Vive aparte de `analisis.ts` y `ga4Datos.ts` porque esos
 * leen la base y la API de Google: importarlos desde un componente de cliente
 * metería Prisma en el navegador.
 */

export type CanalGA4 = "seo" | "maps" | "directo" | "redes" | "referidos" | "publicidad" | "correo" | "otro";

export const ETIQUETA_CANAL: Record<CanalGA4, string> = {
  seo:        "SEO (Google orgánico)",
  maps:       "Google Maps",
  directo:    "Directo",
  redes:      "Redes sociales",
  referidos:  "Otros sitios",
  publicidad: "Publicidad",
  correo:     "Correo",
  otro:       "Otro / sin asignar",
};

export interface FilaCanal { canal: CanalGA4; sesiones: number; compras: number; ingresos: number }

export type DatosGA4 =
  | { ok: true; filas: FilaCanal[]; dias: number; leidoEn: string }
  | { ok: false; motivo: string };


export type Dimension = "tipoGrupo" | "motivo" | "ciudad" | "primeraVez";

export const DIMENSIONES: { clave: Dimension; etiqueta: string }[] = [
  { clave: "tipoGrupo",  etiqueta: "Con quién viajan" },
  { clave: "motivo",     etiqueta: "Motivo del viaje" },
  { clave: "ciudad",     etiqueta: "Ciudad de origen" },
  { clave: "primeraVez", etiqueta: "Primera vez en la Huasteca" },
];

/** Con menos reservas que esto, un promedio es anécdota: se pinta en gris. */
export const MINIMO_CONFIABLE = 5;

export interface FilaSegmento {
  clave: string;
  etiqueta: string;
  reservas: number;
  pct: number;
  ventas: number;
  ticket: number;
  personas: number;
  /** Margen estimado promedio por reserva (solo las que tienen costos). */
  margen: number | null;
  margenPct: number | null;
  conCosto: number;
  tourTop: string;
  canalTop: string;
  pocos: boolean;
}

export interface FilaCanalDeclarado {
  clave: string;
  etiqueta: string;
  reservas: number;
  pct: number;
  ventas: number;
  pctVentas: number;
  /** Por dónde reservaron los que llegaron por este canal. */
  porOrigen: { origen: string; reservas: number }[];
}

export interface Analisis {
  dias: number | null;
  reservas: number;
  conCheckin: number;
  ventas: number;
  segmentos: Record<Dimension, FilaSegmento[]>;
  /** Cuál deja más margen por reserva (o más ticket si no hay costos), entre los confiables. */
  mejor: Partial<Record<Dimension, string>>;
  canales: FilaCanalDeclarado[];
  ga4: DatosGA4;
}

