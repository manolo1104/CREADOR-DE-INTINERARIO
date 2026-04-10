"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/lib/tours";

interface Props {
  images: GalleryImage[];
  tourName: string;
}

export function TourGallery({ images, tourName }: Props) {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [lightboxOpen, setLightbox] = useState(false);
  const [lightboxIdx, setLbIdx]     = useState(0);

  const openLightbox = useCallback((i: number) => { setLbIdx(i); setLightbox(true); }, []);
  const closeLightbox = useCallback(() => setLightbox(false), []);
  const lbPrev = useCallback(() => setLbIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const lbNext = useCallback(() => setLbIdx((i) => (i + 1) % images.length), [images.length]);

  if (images.length === 0) return null;

  const active = images[activeIdx];

  return (
    <>
      {/* ── DESKTOP: imagen principal + columna de miniaturas ── */}
      <div className="hidden md:grid grid-cols-5 gap-2 h-[380px]">
        {/* Imagen principal */}
        <div
          className="col-span-3 relative overflow-hidden rounded-lg cursor-zoom-in group"
          onClick={() => openLightbox(activeIdx)}
        >
          <Image
            src={active.src}
            alt={active.alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="60vw"
            priority
          />
          {active.hasRealPeople && (
            <span className="absolute bottom-3 left-3 bg-negro/80 backdrop-blur-sm text-verde-vivo text-[9px] font-dm tracking-wide px-2.5 py-1 rounded-full border border-verde-vivo/30">
              {active.caption ?? "📸 Foto real del recorrido"}
            </span>
          )}
          {/* Expand icon */}
          <div className="absolute top-3 right-3 bg-negro/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-3.5 h-3.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </div>

        {/* Columna de miniaturas */}
        <div className="col-span-2 flex flex-col gap-2">
          {images.slice(0, 4).map((img, i) => (
            <div
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`relative flex-1 overflow-hidden rounded cursor-pointer transition-all duration-200 ${
                i === activeIdx
                  ? "ring-2 ring-verde-vivo ring-offset-1 ring-offset-negro"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="20vw"
              />
            </div>
          ))}
          {/* "+N más" tile */}
          {images.length > 4 && (
            <div
              onClick={() => openLightbox(4)}
              className="relative flex-1 overflow-hidden rounded cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            >
              <Image
                src={images[4].src}
                alt={images[4].alt}
                fill
                className="object-cover"
                sizes="20vw"
              />
              <div className="absolute inset-0 bg-negro/65 flex items-center justify-center">
                <span className="text-crema font-dm text-sm font-medium">
                  +{images.length - 4} más
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE: carrusel horizontal ── */}
      <div className="md:hidden">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1">
          {images.map((img, i) => (
            <div
              key={i}
              onClick={() => openLightbox(i)}
              className="flex-shrink-0 w-[85vw] snap-start relative aspect-[4/3] overflow-hidden rounded-lg cursor-zoom-in"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="85vw"
              />
              {img.hasRealPeople && (
                <span className="absolute bottom-3 left-3 bg-negro/80 text-verde-vivo text-[9px] font-dm px-2 py-1 rounded-full border border-verde-vivo/30">
                  📸 Foto real
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Indicadores */}
        <div className="flex justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Imagen ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === activeIdx ? "bg-verde-vivo" : "bg-crema/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Nota de autenticidad */}
      <p className="text-[10px] text-dorado/60 italic text-right mt-2 font-dm">
        Todas las fotos son de recorridos reales realizados por nuestro equipo.
      </p>

      {/* ── LIGHTBOX ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-negro/96 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Botón cerrar */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-crema/60 hover:text-crema transition-colors p-2"
            aria-label="Cerrar galería"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); lbPrev(); }}
            className="absolute left-4 text-crema/60 hover:text-crema transition-colors p-3"
            aria-label="Anterior"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Imagen */}
          <div
            className="relative w-full max-w-4xl aspect-[4/3] mx-14"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIdx].src}
              alt={images[lightboxIdx].alt}
              fill
              className="object-contain"
              sizes="90vw"
            />
            {images[lightboxIdx].hasRealPeople && (
              <span className="absolute bottom-4 left-4 bg-negro/80 text-verde-vivo text-[10px] font-dm px-3 py-1.5 rounded-full border border-verde-vivo/30">
                {images[lightboxIdx].caption ?? "📸 Foto real del recorrido"}
              </span>
            )}
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); lbNext(); }}
            className="absolute right-4 text-crema/60 hover:text-crema transition-colors p-3"
            aria-label="Siguiente"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Contador */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-crema/40 font-dm text-xs">
            {lightboxIdx + 1} / {images.length} — {tourName}
          </p>
        </div>
      )}
    </>
  );
}
