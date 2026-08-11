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

/** Reparte la gente lo más parejo posible: 5 en 2 habitaciones son 3 + 2. */
function repartir(personas: number, habitaciones: number): number[] {
  const n = Math.max(1, habitaciones);
  const base = Math.floor(personas / n);
  const resto = personas % n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

function costoHotelPorNoche(personas: number, vistaMontana = false): number {
  const tabla = vistaMontana ? TARIFA_NOCHE.montana : TARIFA_NOCHE.estandar;
  const habitaciones = Math.max(1, Math.ceil(personas / MAX_POR_HABITACION));
  return repartir(personas, habitaciones).reduce(
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

  const pct = Number(input.pct);
  if (![10, 50, 100].includes(pct)) return null;

  const vistaMontana = !!input.vistaMontana;

  // Hotel: lo que ocupan de verdad —los menores también ocupan cama— menos la
  // habitación ESTÁNDAR de dos que ya viene en el precio publicado. Si eligen
  // Jungla, la diferencia sale sola de la tabla de tarifas.
  const hotelReal     = costoHotelPorNoche(personas, vistaMontana) * paquete.noches;
  const hotelIncluido = costoHotelPorNoche(2, false)               * paquete.noches;
  const extraHotel    = Math.max(0, hotelReal - hotelIncluido);

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
    toursPorPersona,
    habitaciones: Math.max(1, Math.ceil(personas / MAX_POR_HABITACION)),
    total,
    charge,
    saldo: total - charge,
    pct,
  };
}
