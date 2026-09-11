"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/lib/tours";
import { Camera } from "lucide-react";

interface Props {
  images: GalleryImage[];
  tourName: string;
}

/**
 * En móvil no se pintan todas las fotos. Antes se renderizaban las 18 de la
 * Ruta Acuática a 85vw en un carrusel horizontal: varias caían dentro o cerca
 * del viewport a la vez, así que el navegador se traía megas de imagen antes de
 * que nadie hubiera deslizado. Se muestran unas cuantas y el resto vive en el
 * lightbox, que es donde de verdad se ven.
 */
const MOVIL_VISIBLES = 5;

export function TourGallery({ images, tourName }: Props) {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [lightboxOpen, setLightbox] = useState(false);
  const [lightboxIdx, setLbIdx]     = useState(0);
  const [movilIdx, setMovilIdx]     = useState(0);

  // A dónde devolver el foco al cerrar el lightbox. Sin esto, quien navega con
  // teclado cierra la galería y aparece al principio de la página.
  const disparador = useRef<HTMLElement | null>(null);
  const carrusel   = useRef<HTMLDivElement | null>(null);

  const openLightbox = useCallback((i: number) => {
    disparador.current = document.activeElement as HTMLElement;
    setLbIdx(i);
    setLightbox(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(false);
    disparador.current?.focus?.();
  }, []);

  const lbPrev = useCallback(() => setLbIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const lbNext = useCallback(() => setLbIdx((i) => (i + 1) % images.length), [images.length]);

  // Teclado: Esc cierra, flechas navegan. La galería de destinos ya lo tenía;
  // esta no, y era la queja principal.
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     { e.preventDefault(); closeLightbox(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); lbPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); lbNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox, lbPrev, lbNext]);

  // Bloquear el scroll del fondo mientras el lightbox está abierto.
  useEffect(() => {
    if (!lightboxOpen) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previo; };
  }, [lightboxOpen]);

  // Swipe en móvil dentro del lightbox.
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(delta) > 45) (delta > 0 ? lbPrev() : lbNext());
    touchX.current = null;
  }

  if (images.length === 0) return null;

  const active   = images[activeIdx];
  const enMovil  = images.slice(0, MOVIL_VISIBLES);
  const ocultas  = images.length - enMovil.length;

  return (
    <>
      {/* ── ESCRITORIO: imagen principal + columna de miniaturas ── */}
      <div className="hidden md:grid grid-cols-5 gap-2 h-[380px]">
        <button
          type="button"
          className="col-span-3 relative overflow-hidden rounded-lg cursor-zoom-in group text-left"
          onClick={() => openLightbox(activeIdx)}
          aria-label={`Ampliar: ${active.alt}`}
        >
          <Image
            src={active.src}
            alt={active.alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            // Ocupa 3 de 5 columnas de un contenedor que no pasa de ~1100 px.
            // Antes decía 60vw fijo, que en pantallas grandes pedía una imagen
            // mucho mayor que la que se ve.
            sizes="(max-width: 768px) 0px, (max-width: 1280px) 55vw, 620px"
          />
          {active.hasRealPeople && (
            <span className="absolute bottom-3 left-3 bg-negro/80 backdrop-blur-sm text-verde-vivo text-[9px] font-dm tracking-wide px-2.5 py-1 rounded-full border border-verde-vivo/30 flex items-center gap-1.5">
              <Camera className="w-3 h-3" aria-hidden="true" />
              {active.caption ?? "Foto real del recorrido"}
            </span>
          )}
          <span className="absolute top-3 right-3 bg-negro/60 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-3.5 h-3.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </span>
        </button>

        <div className="col-span-2 flex flex-col gap-2">
          {images.slice(0, 4).map((img, i) => (
            <button
              type="button"
              key={img.src + i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Ver: ${img.alt}`}
              aria-pressed={i === activeIdx}
              className={`relative flex-1 overflow-hidden rounded transition-all duration-200 ${
                i === activeIdx
                  ? "ring-2 ring-verde-vivo ring-offset-1 ring-offset-negro"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="(max-width: 1280px) 22vw, 250px" />
            </button>
          ))}
          {images.length > 4 && (
            <button
              type="button"
              onClick={() => openLightbox(4)}
              aria-label={`Ver las otras ${images.length - 4} fotos`}
              className="relative flex-1 overflow-hidden rounded opacity-70 hover:opacity-100 transition-opacity"
            >
              <Image src={images[4].src} alt={images[4].alt} fill className="object-cover" sizes="(max-width: 1280px) 22vw, 250px" />
              <span className="absolute inset-0 bg-negro/65 flex items-center justify-center">
                <span className="text-crema font-dm text-sm font-medium">+{images.length - 4} más</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── MÓVIL: carrusel con contador real ── */}
      <div className="md:hidden">
        <div
          ref={carrusel}
          // El contador se calcula desde el scroll de verdad. Antes los puntos
          // llamaban al estado del ESCRITORIO: no se movían al deslizar y al
          // pulsarlos no pasaba nada.
          onScroll={(e) => {
            const el = e.currentTarget;
            const ancho = el.scrollWidth / Math.max(1, enMovil.length);
            setMovilIdx(Math.min(enMovil.length - 1, Math.round(el.scrollLeft / ancho)));
          }}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1"
        >
          {enMovil.map((img, i) => (
            <button
              type="button"
              key={img.src + i}
              onClick={() => openLightbox(i)}
              aria-label={`Ampliar: ${img.alt}`}
              className="flex-shrink-0 w-[85vw] snap-start relative aspect-[4/3] overflow-hidden rounded-lg cursor-zoom-in"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="85vw"
                loading={i === 0 ? "eager" : "lazy"}
              />
              {img.hasRealPeople && (
                <span className="absolute bottom-3 left-3 bg-negro/80 text-verde-vivo text-[9px] font-dm px-2 py-1 rounded-full border border-verde-vivo/30 flex items-center gap-1">
                  <Camera className="w-3 h-3" aria-hidden="true" /> Foto real
                </span>
              )}
            </button>
          ))}

          {ocultas > 0 && (
            <button
              type="button"
              onClick={() => openLightbox(MOVIL_VISIBLES)}
              className="flex-shrink-0 w-[45vw] snap-start relative aspect-[4/3] overflow-hidden rounded-lg border border-crema/15 bg-negro/50 flex items-center justify-center"
            >
              <span className="text-crema/80 font-dm text-sm text-center px-3">
                Ver las otras
                <span className="block font-cormorant text-2xl text-dorado">{ocultas} fotos</span>
              </span>
            </button>
          )}
        </div>

        <p className="text-center mt-3 font-dm text-[11px] text-crema/40">
          {movilIdx + 1} / {images.length}
        </p>
      </div>

      <p className="text-[10px] text-dorado/60 italic text-right mt-2 font-dm">
        Todas las fotos son de recorridos reales realizados por nuestro equipo.
      </p>

      {/* ── VISOR ──
          Tres cosas cambiaron: el fondo ya no es negro casi sólido sino
          translúcido y desenfocado (se intuye la página detrás), la foto va
          dentro de un marco de cristal en vez de flotar suelta, y las flechas
          se ven TAMBIÉN en móvil — antes eran `hidden sm:block` y en el
          teléfono no había forma de pasar de foto salvo adivinando que se
          podía deslizar. */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${tourName}`}
          className="fixed inset-0 z-[200] bg-negro/70 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-visor-fondo motion-reduce:animate-none"
          onClick={closeLightbox}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="relative w-full max-w-5xl animate-visor-marco motion-reduce:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Marco de cristal */}
            <div
              className="relative rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md p-2 sm:p-3"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 24px 70px rgba(0,0,0,.6)" }}
            >
              <div className="relative aspect-[4/3] sm:aspect-auto sm:h-[62vh] max-h-[52vh] sm:max-h-none rounded-xl overflow-hidden bg-negro/70">
                <Image
                  src={images[lightboxIdx].src}
                  alt={images[lightboxIdx].alt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 96vw, 1000px"
                />
                {images[lightboxIdx].hasRealPeople && (
                  <span className="absolute bottom-3 left-3 bg-negro/75 backdrop-blur-sm text-verde-vivo text-[10px] font-dm px-3 py-1.5 rounded-full border border-verde-vivo/30 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    {images[lightboxIdx].caption ?? "Foto real del recorrido"}
                  </span>
                )}
              </div>

              {/* Pie del marco: dónde estoy y a dónde puedo saltar */}
              <div className="flex items-center gap-3 px-1.5 pt-2.5 pb-0.5">
                <p className="font-dm text-[11px] text-crema/55 tabular-nums flex-shrink-0">
                  <span className="text-crema/85">{lightboxIdx + 1}</span> / {images.length}
                </p>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none ml-auto">
                  {images.map((img, i) => (
                    <button
                      key={img.src + i}
                      type="button"
                      onClick={() => setLbIdx(i)}
                      aria-label={`Ir a la foto ${i + 1}`}
                      aria-current={i === lightboxIdx}
                      className={`relative w-11 h-8 rounded overflow-hidden flex-shrink-0 transition-[opacity,box-shadow] duration-200 ease-out active:scale-[0.96] ${
                        i === lightboxIdx
                          ? "opacity-100 shadow-[0_0_0_2px_rgba(143,190,58,.9)]"
                          : "opacity-45 hover:opacity-85"
                      }`}
                    >
                      <Image src={img.src} alt="" fill className="object-cover" sizes="44px" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Flechas: discos de cristal, dentro del marco en móvil y
                asomando fuera en escritorio. Se ven en los dos tamaños. */}
            <button
              onClick={lbPrev}
              aria-label="Foto anterior"
              className="absolute left-1 sm:-left-5 top-1/3 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-negro/55 backdrop-blur-md text-crema/85 hover:text-crema hover:bg-negro/75 active:scale-[0.94] transition-[transform,background-color,color] duration-200 ease-out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={lbNext}
              aria-label="Foto siguiente"
              className="absolute right-1 sm:-right-5 top-1/3 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full border border-white/20 bg-negro/55 backdrop-blur-md text-crema/85 hover:text-crema hover:bg-negro/75 active:scale-[0.94] transition-[transform,background-color,color] duration-200 ease-out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={closeLightbox}
              aria-label="Cerrar galería"
              autoFocus
              className="absolute -top-3 -right-2 sm:-top-4 sm:-right-4 grid place-items-center w-10 h-10 rounded-full border border-white/20 bg-negro/70 backdrop-blur-md text-crema/80 hover:text-crema hover:bg-negro/90 active:scale-[0.94] transition-[transform,background-color,color] duration-200 ease-out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="mt-3 text-center font-dm text-[11px] text-crema/45 px-4">
              {tourName}
            </p>
          </div>

          {/* Vecinas precargadas: sin esto, cada flecha dejaba la pantalla en
              blanco mientras el servidor optimizaba la siguiente imagen. */}
          <div className="hidden" aria-hidden="true">
            {[(lightboxIdx + 1) % images.length, (lightboxIdx - 1 + images.length) % images.length].map((i) => (
              <Image key={i} src={images[i].src} alt="" width={1} height={1} sizes="1000px" />
            ))}
          </div>
        </div>
      )}

    </>
  );
}
