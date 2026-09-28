"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PROMOS_PAQUETES } from "@/lib/promosPaquetes";

/** Cada cartel se queda 5 segundos antes de pasar al siguiente. */
const CADA_MS = 5000;

/**
 * Los carteles de los paquetes, rotando solos en el inicio.
 *
 * El cartel ya trae dentro el nombre, el precio y lo que incluye, así que aquí
 * no se le pinta texto encima: sería repetirlo y taparlo. La pieza entera es
 * un enlace a la ficha del paquete.
 *
 * Tres cosas que no se ven pero importan:
 * · **Se detiene al pasar el ratón o al llegar con el teclado**, para que nadie
 *   pierda el cartel que estaba leyendo a mitad de la lectura.
 * · **Con "reducir movimiento" activado no rota**: se queda en el primero y se
 *   cambia con los puntos.
 * · **Todas las imágenes se montan a la vez** y sólo cambia la opacidad, así el
 *   cambio no parpadea esperando a que cargue la siguiente.
 */
export function CarruselPromos() {
  const promos = PROMOS_PAQUETES;
  const [i, setI] = useState(0);
  const [detenido, setDetenido] = useState(false);
  /**
   * Quién pidió el cambio. Es lo que decide cuánto tarda:
   * cuando lo pide una persona, el cartel cambia en 200 ms —esperar medio
   * segundo después de pulsar se siente lento—; cuando cambia solo, se toma
   * 600 ms y se ve como una transición y no como un parpadeo.
   */
  const [aMano, setAMano] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (promos.length < 2 || detenido) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const avanzar = () => {
      // Con la pestaña en segundo plano no se gasta un turno: quien vuelve
      // encuentra el cartel donde lo dejó y no tres más adelante.
      if (document.visibilityState !== "visible") return;
      setAMano(false);
      setI((n) => (n + 1) % promos.length);
    };
    timer.current = setInterval(avanzar, CADA_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [promos.length, detenido]);

  if (promos.length === 0) return null;

  const activo = promos[i];
  const ir = (n: number) => {
    setAMano(true);
    setI((n + promos.length) % promos.length);
  };
  const botonCls =
    "flex h-10 w-10 items-center justify-center rounded-full border border-crema/25 text-crema/80 " +
    "transition-[background-color,border-color,transform] duration-200 ease-out " +
    "[@media(hover:hover)]:hover:border-crema/60 [@media(hover:hover)]:hover:bg-crema/10 " +
    "[@media(hover:hover)]:hover:text-crema active:scale-[0.92]";

  return (
    <div
      className="mx-auto w-full max-w-none sm:max-w-[440px]"
      onMouseEnter={() => setDetenido(true)}
      onMouseLeave={() => setDetenido(false)}
      onFocusCapture={() => setDetenido(true)}
      onBlurCapture={() => setDetenido(false)}
    >
      <Link
        href={`/paquetes/${activo.slug}`}
        aria-label={activo.alt}
        className="group block overflow-hidden rounded-2xl border border-crema/15 bg-negro shadow-[0_24px_64px_rgba(0,0,0,.45)] transition-[transform,box-shadow,border-color] duration-300 ease-out [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-crema/30 [@media(hover:hover)]:hover:shadow-[0_34px_80px_rgba(0,0,0,.55)] focus-visible:-translate-y-1.5 active:scale-[0.995]"
      >
        {/* La caja guarda la proporción del cartel (2:3) para que la sección no
            dé un salto mientras carga ni al cambiar de imagen. */}
        <div className="relative aspect-[1080/1560] w-full">
          {promos.map((promo, idx) => (
            <Image
              key={promo.imagen}
              src={promo.imagen}
              alt={idx === i ? promo.alt : ""}
              aria-hidden={idx !== i}
              fill
              sizes="(max-width: 640px) 100vw, 440px"
              className="object-cover"
              style={{
                opacity: idx === i ? 1 : 0,
                transitionProperty: "opacity",
                transitionDuration: aMano ? "200ms" : "600ms",
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
              priority={idx === 0}
            />
          ))}
        </div>
      </Link>

      {promos.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => ir(i - 1)}
            aria-label="Ver el cartel anterior"
            className={botonCls}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {promos.map((promo, idx) => (
              <button
                key={promo.imagen}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Ver el cartel ${idx + 1} de ${promos.length}`}
                aria-current={idx === i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === i ? "w-6 bg-lima" : "w-2 bg-crema/25 hover:bg-crema/50"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => ir(i + 1)}
            aria-label="Ver el cartel siguiente"
            className={botonCls}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
