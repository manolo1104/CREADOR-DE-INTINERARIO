/**
 * Las preguntas del check-in y de la encuesta, en un solo lugar (21 oct 2026).
 *
 * Las leen la página pública (`/checkin`, `/opina`), la API que valida, la
 * ficha del panel y los tableros de Análisis. Si mañana cambia una opción,
 * cambia aquí: la llave (`valor`) es lo que se guarda en la base y lo que
 * agrupan los tableros, así que NO se renombra una llave que ya tiene
 * respuestas; se agrega otra.
 *
 * Sin Prisma ni nada del servidor: lo importan componentes de cliente.
 */

import type { Locale } from "@/lib/i18n/config";

export interface Opcion<V extends string = string> {
  valor: V;
  es: string;
  en: string;
}

/**
 * Versión del aviso de privacidad que acepta la casilla del check-in. Se
 * guarda con cada respuesta: si el aviso cambia, se sabe cuál aceptó cada uno.
 * Cambiarla junto con `FECHA` de `src/app/aviso-de-privacidad/page.tsx`.
 */
export const AVISO_VERSION = "2026-10-21";

export const TIPOS_GRUPO = [
  { valor: "pareja",  es: "En pareja",  en: "As a couple" },
  { valor: "amigos",  es: "Con amigos", en: "With friends" },
  { valor: "familia", es: "En familia", en: "With family" },
  { valor: "empresa", es: "Con mi empresa o grupo de trabajo", en: "With my company or work group" },
  // No estaba en la lista de Manolo; el sitio vende «viajero solo» y sin esta
  // opción esa persona tendría que mentir o dejarla vacía.
  { valor: "solo",    es: "Viajo solo / sola", en: "Traveling solo" },
] as const satisfies readonly Opcion[];

export const COMO_NOS_CONOCIO = [
  { valor: "google",        es: "Buscando en Google",  en: "Searching on Google" },
  { valor: "maps",          es: "Google Maps",          en: "Google Maps" },
  { valor: "instagram",     es: "Instagram",            en: "Instagram" },
  { valor: "recomendacion", es: "Me lo recomendaron",   en: "A recommendation" },
  { valor: "paraiso",       es: "Hotel Paraíso Encantado", en: "Hotel Paraíso Encantado" },
  { valor: "otro",          es: "Otro",                 en: "Other" },
] as const satisfies readonly Opcion[];

export const MOTIVOS = [
  { valor: "vacaciones",  es: "Vacaciones",                   en: "Vacation" },
  { valor: "pareja",      es: "Aniversario o luna de miel",   en: "Anniversary or honeymoon" },
  { valor: "celebracion", es: "Cumpleaños o celebración",     en: "Birthday or celebration" },
  { valor: "escapada",    es: "Escapada de fin de semana",    en: "Weekend getaway" },
  { valor: "trabajo",     es: "Viaje de trabajo",             en: "Work trip" },
  { valor: "otro",        es: "Otro",                         en: "Other" },
] as const satisfies readonly Opcion[];

export type TipoGrupo      = (typeof TIPOS_GRUPO)[number]["valor"];
export type ComoNosConocio = (typeof COMO_NOS_CONOCIO)[number]["valor"];
export type Motivo         = (typeof MOTIVOS)[number]["valor"];

/** La etiqueta de una llave guardada; si ya no existe, la llave tal cual. */
export function etiqueta(lista: readonly Opcion[], valor: string | null | undefined, locale: Locale = "es"): string {
  if (!valor) return "";
  const o = lista.find((x) => x.valor === valor);
  return o ? o[locale] : valor;
}

/** ¿Es una llave de esta lista? Para validar lo que llega del formulario. */
export function esOpcion<V extends string>(lista: readonly Opcion<V>[], valor: unknown): valor is V {
  return typeof valor === "string" && lista.some((x) => x.valor === valor);
}

/**
 * Una fecha de nacimiento razonable: YYYY-MM-DD real, de alguien de entre 5 y
 * 100 años. Lo de fuera es un dedazo, no un cliente.
 */
export function fechaNacimientoValida(ymd: unknown, hoy: string): ymd is string {
  if (typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const anioHoy = Number(hoy.slice(0, 4));
  return y >= anioHoy - 100 && y <= anioHoy - 5;
}

/** «12 de marzo» · «March 12» (sin el año: es lo que se enseña en el panel). */
export function textoCumple(ymd: string | null | undefined, locale: Locale = "es"): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric", month: "long", timeZone: "UTC",
  });
}

/** Lo que el panel enseña del check-in de una reserva. */
export interface EstadoCheckin {
  /** sin-enviar | enviado | contestado */
  estado: "sin-enviar" | "enviado" | "contestado";
  enviadoEn: string | null;
  enviadoPor: string | null;
  contestadoEn: string | null;
  respuestas: {
    ciudadOrigen: string | null;
    fechaNacimiento: string | null;
    tipoGrupo: string | null;
    comoNosConocio: string | null;
    comoNosConocioOtro: string | null;
    primeraVez: boolean | null;
    motivo: string | null;
    aceptaPromos: boolean;
  } | null;
  satisfaccion: {
    calificacion: number | null;
    recomendaria: number | null;
    comentario: string | null;
    en: string | null;
  } | null;
}

export const SIN_CHECKIN: EstadoCheckin = {
  estado: "sin-enviar", enviadoEn: null, enviadoPor: null, contestadoEn: null, respuestas: null, satisfaccion: null,
};

/**
 * Sugerencias para «¿de qué ciudad nos visitas?». Es texto libre (viene gente
 * de todos lados); la lista solo ahorra teclear y hace que las respuestas se
 * parezcan entre sí para que el tablero las pueda agrupar.
 */
export const CIUDADES_SUGERIDAS = [
  "Ciudad de México", "Monterrey", "Guadalajara", "Querétaro", "San Luis Potosí", "Tampico",
  "Puebla", "León", "Aguascalientes", "Saltillo", "Pachuca", "Toluca", "Ciudad Valles",
  "Xalapa", "Veracruz", "Morelia", "Ciudad Victoria", "Reynosa", "Torreón", "Mérida",
  "Cancún", "Chihuahua", "Hermosillo", "Tijuana", "Estados Unidos", "Canadá", "Europa",
] as const;

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Cómo escribe la gente las ciudades grandes → un solo nombre para el tablero. */
const ALIAS_CIUDAD: Record<string, string> = {
  cdmx: "Ciudad de México", df: "Ciudad de México", "d.f.": "Ciudad de México", "mexico df": "Ciudad de México",
  "ciudad de mexico": "Ciudad de México", "cd de mexico": "Ciudad de México", "cd. de mexico": "Ciudad de México",
  "mexico city": "Ciudad de México", mty: "Monterrey", gdl: "Guadalajara", qro: "Querétaro", queretaro: "Querétaro",
  slp: "San Luis Potosí", "san luis": "San Luis Potosí", "san luis potosi": "San Luis Potosí",
  "cd valles": "Ciudad Valles", "cd. valles": "Ciudad Valles", valles: "Ciudad Valles", leon: "León",
  "estado de mexico": "Estado de México", edomex: "Estado de México", usa: "Estados Unidos", eua: "Estados Unidos",
  "estados unidos": "Estados Unidos", "united states": "Estados Unidos",
};

/** «  cdmx » → «Ciudad de México» · «monterrey, nl» → «Monterrey, Nl» (para agrupar). */
export function normalizarCiudad(txt: string): string {
  const limpio = txt.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!limpio) return "";
  const clave = sinAcentos(limpio);
  if (ALIAS_CIUDAD[clave]) return ALIAS_CIUDAD[clave];
  const sugerida = CIUDADES_SUGERIDAS.find((c) => sinAcentos(c) === clave);
  if (sugerida) return sugerida;
  return limpio.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
