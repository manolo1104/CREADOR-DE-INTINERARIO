/**
 * Lo que el visitante declara en el buscador del hero, para que la rejilla de
 * recorridos de la pantalla siguiente le responda sin recargar la página.
 *
 * 🔴 Por qué un evento y no una navegación (7 oct 2026)
 *
 * El inicio es `force-dynamic`: mandar al servidor un `?categoria=…` costaría un
 * render completo para mover una píldora. Y el inicio es LCP crítico, así que
 * tampoco se envuelve media página en un proveedor de contexto solo para esto.
 * El sitio ya usa este patrón para abrir el panel de cookies desde el pie
 * (`EVENTO_ABRIR_COOKIES` en `cookiesPrefs.ts`) y para el carrito
 * (`CARRITO_EVENT` en `carrito.ts`): un `CustomEvent` en `window`.
 *
 * 🔴 Lo que esto NO hace: la fecha **no** llega precargada al motor de reserva.
 * `TourBookingState` (`tourBooking.ts`) es la carga completa del cobro —la lee
 * `/reservar-tour/[slug]/checkout`— y escribir una versión a medias ahí sería
 * meterle basura al cobro. La fecha se guarda en su propia llave y hoy solo
 * sirve en el inicio. Enlazarla con el calendario de la ficha es trabajo de
 * quien tenga `ReservaFichaTour.tsx`.
 */
import type { EtiquetaTour } from "./etiquetasTour";
import type { TourCategoria } from "./tours";

/** Qué eligió en «¿Qué quieres ver?»: nada, una familia, o una etiqueta. */
export type FiltroQue =
  | { tipo: "todos" }
  | { tipo: "categoria"; id: TourCategoria }
  | { tipo: "etiqueta"; id: EtiquetaTour }
  /**
   * Un recorrido concreto (8 oct 2026, Manolo: «si se elige un tour… se tiene
   * que poner el tour en automático»). Antes, elegir un recorrido en el
   * buscador dejaba la rejilla con los quince de siempre: el clic no se veía
   * por ningún lado hasta pulsar el botón dorado.
   */
  | { tipo: "tour"; slug: string };

export interface IntencionInicio {
  que:      FiltroQue;
  /** AAAA-MM-DD, o "" si no eligió día. */
  fecha:    string;
  personas: number;
}

/** El evento que el buscador del hero lanza y la rejilla escucha. */
export const EVENTO_INTENCION = "hp:intencion-inicio";

/** El ancla de la rejilla, para que «Ver tours» baje a ella. */
export const ANCLA_RECORRIDOS = "recorridos";

const LLAVE = "hp_intencion_inicio";

export function anunciarIntencion(i: IntencionInicio) {
  if (typeof window === "undefined") return;
  // sessionStorage puede tirar (ventana privada, datos bloqueados): que no se
  // caiga el buscador por no poder recordar la fecha.
  try {
    sessionStorage.setItem(LLAVE, JSON.stringify(i));
  } catch {
    /* sin memoria: el evento igual viaja */
  }
  window.dispatchEvent(new CustomEvent<IntencionInicio>(EVENTO_INTENCION, { detail: i }));
}

/** Lo último que declaró, si el navegador lo recuerda. */
export function leerIntencion(): IntencionInicio | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LLAVE);
    if (!raw) return null;
    const i = JSON.parse(raw) as IntencionInicio;
    // Una fecha guardada ayer ya no sirve de nada.
    if (i.fecha && i.fecha < hoyMX()) i.fecha = "";
    return i;
  } catch {
    return null;
  }
}

/**
 * Hoy en la Huasteca, en AAAA-MM-DD.
 *
 * 🔴 Railway corre en UTC: a partir de las 18:00 de México, `new Date()` ya es
 * el día siguiente allá. El mínimo del calendario se calcula con la zona de
 * México a propósito, o de noche el buscador ofrecería como «mañana» un día que
 * para el cliente es pasado mañana.
 */
export function hoyMX(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** AAAA-MM-DD a `dias` de hoy en México. */
export function diasDesdeHoyMX(dias: number): string {
  const [a, m, d] = hoyMX().split("-").map(Number);
  // Mediodía UTC: así ningún cambio de horario mueve el día al sumar.
  const base = new Date(Date.UTC(a, m - 1, d, 12));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** «15 de noviembre» · «November 15». Para la línea de contexto de la rejilla. */
export function fechaCorta(ymd: string, en: boolean): string {
  const [a, m, d] = ymd.split("-").map(Number);
  if (!a || !m || !d) return ymd;
  return new Intl.DateTimeFormat(en ? "en-US" : "es-MX", {
    day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d, 12)));
}
