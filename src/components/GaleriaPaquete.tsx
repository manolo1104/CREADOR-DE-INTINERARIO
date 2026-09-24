"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Las fotos de un paquete, una a una.
 *
 * Antes era un collage: las cuatro fotos cortadas en diagonal dentro de la
 * misma caja. Con la tarjeta a 340 px cada foto caía en una franja de 80 px
 * donde no se distinguía el lugar, que es justo lo que la foto tiene que
 * hacer. Aquí se ve una completa y se pasa a la siguiente.
 *
 * 🔴 La galería NO se desliza con el dedo, se cambia con los botones y los
 * puntos: vive DENTRO de una fila que sí se desliza, y dos carruseles
 * horizontales anidados se pelean por el mismo gesto. El dedo mueve la fila;
 * los botones, la foto.
 */
export function GaleriaPaquete({
  fotos, nombre, etiquetaAnterior, etiquetaSiguiente,
}: {
  /** Una por parada del viaje, con el nombre del lugar cuando se conoce. */
  fotos: { src: string; alt?: string }[];
  nombre: string;
  etiquetaAnterior: string;
  etiquetaSiguiente: string;
}) {
  const [i, setI] = useState(0);
  const total = fotos.length;
  const ir = (n: number) => setI((n + total) % total);

  if (total === 0) return null;

  return (
    <div className="group relative h-full w-full overflow-hidden bg-negro/20">
      {fotos.map((foto, idx) => (
        <Image
          key={foto.src}
          src={foto.src}
          // El alt dice el LUGAR, no "foto 3 de 11": es lo que busca quien no
          // puede ver la imagen y lo que lee Google.
          alt={foto.alt ?? `${nombre}, parada ${idx + 1} de ${total}`}
          fill
          sizes="(max-width: 640px) 86vw, 340px"
          className="object-cover transition-opacity duration-500"
          // La opacidad va en el estilo y no en una clase de Tailwind: con las
          // clases, la foto activa se quedaba en cero y la tarjeta salía en
          // blanco. Aquí no hay nada que pueda ganarle en especificidad.
          style={{ opacity: idx === i ? 1 : 0 }}
          // Sólo la primera de cada tarjeta entra en la carga inicial; las
          // demás esperan, que son cuatro por tarjeta y cinco tarjetas.
          loading={idx === 0 ? undefined : "lazy"}
          priority={false}
        />
      ))}

      {total > 1 && (
        <>
          {/* Los botones aparecen al pasar el ratón; en táctil están siempre. */}
          <button
            type="button"
            onClick={() => ir(i - 1)}
            aria-label={etiquetaAnterior}
            className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-negro/55 text-crema backdrop-blur-sm transition-opacity duration-200 hover:bg-negro/75 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => ir(i + 1)}
            aria-label={etiquetaSiguiente}
            className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-negro/55 text-crema backdrop-blur-sm transition-opacity duration-200 hover:bg-negro/75 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
            {fotos.map((foto, idx) => (
              <button
                key={foto.src}
                type="button"
                onClick={() => setI(idx)}
                aria-label={foto.alt ?? `${nombre}, parada ${idx + 1}`}
                aria-current={idx === i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === i ? "w-4 bg-crema" : "w-1.5 bg-crema/50 hover:bg-crema/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
