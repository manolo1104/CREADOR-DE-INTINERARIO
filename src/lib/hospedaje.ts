/**
 * Tarifas de hospedaje del Hotel Paraíso Encantado (Xilitla), para cotizar
 * noches sueltas dentro de un paquete a medida del bot.
 *
 * Dadas por Manolo el 12 de agosto de 2026. Son POR HABITACIÓN Y POR NOCHE, y
 * dependen de la OCUPACIÓN, no del tipo de cama: King y Doble cuestan lo mismo.
 * Lo único que cambia el precio es si la habitación tiene vista a la montaña.
 *
 * ⚠️ Ojo con `paquetes.ts`, que modela la Jungla como un suplemento fijo de
 * $400/noche. Con estas tarifas la diferencia es de $400 a dos personas pero de
 * $500 a tres o cuatro, así que aquí se usan las tarifas directas en vez de
 * sumar un suplemento — si no, se cobraría de menos a los grupos de 3 y 4.
 */

/** Habitaciones con vista a la montaña. El resto es "Selva / jardín". */
const CON_VISTA_MONTANA = /jungla/i;

/** Tarifa por noche, por habitación, según cuánta gente duerma en ella. */
const TARIFA_POR_NOCHE = {
  estandar: { 1: 1500, 2: 1500, 3: 1900, 4: 1900 },
  montana:  { 1: 1900, 2: 1900, 3: 2400, 4: 2400 },
} as const;

/** Máximo que admite una habitación según las tarifas publicadas. */
export const MAX_HUESPEDES_POR_HABITACION = 4;

export function esHabitacionConVista(habitacion?: string | null): boolean {
  return CON_VISTA_MONTANA.test(String(habitacion ?? ""));
}

/**
 * Reparte los huéspedes entre las habitaciones lo más parejo posible.
 * 5 personas en 2 habitaciones son 3 + 2, no 3 + 3: cobrar por el redondeo
 * hacia arriba en las dos le sacaría al cliente una noche de más.
 */
export function repartirHuespedes(huespedes: number, habitaciones: number): number[] {
  const n = Math.max(1, habitaciones);
  const base = Math.floor(huespedes / n);
  const resto = huespedes % n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Promoción: cada TERCERA noche es gratis (decisión de Manolo, 12 ago 2026).
 * Con 3 noches se cobran 2; con 6 se cobran 4. Aplica por habitación.
 */
export function nochesGratis(noches: number): number {
  return Math.floor(Math.max(0, noches) / 3);
}

export interface CotizacionHospedaje {
  ok: boolean;
  error?: string;
  /** Total de todas las habitaciones por todas las noches, ya con la promoción. */
  total?: number;
  /** Lo que costaría sin la promoción — sirve para enseñar el ahorro. */
  totalSinPromo?: number;
  /** Cuánto se ahorra el cliente por las noches gratis. */
  ahorro?: number;
  /** Noches regaladas por habitación. */
  nochesGratis?: number;
  /** Desglose legible: una entrada por habitación. */
  desglose?: { huespedes: number; porNoche: number; noches: number; nochesCobradas: number; subtotal: number }[];
  vistaMontana?: boolean;
}

/**
 * Cotiza el hospedaje completo. Devuelve `ok:false` con motivo cuando los datos
 * no alcanzan, en vez de asumir: es dinero real del cliente.
 */
export function cotizarHospedaje(input: {
  habitacion?: string | null;
  noches?: number | null;
  habitaciones?: number | null;
  huespedes?: number | null;
}): CotizacionHospedaje {
  const noches = Math.max(0, Math.trunc(Number(input.noches) || 0));
  const habitaciones = Math.max(1, Math.trunc(Number(input.habitaciones) || 1));
  const huespedes = Math.max(0, Math.trunc(Number(input.huespedes) || 0));

  if (noches <= 0) return { ok: false, error: "Faltan las noches del hospedaje." };
  if (huespedes <= 0) return { ok: false, error: "Falta cuántas personas se hospedan." };

  const reparto = repartirHuespedes(huespedes, habitaciones);
  if (reparto.some((h) => h > MAX_HUESPEDES_POR_HABITACION)) {
    return {
      ok: false,
      error: `Cada habitación admite hasta ${MAX_HUESPEDES_POR_HABITACION} personas. Para ${huespedes} huéspedes hacen falta al menos ${Math.ceil(huespedes / MAX_HUESPEDES_POR_HABITACION)} habitaciones.`,
    };
  }

  const vistaMontana = esHabitacionConVista(input.habitacion);
  const tabla = vistaMontana ? TARIFA_POR_NOCHE.montana : TARIFA_POR_NOCHE.estandar;

  const gratis = nochesGratis(noches);
  const nochesCobradas = noches - gratis;

  const desglose = reparto.map((h) => {
    const porNoche = tabla[Math.max(1, h) as 1 | 2 | 3 | 4];
    return { huespedes: h, porNoche, noches, nochesCobradas, subtotal: porNoche * nochesCobradas };
  });

  const total = desglose.reduce((s, d) => s + d.subtotal, 0);
  const totalSinPromo = desglose.reduce((s, d) => s + d.porNoche * noches, 0);

  return {
    ok: true,
    total,
    totalSinPromo,
    ahorro: totalSinPromo - total,
    nochesGratis: gratis,
    desglose,
    vistaMontana,
  };
}
