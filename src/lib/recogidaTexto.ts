/**
 * Textos de recogida cuando hay VARIOS recorridos a la vez: el carrito, los
 * correos con más de un tour, la lista de /tours, /precios y llms.txt.
 *
 * 🔴 Existe porque todas esas pantallas decían, escrito a mano, "pasamos por
 * ti entre las 8:00 y las 9:00 AM en Xilitla o Ciudad Valles". Era cierto para
 * los recorridos de siempre y falso para la Gruta de Xilo (7 PM, solo
 * Xilitla), el Amanecer de Nubes (3 AM), la Olla de la Luz, el Edén, el RZR y
 * el buceo. Aquí la frase se ARMA desde `TOURS_DB`: un recorrido nuevo con
 * otro horario aparece solo en la lista de excepciones.
 *
 * Vive aparte de `tours.ts` porque necesita los nombres en inglés
 * (`localize.ts`), y `localize.ts` ya importa `tours.ts`.
 */
import {
  TOURS_DB,
  fraseRecogida,
  partesRecogida,
  recogidaDeTour,
  salidaCorta,
  type Tour,
} from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/config";

function nombre(t: Tour, locale: Locale): string {
  return localizeTour(t, locale).nombreCorto;
}

/** "a, b y c" · "a, b and c". */
function listaY(items: string[], en: boolean): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${en ? " and " : " y "}${items[items.length - 1]}`;
}

/**
 * La hora de un recorrido dentro de una lista entre paréntesis. Los horarios
 * fijos por día (el Edén) no caben en un paréntesis: se nombran sin detallar.
 */
export function horaEnLista(t: Tour, en: boolean): string {
  if (recogidaDeTour(t).horaTexto) return en ? "set times depending on the day" : "horario según el día";
  return salidaCorta(t, en) ?? "";
}

/**
 * Una línea por recorrido, o UNA sola si todos se recogen igual.
 *
 *   [Tamul, Meco]  → ["Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles entre 8:00 y 9:00 AM."]
 *   [Tamul, Gruta] → ["Expedición Tamul: Pasamos por ti … entre 8:00 y 9:00 AM.",
 *                     "Gruta de Xilo: Pasamos por ti … a las 7:00 PM. Desde Ciudad Valles …"]
 */
export function resumenSalidas(tours: Tour[], locale: Locale): string[] {
  const en = locale === "en";
  const vistos = new Set<string>();
  const unicos = tours.filter((t) => (vistos.has(t.id) ? false : (vistos.add(t.id), true)));
  if (!unicos.length) return [];
  const frases = unicos.map((t) => fraseRecogida(t, en));
  if (new Set(frases).size === 1) return [frases[0]];
  return unicos.map((t, i) => `${nombre(t, locale)}: ${frases[i]}`);
}

/**
 * La regla general y sus excepciones, en un párrafo, generado del catálogo:
 *
 *   "La mayoría de los recorridos pasa por ti a tu hospedaje en Xilitla o
 *    Ciudad Valles entre 8:00 y 9:00 AM. Recogen solo en tu hospedaje de
 *    Xilitla, con horario propio: Gruta de Xilo (7:00 PM), Amanecer de Nubes
 *    (3:00–4:00 AM)…; desde Ciudad Valles, esos tienen costo adicional que te
 *    cotizamos por WhatsApp. El Recorrido en RZR parte de nuestra base en
 *    Xilitla (8:00–9:00 AM)… El Buceo en la Media Luna es en la entrada de la
 *    Laguna de la Media Luna, en Rioverde; llegas por tu cuenta."
 */
export function excepcionesSalida(locale: Locale, tours: Tour[] = TOURS_DB): string {
  const en = locale === "en";
  const tipo = (t: Tour) => recogidaDeTour(t).tipo;

  // La regla general es la hora que más se repite entre los que recogen en las
  // dos ciudades. Hoy son las 8–9 AM; si mañana cambia, cambia la frase.
  const hosp = tours.filter((t) => tipo(t) === "hospedaje" && !recogidaDeTour(t).horaTexto);
  const cuenta = new Map<string, number>();
  for (const t of hosp) {
    const h = salidaCorta(t, en) ?? "";
    cuenta.set(h, (cuenta.get(h) ?? 0) + 1);
  }
  const horaComun = Array.from(cuenta.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const modelo = hosp.find((t) => salidaCorta(t, en) === horaComun);
  const otrosHosp = tours.filter(
    (t) => tipo(t) === "hospedaje" && (recogidaDeTour(t).horaTexto || salidaCorta(t, en) !== horaComun),
  );
  // Los de hora concreta primero; los de horario por día (el Edén) al final.
  const xil = tours
    .filter((t) => tipo(t) === "hospedaje-xilitla")
    .sort((a, b) => Number(!!recogidaDeTour(a).horaTexto) - Number(!!recogidaDeTour(b).horaTexto));
  const base = tours.filter((t) => tipo(t) === "base-xilitla");
  const sitio = tours.filter((t) => tipo(t) === "en-sitio");

  const partes: string[] = [];
  if (modelo) {
    const hora = partesRecogida(modelo, en).hora ?? "";
    partes.push(
      en
        ? `Most tours pick you up at your lodging in Xilitla or Ciudad Valles ${hora}.`
        : `La mayoría de los recorridos pasa por ti a tu hospedaje en Xilitla o Ciudad Valles ${hora}.`,
    );
  }
  if (otrosHosp.length) {
    const lista = listaY(otrosHosp.map((t) => `${nombre(t, locale)} (${horaEnLista(t, en)})`), en);
    partes.push(en ? `${lista} run on a different schedule.` : `${lista} ${otrosHosp.length > 1 ? "tienen" : "tiene"} otro horario.`);
  }
  if (xil.length) {
    const lista = listaY(xil.map((t) => `${nombre(t, locale)} (${horaEnLista(t, en)})`), en);
    partes.push(
      en
        ? `These pick up only at your lodging in Xilitla, on their own schedule: ${lista}; from Ciudad Valles they carry an additional cost we'll quote on WhatsApp.`
        : `Recogen solo en tu hospedaje de Xilitla, con horario propio: ${lista}; desde Ciudad Valles, esos tienen costo adicional que te cotizamos por WhatsApp.`,
    );
  }
  // "Nombre: frase" y no "Nombre parte de…": los nombres no llevan artículo
  // ("Recorrido en RZR por Xilitla parte…" se lee cojo).
  for (const t of base) {
    partes.push(
      en
        ? `${nombre(t, locale)} (${horaEnLista(t, en)}): we meet at our base in Xilitla; transport to Xilitla isn't included.`
        : `${nombre(t, locale)} (${horaEnLista(t, en)}): nos vemos en nuestra base en Xilitla; el transporte hasta Xilitla no va incluido.`,
    );
  }
  for (const t of sitio) {
    const p = partesRecogida(t, en);
    partes.push(
      en
        ? `${nombre(t, locale)}: we meet at ${p.lugar}; you make your own way there.`
        : `${nombre(t, locale)}: nos vemos en ${p.lugar}; llegas por tu cuenta.`,
    );
  }
  return partes.join(" ");
}
