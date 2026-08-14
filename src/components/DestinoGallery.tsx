"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDict } from "@/lib/i18n/messages";

interface Props {
  images:   { src: string; alt: string }[];
  nombre:   string;
}

export function DestinoGallery({ images, nombre }: Props) {
  const dg = getDict(useLocale().locale).destino;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

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

  // Deslizar (swipe) en móvil dentro del lightbox.
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) (dx < 0 ? next() : prev());
    touchX.current = null;
  };

  return (
    <>
      {/* Bento editorial: la primera foto grande, el resto en cuadrícula.
          `grid-auto-rows` fijo da la altura que necesita <Image fill>; en móvil
          es proporcional al ancho (vw), en desktop una altura fija. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 [grid-auto-rows:34vw] md:[grid-auto-rows:190px]">
        {images.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setLightbox(i)}
            className={`reveal-up group relative overflow-hidden bg-verde-profundo/40 cursor-zoom-in ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            aria-label={dg.ampliarFoto(i + 1, nombre)}
          >
            {/* Skeleton mientras carga */}
            <div className="absolute inset-0 bg-gradient-to-br from-verde-profundo/60 to-verde-selva/20 animate-pulse" />
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] relative z-10"
              sizes={i === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
              loading={i < 3 ? "eager" : "lazy"}
            />
            {/* Velo inferior sutil, más notorio en hover */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-negro/35 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Cue de ampliar en hover (solo la primera, para no saturar) */}
            {i === 0 && (
              <span className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-negro/55 backdrop-blur-sm text-crema/90 text-[10px] tracking-[1.5px] uppercase font-dm px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Expand className="w-3 h-3" strokeWidth={1.8} /> {dg.verGaleria}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[999] bg-negro/95 backdrop-blur-sm flex items-center justify-center"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-2 transition-colors"
            aria-label={dg.cerrarGaleria}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-crema/50 font-dm text-xs tracking-[2px] uppercase">
            {lightbox + 1} / {images.length}
          </span>

          {/* Prev — oculto en móvil (se usa swipe) */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-3 transition-colors"
            aria-label={dg.fotoAnterior}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-[92vw] max-h-[82vh] w-full"
            style={{ aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-verde-profundo/30 animate-pulse" />
            <Image
              src={images[lightbox].src}
              alt={images[lightbox].alt}
              fill
              className="object-contain relative z-10"
              sizes="92vw"
              priority
            />
          </div>

          {/* Caption */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-crema/50 font-dm text-xs text-center max-w-md px-4">
            {images[lightbox].alt}
          </p>

          {/* Next — oculto en móvil (se usa swipe) */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 z-10 text-crema/70 hover:text-crema bg-negro/50 rounded-full p-3 transition-colors"
            aria-label={dg.fotoSiguiente}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}
