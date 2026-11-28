/**
 * Comparativa de los cuatro rappeles (27 nov 2026, Manolo: «haz la tabla
 * comparativa»). Vive aparte porque la usan la ficha de cada rappel y el
 * llms.txt: los dos tienen que decir exactamente lo mismo.
 *
 * Precio, duración y grupo salen del catálogo (`TOURS_DB`); aquí solo vive el
 * dato que distingue a cada descenso, y cada cifra tiene fuente en `fuentes`
 * del tour (AMCS para los sótanos) o en su propia ficha (Tamul, 105 m).
 */
import { TOURS_DB, tourDurTexto, tourDurRange, recogidaDeTour, type Tour } from "@/lib/tours";
import { TOUR_REQUISITOS } from "@/lib/tourRequisitos";
import { localizeTour } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/config";

/** En el orden en que se recomiendan: del más corto al más extremo. */
const RAPPELES: { id: string; dato: { es: string; en: string } }[] = [
  { id: "tour-rappel-tamul",       dato: { es: "Pared del cañón frente a la cascada de 105 m", en: "Canyon wall facing the 105 m waterfall" } },
  { id: "tour-rappel-cepillo",     dato: { es: "Tiro de 128 m hasta una poza",                  en: "128 m drop down to a pool" } },
  { id: "tour-rappel-huahuas",     dato: { es: "Abismo de 478 m de profundidad",                en: "478 m deep abyss" } },
  { id: "tour-rappel-golondrinas", dato: { es: "376 m de caída libre",                          en: "376 m free fall" } },
];

export const RAPPELES_IDS = RAPPELES.map((r) => r.id);

export interface FilaRappel {
  tour: Tour;
  /** El tour ya en el idioma pedido. */
  local: Tour;
  dato: string;
  duracion: string;
  precio: number;
  grupo: string;
}

export function filasRappeles(locale: Locale): FilaRappel[] {
  const en = locale === "en";
  return RAPPELES.flatMap((r) => {
    const tour = TOURS_DB.find((t) => t.id === r.id);
    if (!tour) return [];
    return [{
      tour,
      local: localizeTour(tour, locale),
      dato: en ? r.dato.en : r.dato.es,
      duracion: tourDurTexto(tour, en ? " h" : " h"),
      precio: tour.precio,
      grupo: en ? `${tour.groupMin}–${tour.groupMax} people` : `${tour.groupMin} a ${tour.groupMax} personas`,
    }];
  });
}

const mxn = (n: number, en: boolean) => `$${n.toLocaleString(en ? "en-US" : "es-MX")} MXN`;

/**
 * La respuesta a «¿cuál rappel me conviene?» en un solo párrafo, con los
 * precios del catálogo. Es el bloque que un asistente de IA puede citar entero.
 */
export function textoComparaRappeles(locale: Locale): string {
  const en = locale === "en";
  const f = Object.fromEntries(filasRappeles(locale).map((x) => [x.tour.id, x]));
  const tamul = f["tour-rappel-tamul"], cep = f["tour-rappel-cepillo"], hua = f["tour-rappel-huahuas"], gol = f["tour-rappel-golondrinas"];
  if (!tamul || !cep || !hua || !gol) return "";
  const edades = RAPPELES_IDS.map((id) => TOUR_REQUISITOS[id]?.edadMinima ?? 0);
  const edad = Math.max(...edades);
  const todosTraslado = RAPPELES_IDS.every((id) => {
    const t = TOURS_DB.find((x) => x.id === id);
    return t ? recogidaDeTour(t).tipo === "hospedaje" : false;
  });
  // De cuánto a cuánto duran los sótanos: el más corto y el más largo.
  const hMin = Math.min(...[cep, hua, gol].map((x) => tourDurRange(x.tour)[0]));
  const hMax = Math.max(...[cep, hua, gol].map((x) => tourDurRange(x.tour)[1]));
  if (en) {
    return [
      `Which Huasteca Potosina rappel is right for you? All four${todosTraslado ? " pick you up at your lodging in Ciudad Valles or Xilitla," : ""} include the safety gear and the guide, and are for ages ${edad} and up.`,
      `The Tamul Waterfall rappel (${mxn(tamul.precio, en)} per person) is the shortest, about ${tourDurRange(tamul.tour)[1]} hours: you go down the canyon wall with the 105 m waterfall right in front of you.`,
      `El Cepillo (${mxn(cep.precio, en)}) is the sinkhole to start with: a 128 m drop to a pool at the bottom.`,
      `Huahuas (${mxn(hua.precio, en)}) is a 478 m deep abyss that very few people ever descend into.`,
      `The Cave of Swallows (${mxn(gol.precio, en)}) is the most extreme: 376 m of free fall in one of the largest pits in the world, one of the 13 Wonders of Mexico.`,
      `The sinkholes take the whole day (${hMin} to ${hMax} hours). All four can be booked from 1 person; going alone costs MXN $700 more.`,
    ].join(" ");
  }
  return [
    `¿Cuál rappel de la Huasteca Potosina te conviene? Los cuatro${todosTraslado ? " pasan por ti a tu hospedaje en Ciudad Valles o Xilitla," : ""} incluyen el equipo de seguridad y el guía, y son para mayores de ${edad} años.`,
    `El rappel en la Cascada de Tamul (${mxn(tamul.precio, en)} por persona) es el más corto, unas ${tourDurRange(tamul.tour)[1]} horas: bajas la pared del cañón con la cascada de 105 m enfrente.`,
    `El Sótano del Cepillo (${mxn(cep.precio, en)}) es el sótano para empezar: un tiro de 128 m hasta una poza en el fondo.`,
    `El Sótano de las Huahuas (${mxn(hua.precio, en)}) es un abismo de 478 m de profundidad al que casi nadie baja.`,
    `El Sótano de las Golondrinas (${mxn(gol.precio, en)}) es el más extremo: 376 m de caída libre en uno de los abismos más grandes del mundo, una de las 13 Maravillas de México.`,
    `Los sótanos ocupan el día completo (de ${hMin} a ${hMax} horas). Los cuatro se reservan desde 1 persona; si vas solo, son $700 más.`,
  ].join(" ");
}
