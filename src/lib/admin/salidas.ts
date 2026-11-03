// Reserva → días de tour → salidas.
//
// Una reserva (`TourBooking`) puede traer varios tours en `lineItems`, cada uno
// con su fecha: cada renglón es un DÍA DE TOUR. Una SALIDA es la combinación
// tour + fecha: dos reservas de Tamul el mismo día son UNA salida (una
// camioneta, un guía, un costo fijo). Por eso en noviembre de 2026 el
// calendario decía «31 salidas» cuando eran 20 reservas, 31 días de tour y 27
// salidas reales (línea base del 3 nov 2026).
//
// Puro (sin Prisma): lo usan el calendario, el scorecard, la rentabilidad y el
// script de conciliación, y se prueba en `__tests__/salidas.test.ts`.

import { codigoDeTour } from "./coloresTour";
import { grupoDe, lineasDe, type ConLineas } from "./reserva";

/** Lo que hace falta de una reserva para sacar sus días de tour. */
export type ReservaParaSalidas = ConLineas & {
  confirmationNumber: string;
  tourDate: string;
  tourSlug: string;
  tourName: string;
  totalAmount: number;
  customerName?: string;
};

export interface DiaDeTour {
  folio: string;
  fecha: string;
  slug: string;
  nombre: string;
  personas: number;
  /** Lo registrado en ese renglón (sin hotel ni extras). */
  monto: number;
  cliente: string;
}

export interface SalidaAgrupada {
  clave: string;
  fecha: string;
  slug: string;
  codigo: string;
  nombre: string;
  personas: number;
  reservas: number;
  folios: string[];
  clientes: string[];
  monto: number;
  /** RZR, buceo y salidas a medida: no llevan meta de personas. */
  aMedida: boolean;
}

/** Los tours que se venden a medida y no llevan meta de personas (prompt del 3 nov 2026). */
export const SLUGS_A_MEDIDA = new Set(["rzr-xilitla", "buceo-media-luna", "__personalizado", ""]);

/** Con 2 personas o menos un tour regular queda «Bajo mínimo». */
export const MINIMO_RENTABLE = 3;

export const esAMedida = (slug: string) => SLUGS_A_MEDIDA.has(slug) || codigoDeTour(slug) === "OTR";

/** Misma cuenta de personas que el Calendario y el cupo: `children` trae los dos tramos juntos. */
function personasDeLinea(l: Record<string, unknown>, b: ReservaParaSalidas): number {
  const n = (Number(l.adults) || 0)
    + Math.max(Number(l.children) || 0, (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0));
  return n || grupoDe(b).total;
}

/** Los días de tour de una reserva: uno por renglón con fecha; sin renglones, el tour principal. */
export function diasDeTourDe(b: ReservaParaSalidas): DiaDeTour[] {
  const lineas = lineasDe(b).filter(l => !!l.tourDate) as Array<Record<string, unknown> & { tourDate: string }>;
  const cliente = b.customerName ?? "";
  if (lineas.length > 0) {
    return lineas.map(l => ({
      folio: b.confirmationNumber,
      fecha: String(l.tourDate),
      // Un renglón sin tour en un carrito de varios es un concepto (traslado,
      // algo cobrado a mano) y no hereda el tour; con un solo renglón sí (son
      // reservas viejas que no guardaban el slug en el renglón).
      slug: String(l.tourSlug || (lineas.length === 1 ? b.tourSlug : "")),
      nombre: String(l.tourName || b.tourName || ""),
      personas: personasDeLinea(l, b),
      monto: l.subtotal != null ? Number(l.subtotal) : b.totalAmount,
      cliente,
    }));
  }
  return [{
    folio: b.confirmationNumber, fecha: b.tourDate, slug: b.tourSlug, nombre: b.tourName,
    personas: grupoDe(b).total, monto: b.totalAmount, cliente,
  }];
}

/**
 * La clave de la salida a la que pertenece un día de tour: tour + fecha. Una
 * salida a medida o un renglón sin tour se distingue además por su nombre: dos
 * «personalizados» distintos el mismo día NO son la misma camioneta.
 */
export function claveDeSalida(d: Pick<DiaDeTour, "fecha" | "slug" | "nombre">): string {
  const base = `${d.fecha}|${d.slug}`;
  return esAMedida(d.slug) ? `${base}|${d.nombre.trim().toLowerCase()}` : base;
}

/** Los días de tour agrupados en salidas, en orden de fecha. */
export function agruparSalidas(dias: DiaDeTour[]): SalidaAgrupada[] {
  const porClave = new Map<string, SalidaAgrupada>();
  for (const d of dias) {
    const clave = claveDeSalida(d);
    let s = porClave.get(clave);
    if (!s) {
      s = {
        clave, fecha: d.fecha, slug: d.slug, codigo: codigoDeTour(d.slug), nombre: d.nombre,
        personas: 0, reservas: 0, folios: [], clientes: [], monto: 0, aMedida: esAMedida(d.slug),
      };
      porClave.set(clave, s);
    }
    s.personas += d.personas;
    s.monto += d.monto;
    if (!s.folios.includes(d.folio)) { s.folios.push(d.folio); s.reservas++; }
    if (d.cliente && !s.clientes.includes(d.cliente)) s.clientes.push(d.cliente);
  }
  return Array.from(porClave.values()).sort((a, b) => a.clave.localeCompare(b.clave));
}

export interface ResumenSalidas {
  reservas: number;
  diasDeTour: number;
  salidas: number;
  /** Personas ÷ salidas, con un decimal. */
  paxPorSalida: number;
  /** Salidas regulares (con meta) de `MINIMO_RENTABLE − 1` personas o menos. */
  regularesBajoMinimo: number;
  regulares: number;
}

/** Los números de un conjunto de días de tour (un mes, una semana). */
export function resumirSalidas(dias: DiaDeTour[]): ResumenSalidas {
  const salidas = agruparSalidas(dias);
  const regulares = salidas.filter(s => !s.aMedida);
  const personas = salidas.reduce((t, s) => t + s.personas, 0);
  return {
    reservas: new Set(dias.map(d => d.folio)).size,
    diasDeTour: dias.length,
    salidas: salidas.length,
    paxPorSalida: salidas.length ? Math.round((personas / salidas.length) * 10) / 10 : 0,
    regularesBajoMinimo: regulares.filter(s => s.personas < MINIMO_RENTABLE).length,
    regulares: regulares.length,
  };
}

/** Los días de tour de varias reservas que caen en un rango YYYY-MM-DD (inclusive). */
export function diasEnRango(reservas: ReservaParaSalidas[], desde: string, hasta: string): DiaDeTour[] {
  return reservas.flatMap(diasDeTourDe).filter(d => d.fecha >= desde && d.fecha <= hasta);
}
