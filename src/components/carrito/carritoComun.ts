/** Piezas que comparten la página del carrito, su formulario de pago y sus renglones. */
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { TOURS_DB } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import type { Locale } from "@/lib/i18n/config";

/**
 * La noche más barata del hotel, para el "desde $X" que se enseña sin abrir
 * nada. Sale del catálogo en vez de escribirse a mano: si mañana cambia una
 * tarifa, el reclamo cambia con ella y no se queda mintiendo.
 */
export const precioHotelDesde = Math.min(
  ...HABITACIONES_HOTEL.flatMap((h) => Object.values(h.tarifas)),
);

/**
 * El nombre corto de un recorrido en el idioma del visitante.
 *
 * El carrito guarda `tourName` en ESPAÑOL —se escribe al agregarlo, desde
 * `TOURS_DB`— así que en `/en` hay que volver a resolverlo por slug. Sin esto,
 * un carrito en inglés listaba los recorridos con su nombre en español.
 */
export function nombreCorto(slug: string, guardado: string, locale: Locale): string {
  const t = TOURS_DB.find((x) => x.slug === slug);
  return (t ? localizeTour(t, locale).nombre : guardado).split("—")[0].trim();
}

export interface Cobro {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  total: number;
  saldo: number;
  lineItems: { tourSlug?: string; tourName: string; tourDate: string; adults: number; children: number; childrenMid?: number; childrenSmall?: number; subtotal: number; eleccion?: string; addOns?: { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[]; viajeroSolo?: boolean }[];
  hospedaje: { habitacion: string; noches: number; huespedes: number; total: number; ahorro: number } | null;
  traslado:  { ciudad: string; personas: number; total: number } | null;
}
