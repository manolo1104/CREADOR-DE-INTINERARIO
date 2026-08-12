"use client";

import { useEffect, useState } from "react";
import { leerCarrito, CARRITO_EVENT } from "@/lib/carrito";

/**
 * Qué recorridos lleva el visitante en el carrito, en vivo.
 *
 * Escucha el evento propio del carrito (misma pestaña) y `storage` (otra
 * pestaña), igual que `CarritoBar`. Devuelve un Set vacío hasta que monta, para
 * que el servidor y el cliente pinten lo mismo en la primera pasada y no salte
 * el aviso de hidratación.
 */
export function useCarritoSlugs(): Set<string> {
  const [slugs, setSlugs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const leer = () => setSlugs(new Set(leerCarrito().map((i) => i.tourSlug)));
    leer();
    window.addEventListener(CARRITO_EVENT, leer);
    window.addEventListener("storage", leer);
    return () => {
      window.removeEventListener(CARRITO_EVENT, leer);
      window.removeEventListener("storage", leer);
    };
  }, []);

  return slugs;
}
