import { TOURS_DB } from "./tours";
import { personasDeItem, type CarritoItem } from "./carrito";

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

export function validarCarrito(items: CarritoItem[]): FalloCarrito[] {
  const fallos: FalloCarrito[] = [];
  const vistas = new Map<string, CarritoItem>();

  for (const i of items) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    const nombre = corto(i.tourName);

    if (!i.tourDate) {
      fallos.push({
        uid: i.uid, campo: "fecha",
        mensaje: "Elige la fecha de este recorrido",
        mensajeLargo: `Falta la fecha de ${nombre}`,
      });
    } else {
      // Dos recorridos el mismo día es imposible de operar: cada uno se lleva
      // la jornada entera.
      const choca = vistas.get(i.tourDate);
      if (choca) {
        fallos.push({
          uid: i.uid, campo: "choque",
          mensaje: `Ya tienes "${corto(choca.tourName)}" ese día. Cada recorrido ocupa el día completo.`,
          mensajeLargo: `${nombre} choca con ${corto(choca.tourName)}: los dos el mismo día`,
        });
      } else {
        vistas.set(i.tourDate, i);
      }
    }

    if (tour?.eleccion && !i.eleccion) {
      fallos.push({
        uid: i.uid, campo: "eleccion",
        mensaje: "Elige una para poder continuar",
        mensajeLargo: `Falta elegir el recorrido de ${nombre}`,
      });
    }

    // Los tours por vehículo no cuentan personas.
    if (tour && !i.unidades && personasDeItem(i) < tour.groupMin) {
      fallos.push({
        uid: i.uid, campo: "grupo",
        mensaje: `Sale a partir de ${tour.groupMin} personas`,
        mensajeLargo: `${nombre} sale a partir de ${tour.groupMin} personas`,
      });
    }
  }

  return fallos;
}
