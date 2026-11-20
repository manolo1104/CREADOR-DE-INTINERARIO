// ¿Ya le llegó al cliente el correo de confirmación de su reserva? (19 nov 2026)
//
// Pedido de Manolo: «que en el perfil del lead marque si hace falta que se le
// mande la confirmación por correo». Hasta hoy nadie guardaba si ese correo
// salió: el checkout del sitio, la red de seguridad del webhook, el paquete y
// el viaje CDMX solo lo escribían en el log del servidor, y el botón del panel
// (con la liga pagada y el /confirma) en la bitácora.
//
// Sin columna nueva a propósito: Railway corre `prisma db push
// --accept-data-loss` en cada deploy y una columna no se puede probar en local
// (ver `reviewRequest.ts`). La fuente es la BITÁCORA: cada camino que manda la
// confirmación deja EL MISMO renglón (`eventoConfirmacionEnviada`) y la ficha
// lo lee (`confirmacionesDelLead`, en `confirmacionReservaDatos.ts`).
//
// 🔴 La regla mira el DINERO y el registro del correo, nunca el nombre de la
// etapa: así sigue valiendo ahora que «Anticipo pagado» se unió a Confirmado.
//
// Puro (sin Prisma): se prueba en `__tests__/confirmacionReserva.test.ts`.

import type { Actor, EventoBitacora } from "./bitacora";
import { ahoraMX } from "./crm";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { REGRESO_DIAS_DESPUES, VIAJE_SLUG } from "@/lib/viajeCdmx/config";

/**
 * Desde cuándo TODOS los caminos dejan constancia del correo de confirmación.
 *
 * 🔴 Es el MOMENTO DEL DEPLOY en hora de México, redondeado hacia arriba: se
 * subió el 20 nov 2026 hacia las 11:00 y quedó vivo antes de las 12:00.
 * Las reservas creadas antes salen «sin dato» en vez de una alarma falsa: de
 * ellas solo se sabe lo que mandó el panel. Con una fecha ANTERIOR al deploy,
 * las reservas web de en medio (las hizo el código viejo, que no anotaba)
 * saldrían «falta» aunque su correo sí salió, y alguien se lo mandaría dos
 * veces; con una fecha unas horas posterior solo se ve «sin dato» un rato.
 * Mejor tarde que temprano. Red de seguridad (revisión del 20 nov 2026): las
 * reservas creadas en las `HORAS_DUDA_TRAS_CORTE` horas siguientes al corte que
 * salen «falta» se preguntan antes de mandar (`preguntaAntesDeMandar`), por si
 * el servidor viejo siguió atendiendo durante el cambio.
 */
export const CONFIRMACION_DESDE = new Date("2026-11-20T12:00:00-06:00");

/**
 * Horas después de `CONFIRMACION_DESDE` en que una confirmación que «falta» se
 * pregunta antes de mandarla. Solo tienen que cubrir el cambio de servidor del
 * deploy: el viejo, que no anotaba, sigue contestando unos minutos.
 * 🔴 Eran 48 (revisión del 20 nov 2026): durante dos días CADA reserva nueva
 * preguntaba «puede que ya le haya llegado», aunque la acabara de hacer el
 * panel y nada hubiera salido, y alguien podía no mandar una confirmación que
 * nunca salió (peor que mandarla dos veces).
 */
export const HORAS_DUDA_TRAS_CORTE = 2;

/**
 * ¿La reserva se creó en las horas siguientes al corte? De esas no se sabe del
 * todo: si el código viejo la atendió, su correo pudo salir sin dejar renglón.
 */
export function creadaCercaDelCorte(creadaEn: Date | string | null | undefined, desde: Date = CONFIRMACION_DESDE): boolean {
  if (!creadaEn) return false;
  const t = new Date(creadaEn).getTime();
  return Number.isFinite(t) && t >= desde.getTime() && t < desde.getTime() + HORAS_DUDA_TRAS_CORTE * 3_600_000;
}

/** El principio del renglón de la bitácora. UNO solo para todos los que mandan. */
export const PREFIJO_CONFIRMACION = "Correo de confirmación de ";
/** Con qué acción y entidad se anota (las mismas que el check-in y la reseña: el prefijo los separa). */
export const ACCION_CONFIRMACION = "envió" as const;
export const ENTIDAD_CONFIRMACION = "reserva";

/** La tarea que deja la liga pagada cuando su correo de confirmación no salió (`linksPago.ts`). */
export function claveTareaConfirmacion(reservaId: string): string {
  return `confirmacion-liga:${reservaId}`;
}

/**
 * ¿Sirve este correo para mandarle algo al cliente? Ni vacío, ni sin «@», ni
 * el `pendiente@desconocido` que dejan las reservas recuperadas por el
 * webhook. La MISMA regla que usa el envío (`enviarConfirmacionReserva`).
 */
export function correoUsable(c: string | null | undefined): c is string {
  return !!c && c.includes("@") && !c.endsWith("@desconocido");
}

// ── El renglón de la bitácora ───────────────────────────────────────────────

/** «Correo de confirmación de HP-X a ana@x.com (Ana López)»: el texto de siempre del panel. */
export function resumenConfirmacion(p: { folio: string; destinatario: string; cliente: string }): string {
  return `${PREFIJO_CONFIRMACION}${p.folio} a ${p.destinatario} (${p.cliente})`;
}

/**
 * El renglón que deja CADA camino después de que el correo salió. Sin `actor`,
 * la bitácora pone a quien tenga la sesión abierta.
 */
export function eventoConfirmacionEnviada(p: { folio: string; destinatario: string; cliente: string; actor?: Actor }): EventoBitacora {
  return {
    accion:     ACCION_CONFIRMACION,
    entidad:    ENTIDAD_CONFIRMACION,
    referencia: p.folio,
    resumen:    resumenConfirmacion(p),
    ...(p.actor ? { actor: p.actor } : {}),
  };
}

/**
 * Lee un renglón de la bitácora: si es la confirmación de un folio, de cuál y
 * a qué correo salió; si es otra cosa (check-in, reseña…), null.
 */
export function leerRenglonConfirmacion(r: { referencia?: string | null; resumen: string }): { folio: string; destinatario: string | null } | null {
  if (!r.resumen.startsWith(PREFIJO_CONFIRMACION)) return null;
  const resto = r.resumen.slice(PREFIJO_CONFIRMACION.length);
  const i = resto.indexOf(" a ");
  if (i <= 0) return null;
  const folio = resto.slice(0, i).trim();
  if (!folio || (r.referencia && r.referencia !== folio)) return null;
  // El correo va antes del « (nombre)»; el nombre puede traer sus propios paréntesis.
  const tras = resto.slice(i + 3);
  const j = tras.indexOf(" (");
  const destinatario = (j >= 0 ? tras.slice(0, j) : tras).trim();
  return { folio, destinatario: destinatario || null };
}

// ── Cuándo termina el viaje ─────────────────────────────────────────────────

const esFecha = (f: unknown): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f);

/**
 * El último día del viaje (YYYY-MM-DD), o null si la reserva no trae fecha.
 * Una reserva de varios recorridos guarda cada fecha en su renglón; el viaje
 * CDMX guarda solo el viernes de salida y regresa el domingo (la misma cuenta
 * que `ultimoDiaDelTour` de la encuesta).
 */
export function ultimoDiaReserva(b: { tourDate?: string | null; tourSlug?: string | null; lineItems?: unknown }): string | null {
  const fin = (fecha: string, slug: unknown) => (slug === VIAJE_SLUG ? addDaysYMD(fecha, REGRESO_DIAS_DESPUES) : fecha);
  const renglones: Record<string, unknown>[] = Array.isArray(b.lineItems)
    ? (b.lineItems as unknown[]).filter((l): l is Record<string, unknown> => !!l && typeof l === "object" && !(l as { _meta?: unknown })._meta)
    : [];
  const fechas: string[] = renglones.filter(l => esFecha(l.tourDate)).map(l => fin(l.tourDate as string, l.tourSlug));
  if (esFecha(b.tourDate)) fechas.push(fin(b.tourDate, b.tourSlug));
  return fechas.sort().at(-1) ?? null;
}

// ── El estado ───────────────────────────────────────────────────────────────

/**
 *  · no-aplica: cancelada o borrador, o el viaje ya pasó: ya no se le manda nada;
 *  · sin-pago: no ha entrado dinero (la confirmación va cuando pague algo);
 *  · enviada: hay registro de que salió (cuándo y a quién);
 *  · sin-dato: es de antes de `CONFIRMACION_DESDE` y no hay registro: no se sabe;
 *  · sin-correo: pagó y no tiene un correo que sirva;
 *  · falta: pagó, tiene correo y nadie se la ha mandado.
 */
export type EstadoConfirmacion = "no-aplica" | "sin-pago" | "enviada" | "sin-dato" | "sin-correo" | "falta";

/**
 * Lo que la ficha del lead sabe de la confirmación de UNA reserva. Lo arma
 * `confirmacionesDelLead` (servidor); vive aquí para que la pantalla lo use
 * sin traer Prisma.
 */
export interface ConfirmacionDeReserva {
  reservaId: string;
  folio: string;
  estado: EstadoConfirmacion;
  /** ISO de la última confirmación anotada, o null. */
  enviadaEn: string | null;
  /** A qué correo salió la última, o null. */
  destinatario: string | null;
  /** Quién la mandó, como sale en la bitácora («Sitio web», «Erick», «Bot WhatsApp»…). */
  enviadaPor: string | null;
  /** El correo que tiene HOY la reserva, si sirve (a donde saldría si se manda ahora). */
  correo: string | null;
  /** En qué idioma sale el correo: el del `_meta` de la reserva. */
  idioma: "es" | "en";
  /** La liga pagada dejó «mándale la confirmación» y sigue abierta. */
  tareaPendiente: boolean;
  /** Cuándo se creó la reserva (ISO): cerca del corte se pregunta antes de mandarla (`creadaCercaDelCorte`). */
  creadaEn: string;
}

/** Los estados que piden hacer algo: la ficha los marca. */
export const ESTADOS_PENDIENTES: readonly EstadoConfirmacion[] = ["falta", "sin-correo"];

export function confirmacionPendiente(estado: EstadoConfirmacion): boolean {
  return ESTADOS_PENDIENTES.includes(estado);
}

/** Lo que la regla necesita saber de una reserva. */
export interface HechosConfirmacion {
  status: string | null | undefined;
  /** Lo cobrado de verdad (`montoCobrado`), no el estado ni la etapa del lead. */
  cobrado: number;
  customerEmail: string | null | undefined;
  createdAt: Date | string;
  /** `ultimoDiaReserva`. */
  ultimoDia: string | null;
  /** La última confirmación anotada en la bitácora, o null. */
  enviadaEn: Date | string | null;
}

/** Las que nunca reciben «Tu tour está confirmado» (= `NO_CUENTAN` de `cupoTour.ts`). */
const NO_SE_CONFIRMAN = ["cancelled", "borrador"];

/** `hoy` en YYYY-MM-DD de México (`hoyMX`). */
export function estadoConfirmacion(h: HechosConfirmacion, hoy: string, desde: Date = CONFIRMACION_DESDE): EstadoConfirmacion {
  if (h.status && NO_SE_CONFIRMAN.includes(h.status)) return "no-aplica";
  if (h.ultimoDia && h.ultimoDia < hoy) return "no-aplica";
  if (!(Number(h.cobrado) > 0)) return "sin-pago";
  if (h.enviadaEn) return "enviada";
  const creada = new Date(h.createdAt);
  if (!Number.isNaN(creada.getTime()) && creada < desde) return "sin-dato";
  if (!correoUsable(h.customerEmail)) return "sin-correo";
  return "falta";
}

// ── Lo que dice la ficha ────────────────────────────────────────────────────

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «18 nov» de un instante, en hora de México. */
export function diaCortoMX(d: Date | string): string {
  const [, m, dia] = ymdMX(d).split("-").map(Number);
  return `${dia} ${MESES[m - 1] ?? ""}`.trim();
}

/** «20 nov a las 15:05» de un instante, en hora de México (24 h, como los seguimientos). Vacío si la fecha no sirve. */
export function diaHoraMX(d: Date | string): string {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  const hora = ahoraMX(t).hhmm;
  // «a la 01:15» (singular), «a las 13:05».
  return `${diaCortoMX(t)} ${hora.startsWith("01:") ? "a la" : "a las"} ${hora}`;
}

/**
 * El corte como lo dice la ficha: «20 nov», o «20 nov a las 15:00» si no fue a
 * medianoche (revisión del 20 nov 2026). Al subirlo, el corte es la hora del
 * deploy: una reserva del 20 nov a las 9:00 no es «de antes del 20 nov».
 */
export function corteMX(desde: Date = CONFIRMACION_DESDE): string {
  return ahoraMX(desde).hhmm === "00:00" ? diaCortoMX(desde) : diaHoraMX(desde);
}

interface VistaConfirmacion {
  estado: EstadoConfirmacion;
  enviadaEn: Date | string | null;
  destinatario: string | null;
  /** El correo que tiene HOY la reserva, si sirve. */
  correo?: string | null;
  /** Cuándo se creó la reserva: cerca del corte, «falta» también pregunta (`creadaCercaDelCorte`). */
  creadaEn?: Date | string | null;
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** El renglón para la ficha del lead. Vacío cuando no hay nada que decir (sin pago, cancelada, viaje pasado). */
export function textoConfirmacion(c: VistaConfirmacion): string {
  switch (c.estado) {
    case "enviada": {
      const cuando = c.enviadaEn ? ` el ${diaCortoMX(c.enviadaEn)}` : "";
      const a = c.destinatario ? ` a ${c.destinatario}` : "";
      // Se corrigió el correo después de mandarla: la de antes pudo no llegarle.
      const cambio = c.destinatario && c.correo && !igual(c.destinatario, c.correo) ? ` (su correo ahora es ${c.correo})` : "";
      return `Confirmación enviada por correo${cuando}${a}${cambio}`;
    }
    case "falta":      return "Falta mandar la confirmación por correo";
    case "sin-correo": return "Falta la confirmación: la reserva no tiene un correo que sirva";
    case "sin-dato":   return `Confirmación: sin dato (reserva de antes del ${corteMX()})`;
    default:           return "";
  }
}

/** ¿Se ofrece «Mandar confirmación»? Con dinero, viaje por delante y un correo que sirva. */
export function sePuedeMandarConfirmacion(c: { estado: EstadoConfirmacion; correo?: string | null }): boolean {
  return (c.estado === "falta" || c.estado === "enviada" || c.estado === "sin-dato") && correoUsable(c.correo);
}

/**
 * Lo que se pregunta antes de mandarla (para `window.confirm`), o null si se
 * manda directo. Cada envío le llega al cliente y al equipo en copia: no se
 * repite sin preguntar. Una que «falta» se manda directo, salvo la creada en
 * las `HORAS_DUDA_TRAS_CORTE` horas siguientes al corte (`creadaCercaDelCorte`):
 * de esas el correo pudo salir sin dejar renglón (revisión del 20 nov 2026). La
 * pregunta dice el día y la hora en que se hizo: fue justo en el cambio.
 */
export function preguntaAntesDeMandar(c: VistaConfirmacion): string | null {
  const a = c.correo ? ` a ${c.correo}` : "";
  if (c.estado === "enviada") {
    const cuando = c.enviadaEn ? ` el ${diaCortoMX(c.enviadaEn)}` : "";
    const donde = c.destinatario ? ` a ${c.destinatario}` : "";
    return `Ya se le mandó la confirmación${cuando}${donde}. ¿Mandarla otra vez${a}?`;
  }
  if (c.estado === "sin-dato") {
    return `Esta reserva es de antes del ${corteMX()} y no hay registro de si se le mandó la confirmación. ¿Mandarla${a}?`;
  }
  if (c.estado === "falta" && c.creadaEn && creadaCercaDelCorte(c.creadaEn)) {
    return `Esta reserva se hizo el ${diaHoraMX(c.creadaEn)}, justo cuando el panel empezó a anotar las confirmaciones: la suya pudo salir sin quedar anotada. ¿Mandarla${a}?`;
  }
  return null;
}
