import { nochesGratis } from "./habitaciones";
// Cálculo AUTORITATIVO del precio de un paquete en el servidor.
// El cliente nunca decide el monto: aquí se recalcula desde PAQUETES_DB.

import { getPaquete, paqueteEnFecha, type Paquete } from "./paquetes";
import { TOURS_DB, precioDeFecha } from "./tours";

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
 * La escala de menores de siempre (la de los tours sueltos): de 6 a 10 años
 * pagan el 70 % y los menores de 6 el 50 %. Los bebés menores de 3 no pagan y
 * no se cuentan.
 */
export const FACTOR_NINO_MEDIO = 0.7;
export const FACTOR_NINO_CHICO = 0.5;

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

/**
 * Los slugs que el cliente eligió, tal como viajan por Stripe: "uno,dos,tres".
 * Un solo campo de texto vale para el paquete que elige un día y para el que
 * elige los cuatro; así la metadata del pago no cambia de forma.
 */
export function parseEleccion(v: unknown): string[] {
  return String(v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

/** El más caro de una lista de opciones, para no cotizar de menos. */
function precioMasAlto(opciones: { slug: string }[]): number {
  return opciones.reduce((max, o) => {
    const t = TOURS_DB.find((x) => x.slug === o.slug);
    return t && t.precioUnidad !== "vehiculo" ? Math.max(max, t.precio) : max;
  }, 0);
}

/**
 * Los tours que se cobran por persona en este paquete.
 *
 * Normalmente son los del itinerario. Pero "Tu Huasteca" es a la carta: su
 * itinerario no nombra ningún tour porque los nombra el cliente, así que ahí
 * los que cuentan son los que eligió. Importa para el dinero, no para la
 * decoración: `extraTours` cobra un boleto de CADA tour por cada persona
 * arriba de dos, y un paquete de cuatro recorridos que devolviera una lista
 * vacía dejaría viajar gratis a la tercera persona.
 */
export function toursDelPaquete(paquete: Paquete, elegidos: string[] = []) {
  const delItinerario = paquete.itinerario
    .map((d) => d.tourSlug)
    .filter((s): s is string => !!s);

  let slugs: string[] = delItinerario;

  if (!delItinerario.length && paquete.eleccionTour) {
    const opciones   = paquete.eleccionTour.opciones;
    const permitidos = new Set(opciones.map((o) => o.slug));
    // Sin repetidos: el mismo recorrido dos veces sería un día duplicado, y
    // cobrarlo dos veces a la gente extra sería cobrar de más.
    const validos    = Array.from(new Set(elegidos)).filter((s) => permitidos.has(s));
    // Lo que todavía no ha elegido se cotiza al recorrido MÁS CARO de la
    // lista: conforme elige, el precio en pantalla solo puede bajar. Al revés
    // —cotizar en cero lo no elegido— un grupo de cinco vería un total corto
    // hasta el último clic.
    const faltan = Math.max(0, (paquete.eleccionTour.cuantos ?? 1) - validos.length);
    const techo  = precioMasAlto(opciones);
    const tope   = opciones.find((o) => TOURS_DB.find((x) => x.slug === o.slug)?.precio === techo)?.slug;
    slugs = [...validos, ...(tope ? Array(faltan).fill(tope) : [])];
  }

  return slugs
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
  /**
   * Paquete de evento abierto a familias: lo que paga cada persona arriba de
   * la pareja por la degustación y la noche con guía. 0 en los demás.
   */
  extraEvento:    number;
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
  /**
   * Fecha de inicio (YYYY-MM-DD). La promo de temporada baja va con los viajes
   * que empiezan hasta el 29 oct (4 oct 2026); sin fecha, lo que se anuncia hoy.
   * En un evento manda la fecha del evento.
   */
  fecha?:         unknown;
}): PaqueteChargeResult | null {
  // `getPaquete` y no `PAQUETES_DB`: los paquetes de evento (Xantolo) viven
  // fuera del catálogo general y también se cobran aquí.
  const delCatalogo = getPaquete(String(input.slug ?? ""));
  if (!delCatalogo) return null;
  const fecha = delCatalogo.evento?.fecha ?? (typeof input.fecha === "string" && input.fecha ? input.fecha : null);
  // El precio de ESA fecha: la promo solo si el viaje arranca hasta el 29 oct.
  const paquete = paqueteEnFecha(delCatalogo, fecha);

  const adultos       = Math.floor(Number(input.personas)      || 0);
  const childrenMid   = Math.max(0, Math.floor(Number(input.childrenMid)   || 0));
  const childrenSmall = Math.max(0, Math.floor(Number(input.childrenSmall) || 0));
  const personas      = adultos + childrenMid + childrenSmall;

  const evento = paquete.evento;

  // 30 % mínimo (decisión de Manolo, 12 ago 2026). Antes el mínimo era 10 %, que
  // no cubre ni la primera noche de hotel del paquete.
  const pct = pctPaqueteValido(input.pct);
  if (pct === null) return null;

  // ── La Noche de Xantolo, sin hotel (4 oct 2026) ─────────────────────────
  // Se cobra POR PERSONA: `paquete.precio` es el de un adulto y los menores
  // pagan con la escala de los tours. Sin hotel no hay habitaciones, víspera
  // ni boletos de tour que sumar.
  if (evento?.sinHotel) {
    if (adultos < evento.minAdultos || personas > evento.maxPorReserva) return null;
    const total = Math.round(
      adultos       * paquete.precio +
      childrenMid   * paquete.precio * FACTOR_NINO_MEDIO +
      childrenSmall * paquete.precio * FACTOR_NINO_CHICO,
    );
    const charge = pct === 100 ? total : Math.round((total * pct) / 100);
    return {
      paquete, personas, adultos, childrenMid, childrenSmall,
      vistaMontana: false,
      base: total,
      extraHotel: 0, nocheExtra: false, nochesTotales: 0,
      extraTours: 0, extraEvento: 0, toursPorPersona: 0,
      habitaciones: 0,
      total, charge, saldo: total - charge, pct,
    };
  }

  // El paquete es por pareja: la base son DOS adultos. Menos de eso no se
  // vende, y arriba del tope se cotiza a mano porque hay que confirmar
  // habitaciones.
  if (adultos < 2 || personas > MAX_PERSONAS_PAQUETE) return null;

  // Paquete de evento con hotel (Xantolo): un cuarto por reserva, de 2 a 4
  // personas. Mientras no haya precio para la persona extra, solo parejas.
  if (evento) {
    if (adultos < evento.minAdultos || personas > evento.maxPorReserva) return null;
    if (evento.extraEventoPorPersona == null && personas !== 2) return null;
  }

  // En un paquete de evento la habitación la asigna el hotel: no hay vista que
  // elegir ni suplemento que sumar.
  const vistaMontana = !!input.vistaMontana && !paquete.evento;

  // Hotel: lo que ocupan de verdad —los menores también ocupan cama— menos la
  // habitación ESTÁNDAR de dos que ya viene en el precio publicado. Si eligen
  // Jungla, la diferencia sale sola de la tabla de tarifas.
  // Cada 3.ª noche va gratis, y eso aplica TAMBIÉN a la gente extra: en el
  // paquete Completo (3 noches) la persona adicional paga 2, no 3. Antes se
  // multiplicaba por todas las noches y el extra pagaba la que la pareja no
  // paga.
  // En un paquete de fecha fija no hay víspera que vender: el hotel no tiene
  // habitaciones la noche anterior (Xantolo: solo la del 1 al 2 de noviembre).
  const nocheExtra = !!input.nocheExtra && !paquete.evento;
  const nochesTotales = paquete.noches + (nocheExtra ? 1 : 0);

  // Lo que el precio publicado ya cubre: las noches DEL PAQUETE, con su
  // promoción. La noche extra se suma aparte y por eso no entra aquí.
  const nochesBaseCobradas   = paquete.noches - nochesGratis(paquete.noches);
  const nochesTotalCobradas  = nochesTotales  - nochesGratis(nochesTotales);

  const reparto = Array.isArray(input.reparto) ? input.reparto.map((n) => Number(n) || 0) : undefined;
  // Lo que el precio publicado ya cubre. Casi siempre es una habitación de dos
  // con vista a la selva; la Luna de Miel declara `habitacionIncluida:
  // "montana"` porque su precio YA lleva la suite Jungla. Sin esa distinción,
  // el checkout le sumaba la diferencia de la Jungla a un paquete cuya ficha
  // promete la Jungla incluida: $400 por noche cobrados dos veces.
  const montanaIncluida = paquete.habitacionIncluida === "montana";
  const hotelReal      = costoHotelPorNoche(personas, vistaMontana, reparto)  * nochesTotalCobradas;
  const hotelIncluido  = costoHotelPorNoche(2, montanaIncluida)               * nochesBaseCobradas;
  const extraHotel     = Math.max(0, hotelReal - hotelIncluido);

  // Cada boleto extra al precio del recorrido en la fecha del paquete.
  const toursPorPersona = toursDelPaquete(paquete, parseEleccion(input.tourElegido))
    .reduce((s, t) => s + precioDeFecha(t, fecha), 0);
  // Misma escala de menores que en los tours sueltos: 70 % de 6 a 10 años y
  // 50 % por debajo de 6.
  const extraTours = Math.round(
    Math.max(0, adultos - 2) * toursPorPersona +
    childrenMid   * toursPorPersona * FACTOR_NINO_MEDIO +
    childrenSmall * toursPorPersona * FACTOR_NINO_CHICO,
  );

  // La degustación y la noche con guía de cada persona arriba de la pareja.
  // Con la pareja sola da 0: el precio publicado ya las incluye.
  const porPersonaEvento = evento?.extraEventoPorPersona ?? 0;
  const extraEvento = Math.round(
    Math.max(0, adultos - 2) * porPersonaEvento +
    childrenMid   * porPersonaEvento * FACTOR_NINO_MEDIO +
    childrenSmall * porPersonaEvento * FACTOR_NINO_CHICO,
  );

  const total  = paquete.precio + extraHotel + extraTours + extraEvento;
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
    extraEvento,
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
