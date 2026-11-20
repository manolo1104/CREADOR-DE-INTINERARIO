"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { bloquearScroll } from "@/lib/scrollLock";
import { trackTourEvent } from "@/lib/tourTracker";
import type { FotoFicha } from "@/lib/fichaPaquete";
import type { Locale } from "@/lib/i18n/config";
import { textosFicha } from "@/lib/i18n/fichaPaqueteTextos";

/**
 * Galería del hero de la ficha (20 nov 2026).
 *  · Escritorio: una foto grande + cuatro, y «Ver las N fotos».
 *  · Celular: carrusel con imán (scroll-snap) y contador; tocar abre el visor.
 *  · Visor: diálogo modal con teclado (← → Esc), deslizar, foco que vuelve al
 *    botón que lo abrió y la animación `visor-*` que ya usa la ficha de tour.
 * Solo la primera foto lleva `priority` (es el LCP); las demás cargan diferido.
 */
export function PackageGallery({
  fotos, nombre, slug, locale,
}: {
  fotos: FotoFicha[];
  nombre: string;
  slug: string;
  locale: Locale;
}) {
  // Los textos se leen aquí: a un componente cliente no se le pueden pasar funciones.
  const tf = textosFicha(locale);
  const textos = { verFotos: tf.verFotos, cerrar: tf.galeriaCerrar, anterior: tf.galeriaAnterior, siguiente: tf.galeriaSiguiente, de: tf.galeriaDe };
  const [abierta, setAbierta] = useState(false);
  const [i, setI] = useState(0);
  const [movil, setMovil] = useState(0);
  const origen = useRef<HTMLElement | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const tocar = useRef<number | null>(null);
  const n = fotos.length;

  const abrir = (k: number, desde: HTMLElement | null) => {
    origen.current = desde;
    setI(k);
    setAbierta(true);
    trackTourEvent("GALLERY_OPEN", { slug, foto: k + 1 });
  };
  const cerrar = useCallback(() => {
    setAbierta(false);
    origen.current?.focus();
  }, []);
  const mover = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (!abierta) return;
    const soltar = bloquearScroll();
    cerrarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => { soltar(); window.removeEventListener("keydown", tecla); };
  }, [abierta, cerrar, mover]);

  if (!n) return null;
  const principal = fotos[0];
  const resto = fotos.slice(1, 5);

  return (
    <>
      {/* ── Escritorio: mosaico 1 + 4 ── */}
      <div className="hidden h-[min(64vh,600px)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid">
        <button type="button" onClick={(e) => abrir(0, e.currentTarget)} className="group relative col-span-2 row-span-2 overflow-hidden">
          <Image src={principal.src} alt={principal.alt} fill priority sizes="(max-width: 1280px) 50vw, 640px" className="zoom-foto object-cover" />
        </button>
        {resto.map((f, k) => (
          <button key={f.src} type="button" onClick={(e) => abrir(k + 1, e.currentTarget)} className="group relative overflow-hidden">
            <Image src={f.src} alt={f.alt} fill sizes="320px" className="zoom-foto object-cover" />
            {k === resto.length - 1 && n > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-negro/45 font-dm text-sm text-crema">
                <span className="inline-flex items-center gap-2 rounded-xl border border-crema/40 bg-negro/50 px-4 py-2 backdrop-blur-sm">
                  <Images className="h-4 w-4" aria-hidden="true" /> {textos.verFotos(n)}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Celular: carrusel deslizable ── */}
      <div className="relative md:hidden">
        <div
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
          onScroll={(e) => {
            const el = e.currentTarget;
            setMovil(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {fotos.map((f, k) => (
            <button
              key={f.src}
              type="button"
              onClick={(e) => abrir(k, e.currentTarget)}
              className="relative aspect-[4/3] w-full flex-shrink-0 snap-center"
              aria-label={`${f.alt} (${textos.de(k + 1, n)})`}
            >
              <Image src={f.src} alt={f.alt} fill priority={k === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-negro/65 px-2.5 py-1 font-dm text-[12px] text-crema backdrop-blur-sm">
          {textos.de(movil + 1, n)}
        </span>
      </div>

      {/* ── Visor ── */}
      {abierta && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={nombre}
          className="animate-visor-fondo fixed inset-0 z-[100] flex flex-col bg-negro/95"
          onTouchStart={(e) => { tocar.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (tocar.current === null) return;
            const dx = e.changedTouches[0].clientX - tocar.current;
            if (Math.abs(dx) > 45) mover(dx < 0 ? 1 : -1);
            tocar.current = null;
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 font-dm text-sm text-crema/80">
            <span aria-live="polite">{textos.de(i + 1, n)}</span>
            <button ref={cerrarRef} type="button" onClick={cerrar} aria-label={textos.cerrar} className="tactil flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 hover:bg-white/10">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="animate-visor-marco relative mx-auto w-full max-w-6xl flex-1">
            <Image key={fotos[i].src} src={fotos[i].src} alt={fotos[i].alt} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="px-4 py-3 text-center font-dm text-[13px] text-crema/70">{fotos[i].alt}</p>
          <button type="button" onClick={() => mover(-1)} aria-label={textos.anterior} className="tactil absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-negro/50 text-crema hover:bg-white/10 sm:flex">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => mover(1)} aria-label={textos.siguiente} className="tactil absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-negro/50 text-crema hover:bg-white/10 sm:flex">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
