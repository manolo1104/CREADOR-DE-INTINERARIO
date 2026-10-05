"use client";

import { Star, ShieldCheck, Lock } from "lucide-react";
import { GOOGLE_RATING, GOOGLE_PERFIL_URL } from "@/lib/resenas";

/**
 * Tres razones para confiar, pegadas al botón: la calificación REAL de Google
 * (no testimonios escritos a mano), hasta cuándo se cancela gratis —con fecha—
 * y que el pago lo procesa Stripe. Baymard: la seguridad percibida es visual y
 * se juzga junto al botón, no al final de la página.
 */
export function ConfianzaJuntoAlBoton({
  resenas,
  cancelacion,
  pagoCifrado,
}: {
  resenas: string;
  cancelacion: string | null;
  pagoCifrado: string;
}) {
  return (
    <ul className="mt-4 space-y-2 font-dm text-[12px] text-negro/60">
      <li>
        <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-verde-selva transition-colors">
          <Star className="w-3.5 h-3.5 fill-dorado text-dorado flex-shrink-0" aria-hidden="true" />
          <span><strong className="text-negro/85">{GOOGLE_RATING}</strong> · {resenas}</span>
        </a>
      </li>
      {cancelacion && (
        <li className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-px" aria-hidden="true" />
          <span>{cancelacion}</span>
        </li>
      )}
      <li className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
        <span>{pagoCifrado}</span>
      </li>
    </ul>
  );
}
