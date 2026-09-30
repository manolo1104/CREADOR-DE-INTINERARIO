import type { Locale } from "./i18n/config";

/**
 * Petición de reseña después del tour.
 *
 * Las 161 reseñas de Google están casi todas en español: un visitante
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
  /** ISO del momento en que alguien del equipo la pidió por WhatsApp desde el panel. */
  reviewWhatsappAt?: string;
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

// ── Petición por WhatsApp (desde el panel) ──────────────────────────────────
// 🔴 El correo automático se le mandó a 19 clientes (sep 2026) y la ficha de
// Google siguió en 161 reseñas: por correo no reseña casi nadie. En México la
// reseña se gana por WhatsApp, con el nombre de quien atendió y el mismo día
// que regresaron. El panel deja mandarla con un clic y lleva la cuenta.

/** Si ya se le pidió por WhatsApp, la fecha en que se hizo. */
export function reviewWhatsappEn(lineItems: LineItems): string | undefined {
  return metaDe(lineItems)?.reviewWhatsappAt;
}

/** `lineItems` con la marca de «pedida por WhatsApp», sin perder nada más. */
export function marcarReviewWhatsapp(lineItems: LineItems, cuando = new Date()): unknown[] {
  const iso = cuando.toISOString();
  const base = Array.isArray(lineItems) ? [...lineItems] : [];
  const i = base.findIndex((l) => !!l && typeof l === "object" && (l as MetaLinea)._meta === true);
  if (i === -1) return [...base, { _meta: true, reviewWhatsappAt: iso }];
  base[i] = { ...(base[i] as MetaLinea), reviewWhatsappAt: iso };
  return base;
}

/**
 * El teléfono en formato de wa.me (solo dígitos, con lada de país). Un número
 * mexicano de 10 dígitos lleva el 52 delante; si ya trae lada, se respeta.
 */
export function telefonoWhatsapp(tel: string | null | undefined): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  // El «1» de celular que México quitó en 2020 («+52 1 489…»).
  if (d.length === 13 && d.startsWith("521")) return `52${d.slice(3)}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

/** Títulos que la gente escribe antes del nombre: «ING. Juan Enrique C.». */
const TITULOS = new Set(["ing", "lic", "dr", "dra", "sr", "sra", "srta", "mtro", "mtra", "arq", "prof", "c", "cp"]);

/** «ING. Juan Enrique C.» → «Juan» · «ITZEL OTERO» → «Itzel». */
export function nombreDePila(nombre: string): string {
  const palabra = nombre
    .trim()
    .split(/\s+/)
    .find((p) => p && !TITULOS.has(p.toLowerCase().replace(/\./g, "")));
  if (!palabra) return "";
  return palabra === palabra.toUpperCase()
    ? palabra.charAt(0) + palabra.slice(1).toLowerCase()
    : palabra;
}

/** El mensaje, corto y en su idioma: nombre de pila, el tour y el enlace directo. */
export function mensajeResenaWhatsapp(nombre: string, tour: string, locale: Locale): string {
  const pila = nombreDePila(nombre);
  // El tour va entre comillas para no tener que adivinarle el artículo
  // («a la Expedición Tamul», «al Rafting…»).
  return locale === "en"
    ? `Hi${pila ? ` ${pila}` : ""}! Thank you for joining our “${tour}” tour. 🙌 Would you leave us a quick Google review? It takes a minute and helps other travelers find us: ${GOOGLE_REVIEW_URL}`
    : `¡Hola${pila ? ` ${pila}` : ""}! Gracias por venir con nosotros al tour «${tour}». 🙌 ¿Nos regalas una reseña en Google? Es un minuto y nos ayuda muchísimo a que más viajeros nos encuentren: ${GOOGLE_REVIEW_URL}`;
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
