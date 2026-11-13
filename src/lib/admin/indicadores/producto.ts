// Producto (pestaña «Portafolio», 4 nov 2026).
//
// El documento pide «cada tour clasificado (estrella, complemento o a revisar)
// según demanda y margen medido». La regla está escrita aquí y en la pantalla;
// los umbrales son propuesta (se cambian en `clasificar`):
//   · Falta medir: sin salidas con costos en el periodo (no hay margen).
//   · A revisar: margen < 20 % o menos de 3 reservas en el periodo.
//   · Estrella: margen ≥ 30 % y demanda alta (el cuartil de arriba, mínimo 3).
//   · Complemento: el resto.

import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { TOURS_LISTA } from "@/lib/tours";
import { montoCobrado } from "@/lib/admin/dinero";
import { incluyeHotel, lineasDe } from "@/lib/admin/reserva";
import { esAMedida } from "@/lib/admin/salidas";
import { salidasEntre } from "@/lib/admin/salidasDia";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { conceptosDe } from "@/lib/admin/costos";
import { ESTADOS_ENVIADA } from "./comercial";
import { finMX, inicioMX } from "./periodo";
import { NO_CUENTAN, enPeriodo, r1, serie, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export const TAMUL = "expedicion-tamul";

export type Clase = "estrella" | "complemento" | "a-revisar" | "falta-medir";
export const ETIQUETA_CLASE: Record<Clase, string> = { estrella: "Estrella", complemento: "Complemento", "a-revisar": "A revisar", "falta-medir": "Falta medir" };

export interface ReservaProd { ymd: string; lineas: { slug: string; subtotal: number }[]; cobrado: number; conHotel: boolean }
export interface SalidaProd { fecha: string; slug: string; personas: number; ingreso: number; margen: number; conCostos: boolean; deCorte: boolean }
export interface DatosProducto {
  reservas: ReservaProd[];
  activos: { slug: string; codigo: string; nombre: string }[];
  conCostos: string[];
  salidas: SalidaProd[];
  cotizaciones2Dias: { ymd: string; conHotel: boolean }[];
}

export interface FilaTour {
  slug: string; codigo: string; nombre: string; reservas: number; acompanado: number | null;
  cobrado: number; pctCobrado: number | null; salidas: number; personas: number; paxPorSalida: number | null;
  margenPct: number | null; costosCotizador: boolean; costosCorte: boolean; clase: Clase;
}
export interface MedicionProducto { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: { tours: FilaTour[]; umbralAlta: number } }

/** El reparto de lo cobrado de una reserva entre sus tours, por el peso de cada renglón (igual que Ventas). */
export function cobradoPorTour(r: ReservaProd): Map<string, number> {
  const out = new Map<string, number>();
  const tot = r.lineas.reduce((t, l) => t + Math.max(0, l.subtotal), 0);
  for (const l of r.lineas) {
    const parte = tot > 0 ? r.cobrado * (Math.max(0, l.subtotal) / tot) : r.cobrado / Math.max(1, r.lineas.length);
    out.set(l.slug, (out.get(l.slug) ?? 0) + parte);
  }
  return out;
}

export function clasificar(margenPct: number | null, reservas: number, umbralAlta: number): Clase {
  if (margenPct === null) return "falta-medir";
  if (margenPct < 20 || reservas < 3) return "a-revisar";
  if (margenPct >= 30 && reservas >= umbralAlta) return "estrella";
  return "complemento";
}

function pesoTamul(d: DatosProducto, p: Periodo): ValorKpi {
  let total = 0, tamul = 0;
  for (const r of d.reservas.filter(x => enPeriodo(x.ymd, p))) {
    total += r.cobrado;
    tamul += cobradoPorTour(r).get(TAMUL) ?? 0;
  }
  return total > 0
    ? { clave: "peso-tamul", valor: r1((tamul / total) * 100), detalle: `$${Math.round(tamul).toLocaleString("es-MX")} de $${Math.round(total).toLocaleString("es-MX")} cobrados`, calidad: "exacto" }
    : { clave: "peso-tamul", valor: null, calidad: "sin-dato", nota: "Nada cobrado en reservas del periodo." };
}

export function calcularProducto(d: DatosProducto, p: Periodo, periodos: Periodo[]): MedicionProducto {
  const con = new Set(d.conCostos);
  const activosConCostos = d.activos.filter(t => con.has(t.slug)).length;
  const hotel = (x: Periodo) => {
    const rs = d.reservas.filter(r => enPeriodo(r.ymd, x));
    return tasa("reservas-hotel", rs.filter(r => r.conHotel).length, rs.length, { unidadDetalle: "reservas" });
  };
  const hospedaje = (x: Periodo) => {
    const qs = d.cotizaciones2Dias.filter(q => enPeriodo(q.ymd, x));
    return tasa("hospedaje-ofrecido", qs.filter(q => q.conHotel).length, qs.length, { unidadDetalle: "cotizaciones de 2+ días", sinDatoNota: "Sin cotizaciones de 2 o más días en el periodo." });
  };
  const valores: ValorKpi[] = [
    { ...tasa("tours-margen", activosConCostos, d.activos.length, { unidadDetalle: "tours activos" }),
      nota: d.activos.length !== 11 ? `El catálogo activo tiene hoy ${d.activos.length} tours (el documento contaba 11).` : undefined },
    hotel(p), pesoTamul(d, p), hospedaje(p),
  ];
  const series: Record<string, PuntoSerie[]> = {
    "reservas-hotel": serie(periodos, x => hotel(x).valor),
    "peso-tamul": serie(periodos, x => pesoTamul(d, x).valor),
    "hospedaje-ofrecido": serie(periodos, x => hospedaje(x).valor),
  };

  // ── Tabla por tour ──
  const rs = d.reservas.filter(r => enPeriodo(r.ymd, p));
  const totalCobrado = rs.reduce((t, r) => t + r.cobrado, 0);
  const ss = d.salidas.filter(s => enPeriodo(s.fecha, p));
  const slugs = new Set([...d.activos.map(t => t.slug), ...rs.flatMap(r => r.lineas.map(l => l.slug))]);
  const filas: FilaTour[] = Array.from(slugs).filter(s => !esAMedida(s)).map(slug => {
    const info = d.activos.find(t => t.slug === slug);
    const suyas = rs.filter(r => r.lineas.some(l => l.slug === slug));
    const cobrado = suyas.reduce((t, r) => t + (cobradoPorTour(r).get(slug) ?? 0), 0);
    const sal = ss.filter(s => s.slug === slug);
    const conC = sal.filter(s => s.conCostos);
    const ingreso = conC.reduce((t, s) => t + s.ingreso, 0);
    const personas = sal.reduce((t, s) => t + s.personas, 0);
    return {
      slug, codigo: codigoDeTour(slug), nombre: info?.nombre ?? slug, reservas: suyas.length,
      acompanado: suyas.length ? Math.round((suyas.filter(r => new Set(r.lineas.map(l => l.slug)).size > 1).length / suyas.length) * 100) : null,
      cobrado: Math.round(cobrado), pctCobrado: totalCobrado ? r1((cobrado / totalCobrado) * 100) : null,
      salidas: sal.length, personas, paxPorSalida: sal.length ? r1(personas / sal.length) : null,
      margenPct: conC.length && ingreso > 0 ? Math.round((conC.reduce((t, s) => t + s.margen, 0) / ingreso) * 100) : null,
      costosCotizador: con.has(slug), costosCorte: sal.some(s => s.deCorte), clase: "falta-medir" as Clase,
    };
  });
  const demandas = filas.map(f => f.reservas).filter(n => n > 0).sort((a, b) => a - b);
  const umbralAlta = Math.max(3, demandas.length ? demandas[Math.floor(demandas.length * 0.75)] : 3);
  for (const f of filas) f.clase = clasificar(f.margenPct, f.reservas, umbralAlta);
  filas.sort((a, b) => b.cobrado - a.cobrado || b.reservas - a.reservas);
  return { valores, series, detalle: { tours: filas, umbralAlta } };
}

export async function cargarProducto(periodos: Periodo[]): Promise<DatosProducto> {
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const [reservas, costos, salidas, cotizaciones] = await Promise.all([
    prisma.tourBooking.findMany({
      where: { createdAt: { gte: inicioMX(desde), lte: finMX(hasta) }, status: { notIn: NO_CUENTAN } },
      select: { createdAt: true, tourSlug: true, tourName: true, tourDate: true, adults: true, children: true, totalAmount: true, lineItems: true, packageItems: true, depositoPagado: true, stripePaymentIntentId: true },
    }),
    prisma.tourCosto.findMany({ select: { tourSlug: true, conceptos: true } }),
    salidasEntre(desde, hasta),
    prisma.tourQuote.findMany({
      where: { createdAt: { gte: inicioMX(desde), lte: finMX(hasta) }, status: { in: ESTADOS_ENVIADA } },
      select: { createdAt: true, lineItems: true, packageItems: true, tourDate: true, tourSlug: true, tourName: true, adults: true, children: true, totalAmount: true },
    }),
  ]);
  return {
    reservas: reservas.map(b => {
      const ls = lineasDe(b);
      return {
        ymd: ymdMX(b.createdAt), cobrado: montoCobrado(b), conHotel: incluyeHotel(b),
        lineas: ls.length ? ls.map(l => ({ slug: l.tourSlug ?? "", subtotal: Number(l.subtotal) || 0 })) : [{ slug: b.tourSlug, subtotal: b.totalAmount }],
      };
    }),
    activos: TOURS_LISTA.filter(t => !esAMedida(t.slug)).map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug), nombre: t.nombreCorto || t.nombre })),
    conCostos: costos.filter(c => conceptosDe(c.conceptos).length > 0).map(c => c.tourSlug),
    salidas: salidas.map(s => ({ fecha: s.fecha, slug: s.slug, personas: s.personas, ingreso: s.numeros.ingreso, margen: s.numeros.margen, conCostos: s.numeros.conCostos, deCorte: s.fuenteCostos === "corte" })),
    cotizaciones2Dias: cotizaciones.flatMap(q => {
      const fechas = new Set(lineasDe(q).map(l => l.tourDate).filter(Boolean));
      if (fechas.size < 2) return [];
      return [{ ymd: ymdMX(q.createdAt), conHotel: incluyeHotel(q) }];
    }),
  };
}

export async function medirProducto(p: Periodo, periodos: Periodo[]): Promise<MedicionProducto> {
  return calcularProducto(await cargarProducto(periodos), p, periodos);
}
