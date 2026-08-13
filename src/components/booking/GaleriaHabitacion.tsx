"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { bloquearScroll } from "@/lib/scrollLock";
import type { Habitacion } from "@/lib/habitaciones";

/**
 * Fotos del hotel que se enseñan junto a la habitación.
 *
 * Van etiquetadas como ÁREAS COMUNES a propósito: son de la alberca, la terraza
 * y el jardín, no del cuarto. Meterlas sin decirlo dejaría al cliente creyendo
 * que la alberca está dentro de su habitación.
 */
const AREAS_HOTEL = [
  { src: "/imagenes/hotel-paraiso-encantado/hero.jpg",      alt: "Hotel Paraíso Encantado" },
  { src: "/imagenes/hotel-paraiso-encantado/terraza.jpg",   alt: "Terraza del hotel" },
  { src: "/imagenes/hotel-paraiso-encantado/gallery-1.jpg", alt: "Áreas del hotel" },
  { src: "/imagenes/hotel-paraiso-encantado/gallery-2.jpg", alt: "Áreas del hotel" },
  { src: "/imagenes/hotel-paraiso-encantado/gallery-3.jpg", alt: "Áreas del hotel" },
  { src: "/imagenes/hotel-paraiso-encantado/gallery-4.jpg", alt: "Áreas del hotel" },
  { src: "/imagenes/hotel-paraiso-encantado/gallery-5.jpg", alt: "Áreas del hotel" },
];

interface Foto { src: string; alt: string; etiqueta: string }

/**
 * Visor a pantalla completa de las fotos de una habitación y del hotel.
 *
 * Se abre desde la tarjeta del cuarto: antes la única foto era una miniatura de
 * 4:3 y el cliente apartaba tres noches sin haber visto bien dónde va a dormir.
 */
export function GaleriaHabitacion({
  habitacion, abierta, onCerrar,
}: {
  habitacion: Habitacion | null;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const [i, setI] = useState(0);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);
  useEffect(() => { if (abierta) setI(0); }, [abierta, habitacion?.id]);
  useEffect(() => (abierta ? bloquearScroll() : undefined), [abierta]);

  const fotos: Foto[] = habitacion
    ? [
        { src: habitacion.imagen, alt: habitacion.nombre, etiqueta: habitacion.nombre },
        ...AREAS_HOTEL.map((f) => ({ ...f, etiqueta: "Áreas del hotel" })),
      ]
    : [];

  const ir = (d: number) => setI((n) => (n + d + fotos.length) % fotos.length);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onCerrar();
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft")  ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, fotos.length]);

  if (!abierta || !habitacion || !montado) return null;

  const actual = fotos[i];

  // Portal a `body`: es `fixed inset-0` y cualquier ancestro con `transform`
  // lo dejaría anclado al contenedor en vez de a la ventana.
  return createPortal(
    // Fondo SÓLIDO. Con transparencia se veía el carrito por detrás y el texto
    // de la página competía con la foto de la habitación.
    <div className="fixed inset-0 z-[120] bg-negro flex flex-col" aria-modal="true" role="dialog">
      <div className="flex items-start justify-between gap-4 p-4 text-crema">
        <div className="min-w-0">
          <p className="font-cormorant text-xl leading-tight truncate">{habitacion.nombre}</p>
          <p className="font-dm text-[11px] text-crema/50 mt-0.5">
            {actual.etiqueta} · {i + 1} de {fotos.length}
          </p>
        </div>
        <button
          type="button" onClick={onCerrar} aria-label="Cerrar galería"
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-crema/70 hover:text-crema transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <Image
          key={actual.src}
          src={actual.src}
          alt={actual.alt}
          fill
          className="object-contain animate-fade-in"
          sizes="100vw"
          priority
        />
        {fotos.length > 1 && (
          <>
            <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-negro/50 text-crema hover:bg-negro/70 transition-colors rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-negro/50 text-crema hover:bg-negro/70 transition-colors rounded-full">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Datos del cuarto, siempre visibles: es lo que decide, no la foto. */}
      <div className="p-4 border-t border-crema/10">
        <p className="font-dm text-[12px] text-crema/70 leading-relaxed">
          Hasta {habitacion.maxHuespedes} persona{habitacion.maxHuespedes !== 1 ? "s" : ""} · {habitacion.vista}
        </p>
        <p className="font-dm text-[11px] text-crema/45 leading-relaxed mt-1">
          {habitacion.caracteristicas.join(" · ")}
        </p>
        <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1">
          {fotos.map((f, k) => (
            <button
              key={f.src} type="button" onClick={() => setI(k)}
              aria-label={`Ver foto ${k + 1}`}
              className={`relative w-14 h-11 flex-shrink-0 overflow-hidden border-2 transition-colors ${
                k === i ? "border-dorado" : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              <Image src={f.src} alt="" fill className="object-cover" sizes="56px" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** El icono de "ver más grande" que va sobre la miniatura de cada cuarto. */
export function MarcaAmpliar() {
  return (
    <span className="absolute bottom-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-negro/55 text-crema rounded-sm">
      <Expand className="w-3 h-3" aria-hidden="true" />
    </span>
  );
}
