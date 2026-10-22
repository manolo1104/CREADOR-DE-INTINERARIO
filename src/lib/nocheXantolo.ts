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
 * 🔴 La noche se describe como «las comparsas y los shows más representativos
 * de esta celebración». Desde el 20 oct, con el programa oficial publicado, el
 * hora por hora (`horaPorHora`) sí nombra los desfiles y concursos del
 * Ayuntamiento; la procesión sigue sin nombrarse.
 *
 * Este archivo casi no importa nada a propósito: lo leen el catálogo, el
 * checkout (cliente) y el popup que sale en todas las páginas, y no debe
 * arrastrarles el catálogo entero. Solo trae el tramo Valles–Xilitla de
 * `tiemposDeViaje`, que tampoco importa nada.
 */

import { MINUTOS_VALLES_XILITLA } from "./tiemposDeViaje";

/** "5:30 PM" ± minutos → "4:00 PM". Solo para las horas de esta salida. */
function moverHora(hora: string, minutos: number): string {
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(hora);
  if (!m) return hora;
  const h24 = (Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0);
  const total = (((h24 * 60 + Number(m[2]) + minutos) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(total % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "hacia las 4:00 PM" · "hacia la 1:00 AM". */
export function haciaLa(hora: string): string {
  return `hacia la${/^1:/.test(hora) ? "" : "s"} ${hora}`;
}

const RECOGIDA_NOCHE = "5:30 PM";
const REGRESO_NOCHE  = "11:30 PM";
const DEGUSTACION    = "tamales, atole, bocoles y pan de muerto";
/** Quien duerme en Valles sale antes y llega después: el tramo de sierra. */
const VALLES_SALIDA  = moverHora(RECOGIDA_NOCHE, -MINUTOS_VALLES_XILITLA);
const VALLES_REGRESO = moverHora(REGRESO_NOCHE, MINUTOS_VALLES_XILITLA);

/** Un renglón del hora por hora: «7:00 PM · Desfile de comparsas». */
export interface HoraNoche {
  hora: string;
  titulo: string;
  texto: string;
}

/**
 * La noche hora por hora (20 oct 2026, Manolo: «ya se publicó el programa
 * oficial de Xilitla, acomoda los horarios y agrega un itinerario hora por
 * hora»).
 *
 * Lo del pueblo sale de la convocatoria del Ayuntamiento de Xilitla para los
 * concursos de Xantolo 2026: sáb 31, desfile a las 7:00 PM desde la Escuela
 * Secundaria General Benemérito de las Américas y concurso regional de
 * comparsas a las 8:00 PM en la plaza principal (de 5 a 10 minutos cada
 * comparsa); dom 1, desfile a las 7:00 PM desde la misma secundaria y
 * concurso de catrinas.
 * 🔴 Cotejar con el cartel oficial: si el pueblo recorre una hora, se cambia
 * AQUÍ y se mueve sola en la página, el pago, el correo y la nota del equipo.
 *
 * Lo nuestro (recoger 5:30 PM, degustación, regreso 11:30 PM) no se movió: con
 * el desfile a las 7:00 la degustación cabe antes, sin prisas.
 */
function horaPorHora(delPueblo: HoraNoche[]): HoraNoche[] {
  return [
    { hora: RECOGIDA_NOCHE, titulo: "Pasamos por ti", texto: `A tu hospedaje en Xilitla, o nos vemos en el centro si todavía no tienes dónde quedarte. Desde Ciudad Valles salimos ${haciaLa(VALLES_SALIDA)}.` },
    { hora: "6:00 PM", titulo: "Degustación de temporada", texto: "Tamales, atole, bocoles y pan de muerto: lo que se come en estos días en la Huasteca." },
    { hora: "6:40 PM", titulo: "Al centro con el guía", texto: "Llegamos antes que el desfile para verlo pasar desde buen lugar." },
    ...delPueblo,
    { hora: REGRESO_NOCHE, titulo: "De regreso", texto: `Te dejamos donde te recogimos; en Ciudad Valles, ${haciaLa(VALLES_REGRESO)}.` },
  ];
}

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
  /** Lo que pone el pueblo esa noche, en corto: «Desfile y concurso de comparsas». */
  programa: string;
  /** La noche completa, hora por hora (`horaPorHora`). */
  horas: HoraNoche[];
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
  horaRecogida: RECOGIDA_NOCHE,
  regreso: REGRESO_NOCHE,
  recogida: "tu hospedaje en Xilitla",
  queVes: "las comparsas y los shows más representativos de esta celebración",
  degustacion: DEGUSTACION,
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
  /**
   * El día completo, opcional, de la misma noche (10 oct 2026).
   *
   * Por qué: el hotel está lleno el sábado 31, así que el paquete con hotel se
   * retiró del sitio. Lo que sí se puede vender sin cuartos es el DÍA: la Ruta
   * Surrealista termina entre 4:00 y 6:00 PM y la noche recoge a las 5:30 PM,
   * misma camioneta y mismo guía. Va como extra DENTRO de la noche, no como
   * paquete aparte: los dos salen en la misma unidad (`salidaMaxima`) y dos
   * cupos separados venderían dos veces el mismo asiento.
   *
   * El precio es el del tour (`TOURS_DB`, ruta-surrealista-edward-james): no
   * se anuncia ningún ahorro, porque no lo hay. Lo que se gana es logística.
   */
  tourOpcional: {
    tourSlug: "ruta-surrealista-edward-james",
    nombre: "Ruta Surrealista",
    nombreLargo: "Ruta Surrealista — Edward James, manantiales, cuevas y castillo",
    /**
     * Por adulto, el de LISTA (1 o 2 personas): sirve para anunciar «desde».
     * Lo que se COBRA lo calcula `paquetePricing` con el tour real y su
     * escalera por grupo ($1,350 desde 3, $1,300 desde 6), igual que suelta.
     * Los menores pagan con los mismos factores que la noche.
     */
    precioPorPersona: 1400,
    // La Ruta termina en Xilitla y empalma con la noche: no hay un «6:00 PM»
    // de fin del día (decía «de 8:00 AM a 6:00 PM» con la noche saliendo 5:30).
    horario: "desde las 8:00 AM",
    horaRecogida: "entre 8:00 y 9:00 AM",
    recogida: "tu hospedaje en Xilitla",
    incluye: [
      "Las Pozas de Edward James, el Nacimiento de Huichihuayán, la Cueva de las Quilas y el Castillo de la Salud",
      "Desayuno buffet camino a los destinos",
      "Entradas a todas las atracciones y guía certificado NOM-09",
      "Seguro de viaje y equipo de seguridad",
    ],
  },
  /**
   * Quien duerme en Ciudad Valles (decisión de Manolo, 11 oct 2026): el
   * transporte incluido es SOLO dentro de Xilitla; desde Valles se va y se
   * regresa con un cargo POR GRUPO, no por persona, en la noche sola y con la
   * Ruta. Las horas salen del tramo de sierra, no se escriben a mano.
   */
  desdeValles: {
    cargoPorGrupo: 500,
    /** La noche sola sale de Valles con el tramo de anticipación. */
    recogidaNoche: VALLES_SALIDA,
    /** Y llega a Valles con el tramo de vuelta. */
    regreso: VALLES_REGRESO,
  },
  noches: [
    {
      slug: "noche-de-xantolo-31-oct", fecha: "2026-10-31", fechaTexto: "Sábado 31 de octubre de 2026", corta: "Sábado 31 de octubre", cupo: 12,
      programa: "Desfile y concurso de comparsas",
      horas: horaPorHora([
        { hora: "7:00 PM", titulo: "Desfile de comparsas", texto: "Sale de la Secundaria Benemérito de las Américas rumbo a la plaza principal: máscaras, disfraces y danza." },
        { hora: "8:00 PM", titulo: "Concurso regional de comparsas", texto: "En la plaza principal. Cada comparsa baila de 5 a 10 minutos y el guía te cuenta qué representa cada personaje." },
      ]),
    },
    {
      slug: "noche-de-xantolo-1-nov", fecha: "2026-11-01", fechaTexto: "Domingo 1 de noviembre de 2026", corta: "Domingo 1 de noviembre", cupo: 12,
      programa: "Desfile y concurso de catrinas",
      horas: horaPorHora([
        { hora: "7:00 PM", titulo: "Desfile de catrinas", texto: "Sale de la Secundaria Benemérito de las Américas rumbo al centro." },
        { hora: "Enseguida", titulo: "Concurso de catrinas", texto: "Al llegar el desfile al centro, con el guía a tu lado." },
      ]),
    },
  ] as NocheXantoloFecha[],
};

/**
 * Lo de en medio del hora por hora, en una línea (sin la recogida ni el
 * regreso, que cada texto dice a su modo): «6:00 PM, degustación de temporada;
 * … 8:00 PM, concurso regional de comparsas». Para el pago, el correo y la
 * nota del equipo.
 */
export function horasEnFrase(n: NocheXantoloFecha): string {
  return n.horas
    .slice(1, -1)
    .map((h) => `${/^\d/.test(h.hora) ? h.hora : h.hora.toLowerCase()}, ${h.titulo.charAt(0).toLowerCase()}${h.titulo.slice(1)}`)
    .join("; ");
}

/** Lo que paga un niño, redondeado como lo cobra el motor. */
export function precioNinoNoche(tramo: "medio" | "chico"): number {
  const f = tramo === "medio" ? NOCHE_XANTOLO.factorNinoMedio : NOCHE_XANTOLO.factorNinoChico;
  return Math.round(NOCHE_XANTOLO.precioAdulto * f);
}

/**
 * El día completo: la Ruta Surrealista más la noche, por persona. `ruta` es lo
 * que paga cada uno por la Ruta en SU grupo (`cotizacion.toursPorPersona`); sin
 * él, el de lista.
 */
export function precioNocheConTour(
  tramo: "adulto" | "medio" | "chico",
  ruta: number = NOCHE_XANTOLO.tourOpcional.precioPorPersona,
): number {
  const base = NOCHE_XANTOLO.precioAdulto + ruta;
  if (tramo === "adulto") return base;
  const f = tramo === "medio" ? NOCHE_XANTOLO.factorNinoMedio : NOCHE_XANTOLO.factorNinoChico;
  return Math.round(base * f);
}

/** ¿Este slug es una de las noches? */
export function esNocheXantolo(slug: string): boolean {
  return NOCHE_XANTOLO.noches.some((n) => n.slug === slug);
}
