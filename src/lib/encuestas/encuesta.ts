/**
 * El check-in previo y la encuesta de satisfacción de una reserva (21 oct 2026).
 *
 * Una fila de `EncuestaReserva` por reserva, creada la primera vez que hace
 * falta (al mandar el check-in o la encuesta). Su `token` es la liga pública de
 * los dos formularios: `/checkin/<token>` y `/opina/<token>`.
 *
 * 🔴 Las ligas NO graban nada al abrirse. Los robots antivirus de los correos
 * abren todos los enlaces minutos después del envío (medido en Tours: 29 de 34
 * «aperturas» del carrito eran robots). Solo cuenta el POST de «Enviar».
 */

import { prisma } from "@/lib/prisma";
import { BASE } from "@/lib/emailLayout";
import { NO_CUENTAN } from "@/lib/cupoTour";
import { lineasDe, type ConLineas } from "@/lib/admin/reserva";
import { addDaysYMD } from "@/lib/dates";
import { REGRESO_DIAS_DESPUES, VIAJE_SLUG } from "@/lib/viajeCdmx/config";
import { SIN_CHECKIN, type EstadoCheckin } from "./opciones";
import type { EncuestaReserva } from "@prisma/client";

/** Las reservas a las que se les escribe: todo menos canceladas y borradores. */
export const ESTADOS_EXCLUIDOS = NO_CUENTAN;

/**
 * El primer día del viaje (YYYY-MM-DD). Una reserva de varios recorridos guarda
 * cada fecha en su línea; la columna `tourDate` es solo la del primer renglón
 * capturado, que no siempre es el más temprano.
 */
export function fechaDelTour(b: ConLineas): string {
  const fechas = lineasDe(b)
    .map((l) => l.tourDate)
    .filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f));
  if (b.tourDate && /^\d{4}-\d{2}-\d{2}$/.test(b.tourDate)) fechas.push(b.tourDate);
  return fechas.sort()[0] ?? b.tourDate;
}

/**
 * El último día del viaje: la encuesta se manda al día siguiente de ESTE. El
 * viaje CDMX guarda solo el viernes de salida y regresa el domingo: sin sumarle
 * esos días, la encuesta le llegaba el sábado, a media estancia.
 */
export function ultimoDiaDelTour(b: ConLineas): string {
  const fin = (fecha: string, slug: unknown) => (slug === VIAJE_SLUG ? addDaysYMD(fecha, REGRESO_DIAS_DESPUES) : fecha);
  const fechas = lineasDe(b)
    .filter((l) => typeof l.tourDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.tourDate))
    .map((l) => fin(l.tourDate as string, l.tourSlug));
  if (b.tourDate && /^\d{4}-\d{2}-\d{2}$/.test(b.tourDate)) fechas.push(fin(b.tourDate, b.tourSlug));
  return fechas.sort().at(-1) ?? b.tourDate;
}

/**
 * Horas de México en que el cron sí manda el check-in (8 AM a 9 PM). Es «cada
 * hora» pero GitHub lo corre en la práctica cada ~4 h: caben unas tres corridas
 * el día anterior al tour, y nadie recibe el correo a las 3 de la mañana.
 */
export const HORA_DESDE = 8;
export const HORA_HASTA = 21;

export function horaMX(ahora = new Date()): number {
  return Number(ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hour12: false })) % 24;
}

/**
 * Hasta qué hora del MISMO día del tour se rescata un check-in que no salió el
 * día antes (reserva de última hora, o la corrida de la noche no pasó).
 */
export const HORA_RESCATE = 11;

/**
 * ¿Le toca ahora el check-in a un viaje que empieza en `fechaTour`? El día
 * antes; y, si no salió, la mañana del mismo día antes de `HORA_RESCATE`.
 */
export function tocaCheckin(fechaTour: string, hoy: string, hora = horaMX()): boolean {
  return fechaTour === addDaysYMD(hoy, 1) || (fechaTour === hoy && hora < HORA_RESCATE);
}

export const linkCheckin = (token: string) => `${BASE}/checkin/${token}`;

/** `estrellas` preselecciona la calificación que tocó en el correo. */
export const linkOpina = (token: string, estrellas?: number) =>
  `${BASE}/opina/${token}${estrellas ? `?c=${estrellas}` : ""}`;

/** La fila de la reserva; la crea si no existía. */
export async function asegurarEncuesta(bookingId: string): Promise<EncuestaReserva> {
  return prisma.encuestaReserva.upsert({
    where:  { bookingId },
    update: {},
    create: { bookingId },
  });
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Lo que el panel enseña de una fila (o «sin enviar» si no hay). */
export function estadoDeEncuesta(e: EncuestaReserva | null | undefined): EstadoCheckin {
  if (!e) return SIN_CHECKIN;
  return {
    estado:       e.checkinEn ? "contestado" : e.checkinEnviadoEn ? "enviado" : "sin-enviar",
    enviadoEn:    iso(e.checkinEnviadoEn),
    enviadoPor:   e.checkinEnviadoPor,
    contestadoEn: iso(e.checkinEn),
    respuestas: e.checkinEn
      ? {
          ciudadOrigen:       e.ciudadOrigen,
          fechaNacimiento:    e.fechaNacimiento,
          tipoGrupo:          e.tipoGrupo,
          comoNosConocio:     e.comoNosConocio,
          comoNosConocioOtro: e.comoNosConocioOtro,
          primeraVez:         e.primeraVez,
          motivo:             e.motivo,
          aceptaPromos:       e.aceptaPromos,
        }
      : null,
    satisfaccion: e.satisfaccionEn
      ? { calificacion: e.calificacion, recomendaria: e.recomendaria, comentario: e.comentario, en: iso(e.satisfaccionEn) }
      : null,
  };
}

/** Los estados de varias reservas de una vez, para las listas del panel. */
export async function estadosDe(bookingIds: string[]): Promise<Record<string, EstadoCheckin>> {
  if (bookingIds.length === 0) return {};
  const filas = await prisma.encuestaReserva.findMany({ where: { bookingId: { in: bookingIds } } });
  const out: Record<string, EstadoCheckin> = {};
  for (const f of filas) out[f.bookingId] = estadoDeEncuesta(f);
  return out;
}

/** Un correo al que sí se le puede escribir (las pruebas usan @test.invalid). */
export function correoUtil(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.endsWith(".invalid");
}
