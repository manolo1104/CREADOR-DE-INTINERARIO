// Solo servidor: la rentabilidad de un mes por tour, por tamaño de salida y
// por canal (pestaña Rentabilidad, rediseño 3 nov 2026). Operación por fecha
// de tour; canal por fecha de captura.
import { prisma } from "@/lib/prisma";
import { ymdMX } from "@/lib/dates";
import { ORIGENES, ORIGEN_ETIQUETA, origenValido, type OrigenReserva } from "@/lib/origenReserva";
import { montoCobrado } from "./dinero";
import { salidasEntre } from "./salidasDia";

/**
 * Lo que se queda cada canal de lo cobrado. OTA ≈ 25 % (prompt); la web paga
 * Stripe (3.6 % + IVA). Cuando lleguen las comisiones reales de GetYourGuide,
 * Airbnb y Viator (pendiente de Manolo) van aquí, no en la pantalla.
 */
export const COMISION_CANAL: Partial<Record<OrigenReserva, number>> = { ota: 0.25, web: 0.036 * 1.16 };

export interface FilaTour {
  slug: string; codigo: string; nombre: string; salidas: number; personas: number; paxPorSalida: number;
  ingreso: number; margen: number | null; margenPct: number | null; conCostos: boolean; aMedida: boolean;
}
export interface FilaCanal { canal: OrigenReserva; etiqueta: string; reservas: number; cobrado: number; comisionPct: number; comision: number; neto: number }

export interface DatosRentabilidad {
  mes: string; etiqueta: string; mesAnterior: string; mesSiguiente: string;
  salidas: number; personas: number; paxPorSalida: number; bajoMinimo: number; regulares: number;
  ingreso: number; margen: number; ingresoConCostos: number; margenPct: number | null;
  toursConCostos: number; toursTotal: number;
  porTour: FilaTour[];
  porTamano: { etiqueta: string; salidas: number }[];
  porCanal: FilaCanal[];
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export async function datosRentabilidad(mes: string): Promise<DatosRentabilidad> {
  const [y, m] = mes.split("-").map(Number);
  const ini = `${mes}-01`;
  const fin = ymdMX(new Date(Date.UTC(y, m, 0, 12)));
  const mesAnterior = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const mesSiguiente = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  const [salidas, creadas] = await Promise.all([
    salidasEntre(ini, fin),
    prisma.tourBooking.findMany({ where: { status: { not: "cancelled" }, createdAt: { gte: new Date(`${ini}T00:00:00-06:00`), lte: new Date(`${fin}T23:59:59.999-06:00`) } } }),
  ]);

  const porSlug = new Map<string, FilaTour>();
  for (const s of salidas) {
    const f = porSlug.get(s.slug) ?? { slug: s.slug, codigo: s.codigo, nombre: s.aMedida ? "Salidas a medida" : s.tourNombre, salidas: 0, personas: 0, paxPorSalida: 0, ingreso: 0, margen: 0, margenPct: null, conCostos: s.numeros.conCostos, aMedida: s.aMedida };
    f.salidas++; f.personas += s.personas; f.ingreso += s.numeros.ingreso;
    if (s.numeros.conCostos) f.margen = (f.margen ?? 0) + s.numeros.margen; else { f.conCostos = false; f.margen = null; }
    porSlug.set(s.slug, f);
  }
  const porTour = Array.from(porSlug.values()).map(f => ({
    ...f, paxPorSalida: Math.round((f.personas / f.salidas) * 10) / 10,
    margenPct: f.conCostos && f.margen !== null && f.ingreso > 0 ? Math.round((f.margen / f.ingreso) * 100) : null,
  })).sort((a, b) => b.ingreso - a.ingreso);

  const conCostos = salidas.filter(s => s.numeros.conCostos);
  const regulares = salidas.filter(s => !s.aMedida);
  const personas = salidas.reduce((t, s) => t + s.personas, 0);
  const ingresoConCostos = conCostos.reduce((t, s) => t + s.numeros.ingreso, 0);
  const margen = conCostos.reduce((t, s) => t + s.numeros.margen, 0);

  const tramos: [string, (n: number) => boolean][] = [["1 persona", n => n === 1], ["2", n => n === 2], ["3–4", n => n >= 3 && n <= 4], ["5–7", n => n >= 5 && n <= 7], ["8 o más", n => n >= 8]];
  const porTamano = tramos.map(([etiqueta, ok]) => ({ etiqueta, salidas: regulares.filter(s => ok(s.personas)).length }));

  const canales = new Map<OrigenReserva, FilaCanal>();
  for (const b of creadas) {
    const canal = origenValido(b.origen);
    const f = canales.get(canal) ?? { canal, etiqueta: ORIGEN_ETIQUETA[canal].split(" (")[0], reservas: 0, cobrado: 0, comisionPct: COMISION_CANAL[canal] ?? 0, comision: 0, neto: 0 };
    f.reservas++; f.cobrado += montoCobrado(b);
    canales.set(canal, f);
  }
  const porCanal = ORIGENES.map(c => canales.get(c)).filter((f): f is FilaCanal => !!f).map(f => ({ ...f, comision: Math.round(f.cobrado * f.comisionPct), neto: Math.round(f.cobrado * (1 - f.comisionPct)) })).sort((a, b) => b.cobrado - a.cobrado);

  return {
    mes, etiqueta: `${MESES[m - 1]} de ${y}`, mesAnterior, mesSiguiente,
    salidas: salidas.length, personas, paxPorSalida: salidas.length ? Math.round((personas / salidas.length) * 10) / 10 : 0,
    bajoMinimo: regulares.filter(s => s.estadoPax === "bajo-minimo").length, regulares: regulares.length,
    ingreso: salidas.reduce((t, s) => t + s.numeros.ingreso, 0), margen, ingresoConCostos,
    margenPct: ingresoConCostos > 0 ? Math.round((margen / ingresoConCostos) * 100) : null,
    toursConCostos: porTour.filter(t => t.conCostos && !t.aMedida).length, toursTotal: porTour.filter(t => !t.aMedida).length,
    porTour, porTamano, porCanal,
  };
}
