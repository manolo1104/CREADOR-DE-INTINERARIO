"use client";

import { useEffect, useRef } from "react";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Marca la vista de una página desde un server component.
 *
 * Sin esto no se podía saber cuánta gente ve el catálogo o un destino y cuánta
 * termina en un tour — que es exactamente el hueco del embudo: la mayoría del
 * tráfico entra por contenido y nunca llega al producto.
 */
export function PageViewTracker({
  event,
  data,
}: {
  event: string;
  data?: Record<string, unknown>;
}) {
  // Evita el doble disparo del StrictMode en dev y de cualquier remontaje.
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    trackTourEvent(event, data);
    // Se dispara una sola vez por montaje; las dependencias son estables por página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
