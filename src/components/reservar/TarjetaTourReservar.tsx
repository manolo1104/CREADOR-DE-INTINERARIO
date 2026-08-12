"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, Star, MapPin, X, Check } from "lucide-react";
import type { Tour } from "@/lib/tours";
import { incluyeDeTour, tourDurTexto } from "@/lib/tours";
import { formatMXN } from "@/lib/tourBooking";
import { BotonAgregarTour } from "@/components/carrito/BotonAgregarTour";
import { Tilt } from "@/components/ui/Tilt";

const DIFICULTAD: Record<string, string> = { baja: "Fácil", media: "Moderado", alta: "Avanzado" };

/**
 * Tarjeta del catálogo de /reservar con vista rápida.
 *
 * Antes, para saber qué se visitaba en un recorrido había que salir del motor
 * a la ficha del tour y volver: quien estaba comparando cinco tours perdía el
 * hilo y se iba. Ahora la tarjeta entera abre una vista rápida con los destinos
 * y lo esencial, sin sacar a nadie del catálogo.
 *
 * Los botones de acción llevan `stopPropagation` para que pulsar "Reservar" no
 * abra además la vista rápida.
 */
export function TarjetaTourReservar({
  tour, anticipo, esTop, delay,
}: {
  tour: Tour;
  anticipo: number;
  esTop: boolean;
  delay: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const disparador = useRef<HTMLElement | null>(null);
  const porVehiculo = tour.precioUnidad === "vehiculo";

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    }
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function abrir(e: React.MouseEvent) {
    disparador.current = e.currentTarget as HTMLElement;
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    disparador.current?.focus?.();
  }

  /** Los botones no deben abrir la vista rápida. */
  const noPropagar = (e: React.MouseEvent) => e.stopPropagation();

  const incluyeTodo = incluyeDeTour(tour);

  return (
    <>
      <Tilt
        glow
        animationDelay={`${delay}ms`}
        onClick={abrir}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAbierto(true); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`Vista rápida de ${tour.nombre}`}
        className="stagger-reveal group relative flex flex-col h-full border border-white/10 bg-negro/40 hover:border-verde-vivo/45 overflow-hidden cursor-pointer focus:outline-none focus:border-verde-vivo"
      >
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          <Image
            src={tour.imagen_hero}
            alt={tour.nombre}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/15 to-negro/25" />

          {esTop && (
            <span className="absolute top-3 left-3 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1px] uppercase px-2.5 py-1">
              El más reservado
            </span>
          )}
          <span className="absolute bottom-3 left-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
            ⏱ {tourDurTexto(tour, " h")}
          </span>
          <span className="absolute bottom-3 right-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
            máx. {tour.groupMax}
          </span>
          {/* Pista visible de que la tarjeta hace algo al pulsarla. */}
          <span className="absolute top-3 right-3 bg-negro/70 text-crema/80 text-[9px] font-dm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Vista rápida
          </span>
        </div>

        <div className="flex flex-col flex-1 p-5">
          <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1.5">{tour.tipo}</p>
          <h3 className="font-cormorant text-crema text-xl leading-tight mb-2">
            {tour.nombre.split("—")[0].trim()}
          </h3>

          {tour.urgencia && (
            <p className="text-[11px] font-dm text-dorado/85 leading-snug mb-3">▸ {tour.urgencia}</p>
          )}

          {tour.reviewCount > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] font-dm text-dorado/90 mb-3">
              <Star className="w-3 h-3 fill-dorado text-dorado" aria-hidden="true" />
              <strong className="text-crema/85">4.9</strong>
              <span className="text-crema/45">· {tour.reviewCount} reseñas</span>
            </p>
          )}

          <div className="mt-auto pt-4 border-t border-white/8">
            <p className="flex items-baseline gap-2 mb-0.5">
              <span className="font-cormorant text-dorado text-3xl font-light leading-none">
                {formatMXN(tour.precio)}
              </span>
              <span className="text-[10px] text-crema/40 font-dm">
                MXN {porVehiculo ? "por vehículo" : "por persona"}
              </span>
            </p>
            <p className="text-[11px] font-dm text-crema/55 mb-4">
              Apartas con <strong className="text-crema/85">{formatMXN(anticipo)}</strong>
            </p>

            <div className="flex gap-2" onClick={noPropagar}>
              <Link
                href={`/reservar/carrito?agregar=${tour.slug}`}
                className="flex-1 text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors"
              >
                Reservar
              </Link>
              <BotonAgregarTour
                tourId={tour.id}
                tourSlug={tour.slug}
                tourName={tour.nombre}
                tourImage={tour.imagen_hero}
                precio={tour.precio}
                porVehiculo={porVehiculo}
              />
            </div>
          </div>
        </div>
      </Tilt>

      {/* ── VISTA RÁPIDA ── */}
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Información de ${tour.nombre}`}
          onClick={cerrar}
          className="fixed inset-0 z-[150] bg-negro/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-negro border border-white/12"
          >
            <button
              onClick={cerrar}
              autoFocus
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 bg-negro/70 text-crema/70 hover:text-crema p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-48 sm:h-56">
              <Image src={tour.imagen_hero} alt={tour.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, 672px" />
              <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-14">
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">{tour.tipo}</p>
                <h2 className="font-cormorant text-crema text-2xl leading-tight">{tour.nombre.split("—")[0].trim()}</h2>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <p className="font-dm text-[13px] text-crema/70 leading-relaxed">{tour.descripcion}</p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-dm text-crema/55">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-verde-vivo" aria-hidden="true" />{tourDurTexto(tour, " horas")}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-verde-vivo" aria-hidden="true" />
                  {tour.groupMin > 1 ? `${tour.groupMin}–${tour.groupMax} personas` : `Máx. ${tour.groupMax}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-verde-vivo" aria-hidden="true" />
                  {DIFICULTAD[tour.dificultad] ?? tour.dificultad}
                </span>
              </div>

              {tour.destinos?.length > 0 && (
                <div>
                  <p className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm mb-2.5">Qué se visita</p>
                  <ul className="space-y-1.5">
                    {tour.destinos.map((d) => (
                      <li key={d} className="flex items-start gap-2 font-dm text-[13px] text-crema/75">
                        <MapPin className="w-3.5 h-3.5 text-dorado flex-shrink-0 mt-0.5" aria-hidden="true" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm mb-2.5">Incluye</p>
                <div className="grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
                  {incluyeTodo.map((x) => (
                    <p key={x} className="flex items-start gap-2 font-dm text-[12px] text-crema/60 leading-snug">
                      <Check className="w-3.5 h-3.5 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {x}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-baseline gap-2 border-t border-white/10 pt-4">
                <span className="font-cormorant text-dorado text-3xl font-light leading-none">{formatMXN(tour.precio)}</span>
                <span className="text-[11px] text-crema/45 font-dm">
                  MXN {porVehiculo ? "por vehículo" : "por persona"} · apartas con {formatMXN(anticipo)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/reservar/carrito?agregar=${tour.slug}`}
                  className="flex-1 text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3.5 transition-colors"
                >
                  Reservar este recorrido
                </Link>
                <Link
                  href={`/tours/${tour.slug}`}
                  className="text-center px-5 py-3.5 border border-white/15 hover:border-crema/40 text-crema/60 hover:text-crema text-[10px] tracking-[2px] uppercase font-dm transition-colors"
                >
                  Ver ficha completa
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
