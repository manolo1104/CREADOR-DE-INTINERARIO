"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images:   { src: string; alt: string }[];
  nombre:   string;
}

export function DestinoGallery({ images, nombre }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close  = useCallback(() => setLightbox(null), []);
  const prev   = useCallback(() => setLightbox(i => i !== null ? (i - 1 + images.length) % images.length : null), [images.length]);
  const next   = useCallback(() => setLightbox(i => i !== null ? (i + 1) % images.length : null), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightbox === null) return;
      if (e.key === "Escape")     close();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, close, prev, next]);

  useEffect(() => {
    if (lightbox !== null) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  if (images.length === 0) return null;

  return (
    <>
      {/* Gallery grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setLightbox(i)}
            className="relative overflow-hidden bg-verde-profundo/40 group cursor-zoom-in"
            style={{ minHeight: "200px", aspectRatio: "16/10" }}
            aria-label={`Ver foto ${i + 1} de ${nombre}`}
          >
            {/* Skeleton mientras carga */}
            <div className="absolute inset-0 bg-gradient-to-br from-verde-profundo/60 to-verde-selva/20 animate-pulse" />
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
              sizes="(max-width: 640px) 50vw, 33vw"
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 z-20 bg-negro/0 group-hover:bg-negro/20 transition-colors duration-300" />
            {/* Número de foto */}
            <span className="absolute bottom-2 right-2 z-30 bg-negro/60 text-crema/80 text-[9px] font-dm px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {i + 1}/{images.length}
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[999] bg-negro/95 backdrop-blur-sm flex items-center justify-center"
          onClick={close}
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-2 transition-colors"
            aria-label="Cerrar galería"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-crema/50 font-dm text-xs tracking-[2px] uppercase">
            {lightbox + 1} / {images.length}
          </span>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-3 transition-colors"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-verde-profundo/30 animate-pulse rounded" />
            <Image
              src={images[lightbox].src}
              alt={images[lightbox].alt}
              fill
              className="object-contain relative z-10"
              sizes="90vw"
              priority
            />
          </div>

          {/* Caption */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-crema/50 font-dm text-xs text-center max-w-md px-4">
            {images[lightbox].alt}
          </p>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-3 transition-colors"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}
