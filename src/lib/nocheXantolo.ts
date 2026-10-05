/**
 * La Noche de Xantolo, sin hotel (decisión de Manolo, 4 oct 2026).
 *
 * Por qué existe: en Clarity, 43 personas vieron el paquete de Xantolo con
 * hotel y ninguna tocó «Reservar»; lo que abrieron fueron las preguntas de si
 * pueden ir niños o más personas y si se puede llegar el sábado. La noche sola
 * contesta las tres: se vende por persona, admite niños y sale también el
 * sábado 31, sin depender de los cuartos del hotel.
 *
 * Decisiones de Manolo (4 oct): $990 por persona; 31 de octubre y 1 de
 * noviembre, 12 lugares cada noche, en una salida aparte de la del paquete;
 * incluye transporte, guía y degustación; los niños pagan como en los tours.
 * La cancelación (48 h, como los tours) es el valor por defecto: él puede
 * cambiarlo.
 *
 * 🔴 La noche se describe SOLO como «las comparsas y los shows más
 * representativos de esta celebración». No se nombran desfiles ni procesiones
 * concretas: el programa lo pone el pueblo.
 *
 * Este archivo no importa nada a propósito: lo leen el catálogo, el checkout
 * (cliente) y el popup que sale en todas las páginas, y no debe arrastrarles
 * el catálogo entero.
 */

export interface NocheXantoloFecha {
  /** El slug de la reserva: una noche, un cupo. */
  slug: string;
  /** YYYY-MM-DD */
  fecha: string;
  fechaTexto: string;
  /** Cómo se nombra corta, en botones y listas. */
  corta: string;
  /** Lugares (personas) a la venta esa noche. */
  cupo: number;
}

export const NOCHE_XANTOLO = {
  pagina: "/paquetes/noche-de-xantolo",
  nombre: "Noche de Xantolo en Xilitla",
  /** Por adulto. Los niños pagan con la escala de los tours (abajo). */
  precioAdulto: 990,
  /** De 6 a 10 años. */
  factorNinoMedio: 0.7,
  /** Menores de 6. Los bebés menores de 3 no pagan. */
  factorNinoChico: 0.5,
  horario: "de 5:30 a 11:30 PM",
  horaRecogida: "5:30 PM",
  regreso: "11:30 PM",
  recogida: "tu hospedaje en Xilitla",
  queVes: "las comparsas y los shows más representativos de esta celebración",
  degustacion: "tamales, atole, bocoles y pan de muerto",
  cancelacion: "Cancelas gratis hasta 48 horas antes de la salida, con reembolso completo.",
  incluye: [
    "Transporte con guía desde tu hospedaje en Xilitla, ida y vuelta",
    "Guía del pueblo toda la noche",
    "Degustación de temporada: tamales, atole, bocoles y pan de muerto",
    "Las comparsas y los shows más representativos de esta celebración, en el centro de Xilitla",
  ],
  noIncluye: [
    "Hospedaje (si todavía no tienes, pregúntanos por WhatsApp)",
    "Traslado hasta Xilitla",
    "Comidas y cenas fuera de la degustación",
    "Propinas y gastos personales",
  ],
  noches: [
    { slug: "noche-de-xantolo-31-oct", fecha: "2026-10-31", fechaTexto: "Sábado 31 de octubre de 2026", corta: "Sábado 31 de octubre", cupo: 12 },
    { slug: "noche-de-xantolo-1-nov",  fecha: "2026-11-01", fechaTexto: "Domingo 1 de noviembre de 2026", corta: "Domingo 1 de noviembre", cupo: 12 },
  ] as NocheXantoloFecha[],
};

/** Lo que paga un niño, redondeado como lo cobra el motor. */
export function precioNinoNoche(tramo: "medio" | "chico"): number {
  const f = tramo === "medio" ? NOCHE_XANTOLO.factorNinoMedio : NOCHE_XANTOLO.factorNinoChico;
  return Math.round(NOCHE_XANTOLO.precioAdulto * f);
}

/** ¿Este slug es una de las noches? */
export function esNocheXantolo(slug: string): boolean {
  return NOCHE_XANTOLO.noches.some((n) => n.slug === slug);
}
