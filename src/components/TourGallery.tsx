"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/lib/tours";

interface Props {
  images: GalleryImage[];
  tourName: string;
}

/**
 * 🔴 Aquí vivía `MOVIL_VISIBLES = 5`: en el teléfono solo se pintaban cinco de
 * las dieciocho fotos de la Ruta Acuática, porque varias caían cerca del
 * viewport a la vez y el navegador se traía megas antes de que nadie deslizara.
 * Ya no hace falta: con una sola foto por pantalla y TODAS en `loading="lazy"`,
 * el navegador solo pide las que están cerca del carril. Se muestran las
 * dieciocho.
 */

export function TourGallery({ images, tourName }: Props) {
  const [lightboxOpen, setLightbox] = useState(false);
  const [lightboxIdx, setLbIdx]     = useState(0);
  /** Qué foto se está viendo, calculada desde el scroll real del carril. */
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

  /** Las flechas de escritorio: una «pantalla» de carril por clic. */
  const mover = useCallback((dir: 1 | -1) => {
    const caja = carrusel.current;
    if (!caja) return;
    caja.scrollBy({ left: dir * caja.clientWidth, behavior: "smooth" });
  }, []);

  if (images.length === 0) return null;

  return (
    <>
      {/* ── CARRUSEL: una foto grande a la vez, en TODOS los tamaños ──
          🔴 Antes eran dos maquetaciones distintas: en escritorio una rejilla
          con la foto principal y cuatro miniaturas, y en el teléfono un
          carrusel de cinco fotos con una casilla de «ver las otras N». Dos
          comportamientos que mantener y, en escritorio, cinco fotos pedidas de
          golpe para enseñar una.

          Ahora es un solo carrusel. El deslizar es `scroll-snap` del navegador
          —va fuera del hilo principal y funciona aunque el JS tarde—; el JS solo
          enciende el contador y mueve las flechas, que son un extra de ratón.

          🔴 `scroll-pl-1` además del `px-1`: con `snap-mandatory` el navegador
          ancla al borde del CARRIL, no al del relleno, y sin esto la pista se
          desplaza sola al cargar y la primera foto sale cortada. */}
      <div className="relative">
        <div
          ref={carrusel}
          onScroll={(e) => {
            const el = e.currentTarget;
            const ancho = el.scrollWidth / Math.max(1, images.length);
            setMovilIdx(Math.min(images.length - 1, Math.round(el.scrollLeft / ancho)));
          }}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth scrollbar-none -mx-1 px-1 scroll-pl-1 pb-1"
        >
          {images.map((img, i) => (
            <button
              type="button"
              key={img.src + i}
              onClick={() => openLightbox(i)}
              aria-label={`Ampliar: ${img.alt}`}
              className="group relative aspect-[4/3] w-[85vw] flex-shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-lg md:aspect-[3/2] md:w-[620px]"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 767px) 85vw, 620px"
                /* TODAS en diferido, también la primera. Una foto `eager` la
                   PRECARGA React en el <head>, y esta galería vive muy por
                   debajo del póster del hero, que es el LCP de la ficha. El
                   navegador solo se trae las que están cerca del carril. */
                loading="lazy"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-negro/60 p-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <svg className="h-3.5 w-3.5 text-crema" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </span>
            </button>
          ))}
        </div>

        {/* Flechas: solo con ratón. En el teléfono se desliza con el dedo y dos
            discos encima de la foto solo tapan. */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Fotos anteriores"
              className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-negro/60 text-crema/85 backdrop-blur-md transition-colors hover:bg-negro/85 hover:text-crema md:grid"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Fotos siguientes"
              className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-negro/60 text-crema/85 backdrop-blur-md transition-colors hover:bg-negro/85 hover:text-crema md:grid"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-center font-dm text-[11px] text-crema/40 tabular-nums">
        {movilIdx + 1} / {images.length}
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
