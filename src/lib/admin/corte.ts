// El corte del negocio, en el formato en que lo lee cualquier empresa:
// ingresos → costo de ventas → utilidad bruta → gastos de operación →
// utilidad neta. Con el periodo anterior al lado y el histórico detrás.
//
// Dos números de costo conviven a propósito, y la diferencia entre ellos es
// justo lo que hay que mirar:
//
//   · COSTO REAL      lo que se capturó a mano (GastoCorte). Es dinero que salió.
//   · COSTO ESPERADO  lo que ese tour DEBERÍA costar según el Cotizador
//                     (TourCosto: tanto por persona + tanto fijo por salida).
//
// La utilidad "oficial" del corte usa el real cuando existe; si a una salida no
// se le capturó nada, cuenta como cero y se avisa. El esperado nunca se cuela en
// el resultado: vive aparte, como referencia y como semáforo de la captura.
// Así el corte no miente y, aun así, desde el primer día dice cuánto DEBERÍA
// estar quedando.

import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { montoCobrado, saldoPendiente } from "./kpis";
import { conceptosDe, costoDeLinea, type ConceptoCosto } from "./costos";
import { costoExtraLine, type ExtraItem } from "./extras";
import { TOURS_DB } from "@/lib/tours";
import type { TourBooking, GastoCorte } from "@prisma/client";

/** Stripe México: 3.6% + IVA sobre lo cobrado con tarjeta. */
export const COMISION_STRIPE = 0.036 * 1.16;

export type BaseCorte  = "tour" | "venta";
export type Granularidad = "dia" | "semana" | "mes";

const entero = (v: unknown) => Math.round(Number(v) || 0);

// ── Fechas (todo en YYYY-MM-DD, hora de México) ─────────────────────────────

export function sumaDias(ymd: string, dias: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de esa fecha: la semana de trabajo arranca en lunes. */
export function lunesDe(ymd: string): string {
  const dow = (new Date(ymd + "T12:00:00Z").getUTCDay() + 6) % 7;
  return sumaDias(ymd, -dow);
}

export function primeroDeMes(ymd: string): string { return ymd.slice(0, 8) + "01"; }

export function finDeMes(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** El periodo completo (inicio y fin) que contiene esa fecha. */
export function periodoDe(ymd: string, g: Granularidad): { desde: string; hasta: string } {
  if (g === "dia")    return { desde: ymd, hasta: ymd };
  if (g === "semana") { const l = lunesDe(ymd); return { desde: l, hasta: sumaDias(l, 6) }; }
  return { desde: primeroDeMes(ymd), hasta: finDeMes(ymd) };
}

/** El periodo anterior del mismo tamaño: con qué se compara. */
export function periodoAnterior(p: { desde: string; hasta: string }, g: Granularidad) {
  if (g === "dia")    return periodoDe(sumaDias(p.desde, -1), g);
  if (g === "semana") return periodoDe(sumaDias(p.desde, -7), g);
  return periodoDe(sumaDias(primeroDeMes(p.desde), -1), g);
}

// ── Piezas de una reserva ───────────────────────────────────────────────────

function extrasDe(b: TourBooking): ExtraItem[] {
  const raw = (b as any).extraItems;
  return Array.isArray(raw) ? (raw as ExtraItem[]) : [];
}

interface LineaTour { tourSlug?: string; tourName?: string; subtotal?: number; _meta?: unknown }

function lineasDe(b: TourBooking): LineaTour[] {
  const raw = (b as any).lineItems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l: any) => l && !l._meta && (l.tourSlug || l.tourName));
}

/** El grupo real: 2 personas con 5 tours son 2, no 10. */
export function personasDe(b: TourBooking): number {
  const raw = (b as any).lineItems;
  const meta = Array.isArray(raw) ? raw.find((l: any) => l?._meta) : null;
  const delMeta = Number(meta?.numPersonas) || 0;
  return delMeta > 0 ? delMeta : (b.adults || 0) + (b.children || 0);
}

function hospedajeDe(b: TourBooking): number {
  const raw = (b as any).packageItems;
  if (!Array.isArray(raw)) return 0;
  return raw.reduce((s: number, p: any) => s + entero(p?.subtotal), 0);
}

export function fechaDeCorte(b: TourBooking, base: BaseCorte): string {
  return base === "tour" ? (b.tourDate || ymdMX(b.createdAt)) : ymdMX(b.createdAt);
}

/**
 * Lo que DEBERÍA costar operar esta reserva, según el Cotizador.
 * Se cobra el costo de cada recorrido de la reserva para el tamaño del grupo,
 * más lo que cuestan los extras. El hospedaje no entra: su costo no vive en el
 * Cotizador, y meter un cero disfrazado de dato sería peor que no decir nada.
 */
export function costoEsperado(
  b: TourBooking, costosPorSlug: Record<string, ConceptoCosto[]>,
): { monto: number; completo: boolean } {
  const personas = personasDe(b);
  const lineas   = lineasDe(b);
  const slugs    = lineas.length ? lineas.map(l => l.tourSlug || "") : [b.tourSlug];

  let monto = 0;
  let completo = slugs.length > 0;
  for (const slug of slugs) {
    const conceptos = slug ? costosPorSlug[slug] : undefined;
    if (!conceptos || conceptos.length === 0) { completo = false; continue; }
    monto += costoDeLinea(conceptos, personas);
  }
  monto += extrasDe(b).reduce((s, e) => s + costoExtraLine(e), 0);
  return { monto, completo };
}

// ── Una reserva dentro del corte ────────────────────────────────────────────

export interface FilaReserva {
  id: string;
  folio: string;
  fechaTour: string;
  fechaVenta: string;
  cliente: string;
  tour: string;
  tourSlug: string;
  personas: number;
  guia: string;
  venta: number;
  cobrado: number;
  porCobrar: number;
  /** Costos capturados a mano y ligados a esta salida. */
  costoReal: number;
  /** Lo que debería costar según el Cotizador. */
  costoEsperado: number;
  /** false = al Cotizador le faltan los costos de algún tour de esta reserva. */
  esperadoCompleto: boolean;
  comision: number;
  costoTotal: number;
  utilidad: number;
  margen: number;
  costoCapturado: boolean;
}

function filaDeReserva(
  b: TourBooking, capturado: number, costosPorSlug: Record<string, ConceptoCosto[]>,
): FilaReserva {
  const venta   = entero(b.totalAmount);
  const cobrado = montoCobrado(b);
  const esperado = costoEsperado(b, costosPorSlug);
  // La comisión se paga sobre lo cobrado con tarjeta, no sobre la venta.
  const comision = b.stripePaymentIntentId ? Math.round(cobrado * COMISION_STRIPE) : 0;

  const costoTotal = capturado + comision;
  const utilidad   = venta - costoTotal;

  return {
    id: b.id,
    folio: b.confirmationNumber,
    fechaTour: b.tourDate || "",
    fechaVenta: ymdMX(b.createdAt),
    cliente: b.customerName,
    tour: b.tourName,
    tourSlug: b.tourSlug,
    personas: personasDe(b),
    guia: ((b as any).guia || "") as string,
    venta,
    cobrado,
    porCobrar: saldoPendiente(b),
    costoReal: capturado,
    costoEsperado: esperado.monto,
    esperadoCompleto: esperado.completo,
    comision,
    costoTotal,
    utilidad,
    margen: venta > 0 ? Math.round((utilidad / venta) * 100) : 0,
    costoCapturado: capturado > 0,
  };
}

// ── El corte ────────────────────────────────────────────────────────────────

export interface FilaTour {
  slug: string;
  nombre: string;
  salidas: number;
  personas: number;
  ventas: number;
  costoReal: number;
  costoEsperado: number;
  utilidad: number;
  margen: number;
}

export interface Totales {
  ventasTours: number;
  ventasHospedaje: number;
  ventasExtras: number;
  ventas: number;

  costoVentas: number;      // capturado y ligado a salidas
  comision: number;
  utilidadBruta: number;
  margenBruto: number;

  gastosOperacion: number;  // gastos generales del periodo
  utilidadNeta: number;
  margenNeto: number;

  cobrado: number;
  porCobrar: number;

  reservas: number;
  personas: number;
  ticketPromedio: number;

  /** Lo que el Cotizador dice que debería haber costado. */
  costoEsperado: number;
  utilidadEsperada: number;
  margenEsperado: number;
}

export interface Corte {
  desde: string;
  hasta: string;
  base: BaseCorte;
  granularidad: Granularidad;

  total: Totales;
  anterior: Totales;
  anteriorDesde: string;
  anteriorHasta: string;

  reservas: FilaReserva[];
  porTour: FilaTour[];
  gastos: GastoCorte[];

  /** Salud del dato: sin captura, la utilidad es un techo. */
  captura: {
    conCosto: number;
    sinCosto: number;
    ventaSinCosto: number;
    /** % de las ventas del periodo que ya tienen costo real capturado. */
    cobertura: number;
    /** Reservas cuyo costo esperado no se puede calcular: falta el tour en el Cotizador. */
    sinCostoEnCotizador: number;
  };

  /** Últimos periodos, para ver la tendencia. */
  historico: { etiqueta: string; desde: string; ventas: number; costo: number; utilidad: number }[];
}

function totalesVacios(): Totales {
  return {
    ventasTours: 0, ventasHospedaje: 0, ventasExtras: 0, ventas: 0,
    costoVentas: 0, comision: 0, utilidadBruta: 0, margenBruto: 0,
    gastosOperacion: 0, utilidadNeta: 0, margenNeto: 0,
    cobrado: 0, porCobrar: 0,
    reservas: 0, personas: 0, ticketPromedio: 0,
    costoEsperado: 0, utilidadEsperada: 0, margenEsperado: 0,
  };
}

function sumarTotales(filas: FilaReserva[], reservasCrudas: TourBooking[], gastosOperacion: number): Totales {
  const t = totalesVacios();
  for (const r of filas) {
    t.ventas        += r.venta;
    t.cobrado       += r.cobrado;
    t.porCobrar     += r.porCobrar;
    t.costoVentas   += r.costoReal;
    t.comision      += r.comision;
    t.costoEsperado += r.costoEsperado;
    t.personas      += r.personas;
  }
  for (const b of reservasCrudas) {
    const hosp   = hospedajeDe(b);
    const extras = extrasDe(b).reduce((s, e) => s + (e.incluido ? 0 : entero(e.cantidad) * entero(e.precioUnitario)), 0);
    t.ventasHospedaje += hosp;
    t.ventasExtras    += extras;
  }
  t.ventasTours     = Math.max(0, t.ventas - t.ventasHospedaje - t.ventasExtras);
  t.reservas        = filas.length;
  t.ticketPromedio  = filas.length ? Math.round(t.ventas / filas.length) : 0;
  t.gastosOperacion = gastosOperacion;

  t.utilidadBruta = t.ventas - t.costoVentas - t.comision;
  t.margenBruto   = t.ventas > 0 ? Math.round((t.utilidadBruta / t.ventas) * 100) : 0;
  t.utilidadNeta  = t.utilidadBruta - t.gastosOperacion;
  t.margenNeto    = t.ventas > 0 ? Math.round((t.utilidadNeta / t.ventas) * 100) : 0;

  t.utilidadEsperada = t.ventas - t.costoEsperado - t.comision - t.gastosOperacion;
  t.margenEsperado   = t.ventas > 0 ? Math.round((t.utilidadEsperada / t.ventas) * 100) : 0;
  return t;
}

const nombreDeTour = (slug: string, respaldo: string) =>
  TOURS_DB.find(t => t.slug === slug)?.nombre || respaldo || slug;

export async function calcCorte(
  ymd: string, granularidad: Granularidad, base: BaseCorte = "tour",
): Promise<Corte> {
  const periodo  = periodoDe(ymd, granularidad);
  const anterior = periodoAnterior(periodo, granularidad);

  const [todas, costosFilas] = await Promise.all([
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" } } }),
    prisma.tourCosto.findMany(),
  ]);

  const costosPorSlug: Record<string, ConceptoCosto[]> = {};
  for (const f of costosFilas) costosPorSlug[f.tourSlug] = conceptosDe(f.conceptos);

  const enPeriodo = (p: { desde: string; hasta: string }) =>
    todas.filter(b => {
      const f = fechaDeCorte(b, base);
      return f >= p.desde && f <= p.hasta;
    });

  const crudas         = enPeriodo(periodo);
  const crudasAnterior = enPeriodo(anterior);
  const ids            = crudas.map(b => b.id);
  const idsAnterior    = crudasAnterior.map(b => b.id);

  // Los costos ligados siguen a SU salida (aunque se pagaran otro día);
  // los gastos generales entran por su fecha.
  const [ligados, ligadosAnterior, generales, generalesAnterior] = await Promise.all([
    ids.length ? prisma.gastoCorte.findMany({ where: { reservaId: { in: ids } }, orderBy: { fecha: "asc" } }) : Promise.resolve([]),
    idsAnterior.length ? prisma.gastoCorte.findMany({ where: { reservaId: { in: idsAnterior } } }) : Promise.resolve([]),
    prisma.gastoCorte.findMany({ where: { reservaId: null, fecha: { gte: periodo.desde,  lte: periodo.hasta  } }, orderBy: { fecha: "asc" } }),
    prisma.gastoCorte.findMany({ where: { reservaId: null, fecha: { gte: anterior.desde, lte: anterior.hasta } } }),
  ]);

  const capturadoPor = (lista: GastoCorte[]) => {
    const m: Record<string, number> = {};
    for (const g of lista) if (g.reservaId) m[g.reservaId] = (m[g.reservaId] ?? 0) + entero(g.monto);
    return m;
  };
  const capActual   = capturadoPor(ligados);
  const capAnterior = capturadoPor(ligadosAnterior);

  const reservas = crudas
    .map(b => filaDeReserva(b, capActual[b.id] ?? 0, costosPorSlug))
    .sort((a, b) => (a.fechaTour < b.fechaTour ? -1 : a.fechaTour > b.fechaTour ? 1 : 0));

  const filasAnterior = crudasAnterior.map(b => filaDeReserva(b, capAnterior[b.id] ?? 0, costosPorSlug));

  const total = sumarTotales(
    reservas, crudas,
    generales.reduce((s, g) => s + entero(g.monto), 0),
  );
  const anteriorTotales = sumarTotales(
    filasAnterior, crudasAnterior,
    generalesAnterior.reduce((s, g) => s + entero(g.monto), 0),
  );

  // ── Rentabilidad por tour ─────────────────────────────────────────────────
  // El costo real de una reserva con varios tours se reparte a prorrata de lo
  // que aporta cada uno: es lo único honesto sin pedirle a nadie que desglose
  // a mano el pago de una salida combinada.
  const porTourMap: Record<string, FilaTour> = {};
  for (const b of crudas) {
    const fila    = reservas.find(r => r.id === b.id)!;
    const lineas  = lineasDe(b);
    const efectivas = lineas.length
      ? lineas
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, subtotal: fila.venta }];
    const totalLineas = efectivas.reduce((s, l) => s + entero(l.subtotal), 0) || fila.venta || 1;

    for (const l of efectivas) {
      const slug  = l.tourSlug || b.tourSlug || "otros";
      const parte = entero(l.subtotal) / totalLineas;
      const t = (porTourMap[slug] ??= {
        slug, nombre: nombreDeTour(slug, l.tourName || b.tourName),
        salidas: 0, personas: 0, ventas: 0, costoReal: 0, costoEsperado: 0, utilidad: 0, margen: 0,
      });
      t.salidas  += 1;
      t.personas += fila.personas;
      t.ventas   += entero(l.subtotal) || Math.round(fila.venta * parte);
      t.costoReal     += Math.round(fila.costoReal * parte);
      t.costoEsperado += costosPorSlug[slug] ? costoDeLinea(costosPorSlug[slug], fila.personas) : 0;
    }
  }
  const porTour = Object.values(porTourMap).map(t => {
    t.utilidad = t.ventas - t.costoReal;
    t.margen   = t.ventas > 0 ? Math.round((t.utilidad / t.ventas) * 100) : 0;
    return t;
  }).sort((a, b) => b.ventas - a.ventas);

  // ── Salud de la captura ───────────────────────────────────────────────────
  const conCosto      = reservas.filter(r => r.costoCapturado);
  const sinCosto      = reservas.filter(r => !r.costoCapturado);
  const ventaConCosto = conCosto.reduce((s, r) => s + r.venta, 0);

  // ── Histórico: los periodos anteriores, para ver la tendencia ────────────
  const cuantos = granularidad === "dia" ? 14 : granularidad === "semana" ? 12 : 12;
  const historico: Corte["historico"] = [];
  let cursor = periodo;
  for (let i = 0; i < cuantos; i++) {
    const crudasH = enPeriodo(cursor);
    const idsH    = crudasH.map(b => b.id);
    const ventasH = crudasH.reduce((s, b) => s + entero(b.totalAmount), 0);
    const ligadosH = idsH.length
      ? await prisma.gastoCorte.aggregate({ _sum: { monto: true }, where: { reservaId: { in: idsH } } })
      : { _sum: { monto: 0 } };
    const generalesH = await prisma.gastoCorte.aggregate({
      _sum: { monto: true },
      where: { reservaId: null, fecha: { gte: cursor.desde, lte: cursor.hasta } },
    });
    const costoH = entero(ligadosH._sum.monto) + entero(generalesH._sum.monto);
    historico.unshift({
      etiqueta: etiquetaPeriodo(cursor.desde, granularidad),
      desde:    cursor.desde,
      ventas:   ventasH,
      costo:    costoH,
      utilidad: ventasH - costoH,
    });
    cursor = periodoAnterior(cursor, granularidad);
  }

  return {
    desde: periodo.desde,
    hasta: periodo.hasta,
    base,
    granularidad,
    total,
    anterior: anteriorTotales,
    anteriorDesde: anterior.desde,
    anteriorHasta: anterior.hasta,
    reservas,
    porTour,
    gastos: [...ligados, ...generales].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)),
    captura: {
      conCosto: conCosto.length,
      sinCosto: sinCosto.length,
      ventaSinCosto: sinCosto.reduce((s, r) => s + r.venta, 0),
      cobertura: total.ventas > 0 ? Math.round((ventaConCosto / total.ventas) * 100) : 0,
      sinCostoEnCotizador: reservas.filter(r => !r.esperadoCompleto).length,
    },
    historico,
  };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function etiquetaPeriodo(desde: string, g: Granularidad): string {
  const [y, m, d] = desde.split("-").map(Number);
  if (g === "mes")    return `${MESES[m - 1]} ${String(y).slice(2)}`;
  if (g === "semana") return `${d} ${MESES[m - 1]}`;
  return `${d} ${MESES[m - 1]}`;
}
