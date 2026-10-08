"use client";

import { useEffect, useRef } from "react";
import { trackViewItemList } from "@/lib/analytics";

/**
 * El `view_item_list` de GA4 desde una página del servidor: el catálogo /tours
 * y el comparador.
 *
 * Sin él, GA4 veía la ficha de un tour (`view_item`) pero no de qué lista
 * venía: no había forma de comparar cuánto vende el catálogo contra el
 * comparador, ni qué recorridos se ven en la lista y nadie abre.
 *
 * Una vez por montaje, como `PageViewTracker`: cambiar las columnas del
 * comparador no cuenta como otra vista de la lista.
 */
export function ListaToursTracker({
  listaId,
  listaNombre,
  tours,
}: {
  listaId: string;
  listaNombre: string;
  /** En el orden en que se ven: GA4 guarda la posición de cada uno. */
  tours: { id: string; nombre: string; precio?: number; tipo?: string }[];
}) {
  // Evita el doble disparo del StrictMode en dev.
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    trackViewItemList({ listaId, listaNombre, tours });
    // Se dispara una sola vez por montaje; las props son estables por página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
