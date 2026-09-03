"use client";

import { useEffect, useRef, useState } from "react";

const POSTER = "/imagenes/curso/setup-poster.jpg";
const VIDEO = "/videos/curso/setup.mp4";
const ALT =
  "El escritorio de Manolo, de noche: dos pantallas con código mientras construye el sistema";

/**
 * El bucle del escritorio: 10 s de timelapse construyendo, sin sonido.
 *
 * Va aquí y no en el hero a propósito. El público de esta página son dueños de
 * agencia y hotel que llegan con miedo a lo técnico, y toda la landing pelea
 * contra eso ("no necesitas programar"). Un cuarto oscuro con tres pantallas de
 * código arriba del todo diría lo contrario. Al lado de "te voy a enseñar lo
 * que uso todos los días", el mismo material significa lo correcto: respalda.
 *
 * Dos cosas que NO se pueden resolver en CSS y por eso hay componente:
 *
 * 1. `prefers-reduced-motion` no detiene un `<video autoplay>`. Quien pide
 *    menos movimiento recibe el póster y ni siquiera descarga el vídeo.
 * 2. El vídeo pesa medio mega y vive a tres pantallas de scroll. Se carga sólo
 *    cuando entra en pantalla; antes de eso no se pide al servidor.
 *
 * 🔴 `preload="none"` NO sirve aquí, ni siquiera llamando a `load()` y `play()`
 * a mano desde el observer: el vídeo se queda en `readyState 0` reproduciendo
 * la nada, congelado en el póster. Con `preload="metadata"` el navegador tiene
 * la cabecera lista y arranca en cuanto se le pide. Comprobado, no supuesto.
 */
export function LoopSetup() {
  const ref = useRef<HTMLVideoElement>(null);
  const [quieto, setQuieto] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setQuieto(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setQuieto(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  useEffect(() => {
    if (quieto !== false) return;
    const el = ref.current;
    if (!el) return;

    const ojo = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        // Si el navegador rechaza el autoplay, se queda el póster: no es un
        // fallo que valga la pena reportarle a nadie.
        void el.play().catch(() => {});
        ojo.disconnect();
      },
      { rootMargin: "200px" }
    );
    ojo.observe(el);
    return () => ojo.disconnect();
  }, [quieto]);

  // Antes de saber la preferencia se pinta el póster: nunca arranca un vídeo
  // que después habría que apagar.
  if (quieto !== false) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={POSTER} alt={ALT} className="h-full w-full object-cover" />;
  }

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      src={VIDEO}
      poster={POSTER}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-label={ALT}
    />
  );
}
