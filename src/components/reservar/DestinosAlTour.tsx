"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DESTINOS_DB } from "@/lib/destinos";
import { toursQueIncluyen } from "@/lib/tourMapping";
import { useLocale } from "@/lib/i18n/useLocale";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * «¿Qué lugar quieres ver?» en /reservar: cada destino lleva DIRECTO a la
 * ficha del recorrido que lo visita, con la fecha y las personas ya elegidas.
 *
 * Pedido de Manolo (28 oct 2026) tras la lectura de Clarity: el buscador del
 * inicio manda a /reservar y ahí 8 de 8 personas regresaron sin agregar nada.
 * La gente llega pensando en un LUGAR (Tamul, Las Pozas, Micos), no en el
 * nombre de un recorrido; esta lista traduce el lugar al tour.
 *
 * Solo destinos que algún tour visita de verdad (`toursQueIncluyen`, nunca los
 * «cerca»), en el orden del catálogo de destinos. Un destino que visitan varios
 * recorridos lleva al primero de la lista (el principal).
 */
export function DestinosAlTour({ fecha, personas }: { fecha: string; personas: number }) {
  const { locale, en, lp } = useLocale();
  const filas = DESTINOS_DB
    .map((d) => ({ destino: d, tour: toursQueIncluyen(d.slug)[0] }))
    .filter((f): f is { destino: (typeof DESTINOS_DB)[number]; tour: NonNullable<typeof f.tour> } => !!f.tour);
  if (filas.length === 0) return null;

  const query = (fecha ? `?fecha=${fecha}` : "") + (personas ? `${fecha ? "&" : "?"}adultos=${personas}` : "");

  return (
    <section aria-labelledby="reservar-destinos" className="mb-6">
      <p id="reservar-destinos" className="mb-2.5 font-dm text-[10px] uppercase tracking-[2px] text-crema/45">
        {en ? "Which place do you want to see? Tap it and we take you to its tour" : "¿Qué lugar quieres ver? Tócalo y te llevamos a su recorrido"}
      </p>
      <ul className="flex flex-wrap gap-2">
        {filas.map(({ destino, tour }) => (
          <li key={destino.slug}>
            <Link
              href={lp(`/tours/${tour.slug}${query}`)}
              onClick={() => trackTourEvent("DESTINO_TOUR_CLICK", { destino: destino.slug, tourSlug: tour.slug, tour_name: tour.nombre, source: "lista_reservar", locale })}
              className="group inline-flex min-h-[40px] items-center gap-2 border border-white/15 px-3.5 py-1.5 font-dm text-[12px] text-crema/85 transition-colors duration-200 hover:border-dorado/60 hover:text-crema"
            >
              <span>{destino.nombre}</span>
              <span className="hidden text-[10px] uppercase tracking-[1px] text-crema/40 group-hover:text-dorado sm:inline">
                {tour.nombre}
              </span>
              <ArrowRight className="h-3 w-3 text-dorado/70" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
