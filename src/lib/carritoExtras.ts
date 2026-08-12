/**
 * Todo lo que el visitante eligió en el carrito y NO son recorridos: el
 * hospedaje, el traslado y sus datos de contacto.
 *
 * Los recorridos siempre se guardaron (`hp_carrito`), pero esto vivía solo en el
 * estado de React: quien elegía habitación y fechas de hotel, salía a mirar otro
 * tour y volvía, se encontraba el carrito con sus recorridos intactos y todo lo
 * demás en blanco. Y como el hospedaje es lo que más sube el ticket, era
 * justamente lo más caro de perder.
 *
 * Va en una clave aparte a propósito: `hp_carrito` lo lee también la ruta que
 * cobra, y no tiene por qué cargar con esto.
 */

export const EXTRAS_KEY = "hp_carrito_extras";
/** Mismo evento del carrito: quien escuche uno se entera de los dos. */
export { CARRITO_EVENT } from "./carrito";

export interface CarritoExtras {
  conHotel:       boolean;
  habs:           { habitacionId: string; huespedes: number }[];
  checkin:        string;
  checkout:       string;
  conTraslado:    boolean;
  ciudadTraslado: string;
  paxTraslado:    number;
  name:           string;
  email:          string;
  phone:          string;
  pickup:         string;
}

export const EXTRAS_VACIOS: CarritoExtras = {
  conHotel: false,
  habs: [{ habitacionId: "lirios-1", huespedes: 2 }],
  checkin: "",
  checkout: "",
  conTraslado: false,
  ciudadTraslado: "",
  paxTraslado: 2,
  name: "",
  email: "",
  phone: "",
  pickup: "",
};

export function leerExtras(): CarritoExtras {
  if (typeof window === "undefined") return EXTRAS_VACIOS;
  try {
    const crudo = window.localStorage.getItem(EXTRAS_KEY);
    if (!crudo) return EXTRAS_VACIOS;
    const d = JSON.parse(crudo) as Partial<CarritoExtras>;
    // Se valida campo por campo en vez de confiar: un localStorage de otra
    // versión del sitio reventaría la página entera del carrito.
    return {
      conHotel:       typeof d.conHotel === "boolean" ? d.conHotel : false,
      habs:           Array.isArray(d.habs) && d.habs.length
        ? d.habs.filter((h) => h && typeof h.habitacionId === "string")
                .map((h) => ({ habitacionId: h.habitacionId, huespedes: Number(h.huespedes) || 1 }))
        : EXTRAS_VACIOS.habs,
      checkin:        typeof d.checkin  === "string" ? d.checkin  : "",
      checkout:       typeof d.checkout === "string" ? d.checkout : "",
      conTraslado:    typeof d.conTraslado === "boolean" ? d.conTraslado : false,
      ciudadTraslado: typeof d.ciudadTraslado === "string" ? d.ciudadTraslado : "",
      paxTraslado:    Number(d.paxTraslado) > 0 ? Number(d.paxTraslado) : 2,
      name:           typeof d.name   === "string" ? d.name   : "",
      email:          typeof d.email  === "string" ? d.email  : "",
      phone:          typeof d.phone  === "string" ? d.phone  : "",
      pickup:         typeof d.pickup === "string" ? d.pickup : "",
    };
  } catch {
    return EXTRAS_VACIOS;
  }
}

export function guardarExtras(extras: CarritoExtras): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    /* sin localStorage (modo privado, cuota llena) el carrito sigue usable */
  }
}

export function limpiarExtras(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(EXTRAS_KEY); } catch { /* da igual */ }
}
