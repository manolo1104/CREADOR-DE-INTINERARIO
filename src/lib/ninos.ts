/**
 * Niños: la regla de precio. **La única fuente.**
 *
 * Manolo, 17 nov 2026 («nueva regla en todos lados»):
 * - **3 años o menos: gratis.** Ocupan lugar —cuentan para el cupo, el máximo
 *   del tour y los asientos del vehículo— pero NO cuentan para el mínimo de
 *   personas ni para el escalón de precio por tamaño de grupo: no pagan.
 * - **De 4 a 7 años: 50 %** del precio de adulto (`childrenSmall`).
 * - **De 8 en adelante: adulto.**
 * - No aplica a los tours por vehículo (RZR) ni a los que se cobran por grupo
 *   (el Edén): ahí todos cuentan como persona.
 *
 * Antes (hasta el 17 nov 2026) eran dos tramos: 6–10 años al 70 %
 * (`childrenMid`) y menores de 6 al 50 %. `childrenMid` sigue en el código SOLO
 * para leer y recalcular reservas y cotizaciones viejas: ninguna pantalla nueva
 * lo llena. Los bebés viajan como `infants` (sin columna nueva en la base: van
 * en el JSON de renglones y del carrito).
 */

/** Hasta esta edad (inclusive) no pagan. */
export const EDAD_GRATIS_HASTA = 3;
/** De `EDAD_GRATIS_HASTA + 1` a esta edad (inclusive) pagan `FACTOR_NINO`. */
export const EDAD_NINO_HASTA = 7;
/** Desde esta edad pagan como adulto. */
export const EDAD_ADULTO_DESDE = EDAD_NINO_HASTA + 1;

/** Lo que paga un niño de 4 a 7 años, sobre el precio de adulto. */
export const FACTOR_NINO = 0.5;
/** El tramo viejo de 6 a 10 años (`childrenMid`). Solo para registros anteriores al 17 nov 2026. */
export const FACTOR_NINO_ANTERIOR = 0.7;

export const precioNino = (precioAdulto: number): number => Math.round(precioAdulto * FACTOR_NINO);

/**
 * Personas que PAGAN: deciden el mínimo y el escalón de precio por grupo.
 * Los bebés no entran.
 */
export function personasQuePagan(adults: number, ninos = 0, ninosAnteriores = 0): number {
  return (Number(adults) || 0) + (Number(ninos) || 0) + (Number(ninosAnteriores) || 0);
}

/** Lugares que ocupan (cupo, máximo, asientos): con bebés. */
export function lugaresQueOcupan(adults: number, ninos = 0, bebes = 0, ninosAnteriores = 0): number {
  return personasQuePagan(adults, ninos, ninosAnteriores) + (Number(bebes) || 0);
}

/** La regla, dicha en una línea. */
export const REGLA_NINOS = {
  es: "Niños de 4 a 7 años pagan el 50 %; de 3 años o menos van gratis (ocupan lugar); de 8 en adelante pagan como adulto. Sin descuento de niños en los rappeles, el RZR, la Travesía del Café, El Edén en el Jardín ni la Gruta de Xilo: ahí todos pagan el precio completo.",
  en: "Kids 4–7 pay 50 %; ages 3 and under ride free (they still take a seat); 8 and up pay the adult price. No children's discount on the rappels, the RZR, the Coffee Route, El Edén en el Jardín or the Xilo Cave: everyone pays the full price there.",
} as const;

/** Etiquetas de los contadores (web, carrito, panel). */
export const ETIQUETAS_NINOS = {
  es: {
    adultos: "Adultos y niños de 8+",
    ninos: "Niños de 4 a 7 años",
    ninosNota: "50 %",
    bebes: "Bebés de 0 a 3 años",
    bebesNota: "gratis",
  },
  en: {
    adultos: "Adults and kids 8+",
    ninos: "Kids 4–7",
    ninosNota: "50 %",
    bebes: "Babies 0–3",
    bebesNota: "free",
  },
} as const;

/** «2 niños de 4 a 7» / «1 bebé» — para resúmenes, correos y el PDF. */
export function textoNinos(ninos: number, bebes: number, en = false, ninosAnteriores = 0): string {
  const partes: string[] = [];
  if (ninosAnteriores > 0) {
    partes.push(en
      ? `${ninosAnteriores} ${ninosAnteriores === 1 ? "child" : "children"} 6–10`
      : `${ninosAnteriores} ${ninosAnteriores === 1 ? "niño" : "niños"} de 6 a 10`);
  }
  if (ninos > 0) {
    partes.push(en
      ? `${ninos} ${ninos === 1 ? "kid" : "kids"} 4–7`
      : `${ninos} ${ninos === 1 ? "niño" : "niños"} de 4 a 7`);
  }
  if (bebes > 0) {
    partes.push(en
      ? `${bebes} ${bebes === 1 ? "baby" : "babies"} (free)`
      : `${bebes} ${bebes === 1 ? "bebé" : "bebés"} (gratis)`);
  }
  return partes.join(en ? ", " : ", ");
}
