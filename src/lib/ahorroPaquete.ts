import { TOURS_DB } from "./tours";
import { HABITACIONES_HOTEL, getHabitacion, tarifaNoche } from "./habitaciones";
import type { Paquete } from "./paquetes";

/**
 * Cuánto se ahorra de verdad quien compra el paquete en vez de armar el mismo
 * viaje por su cuenta.
 *
 * 🔴 Por qué se calcula y no se escribe a mano: el campo `valor` de
 * `paquetes.ts` es una lista fija que nadie pinta y que se quedó vieja —da el
 * hotel a $2,800 la noche cuando se cobra a $1,500, y suma "transporte",
 * "entradas" y "fotografía" aparte cuando el precio del recorrido YA los
 * incluye—. Con esos números el sitio habría anunciado un 43 % de ahorro que
 * cualquiera desmiente en dos minutos abriendo la página de tours.
 *
 * Aquí la cuenta se hace con los precios que el propio sitio cobra hoy:
 * los recorridos del catálogo y la tarifa real de la habitación.
 *
 * ⚠️ La comparación sólo se sostiene porque la 3.ª noche de regalo es ventaja
 * exclusiva del paquete (ver `nochesGratis` en `habitaciones.ts`). Si algún día
 * vuelve a valer para la reserva suelta, el ahorro de casi todos los paquetes
 * desaparece y hay que volver a mirar esto.
 */

/** Los paquetes se publican POR PAREJA: el desglose se compara con 2 personas. */
export const PAX_PAQUETE = 2;

/**
 * Por debajo de esto no se enseña nada.
 *
 * Un "ahorras $300" sobre un viaje de $18,000 no convence a nadie y sí invita
 * a sacar la calculadora. Mejor no decir nada y vender el paquete por lo que
 * de verdad tiene: el viaje ya resuelto.
 */
export const AHORRO_MINIMO = 500;

export interface DesgloseAhorro {
  /** Lo que costarían los recorridos sueltos, para dos personas. */
  tours:   number;
  /** Lo que costarían las noches sueltas, pagándolas todas. */
  hotel:   number;
  /** Cuántos recorridos entraron en la cuenta. */
  nTours:  number;
  /** Tours + hotel: lo que cuesta armarlo por tu cuenta. */
  suelto:  number;
  /** suelto − precio del paquete. */
  ahorro:  number;
  /** El ahorro como porcentaje de lo que costaría suelto. */
  pct:     number;
}

/** El precio de catálogo de un recorrido, por persona. */
function precioTour(slug: string): number {
  const t = TOURS_DB.find((x) => x.slug === slug);
  // Los tours por vehículo (el RZR) no se cobran por cabeza: se suman aparte,
  // una vez por paquete, en `precioVehiculo`.
  if (!t || t.precioUnidad === "vehiculo") return 0;
  return t.precio;
}

/**
 * Lo que cuesta suelto un recorrido POR VEHÍCULO, una sola vez.
 *
 * Una pareja es exactamente un vehículo, así que no se multiplica por dos. La
 * ruta importa y mucho: la Nanacatli son $1,600 y la Nacimiento $3,800, y
 * tomar la barata cuando el paquete incluye la cara hace que el ahorro se
 * anuncie más chico de lo que es —o que no se anuncie—.
 */
function precioVehiculo(slug: string, ruta?: string): number {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t || t.precioUnidad !== "vehiculo" || !t.rutas || !t.flota) return 0;
  const i = Math.max(0, t.rutas.findIndex((r) => r.nombre === ruta));
  // El vehículo de dos plazas es el que le toca a una pareja.
  const veh = t.flota[0];
  return veh?.precios[i] ?? t.precio;
}

/** Lo que costaría suelta una actividad opcional que el paquete ya incluye. */
function precioAddOns(slug: string, ids: string[] | undefined): number {
  if (!ids?.length) return 0;
  const cat = TOURS_DB.find((x) => x.slug === slug)?.addOns ?? [];
  return ids.reduce((s, id) => {
    const a = cat.find((x) => x.id === id);
    return a ? s + a.precio * PAX_PAQUETE : s;
  }, 0);
}

/** La habitación con la que se publica el paquete. */
function habitacionDelPaquete(p: Paquete) {
  const propia = p.habitaciones?.length ? getHabitacion(p.habitaciones[0]) : undefined;
  if (propia) return propia;
  const montana = p.habitacionIncluida === "montana";
  return HABITACIONES_HOTEL.find((h) => h.vistaMontana === montana) ?? HABITACIONES_HOTEL[0];
}

/**
 * Los recorridos que hay que pagar para repetir el paquete por tu cuenta.
 *
 * Cuando el paquete deja elegir (Tu Huasteca: cuatro de seis) se toman los
 * MÁS BARATOS de la lista. Es a propósito: así el ahorro que se anuncia es el
 * mínimo que el cliente va a encontrar, nunca uno que no se cumpla.
 */
function slugsDePaquete(p: Paquete): string[] {
  const delItinerario = p.itinerario
    .map((d) => (d as { tourSlug?: string }).tourSlug)
    .filter((s): s is string => !!s);

  const el = p.eleccionTour;
  // Con `dia` la elección sustituye a un día que el itinerario ya cuenta.
  if (!el || el.dia !== undefined) return delItinerario;

  const cuantos  = el.cuantos ?? 1;
  const baratos  = el.opciones
    .map((o) => o.slug)
    .filter((s) => !delItinerario.includes(s))
    .sort((a, b) => precioTour(a) - precioTour(b))
    .slice(0, cuantos);
  return [...delItinerario, ...baratos];
}

/**
 * El ahorro del paquete, o `null` si no hay uno que valga la pena anunciar.
 *
 * Devuelve `null` —y la tarjeta no enseña ninguna promesa de precio— cuando el
 * paquete cuesta lo mismo o más que sus partes. Hoy pasa con la Luna de Miel,
 * cuyo precio no está en los recorridos sino en la suite, la cena y el vino:
 * cosas que no tienen precio de lista con el que compararse.
 */
export function ahorroPaquete(p: Paquete): DesgloseAhorro | null {
  const slugs = slugsDePaquete(p);
  // Los recorridos por cabeza, más lo que el paquete incluye y no se cobra así:
  // el vehículo del RZR (una vez) y las actividades opcionales ya incluidas.
  const extras = p.itinerario.reduce(
    (s, d) =>
      s +
      (d.tourSlug ? precioVehiculo(d.tourSlug, d.rutaVehiculo) : 0) +
      (d.tourSlug ? precioAddOns(d.tourSlug, d.addOns) : 0),
    0,
  );
  const tours = slugs.reduce((s, sl) => s + precioTour(sl) * PAX_PAQUETE, 0) + extras;

  const hab      = habitacionDelPaquete(p);
  const porNoche = tarifaNoche(hab, PAX_PAQUETE) ?? 0;
  const hotel    = porNoche * p.noches;

  const suelto = tours + hotel;
  const ahorro = suelto - p.precio;
  if (ahorro < AHORRO_MINIMO) return null;

  return {
    tours,
    hotel,
    nTours: slugs.length,
    suelto,
    ahorro,
    pct: Math.round((ahorro / suelto) * 100),
  };
}
