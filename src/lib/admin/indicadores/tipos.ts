// Los tipos del sistema de indicadores (rediseño del panel, 4 nov 2026).
//
// Cada KPI del documento «Plan As Is / To Be» tiene UNA fórmula y UNA fuente
// (regla del documento). Aquí solo viven las formas; las definiciones están en
// `catalogo.ts` y los cálculos, puros, en cada archivo por frente.

export type Frente = "demanda" | "comercial" | "operacion" | "producto" | "precio" | "servicio" | "datos";

export type Fuente =
  | "GA4" | "Search Console" | "Panel" | "CRM" | "Bandeja" | "Corte semanal" | "Bitácora"
  | "Encuesta" | "Google (lectura a mano)" | "Revisión del jueves" | "Eventos del sitio" | "Cotizador";

/** pct = 0–100 · pesos = MXN · num = conteo · dec = decimal (personas por salida) · porMil = por cada 1,000. */
export type Unidad = "pct" | "pesos" | "num" | "dec" | "porMil";

/**
 * Las TASAS y los PROMEDIOS se comparan contra su meta en cualquier periodo.
 * Los CONTEOS y MONTOS solo en el periodo de su meta («43 reservas» es por mes).
 */
export type TipoKpi = "tasa" | "promedio" | "conteo" | "monto";

/** subir = más es mejor · bajar = menos es mejor · info = sin meta (informativo). */
export type Direccion = "subir" | "bajar" | "info";

/** Qué tanto creerle al número. Se pinta junto al valor, con su porqué. */
export type Calidad = "exacto" | "aproximado" | "sin-dato";

export type TipoPeriodo = "semana" | "mes" | "28d" | "90d";

export interface Meta { valor: number; texto: string }

export interface DefKpi {
  clave: string;
  frente: Frente;
  nombre: string;
  /** La fórmula en palabras, tal como la lee Manolo en la pantalla. */
  formula: string;
  fuente: Fuente;
  frecuencia: "diaria" | "semanal" | "mensual";
  unidad: Unidad;
  tipo: TipoKpi;
  direccion: Direccion;
  /** La línea base del documento: el texto y, si es un número, su valor. */
  base: { texto: string; valor?: number };
  /** Meta al 31 ene 2027. */
  meta?: Meta;
  /** Meta a Semana Santa 2027 (21–28 mar). */
  metaSS?: Meta;
  /** Solo conteos y montos: en qué periodo vale la meta. */
  periodoMeta?: TipoPeriodo;
  /** La pestaña donde vive. */
  pagina: string;
  /** Del 1 al 7: el objetivo del documento al que responde, si es su indicador principal. */
  objetivo?: number;
}

export interface ValorKpi {
  clave: string;
  /** En la unidad del KPI; null = no hay dato en el periodo. */
  valor: number | null;
  /** «23 de 76 leads», «$37,730 de ventas en 1 corte». */
  detalle?: string;
  calidad: Calidad;
  /** Por qué es aproximado o no hay dato, o una aclaración corta. */
  nota?: string;
  /** Cohortes con menos de 14 días: el número todavía puede subir. */
  preliminar?: boolean;
}

export interface Periodo {
  tipo: TipoPeriodo;
  /** YYYY-MM-DD, inclusive, hora de México. */
  desde: string;
  hasta: string;
  /** «Semana 45 · 3–9 nov», «noviembre de 2026», «28 días al 3 nov». */
  etiqueta: string;
  /** Para las tendencias: «3 nov», «nov», «al 3 nov». */
  corta: string;
  /** La fecha que identifica al periodo en la URL (?f=). */
  ancla: string;
  anterior: string | null;
  siguiente: string | null;
  /** Termina después de hoy (semana o mes en curso). */
  enCurso: boolean;
}

/** Una serie para la tendencia: el valor de cada periodo, del más viejo al actual. */
export interface PuntoSerie { corta: string; valor: number | null }
