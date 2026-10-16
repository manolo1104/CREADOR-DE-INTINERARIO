"use client";

import { useState } from "react";

/**
 * La foto de perfil de Google de quien escribió la reseña, o su inicial si no
 * hay foto o deja de cargar. Nunca una foto de archivo: así nacieron las
 * reseñas falsas del sitio (ver `resenasReales.ts`).
 *
 * `referrerPolicy="no-referrer"`: googleusercontent rechaza a veces las fotos
 * de perfil pedidas desde otro dominio con referer.
 */
export function AvatarResena({ autor, foto, className = "h-10 w-10" }: { autor: string; foto?: string; className?: string }) {
  const [rota, setRota] = useState(false);
  const inicial = autor.trim().charAt(0).toUpperCase();
  if (!foto || rota) {
    return (
      <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-verde-selva/15 font-cormorant text-base text-verde-selva ${className}`}>
        {inicial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${foto}=s96-c`}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setRota(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
