/**
 * Seguimiento de las cotizaciones — también las que manda Manolo a mano.
 *
 * Una cotización que sale del panel (`/admin/cotizaciones`) o del bot no tenía
 * ningún seguimiento: se enviaba y ahí moría. Las del carrito sí lo tenían
 * (`cartFollowUp.ts`), o sea que el cliente al que se atiende en persona —el
 * que cierra al 25 %— recibía MENOS que el que se armó su carrito solo.
 *
 * ⚠️ NO se añade columna a `TourQuote`. Railway aplica el esquema al arrancar
 * (`prisma db push` en `npm run start`), así que una columna nueva no se puede
 * probar en local sin tocar la base de producción. Se usa el patrón `_meta`
 * dentro de `lineItems`, el mismo de `reviewRequest.ts`.
 */

import type { Locale } from "./i18n/config";

/** Pasos de seguimiento DESPUÉS de la cotización. La cotización es el paso 1. */
export const PASOS_COTIZACION = 4;

/**
 * Horas desde que se ENVIÓ la cotización hasta cada paso.
 *
 * Misma cadencia que el carrito abandonado (1 h → 24 h → 72 h) y por la misma
 * razón: quien acaba de pedir una cotización está decidiendo AHORA, no dentro
 * de una semana. La versión anterior esperaba 2, 5 y 10 días y llegaba tarde a
 * su propia conversación.
 *
 * El cron corre cada hora, así que el paso de +1 h es alcanzable.
 */
export const ESPERA_HORAS: Record<number, number> = {
  2: 1,   // "aquí la tienes a la mano"
  3: 24,  // aparta con el 30 %
  4: 72,  // una persona del otro lado, y ya no insistimos
};

/** Lo que dura la secuencia completa, en horas. */
export const DURACION_HORAS = ESPERA_HORAS[PASOS_COTIZACION];

/**
 * Colchón antes de la fecha del tour, en horas.
 *
 * Un correo de "todavía puedes apartar" que cae la víspera —o el día mismo— no
 * vende nada y sí molesta. Con 24 h el último paso siempre queda, como mínimo,
 * un día completo antes del recorrido.
 */
export const MARGEN_HORAS = 24;

/** Estados vivos de la cotización a los que todavía se les escribe. */
export const ESTADOS_VIVOS = ["enviada"] as const;

export interface MetaCotizacion {
  _meta?:       boolean;
  locale?:      string;
  /** ISO del envío de la cotización: de aquí se cuentan todas las esperas. */
  seqDesde?:    string;
  /** Último paso enviado. 1 = solo la cotización. */
  seqPaso?:     number;
  seqUltimoAt?: string;
  /** activo | pausada | terminado | sin-tiempo */
  seqEstado?:   string;
}

function metaDe(lineItems: unknown): MetaCotizacion | undefined {
  if (!Array.isArray(lineItems)) return undefined;
  return lineItems.find(
    (l): l is MetaCotizacion => !!l && typeof l === "object" && (l as MetaCotizacion)._meta === true,
  );
}

export function metaCotizacion(lineItems: unknown): MetaCotizacion {
  return metaDe(lineItems) ?? {};
}

export function localeDeCotizacion(lineItems: unknown): Locale {
  return metaDe(lineItems)?.locale === "en" ? "en" : "es";
}

/** Escribe campos en el `_meta` sin perder nada de lo que ya llevaba. */
export function conMeta(lineItems: unknown, campos: MetaCotizacion): unknown[] {
  const base = Array.isArray(lineItems) ? [...lineItems] : [];
  const i = base.findIndex(
    (l) => !!l && typeof l === "object" && (l as MetaCotizacion)._meta === true,
  );
  if (i === -1) return [...base, { _meta: true, ...campos }];
  base[i] = { ...(base[i] as MetaCotizacion), ...campos };
  return base;
}

const HORA_MS = 60 * 60 * 1000;

/**
 * Cuándo empieza el tour, como instante.
 *
 * `tourDate` es solo la fecha (`YYYY-MM-DD`) y los recorridos arrancan entre las
 * 8:00 y las 9:00 de la mañana en México. Se toma la medianoche de ese día en
 * hora mexicana (UTC−6): es el criterio más conservador, y equivocarse hacia
 * "antes" solo hace que dejemos de escribir un poco antes, nunca después.
 */
function inicioDelTour(tourDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) return null;
  const t = Date.parse(`${tourDate}T00:00:00-06:00`);
  return Number.isNaN(t) ? null : t;
}

/**
 * El instante en que se mandó la cotización.
 *
 * Acepta ISO completo y también una fecha suelta, por si quedó alguna
 * cotización marcada cuando la cadencia se contaba en días.
 */
function instanteEnvio(seqDesde: string): number | null {
  if (!seqDesde) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(seqDesde) ? `${seqDesde}T12:00:00-06:00` : seqDesde;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * ¿Cabe la secuencia COMPLETA antes de la fecha del tour?
 *
 * La regla que pidió Manolo: si el viaje ya está encima y no alcanzan a salir
 * todos los pasos, no se arranca una secuencia a medias. Mejor ninguna que tres
 * correos que se cortan justo cuando la persona iba a decidir.
 *
 * Con la cadencia en horas la secuencia dura 3 días en vez de 10, así que
 * ahora cabe en casi todos los casos: solo se cancela cuando el recorrido es
 * dentro de menos de cuatro días.
 *
 * Una cotización SIN fecha (el bot las crea así muy seguido) no tiene contra
 * qué medirse: ahí la secuencia corre completa.
 */
export function alcanzaLaSecuencia(
  enviada: string,
  tourDate: string | null | undefined,
): boolean {
  if (!tourDate) return true;
  const inicio = inicioDelTour(tourDate);
  if (inicio === null) return true;

  const desde = instanteEnvio(enviada);
  if (desde === null) return true;

  return desde + (DURACION_HORAS + MARGEN_HORAS) * HORA_MS <= inicio;
}

/**
 * El estado con el que nace la secuencia al enviar la cotización.
 *
 * Se decide AQUÍ, en el momento del envío, y no en cada corrida del cron: así
 * queda escrito por qué esa cotización no recibe seguimiento y se puede ver en
 * el panel, en vez de ser un silencio que nadie sabe explicar.
 */
export function metaAlEnviar(tourDate: string | null | undefined, locale: Locale): MetaCotizacion {
  // ISO completo, no solo la fecha: con el paso de +1 h, la granularidad de día
  // haría que el primer recordatorio saliera en cualquier momento del día.
  const ahora = new Date().toISOString();
  return {
    locale,
    seqDesde:    ahora,
    seqPaso:     1,
    seqUltimoAt: ahora,
    seqEstado:   alcanzaLaSecuencia(ahora, tourDate) ? "activo" : "sin-tiempo",
  };
}

/**
 * Qué paso toca ahora, o `null` si todavía no toca.
 * Devuelve también por qué se corta, para poder registrarlo.
 */
export function siguientePaso(
  meta: MetaCotizacion,
  tourDate: string | null | undefined,
  ahora: Date = new Date(),
): { paso: number } | { corte: "terminado" | "sin-tiempo" | "fecha-pasada" } | null {
  if (meta.seqEstado && meta.seqEstado !== "activo") return null;

  const paso = (meta.seqPaso ?? 1) + 1;
  if (paso > PASOS_COTIZACION) return { corte: "terminado" };

  // El tour ya empezó: no se le escribe a nadie sobre un viaje que ya ocurrió.
  const inicio = tourDate ? inicioDelTour(tourDate) : null;
  if (inicio !== null && inicio < ahora.getTime()) return { corte: "fecha-pasada" };

  const desde = instanteEnvio(meta.seqDesde ?? "");
  if (desde === null) return null;

  // Se revalida en cada corrida: la fecha del tour se puede haber movido a mano
  // desde el panel después de mandar la cotización.
  if (!alcanzaLaSecuencia(meta.seqDesde!, tourDate)) return { corte: "sin-tiempo" };

  // Cinco minutos de holgura, como el resto de los crons: uno que corre "en
  // punto" no debe saltarse un envío por unos segundos.
  const margen = 5 * 60 * 1000;
  const toca = desde + ESPERA_HORAS[paso] * HORA_MS;
  if (ahora.getTime() + margen < toca) return null;
  return { paso };
}
