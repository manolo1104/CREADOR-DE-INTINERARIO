/**
 * Las salidas como las ve el público: la página y `GET /api/viaje-cdmx/salidas`
 * leen ESTO, así que el calendario de la página y el que se refresca en el
 * navegador nunca dicen cosas distintas.
 */
import type { SalidaGrupal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { libres, ocupacionDeVarias } from "./cupo";
import { enPreventa, estadoSalida, precioVigente, saldoVence, type EstadoSalida } from "./precio";

/** Lo que viaja al navegador. Fechas en ISO: se serializa tal cual. */
export interface SalidaVista {
  id: string;
  fechaSalida: string;
  fechaRegreso: string;
  capacidad: number;
  minimo: number;
  estado: EstadoSalida;
  disponibles: number;
  /** Personas pagando en este momento (apartados vivos). */
  enPago: number;
  confirmados: number;
  precioVigente: number;
  precio: number;
  precioPreventa: number | null;
  enPreventa: boolean;
  abreEl: string;
  finPreventa: string | null;
  fechaCorte: string;
  saldoDiasAntes: number;
  saldoVence: string;
  /** Para recalcular en el navegador con `precio.ts` (mismo cálculo que el servidor). */
  estadoBase: string;
}

export const SALIDAS_VISIBLES = 6;

export function aVista(s: SalidaGrupal, o: { confirmados: number; enPago: number; ocupados: number }, ahora: Date): SalidaVista {
  const disponibles = libres(s.capacidad, o);
  return {
    id: s.id,
    fechaSalida: s.fechaSalida,
    fechaRegreso: s.fechaRegreso,
    capacidad: s.capacidad,
    minimo: s.minimo,
    estado: estadoSalida(s, disponibles, ahora),
    disponibles,
    enPago: o.enPago,
    confirmados: o.confirmados,
    precioVigente: precioVigente(s, ahora),
    precio: s.precio,
    precioPreventa: s.precioPreventa,
    enPreventa: enPreventa(s, ahora),
    abreEl: s.abreEl.toISOString(),
    finPreventa: s.finPreventa ? s.finPreventa.toISOString() : null,
    fechaCorte: s.fechaCorte.toISOString(),
    saldoDiasAntes: s.saldoDiasAntes,
    saldoVence: saldoVence(s),
    estadoBase: s.estado,
  };
}

/**
 * Las próximas salidas publicadas cuya venta no ha cerrado, en orden. Las que
 * ya pasaron su corte no se enseñan: una fecha que no se puede comprar solo
 * estorba arriba del calendario.
 */
export async function salidasPublicas(ahora: Date = new Date()): Promise<SalidaVista[]> {
  const salidas = await prisma.salidaGrupal.findMany({
    where: { estado: "publicada", fechaSalida: { gte: hoyMX() }, fechaCorte: { gt: ahora } },
    orderBy: { fechaSalida: "asc" },
    take: SALIDAS_VISIBLES,
  });
  const occ = await ocupacionDeVarias(salidas.map((s) => s.id), ahora);
  return salidas.map((s) => aVista(s, occ.get(s.id)!, ahora));
}

/**
 * Las dos cifras de prueba social, SOLO de reservas reales del viaje. Si son
 * cero, la página no las pinta.
 *  - personas que apartaron en los últimos 7 días
 *  - personas que ya viajaron (salidas cuyo regreso ya pasó)
 */
export async function pruebaSocial(ahora: Date = new Date()): Promise<{ estaSemana: number; yaViajaron: number }> {
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000);
  const hoy = hoyMX();
  const pasadas = await prisma.salidaGrupal.findMany({
    where: { estado: { not: "cancelada" }, fechaRegreso: { lt: hoy } },
    select: { id: true },
  });
  const [semana, viajaron] = await Promise.all([
    prisma.tourBooking.aggregate({
      _sum: { adults: true, children: true },
      where: { salidaId: { not: null }, status: { notIn: ["cancelled", "borrador"] }, createdAt: { gte: hace7 }, totalAmount: { gt: 0 } },
    }),
    pasadas.length
      ? prisma.tourBooking.aggregate({
          _sum: { adults: true, children: true },
          where: { salidaId: { in: pasadas.map((p) => p.id) }, status: { notIn: ["cancelled", "borrador"] } },
        })
      : Promise.resolve({ _sum: { adults: 0, children: 0 } }),
  ]);
  return {
    estaSemana: (semana._sum.adults ?? 0) + (semana._sum.children ?? 0),
    yaViajaron: (viajaron._sum.adults ?? 0) + (viajaron._sum.children ?? 0),
  };
}

/** La salida de un apartado, ya en forma pública (para el checkout). */
export async function salidaVista(id: string, ahora: Date = new Date()): Promise<SalidaVista | null> {
  const s = await prisma.salidaGrupal.findUnique({ where: { id } });
  if (!s) return null;
  const occ = await ocupacionDeVarias([s.id], ahora);
  return aVista(s, occ.get(s.id)!, ahora);
}
