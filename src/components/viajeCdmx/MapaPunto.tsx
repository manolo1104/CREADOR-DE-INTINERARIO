"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/**
 * El mapa del punto de salida, que carga SOLO al tocarlo: un iframe de Google
 * Maps pesa más que el resto de la página en un celular con datos.
 */
export function MapaPunto({ lat, lng, nombre }: { lat: number; lng: number; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full aspect-[16/9] border border-white/10 bg-negro/50 hover:bg-negro/30 inline-flex flex-col items-center justify-center gap-2 text-crema/70 font-dm text-sm transition-colors"
      >
        <MapPin className="w-6 h-6 text-dorado" aria-hidden="true" />
        Ver el mapa
      </button>
    );
  }
  return (
    <iframe
      title={`Mapa: ${nombre}`}
      src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
      className="w-full aspect-[16/9] border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
