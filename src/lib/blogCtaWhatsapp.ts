/**
 * Los llamados a WhatsApp del blog (19 nov 2026). Manolo: «agrega CTAs para
 * WhatsApp donde veas conveniente en los blogs, también por temporada y
 * urgencia por la demanda».
 *
 * Aquí solo va la LÓGICA y el texto (sin base ni React), para poder probarlo:
 * el componente `components/blog/CtaWhatsappBlog.tsx` lee la base y pinta.
 *
 * 🔴 REGLA: la urgencia sale de datos REALES o no sale.
 *   · La temporada y su nota: `temporadasProximas.ts` (las mismas que enseña el
 *     inicio, con el texto que Manolo ya vio).
 *   · Los días que faltan: la fecha de hoy en México.
 *   · La demanda: las reservas que de verdad hay para ESE recorrido en ESAS
 *     fechas (`disponibilidadDeTour`, la misma cuenta del calendario y del
 *     cobro). Si no hay ninguna, no se dice nada de demanda: nada de «quedan
 *     pocos lugares» inventado, que es lo que se ha estado quitando del sitio
 *     desde septiembre.
 *   · El cupo de cada salida: `cupoDeTour` (12, u 8 en la Gruta de Xilo).
 *   · Nada sobre el color del agua (Manolo, 19 nov: no se garantiza).
 */
import { proximasTemporadas, fechasDeTemporada, type TemporadaVista } from "@/lib/temporadasProximas";
import { hoyEnMexico } from "@/lib/temporada";
import type { EstadoDia } from "@/lib/cupoTour";

/** Más lejos que esto, una temporada no mete prisa: el aviso no sale. */
export const VENTANA_AVISO_DIAS = 75;

const diaDe = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** La temporada que toca avisar (la que está en curso o la siguiente), o null. */
export function temporadaParaAviso(ahora?: Date): (TemporadaVista & { faltan: number }) | null {
  const t = proximasTemporadas(1, ahora)[0];
  if (!t) return null;
  const { y, m, d } = hoyEnMexico(ahora);
  const hoy = Date.UTC(y, m - 1, d) / 86_400_000;
  const faltan = Math.max(0, diaDe(t.desde) - hoy);
  if (!t.enCurso && faltan > VENTANA_AVISO_DIAS) return null;
  return { ...t, faltan };
}

/** Desde qué día contar la demanda: hoy si la temporada ya empezó. */
export function inicioDeConteo(t: { desde: string; enCurso: boolean }, ahora?: Date): string {
  if (!t.enCurso) return t.desde;
  const { y, m, d } = hoyEnMexico(ahora);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * La frase de demanda con las reservas reales de un recorrido en la
 * temporada, o null si no hay ninguna reserva (entonces no se dice nada).
 */
export function fraseDemanda(estados: Record<string, EstadoDia>, nombreTour: string): string | null {
  const v = Object.values(estados);
  const llenas = v.filter((e) => e === "sin-cupo").length;
  const casi = v.filter((e) => e === "casi-lleno").length;
  const conReservas = v.filter((e) => e === "con-reservas").length;
  if (llenas > 0) {
    return `${nombreTour}: ${plural(llenas, "fecha de esta temporada ya está llena", "fechas de esta temporada ya están llenas")}${
      casi > 0 ? ` y ${plural(casi, "está casi llena", "están casi llenas")}` : ""
    }.`;
  }
  if (casi > 0) return `${nombreTour}: ${plural(casi, "fecha de esta temporada está casi llena", "fechas de esta temporada están casi llenas")}.`;
  if (conReservas > 0) {
    return `${nombreTour} ya tiene reservas en ${plural(conReservas, "fecha", "fechas")} de esta temporada.`;
  }
  return null;
}

/** «Faltan 30 días» · «Falta 1 día» · «Empieza hoy». */
export function textoFaltan(faltan: number): string {
  if (faltan <= 0) return "Empieza hoy";
  return faltan === 1 ? "Falta 1 día" : `Faltan ${faltan} días`;
}

/** Las fechas para el mensaje y el antetítulo: «19 dic – 6 ene». */
export const fechasTemporada = (t: TemporadaVista) => fechasDeTemporada(t, "es");

// ── Mensajes que llegan al WhatsApp ──────────────────────────────────────────
//
// Como los de grupos y Xantolo (`lib/whatsapp.ts`): piden de entrada lo que
// hace falta para contestar con un plan y no con tres preguntas, y dicen de
// qué artículo viene la persona.

/** Quien quiere apartar fecha en la temporada que viene. */
export function mensajeTemporada(titulo: string, temporada: string, fechas: string, tour?: string): string {
  return (
    `Hola, leí su artículo «${titulo}» y quiero ir en ${temporada} (${fechas}).` +
    (tour ? ` Me interesa ${tour}.` : "") +
    "\n\n· Fechas exactas:\n· Cuántos somos:\n· ¿Ya tenemos hospedaje? (sí/no):"
  );
}

/**
 * El nombre del lugar listo para una frase: sin lo que va entre paréntesis o
 * tras un guion largo, y con su artículo cuando lo pide («ir a la Cascada de
 * Tamul», «ir a Xilitla»). Las fichas guardan «Cascada de Tamul», «Las Pozas
 * (Jardín Surrealista)», «Puente de Dios (Tamasopo)».
 */
export function lugarEnFrase(nombre: string): string {
  const limpio = nombre.replace(/\s*\([^)]*\)/g, "").split(/\s+[—–]\s+/)[0].trim();
  const ARTICULO: Record<string, string> = {
    cascada: "la", cascadas: "las", sotano: "el", nacimiento: "el", zona: "la", laguna: "la", balneario: "el",
    castillo: "el", cueva: "la", cuevas: "las", hacienda: "la", rio: "el", manantial: "el", museo: "el",
    presa: "la", mirador: "el", voladores: "los", jardin: "el", gruta: "la", grutas: "las", sierra: "la",
  };
  const primera = limpio.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const art = ARTICULO[primera];
  return art ? `${art} ${limpio}` : limpio;
}

/** Quien tiene dudas a mitad del artículo. */
export function mensajeDudas(titulo: string, lugar: string): string {
  return `Hola, leí su artículo «${titulo}» y tengo dudas para ir a ${lugar}.\n\n· Fechas:\n· Cuántos somos:\n· Mi duda:`;
}

/** Quien terminó de leer y prefiere preguntar antes de reservar. */
export function mensajeCierre(titulo: string, tour?: string): string {
  return tour
    ? `Hola, leí su artículo «${titulo}» y quiero reservar ${tour}. ¿Qué fechas tienen?\n\n· Cuántos somos:\n· Me hospedo en:`
    : `Hola, leí su artículo «${titulo}» y quiero armar mi viaje a la Huasteca Potosina.\n\n· Fechas:\n· Cuántos somos:\n· Me hospedo en:`;
}

// ── Inglés (/en/blog, 19 nov 2026: «también ponlos en la de inglés») ─────────
//
// Las mismas reglas: la temporada y su nota salen de `temporadasProximas.ts`
// (que ya trae el inglés) y la demanda solo con reservas reales. El mensaje va
// en inglés: quien lee en inglés escribe en inglés, y así el equipo lo sabe
// desde el primer renglón.

const pluralEn = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** La frase de demanda en inglés, o null sin reservas. */
export function fraseDemandaEn(estados: Record<string, EstadoDia>, tourName: string): string | null {
  const v = Object.values(estados);
  const llenas = v.filter((e) => e === "sin-cupo").length;
  const casi = v.filter((e) => e === "casi-lleno").length;
  const conReservas = v.filter((e) => e === "con-reservas").length;
  if (llenas > 0) {
    return `${tourName}: ${pluralEn(llenas, "date this season is already full", "dates this season are already full")}${
      casi > 0 ? ` and ${pluralEn(casi, "is almost full", "are almost full")}` : ""
    }.`;
  }
  if (casi > 0) return `${tourName}: ${pluralEn(casi, "date this season is almost full", "dates this season are almost full")}.`;
  if (conReservas > 0) return `${tourName} already has bookings on ${pluralEn(conReservas, "date", "dates")} this season.`;
  return null;
}

/** «30 days to go» · «1 day to go» · «Starts today». */
export function textoFaltanEn(faltan: number): string {
  if (faltan <= 0) return "Starts today";
  return faltan === 1 ? "1 day to go" : `${faltan} days to go`;
}

export const fechasTemporadaEn = (t: TemporadaVista) => fechasDeTemporada(t, "en");

/** El nombre del lugar sin paréntesis ni lo que va tras un guion largo. */
export function lugarEnFraseEn(nombre: string): string {
  return nombre.replace(/\s*\([^)]*\)/g, "").split(/\s+[—–]\s+/)[0].trim();
}

export function mensajeTemporadaEn(titulo: string, temporada: string, fechas: string, tour?: string): string {
  return (
    `Hi, I read your article "${titulo}" and I'd like to visit during ${/^xantolo/i.test(temporada) ? "" : "the "}${temporada} (${fechas}).` +
    (tour ? ` I'm interested in ${tour}.` : "") +
    "\n\n· Exact dates:\n· Number of people:\n· Do we have a hotel yet? (yes/no):"
  );
}

export function mensajeDudasEn(titulo: string, lugar: string): string {
  return `Hi, I read your article "${titulo}" and I have some questions about visiting ${lugar}.\n\n· Dates:\n· Number of people:\n· My question:`;
}

export function mensajeCierreEn(titulo: string, tour?: string): string {
  return tour
    ? `Hi, I read your article "${titulo}" and I'd like to book ${tour}. Which dates are available?\n\n· Number of people:\n· I'm staying at:`
    : `Hi, I read your article "${titulo}" and I'd like help planning my trip to the Huasteca Potosina.\n\n· Dates:\n· Number of people:\n· I'm staying at:`;
}
