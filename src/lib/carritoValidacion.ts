import { TOURS_DB } from "./tours";
import { personasDeItem, type CarritoItem } from "./carrito";
import { getBooking } from "./i18n/booking";
import { localizeTour } from "./i18n/localize";
import type { Locale } from "./i18n/config";

/**
 * Qué le falta al carrito para poder cobrarse, renglón por renglón.
 *
 * Devuelve el `uid` con cada fallo porque el mensaje tiene que poder llevar a la
 * persona AL RECORRIDO que lo causa. Antes la validación vivía suelta dentro de
 * `irAlPago` y solo sabía decir "falta la fecha de 2 recorridos" en un aviso
 * pegado al botón de pagar —que en el carrito está en la columna derecha, a
 * dos mil píxeles del renglón culpable, y en un teléfono, hasta el fondo.
 */

export type CampoCarrito = "fecha" | "eleccion" | "grupo" | "choque";

export interface FalloCarrito {
  uid: string;
  campo: CampoCarrito;
  /** Para el renglón: corto, ya en contexto. */
  mensaje: string;
  /** Para el resumen de arriba: dice de qué recorrido habla. */
  mensajeLargo: string;
}

const corto = (nombre: string) => nombre.split("—")[0].trim();

/** El nombre corto de un renglón, en el idioma pedido. */
function nombreDe(i: CarritoItem, locale: Locale): string {
  const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
  return corto(tour ? localizeTour(tour, locale).nombre : i.tourName);
}

export function validarCarrito(items: CarritoItem[], locale: Locale = "es"): FalloCarrito[] {
  const fallos: FalloCarrito[] = [];
  const vistas = new Map<string, CarritoItem>();
  const t = getBooking(locale).validacion;

  for (const i of items) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    // El nombre guardado en el carrito SIEMPRE está en español: se escribe al
    // agregar el recorrido, desde `TOURS_DB`. Para el aviso se resuelve otra vez
    // por slug en el idioma que toca, o el mensaje en inglés acabaría diciendo
    // "Cascada de Tamul — Expedición completa is missing its date".
    const nombre = nombreDe(i, locale);

    if (!i.tourDate) {
      fallos.push({
        uid: i.uid, campo: "fecha",
        mensaje: t.faltaFecha,
        mensajeLargo: t.faltaFechaLargo(nombre),
      });
    } else {
      // Dos recorridos el mismo día es imposible de operar: cada uno se lleva
      // la jornada entera.
      const choca = vistas.get(i.tourDate);
      if (choca) {
        fallos.push({
          uid: i.uid, campo: "choque",
          mensaje: t.choque(nombreDe(choca, locale)),
          mensajeLargo: t.choqueLargo(nombre, nombreDe(choca, locale)),
        });
      } else {
        vistas.set(i.tourDate, i);
      }
    }

    if (tour?.eleccion && !i.eleccion) {
      fallos.push({
        uid: i.uid, campo: "eleccion",
        mensaje: t.faltaEleccion,
        mensajeLargo: t.faltaEleccionLargo(nombre),
      });
    }

    // Los tours por vehículo no cuentan personas.
    if (tour && !i.unidades && personasDeItem(i) < tour.groupMin) {
      fallos.push({
        uid: i.uid, campo: "grupo",
        mensaje: t.grupoMinimo(tour.groupMin),
        mensajeLargo: t.grupoMinimoLargo(nombre, tour.groupMin),
      });
    }
  }

  return fallos;
}
