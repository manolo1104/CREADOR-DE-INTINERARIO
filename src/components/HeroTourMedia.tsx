"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * El fondo del hero de una ficha de tour: la foto de siempre, y encima un
 * vídeo vertical SOLO en teléfonos.
 *
 * Por qué existe (28 sep 2026): la auditoría pedía «vídeo hero en cada tour».
 * El primero llegó el 28 de septiembre, para la Olla de la Luz.
 *
 * Por qué solo en teléfonos: el único material que hay son cortes verticales
 * de 720×1280 grabados con celular. Estirados a un escritorio se ven blandos,
 * y en la caja del hero de una tableta (768×614) se pierde el 55 % del cuadro.
 * En escritorio el hero se queda EXACTAMENTE como estaba.
 *
 * 🔴 La trampa que hay que evitar: `hidden lg:block` NO evita la descarga. El
 * escritorio se baja los megas igual y lo único que se ahorra es pintarlos. Por
 * eso el `<video>` ni siquiera se monta cuando no toca, y su `src` se asigna
 * desde JS en vez de ponerlo en el JSX.
 *
 * 🔴 `preload="none"` NO sirve en `curso/LoopSetup.tsx` porque ahí el `src` va
 * como ATRIBUTO ESTÁTICO: el elemento nunca corre la selección de recurso y se
 * queda en `readyState 0`, congelado, aunque se le llame `load()` y `play()` a
 * mano. Aquí el `src` se asigna desde JS, que sí la dispara, pero se deja
 * `preload="metadata"` de todas formas: con `+faststart` el índice del archivo
 * son unas decenas de KB y no vale la pena volver a pagar ese bug.
 *
 * La foto va SIEMPRE y es el elemento LCP, así que el camino sin JS, con red
 * lenta o con «reducir movimiento» es idéntico al de antes. El vídeo entra
 * encima con una transición de opacidad cuando ya está reproduciendo, y por eso
 * no hace falta `poster`: el `poster` se salta el optimizador de Next, así que
 * ponerlo hacía que un teléfono se descargara el AVIF Y el JPEG original.
 */

/** Solo teléfono y solo en vertical: en tableta el recorte se come el cuadro. */
const SOLO_TELEFONO = "(max-width: 767.98px) and (orientation: portrait)";
const QUIETO = "(prefers-reduced-motion: reduce)";

export function HeroTourMedia({
  foto,
  video,
  alt,
}: {
  foto: string;
  /** El corte VERTICAL (720×1280). No pongas aquí un archivo apaisado. */
  video?: string;
  alt: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocaVideo, setTocaVideo] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  // ¿Le toca vídeo a este visitante? Arranca en `false`, así que el HTML del
  // servidor y el primer render del cliente son el mismo —solo la foto— y no
  // hay desajuste de hidratación.
  useEffect(() => {
    if (!video) return;
    const chico = window.matchMedia(SOLO_TELEFONO);
    const quieto = window.matchMedia(QUIETO);
    // Quien activó el ahorro de datos no se come 2 MB por un adorno.
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    const decidir = () => setTocaVideo(chico.matches && !quieto.matches && !conexion?.saveData);
    decidir();
    chico.addEventListener("change", decidir);
    quieto.addEventListener("change", decidir);
    return () => {
      chico.removeEventListener("change", decidir);
      quieto.removeEventListener("change", decidir);
    };
  }, [video]);

  // Asignar el `src` y reproducir. Nada de esto ocurre si `tocaVideo` es falso:
  // el elemento no existe y no se pide un solo byte.
  useEffect(() => {
    if (!tocaVideo || !video) return;
    const el = ref.current;
    if (!el) return;

    // `muted` también como PROPIEDAD: React no siempre emite el atributo en el
    // HTML del servidor, y sin él iOS rechaza el autoplay.
    el.muted = true;
    if (el.getAttribute("src") !== video) el.src = video;

    // La ficha mide varias pantallas. Fuera de la vista no tiene caso gastar
    // batería decodificando.
    const ojo = new IntersectionObserver(([e]) => {
      // Si el navegador rechaza el autoplay se queda la foto, que es la de
      // siempre. No es un fallo que haya que reportar.
      if (e.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    ojo.observe(el);
    return () => ojo.disconnect();
  }, [tocaVideo, video]);

  return (
    <>
      <Image
        src={foto}
        alt={alt}
        fill
        className="object-cover"
        priority
        /* Usaba `fill` SIN `sizes`: Next asume 100vw y en un móvil de 400 px
           se descargaba la variante de escritorio. */
        sizes="100vw"
      />
      {tocaVideo && (
        <video
          ref={ref}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            reproduciendo ? "opacity-100" : "opacity-0"
          }`}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          onPlaying={() => setReproduciendo(true)}
          /* Decorativo: la foto de debajo ya lleva el texto alternativo. Sin
             esto, el lector de pantalla anuncia el mismo hero dos veces. */
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
    </>
  );
}
