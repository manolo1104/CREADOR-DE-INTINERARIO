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
// Lo contrario exacto de APAISADA: un cuadrado cuenta como vertical, igual que
// en el <picture> (ahí gana el <img> de celular cuando APAISADA no casa).
const VERTICAL = "(orientation: portrait)";
/** Conexiones donde 3 MB de video se comen lo que necesita el resto de la página. */
const LENTAS = ["slow-2g", "2g", "3g"];

export function HeroVideo({ alt }: { alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Quien pidió menos movimiento o ahorro de datos se queda con la foto
    // fija: el póster es el primer cuadro del video, así que el diseño no
    // cambia, solo no se mueve. Igual en 2G/3G. iPhone no expone
    // `navigator.connection`: ahí no hay forma de saberlo y solo se espera al
    // `load` (abajo).
    const conexion = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conexion?.saveData) return;
    if (conexion?.effectiveType && LENTAS.includes(conexion.effectiveType)) return;

    const apaisada = window.matchMedia(APAISADA);
    // Lo actualiza el observador de abajo; el hero arranca a la vista.
    let enPantalla = true;
    // Hasta que pase la espera, girar el teléfono no carga nada.
    let listo = false;
    const cargar = () => {
      const src = apaisada.matches ? VIDEO.horizontal : VIDEO.vertical;
      if (v.getAttribute("src") === src) return;
      setReproduciendo(false);
      v.src = src;
      // Con `preload="none"` no baja nada hasta el play(): si la persona ya
      // bajó del hero, se pide cuando vuelva (lo arranca el observador).
      // iOS en modo de bajo consumo rechaza el autoplay: la promesa falla y
      // se queda el póster, que es justo lo que debe pasar.
      if (enPantalla) v.play().catch(() => {});
    };
    v.muted = true;

    // El video ya no compite con la carga de la página. Antes se pedía al
    // hidratar, en plena carga, y sus 3 MB (4.8 en escritorio) le peleaban el
    // ancho de banda al póster, a las fuentes y al JS. Ahora espera al `load`
    // (lo de la primera pantalla ya bajó) y a un momento de reposo del hilo
    // principal; Safari no tiene requestIdleCallback: respaldo de 1.5 s.
    let reposo: number | undefined;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const arrancar = () => {
      listo = true;
      cargar();
    };
    const trasLoad = () => {
      if ("requestIdleCallback" in window) reposo = window.requestIdleCallback(arrancar, { timeout: 3000 });
      else espera = setTimeout(arrancar, 1500);
    };
    if (document.readyState === "complete") trasLoad();
    else window.addEventListener("load", trasLoad, { once: true });

    // Girar el teléfono o la tableta cambia al corte que le toca.
    const alGirar = () => {
      if (listo) cargar();
    };
    apaisada.addEventListener("change", alGirar);

    // Fuera de la pantalla no tiene caso gastar batería decodificando.
    const io = new IntersectionObserver(([e]) => {
      enPantalla = e.isIntersecting;
      if (!v.getAttribute("src")) return;
      if (enPantalla) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);

    return () => {
      window.removeEventListener("load", trasLoad);
      if (reposo !== undefined) window.cancelIdleCallback(reposo);
      if (espera !== undefined) clearTimeout(espera);
      apaisada.removeEventListener("change", alGirar);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {/* Precarga del póster, UNA por orientación (7 oct 2026). React precarga
          solo cada <img> suelto, nunca el de un <picture> (no sabe qué
          <source> va a ganar), así que el LCP del inicio no tenía precarga
          mientras ocho imágenes de pantallas más abajo sí. Y ReactDOM.preload, en la
          versión de React que trae Next 14.2, descarta `media`: con él se
          bajarían los dos pósters en cada aparato. Estos <link> React los sube
          al <head>, y cada navegador pide SOLO el que casa con su orientación,
          con prioridad alta. Las rutas y las `media` son las del <picture>. */}
      <link rel="preload" as="image" href={POSTER.vertical} media={VERTICAL} fetchPriority="high" />
      <link rel="preload" as="image" href={POSTER.horizontal} media={APAISADA} fetchPriority="high" />
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
