"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (promos.length < 2 || detenido) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    timer.current = setInterval(() => setI((n) => (n + 1) % promos.length), CADA_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [promos.length, detenido]);

  if (promos.length === 0) return null;

  const activo = promos[i];

  return (
    <div
      className="mx-auto w-full max-w-[380px] sm:max-w-[420px]"
      onMouseEnter={() => setDetenido(true)}
      onMouseLeave={() => setDetenido(false)}
      onFocusCapture={() => setDetenido(true)}
      onBlurCapture={() => setDetenido(false)}
    >
      <Link
        href={`/paquetes/${activo.slug}`}
        aria-label={activo.alt}
        className="group block overflow-hidden rounded-2xl border border-negro/10 bg-negro/5 shadow-[0_18px_48px_rgba(26,46,26,.18)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(26,46,26,.26)] focus-visible:-translate-y-1"
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
              sizes="(max-width: 640px) 92vw, 420px"
              className="object-cover transition-opacity duration-700"
              style={{ opacity: idx === i ? 1 : 0 }}
              priority={idx === 0}
            />
          ))}
        </div>
      </Link>

      {promos.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {promos.map((promo, idx) => (
            <button
              key={promo.imagen}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Ver el cartel ${idx + 1} de ${promos.length}`}
              aria-current={idx === i}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === i ? "w-6 bg-verde-selva" : "w-2 bg-negro/20 hover:bg-negro/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
