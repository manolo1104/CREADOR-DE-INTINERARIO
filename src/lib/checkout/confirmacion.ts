/**
 * Lo que la pantalla de confirmación necesita saber de una compra, y cómo se le
 * pasa: el checkout lo guarda en `sessionStorage` justo antes de mandar al
 * cliente a `/reservar-tour/confirmacion`.
 *
 * La forma vivía como `interface` privada de esa página, y quien la escribía
 * (el carrito) armaba un objeto suelto «que tenía que coincidir». No
 * coincidía: el carrito mandaba `charged`, `name` y `email`, y la pantalla de
 * éxito salía sin nombre, sin folio y con el TOTAL donde va lo COBRADO. Con el
 * tipo compartido, un campo mal escrito ya no compila.
 */

export interface ConfirmationData {
  confirmationNumber: string;
  tourName:           string;
  tourSlug:           string;
  tourDate:           string;
  tourDuration?:      number;
  adults:             number;
  children:           number;
  total:              number;
  chargeAmount?:      number;
  paymentMode?:       string;
  promoCode?:         string;
  customerName:       string;
  customerEmail:      string;
  /**
   * Los renglones cuando la reserva vino del carrito (varios recorridos y, si
   * lo contrató, el hospedaje). Con esto la pantalla deja de resumir un viaje
   * de cuatro días como "4 recorridos" y enseña el itinerario que se pagó.
   */
  lineItems?: {
    tourName: string; tourDate: string;
    adults: number; children: number; subtotal: number;
  }[];
}

const CLAVE = "hp_tour_confirmation";

/** Lo guarda el checkout justo antes de ir a la confirmación. */
export function guardarConfirmacion(datos: ConfirmationData): void {
  sessionStorage.setItem(CLAVE, JSON.stringify(datos));
}

/**
 * Lo lee la confirmación UNA vez y lo borra. Devuelve null si no hay nada o si
 * está corrupto: el pago ya se hizo y la pantalla tiene que salir igual.
 */
export function leerConfirmacion(): ConfirmationData | null {
  const raw = sessionStorage.getItem(CLAVE);
  if (!raw) return null;
  sessionStorage.removeItem(CLAVE);
  try {
    return JSON.parse(raw) as ConfirmationData;
  } catch {
    return null;
  }
}
