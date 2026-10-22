/**
 * Qué tan contentos quedan los clientes (pestaña Reseñas, 21 oct 2026):
 * - Google: calificación y número de reseñas, escritas A MANO por Manolo
 *   (decisión suya: sin llave de Google Cloud). Se guarda el historial para
 *   ver cuántas reseñas nuevas entran.
 * - La encuesta propia (`/opina`): promedio de estrellas y recomendación 0-10
 *   (NPS = % que da 9-10 − % que da 0-6).
 * - Clientes que vuelven (por correo/teléfono/nombre, como la pestaña Clientes)
 *   y cuántos llegaron por recomendación (del check-in).
 */

import { prisma } from "@/lib/prisma";
import { NO_CUENTAN } from "@/lib/cupoTour";
import { agruparClientes } from "@/lib/admin/clientes";
import { addDaysYMD, hoyMX } from "@/lib/dates";

export const CLAVE_GOOGLE = "resenas:google";

export interface PuntoGoogle {
  /** YYYY-MM-DD */
  fecha: string;
  rating: number;
  total: number;
  por: string;
}

export async function historialGoogle(): Promise<PuntoGoogle[]> {
  const fila = await prisma.config.findUnique({ where: { key: CLAVE_GOOGLE } });
  if (!fila) return [];
  try {
    const arr = JSON.parse(fila.value);
    return Array.isArray(arr) ? (arr as PuntoGoogle[]).filter((p) => p && typeof p.total === "number") : [];
  } catch {
    return [];
  }
}

/** Agrega (o reemplaza la del mismo día) una lectura del perfil de Google. */
export async function guardarPuntoGoogle(p: PuntoGoogle): Promise<PuntoGoogle[]> {
  const hist = (await historialGoogle()).filter((x) => x.fecha !== p.fecha);
  hist.push(p);
  hist.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const value = JSON.stringify(hist.slice(-400));
  await prisma.config.upsert({ where: { key: CLAVE_GOOGLE }, update: { value }, create: { key: CLAVE_GOOGLE, value } });
  return hist;
}

/** La lectura más reciente que sea de `fecha` o anterior. */
function lecturaAl(hist: PuntoGoogle[], fecha: string): PuntoGoogle | null {
  let r: PuntoGoogle | null = null;
  for (const p of hist) if (p.fecha <= fecha) r = p;
  return r;
}

export interface RespuestaEncuesta {
  bookingId: string;
  folio: string;
  nombre: string;
  telefono: string | null;
  tour: string;
  fechaTour: string;
  calificacion: number;
  recomendaria: number | null;
  comentario: string | null;
  en: string;
}

export interface ResumenSatisfaccion {
  dias: number;
  google: { actual: PuntoGoogle | null; nuevas30: number | null; nuevas90: number | null; historial: PuntoGoogle[] };
  encuesta: {
    enviadas: number; contestadas: number; promedio: number | null;
    nps: number | null; conNps: number; promotores: number; pasivos: number; detractores: number;
  };
  vuelven: { clientes: number; repiten: number };
  recomendacion: { checkins: number; porRecomendacion: number };
  respuestas: RespuestaEncuesta[];
}

export async function resumenSatisfaccion(dias = 90): Promise<ResumenSatisfaccion> {
  const hoy = hoyMX();
  const desde = new Date(Date.now() - dias * 86_400_000);

  const [historial, encuestas, reservas, checkins] = await Promise.all([
    historialGoogle(),
    prisma.encuestaReserva.findMany({
      where: { OR: [{ satisfaccionEnviadaEn: { gte: desde } }, { satisfaccionEn: { gte: desde } }] },
      include: { booking: { select: { id: true, confirmationNumber: true, customerName: true, customerPhone: true, tourName: true, tourDate: true } } },
    }),
    prisma.tourBooking.findMany({ where: { status: { notIn: NO_CUENTAN } } }),
    prisma.encuestaReserva.findMany({ where: { checkinEn: { gte: desde } }, select: { comoNosConocio: true } }),
  ]);

  const actual = historial.at(-1) ?? null;
  const delta = (d: number) => {
    const antes = lecturaAl(historial, addDaysYMD(hoy, -d));
    return actual && antes && antes !== actual ? actual.total - antes.total : null;
  };

  const contestadas = encuestas.filter((e) => e.satisfaccionEn && e.calificacion);
  const conNps = contestadas.filter((e) => e.recomendaria !== null);
  const promotores = conNps.filter((e) => (e.recomendaria ?? 0) >= 9).length;
  const detractores = conNps.filter((e) => (e.recomendaria ?? 0) <= 6).length;

  const clientes = agruparClientes(reservas);

  return {
    dias,
    google: { actual, nuevas30: delta(30), nuevas90: delta(90), historial },
    encuesta: {
      // Quien contestó cuenta como «le llegó» aunque no tenga la marca del
      // correo (la liga es la misma del check-in): si no, salía «9 de 8».
      enviadas: encuestas.filter((e) => e.satisfaccionEnviadaEn || e.satisfaccionEn).length,
      contestadas: contestadas.length,
      promedio: contestadas.length
        ? Math.round((contestadas.reduce((s, e) => s + (e.calificacion ?? 0), 0) / contestadas.length) * 10) / 10
        : null,
      nps: conNps.length ? Math.round(((promotores - detractores) / conNps.length) * 100) : null,
      conNps: conNps.length, promotores, pasivos: conNps.length - promotores - detractores, detractores,
    },
    vuelven: { clientes: clientes.length, repiten: clientes.filter((c) => c.totalReservas > 1).length },
    recomendacion: { checkins: checkins.length, porRecomendacion: checkins.filter((c) => c.comoNosConocio === "recomendacion").length },
    respuestas: contestadas
      .sort((a, b) => (b.satisfaccionEn!.getTime() - a.satisfaccionEn!.getTime()))
      .slice(0, 40)
      .map((e) => ({
        bookingId: e.booking.id,
        folio: e.booking.confirmationNumber,
        nombre: e.booking.customerName,
        telefono: e.booking.customerPhone,
        tour: (e.booking.tourName || "").split("—")[0].trim(),
        fechaTour: e.booking.tourDate,
        calificacion: e.calificacion!,
        recomendaria: e.recomendaria,
        comentario: e.comentario,
        en: e.satisfaccionEn!.toISOString(),
      })),
  };
}
