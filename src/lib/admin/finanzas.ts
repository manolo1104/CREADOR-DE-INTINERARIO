// El centro financiero: de la empresa al periodo, al tour, a la reserva, y de
// ahí a cada peso que entró o salió.
//
// Tres reglas que no se rompen en ningún cálculo de este archivo:
//
//  1. VENTA ≠ COBRO.      Vender no es cobrar. La utilidad se calcula sobre lo
//                         vendido; el efectivo, sobre lo cobrado.
//  2. COSTO ≠ GASTO.      El costo pertenece a una salida y baja la utilidad
//                         bruta. El gasto es de la empresa y baja la operativa.
//                         Un gasto general JAMÁS se descuenta de una reserva.
//  3. UTILIDAD ≠ EFECTIVO. Se puede tener un mes muy rentable y no tener con qué
//                         pagar la gasolina del lunes.
//
// El costo de una salida se toma en este orden:
//    a) lo REGISTRADO como movimiento de tipo "costo" para esa reserva, y
//    b) si no hay nada registrado, lo que el Cotizador dice que cuesta ese tour
//       para ese número de pasajeros (TourCosto: tanto por persona + tanto por
//       salida). Queda marcado como estimado, y el panel siempre dice cuántas
//       reservas están calculadas así.

import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { montoCobrado, saldoPendiente } from "./kpis";
import { conceptosDe, costoDeLinea, type ConceptoCosto } from "./costos";
import { costoExtraLine, type ExtraItem } from "./extras";
import { categoriaDe, categoriaPorNombre, esDirecta } from "./categorias";
import { TOURS_DB } from "@/lib/tours";
import type { TourBooking, Movimiento, Socio } from "@prisma/client";

/** Stripe México: 3.6% + IVA sobre lo cobrado con tarjeta. */
export const COMISION_STRIPE = 0.036 * 1.16;

/** Debajo de este margen, una reserva se marca en rojo. */
export const MARGEN_MINIMO = 25;

/** A partir de estos días sin cobrar, la cuenta se considera vencida. */
export const DIAS_VENCIMIENTO = 7;

export type BaseCorte    = "tour" | "venta";
export type Granularidad = "dia" | "semana" | "mes";

const entero = (v: unknown) => Math.round(Number(v) || 0);
const pct    = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

// ── Fechas ──────────────────────────────────────────────────────────────────

export function sumaDias(ymd: string, dias: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function lunesDe(ymd: string): string {
  const dow = (new Date(ymd + "T12:00:00Z").getUTCDay() + 6) % 7;
  return sumaDias(ymd, -dow);
}
export function primeroDeMes(ymd: string): string { return ymd.slice(0, 8) + "01"; }
export function finDeMes(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
export function periodoDe(ymd: string, g: Granularidad) {
  if (g === "dia")    return { desde: ymd, hasta: ymd };
  if (g === "semana") { const l = lunesDe(ymd); return { desde: l, hasta: sumaDias(l, 6) }; }
  return { desde: primeroDeMes(ymd), hasta: finDeMes(ymd) };
}
export function periodoAnterior(p: { desde: string; hasta: string }, g: Granularidad) {
  if (g === "dia")    return periodoDe(sumaDias(p.desde, -1), g);
  if (g === "semana") return periodoDe(sumaDias(p.desde, -7), g);
  return periodoDe(sumaDias(primeroDeMes(p.desde), -1), g);
}
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(desde + "T12:00:00Z"), b = Date.parse(hasta + "T12:00:00Z");
  return Math.round((b - a) / 86400000);
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
function extrasVendidos(b: TourBooking): number {
  return extrasDe(b).reduce((s, e) => s + (e.incluido ? 0 : entero(e.cantidad) * entero(e.precioUnitario)), 0);
}
export function fechaDeCorte(b: TourBooking, base: BaseCorte): string {
  return base === "tour" ? (b.tourDate || ymdMX(b.createdAt)) : ymdMX(b.createdAt);
}

/** El desglose de lo que el Cotizador dice que cuesta operar esta reserva. */
export interface CostoDeCatalogo {
  total: number;
  completo: boolean;
  lineas: { concepto: string; categoria: string; tipo: "persona" | "fijo"; monto: number; total: number }[];
}

export function costoDeCatalogo(
  b: TourBooking, costosPorSlug: Record<string, ConceptoCosto[]>,
): CostoDeCatalogo {
  const personas = personasDe(b);
  const lineas   = lineasDe(b);
  const slugs    = lineas.length ? lineas.map(l => l.tourSlug || "") : [b.tourSlug];

  const detalle: CostoDeCatalogo["lineas"] = [];
  let total = 0;
  let completo = slugs.length > 0;

  for (const slug of slugs) {
    const conceptos = slug ? costosPorSlug[slug] : undefined;
    if (!conceptos || conceptos.length === 0) { completo = false; continue; }
    for (const c of conceptos) {
      const t = c.tipo === "persona" ? c.monto * personas : c.monto;
      total += t;
      detalle.push({
        concepto: c.concepto,
        // El Cotizador guarda el concepto en texto libre: se clasifica por su
        // nombre para que el reporte diga "guías $800", no "otros $800".
        categoria: (c as any).categoria ?? categoriaPorNombre(c.concepto),
        tipo: c.tipo, monto: c.monto, total: t,
      });
    }
  }
  const extras = extrasDe(b).reduce((s, e) => s + costoExtraLine(e), 0);
  if (extras > 0) {
    total += extras;
    detalle.push({ concepto: "Extras de la reserva", categoria: "otroDirecto", tipo: "fijo", monto: extras, total: extras });
  }
  return { total, completo, lineas: detalle };
}

// ── La reserva como unidad financiera ───────────────────────────────────────

export interface ReservaFinanciera {
  id: string;
  folio: string;
  fechaReserva: string;
  fechaTour: string;
  cliente: string;
  email: string;
  telefono: string;
  tour: string;
  tourSlug: string;
  pasajeros: number;
  precioPorPersona: number;
  guia: string;
  idiomaTour: string;

  venta: number;
  cobrado: number;
  saldo: number;
  /** pagado | parcial | pendiente | vencido */
  estadoPago: string;
  diasVencido: number;

  /** Costos registrados de verdad para esta reserva. */
  costoRegistrado: number;
  /** Lo que el Cotizador dice que cuesta. */
  costoCatalogo: number;
  catalogoCompleto: boolean;
  /** El que entra en la utilidad: el registrado si lo hay, si no el del catálogo. */
  costoDirecto: number;
  /** true = el costo usado viene del Cotizador, no de una captura. */
  costoEstimado: boolean;
  comision: number;
  utilidad: number;
  margen: number;
  /** Margen por debajo del mínimo: esta venta casi no deja. */
  margenBajo: boolean;

  movimientos: Movimiento[];
  desgloseCatalogo: CostoDeCatalogo["lineas"];
}

export function armarReserva(
  b: TourBooking,
  movimientos: Movimiento[],
  costosPorSlug: Record<string, ConceptoCosto[]>,
  hoy: string,
): ReservaFinanciera {
  const venta     = entero(b.totalAmount);
  const cobrado   = montoCobrado(b);
  const saldo     = saldoPendiente(b);
  const pasajeros = personasDe(b);

  const costosDeLaReserva = movimientos.filter(m => m.tipo === "costo" && !m.anulado);
  const costoRegistrado   = costosDeLaReserva.reduce((s, m) => s + entero(m.monto), 0);

  const catalogo = costoDeCatalogo(b, costosPorSlug);
  const costoDirecto  = costoRegistrado > 0 ? costoRegistrado : catalogo.total;
  const costoEstimado = costoRegistrado === 0 && catalogo.total > 0;

  const comision = b.stripePaymentIntentId ? Math.round(cobrado * COMISION_STRIPE) : 0;
  const utilidad = venta - costoDirecto - comision;

  // Vencida: ya pasó el tour (más el plazo) y sigue debiendo.
  const refe = b.tourDate || ymdMX(b.createdAt);
  const diasDesde = diasEntre(refe, hoy);
  const vencida = saldo > 0 && diasDesde > DIAS_VENCIMIENTO;

  const estadoPago =
    saldo <= 0        ? "pagado" :
    vencida           ? "vencido" :
    cobrado > 0       ? "parcial" : "pendiente";

  return {
    id: b.id,
    folio: b.confirmationNumber,
    fechaReserva: ymdMX(b.createdAt),
    fechaTour: b.tourDate || "",
    cliente: b.customerName,
    email: b.customerEmail || "",
    telefono: b.customerPhone || "",
    tour: b.tourName,
    tourSlug: b.tourSlug,
    pasajeros,
    precioPorPersona: pasajeros > 0 ? Math.round(venta / pasajeros) : venta,
    guia: ((b as any).guia || "") as string,
    idiomaTour: ((b as any).idiomaTour || "es") as string,
    venta, cobrado, saldo,
    estadoPago,
    diasVencido: vencida ? diasDesde - DIAS_VENCIMIENTO : 0,
    costoRegistrado,
    costoCatalogo: catalogo.total,
    catalogoCompleto: catalogo.completo,
    costoDirecto,
    costoEstimado,
    comision,
    utilidad,
    margen: pct(utilidad, venta),
    margenBajo: venta > 0 && pct(utilidad, venta) < MARGEN_MINIMO,
    movimientos: costosDeLaReserva,
    desgloseCatalogo: catalogo.lineas,
  };
}

// ── El estado de resultados ─────────────────────────────────────────────────

export interface RenglonCategoria { id: string; label: string; monto: number; pctVentas: number }

export interface EstadoResultados {
  ventasTours: number;
  ventasHospedaje: number;
  ventasExtras: number;
  otrosIngresos: number;
  ventasBrutas: number;
  /** Ventas menos las comisiones de la pasarela: lo que de verdad factura el negocio. */
  ventasNetas: number;

  costosDirectos: RenglonCategoria[];
  costosDirectosTotal: number;
  comisiones: number;
  utilidadBruta: number;
  margenBruto: number;

  gastosGenerales: RenglonCategoria[];
  gastosGeneralesTotal: number;
  utilidadOperativa: number;
  margenOperativo: number;
}

// ── El corte completo ───────────────────────────────────────────────────────

export interface Flujo {
  saldoInicial: number;
  cobros: number;
  pagosProveedores: number;
  gastosPagados: number;
  otrosMovimientos: number;
  flujoNeto: number;
  saldoFinal: number;
}

export interface CuentaPorPagar {
  id: string;
  fecha: string;
  proveedor: string;
  concepto: string;
  categoria: string;
  monto: number;
  reservaId: string | null;
  folio: string;
  vencePronto: boolean;
}

export interface FilaTour {
  slug: string;
  nombre: string;
  reservas: number;
  pasajeros: number;
  ventas: number;
  costoTotal: number;
  costoPorPasajero: number;
  utilidad: number;
  margen: number;
  ticketPromedio: number;
}

export interface RepartoSocio {
  id: string;
  nombre: string;
  porcentaje: number;
  utilidadCorrespondiente: number;
  reembolsos: number;
  distribuido: number;
  pendiente: number;
}

export interface Alerta {
  nivel: "alta" | "media";
  tipo: string;
  mensaje: string;
  reservaId?: string;
}

export interface Finanzas {
  desde: string;
  hasta: string;
  base: BaseCorte;

  er: EstadoResultados;
  erAnterior: EstadoResultados;
  anteriorDesde: string;
  anteriorHasta: string;

  cobrado: number;
  porCobrar: number;
  flujo: Flujo;

  reservas: ReservaFinanciera[];
  porTour: FilaTour[];
  gastos: Movimiento[];
  porPagar: CuentaPorPagar[];
  porPagarTotal: number;
  socios: RepartoSocio[];
  alertas: Alerta[];

  captura: { conCosto: number; estimadas: number; sinDato: number; cobertura: number };
  historico: { etiqueta: string; desde: string; ventas: number; utilidad: number }[];
}

function erVacio(): EstadoResultados {
  return {
    ventasTours: 0, ventasHospedaje: 0, ventasExtras: 0, otrosIngresos: 0,
    ventasBrutas: 0, ventasNetas: 0,
    costosDirectos: [], costosDirectosTotal: 0, comisiones: 0,
    utilidadBruta: 0, margenBruto: 0,
    gastosGenerales: [], gastosGeneralesTotal: 0,
    utilidadOperativa: 0, margenOperativo: 0,
  };
}

/**
 * Arma el estado de resultados de un periodo.
 *
 * Los costos directos se agrupan por categoría: los registrados con la suya, y
 * los estimados del Cotizador con el desglose que trae el catálogo. Así el
 * reporte enseña "guías $4,300 · gasolina $1,200" aunque nadie haya capturado
 * todavía un peso, y no una sola bolsa llamada "costos".
 */
function armarER(
  reservas: ReservaFinanciera[], crudas: TourBooking[], movimientos: Movimiento[],
): EstadoResultados {
  const er = erVacio();

  for (const b of crudas) {
    er.ventasHospedaje += hospedajeDe(b);
    er.ventasExtras    += extrasVendidos(b);
  }
  er.ventasBrutas = reservas.reduce((s, r) => s + r.venta, 0);
  er.ventasTours  = Math.max(0, er.ventasBrutas - er.ventasHospedaje - er.ventasExtras);
  er.comisiones   = reservas.reduce((s, r) => s + r.comision, 0);
  er.ventasNetas  = er.ventasBrutas - er.comisiones;

  // Costos directos por categoría
  const directos: Record<string, number> = {};
  for (const r of reservas) {
    if (r.costoRegistrado > 0) {
      for (const m of r.movimientos) {
        const cat = esDirecta(m.categoria) ? m.categoria : "otroDirecto";
        directos[cat] = (directos[cat] ?? 0) + entero(m.monto);
      }
    } else {
      for (const l of r.desgloseCatalogo) {
        const cat = esDirecta(l.categoria) ? l.categoria : "otroDirecto";
        directos[cat] = (directos[cat] ?? 0) + l.total;
      }
    }
  }
  er.costosDirectos = Object.entries(directos)
    .map(([id, monto]) => ({ id, label: categoriaDe(id).label, monto, pctVentas: pct(monto, er.ventasBrutas) }))
    .sort((a, b) => b.monto - a.monto);
  er.costosDirectosTotal = er.costosDirectos.reduce((s, c) => s + c.monto, 0);

  er.utilidadBruta = er.ventasBrutas - er.costosDirectosTotal - er.comisiones;
  er.margenBruto   = pct(er.utilidadBruta, er.ventasBrutas);

  // Gastos generales por categoría (nunca se cuelgan de una reserva)
  const generales: Record<string, number> = {};
  for (const m of movimientos) {
    if (m.tipo !== "gasto" || m.anulado) continue;
    const cat = m.categoria || "otroGeneral";
    generales[cat] = (generales[cat] ?? 0) + entero(m.monto);
  }
  er.gastosGenerales = Object.entries(generales)
    .map(([id, monto]) => ({ id, label: categoriaDe(id).label, monto, pctVentas: pct(monto, er.ventasBrutas) }))
    .sort((a, b) => b.monto - a.monto);
  er.gastosGeneralesTotal = er.gastosGenerales.reduce((s, g) => s + g.monto, 0);

  er.utilidadOperativa = er.utilidadBruta - er.gastosGeneralesTotal;
  er.margenOperativo   = pct(er.utilidadOperativa, er.ventasBrutas);
  return er;
}

const nombreDeTour = (slug: string, respaldo: string) =>
  TOURS_DB.find(t => t.slug === slug)?.nombre || respaldo || slug;

export async function calcFinanzas(
  desde: string, hasta: string, base: BaseCorte = "tour",
): Promise<Finanzas> {
  const hoy = ymdMX(new Date());
  const anterior = (() => {
    const largo = diasEntre(desde, hasta) + 1;
    return { desde: sumaDias(desde, -largo), hasta: sumaDias(desde, -1) };
  })();

  const [todas, costosFilas, sociosFilas] = await Promise.all([
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" } } }),
    prisma.tourCosto.findMany(),
    prisma.socio.findMany({ where: { estado: "activo" }, orderBy: { nombre: "asc" } }),
  ]);

  const costosPorSlug: Record<string, ConceptoCosto[]> = {};
  for (const f of costosFilas) costosPorSlug[f.tourSlug] = conceptosDe(f.conceptos);

  const enPeriodo = (p: { desde: string; hasta: string }) =>
    todas.filter(b => {
      const f = fechaDeCorte(b, base);
      return f >= p.desde && f <= p.hasta;
    });

  const crudas     = enPeriodo({ desde, hasta });
  const crudasAnt  = enPeriodo(anterior);
  const ids        = crudas.map(b => b.id);
  const idsAnt     = crudasAnt.map(b => b.id);

  const [movsReserva, movsReservaAnt, movsGenerales, movsGeneralesAnt, porPagarCrudo] = await Promise.all([
    ids.length    ? prisma.movimiento.findMany({ where: { reservaId: { in: ids } },    orderBy: { fecha: "asc" } }) : Promise.resolve([]),
    idsAnt.length ? prisma.movimiento.findMany({ where: { reservaId: { in: idsAnt } } })                            : Promise.resolve([]),
    prisma.movimiento.findMany({ where: { reservaId: null, fecha: { gte: desde,          lte: hasta          } }, orderBy: { fecha: "asc" } }),
    prisma.movimiento.findMany({ where: { reservaId: null, fecha: { gte: anterior.desde, lte: anterior.hasta } } }),
    // Todo lo que la empresa debe, sin importar el periodo: una deuda vieja
    // sigue siendo deuda.
    prisma.movimiento.findMany({
      where: { pagado: false, anulado: false, tipo: { in: ["costo", "gasto"] } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const porReserva: Record<string, Movimiento[]> = {};
  for (const m of movsReserva) if (m.reservaId) (porReserva[m.reservaId] ??= []).push(m);
  const porReservaAnt: Record<string, Movimiento[]> = {};
  for (const m of movsReservaAnt) if (m.reservaId) (porReservaAnt[m.reservaId] ??= []).push(m);

  const reservas = crudas
    .map(b => armarReserva(b, porReserva[b.id] ?? [], costosPorSlug, hoy))
    .sort((a, b) => (a.fechaTour < b.fechaTour ? -1 : a.fechaTour > b.fechaTour ? 1 : 0));

  const reservasAnt = crudasAnt.map(b => armarReserva(b, porReservaAnt[b.id] ?? [], costosPorSlug, hoy));

  const er    = armarER(reservas, crudas, movsGenerales);
  const erAnt = armarER(reservasAnt, crudasAnt, movsGeneralesAnt);

  // ── Efectivo ─────────────────────────────────────────────────────────────
  // Lo cobrado sale de las reservas del periodo; lo pagado, de los movimientos
  // marcados como pagados. Un movimiento pendiente no toca el efectivo.
  const cobrado   = reservas.reduce((s, r) => s + r.cobrado, 0);
  const porCobrar = reservas.reduce((s, r) => s + r.saldo, 0);

  const pagadoEnPeriodo = (m: Movimiento) =>
    !m.anulado && m.pagado && (m.fechaPago ?? m.fecha) >= desde && (m.fechaPago ?? m.fecha) <= hasta;

  const pagosProveedores = movsReserva.filter(m => m.tipo === "costo" && pagadoEnPeriodo(m))
    .reduce((s, m) => s + entero(m.monto), 0);
  const gastosPagados = movsGenerales.filter(m => m.tipo === "gasto" && pagadoEnPeriodo(m))
    .reduce((s, m) => s + entero(m.monto), 0);
  const otrosMovimientos = movsGenerales
    .filter(m => (m.tipo === "reembolso" || m.tipo === "distribucion") && pagadoEnPeriodo(m))
    .reduce((s, m) => s + entero(m.monto), 0);

  const flujoNeto = cobrado - pagosProveedores - gastosPagados - otrosMovimientos;
  const flujo: Flujo = {
    saldoInicial: 0,
    cobros: cobrado,
    pagosProveedores,
    gastosPagados,
    otrosMovimientos,
    flujoNeto,
    saldoFinal: flujoNeto,
  };

  // ── Rentabilidad por tour ────────────────────────────────────────────────
  const mapaTour: Record<string, FilaTour> = {};
  for (const r of reservas) {
    const b = crudas.find(x => x.id === r.id)!;
    const lineas = lineasDe(b);
    const efectivas = lineas.length ? lineas : [{ tourSlug: b.tourSlug, tourName: b.tourName, subtotal: r.venta }];
    const totalLineas = efectivas.reduce((s, l) => s + entero(l.subtotal), 0) || r.venta || 1;
    for (const l of efectivas) {
      const slug  = l.tourSlug || b.tourSlug || "otros";
      const parte = (entero(l.subtotal) || r.venta) / totalLineas;
      const t = (mapaTour[slug] ??= {
        slug, nombre: nombreDeTour(slug, l.tourName || b.tourName),
        reservas: 0, pasajeros: 0, ventas: 0, costoTotal: 0, costoPorPasajero: 0,
        utilidad: 0, margen: 0, ticketPromedio: 0,
      });
      t.reservas   += 1;
      t.pasajeros  += r.pasajeros;
      t.ventas     += entero(l.subtotal) || Math.round(r.venta * parte);
      t.costoTotal += Math.round((r.costoDirecto + r.comision) * parte);
    }
  }
  const porTour = Object.values(mapaTour).map(t => {
    t.utilidad         = t.ventas - t.costoTotal;
    t.margen           = pct(t.utilidad, t.ventas);
    t.costoPorPasajero = t.pasajeros > 0 ? Math.round(t.costoTotal / t.pasajeros) : 0;
    t.ticketPromedio   = t.reservas  > 0 ? Math.round(t.ventas / t.reservas) : 0;
    return t;
  }).sort((a, b) => b.ventas - a.ventas);

  // ── Cuentas por pagar ────────────────────────────────────────────────────
  const foliosPorId: Record<string, string> = {};
  for (const b of todas) foliosPorId[b.id] = b.confirmationNumber;
  const porPagar: CuentaPorPagar[] = porPagarCrudo.map(m => ({
    id: m.id,
    fecha: m.fecha,
    proveedor: m.proveedor || "Sin proveedor",
    concepto: m.concepto,
    categoria: categoriaDe(m.categoria).label,
    monto: entero(m.monto),
    reservaId: m.reservaId,
    folio: m.reservaId ? (foliosPorId[m.reservaId] ?? "") : "",
    vencePronto: diasEntre(hoy, m.fecha) <= 3,
  }));
  const porPagarTotal = porPagar.reduce((s, c) => s + c.monto, 0);

  // ── Socios ───────────────────────────────────────────────────────────────
  // El reparto se calcula sobre la utilidad operativa YA calculada. Lo que un
  // socio cobró por trabajar, por rentar su camioneta o lo que pagó de su
  // bolsa no es utilidad suya: eso ya bajó como costo o como gasto, y su
  // reembolso se lista aparte.
  const movsSocios = await prisma.movimiento.findMany({
    where: { socioId: { not: null }, anulado: false, fecha: { gte: desde, lte: hasta } },
  });
  const socios: RepartoSocio[] = sociosFilas.map((s: Socio) => {
    const suyos       = movsSocios.filter(m => m.socioId === s.id);
    const reembolsos  = suyos.filter(m => m.tipo === "reembolso").reduce((a, m) => a + entero(m.monto), 0);
    const distribuido = suyos.filter(m => m.tipo === "distribucion").reduce((a, m) => a + entero(m.monto), 0);
    const correspond  = Math.round(er.utilidadOperativa * (s.porcentaje / 100));
    return {
      id: s.id, nombre: s.nombre, porcentaje: s.porcentaje,
      utilidadCorrespondiente: correspond,
      reembolsos, distribuido,
      pendiente: correspond - distribuido,
    };
  });

  // ── Salud del dato y alertas ─────────────────────────────────────────────
  const conCosto  = reservas.filter(r => r.costoRegistrado > 0).length;
  const estimadas = reservas.filter(r => r.costoEstimado).length;
  const sinDato   = reservas.filter(r => r.costoRegistrado === 0 && r.costoCatalogo === 0).length;
  const ventaConCosto = reservas.filter(r => r.costoRegistrado > 0).reduce((s, r) => s + r.venta, 0);

  const alertas: Alerta[] = [];
  for (const r of reservas) {
    if (r.margenBajo && r.venta > 0 && (r.costoRegistrado > 0 || r.costoCatalogo > 0)) {
      alertas.push({
        nivel: "alta", tipo: "margen",
        mensaje: `${r.folio} (${r.cliente}) deja ${r.margen}% de margen, por debajo del ${MARGEN_MINIMO}% mínimo`,
        reservaId: r.id,
      });
    }
    if (r.estadoPago === "vencido") {
      alertas.push({
        nivel: "alta", tipo: "cobranza",
        mensaje: `${r.folio} (${r.cliente}) debe $${r.saldo.toLocaleString("es-MX")} desde hace ${r.diasVencido} día${r.diasVencido === 1 ? "" : "s"}`,
        reservaId: r.id,
      });
    }
    if (r.costoRegistrado === 0 && r.costoCatalogo === 0) {
      alertas.push({
        nivel: "media", tipo: "sinCosto",
        mensaje: `${r.folio} no tiene costos capturados ni costos de ese tour en el Cotizador`,
        reservaId: r.id,
      });
    }
    // Lo capturado se pasó de lo que el Cotizador dice, por más de un 20%.
    if (r.costoRegistrado > 0 && r.costoCatalogo > 0 && r.costoRegistrado > r.costoCatalogo * 1.2) {
      alertas.push({
        nivel: "media", tipo: "sobrecosto",
        mensaje: `${r.folio} costó $${r.costoRegistrado.toLocaleString("es-MX")}, ${pct(r.costoRegistrado - r.costoCatalogo, r.costoCatalogo)}% más de lo previsto ($${r.costoCatalogo.toLocaleString("es-MX")})`,
        reservaId: r.id,
      });
    }
  }
  for (const c of porPagar.filter(x => x.vencePronto)) {
    alertas.push({ nivel: "media", tipo: "porPagar", mensaje: `Por pagar a ${c.proveedor}: $${c.monto.toLocaleString("es-MX")} (${c.concepto})` });
  }

  // ── Histórico ────────────────────────────────────────────────────────────
  const historico: Finanzas["historico"] = [];
  const largo = diasEntre(desde, hasta) + 1;
  for (let i = 5; i >= 0; i--) {
    const d = sumaDias(desde, -largo * i);
    const h = sumaDias(d, largo - 1);
    const rs = enPeriodo({ desde: d, hasta: h });
    const idsH = rs.map(b => b.id);
    const movsH = idsH.length
      ? await prisma.movimiento.aggregate({ _sum: { monto: true }, where: { reservaId: { in: idsH }, tipo: "costo", anulado: false } })
      : { _sum: { monto: 0 } };
    const genH = await prisma.movimiento.aggregate({
      _sum: { monto: true },
      where: { reservaId: null, tipo: "gasto", anulado: false, fecha: { gte: d, lte: h } },
    });
    const ventasH = rs.reduce((s, b) => s + entero(b.totalAmount), 0);
    const costoH  = entero(movsH._sum.monto) + entero(genH._sum.monto);
    historico.push({ etiqueta: etiquetaCorta(d), desde: d, ventas: ventasH, utilidad: ventasH - costoH });
  }

  return {
    desde, hasta, base,
    er, erAnterior: erAnt, anteriorDesde: anterior.desde, anteriorHasta: anterior.hasta,
    cobrado, porCobrar, flujo,
    reservas, porTour,
    gastos: movsGenerales.filter(m => !m.anulado),
    porPagar, porPagarTotal,
    socios,
    alertas: alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "alta" ? -1 : 1)),
    captura: {
      conCosto, estimadas, sinDato,
      cobertura: pct(ventaConCosto, er.ventasBrutas),
    },
    historico,
  };
}

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
export function etiquetaCorta(ymd: string): string {
  return `${Number(ymd.slice(8, 10))} ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
}

/** Lo que se congela en un corte cerrado. */
export interface ResumenCorte {
  ventas: number; cobros: number; costos: number; gastos: number;
  utilidadBruta: number; utilidadOperativa: number; margen: number;
  efectivo: number; porCobrar: number; porPagar: number; reservas: number;
}

export function resumirParaCorte(f: Finanzas): ResumenCorte {
  return {
    ventas: f.er.ventasBrutas,
    cobros: f.cobrado,
    costos: f.er.costosDirectosTotal,
    gastos: f.er.gastosGeneralesTotal,
    utilidadBruta: f.er.utilidadBruta,
    utilidadOperativa: f.er.utilidadOperativa,
    margen: f.er.margenOperativo,
    efectivo: f.flujo.flujoNeto,
    porCobrar: f.porCobrar,
    porPagar: f.porPagarTotal,
    reservas: f.reservas.length,
  };
}
