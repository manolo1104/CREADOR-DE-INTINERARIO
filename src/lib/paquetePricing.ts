import { nochesGratis } from "./habitaciones";
// Cálculo AUTORITATIVO del precio de un paquete en el servidor.
// El cliente nunca decide el monto: aquí se recalcula desde PAQUETES_DB.

import { PAQUETES_DB, type Paquete } from "./paquetes";
import { TOURS_DB } from "./tours";

/**
 * El precio publicado de cada paquete es POR PAREJA: incluye una habitación
 * para dos y dos boletos por cada tour del itinerario. Hasta ahora el motor
 * cobraba ese mismo importe fuera cual fuera el tamaño del grupo, así que un
 * grupo de cinco pagaba lo mismo que uno de dos.
 *
 * Reglas que fijó Manolo el 11 de agosto de 2026:
 *
 *  - La 3.ª persona suma $400 por noche (la habitación pasa de tarifa de 2 a
 *    tarifa de 3–4) más un boleto de cada tour.
 *  - La 4.ª persona NO suma hotel —duerme en la misma habitación, que ya se
 *    cobró a tarifa de 3–4— y solo suma sus boletos.
 *  - A partir de la 5.ª hace falta otra habitación: se reparte a la gente lo
 *    más parejo posible (5 = 3 + 2) y se cobra el hotel que de verdad se ocupa.
 *
 * El hotel se calcula siempre como "lo que cuestan las habitaciones que hacen
 * falta" menos "la habitación para dos que ya venía en el precio", en vez de
 * ir sumando suplementos sueltos: así el número sale bien con cualquier grupo.
 */

/**
 * Tarifa por habitación y noche, según cuánta gente duerma en ella (MXN).
 * La habitación Jungla tiene vista a la montaña y cuesta más: +$400 a dos
 * personas y +$500 a tres o cuatro. Por eso se usan las dos tablas reales en
 * vez de sumar un suplemento fijo, que cobraría de menos a los grupos de 3 y 4.
 */
const TARIFA_NOCHE = {
  estandar: { 1: 1500, 2: 1500, 3: 1900, 4: 1900 },
  montana:  { 1: 1900, 2: 1900, 3: 2400, 4: 2400 },
} as const;

/** Máximo por habitación, según las tarifas publicadas del hotel. */
export const MAX_POR_HABITACION = 4;

/** Tope de lo que el motor cobra solo. Arriba de esto, se cotiza a mano. */
export const MAX_PERSONAS_PAQUETE = 12;

/**
 * Cuánto se puede pagar hoy. 30 % es el mínimo desde el 12 de agosto de 2026
 * (antes era 10 %, que no cubre ni la primera noche de hotel).
 *
 * ⚠️ Vive aquí y NADIE lo vuelve a escribir a mano. El bug que esto arregla:
 * `create-payment-intent` tenía su propia copia congelada en [10, 50, 100]
 * mientras la pantalla ofrecía 30 y este archivo exigía 30. La opción marcada
 * por defecto —el 30 %— devolvía 400 "Porcentaje de pago inválido" y ningún
 * paquete se podía pagar sin que el cliente cambiara la opción a ciegas.
 */
export const PCTS_PAQUETE = [30, 50, 100] as const;
export type PctPaquete = (typeof PCTS_PAQUETE)[number];

/** Normaliza el porcentaje que llega del cliente. Devuelve null si no es válido. */
export function pctPaqueteValido(v: unknown): PctPaquete | null {
  const n = Math.round(Number(v));
  return (PCTS_PAQUETE as readonly number[]).includes(n) ? (n as PctPaquete) : null;
}

/** Reparte la gente lo más parejo posible: 5 en 2 habitaciones son 3 + 2. */
function repartir(personas: number, habitaciones: number): number[] {
  const n = Math.max(1, habitaciones);
  const base = Math.floor(personas / n);
  const resto = personas % n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Lo que cuesta el hotel por noche para ese grupo.
 *
 * `reparto` es cómo decidió dormir el cliente. Si no viene, se reparte lo más
 * parejo posible —que suele ser lo más barato—. Importa: la tarifa depende de
 * cuánta gente duerme en CADA habitación, así que 4+1 y 3+2 no cuestan igual.
 */
function costoHotelPorNoche(personas: number, vistaMontana = false, reparto?: number[]): number {
  const tabla = vistaMontana ? TARIFA_NOCHE.montana : TARIFA_NOCHE.estandar;
  const habitaciones = Math.max(1, Math.ceil(personas / MAX_POR_HABITACION));
  const valido = Array.isArray(reparto)
    && reparto.length === habitaciones
    && reparto.every((n) => n >= 1 && n <= MAX_POR_HABITACION)
    && reparto.reduce((a, b) => a + b, 0) === personas;
  return (valido ? reparto! : repartir(personas, habitaciones)).reduce(
    (s, ocupacion) => s + tabla[Math.min(MAX_POR_HABITACION, Math.max(1, ocupacion)) as 1 | 2 | 3 | 4],
    0,
  );
}

/** Los tours del itinerario que tienen ficha y precio por persona. */
export function toursDelPaquete(paquete: Paquete) {
  return paquete.itinerario
    .map((d) => d.tourSlug)
    .filter((s): s is string => !!s)
    .map((slug) => TOURS_DB.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => !!t)
    // Los tours que se cobran por vehículo no tienen precio por persona, así
    // que no se pueden sumar como "un boleto más".
    .filter((t) => t.precioUnidad !== "vehiculo");
}

export interface PaqueteChargeResult {
  paquete:        Paquete;
  /** Total de gente (adultos + menores). */
  personas:       number;
  adultos:        number;
  childrenMid:    number;
  childrenSmall:  number;
  vistaMontana:   boolean;
  /** Precio publicado, que ya cubre a dos personas. */
  base:           number;
  /** Lo que se suma de hotel por la gente extra. */
  extraHotel:     number;
  /** Llegó la víspera. */
  nocheExtra:     boolean;
  /** Noches de hotel en total, ya con la extra si la hay. */
  nochesTotales:  number;
  /** Lo que se suma de boletos de tour por la gente extra. */
  extraTours:     number;
  /** Precio por boleto extra, sumando todos los tours del itinerario. */
  toursPorPersona: number;
  habitaciones:   number;
  total:          number;
  charge:         number;
  saldo:          number;
  pct:            number;
}

export function computePaqueteCharge(input: {
  slug?:          string;
  /** Adultos. El precio publicado ya cubre a DOS. */
  personas?:      unknown;
  /** 6–10 años: pagan el 70 % del boleto de tour. */
  childrenMid?:   unknown;
  /** Menores de 6: pagan el 50 %. */
  childrenSmall?: unknown;
  /** Habitación Jungla, con vista a la montaña. */
  vistaMontana?:  unknown;
  /** Cuánta gente duerme en cada habitación, en el orden que eligió el cliente. */
  reparto?:       unknown;
  /** El día "a elegir", cuando el paquete lo ofrece. */
  tourElegido?:   unknown;
  /**
   * Llegar la víspera. El día 1 del paquete es día de tour: se sale del hotel
   * entre 8:30 y 9:00, así que quien llega esa misma mañana tiene que estar en
   * Xilitla antes de las 9. Con la noche extra llega el día anterior (check-in
   * desde las 3 pm) y arranca descansado.
   */
  nocheExtra?:    unknown;
  pct?:           unknown;
}): PaqueteChargeResult | null {
  const paquete = PAQUETES_DB.find((p) => p.slug === input.slug);
  if (!paquete) return null;

  const adultos       = Math.floor(Number(input.personas)      || 0);
  const childrenMid   = Math.max(0, Math.floor(Number(input.childrenMid)   || 0));
  const childrenSmall = Math.max(0, Math.floor(Number(input.childrenSmall) || 0));
  const personas      = adultos + childrenMid + childrenSmall;

  // El paquete es por pareja: la base son DOS adultos. Menos de eso no se
  // vende, y arriba del tope se cotiza a mano porque hay que confirmar
  // habitaciones.
  if (adultos < 2 || personas > MAX_PERSONAS_PAQUETE) return null;

  // 30 % mínimo (decisión de Manolo, 12 ago 2026). Antes el mínimo era 10 %, que
  // no cubre ni la primera noche de hotel del paquete.
  const pct = pctPaqueteValido(input.pct);
  if (pct === null) return null;

  const vistaMontana = !!input.vistaMontana;

  // Hotel: lo que ocupan de verdad —los menores también ocupan cama— menos la
  // habitación ESTÁNDAR de dos que ya viene en el precio publicado. Si eligen
  // Jungla, la diferencia sale sola de la tabla de tarifas.
  // Cada 3.ª noche va gratis, y eso aplica TAMBIÉN a la gente extra: en el
  // paquete Completo (3 noches) la persona adicional paga 2, no 3. Antes se
  // multiplicaba por todas las noches y el extra pagaba la que la pareja no
  // paga.
  const nocheExtra = !!input.nocheExtra;
  const nochesTotales = paquete.noches + (nocheExtra ? 1 : 0);

  // Lo que el precio publicado ya cubre: las noches DEL PAQUETE, con su
  // promoción. La noche extra se suma aparte y por eso no entra aquí.
  const nochesBaseCobradas   = paquete.noches - nochesGratis(paquete.noches);
  const nochesTotalCobradas  = nochesTotales  - nochesGratis(nochesTotales);

  const reparto = Array.isArray(input.reparto) ? input.reparto.map((n) => Number(n) || 0) : undefined;
  const hotelReal      = costoHotelPorNoche(personas, vistaMontana, reparto) * nochesTotalCobradas;
  const hotelIncluido  = costoHotelPorNoche(2, false)                        * nochesBaseCobradas;
  const extraHotel     = Math.max(0, hotelReal - hotelIncluido);

  const toursPorPersona = toursDelPaquete(paquete).reduce((s, t) => s + t.precio, 0);
  // Misma escala de menores que en los tours sueltos: 70 % de 6 a 10 años y
  // 50 % por debajo de 6.
  const extraTours = Math.round(
    Math.max(0, adultos - 2) * toursPorPersona +
    childrenMid   * toursPorPersona * 0.7 +
    childrenSmall * toursPorPersona * 0.5,
  );

  const total  = paquete.precio + extraHotel + extraTours;
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return {
    paquete,
    personas,
    base: paquete.precio,
    adultos,
    childrenMid,
    childrenSmall,
    vistaMontana,
    extraHotel,
    extraTours,
    nocheExtra,
    nochesTotales,
    toursPorPersona,
    habitaciones: Math.max(1, Math.ceil(personas / MAX_POR_HABITACION)),
    total,
    charge,
    saldo: total - charge,
    pct,
  };
}
