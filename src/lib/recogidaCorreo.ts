/**
 * La recogida en los correos que llevan una LISTA de recorridos: el carrito,
 * la secuencia de la cotización, la confirmación con varios tours y el paquete
 * a la medida del bot.
 *
 * 🔴 Todos decían, escrito a mano, "✓ Pasamos por ti a tu hospedaje en Xilitla
 * o Ciudad Valles". A quien cotizaba la Gruta de Xilo —solo Xilitla, y desde
 * Valles con costo— se le prometía por escrito un traslado gratis que no hay;
 * a quien cotizaba el buceo, una recogida que no existe. La frase genérica se
 * queda SOLO cuando todos los recorridos recogen en las dos ciudades.
 */
import { TOURS_DB, fraseRecogida, incluyeDeTour, partesRecogida, recogidaDeTour, type Tour } from "./tours";
import { horaEnLista } from "./recogidaTexto";
import { localizeTour } from "./i18n/localize";
import type { Locale } from "./i18n/config";

/** Los recorridos del catálogo que corresponden a esos slugs, sin repetir y en orden. */
export function toursDeSlugs(slugs: (string | null | undefined)[]): Tour[] {
  const vistos = new Set<string>();
  const out: Tour[] = [];
  for (const s of slugs) {
    const t = s ? TOURS_DB.find((x) => x.slug === s) : undefined;
    if (t && !vistos.has(t.id)) {
      vistos.add(t.id);
      out.push(t);
    }
  }
  return out;
}

/**
 * ¿La recogida de este recorrido está EN DUDA?
 *
 * 🔴 El rappel no declara `recogida` (cae al "Xilitla o Valles, 8–9 AM" por
 * defecto), su "incluye" dice solo "Traslado desde Ciudad Valles" y el bot lo
 * da como SIN transporte (`TRANSPORTE` en export-bot-data.ts). Con eso, el
 * mismo cliente leía en WhatsApp "te confirmamos el punto de encuentro" y en el
 * correo de esa cotización "✓ pasamos por ti a tu hospedaje en Xilitla o
 * Ciudad Valles". Mientras Manolo no decida, a un recorrido sin `recogida`
 * propia cuyo "incluye" no diga que pasamos por su hospedaje no se le promete
 * ni lugar ni hora: prometer una recogida que no existe es lo más caro.
 */
export function recogidaIncierta(t: Tour): boolean {
  return !t.recogida && !incluyeDeTour(t).some((i) => /desde tu (hotel|hospedaje)/i.test(i));
}

/** Lo que se dice de un recorrido con la recogida en duda. No promete nada. */
export const RECOGIDA_NEUTRA = {
  es: "El punto de encuentro y la hora te los confirmamos por WhatsApp.",
  en: "We'll confirm the meeting point and time on WhatsApp.",
} as const;

/** `fraseRecogida`, salvo cuando la recogida está en duda. */
export function fraseRecogidaCorreo(t: Tour, en: boolean): string {
  return recogidaIncierta(t) ? RECOGIDA_NEUTRA[en ? "en" : "es"] : fraseRecogida(t, en);
}

/** La hora corta para una lista ("7:00 PM"); vacía si no hay hora pública o está en duda. */
export function horaCorreo(t: Tour, en: boolean): string {
  return recogidaIncierta(t) ? "" : horaEnLista(t, en);
}

/** ¿Pasamos por él a su hospedaje, sin duda? */
export function pasamosPorEl(t: Tour): boolean {
  return !recogidaIncierta(t) && partesRecogida(t, false).incluyeTraslado;
}

/** ¿Todos recogen en su hospedaje de Xilitla o de Valles, sin duda? Con eso vale la frase genérica. */
export function todosRecogenEnAmbas(tours: Tour[]): boolean {
  return tours.every((t) => recogidaDeTour(t).tipo === "hospedaje" && !recogidaIncierta(t));
}

/**
 * `resumenSalidas` para correos: una línea si todos se recogen igual y, si no,
 * "Nombre: frase" por recorrido, con la frase neutra para los que están en duda.
 */
export function salidasCorreo(tours: Tour[], locale: Locale): string[] {
  const en = locale === "en";
  const unicos = toursDeSlugs(tours.map((t) => t.slug));
  if (!unicos.length) return [];
  const frases = unicos.map((t) => fraseRecogidaCorreo(t, en));
  if (new Set(frases).size === 1) return [frases[0]];
  return unicos.map((t, i) => `${localizeTour(t, locale).nombreCorto}: ${frases[i]}`);
}

/**
 * La recogida para un correo, separada en lo que es GARANTÍA (va en la franja
 * de palomitas) y lo que es DETALLE (va en su propio bloque, sin palomita):
 *
 *  · todos recogen en Xilitla o Valles → garantía genérica;
 *  · no se reconoce ninguno (una cotización vieja sin slug) → garantía sin
 *    ciudades, que no promete nada que no sepamos;
 *  · alguno no → la frase de cada uno, como detalle.
 *
 * 🔴 Las frases por recorrido iban dentro de la franja, así que salía
 * "✓ El transporte hasta Xilitla no está incluido": una palomita junto a lo
 * que NO damos se lee como algo que sí.
 */
export function lineasRecogida(
  slugs: (string | null | undefined)[],
  locale: Locale,
  textos: { generica: string; sinTours: string },
): { garantia: string[]; detalle: string[] } {
  const tours = toursDeSlugs(slugs);
  if (!tours.length) return { garantia: [textos.sinTours], detalle: [] };
  if (todosRecogenEnAmbas(tours)) return { garantia: [textos.generica], detalle: [] };
  return { garantia: [], detalle: salidasCorreo(tours, locale) };
}

/**
 * La cancelación para un correo, con el mismo reparto que `lineasRecogida`.
 *
 * 🔴 Todos los correos prometían "cancelación gratuita hasta 48 h antes" y
 * reembolso completo, también para el Edén en el Jardín, que NO tiene
 * reembolso (`cancelacion` del catálogo): la Fundación Las Pozas no devuelve
 * nada y ese dinero lo pondría la operadora.
 */
export function lineasCancelacion(
  slugs: (string | null | undefined)[],
  locale: Locale,
  generica: string,
): { garantia: string[]; detalle: string[] } {
  const tours = toursDeSlugs(slugs);
  const propias = tours.filter((t) => t.cancelacion);
  if (!propias.length) return { garantia: [generica], detalle: [] };
  const en = locale === "en";
  const nombre = (t: Tour) => localizeTour(t, locale).nombreCorto;
  const detalle = propias.map((t) => `${nombre(t)}: ${en ? t.cancelacion!.en : t.cancelacion!.es}`);
  // Si hay otros recorridos, la de 48 h sigue valiendo para ellos, con la salvedad dicha.
  const salvo = propias.map(nombre).join(", ");
  const garantia = tours.length > propias.length
    ? [`${generica}${en ? `, except ${salvo}` : `, salvo ${salvo}`}`]
    : [];
  return { garantia, detalle };
}
