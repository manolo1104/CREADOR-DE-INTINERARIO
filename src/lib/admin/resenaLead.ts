// La reseña de Google por WhatsApp desde el lead (19 nov 2026).
//
// Manolo: «integra un acceso rápido para mandar pedir reseña a wpp». Fase 1:
// en la ficha de un lead Operado y en su tarjeta del tablero, un botón abre el
// WhatsApp (wa.me) con el mensaje listo, en el idioma del contacto, y anota la
// petición en las reservas de su viaje con la ruta de siempre
// (POST /api/admin/reservas/[id]/resena-whatsapp, la del botón de Reseñas).
// 🔴 Un clic = un mensaje, nunca un envío en lote: el WhatsApp del negocio se
// puede bloquear por mandar mensajes en masa. Mandarla desde la cola de la
// Bandeja es la fase 2.
//
// «Ya se pidió» se arma de tres lados que hasta hoy no se hablaban:
//  · el correo automático del día siguiente (`reviewRequestedAt` o la encuesta);
//  · el botón de WhatsApp del panel (`reviewWhatsappAt`);
//  · los mensajes que salieron por el WhatsApp del negocio y se ven en la
//    Bandeja (el bot, el celular o el panel), con la regla del KPI «Reseña
//    pedida»: la liga o la palabra, desde el último día del viaje.
//
// Puro (sin Prisma): lo arma `resenaLeadDatos.ts` y lo prueba
// `__tests__/resenaLead.test.ts`.

import type { Locale } from "@/lib/i18n/config";
import { mensajeResenaWhatsapp, telefonoWhatsapp } from "@/lib/reviewRequest";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { salioAlCliente } from "./bandeja";
import { diaCortoMX } from "./confirmacionReserva";

/**
 * Un mensaje nuestro que pide la reseña: la liga de Google o la palabra. La
 * MISMA expresión que el KPI «Reseña pedida» (`indicadores/servicio.ts`): lo
 * que aquí dice «ya se pidió» es lo mismo que allá cuenta.
 */
export const RE_RESENA = /g\.page|rese[ñn]a|review|opini[oó]n en google|calif[ií]canos/i;

/** «¿Cómo les fue?» sin la liga: el bot lo manda 1 a 3 días después del viaje y solo manda la liga si le contestan que bien. */
export const RE_COMO_LES_FUE = /c[oó]mo (?:les|te|le) fue|qu[eé] tal (?:les|te|le) fue|how was (?:your|the)/i;

/**
 * Las reservas que terminaron hasta estos días antes que la última son el
 * MISMO viaje (dos reservas de un fin de semana): se marcan todas con un solo
 * mensaje. Las de antes son otro viaje.
 */
export const DIAS_DE_UN_VIAJE = 7;

/** Con esta calificación o menos en la encuesta, la ficha avisa antes de pedirla. */
export const CALIFICACION_BAJA = 3;

/** Lo que hace falta saber de una reserva del lead. */
export interface ReservaParaResena {
  id: string;
  folio: string;
  status: string;
  /** Lo que dejó de anticipo: una pendiente solo cuenta si dejó algo (la misma regla que el correo automático). */
  depositoPagado: number;
  /** El último día del viaje de esta reserva (`ultimoDiaDelTour`: el viaje CDMX regresa el domingo), o null. */
  ultimoDia: string | null;
  /** Operación marcó «Cancelada» TODAS sus salidas: no hizo ningún tour. */
  todoCancelado: boolean;
  /** El nombre del tour para el mensaje, ya en el idioma del contacto. */
  tour: string;
  /** Cuándo le llegó el correo automático de la reseña (ISO), o null. */
  correoEn: string | null;
  /** Cuándo se pidió con el botón de WhatsApp del panel (ISO), o null. */
  whatsappEn: string | null;
  /**
   * Quién tocó ese botón (el nombre de su renglón en la bitácora), o null si no
   * se sabe (20 nov 2026: la ficha decía «pedida el 20 nov» sin decir quién).
   */
  whatsappPor?: string | null;
  /** La calificación de su encuesta (1 a 5), o null si no contestó. */
  calificacion: number | null;
  /** El teléfono de la reserva, por si el contacto no tiene. */
  telefono: string | null;
}

/** Un mensaje del chat del contacto en la Bandeja. */
export interface MensajeDelChat {
  fecha: string | Date;
  texto: string | null;
  /** entra | sale */
  direccion: string;
  /** pendiente | enviando | enviado | entregado | leido | fallo */
  estado: string | null;
  /** app (el celular o el bot: los dos salen por el mismo número) | panel | agente | cliente */
  desde: string;
  /** Quién del equipo lo mandó desde el panel. */
  por: string | null;
}

export interface PeticionResena {
  via: "whatsapp" | "correo";
  /** ISO. */
  en: string;
  /** Quién o desde dónde («Erick», «desde el celular o el bot»), o null si no se sabe. */
  quien: string | null;
}

/** Lo que la ficha y la tarjeta saben de la reseña de un lead. */
export interface ResenaLead {
  /** Las reservas del viaje que acaba de terminar: al pedirla se anotan todas. */
  reservaIds: string[];
  folios: string[];
  /** El último día del viaje (YYYY-MM-DD). */
  ultimoDia: string;
  idioma: Locale;
  /** El mensaje, en el idioma del contacto. */
  mensaje: string;
  /** wa.me con el mensaje listo, o null si no hay un teléfono que sirva. */
  waUrl: string | null;
  /** La petición por WhatsApp más reciente (el botón del panel o un mensaje que salió por el número del negocio). */
  porWhatsapp: PeticionResena | null;
  /** El correo automático con el botón de Google. */
  porCorreo: PeticionResena | null;
  /** Cuándo salió un «¿cómo les fue?» sin la liga (ISO), o null. */
  comoLesFue: string | null;
  /** La calificación más baja de sus encuestas, o null si no contestó. */
  calificacion: number | null;
}

const esFecha = (f: unknown): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f);
const instante = (f: string | Date) => new Date(f).getTime();

/**
 * ¿Esta reserva ya viajó? Ni cancelada ni borrador; una pendiente solo si
 * dejó anticipo (sin él no hay prueba de que viajó); su último día ya pasó (es
 * anterior a hoy, en México); y no tiene TODAS sus salidas canceladas. Las
 * mismas reglas que el correo automático (`cron/pedir-resenas`).
 */
export function reservaViajo(r: ReservaParaResena, hoy: string): boolean {
  if (r.status === "cancelled" || r.status === "borrador") return false;
  if (r.status === "pending" && !(Number(r.depositoPagado) > 0)) return false;
  if (!esFecha(r.ultimoDia) || r.ultimoDia >= hoy) return false;
  return !r.todoCancelado;
}

/**
 * El viaje que acaba de terminar: la reserva que viajó con el último día más
 * reciente, más las que terminaron hasta `DIAS_DE_UN_VIAJE` días antes. `desde`
 * es el primero de esos últimos días: desde ahí un mensaje ya cuenta como
 * pedida (si se pidió el sábado tras el primer tour, el lunes no se repite).
 */
export function viajeQueTermino(rs: ReservaParaResena[], hoy: string): { desde: string; hasta: string; reservas: ReservaParaResena[] } | null {
  const viajaron = rs.filter(r => reservaViajo(r, hoy));
  if (!viajaron.length) return null;
  const hasta = viajaron.map(r => r.ultimoDia as string).sort().at(-1) as string;
  const limite = addDaysYMD(hasta, -DIAS_DE_UN_VIAJE);
  const reservas = viajaron.filter(r => (r.ultimoDia as string) >= limite);
  const desde = reservas.map(r => r.ultimoDia as string).sort()[0];
  return { desde, hasta, reservas };
}

/**
 * Lo que dicen los mensajes que SALIERON (no los que fallaron ni los que
 * siguen en la cola) desde `desde`: la petición de reseña más reciente y el
 * «¿cómo les fue?» más reciente sin la liga.
 */
export function peticionesDelChat(mensajes: MensajeDelChat[], desde: string): { resena: PeticionResena | null; comoLesFue: string | null } {
  const salieron = mensajes
    .filter(m => salioAlCliente(m) && !!m.texto && ymdMX(m.fecha) >= desde)
    .sort((a, b) => instante(b.fecha) - instante(a.fecha));
  const r = salieron.find(m => RE_RESENA.test(m.texto as string));
  const c = salieron.find(m => !RE_RESENA.test(m.texto as string) && RE_COMO_LES_FUE.test(m.texto as string));
  return {
    resena: r ? {
      via: "whatsapp",
      en: new Date(r.fecha).toISOString(),
      // Lo del celular y lo del bot llegan igual a la Bandeja («app»): no se distinguen.
      quien: r.desde === "panel" || r.desde === "agente" ? (r.por?.trim() || null) : "desde el celular o el bot",
    } : null,
    comoLesFue: c ? new Date(c.fecha).toISOString() : null,
  };
}

/** «A», «A y B», «A, B y C» (en inglés, «and»). */
function enLista(xs: string[], idioma: Locale): string {
  const y = idioma === "en" ? "and" : "y";
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${y} ${xs[xs.length - 1]}`;
}

const masReciente = (ps: (PeticionResena | null)[]): PeticionResena | null =>
  ps.filter((p): p is PeticionResena => !!p && Number.isFinite(instante(p.en))).sort((a, b) => instante(b.en) - instante(a.en))[0] ?? null;

/**
 * Todo lo de la reseña de un lead, o null si ninguna de sus reservas ha
 * viajado (sin viaje no hay nada que reseñar). El teléfono es el del contacto
 * (con quien se habla por WhatsApp) y, si no tiene, el de la reserva. El
 * idioma, el del contacto.
 */
export function estadoResenaLead(d: {
  nombre: string;
  telefono: string | null;
  idioma: string | null | undefined;
  reservas: ReservaParaResena[];
  mensajes: MensajeDelChat[];
}, hoy: string): ResenaLead | null {
  const viaje = viajeQueTermino(d.reservas, hoy);
  if (!viaje) return null;
  const idioma: Locale = d.idioma === "en" ? "en" : "es";
  const tours = Array.from(new Set(viaje.reservas.map(r => r.tour.trim()).filter(Boolean)));
  const mensaje = mensajeResenaWhatsapp(d.nombre, enLista(tours, idioma) || "Huasteca Potosina", idioma);
  const tel = telefonoWhatsapp(d.telefono) ?? viaje.reservas.map(r => telefonoWhatsapp(r.telefono)).find(Boolean) ?? null;
  const chat = peticionesDelChat(d.mensajes, viaje.desde);
  const marcas = viaje.reservas.map(r => r.whatsappEn ? { via: "whatsapp" as const, en: r.whatsappEn, quien: r.whatsappPor?.trim() || null } : null);
  const correos = viaje.reservas.map(r => r.correoEn ? { via: "correo" as const, en: r.correoEn, quien: null } : null);
  const calificaciones = viaje.reservas.map(r => r.calificacion).filter((c): c is number => typeof c === "number" && c > 0);
  return {
    reservaIds: viaje.reservas.map(r => r.id),
    folios: viaje.reservas.map(r => r.folio),
    ultimoDia: viaje.hasta,
    idioma,
    mensaje,
    waUrl: tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null,
    porWhatsapp: masReciente([...marcas, chat.resena]),
    porCorreo: masReciente(correos),
    comoLesFue: chat.comoLesFue,
    calificacion: calificaciones.length ? Math.min(...calificaciones) : null,
  };
}

// ── Lo que dice la pantalla ──────────────────────────────────────────────────

/** «Reseña pedida por WhatsApp el 18 nov · Erick» o «Le llegó el correo para dejar su reseña el 17 nov». */
export function textoPeticion(p: PeticionResena): string {
  const dia = diaCortoMX(p.en);
  if (p.via === "correo") return `Le llegó el correo para dejar su reseña el ${dia}`;
  return `Reseña pedida por WhatsApp el ${dia}${p.quien ? ` · ${p.quien}` : ""}`;
}

/** Lo que conviene saber antes de pedirla. El botón sigue en todos los casos. */
export function avisosResena(r: ResenaLead): string[] {
  const avisos: string[] = [];
  // 🔴 Se avisa, no se esconde el botón: Google prohíbe pedir la reseña solo a
  // los contentos («review gating», ver `reviewEmail.ts`).
  if (r.calificacion !== null && r.calificacion <= CALIFICACION_BAJA) {
    avisos.push(`En la encuesta calificó su tour con ${r.calificacion} de 5: atiende primero lo que no le gustó (Google no permite pedirla solo a los contentos, por eso el botón sigue).`);
  }
  if (!r.porWhatsapp && r.comoLesFue) {
    avisos.push(`Ya se le preguntó «¿cómo les fue?» por WhatsApp el ${diaCortoMX(r.comoLesFue)}: revisa su respuesta en la Bandeja antes de pedirla.`);
  }
  return avisos;
}

/**
 * Lo que se pregunta antes de abrir WhatsApp (para `window.confirm`), o null si
 * se abre directo: al pedirla OTRA vez, y también cuando hay algo que saber
 * antes (`avisosResena`: calificó bajo en la encuesta, o ya se le preguntó
 * «¿cómo les fue?»). Revisión del 20 nov 2026: esos avisos solo se leían en la
 * ficha, abajo del botón, y desde la tarjeta no se veían; ahora el toque los
 * dice, junto con el correo de la reseña si ya le llegó.
 */
export function preguntaAntesDePedir(r: ResenaLead): string | null {
  const avisos = avisosResena(r);
  if (!r.porWhatsapp && !avisos.length) return null;
  const partes = [
    ...(r.porWhatsapp ? [`${textoPeticion(r.porWhatsapp)}.`] : []),
    ...avisos,
    ...(r.porCorreo ? [`${textoPeticion(r.porCorreo)}.`] : []),
  ];
  return `${partes.join(" ")} ¿Abrir WhatsApp para pedírsela${r.porWhatsapp ? " otra vez" : ""}?`;
}

/** La misma reseña ya marcada como pedida desde el panel (para enseñarlo en cuanto se toca el botón). */
export function conPeticionDelPanel(r: ResenaLead, en: string, quien?: string | null): ResenaLead {
  return { ...r, porWhatsapp: { via: "whatsapp", en, quien: quien?.trim() || null } };
}
