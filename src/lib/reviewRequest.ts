import type { Locale } from "./i18n/config";

/**
 * Petición de reseña después del tour.
 *
 * Las 492 reseñas de Google están casi todas en español: un visitante
 * estadounidense que llega al sitio no ve a nadie como él y decide que esto no
 * es para él, por bueno que sea el copy. Este módulo cierra ese hueco pidiendo
 * la reseña al cliente que reservó en inglés, en inglés, cuando el recuerdo
 * está fresco.
 *
 * ⚠️ NO se añade columna a `TourBooking`. Railway aplica el esquema al arrancar
 * (`prisma db push` en `npm run start`), así que una columna nueva no se puede
 * probar en local sin tocar la base de producción. Se usa el patrón `_meta` que
 * ya lleva el idioma dentro de `lineItems`.
 */

/** Enlace corto del Perfil de Empresa: abre la ventana de reseña ya lista. */
export const GOOGLE_REVIEW_URL = "https://g.page/r/CZg8hdQa_GI9EBM/review";

/**
 * Días tras el tour antes de pedir la reseña. Dos: ya llegó a casa y descargó
 * las fotos, pero todavía no se le pasó el entusiasmo.
 */
export const DIAS_ESPERA = 2;

/** Solo se le pide reseña a quien efectivamente pagó y fue. */
export const ESTADO_ELEGIBLE = "paid";

interface MetaLinea {
  _meta?: boolean;
  locale?: string;
  /** ISO del momento en que se pidió la reseña. Sin esto se pediría en cada corrida. */
  reviewRequestedAt?: string;
}

type LineItems = unknown;

function metaDe(lineItems: LineItems): MetaLinea | undefined {
  if (!Array.isArray(lineItems)) return undefined;
  return lineItems.find((l): l is MetaLinea => !!l && typeof l === "object" && (l as MetaLinea)._meta === true);
}

/** El idioma en que reservó el cliente. Por omisión, español. */
export function localeDeReserva(lineItems: LineItems): Locale {
  return metaDe(lineItems)?.locale === "en" ? "en" : "es";
}

/** Si ya se le pidió reseña, la fecha en que se hizo. */
export function reviewPedidaEn(lineItems: LineItems): string | undefined {
  return metaDe(lineItems)?.reviewRequestedAt;
}

/**
 * Devuelve `lineItems` con la marca de "reseña pedida" puesta, sin perder nada
 * de lo que ya llevaba. Si no había objeto `_meta`, lo crea.
 */
export function marcarReviewPedida(lineItems: LineItems, cuando = new Date()): unknown[] {
  const iso = cuando.toISOString();
  const base = Array.isArray(lineItems) ? [...lineItems] : [];
  const i = base.findIndex((l) => !!l && typeof l === "object" && (l as MetaLinea)._meta === true);
  if (i === -1) return [...base, { _meta: true, reviewRequestedAt: iso }];
  base[i] = { ...(base[i] as MetaLinea), reviewRequestedAt: iso };
  return base;
}

/**
 * La fecha límite (`YYYY-MM-DD`): un tour es candidato si su `tourDate` es
 * anterior o igual a esto.
 *
 * `tourDate` es String ISO en el esquema, no DateTime, así que la comparación
 * lexicográfica de Prisma es exacta — el mismo criterio que usa
 * `cartFollowUp.ts`. Se calcula sobre la hora de México para no pedir la reseña
 * un día antes de tiempo a quien viajó ayer.
 */
export function fechaLimiteResena(diasEspera = DIAS_ESPERA): string {
  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoyMX.split("-").map(Number);
  const limite = new Date(y, m - 1, d - diasEspera);
  const mm = String(limite.getMonth() + 1).padStart(2, "0");
  const dd = String(limite.getDate()).padStart(2, "0");
  return `${limite.getFullYear()}-${mm}-${dd}`;
}

/**
 * No se persigue a nadie por un tour de hace medio año: pedir una reseña de
 * algo que ya no recuerda bien invita a una reseña tibia, que hace más daño que
 * ninguna.
 */
export const DIAS_MAXIMOS = 45;

export function fechaMinimaResena(diasMaximos = DIAS_MAXIMOS): string {
  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoyMX.split("-").map(Number);
  const min = new Date(y, m - 1, d - diasMaximos);
  const mm = String(min.getMonth() + 1).padStart(2, "0");
  const dd = String(min.getDate()).padStart(2, "0");
  return `${min.getFullYear()}-${mm}-${dd}`;
}
