/**
 * La pestaña Análisis (21 oct 2026): quién compra y de dónde llega.
 *
 * «Quién compra» cruza las respuestas del check-in (tipo de grupo, motivo,
 * ciudad, primera vez) con el dinero de cada reserva: ticket promedio,
 * personas por reserva, margen estimado, el tour que más eligen y el canal por
 * el que llegan. Responde «¿qué segmento deja más y a cuál atraer?».
 *
 * «De dónde llegan» junta el «¿cómo nos conociste?» con el `origen` de la
 * reserva (web, WhatsApp…) y lo pone junto a lo que vio GA4.
 *
 * El margen es ESTIMADO: venta − hospedaje − costo de los extras − costos del
 * Cotizador (`TourCosto`). Una reserva con un tour sin costos cargados no entra
 * al promedio del margen (se cuenta aparte), para no inflarlo. No descuenta la
 * comisión de Stripe ni el hosting: eso lo hace el Corte, con lo cobrado real.
 */

import { prisma } from "@/lib/prisma";
import { NO_CUENTAN } from "@/lib/cupoTour";
import { TOURS_LISTA } from "@/lib/tours";
import { grupoDe, lineasDe } from "@/lib/admin/reserva";
import { conceptosDe, costoDeLinea, type ConceptoCosto } from "@/lib/admin/costos";
import { costoExtras, extrasDe } from "@/lib/admin/extras";
import { ORIGEN_ETIQUETA } from "@/lib/origenReserva";
import { COMO_NOS_CONOCIO, MOTIVOS, TIPOS_GRUPO, etiqueta } from "@/lib/encuestas/opciones";
import { canalesGA4 } from "@/lib/ga4Datos";
import {
  DIMENSIONES, MINIMO_CONFIABLE,
  type Analisis, type Dimension, type FilaCanalDeclarado, type FilaSegmento,
} from "@/lib/admin/analisisComun";

export { DIMENSIONES, MINIMO_CONFIABLE, type Analisis, type Dimension } from "@/lib/admin/analisisComun";

interface Fila {
  venta: number;
  personas: number;
  margen: number | null;
  tours: string[];
  como: string;
  origen: string;
  dims: Record<Dimension, string>;
}

const nombreTour = (slug?: string, nombre?: string) =>
  (TOURS_LISTA.find((t) => t.slug === slug)?.nombre || nombre || slug || "").split("—")[0].trim();

function masFrecuente(xs: string[]): string {
  const c: Record<string, number> = {};
  for (const x of xs) if (x) c[x] = (c[x] ?? 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function margenDe(b: Parameters<typeof grupoDe>[0] & { packageItems?: unknown; extraItems?: unknown }, costos: Map<string, ConceptoCosto[]>): number | null {
  const lineas = lineasDe(b);
  const grupo = grupoDe(b).total;
  let costoTours = 0;
  for (const l of lineas.length ? lineas : [{ tourSlug: b.tourSlug }]) {
    const conceptos = costos.get(l.tourSlug ?? "");
    if (!conceptos || conceptos.length === 0) return null;
    const personas = (l.adults ?? 0) + (l.childrenMid ?? l.children ?? 0) + (l.childrenSmall ?? 0);
    costoTours += costoDeLinea(conceptos, personas || grupo);
  }
  const pkgs = Array.isArray(b.packageItems) ? (b.packageItems as any[]).filter((p) => p && !p._meta) : [];
  const hospedaje = pkgs.reduce((s, p) => s + (Number(p.subtotal) || 0), 0);
  return b.totalAmount - hospedaje - costoExtras(extrasDe(b.extraItems)) - costoTours;
}

function segmentar(filas: Fila[], dim: Dimension, totalConCheckin: number): FilaSegmento[] {
  const grupos: Record<string, Fila[]> = {};
  for (const f of filas) (grupos[f.dims[dim]] ??= []).push(f);
  let claves = Object.keys(grupos).filter(Boolean);
  // La ciudad es texto libre: las 8 con más reservas y el resto junto.
  if (dim === "ciudad" && claves.length > 9) {
    const top = claves.sort((a, b) => grupos[b].length - grupos[a].length).slice(0, 8);
    const resto = claves.filter((k) => !top.includes(k)).flatMap((k) => grupos[k]);
    grupos["Otras ciudades"] = resto;
    claves = [...top, "Otras ciudades"];
  }
  const etiquetaDe = (k: string) =>
    dim === "tipoGrupo" ? etiqueta(TIPOS_GRUPO, k)
    : dim === "motivo" ? etiqueta(MOTIVOS, k)
    : dim === "primeraVez" ? (k === "si" ? "Primera vez" : "Ya habían venido")
    : k;
  return claves.map((k) => {
    const fs = grupos[k];
    const ventas = fs.reduce((s, f) => s + f.venta, 0);
    const conCosto = fs.filter((f) => f.margen !== null);
    const margenTotal = conCosto.reduce((s, f) => s + (f.margen ?? 0), 0);
    const ventasConCosto = conCosto.reduce((s, f) => s + f.venta, 0);
    return {
      clave: k,
      etiqueta: etiquetaDe(k),
      reservas: fs.length,
      pct: totalConCheckin ? Math.round((fs.length / totalConCheckin) * 100) : 0,
      ventas,
      ticket: Math.round(ventas / fs.length),
      personas: Math.round((fs.reduce((s, f) => s + f.personas, 0) / fs.length) * 10) / 10,
      margen: conCosto.length ? Math.round(margenTotal / conCosto.length) : null,
      margenPct: ventasConCosto > 0 ? Math.round((margenTotal / ventasConCosto) * 100) : null,
      conCosto: conCosto.length,
      tourTop: masFrecuente(fs.flatMap((f) => f.tours)),
      canalTop: etiqueta(COMO_NOS_CONOCIO, masFrecuente(fs.map((f) => f.como))),
      pocos: fs.length < MINIMO_CONFIABLE,
    };
  }).sort((a, b) => b.reservas - a.reservas);
}

export async function analisis(dias: number | null): Promise<Analisis> {
  const desde = dias ? new Date(Date.now() - dias * 86_400_000) : undefined;
  const [reservas, costosRaw, ga4] = await Promise.all([
    prisma.tourBooking.findMany({
      where: { status: { notIn: NO_CUENTAN }, ...(desde ? { createdAt: { gte: desde } } : {}) },
      include: { encuesta: true },
    }),
    prisma.tourCosto.findMany(),
    canalesGA4(dias ?? 365),
  ]);
  const costos = new Map(costosRaw.map((c) => [c.tourSlug, conceptosDe(c.conceptos)]));

  const filas: Fila[] = [];
  for (const b of reservas) {
    const e = b.encuesta;
    if (!e?.checkinEn) continue;
    const lineas = lineasDe(b);
    filas.push({
      venta: b.totalAmount,
      personas: grupoDe(b).total,
      margen: margenDe(b, costos),
      tours: (lineas.length ? lineas : [{ tourSlug: b.tourSlug, tourName: b.tourName }]).map((l) => nombreTour(l.tourSlug, l.tourName)),
      como: e.comoNosConocio ?? "",
      origen: b.origen,
      dims: {
        tipoGrupo: e.tipoGrupo ?? "",
        motivo: e.motivo ?? "",
        ciudad: e.ciudadOrigen ?? "",
        primeraVez: e.primeraVez === null ? "" : e.primeraVez ? "si" : "no",
      },
    });
  }

  const segmentos = Object.fromEntries(DIMENSIONES.map((d) => [d.clave, segmentar(filas, d.clave, filas.length)])) as Record<Dimension, FilaSegmento[]>;
  const mejor: Partial<Record<Dimension, string>> = {};
  for (const d of DIMENSIONES) {
    const confiables = segmentos[d.clave].filter((s) => !s.pocos && s.clave !== "Otras ciudades");
    const conMargen = confiables.filter((s) => s.margen !== null);
    const top = conMargen.length
      ? [...conMargen].sort((a, b) => (b.margen ?? 0) - (a.margen ?? 0))[0]
      : [...confiables].sort((a, b) => b.ticket - a.ticket)[0];
    if (top) mejor[d.clave] = top.clave;
  }

  const ventasCheckin = filas.reduce((s, f) => s + f.venta, 0);
  const canales: FilaCanalDeclarado[] = COMO_NOS_CONOCIO.map((o) => {
    const fs = filas.filter((f) => f.como === o.valor);
    const ventas = fs.reduce((s, f) => s + f.venta, 0);
    const porOrigen: Record<string, number> = {};
    for (const f of fs) porOrigen[f.origen] = (porOrigen[f.origen] ?? 0) + 1;
    return {
      clave: o.valor,
      etiqueta: o.es,
      reservas: fs.length,
      pct: filas.length ? Math.round((fs.length / filas.length) * 100) : 0,
      ventas,
      pctVentas: ventasCheckin ? Math.round((ventas / ventasCheckin) * 100) : 0,
      porOrigen: Object.entries(porOrigen)
        .map(([origen, n]) => ({ origen: ORIGEN_ETIQUETA[origen as keyof typeof ORIGEN_ETIQUETA] ?? origen, reservas: n }))
        .sort((a, b) => b.reservas - a.reservas),
    };
  }).sort((a, b) => b.reservas - a.reservas);

  return {
    dias,
    reservas: reservas.length,
    conCheckin: filas.length,
    ventas: ventasCheckin,
    segmentos,
    mejor,
    canales,
    ga4,
  };
}
