/**
 * Dónde se hospeda el cliente de una reserva: lo que hace falta para pasar por
 * él el día del recorrido.
 *
 * Vive aquí, y no dentro de la pantalla que lo pinta, porque el dato NO está en
 * un campo: está en seis formatos distintos según por dónde entró la reserva,
 * y cualquier pantalla que lo quiera enseñar tiene que leerlos todos. Con la
 * regla escrita una sola vez, arreglar un formato nuevo se hace en un sitio.
 *
 *   1. `packageItems` — contrató el hospedaje con nosotros: sabemos el hotel y
 *      hasta la habitación.
 *   2. `_meta.pickupLugar` — el campo «Lugar de recogida» del panel. Es donde
 *      se anota a mano el hotel de las reservas por WhatsApp (20 oct 2026: el
 *      calendario decía «Sin hospedaje anotado» a una clienta con «Sierra
 *      Huasteca Inn cd. Valles» escrito ahí). El panel guarda «Lobby de tu
 *      hotel en Xilitla» si nadie lo cambia: eso es el valor por omisión, no un
 *      dato, y no se enseña.
 *   3. `Recogida: …` dentro de `notes` — el caso de las reservas de la web.
 *      Lo guarda así `api/tours/send-confirmation`, que lo vuelve a leer con
 *      esta misma expresión para armar el correo.
 *   4. `RECOGER EN: …` — lo escribe el webhook de Stripe cuando el cliente no
 *      llegó a la pantalla de confirmación, y las reservas de evento.
 *   5. `Hospedaje: …` — el mismo dato por esa misma ruta del webhook.
 *   6. `_meta.zonaHospedaje` — lo que el bot entendió («Ciudad Valles»,
 *      «Xilitla»): la zona, todavía sin el hotel.
 *
 * Las notas van unidas con " | ", así que cada línea se corta en la barra.
 */
import { metaDe } from "./reserva";
import { VIAJE_SLUG } from "../viajeCdmx/config";

/** Lo mínimo de una reserva para saber dónde se hospeda. */
export interface ReservaConHospedaje {
  notes: string | null;
  packageItems: unknown;
  /** Donde vive el `_meta` (pickupLugar, zonaHospedaje). El correo no lo manda. */
  lineItems?: unknown;
  /** Solo para reconocer el viaje CDMX, cuyo «lugar de recogida» es el Ángel. */
  tourSlug?: string;
}

/**
 * 🔴 «Por definir — te contactaremos por WhatsApp» es lo que guarda el checkout
 * de un tour cuando el cliente deja el campo en blanco: eso NO es tener dónde
 * dormir, como tampoco «aún no sé» y parecidos. Lo usan el correo (para saber
 * si ofrecerle cuarto) y el panel (para no enseñarlo como hotel).
 */
export const SIN_HOSPEDAJE = /por definir|por confirmar|a[uú]n no|todav[ií]a no|no s[eé](?![a-záéíóúñ])|no tengo|no tenemos|sin (?:hotel|hospedaje)|ninguno|pendiente|not sure|not yet|no hotel|tbd/i;

/** Lo que el panel escribe en «Lugar de recogida» cuando nadie lo cambia. */
export const PICKUP_POR_DEFECTO = "Lobby de tu hotel en Xilitla";

const comparable = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const NOTAS_CON_LUGAR = [/Recogida:\s*([^|]+)/i, /RECOGER EN:\s*([^|]+)/i, /Hospedaje:\s*([^|]+)/i];

/** Un texto de hospedaje que sí dice algo: ni vacío, ni el de omisión, ni «por definir». */
function util(texto: unknown): string | null {
  const t = typeof texto === "string" ? texto.trim() : "";
  if (!t || SIN_HOSPEDAJE.test(t) || comparable(t) === comparable(PICKUP_POR_DEFECTO)) return null;
  return t;
}

export function hospedajeDeReserva(b: ReservaConHospedaje): string | null {
  const pkgs = Array.isArray(b.packageItems) ? (b.packageItems as Array<Record<string, unknown>>) : [];
  const conHotel = pkgs.find((p) => p && (p.hotel || p.habitacion));
  if (conHotel) {
    return [
      String(conHotel.hotel || "Hotel Paraíso Encantado"),
      conHotel.habitacion ? String(conHotel.habitacion) : "",
    ].filter(Boolean).join(" · ");
  }

  const meta = metaDe(b);

  // El viaje CDMX trae la noche en Paraíso incluida, y su «lugar de recogida»
  // es el punto de salida en la Ciudad de México: enseñarlo como hotel diría
  // que la pasajera duerme en el Ángel de la Independencia.
  if (b.tourSlug === VIAJE_SLUG) {
    const cuarto = meta.cuarto === "privado" ? "cuarto privado" : meta.cuarto === "compartido" ? "cuarto compartido" : "";
    return ["Hotel Paraíso Encantado (incluido en el viaje)", cuarto].filter(Boolean).join(" · ");
  }

  const delPanel = util(meta.pickupLugar);
  if (delPanel) return delPanel;

  const notas = b.notes || "";
  for (const re of NOTAS_CON_LUGAR) {
    const m = notas.match(re);
    const texto = util(m?.[1]);
    if (texto) return texto;
  }

  const zona = util(meta.zonaHospedaje);
  return zona ? `Zona: ${zona}` : null;
}

/**
 * «Valles», «Cd. Valles», «CD VALLES» y la «Ciudad Valle» que escribió un
 * cliente, sin confundirse con un «Hotel Valle Escondido».
 */
const ES_VALLES = /\bvalles\b|\b(?:ciudad|cd)\.?\s*valle\b/i;

/**
 * Si el cliente sale de Ciudad Valles. Esas reservas cuestan distinto (más
 * transporte y gasolina hasta Xilitla y de regreso), así que el corte las marca
 * para revisar sus costos a mano (decisión de Manolo, 20 oct 2026).
 *
 * Basta con que UNA fuente lo diga: la marca solo pide una revisión, y es más
 * barato revisar una de más que dejar sin cobrar un traslado.
 */
export function zonaDeReserva(b: ReservaConHospedaje): "valles" | null {
  const meta = metaDe(b);
  // Lo que se eligió con los botones de la cotización («Xilitla» / «Ciudad
  // Valles», 20 oct 2026) manda sobre lo que digan los textos: es una decisión,
  // no una adivinanza.
  const elegida = typeof meta.zonaHospedaje === "string" ? meta.zonaHospedaje.trim() : "";
  if (/^xilitla$/i.test(elegida)) return null;
  if (/^ciudad valles$/i.test(elegida)) return "valles";
  const pkgs = Array.isArray(b.packageItems) ? (b.packageItems as Array<Record<string, unknown>>) : [];
  const fuentes: unknown[] = [
    meta.zonaHospedaje,
    meta.pickupLugar,
    ...(b.notes || "").split("|").map((linea) => linea.match(/(?:Recogida|RECOGER EN|Hospedaje):\s*(.+)/i)?.[1]),
    ...pkgs.map((p) => p?.hotel),
  ];
  return fuentes.some((f) => typeof f === "string" && ES_VALLES.test(f)) ? "valles" : null;
}

/**
 * De dónde salió el cliente, para los tours que cobran distinto desde Ciudad
 * Valles (la Ruta Surrealista, $400 más por reserva; Manolo, 20 oct 2026):
 * «valles», «xilitla», o null si la reserva no lo dice. El «Lobby de tu hotel
 * en Xilitla» que el panel pone solo no cuenta: es el de omisión, no un dato.
 */
export function salidaDeReserva(b: ReservaConHospedaje): "valles" | "xilitla" | null {
  if (zonaDeReserva(b) === "valles") return "valles";
  const meta = metaDe(b);
  // Los paquetes con hotel duermen en el nuestro, en Xilitla.
  const pkgs = Array.isArray(b.packageItems) ? (b.packageItems as Array<Record<string, unknown>>) : [];
  if (pkgs.some((p) => p && (p.hotel || p.habitacion))) return "xilitla";
  const fuentes = [
    meta.zonaHospedaje,
    meta.pickupLugar,
    ...(b.notes || "").split("|").map((linea) => linea.match(/(?:Recogida|RECOGER EN|Hospedaje):\s*(.+)/i)?.[1]),
  ].map(util);
  // Nuestro hotel también está en Xilitla, aunque el texto no lo diga.
  return fuentes.some((f) => f && /xilitla|para[ií]so encantado/i.test(f)) ? "xilitla" : null;
}
