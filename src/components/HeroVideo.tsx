"use client";

import { useEffect, useRef, useState } from "react";

// Video de fondo del inicio. Hay DOS cortes del mismo recorrido (Tamul →
// canoa → salto en la base del Tamul → cascadas desde el aire → Sky Bike de
// Micos → lancha → Las Pozas → Xilitla): uno horizontal para pantallas
// apaisadas y uno vertical para el teléfono. Recortar el horizontal en un
// teléfono dejaba ver menos de la mitad del cuadro. El proyecto que los genera
// vive fuera del repo, en ~/Desktop/HUASTECA-VIDEO-HERO (Remotion).
//
// El sufijo -vN va en el nombre porque /video se sirve con caché inmutable de
// un año (next.config.mjs): si cambia el video, se sube con el número
// siguiente y se cambia aquí. Sobrescribir el mismo nombre dejaría a quien ya
// visitó el sitio viendo el viejo.
const VIDEO = {
  horizontal: "/video/hero-escritorio-v3.mp4",
  vertical: "/video/hero-celular-v3.mp4",
};
const POSTER = {
  horizontal: "/video/hero-escritorio-v3.webp",
  vertical: "/video/hero-celular-v3.webp",
};
const APAISADA = "(orientation: landscape)";

export function HeroVideo({ alt }: { alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Quien pidió menos movimiento o ahorro de datos se queda con la foto
    // fija: el póster es el primer cuadro del video, así que el diseño no
    // cambia, solo no se mueve.
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conexion?.saveData) return;

    const apaisada = window.matchMedia(APAISADA);
    const cargar = () => {
      const src = apaisada.matches ? VIDEO.horizontal : VIDEO.vertical;
      if (v.getAttribute("src") === src) return;
      setReproduciendo(false);
      v.src = src;
      // iOS en modo de bajo consumo rechaza el autoplay: la promesa falla y
      // se queda el póster, que es justo lo que debe pasar.
      v.play().catch(() => {});
    };
    v.muted = true;
    cargar();
    // Girar el teléfono o la tableta cambia al corte que le toca.
    apaisada.addEventListener("change", cargar);

    // Fuera de la pantalla no tiene caso gastar batería decodificando.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);

    return () => {
      apaisada.removeEventListener("change", cargar);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {/* El póster va en el HTML del servidor: es lo primero que se pinta y
          lo que Google mide como el elemento más grande (LCP). El video baja
          después, sin competir con él. */}
      <picture>
        <source media={APAISADA} srcSet={POSTER.horizontal} />
        {/* <img> y no next/image: ya viene comprimido a ~50 KB, y el
            optimizador solo agregaba la espera de su primera pasada tras
            cada deploy (Railway le borra la caché). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={POSTER.vertical}
          alt={alt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        onPlaying={() => setReproduciendo(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          reproduciendo ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
