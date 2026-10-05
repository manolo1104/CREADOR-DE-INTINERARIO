/**
 * Cómo nace un renglón del carrito.
 *
 * Vive aparte de `carrito.ts` a propósito: ese módulo lo importa también la ruta
 * de API que cobra (`api/tours/carrito-payment-intent`) y conviene que siga sin
 * arrastrar el catálogo entero.
 *
 * Existe porque la misma decisión estaba escrita tres veces —en el carrito, en
 * el botón del catálogo y en el formulario del RZR— y cada copia metía
 * `adults: 2` a secas. El rafting no sale con menos de 4, así que entraba
 * inválido y el cliente solo se enteraba al final, con un error del servidor que
 * ni siquiera decía cuál de sus recorridos era el del problema.
 */

import { TOURS_DB, tourEnFecha, type Tour } from "./tours";
import { totalRecorrido } from "./tourBooking";
import type { CarritoItem } from "./carrito";

/**
 * Cuánta gente arranca en un recorrido: la que el tour exige como mínimo, y
 * nunca menos de dos, que es como viaja casi todo el mundo.
 */
export function personasIniciales(t: Pick<Tour, "groupMin">): number {
  return Math.max(2, t.groupMin || 1);
}

/**
 * Arma el renglón de un tour, listo para `agregarAlCarrito`.
 *
 * Va SIN fecha a propósito: se elige dentro del carrito, que es donde el cliente
 * ve sus días juntos. El `total` es referencial —solo para pintar—; el que se
 * cobra lo vuelve a calcular el servidor.
 */
export function itemDesdeTour(
  t: Tour,
  base: Partial<Omit<CarritoItem, "uid">> = {},
): Omit<CarritoItem, "uid"> {
  const comun = {
    tourId:    t.id,
    tourSlug:  t.slug,
    tourName:  t.nombre,
    tourImage: t.imagen_hero,
    tourDate:  "",
    childrenMid:   0,
    childrenSmall: 0,
  };

  // Tours cobrados por vehículo (RZR, café): entran con la primera ruta y el
  // primer vehículo, y eso se cambia dentro del carrito. Mandarlos a otra
  // pantalla para elegir unidad rompía el flujo justo a la mitad.
  if (t.precioUnidad === "vehiculo") {
    const ruta = t.rutas?.[0];
    const veh  = t.flota?.[0];
    if (ruta && veh) {
      return {
        ...comun,
        adults:   1,
        ruta:     ruta.nombre,
        vehiculo: veh.nombre,
        unidades: 1,
        total:    veh.precios[0] ?? ruta.desde,
        ...base,
      };
    }
    // Sin catálogo de rutas/flota no hay nada que cobrar por vehículo: cae al
    // cálculo por persona en vez de dejar el renglón a medio armar.
  }

  const adults = base.adults ?? personasIniciales(t);
  const ninosMid   = base.childrenMid ?? 0;
  const ninosSmall = base.childrenSmall ?? 0;

  // `totalRecorrido` bifurca sola entre tarifa de grupo y precio por cabeza:
  // es la misma cuenta que hace el servidor en `computeTourCharge`. Con la
  // fecha que traiga (la de la ficha), porque la promo depende de ella.
  const total = totalRecorrido(tourEnFecha(t, base.tourDate), adults, ninosMid, ninosSmall);
  return { ...comun, adults, total, ...base };
}

/**
 * El subtotal de un renglón por persona, recalculado con el catálogo y SU
 * fecha: personas, tarifa de viajero solo o de grupo, add-ons y la promo de
 * temporada baja (solo para recorridos hasta el 29 oct). Lo que se pinta tiene
 * que coincidir con lo que cobra `computeTourCharge`.
 *
 * Los renglones por vehículo se devuelven igual: su precio sale de la matriz
 * ruta × unidad, que no depende de la fecha.
 */
export function retarifarItem<T extends Omit<CarritoItem, "uid">>(i: T): T {
  if (i.unidades) return i;
  const t = TOURS_DB.find((x) => x.slug === i.tourSlug);
  if (!t) return i;
  const base = totalRecorrido(tourEnFecha(t, i.tourDate), i.adults, i.childrenMid ?? 0, i.childrenSmall ?? 0);
  const extras = (i.addOns ?? []).reduce((s, a) => {
    const cat = t.addOns?.find((x) => x.id === a.id);
    return s + (cat ? cat.precio * a.cantidad : 0);
  }, 0);
  const total = base + extras;
  return total === i.total ? i : { ...i, total };
}

/** El mismo renglón, a partir del slug. Devuelve `null` si el tour ya no existe. */
export function itemDesdeSlug(
  slug: string,
  base?: Partial<Omit<CarritoItem, "uid">>,
): Omit<CarritoItem, "uid"> | null {
  const t = TOURS_DB.find((x) => x.slug === slug);
  return t ? itemDesdeTour(t, base) : null;
}
