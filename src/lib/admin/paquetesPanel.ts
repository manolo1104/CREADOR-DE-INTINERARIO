// Cargar un paquete ya armado dentro de una cotización.
//
// Los tres paquetes (Aventura, Completo, Gran Huasteca) tienen su itinerario
// día por día en el catálogo, con el slug del recorrido de cada día. Antes eso
// solo servía para pintar la página pública: para cotizar un Gran Huasteca
// había que elegir a mano los cuatro recorridos, sus cuatro fechas seguidas y
// las noches de hotel — cuatro minutos y cuatro oportunidades de equivocarse,
// varias veces al día.
//
// Aquí se traduce ese itinerario a las líneas del formulario. El precio NO se
// toca: cada recorrido se cotiza a su tarifa del catálogo y el descuento de
// paquete se aplica después, en el paso de condiciones, donde se ve.

import { PAQUETES_DB, type Paquete } from "@/lib/paquetes";
import { TOURS_DB } from "@/lib/tours";
import { addDaysYMD } from "@/lib/dates";
import type { LineItem, PackageItem } from "@/components/admin/ReservaModal";

export interface PaquetePanel {
  slug:     string;
  nombre:   string;
  /** "5 días / 4 noches" */
  duracion: string;
  noches:   number;
  /** Cuántos recorridos trae, para el botón. */
  recorridos: number;
}

/** Los paquetes que se pueden cargar de un clic, en el orden del catálogo. */
export const PAQUETES_PANEL: PaquetePanel[] = PAQUETES_DB.map(p => ({
  slug:       p.slug,
  nombre:     p.nombre.replace(/^Paquete\s+/i, ""),
  duracion:   p.duracion,
  noches:     p.noches,
  recorridos: p.itinerario.filter(d => d.tipo === "tour" && d.tourSlug).length,
}));

export interface CargaPaquete {
  lineas:     LineItem[];
  habitacion: PackageItem;
  /** Para avisar en pantalla cuando el paquete deja un día a elección. */
  eleccion?:  { dia: number; titulo: string; elegido: string; alternativa: string };
}

/**
 * Traduce un paquete a líneas de cotización.
 *
 * `fechaInicio` es el día 1. Cada recorrido cae en `fechaInicio + (día − 1)`,
 * que respeta los días de llegada y salida sin recorridos.
 *
 * Devuelve null si el slug no existe.
 */
export function cargarPaquete(
  slug: string,
  fechaInicio: string,
  adultos: number,
  hotelPorNoche: number,
  habitacionNombre: string,
  hotelNombre: string,
): CargaPaquete | null {
  const paquete: Paquete | undefined = PAQUETES_DB.find(p => p.slug === slug);
  if (!paquete) return null;

  const dias = paquete.itinerario.filter(d => d.tipo === "tour" && d.tourSlug);

  const lineas: LineItem[] = dias.map(d => {
    const tour = TOURS_DB.find(t => t.slug === d.tourSlug);
    return {
      tourSlug:      d.tourSlug!,
      tourName:      tour?.nombre ?? d.titulo,
      // Sin fecha de inicio se dejan vacías: es mejor un hueco visible que
      // cuatro fechas inventadas que se manden sin querer.
      tourDate:      fechaInicio ? addDaysYMD(fechaInicio, d.dia - 1) : "",
      adults:        Math.max(1, adultos),
      childrenMid:   0,
      childrenSmall: 0,
      subtotal:      0,
    };
  });

  const noches = Math.max(1, paquete.noches);
  const habitaciones = Math.max(1, Math.ceil(Math.max(1, adultos) / 2));
  const habitacion: PackageItem = {
    habitacion:     habitacionNombre,
    hotel:          hotelNombre,
    noches,
    habitaciones,
    precioPorNoche: hotelPorNoche,
    checkin:        fechaInicio,
    checkout:       fechaInicio ? addDaysYMD(fechaInicio, noches) : "",
    subtotal:       hotelPorNoche * noches * habitaciones,
  };

  // Un paquete puede dejar un día a elección del cliente (el Completo lo hace).
  // Se carga la primera opción —la que elige la mayoría— y se dice en pantalla
  // cuál es la otra, para no cotizar en silencio algo que el cliente no pidió.
  const e = paquete.eleccionTour;
  const eleccion = e
    ? {
        dia:         e.dia,
        titulo:      e.titulo,
        elegido:     e.opciones[0]?.nombre ?? "",
        alternativa: e.opciones[1]?.nombre ?? "",
      }
    : undefined;

  return { lineas, habitacion, eleccion };
}
