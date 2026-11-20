// Precio (pestaña «Precios», 4 nov 2026). Informativo: el documento no trae
// metas de precio; se mide para fijarlas con 4 semanas de datos.
//
// «Precio de lista» = lo que cobraría el catálogo HOY por ese renglón: mismo
// tour, misma fecha (promo de temporada incluida) y mismo tamaño de grupo
// (`totalRecorrido`, la función con la que cobra la web). Los complementos
// (traslado desde Valles, actividades opcionales) se quitan antes de comparar.
//
// Lote 9 (10 nov 2026): la lista lleva la OPCIÓN elegida (Ruta Acuática →
// Tamasopo, +$230 por persona; sin ella salía «arriba de lista»), lo vendido es
// lo que de verdad se cobró del renglón (después de descuentos y del total
// editado) y el descuento de una reserva se cuenta UNA vez: el código de
// cumpleaños ya se guarda como su descuento y se sumaba dos veces.

import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { TOURS_LISTA, esPorPersona, tourEnFecha } from "@/lib/tours";
import { totalRecorrido } from "@/lib/tourBooking";
import { factorDeTotal, lineasDe, metaDe, grupoDe, type LineaTour } from "@/lib/admin/reserva";
import { extrasDe, totalExtras } from "@/lib/admin/extras";
import { descuentoDeMeta, montoDescuento } from "@/lib/admin/descuento";
import { baseCumple, codigoDeLineas } from "@/lib/encuestas/cumple";
import { claveMotivo } from "@/lib/admin/crm";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { ORIGEN_ETIQUETA, origenValido } from "@/lib/origenReserva";
import { ESTADOS_ENVIADA } from "./comercial";
import { finMX, inicioMX } from "./periodo";
import { NO_CUENTAN, enPeriodo, personasDeLinea, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface LineaPrecio { ymd: string; slug: string; personas: number; subtotal: number; lista: number }
export interface ReservaPrecio { ymd: string; origen: string; total: number; descuento: number; aproximado: boolean }
export interface DatosPrecio {
  lineas: LineaPrecio[];
  reservas: ReservaPrecio[];
  perdidos: { ymd: string; motivo: string | null }[];
  cotizaciones: { ymd: string; porPersona: number; aceptada: boolean }[];
}

export const TRAMOS_GRUPO: { etiqueta: string; ok: (n: number) => boolean }[] = [
  { etiqueta: "1 persona", ok: n => n === 1 }, { etiqueta: "2", ok: n => n === 2 }, { etiqueta: "3–4", ok: n => n >= 3 && n <= 4 },
  { etiqueta: "5–7", ok: n => n >= 5 && n <= 7 }, { etiqueta: "8 o más", ok: n => n >= 8 },
];

export interface DetallePrecio {
  porTour: { slug: string; codigo: string; nombre: string; lineas: number; personas: number; precioPersona: number | null; listaPersona: number | null; realizacion: number | null }[];
  porTamano: { etiqueta: string; lineas: number; precioPersona: number | null; listaPersona: number | null }[];
  porRango: { etiqueta: string; cotizaciones: number; aceptadas: number; tasa: number | null }[];
  porCanal: { canal: string; reservas: number; ticket: number | null }[];
}
export interface MedicionPrecio { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: DetallePrecio }

function realizacion(d: DatosPrecio, p: Periodo): ValorKpi {
  const ls = d.lineas.filter(l => enPeriodo(l.ymd, p) && l.lista > 0);
  const sub = ls.reduce((t, l) => t + l.subtotal, 0), lista = ls.reduce((t, l) => t + l.lista, 0);
  return lista > 0
    ? { clave: "realizacion-precio", valor: r1((sub / lista) * 100), detalle: `$${Math.round(sub).toLocaleString("es-MX")} vendidos contra $${Math.round(lista).toLocaleString("es-MX")} de lista`, calidad: "exacto" }
    : sinDato("realizacion-precio", "Sin renglones de tours por persona en el periodo.");
}
function precioPersona(d: DatosPrecio, p: Periodo): ValorKpi {
  const ls = d.lineas.filter(l => enPeriodo(l.ymd, p) && l.personas > 0);
  const pax = ls.reduce((t, l) => t + l.personas, 0);
  return pax > 0
    ? { clave: "precio-persona", valor: Math.round(ls.reduce((t, l) => t + l.subtotal, 0) / pax), detalle: `${pax} personas`, calidad: "exacto" }
    : sinDato("precio-persona", "Sin renglones de tours por persona en el periodo.");
}
function descuentos(d: DatosPrecio, p: Periodo): { con: ValorKpi; prom: ValorKpi } {
  const rs = d.reservas.filter(r => enPeriodo(r.ymd, p));
  const desc = rs.reduce((t, r) => t + r.descuento, 0);
  const antes = rs.reduce((t, r) => t + r.total + r.descuento, 0);
  const aprox = rs.some(r => r.aproximado && r.descuento > 0);
  return {
    con: tasa("reservas-con-descuento", rs.filter(r => r.descuento > 0).length, rs.length, { unidadDetalle: "reservas" }),
    prom: antes > 0
      ? { clave: "descuento-promedio", valor: r1((desc / antes) * 100), detalle: `$${Math.round(desc).toLocaleString("es-MX")} descontados`, calidad: aprox ? "aproximado" : "exacto", nota: aprox ? "Los códigos web se guardan como %: el monto se estima." : undefined }
      : sinDato("descuento-promedio", "Sin reservas en el periodo."),
  };
}
function perdidasPrecio(d: DatosPrecio, p: Periodo): ValorKpi {
  const ps = d.perdidos.filter(x => enPeriodo(x.ymd, p));
  return tasa("perdidas-precio", ps.filter(x => claveMotivo(x.motivo) === "precio").length, ps.length, { unidadDetalle: "leads perdidos", sinDatoNota: "Ningún lead se marcó como perdido en el periodo." });
}

export function calcularPrecio(d: DatosPrecio, p: Periodo, periodos: Periodo[]): MedicionPrecio {
  const ds = descuentos(d, p);
  const valores = [realizacion(d, p), precioPersona(d, p), ds.con, ds.prom, perdidasPrecio(d, p)];
  const v = (f: (x: Periodo) => ValorKpi) => serie(periodos, x => f(x).valor);
  const series: Record<string, PuntoSerie[]> = {
    "realizacion-precio": v(x => realizacion(d, x)), "precio-persona": v(x => precioPersona(d, x)),
    "reservas-con-descuento": v(x => descuentos(d, x).con), "descuento-promedio": v(x => descuentos(d, x).prom),
    "perdidas-precio": v(x => perdidasPrecio(d, x)),
  };

  const ls = d.lineas.filter(l => enPeriodo(l.ymd, p));
  const porSlug = new Map<string, LineaPrecio[]>();
  for (const l of ls) porSlug.set(l.slug, [...(porSlug.get(l.slug) ?? []), l]);
  const prom = (xs: LineaPrecio[], campo: "subtotal" | "lista") => {
    const pax = xs.reduce((t, l) => t + l.personas, 0);
    return pax > 0 ? Math.round(xs.reduce((t, l) => t + l[campo], 0) / pax) : null;
  };
  const porTour = Array.from(porSlug.entries()).map(([slug, xs]) => {
    const lista = xs.reduce((t, l) => t + l.lista, 0), sub = xs.reduce((t, l) => t + l.subtotal, 0);
    return {
      slug, codigo: codigoDeTour(slug), nombre: TOURS_LISTA.find(t => t.slug === slug)?.nombreCorto ?? slug,
      lineas: xs.length, personas: xs.reduce((t, l) => t + l.personas, 0),
      precioPersona: prom(xs, "subtotal"), listaPersona: prom(xs, "lista"), realizacion: lista > 0 ? r1((sub / lista) * 100) : null,
    };
  }).sort((a, b) => b.personas - a.personas);
  const porTamano = TRAMOS_GRUPO.map(t => { const xs = ls.filter(l => t.ok(l.personas)); return { etiqueta: t.etiqueta, lineas: xs.length, precioPersona: prom(xs, "subtotal"), listaPersona: prom(xs, "lista") }; });

  // Cierre de cotizaciones por tercio de precio por persona: ¿se pierden más las caras?
  const qs = d.cotizaciones.filter(q => enPeriodo(q.ymd, p) && q.porPersona > 0).sort((a, b) => a.porPersona - b.porPersona);
  const tercio = Math.ceil(qs.length / 3);
  const porRango = qs.length >= 6 ? [0, 1, 2].map(i => {
    const xs = qs.slice(i * tercio, (i + 1) * tercio);
    const desde = xs[0]?.porPersona ?? 0, hasta = xs[xs.length - 1]?.porPersona ?? 0;
    return { etiqueta: `$${desde.toLocaleString("es-MX")} – $${hasta.toLocaleString("es-MX")} por persona`, cotizaciones: xs.length, aceptadas: xs.filter(q => q.aceptada).length, tasa: xs.length ? Math.round((xs.filter(q => q.aceptada).length / xs.length) * 100) : null };
  }) : [];

  const porCanalM = new Map<string, { reservas: number; total: number }>();
  for (const r of d.reservas.filter(x => enPeriodo(x.ymd, p))) {
    const f = porCanalM.get(r.origen) ?? { reservas: 0, total: 0 };
    f.reservas++; f.total += r.total; porCanalM.set(r.origen, f);
  }
  const porCanal = Array.from(porCanalM.entries()).map(([o, f]) => ({
    canal: (ORIGEN_ETIQUETA[origenValido(o)] ?? o).split(" (")[0], reservas: f.reservas, ticket: f.reservas ? Math.round(f.total / f.reservas) : null,
  })).sort((a, b) => b.reservas - a.reservas);

  return { valores, series, detalle: { porTour, porTamano, porRango, porCanal } };
}

/**
 * El precio de lista de un renglón de tour por persona: mismo tour, misma fecha,
 * mismo grupo y la MISMA opción elegida (lote 9). Puro, para probarlo.
 */
export function listaDeRenglon(t: Parameters<typeof tourEnFecha>[0], l: LineaTour): number {
  const adultos = Number(l.adults) || 0;
  const mid = Number(l.childrenMid ?? (l.childrenSmall === undefined ? l.children : 0)) || 0;
  const chicos = Number(l.childrenSmall) || 0;
  return totalRecorrido(tourEnFecha(t, l.tourDate ?? ""), adultos, mid, chicos, 0, l.eleccion);
}

/** Una reserva lista para medir su precio (puro: lo usa `cargarPrecio` y las pruebas). */
export interface ReservaParaPrecio {
  createdAt: Date; origen: string; totalAmount: number; promoDiscount: number | null;
  lineItems: unknown; packageItems?: unknown; extraItems?: unknown;
  tourSlug: string; tourName: string; tourDate: string; adults: number; children: number;
}

/** Los renglones y el descuento de una reserva (lote 9). */
export function precioDeReserva(b: ReservaParaPrecio): { lineas: LineaPrecio[]; reserva: ReservaPrecio } {
  const ymd = ymdMX(b.createdAt);
  const factor = factorDeTotal(b);
  const lineas: LineaPrecio[] = [];
  let subTours = 0, listaTotal = 0;
  for (const l of lineasDe(b)) {
    const t = TOURS_LISTA.find(x => x.slug === l.tourSlug);
    const extras = (l.addOns ?? []).reduce((s, a) => s + (Number(a?.subtotal) || 0), 0);
    const subtotal = Math.max(0, (Number(l.subtotal) || 0) - extras);
    listaTotal += Number(l.subtotal) || 0;
    subTours += subtotal;
    if (!t || !esPorPersona(t) || subtotal <= 0) continue;
    const personas = personasDeLinea(l);
    if (personas <= 0) continue;
    // Lo vendido = lo cobrado de ese renglón (después de descuentos y total editado).
    lineas.push({ ymd, slug: t.slug, personas, subtotal: Math.round(subtotal * factor), lista: listaDeRenglon(t, l) });
  }
  // Descuentos: el del panel (el código de cumpleaños se guarda como él) sobre
  // la misma base que usa el panel (renglones + hotel + extras); el de
  // cumpleaños suelto solo si no hay descuento guardado; el código web (%), estimado.
  const meta = metaDe(b);
  const base = listaTotal
    + (Array.isArray(b.packageItems) ? (b.packageItems as Record<string, unknown>[]) : []).filter(p => p && !p._meta).reduce((t, p) => t + (Number(p.subtotal) || 0), 0)
    + totalExtras(extrasDe(b.extraItems));
  const manual = montoDescuento(descuentoDeMeta(meta), base);
  const cumple = !manual && codigoDeLineas(b.lineItems) ? baseCumple(b.lineItems).monto : 0;
  const pct = Number(b.promoDiscount) || 0;
  const web = pct > 0 && pct < 100 ? Math.round(subTours * pct / (100 - pct)) : 0;
  return { lineas, reserva: { ymd, origen: b.origen, total: b.totalAmount, descuento: manual + cumple + web, aproximado: web > 0 } };
}

export async function cargarPrecio(periodos: Periodo[]): Promise<DatosPrecio> {
  const desde = periodos[0].desde, hasta = periodos[periodos.length - 1].hasta;
  const rango = { gte: inicioMX(desde), lte: finMX(hasta) };
  const [reservas, perdidos, quotes] = await Promise.all([
    prisma.tourBooking.findMany({
      where: { createdAt: rango, status: { notIn: NO_CUENTAN } },
      select: { createdAt: true, origen: true, totalAmount: true, promoDiscount: true, lineItems: true, packageItems: true, extraItems: true, tourSlug: true, tourName: true, tourDate: true, adults: true, children: true },
    }),
    prisma.etapaOportunidad.findMany({ where: { nueva: "perdido", createdAt: rango }, select: { createdAt: true, oportunidad: { select: { motivoPerdida: true } } } }).catch(() => []),
    prisma.tourQuote.findMany({ where: { createdAt: rango, status: { in: ESTADOS_ENVIADA } }, select: { createdAt: true, totalAmount: true, status: true, lineItems: true, tourSlug: true, tourName: true, tourDate: true, adults: true, children: true } }),
  ]);

  const lineas: LineaPrecio[] = [];
  const res: ReservaPrecio[] = [];
  for (const b of reservas) {
    const r = precioDeReserva(b);
    lineas.push(...r.lineas);
    res.push(r.reserva);
  }
  return {
    lineas, reservas: res,
    perdidos: perdidos.map(x => ({ ymd: ymdMX(x.createdAt), motivo: x.oportunidad?.motivoPerdida ?? null })),
    cotizaciones: quotes.map(q => {
      const pax = grupoDe(q).total;
      return { ymd: ymdMX(q.createdAt), porPersona: pax > 0 ? Math.round(q.totalAmount / pax) : 0, aceptada: q.status === "aceptada" };
    }),
  };
}

export async function medirPrecio(p: Periodo, periodos: Periodo[]): Promise<MedicionPrecio> {
  return calcularPrecio(await cargarPrecio(periodos), p, periodos);
}
