"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Las fotos de una tarjeta de tour: UNA A LA VEZ, a tamaño completo.
 *
 * Sustituye al collage en diagonal (28 sep 2026). El collage partía la foto en
 * dos, tres o cuatro franjas y en la tarjeta cada franja medía entre 216 y 267
 * px: a ese tamaño no se reconoce ningún lugar, que es justo lo único que la
 * foto tenía que hacer. Encima las servía estiradas (217 px reales dentro de
 * cajas de 267) y dejaba la tarjeta sin protagonista.
 *
 * Así lo resuelven Airbnb, GetYourGuide, Viator y Klook: una foto grande y, si
 * hay más, se pasan. Ninguno usa collage.
 *
 * 🔴 El deslizar con el dedo NO lleva JavaScript: es `scroll-snap` del
 * navegador, que va fuera del hilo principal y funciona aunque el JS tarde. El
 * poco JS que hay es para encender el punto que toca y para las flechas, que
 * son un extra de escritorio.
 */

type Panel = { src: string; alt?: string; pos?: string };

export function TourCarrusel({
  panels,
  nombre,
  href,
  sizes = "(min-width: 1024px) 45vw, 100vw",
  cargaDiferida = false,
}: {
  panels: Panel[];
  nombre: string;
  /** Si viene, cada foto es un enlace al tour: al tocarla se entra, como espera todo el mundo. */
  href?: string;
  sizes?: string;
  /**
   * Ninguna foto con prisa, ni la primera. Para carruseles que viven lejos de
   * la primera pantalla (las tarjetas del inicio): una foto `eager` hace que
   * React la PRECARGUE en el <head>, y en el inicio esas tres le quitaban
   * ancho de banda al póster del hero, que es lo que Google mide (LCP).
   */
  cargaDiferida?: boolean;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);
  const varias = panels.length > 1;

  /**
   * Qué foto se está viendo.
   *
   * 🔴 Primero iba con un observador de intersección y NO funcionaba: la pista
   * sí se desplazaba (comprobado en el navegador, `scrollLeft` cambiaba de
   * 1068 a 534) pero el punto nunca se movía. Esto es una división entera
   * sobre el propio `scrollLeft`, así que no hay nada que pueda quedarse
   * callado.
   *
   * No es el `window.addEventListener("scroll")` que hay que evitar: escucha
   * SOLO a esta pista, que se mueve únicamente cuando alguien la desliza, y lo
   * que hace es una división. Además sale sin tocar el estado si el índice no
   * cambió, así que arrastrar dentro de una misma foto no re-renderiza nada.
   */
  const alDeslizar = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const caja = e.currentTarget;
    if (!caja.clientWidth) return;
    const i = Math.round(caja.scrollLeft / caja.clientWidth);
    setActiva((prev) => (prev === i ? prev : i));
  }, []);

  const ir = useCallback((dir: -1 | 1) => (e: React.MouseEvent) => {
    // La tarjeta entera es un enlace: sin esto, tocar una flecha entraba al tour.
    e.preventDefault();
    e.stopPropagation();
    const caja = pista.current;
    if (!caja) return;
    const quieto =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    caja.scrollBy({ left: dir * caja.clientWidth, behavior: quieto ? "auto" : "smooth" });
  }, []);

  return (
    <div className="absolute inset-0">
      <div
        ref={pista}
        onScroll={alDeslizar}
        /* `snap-mandatory` para que siempre quede una foto encuadrada y nunca
           media. `scrollbar-none` porque la barra horizontal dentro de una
           tarjeta se ve como un error. */
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scrollbar-none"
      >
        {panels.map((p, i) => {
          const foto = (
            <Image
              src={p.src}
              alt={p.alt ?? `${nombre} — ${i + 1}`}
              fill
              sizes={sizes}
              className="object-cover"
              style={p.pos ? { objectPosition: p.pos } : undefined}
              /* Solo la primera entra con prisa (salvo `cargaDiferida`). Las
                 demás están fuera de cuadro hasta que alguien desliza. */
              loading={i === 0 && !cargaDiferida ? "eager" : "lazy"}
            />
          );
          return (
            <div key={p.src + i} data-i={i} className="relative h-full w-full flex-none snap-center">
              {href ? (
                <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
                  {foto}
                </Link>
              ) : (
                foto
              )}
            </div>
          );
        })}
      </div>

      {varias && (
        <>
          {/* Flechas: solo con ratón. En táctil sobran —se desliza— y encima
              tapan foto. */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-between px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:flex">
            <button
              type="button"
              onClick={ir(-1)}
              aria-label="Foto anterior"
              className="pointer-events-auto z-20 flex h-8 w-8 items-center justify-center rounded-full bg-negro/60 text-crema/80 backdrop-blur-sm transition-colors duration-200 hover:bg-negro/85 hover:text-crema active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={ir(1)}
              aria-label="Foto siguiente"
              className="pointer-events-auto z-20 flex h-8 w-8 items-center justify-center rounded-full bg-negro/60 text-crema/80 backdrop-blur-sm transition-colors duration-200 hover:bg-negro/85 hover:text-crema active:scale-95"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Los puntos. Decorativos: el lector de pantalla ya tiene las fotos
              con su alt y no gana nada contando cuál se ve. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
          >
            {panels.map((p, i) => (
              <span
                key={p.src + i}
                className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                  i === activa ? "w-4 bg-crema" : "w-1.5 bg-crema/45"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
