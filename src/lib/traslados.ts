/**
 * Traslados privados desde la ciudad de origen hasta Xilitla.
 *
 * Precios de Manolo (12 ago 2026), **ida y vuelta** y **por vehículo**, no por
 * persona: el tramo de la sierra son casi dos horas de curvas y quien no quiere
 * manejarlas ya no tiene que llegar por su cuenta.
 *
 * Las tarifas van por tamaño de grupo porque cambia la unidad que se manda, y
 * llegan hasta 12 pasajeros: es el cupo de la unidad más grande. A partir de
 * ahí no hay tarifa y se cotiza a mano — el sitio lo dice en vez de inventar un
 * precio.
 *
 * ⚠️ Todo importe que se enseñe al cliente sale de aquí. Es el único lugar donde
 * se tocan: si aparece un número de traslado escrito a mano en una página, está
 * mal por definición.
 */

export interface TarifaTraslado {
  /** Mínimo de pasajeros de este tramo. */
  desde: number;
  /** Máximo de pasajeros, o `null` si es "en adelante". */
  hasta: number | null;
  /** MXN por vehículo, viaje redondo. */
  precio: number;
}

export interface RutaTraslado {
  /** Coincide con el slug de la landing `/desde/<slug>` cuando existe. */
  slug: string;
  ciudad: string;
  /** Cómo se dice en una frase: "desde San Luis Potosí". */
  ciudadLarga: string;
  /** Lo mismo en inglés, para las landings `/en/from/<city>`. */
  ciudadLargaEn: string;
  tarifas: TarifaTraslado[];
}

export const TRASLADOS: RutaTraslado[] = [
  {
    slug: "san-luis-potosi",
    ciudad: "San Luis Potosí",
    ciudadLarga: "desde la ciudad de San Luis Potosí",
    ciudadLargaEn: "from the city of San Luis Potosí",
    tarifas: [
      { desde: 1, hasta: 4,    precio: 6000 },
      { desde: 5, hasta: 6,    precio: 8000 },
      { desde: 7, hasta: 12,   precio: 12000 },
    ],
  },
  {
    slug: "tampico",
    ciudad: "Tampico",
    ciudadLarga: "desde Tampico",
    ciudadLargaEn: "from Tampico",
    tarifas: [
      { desde: 1, hasta: 4,    precio: 5000 },
      { desde: 5, hasta: 6,    precio: 6400 },
      { desde: 7, hasta: 12,   precio: 10000 },
    ],
  },
  {
    slug: "cdmx",
    ciudad: "CDMX",
    ciudadLarga: "desde la Ciudad de México",
    ciudadLargaEn: "from Mexico City",
    tarifas: [
      { desde: 1, hasta: 4,    precio: 14000 },
      { desde: 5, hasta: 6,    precio: 16000 },
      { desde: 7, hasta: 12,   precio: 18000 },
    ],
  },
];

export function getTraslado(slug: string): RutaTraslado | undefined {
  return TRASLADOS.find((t) => t.slug === slug);
}

/** La tarifa que le toca a un grupo de N personas. */
export function tarifaTraslado(ruta: RutaTraslado, personas: number): TarifaTraslado | undefined {
  const n = Math.max(1, Math.floor(personas));
  return ruta.tarifas.find((t) => n >= t.desde && (t.hasta === null || n <= t.hasta));
}

/** Precio redondo para ese grupo, o `null` si no hay tarifa aplicable. */
export function precioTraslado(slug: string, personas: number): number | null {
  const ruta = getTraslado(slug);
  if (!ruta) return null;
  return tarifaTraslado(ruta, personas)?.precio ?? null;
}

/** "1 a 4 personas" · "7 o más personas" (y su equivalente en inglés). */
export function etiquetaTramo(t: TarifaTraslado, locale: "es" | "en" = "es"): string {
  if (locale === "en") {
    if (t.hasta === null) return `${t.desde} or more passengers`;
    if (t.hasta === t.desde) return `${t.desde} passenger${t.desde > 1 ? "s" : ""}`;
    return `${t.desde} to ${t.hasta} passengers`;
  }
  if (t.hasta === null) return `${t.desde} o más personas`;
  if (t.hasta === t.desde) return `${t.desde} persona${t.desde > 1 ? "s" : ""}`;
  return `${t.desde} a ${t.hasta} personas`;
}

/**
 * Lo que paga el grupo más chico de esa ruta: es el "desde $X" honesto, porque
 * es lo que va a pagar una pareja. No se usa el mínimo de todos los tramos —con
 * tarifas que suben por grupo coinciden, pero si alguna bajara, el "desde"
 * anunciaría un precio que la pareja no puede conseguir.
 */
export function precioBase(ruta: RutaTraslado): number {
  return ruta.tarifas[0].precio;
}

/** El traslado más barato que existe, para decir "desde $X" sin mentir. */
export const TRASLADO_MIN = Math.min(...TRASLADOS.flatMap((r) => r.tarifas.map((t) => t.precio)));
